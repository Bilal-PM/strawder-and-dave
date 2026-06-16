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
  --check clean. Independent reviewer: no P0/P1 (Locker Room zone still reachable via proximity box).
  Acted on its two P2 thematic nits — moved the tamper onto the running line (9,9) and the dumper onto
  the track heading to the yard (22,11), so both machines now read as working ON the track (and the
  dumper no longer overlaps the return-to-office zone).


### 2026-06-15 — Iteration 23 (judgment-deepening pass + leadership path + humour)
Reviewed the full logic/story and ran an INDEPENDENT expert (PM practitioner + instructional designer).
Verdict: strong *awareness* tool, but it taught arithmetic-against-a-rubric, not *judgment under uncertainty*
— no real risk, no involuntary setbacks, no delayed consequence, cosmetic pushback. Implemented their top-5
plus the owner's two new asks. All gated by the harness (now **35/35 green**, +8 assertions) and node --check.
- **Seedable RNG** (`rng`/`seedRng`, mulberry32) so gameplay randomness is testable/deterministic.
- **Difficulty modes** Apprentice/Manager/Director — selector on character-select; `applyEffects` scales
  penalties/rewards; eases the rating gate for Apprentice; persisted in save/load.
- **Real risk**: "gamble" choices (push back, ask for funding, wait-and-hope, concession, dispute snags) now
  roll the dice and can BACKFIRE — odds hidden (qualitative desc only), with a post-roll beat that teaches
  "judge the decision, not the dice."
- **Involuntary setbacks**: Supplier Collapse (wk12) and Quality Question (wk0) pre-apply an unavoidable hit,
  then offer recovery choices — resilience, not just avoidance.
- **Consequence callbacks with NAMED causality**: skipping the wk28 survey worsens the wk8 near-miss; waving
  through the wk8 near-miss worsens the wk4 weather event — each spelled out in-fiction.
- **NPC personalities + memory with teeth** (`PERSONA`): Mike/James are time-poor and may wave you off once
  at low rapport; James is hard to win over; warm/cool/overruled openers driven by rapport+memory; taking a
  side in the wk20 clash costs hearts with the other lead, who remembers being overruled.
- **Rating gate**: a red metric caps the star rating (red safety caps harder) — governance, not averages.
- **Reflection beat** in the monthly report names the delayed cost of an earlier call.
- **NEW — Leadership Path indicator** (owner ask): a live HUD badge + report + end-screen badge classifying
  the run hero→villain — Mentor, Peacemaker, Safe Pair of Hands, Taskmaster, Cowboy, Dictator, Empire-Builder,
  Firefighter, Operator — so players see the path they're carving and can steer.
- **NEW — humour** (owner ask): a bank of funny-but-true PM proverbs shown on each week transition.

- **Independent correctness review (P1 fix):** the reviewer caught that "Skip This Phase" auto-resolved
  events through old code that best-cased risky choices and dropped involuntary setbacks. Factored a shared
  `applyEventChoice(ev,ci)` resolver used by BOTH the modal and the skip path, so setbacks still land and
  gambles can still backfire when skipping. Also switched skip's drift + choice rolls to the seedable `rng()`
  and round-tripped `_deferred` in save/load. Harness +1 (skip-path honesty). **36/36 green.**


### 2026-06-15 — Iteration 24 (Immersion epic Phase A+B: decision UX + hidden trade-offs)
Owner playtest feedback → approved a 5-phase immersion epic. A+B shipped together (decision UX):
- **Readable pop-ups:** event `.modal` is now responsive `width:min(560px,92%)` + fluid padding + `box-sizing`
  (no more 580px overflow/cut-off on mobile); choices bumped to 9px with `word-break` so options never clip.
- **PPE on/off fixed:** the locker buttons used a `.do` class that had NO CSS (rendered unstyled). Added a
  prominent gold `.do` button style and rewrote `showLockerRoom` to show a clear STATUS line + a single
  state-flipping primary ("Put ON PPE" / "Take OFF PPE") + a clear close.
- **Hidden trade-offs (except Apprentice):** `hintsVisible()` gates the pre-choice `c.desc` hint — Manager/
  Director now judge blind; Apprentice keeps the hint for kids.
- **Post-choice score reveal:** new reusable `metricDeltaHTML(snapshot)` (▲▼ true difficulty-scaled deltas).
  Events now show a result panel (your choice + gamble outcome + deltas + PM insight → Continue) instead of
  closing instantly; NPC dialogue uses the same component (and now shows the real applied deltas, not raw).
- Harness +2 (hints gating + delta reveal; PPE toggle) and updated the event-funnel test for the new
  Continue step. **38/38 green**, node --check clean.


### 2026-06-15 — Iteration 25 (Immersion epic Phase C: cut-scene events + timed decisions)
- **Cut-scene presentation:** events now "act out" before you decide. New `#cutscene` overlay renders the
  involved leads as live pixel actors (via `drawCharProcedural` to canvases) with idle-bob / clash animations,
  a prop emoji, a stage-direction caption, the narrative, and screen juice (shake/flash). `SCENES` maps a scene
  to every event week; `enterWeek` now calls `presentEvent`→`beginDecision`→`showEvent` (decision modal).
- **Timed decision:** a countdown bar on the decision modal, ticked from `gameLoop` (`tickEventTimer`, dt-driven
  so the headless harness never auto-fires). Length by difficulty — Apprentice none, Manager 14s, Director 8s.
  On timeout → **hesitation**: a small morale cost + the team auto-takes a **non-risky default** (never a gamble
  you didn't sanction) + a toast. `stopEventTimer` freezes it the instant you choose.
- Harness +3 (timer scales by difficulty; hesitation resolves a non-risky default; every event has a cut-scene
  and present() opens cleanly). **41/41 green**, node --check clean. Logic stays decoupled from presentation so
  all existing event/funnel tests pass unchanged.


### 2026-06-15 — Iteration 26 (audio + ambience: dial, location themes, machinery, NPC voices)
Owner asks (before D/E): a mute dial, location-based soundtracks, door/construction SFX, more worksite immersion,
and Animal-Crossing-style mumble voices in dialogue.
- **Master volume dial:** HUD slider (0→0.6 internal); slide to 0 = mute everything. `setMasterVolume` clamps,
  scales all notes via `masterGain.gain.value`, updates the % label, and persists in save/load.
- **Location soundtracks:** `THEMES` registry keyed by map — distinct office/site tracks plus composed
  supplier (brisk), boardroom (stately/tense) and studio (airy) themes **ready for Phase D**. `startBGM` drives
  melody/harmony/bass/tempo/interval from `getTheme()`; transitions restart BGM so the score switches per area.
- **Doors:** richer `doorOpen` (creak+latch) on leaving and `doorClose` (swing+thud) on arriving, via `transitionToMap`.
- **Live worksite:** new machinery SFX — `excavator` rumble, `drill`, `clang`, reversing `reverse` beeps, distant
  `trainHorn` — played by a phase-gated ambient layer (`playLocationAmbient`) only once Construction starts
  (idx≥5). Plus drifting **construction dust** particles on site during construction. Supplier gets phones/forklift,
  boardroom a quiet clock tick, office keyboard+phone.
- **NPC voices:** `playMumble(npcId,len)` plays soft per-NPC-pitched blips (`VOICE` table) as each dialogue line
  and reply appears — five distinct voices, scaled to line length, self-cleaning timer.
- Harness +3 (themes incl. D areas + default; volume clamp/mute/persist; new SFX/ambience/voices fire safely).
  **44/44 green**, node --check clean.


### 2026-06-15 — Iteration 27 (interactive dashboard: readable deliverables + performance journey)
Two owner asks for the project dashboard (the 📊 docs overlay):
- **Readable, unlocking deliverables:** replaced the one-line doc cards with a `DELIVERABLES` library (11 real
  GRIP documents — Brief, Stakeholder Map, Risk Register, Design Pack, Procurement, Construction Plan, Safety,
  Quality/ITP+NCR, Test & Commissioning, Handover, Lessons). Each has authentic readable `body` content and a
  `readyWeek`; they **unlock as the project progresses** (count shown), and clicking an available one opens a
  focused paper-style **reading view** (`openDeliverable`) with a Back button. Locked ones show "🔒 from <wk>".
- **Performance journey:** `recordMetricHistory()` snapshots all 5 metrics each week (seeded at T-32 all-70,
  captured at end). New `perfPanelHTML()` renders an inline-SVG trend of every metric from the **starting line
  to now** + a start→now delta per metric. Shown in the docs overlay AND on the end screen (light card) so
  players see where they began and where they ended up. Persisted in save/load.
- Harness +3 (deliverables unlock/readable/openable; journey records per-week & renders SVG; docs overlay
  opens cleanly). **47/47 green**, node --check clean.


### 2026-06-15 — Iteration 28 (Phase D, part 1: map registry + Supplier's office)
First new playable area, on a clean foundation:
- **Map registry refactor:** introduced `MAPS{office,site,supplier}` + `MD()`/`mapW()`/`mapH()`/`npcCell()`
  and routed every `S.map==='office'?…:…` switch through it — `isSolid`, camera/player bounds, `updateNPCAI`
  (onMap + wander via `MD().wander` + bounds), `checkProximity`, `render` (dims/ground/objects/NPC visibility),
  objective markers, `transitionToMap` (generic spawn + NPC reposition), `loadGame` (whitelist + safe spawn +
  reposition). Office/site behaviour is **identical** (harness stayed green throughout the refactor).
- **Generic interior renderer** `drawInteriorGround` (reads `MD()`), so any interior map draws from data; the
  site keeps its special progressive-track renderer.
- **Supplier's office** (22×14): warehouse tile floor, a service **counter**, **stock shelving**, railway
  material stacks, a **back office**, and a new NPC **Raj (Supplier Account Mgr)** with compact procurement
  dialogue + his own voice pitch. Reached via a **"To Supplier"** door in the office reception; **return**
  door back. Its soundtrack/ambience (composed last iteration) now plays. NPC seating generalised via
  `npc.pos[map]` (legacy office/site fields untouched).
- Harness +2 (supplier reachability/seats/zones; office↔supplier transition) and the zone-reachability check
  now includes supplier. **49/49 green**, node --check clean. Verified the layout with a Python render.
- Next: Client & Sponsor boardroom, then the Design studio (each drops in as registry data).


### 2026-06-15 — Iteration 29 (Phase D, part 2: Client Boardroom + Design Studio)
The registry paid off — both areas dropped in as data:
- **Client & Sponsor Boardroom** (20×12, carpet): boardroom table + chairs, governance binders, a new NPC
  **Dr. Okoye (Client Sponsor)** with gate-review/funding dialogue + voice. Reached via a **"To Boardroom"**
  door in the Documents area; a **Gate Review** info zone. Boardroom soundtrack/ambience plays.
- **Design Consultancy Studio** (20×13, wood): three **drawing-board desks**, a plans table, a spec library.
  **Sarah relocates here** (via `npc.pos.studio`) — reuses her existing dialogue, no new content. Reached via
  a **"To Design Studio"** door in the Break Room; a **Drawing Boards** info zone. Studio theme plays.
- Added `makeWalledGrid`/`buildInteriorSolid` helpers (interiors are now ~6 lines of data each). Office has
  three labelled exit doors (Studio / Supplier / Boardroom) spread across its rooms.
- Harness now loops all three new interiors (spawn + area-NPC reachable, NPC has dialogue, every zone
  reachable) and office↔interior transitions. **49/49 green**, node --check clean. Verified both layouts via
  Python renders. Phase D complete — five playable areas; next is Phase E (leadership-style dialogue rewrite).


### 2026-06-15 — Iteration 30 (bespoke art: make each new location feel unique)
Owner: the new locations reused the same furniture and felt samey; make high-quality, unique assets.
- **13 new atlas sprites** authored in `tools/bake_atlas.py` (atlas 26→42 entries): warehouse `palletrack`,
  `cratestack`, `forklift`; boardroom `conftable` (long), `projscreen`, `wallchart`; studio `draftboard`,
  `plotter`, `pinboard`, `modeltable`; plus 3 distinct floor tiles — `concrete`, `parquet`, `boardcarpet`.
- **Re-themed each interior** with its own props + floor so it reads as a different place:
  - **Supplier** → concrete warehouse: pallet racking along the back wall, crate stacks, a forklift, the trade
    counter + railway material stock.
  - **Boardroom** → deep weave carpet: a long conference table (laptop/jug/mugs), six chairs, a wall projector
    screen with a chart, framed RAG charts.
  - **Studio** → parquet: three drafting boards with blueprints, a 3D site-model table, a large-format plotter,
    pinned-blueprint boards on the wall, a spec library.
- Re-baked atlas, re-synced inlined `ATLAS`, verified all three layouts + the new props via Python renders.
  Denser layouts stay fully reachable. **49/49 green**, node --check clean.


### 2026-06-15 — Iteration 31 (playtest fixes: NPC movement + findable location doors)
Two issues from the owner's playtest:
- **Office/interior NPCs were frozen** (wander list was emptied in the registry refactor → they idled in place).
  Restored life with **gentle local wander**: interior NPCs now drift ±2 tiles around their own workstation
  (walkability-checked), so they feel alive without the clustering/marker-clash the global wander caused. The
  site keeps its roaming crew (global wander points).
- **Other locations were impossible to find/enter** — the exit doors were tiny unlabelled tiles. Added a
  **visible `door` sprite at each office exit** (Studio / Supplier / Site / Boardroom) plus **directional arrow
  labels** ("↓ Supplier", "↓ Design Studio", "↓ Railway Site", "↓ Boardroom") so every destination is signposted.
- **49/49 green**, node --check clean. Office render verified the doorways read clearly.


### 2026-06-15 — Iteration 32 (end-screen fixes: action button + readable graph)
Owner playtest of the finish screen:
- **"No option after the results"** — root cause: `document.querySelector('#weekTrans .btn')` was meant to hide
  the week-transition Continue button but matched the FIRST `.btn` in document order, which is the **Play Again**
  button nested in `#wtTitle` — so it hid the only action. Fixed to target the direct-child Continue button
  (`#weekTrans > button.btn`), and added a **prominent "▶ Play Again"** right after the results so it's never
  missed (plus the existing one at the bottom).
- **Hard-to-read end graph** — replaced the small 5-line SVG on the end screen with a **simpler, larger
  start→finish bar read** (`perfBarsHTML`): one bar per metric showing the finishing score with a dark marker
  at the starting score + a `70 → 84 ▲+14` label. Much clearer at a glance. (The line chart stays in the docs
  overlay.)
- Harness +1 (end screen renders the Play Again action + the start→finish bars). **50/50 green**, node --check clean.


### 2026-06-15 — Iteration 33 (Phase E begins: leadership-style dialogue engine + Sarah)
- **Engine:** dialogue choices can carry a stance tag `s:` (D/C/S/V = Directive/Collaborative/Supportive/
  Visionary). `chooseDlg` tallies the chosen stance into `S.leadershipChoices`; `dominantStyle()` reads the
  lean after a few decisions; `getLeadershipArchetype` now resolves a **style-flavoured badge** when no strong
  metric pattern dominates — The Commander (directive), The Facilitator (collaborative), The Coach (supportive),
  The Visionary. Persisted in save/load.
- **Visible stances:** each dialogue option now shows a small **stance chip** (⚡ Directive / 🤝 Collaborative /
  💚 Supportive / 🎯 Visionary) so the player can see — and deliberately choose — how they lead (incl. a clear
  "dictate" option). The metric impact stays hidden until after the choice.
- **Sarah fully tagged** as the rewrite template (all ~50 choices stance-tagged, text/effects unchanged), giving
  a balanced D/C/S/V spread per line. Mike/Emma/James/Priya tagging follows next.
- Harness +1 (valid tags tally, dominant style reads, badge reflects it; Sarah fully tagged). **51/51 green.**


### 2026-06-15 — Iteration 34 (Phase E complete: all dialogue stance-tagged)
- **All 5 core NPCs + Raj + Dr. Okoye hand-tagged** — every one of the ~366 dialogue choices now carries a
  leadership stance (Directive/Collaborative/Supportive/Visionary), text & effects unchanged. Each line offers a
  spread of ≥2 distinct stances, so you can deliberately pick how you lead (incl. a clear "dictate" option).
  Balanced overall spread: D 107 / C 101 / V 100 / S 58.
- The leadership badge now reads from your real conversational stance across the whole game (via the engine
  shipped last iteration: stance chips, `tallyLeadership`, `dominantStyle`, style-flavoured archetypes,
  persisted in save/load).
- Harness hardened: every core NPC fully tagged + per-line stance variety asserted. **51/51 green**, node --check
  clean. Phase E (the last big approved piece) is done — leadership styles run end-to-end across the game.


### 2026-06-15 — Iteration 35 (World+UI overhaul Phase 1: legibility & crispness)
Playtest feedback: cramped world, low-res/blurry labels, HUD overflow (leadership badge collides with stars),
tiny unreadable fonts. Owner direction: keep the Canvas client, fix in place (no re-platform/backend yet).
- **Crisp canvas:** `fitCanvas()` sizes the canvas BACKING STORE to its real device pixels (1:1 with screen)
  and keeps all game coords in logical IW×IH via a base transform — no CSS up/downscale of the backing, so
  canvas-drawn text/labels/sprites are sharp on hi-DPI (the root of the "low-resolution words" complaint).
  Re-runs at the top of `render()` + on resize when the size changes. render() only uses save/translate/restore,
  so the base transform is preserved.
- **HUD legibility:** the leadership badge no longer overlaps the stars (`max-width`+ellipsis); HUD now wraps
  (`flex-wrap`, `min-height`) so metrics+badge+stars+audio never collide; bumped `.hl`8→9, `.hpct`7→9, wider meters.
- **Fonts:** removed the unreadable 6px tutorial + raised in-game 7px (cutscene names, toasts, volume %, difficulty
  blurb, stance chips) to 8–9px.
- **Area labels:** smaller (7px) + slim semi-transparent rounded plate so they read but don't blot the scene/clash.
- **51/51 green**, node --check clean. (Visual crispness verified by logic; owner playtest confirms.)


### 2026-06-15 — Iteration 36 (Phase 3: outdoor/town art)
Authored the art that unblocks the outdoor town hub (atlas 42→54 entries):
- **5 distinct building exteriors** — `ext_office` (glass office block), `ext_supplier` (corrugated warehouse +
  roller shutter + signage), `ext_board` (civic glass-curtain + columns), `ext_studio` (warm brick + studio
  window), `ext_site` (blue hoarding/gatehouse with safety sign + boom barrier).
- **`car`** (side-view, drives right) for the arrival cut-scene, **`tree`/`tree2`** for greenery, and a little
  **`pond`** (stone rim + lily pad + flower — owner request 🙂).
- **Road tiles** — `road`, `roadline` (dashed centre), `pavement`.
- Re-baked atlas, re-synced inlined `ATLAS`, verified every new sprite via a Python render. **51/51 green.**


### 2026-06-15 — Iteration 37 (Phase 4: outdoor TOWN hub navigation)
Replaced the "doors inside the office" model with an outdoor town the PM walks around (structure refined live
to owner feedback — see below):
- **New `town` map** (34×22) — grass with room to breathe, a road across the middle (pavement both sides,
  dashed centre line), **three buildings as separate landmarks** each **labelled on top** — **Design Studio**,
  **Project Office**, **Supplier** — a **bigger pond**, and a **dense tree line behind the buildings**.
- **Railway Site = an outdoor worksite at the END OF THE ROAD** (far right): you walk to the road's end and step
  onto a hoarding/gate access point (cones + fence) — no building of its own — to head out to the live site.
- **Boardroom + PPE changing room live INSIDE the Project Office:** an internal office door enters the Boardroom
  (gate reviews with Dr. Okoye, returns to the office); the PPE lockers are a dedicated **Changing Room** in the
  office. So the flow is: kit out in the office → come back out → access the site/supplier (both PPE-gated).
- **Navigation wiring:** `activateZone` handlers for `to_office`/`to_site`/`to_supplier`/`to_studio` (town) +
  `to_boardroom` (office) + `return_town`/`return_office` (exits). `transitionToMap` remembers `S._townPos`
  (persisted in save/load) so leaving a building drops you back where you entered. `beginGame` starts in town.
- **PPE gating:** `PPE_REQUIRED={to_site,to_supplier}` — both worksites refuse entry without hi-vis+hard hat;
  the gate message + breadcrumb now direct you to the office Changing Room. Site objectives retargeted `to_site`.
- **Labels:** `drawAreaLabels` gained a `type:'building'` variant (centred name plate + thin colour underline)
  so landmarks read as signage, not clashing pills.
- **Art:** the pond sprite enlarged 40×26 → 64×40 (broad oval, two lily pads). Atlas re-baked + `ATLAS` re-synced.
- New harness coverage: town spawn + 3 entrances + road-end site access reachable; boardroom/changing-room
  confirmed in the office (not the town); PPE gate proven to block then admit; enter→return round-trips for all
  destinations. **55/55 green**, node --check clean, town verified via Python render.


### 2026-06-15 — Iteration 38 (Phase 5: arrival cut-scene)
The game now opens with a short, skippable arrival cut-scene on new game (per owner's vision):
- **In-canvas scripted sequence** (no DOM overlay) on the town map: a **car drives in from the LEFT** along the
  road, **parks in front of the Project Office**, the **PM steps out** at the town spawn, then a **briefing
  caption holds** — "Head into the Project Office to meet your team" — until the player presses **SPACE / taps**.
- State machine `drive→park→exit→brief` (`startArrival`/`updateArrival`/`skipArrival`/`endArrival`), dt-driven so
  it can't auto-skip the input beat. `updatePlayer`/`updateCamera`/`handleInteract`/`checkProximity` all gate on
  `S.arrival`, so input is frozen during the scene and cleanly restored after — no softlock (independently reviewed).
- The PM is the **player's chosen avatar** (reuses `drawChar`/`CHARS[S.playerChar]`), and now **faces the camera**
  during the briefing so the avatar reads clearly. Car hidden-PM only during the drive/park beats.
- New harness coverage: the timeline reaches the briefing, parks the PM at spawn, the briefing HOLDS without input,
  movement is blocked during the scene, and SPACE both fast-forwards the drive and dismisses the briefing.
  **57/57 green**, node --check clean, arrival frame verified via Python render. Independent review: no P0/P1.


### 2026-06-15 — Iteration 39 (Phase 6: per-segment curveball cut-scene variety)
Each 4-week segment already opened with its curveball cut-scene; this gives them more life so
they never feel identical:
- **Per-mood staging:** a `CS_MOODS` table gives each curveball a distinct backdrop tint, accent
  colour and sound (survey/client/clash/money/supply/safety/weather/quality/snag/celebrate). The
  #cutscene backdrop, title and name colours now shift with the beat.
- **Chapter header:** every cut-scene now announces its segment — `weekLabel` + phase name — so the
  weeks read as story beats opening a new chapter.
- **Varied entrances:** actors arrive with different animations (slide L/R, drop, rise) that play once
  then settle into the idle bob; the prop pops in. Clash scenes keep their face-off shake.
- **Mood-driven feel:** sfx/shake/flash derive from the mood (per-scene overrides win) — e.g. the
  safety near-miss flashes red and shakes hard, the supplier collapse flashes amber, celebration lifts.
- Backdrop is reset on close so moods can't leak between scenes (independently reviewed).
- Harness: new test asserts every scene has a valid distinct mood (>=6 unique) and all 10 weeks present
  cleanly (chapter header + entrance paths). **58/58 green**, node --check clean. Review: no P0/P1.


### 2026-06-15 — Iteration 40 (roomier interiors)
The three interior areas were boxy/cramped (smaller than the viewport, so they sat small + centred). Enlarged
them and spread the furniture so each room breathes, keeping every spawn / door / NPC seat / zone reachable:
- **Supplier warehouse** 22×14 → **24×17** — five pallet racks across the back, counter + Raj on the left, crates
  and forklift spread, back-office desk, railway stock decor, door back out to the town.
- **Boardroom** 20×12 → **23×15** — long table centred, six chairs around it, projector + wall charts, Dr. Okoye
  seated at the head, door back into the office.
- **Design studio** 20×13 → **23×16** — four drawing boards across the room, model table, plotter, spec shelf,
  pinned blueprints, door back out to the town.
- Updated dims, grids (door position), MAPS spawns, ZONES, AREA_LABELS and the NPC `pos` for each in lockstep.
- Harness hardened: the new-interiors test now also asserts no solid furniture lands on a door/spawn cell and
  nothing is drawn into/over the walls (the office already had this; the 3 areas now do too). **58/58 green**,
  node --check clean, all three rendered via Python to eyeball spacing. Independent review: no P0/P1.


### 2026-06-15 — Iteration 41 (office spread-out + arrival fix + hub routing)
Three changes, all harness-gated (59/59) + Python-rendered:
- **Office spread-out treatment:** enlarged 30×18 → **34×20** with rooms that breathe — wider open plan with
  the five workstations spaced out, roomier meeting / break / your-office / documents rooms, clear walkways.
  The walled Changing Room and the internal Boardroom door are preserved. OMAP, furniture, MAPS spawn, ZONES,
  AREA_LABELS, all 5 NPC office seats and the wander targets updated in lockstep; harness office cells refreshed.
- **Arrival fix:** the PM previously drew *on top of* the car. The car is now y-sorted with the characters and
  parks just LEFT of the spawn, so the PM steps out clearly **beside** it (not overlapping). Re-rendered to confirm.
- **Hub routing breadcrumb:** new `townRouteEntrances()` maps each pending objective to the building entrance
  that holds it; on the town a `!` now points the player at the right building (so after the arrival they're
  guided into the Office to meet the team). Worksite objectives without PPE also route via the office. New
  harness test covers the routing (office on wk32, site access, the no-PPE office detour, completed drop-out).
node --check clean; **59/59 green**; office + arrival rendered via Python. (Independent review in flight.)


### 2026-06-15 — Iteration 41 (town life + ambient NPCs)
The world felt empty between the leads. Added ambient "town life" NPCs — flavour only (no metrics, no
leadership, no weekly slot) with a friendly, rotating natter:
- **Town (outdoor):** Marcus (Local Resident), Nadia (Daily Commuter) and Leo (Engineering Apprentice) stroll
  the pavements (NPC_WANDER_TOWN) and greet you — town atmosphere, project chatter, and light PM-learning
  prompts (the apprentice asks how to be a good PM, the commuter frets about budget/schedule).
- **Buildings:** Grace (Receptionist) in the office points you to the team/boardroom/changing room; Tom
  (Warehouse Hand) in the supplier riffs on lead times and points you to Raj.
- New `ambient:true` + `chat:[...]` schema; `openNPCDialogue` short-circuits ambient NPCs to a rotating flavour
  box (cycles `S._chatIdx`) — no DLG, no metric/objective side-effects. Each got a distinct VOICE pitch.
- Hardened: the "Full House — talked to all leads" achievement now ignores ambient NPCs (so it stays
  reachable); harness updated so ambient NPCs are exempt from the per-NPC DLG requirement and town wander
  points are validated. New test covers placement/walkability, no-metrics chat, line rotation, and that
  ambient NPCs don't block the achievement. **60/60 green**, node --check clean, town placement rendered.


### 2026-06-15 — Iteration 42 (playtest fixes: camera clip, parked car, decor NPCs)
Three issues from the owner's playtest:
- **Office top clipped behind the HUD** — the office is now exactly the canvas height, so walking up hid the PM
  behind the top HUD. `updateCamera` now reserves a top HUD band (30px): the map sits *below* the HUD, scrolls
  so the top clears it, and the bottom still reaches the canvas edge (camY may now be negative; the tile loop
  already clamps). Fixes "part of the office is cut off".
- **Arrival car vanished too soon** — added `S.enteredOffice` (saved/loaded). The parked car now stays in the
  town after the cut-scene and only disappears once the PM first heads into the Project Office.
- **Empty rooms** — added six non-interactive **decor NPCs** "doing a task" (2 board members in the boardroom,
  a warehouse worker, a design assistant, 2 hi-vis site workers). `decor:true` → skipped by `checkProximity`
  (not talkable) and drawn without name tag/hearts; `static:true` keeps the seated board members put; their
  expression pool is tuned to look busy. Achievement/harness checks updated so decor (and ambient) NPCs don't
  break "talk to all leads" or the per-NPC DLG/voice requirements.
- New harness coverage for decor placement/staticness; **61/61 green**, node --check clean; site decor placement
  rendered. Independent review gating the push.


### 2026-06-16 — Iteration 43 (opening trailer, tile-seam fix, cinematic transitions)
- **Tile-seam artefact** (owner: "a line going top to bottom as I walk, on the grass") — the fractional
  device-pixel canvas scale left sub-pixel gaps between ground tiles that drifted as the camera moved.
  `drawSprite` gained an optional draw size; ground/wall tiles now blit 1px larger (`TILE_BLEED=TS+1`) so
  neighbours overlap and the seam is gone. Objects/characters unchanged.
- **Opening trailer** — a short, skippable Stardew-style cold-open montage on the canvas before character
  select (title "New Game" → trailer → char select). Six timed scenes: drive-in title card, "lead a team of
  experts" (the five leads slide in), "every choice is a trade-off" (metric bars swinging), "build the railway"
  (track laying L→R with plant), "on time · on budget · safely" (glowing metrics + stars), and an end card.
  dt-driven state machine (`startTrailer/updateTrailer/skipTrailer/endTrailer/drawTrailer`); SPACE/Esc/tap skip.
- **Cinematic map transitions** — `startTransition` now takes a destination label; `transitionToMap` shows a
  title card as the screen darkens and gives the **construction site** a longer, signed transition
  ("🚧 To the Construction Site") so heading into the delivery works reads as a deliberate scene change.
- Harness: new trailer test (every scene renders without throwing; timeline ends at char select; skip works);
  transition test ticks bumped for the longer site fade. **62/62 green**, node --check clean. Independent
  review: no P0/P1. (Trailer is animated canvas — owner playtest confirms the visual feel.)


### 2026-06-16 — Iteration 44 (trailer polish: pacing, music sting, click-to-advance)
Owner feedback on the opening trailer ("good, but slow it down just a tad" + the two offered next steps):
- **Pacing** — scene durations bumped ~20% (now ~20s auto-play) and a few internal animations (car drive,
  team stagger, track laying, star fill) eased out a touch so nothing feels rushed.
- **Music sting** — a short rising fanfare (`playTrailerSting`) plays on start and a chime between scenes,
  with a brighter lift on the finale (`playTrailerBeat`).
- **Click to advance** — tap / SPACE now pages forward one scene at a time (self-pace), while **ESC** skips
  straight to character select; on-screen hint updated to match.
- Harness extended (page-forward one scene at a time ends at char select). **62/62 green**, node --check clean.


### 2026-06-16 — Iteration 45 (trailer = real gameplay segments, Stardew-style)
Owner: "trailer needs segments of gameplay like Stardew Valley." Reworked the opening trailer from abstract
motion-graphics into **real gameplay vignettes** rendered from the actual maps:
- New `drawTrailerMap(ctx,mapId,camX,camY,opts)` draws a live clip of a real map (ground + objects + a car +
  characters, y-sorted) under a clamped camera, reusing the game's own draw path (temporarily sets S.map/S.week,
  restored in a `finally`). `_trClampCam` keeps every clip inside the map edges (no black bands; centres small maps).
- Six segments now read as footage: (0) **arrive** — the car drives past the town's buildings under the logo;
  (1) **explore** — walk the living town with the ambient NPCs; (2) **your team** — the office with all five
  leads at their desks + the PM walking in + a rapport ♥ pop; (3) **decisions** — the boardroom with the real
  event modal (Scope Surprise, two choices, ticking countdown); (4) **build** — the live site with workers,
  machines and track; (5) end card. Captions + a scene tag over each, like a real trailer.
- Pacing/audio/skip/click-to-advance unchanged from iter 44. **62/62 green**, node --check clean; town + office
  vignette framings rendered to verify the camera. Independent review: no P0/P1 (folded its two P2 hardening notes).


### 2026-06-16 — Iteration 46 (people are solid + entrance arrows)
Two playtest catches:
- **Walking through people** — `isSolid`/furniture already blocked the player, but **NPCs weren't solid**, so
  you could walk through the team/townsfolk. Added `npcBlocks(nx,ny)`: the player now goes AROUND people
  (small lower-body box). It blocks *entering* an NPC from clear space but always allows *leaving* one, so an
  NPC wandering onto you (or spawning where one stands) can never trap you — no softlock. Furniture bases were
  already solid; the trailer's scripted PM was also rerouted to clear lanes so it visibly walks around things.
- **Hard-to-find entrances** (esp. the Changing Room) — `drawEntranceArrows` draws a small bobbing chevron over
  every door/transition/area entrance (`to_*`, `return_*`, `locker_room`), skipping any that already shows an
  objective '!'. Makes every doorway discoverable at a glance.
- Harness: NPC-collision test (blocks entering, clear away, can escape an overlap) + entrance-classification
  test. **64/64 green**, node --check clean. Independent review gating the push.
