# LINESIDE HD props: nature and street furniture

The generator is written in Python with Pillow and numpy, and it is deterministic. Scale is 48 art px per map tile, and a person is about 44×94 px. Everything follows `assets/hd/ART_BIBLE.md`: one light from the north-west, hue-shifted ramps, a 1 px `pix.OUTLINE` on free-standing props, violet translucent shadows, and no lettering anywhere.

```sh
python3 assets/hd/props/build.py              # about 40 s: every PNG, manifest.json and preview_*.png
python3 assets/hd/props/build.py --no-preview # assets and manifest only
```

The output goes to `assets/hd/out/props/`. That is about 245 assets and about 0.7 MB of PNG, plus about 0.7 MB of previews. Each build wipes the folder's PNGs and regenerates them.

## Modules

| File | What it holds |
|---|---|
| `kit.py` | Extra `p_*` ramps (registered into `pix.RAMPS`), `Vol` (a z-buffered volume renderer for leaf clumps, tubes and contact shadows), periodic noise, box, cylinder and outline helpers, and the 44×94 Moira scale silhouette |
| `trees.py` | Oak, sycamore, ash, birch, hawthorn (May blossom or leaf only), rowan (berries), Scots pine and spruce, plus the woodland fill and edges |
| `flora.py` | Shrubs, gorse, rose shrub, bracken (green and autumn), nettles, buddleia, foxgloves, reeds and bulrushes, rosebay willowherb, ragwort, grass tufts, dandelions, ballast weeds and a sycamore sapling |
| `bounds.py` | Hedge, dry-stone wall (dark gritstone and a sandy variant) and fence autotiles (post-and-rail, picket, iron railings), plus the field gate, wicket gate and stile |
| `street.py` | Lamp post (lit and unlit), bench, litter bin, pillar box, phone box, bus stop, fingerposts, notice boards, sign boards, plaques, planters, window box, hanging basket, bollards, bicycle, milk churns, crates, pallet, sandbags, cone, wheelbarrow, bean canes, cold frame, water butt, shed, gravestones, war memorial, washing lines and bunting |
| `build.py` | Renders everything, writes the manifest and makes the contact sheets and the composed lane scene |

## Manifest (`manifest.json`, written by `pix.manifest`)

```json
"oak_l": {"file": "oak_l.png", "w": 200, "h": 205, "anchor": [100, 183], "tiles": [1, 1],
          "fade": {"x": 10, "y": 21, "w": 177, "h": 124},
          "parts": {"crown": "oak_l_crown.png", "trunk": "oak_l_trunk.png"}}
```

Every entry has these fields:
- **`file`, `w`, `h`**: the PNG and its size.
- **`anchor`**: the art pixel that sits on the ground point, such as the trunk base or the post foot. Draw the sprite at `ground - anchor` and y-sort on the ground point.

Optional fields:
- **`tiles: [w, h]`**: the map footprint.
- **`fade`**: the crown rectangle in sprite pixels. Fade the sprite when the player is inside it.
- **`parts`**: for trees only. `crown` and `trunk` are the same size as the full sprite and line up with it. The trunk file carries the ground shadow, so it can stay opaque while the crown fades. `crown` + `trunk` = `full`.
- **`origin: [x, y]`**: for autotiles. This is the pixel of the image that sits on the tile's top-left corner, so draw at `(tx*48 - x, ty*48 - y)`. The body rises above the tile in 3/4 view.
- **`mask`**: the autotile neighbour mask.
- **`seamless`**: `x`, `y` or `xy` for pieces that repeat.
- **`text: {x, y, w, h}`**: the blank panel where the game letters a sign.
- **`arms`**: for fingerposts. A list of `{arm, x, y, w, h}` text rectangles, one per arm, for `N`, `E`, `S` and `W`. E and W arms point sideways. N and S arms are foreshortened plates, pointing away from and towards the viewer.
- **`light: [x, y]`**: the lamp glow centre, for the engine's `lights`.
- **`ends`**: the two string fixings of bunting.

## Autotiles

Names follow `hedge_<mask>_<variant>`, `wall_<mask>_<variant>`, `wall_sand_<mask>` and `fence_<rail|picket|rails>_<mask>`. The mask bits are **N = 1, E = 2, S = 4, W = 8**. A bit is set when that neighbour is the same kind: `h` for hedge, `#` for wall, `f` for fence.

- All 16 masks exist, so ends, runs, corners, T-junctions and crosses are covered.
- Pick the variant from a tile hash. Variant 0 of the hedge has May blossom and variant 1 is plain.
- Tiles are rendered from world-periodic textures with padding and then cropped, so any two neighbouring tiles join without seams.
- Draw them in row order, north to south.

## Woodland (for the big `t` areas)

| Asset | Size | How to use it |
|---|---|---|
| `forest_fill` | 192×192 (4×4 tiles), seamless in x and y, opaque | Tile it over woodland interiors, sampling `(x % 4, y % 4)` |
| `forest_edge_s` | 192 wide, seamless in x | The front row of trees, with trunks and shadows, for a southern boundary. `anchor.y` is the trunk ground line (the bottom of the last `t` row). Draw it over the fill |
| `forest_edge_n` | 192 wide, seamless in x | Crown tops bulging north over the ground beyond |
| `forest_edge_w`, `forest_edge_e` | 192 tall, seamless in y | Crowns bulging sideways; their inner 26 px are opaque, to overlap the fill |
| `forest_clump_0` to `forest_clump_3` | Single crowns | Scatter them on outer corners and along ragged edges to break the repeat |

Lone `t` tiles take a single tree. Species ship in three sizes each (`_s`, `_m`, `_l`), plus `hawthorn_leaf_m`.

## Previews

- `preview_scene.png`: a composed lane with woodland, a wall and stile, a hedge and wicket gate, trees, lamps, a bench, a fingerpost, a pillar box and the Moira silhouette.
- `preview_trees`, `_woods`, `_flora`, `_hedge`, `_wall`, `_fence`, `_street` and `_signs`: contact sheets with the scale figure.

## Licence

All of this is original procedural art, made by these generators in this repo, and it is CC0. It contains no text, logos, brands, ciphers or real liveries. The pillar box and phone box are unbranded, and the bus-stop flag is blank.
