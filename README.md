# LINESIDE — a game about judgment

> No scores on the buttons. No right answers on screen. Just the calls you make, and what they lead to.

LINESIDE is an explorable, story-driven judgment game set in an open, top-down world you walk around (in the spirit of *Stardew Valley*). The first scenario pack, **The Kestrel Vale Line**, puts you in charge of reopening a worn-out branch line in Harrowby, a valley town whose railway closed "temporarily" in 2009. The track is life-expired, and the only train, **Marjorie**, a 1961 diesel railcar, has sat in the depot ever since. Your job: renew the track, restore the train, test it all, open the line, and bring the town back to life.

It runs in any browser (desktop, tablet or phone), with no install or login. It is built to be the first title in an education product line (working name **Groundwork Studio**): one engine, many sector packs.

## Status: Chapter 1 of 6

The game is planned in six chapters (see [`docs/DESIGN.md`](docs/DESIGN.md)). **Chapter 1, "Make the Case", is complete and playable** (about 15–20 minutes). The rest are designed and waiting for sign-off.

| # | Chapter | Real-world phase | Status |
|---|---|---|---|
| 1 | Make the Case | Feasibility & funding (gate review) | **Playable** |
| 2 | Strip Down | Mobilisation, ecology, first possession | Designed |
| 3 | The Relay | Drainage and track renewal | Designed |
| 4 | Crossing Lines | Level crossing, regulator, main-line junction | Designed |
| 5 | First Movement | Static tests, test runs, driver training | Designed |
| 6 | The Big Day | Grand opening, and the town's economy returns | Designed |

## Play

Open `index.html` in a browser, or serve the folder over HTTPS (GitHub Pages or Netlify). Serving over HTTPS lets phones use native sharing and puts the link on the share card. `classic.html` is the earlier *Project Valley* prototype, kept for comparison.

Controls: WASD or the arrow keys (Shift to hurry), or click or tap where you want to go; E to interact. Phones get a joystick and an Ⓐ button.

## Chapter 1: Make the Case

Six in-game weeks, from March to April. It opens the Sunday before you start: at dawn the depot door is open a crack, and by torchlight you find a railcar under a dust sheet, a flask that's still warm, and one cab window someone has wiped clean. Then Moira says "That's my tea." On Monday Helen asks your first real question ("So… can we open by next summer?"), and then:

1. **Site induction** with Hannah (safety) at the project office, which gets you your PPE. Without it you can't go "on or near the line" (within 3 m of the rails) or enter the depot, and even with it you walk the line under Tom's safe system of work. The live main line beyond the junction stop board is off limits.
2. **Walk the line** with Tom, judging five real defects: rotten sleepers, a blocked drain (with a duck in it), Beck Bridge (scour you can't see), vegetation (with nesting-season rules) and the dead Crag Lane level crossing.
3. **Marjorie's health check** with Gaz in the depot: cab and electrics (possible asbestos, and the air horn goes *peep*), bogies and wheelsets, brakes, engines (someone has secretly been maintaining her) and the body (structural rust, slam doors, and Kevin the pigeon in residence). Then one decision: what to do first the week the money lands.
4. **The works plan** with Jo: put both workstreams in dependency order (asbestos survey & strip down → bogies & wheelsets, with body repairs alongside → brakes → engines & rewire → static tests; ecology & clearance → drainage & Beck Bridge repairs → relay, tamp & stress → level crossing & junction), then work out when test runs can start and which workstream is the **critical path**. Grey rows show the slow work that isn't on the board: designs, approvals and the junction booking before, and test runs, driver training, trial running and sign-off after.
5. **The drop-in** at the village hall with Priya and Cllr Brian, once you've walked the line: four questions from the town. Honest answers build support; over-promises feel good now and **echo into Chapter 2**.
6. **Two Calls**: *The Ridership Forecast* (optimism bias) with Steve, and *Name the Date* (ranges, not points) with Helen.
7. **The Funding Panel**, a gate review. Everything you did is laid out as "your case", the panel asks three questions (including where the train goes and who will run it), and your readiness score decides the outcome: **Approved**, **Approved with conditions** or **Deferred**. That outcome carries into Chapter 2.

Along the way the Director throws in surprises (a flood warning, a newspaper rumour, trespassers, a bargain with no paperwork, a hole in the budget, a deadline for the main-line junction weekend, bats in the bridge, a farmer's forgotten crossing, and scope creep), each graded on the decision, not the dice.

The world obeys engineering logic: the closed line needs PPE, the depot needs PPE, and some tasks unlock only after others (you can't plan work you haven't seen).

### Points that make sense

- **The project dashboard, in real units**: schedule float (weeks), contingency (£k), safety culture, evidence, team morale and town support (%). Outcomes move it, and outcomes include luck.
- **Judgment Points (JP) and a career rank** (Graduate PM → Assistant PM → Project Manager → Senior PM → Programme Director). JP reward the quality of each decision (expert-graded) and, on the Calls, **calibration**: confidence that matches the quality of your call earns a bonus, and being certain about a weak call costs you. Luck never earns JP.
- **13 achievements** that unlock in fun ways: *Kettle's On*, *Peep Peep*, *Pigeon Whisperer*, *Where's Sleeper?* (the depot cat), *Eagle Eye*, *Order, Order!*, *Biscuit Diplomacy*, *Measure Twice*, *Home on the Range*, *Local Knowledge*, *Anorak*, *First Page* and *Green Light*.

### The cast

Helen Walsh (sponsor), Jo Adeyemi (engineering), Tom Brennan (track and site), Hannah Clarke (safety), Steve Hale (commercial), Priya Nair (community), Gaz Whitfield (depot fitter), Cllr Brian Pike (parish council, biscuits), Moira Kell (Harrowby's last station master, your mentor), and the townsfolk Len, June, Dev and Jess. Also Marjorie the railcar, Sleeper the cat and Kevin the pigeon. The humour is warm and relatable, never dark or rude.

## The world (open world, Stardew-style 3/4 pixel art)

A 128×84-tile valley, laid out by the level designer to a proper town plan and drawn by the technical artist in 16px pixel art (Kenney CC0 tiles plus hand-drawn railway pieces, ENDESGA-32 palette):

- **Harrowby** is built along the High Street: the village hall (you can go in), the Kestrel Arms, Pritchard's bakery, cottages, the school, a green with the bus stop, and St Oswald's church. Fingerposts stand at the junctions.
- **The station and yard:**
  - The terminus has its platform on the track side, with a forecourt facing Station Road.
  - Harrowby Depot stands on its own siding, off a turnout beyond the platform end. You can go in; Marjorie is inside.
  - The project compound has a single marked **PPE access gate**, and the project office inside it can be entered.
- **The line** runs east with a fenced corridor and cess:
  - the three-arch **Beck Bridge**;
  - the **Crag Lane level crossing**, a public road at 90°;
  - the **limit of the closed line** board;
  - **Kestrel Junction** on the live main line.
- **Around the valley:** the beck, crossed by stepping stones, a road bridge and a packhorse bridge. Also woods, Kestrel Crag, Moira's Beck Cottage, and fields with sheep.

**Getting around:**
- Tap or click to walk: the path is worked out for you, so you can't get stuck.
- Every door has a lit mat and a sign. Walk up onto the mat to go in, and walk out through the marked EXIT to leave.
- A breadcrumb trail and a bouncing marker show your next objective.
- Team members have name tags.
- Controls: WASD, the arrow keys or tap-to-walk; E or Ⓐ to interact.

**Engineering logic in the map:**
- The closed line (within about 3 m of the rails) and the depot need your induction and PPE.
- The live junction and main line are never walkable.
- The level crossing is always public.

## Why it builds judgment (first principles)

Judgment is choosing well **under uncertainty**, when **goods compete** and **consequences are delayed**. You get better at it by predicting, committing, seeing consequences, comparing against expert reasoning, and noticing your own patterns. Each mechanic maps to one of those steps:

| Learning need | Mechanic |
|---|---|
| Weigh the situation, not the scoreboard | Effects are **hidden until after** every choice |
| Make uncertainty explicit | Every **Call** lists *What you know / What you don't* |
| Know how sure to be | **Confidence rating** after each Call, scored for calibration (Brier-style) |
| Go and see | Walk the track, inspect the train and hear the town **before** committing to anything |
| Real sequencing | Order the works in dependency order and find the **critical path** |
| Delayed consequences | **Echoes**: over-promises made in Chapter 1 come back in Chapter 2 |
| Expert comparison | Moira, Tom and Jo explain the expert view after every graded decision; each Call names a **principle** |
| A real gate | The **Funding Panel** judges the whole body of evidence you built up |
| People, not just metrics | Conversations change **trust**; town support moves with how honest you are |
| Reflection | **Chapter report**: Judgment score, JP and rank, decision style, dashboard, achievements, lessons, facilitator guide |

## For educators and L&D

- Chapter 1 takes 15–20 minutes of individual play, followed by a 20–30 minute debrief using the built-in **discussion guide**.
- **Export results as CSV**: every graded decision, grade and confidence, plus a summary. Useful for comparing decision styles across a cohort.
- Private by default: everything runs in the browser, and nothing leaves the device unless the learner exports or shares it.
- Accessibility: keyboard play (1–4, Enter), screen-reader live region, reduced motion, larger text, instant text, WCAG-contrast paper UI.

## Architecture

```
index.html              Shell: layers, HUD, fonts
css/lineside.css        UI: editorial type (Fraunces + Inter), paper cards, responsive
js/world/world.js       The open world: map, collision + PPE gating, y-sorted rendering, rooms (office, hall, depot + Marjorie), lighting, input
js/world/sprites.js     In-world illustration: 4-direction characters with PPE, building facades (incl. the depot)
js/scene.js             Palette/colour helpers (plus the older static landscape renderer)
js/portraits.js         Flat-vector character portraits (SVG, 3 moods)
js/audio.js             Generative ambient score + weather + UI sound (Web Audio)
js/game.js              Engine: tasks & gating, activities (track walk, health check, works plan, drop-in, panel), Calls, JP & ranks, achievements, report
js/packs/kestrel-vale.js        Scenario pack: cast, chapters, Chapter 1 content, Calls, achievements, ranks (pure data)
js/packs/kestrel-vale-world.js  World layer: placements, townsfolk (attitudes change with support), notes, hints, inspect text
docs/DESIGN.md                  The full six-chapter design
```

**Art direction.** Flat editorial illustration in a top-down 3/4 view, with strong time-of-day palettes (dawn, day, dusk, overcast with rain), weather, film grain and vignette. The world changes as the chapter progresses through six weeks. All art is generated in code, so there are no asset licences to manage and the whole game is a few hundred KB.

### Pack data (Chapter 1)

`PACK.c1` holds the chapter: `coldOpen` (the Sunday torch scene, Moira, Monday and Helen's first graded question), `tips` (one-line coach marks), `tasks[]` (with `needs` for dependency gating), `talks`, `defects[]` (each with graded options), `hotspots[]` (Marjorie's health check, with optional fun follow-ups) and `healthDecision`, `plan` (lanes of cards in their correct order, grey `background` rows, plus critical-path questions), `dropin`, `panel` (questions and the three outcomes), `events` (the Director's surprises, with `weight(S)`, `cause(S)` and optional `luck`) and `end`. `PACK.calls` holds the Calls (`known`, `unknown`, `principle`, `discuss`, `atWork`, graded `choices` with effects `e`, an optional `ripple` echo and `ach`). `PACK.chapters[]` carries each chapter's `objective`; `PACK.achievements` and `PACK.ranks` drive progression; `PACK.glossary`, `PACK.outcomes` and `PACK.selfCheck` support learning. Graded items carry an `lo` tag for their learning outcome. Every graded set has exactly one `best`, and the expert option must not give itself away by length (it is the longest in 9 of 30 sets).

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
