"""LINESIDE HD town buildings: drawing library.

Extends assets/hd/lib/pix.py (never edits it). The key idea is the Painter: every pixel remembers which ramp and
which ramp step it was painted with, so ambient occlusion, weathering, soot and cast shadows are done by *shifting
along the hue-shifted ramp* (warm light -> cool violet shadow) instead of by alpha-blending grey over the top.

Each building draws two layers at once:
  p.cv   the day sprite (fully opaque or fully transparent pixels)
  p.lit  the dusk overlay: warm glowing window panes, fanlights and doorways only (transparent elsewhere)
"""
import math, os, sys, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from pix import *  # noqa: F401,F403  (RAMPS, OUTLINE, SHADOW, Canvas, hexrgb, hash01, fbm, vnoise, dither, ...)
import pix

# ------------------------------------------------------------------ extra ramps (light -> dark, hue-shifted)
TR = dict(RAMPS)
TR.update({
    # Pennine gritstone: warm buff when clean, violet-brown in shadow
    'grit':       ['#eadbb8', '#cfbc96', '#b09b77', '#8e7a5c', '#6a5a47', '#483d35'],
    # the same stone blackened by a century of coal smoke (patches, streaks)
    'grit_soot':  ['#bcae96', '#9a8d78', '#7a6f60', '#5d554c', '#433d3a', '#2e2a2b'],
    # Dales limestone: pale, cool
    'lime':       ['#f3f0e7', '#dcd8cc', '#bfbaad', '#9d988d', '#78746c', '#56524f'],
    # dressed sandstone for quoins, lintels, sills, copings (a touch lighter and smoother than the walling)
    'dressed':    ['#f4e8c8', '#dccba5', '#bfab85', '#9a8667', '#72624d', '#4d4238'],
    # limewash / painted render
    'render':     ['#fdf8ea', '#f1e8d2', '#ddd0b3', '#bcae91', '#918571', '#6a6154'],
    # Yorkshire stone-slate roof (graduated sandstone flags)
    'stoneslate': ['#bdb29a', '#9c917d', '#7c7365', '#5e5750', '#433e3c', '#2c2829'],
    # Welsh slate: blue-violet
    'wslate':     ['#b3bccb', '#939cae', '#777f93', '#5d6477', '#464b5e', '#303444'],
    'mortar':     ['#eee4d0', '#d5c9b2', '#b3a792', '#8d8272', '#665d53'],
    'pane':       ['#d7e8ee', '#9fbccd', '#7292ab', '#51677f', '#3a475f', '#282e43'],
    'ivy':        ['#a8c865', '#7fab4d', '#5a8a3f', '#3f6a35', '#2a4b2b', '#1b3222'],
    'lichen':     ['#f2e3a0', '#d9c677', '#b4a45a', '#8c8045'],
    'moss':       ['#b9cf6e', '#93b152', '#6f913f', '#527233', '#3a5428'],
    'lead':       ['#b4b8c3', '#8f94a2', '#6e7382', '#525664', '#3a3d49'],
    'canvas_red': ['#f58f7a', '#df5f4c', '#b8443a', '#8c3130', '#5f2124'],
    'glow':       ['#fffbe6', '#ffeeb0', '#ffd978', '#f6b653', '#e0913c', '#b86a2e'],
    'hay':        ['#f7e3a0', '#e3c46e', '#c29e4c', '#957636', '#654f27'],
    'interior':   ['#a58668', '#7e6450', '#5d493d', '#43352e', '#2d2422'],
})
OUT = hexrgb(OUTLINE)


def rc(r, i):
    a = TR[r]; return hexrgb(a[max(0, min(len(a) - 1, int(i)))])


def rlen(r):
    return len(TR[r])


# ------------------------------------------------------------------ painter
class Painter:
    def __init__(self, w, h, seed=1):
        self.w, self.h = w, h
        self.cv = Canvas(w, h)
        self.lit = Canvas(w, h)
        self.m = [[None] * w for _ in range(h)]   # ramp name per pixel
        self.i = [[0] * w for _ in range(h)]      # ramp step per pixel
        self.rng = random.Random(seed)
        self.seed = seed
        self.lights = []     # [x, y, r] window / door glow points (art px)
        self.signs = {}      # name -> [x, y, w, h] blank boards for the game to letter
        self.litref = {}     # (x, y) -> base colour at the time a lit pixel was set (dropped if later covered)
        self.protect = set()

    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def r(self, x, y, ramp, i):
        x, y = int(x), int(y)
        if not self.inb(x, y): return
        n = rlen(ramp); i = max(0, min(n - 1, int(i)))
        self.m[y][x] = ramp; self.i[y][x] = i
        self.cv.px[x, y] = hexrgb(TR[ramp][i])

    def c(self, x, y, col):
        x, y = int(x), int(y)
        if not self.inb(x, y): return
        if isinstance(col, str): col = hexrgb(col)
        if len(col) == 4 and col[3] < 255:
            self.cv.put(x, y, col); return
        self.m[y][x] = None; self.cv.px[x, y] = tuple(col[:3]) + (255,)

    def out(self, x, y):
        self.c(x, y, OUT)

    def erase(self, x, y):
        if self.inb(x, y): self.m[y][x] = None; self.cv.px[x, y] = (0, 0, 0, 0)

    def rect(self, x, y, w, h, ramp, i):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)): self.r(xx, yy, ramp, i)

    def rectc(self, x, y, w, h, col):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)): self.c(xx, yy, col)

    def opaque(self, x, y):
        return self.inb(x, y) and self.cv.px[x, y][3] > 0

    def shift(self, x, y, d):
        """Move a pixel d steps along its own ramp (d>0 darker)."""
        x, y = int(x), int(y)
        if not self.inb(x, y) or not self.cv.px[x, y][3]: return
        m = self.m[y][x]
        if m: self.r(x, y, m, self.i[y][x] + d)
        else:
            c = self.cv.px[x, y]; k = 0.82 ** d
            self.cv.px[x, y] = (int(c[0] * k), int(c[1] * k * 0.97), int(min(255, c[2] * k * 1.05)), 255)

    def shade_rect(self, x, y, w, h, d):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)): self.shift(xx, yy, d)

    def glow(self, x, y, col):
        """Set a dusk-overlay pixel (and remember the day colour under it so later cover-ups cancel it)."""
        x, y = int(x), int(y)
        if not self.inb(x, y): return
        if isinstance(col, str): col = hexrgb(col)
        self.lit.px[x, y] = tuple(col[:3]) + ((col[3] if len(col) == 4 else 255),)
        self.litref[(x, y)] = self.cv.px[x, y]

    def finish_lit(self):
        for (x, y), ref in self.litref.items():
            if self.cv.px[x, y] != ref: self.lit.px[x, y] = (0, 0, 0, 0)

    def silhouette(self, d=2, base_outline=True):
        """Selective outline: darken the sprite's own silhouette pixels along their ramps; the true outline colour
        only along the ground line (base)."""
        edge = []
        for y in range(self.h):
            for x in range(self.w):
                if not self.cv.px[x, y][3] or self.cv.px[x, y][3] < 255: continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not self.inb(nx, ny) or self.cv.px[nx, ny][3] == 0:
                        if not (ny >= self.h): edge.append((x, y))
                        break
        for x, y in edge:
            if (x, y) in self.protect: continue
            self.shift(x, y, d)
        if base_outline:
            for x in range(self.w):
                if self.cv.px[x, self.h - 1][3]: self.out(x, self.h - 1)


def H(x, y, s):  # stable hash shortcut
    return hash01(x, y, s)


# ------------------------------------------------------------------ walls
def stone_wall(p, x0, y0, w, h, ramp='grit', seed=0, course=(5, 8), block=(9, 20), soot=0.18, rubble=0.35,
               base_i=1, joint=3):
    """Coursed stone walling. Courses are built from the ground up (deeper at the bottom). Each stone is a slightly
    rounded block with a lit top-left edge and a shadowed bottom-right edge; joints are recessed (dark)."""
    rnd = random.Random(seed * 7919 + 13)
    y = y0 + h
    ci = 0
    while y > y0:
        lo, hi = course
        chh = rnd.randint(lo, hi) + (2 if ci == 0 else (1 if ci == 1 else 0))
        top = max(y0, y - chh)
        x = x0 - rnd.randint(0, block[1])
        while x < x0 + w:
            bw = rnd.randint(*block)
            # occasional small pinning stone / split course (rubble character)
            split = rnd.random() < rubble and (y - top) >= 6
            _stone(p, x, top, bw, y - top, x0, y0, w, h, ramp, rnd, base_i, joint, soot, split)
            x += bw
        y = top
        ci += 1
    # soot: broad vertical stains, heavier high up under the eaves and on the east side
    for yy in range(y0, y0 + h):
        for xx in range(x0, x0 + w):
            n = fbm(xx * 0.7, yy * 0.25, 22, seed + 5)
            t = soot * (0.6 + 0.8 * (1 - (yy - y0) / max(1, h)))
            if n < t * 0.9 and p.m[yy][xx] == ramp:
                p.r(xx, yy, 'grit_soot' if ramp == 'grit' else ramp, p.i[yy][xx] + (0 if ramp == 'grit' else 1))


def _stone(p, x, y, w, h, X0, Y0, W, Hh, ramp, rnd, base_i, joint, soot, split):
    tone = base_i + (0 if rnd.random() < 0.62 else (1 if rnd.random() < 0.7 else -1))
    if rnd.random() < 0.06: tone = base_i + 2
    s = rnd.randint(0, 9999)
    parts = [(x, y, w, h)]
    if split:
        sh = rnd.randint(2, h - 3)
        sw = rnd.randint(4, max(4, w - 3))
        parts = [(x, y, sw, sh), (x, y + sh, sw, h - sh), (x + sw, y, w - sw, h)]
    for (bx, by, bw, bh) in parts:
        t = tone + (rnd.choice([0, 0, 1, -1]) if len(parts) > 1 else 0)
        for yy in range(by, by + bh):
            for xx in range(bx, bx + bw):
                if not (X0 <= xx < X0 + W and Y0 <= yy < Y0 + Hh): continue
                lx, ly = xx - bx, yy - by
                right, bottom = lx == bw - 1, ly == bh - 1
                corner = (lx in (0, bw - 2) and ly in (0, bh - 2)) and bw > 4
                if right or bottom:
                    p.r(xx, yy, ramp, joint + (1 if bottom else 0)); continue
                if corner and ((lx == 0 and ly == 0) or (lx == bw - 2 and ly == bh - 2)):
                    p.r(xx, yy, ramp, joint); continue
                i = t
                if ly == 0 or (lx == 0 and ly < 2): i = t - 1          # lit top-left arris
                elif ly == bh - 2 or lx == bw - 2: i = t + 1  # shadowed lower-right
                else:
                    g = hash01(xx, yy, s)
                    if g < 0.07: i = t + 1                 # grain
                    elif g > 0.965: i = t - 1
                p.r(xx, yy, ramp, i)


def ashlar(p, x0, y0, w, h, ramp='dressed', seed=0, course=6, block=(14, 26), base_i=1):
    rnd = random.Random(seed + 101)
    y = y0 + h; row = 0
    while y > y0:
        top = max(y0, y - course)
        x = x0 - (row % 2) * (block[0] // 2) - rnd.randint(0, 4)
        while x < x0 + w:
            bw = rnd.randint(*block); t = base_i + (1 if rnd.random() < 0.25 else 0)
            for yy in range(top, y):
                for xx in range(max(x, x0), min(x + bw, x0 + w)):
                    lx, ly = xx - x, yy - top
                    if ly == y - top - 1 or lx == bw - 1: p.r(xx, yy, ramp, t + 2)
                    elif ly == 0: p.r(xx, yy, ramp, t - 1)
                    else: p.r(xx, yy, ramp, t + (1 if hash01(xx, yy, seed) < 0.05 else 0))
            x += bw
        y = top; row += 1


def brick_wall(p, x0, y0, w, h, ramp='brick', seed=0, bond='flemish'):
    """Victorian brickwork: 3px brick + 1px mortar courses; Flemish bond with darker burnt headers."""
    rnd = random.Random(seed + 7)
    for yy in range(y0, y0 + h):
        row = (y0 + h - 1 - yy) // 4; ly = (y0 + h - 1 - yy) % 4
        for xx in range(x0, x0 + w):
            if ly == 3:  # mortar bed (light, recessed shade under the brick above)
                p.r(xx, yy, 'mortar', 1 if hash01(xx, row, seed) < 0.8 else 2); continue
            off = (row % 2) * 5
            u = (xx - x0 + off) % 10     # stretcher 6 + header 3 + joints
            if u in (6, 9):
                p.r(xx, yy, 'mortar', 2); continue
            header = u > 6
            bid = (xx - x0 + off) // 10 * 2 + (1 if header else 0)
            h1 = hash01(bid, row, seed)
            t = 1 if h1 < 0.55 else (2 if h1 < 0.88 else 0)
            if header and h1 < 0.5: t = 3
            i = t - 1 if ly == 2 and h1 > 0.3 else t
            if ly == 0: i = t + 1
            if hash01(xx, yy, seed + 3) < 0.05: i += 1
            p.r(xx, yy, ramp, i)


def render_wall(p, x0, y0, w, h, ramp='render', seed=0):
    """Limewashed rubble: smooth paint with the stones faintly showing through and a little flaking."""
    for yy in range(y0, y0 + h):
        for xx in range(x0, x0 + w):
            n = fbm(xx, yy, 7, seed); i = 1
            if n > 0.64: i = 2
            if n < 0.3: i = 0
            e = fbm(xx, yy * 1.6, 5, seed + 9)
            if 0.49 < e < 0.51: i = 2
            p.r(xx, yy, ramp, i)
    # flaked patches exposing stone near the base
    for yy in range(y0 + h - 22, y0 + h):
        for xx in range(x0, x0 + w):
            if fbm(xx, yy, 9, seed + 4) < 0.26:
                p.r(xx, yy, 'lime', 2 if hash01(xx, yy, 5) < 0.7 else 3)


def quoins(p, x, y0, y1, side, ramp='dressed', seed=0, long=13, short=8, ch=(10, 10)):
    """Alternating long/short dressed corner stones on the left (side=-1) or right (side=1) corner."""
    y = y1; k = 0
    while y > y0:
        hgt = ch[0]; top = max(y0, y - hgt)
        wdt = long if k % 2 == 0 else short
        bx = x if side < 0 else x - wdt
        for yy in range(top, y):
            for xx in range(bx, bx + wdt):
                lx, ly = xx - bx, yy - top
                if ly == y - top - 1: p.r(xx, yy, ramp, 4)
                elif (side < 0 and lx == wdt - 1) or (side > 0 and lx == 0): p.r(xx, yy, ramp, 3)
                elif ly == 0: p.r(xx, yy, ramp, 0)
                else: p.r(xx, yy, ramp, 1 + (1 if hash01(xx, yy, seed) < 0.08 else 0))
        y = top; k += 1


def plinth(p, x0, w, y, h=5, ramp='dressed'):
    for xx in range(x0, x0 + w):
        p.r(xx, y, ramp, 0)
        for yy in range(y + 1, y + h): p.r(xx, yy, ramp, 2 if ((xx - x0) % 23) else 4)
        p.r(xx, y + h - 1, ramp, 3)


def wall_ao(p, x0, w, y_top, y_ground, eave_depth=4, ground_depth=6):
    """Occlusion under the eaves (cast shadow of the roof overhang) and damp/grime at the foot of the wall."""
    for xx in range(x0, x0 + w):
        for k in range(eave_depth):
            p.shift(xx, y_top + k, 2 if k < 2 else 1)
        damp = int(ground_depth * (0.5 + fbm(xx, 0, 11, 3)))
        for k in range(damp):
            yy = y_ground - 1 - k
            p.shift(xx, yy, 1)


def ground_tufts(p, x0, w, y, seed=0, dens=0.22):
    """Grass tufts and the odd dandelion against the foot of the wall."""
    rnd = random.Random(seed)
    for xx in range(x0 + 2, x0 + w - 2):
        if rnd.random() < dens:
            hgt = rnd.randint(2, 5)
            for k in range(hgt):
                p.r(xx + (1 if k > 2 and rnd.random() < .5 else 0), y - 1 - k, 'grass', 2 + (k == 0) + (k == hgt - 1) * -1)
            if rnd.random() < 0.08: p.r(xx, y - 1 - hgt, 'flower_yel', 1)


# ------------------------------------------------------------------ roofs
def roof(p, x0, w, y_top, ridge_y, eave_y, kind='wslate', seed=0, ridge='clay', verge='coping', vramp='dressed',
         graduated=None, moss=0.1):
    """A pitched E-W roof seen from above in 3/4: a short back slope (north, lit), the ridge, and the long front
    slope (south) down to the eaves. Courses run along the eaves; stone slates graduate (small at ridge, big at eave)."""
    graduated = (kind == 'stoneslate') if graduated is None else graduated
    rnd = random.Random(seed + 31)
    # back slope: thin foreshortened courses, lit by the north-west light
    for yy in range(y_top, ridge_y):
        ly = yy - y_top
        for xx in range(x0, x0 + w):
            row = (ridge_y - yy) // 3; lr = (ridge_y - yy) % 3
            sl = (xx + row * 5) // 9
            i = 1 if lr else 2
            if lr and hash01(sl, row, seed) < 0.22: i = 0
            if lr and hash01(sl, row, seed) > 0.85: i = 2
            if lr == 1 and (xx + row * 5) % 9 == 0: i = 2
            p.r(xx, yy, kind, i)
    for xx in range(x0, x0 + w): p.r(xx, y_top, kind, 3)
    # front slope courses from the eave upward
    y = eave_y; ci = 0
    total = eave_y - (ridge_y + 3)
    while y > ridge_y + 3:
        frac = (y - ridge_y) / max(1, total)
        ch = (4 + int(round(4 * frac))) if graduated else 5
        top = max(ridge_y + 3, y - ch)
        x = x0 - rnd.randint(0, 10)
        while x < x0 + w:
            sw = rnd.randint(7, 12) if kind != 'stoneslate' else rnd.randint(8, 16)
            v = rnd.random()
            t = 2 + (0 if v < 0.7 else (1 if v < 0.88 else -1))
            if rnd.random() < 0.04: t = 1  # a replaced newer slate
            alt = kind == 'stoneslate' and rnd.random() < 0.18
            for yy in range(top, y):
                for xx in range(max(x, x0), min(x + sw, x0 + w)):
                    lx, ly = xx - x, yy - top
                    if ly == 0: i = t + 2                          # shadow of the course above
                    elif ly == 1: i = t + 1
                    elif lx == sw - 1: i = t + 1                    # butt joint
                    elif ly == y - top - 1: i = t - 1               # lit lower edge (tail) of the slate
                    else: i = t + (1 if hash01(xx, yy, seed) < 0.06 else 0)
                    if lx == 0 and ly == y - top - 1: i = t + 1   # rounded tail corner
                    p.r(xx, yy, 'grit_soot' if alt else kind, i + (1 if alt else 0))
            x += sw
        y = top; ci += 1
    # lichen and moss cushions (more on stone slates, more low down near the drip)
    if moss:
        n = int(w * (eave_y - ridge_y) * moss / 30)
        for k in range(n):
            xx = x0 + 6 + int(rnd.random() * (w - 12))
            low = rnd.random() ** 0.6
            yy = int(ridge_y + 5 + low * (eave_y - ridge_y - 8))
            if kind == 'stoneslate' and rnd.random() < 0.55:
                pw_, ph_ = rnd.randint(2, 4), rnd.randint(1, 2)
                for a in range(pw_):
                    for b2 in range(ph_):
                        if (a in (0, pw_ - 1) and b2 == 0 and ph_ > 1): continue
                        p.r(xx + a, yy + b2, 'lichen', 1 + (a >= pw_ - 1) + (b2 == ph_ - 1) * 0)
            else:
                # a flat cushion of moss lodged along a slate course: wide, low, lit on top
                r = rnd.choice([2, 2, 3, 4])
                for a in range(-r, r + 1):
                    hgt = max(1, int(round(2 * math.sqrt(max(0, 1 - (a / (r + .5)) ** 2)))))
                    for b2 in range(hgt):
                        p.r(xx + a, yy - b2, 'moss', (1 if b2 == hgt - 1 else 2) + (a > r // 2) + (hash01(xx + a, b2, 5) < .2))
                    p.shift(xx + a, yy + 1, 1)
    # ridge
    rr = {'clay': 'tile_roof', 'stone': vramp, 'slate': kind}[ridge]
    for xx in range(x0, x0 + w):
        seg = (xx - x0) % 11
        p.out(xx, ridge_y - 1)
        p.r(xx, ridge_y, rr, 0 if seg not in (0, 10) else 2)
        p.r(xx, ridge_y + 1, rr, 1 if seg != 0 else 3)
        p.r(xx, ridge_y + 2, rr, 3 if seg != 0 else 4)
        p.r(xx, ridge_y + 3, kind, 4)
    # eave drip edge
    for xx in range(x0, x0 + w):
        p.r(xx, eave_y - 1, kind, 1 if hash01(xx, 1, seed) < 0.7 else 2)
    # verges
    if verge == 'coping':
        for side in (0, 1):
            vx = x0 if side == 0 else x0 + w - 6
            for yy in range(y_top, eave_y + 2):
                for k in range(6):
                    xx = vx + k
                    seam = (yy - y_top) % 12 == 0
                    i = 1 if k < 3 else 2
                    if k == 0 and side == 0: i = 0
                    if k == 5: i = 3
                    if seam: i = 3
                    p.r(xx, yy, vramp, i)
            # kneeler at the eave end
            for yy in range(eave_y - 6, eave_y + 3):
                for k in range(-1, 8):
                    xx = vx + k if side == 0 else vx + k - 2
                    p.r(xx, yy, vramp, 0 if yy == eave_y - 6 else (3 if yy >= eave_y + 1 else 1))
    elif verge == 'barge':
        for side in (0, 1):
            vx = x0 if side == 0 else x0 + w - 3
            for yy in range(y_top, eave_y + 1):
                for k in range(3): p.r(vx + k, yy, 'paint_cream', 1 + k)


def gutter(p, x0, w, y, ramp='paint_black'):
    for xx in range(x0, x0 + w):
        p.r(xx, y, ramp, 0 if (xx - x0) % 17 else 1)
        p.r(xx, y + 1, ramp, 2)
        p.r(xx, y + 2, ramp, 3)
        if (xx - x0) % 24 == 5: p.r(xx, y + 3, ramp, 3)  # bracket


def downpipe(p, x, y0, y1, ramp='paint_black'):
    for yy in range(y0, y1):
        p.r(x, yy, ramp, 1); p.r(x + 1, yy, ramp, 2); p.r(x + 2, yy, ramp, 3)
        p.shift(x + 3, yy, 1)
        if (yy - y0) % 26 == 8:  # pipe collar / holdfast
            for k in range(-1, 4): p.r(x + k, yy, ramp, 0 if k == 0 else 2)
    for k in range(-1, 4): p.r(x + k, y0, ramp, 1); p.r(x + k, y0 + 1, ramp, 2)  # hopper
    for k in range(0, 5): p.r(x + k, y1 - 1, ramp, 2)  # shoe
    p.r(x + 4, y1 - 2, ramp, 3)


def chimney(p, cx, base_y, w=18, h=40, ramp='grit', pots=2, pot_ramp='tile_roof', seed=0, roof_kind='wslate'):
    """Stone stack rising off the ridge: coursed front face, oversailing cap, lit top, clay pots; lead flashing and a
    violet cast shadow on the roof to the south-east."""
    x0 = cx - w // 2; top = base_y - h
    # cast shadow on the roof (down-right)
    for yy in range(base_y - 2, base_y + 9):
        for xx in range(x0 + 3, x0 + w + 6):
            if p.m[yy][xx] == roof_kind and xx - x0 - w < (yy - base_y + 6): p.shift(xx, yy, 2)
    stone_wall(p, x0, top + 5, w, h - 5, ramp, seed, course=(4, 5), block=(5, 10), soot=0.9, rubble=0, base_i=2)
    for yy in range(top + 5, base_y):
        p.shift(x0 + w - 1, yy, 1); p.shift(x0 + w - 2, yy, 1); p.shift(x0, yy, -1)
    # oversailing course / cap
    for xx in range(x0 - 1, x0 + w + 1):
        p.r(xx, top + 4, 'dressed', 3)
        p.r(xx, top + 3, 'dressed', 1 if xx < x0 + w - 1 else 2)
        for yy in range(top, top + 3): p.r(xx, yy, 'dressed', 0 if yy == top else 1)
        p.r(xx, top - 1, 'dressed', 2)
    for yy in range(top - 1, top + 5): p.r(x0 - 2, yy, 'dressed', 3); p.r(x0 + w + 1, yy, 'dressed', 4)
    for yy in range(top + 5, base_y): p.r(x0 - 1, yy, ramp, 4); p.r(x0 + w, yy, ramp, 5)
    # lead flashing where it meets the roof
    for xx in range(x0 - 1, x0 + w + 1):
        p.r(xx, base_y, 'lead', 1); p.r(xx, base_y + 1, 'lead', 2 if xx < x0 + w - 2 else 3)
    # pots
    n = pots
    for k in range(n):
        px = x0 + 2 + k * (w - 4) // max(1, n) + (1 if n == 1 else 0) + (w - 8) // (2 * n)
        ph = 10 + (k % 2) * 3
        for yy in range(top - ph, top):
            for xx in range(px, px + 5):
                lx = xx - px
                i = [1, 0, 1, 2, 3][lx]
                if (yy - (top - ph)) == 3: i += 1  # moulded band
                p.r(xx, yy, pot_ramp, i)
        for xx in range(px - 1, px + 6):  # rim
            p.r(xx, top - ph, pot_ramp, 0 if xx < px + 3 else 2)
        p.r(px + 1, top - ph - 1, pot_ramp, 4); p.r(px + 2, top - ph - 1, pot_ramp, 4); p.r(px + 3, top - ph - 1, pot_ramp, 3)
        p.out(px + 1, top - ph - 1); p.out(px + 2, top - ph - 1)
        p.r(px, top - 1, 'mortar', 2); p.r(px + 4, top - 1, 'mortar', 3)  # flaunching


# ------------------------------------------------------------------ windows
def _curtain(p, x, y, w, h, cr, left, tie=0.55):
    """A drawn-back curtain inside a window: folds, tie-back narrowing."""
    for yy in range(y, y + h):
        t = (yy - y) / max(1, h)
        ww = w if t < tie - 0.12 else (max(1, w - 2) if t < tie + 0.08 else w)
        if abs(t - tie) < 0.06: ww = max(1, w - 2)
        for k in range(ww):
            xx = x + k if left else x + w - 1 - k
            fold = (k % 2 == 1)
            i = 1 + fold + (1 if k == ww - 1 else 0)
            p.r(xx, yy, cr, i)


def sash(p, x, y, w, h, surround='dressed', curtain='wine', bars='2', paint='white', lit=True, sill=True,
         lintel='plain', seed=0, ornament=None):
    """A painted timber sash window in a dressed-stone surround. (x, y) = top-left of the opening."""
    # surround: jambs, lintel, projecting sill
    for yy in range(y - 1, y + h):
        for k in range(3):
            p.r(x - 3 + k, yy, surround, [1, 1, 2][k] if (yy - y) % 11 else 3)
            p.r(x + w + k, yy, surround, [1, 2, 3][k] if (yy - y) % 11 else 3)
    lh = 6
    for yy in range(y - lh, y - 1):
        for xx in range(x - 4, x + w + 4):
            i = 0 if yy == y - lh else (1 if yy < y - 2 else 2)
            if lintel == 'key' and abs(xx - (x + w / 2 - 0.5)) < 3 and yy >= y - lh: i = 0 if yy == y - lh else 1
            if lintel == 'key' and abs(xx - (x + w / 2 - 0.5)) in (2.5, 3.0, 3.5): i = 3
            p.r(xx, yy, surround, i)
        p.r(x - 4, yy, surround, 2); p.r(x + w + 3, yy, surround, 3)
    if lintel == 'key':  # keystone standing proud
        kx = x + w // 2 - 3
        for yy in range(y - lh - 2, y):
            for xx in range(kx, kx + 6): p.r(xx, yy, surround, 0 if yy == y - lh - 2 else (3 if xx == kx + 5 else 1))
    if sill:
        for xx in range(x - 5, x + w + 5):
            p.r(xx, y + h, surround, 0); p.r(xx, y + h + 1, surround, 1); p.r(xx, y + h + 2, surround, 2)
            p.r(xx, y + h + 3, surround, 4)
        for xx in range(x - 4, x + w + 6):  # shadow under the sill on the wall
            p.shift(xx, y + h + 4, 2); p.shift(xx, y + h + 5, 1)
    # the opening: dark reveal, then frame and glass
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            p.r(xx, yy, 'pane', 4)
    fx0, fx1 = x + 1, x + w - 1
    mid = y + h // 2
    panes = []
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            frame = (lx <= 1 or lx >= w - 2 or ly <= 1 or ly >= h - 2 or yy in (mid - 1, mid))
            if bars == '2' and abs(lx - (w // 2)) < 1: frame = True
            if bars == '6':
                if lx in (w // 3, 2 * w // 3): frame = True
                if yy in (y + (mid - y) // 2 + 1, mid + (y + h - mid) // 2): frame = True
            if bars == '4':
                if lx == w // 2: frame = True
                if yy in (y + (mid - y) // 2 + 1, mid + (y + h - mid) // 2): frame = True
            if frame:
                i = 1
                if ly == 0 or lx == 0: i = 3             # reveal shadow top-left
                elif ly == 1 and lx > 0: i = 2
                elif yy == mid: i = 0                     # meeting rail catches the light
                elif lx == w - 1 or ly == h - 1: i = 2
                p.r(xx, yy, paint, i)
            else:
                panes.append((xx, yy))
    # glass: dark interior, sky reflection and a diagonal glint
    cw = max(3, w // 5)
    for (xx, yy) in panes:
        lx, ly = xx - x, yy - y
        d = (lx + ly * 0.9)
        i = 3
        if ly < 5 and yy < mid: i = 2
        band = (d % 14)
        if 2 <= band < 4 and yy < mid: i = 1
        if 3 <= band < 4 and yy < mid and ly < h // 3: i = 0
        p.r(xx, yy, 'pane', i)
    if curtain:
        _curtain(p, x + 2, y + 2, cw, h - 4, curtain, True)
        _curtain(p, x + w - 2 - cw, y + 2, cw, h - 4, curtain, False)
        # pelmet
        for xx in range(x + 2, x + w - 2): p.r(xx, y + 2, curtain, 3)
    if ornament:
        ornament(p, x, y, w, h)
    # re-apply the frame over the curtains (glazing bars sit in front)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if (xx, yy) in set(): pass
    # dusk overlay: warm lamp-lit panes; curtains glow warm
    if lit:
        cx, cy = x + w / 2, y + h * 0.55
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                m = p.m[yy][xx]
                if m == 'pane':
                    dd = math.hypot((xx - cx) / (w / 2), (yy - cy) / (h / 2))
                    p.glow(xx, yy, rc('glow', 1 if dd < 0.45 else (2 if dd < 0.85 else 3)))
                elif curtain and m == curtain:
                    p.glow(xx, yy, _mix(rc(curtain, p.i[yy][xx] - 1), rc('glow', 2), 0.45))
        p.lights.append([int(cx), int(y + h / 2), max(w, h)])
    return (x, y, w, h)


def _mix(a, b, t):
    return tuple(int(a[k] * (1 - t) + b[k] * t) for k in range(3)) + (255,)


def mullion(p, x, y, lights=3, lw=11, h=20, surround='dressed', curtain='cream', seed=0, lit=True, lead=True,
            drip=True):
    """A Pennine stone-mullioned window: chunky dressed surround, square mullions, leaded or small-paned lights,
    a hood-mould (drip) over the head."""
    mw = 4
    w = lights * lw + (lights - 1) * mw
    # surround
    for yy in range(y - 4, y + h + 4):
        for xx in range(x - 4, x + w + 4):
            if x <= xx < x + w and y <= yy < y + h: continue
            i = 1
            if yy == y - 4: i = 0
            if xx >= x + w: i = 2
            if yy >= y + h: i = 1 if yy == y + h else (2 if yy < y + h + 3 else 4)
            if xx == x - 4 and yy < y + h: i = 0
            p.r(xx, yy, surround, i)
    if drip:
        for xx in range(x - 7, x + w + 7):
            p.r(xx, y - 7, surround, 0); p.r(xx, y - 6, surround, 1); p.r(xx, y - 5, surround, 3)
        for k in range(4):
            p.r(x - 7, y - 5 + k, surround, 1); p.r(x - 6, y - 5 + k, surround, 2)
            p.r(x + w + 6, y - 5 + k, surround, 3); p.r(x + w + 5, y - 5 + k, surround, 2)
    for xx in range(x - 4, x + w + 6):
        p.shift(xx, y + h + 4, 2); p.shift(xx, y + h + 5, 1)
    for k in range(lights):
        lx0 = x + k * (lw + mw)
        if k:
            for yy in range(y, y + h):
                for m in range(mw):
                    p.r(lx0 - mw + m, yy, surround, [0, 1, 1, 3][m])
        for yy in range(y, y + h):
            for xx in range(lx0, lx0 + lw):
                ly, lx = yy - y, xx - lx0
                i = 3
                if ly < 4: i = 2
                if 2 <= ((lx + ly) % 11) < 4 and ly < h // 2: i = 1
                if ly == 0 or lx == 0: i = 4
                p.r(xx, yy, 'pane', i)
                if lead and (lx % 4 == 3 or ly % 5 == 4) and ly > 0 and lx > 0:
                    p.r(xx, yy, 'lead', 3)
        if curtain and k in (0, lights - 1):
            _curtain(p, lx0 + (1 if k == 0 else lw - 4), y + 1, 3, h - 2, curtain, k == 0)
        if lit:
            for yy in range(y, y + h):
                for xx in range(lx0, lx0 + lw):
                    m = p.m[yy][xx]
                    if m == 'pane': p.glow(xx, yy, rc('glow', 1 if abs(yy - (y + h * 0.55)) < h * 0.25 else 2))
                    elif m == 'lead': p.glow(xx, yy, rc('glow', 4))
                    elif curtain and m == curtain: p.glow(xx, yy, _mix(rc(curtain, p.i[yy][xx]), rc('glow', 2), 0.4))
    if lit: p.lights.append([x + w // 2, y + h // 2, w])
    return (x, y, w, h)


def window_box(p, x, y, w, ramp='paint_green', flowers=('flower_red', 'flower_wht'), seed=0):
    """Timber box on a sill with a mound of foliage and blooms; (x, y) = top-left of the box."""
    rnd = random.Random(seed)
    for yy in range(y, y + 5):
        for xx in range(x, x + w):
            i = 1 if yy > y else 0
            if yy == y + 4: i = 3
            if xx == x + w - 1: i = 3
            if xx == x: i = 0
            p.r(xx, yy, ramp, i)
    # foliage mound
    for k in range(w // 3 + 2):
        cx = x + 1 + k * 3 + rnd.randint(-1, 1); cy = y - 1 - rnd.randint(0, 2)
        leaf_blob(p, cx, cy, rnd.randint(2, 3), 'leaf', rnd)
    for k in range(w // 3 + 1):
        fx = x + 2 + rnd.randint(0, w - 4); fy = y - rnd.randint(2, 6)
        bloom(p, fx, fy, rnd.choice(flowers), rnd)
    # trailing ivy-leaf geranium over the front
    for k in range(3):
        tx = x + 2 + rnd.randint(0, w - 4)
        for d in range(rnd.randint(2, 5)): p.r(tx + (d > 2), y + 4 + d, 'leaf', 2 + d % 2)


def leaf_blob(p, cx, cy, r, ramp, rnd):
    for yy in range(cy - r, cy + r + 1):
        for xx in range(cx - r, cx + r + 1):
            dx, dy = (xx - cx) / (r + .5), (yy - cy) / (r + .5)
            d = dx * dx + dy * dy
            if d <= 1:
                l = pix.light(dx, dy, math.sqrt(max(0, 1 - d)))
                i = int(round((1 - l) * 4)) + 1
                if hash01(xx, yy, 44) < 0.15: i += 1
                p.r(xx, yy, ramp, i)


def bloom(p, x, y, ramp, rnd):
    p.r(x, y, ramp, 1); p.r(x + 1, y, ramp, 1); p.r(x, y + 1, ramp, 2); p.r(x + 1, y + 1, ramp, 2)
    p.r(x, y, ramp, 0)


def climbing_rose(p, x_left, x_right, y_ground, y_top, seed=0, flower='flower_red', thick=6):
    """A rose trained up both door jambs and over the head: foliage bands with blooms."""
    rnd = random.Random(seed)
    pts = []
    for yy in range(y_ground - 3, y_top, -3): pts.append((x_left - 2 + rnd.randint(-1, 1), yy))
    for xx in range(x_left, x_right, 3): pts.append((xx, y_top - 2 + rnd.randint(-2, 1)))
    for yy in range(y_top, y_ground - 16, 3): pts.append((x_right + 2 + rnd.randint(-1, 1), yy))
    # woody stem
    for yy in range(y_top, y_ground):
        p.r(x_left - 2, yy, 'bark', 2 + (yy % 3 == 0))
    for (cx, cy) in pts:
        leaf_blob(p, cx, cy, rnd.randint(2, 3), 'leaf', rnd)
    for (cx, cy) in pts:
        if rnd.random() < 0.55: bloom(p, cx + rnd.randint(-2, 1), cy + rnd.randint(-2, 1), flower, rnd)
        if rnd.random() < 0.2: bloom(p, cx + rnd.randint(-2, 1), cy + rnd.randint(-2, 1), 'flower_wht', rnd)


def ivy(p, x0, y0, w, h, seed=0, edge=0.5):
    """Ivy clinging to a wall: dense leaf mass with a ragged, noise-shaped edge."""
    rnd = random.Random(seed)
    for yy in range(y0, y0 + h):
        for xx in range(x0, x0 + w):
            t = ((xx - x0) / max(1, w))
            n = fbm(xx, yy, 9, seed)
            ok = n + (1 - t) * 0.6 + ((yy - y0) / max(1, h)) * 0.25 > 0.95 + edge * 0.1
            if not ok: continue
            q = hash01(xx // 3, yy // 3, seed)
            lx, ly = xx % 3, yy % 3
            i = 2
            if lx == 0 and ly == 0: i = 0 if q > 0.4 else 1
            elif lx == 2 or ly == 2: i = 3 + (q < 0.3)
            elif q < 0.25: i = 3
            p.r(xx, yy, 'ivy', i)
    # stems at the lower edge
    for k in range(6):
        sx = x0 + rnd.randint(0, max(1, w // 2)); sy = y0 + h
        for d in range(rnd.randint(4, 12)): p.r(sx + (d // 4), sy - d, 'bark', 3)


def hanging_basket(p, x, y, seed=0, flowers=('flower_pur', 'flower_red', 'flower_wht')):
    """Wrought-iron bracket from the wall and a flowering basket hanging below it; (x, y) = wall fixing point."""
    rnd = random.Random(seed)
    for k in range(10): p.r(x + k, y, 'paint_black', 1 if k < 9 else 2)
    for k in range(5): p.r(x + k // 1, y + 4 - k, 'paint_black', 2) if k < 5 else None
    p.r(x + 8, y + 1, 'paint_black', 2); p.r(x + 8, y + 2, 'paint_black', 2)
    by = y + 8
    for k in range(9):
        leaf_blob(p, x + 4 + rnd.randint(-3, 5), by + rnd.randint(-2, 2), rnd.randint(2, 3), 'leaf', rnd)
    for k in range(7): bloom(p, x + 2 + rnd.randint(0, 9), by - 2 + rnd.randint(0, 5), rnd.choice(flowers), rnd)
    for k in range(4):
        tx = x + 3 + rnd.randint(0, 7)
        for d in range(rnd.randint(3, 7)): p.r(tx, by + 3 + d, 'leaf', 2 + (d % 2))
        bloom(p, tx, by + 3 + rnd.randint(2, 5), rnd.choice(flowers), rnd)


# ------------------------------------------------------------------ doors
def door(p, cx, bottom, w=32, h=54, paint='paint_green', surround='dressed', style='panel4', fanlight=True,
         lintel='plain', open_=False, lit=True, knocker=True, step=True, glazed_top=False):
    """Panelled front door in a stone surround with a stone step. Returns the doorway rect."""
    x = cx - w // 2; y = bottom - h
    fh = 9 if fanlight else 0
    # surround (jambs + lintel)
    for yy in range(y - fh - 6, bottom):
        for k in range(4):
            if yy >= y - fh - 1:
                p.r(x - 4 + k, yy, surround, [0, 1, 1, 2][k] if (yy - y) % 12 else 3)
                p.r(x + w + k, yy, surround, [1, 2, 2, 3][k] if (yy - y) % 12 else 3)
    for yy in range(y - fh - 7, y - fh - 1):
        for xx in range(x - 5, x + w + 5):
            i = 0 if yy == y - fh - 7 else (1 if yy < y - fh - 3 else 2)
            if xx >= x + w + 3: i += 1
            p.r(xx, yy, surround, i)
    if lintel == 'date':  # a blank datestone panel carved in the lintel
        for xx in range(cx - 8, cx + 8):
            p.r(xx, y - fh - 5, surround, 3); p.r(xx, y - fh - 3, surround, 0)
        p.r(cx - 9, y - fh - 4, surround, 3); p.r(cx + 8, y - fh - 4, surround, 0)
    # fanlight
    if fanlight:
        for yy in range(y - fh - 1, y):
            for xx in range(x, x + w):
                lx, ly = xx - x, yy - (y - fh - 1)
                bar = ly == 0 or ly == fh or lx in (0, w - 1) or (lx % 6 == 3 and ly > 0)
                if bar: p.r(xx, yy, 'white', 1 if ly else 3)
                else: p.r(xx, yy, 'pane', 2 if ly < 3 else 3)
        if lit:
            for yy in range(y - fh - 1, y):
                for xx in range(x, x + w):
                    if p.m[yy][xx] == 'pane': p.glow(xx, yy, rc('glow', 1 + (yy - (y - fh)) // 3))
            p.lights.append([cx, y - fh // 2, 16])
    if open_:
        # double doors stand open into a warm, lamp-lit hall: back wall, dado, floorboards, a stacked chair
        fl = bottom - 9
        for yy in range(y, bottom):
            for xx in range(x, x + w):
                lx, ly = xx - x, yy - y
                if yy >= fl:  # floorboards running away from us
                    i = 1 + ((xx - cx) * 6 // max(1, (yy - fl + 3)) % 3 == 0)
                    if yy == fl: i = 3
                    p.r(xx, yy, 'wood', i)
                elif yy >= fl - 14:  # panelled dado
                    i = 2 if (lx % 9) else 3
                    if yy == fl - 14: i = 1
                    p.r(xx, yy, 'wood_dark', i - 1)
                else:
                    # pendant lamp light from above: bright band high up, falling off to the sides and down
                    d = abs(xx + .5 - cx) / (w * .5) * 0.8 + (yy - y) / h * 0.9
                    p.r(xx, yy, 'glow', 1 if d < .45 else (2 if d < .85 else 3))
        # a pinned poster and a stack of chairs inside
        for yy in range(y + 12, y + 22):
            for xx in range(cx - 13, cx - 5): p.r(xx, yy, 'paint_cream', 1 if yy > y + 12 else 0)
        for k in range(3):
            sy = fl - 16 + k * 2
            for xx in range(cx + 3, cx + 12): p.r(xx, sy, 'wood', 2); p.r(xx, sy + 1, 'wood', 3)
        for yy in range(fl - 16, fl + 2):
            p.r(cx + 3, yy, 'wood', 3); p.r(cx + 11, yy, 'wood', 3)
        for yy in range(fl - 26, fl - 16): p.r(cx + 11, yy, 'wood', 2); p.r(cx + 10, yy, 'wood', 3)
        # reveal shadow top and left
        for xx in range(x, x + w): p.shift(xx, y, 2); p.shift(xx, y + 1, 1)
        # the two leaves, swung inward, seen edge-on at each side
        for yy in range(y, bottom):
            for k in range(6):
                p.r(x + k, yy, paint, [3, 2, 1, 1, 2, 3][k])
                p.r(x + w - 6 + k, yy, paint, [2, 1, 0, 1, 2, 3][k])
        for yy in range(y + 6, bottom - 4, 12):
            p.r(x + 3, yy, paint, 0); p.r(x + w - 3, yy, paint, 0)
        p.r(x + 4, y + h // 2, 'gold', 1); p.r(x + w - 5, y + h // 2, 'gold', 0)
        for yy in range(y, bottom):
            for xx in range(x + 6, x + w - 6):
                m = p.m[yy][xx]
                if m == 'glow': p.glow(xx, yy, rc('glow', p.i[yy][xx] - 1))
                elif m in ('wood', 'wood_dark', 'paint_cream'): p.glow(xx, yy, _mix(rc(m, p.i[yy][xx] - 1), rc('glow', 2), 0.35))
        p.lights.append([cx, bottom - h // 2, 44])
    else:
        for yy in range(y, bottom):
            for xx in range(x, x + w):
                lx, ly = xx - x, yy - y
                i = 1 + (1 if hash01(xx, yy // 5, 9) < 0.08 else 0)
                if lx == 0 or ly == 0: i = 3        # reveal shadow
                elif lx == 1 or ly == 1: i = 2
                elif lx == w - 1: i = 2
                p.r(xx, yy, paint, i)
        # panels
        if style == 'panel4':
            ph1 = int(h * 0.42); gap = 4
            pw = (w - 3 * 4) // 2
            for col in range(2):
                px0 = x + 4 + col * (pw + 4)
                for (py0, phh) in ((y + 4, ph1), (y + 4 + ph1 + 8, h - ph1 - 16)):
                    if glazed_top and py0 == y + 4:
                        for yy in range(py0, py0 + phh):
                            for xx in range(px0, px0 + pw):
                                p.r(xx, yy, 'pane', 2 if (xx - px0 + yy - py0) % 9 in (2, 3) else 3)
                        continue
                    _panel(p, px0, py0, pw, phh, paint)
        elif style == 'boarded':
            for xx in range(x + 2, x + w):
                if (xx - x) % 5 == 0:
                    for yy in range(y + 1, bottom): p.r(xx, yy, paint, 3)
            for yy in (y + 8, bottom - 12):
                for xx in range(x + 2, x + w - 1): p.r(xx, yy, paint, 0); p.r(xx, yy + 1, paint, 2)
        # letterbox, knob, knocker (brass)
        mid = y + int(h * 0.42) + 7
        for xx in range(cx - 4, cx + 4): p.r(xx, mid, 'gold', 1); p.r(xx, mid + 1, 'gold', 3)
        p.r(cx - 4, mid, 'gold', 0)
        p.r(x + w - 6, mid - 5, 'gold', 1); p.r(x + w - 5, mid - 5, 'gold', 2); p.r(x + w - 6, mid - 4, 'gold', 3)
        p.r(x + w - 6, mid - 6, 'gold', 0)
        if knocker:
            p.r(cx, y + 10, 'gold', 1); p.r(cx - 1, y + 11, 'gold', 2); p.r(cx + 1, y + 11, 'gold', 2); p.r(cx, y + 12, 'gold', 3)
            p.r(cx - 1, y + 10, 'gold', 0)
    if step:
        for xx in range(x - 4, x + w + 4):
            p.r(xx, bottom - 4, surround, 0); p.r(xx, bottom - 3, surround, 1); p.r(xx, bottom - 2, surround, 2)
            p.r(xx, bottom - 1, surround, 4)
        for xx in range(x - 5, x + w + 5): pass
    return (x, y, w, h)


def _panel(p, x, y, w, h, paint):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            i = 1
            if ly == 0 or lx == 0: i = 3             # recessed: shadow on top/left moulding
            elif ly == h - 1 or lx == w - 1: i = 0   # light catches the bottom/right bevel
            elif lx == 1 or ly == 1: i = 2
            p.r(xx, yy, paint, i)


def blank_board(p, x, y, w, h, ground='paint_green', frame='gold', name=None):
    """A painted, framed signboard with NO lettering: the game letters it. Registers the lettering rect."""
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            if lx == 0 or ly == 0 or lx == w - 1 or ly == h - 1: p.r(xx, yy, ground, 4); continue
            if lx == 1 or ly == 1: p.r(xx, yy, frame, 1 if ly == 1 else 2); continue
            if lx == w - 2 or ly == h - 2: p.r(xx, yy, frame, 3); continue
            i = 2 if ly > 3 else 1
            if ly == 2: i = 1
            if hash01(xx, yy, 12) < 0.04: i += 1
            p.r(xx, yy, ground, i)
    for xx in range(x + 1, x + w + 1): p.shift(xx, y + h, 2)
    for yy in range(y + 1, y + h + 1): p.shift(x + w, yy, 2)
    if name: p.signs[name] = [x + 3, y + 3, w - 6, h - 6]
    return (x + 3, y + 3, w - 6, h - 6)


# ------------------------------------------------------------------ little life
def cat_loaf(p, x, y, fur='hair_ginger', facing=1, stripes=True):
    """A cat sat on a window sill, tail curled down over the edge; (x, y) = bottom-left where it sits. Outlined."""
    c = Canvas(16, 18)
    def put(xx, yy, r, i): c.put(xx, yy, rc(r, i))
    for yy in range(7, 16):      # body: pear-shaped, sitting upright
        for xx in range(1, 14):
            dx, dy = (xx + .5 - 7) / (4.2 + (yy - 7) * .28), (yy + .5 - 12) / 4.5
            if dx * dx + dy * dy <= 1:
                l = pix.light(dx, dy, math.sqrt(max(0, 1 - dx * dx - dy * dy)))
                i = int(round((1 - l) * 3))
                if stripes and (yy % 3 == 0) and 1 < i < 4 and xx < 11: i += 1
                put(xx, yy, fur, i)
    for yy in range(1, 9):       # head
        for xx in range(3, 13):
            dx, dy = (xx + .5 - 8) / 4.2, (yy + .5 - 5.2) / 3.6
            if dx * dx + dy * dy <= 1:
                l = pix.light(dx, dy, math.sqrt(max(0, 1 - dx * dx - dy * dy)))
                put(xx, yy, fur, int(round((1 - l) * 3)))
    for (ex, s_) in ((4, 1), (10, -1)):   # small triangular ears
        put(ex, 1, fur, 1); put(ex + s_, 1, fur, 2); put(ex, 0, fur, 2)
        put(ex + (1 if s_ > 0 else 0), 2, 'skin_fair', 2)
    put(6, 5, 'charcoal', 4); put(10, 5, 'charcoal', 4)        # closed, contented eyes
    put(5, 5, 'charcoal', 3); put(11, 5, 'charcoal', 3)
    put(8, 6, 'skin_fair', 3)
    for (a, b2) in ((7, 7), (8, 7), (9, 7), (8, 8), (7, 8), (5, 15), (6, 15), (9, 15), (10, 15)):
        put(a, b2, 'white', 1)                                  # bib and white paws
    for k in range(5): put(13, 11 + k, fur, 2 + (k % 2)); put(14, 15 + (k > 2), fur, 2)
    put(13, 17, fur, 3)
    outline(c, OUTLINE)
    if facing < 0: c = c.flip()
    for yy in range(18):
        for xx in range(16):
            col = c.px[xx, yy]
            if col[3]: p.c(x + xx, y - 16 + yy, col)


def bicycle(p, x, y, frame='paint_red'):
    """An upright bicycle leaning on the wall, side on; (x, y) = bottom-left at the ground."""
    c = Canvas(40, 26)
    def put(xx, yy, col):
        c.put(xx, yy, col)
    def wheel(cx, cy, r):
        for a in range(0, 360, 3):
            t = math.radians(a)
            put(round(cx + r * math.cos(t)), round(cy + r * math.sin(t)), rc('paint_black', 2 if a < 180 else 1))
            put(round(cx + (r - 1) * math.cos(t)), round(cy + (r - 1) * math.sin(t)), rc('metal', 3 if a < 180 else 2))
        for a in range(0, 360, 45):
            t = math.radians(a)
            for k in range(1, r - 1): put(round(cx + k * math.cos(t)), round(cy + k * math.sin(t)), rc('metal', 2))
        put(cx, cy, rc('metal', 0))
    wheel(8, 17, 7); wheel(31, 17, 7)
    def line(x0, y0, x1, y1, col, th=1):
        n = max(abs(x1 - x0), abs(y1 - y0)) or 1
        for k in range(n + 1):
            xx = round(x0 + (x1 - x0) * k / n); yy = round(y0 + (y1 - y0) * k / n)
            for d in range(th): put(xx, yy + d, col)
    fr0, fr1 = rc(frame, 1), rc(frame, 2)
    line(8, 17, 17, 17, fr1, 2); line(17, 17, 13, 7, fr0, 2); line(13, 8, 27, 8, fr0, 2); line(27, 8, 17, 17, fr1, 2)
    line(27, 7, 31, 17, fr1, 2); line(8, 17, 13, 8, fr1)
    line(12, 5, 15, 5, rc('leather', 2), 2)             # saddle
    line(13, 7, 13, 6, rc('metal', 2))
    line(27, 7, 26, 3, rc('metal', 2)); line(24, 3, 29, 3, rc('metal', 1))  # bars
    for yy in range(4, 9):  # wicker basket on the front
        for xx in range(28, 36): put(xx, yy, rc('wicker' if False else 'wood', 0 + ((xx + yy) % 2) + (yy == 8)))
    put(17, 17, rc('metal', 0)); put(18, 18, rc('metal', 1))
    outline(c, OUTLINE)
    for yy in range(26):
        for xx in range(40):
            col = c.px[xx, yy]
            if col[3]: p.c(x + xx, y - 25 + yy, col)
    # contact shadow
    for xx in range(x + 1, x + 40):
        p.shift(xx, y, 1)


def milk_bottles(p, x, y, n=2):
    for k in range(n):
        bx = x + k * 4
        for yy in range(y - 7, y):
            for xx in range(bx, bx + 3):
                p.r(xx, yy, 'white', 0 if xx == bx else (1 if xx == bx + 1 else 2))
        p.r(bx, y - 8, 'metal', 0); p.r(bx + 1, y - 8, 'metal', 1); p.r(bx + 2, y - 8, 'metal', 2)
        p.r(bx + 1, y - 7, 'white', 3)
        for xx in range(bx - 1, bx + 4): p.out(xx, y) if False else None


def boot_scraper(p, x, y):
    for k in range(7): p.r(x + k, y - 3, 'paint_black', 1)
    p.r(x, y - 2, 'paint_black', 2); p.r(x + 6, y - 2, 'paint_black', 2); p.r(x, y - 1, 'paint_black', 3); p.r(x + 6, y - 1, 'paint_black', 3)


def plant_pot(p, x, y, seed=0, flower='flower_red', big=False):
    rnd = random.Random(seed); w = 9 if big else 7; hh = 7 if big else 6
    for yy in range(y - hh, y):
        inset = (yy - (y - hh)) // 3
        for xx in range(x + inset, x + w - inset):
            lx = xx - x
            p.r(xx, yy, 'tile_roof', 0 if lx < 2 else (1 if lx < w - 3 else 3))
    for xx in range(x - 1, x + w + 1): p.r(xx, y - hh, 'tile_roof', 0 if xx < x + w - 2 else 2)
    for k in range(3 if big else 2): leaf_blob(p, x + 2 + k * 3, y - hh - 2 - rnd.randint(0, 2), 2 + big, 'leaf', rnd)
    for k in range(3): bloom(p, x + 1 + rnd.randint(0, w - 3), y - hh - 3 - rnd.randint(0, 3), flower, rnd)


def lantern(p, cx, y, lit=True):
    """A black coach lantern on a wall bracket; (cx, y) = top of the lantern."""
    for k in range(-3, 4): p.r(cx + k, y, 'paint_black', 1 if k < 1 else 2)
    p.r(cx, y - 1, 'paint_black', 1); p.r(cx, y - 2, 'paint_black', 2)
    for yy in range(y + 1, y + 9):
        for xx in range(cx - 3, cx + 4):
            edge = xx in (cx - 3, cx + 3) or yy in (y + 1, y + 8)
            if edge: p.r(xx, yy, 'paint_black', 2 if xx != cx - 3 else 1)
            else: p.r(xx, yy, 'glow' if lit else 'pane', 2 if (xx - cx + yy) % 5 else 1) if lit else p.r(xx, yy, 'pane', 2)
    for xx in range(cx - 2, cx + 3): p.r(xx, y + 9, 'paint_black', 3)
    p.r(cx, y + 10, 'paint_black', 3)
    for yy in range(y + 2, y + 8):
        for xx in range(cx - 2, cx + 3): p.glow(xx, yy, rc('glow', 0 if abs(xx - cx) < 2 and y + 3 < yy < y + 7 else 1))
    p.lights.append([cx, y + 5, 24])


def bunting(p, x0, x1, y, sag=5, seed=0, cols=('paint_red', 'paint_cream', 'paint_blue', 'mustard', 'paint_green')):
    """Cotton bunting on a sagging string: little pennants (5 wide, 6 deep) every 9 px, alternating colours."""
    n = max(1, x1 - x0)
    sy = lambda xx: y + int(round(sag * 4 * ((xx - x0) / n) * (1 - (xx - x0) / n)))
    for xx in range(x0, x1): p.r(xx, sy(xx), 'cream', 3)
    k = 0
    for fx in range(x0 + 3, x1 - 5, 9):
        col = cols[k % len(cols)]; k += 1
        top = sy(fx + 2) + 1
        for d in range(6):
            half = (5 - d) / 2.0
            for xx in range(fx, fx + 5):
                if abs(xx + 0.5 - (fx + 2.5)) <= half:
                    p.r(xx, top + d, col, 0 if (d == 0) else (1 if xx < fx + 3 else 2))
        for xx in range(fx, fx + 5): p.shift(xx, top + 6, 1) if False else None


def noticeboard(p, x, y, w=24, h=18, seed=0):
    """Glazed parish noticeboard with coloured notices pinned inside (no writing: just paper and pins)."""
    rnd = random.Random(seed)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            if lx < 2 or ly < 2 or lx >= w - 2 or ly >= h - 2:
                p.r(xx, yy, 'wood_dark', 0 if (lx == 0 or ly == 0) else (3 if lx >= w - 1 or ly >= h - 1 else 1))
            else: p.r(xx, yy, 'leather', 2 if hash01(xx, yy, 7) < .5 else 3)   # cork
    papers = [('cream', 6, 8), ('paint_cream', 7, 6), ('flower_yel', 5, 5), ('flower_blu', 6, 6), ('white', 5, 7), ('flower_red', 4, 4)]
    px = x + 3
    for k, (r, pw, ph) in enumerate(papers):
        py = y + 3 + (k % 2) * 6 + rnd.randint(0, 1)
        if px + pw > x + w - 3: px = x + 4 + rnd.randint(0, 3); py += 1
        for yy in range(py, min(y + h - 3, py + ph)):
            for xx in range(px, min(x + w - 3, px + pw)):
                p.r(xx, yy, r, 0 if (yy - py) < 1 else 1)
                if r in ('cream', 'white', 'paint_cream') and (yy - py) % 2 == 1 and 0 < xx - px < pw - 1: p.r(xx, yy, r, 3)  # lines of 'writing' texture
        p.r(px + pw // 2, py, 'paint_red', 1)
        px += pw + 1
    # glass glint
    for k in range(4): p.r(x + 3 + k, y + 2 + k, 'white', 0)
    for xx in range(x + 1, x + w + 1): p.shift(xx, y + h, 2)


def figure_silhouette():
    """A Moira-sized (30 x 64) stand-in figure for scale in previews only (never exported)."""
    c = Canvas(30, 64)
    col = (70, 58, 86, 255)
    c.ellipse(15, 8, 6, 5, col)            # bun
    c.ellipse(15, 18, 11, 10, col)         # head + hair
    for yy in range(27, 56):
        hw = 9 + (yy - 27) * 5 // 29
        for xx in range(15 - hw, 15 + hw): c.put(xx, yy, col)
    for yy in range(56, 64):
        for xx in list(range(8, 13)) + list(range(17, 22)): c.put(xx, yy, col)
    return c
