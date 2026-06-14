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
- [ ] Embed/remove Google Fonts `@import` (index.html line ~7) — external dep breaks self-contained iframe. (If font file unavailable, ship a clean monospace fallback + keep import as progressive enhancement.)
- [ ] Delete dead Phaser/atlas scaffolding: `drawCharSprite` (~3238), `drawTileSprite` (~3326), `TILE_SPRITES` (~380), `SPRITE_FW/FH/COLS` (~366), `WALK_DIR_ROW`/`IDLE_DIR_COL` (~372/375), and unused `walkSheet`/`idleSheet` char fields. Grep first; harness must stay green.
- [ ] Save versioning + load clamp/validate (`loadGame` ~4112): clamp metrics 0–100, validate `px/py` in-bounds & not solid (else snap to safe spawn), default missing fields, add `version`. Extend harness with garbage-save recovery test.
- [ ] Verify Continue button (works: `init` ~4187 shows `#contBtn` when save exists — confirm via harness). Remove unused `S.savedExists`.
- [ ] Unify week advance into one `enterWeek(w)` funnel (dedupe `advanceWeek` ~2325 / `skipPhase` ~2263 / `chooseEvent` ~2443 report+event ordering). Add harness ordering test.
- [ ] Remove wasted `getNPCsOnMap()` call (~1312) whose result is discarded.

**P1 — renderer/map integration:**
- [ ] Load `art/atlas.png` + inline manifest as `ATLAS`; add `drawTileAtlas` with procedural fallback.
- [ ] Single `ROOMS` table → derive `ZONES`/`AREA_LABELS`/NPC seats (kills coord drift). Port `/tmp/office_plan.py` as ground layer + `OFFICE_OBJECTS` list.
- [ ] Precompute `SOLID_GRID` (walls + object *base* footprints only); rewrite `isSolid` as a grid lookup.
- [ ] Inject objects into existing `entities[]` y-sort in `render()` (~3821) using base-y key.
- [ ] Re-point NPC seats + wander to walkable cells; add `isSolid` check to `updateNPCAI` (~1343); fix `officeX>0`→`present` flag (B2/B3/B5).
- [ ] Build parallel walled **site** map (cabin/excavator/fence/cones/material stacks). Validate all spawns vs SOLID_GRID.
- [ ] Harness invariants: every doorway walkable; every room flood-fill reachable from spawn; no object footprint over a doorway; every NPC seat/wander/zone non-solid & in-bounds.

**P2 — juice/UX:** footstep dust+bob; floating score popups on decisions; HUD meter punch; event slam-in; week-transition wipe + stinger; heart-up burst; onboarding breadcrumbs/"!" markers; metric tooltips + low-metric alarm; gate/explain Skip Phase.

**P3 — story/polish:** phase-distinct objective verbs (real inspection/budget mini-interactions); state-dependent events + choice callbacks; choice-aware ending; state-driven NPC expressions; map-aware ambient particles; milestone camera punch.
