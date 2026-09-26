#!/usr/bin/env python3
"""LINESIDE HD town buildings generator.

    python3 assets/hd/town/build.py            # all buildings + previews
    python3 assets/hd/town/build.py hall cottage_a   # just some (previews for those only)

Output: assets/hd/out/town/<name>.png (day sprite), <name>_lit.png (dusk window overlay, same size),
manifest.json, preview_*.png. Deterministic (every random draw is seeded).

Geometry: 1 map tile = 32 art px. Each sprite is exactly the footprint wide; its bottom edge is the footprint's south
edge; it may rise north of the footprint (chimneys, towers) by `ov` px. anchor = [0, h] = footprint south-west corner.
"""
import os, sys, json, math, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from townlib import *  # noqa
from PIL import Image

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUTD = os.path.join(ROOT, 'assets', 'hd', 'out', 'town')
T = 32


# ------------------------------------------------------------------ footprints from the validated map
def footprints():
    rows = None
    try:
        js = ("global.window=global;global.LS={};require(%r);process.stdout.write(JSON.stringify(LS.LEVEL.rows))"
              % os.path.join(ROOT, 'js', 'world', 'level.js'))
        rows = json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))
    except Exception as e:  # node missing: fall back to the recorded footprints below
        print('  (node unavailable, using recorded footprints)', e)
    if rows is None: return dict(RECORDED)
    seen = set(); out = {}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch not in 'HAPVMEYFR' or (x, y) in seen: continue
            st = [(x, y)]; cells = []
            while st:
                a, b = st.pop()
                if (a, b) in seen or b < 0 or b >= len(rows) or a < 0 or a >= len(rows[b]): continue
                c = rows[b][a]
                if c != ch and c not in '*123': continue
                seen.add((a, b)); cells.append((a, b))
                st += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)]
            xs = [c[0] for c in cells]; ys = [c[1] for c in cells]
            x0, y0 = min(xs), min(ys)
            doors = [(a, b) for a, b in cells if rows[b][a] in '*123']
            out.setdefault(ch, []).append({'origin': [x0, y0], 'tiles': [max(xs) - x0 + 1, max(ys) - y0 + 1],
                                           'door': list(doors[0]) if doors else None})
    return out


RECORDED = {  # as computed from js/world/level.js on claude/lineside-chapter-1 (used only if node is missing)
    'M': [{'origin': [52, 8], 'tiles': [7, 5], 'door': [55, 12]}],
    'E': [{'origin': [3, 48], 'tiles': [12, 5], 'door': [8, 52]}],
    'H': [{'origin': [24, 49], 'tiles': [12, 6], 'door': [29, 54]}],
    'A': [{'origin': [38, 49], 'tiles': [9, 6], 'door': [42, 54]}],
    'P': [{'origin': [53, 49], 'tiles': [8, 6], 'door': [56, 54]}],
    'V': [{'origin': [63, 49], 'tiles': [6, 6], 'door': [65, 54]}, {'origin': [71, 49], 'tiles': [6, 6], 'door': [73, 54]}],
    'Y': [{'origin': [54, 63], 'tiles': [13, 7], 'door': [58, 69]}],
    'F': [{'origin': [8, 66], 'tiles': [8, 6], 'door': [11, 71]}],
    'R': [{'origin': [23, 66], 'tiles': [6, 6], 'door': [25, 71]}],
}


class B:
    """Frame for one building: footprint size, north overhang, and handy coordinates."""
    def __init__(self, fp, ov, seed):
        self.fp = fp; self.tw, self.th = fp['tiles']; self.ov = ov
        self.W = self.tw * T; self.Hh = self.th * T + ov
        self.top = ov; self.G = self.Hh          # ground line (exclusive)
        self.p = Painter(self.W, self.Hh, seed)
        d = fp['door']; self.dcx = (d[0] - fp['origin'][0]) * T + T // 2 if d else self.W // 2


# ------------------------------------------------------------------ shared pieces
def gable_face(p, cx, hw, eave_y, apex_y, ground, wall, roof_kind='wslate', depth=22, coping='dressed', seed=0,
               roof_lo=None):
    """A projecting front gable: wall face (rectangle + triangle), its own two roof slopes running back into the main
    roof (left slope lit, right slope in shade) and dressed copings along the rakes with kneelers and an apex stone."""
    x0, x1 = cx - hw, cx + hw
    q = Painter(p.w, p.h, seed)
    wall(q, x0, apex_y, 2 * hw, ground - apex_y)
    def edge(x):  # rake line y at column x
        return apex_y + abs(x + 0.5 - cx) / hw * (eave_y - apex_y)
    # roof slopes behind the rakes
    for x in range(x0 - 3, x1 + 3):
        e = int(edge(min(max(x, x0), x1 - 1)))
        left = x < cx
        for yy in range(e - depth, e):
            if yy < 0: continue
            lx = (x - x0) if left else (x1 - x)
            course = lx % 6
            i = (1 if left else 3) + (1 if course == 0 else 0) + (1 if course == 1 and not left else 0)
            if ((yy + (lx // 6) * 3) % 9) == 0: i += 1
            if yy == e - depth: i = 4
            p.r(x, yy, roof_kind, i)
    # valley shadow where the gable roof meets the main roof
    for x in range(x0 - 3, x1 + 3):
        e = int(edge(min(max(x, x0), x1 - 1)))
        p.shift(x, e - depth - 1, 1)
    # face
    for yy in range(apex_y, ground):
        for x in range(x0, x1):
            if yy < eave_y and yy < edge(x): continue
            if q.cv.px[x, yy][3]:
                p.m[yy][x] = q.m[yy][x]; p.i[yy][x] = q.i[yy][x]; p.cv.px[x, yy] = q.cv.px[x, yy]
    # AO under the rakes on the face
    for x in range(x0, x1):
        e = int(math.ceil(edge(x)))
        for k in range(3): p.shift(x, e + k, 2 if k == 0 else 1)
    # copings along the rakes
    for x in range(x0 - 2, x1 + 2):
        e = int(edge(min(max(x, x0), x1 - 1)))
        left = x < cx
        for k in range(5):
            p.r(x, e - k, coping, (0 if k == 4 else 1) if left else (2 if k < 4 else 1))
        p.out(x, e - 5) if abs(x + 0.5 - cx) < 2 else p.r(x, e - 5, coping, 3)
        p.r(x, e + 1, coping, 3)
    # kneelers and apex stone
    for side in (-1, 1):
        kx = x0 - 3 if side < 0 else x1 - 6
        for yy in range(eave_y - 7, eave_y + 2):
            for k in range(9): p.r(kx + k, yy, coping, 0 if yy == eave_y - 7 else (3 if yy > eave_y else (1 if side < 0 else 2)))
    for yy in range(apex_y - 9, apex_y + 1):
        for xx in range(cx - 4, cx + 4): p.r(xx, yy, coping, 0 if yy == apex_y - 9 else (1 if xx < cx + 1 else 2))
    for xx in range(cx - 1, cx + 1):
        for yy in range(apex_y - 14, apex_y - 9): p.r(xx, yy, coping, 1 if xx == cx - 1 else 2)
    p.out(cx - 1, apex_y - 15); p.out(cx, apex_y - 15)


def fleche(p, cx, ridge_y, h=26, w=16):
    """Louvred roof ventilator on the ridge (the village hall's little turret), lead-capped with a finial."""
    x0 = cx - w // 2; top = ridge_y - h
    for yy in range(ridge_y - 4, ridge_y + 10):
        for xx in range(x0 + 3, x0 + w + 8):
            if p.m[yy][xx] in ('wslate', 'tile_roof') and xx - x0 - w < yy - ridge_y + 4: p.shift(xx, yy, 2)
    for yy in range(top + 8, ridge_y + 2):
        for xx in range(x0, x0 + w):
            lx = xx - x0
            i = 1 if lx < 3 else (2 if lx < w - 3 else 3)
            louvre = (yy - top) % 3 == 0 and 2 < lx < w - 2 and yy < ridge_y - 2
            p.r(xx, yy, 'paint_cream' if not louvre else 'paint_cream', i + (2 if louvre else 0))
            if lx in (0, w - 1): p.r(xx, yy, 'paint_cream', 3 if lx else 1)
    # lead pyramid cap
    for yy in range(top, top + 9):
        hw = (yy - top) * (w // 2 + 2) // 8
        for xx in range(cx - hw - 1, cx + hw + 1):
            p.r(xx, yy, 'lead', 0 if xx < cx - 1 else (1 if xx < cx + hw // 2 else 3))
    for xx in range(cx - w // 2 - 2, cx + w // 2 + 2): p.r(xx, top + 8, 'lead', 3)
    for yy in range(top - 9, top): p.r(cx - 1, yy, 'paint_black', 1); p.r(cx, yy, 'paint_black', 3)
    for xx in range(cx - 4, cx + 4): p.r(xx, top - 6, 'paint_black', 1)
    p.r(cx - 2, top - 9, 'gold', 0); p.r(cx - 1, top - 10, 'gold', 1); p.r(cx, top - 10, 'gold', 2); p.r(cx + 1, top - 9, 'gold', 2)
    for xx in range(x0 - 1, x0 + w + 1): p.r(xx, ridge_y + 2, 'lead', 2); p.r(xx, ridge_y + 3, 'lead', 3)


# ------------------------------------------------------------------ cottages
def cottage_a(fp):
    """Gritstone two-up two-down: stone-slate roof, green door under a climbing rose, window boxes of geraniums, a
    ginger cat asleep on the sill, a bike against the wall."""
    b = B(fp, 34, 101); p = b.p; W, G = b.W, b.G
    eave = G - 100; ridge = b.top + 28
    roof(p, 0, W, b.top + 2, ridge, eave, 'stoneslate', seed=3, ridge='stone', verge='coping', moss=0.12)
    chimney(p, 17, ridge + 5, 20, 30, 'grit', pots=2, seed=4, roof_kind='stoneslate')
    chimney(p, W - 17, ridge + 5, 20, 28, 'grit', pots=1, seed=5, roof_kind='stoneslate')
    stone_wall(p, 0, eave, W, G - eave, 'grit', seed=11, soot=0.3)
    quoins(p, 0, eave, G - 5, -1, seed=1); quoins(p, W, eave, G - 5, 1, seed=2)
    plinth(p, 0, W, G - 6, 6)
    dx = b.dcx
    sash(p, 22, G - 52, 30, 34, curtain='wine', bars='2', seed=1)
    sash(p, 132, G - 52, 30, 34, curtain='wine', bars='2', seed=2)
    sash(p, 22, eave + 13, 28, 30, curtain='cream', bars='2', seed=3)
    sash(p, dx - 10, eave + 11, 20, 20, curtain=None, bars='2', seed=4, sill=True)
    sash(p, 132, eave + 13, 28, 30, curtain='cream', bars='2', seed=5)
    door(p, dx, G - 1, 32, 54, paint='paint_green', lintel='date', fanlight=False, glazed_top=True)
    wall_ao(p, 0, W, eave + 3, G - 6)
    gutter(p, 0, W, eave); downpipe(p, W - 12, eave + 3, G - 6)
    window_box(p, 18, G - 22, 38, 'paint_green', ('flower_red', 'flower_wht'), seed=7)
    climbing_rose(p, dx - 20, dx + 20, G - 6, G - 64, seed=5, flower='flower_red')
    cat_loaf(p, 140, G - 18, 'hair_ginger', facing=1)
    plant_pot(p, 152, G - 18, seed=4, flower='flower_pur')
    bicycle(p, 58 - 40 + 60, G - 1, 'paint_blue') if False else None
    plant_pot(p, dx + 20, G - 1, seed=3, flower='flower_pur', big=True)
    milk_bottles(p, dx - 25, G - 2, 2)
    ground_tufts(p, 0, W, G - 1, seed=9)
    return b


def hall(fp):
    """Harrowby Village Hall, 1911: red brick with sandstone dressings, a tall single storey under Welsh slate, a
    louvred ventilator on the ridge, a gabled entrance porch with the doors open and lit, a noticeboard, lanterns,
    hanging baskets and bunting ready for the town meeting."""
    b = B(fp, 44, 202); p = b.p; W, G = b.W, b.G
    eave = G - 84; ridge = b.top + 30
    roof(p, 0, W, b.top + 2, ridge, eave, 'wslate', seed=21, ridge='clay', verge='coping', moss=0.02)
    chimney(p, 26, ridge + 5, 18, 24, 'brick', pots=1, seed=22)
    chimney(p, W - 26, ridge + 5, 18, 24, 'brick', pots=2, seed=23)
    fleche(p, W // 2 + 60, ridge + 2)
    brick_wall(p, 0, eave, W, G - eave, 'brick', seed=5)
    # stone band courses and dressed quoins
    for yy in (G - 30, eave + 4):
        for xx in range(W):
            p.r(xx, yy, 'dressed', 0); p.r(xx, yy + 1, 'dressed', 1); p.r(xx, yy + 2, 'dressed', 2); p.r(xx, yy + 3, 'dressed', 4)
    quoins(p, 0, eave, G - 6, -1, seed=3, long=12, short=7, ch=(8, 8)); quoins(p, W, eave, G - 6, 1, seed=4, long=12, short=7, ch=(8, 8))
    plinth(p, 0, W, G - 7, 7)
    dx = b.dcx; hw = 44
    # tall windows: 6-over-6 sashes with keystones, two west of the porch and three east
    for x in (26, 82, dx + hw + 20, dx + hw + 76, dx + hw + 132):
        if x + 30 > W - 10: continue
        sash(p, x, eave + 18, 28, 48, surround='dressed', curtain='paint_red', bars='6', lintel='key', seed=x)
    wall_ao(p, 0, W, eave + 8, G - 7)
    gutter(p, 0, W, eave)
    # porch
    def porch_wall(q, x, y, w, h):
        brick_wall(q, x, y, w, h, 'brick', seed=9)
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if xx < x + 7 or xx >= x + w - 7:
                    k = (yy - y) // 8
                    lng = k % 2 == 0
                    if (xx < x + (12 if lng else 7)) or (xx >= x + w - (12 if lng else 7)):
                        q.r(xx, yy, 'dressed', 3 if (yy - y) % 8 == 7 else (0 if (yy - y) % 8 == 0 else 1))
        plinth(q, x, w, y + h - 7, 7)
    gable_face(p, dx, hw, eave - 4, eave - 46, G, porch_wall, 'wslate', depth=20, seed=31)
    # porch details: open double doors (warm), stone arch, name board, datestone, lanterns
    for yy in range(G - 72, G - 60):  # round-arched stone head over the doorway
        for xx in range(dx - 22, dx + 22):
            r = math.hypot(xx + 0.5 - dx, (yy - (G - 58)) * 1.6)
            if 16 <= r < 23: p.r(xx, yy, 'dressed', 0 if r > 21.5 else (1 if xx < dx else 2))
    door(p, dx, G - 1, 36, 56, paint='paint_green', fanlight=False, open_=True, step=True)
    for yy in range(G - 64, G - 57):  # arched fanlight glow over the doors
        for xx in range(dx - 16, dx + 16):
            r = math.hypot(xx + 0.5 - dx, (yy - (G - 57)) * 1.6)
            if r < 16:
                bar = abs(xx + 0.5 - dx) < 1 or 7.5 < r < 8.8
                p.r(xx, yy, 'white' if bar else 'pane', 1 if bar else 2)
                if not bar: p.glow(xx, yy, rc('glow', 1))
    blank_board(p, dx - 34, eave - 2, 68, 14, ground='paint_green', frame='gold', name='VILLAGE HALL')
    # blank datestone roundel in the gable (the year is lettered by the game if wanted)
    for yy in range(eave - 33, eave - 17):
        for xx in range(dx - 8, dx + 8):
            r = math.hypot(xx + 0.5 - dx, yy + 0.5 - (eave - 25))
            if r < 8: p.r(xx, yy, 'dressed', 3 if r > 7 else (0 if (xx - dx) + (yy - (eave - 25)) < -3 else 1))
    p.signs['datestone'] = [dx - 5, eave - 29, 10, 8]
    lantern(p, dx - 30, G - 58); lantern(p, dx + 30, G - 58)
    hanging_basket(p, dx - hw + 2, eave + 12, seed=4)
    hanging_basket(p, dx + hw - 12, eave + 12, seed=5)
    noticeboard(p, dx + hw + 56 - 20, G - 58, 26, 20, seed=2) if False else None
    noticeboard(p, 116 - 5, G - 60, 28, 22, seed=2)
    bunting(p, 4, dx - hw - 2, eave + 6, 7, seed=1)
    bunting(p, dx + hw + 2, W - 4, eave + 6, 9, seed=2)
    downpipe(p, 8, eave + 3, G - 7); downpipe(p, W - 12, eave + 3, G - 7)
    plant_pot(p, dx - 36, G - 1, seed=1, flower='flower_red', big=True)
    plant_pot(p, dx + 26, G - 1, seed=2, flower='flower_yel', big=True)
    ground_tufts(p, 0, W, G - 1, seed=4, dens=0.12)
    return b


BUILDINGS = [  # name, letter, index among that letter's footprints, function, description
    ('cottage_a', 'V', 0, cottage_a),
    ('hall', 'H', 0, hall),
]


# ------------------------------------------------------------------ output
def dusk(im, lit):
    """Preview-only dusk grade: cool the day sprite and lay the lit overlay on top."""
    a = im.copy(); px = a.load()
    for y in range(a.height):
        for x in range(a.width):
            r, g, b_, al = px[x, y]
            if al: px[x, y] = (int(r * .42 + 8), int(g * .40 + 8), int(b_ * .55 + 22), al)
    a.alpha_composite(lit)
    return a


def with_figure(im, x, ground):
    a = im.copy(); f = figure_silhouette().im
    a.alpha_composite(f, (int(x), int(ground - 64)))
    return a


def main(only):
    fps = footprints()
    os.makedirs(OUTD, exist_ok=True)
    mpath = os.path.join(OUTD, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) and only else {}
    built = []
    for name, letter, idx, fn in BUILDINGS:
        if only and name not in only: continue
        fp = fps[letter][idx]
        b = fn(fp); p = b.p
        p.silhouette(2)
        p.finish_lit()
        save(p.cv, os.path.join(OUTD, name + '.png'))
        save(p.lit, os.path.join(OUTD, name + '_lit.png'))
        man[name] = {'file': name + '.png', 'lit': name + '_lit.png', 'w': b.W, 'h': b.Hh, 'anchor': [0, b.Hh],
                     'tiles': fp['tiles'], 'map_origin': fp['origin'], 'door': fp['door'], 'letter': letter,
                     'door_px': [b.dcx, b.Hh], 'lights': p.lights, 'signs': p.signs}
        built.append((name, b))
        print('  %-12s %3dx%-3d tiles %s origin %s door %s' % (name, b.W, b.Hh, fp['tiles'], fp['origin'], fp['door']))
    manifest(mpath, man)
    for name, b in built:
        day = b.p.cv.im; lit = b.p.lit.im
        preview([('day', with_figure(day, b.dcx + 26, b.Hh)), ('dusk', dusk(day, lit))],
                os.path.join(OUTD, 'preview_%s.png' % name), scale=3 if b.W <= 260 else 2, cols=2)
    return built


if __name__ == '__main__':
    main(sys.argv[1:])
