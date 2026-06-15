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


### 2026-06-15 — Iteration 12 (P2 onboarding: objective breadcrumbs)
- Added Stardew-style bobbing "!" markers (`drawObjectiveMarkers`, world-space in render) over each
  incomplete weekly objective's target — the NPC to talk to or the zone to visit. Newcomers/children
  always see where to go next; hidden during modals/dialogue.
- Harness +1: **every** objective target (npc/zone) across all 11 weeks resolves to a real NPC/zone — this
  also retro-validated that the office/site zone-id redesign didn't break objective completion. **23/23
  green.** node --check clean.
- Next: week-transition stinger, compound fence enclosure, then P3 (choice-aware ending, office phase
  visuals, state-dependent events).


### 2026-06-15 — Iteration 13 (P3: choice-aware ending)
- The end screen now reflects the player's actual decisions: `chooseEvent` logs each curveball choice to
  `S.eventChoices` (persisted in save/load), the closing story names the **trade-off** they made (strongest
  vs weakest metric: "you protected safety (90%); budget (40%) was where it cost you most"), and a new
  **YOUR KEY DECISIONS** block recaps every curveball call. Cements the PM-judgement learning.
- Harness +1 (choices logged; end screen renders). **24/24 green.** node --check clean.
- Next: state-dependent events / choice callbacks (P3 depth), compound fence enclosure + week-transition
  stinger (P2-feel), office phase visuals (P3).


### 2026-06-15 — Holistic production review → new checklist
Full-build review (24/24 at the time). No crash/soft-lock blockers; content + engine production-ready on
desktop. Priorities for THIS audience (kids on phones via Squarespace):
**P1:**
- [x] Touch controls (on-screen D-pad + action button -> S.keys/handleInteract, shown on touch devices in-game) + responsive canvas (aspect-ratio scaling to fit any viewport).
- [x] Per-week interaction cap — re-talking NPCs / re-opening emails/meetings/inspections re-applied
      effects (metric-farm exploit, flattened difficulty + teaching). Now once-per-week each; repeats are
      flavour-only. + anti-exploit harness test.
- [x] PPE onboarding: phase-4 locker objective + automatic locker '!' breadcrumb whenever a site visit is pending without PPE.
**P2:**
- [x] "Week Complete" is now drift-free (removed the hidden morale/schedule penalty + dead branch). Only Skip This Phase gambles with drift.
- [x] loadGame calls checkWeekComplete() (completed-week save now shows its advance button).
- [x] Distinct ending arc by performance: PROJECT COMPLETE (4-5★) / DELIVERED (3★) / ROUGH DELIVERY (2★) / TROUBLED PROJECT (1★), with colour + honest framing. (Low-metric in-play warning already covered by the HUD alarm.)
- [x] Split music/SFX (playNote no longer gated by musicOn; SFX gate on S.sfxOn; separate 🔊 toggle in HUD). Colourblind-safe '⚠' tag on metrics below 40 (not colour alone).
**P3:** remove dead getNPCsOnMap()/overlay stubs; tie PM_KNOWLEDGE unlocks to decisions; compress
post-delivery; idle/turn animations.

### 2026-06-15 — Iteration 14 (P1: close the metric-farm exploit)
- Added a per-week interaction cap (`spentInteractions` + `interactionSpent`/`spendInteraction`, cleared in
  startNewWeek, persisted in save/load). NPC catch-ups, desk inbox, meetings, and each track inspection now
  give effects once per week; repeats show a flavour message. Restores scarcity/stakes and protects the
  teaching goal. loadGame now also calls checkWeekComplete(). **25/25 green** (incl. anti-exploit test).
- Next P1: PPE onboarding breadcrumb, then touch controls + responsive canvas.


### 2026-06-15 — Iteration 15 (P1: PPE onboarding)
- Added a 'Suit up — get PPE from the Locker Room' objective in pre-construction (phase 4) before the
  site-visit objective, and an automatic orange '!' breadcrumb over the lockers in any office phase where a
  site visit is pending and PPE isn't equipped. Newcomers/kids are now guided to PPE instead of getting
  stuck at the site door. **25/25 green.** node --check clean.
- Next P1: touch controls + responsive canvas (mobile). Then P2: Week-Complete drift fix, troubled ending.


### 2026-06-15 — Iteration 16 (P1: mobile — touch controls + responsive canvas)
- Made #gc responsive: `width:min(100vw,100vh*1.5); aspect-ratio:3/2` so the 3:2 game scales to fit phones/
  tablets/desktops (the canvas + all overlays scale with it). Added an on-screen D-pad + SPACE/action
  button (`#touch`) that drive `S.keys` and `handleInteract()`; shown only on touch devices while in-game.
- node --check clean, **25/25 green**. (Touch is DOM/visual — final verification is the owner's phone test
  on Pages.)
- This was the last P1. Remaining P2/P3: Week-Complete drift fix, troubled-project ending, music/SFX split,
  colourblind tags; dead-code, PM-knowledge-on-decision, animations.


### 2026-06-15 — Iteration 17 (P2: honest week-complete is drift-free; harness progression hardened)
- `advanceWeek` no longer applies the hidden morale-2 / random-schedule drift on honest 'Week Complete'
  (it always hit that branch since phase gaps are 4). Completing a week on your own merit now carries no
  secret penalty; only `skipPhase` ('let the team handle it') gambles with drift. Removed the dead branch.
- Harness: mocked `setTimeout` to run synchronously so transition callbacks fire in-test; the progression
  test now **actually walks 32 -> -8** and asserts morale is unchanged by honest completion. **25/25 green.**
- Next P2: troubled-project ending below ~40 avg; music/SFX split + colourblind metric tags. P3: dead-code,
  PM-knowledge-on-decision, animations.


### 2026-06-15 — Iteration 18 (P2: outcome-scaled ending)
- The end screen now frames the outcome by performance instead of always 'PROJECT COMPLETE!': a 1★ run
  reads 'A TROUBLED PROJECT — limped open, late and over budget' (red), 2★ 'A ROUGH DELIVERY' (orange),
  3★ 'DELIVERED', 4-5★ 'COMPLETE — a job well done' (gold). Combined with the choice-aware verdict + key-
  decisions recap, failure now teaches. Harness +1 (renders at low & high metrics). **26/26 green.**
- Next: music/SFX split + colourblind metric tags; dead-code (getNPCsOnMap); PM-knowledge-on-decision.


### 2026-06-15 — Iteration 19 (P2 accessibility + cleanup)
- **Audio split**: muting music no longer kills SFX. `playNote` is no longer gated by `musicOn` (BGM is
  gated by its own loop); `playSFX` gates on `S.sfxOn`; added a separate 🔊/🔇 toggle in the HUD.
- **Colourblind**: metrics below 40 now show a '⚠' tag (not colour alone) alongside the red alarm pulse.
- Removed the dead `getNPCsOnMap()`. **26/26 green**, node --check clean.
- Remaining P3 (nice-to-have): tie PM-knowledge unlocks to decisions; idle/turn animations; compress
  post-delivery. Core game is feature-complete and production-ready.


### 2026-06-15 — Iteration 20 (P3 polish: character life)
- Standing characters now have a gentle 1px idle 'breathing' bob (phase-offset per NPC so they're not in
  lock-step), and **NPCs turn to face the player** when you start talking to them (and hold still). Small
  touches, big Stardew-ish 'alive' payoff. **26/26 green**, node --check clean.
- Remaining P3 (optional): tie PM-knowledge unlocks to decisions; compress post-delivery.


### 2026-06-15 — Iteration 21 (P3: PM lessons attached to decisions)
- Each of the 10 curveball events now carries a one-line PM `insight`; resolving an event fires a 'PM
  INSIGHT' toast (reuses the achievement-toast queue with a custom label) so the lesson attaches to the
  decision the player just made — instead of the knowledge being a passive phase dump. Reinforces the
  educational goal at the moment of judgement. Harness +1 (every event has an insight). **27/27 green.**
- Core game is feature-complete; only optional 'compress post-delivery' remains.


### 2026-06-15 — Iteration 22 (playtest feedback: markers, PPE station, machinery)
Three items from the owner's mobile playtest (IMG_4617):
- **Marker clash fixed**: the objective '!' marker over an NPC was overlapping their name/heart status
  tag and expression bubble. Raised the NPC marker to `curY-28` (above the status tag), suppressed the
  ambient expression bubble while an NPC is an active objective target (`npcHasObjective(id)`), and
  anchored office NPCs at their desks (only site NPCs wander) so they no longer cluster.
- **PPE station**: the Locker Room zone (already wired: PPE gate before site, hi-vis+hard-hat overlay)
  had only a bookshelf as its visual. Authored a proper `lockers` sprite — grey locker bank with one door
  open showing an **orange hi-vis vest** (reflective strips) + **white hard hat** — and placed it at the
  zone (17,14), keeping the exact base-row collision the bookshelf had. Moved a reception plant to clear it.
- **Realistic + multiple machines**: rebuilt the `excavator` (proper tracks, slew, cab glazing, boom +
  dipper + toothed bucket) and added two new machine TYPES that mobilise in Construction (phase 5): a
  yellow **rail `tamper`** (cab, hazard stripes, tamping tines on the track) and a road-rail **`dumper`**
  (spoil tipper). They sit on/alongside the track corridor so renewal now shows a multi-plant work front.
- Atlas re-baked (26 → 29 entries), inlined `ATLAS` const re-synced. Verified with Python scene renders
  (office reception + construction-phase site) and the new sprites in isolation. **27/27 green**, node
  --check clean. Independent reviewer agent review in flight; findings (if any) fold into the next pass.
