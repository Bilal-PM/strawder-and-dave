"""LINESIDE HD town buildings: one composition function per building (48 art px per tile).

Each function takes the footprint {origin, tiles, door} and returns a B frame whose Painter holds the day sprite and
the dusk overlay. Door x comes from the map's door tile, so every door lines up with its mat.
"""
import math, random
from townlib import *  # noqa
from townlib import _mix, _stamp  # noqa


class B:
    """Frame for one building: footprint size, north overhang `ov`, the ground line G and the door centre dcx."""
    def __init__(self, fp, ov, seed):
        self.fp = fp; self.tw, self.th = fp['tiles']; self.ov = ov
        self.W = self.tw * T; self.Hh = self.th * T + ov
        self.top = ov; self.G = self.Hh
        self.p = Painter(self.W, self.Hh, seed)
        d = fp['door']; self.dcx = (d[0] - fp['origin'][0]) * T + T // 2 if d else self.W // 2


# ------------------------------------------------------------------ larger shared parts
def gable_face(p, cx, hw, eave_y, apex_y, ground, wall, roof_kind='wslate', depth=30, coping='dressed', seed=0):
    """A projecting front gable: wall face (rectangle + triangle), its own two roof slopes running back into the main
    roof (west slope lit, east slope in shade), dressed copings along the rakes, kneelers and an apex stone."""
    x0, x1 = cx - hw, cx + hw
    q = Painter(p.w, p.h, seed)
    wall(q, x0, apex_y, 2 * hw, ground - apex_y)
    def edge(x): return apex_y + abs(x + 0.5 - cx) / hw * (eave_y - apex_y)
    for x in range(x0 - 4, x1 + 4):
        e = int(edge(min(max(x, x0), x1 - 1)))
        left = x < cx
        lx = (x - x0) if left else (x1 - x)
        for yy in range(e - depth, e):
            if yy < 0: continue
            course = lx % 8
            i = (1 if left else 3) + (1 if course == 0 else 0) + (1 if course == 1 and not left else 0)
            if ((yy + (lx // 8) * 5) % 13) == 0: i += 1
            if yy <= e - depth + 1: i = 4
            p.r(x, yy, roof_kind, i)
    for x in range(x0 - 4, x1 + 4):
        e = int(edge(min(max(x, x0), x1 - 1)))
        p.shift(x, e - depth - 1, 1); p.shift(x, e - depth - 2, 1)
    for yy in range(apex_y, ground):
        for x in range(x0, x1):
            if yy < eave_y and yy < edge(x): continue
            if q.cv.px[x, yy][3]:
                p.m[yy][x] = q.m[yy][x]; p.i[yy][x] = q.i[yy][x]; p.cv.px[x, yy] = q.cv.px[x, yy]
    for x in range(x0, x1):
        e = int(math.ceil(edge(x)))
        for k in range(4): p.shift(x, e + k, 2 if k < 2 else 1)
    for x in range(x0 - 3, x1 + 3):
        e = int(edge(min(max(x, x0), x1 - 1)))
        left = x < cx
        for k in range(7):
            p.r(x, e - k, coping, (0 if k >= 5 else 1) if left else (2 if k < 5 else 1))
        p.r(x, e - 7, coping, 3); p.r(x, e + 1, coping, 4)
    for side in (-1, 1):
        kx = x0 - 5 if side < 0 else x1 - 9
        for yy in range(eave_y - 10, eave_y + 3):
            for k in range(14): p.r(kx + k, yy, coping, 0 if yy == eave_y - 10 else (4 if yy > eave_y + 1 else (1 if side < 0 else 2)))
    for yy in range(apex_y - 12, apex_y + 2):
        for xx in range(cx - 6, cx + 6): p.r(xx, yy, coping, 0 if yy == apex_y - 12 else (1 if xx < cx + 1 else 2))
    for yy in range(apex_y - 20, apex_y - 12):
        for xx in range(cx - 2, cx + 2): p.r(xx, yy, coping, 1 if xx < cx else 2)
    p.r(cx - 2, apex_y - 21, coping, 0); p.r(cx - 1, apex_y - 21, coping, 0); p.r(cx, apex_y - 21, coping, 1); p.r(cx + 1, apex_y - 21, coping, 2)


def fleche(p, cx, ridge_y, h=40, w=24):
    """Louvred roof ventilator on the ridge, lead-capped with a finial and a little gilded weathervane."""
    x0 = cx - w // 2; top = ridge_y - h
    for yy in range(ridge_y - 4, ridge_y + 16):
        for xx in range(x0 + 4, x0 + w + 12):
            if p.is_(xx, yy, 'wslate', 'tile_roof', 'moss') and xx - x0 - w < yy - ridge_y + 6: p.shift(xx, yy, 2)
    for yy in range(top + 12, ridge_y + 3):
        for xx in range(x0, x0 + w):
            lx = xx - x0
            i = 1 if lx < 4 else (2 if lx < w - 4 else 3)
            if 3 < lx < w - 3 and yy < ridge_y - 3:
                ph = (yy - top) % 5
                i = [0, 1, 2, 3, 4][ph] if ph else 0
                if lx >= w - 6: i = min(4, i + 1)
            if lx in (0, 1): i = 0 if lx == 1 else 2
            if lx >= w - 2: i = 3 + (lx == w - 1)
            p.r(xx, yy, 'paint_cream', i)
    for yy in range(top, top + 13):
        hw = 1 + (yy - top) * (w // 2 + 3) // 12
        for xx in range(cx - hw, cx + hw + 1):
            p.r(xx, yy, 'lead', 0 if xx < cx - hw // 3 else (1 if xx < cx + hw // 3 else 3))
    for xx in range(cx - w // 2 - 3, cx + w // 2 + 4): p.r(xx, top + 12, 'lead', 3); p.r(xx, top + 13, 'lead', 4)
    for yy in range(top - 14, top): p.r(cx - 1, yy, 'paint_black', 1); p.r(cx, yy, 'paint_black', 3)
    for xx in range(cx - 6, cx + 6): p.r(xx, top - 9, 'paint_black', 1 if xx < cx else 2)
    for (a, b2, i) in ((-4, -15, 0), (-3, -16, 1), (-2, -16, 1), (-1, -16, 1), (0, -15, 2), (1, -15, 2), (2, -16, 2), (3, -17, 3),
                       (-3, -15, 1), (-2, -15, 1), (-1, -15, 2), (0, -14, 3)):
        p.r(cx + a, top + b2, 'gold', i)
    for xx in range(x0 - 1, x0 + w + 1): p.r(xx, ridge_y + 3, 'lead', 2); p.r(xx, ridge_y + 4, 'lead', 3)


# ------------------------------------------------------------------ cottages
def cottage_a(fp):
    """No. 1 Beck Row: gritstone two-up two-down under graduated stone slates; bottle-green door under a climbing
    rose, geraniums in a window box, a ginger cat asleep on the sill, milk on the step."""
    b = B(fp, 64, 101); p = b.p; W, G = b.W, b.G
    eave = G - 180; ridge = b.top + 34
    roof(p, 0, W, b.top + 2, ridge, eave, 'stoneslate', seed=3, ridge='stone', verge='coping', moss=0.12)
    chimney(p, 22, ridge + 7, 30, 62, 'grit', pots=2, seed=4, roof_kind='stoneslate')
    chimney(p, W - 22, ridge + 7, 30, 58, 'grit', pots=1, seed=5, roof_kind='stoneslate')
    stone_wall(p, 0, eave, W, G - eave, 'grit', seed=11, soot=0.25)
    quoins(p, 0, eave, G - 8, -1, seed=1); quoins(p, W, eave, G - 8, 1, seed=2)
    plinth(p, 0, W, G - 9, 9)
    dx = b.dcx
    sash(p, 28, G - 94, 46, 58, curtain='wine', bars='2', seed=1)
    sash(p, 196, G - 94, 46, 58, curtain='wine', bars='2', seed=2)
    sash(p, 28, eave + 22, 44, 48, curtain='paint_cream', bars='2', seed=3)
    sash(p, dx - 15, eave + 26, 30, 34, curtain=None, bars='2', seed=4)
    sash(p, 196, eave + 22, 44, 48, curtain='paint_cream', bars='2', seed=5)
    door(p, dx, G - 1, 52, 80, paint='paint_green', lintel='date', fanlight=False, glazed_top=True)
    wall_ao(p, 0, W, eave + 4, G - 9)
    gutter(p, 0, W, eave); downpipe(p, W - 18, eave + 4, G - 9)
    window_box(p, 22, G - 34, 58, 'paint_green', ('flower_red', 'flower_wht'), seed=7)
    climbing_rose(p, dx - 32, dx + 32, G - 8, G - 104, seed=5)
    cat(p, 204, G - 30, 'hair_ginger', facing=1)
    plant_pot(p, 226, G - 30, seed=4, flower='flower_pur')
    plant_pot(p, dx + 36, G - 1, seed=3, flower='flower_pur', big=True)
    milk_bottles(p, dx - 42, G - 2, 2)
    ground_tufts(p, 0, W, G - 1, seed=9)
    return b


# ------------------------------------------------------------------ village hall
def hall(fp):
    """Harrowby Village Hall, 1911: red brick with sandstone dressings, a tall single storey under Welsh slate with a
    louvred ventilator on the ridge, and a gabled entrance porch whose doors stand open and lit: the room where the
    town meeting and the funding panel happen. Noticeboard, coach lanterns, hanging baskets, bunting."""
    b = B(fp, 76, 202); p = b.p; W, G = b.W, b.G
    eave = G - 132; ridge = b.top + 44
    roof(p, 0, W, b.top + 2, ridge, eave, 'wslate', seed=21, ridge='clay', verge='coping', moss=0.02)
    chimney(p, 40, ridge + 7, 26, 44, 'brick', pots=1, seed=22)
    chimney(p, W - 40, ridge + 7, 26, 44, 'brick', pots=2, seed=23)
    fleche(p, W // 2 + 88, ridge + 3)
    brick_wall(p, 0, eave, W, G - eave, 'brick', seed=5)
    band(p, 0, W, eave + 8, 'dressed', 6)
    band(p, 0, W, G - 32, 'dressed', 6)
    quoins(p, 0, eave, G - 9, -1, seed=3, long=18, short=11, ch=12); quoins(p, W, eave, G - 9, 1, seed=4, long=18, short=11, ch=12)
    plinth(p, 0, W, G - 10, 10)
    dx = b.dcx; hw = 66
    for x in (40, 122, 404, 486):
        sash(p, x, eave + 26, 40, 70, surround='dressed', curtain='paint_red', bars='6', lintel='key', seed=x)
    wall_ao(p, 0, W, eave + 4, G - 10)
    gutter(p, 0, W, eave)

    def porch_wall(q, x, y, w, h):
        brick_wall(q, x, y, w, h, 'brick', seed=9)
        for side in (-1, 1):
            quoins(q, x if side < 0 else x + w, y + 18, y + h - 10, side, seed=5 + side, long=16, short=10, ch=12)
        band(q, x, w, y + h - 32, 'dressed', 6)
        plinth(q, x, w, y + h - 10, 10)
    gable_face(p, dx, hw, eave - 6, eave - 70, G, porch_wall, 'wslate', depth=30, seed=31)
    # round-arched stone head, keystone, arched fanlight, open double doors
    ac = G - 86
    for yy in range(ac - 40, ac + 2):
        for xx in range(dx - 40, dx + 40):
            r = math.hypot(xx + 0.5 - dx, (yy + .5 - ac) * 1.25)
            if 29 <= r < 39 and yy <= ac:
                seg = int(math.degrees(math.atan2(ac - yy, xx - dx)) // 15)
                p.r(xx, yy, 'dressed', 0 if r > 37.5 else (3 if seg % 2 == 0 and r < 30.5 else (1 if xx < dx else 2)))
    for yy in range(ac - 47, ac - 34):
        for xx in range(dx - 6, dx + 6): p.r(xx, yy, 'dressed', 0 if yy == ac - 47 else (1 if xx < dx + 3 else 3))
    door(p, dx, G - 1, 56, 84, paint='paint_green', fanlight=False, open_=True, step=True)
    for yy in range(ac - 34, ac + 2):
        for xx in range(dx - 29, dx + 29):
            r = math.hypot(xx + 0.5 - dx, (yy + .5 - ac) * 1.25)
            if r < 29 and yy <= ac + 1:
                bar = r > 26.5 or abs(xx + .5 - dx) < 1.2 or 13 < r < 15.5 or yy >= ac
                if bar: p.r(xx, yy, 'white', 1 if xx < dx else 2)
                else:
                    p.r(xx, yy, 'pane', 2)
                    p.glow(xx, yy, rc('glow', 1 if r < 13 else 2))
    blank_board(p, dx - 56, eave - 22, 112, 22, ground='paint_green', frame='gold', name='VILLAGE HALL')
    rc_y = eave - 44
    for yy in range(rc_y - 13, rc_y + 13):   # blank datestone roundel in the gable
        for xx in range(dx - 13, dx + 13):
            r = math.hypot(xx + 0.5 - dx, yy + 0.5 - rc_y)
            if r < 12.5:
                i = 3 if r > 11 else (0 if (xx - dx) + (yy - rc_y) < -6 else (2 if (xx - dx) + (yy - rc_y) > 7 else 1))
                if 8.5 < r < 9.6: i = 3
                p.r(xx, yy, 'dressed', i)
    p.signs['datestone'] = [dx - 7, rc_y - 4, 14, 8]
    lantern(p, dx - 46, G - 104); lantern(p, dx + 46, G - 104)
    hanging_basket(p, dx - hw + 2, eave + 22, seed=4, side=1)
    hanging_basket(p, dx + hw - 3, eave + 22, seed=5, side=-1)
    noticeboard(p, 336, G - 94, 38, 32, seed=2)
    bunting(p, 6, dx - hw - 6, eave + 14, 10, seed=1)
    bunting(p, dx + hw + 6, W - 6, eave + 14, 12, seed=2)
    downpipe(p, 170, eave + 4, G - 10); downpipe(p, W - 20, eave + 4, G - 10)
    plant_pot(p, dx - 54, G - 1, seed=1, flower='flower_red', big=True)
    plant_pot(p, dx + 40, G - 1, seed=2, flower='flower_yel', big=True)
    ground_tufts(p, 0, W, G - 1, seed=4, dens=0.1)
    return b



# ------------------------------------------------------------------ more parts
def lancet(p, x, y, w, h, glass='clear', surround='dressed', seed=0, lit=True, sill=True):
    """A pointed (equilateral-arch) window in a dressed surround; clear leaded or stained glass. (x, y) = top-left."""
    ah = int(w * 0.87)
    def inside(xx, yy, g=0):
        if yy >= y + ah: return x - g <= xx < x + w + g and yy < y + h + g
        return (math.hypot(xx + .5 - (x + w), yy + .5 - (y + ah)) <= w + g and
                math.hypot(xx + .5 - x, yy + .5 - (y + ah)) <= w + g and yy >= y - g - 1)
    S = 5
    for yy in range(y - S - 2, y + h + S):
        for xx in range(x - S, x + w + S):
            if inside(xx, yy, S) and not inside(xx, yy):
                i = 1
                if xx >= x + w: i = 2 + (xx >= x + w + S - 2)
                if not inside(xx - 1, yy - 1, S): i = 0
                if yy >= y + h: i = 2 if yy < y + h + S - 1 else 4
                p.r(xx, yy, surround, i)
    cols = ['paint_blue', 'wine', 'mustard', 'forest', 'plum', 'paint_blue', 'teal']
    for yy in range(y - 1, y + h):
        for xx in range(x, x + w):
            if not inside(xx, yy): continue
            lx, ly = xx - x, yy - y
            edge = not inside(xx - 1, yy) or not inside(xx, yy - 1)
            if glass == 'clear':
                i = 3 if ly > h * .25 else 2
                if 3 <= (lx + ly) % 17 < 6 and ly < h * .5: i = 1
                if edge: i = 4
                p.r(xx, yy, 'pane', i)
                if (lx % 6 == 5 or ly % 7 == 6) and not edge: p.r(xx, yy, 'lead', 3)
            else:
                if edge or lx % 5 == 4 or (ly + (lx // 5) * 3) % 7 == 6:
                    p.r(xx, yy, 'lead', 4); continue
                cell = hash01(lx // 5, (ly + (lx // 5) * 3) // 7, seed)
                r_ = cols[int(cell * len(cols))]
                if abs(lx - w // 2) < 3 and ly > h * .3: r_ = 'gold'   # central saint's figure
                p.r(xx, yy, r_, 3 if ly > h * .4 else 2)
    for xx in range(x - S, x + w + S + 3): p.shift(xx, y + h + S, 2); p.shift(xx, y + h + S + 1, 1)
    if lit:
        for yy in range(y - 1, y + h):
            for xx in range(x, x + w):
                if not inside(xx, yy): continue
                m = p.m[yy][xx]
                if m == 'pane': p.glow(xx, yy, rc('glow', 1 if yy > y + h * .3 else 2))
                elif m == 'lead': p.glow(xx, yy, rc('glow', 5) if glass != 'clear' else rc('glow', 4))
                elif m: p.glow(xx, yy, _mix(rc(m, 0), rc('glow', 1), 0.35))
        p.lights.append([x + w // 2, y + h // 2, h])


def dormer(p, cx, hw, eave_y, apex_y, face_top, ramp='grit', roof_kind='stoneslate', seed=0, curtain='paint_cream'):
    """A gabled stone dormer rising out of the roof: stone face with a two-light mullioned window, coped gable."""
    def face(q, x, y, w, h):
        stone_wall(q, x, y, w, h, ramp, seed, course=(7, 10), block=(10, 22), soot=0.3)
        quoins(q, x, y, y + h, -1, seed=seed, long=10, short=7, ch=10); quoins(q, x + w, y, y + h, 1, seed=seed + 1, long=10, short=7, ch=10)
    gable_face(p, cx, hw, face_top, apex_y, eave_y, face, roof_kind, depth=26, seed=seed)
    lw = 14; ww = 2 * lw + 6
    mullion(p, cx - ww // 2, face_top + 14, 2, lw, eave_y - face_top - 26, curtain=curtain, drip=False)
    for yy in range(eave_y - 4, eave_y + 1):   # lead apron where the dormer meets the roof
        for xx in range(cx - hw - 2, cx + hw + 2): p.r(xx, yy, 'lead', 1 if yy == eave_y - 4 else 2)


def barrel(p, x, y):
    """An upright oak cask, iron hoops; (x, y) = bottom-left."""
    w, h = 16, 21
    for yy in range(y - h, y):
        t = (yy - (y - h)) / h
        bulge = int(round(1.6 * math.sin(math.pi * t)))
        for xx in range(x - bulge, x + w + bulge):
            nx = (xx + .5 - (x + w / 2)) / (w / 2 + bulge)
            i = 1 if nx < -0.35 else (2 if nx < 0.4 else 3)
            if nx < -0.7: i = 2
            hoop = int(t * h) in (2, 3, h - 4, h - 3, h // 2)
            p.r(xx, yy, 'paint_black' if hoop else 'wood', (i - 1 if hoop else i))
            if not hoop and (xx - x) % 4 == 0: p.r(xx, yy, 'wood', i + 1)
    for xx in range(x, x + w):
        p.r(xx, y - h, 'wood', 0); p.r(xx, y - h + 1, 'wood', 1)
    for xx in range(x - 1, x + w + 3): p.shift(xx, y, 2)


def wellies(p, x, y, ramp='forest'):
    for k in range(2):
        bx = x + k * 8
        for yy in range(y - 15, y):
            for xx in range(bx, bx + 6):
                p.r(xx, yy, ramp, 1 if xx == bx else (2 if xx < bx + 4 else 3))
        for xx in range(bx, bx + 9): p.r(xx, y - 3, ramp, 2); p.r(xx, y - 2, ramp, 3); p.r(xx, y - 1, ramp, 4)
        for xx in range(bx, bx + 6): p.r(xx, y - 15, ramp, 0)
    for xx in range(x - 1, x + 19): p.shift(xx, y, 1)


def churn(p, x, y):
    """A steel milk churn by the farmhouse wall; (x, y) = bottom-left."""
    w = 16
    for yy in range(y - 28, y):
        t = y - yy
        ww = w if t < 18 else (w - 4 if t < 22 else w - 6)
        x0 = x + (w - ww) // 2
        for xx in range(x0, x0 + ww):
            nx = (xx + .5 - (x + w / 2)) / (ww / 2)
            i = 0 if -0.6 < nx < -0.2 else (1 if nx < 0.3 else (2 if nx < 0.75 else 3))
            if t in (4, 5, 17): i += 1
            p.r(xx, yy, 'metal', i)
    for xx in range(x + 3, x + w - 3): p.r(xx, y - 29, 'metal', 1); p.r(xx, y - 30, 'metal', 0)
    for xx in range(x - 1, x + w + 3): p.shift(xx, y, 2)


def kestrel_sign(p, x, y, w=48, h=50):
    """The Kestrel Arms' swinging sign: a painted picture (no lettering) of a hovering kestrel over a green valley,
    in a gilded frame, hung from a scrolled iron bracket; (x, y) = top-left of the board."""
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            if lx < 3 or ly < 3 or lx >= w - 3 or ly >= h - 3:
                i = 1 if (lx < 2 or ly < 2) else (2 if lx >= w - 3 or ly >= h - 3 else 1)
                if lx == 0 or ly == 0 or lx == w - 1 or ly == h - 1: i = 3
                p.r(xx, yy, 'gold', i); continue
            # sky, fells, meadow
            hill = y + h * .62 + 5 * math.sin(lx * .19) + 3 * math.sin(lx * .41 + 1)
            if yy > hill + 7: p.r(xx, yy, 'grass', 2 + (yy > y + h - 9))
            elif yy > hill: p.r(xx, yy, 'grass', 3 if (xx + yy) % 5 else 4)
            else: p.r(xx, yy, 'glass', 0 if ly < 12 else 1)
    for (ccx, ccy, rr) in ((x + 12, y + 10, 4), (x + 17, y + 9, 5), (x + 22, y + 11, 3)):   # a fair-weather cloud
        for yy in range(ccy - rr, ccy + rr):
            for xx in range(ccx - rr - 2, ccx + rr + 2):
                if math.hypot((xx - ccx) * .7, yy - ccy) < rr and yy < ccy + 2: p.r(xx, yy, 'white', 0 if yy < ccy else 1)
    cx, cy = x + w // 2 + 2, y + 21
    # hovering kestrel, wings raised in a shallow V, tail fanned: chestnut back, dark primaries, blue-grey head/tail
    for side in (-1, 1):
        for k in range(1, 19):
            wx = cx + side * k
            top = cy - int(k * 0.42)
            th = max(2, 6 - k // 4)
            for d in range(th):
                if k > 13: r_, i = 'hair_dark', 1 + (d > 0)
                else:
                    r_, i = 'leather', (0 if d == 0 else (1 if d < th - 1 else 3))
                    if (k + d) % 5 == 0 and d > 0: r_, i = 'hair_dark', 2   # spotted coverts
                p.r(wx, top + d, r_, i)
            if k > 13 and k % 2 == 0: p.r(wx, top + th, 'hair_dark', 2)   # fingered tips
    for yy in range(cy - 2, cy + 8):    # body, pale spotted breast
        for xx in range(cx - 2, cx + 3):
            p.r(xx, yy, 'cream' if xx <= cx else 'tweed', 1 if xx < cx else 2)
        if yy % 3 == 0: p.r(cx, yy, 'leather', 3)
    for yy in range(cy + 8, cy + 17):   # fanned tail with a dark band
        hw = 1 + (yy - cy - 8) // 2
        for xx in range(cx - hw, cx + hw + 1):
            p.r(xx, yy, 'hair_dark' if yy >= cy + 14 else 'hair_silver', 1 if yy >= cy + 14 else (1 if xx < cx else 2))
    for (a2, b2) in ((-2, -5), (-1, -6), (0, -6), (1, -6), (2, -5), (-2, -4), (-1, -4), (0, -4), (1, -4), (2, -4), (-1, -3), (0, -3), (1, -3)):
        p.r(cx + a2, cy + b2, 'hair_silver', 1 if a2 < 1 else 2)
    p.r(cx - 1, cy - 5, 'charcoal', 4); p.r(cx + 1, cy - 5, 'charcoal', 4)   # eyes
    p.r(cx - 1, cy - 4, 'charcoal', 3); p.r(cx, cy - 3, 'mustard', 1)        # moustache stripe, beak
    for xx in range(x - 2, x + w + 2): p.shift(xx, y + h, 2)


def railway_lamp(p, cx, y):
    """An old railway hand-lamp hung on a hook by the door, lens glowing warm; (cx, y) = hook."""
    for k in range(4): p.r(cx - 1 + k, y, 'paint_black', 1)
    for yy in range(y, y + 5): p.r(cx, yy, 'paint_black', 2)
    for xx in range(cx - 5, cx + 6):   # handle hoop
        p.r(xx, y + 5 - (2 if abs(xx - cx) < 4 else 0), 'paint_black', 2)
    for yy in range(y + 6, y + 24):
        for xx in range(cx - 7, cx + 8):
            nx = (xx + .5 - cx) / 7.5
            i = 0 if nx < -0.5 else (1 if nx < 0.1 else (2 if nx < 0.6 else 3))
            if yy in (y + 6, y + 7): i = max(0, i - 1)
            p.r(xx, yy, 'paint_black', i)
            if yy in (y + 8, y + 22): p.r(xx, yy, 'gold', 1 if xx < cx else 2)   # brass bands
    for yy in range(y + 11, y + 20):   # round lens
        for xx in range(cx - 5, cx + 6):
            d = math.hypot(xx + .5 - cx, yy + .5 - (y + 15.5))
            if d < 5: p.r(xx, yy, 'glow', 1 if d < 2.5 else 2); p.glow(xx, yy, rc('glow', 0 if d < 3 else 1))
            elif d < 6: p.r(xx, yy, 'gold', 2)
    p.r(cx - 2, y + 13, 'white', 0)
    p.lights.append([cx, y + 15, 30])


def awning(p, x0, x1, y0, y1, seed=0, a='canvas_red', b_='paint_cream'):
    """A striped shop blind pulled out over the window, seen from above: sloping canvas, scalloped valance and a
    violet shadow on the glass beneath."""
    for yy in range(y0, y1):
        for xx in range(x0, x1):
            st = a if ((xx - x0) // 10) % 2 == 0 else b_
            t = (yy - y0) / max(1, y1 - y0)
            i = 1 if t < .5 else 2
            if (xx - x0) % 10 in (0,) : i += 1
            if yy == y0: i = 3
            p.r(xx, yy, st, i)
    for xx in range(x0, x1):   # valance with scallops
        st = a if ((xx - x0) // 10) % 2 == 0 else b_
        lx = (xx - x0) % 10
        d = 6 + (2 if 2 <= lx <= 7 else (1 if lx in (1, 8) else 0))
        for k in range(d): p.r(xx, y1 + k, st, 2 if k < d - 1 else 3)
        p.r(xx, y1, st, 1)
        for k in range(10): p.shift(xx, y1 + d + k, 2 if k < 5 else 1)
    for yy in range(y0, y1 + 8):   # iron arms at the ends
        p.r(x0 - 1, yy, 'paint_black', 2); p.r(x1, yy, 'paint_black', 3)


def shop_window(p, x, y, w, h, seed=0):
    """A Victorian bakery display window: slim glazing bars, shelves of loaves, cobs, iced buns and a tiered cake,
    a panelled stall riser below. (x, y) = top-left of the glass."""
    rnd = random.Random(seed)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            frame = lx < 3 or lx >= w - 3 or ly < 3 or ly >= h - 3 or (lx % (w // 3) in (0, 1) and 3 < lx < w - 3) or ly == 14
            if frame: p.r(xx, yy, 'paint_cream', 1 if lx % (w // 3) == 0 or ly in (0, 14) else 2)
            else: p.r(xx, yy, 'interior', 1 if ly < h * .5 else 2)
    for (sy, kind) in ((y + h - 26, 'loaf'), (y + h - 8, 'bun')):   # shelves
        for xx in range(x + 3, x + w - 3): p.r(xx, sy, 'wood', 1); p.r(xx, sy + 1, 'wood', 3)
        xx = x + 5
        while xx < x + w - 14:
            if kind == 'loaf':
                lw, lh = rnd.choice([(12, 7), (9, 8), (14, 6)])
                for yy in range(sy - lh, sy):
                    for k in range(lw):
                        dx, dy = (k + .5 - lw / 2) / (lw / 2), (yy + .5 - sy) / lh
                        if dx * dx + dy * dy <= 1.02:
                            l = pix.light(dx, dy, math.sqrt(max(0, 1 - dx * dx - dy * dy)))
                            i = int(round((1 - l) * 3.5))
                            if lw > 11 and k % 4 == 2 and yy < sy - 2: i += 1   # scored top
                            p.r(xx + k, yy, 'bread', i)
                xx += lw + 2
            else:
                for k in range(8):
                    for yy in range(sy - 5, sy):
                        d = math.hypot(k + .5 - 4, (yy + .5 - sy) * 1.3)
                        if d < 4.3:
                            top = yy < sy - 3
                            p.r(xx + k, yy, 'white' if top else 'bread', (0 if k < 4 else 1) if top else 2)
                if rnd.random() < .5: p.r(xx + 4, sy - 6, 'paint_red', 1)   # glacé cherry
                xx += 10
    tx = x + w - 20   # tiered celebration cake on a stand
    for (ty, tw_) in ((y + h - 34, 16), (y + h - 40, 12), (y + h - 45, 8)):
        for yy in range(ty, ty + 6):
            for k in range(tw_): p.r(tx + (16 - tw_) // 2 + k, yy, 'white', 0 if k < tw_ // 3 else (1 if k < tw_ - 2 else 2))
        for k in range(0, tw_, 3): p.r(tx + (16 - tw_) // 2 + k, ty + 5, 'rose_pink', 1)
    for xx in range(x + 4, x + w - 4):   # glass reflections over it all
        for yy in range(y + 4, y + h - 4):
            if (xx - x + (yy - y)) % 29 in (0, 1) and yy < y + h * .6 and p.m[yy][xx] != 'paint_cream': p.r(xx, yy, 'pane', 0 if (xx - x + yy - y) % 29 == 0 else 1)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            m = p.m[yy][xx]
            if m == 'interior': p.glow(xx, yy, rc('glow', 2 if yy < y + h * .5 else 3))
            elif m in ('bread', 'white', 'wood', 'rose_pink', 'paint_red'): p.glow(xx, yy, _mix(rc(m, max(0, p.i[yy][xx] - 1)), rc('glow', 1), .3))
            elif m == 'pane': p.glow(xx, yy, rc('glow', 1))
    p.lights.append([x + w // 2, y + h // 2, w])
    # stall riser: panelled, painted
    for yy in range(y + h, y + h + 26):
        for xx in range(x - 2, x + w + 2):
            ly = yy - (y + h)
            i = 1
            if ly < 3: i = 0 if ly == 0 else 2
            elif ly >= 23: i = 3
            elif (xx - x) % 24 in (0, 1) or ly in (3, 4): i = 3
            elif ly in (5,) or (xx - x) % 24 == 2: i = 2
            p.r(xx, yy, 'paint_green', i)


def pilaster(p, x, y0, y1, w=12, ramp='paint_green'):
    """Shopfront pilaster with a console bracket at the top."""
    for yy in range(y0, y1):
        for xx in range(x, x + w):
            lx = xx - x
            i = 1 if lx < 3 else (2 if lx < w - 3 else 3)
            if lx == 0: i = 0
            p.r(xx, yy, ramp, i)
    for yy in range(y0 - 26, y0):   # console (scroll bracket) beside the fascia
        for xx in range(x - 1, x + w + 1):
            lx, ly = xx - x, yy - (y0 - 26)
            i = 1 + (lx > w // 2) + (ly > 20)
            if ly in (0, 1): i = 0
            if (lx - w // 2) ** 2 + (ly - 20) ** 2 < 10: i = 3
            p.r(xx, yy, ramp, i)
    for yy in range(y1 - 8, y1):
        for xx in range(x - 1, x + w + 1): p.r(xx, yy, 'dressed', 1 if yy == y1 - 8 else 2)


def tower_clock(p, cx, cy, r=15):
    for yy in range(cy - r - 3, cy + r + 4):
        for xx in range(cx - r - 3, cx + r + 4):
            d = math.hypot(xx + .5 - cx, yy + .5 - cy)
            if d < r - 1: p.r(xx, yy, 'paint_cream', 0 if (xx - cx) + (yy - cy) < -r * .6 else 1)
            elif d < r + 1: p.r(xx, yy, 'gold', 1 if (xx - cx) + (yy - cy) < 0 else 2)
            elif d < r + 3: p.r(xx, yy, 'dressed', 3 if (xx - cx) + (yy - cy) > 0 else 1)
    for k in range(12):   # hour marks (no numerals)
        a = k * math.pi / 6
        for rr in range(r - 4, r - 1):
            p.r(cx + round(rr * math.sin(a)) - (0 if k % 3 else 0), cy - round(rr * math.cos(a)), 'paint_black', 2 if k % 3 else 3)
    for (ang, ln) in ((-60, 7), (60, 11)):   # ten past ten
        a = math.radians(ang)
        for k in range(ln): p.r(cx + round(k * math.sin(a)), cy - round(k * math.cos(a)), 'paint_black', 3)
    p.r(cx, cy, 'gold', 0)


def buttress(p, x, y0, y1, w=16, ramp='grit', seed=0):
    """A stepped buttress standing proud of the wall: dressed quoined edges, sloped weathering offsets and a violet
    cast shadow on the wall to its right."""
    for yy in range(y0 + 6, y1):   # cast shadow first (onto the wall)
        for k in range(7): p.shift(x + w + k, yy, 2 if k < 4 else 1)
    stone_wall(p, x, y0 + 10, w, y1 - y0 - 10, ramp, seed, course=(9, 12), block=(w, w), soot=0.3, rubble=0)
    quoins(p, x, y0 + 10, y1, -1, seed=seed, long=8, short=5, ch=12)
    for yy in range(y0 + 10, y1):
        p.r(x - 1, yy, 'dressed', 4); p.shift(x + w - 1, yy, 2); p.shift(x + w - 2, yy, 1)
    for step in (y0, y0 + (y1 - y0) // 2):
        for k in range(12):
            for xx in range(x - 1, x + w + 1):
                p.r(xx, step + k, 'dressed', 0 if k < 3 else (1 if k < 8 else (2 if k < 10 else 4)))
        for xx in range(x, x + w + 4): p.shift(xx, step + 12, 2)


# ------------------------------------------------------------------ the rest of the town
def cottage_b(fp):
    """No. 3 Beck Row: limewashed rubble cottage under Welsh slate, black-painted surrounds and plinth, a blue door
    with a fanlight, ivy climbing the east end, a bicycle with a basket against the wall, wellies on the step."""
    b = B(fp, 64, 303); p = b.p; W, G = b.W, b.G
    eave = G - 180; ridge = b.top + 34
    roof(p, 0, W, b.top + 2, ridge, eave, 'wslate', seed=33, ridge='clay', verge='coping', moss=0.05)
    chimney(p, 22, ridge + 7, 30, 58, 'grit', pots=2, seed=34)
    chimney(p, W - 22, ridge + 7, 30, 62, 'grit', pots=2, seed=35)
    render_wall(p, 0, eave, W, G - eave, 'render', seed=12)
    for yy in range(G - 18, G):   # tarred plinth
        for xx in range(W): p.r(xx, yy, 'paint_black', 1 if yy == G - 18 else (2 if hash01(xx, yy, 3) < .85 else 3))
    dx = b.dcx
    for (x, y, w, h, cur) in ((28, G - 96, 46, 58, 'navy'), (196, G - 96, 46, 58, 'navy'),
                              (28, eave + 22, 44, 48, 'mustard'), (196, eave + 22, 44, 48, 'mustard')):
        sash(p, x, y, w, h, surround='paint_black', curtain=cur, bars='4', seed=x + y)
    sash(p, dx - 15, eave + 26, 30, 34, surround='paint_black', curtain=None, bars='2', seed=9)
    door(p, dx, G - 1, 52, 80, paint='paint_blue', surround='paint_black', fanlight=True, knocker=True)
    wall_ao(p, 0, W, eave + 4, G - 18)
    gutter(p, 0, W, eave); downpipe(p, 8, eave + 4, G - 18)
    ivy(p, 150, eave + 6, W - 150, G - eave - 10, seed=3, lean=-1, only=('render', 'paint_black'))
    hanging_basket(p, dx + 34, G - 118, seed=8, flowers=('flower_pur', 'flower_wht', 'rose_pink'))
    bicycle(p, 14, G - 1, 'paint_red')
    wellies(p, dx + 36, G - 1)
    plant_pot(p, dx - 50, G - 1, seed=12, flower='flower_yel', big=True)
    ground_tufts(p, 0, W, G - 1, seed=13)
    return b


def beck_cottage(fp):
    """Beck Cottage, Moira's: a low 1.5-storey gritstone cottage under stone slates with two coped dormers, mullioned
    windows, pink roses round the door, an old railway hand-lamp on a hook, a blank slate name plaque and a sleeper
    planter of herbs."""
    b = B(fp, 64, 404); p = b.p; W, G = b.W, b.G
    eave = G - 126; ridge = b.top + 30
    roof(p, 0, W, b.top + 2, ridge, eave, 'stoneslate', seed=41, ridge='stone', verge='coping', moss=0.12)
    chimney(p, 22, ridge + 7, 30, 56, 'grit', pots=2, seed=42, roof_kind='stoneslate')
    chimney(p, W - 22, ridge + 7, 30, 60, 'grit', pots=1, seed=43, roof_kind='stoneslate')
    stone_wall(p, 0, eave, W, G - eave, 'grit', seed=44, soot=0.3)
    quoins(p, 0, eave, G - 8, -1, seed=5); quoins(p, W, eave, G - 8, 1, seed=6)
    plinth(p, 0, W, G - 9, 9)
    dx = b.dcx
    for cx in (74, W - 74):
        dormer(p, cx, 36, eave + 2, eave - 84, eave - 54, seed=cx, curtain='paint_blue')
    mullion(p, 38, G - 78, 3, 16, 34, curtain='paint_blue', seed=1)
    mullion(p, W - 38 - 60, G - 78, 3, 16, 34, curtain='paint_blue', seed=2)
    door(p, dx, G - 1, 50, 78, paint='teal', lintel='date', fanlight=False, glazed_top=False)
    wall_ao(p, 0, W, eave + 4, G - 9)
    gutter(p, 0, W, eave); downpipe(p, W - 18, eave + 4, G - 9)
    climbing_rose(p, dx - 31, dx + 31, G - 8, G - 102, seed=9, flower='rose_pink', flower2='flower_wht')
    railway_lamp(p, dx + 44, G - 96)
    blank_board(p, dx - 76, G - 104, 34, 18, ground='slate', frame='cream', name='BECK COTTAGE')
    for yy in range(G - 16, G - 1):   # railway-sleeper planter full of herbs and nasturtiums
        for xx in range(W - 110, W - 30):
            ly = yy - (G - 16)
            p.r(xx, yy, 'sleeper', 1 if ly < 2 else (2 if (xx + ly * 3) % 11 else 3) + (ly > 11))
    rnd = random.Random(5)
    for k in range(18):
        leaf_blob(p, W - 108 + k * 4 + rnd.randint(-1, 1), G - 19 - rnd.randint(0, 4), rnd.randint(3, 4), 'leaf' if k % 3 else 'pine', rnd, k)
    for k in range(9): bloom(p, W - 106 + rnd.randint(0, 72), G - 24 + rnd.randint(-3, 4), rnd.choice(['hivis', 'flower_yel', 'flower_red']), rnd, True)
    milk_bottles(p, dx - 40, G - 2, 1)
    ground_tufts(p, 0, W, G - 1, seed=46, dens=0.25)
    return b


def pub(fp):
    """The Kestrel Arms: two-storey gritstone coaching inn under Welsh slate; oxblood fascia board (blank, lettered by
    the game) across the ground floor, the painted kestrel sign on a scrolled bracket above the door, small-paned
    windows, coach lanterns, hanging baskets and ale casks."""
    b = B(fp, 64, 505); p = b.p; W, G = b.W, b.G
    eave = G - 190; ridge = b.top + 30
    roof(p, 0, W, b.top + 2, ridge, eave, 'wslate', seed=51, ridge='clay', verge='coping', moss=0.04)
    chimney(p, 24, ridge + 7, 32, 60, 'grit', pots=3, seed=52)
    chimney(p, W - 24, ridge + 7, 32, 58, 'grit', pots=2, seed=53)
    chimney(p, W // 2 + 40, ridge + 7, 26, 48, 'grit', pots=2, seed=54)
    stone_wall(p, 0, eave, W, G - eave, 'grit', seed=55, soot=0.35)
    quoins(p, 0, eave, G - 8, -1, seed=7); quoins(p, W, eave, G - 8, 1, seed=8)
    plinth(p, 0, W, G - 9, 9)
    dx = b.dcx
    for x in (34, 118, W - 118 - 44, W - 34 - 44):
        sash(p, x, eave + 20, 44, 46, curtain='wine', bars='6', seed=x)
    for x in (30, 114, W - 114 - 56, W - 30 - 56):
        sash(p, x, G - 84, 56, 50, curtain='wine', bars='6', seed=x + 1, paint='paint_cream')
    door(p, dx, G - 1, 54, 80, paint='wine', fanlight=False, glazed_top=True)
    blank_board(p, 26, G - 120, W - 52, 24, ground='wine', frame='gold', name='THE KESTREL ARMS')
    wall_ao(p, 0, W, eave + 4, G - 9)
    gutter(p, 0, W, eave); downpipe(p, W - 16, eave + 4, G - 9); downpipe(p, 12, eave + 4, G - 9)
    # scrolled bracket over the door and the swinging sign
    by = eave + 16
    for k in range(-34, 35): p.r(dx + k, by, 'paint_black', 1); p.r(dx + k, by + 1, 'paint_black', 3)
    for k in range(10): p.r(dx - 34 + k, by + 10 - k, 'paint_black', 2)
    for (a, b2) in ((-30, 4), (-29, 3), (-28, 4), (-29, 5)): p.r(dx + a, by + b2, 'paint_black', 2)
    for k in (-20, 20):
        for yy in range(by + 2, by + 8): p.r(dx + k, yy, 'paint_black', 3)
    kestrel_sign(p, dx - 24, by + 8, 48, 46)
    p.signs['sign_picture'] = [dx - 21, by + 11, 42, 40]
    lantern(p, dx - 44, G - 100); lantern(p, dx + 44, G - 100)
    hanging_basket(p, 8, eave + 70, seed=2, side=1)
    hanging_basket(p, W - 8, eave + 70, seed=3, side=-1)
    barrel(p, W - 106, G - 1); barrel(p, W - 88, G - 1); barrel(p, W - 97, G - 22)
    plant_pot(p, dx - 60, G - 1, seed=5, flower='flower_red', big=True)
    ground_tufts(p, 0, W, G - 1, seed=56, dens=0.12)
    return b


def bakery(fp):
    """Pritchard's, family bakers: gritstone house over a Victorian shopfront in Brunswick green, fascia board
    (blank), a red-and-cream striped blind, windows full of loaves, buns and a tiered cake."""
    b = B(fp, 64, 606); p = b.p; W, G = b.W, b.G
    eave = G - 214; ridge = b.top + 26
    roof(p, 0, W, b.top + 2, ridge, eave, 'stoneslate', seed=61, ridge='stone', verge='coping', moss=0.1)
    chimney(p, W - 26, ridge + 7, 32, 62, 'grit', pots=3, seed=62, roof_kind='stoneslate')
    chimney(p, 70, ridge + 7, 24, 44, 'brick', pots=1, seed=63, roof_kind='stoneslate')  # the bakehouse flue
    stone_wall(p, 0, eave, W, G - eave, 'grit', seed=64, soot=0.3)
    quoins(p, 0, eave, G - 128, -1, seed=9); quoins(p, W, eave, G - 128, 1, seed=10)
    dx = b.dcx
    for x in (40, W // 2 - 22, W - 40 - 44):
        sash(p, x, eave + 18, 44, 46, curtain='rose_pink', bars='2', seed=x)
    window_box(p, W // 2 - 26, eave + 64 + 6, 52, 'paint_green', ('flower_red', 'flower_wht'), seed=61)
    wall_ao(p, 0, W, eave + 4, G - 9)
    gutter(p, 0, W, eave); downpipe(p, W - 14, eave + 4, G - 140)
    # shopfront: cream-painted frame, Brunswick-green fascia and stall risers
    for yy in range(G - 132, G):
        for xx in range(4, W - 4):
            p.r(xx, yy, 'paint_cream', 2 if (xx + yy) % 23 else 3)
    for xx in range(0, W):   # moulded cornice over the fascia
        for k in range(7): p.r(xx, G - 139 + k, 'paint_cream', [0, 0, 1, 2, 3, 4, 4][k])
        p.shift(xx, G - 132, 2); p.shift(xx, G - 131, 1)
    blank_board(p, 22, G - 130, W - 44, 26, ground='paint_green', frame='gold', name="PRITCHARD'S")
    pilaster(p, 4, G - 104, G, 14, 'paint_cream'); pilaster(p, W - 18, G - 104, G, 14, 'paint_cream')
    shop_window(p, 24, G - 96, dx - 26 - 28 - 10, 62, seed=1)
    shop_window(p, dx + 26 + 10, G - 96, W - 24 - (dx + 26 + 10), 62, seed=2)
    door(p, dx, G - 1, 52, 82, paint='paint_green', surround='paint_cream', fanlight=True, glazed_top=True, step=True)
    awning(p, 22, W - 22, G - 106, G - 92)
    plant_pot(p, 20, G - 1, seed=6, flower='flower_wht', big=True)
    ground_tufts(p, 0, W, G - 1, seed=66, dens=0.06)
    return b


def school(fp):
    """Harrowby Primary: a Victorian gritstone board school under Welsh slate; a tall coped front gable with a stone
    bellcote over the entrance, pointed windows with small leaded panes and paper suns and flowers stuck to the
    glass, a blank name board over the door."""
    b = B(fp, 96, 707); p = b.p; W, G = b.W, b.G
    eave = G - 126; ridge = b.top + 36
    roof(p, 0, W, b.top + 2, ridge, eave, 'wslate', seed=71, ridge='clay', verge='coping', moss=0.03)
    chimney(p, 30, ridge + 7, 28, 50, 'grit', pots=2, seed=72)
    chimney(p, W - 30, ridge + 7, 28, 50, 'grit', pots=2, seed=73)
    stone_wall(p, 0, eave, W, G - eave, 'grit', seed=74, soot=0.3)
    quoins(p, 0, eave, G - 8, -1, seed=11); quoins(p, W, eave, G - 8, 1, seed=12)
    plinth(p, 0, W, G - 9, 9)
    band(p, 0, W, G - 36, 'dressed', 5)
    dx = b.dcx; hw = 72
    rnd = random.Random(7)
    wins = [40, 100, 160, dx + hw + 30, dx + hw + 90, dx + hw + 150, dx + hw + 210]
    for x in wins:
        if x + 30 > W - 24: continue
        lancet(p, x, G - 104, 30, 66, 'clear', seed=x)
        if rnd.random() < .75:   # children's paper cut-outs on the glass
            kind = rnd.choice(['sun', 'flower', 'rainbow'])
            cx, cy = x + 8 + rnd.randint(0, 12), G - 70 + rnd.randint(0, 16)
            if kind == 'sun':
                for a in range(-5, 6):
                    for c2 in range(-5, 6):
                        d = math.hypot(a, c2)
                        if d < 3.2 or (d < 5.2 and (a == 0 or c2 == 0 or abs(a) == abs(c2))): p.r(cx + a, cy + c2, 'flower_yel', 1 if d < 2 else 2)
            elif kind == 'flower':
                for (a, c2) in ((0, -3), (-3, 0), (3, 0), (0, 3), (-2, -2), (2, 2), (2, -2), (-2, 2)): bloom(p, cx + a - 1, cy + c2 - 1, 'rose_pink', rnd, True)
                p.r(cx, cy, 'flower_yel', 0); p.r(cx + 1, cy, 'flower_yel', 1)
                for k in range(4, 10): p.r(cx, cy + k, 'leaf', 2)
            else:
                for k, r_ in enumerate(['flower_red', 'hivis', 'flower_yel', 'leaf', 'flower_blu']):
                    for a in range(-7, 8):
                        rr = 7 - k
                        if abs(a) <= rr: p.r(cx + a, cy - int(math.sqrt(max(0, rr * rr - a * a))), r_, 1)
    wall_ao(p, 0, W, eave + 4, G - 9)
    gutter(p, 0, W, eave)
    def gwall(q, x, y, w, h):
        stone_wall(q, x, y, w, h, 'grit', seed=76, soot=0.25)
        quoins(q, x, y + 20, y + h - 8, -1, seed=13); quoins(q, x + w, y + 20, y + h - 8, 1, seed=14)
        band(q, x, w, y + h - 36, 'dressed', 5)
        plinth(q, x, w, y + h - 9, 9)
    gable_face(p, dx, hw, eave - 10, eave - 84, G, gwall, 'wslate', depth=30, seed=77)
    # three-light pointed window in the gable over the door
    for k, x in enumerate((dx - 40, dx - 12, dx + 16)):
        lancet(p, x, eave - 40 + (0 if k == 1 else 8), 24, 52 - (0 if k == 1 else 8), 'clear', seed=x)
    door(p, dx, G - 1, 54, 80, paint='paint_blue', fanlight=True, knocker=False)
    blank_board(p, dx - 60, G - 128, 120, 20, ground='navy', frame='cream', name='HARROWBY PRIMARY')
    # stone bellcote on the gable apex, bell inside
    ax, ay = dx, eave - 84
    for yy in range(ay - 38, ay - 6):
        for xx in range(ax - 13, ax + 13):
            lx = xx - (ax - 13)
            op = (ax - 7 <= xx < ax + 7) and (ay - 32 <= yy < ay - 12)
            if op and yy < ay - 26 and math.hypot(xx + .5 - ax, yy + .5 - (ay - 26)) > 7: op = False
            if op: p.r(xx, yy, 'pane', 5)
            else: p.r(xx, yy, 'dressed', 0 if lx < 3 else (1 if lx < 19 else 3))
    for yy in range(ay - 28, ay - 16):   # the bell
        for xx in range(ax - 5, ax + 6):
            ww_ = 2 + (yy - (ay - 28)) * 4 // 12
            if abs(xx - ax) <= ww_: p.r(xx, yy, 'gold', 0 if xx < ax - ww_ // 2 else (1 if xx < ax + ww_ // 2 else 3))
    for yy in range(ay - 48, ay - 38):   # little coped gable and cross
        hw2 = (yy - (ay - 48)) * 15 // 10
        for xx in range(ax - hw2, ax + hw2 + 1): p.r(xx, yy, 'dressed', 0 if xx < ax else 2)
    for yy in range(ay - 58, ay - 47): p.r(ax, yy, 'dressed', 1); p.r(ax + 1, yy, 'dressed', 3)
    for xx in range(ax - 3, ax + 5): p.r(xx, ay - 55, 'dressed', 1 if xx < ax + 1 else 3)
    downpipe(p, 10, eave + 4, G - 9); downpipe(p, W - 16, eave + 4, G - 9)
    ground_tufts(p, 0, W, G - 1, seed=78, dens=0.1)
    return b


def church(fp):
    """St Oswald's: a sooty gritstone parish church. A west tower with clasping buttresses, belfry louvres, a clock
    and a crenellated parapet with pinnacles; a buttressed nave with stained-glass lancets under Welsh slate; a lower
    chancel; a gabled south porch with a pointed doorway; a stone cross on the east gable."""
    b = B(fp, 222, 808); p = b.p; W, G = b.W, b.G
    tw = 150            # tower width
    eave = G - 132; ridge = b.top + 60
    ch0 = W - 150
    _ = 0       # chancel starts here
    roof(p, tw, ch0 - tw, b.top + 20, ridge, eave, 'wslate', seed=81, ridge='slate', verge='coping', moss=0.06)
    roof(p, ch0, W - ch0, b.top + 60, ridge + 34, eave, 'wslate', seed=82, ridge='slate', verge='coping', moss=0.06)
    for yy in range(b.top + 60 - 12, b.top + 60 + 6):   # east cross on the chancel gable apex
        for xx in range(W - 16, W - 10): p.r(xx, yy, 'dressed', 1 if xx < W - 13 else 3)
    for yy in range(b.top + 52, b.top + 58):
        for xx in range(W - 22, W - 4): p.r(xx, yy, 'dressed', 1 if xx < W - 13 else 3)
    stone_wall(p, tw, eave, W - tw, G - eave, 'grit', seed=83, soot=0.45)
    plinth(p, tw, W - tw, G - 12, 12)
    dx = b.dcx
    for (x, k) in ((tw + 120, 0), (tw + 200, 1), (tw + 280, 2), (ch0 + 60, 3)):
        lancet(p, x, eave + 26, 28, 76, 'stained', seed=x)
    for x in (tw + 180, tw + 260, ch0 - 8, W - 20):
        buttress(p, x, eave + 20, G, 14, seed=x)
    wall_ao(p, tw, W - tw, eave + 4, G - 12)
    gutter(p, tw, W - tw, eave)
    # porch
    def pwall(q, x, y, w, h):
        stone_wall(q, x, y, w, h, 'grit', seed=85, soot=0.35)
        plinth(q, x, w, y + h - 12, 12)
    gable_face(p, dx, 48, eave + 10, eave - 40, G, pwall, 'wslate', depth=28, seed=86)
    ac = G - 70
    for yy in range(ac - 56, G):   # pointed doorway with moulded arch
        for xx in range(dx - 34, dx + 34):
            if yy >= ac: ins, ring = abs(xx + .5 - dx) < 20, abs(xx + .5 - dx) < 27
            else:
                ins = math.hypot(xx + .5 - (dx + 20), yy - ac) < 40 and math.hypot(xx + .5 - (dx - 20), yy - ac) < 40
                ring = math.hypot(xx + .5 - (dx + 20), yy - ac) < 47 and math.hypot(xx + .5 - (dx - 20), yy - ac) < 47
            if ins: p.r(xx, yy, 'wood_dark', 3 if yy < ac - 30 else 2)
            elif ring: p.r(xx, yy, 'dressed', 1 if xx < dx else 2)
    for yy in range(ac - 30, G):   # ledged oak door inside the porch arch
        for xx in range(dx - 17, dx + 17):
            if yy < ac and not (math.hypot(xx + .5 - (dx + 20), yy - ac) < 37 and math.hypot(xx + .5 - (dx - 20), yy - ac) < 37): continue
            i = 1 + ((xx - dx) % 7 == 0) * 2 + ((yy - ac) in (6, 7, 40, 41)) * 1
            p.r(xx, yy, 'wood_dark', i - 1)
    p.r(dx + 10, G - 36, 'metal', 1); p.r(dx + 11, G - 36, 'metal', 2); p.r(dx + 10, G - 35, 'metal', 3)
    lantern(p, dx + 36, G - 108)
    # tower
    top_face = G - 400
    for yy in range(top_face - 36, top_face):   # lead roof behind the parapet
        for xx in range(8, tw - 8): p.r(xx, yy, 'lead', 1 + (xx % 18 == 0) + (yy - (top_face - 36) < 4) * 2)
    stone_wall(p, 0, top_face, tw, G - top_face, 'grit', seed=87, soot=0.5, course=(9, 12), block=(18, 34))
    for side in (-1, 1):   # clasping buttresses
        bx = 0 if side < 0 else tw - 22
        stone_wall(p, bx, top_face + 10, 22, G - top_face - 10, 'grit', seed=88 + side, soot=0.5, rubble=0)
        for yy in range(top_face + 10, G):
            p.shift(bx + (21 if side < 0 else 0), yy, 2 if side < 0 else -1)
        for step in (top_face + 130, top_face + 260):
            for k in range(8):
                for xx in range(bx, bx + 22): p.r(xx, step + k, 'dressed', 0 if k < 2 else (1 if k < 6 else 3))
    for yy in (top_face + 110, top_face + 240):
        band(p, 22, tw - 44, yy, 'dressed', 5)
    for k in range(2):   # belfry louvres
        lx0 = 36 + k * 50
        lancet(p, lx0, top_face + 36, 28, 52, 'clear', lit=False)
        for yy in range(top_face + 40, top_face + 88):
            for xx in range(lx0, lx0 + 28):
                if p.m[yy][xx] in ('pane', 'lead'):
                    ph = (yy - top_face) % 6
                    p.r(xx, yy, 'wood_dark', [0, 1, 2, 3, 4, 4][ph])
    tower_clock(p, tw // 2, top_face + 170, 18)
    lancet(p, tw // 2 - 16, top_face + 290, 32, 76, 'stained', seed=5)
    for xx in range(0, tw):   # parapet with merlons
        for yy in range(top_face - 22, top_face + 6):
            ly = yy - (top_face - 22)
            merlon = ((xx // 15) % 2 == 0)
            if ly < 12 and not merlon: continue
            i = 0 if (ly == 0 or (ly == 12 and not merlon)) else (1 if ly < 20 else 2)
            if xx % 15 == 14 and ly < 12: i = 3
            p.r(xx, yy, 'dressed', i)
        p.shift(xx, top_face + 6, 2); p.shift(xx, top_face + 7, 1)
    for cx in (8, tw - 9):   # corner pinnacles
        for yy in range(top_face - 58, top_face - 20):
            hw2 = 2 + (yy - (top_face - 58)) * 6 // 38
            for xx in range(cx - hw2, cx + hw2 + 1): p.r(xx, yy, 'dressed', 0 if xx < cx else (1 if xx < cx + hw2 // 2 else 3))
        p.r(cx, top_face - 60, 'dressed', 0); p.r(cx, top_face - 59, 'dressed', 1)
    for yy in range(top_face - 76, top_face - 36): p.r(tw // 2, yy, 'paint_black', 2)   # weathervane
    for (a, b2, i) in ((-6, -70, 1), (-5, -71, 1), (-4, -71, 0), (-3, -70, 1), (-2, -70, 1), (-1, -70, 1), (0, -70, 2), (1, -71, 2),
                       (2, -72, 2), (3, -72, 3), (4, -70, 2), (5, -70, 3), (-1, -71, 1), (0, -71, 1), (-4, -72, 0)):
        p.r(tw // 2 + a, top_face + b2, 'gold', i)
    for xx in range(tw // 2 - 8, tw // 2 + 9): p.r(xx, top_face - 62, 'paint_black', 2)
    for yy in range(top_face - 20, G): p.shift(tw, yy, 2); p.shift(tw + 1, yy, 2); p.shift(tw + 2, yy, 1)
    ground_tufts(p, 0, W, G - 1, seed=89, dens=0.2)
    return b


def farmhouse(fp):
    """Home Farm: a long, low 17th-century Pennine farmhouse, blackened gritstone under heavy stone slates, rows of
    mullioned windows with hood moulds, a dated door lintel, ivy at the west end, wellies and a milk churn."""
    b = B(fp, 64, 909); p = b.p; W, G = b.W, b.G
    eave = G - 170; ridge = b.top + 36
    roof(p, 0, W, b.top + 2, ridge, eave, 'stoneslate', seed=91, ridge='stone', verge='coping', moss=0.2)
    chimney(p, 24, ridge + 7, 32, 58, 'grit', pots=1, seed=92, roof_kind='stoneslate')
    chimney(p, W - 24, ridge + 7, 32, 58, 'grit', pots=2, seed=93, roof_kind='stoneslate')
    chimney(p, 238, ridge + 7, 30, 52, 'grit', pots=2, seed=94, roof_kind='stoneslate')
    stone_wall(p, 0, eave, W, G - eave, 'grit', seed=95, soot=0.55, course=(9, 14), block=(16, 36))
    quoins(p, 0, eave, G - 8, -1, seed=15, long=24, short=14, ch=17); quoins(p, W, eave, G - 8, 1, seed=16, long=24, short=14, ch=17)
    plinth(p, 0, W, G - 9, 9)
    dx = b.dcx
    mullion(p, 36, G - 80, 3, 16, 34, curtain='wine', seed=1)
    mullion(p, 220, G - 80, 4, 16, 34, curtain='wine', seed=2)
    for x in (36, 138, 250):
        mullion(p, x, eave + 26, 3 if x != 138 else 2, 15, 30, curtain='cream', seed=x)
    door(p, dx, G - 1, 52, 80, paint='wine', style='boarded', lintel='date', fanlight=False, knocker=True)
    wall_ao(p, 0, W, eave + 4, G - 9)
    gutter(p, 0, W, eave); downpipe(p, W - 16, eave + 4, G - 9)
    ivy(p, 0, eave + 10, 34, G - eave - 16, seed=4, lean=1, only=('grit', 'grit_soot', 'grit_warm', 'dressed'))
    blank_board(p, dx + 40, G - 108, 46, 18, ground='paint_cream', frame='paint_black', name='HOME FARM')
    wellies(p, dx - 50, G - 1, 'forest'); wellies(p, dx - 30, G - 1, 'paint_black')
    churn(p, dx + 40, G - 1); churn(p, dx + 58, G - 1)
    ground_tufts(p, 0, W, G - 1, seed=96, dens=0.3)
    return b


def barn(fp):
    """Home Farm barn: a tall gritstone field barn under mossy stone slates; a segmental cart arch with weathered
    board doors, one leaf ajar onto hay and a lamp, a pitching door and owl hole above, ventilation slits and
    through-stones."""
    b = B(fp, 44, 1001); p = b.p; W, G = b.W, b.G
    eave = G - 196; ridge = b.top + 26
    roof(p, 0, W, b.top + 2, ridge, eave, 'stoneslate', seed=101, ridge='stone', verge='coping', moss=0.3)
    stone_wall(p, 0, eave, W, G - eave, 'grit', seed=102, soot=0.35, course=(10, 15), block=(18, 40), rubble=0.45)
    quoins(p, 0, eave, G, -1, seed=17, long=26, short=15, ch=18); quoins(p, W, eave, G, 1, seed=18, long=26, short=15, ch=18)
    dx = b.dcx
    aw, ah = 96, 128
    x0, x1 = dx - aw // 2, dx + aw // 2
    ay = G - ah
    rise = 18
    def arch_y(xx):  # segmental arch soffit
        t = (xx + .5 - dx) / (aw / 2)
        return ay + rise * (t * t)
    for xx in range(x0 - 12, x1 + 12):   # voussoirs
        yc = arch_y(min(max(xx, x0), x1 - 1))
        for yy in range(int(yc) - 14, int(yc)):
            v = int((xx - x0 + 12) // 9)
            p.r(xx, yy, 'dressed', 0 if yy == int(yc) - 14 else (3 if (xx - x0 + 12) % 9 == 0 else (1 if v % 2 else 2)))
    for yy in range(ay - 14, G):
        for xx in (x0 - 1, x1):
            pass
    for xx in range(x0, x1):   # doors
        yc = int(arch_y(xx))
        for yy in range(yc, G):
            lx = xx - x0
            ajar = xx >= dx + 6
            if ajar and xx < dx + 30:   # the gap: warm lamp-lit hay inside
                if yy > G - 40: p.r(xx, yy, 'hay', 1 + (hash01(xx, yy, 3) < .4) + (yy > G - 12))
                else: p.r(xx, yy, 'interior', 2 if yy < G - 70 else 1)
                continue
            i = 2 if lx % 9 else 4
            if lx % 9 == 1: i = 1
            if hash01(xx // 9, yy // 3, 7) < .12: i += 1
            if (yy - (G - ah)) in (18, 19, 20) or (yy - G) in (-24, -23, -22): i = 1 if (yy % 3 == 0) else 2
            p.r(xx, yy, 'wood_dark' if hash01(xx // 9, 1, 2) < .5 else 'tweed', i)
    for yy in range(ay, G):   # the ajar leaf's edge, in shadow
        for k in range(4): p.r(dx + 30 + k, yy, 'wood_dark', 3 + (k > 1))
    for yy in range(G - 70, G):
        for xx in range(dx + 6, dx + 30):
            m = p.m[yy][xx]
            if m in ('hay', 'interior'): p.glow(xx, yy, _mix(rc(m, p.i[yy][xx]), rc('glow', 2), .55))
    lantern(p, dx + 18, G - 92)
    p.lights.append([dx + 18, G - 40, 50])
    # pitching door and owl hole
    for yy in range(eave + 24, eave + 64):
        for xx in range(dx - 18, dx + 18):
            lx = xx - (dx - 18)
            if lx < 3 or lx >= 33 or yy < eave + 27: p.r(xx, yy, 'dressed', 1 if lx < 3 or yy < eave + 26 else 2)
            else: p.r(xx, yy, 'tweed', 2 if lx % 6 else 3)
    for yy in range(eave + 10, eave + 20):
        for xx in range(dx - 6, dx + 6):
            if math.hypot(xx + .5 - dx, (yy + .5 - (eave + 17)) * 1.2) < 6: p.r(xx, yy, 'pane', 5)
    for x in (30, W - 34):   # ventilation slits
        for yy in range(G - 150, G - 100):
            for xx in range(x, x + 5): p.r(xx, yy, 'pane', 5 if xx > x else 4)
        for xx in range(x - 3, x + 8): p.r(xx, G - 153, 'dressed', 1); p.r(xx, G - 99, 'dressed', 2)
    rnd = random.Random(4)
    for k in range(9):   # through-stones
        tx, ty = rnd.randint(10, W - 20), rnd.randint(eave + 40, G - 60)
        if abs(tx - dx) < aw // 2 + 16: continue
        for xx in range(tx, tx + 11): p.r(xx, ty, 'dressed', 0); p.r(xx, ty + 1, 'dressed', 1); p.r(xx, ty + 2, 'dressed', 3)
        for xx in range(tx, tx + 13): p.shift(xx, ty + 3, 2); p.shift(xx, ty + 4, 1)
    for yy in range(G - 70, G - 2):   # a hay fork against the wall
        p.r(x0 - 20 + (G - yy) // 14, yy, 'wood', 2)
    for (a, b2) in ((-3, 0), (0, 0), (3, 0), (-3, 1), (3, 1), (-2, 2), (0, 2), (2, 2)):
        p.r(x0 - 15 + a, G - 76 + b2 * 3, 'metal', 2)
    wall_ao(p, 0, W, eave + 4, G)
    ground_tufts(p, 0, W, G - 1, seed=103, dens=0.35)
    return b


BUILDINGS = [  # (name, map letter, index among that letter's footprints (west to east), function)
    ('cottage_a', 'V', 0, cottage_a),
    ('cottage_b', 'V', 1, cottage_b),
    ('beck_cottage', 'M', 0, beck_cottage),
    ('hall', 'H', 0, hall),
    ('pub', 'A', 0, pub),
    ('bakery', 'P', 0, bakery),
    ('school', 'E', 0, school),
    ('church', 'Y', 0, church),
    ('farmhouse', 'F', 0, farmhouse),
    ('barn', 'R', 0, barn),
]
