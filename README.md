# LINESIDE — a game about judgment

> No scores on the buttons. No right answers on screen. Just the calls you make — and the ripples they send.

LINESIDE is an explorable, story-driven judgment game: a side-on 2.5D world you walk around (in the spirit of *Stardew Valley* and *Dave the Diver*), painted in a layered atmospheric style (*Firewatch*, *Alto's Odyssey*). The first scenario pack, **The Kestrel Vale Line**, puts the player in charge of reopening a closed Victorian railway through Harrowby, a valley town that has waited 39 years for a train. It takes about 20 minutes, runs in any browser (desktop, tablet, phone), and needs no install or login.

It is built to be the first title in an education product line (working name **Groundwork Studio**): one engine, many sector packs.

## Play

Open `index.html` in a browser, or serve the folder over HTTPS (GitHub Pages / Netlify). Serving over HTTPS lets phones use native sharing and puts the link on the share card.

`classic.html` is the previous prototype (*Project Valley*), kept for comparison.

## The world

Walk the whole valley, left to right:

- **Harrowby**: school, cottages, Pritchard's bakery, the Kestrel Arms, the **Village Hall** (enterable) and the church. Four townsfolk (Len the retired signalman, June the baker, Dev who needs the train for college, and Jess at the school gate) say different things each chapter and react when the project is going badly.
- **The hill path and Harrowby Station**: boarded up and overgrown at the start, restored with a canopy, clock, flowers and bunting by opening day.
- **The viaduct**: 11 arches over Kestrel Beck. It changes with the project: ivy and a broken parapet, then survey flags and an X on Pier 4, then scaffolding, a crane and the crew, then track and lamps, then a working train crossing it.
- **The site compound**: your **site office** (enterable). Moira sits in the armchair, the planning wall opens the project board, and the kettle is a small morale boost. There's also the welfare cabin, materials and Tom's van.
- **Kestrel Junction**: the live main line with passing trains, signals and the signal box.

Each chapter changes the time of day, the season and the weather (dawn, day, dusk, overcast rain, night snow). **The loop:** your list (top left) and markers in the world show who to see. Gold diamonds mark conversations; an orange **!** marks the chapter's **Call**. Once everything is done, you close the week at your desk. **Optional exploring** rewards curiosity: townsfolk chats (+People), things to inspect, Moira's hints, and **eight hidden pages of Moira's 1986 notebook** that reveal her secret before she tells it.

Controls: A/D or arrow keys to walk (Shift to hurry) and E to interact. You can also click or tap where you want to go, or tap a person. Phones get on-screen ◀ ▶ Ⓐ buttons.

## Why it builds judgment (first principles)

Judgment is choosing well **under uncertainty**, when **goods compete** and **consequences are delayed**. You get better at it by predicting, committing, seeing consequences, comparing against expert reasoning, and noticing your own patterns. Each mechanic maps to one of those steps:

| Learning need | Mechanic |
|---|---|
| Weigh the situation, not the scoreboard | Effects are **hidden until after** every choice |
| Make uncertainty explicit | Every **Call** lists *What you know / What you don't* |
| Know how sure to be | **Confidence rating** after each Call, scored for calibration (Brier-style) |
| Delayed, probabilistic consequences | **Ripples** land chapters later. A poor call can get lucky and a good call can get unlucky, and the mentor explains why that still doesn't change the judgment |
| Expert comparison | **Moira Kell** (retired chief engineer) grades every Call, explains her reasoning, and names a **principle** |
| People, not just metrics | Team conversations change **trust** with five colleagues |
| Reflection | **Judgment report**: score, decision style, blind spot, calibration, principles, discussion guide |

## For educators and L&D

- A 20-minute individual play, then a 20–30 minute debrief using the built-in **discussion guide** (one prompt per Call).
- **Export results as CSV**: every call, grade, confidence and deliberation time, plus a summary. Useful for comparing decision styles across a cohort.
- Private by default: everything runs in the browser, and nothing leaves the device unless the learner exports or shares it.
- Accessibility: keyboard play (1–4, Enter), screen-reader live region, reduced motion, larger text, instant text, WCAG-contrast paper UI.

## Architecture

```
index.html              Shell: layers, HUD, fonts
css/lineside.css        UI: editorial type (Fraunces + Inter), paper cards, responsive
js/world/world.js       The explorable world: terrain, parallax, viaduct build states, rooms, camera, input
js/world/sprites.js     In-world illustration: characters (walk cycle, clothing, hats) and buildings
js/scene.js             Palette/colour helpers (plus the older static landscape renderer)
js/portraits.js         Flat-vector character portraits (SVG, 3 moods)
js/audio.js             Generative ambient score + weather + UI sound (Web Audio)
js/game.js              Engine: chapter flow, Calls, ripples, scoring, report, share, export
js/packs/kestrel-vale.js        Scenario pack: story, cast, conversations, Calls (pure data)
js/packs/kestrel-vale-world.js  World layer: who stands where each chapter, townsfolk, inspect text, notebook pages
```

**Art direction.** Layered atmospheric landscape illustration: the proven look of *Firewatch* and *Alto's Odyssey*. Flat silhouettes, aerial perspective, strong time-of-day palettes, parallax, weather, film grain and vignette. The viaduct changes across the project: derelict and ivy-covered, surveyed, scaffolded with a crane, track laid, then open with trains. Characters use a flat editorial portrait style. All art is generated in code, so there are no asset licences to manage and the whole game is under 200 KB.

### Adding a scenario pack

A pack is a data file. Copy `js/packs/kestrel-vale.js` and change:

- `cast`: people and their portrait `look`
- `chapters[]`: title, phase, month, scene (`time`: dawn/day/dusk/night/overcast · `season` · `weather`: clear/rain/snow · `build` 0–5 · `train`), intro lines, `talks`, `calls`, mentor line
- `talks{}`: small conversations with hidden effects and trust changes
- `calls{}`: the dilemmas. Each has `known[]`, `unknown[]`, a `principle`, a `discuss` prompt, and `choices` with `grade` (best/ok/poor), `why`, effects `e`, and an optional `ripple {at, p, hit, miss}`
- `finale`: the mentor's closing words for high, mid and low judgment

## Engine choice: do we need Godot?

**Not now.** For an education business the web is the stronger platform:

- **Reach.** It runs on school Chromebooks, locked-down corporate laptops and phones with no install. IT approval is usually the biggest barrier to selling into schools and enterprises.
- **Distribution.** A link, an LMS embed (SCORM/LTI wrapper later), or a QR code in a classroom.
- **Weight.** This game is about 200 KB. A Godot web export starts around 30–40 MB of WASM and has had rough edges on iOS Safari.
- **Speed of content.** Packs are data, so new sectors don't need engine work.

Godot (or Unity) becomes worth it if we later want 3D walkable worlds, console releases, or heavy real-time simulation. The pack format is engine-agnostic, so the content moves with us. The next step up on the web stack would be TypeScript + Vite, with PixiJS or WebGL if the art needs GPU effects.

## Roadmap (suggested)

1. Pilot with 2–3 cohorts (graduate engineers, PM apprentices). Measure pre/post calibration.
2. Facilitator dashboard: a class code that collects the CSV exports into one view (needs a small backend).
3. SCORM/xAPI export for LMS reporting.
4. Second pack in a non-rail sector (e.g. an NHS ward manager, or site safety in construction) to prove the engine generalises.
5. Voice-over and a composed score for the flagship pack.

## Brand note

"LINESIDE" and "Groundwork Studio" are working names. Run trademark and domain checks before public launch.
