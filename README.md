# LINESIDE — a game about judgment

> No scores on the buttons. No right answers on screen. Just the calls you make — and the ripples they send.

LINESIDE is a cinematic, story-driven judgment trainer. The first scenario pack, **The Kestrel Vale Line**, puts the player in charge of reopening a closed Victorian railway through Harrowby, a valley town that has waited 39 years for a train. It takes about 20 minutes, runs in any browser (desktop, tablet, phone), and needs no install or login.

It is built to be the first title in an education product line (working name **Groundwork Studio**): one engine, many sector packs.

## Play

Open `index.html` in a browser, or serve the folder over HTTPS (GitHub Pages / Netlify). Serving over HTTPS lets phones use native sharing and puts the link on the share card.

`classic.html` is the previous prototype (*Project Valley*), kept for comparison.

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
js/scene.js             Cinematic landscape renderer (Canvas 2D, layered parallax)
js/portraits.js         Flat-vector character portraits (SVG, 3 moods)
js/audio.js             Generative ambient score + weather + UI sound (Web Audio)
js/game.js              Engine: chapter flow, Calls, ripples, scoring, report, share, export
js/packs/kestrel-vale.js  Scenario pack (pure data)
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
