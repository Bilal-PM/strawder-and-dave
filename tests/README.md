# LINESIDE test suite

Browser tests for the game, driven through the real UI with Playwright (Chromium). There's no build step and no
dependencies to install: the runner uses the Playwright that's already on the machine.

## Running it

```sh
node tests/run.js                      # every suite (about 7 minutes)
node tests/run.js smoke gating         # just the named suites
node tests/run.js --list               # what each suite does
node tests/run.js --rev=HEAD           # test the last commit instead of the working tree
```

The runner prints a PASS/WARN/FAIL table, writes `tests/out/results.txt` and `tests/out/results.json`, and exits
with code 1 if anything FAILed. A **WARN** is worth a look but doesn't fail the run.

| Option | What it does |
|---|---|
| `--rev=<git rev>` | Exports that commit read-only (`git archive`) into `tests/out/rev-<sha>/` and tests it. Use it while someone is part-way through an edit and the working tree doesn't boot. |
| `--file` | Opens `index.html` via `file://` instead of the built-in local web server (see "Good to know"). |
| `--seed=N` | Seeds the random policy and the game's `Math.random`, so a random run can be replayed. Every run prints its seed. |
| `--grep=text` | Runs only the checks whose name contains `text`. |
| `-v`, `--verbose` | Prints every check's details, including passes. |
| `--headed` | Shows the browser. |
| `--fonts=cache\|block\|offline` | Google Fonts are flaky through the sandbox proxy, so each font file is fetched once and served from `tests/out/.font-cache/` after that (`cache`, the default). `block` uses fallback fonts; `offline` uses only the cache. |

Environment: `PLAYWRIGHT_PATH` (default `/opt/node22/lib/node_modules/playwright`), `LS_URL` (test a URL you serve
yourself), `LS_PERF_SECONDS` (default 5), `LS_CHECK_TIMEOUT` (ms per check, default 420000).

Output in `tests/out/` (git-ignored): `results.txt`, `results.json`, `screens/` (screenshots plus `index.html`, a
contact sheet), `rev-*/` (exported builds) and `.font-cache/`.

## What each suite checks

A **preflight** check runs first. If the game doesn't reach its title screen, the runner stops there and says why,
instead of letting every check time out.

**smoke**: the page loads with no JS errors, no failed requests and no missing files. The title and its buttons
render inside the viewport and can be clicked, the world canvas isn't blank, and there's no Continue on a first
visit. A new game with the default text speed reaches free roam with an objective. Desktop and mobile.
- **Touch controls** (mobile): dragging the joystick walks, tapping Ⓐ next to someone opens (and keeps open) the
  conversation, and tapping a person on screen walks you over and starts talking.
- **Keyboard only** (desktop): Enter and the number keys get you from the title to walking.
- The **test API contract** (below): warns if the game drifts from it.

**playthrough**: a full Chapter 1 through the real UI, on desktop (1440×900) and mobile (390×844, touch).
- `expert` policy: always the expert-graded option (grades come from the content pack), calibrated confidence, and
  the works plan in dependency order. It must end **Approved**.
- `random` policy: random options and confidence, sometimes "change my mind", plus random side trips to townsfolk,
  props, doors and the project board. It must reach the **report**.
- Both must have no JS errors and complete every task. No task may finish before its `needs`, and the objective
  must never point at a locked or finished task. On the expert runs the report's actions must work: the share card
  renders, the CSV downloads with a row per decision, and Copy confirms. After the report, "What's next" must open,
  and a reload must not offer Continue for a finished chapter.

**gating**: the world obeys engineering logic.
- Closed line: ground that's blocked without PPE and walkable with it is found from `world.canStand`. Walking at it
  with the arrow keys and no PPE stops you at the edge (with a message). After the induction you can walk onto it.
  Every frame is checked so the player never stands on blocked ground.
- Depot door: records whether you can even reach it on foot without PPE. Pressing E at the door without PPE gives a
  refusal and doesn't let you in. With PPE it opens.
- Tasks unlock only when their `needs` are done: `LS.game.avail()` is compared with the pack at three points in the
  chapter, and talking to the holder of each locked task mustn't start it.
- Level crossing: finds the gap in the closed line that's walkable without PPE, then walks over it and back.

**reachability**: breadth-first search over `world.canStand` from the spawn point, with and without PPE. It checks
that the player can get within interaction range of every outdoor entity, and, with PPE, of the task entities that
appear later (defects, hotspots). It then searches inside every room from the point its door drops you, and checks
every exit's landing point. It reports anything unreachable, anything that's only reachable with PPE, and anything
that can be reached but is always shadowed by a nearer entity, so E never picks it.

**save**: reload, then Continue, must resume in the same room and position with the same state (`S` compared field
by field):
- after the induction (inside a room), and mid track walk just after walking into the depot, then played to the end
  with no decision recorded twice;
- reloading in the middle of an activity rolls back to the last save, and the activity then replays cleanly;
- reloading while a Director surprise is on screen must keep the activity you had just finished.

**layout** (mobile FAILs, desktop WARNs): every distinct screen of an expert playthrough, plus the title, setup,
every project-board tab, the report and "What's next", audited after CSS animations and transitions have settled.
Nothing in the visible layers or pop-ups may run past the viewport's left or right edge. The HUD must not sit on top
of an open dialogue card. Text mustn't be clipped by its box or a clipping parent, or stranded off screen where it
can't be scrolled to. Every on-screen button in the top layer must actually receive a tap at its centre. A self-test
plants each kind of problem first, to prove the audit catches it.

**performance**: samples `requestAnimationFrame` for 5 s outdoors and inside the depot, on desktop and mobile. It
reports the average, p50, p95 and max frame time, fps, long frames, main-thread busy time per frame, script time and
JS heap (from the Chrome DevTools Protocol). It FAILs if the average frame is over 50 ms and WARNs if the average is
over 20 ms, the p95 over 33.4 ms, or the main thread busy over 12 ms per frame. A window over budget is sampled
again once and the better one kept, because other work on a shared machine can spoil a window. Headless Chromium caps rAF at 60 Hz
and renders in software, so compare builds with it rather than treating it as a device benchmark.

**screenshots**: plays Chapter 1 on desktop and mobile and saves the first instance of every kind of screen (title,
setup, chapter card, narration, dialogue, choices, each room, the board, track walk, works plan, the Calls,
confidence, surprises, the gate review, the report and what's next) into `tests/out/screens/<viewport>/`, with a
contact sheet at `tests/out/screens/index.html`.

**learning**: plays the Project Planning module (the Learning World, `js/learn/`) end to end on desktop and mobile
with the scripted AI classmates: "Save and leave" part-way and resume; the Board's seven beats; the Planning Table's
three challenges (including loop protection) with the finish checked against the critical-path engine; the three
puzzles answered correctly (plus the tamper follow-up); the Brew with chips and free text, where "the critical path is
just the longest task" must be detected and countered, a partial answer probed, and the teach-back to Dev hit at least
three key points; Hour Eight's expert path must reach Gold, a replay that cuts the crossing tests must be refused by
Hannah and capped at "Not yet"; the Logbook lights the lamp and books lamp checks. Then, in Chapter 1, the office
board must offer the module and show the Planning Lens, and leaving must hand the world back. Progress must be in
`lineside_learn_v1`, never the chapter save. Every screen is layout-audited (mobile FAILs, desktop WARNs) and saved to
`tests/out/screens/learning/<viewport>/` (or `$LS_LEARN_SHOTS/<viewport>/`).

## How it works

- `run.js` is the runner. `lib/harness.js` launches the browser and holds the viewports, error capture, font cache,
  local web server and the UI **driver**. `lib/inpage.js` is injected into the page before the game's scripts
  (`window.__T`). `suites/*.js` hold one file per suite.
- **No map coordinates are hardcoded.** Everything comes from the running game through the stable test API:
  `LS.game.S()`, `LS.game.world()` (entities, room, player, paused, fadeDir, ppe, canStand, onInteract, fitScale,
  snapCam), `LS.game.currentTarget()`, `LS.WORLD.{MAP, DOORS, ROOMS}`, `LS.PACKS['kestrel-vale']`, and the DOM layers
  `#title #setup #chapter #talk #panel #report #board`, each with class `on` when visible.
- The driver looks at the screen, acts, then **waits for the screen to change**: a DOM mutation, a layer toggling,
  or the world pausing, fading or changing room. It doesn't use fixed sleeps. It clicks like a person, with a hit
  test first. It interacts like a player too: it stands where the game's own `world.focus` picks the entity, then
  presses E. The reach radius is measured at runtime by probing `world.focus`. It follows the on-screen objective
  (`world.objective` when the world has one, else `currentTarget()`), and walks through doors to get between rooms.
- Doors can be described as `{to:{room,x,y}}` (as the brief says) or as the tile world's `kind:'door'` (`e.door.room`)
  and `kind:'exit'`. The suite understands both.

## Good to know

- The game is served from a tiny local web server by default, because under headless Chromium `file://`
  localStorage was sometimes wiped across a reload of the game page (about 1 in 5 reloads). Over http that never
  happened. `--file` is still there if you want to test `file://`.
- Instant text (`lineside_settings.instant`) and sound off are set for speed in most suites. Smoke uses the defaults.
- A missing file (for example a script `index.html` references before it's committed) fails **smoke** only. Other
  suites note it and carry on, so one missing file doesn't fail every check.
- If the content changes so that the expert policy stops picking expert answers, the playthrough WARNs with the
  decisions it got wrong.
