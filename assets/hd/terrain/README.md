# LINESIDE HD terrain

Generator for every ground surface, transition overlay and track piece at **48 × 48 art px per map tile** (res 3).

```sh
python3 assets/hd/terrain/build.py               # everything + previews (about 15 s)
python3 assets/hd/terrain/build.py --no-preview  # sheets + manifest only
python3 assets/hd/terrain/build.py --only grass  # one group while iterating (no manifest written)
```

Needs Python 3, Pillow and numpy. It is deterministic: running it twice gives byte-identical sheets and manifest.
The output goes to `assets/hd/out/terrain/`: `tiles/*.png`, `sprites/*.png`, `manifest.json`, and `preview_*.png`.
The previews are for review only, and the renderer never loads them.

## Files

| File | What it makes |
|---|---|
| `tk.py` | Toolkit on top of `assets/hd/lib/pix.py`: edge-locked variants, periodic noise, scatter, pebbles, shading |
| `grass.py` | `lawn`, `grass` (verge), `meadow` (rough/long grass and pasture), plus the tuft and flower sprites |
| `stone.py` | Coursed stone: `setts` (Yorkshire gritstone), `flags` (York-stone pavement), `platform` |
| `soft.py` | `tarmac` plus the drain and manhole specials, `concrete`, `gravel`, `hoggin`, `dirt`, `mud`, `soil`, `woodland` |
| `rail.py` | Ballast and cess, sleepers, rail strips, rail cross-sections, joints, level-crossing decks |
| `water.py` | Animated `water`, `bank_*` overlays, `puddle_*` sprites |
| `overlays.py` | Grass, lawn and path edges, kerbs, road markings, concrete joints, platform edge tiles |
| `scene.py` | `preview_track.png` and `preview_scene.png`, built only from the published sheets and manifest |
| `sets.py`, `ground.py`, `build.py` | Registry, sheet packing, manifest |

## How variants tile (read this before writing the renderer)

**Tile sets use edge-locked variants.** Every variant of a set has the same outer border band, and the interiors
differ. So **any variant can sit next to any other variant in any direction** with no seam. Choose a variant per map
tile with a stable hash of `(x, y)`, weighted by the entry's `weights` if it has them (the plain variants are
weighted up and the flowery ones are rarer).

Coursed stone (`setts`, `flags`, `platform`) is laid in rows. The stone that crosses the tile's west/east edge is the
same in every variant, and the rest of each row is recut per variant. Each tile's bottom row is a joint, so rows stack
cleanly.

Large-scale colour variation across a field isn't baked into the tiles, because it would show the grid. If you want
it, add a very soft low-frequency tint in the renderer.

## Manifest

`manifest.json` has one entry per name:

```json
"lawn": {"file": "tiles/lawn.png", "x": 0, "y": 0, "w": 48, "h": 48, "anchor": [0, 0], "kind": "tile",
         "variants": 8, "cells": [[0,0],[48,0], ...], "weights": [3,3,3,2,1,1,1,0.6]}
```

- **`cells[i]`** is the top-left of variant `i` in the sheet.
- **Animated sets** (`water`) have `animFrames: 4`. For those, `cells[i]` is a list of per-frame top-lefts: variants go
  across the sheet and frames go down. The ripples move 12 px south per frame, so the loop is seamless. Play it at
  about 6–8 fps.
- **`kind`** is one of:
  - `tile`: opaque;
  - `overlay`: 48 × 48 with transparency, drawn over a tile;
  - `sprite`: free-placed, and `anchor` is the placement point.

## Naming

### Base tiles (opaque, 48 × 48, 8 variants unless noted)

| Name | Map chars | Notes |
|---|---|---|
| `lawn` | `,` | Mown. Occasional daisies, clover, buttercups |
| `grass` | `.` | Verge. Tuftier |
| `meadow` | `"` | Rough or long grass: seed heads and wild flowers |
| `woodland` | under `t` masses | Leaf litter, moss, twigs, a few small mushrooms |
| `dirt` | `p` | Earth path: pebbles, boot prints, a twig |
| `hoggin` | alternative for `p` or `g` | Buff compacted gravel |
| `gravel` | `_` | Compound hardstanding chippings |
| `setts` | `s` | Station forecourt |
| `flags` | `-` | Pavement |
| `tarmac` | `r`, `%`, `c`, `y` (town) | Worn: cracks (one with a weed) and patch repairs |
| `tarmac_drain_N/S/E/W` | | Single special tiles, compatible with all tarmac variants. The gully grate sits against the named kerb side |
| `tarmac_manhole`, `tarmac_manhole_small` | | Single special tiles, compatible with all tarmac variants |
| `concrete` | `a` apron, compound | Oil stain, rust stain, cracks |
| `concrete_joint_H/V` (overlay) | | An expansion joint along the tile's top or left edge. Place one every few tiles |
| `mud` | `y` (farm) | Hoof prints, straw, wet sheen, one puddle variant |
| `soil` | `v` beds | Dug rows every 12 px: plain, clods, seedlings |
| `platform` | `e` | Closed-station flags with moss and lichen |
| `platform_edge_N` | `^` | 4 variants. Coping at the top (track side) plus the plain yellow safety line |
| `platform_edge_S` | | 4 variants. The back edge, with a visible brick retaining face at the bottom |
| `ballast_old` | `=` on the closed line | Dirty and rust-stained. Variants 6–7 have a few weeds |
| `ballast_old_weedy` | | Grass islands that fade out before the border, so it mixes freely with `ballast_old` |
| `ballast_live` | `\|`, `j` | Clean main-line ballast |
| `cess_old` | `:`, `/`, `z` | Cinder cess with grass patches and weeds |
| `cess_new` | | Reopened line |
| `water` | `w` | 6 variants × 4 frames |
| `xing_panel_timber`, `xing_panel_rubber` | `x` off the rails | Plain deck texture, 3 variants each |

### Edge overlays (transparent, draw on the receiving tile)

`<set>_<side>` means the other surface lies on that side of this tile:

- `_N`, `_S`, `_E`, `_W`: one side;
- `_L_NW`, `_L_NE`, `_L_SW`, `_L_SE`: both of those sides (the piece already contains both edges, rounded at the
  corner);
- `_diag_NW` and so on: diagonal only (a small corner nub).

Rule of thumb:

1. For each corner whose two sides are both "other", draw `L_xx`.
2. Draw the plain edge for any remaining side.
3. For a corner where neither side is "other" but the diagonal is, draw `diag_xx`.

`scene.autotile()` is a reference implementation.

| Set | On which tile | Other side |
|---|---|---|
| `grass_edge_*` | Path, pavement, cess, road, gravel and so on | `grass` (`.`). Built from the same base as `grass`, so it joins the neighbouring grass tile seamlessly. Casts a violet shadow when the grass is N or W |
| `lawn_edge_*` | Same | `lawn` / `meadow` |
| `kerb_*` | Pavement (`-`) | Road. A granite kerb. `kerb_S` shows the 3/4 kerb face and gutter. The kerb sits inside the pavement tile |
| `path_edge_*` | `dirt` / `hoggin` | Grass: a darker margin with pushed-aside pebbles. Draw `grass_edge_*` over it |
| `bank_*` | `water` | Land. Grass lip, earth bank (deepest on the N bank, whose face looks at the camera), waterline stones, shaded shallows, reeds with bulrush heads on some edge variants |

Edge variants (4, or 2 for corners, 2 for kerbs) tile with each other along the edge.

### Road markings (transparent 48 × 48 overlays, no text)

| Name | What it is |
|---|---|
| `mark_centre_H` / `_V` | One 24 px dash per tile, centred in the tile (`H`: rows 23–24) |
| `mark_giveway_H` / `_V` | Double broken line across the tile centre |
| `mark_triangle_S/N/E/W` | Give-way triangle, pointing towards the line |
| `mark_dyellow_<side>`, `mark_syellow_<side>` | Double or single yellow along the kerb on that side |
| `mark_bay_H` / `_V` | Parking bay line along the top or left edge |

### Railway

The track geometry matches the current engine layout (`trackH` / `trackV`, scaled ×3). A straight track fills a
**96 px band (2 tiles)**. Vertical track uses the same numbers across x.

| Element | Placement |
|---|---|
| Base tiles | Ballast tiles under the band, cess tiles beside it |
| Sleepers `sleeper_<kind>_<H\|V>` | One every **24 px** along the track, with the sprite `anchor` on the band's centre line (y = band + 48). Draw the sleepers first |
| Rails `rail_<rust\|live>_<H\|V>` | 48 px tiling strips, 7 px thick. Draw them second, with the strip's top-left at band + **29** and band + **65** |
| Joints `rail_joint_<rust\|live>_H` | Optional fishplate overlays on the rail strip, one every 6–10 tiles |

Sleeper kinds:

- `rotten` (6): the closed line, worst at x40–44;
- `weathered` (6): the closed line;
- `new` (4): timber for the reopened line;
- `concrete` (4): the main line.

Timber sleepers carry cast-iron chairs and wooden keys; concrete ones carry rail pads and clips.

Rail strip rows run from lit to shadow: head edge, head top ×2, side, web, foot, translucent cast shadow. On `V`
strips the lit side is on the left. `rust` is the closed line; `live` has a bright running head and rusty sides.

**Curves** (the turnout and the junction): stamp one sleeper sprite every 24 px of arc, rotated to the tangent.
Then, for each rail offset (±18 px from the centre line), walk the curve at about 0.5 px steps and plot
`rail_xsec_<kind>` (a 1 × 7 px column, row 0 = lit side) along the normal. Where the normal faces south or east,
keep row 0 towards the north-west.

**Level crossing** `xing_timber_H` (the dead Crag Lane crossing: rusty rail heads, old planks) and `xing_rubber_H`
(modern panels, bright heads): 48 × 96 slices across the whole band. They tile along x and are drawn over the track,
with the rails flush and flangeways on the gauge side.

The buffer stop is not part of this set.

### Puddles

`puddle_s` (3), `puddle_m` (3) and `puddle_l` (2) are free sprites (centre anchor) for the cess, farmyard and road.
Their wet rim is a translucent shadow, so they sit on any surface.

## Rules followed

- Colours come only from `pix.RAMPS`, with the NW light (`pix.LIGHT`) and the translucent `pix.SHADOW`.
- Terrain has no outlines.
- The only non-opaque pixels are shadows, wet rims and shallows.
- No text or brands anywhere.
- All art is generated by these scripts (own work, CC0-compatible).
