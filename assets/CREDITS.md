# LINESIDE — art credits

All third-party art used by the game world is **CC0 1.0 (public domain)**. Credit is not required, but gladly given.

| Source | Author | Licence | Used for |
|---|---|---|---|
| Tiny Town 1.0 (`src/kenney_tiny-town_tilemap_packed.png`) | Kenney (www.kenney.nl) | CC0 1.0 | Style anchor: grass, dirt paths, roofs, walls, windows, doors, gables, trees, forest crowns, timber fences |
| RPG Urban Pack 1.0 (`src/kenney_rpg-urban-pack_tilemap_packed.png`) | Kenney (www.kenney.nl) | CC0 1.0 | Cast bodies (palette-swapped per character), heritage lamp, benches, bins, crate, barriers |

Everything else in the world — track, ballast, turnouts, the junction, level crossing, platform coping, the beck, bridges, crag,
hedgerows, dry-stone walls, palisade/Heras/post-and-wire fencing, signs and pixel lettering, the signal box, site cabins,
church tower, Ruby the 1961 railcar, interiors, animals — is drawn procedurally in `js/world/tileart.js` in the
ENDESGA-32 palette (by Endesga, free to use) to match Tiny Town.

## Pipeline
`python3 assets/build_atlas.py` (Pillow) crops only the pieces the renderer uses, applies a hand-made ENDESGA-32 colour
LUT to the RPG Urban pieces (nearest-colour remapping turns Kenney's teal into cyan, so each colour is mapped by hand),
bakes the character bodies into palette-swappable class maps and writes `js/world/atlas.js` as base64 data URIs
(no tainted canvases on file://, works in the single-file bundle).

The original licence files are in `src/` (`LICENSE_kenney_*.txt`).

## Code libraries
| Library | Author | Licence | Used for |
|---|---|---|---|
| three.js r186 (`js/vendor/three.r3d.js`, with `examples/jsm` UnrealBloomPass) | three.js authors | MIT (full text in the file header) | The optional HD-2D renderer (`js/world/r3d/`, `?render=3d`). Built by `tools/build_three.sh` from the npm package. No art. |
