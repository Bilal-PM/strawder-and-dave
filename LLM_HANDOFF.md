# Project Valley — LLM Handoff Document

> Last updated: 2026-02-23
> Previous LLM: Claude Opus 4.6 via Claude Code CLI

---

## What Is This Project?

**Project Valley** is a single-file HTML5 Canvas pixel art game — a **railway project management simulation** in the style of Stardew Valley meets Dave the Diver. The player is a Project Manager on a UK railway infrastructure project, managing 5 NPC team members across a T-32 to T+8 week timeline (32 weeks before delivery to 8 weeks after).

The game is educational — designed to teach railway project management methodology (waterfall/GRIP lifecycle) in a fun, accessible ~20-minute playthrough.

---

## File Structure

```
strawder-and-dave/
├── index.html              ← THE GAME (2935 lines, ~162KB, single file with all HTML/CSS/JS)
├── index_v2_sprites.html   ← Backup of old sprite-based version (DO NOT MODIFY)
├── img/
│   ├── char/               ← Character sprite sheets (UNUSED — game is fully procedural)
│   │   ├── adam_walk.png, adam_idle.png
│   │   ├── alex_walk.png, alex_idle.png
│   │   ├── amelia_walk.png, amelia_idle.png
│   │   └── bob_walk.png, bob_idle.png
│   ├── tile/               ← Tile sprite sheets (UNUSED — game is fully procedural)
│   │   ├── interior.png, outdoor.png, rooms.png
│   ├── icon/               ← 16x16 HUD icons (LOADED and used in HUD metrics)
│   │   └── Book.png, Briefcase.png, Cash.png, etc.
│   └── ui/                 ← Expression bubble icons (LOADED and used above NPC heads)
│       └── expression_*.png, sandtimer.png, stopwatch.png
├── assets/                 ← Raw extracted sprite packs (reference only)
└── Game Assets/            ← Original asset packs (reference only)
```

**CRITICAL**: The game is **fully procedural** — all tiles and characters are drawn with `fillRect`/`arc`/`ellipse` calls. The sprite sheets in `img/char/` and `img/tile/` exist but are NOT used. The sprite rendering code (`drawCharSprite`, `drawTileSprite`, `TILE_SPRITES`) still exists in the file but is bypassed. Only `img/icon/` and `img/ui/` assets are actively loaded.

---

## Code Architecture (index.html)

The entire game is in one `<script>` block. Here's the section map with line numbers:

| Lines | Section | Description |
|-------|---------|-------------|
| 1-165 | HTML/CSS | UI layout, modals, HUD, notepad, dialogue box. Uses 'Press Start 2P' pixel font |
| 166-170 | Constants | Canvas 480×320 internal (960×640 at 2x), 16px tiles |
| 171-216 | Asset Loading | Preloads icons and UI sprites from `img/icon/` and `img/ui/` |
| 217-245 | Game State | `S` object — player position, metrics, week, screens, dialogue state |
| 246-311 | Colors | `const C={...}` — Warm Stardew-like palette (~90 named colors) |
| 312-345 | Characters/NPCs | `CHARS[4]` player options, `NPCS[5]` with AI state machines |
| 346-398 | Sprite Config | Frame sizes, row mappings (UNUSED but kept for reference) |
| 399-484 | Map Data | `OMAP` (office 26×20) and `SMAP` (site 50×30) tile grids |
| 485-560 | Zones/Labels | Area labels, interaction zones (desks, doors, NPCs) |
| 561-796 | NPC Dialogues | `DLG` object: 5 NPCs × 7 phases × 3 dialogue options each |
| 797-907 | Curveball Events | 15+ random events with 3 choices each |
| 908-972 | Weekly Objectives | Phase-specific task lists for the notepad |
| 973-1035 | Audio System | Web Audio API chiptune BGM + SFX (interact, walk, advance, alert) |
| 1036-1253 | Game Mechanics | Input, collision, camera, movement, NPC AI, proximity detection |
| 1254-1671 | Interaction System | NPC dialogue, zone activation, map transitions, objectives |
| 1299-1671 | NPC Reactions | `NPC_REACTIONS` — 125 unique personality-driven responses (5 NPCs × 5 tiers × 5 variants) |
| 1672-1901 | Game Systems | Objective tracking, metrics, HUD, notepad, week advancement |
| 1902-2085 | Overlays | Monthly reports, documents/Gantt overlay, end screen |
| 2086-2099 | Utility Functions | `lightenColor()`, `darkenColor()` for dynamic shading |
| 2100-2259 | Character Rendering | `drawCharProcedural()` — chibi sprites with face details, walk animation |
| 2260-2542 | Tile Rendering | `drawTile()` — 29 procedural tile types with pixel art details |
| 2544-2584 | Labels/Bubbles | Area labels (8px white on dark), expression bubble icons |
| 2585-2670 | Main Render Loop | Camera transform, Y-sorted entity rendering, zone glow |
| 2671-2784 | Title/Select | Title screen pixel art, character select with preview canvases |
| 2785-2846 | Intro Screens | Project brief, methodology intro sequences |
| 2847-2909 | Save/Load | localStorage persistence |
| 2910-2935 | Init/Game Loop | `requestAnimationFrame` loop, startup |

---

## Key Technical Details

### Rendering Pipeline
1. Clear canvas with `C.bg` (warm beige `#f5e6c8`)
2. Camera transform (`ctx.translate(-camX, -camY)`) with lerp follow
3. Draw visible tiles (culled to viewport)
4. Draw area labels
5. Collect player + NPCs into entity array
6. Y-sort entities and draw (each NPC draws: character → name tag → expression bubble)
7. Draw zone interaction glow indicators
8. Restore canvas

### Tile System
- 16×16 pixel tiles, procedurally drawn with `fillRect` calls
- Seeded pseudo-random via `hash=(x*7919+y*6271)%256` for stable variation
- Office map: 26×20 tiles (types 0-18)
- Site map: 50×30 tiles (types 20-28 outdoors, 0/25 for site office)

### Character System
- 16×24 bounding box, chibi proportions (10×10 head, 8×6 body)
- 4-frame walk cycle with bob animation
- Direction: 0=down, 1=right, 2=up, 3=left
- `drawCharProcedural(ctx, cfg, dir, frame, x, y)` — cfg has: skin, hair, hairStyle, shirt, pants, eye, hat

### NPC AI
- State machine: `idle` → `walking` → `idle`
- L-shaped pathfinding between wander points
- Smooth pixel-based movement (not tile-snapping)
- Expression bubbles: working, chat, stress, confused

### Game Progression
- T-32 to T+8 timeline, skip-weeks via `KEY_WEEKS` array
- 7 phases: Kick-Off, Design, Procurement, Construction, Testing, Delivery, Post-Delivery
- 5 metrics: Schedule, Budget, Safety, Quality, Morale (0-100, start at 70)
- Monthly reporting dashboards with bar charts
- Documents overlay with Gantt chart and process stages

---

## What's Been Done (Session History)

### Session 1 (earlier)
- Built the complete game engine from scratch
- Added NPC AI, dialogue system, curveball events, documents overlay
- Attempted sprite sheet rendering (LimeZu assets) — failed due to frame size issues

### Session 2 (earlier)
- Debugged sprite rendering (discovered 16px frame width, not 32px)
- Still had issues — user decided to abandon all sprite assets
- Switched to fully procedural rendering
- Backed up sprite version as `index_v2_sprites.html`

### Session 3 (current)
1. **Visual overhaul** — Replaced dark muted palette with warm Stardew-like colors (~90 colors)
2. **Detailed tile rendering** — Rewrote all 29 tile types with pixel art details (highlights, shadows, texture)
3. **Chibi character rendering** — Rewrote `drawCharProcedural` with detailed faces, hair highlights, rosy cheeks, arm swing
4. **NPC personality dialogue** — Added `NPC_REACTIONS` (125 unique British English responses) replacing 5 generic lines
5. **Text readability fix** — Increased canvas text to 8px bold, white on dark pills
6. **Office floor fix** — Simplified from noisy stripes to clean warm wood checkerboard
7. **Railway track fix** — Redesigned with bold parallel rails (3px wide) over thin sleepers

---

## Known Issues / Areas for Improvement

### Visual
- **Fence tiles** (case 23) create repetitive horizontal stripe pattern when stacked on site map borders — could use variant rendering based on neighboring tiles
- **Wall tiles** (case 1) are somewhat flat — could add more depth/molding detail
- **Grass** could have more variety (different wild flower types, patches)
- **Characters** are small (16×24 in a 480×320 viewport) — proportions are correct but could use more clothing detail
- **UI chrome** (HUD, notepad, dialogue) still uses old dark purple theme — could be updated to match warm palette while maintaining readability

### Gameplay
- **NPC wander paths** are limited to office — site NPCs don't move much
- **No sound toggle** in-game (only at startup)
- **Save/load** works but could show save slot info
- **Documents overlay** Gantt chart is simplistic — bars don't update dynamically
- **End screen** could show more detailed project summary/metrics breakdown

### Code Quality
- Dead code: `drawCharSprite()`, `drawTileSprite()`, `TILE_SPRITES`, sprite config constants — all unused but still in file
- Single 2935-line file — could benefit from modularization (though single-file is intentional for portability)
- Some hardcoded hex colors in tile rendering that should use `C.` palette references

---

## How to Test

1. Open `index.html` directly in a browser (no server needed)
2. Click "New Game" → select character → enter name → "Start Project"
3. Use WASD to move, SPACE to interact with NPCs and zones
4. Check: Office floor (warm wood checkerboard), NPC names (white text, readable), area labels
5. Walk to "Exit to Site" (bottom-left) to see outdoor map with railway tracks
6. Talk to NPCs — each should give unique, personality-driven responses
7. Advance weeks to see curveball events and monthly reports

---

## User Preferences (observed)

- Prefers **warm, bright, Stardew Valley-style** aesthetics over dark/muted tones
- Wants **pixel art quality** — detailed procedural rendering, not flat rectangles
- Values **readability** — text must be clear and legible
- Likes **realistic, character-driven dialogue** in British English
- Single-file architecture is intentional — keep everything in `index.html`
- Original sprite assets should be kept in `img/` folder for potential future use
- Backup files (like `index_v2_sprites.html`) should be preserved

---

## Quick Reference: Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| `drawTile(ctx,type,x,y)` | ~2276 | Renders all 29 tile types procedurally |
| `drawCharProcedural(ctx,cfg,dir,frame,x,y)` | ~2101 | Renders chibi characters |
| `drawChar(ctx,cfg,dir,frame,x,y,isMoving)` | ~2256 | Wrapper (always calls procedural) |
| `render()` | ~2586 | Main render loop with Y-sorting |
| `drawAreaLabels(ctx)` | ~2544 | White 8px text labels on dark pills |
| `openNPCDialogue(npc)` | ~1271 | Opens dialogue with phase-appropriate text |
| `chooseDlg(npcId,pi,di,ci)` | ~1500 | Handles choice, shows personality reaction |
| `updateNPC(n,dt)` | ~1128 | NPC AI state machine + movement |
| `advanceWeek()` | ~1770 | Progresses timeline, triggers events |
| `lightenColor(hex,amt)` | ~2087 | Utility: brighten hex color |
| `darkenColor(hex,amt)` | ~2093 | Utility: darken hex color |
