# Handover to Codex: full visual overhaul of LINESIDE

> **Paste this to Codex:**
> You are the art and rendering lead for LINESIDE, a browser game (vanilla JS, Canvas 2D, no build step). Repository: `Bilal-PM/strawder-and-dave`. Start from branch `claude/lineside-chapter-1`, not `main`, which holds an older prototype. Work on a new branch, `codex/visual-overhaul`. If you find yourself on `main`, run `git fetch origin claude/lineside-chapter-1 && git checkout -b codex/visual-overhaul origin/claude/lineside-chapter-1`.
>
> Read `AGENTS.md` first. It covers the project map, how to run and test, and the content rules.
>
> Your job: make the game world look **stunning**, using your image generation. That covers the outdoor valley, the three interiors, every character, the animals, the dialogue portraits, and the title and share key art. Do not change gameplay, map layout, story or rules.
>
> Then read `docs/HANDOVER_CODEX_VISUALS.md` (this file) end to end, and look at `docs/visual-brief/`. Build a vertical slice, show screenshots, then do the rest. Every existing test must still pass: `node tests/run.js`.

---

## 1. What the game is (60-second context)

**LINESIDE** is a serious game about judgment, sold for training, team building, scenario analysis and practice after a course.

- **The story:** you're the project lead reopening a worn-out UK branch railway in **Harrowby**, a small Yorkshire-style valley town. The track is life-expired. The only train, **Ruby**, a 1961 diesel railcar in Brunswick green, has been stood in the brick depot since the line closed "temporarily" in 2009.
- **Chapter 1 ("Make the Case"):**
  - Walk the line with Tom and judge five defects.
  - Give Ruby a health check with Gaz.
  - Plan the works with Jo.
  - Win over the town at the village hall.
  - Make two big Calls.
  - Face the Funding Panel.
- **Status:** the game plays end to end and is tested. The logic is signed off by a UK rail PM. **The visuals are the weak point.** They're currently 16px Kenney-style pixel art (see `docs/visual-brief/before_*.jpg`), which reads as generic. The client wants it to look AAA-indie: warm, detailed, believable, and a place people want to spend time in.
- **Tone:** cosy, warm, gently funny, never dark. A real, slightly tired English valley town that comes back to life over six chapters.

## 2. The creative target

**References** (study the *qualities*, don't copy the assets):
- **Stardew Valley:** readability, cosy 3/4 town layout, and seasonal and time-of-day mood.
- **Eastward** and **Sea of Stars:** lush detail, lighting, rich materials, and characters with presence.
- **Dave the Diver / Cozy Grove / Unpacking:** warmth and charm.
- **Real UK references for authenticity:**
  - Pennine and Dales valley towns;
  - Victorian brick engine sheds and stone railway bridges;
  - rural stations with a canopy and a running-in board;
  - dry-stone walls, red post boxes and telephone boxes;
  - bus shelters and village halls.

**Recommended direction: pick one and commit.**
- **Option A, premium hand-painted 2.5D (recommended for "stunning" with image gen).** Painted, softly lit top-down 3/4 art, authored at **4 art-pixels per world unit** (64px per map tile). Smooth scaling, with warm north-west light and soft cast shadows. It suits image generation best: large painted district pieces plus clean cut-out sprites.
- **Option B, premium pixel art at 32px per tile.** Crisp pixels, `res: 2`, no smoothing, a consistent palette. Harder to get right with image generation, because the pixel grid and palette must be clean. Quantise and hand-fix everything.

**Style rules for either option:**
- **Perspective:** 3/4 oblique top-down. The tops of objects are seen from above at full depth. South-facing walls are drawn at full height. North, east and west walls are only an edge. **Every door faces south, towards the camera.**
- **Light:** one light direction (north-west) everywhere. Shadows fall south-east.
- **Consistency:** one palette and one level of detail across all assets. No mixed styles.
- **Believable scale:** a person is about 1 tile wide and about 2 tiles tall; the current 1-tile figures are too small. A cottage is 4–6 tiles wide. The depot is big (19×6 tiles in footprint).
- **Readability first:**
  - Doors, paths, the PPE access gates, people and interactable things must pop.
  - The closed railway must look **closed and worn**: rusty rails, rotten sleepers, weeds, a blocked drain with a duck in the puddle.
- **No AI-garbled text.** All signage text must be correct and legible. Generate *blank* sign boards and let code render the lettering, or hand-letter it. Every sign is listed in §6.
- **No real brands, logos, operators or companies.** No real fleet numbers or liveries of real operators. Use UK English. Keep the tone warm and never dark.

## 3. Hard constraints (the game depends on these)

1. **Don't change gameplay or layout.**
   - Do not edit `js/game.js` logic, `js/packs/*`, `js/world/level.js` walkability, the tasks or the text.
   - The map layout in `js/world/level.js` is **validated**: reachability, PPE gating, rail logic, and a signed-off UK rail layout. Your art must sit exactly on it.
   - Use `docs/visual-brief/layout_guide.png` as your control image: 1 tile = 10px. Pink marks door mats, cyan marks PPE gates and yellow marks the level crossing.
   - If you believe the layout itself must change, stop and ask. Don't do it silently.
2. **Keep the renderer contract (`LS.TileArt`).**
   - The engine (`js/world/world.js`) calls only the API in §4.
   - You may rewrite `js/world/tileart.js` completely, or replace it with a new file that exposes the same `LS.TileArt` API.
3. **Images must be embedded as data URIs**, via `js/world/atlas.js` or more atlas files loaded before `tileart.js`. Three reasons:
   - The game must run from `file://`.
   - It must also run as a single self-contained HTML file.
   - The share card calls `canvas.toDataURL()`, which fails on a tainted canvas.

   Keep a reproducible build script (as `assets/build_atlas.py` does) that turns source images into the atlas files.
4. **Budgets:**
   - Total embedded art at most **8 MB** (hard ceiling 12 MB). Use WebP where you can, PNG where you need exact alpha or pixels.
   - The single-file bundle must stay under 16 MB.
   - Visual quality must not come at the cost of these budgets.
5. **Performance:**
   - Keep 60 fps on a 2019 mid-range phone and on desktop. The current busy time is about 9 ms per frame, so stay under about 12 ms.
   - Pre-render. No per-frame compositing of large images.
   - **iOS Safari can't allocate huge canvases.** At `res: 4` the whole outdoor ground would be 8192×5376, which is too big. Use **ground chunks** (§4), for example 512×512 world-unit chunks.
   - `load()` plus `buildOutside()` should finish within about 1.5 s on desktop.
6. **Files you may touch:**
   - `js/world/tileart.js` and `js/world/atlas*.js`, plus any new `js/world/art-*.js`;
   - `assets/**` (sources, licences, build scripts);
   - a new `js/world/portraits_img.js` (see §4);
   - `index.html`, only to add your new script tags;
   - `css/lineside.css`, for visual polish only. Keep every existing id and class, because the tests use them;
   - `docs/**`.

   Ask before touching anything else.
7. **Licensing:**
   - Every asset must be your own generated art, or CC0 or commercially licensed with the licence recorded in `assets/CREDITS.md`.
   - No assets ripped from existing games.
   - If you keep any Kenney CC0 pieces, keep their licence files.

## 4. The renderer API you must implement (unchanged contract)

World units are **pixels of a 16px map tile** (the map is 128×84 tiles, so 2048×1344 world units). The engine applies an integer camera zoom (3× desktop, 2× phone), y-sorts objects against characters by their foot line (`sortY`), and draws UI (markers, name tags, prompts, arrows) on top.

```js
window.LS.TileArt = {
  load(): Promise<void>,                               // decode atlases
  buildOutside(level, { lineState: 'closed'|'live', season: 'spring' }): Scene,
  buildRoom(roomId /* 'office'|'hall'|'shed' */, level, { flags: { panel, planned, pigeonGone } }): Scene,
  drawAnimated(ctx, scene, tSeconds, x0, y0, x1, y1),  // water shimmer, flags, smoke… only inside the visible rect
  drawActor(ctx, look, x, y, facing /* 'down'|'up'|'left'|'right' */, frame /* 0 = standing, increasing when walking */, { ppe, moving, alpha }),
  drawAnimal(ctx, kind /* 'cat'|'duck'|'sheep'|'pigeon' */, x, y, tSeconds, { face: -1|1, alpha }),
  actorHeight: number                                  // world units from feet to top of head (markers and name tags sit above this)
};
// Scene
{
  w, h,                          // world units
  res: 1,                        // art pixels per world unit (NEW: 2 for 32px tiles, 4 for 64px tiles)
  smooth: false,                 // NEW: true for painted art (turns image smoothing on)
  ground: HTMLCanvasElement,     // flat layer at w*res × h*res pixels, OR…
  chunks: [ { img, x, y, w, h } ], // NEW: ground split into chunks (world units). Use this at res ≥ 2.
  objects: [ { img, dx, dy, w?, h?, sortY, fade?: {x,y,w,h}, kind? } ], // standing things; w/h in world units (default img size / res)
  lights: [ { x, y, r } ],       // warm light sources for dusk and night (lamps, lit windows, doorways)
  anchors: { name: { x, y } }    // outside: duck, door_office, door_hall, door_shed…; shed: pigeon (+sortY), marjorieCab, radio, exit…
}
```

- **`fade`:** when the player's feet are inside the rect, the object draws at 50% alpha. Use it for tree canopies, the platform canopy, tall signs and the church tower.
- **Coordinates:**
  - `drawActor` and `drawAnimal` receive **feet** positions. Draw the sprite centred horizontally on x, with its base at y.
  - PPE on (`opts.ppe`) means orange hi-vis vest plus a white hard hat over the character's clothes. The player wears it after induction.
- **Flags:** `lineState:'live'` is for later chapters: renewed grey rails, no weeds, working crossing lights and barriers. Chapter 1 is `'closed'`. Room flags change what's shown:
  - `planned`: the planning board's sticky notes are in order, with a critical-path line;
  - `panel`: the hall table is set with cups and name cards;
  - `pigeonGone`: Kevin has left the guard's compartment window.
- **Engine support already in place** (`js/world/world.js`, `draw()`): `res`, `smooth`, `chunks` and object `w`/`h`.
- **Generated portraits:**
  - Define `LS.PORTRAIT_IMG = { moira: { neutral, smile, concern }, helen: {…}, …, avatar0: {…}, … }` with data URIs, in a new `js/world/portraits_img.js` loaded before `game.js`.
  - The game uses them automatically, falling back to the vector portraits.
  - Portraits show in a round frame about 74px on desktop, so use a square crop at 256–384px, with the head and shoulders centred and a soft plain background.

## 5. What must be depicted (use the map; read `js/world/level.js`)

**Map legend** (one character per tile in `LS.LEVEL.rows`):

| Type | Characters |
|---|---|
| **Public ground** | `.` grass · `,` lawn/garden/green · `"` pasture · `r` road · `l` country lane · `-` pavement · `p` footpath · `s` forecourt setts · `e` platform · `_` hardstanding · `c` car park · `x` level-crossing deck · `n` bridge deck · `o` stepping stones · `g` public gate · `m` door mat · `y` yard or playground · `%` road under the rail bridge |
| **Closed railway (PPE only)** | `:` cess/ballast · `=` running line · `/` turnout and depot siding · `b` Beck Bridge deck · `!` PPE access gate · `z` anti-trespass guard · `a` depot apron |
| **Blocked** | `t` tree · `h` hedge · `f` lineside fence or palisade · `k` compound fencing (Heras/palisade) · `#` stone wall or war memorial · `w` water · `q` parapet · `^` platform coping edge · `\|` live main line · `j` junction · `&` crag rock · `+` gravestone · `$` buffer stop · `v` flower/veg beds |
| **Buildings** (uppercase; the footprint includes the roof) | `S` station · `N` depot · `O` project office · `W` welfare · `C` stores · `H` village hall · `A` pub · `P` bakery · `V` cottage · `M` Moira's Beck Cottage · `E` school · `Y` church · `F` farmhouse · `R` barn · `B` signal box |
| **Doors** (on the building's bottom row, with a mat directly south) | `1` office · `2` hall · `3` depot · `*` non-enterable door |

**Buildings** (top-left tile x,y and w×h). Enterable doors get a warm lit doorway, a mat or step, and a hanging sign. Closed doors get no glow.

| Building | Tile (x,y) | Size | Signage and notes |
|---|---|---|---|
| Station | 12,25 | 14×6 | "HARROWBY" on the canopy fascia; a "Station temporarily closed · 2009" notice on the doors; a running-in board on the platform. The platform (x8–33, rows 23–24) is on the track side, with a white coping edge and a yellow safety line. |
| Harrowby Depot, 1911 | 42,25 | 19×6 | Brick engine shed, "HARROWBY DEPOT 1911". A personnel door at (51,30) with a yellow "PPE ONLY" plate. Big arched train doors on the **east gable**, where the siding (x61–69, rows 27–28) enters. |
| Project Office | 56,40 | 14×4 | A two-storey portakabin: "KESTREL VALE LINE · PROJECT OFFICE". It sits in a fenced compound with a car park, a welfare cabin (40,40, 7×3, "WELFARE") and stores containers (71,40, 3×3, "STORES · KEEP CLEAR"). A site board at (53,39) reads "KESTREL VALE LINE REOPENING · Project compound · All visitors report to the site office". |
| Village Hall | 24,49 | 12×6 | "VILLAGE HALL" |
| The Kestrel Arms | 38,49 | 9×6 | A hanging sign with a kestrel; beer garden at x47–51. |
| Pritchard's bakery | 53,49 | 8×6 | "PRITCHARD'S · Family Bakers", with a striped awning. |
| Cottages | 63,49 and 71,49 | 6×6 each | |
| Harrowby Primary | 3,48 | 12×5 | School with a playground. |
| St Oswald's church | 54,63 | 13×7 | A tower, a south porch, and a walled churchyard with gravestones. |
| Beck Cottage (Moira's) | 52,8 | 7×5 | A railway lamp by the door; a washing line with oily overalls. |
| Home Farm | 8,66 | 8×6 | Plus a barn at 23,66 (6×6). |
| Kestrel Junction signal box | 110,25 | 5×5 | "KESTREL JUNCTION" |

**Railway: this must be right for UK rail professionals.**
- **Branch line:** rows 20–21 from the buffer stop at x8 to x116.
  - Chapter 1 look: rusty bullhead rail, rotten sleepers (worst at x40–44), weeds everywhere.
  - A **blocked drain puddle with a duck** at the west end of Beck Bridge (about 82–83, 22).
  - A buddleia, a young sycamore and a **shopping trolley** in the cutting (about 97, 20).
- **Beck Bridge** (x85–91, rows 19–22): three stone arches over the beck, south face visible. Loose parapet stones, a sapling in the mortar, a hint of scour at the middle pier.
- **Crag Lane level crossing** (x104–106): the lane crosses at 90°. Chapter 1 shows it dead: old white gates rusted open, dead lights, a St Andrew's cross on a post, and a red car parked beside the rails.
- **Beyond the closed line:** a "LIMIT OF CLOSED LINE" board at x116, then the junction and the **live main line** running north–south at x119–122 (double track, well maintained). The engine draws passing main-line trains. The road passes under the main line (`%`).
- **Other railway details:**
  - the depot siding and turnout, with trap points on the siding (about 66,26);
  - lineside post-and-wire and palisade fencing, and PPE gates with blue-and-white "PPE beyond this point" boards;
  - a disused semaphore signal and a main-line colour-light signal on the left of its line;
  - a road bridge over the beck (x85–91, rows 56–60), a packhorse bridge (row 73) and stepping stones (row 15).
- **Landscape and street life:**
  - Kestrel Crag viewpoint (NE), woods, dry-stone walls with capstones, hedgerows, fields with sheep;
  - a village green with a bus shelter and a "41" bus-stop flag, a war memorial, and fingerposts at junctions (texts in `LS.LEVEL.fingerposts`);
  - heritage lamp posts (`LS.LEVEL.lamps`) and benches (`LS.LEVEL.benches`).
- **Seasonal and time-of-day mood:** the engine overlays dawn, day, dusk, overcast and night grades plus rain. Give it good `lights` so dusk and night look magical: lamps, windows, doorways.

**Interiors** (grids in `LS.LEVEL.rooms`). Each must have a **clearly marked EXIT**: a green exit sign, a light spill and a mat at the `X` gap.
- **Project office** (20×12): the planning board (sticky notes in two lanes, "MARJORIE" and "TRACK"), a kettle counter, PPE lockers (orange hi-vis visible), a meeting table, Steve's desk with a monitor, a plan chest and a sign-in desk.
- **Village hall** (28×14): a stage, a banner area (the engine shows the banner text), a tea urn, a noticeboard, a top table, rows of chairs and stacked chairs.
- **Depot** (32×14): brick walls with tall arched windows, rails across rows 5–6 running out through big closed doors on the east wall, a buffer stop on the west end, a workbench with a radio, seat cushions and an inspection-pit hint.
  - **Ruby** spans x4–27, rows 4–6. She's a 1961 diesel railcar in 3/4 side view:
    - Brunswick green with cream lining and yellow warning ends;
    - grey roof with exhaust stacks, underfloor engines and bogies, rust patches;
    - slam doors and a nameplate reading "MARJORIE";
    - a guard's compartment window where **Kevin the pigeon** sits (`anchors.pigeon`).
  - Use a fictional fleet number such as "KVL 61", never a real one.
  - In the cold open the depot is dark: the engine adds a torch effect.

**Characters** (`drawActor(look)`): people are about 2 tiles tall. Each needs 4 facings and a walk cycle of at least 4 frames, and they must be recognisable at a glance. Build a sprite per cast member, keyed by matching `look` (compare the fields below), with a generic fallback for anyone else.

| id | Who | Look |
|---|---|---|
| moira | Moira Kell, Harrowby's last station master, the mentor (70s, kind, dry) | grey hair in a bun, glasses, green jacket, sensible raincoat feel |
| helen | Helen Walsh, sponsor | dark-brown bob, navy suit |
| jo | Jo Adeyemi, engineering lead | Black woman, curly hair, glasses, mustard jacket |
| tom | Tom Brennan, track and site manager | beard, orange hi-vis, white hard hat |
| hannah | Hannah Clarke, safety lead | red ponytail, orange hi-vis |
| steve | Steve Hale, commercial | grey short hair, navy suit |
| priya | Priya Nair, community | long black hair, teal cardigan |
| gaz | Gaz Whitfield, depot fitter | beard, navy overalls and cap |
| brian | Cllr Brian Pike, parish council | bald, glasses, tweed jacket |
| sue | Sue Bennett, funding panel | long dark hair, plum suit |
| raj | Raj Patel, independent reviewer | beard, glasses, green jacket |
| len | Len Haworth, retired signalman | white hair, flat cap, brown jacket |
| june | June Pritchard, baker | bun, red top, cream apron |
| dev | Dev Mistry, 17 | teenager, blue tee |
| jess | Jess Carter, parent | fair ponytail, purple cardigan |
| avatar0–3 | Player choices | 0: short brown hair, navy jacket · 1: curly black hair, purple cardigan · 2: long fair hair, green jacket · 3: beard and glasses, rust tee |

- **Diversity:** keep the cast diverse and dignified, with no caricature.
- **Animals:** Sleeper the ginger depot cat (asleep, curled, with a "z"), a mallard in the drain puddle, sheep in the pasture, and Kevin the pigeon.
- **Portraits:** each character (and each avatar) needs a portrait in three moods: neutral, smile and concern. Use the same art style as the world, painted and warm.
- **Key art** (optional but valuable):
  - a title-screen illustration: Harrowby station at dusk, Ruby's nose in the depot doorway, the town lights on;
  - a 1080×760 hero image for the share card.

  Both need a small `game.js` hook, so ask and the lead engineer will add it.

## 6. All signage text (render it in code or letter it by hand; never generated text)

- "HARROWBY"
- "Station temporarily closed · 2009"
- "CLOSED"
- "HARROWBY DEPOT 1911"
- "PPE ONLY"
- "KESTREL VALE LINE · PROJECT OFFICE"
- "WELFARE"
- "STORES · KEEP CLEAR"
- "KESTREL VALE LINE REOPENING · Project compound · All visitors report to the site office"
- "PPE beyond this point · Authorised persons only"
- "VILLAGE HALL"
- "THE KESTREL ARMS"
- "PRITCHARD'S · Family Bakers"
- "HARROWBY PRIMARY"
- "BECK COTTAGE"
- "KESTREL JUNCTION"
- "LIMIT OF CLOSED LINE"
- "BRANCH CLOSED"
- "41" (bus-stop flag) and "BUS STOP" (road marking)
- "HOME FARM"
- "MARJORIE", "KVL 61"
- "EXIT"
- fingerpost arms: see `LS.LEVEL.fingerposts`

## 7. How to work (pipeline)

1. **Art bible first.** Commit `docs/art-bible/`: the palette, lighting rules, 3–4 moodboard frames, and one character turnaround. Keep a single shared style prompt and reuse it for every generation.
2. **Vertical slice.** Build the station forecourt, the platform and track, the depot exterior, the compound and the office at in-game scale, plus the office interior and three characters. Make screenshots at 1440×900 and 390×844 and compare them against `docs/visual-brief/before_*.jpg`. **Stop and show them before scaling up.**
3. **Generation hygiene:**
   - Generate on a transparent or plain background.
   - Cut the sprites out cleanly, then align them to the tile grid (sizes are multiples of the tile at your `res`).
   - Colour-match everything to the art bible.
   - Seams: ground chunks must tile, and roads, pavements and kerbs must join cleanly across chunks (align with `layout_guide.png`).
4. **Commit each stage separately** (art bible, vertical slice, each district or interior, final polish), with a clear message.
5. **Pack:** run a build script to produce the atlas files (data URIs), with sizes logged against the budget.
6. **Integrate:** build scenes from `LS.LEVEL` so every footprint, door, mat, gate and track row lands exactly where the map says.
7. **Verify.** All of these must pass:
   - `node tests/run.js`: smoke, playthrough, gating, reachability, save, layout, performance and screenshots.
   - `node --check` on your JS files.
   - No console errors over `file://`.
   - The share card still works.
   - Mobile Safari check: no single canvas over 16 megapixels.

## 8. Acceptance criteria

- It reads instantly: a new player can tell where the doors, paths, people, gates and "?" inspect points are, without the markers.
- Every building, door, road, track row, bridge and gate matches `layout_guide.png`, so the collision still feels right. Nobody walks through a drawn wall or gets blocked by empty grass.
- A UK rail professional nods at the railway details, and nothing looks American or generic-fantasy.
- 60 fps on desktop and mobile; art within the budget; runs from `file://` and as a single file.
- Every test passes; no gameplay, text or layout changes.
- Before and after screenshots of 10 key views committed in `docs/visual-brief/after_*`:
  - the title screen and the forecourt;
  - the compound and office door;
  - the platform and depot, and Beck Bridge;
  - the level crossing, and the high street at dusk;
  - the office interior, the depot interior with Ruby, and the hall during the panel;
  - the character line-up.

## 9. Hand-back

- Open a PR from `codex/visual-overhaul` into `claude/lineside-chapter-1`. Don't force-push shared branches.
- The PR description should give: the chosen option (A or B) and why; the asset list with licences; the atlas sizes; performance numbers; test results; and the before and after screenshots.
- List anything you couldn't do, and anything that needs an engine or game hook from the lead engineer.

**Useful files:**
- `README.md`: product overview.
- `docs/DESIGN.md`: the six-chapter design.
- `docs/TEAM.md`: roles and pipeline.
- `LLM_HANDOFF.md`: engine API and architecture.
- `tests/README.md`: how to run the tests.
- `assets/CREDITS.md`: current art sources.
- `docs/visual-brief/`: layout guide and before shots.
