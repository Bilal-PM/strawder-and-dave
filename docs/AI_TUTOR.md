# AI tutor: NPC classmates and tutors on a small in-browser model

> Status: design plus working code (`js/ai/`), with tests (`tests/ai/`). **The game doesn't load it yet.** Wiring it in needs a change to `index.html` and `js/game.js`, and the owners of those files have to sign that off (see §9).
> Last updated: 2026-09-29.

## 1. The recommendation

| | Choice | Why |
|---|---|---|
| **Runtime** | **WebLLM** (`@mlc-ai/web-llm` 0.2.85, Apache-2.0) on WebGPU, running in a Blob worker | It's the fastest in-browser path. JSON-schema-constrained output is built in. It ships a prebuilt model table with VRAM figures, supports Cache API and IndexedDB caching, and runs in a worker. |
| Secondary runtime | Transformers.js (`@huggingface/transformers` 4.3.0, Apache-2.0) on WebGPU or WASM | This covers strong desktops with no WebGPU, using the tiny model on the CPU. It's optional. |
| **Default model** | **Qwen2.5-0.5B-Instruct**, `q4f16_1` (`q4f32_1` if there's no `shader-f16`) | Apache-2.0. About 945 MB of VRAM (WebLLM config), and it's good at short rephrasing and JSON for its size. |
| **Tiny model** (phones, 4 GB machines) | **SmolLM2-360M-Instruct**, `q4f16_1` or `q4f32_1` | Apache-2.0. 376 MB of VRAM (580 MB with f32). It can handle a single short rephrase. |
| Optional high tier | Qwen2.5-1.5B-Instruct `q4f16_1` (1,630 MB VRAM) | Only with `allowLarge: true`, on a desktop with 8 GB or more of RAM, 8 or more cores and 4 GB of free storage. |
| **Always available** | The **scripted** provider | This is the real tutor. The model only ever rephrases it. |

The key design decision: **the model never decides what to teach.** A deterministic planner picks the move every time: which misconception to probe, which fact to lean on, which question to ask and which hint level to give. It then writes an authored draft line. If a model is present, it gets exactly one job: *say this draft in your persona's voice, as JSON*. The output is validated and falls back to the draft on any problem. A 0.5B model is good at that job, and bad at pedagogy, safety and facts. So the game is fully playable, and teaches exactly the same content, with no model at all.

## 2. What was verified here and what wasn't

This sandbox can reach `registry.npmjs.org` and `raw.githubusercontent.com` but **not `huggingface.co` or `cdn.jsdelivr.net`**. So **no model weights were downloaded or run**, and nothing below about model quality or speed was measured.

**Verified in this sandbox:**
- Package facts, from `npm pack` of the published tarballs:
  - `@mlc-ai/web-llm` 0.2.85 is Apache-2.0. `lib/index.js` is one self-contained ES module (6.59 MB, unminified, with no bare imports). Its `prebuiltAppConfig` includes the model IDs and `vram_required_MB` figures quoted in this doc. `cacheBackend` can be `cache`, `indexeddb`, `opfs` or `cross-origin`. `response_format: {type: 'json_object', schema}` is backed by xgrammar. Some models set `required_features: ['shader-f16']` (for example SmolLM2-360M `q4f16_1`, but not Qwen2.5-0.5B `q4f16_1`). Model `.wasm` libraries load from `raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/…`, which returned HTTP 200 from here.
  - `@huggingface/transformers` 4.3.0 is Apache-2.0. `dist/transformers.min.js` is a self-contained ES module (582 KB). It needs ONNX Runtime Web's `.wasm` files (`onnxruntime-web` 1.31 dev, MIT): 14–28 MB each, fetched from jsDelivr unless `env.backends.onnx.wasm.wasmPaths` is set. `env.remoteHost` and `env.remotePathTemplate` redirect model downloads, and `env.useBrowserCache` uses the Cache API.
  - `@wllama/wllama` 3.6.1 is MIT. `wllama.wasm` is 8.4 MB. Its README says multi-threading needs COOP/COEP headers and that files are limited to 2 GB each. It starts its worker as a **module** Blob worker (`new Worker(url, {type:'module'})`, in `src/utils.ts`) and caches in OPFS.
- Browser behaviour, measured in headless **Chromium 141** (Playwright) from `file://` and from `http://localhost`:

  | Capability | `file://` | `http://localhost` |
  |---|---|---|
  | `isSecureContext` | true | true |
  | Cache API (`caches.open`/`put`) | **works** | works |
  | IndexedDB (Blob values) | works | works |
  | OPFS (`navigator.storage.getDirectory`) | **SecurityError** | works |
  | `new Worker('w.js')` | **SecurityError** | works |
  | Blob **classic** worker | **works** | works |
  | Blob **module** worker | **fails** | works |
  | `import('./x.mjs')` (relative) | **fails** | works |
  | `import('https://…')` with CORS, on the page and inside a Blob classic worker | **works** | works |
  | `navigator.gpu` inside a Blob worker | present | present |
  | WebGPU adapter (headless) | null by default; SwiftShader fallback adapter with `--enable-unsafe-webgpu` (no `shader-f16`, 1 GB max buffer) | same |
  | `SharedArrayBuffer` / `crossOriginIsolated` | no / false | no / false |

- The code: `tests/ai/browser_smoke.js` starts the tutor from `file://`, runs the echo backend in a **Blob classic worker** (`transport: 'worker'`), reports progress, realises lines through the full validate pipeline, falls back to the main thread, and handles an unreachable runtime URL. It also checks that the headless SwiftShader adapter is detected as a fallback adapter, which drops the tutor to scripted.
- Separately, **the real WebLLM and Transformers.js bundles were loaded from the npm tarballs** (served locally with CORS) into that Blob worker from a `file://` page. Both modules imported, then failed at the model download (huggingface.co is blocked here), and the tutor stayed scripted as designed.

**Not verified here (it needs a real GPU, a phone, or the model hub):** tokens per second, first-load time, output quality of any model, WebGPU on Safari, iOS or Android, memory pressure on phones, and the model download sizes. The download sizes below are estimated from parameter count × bits. §10 lists the measurements to take before a model is switched on for players.

## 3. Runtime options compared

| | WebLLM | Transformers.js | wllama (llama.cpp WASM) |
|---|---|---|---|
| Backend | WebGPU only (compiled TVM kernels) | WebGPU or WASM (ONNX Runtime Web) | WASM SIMD; WebGPU since v3 ("currently only supports Chrome" per its v3.1 guide) |
| Licence | Apache-2.0 ✔ | Apache-2.0 ✔ (ORT: MIT) | MIT ✔ |
| JS size | 6.6 MB single ES module ✔ | 0.58 MB ES module + 14–28 MB ORT wasm ✔ | about 8.4 MB wasm plus JS ✔ |
| Constrained JSON | Yes: JSON schema, EBNF grammar (xgrammar) ✔ | No grammar; we parse and retry | GBNF grammar ✔ |
| Caching | Cache API (default), IndexedDB, OPFS ✔ | Cache API ✔ | OPFS (so none from `file://`) |
| Works from `file://` | **Yes**, in a Blob classic worker, module from a CORS URL (import verified, see §2) | **Yes**, same (import verified) | **Not as shipped**: it needs a Blob *module* worker, which Chromium refused from `file://`. No multi-threading without COOP/COEP |
| Desktop Chrome/Edge | Yes (WebGPU) | Yes (WebGPU or WASM) | Yes (WASM; slow on CPU) |
| Safari / iOS | Needs WebGPU: shipped in Safari 26 as far as I know, **unverified here** | WASM works; WebGPU as for WebLLM | WASM works; single thread |
| Android Chrome | WebGPU on recent Android GPUs, **unverified here** | WASM works but is slow on phones | same |
| Model format | MLC (prebuilt list: Qwen2.5, SmolLM2, Llama-3.2, Gemma, Phi…) | ONNX (onnx-community exports) | GGUF (widest choice) |
| Speed (expected, unmeasured) | Best of the three on a GPU | WebGPU is close; WASM is 3–10× slower | WASM only on most devices |

The verdict is **WebLLM first, Transformers.js second, and wllama documented but not implemented**. wllama's `file://` problem and its need for COOP/COEP headers for threads both count against it for a game that must run from `file://` and from static hosts.

## 4. Model candidates (about 135M to 1.5B)

VRAM figures come from WebLLM 0.2.85's own config (verified). Download sizes are estimates (≈ params × 4.5 bits for q4, 16 bits for q0f16). Licence notes come from the model cards and upstream repos: the Qwen2.5 README's "all open-weight models are licensed under Apache 2.0" and the Llama 3.2 licence text were both read here via GitHub. The others weren't re-checked.

| Model | WebLLM ID (VRAM) | Est. download | Licence | Fit for short persona dialogue |
|---|---|---|---|---|
| SmolLM2-135M-Instruct | `q0f16` only (360 MB, needs f16) | ≈270 MB | Apache-2.0 | Too weak: it drifts off the draft and garbles. Not recommended even for rephrasing. |
| **SmolLM2-360M-Instruct** | `q4f16_1` (376 MB, f16), `q4f32_1` (580 MB) | ≈200–250 MB | Apache-2.0 | **Tiny tier.** Fine for single-sentence rephrasing with our drift and question checks; unreliable at free chat. |
| **Qwen2.5-0.5B-Instruct** | `q4f16_1` (945 MB), `q4f32_1` (1,060 MB) | ≈280–350 MB | Apache-2.0 | **Default.** Good instruction-following and JSON for its size, and multilingual. |
| Qwen3-0.6B | `q4f16_1` (1,403 MB) | ≈350 MB | Apache-2.0 | A "thinking" model by default. Needs thinking switched off, and uses more VRAM. A possible later swap. |
| Llama-3.2-1B-Instruct | `q4f16_1` (879 MB) | ≈700 MB | Llama 3.2 Community Licence: must show "Built with Llama", ship the licence, follow the AUP | Good voice. The licence obligations are why it isn't the default. |
| Gemma-3-1B-it | `gemma3-1b-it-q4f16_1` (711 MB) | ≈700 MB | Gemma Terms of Use + prohibited-use policy (not OSI) | Good quality. The licence terms are the drawback. |
| Qwen2.5-1.5B-Instruct | `q4f16_1` (1,630 MB) | ≈900 MB | Apache-2.0 | **High tier (opt-in).** Clearly better at persona voice. |
| SmolLM2-1.7B-Instruct | `q4f16_1` (1,774 MB) | ≈1 GB | Apache-2.0 | An alternative high tier. |
| Phi-3.5-mini (3.8B) | `q4f16_1` (3,672 MB; 2,520 MB with the 1k context) | ≈2.2 GB | MIT | Upper bound only: too big for most players. |

**Tier selection** (`LS.AI.selectTier(caps)`, which is pure and tested):

1. `saveData` on, or less than 600 MB of free storage → `none` (scripted).
2. WebGPU with a real adapter (not `isFallbackAdapter`):
   - A phone, 4 GB of RAM or less, a max storage buffer under 1 GB, or under 1.5 GB of free storage → **tiny**.
   - `allowLarge`, a desktop with 8 GB of RAM, 8 or more cores and 4 GB or more of free storage → **high**.
   - Otherwise → **default**.
   - With no `shader-f16`, the `q4f32` build is used automatically.
3. No WebGPU, but a desktop with WASM and workers, 8 GB of RAM and 8 or more cores → **tiny on Transformers.js (WASM)**.
4. Otherwise → `none`.

After loading, the tutor runs one 8-token warm-up and records `stats.warmupMs`. The per-line deadline (4.5 s by default) then decides line by line: a slow device naturally falls back to the authored line.

## 5. Architecture

```
game.js ──► LS.AI.say / followUp / coach / classify
               │
               ├── planTurn()/coachPlan()  ── deterministic, always runs
               │     classify(answer) → intent (probe / praise / partial / clarify / redirect / safety / teachback / whatif / claim / hint)
               │     concept card facts + CPM numbers + persona card + session history → authored DRAFT
               │
               └── realise(plan)           ── only if a model is ready and the intent isn't safety
                     buildRealisePrompt → provider.generate (JSON schema if supported)
                     → parseJSON → filter (banned names, safety, leaks, drift, question kept, length)
                     → up to 1 retry (temperature +0.15) → else the DRAFT
                     overall deadline 4.5 s, per-call timeout 3.5 s, one call at a time
```

**Files**
- `js/ai/tutor.js`: `LS.AI` holds the concept card, persona cards, classifier, CPM, planner, prompt builder, filter, providers, tier logic and orchestration. It's a classic script that also `require()`s in Node.
- `js/ai/worker.js`: `LS.AIWorker` holds the model backends (webllm, transformers, echo), a message protocol, a Blob-worker client and a main-thread client.
- `tests/ai/test_tutor.js`: Node tests (26). `tests/ai/browser_smoke.js`: a Chromium `file://` smoke test.

### The API

```js
LS.AI.init(opts)            -> Promise<status>   // never rejects; don't await it in the game loop
LS.AI.status()              -> {state:'scripted'|'checking'|'downloading'|'ready'|'failed', provider, tier, model,
                                progress:0..1, reason, transport:'worker'|'main-thread', caps, stats, ready}
LS.AI.say(persona, context) -> Promise<{text, intent, source:'scripted'|'model', misconception, facet, whatIf, classification, rejected?}>
      context: {concept:'project-planning', answer, mode:'react'|'open'|'discuss'|'teachback'|'recap'|'followup',
                topic, playerName, seed, deadlineMs, scripted:true}
LS.AI.sayNow(persona, context)   -> same, synchronously, authored only
LS.AI.followUp(persona, context) -> Promise   // Socratic follow-up on the last answer
LS.AI.coach(state)          -> Promise<{text, intent:'hint'|'probe'|'praise', level:1..3, ...}>
      state: {lanes:{train:[cardIds], track:[…]}} or {question:'testStart'|'criticalPath', answer}, plus hintsGiven, persona
LS.AI.classify(answer, concept)      -> {misconceptions:[ids], understood:[facets], confidence, scores, evidence}   // sync
LS.AI.classifyDeep(answer, concept)  -> Promise<same + source:'rules'|'rules+model'>
LS.AI.optIn(bool) · detect() · selectTier(caps, opts) · modelFor(provider, tier, caps) · registerProvider(name, factory)
LS.AI.filter(text, opts) · bannedNames(text) · safetyTopic(text) · cpm(acts) · scenario() · whatIf(concept, seed) · checkWhatIf(answer, wi)
```

`init` options (they can also be preset as `window.LS_AI_CONFIG`):
- Provider and download: `provider` ('auto'), `optIn` (false), `tier`, `allowLarge`.
- Where things are fetched from: `moduleUrl.{webllm,transformers}`, `modelBaseUrl`, `modelLibBaseUrl`, `wasmPaths`, `cacheBackend` ('cache'), `models` (override the tier table).
- Timing and output: `deadlineMs` (4500), `callTimeoutMs` (3500), `retries` (1), `maxTokens` (72), `temperature` (0.7), `maxWords` (35).
- Testing and hooks: `seed` (for tests and replays), `useWorker` (true), `warmup`, `onStatus(status)`.

A custom provider is `{load(onProgress) → Promise, generate(messages, {maxTokens, temperature, schema, timeoutMs}) → Promise<string>, supportsSchema, abort?, unload?}`.

## 6. Grounding and safety

**The concept card** (`LS.AI.concepts['project-planning']`) holds:
- `facts`, the only statements the model may use. Up to three relevant ones go into each prompt.
- `facets`: activities, durations, dependencies, finish-to-start, critical path, total float, who float belongs to, change and re-planning, and resources.
- `understood` signal patterns.
- Five `misconceptions`: `longest_task`, `more_people`, `float_owned`, `fixed_plan` and `cp_static`. Each one comes with detection patterns (and `anti` or `unless` exceptions), similarity exemplars, a counter-fact, three Socratic probes, a worked example from Harrowby, and a teach-back prompt.
- Follow-up questions per facet, teach-back prompts, and 13 discussion points. These are questions, claims that Gaz voices for the learner to challenge, and **computed what-ifs**.
- `scenario`: Jo's works plan, synced at runtime from `LS.PACKS['kestrel-vale'].c1.plan`, so the tutor can never contradict the game.

**Numbers are computed, never generated.** `LS.AI.cpm()` runs a forward and backward pass over the plan. For Kestrel Vale it gives: Marjorie 20 weeks with 8 weeks of float, the track 28 weeks, critical path k1→k2→k3→k4→test runs, finish at week 38. What-ifs delay one activity and recompute. For example, "Say *Bogies & wheelsets* runs 10 weeks late. Does the opening date move?" has the computed answer *yes, by 2 weeks, and Marjorie becomes critical*, and `checkWhatIf()` marks the learner against it.

**Persona cards** (`jo`, `moira`, `gaz`, `tom`, with names taken from the pack's cast) hold role, stance (tutor or peer), a one-line voice description for the prompt, openers, praise, thinking lines, tics, and a sample line used as the one-shot example. Gaz is the *peer*: only he voices misconceptions as discussion claims. Tutors never do.

**Prompts are short and strict.** A system message sets the persona, voice, UK English, the word cap, "keep the meaning", "keep the question", "never give the answer away", the facts, "no real companies, brands or people", "no safety advice", and "reply only as JSON {"text": …}". Then comes one example pair, then the last turn or two of history, the learner's words and the draft. That's about 1,500–2,000 characters (the test checks it stays under 2,200). WebLLM gets a JSON schema, so the output is constrained. Transformers.js gets tolerant parsing (code fences, prose around the JSON, single quotes, trailing commas). A reply that looks like broken JSON is retried, not used.

**The misconception classifier** has three layers:
1. Negation-aware regex rules, applied clause by clause. "It isn't just the longest task, it's the longest chain" isn't flagged. It counts as understanding the critical path.
2. Hashed bag-of-words cosine similarity (unigrams and bigrams) to exemplars, as a weaker signal (confidence ≤ 0.75). It's cancelled if the learner also shows the matching understanding.
3. Optionally, `classifyDeep` asks the model for a JSON label against an enum schema. A model vote adds +0.3 and can't reach the 0.5 bar on its own. Rules plus model together raise confidence. Invented IDs are dropped.

**Output filter** (`LS.AI.filter`). This applies to every line, authored or generated:
- **A banned-name list, word-bounded and case-insensitive:**
  - Organisations and operators: Network Rail, TfL / Transport for London, HS2, London Underground, Crossrail, National Rail, British Rail, GBR, operators, Eurostar.
  - Regulators and government: ORR, RSSB, RAIB, HSE, DfT.
  - Suppliers and contractors: Balfour Beatty, Amey, Siemens, Alstom, Hitachi, and others.
  - Scheduling-tool brands.
  - **The blocked first name.**
  - Acronyms that are also ordinary words are case-sensitive, so "the caf" and "outflow" pass.
- Rejecting "as an AI", role prefixes, links and markdown.
- UK spelling fixes.
- A 35-word cap that keeps the closing question.
- **For generated text only:**
  - Rejection of any safety-topic mention.
  - Garble and repetition checks.
  - Drift from the draft (less than 20% keyword overlap).
  - A draft question that was dropped.
  - **Answer leaks.** In coaching, the answer patterns (for example `week 28`, or "the critical path is the track") are banned from hints, whether authored or generated.

**Safety is always authored.** If the learner's words touch walking on or near the line, live rail, protection or possessions, PPE, trespass or hazards, the tutor answers with an authored line that sends them to Hannah and the safe system of work, then returns to the plan. The model isn't called (the test asserts zero calls). Generated text that mentions safety is rejected.

**The model never blocks the game.**
- `init()` never rejects, and the game shouldn't await it.
- Every line has a deadline, and there's one model call at a time.
- `sayNow()` is synchronous.
- Errors, timeouts, a failed load or a lost GPU all resolve to the authored line.
- Failures are counted in `status().stats` (lines, model, fallback, rejected, timeouts, errors, lastMs, warmupMs).

## 7. The fallback engine (the scripted provider)

It has to feel dynamic without a model. It does that with:
- **Slot-filling from the learner's own words.** A short, cleaned quote of what they said: "You said “the float belongs to Gaz since he owns the…”." The quote is dropped if it contains a banned name or a safety topic.
- **Moves driven by the classifier.**
  - probe → misconception
  - partial ("Good on the dependencies.") → ask about the missing facet
  - praise → a deeper follow-up, with a teach-back on every third correct answer
  - clarify (for "dunno") → a smaller scaffold question
  - redirect for off-topic ("Hold that one for the pub.")
- **Escalation across the history.** Probing the same misconception again changes strategy: first a Socratic question, then a worked Harrowby example ("That's “more people always means faster” creeping back in… Where does that leave your idea?"), then the counter-fact plus a teach-back. When a learner who was wrong gets it right, the tutor notices ("That's a shift from earlier. Nice.").
- **Facet coverage.** Follow-ups walk through the facets the learner hasn't shown yet. `recap` summarises what's covered and what's next.
- **Varied phrasing.** Every bank has 3–5 variants. The tutor picks without recent repeats in each session (the test gets at least 14 distinct lines out of 18, with no immediate repeats), and it has a seeded RNG, so seeded runs are exactly reproducible for tests and replays.
- **Persona voice.** Openers, praise, thinking lines and tics are chosen per persona. Low-priority parts (tic, opener, acknowledgement) are dropped first to stay within 35 words.
- **Discussion variety.** Group questions, Gaz's claims (the learner corrects the peer) and computed what-ifs.
- **Coaching during the scenario.**
  - `coach({lanes})` finds the first card placed before the job it depends on and gives a three-step hint ladder: the lane, then the card, then a method. It never gives the order.
  - `coach({question, answer})` uses question-specific hint ladders ("What does a test run need before it can happen? Is it only the train?"), or probes the misconception it detects. The leak guard makes sure a hint never contains the answer.

## 8. Getting assets into a single-file or offline build

- **`js/ai/tutor.js` and `js/ai/worker.js` inline fine.** They're about 98 KB unminified, with no dependencies. The worker is built from the function's own source as a Blob, so there's no separate worker file to fetch, which matters because a `file://` page can't start one.
- **Model weights can't be inlined** (they're 200 MB to 1 GB). They are **optional**: they're downloaded on first run, only after the player opts in, from a **configurable URL the client hosts**:
  - `modelBaseUrl`: a directory with one folder per model, for example `…/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/` (a copy of the MLC repo files). It must send `Access-Control-Allow-Origin: *`.
  - `modelLibBaseUrl`: the compiled `…-webgpu.wasm` libraries (copied from `binary-mlc-llm-libs` at the `v0_2_84` version that WebLLM 0.2.85 expects).
  - `moduleUrl.webllm`: the client's copy of `@mlc-ai/web-llm/lib/index.js` (6.6 MB).
  - For Transformers.js: `moduleUrl.transformers` (`transformers.min.js`), `wasmPaths` (the ORT `.wasm` files) and `modelBaseUrl` (ONNX exports, used as `{model}/`).
  - Left unset, they fall back to the public defaults (the jsDelivr module URLs, then the Hugging Face hub). That's fine for development, but a production build should pin its own copies so a third-party change can't break the game.
- **Caching:**
  - WebLLM stores weights and model libraries in the Cache API by default (`cacheBackend: 'cache'`). This was verified to work from `file://` and `http://` in Chromium 141. Use `indexeddb` where the Cache API isn't available. Avoid `opfs` for `file://` builds, because it throws there.
  - Transformers.js uses the Cache API too.
  - Call `navigator.storage.persist()` after opt-in to make eviction less likely.
- **Offline after the first run:** the weights come from the cache. The runtime ES module is only HTTP-cached, so a truly offline `file://` build needs one more step. Ship an optional `js/ai/runtime-webllm.js` that holds the module source as a string, and import it through a Blob URL (verified: `import(blobURL)` works from `file://`). Otherwise, host the game over https with a service worker.
- **Nothing is required.** No opt-in means no network access, no storage use and no change to gameplay.

## 9. Wiring it into the game (for the owners of `index.html` and `game.js`)

1. Add `<script src="js/ai/worker.js"></script>` and then `<script src="js/ai/tutor.js"></script>` after `js/packs/kestrel-vale.js` and before `js/game.js`.
2. At start-up: `LS.AI.init({ optIn: savedChoice })`. Don't await it. Add a settings toggle, "Smarter classmates (downloads about 300 MB, optional)", that calls `LS.AI.optIn(true)` and then `LS.AI.init({optIn: true, onStatus: showProgress})`.
3. In talks and the works plan:
   - Free-text or choice answers → `LS.AI.say('jo', {answer})`.
   - A peer's discussion turn → `LS.AI.say('gaz', {mode:'discuss'})`.
   - Stuck on the board → `LS.AI.coach({lanes, hintsGiven})`.
   - Stuck on the plan questions → `LS.AI.coach({question:'testStart', answer})`.
   - Show a typing indicator. The reply always arrives within the deadline.
4. Put `LS.AI.status().source` counts in the debug overlay and the test harness.

## 10. Before a model is switched on for players (can't be done here)

- On real devices (a mid laptop with an iGPU, an M-series Mac, an Android phone with WebGPU, an iPhone on Safari 26), measure the first-load time, `warmupMs`, prefill plus about 40 tokens per line against the 4.5 s deadline, memory, and whether the tab gets killed.
- Run a red-team corpus of 200 lines per model through `filter()`, and record the rejection rate for each reason. If more than about 30% of lines are rejected, drop that model a tier.
- Get a blind rating of authored lines against model-rephrased lines for warmth, UK voice and correctness, with the TEAM sign-off roles from `docs/TEAM.md`.
- Re-check the licences on each model card at release, and add the model and runtime licences to `assets/CREDITS.md` (for Llama, the "Built with Llama" notice).

## 11. Running the tests

```sh
node tests/ai/test_tutor.js              # 26 Node tests: classifier, filter, scripted provider, CPM, coach, tiers, mock LLM, worker protocol
node tests/ai/browser_smoke.js           # Chromium from file://: Blob worker, progress, fallbacks, capability probe (needs Playwright)
```
