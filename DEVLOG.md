# Project Valley — Dev Log (studio loop)

Goal: production-ready, Stardew/Dave-the-Diver-grade educational railway PM game.
Single self-contained `index.html` (vanilla canvas, no libs), embedded on Squarespace via GitHub Pages.

Loop: **build → test (Node harness + Python art renders) → independent game-dev review → fix → push when green.**

## Test infrastructure
- `test/harness.js` — boots the game with mocked DOM/canvas/audio/localStorage and exercises real play
  paths. Run: `node test/harness.js`.

---

## Iterations

### 2026-06-14 — P0: test harness stood up
- Built `test/harness.js`. Boots `index.html`, captures internals, runs 12 smoke tests.
- Result: **12 passed / 0 failed.** Covered: boot, 5 metrics present, applyEffects 0–100 clamping,
  phase/timeline coverage, OMAP/SMAP grids valid, isSolid OOB-safe, 5 NPCs each with dialogue,
  every NPC dialogue choice applies + stays clamped, every EVENT choice applies, save→load round-trip,
  advanceWeek through all phases without throwing.
- Independent game-dev reviewer agent commissioned (full bug audit + integration plan + juice/UX/story
  review + roadmap). Its findings will set the P0/P1 order.

### Next
- Incorporate reviewer audit → fix any P0 bugs.
- P1: wire atlas (`art/atlas.png`) + walled-room office map + object layer + footprint collision into the
  renderer; then the railway-site map. Each gated by harness + render check + review.

### 2026-06-14 — Independent game-dev review landed → working checklist
Reviewer audited the live build. Content is strong; renderer/map layer is fragile with dead scaffolding.
Work the loop should execute in order (tick in this file as done):

**P0 — bugs/packaging (before art):**
- [x] Google Fonts `@import` — kept as progressive enhancement (every font-family already has monospace fallback + display=swap, so a locked-down iframe degrades cleanly, not broken). Full-offline base64 embed deferred (needs the .woff2; no network here). (index.html line ~7) — external dep breaks self-contained iframe. (If font file unavailable, ship a clean monospace fallback + keep import as progressive enhancement.)
- [x] Delete dead Phaser/atlas scaffolding: `drawCharSprite` (~3238), `drawTileSprite` (~3326), `TILE_SPRITES` (~380), `SPRITE_FW/FH/COLS` (~366), `WALK_DIR_ROW`/`IDLE_DIR_COL` (~372/375), and unused `walkSheet`/`idleSheet` char fields. Grep first; harness must stay green.
- [x] Save versioning + load clamp/validate (`loadGame` ~4112): clamp metrics 0–100, validate `px/py` in-bounds & not solid (else snap to safe spawn), default missing fields, add `version`. Extend harness with garbage-save recovery test.
- [x] Verify Continue button (confirmed: init ~4187 shows #contBtn when save exists) (works: `init` ~4187 shows `#contBtn` when save exists — confirm via harness). Remove unused `S.savedExists`.
- [x] Unify week advance into one enterWeek() funnel (event->report->new), all 3 paths converge (dedupe `advanceWeek` ~2325 / `skipPhase` ~2263 / `chooseEvent` ~2443 report+event ordering). Add harness ordering test.
- [x] Remove wasted `getNPCsOnMap()` call (~1312) whose result is discarded.

**P1 — renderer/map integration:**
- [x] Load `art/atlas.png` + inline manifest as `ATLAS`; added `drawSprite(ctx,name,dx,dy)` helper; add `drawTileAtlas` with procedural fallback.
- [x] Walled-room office map + objects + zones/labels/seats derived → derive `ZONES`/`AREA_LABELS`/NPC seats (kills coord drift). Port `/tmp/office_plan.py` as ground layer + `OFFICE_OBJECTS` list.
- [x] Precompute `OFFICE_SOLID` (walls + object base footprints); isSolid rewritten (walls + object *base* footprints only); rewrite `isSolid` as a grid lookup.
- [x] Inject objects into existing `entities[]` y-sort in `render()` (~3821) using base-y key.
- [x] Re-point NPC seats + wander; added isSolid guard to updateNPCAI to walkable cells; add `isSolid` check to `updateNPCAI` (~1343); fix `officeX>0`→`present` flag (B2/B3/B5).
- [x] Build parallel **site** map (fenced compound + cabins + materials + platform/track) (cabin/excavator/fence/cones/material stacks). Validate all spawns vs SOLID_GRID.
- [x] Harness invariants (doorways/reachability/seats/no-furniture-on-door): every doorway walkable; every room flood-fill reachable from spawn; no object footprint over a doorway; every NPC seat/wander/zone non-solid & in-bounds.

**P2 — juice/UX:** footstep dust+bob; floating score popups on decisions; HUD meter punch; event slam-in; week-transition wipe + stinger; heart-up burst; onboarding breadcrumbs/"!" markers; metric tooltips + low-metric alarm; gate/explain Skip Phase.

**P3 — story/polish:** phase-distinct objective verbs (real inspection/budget mini-interactions); state-dependent events + choice callbacks; choice-aware ending; state-driven NPC expressions; map-aware ambient particles; milestone camera punch.


### 2026-06-14 — Iteration 1 (P0): save/load hardening
- `loadGame` now clamps metrics to 0–100, validates `playerChar`, coerces map, and **validates the loaded
  spawn against `isSolid`** — snapping to a known-good tile if the saved px/py is solid/out-of-bounds
  (prevents soft-lock after the upcoming map swap). `saveGame` gains `version:2`.
- Harness extended with a corrupt-save recovery test. **13/13 green.** `node --check` clean.
- Verified Continue button surfacing is correct (no fix needed).
- Next: remove dead Phaser scaffolding (`drawCharSprite`/`drawTileSprite`/sprite consts) + wasted
  `getNPCsOnMap()` call; then the renderer/atlas integration (P1).


### 2026-06-14 — Iteration 2 (P0): remove dead sprite scaffolding
- Deleted `drawCharSprite`, `drawTileSprite`, `TILE_SPRITES`, `SPRITE_FW/FH/COLS`, `WALK_DIR_ROW`,
  `IDLE_DIR_COL` (dead since the reverted Phaser attempt) and the wasted `getNPCsOnMap()` call in
  `updateNPCAI`. ~75 lines removed; file 4201→~4090 lines.
- **Caught a real regression via the ref-grep (harness missed it):** `WALK_FRAMES` is still used by the
  player/NPC animation counters — restored the const, and added a harness test that drives `updatePlayer`/
  `updateNPCAI` and asserts animation frames stay finite. **14/14 green.** `node --check` clean.
- Next: P1 — load atlas + manifest; begin ground/object renderer split.


### 2026-06-14 — Iteration 3 (P0 font decision + P1 prep)
- Font: kept Google-Fonts import as a graceful progressive enhancement (monospace fallback everywhere +
  display=swap). Logged; offline embed deferred (needs font file).
- P1 prep: added `art/atlas.png` to ASSET_LIST, inlined the atlas manifest as `ATLAS` (keeps single-file),
  and added `drawSprite(ctx,name,dx,dy)`. Additive only — renderer not yet switched. Harness asserts the
  manifest is well-formed. **15/15 green.** node --check clean.
- Next: P1 — build the `ROOMS` table from /tmp/office_plan.py, render an in-engine office-map verification
  in Python, then wire ground-layer atlas tiles + object y-sort + SOLID_GRID. (Also still open P0: unify
  week-advance into one enterWeek() funnel — do alongside P1 with ordering tests.)


### 2026-06-14 — Iteration 4 (P1): walled-room office wired into the game
- Replaced OMAP with a 30x18 walled-room ground grid (meeting/open-plan/your-office/break/docs/
  reception, 2-tile doorways) + OFFICE_OBJECTS furniture list + OFFICE_SOLID collision grid (walls +
  object *base* footprints only, so you walk behind tall items).
- New `drawOfficeGround` blits atlas tiles (baseboard on south-facing walls); furniture injected into the
  existing y-sort; `isSolid` rewritten to the office grid; ZONES/AREA_LABELS/NPC seats/wander/spawns
  re-derived for the new layout; added a wall-respecting guard to NPC wander.
- Verified with a Python render of the EXACT atlas + map data (matches approved design) and 1 new
  harness invariant test (doorways walkable, no furniture on doorways, seats clear, every room reachable
  from spawn via flood-fill). **16/16 green.** node --check clean.
- Sent independent reviewer the diff. Next: P1 site map (same structure) + fold enterWeek() funnel.

### 2026-06-14 — Site design verified (prep; non-conflicting while office under review)
- Designed the new railway **site** (30x20) and rendered it from the real atlas: grass field + station
  **platform** (concrete + tactile edge), a **track corridor** across, and a **fenced compound** (gate at
  the track) containing the **site-office** + **welfare** cabins and a **materials yard** (rail/sleeper/
  ballast stacks), excavator, cones, hi-vis crew. Verified visually — ready to port with the same
  ground/object/SOLID_GRID structure as the office.
- Persisted the art-pipeline tooling into `tools/` (artlib, charart, bake_atlas, office_plan, site_plan,
  verify_office) so the autonomous loop survives a container recycle.
- WAITING on independent review of the office-integration commit (4e5ebd6) before the next index.html
  changes (apply review fixes → port site → fold enterWeek funnel).


### 2026-06-14 — Iteration 5 (P1 office: independent review fixes + first juice)
- Independent reviewer audit of the office integration came back **clean (no P0/P1)**. Applied its P2s:
  * Camera now **centers** the map when smaller than the viewport (office was pinned to the top).
  * loadGame office **fallback spawn** fixed to the new reception (14,15) (was stale old (7,14)).
  * Removed dead `const map` in render().
  * Added a **locker** (bookshelf) at the PPE zone so it has a visual cue (was blank floor).
- Game-feel quick wins: **object drop-shadows** under solid furniture (depth) and **footstep dust** puffs
  at the player's feet while walking.
- **16/16 green.** node --check clean. Reviewer's remaining notes (notice/planning visuals) logged for P2.
- Next: port the verified fenced-compound **site** (same ground/object/SOLID structure) → then enterWeek().


### 2026-06-14 — Iteration 6 (P1): railway site wired into the game
- Replaced SMAP with the verified 30x20 fenced-compound site (grass field + station platform, track
  corridor, gravel compound with site-office + welfare cabins + materials yard, gate at the track).
  Added SITE_OBJECTS + SITE_SOLID (object base footprints) using the same objBaseCells helper; new
  drawSiteGround blits atlas ground tiles; object layer unified for both maps; isSolid site branch uses
  SITE_SOLID; ZONES/AREA_LABELS/site-NPC seats/site spawn re-derived; NPC wander is now map-aware
  (NPC_WANDER_SITE).
- Disabled the two phase-overlay functions (drawSitePhaseOverlay/drawOfficePhaseOverlay) — they drew
  construction visuals at OLD 50x30 / 30x26 coords and would glitch on the new maps. **TODO(P3): rebuild
  the construction-progression visuals for the new layouts** (this is the wanted 'track visibly builds'
  feature — re-add properly).
- Verified via exact atlas+map Python render (matches design) and a new site invariant test (spawn/gate
  walkable, NPC seats clear, compound+materials+track reachable). **17/17 green.** node --check clean.
- Next: independent review of the site diff; then fold enterWeek() funnel; then P2 juice/UX.


### 2026-06-14 — Iteration 7 (site review fixes + construction progression restored)
- Independent site review: **no P0**. Applied fixes:
  * Stale site save-snap spawn (4,6)->(3,13) to match transitionToMap.
  * (P1 regression the reviewer flagged) — **rebuilt the 'track visibly builds' feature for the new site**:
    `siteTrackFrac()` lays the track left-to-right across construction phases (formation/gravel -> rails),
    and site objects phase in via a `minPhase` (`m`) gate — materials delivered at procurement (phase 3),
    excavator + cones mobilised pre-construction (phase 4). Verified with a 2-phase render (kick-off = bare
    formation/empty; construction = rails laid + plant + materials).
  * Made phased decor non-solid (SITE_SOLID_OBJ = cabins+fence only) to avoid invisible collision before
    objects appear; collision is now phase-independent (stable).
- Harness +3: NPC wander targets walkable (office+site), zone interactability, track-fraction monotonic 0..1.
  **20/20 green.** node --check clean.
- Remaining from review (P2, low risk): delete orphaned `SOLID` set + `drawTile()` (~300 dead lines) and
  gut disabled overlay bodies; add full fence enclosure of the compound; office phase visuals (P3).
- Next: enterWeek() funnel (last P0), then P2 juice (score popups, HUD punch, event slam-in) + onboarding.


### 2026-06-14 — Iteration 8 (P2 juice: decision feedback)
- Added a screen-space **floating score-popup** system (POPUPS + spawn/update/draw, drawn after the camera
  restore) and wired it into `applyEffects`: every metric change pops a colour-coded `+N SCH`/`-N MOR` that
  rises and fades from the player, plus a **HUD "punch"** (the changed metric readout scales+brightens via a
  CSS keyframe). Makes decisions feel responsive/addictive (Dave-the-Diver number-pop).
- Harness +1 (decisions spawn the right number of popups, no throw). **21/21 green.** node --check clean.
- Next: enterWeek() funnel (last P0); more P2 (event slam-in, week-transition stinger, onboarding cues);
  P2 cleanup (delete orphaned SOLID/drawTile); fence-enclose the compound.


### 2026-06-15 — Iteration 9 (P2 cleanup: remove dead render code)
- Removed the orphaned numeric `SOLID` set and the ~305-line `drawTile()` (both maps now render via
  drawOfficeGround/drawSiteGround from the atlas; reviewer confirmed zero callers). Gutted the two disabled
  phase-overlay bodies to stubs (track progression now lives in drawSiteGround + phased site objects).
- ~370 lines removed (4099->3727). Verified by brace-matched removal + node --check + harness boot.
  **21/21 green.** Much clearer surface for the remaining work.
- Next: enterWeek() funnel (last P0), event slam-in / week-transition juice, onboarding cues.


### 2026-06-15 — Iteration 10 (P0 done: enterWeek funnel)
- Added a single `enterWeek()` (-> end / curveball event / monthly report / new week) + `afterEvent()`.
  `closeWeekTrans`, `chooseEvent`, and `skipPhase` all converge here, removing 3 duplicated end/event/
  report orderings (report-weeks and event-weeks collide at 28/24/20/16/12/8/4/0, so this was genuinely
  fragile). skipPhase now also auto-resolves the landing-week event (>=nextWeek) so 'skip' stays
  'let the team handle it'.
- Harness +1: at collision week 28, enterWeek shows the event, chooseEvent resolves it exactly once, the
  report then shows, closeReport runs startNewWeek. **22/22 green.** node --check clean.
- **All P0 + P1 complete.** Next: P2 juice (event slam-in, week-transition stinger), onboarding cues,
  fence-enclose the compound, then P3 (office phase visuals, choice-aware ending).


### 2026-06-15 — Iteration 11 (P2 juice: alarm + event slam-in)
- **Low-metric alarm**: any HUD meter below 40 turns red and pulses (`updateHUD` toggles a `.danger` class).
  Makes a failing project legible at a glance and raises the stakes.
- **Event slam-in**: curveball modals now slam in with a scale/fade keyframe and a `triggerShake` jolt +
  the existing alert sting — a curveball feels like one. (Modal slam applies to all modals for consistent
  feedback.)
- node --check clean, **22/22 green**.
- Next: onboarding next-objective breadcrumb (kid clarity), week-transition stinger, compound fence
  enclosure; then P3 (choice-aware ending, office phase visuals).
