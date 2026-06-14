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
