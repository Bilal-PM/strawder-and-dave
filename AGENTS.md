# AGENTS.md: start here

## Which branch

- **Work from `claude/lineside-chapter-1`.** It holds the current game, LINESIDE.
- `main` holds an older prototype. Don't base work on it and don't push to it.
- For the visual overhaul, branch `codex/visual-overhaul` from `claude/lineside-chapter-1`. Open the PR back into `claude/lineside-chapter-1`.
- Never force-push shared branches.

## Your current assignment: the visual overhaul

Read **`docs/HANDOVER_CODEX_VISUALS.md`** end to end before you change anything. It is the full brief: the creative target, hard constraints, renderer API, everything to depict, all signage text, the pipeline, acceptance criteria and the hand-back. The reference images are in `docs/visual-brief/`. `layout_guide.png` is the control image for the map (1 tile = 10px).

**Build the vertical slice first, then stop and show the screenshots before doing the rest** (brief §7).

## What's live

`index.html` loads these, in this order:

| File | What it is | Visual overhaul may edit? |
|---|---|---|
| `js/packs/kestrel-vale.js` | Story, cast, tasks, questions, scoring content | No |
| `js/portraits.js` | Vector dialogue portraits (the fallback) | No |
| `js/scene.js` | Time-of-day palettes (`LS.art.PAL`) that the engine uses for world lighting, plus an older landscape renderer | Ask first |
| `js/packs/kestrel-vale-world.js` | World text: signs, inspect text, blocked messages | No |
| `js/world/sprites.js` | Older vector character drawing (fallback only) | No |
| `js/world/level.js` | **The validated map**: walkability, doors, PPE gates, placements | No |
| `js/world/atlas.js` | Embedded art (data URIs), built by `assets/build_atlas.py` | Yes, regenerate |
| `js/world/tileart.js` | The renderer (`LS.TileArt`): builds scenes, draws actors and animals | Yes, may rewrite |
| `js/world/world.js` | Engine: camera, collision, A* walking, doors, the draw loop | No (it already supports `res`, `smooth`, `chunks` and object `w`/`h`) |
| `js/audio.js` | Procedural audio | No |
| `js/game.js` | Game flow, UI, scoring, save | No (it already uses `LS.PORTRAIT_IMG` if present) |
| `css/lineside.css` | UI styles | Polish only; keep every id and class |

Legacy files: `classic.html` and `img/` belong to the earlier prototype. Don't restyle them.

Allowed new files: `js/world/art-*.js`, `js/world/atlas*.js` and `js/world/portraits_img.js` (add their script tags to `index.html` before `tileart.js` and `game.js`). Also `assets/**` and `docs/**`. Ask before touching anything else.

## Run it

```sh
python3 -m http.server 8000        # then open http://localhost:8000/
```

The game also runs straight from `file://`. There's no build step and no npm install for the game itself.

## Test it

```sh
for f in js/*.js js/*/*.js; do node --check "$f"; done   # syntax
node tests/run.js smoke layout performance               # quick check, about 3 min
node tests/run.js                                        # everything, about 7 min; must pass before the PR
```

- The runner needs Playwright with Chromium. It loads Playwright from `$PLAYWRIGHT_PATH` (default `/opt/node22/lib/node_modules/playwright`). If that path isn't there:
  ```sh
  npm i -g playwright && npx playwright install --with-deps chromium
  export PLAYWRIGHT_PATH="$(npm root -g)/playwright"
  ```
- With no internet for Google Fonts, add `--fonts=block`.
- Results go to `tests/out/` (git-ignored). Screenshots are in `tests/out/screens/`, including a contact sheet at `tests/out/screens/index.html`.
- One WARN is expected and fine: "stable test API contract", about undocumented entity kinds.
- The atlas build needs Pillow: `pip install pillow`, then `python3 assets/build_atlas.py`.

## Development journey screenshots (required at every stage)

The owner is sharing the development journey publicly, from the first rough prototype to the finished game. `docs/journey/` holds the story so far: numbered milestones (01–11 so far), their screenshots, `milestones.json`, and a timeline in `docs/journey/README.md`.

- **After each stage** (art bible, vertical slice, each district or interior, final polish), capture the build at the same views and two sizes:
  ```sh
  node tools/journey/capture.js 12-codex-vertical-slice      # the working tree; add --rev=<commit> for a past one
  ```
  The frames land in `tests/out/journey/<id>/`, with a contact sheet at `tests/out/journey/index.html`.
- Copy the best 3–4 desktop frames and 1–2 phone frames into `docs/journey/<id>/`. Save them as JPEG (quality 88), named `desktop-<view>.jpg` or `mobile-<view>.jpg`. Reuse milestone 11's view names (`desktop-forecourt`, `desktop-beck-bridge`, `desktop-depot`, `desktop-village-hall`, `mobile-forecourt`…) so the before and after line up exactly.
- Add the milestone to `docs/journey/milestones.json` and a section to `docs/journey/README.md`: date, what changed, a one-line title. Then rebuild the ready-to-post images with `python3 tools/journey/collage.py`. The "now" side of `then-and-now` is always the latest milestone.
- Number on from the last milestone, and never overwrite, delete or retouch earlier milestones. The rough early shots are the point.
- Never commit a frame marked `FLAG`: it shows a real organisation's name or a retired character name.

## Content rules (non-negotiable)

- **Never name real suppliers, contractors, rail operators, infrastructure owners, regulators or brands.** That includes signs, liveries, logos, fleet numbers and uniforms. Use the fictional names already in the game.
- Never use the name "Elaine".
- The tone is warm, cosy and gently funny. Never dark or rude.
- UK English. The world must look like a real UK valley town and branch line, not American or generic fantasy.
- No AI-generated lettering. Signs are painted blank and the text is drawn in code or lettered by hand (brief §6 lists every sign).
- Every asset must be your own generated art, CC0, or licensed, with the licence recorded in `assets/CREDITS.md`.

## More context

| File | What's in it |
|---|---|
| `README.md` | Product overview |
| `LLM_HANDOFF.md` | Engine API and architecture |
| `docs/DESIGN.md` | The six-chapter design |
| `docs/TEAM.md` | Roles and sign-off pipeline |
| `tests/README.md` | Every test suite and option |
| `assets/CREDITS.md` | Current art sources |
