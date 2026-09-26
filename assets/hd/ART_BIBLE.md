# LINESIDE HD art bible

The quality bar is `docs/visual-brief/reference_character_detail.jpg`. That character is **Moira**, our station volunteer: grey bun, round glasses, olive hooded coat with brass buttons, satchel and boots. Every asset in the world must sit next to her without looking cheaper. The target is premium, cosy, AAA-indie pixel art: rich, readable, hand-crafted and warm, never dark or gloomy. The current 16px art is being replaced, not polished.

## Scale (revised: bigger and more detailed)

| | |
|---|---|
| Map tile | **48×48 art px**. The game draws HD scenes at `res: 3`: 1 map tile = 16 world units = 48 art px. On desktop each art pixel shows as 2 screen pixels, so a tile is 96 px on screen |
| Person | **about 44 px wide × 90–94 px tall** (2 tiles tall), in a **48×96 frame**, feet at (24, 93). Big-head cosy proportions like the reference; the head, including hair, is about 40% of the height. Use the extra resolution for more detail than the reference: eyes with highlights, eyebrows, nose shading, hair strands, fabric folds, seams, stitching, button highlights |
| Doors | 48–60 px wide, 72–84 px tall |
| Buildings | Sized from their footprint in `js/world/level.js`, at 48 px per tile. The south wall is at full height; the roof is seen from above |
| Detail | Every surface has material detail at this density: individual bricks with mortar and colour variation, slate rows with chipped edges, stone courses, moss, rust streaks, wood grain, leaves drawn as clusters |

## Light and shading

- One light everywhere, from the **upper left (north-west)**: `pix.LIGHT`. Lit faces are top and left, shadows fall bottom-right. Cast shadows are violet and translucent (`pix.SHADOW`).
- Every material uses a **ramp from `pix.RAMPS`** (4–6 hue-shifted steps: warm highlights, cool violet shadows), with 3–5 visible steps per form, like the reference coat and hair.
- Shade forms as volumes: heads, buns, crowns and shrubs are spheres; coats and trunks are cylinders; boxes have a lit top, a mid front and a dark side. Add ambient occlusion where things meet the ground, and under eaves, sills and collars.
- Use highlights sparingly: 1–2 px specular glints on glasses, buttons, rails, wet stone and water.
- Dither only for texture (grass, gravel, stone grain), never for smooth gradients.

## Lines

- Characters, animals and free-standing props get a **1 px dark outline** (`pix.OUTLINE`, a warm near-black) around the silhouette, as in the reference.
- Inner lines use darker steps of the local ramp, never the outline colour, except where the reference does (eye line, glasses).
- Terrain uses **no outline**. Edges are made by a darker ramp step and AO.
- Buildings get a selective outline: darker ramp colours at the silhouette, and the outline colour only at the roof ridge and base.
- No anti-aliasing against transparency. Every pixel is fully opaque or fully transparent, apart from shadows.

## Content rules (non-negotiable)

- **No text or lettering in any art.** Signs are painted blank; the game draws their words.
- No real brands, logos, operators or companies. No real fleet numbers or liveries.
- The world is a UK Pennine or Dales valley town and a closed branch line. The architecture is stone and brick, with slate roofs, dry-stone walls, red post boxes and a Victorian station and engine shed. Nothing looks American or generic fantasy.
- The closed railway looks closed and worn: rusty rails, rotten sleepers, weeds, puddles. The town is lived-in and cosy: flowers, washing lines, bunting, cats.
- Characters are warm and likeable. Keep them varied: age, build, skin tone, hair.

## Files and hand-off

- Generators live in `assets/hd/<area>/` as Python 3 with Pillow (numpy is allowed). Import the toolkit with `sys.path.insert(0, 'assets/hd/lib'); from pix import *`. Extend it in your own module; never edit `pix.py` or another area's files.
- Output goes to `assets/hd/out/<area>/`: PNGs plus a `manifest.json` from `pix.manifest()`, one entry per asset: `file`, `w`, `h`, and `anchor` (the art pixel that sits on the ground or foot point). Add `tiles: [w, h]` for things with a map footprint.
- Every generator must be **deterministic** (seeded) and runnable from the repo root: `python3 assets/hd/<area>/build.py`.
- **Look at your work.** After every change, render `pix.preview()` contact sheets at 4× into `assets/hd/out/<area>/preview_*.png` and open them with the Read tool next to the reference. Iterate until they stand beside the reference, which usually takes at least 3 passes. Ask "would this be in a AAA cosy game?"
- Keep total PNG output per area under about 2 MB.
