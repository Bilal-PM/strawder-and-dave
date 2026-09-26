"""LINESIDE HD town buildings: drawing library (48 art px per map tile).

Extends assets/hd/lib/pix.py (never edits it). The key idea is the Painter: every pixel remembers which ramp and
which ramp step it was painted with, so ambient occlusion, weathering, soot and cast shadows are done by *shifting
along the hue-shifted ramp* (warm light -> cool violet shadow) instead of by alpha-blending grey over the top.

Each building draws two layers at once:
  p.cv   the day sprite (fully opaque or fully transparent pixels)
  p.lit  the dusk overlay: warm glowing window panes, fanlights and doorways only (transparent elsewhere)
"""
import math, os, sys, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from pix import *  # noqa: F401,F403
import pix

T = pix.TILE  # 48

# ------------------------------------------------------------------ extra ramps (light -> dark, hue-shifted)
TR = dict(RAMPS)
TR.update({
    'grit':       ['#eadbb8', '#cfbc96', '#b09b77', '#8e7a5c', '#6a5a47', '#483d35'],   # Pennine gritstone
    'grit_soot':  ['#bcae96', '#9a8d78', '#7a6f60', '#5d554c', '#433d3a', '#2e2a2b'],   # coal-smoke blackened
    'grit_warm':  ['#f0d8ac', '#d8b886', '#b99567', '#94734f', '#6d533c', '#4a392f'],   # iron-stained warm stones
    'lime':       ['#f3f0e7', '#dcd8cc', '#bfbaad', '#9d988d', '#78746c', '#56524f'],   # Dales limestone
    'dressed':    ['#f4e8c8', '#dccba5', '#bfab85', '#9a8667', '#72624d', '#4d4238'],   # ashlar dressings
    'render':     ['#fdf8ea', '#f1e8d2', '#ddd0b3', '#bcae91', '#918571', '#6a6154'],   # limewash
    'stoneslate': ['#aea591', '#8e8676', '#716a60', '#58534d', '#403c3a', '#2a2728'],   # Yorkshire stone slates
    'wslate':     ['#b3bccb', '#939cae', '#777f93', '#5d6477', '#464b5e', '#303444'],   # Welsh slate
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
    'bread':      ['#fbe0a4', '#eab66c', '#c98a45', '#9c6432', '#6c4424'],
    'rose_pink':  ['#ffd0dc', '#f59ab4', '#d96a8e', '#a84a6c'],
})
OUT = hexrgb(OUTLINE)


def rc(r, i):
    a = TR[r]; return hexrgb(a[max(0, min(len(a) - 1, int(i)))])


def _mix(a, b, t):
    return tuple(int(a[k] * (1 - t) + b[k] * t) for k in range(3)) + (255,)


# ------------------------------------------------------------------ painter
class Painter:
    def __init__(self, w, h, seed=1):
        self.w, self.h = w, h
        self.cv = Canvas(w, h)
        self.lit = Canvas(w, h)
        self.m = [[None] * w for _ in range(h)]   # ramp name per pixel
        self.i = [[0] * w for _ in range(h)]      # ramp step per pixel
        self.rng = random.Random(seed)
        self.lights = []     # [x, y, r] window / door glow points (sprite-local art px)
        self.signs = {}      # name -> [x, y, w, h] blank boards for the game to letter (sprite-local art px)
        self.litref = {}

    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def r(self, x, y, ramp, i):
        x, y = int(x), int(y)
        if not (0 <= x < self.w and 0 <= y < self.h): return
        a = TR[ramp]; i = max(0, min(len(a) - 1, int(i)))
        self.m[y][x] = ramp; self.i[y][x] = i
        self.cv.px[x, y] = hexrgb(a[i])

    def c(self, x, y, col):
        x, y = int(x), int(y)
        if not self.inb(x, y): return
        if isinstance(col, str): col = hexrgb(col)
        if len(col) == 4 and col[3] < 255:
            self.cv.put(x, y, col); return
        self.m[y][x] = None; self.cv.px[x, y] = tuple(col[:3]) + (255,)

    def out(self, x, y):
        self.c(x, y, OUT)

    def rect(self, x, y, w, h, ramp, i):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)): self.r(xx, yy, ramp, i)

    def shift(self, x, y, d):
        x, y = int(x), int(y)
        if not self.inb(x, y) or not self.cv.px[x, y][3]: return
        m = self.m[y][x]
        if m: self.r(x, y, m, self.i[y][x] + d)
        else:
            c = self.cv.px[x, y]; k = 0.84 ** d
            self.cv.px[x, y] = (int(c[0] * k), int(c[1] * k * 0.97), int(min(255, c[2] * k * 1.05)), 255)

    def shade_rect(self, x, y, w, h, d):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)): self.shift(xx, yy, d)

    def is_(self, x, y, *ramps):
        return self.inb(x, y) and self.m[y][x] in ramps

    def glow(self, x, y, col):
        x, y = int(x), int(y)
        if not self.inb(x, y): return
        if isinstance(col, str): col = hexrgb(col)
        self.lit.px[x, y] = tuple(col[:3]) + ((col[3] if len(col) == 4 else 255),)
        self.litref[(x, y)] = self.cv.px[x, y]

    def finish_lit(self):
        for (x, y), ref in self.litref.items():
            if self.cv.px[x, y] != ref: self.lit.px[x, y] = (0, 0, 0, 0)

    def silhouette(self, d=2):
        """Selective outline: darken the silhouette along each pixel's own ramp; true outline only on the base."""
        edge = []
        for y in range(self.h):
            for x in range(self.w):
                if self.cv.px[x, y][3] < 255: continue
                for dx, dy in ((1, 0), (-1, 0), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not self.inb(nx, ny) or self.cv.px[nx, ny][3] == 0: edge.append((x, y)); break
        for x, y in edge: self.shift(x, y, d)
        for x in range(self.w):
            if self.cv.px[x, self.h - 1][3]: self.out(x, self.h - 1)


# ------------------------------------------------------------------ walls
def stone_wall(p, x0, y0, w, h, ramp='grit', seed=0, course=(8, 12), block=(14, 32), soot=0.2, rubble=0.3,
               base_i=1, joint=3, warm=0.08, tooled=0.4):
    """Coursed gritstone walling, built from the ground up (deeper courses at the foot). Each stone is a pillow: lit
    top-left, shadowed bottom-right, recessed joints; some faces carry diagonal tooling, some are iron-stained."""
    rnd = random.Random(seed * 7919 + 13)
    y = y0 + h; ci = 0
    while y > y0:
        chh = rnd.randint(*course) + (3 if ci == 0 else (1 if ci == 1 else 0))
        top = max(y0, y - chh)
        x = x0 - rnd.randint(0, block[1])
        while x < x0 + w:
            bw = rnd.randint(*block)
            split = rnd.random() < rubble and (y - top) >= 9 and bw > 14
            r_ = 'grit_warm' if (ramp == 'grit' and rnd.random() < warm) else ramp
            if soot and ramp in ('grit', 'grit_warm'):
                cxs, cys = x + bw / 2, (top + y) / 2
                n = fbm(cxs * 0.5, cys * 0.25, 26, seed + 5)
                tt = soot * (0.55 + 0.9 * (1 - (cys - y0) / max(1, h)))
                if n < tt * 0.95 or rnd.random() < soot * 0.12: r_ = 'grit_soot'
            _stone(p, x, top, bw, y - top, x0, y0, w, h, r_, rnd, base_i, joint, split, tooled, ramp)
            x += bw
        y = top; ci += 1


def _stone(p, x, y, w, h, X0, Y0, W, Hh, ramp, rnd, base_i, joint, split, tooled, jramp):
    tone = base_i + (0 if rnd.random() < 0.6 else (1 if rnd.random() < 0.7 else -1))
    if rnd.random() < 0.05: tone = base_i + 2
    parts = [(x, y, w, h)]
    if split:
        sw = rnd.randint(6, max(6, w - 8)); sh = rnd.randint(4, h - 5)
        parts = [(x, y, sw, sh), (x, y + sh, sw, h - sh), (x + sw, y, w - sw, h)]
    for (bx, by, bw, bh) in parts:
        t = tone + (rnd.choice([0, 0, 1, -1]) if len(parts) > 1 else 0)
        s = rnd.randint(0, 99999)
        tool = rnd.random() < tooled
        for yy in range(by, by + bh):
            for xx in range(bx, bx + bw):
                if not (X0 <= xx < X0 + W and Y0 <= yy < Y0 + Hh): continue
                lx, ly = xx - bx, yy - by
                if lx == bw - 1 or ly == bh - 1:
                    p.r(xx, yy, jramp, joint + (1 if ly == bh - 1 else 0)); continue
                iw, ih = bw - 1, bh - 1
                if (lx, ly) in ((0, 0), (iw - 1, ih - 1)) or (lx == 0 and ly == ih - 1) or (lx == iw - 1 and ly == 0):
                    p.r(xx, yy, jramp, joint); continue
                nx, ny = (lx + .5) / iw * 2 - 1, (ly + .5) / ih * 2 - 1
                i = t
                v = nx * 0.55 + ny * 0.85
                if ly == 0 or (lx == 0 and ly < ih * .6): i = t - 1
                elif v > 1.05 or ly == ih - 1: i = t + 1
                elif v < -0.75: i = t - 1
                g = hash01(xx, yy, s)
                if tool and (lx + ly) % 4 == 0 and 1 < ly < ih - 1 and 1 < lx < iw - 1 and g < .55: i = t + 1
                elif g < 0.05: i += 1
                elif g > 0.975: i -= 1
                p.r(xx, yy, ramp, i)


def brick_wall(p, x0, y0, w, h, ramp='brick', seed=0):
    """Flemish-bond brickwork: 11px stretchers and 5px headers, 3px courses + 1px mortar. Headers are often darker
    (burnt), bricks vary in tone and each has a lit arris and a shaded bottom."""
    for yy in range(y0, y0 + h):
        rr = (y0 + h - 1 - yy); row = rr // 4; ly = rr % 4
        for xx in range(x0, x0 + w):
            if ly == 3:
                p.r(xx, yy, 'mortar', 1 if hash01(xx // 3, row, seed) < 0.8 else 2); continue
            off = (row % 2) * 9
            u = (xx - x0 + off) % 18
            if u in (11, 17):
                p.r(xx, yy, 'mortar', 2 if ly else 3); continue
            header = u > 11
            bid = (xx - x0 + off) // 18 * 2 + (1 if header else 0)
            h1 = hash01(bid, row, seed)
            rp = ramp
            t = 1 if h1 < 0.55 else (2 if h1 < 0.86 else 0)
            if header and h1 < 0.55: rp = 'brick_dark'; t = 1
            i = t
            if ly == 2 and hash01(bid, row, seed + 1) < .6: i = t - 1
            if ly == 0: i = t + 1
            if hash01(xx, yy, seed + 3) < 0.05: i += 1
            p.r(xx, yy, rp, i)


def render_wall(p, x0, y0, w, h, ramp='render', seed=0):
    """Limewashed rubble: smooth paint with the stones faintly showing through, flaking near the foot."""
    q = Painter(p.w, p.h)
    stone_wall(q, x0, y0, w, h, 'lime', seed, soot=0)
    for yy in range(y0, y0 + h):
        for xx in range(x0, x0 + w):
            n = fbm(xx, yy, 9, seed); i = 1
            if n > 0.66: i = 2
            if n < 0.28: i = 0
            if q.m[yy][xx] and q.i[yy][xx] >= 3 and hash01(xx, yy, 4) < .7: i = 2
            p.r(xx, yy, ramp, i)
    for yy in range(y0 + h - 34, y0 + h):
        for xx in range(x0, x0 + w):
            if fbm(xx, yy, 12, seed + 4) < 0.25 + (yy - (y0 + h - 34)) / 34 * 0.12:
                p.r(xx, yy, 'lime', q.i[yy][xx] if q.m[yy][xx] else 2)


def quoins(p, x, y0, y1, side, ramp='dressed', seed=0, long=21, short=13, ch=15):
    y = y1; k = 0
    while y > y0:
        top = max(y0, y - ch); wdt = long if k % 2 == 0 else short
        bx = x if side < 0 else x - wdt
        for yy in range(top, y):
            for xx in range(bx, bx + wdt):
                lx, ly = xx - bx, yy - top
                if ly == y - top - 1: p.r(xx, yy, ramp, 4)
                elif (side < 0 and lx == wdt - 1) or (side > 0 and lx == 0): p.r(xx, yy, ramp, 3)
                elif ly == 0: p.r(xx, yy, ramp, 0)
                elif ly == y - top - 2: p.r(xx, yy, ramp, 2)
                else: p.r(xx, yy, ramp, 1 + (1 if hash01(xx, yy, seed) < 0.07 else 0))
        y = top; k += 1


def plinth(p, x0, w, y, h=8, ramp='dressed'):
    for xx in range(x0, x0 + w):
        seam = (xx - x0) % 34 == 0
        p.r(xx, y, ramp, 0); p.r(xx, y + 1, ramp, 1)
        for yy in range(y + 2, y + h): p.r(xx, yy, ramp, 4 if seam else (2 + (hash01(xx, yy, 7) < .1)))
        p.r(xx, y + h - 1, ramp, 3)


def band(p, x0, w, y, ramp='dressed', h=5):
    for xx in range(x0, x0 + w):
        for k in range(h): p.r(xx, y + k, ramp, [0, 1, 1, 2, 3, 4][min(5, k)] if k < h - 1 else 4)
        p.shift(xx, y + h, 2); p.shift(xx, y + h + 1, 1)


WALLISH = ('grit', 'grit_soot', 'grit_warm', 'lime', 'render', 'brick', 'brick_dark', 'mortar', 'dressed')


def wall_ao(p, x0, w, y_top, y_ground, eave_depth=6, ground_depth=10):
    """Occlusion under the eaves and damp/grime at the foot of the wall (solid ramp shifts, no gradient dither)."""
    for xx in range(x0, x0 + w):
        for k in range(eave_depth):
            p.shift(xx, y_top + k, 2 if k < 3 else 1)
        damp = int(ground_depth * (0.45 + fbm(xx, 0, 16, 3)))
        for k in range(damp):
            if p.is_(xx, y_ground - 1 - k, *WALLISH): p.shift(xx, y_ground - 1 - k, 1)


def ground_tufts(p, x0, w, y, seed=0, dens=0.2):
    rnd = random.Random(seed)
    for xx in range(x0 + 3, x0 + w - 3):
        if rnd.random() < dens:
            hgt = rnd.randint(3, 8)
            for k in range(hgt):
                p.r(xx + (1 if k > hgt * .6 and rnd.random() < .5 else 0), y - 1 - k, 'grass', 3 - (k > hgt // 2) + (k == 0))
            if rnd.random() < 0.06:
                p.r(xx, y - 1 - hgt, 'flower_yel', 0); p.r(xx + 1, y - 1 - hgt, 'flower_yel', 1)
                p.r(xx, y - hgt, 'flower_yel', 2)


# ------------------------------------------------------------------ roofs
def roof(p, x0, w, y_top, ridge_y, eave_y, kind='wslate', seed=0, ridge='clay', verge='coping', vramp='dressed',
         graduated=None, moss=0.1):
    """A pitched E-W roof seen from above in 3/4: short lit back slope, the ridge, and the long front slope. Courses
    run along the eaves; stone slates graduate (small at the ridge, big at the eave). Some slates are chipped."""
    graduated = (kind == 'stoneslate') if graduated is None else graduated
    rnd = random.Random(seed + 31)
    for yy in range(y_top, ridge_y):   # back slope
        rr = ridge_y - yy; row = rr // 4; lr = rr % 4
        for xx in range(x0, x0 + w):
            sl = (xx + row * 7) // 14
            i = 1 if lr else 2
            if lr and hash01(sl, row, seed) < 0.15: i = 0
            if lr == 3 and (xx + row * 7) % 14 == 0: i = 2
            p.r(xx, yy, kind, i)
    for xx in range(x0, x0 + w): p.r(xx, y_top, kind, 3); p.r(xx, y_top + 1, kind, 2)
    y = eave_y; total = eave_y - (ridge_y + 5)
    while y > ridge_y + 5:
        frac = (y - ridge_y) / max(1, total)
        ch = (6 + int(round(7 * frac))) if graduated else 7
        top = max(ridge_y + 5, y - ch)
        x = x0 - rnd.randint(0, 14)
        while x < x0 + w:
            sw = rnd.randint(11, 18) if kind != 'stoneslate' else rnd.randint(12, 24)
            v = rnd.random()
            t = 2 + (0 if v < 0.68 else (1 if v < 0.87 else -1))
            if rnd.random() < 0.04: t = 1
            alt = kind == 'stoneslate' and rnd.random() < 0.16
            chip = rnd.random() < 0.18
            cc = y - top
            for yy in range(top, y):
                for xx in range(max(x, x0), min(x + sw, x0 + w)):
                    lx, ly = xx - x, yy - top
                    if ly == 0: i = t + 2
                    elif ly == 1: i = t + 1
                    elif lx == sw - 1: i = t + 1
                    elif ly == cc - 1: i = t - 1
                    else:
                        i = t
                        # broad, soft tonal drift within a slate (no pixel speckle)
                        if kind == 'stoneslate' and fbm(xx, yy * 2, 6, seed) > 0.68: i = t + 1
                    if lx == 0 and ly == cc - 1: i = t + 1
                    if chip and lx >= sw - 4 and ly >= cc - 2: i = t + 3 if ly == cc - 1 and lx >= sw - 3 else t + 2
                    p.r(xx, yy, 'grit_soot' if alt else kind, i + (1 if alt else 0))
            x += sw
        y = top
    if moss:
        n = int(w * (eave_y - ridge_y) * moss / (40 if kind == 'stoneslate' else 60))
        for k in range(n):
            xx = x0 + 10 + int(rnd.random() * (w - 20))
            low = rnd.random() ** 0.6
            yy = int(ridge_y + 8 + low * (eave_y - ridge_y - 12))
            if kind == 'stoneslate' and rnd.random() < 0.55:
                # crusty lichen rosette: an irregular disc, pale rim, darker core
                rr = rnd.uniform(2.4, 3.8)
                for a in range(-4, 5):
                    for b2 in range(-3, 4):
                        d = math.hypot(a, b2 * 1.4)
                        if d <= rr and hash01(xx + a, yy + b2, 17) > (0.25 if d > rr - 1 else 0):
                            p.r(xx + a, yy + b2, 'lichen', 1 if (d > rr - 1 and a + b2 < 0) else (3 if d < rr * .45 else 2))
            else:
                r = rnd.choice([3, 3, 4, 5, 6])
                for a in range(-r, r + 1):
                    hgt = max(1, int(round(3.2 * math.sqrt(max(0, 1 - (a / (r + .5)) ** 2)))))
                    for b2 in range(hgt):
                        p.r(xx + a, yy - b2, 'moss', (1 if b2 == hgt - 1 else 2) + (a > r // 2) + (hash01(xx + a, b2, 5) < .25))
                    p.shift(xx + a, yy + 1, 2)
    rr_ = {'clay': 'tile_roof', 'stone': vramp, 'slate': kind}[ridge]
    for xx in range(x0, x0 + w):   # ridge
        seg = (xx - x0) % 17
        p.out(xx, ridge_y - 1)
        p.r(xx, ridge_y, rr_, 0 if seg not in (0, 16) else 2)
        p.r(xx, ridge_y + 1, rr_, 0 if seg not in (0, 1, 16) else 2)
        p.r(xx, ridge_y + 2, rr_, 1 if seg != 0 else 3)
        p.r(xx, ridge_y + 3, rr_, 2 if seg != 0 else 3)
        p.r(xx, ridge_y + 4, rr_, 3 if seg != 0 else 4)
        p.r(xx, ridge_y + 5, kind, 5)
        p.r(xx, ridge_y + 6, kind, 4)
    for xx in range(x0, x0 + w):
        p.r(xx, eave_y - 1, kind, 1 if hash01(xx // 3, 1, seed) < 0.7 else 2)
    if verge == 'coping':
        vw = 9
        for side in (0, 1):
            vx = x0 if side == 0 else x0 + w - vw
            for yy in range(y_top, eave_y + 2):
                for k in range(vw):
                    xx = vx + k
                    seam = (yy - y_top) % 17 == 0
                    i = 1 if k < 5 else 2
                    if k == 0 and side == 0: i = 0
                    if k >= vw - 2: i = 3
                    if seam: i = 3
                    p.r(xx, yy, vramp, i)
                if side == 0: p.shift(vx + vw, yy, 2)
                else: p.shift(vx - 1, yy, 1)
            for yy in range(eave_y - 9, eave_y + 4):   # kneeler
                for k in range(-1, vw + 3):
                    xx = vx + k if side == 0 else vx + k - 3
                    p.r(xx, yy, vramp, 0 if yy == eave_y - 9 else (4 if yy >= eave_y + 2 else (1 if k < vw else 2)))
    elif verge == 'barge':
        for side in (0, 1):
            vx = x0 if side == 0 else x0 + w - 4
            for yy in range(y_top, eave_y + 1):
                for k in range(4): p.r(vx + k, yy, 'paint_cream', 1 + k)


def gutter(p, x0, w, y, ramp='paint_black'):
    for xx in range(x0, x0 + w):
        p.r(xx, y, ramp, 0 if (xx - x0) % 23 else 1)
        p.r(xx, y + 1, ramp, 1)
        p.r(xx, y + 2, ramp, 2)
        p.r(xx, y + 3, ramp, 3)
        if (xx - x0) % 36 == 7: p.r(xx, y + 4, ramp, 3); p.r(xx + 1, y + 4, ramp, 3)


def downpipe(p, x, y0, y1, ramp='paint_black'):
    for yy in range(y0, y1):
        p.r(x, yy, ramp, 1); p.r(x + 1, yy, ramp, 0 if yy % 7 else 1); p.r(x + 2, yy, ramp, 2); p.r(x + 3, yy, ramp, 3)
        p.shift(x + 4, yy, 2); p.shift(x + 5, yy, 1)
        if (yy - y0) % 38 == 12:
            for k in range(-1, 5): p.r(x + k, yy, ramp, 0 if k == 0 else 2); p.r(x + k, yy + 1, ramp, 3)
    for k in range(-2, 6):
        for d in range(4): p.r(x + k, y0 + d, ramp, [0, 1, 2, 3][d])
    for k in range(0, 7): p.r(x + k, y1 - 1, ramp, 2); p.r(x + k, y1 - 2, ramp, 1)
    p.r(x + 6, y1 - 3, ramp, 3)


def chimney(p, cx, base_y, w=28, h=60, ramp='grit', pots=2, pot_ramp='tile_roof', seed=0, roof_kind='wslate'):
    """Stone (or brick) stack off the ridge: coursed face, oversailing cap, clay pots with flaunching, lead flashing
    and a violet cast shadow down-right on the roof."""
    x0 = cx - w // 2; top = base_y - h
    for yy in range(base_y - 3, base_y + 14):
        for xx in range(x0 + 4, x0 + w + 10):
            if p.is_(xx, yy, roof_kind, 'grit_soot', 'moss', 'lichen') and xx - x0 - w < (yy - base_y + 9): p.shift(xx, yy, 2)
    if ramp == 'brick':
        brick_wall(p, x0, top + 8, w, h - 8, 'brick', seed)
    else:
        stone_wall(p, x0, top + 8, w, h - 8, ramp, seed, course=(6, 8), block=(8, 16), soot=0.9, rubble=0, base_i=2, tooled=0)
    er = 'brick' if ramp == 'brick' else ramp
    for yy in range(top + 8, base_y):
        p.shift(x0 + w - 1, yy, 2); p.shift(x0 + w - 2, yy, 1); p.shift(x0 + w - 3, yy, 1); p.shift(x0, yy, -1)
        p.r(x0 - 1, yy, er, 4); p.r(x0 + w, yy, er, 5 if er != 'brick' else 4)
    for xx in range(x0 - 2, x0 + w + 2):   # oversailing cap
        p.r(xx, top + 7, 'dressed', 4); p.r(xx, top + 6, 'dressed', 3)
        p.r(xx, top + 5, 'dressed', 1 if xx < x0 + w - 1 else 2)
        for yy in range(top, top + 5): p.r(xx, yy, 'dressed', 0 if yy == top else (1 if xx < x0 + w - 2 else 2))
    for yy in range(top, top + 8): p.r(x0 - 3, yy, 'dressed', 3); p.r(x0 + w + 2, yy, 'dressed', 4)
    for xx in range(x0 - 3, x0 + w + 3): p.r(xx, top - 1, 'dressed', 2)
    for xx in range(x0 - 1, x0 + w + 1):   # lead flashing
        p.r(xx, base_y, 'lead', 1); p.r(xx, base_y + 1, 'lead', 2 if xx < x0 + w - 3 else 3); p.r(xx, base_y + 2, 'lead', 3)
    pw = 7
    for k in range(pots):
        span = w - 6
        px = x0 + 3 + (span * (2 * k + 1)) // (2 * pots) - pw // 2
        ph = 15 + (k % 2) * 4
        for yy in range(top - ph, top):
            for xx in range(px, px + pw):
                i = [1, 0, 0, 1, 2, 3, 4][xx - px]
                if (yy - (top - ph)) == 4: i -= 1
                if (yy - (top - ph)) == 5: i += 1
                p.r(xx, yy, pot_ramp, i)
        for xx in range(px - 1, px + pw + 1):
            p.r(xx, top - ph, pot_ramp, 0 if xx < px + 4 else 2); p.r(xx, top - ph + 1, pot_ramp, 1 if xx < px + 4 else 3)
        for xx in range(px + 1, px + pw - 1): p.out(xx, top - ph - 1)
        p.r(px, top - ph - 1, pot_ramp, 3); p.r(px + pw - 1, top - ph - 1, pot_ramp, 4)
        for xx in range(px - 2, px + pw + 2): p.r(xx, top - 1, 'mortar', 2 if xx < px + pw else 3)


# ------------------------------------------------------------------ windows
def _curtain(p, x, y, w, h, cr, left, tie=0.58):
    for yy in range(y, y + h):
        t = (yy - y) / max(1, h)
        ww = w
        if t > tie - 0.18:
            ww = max(2, int(round(w * (0.55 + 0.45 * min(1, abs(t - tie) / 0.3)))))
        for k in range(ww):
            xx = x + k if left else x + w - 1 - k
            fold = ((k + (0 if left else 1)) % 3 == 2)
            i = 1 + fold + (1 if k == ww - 1 else 0)
            if k == 0: i = 1
            p.r(xx, yy, cr, i)
        if abs(t - tie) < 0.03:
            for k in range(ww): p.r(x + k if left else x + w - 1 - k, yy, 'gold', 2)


def sash(p, x, y, w, h, surround='dressed', curtain='wine', bars='2', paint='white', lit=True, sill=True,
         lintel='plain', seed=0, ornament=None, bar=2):
    """Painted timber sash in a dressed-stone surround. (x, y) = top-left of the opening. bars: '1' (plain),
    '2' (one vertical bar per sash), '4' (2x2 panes per sash), '6' (3x2 per sash)."""
    J, L, S_ = 5, 9, 6
    for yy in range(y - 1, y + h):
        for k in range(J):
            seam = (yy - y) % 16 == 15
            p.r(x - J + k, yy, surround, 3 if seam else [0, 1, 1, 2, 3][k])
            p.r(x + w + k, yy, surround, 3 if seam else [1, 1, 2, 3, 4][k])
    for yy in range(y - L, y - 1):
        for xx in range(x - J - 1, x + w + J + 1):
            i = 0 if yy == y - L else (1 if yy < y - 3 else 2)
            if xx >= x + w + J - 1: i += 1
            p.r(xx, yy, surround, i)
        p.r(x - J - 1, yy, surround, 2)
    for xx in range(x - J - 1, x + w + J + 1): p.r(xx, y - 1, surround, 4)
    if lintel == 'key':
        kx = x + w // 2 - 5
        for yy in range(y - L - 4, y):
            for xx in range(kx, kx + 10):
                p.r(xx, yy, surround, 0 if yy == y - L - 4 else (3 if xx >= kx + 8 else (1 if xx > kx else 0)))
    if sill:
        for xx in range(x - J - 3, x + w + J + 3):
            p.r(xx, y + h, surround, 0); p.r(xx, y + h + 1, surround, 0 if xx < x + w else 1)
            for k in range(2, S_ - 1): p.r(xx, y + h + k, surround, 2)
            p.r(xx, y + h + S_ - 1, surround, 4)
        for xx in range(x - J - 2, x + w + J + 5):
            p.shift(xx, y + h + S_, 2); p.shift(xx, y + h + S_ + 1, 2); p.shift(xx, y + h + S_ + 2, 1)
    mid = y + h // 2
    B = 3
    vb, hb = [], []
    if bars in ('2', '4'): vb = [x + w // 2 - bar // 2]
    if bars == '6': vb = [x + w // 3 - bar // 2, x + 2 * w // 3 - bar // 2]
    if bars in ('4', '6'): hb = [y + (mid - y) // 2, mid + (y + h - mid) // 2]
    cw = max(4, w // 5)
    def isbar(xx, yy):
        return any(b0 <= xx < b0 + bar for b0 in vb) or any(b0 <= yy < b0 + bar for b0 in hb)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            frame = lx < B or lx >= w - B or ly < B or ly >= h - B or mid - 2 <= yy <= mid
            if frame:
                i = 1
                if ly == 0 or lx == 0: i = 3
                elif ly == 1 or lx == 1: i = 2
                elif yy == mid - 2: i = 0
                elif lx == w - 1 or ly == h - 1: i = 2
                elif yy == mid: i = 2
                p.r(xx, yy, paint, i)
            elif isbar(xx, yy):
                p.r(xx, yy, paint, 1 if (xx in vb or yy in hb) else 2)
            else:
                d = lx + ly * 0.85
                i = 3
                if ly < 7 and yy < mid: i = 2
                band_ = d % 19
                if 3 <= band_ < 6 and yy < mid: i = 1
                if 4 <= band_ < 5 and yy < mid and ly < h // 3: i = 0
                if yy > mid and (y + h - yy) < 6: i = 4
                p.r(xx, yy, 'pane', i)
    if curtain:
        _curtain(p, x + B, y + B, cw, h - 2 * B, curtain, True)
        _curtain(p, x + w - B - cw, y + B, cw, h - 2 * B, curtain, False)
        for xx in range(x + B, x + w - B):
            p.r(xx, y + B, curtain, 3); p.r(xx, y + B + 1, curtain, 2)
        for yy in range(y + B, y + h - B):
            for xx in range(x + B, x + w - B):
                if mid - 2 <= yy <= mid:
                    p.r(xx, yy, paint, 0 if yy == mid - 2 else (1 if yy == mid - 1 else 2))
                elif isbar(xx, yy):
                    p.r(xx, yy, paint, 1 if (xx in vb or yy in hb) else 2)
    if ornament: ornament(p, x, y, w, h)
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


def mullion(p, x, y, lights=3, lw=16, h=30, surround='dressed', curtain='cream', seed=0, lit=True, drip=True):
    """Pennine stone-mullioned window: chunky dressed surround, square mullions, leaded lights, a hood-mould."""
    mw, S = 6, 6
    w = lights * lw + (lights - 1) * mw
    for yy in range(y - S, y + h + S):
        for xx in range(x - S, x + w + S):
            if x <= xx < x + w and y <= yy < y + h: continue
            i = 1
            if yy == y - S: i = 0
            if xx >= x + w: i = 2 + (xx >= x + w + S - 2)
            if yy >= y + h: i = 0 if yy == y + h else (2 if yy < y + h + S - 1 else 4)
            if xx == x - S and yy < y + h: i = 0
            if yy == y - 1 and x <= xx < x + w: i = 4
            p.r(xx, yy, surround, i)
    if drip:
        for xx in range(x - S - 4, x + w + S + 4):
            p.r(xx, y - S - 4, surround, 0); p.r(xx, y - S - 3, surround, 1); p.r(xx, y - S - 2, surround, 2)
            p.r(xx, y - S - 1, surround, 4)
        for k in range(6):
            for d in range(3):
                p.r(x - S - 4 + d, y - S - 1 + k, surround, [1, 2, 3][d])
                p.r(x + w + S + 1 + d, y - S - 1 + k, surround, [2, 3, 4][d])
    for xx in range(x - S, x + w + S + 3):
        p.shift(xx, y + h + S, 2); p.shift(xx, y + h + S + 1, 1)
    for k in range(lights):
        lx0 = x + k * (lw + mw)
        if k:
            for yy in range(y, y + h):
                for m in range(mw): p.r(lx0 - mw + m, yy, surround, [0, 1, 1, 1, 2, 3][m])
        for yy in range(y, y + h):
            for xx in range(lx0, lx0 + lw):
                ly, lx = yy - y, xx - lx0
                i = 3
                if ly < 6: i = 2
                if 3 <= ((lx + ly) % 15) < 6 and ly < h // 2: i = 1
                if ly == 0 or lx == 0: i = 4
                p.r(xx, yy, 'pane', i)
                if ly > 0 and lx > 0 and ((lx + ly) % 7 == 0 or (lx - ly) % 7 == 0): p.r(xx, yy, 'lead', 3)
        if curtain and k in (0, lights - 1):
            _curtain(p, lx0 + (1 if k == 0 else lw - 5), y + 1, 4, h - 2, curtain, k == 0)
        if lit:
            for yy in range(y, y + h):
                for xx in range(lx0, lx0 + lw):
                    m = p.m[yy][xx]
                    if m == 'pane': p.glow(xx, yy, rc('glow', 1 if abs(yy - (y + h * 0.55)) < h * 0.25 else 2))
                    elif m == 'lead': p.glow(xx, yy, rc('glow', 4))
                    elif curtain and m == curtain: p.glow(xx, yy, _mix(rc(curtain, p.i[yy][xx]), rc('glow', 2), 0.4))
    if lit: p.lights.append([x + w // 2, y + h // 2, w])
    return (x, y, w, h)


def leaf_blob(p, cx, cy, r, ramp, rnd, s=0):
    """A clump of leaves: a shaded sphere broken into leaf-sized pockets so it reads as clusters, not a ball."""
    for yy in range(int(cy - r - 1), int(cy + r + 2)):
        for xx in range(int(cx - r - 1), int(cx + r + 2)):
            dx, dy = (xx + .5 - cx) / (r + .5), (yy + .5 - cy) / (r + .5)
            d = dx * dx + dy * dy
            if d > 1: continue
            if d > 0.7 and hash01(xx, yy, 71 + s) < 0.35: continue
            l = pix.light(dx, dy, math.sqrt(max(0, 1 - d)))
            i = int(round((1 - l) * 3.4)) + 1
            q = hash01(xx // 2, yy // 2, 44 + s)
            if q < 0.18: i += 1
            if (xx + yy * 2) % 5 == 0 and q > 0.6: i += 1
            p.r(xx, yy, ramp, i)


def bloom(p, x, y, ramp, rnd=None, big=False):
    if big:
        for (a, b2, i) in ((1, 0, 1), (0, 1, 1), (1, 1, 0), (2, 1, 1), (1, 2, 2), (2, 2, 2), (0, 2, 2), (2, 0, 1)):
            p.r(x + a, y + b2, ramp, i)
    else:
        p.r(x, y, ramp, 0); p.r(x + 1, y, ramp, 1); p.r(x, y + 1, ramp, 1); p.r(x + 1, y + 1, ramp, 2)


def window_box(p, x, y, w, ramp='paint_green', flowers=('flower_red', 'flower_wht'), seed=0):
    """Timber box on a sill with a mound of foliage, geranium heads and trailing stems; (x, y) = top-left of box."""
    rnd = random.Random(seed)
    for k in range(w // 4 + 2):
        leaf_blob(p, x + 2 + k * 4 + rnd.randint(-1, 1), y - 2 - rnd.randint(0, 3), rnd.randint(3, 4), 'leaf', rnd, k)
    for k in range(w // 5 + 2):
        bloom(p, x + 2 + rnd.randint(0, w - 5), y - rnd.randint(3, 9), rnd.choice(flowers), rnd, big=rnd.random() < .6)
    for yy in range(y, y + 7):
        for xx in range(x, x + w):
            i = 1 if yy > y else 0
            if yy == y + 1: i = 2
            if yy == y + 6: i = 3
            if xx >= x + w - 2: i = 3
            if xx == x: i = 0
            p.r(xx, yy, ramp, i)
    for k in range(4):
        tx = x + 2 + rnd.randint(0, w - 4)
        for d in range(rnd.randint(3, 8)): p.r(tx + (d > 4), y + 6 + d, 'leaf', 2 + d % 2)
        if rnd.random() < .6: bloom(p, tx, y + 8 + rnd.randint(0, 3), rnd.choice(flowers), rnd)
    for xx in range(x, x + w + 2): p.shift(xx, y + 7, 1)


def climbing_rose(p, x_left, x_right, y_ground, y_top, seed=0, flower='flower_red', flower2='rose_pink'):
    """A rose trained up both door jambs and over the head: stems, leaf clusters and blooms."""
    rnd = random.Random(seed)
    pts = []
    for yy in range(y_ground - 4, y_top, -4): pts.append((x_left - 3 + rnd.randint(-2, 1), yy))
    for xx in range(x_left, x_right, 4): pts.append((xx, y_top - 3 + rnd.randint(-2, 2)))
    for yy in range(y_top, y_ground - 26, 4): pts.append((x_right + 3 + rnd.randint(-1, 2), yy))
    for yy in range(y_top, y_ground):
        p.r(x_left - 3, yy, 'bark', 2 + (yy % 4 == 0)); p.r(x_left - 2, yy, 'bark', 3)
    for (cx, cy) in pts: leaf_blob(p, cx, cy, rnd.randint(3, 5), 'leaf', rnd, cx)
    for (cx, cy) in pts:
        if rnd.random() < 0.6: bloom(p, cx + rnd.randint(-3, 2), cy + rnd.randint(-3, 2), flower, rnd, big=True)
        if rnd.random() < 0.3: bloom(p, cx + rnd.randint(-3, 2), cy + rnd.randint(-3, 2), flower2, rnd, big=rnd.random() < .5)


def ivy(p, x0, y0, w, h, seed=0, lean=1, only=None):
    """Ivy on a wall: a dark leafy mass (depth) covered in overlapping pointed leaves, lit top-left; ragged noise
    edge thinning upward and away from its root side. `only`: ramps it may grow over (keeps windows clear)."""
    rnd = random.Random(seed)
    mask = set()
    for yy in range(y0, y0 + h):
        for xx in range(x0, x0 + w):
            t = (xx - x0) / max(1, w)
            if lean < 0: t = 1 - t
            n = fbm(xx, yy, 13, seed)
            if n + (1 - t) * 0.55 + ((yy - y0) / max(1, h)) * 0.3 < 1.0: continue
            if only and p.m[yy][xx] not in only: continue
            mask.add((xx, yy))
    for (xx, yy) in mask:
        p.r(xx, yy, 'ivy', 4 if hash01(xx, yy, seed) < .7 else 5)
    pts = sorted(mask)
    rnd.shuffle(pts)
    LEAF = [(1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (3, 1), (0, 2), (1, 2), (2, 2), (3, 2), (4, 2), (1, 3), (2, 3), (3, 3), (2, 4)]
    for (lx, ly) in pts[:len(pts) // 5]:
        tone = rnd.choice([1, 1, 2, 2, 2, 3])
        fl = rnd.random() < .5
        for (a2, b2) in LEAF:
            ax = lx + (4 - a2 if fl else a2) - 2; ay = ly + b2 - 2
            if (ax, ay) not in mask: continue
            i = tone
            if b2 <= 1: i = tone - 1
            if b2 >= 3 or (a2 >= 3 and not fl) or (a2 <= 1 and fl): i = tone + 1
            if a2 == 2 and 1 <= b2 <= 3: i = tone + (1 if b2 > 1 else 0)   # midrib
            p.r(ax, ay, 'ivy', i)
    for k in range(7):
        sx = x0 + rnd.randint(0, max(1, w // 2)) if lean > 0 else x0 + w - rnd.randint(0, max(1, w // 2))
        for d in range(rnd.randint(6, 18)):
            if (sx + (d // 5) * lean, y0 + h - d) in mask: p.r(sx + (d // 5) * lean, y0 + h - d, 'bark', 3)


def hanging_basket(p, x, y, seed=0, flowers=('flower_pur', 'flower_red', 'flower_wht'), side=1):
    """Scrolled iron bracket from the wall and a flowering basket; (x, y) = wall fixing point."""
    rnd = random.Random(seed)
    L = 15
    for k in range(L): p.r(x + k * side, y, 'paint_black', 1); p.r(x + k * side, y + 1, 'paint_black', 3)
    for k in range(7): p.r(x + k * side, y + 7 - k, 'paint_black', 2)
    for (a, b2) in ((L - 2, 2), (L - 3, 3), (L - 2, 4), (L - 1, 3)): p.r(x + a * side, y + b2, 'paint_black', 2)
    hx = x + (L - 4) * side
    for k in range(4): p.r(hx - 3 + (k * 2), y + 2 + k, 'paint_black', 3)
    by = y + 12
    for k in range(12):
        leaf_blob(p, hx + rnd.randint(-7, 7), by + rnd.randint(-3, 3), rnd.randint(3, 4), 'leaf', rnd, k)
    for k in range(10): bloom(p, hx - 7 + rnd.randint(0, 13), by - 4 + rnd.randint(0, 8), rnd.choice(flowers), rnd, big=True)
    for k in range(6):
        tx = hx - 6 + rnd.randint(0, 12)
        L2 = rnd.randint(4, 11)
        for d in range(L2): p.r(tx, by + 4 + d, 'leaf', 2 + (d % 2))
        bloom(p, tx - 1, by + 4 + L2 - 2, rnd.choice(flowers), rnd)


# ------------------------------------------------------------------ doors
def door(p, cx, bottom, w=52, h=80, paint='paint_green', surround='dressed', style='panel4', fanlight=True,
         lintel='plain', open_=False, lit=True, knocker=True, step=True, glazed_top=False):
    """Panelled front door in a dressed surround, stone step below. Returns the doorway rect."""
    x = cx - w // 2; y = bottom - h
    fh = 14 if fanlight else 0
    J = 6
    for yy in range(y - fh - 2, bottom):
        for k in range(J):
            seam = (yy - y) % 18 == 17
            p.r(x - J + k, yy, surround, 3 if seam else [0, 1, 1, 1, 2, 3][k])
            p.r(x + w + k, yy, surround, 3 if seam else [1, 1, 2, 2, 3, 4][k])
    ly0 = y - fh - 11
    for yy in range(ly0, y - fh - 1):
        for xx in range(x - J - 2, x + w + J + 2):
            i = 0 if yy == ly0 else (1 if yy < y - fh - 4 else 2)
            if xx >= x + w + J: i += 1
            p.r(xx, yy, surround, i)
    for xx in range(x - J - 2, x + w + J + 2): p.r(xx, y - fh - 2, surround, 4)
    if lintel == 'date':
        for xx in range(cx - 13, cx + 13):
            p.r(xx, ly0 + 2, surround, 3); p.r(xx, ly0 + 7, surround, 0)
        for yy in range(ly0 + 2, ly0 + 8): p.r(cx - 14, yy, surround, 3); p.r(cx + 13, yy, surround, 0)
        p.signs['datestone'] = [cx - 12, ly0 + 3, 24, 4]
    if fanlight:
        fy0 = y - fh - 1
        for yy in range(fy0, y):
            for xx in range(x, x + w):
                lx, ly = xx - x, yy - fy0
                bar = ly <= 1 or ly >= fh - 1 or lx < 2 or lx >= w - 2 or (lx % 9 in (4, 5) and ly > 1)
                if bar: p.r(xx, yy, 'white', (1 if lx % 9 != 5 else 2) if ly > 1 else 3)
                else: p.r(xx, yy, 'pane', 2 if ly < 5 else 3)
        if lit:
            for yy in range(fy0, y):
                for xx in range(x, x + w):
                    if p.m[yy][xx] == 'pane': p.glow(xx, yy, rc('glow', 1 + (yy - fy0) // 5))
            p.lights.append([cx, y - fh // 2, 22])
    if open_:
        fl = bottom - 13
        for yy in range(y, bottom):
            for xx in range(x, x + w):
                lx, ly = xx - x, yy - y
                if yy >= fl:
                    i = 1 + ((xx - cx) * 7 // max(1, (yy - fl + 4)) % 3 == 0)
                    if yy == fl: i = 3
                    p.r(xx, yy, 'wood', i)
                elif yy >= fl - 20:
                    i = 2 if (lx % 12) else 3
                    if yy == fl - 20: i = 1
                    if yy == fl - 19: i = 0
                    p.r(xx, yy, 'wood_dark', i - 1)
                else:
                    d = abs(xx + .5 - cx) / (w * .5) * 0.8 + (yy - y) / h * 0.9
                    p.r(xx, yy, 'glow', 1 if d < .45 else (2 if d < .85 else 3))
        for yy in range(y + 16, y + 30):
            for xx in range(cx - 19, cx - 8): p.r(xx, yy, 'paint_cream', 0 if yy == y + 16 else 1)
        for yy in range(y + 19, y + 28, 3):
            for xx in range(cx - 17, cx - 10): p.r(xx, yy, 'paint_cream', 3)
        for k in range(4):
            sy = fl - 24 + k * 3
            for xx in range(cx + 4, cx + 17): p.r(xx, sy, 'wood', 1); p.r(xx, sy + 1, 'wood', 3)
        for yy in range(fl - 24, fl + 3): p.r(cx + 4, yy, 'wood', 3); p.r(cx + 16, yy, 'wood', 3)
        for yy in range(fl - 38, fl - 24): p.r(cx + 16, yy, 'wood', 2); p.r(cx + 15, yy, 'wood', 3)
        for xx in range(x, x + w): p.shift(xx, y, 2); p.shift(xx, y + 1, 2); p.shift(xx, y + 2, 1)
        for yy in range(y, bottom):
            for k in range(8):
                p.r(x + k, yy, paint, [3, 3, 2, 1, 1, 1, 2, 3][k])
                p.r(x + w - 8 + k, yy, paint, [2, 1, 0, 0, 1, 1, 2, 3][k])
        for yy in range(y + 8, bottom - 6, 16):
            for k in range(3): p.r(x + 3 + k, yy, paint, 0); p.r(x + w - 6 + k, yy, paint, 0)
        p.r(x + 5, y + h // 2, 'gold', 1); p.r(x + 5, y + h // 2 + 1, 'gold', 3)
        p.r(x + w - 6, y + h // 2, 'gold', 0); p.r(x + w - 6, y + h // 2 + 1, 'gold', 2)
        for yy in range(y, bottom):
            for xx in range(x + 8, x + w - 8):
                m = p.m[yy][xx]
                if m == 'glow': p.glow(xx, yy, rc('glow', p.i[yy][xx] - 1))
                elif m in ('wood', 'wood_dark', 'paint_cream'): p.glow(xx, yy, _mix(rc(m, p.i[yy][xx] - 1), rc('glow', 2), 0.35))
        p.lights.append([cx, bottom - h // 2, 60])
    else:
        for yy in range(y, bottom):
            for xx in range(x, x + w):
                lx, ly = xx - x, yy - y
                i = 1 + (1 if hash01(xx, yy // 7, 9) < 0.07 else 0)
                if lx == 0 or ly == 0: i = 4
                elif lx == 1 or ly == 1: i = 3
                elif lx == 2 or ly == 2: i = 2
                elif lx == w - 1: i = 2
                p.r(xx, yy, paint, i)
        if style == 'panel4':
            m_ = 7
            pw = (w - 3 * m_) // 2
            ph1 = int(h * 0.40)
            for col in range(2):
                px0 = x + m_ + col * (pw + m_)
                for (py0, phh) in ((y + m_, ph1), (y + m_ + ph1 + 12, h - ph1 - 12 - m_ - 8)):
                    _panel(p, px0, py0, pw, phh, paint)
                    if glazed_top and py0 == y + m_:
                        for yy in range(py0 + 3, py0 + phh - 3):
                            for xx in range(px0 + 3, px0 + pw - 3):
                                p.r(xx, yy, 'pane', 1 if (xx - px0 + yy - py0) % 13 in (3, 4, 5) and yy < py0 + phh // 2 else 3)
                                if lit: p.glow(xx, yy, rc('glow', 2))
        elif style == 'boarded':
            for xx in range(x + 3, x + w):
                if (xx - x) % 8 == 0:
                    for yy in range(y + 2, bottom): p.r(xx, yy, paint, 3)
                elif (xx - x) % 8 == 1:
                    for yy in range(y + 2, bottom): p.r(xx, yy, paint, 0)
            for yy in (y + 12, bottom - 18):
                for xx in range(x + 3, x + w - 1):
                    p.r(xx, yy, paint, 0); p.r(xx, yy + 1, paint, 1); p.r(xx, yy + 2, paint, 1); p.r(xx, yy + 3, paint, 3)
        mid = y + int(h * 0.40) + 13
        for xx in range(cx - 7, cx + 7):
            p.r(xx, mid, 'gold', 0 if xx < cx - 4 else 1); p.r(xx, mid + 1, 'gold', 2); p.r(xx, mid + 2, 'gold', 3)
        for xx in range(cx - 5, cx + 5): p.r(xx, mid + 1, 'charcoal', 4)
        kx = x + w - 10
        for (a, b2, i) in ((0, 0, 0), (1, 0, 1), (0, 1, 1), (1, 1, 2), (2, 1, 3), (1, 2, 3)): p.r(kx + a, mid - 8 + b2, 'gold', i)
        p.shift(kx + 2, mid - 5, 2)
        if knocker:
            for (a, b2, i) in ((0, 0, 1), (1, 0, 1), (-1, 1, 1), (2, 1, 2), (-1, 2, 2), (2, 2, 3), (0, 3, 2), (1, 3, 3)):
                p.r(cx - 1 + a, y + 14 + b2, 'gold', i)
            p.r(cx - 1, y + 13, 'gold', 0); p.r(cx, y + 13, 'gold', 2)
    if step:
        for xx in range(x - J - 3, x + w + J + 3):
            p.r(xx, bottom - 6, surround, 0); p.r(xx, bottom - 5, surround, 0 if xx < x + w else 1)
            p.r(xx, bottom - 4, surround, 1); p.r(xx, bottom - 3, surround, 2); p.r(xx, bottom - 2, surround, 2)
            p.r(xx, bottom - 1, surround, 4)
            if hash01(xx, 3, 5) < .12: p.r(xx, bottom - 5, surround, 2)
    return (x, y, w, h)


def _panel(p, x, y, w, h, paint):
    """Raised-and-fielded door panel: shadowed top/left moulding, lit bottom/right bevel, a fielded centre."""
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            i = 1
            if ly == 0 or lx == 0: i = 4
            elif ly == 1 or lx == 1: i = 3
            elif ly == h - 1 or lx == w - 1: i = 0
            elif ly == h - 2 or lx == w - 2: i = 1
            elif ly in (2, 3) or lx in (2, 3): i = 2
            elif ly >= h - 4 or lx >= w - 4: i = 0
            p.r(xx, yy, paint, i)


def blank_board(p, x, y, w, h, ground='paint_green', frame='gold', name=None):
    """A framed, painted signboard with NO lettering; registers its lettering rect under `name`."""
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            if lx == 0 or ly == 0 or lx == w - 1 or ly == h - 1: p.r(xx, yy, ground, 4); continue
            if lx == 1 or ly == 1: p.r(xx, yy, frame, 1 if ly == 1 else 2); continue
            if lx == w - 2 or ly == h - 2: p.r(xx, yy, frame, 3); continue
            if lx == 2 or ly == 2: p.r(xx, yy, ground, 3); continue
            i = 1 if ly < 5 else 2
            if hash01(xx, yy, 12) < 0.04: i += 1
            p.r(xx, yy, ground, i)
    for xx in range(x + 1, x + w + 2): p.shift(xx, y + h, 2); p.shift(xx, y + h + 1, 1)
    for yy in range(y + 1, y + h + 1): p.shift(x + w, yy, 2)
    if name: p.signs[name] = [x + 4, y + 4, w - 8, h - 8]
    return (x + 4, y + 4, w - 8, h - 8)


# ------------------------------------------------------------------ little life
def _stamp(p, c, x, y):
    for yy in range(c.h):
        for xx in range(c.w):
            col = c.px[xx, yy]
            if col[3]: p.c(x + xx, y + yy, col)


def cat(p, x, y, fur='hair_ginger', facing=1, stripes=True, white=True):
    """A cat sat upright on a sill, tail hanging over the edge; (x, y) = bottom-left where it sits. Outlined."""
    W_, H_ = 24, 28
    c = Canvas(W_, H_)
    def put(xx, yy, r, i): c.put(xx, yy, rc(r, i))
    for yy in range(11, 25):
        for xx in range(1, 21):
            rx = 6.2 + (yy - 11) * .32
            dx, dy = (xx + .5 - 10.5) / rx, (yy + .5 - 18.5) / 7
            if dx * dx + dy * dy <= 1:
                l = pix.light(dx, dy, math.sqrt(max(0, 1 - dx * dx - dy * dy)))
                i = int(round((1 - l) * 3.2))
                if stripes and (yy % 4 == 0 or (yy % 4 == 1 and xx % 5 == 0)) and 0 < i < 4 and xx < 16: i += 1
                put(xx, yy, fur, i)
    for yy in range(2, 14):
        for xx in range(4, 19):
            dx, dy = (xx + .5 - 11.5) / 6.3, (yy + .5 - 8) / 5.4
            if dx * dx + dy * dy <= 1:
                l = pix.light(dx, dy, math.sqrt(max(0, 1 - dx * dx - dy * dy)))
                i = int(round((1 - l) * 3.2))
                if stripes and yy in (4, 5) and xx in (10, 12) and i < 3: i += 1
                put(xx, yy, fur, i)
    for (ex, s_) in ((6, 1), (16, -1)):
        for k in range(3):
            put(ex, 3 - k, fur, 1 + (k == 2)); put(ex + s_, 4 - k, fur, 1)
        put(ex + s_, 3, 'skin_fair', 2)
    for ex in (8, 14):
        put(ex, 8, 'charcoal', 4); put(ex + 1, 8, 'charcoal', 4); put(ex - 1, 7, 'charcoal', 3); put(ex + 2, 7, 'charcoal', 3)
    put(11, 10, 'skin_fair', 3); put(12, 10, 'skin_fair', 3); put(11, 11, fur, 3)
    if white:
        for (a, b2) in ((10, 12), (11, 12), (12, 12), (13, 12), (10, 13), (11, 13), (12, 13), (11, 14), (12, 14),
                        (7, 24), (8, 24), (9, 24), (13, 24), (14, 24), (15, 24), (8, 23), (14, 23)):
            put(a, b2, 'white', 1 if b2 < 20 else 2)
    for k in range(9):
        put(20 - (k > 6), 17 + k, fur, 2 + (k % 3 == 0)); put(21 - (k > 6), 17 + k, fur, 3)
    put(19, 26, fur, 3); put(20, 26, fur, 3)
    outline(c, OUTLINE)
    if facing < 0: c = c.flip()
    _stamp(p, c, x, y - (H_ - 3))


def bicycle(p, x, y, frame='paint_red'):
    """A step-through bicycle with a wicker basket leaning on the wall, side on; (x, y) = bottom-left at ground."""
    W_, H_ = 60, 40
    c = Canvas(W_, H_)
    def put(xx, yy, col): c.put(int(round(xx)), int(round(yy)), col)
    def line(x0, y0, x1, y1, col, th=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) or 1
        for k in range(n + 1):
            xx = x0 + (x1 - x0) * k / n; yy = y0 + (y1 - y0) * k / n
            for d in range(th): put(xx, yy + d, col)
    def wheel(cx, cy, r):
        for a in range(0, 360, 2):
            t = math.radians(a)
            put(cx + r * math.cos(t), cy + r * math.sin(t), rc('paint_black', 3 if a < 180 else 1))
            put(cx + (r - 1) * math.cos(t), cy + (r - 1) * math.sin(t), rc('paint_black', 2))
            put(cx + (r - 2) * math.cos(t), cy + (r - 2) * math.sin(t), rc('metal', 1 if 180 < a < 300 else 3))
        for a in range(0, 360, 30):
            t = math.radians(a)
            for k in range(2, r - 2): put(cx + k * math.cos(t), cy + k * math.sin(t), rc('metal', 3))
        for (a, b2) in ((0, 0), (1, 0), (0, 1), (1, 1)): put(cx + a - .5, cy + b2 - .5, rc('metal', 0 if a + b2 == 0 else 2))
    wheel(12, 27, 11); wheel(47, 27, 11)
    fr0, fr1, fr2 = rc(frame, 0), rc(frame, 1), rc(frame, 2)
    line(12, 27, 26, 27, fr2, 2); line(26, 27, 38, 12, fr1, 2); line(20, 11, 26, 27, fr1, 2)
    line(12, 27, 20, 12, fr2); line(38, 11, 47, 27, fr1, 2); line(38, 10, 39, 11, fr0)
    line(16, 8, 24, 8, rc('leather', 1), 2); line(15, 10, 24, 10, rc('leather', 3))
    line(20, 10, 20, 12, rc('metal', 2))
    line(38, 11, 37, 5, rc('metal', 2)); line(33, 5, 41, 4, rc('metal', 1)); put(33, 6, rc('paint_black', 2))
    for yy in range(5, 13):
        for xx in range(41, 53):
            put(xx, yy, rc('wood', 0) if yy == 5 else rc('wood', 1 + ((xx + yy) % 2) + (yy > 10)))
    for xx in range(42, 52, 3): put(xx, 4, rc('leaf', 2)); put(xx + 1, 3, rc('flower_yel', 1))
    put(26, 27, rc('metal', 0)); put(27, 28, rc('metal', 1))
    outline(c, OUTLINE)
    _stamp(p, c, x, y - H_ + 1)
    for xx in range(x + 1, x + W_): p.shift(xx, y, 1); p.shift(xx, y - 1, 1)


def milk_bottles(p, x, y, n=2):
    for k in range(n):
        bx = x + k * 6
        for yy in range(y - 11, y):
            nk = yy < y - 8
            for xx in range(bx + (1 if nk else 0), bx + (4 if nk else 5)):
                lx = xx - bx
                p.r(xx, yy, 'white', 0 if lx <= 1 else (1 if lx < 3 else 2))
        for xx in range(bx + 1, bx + 4): p.r(xx, y - 12, 'metal', 0 if xx == bx + 1 else 2)
        for xx in range(bx, bx + 5): p.r(xx, y - 4, 'white', 3)
        for xx in range(bx - 1, bx + 6): p.shift(xx, y, 1)


def plant_pot(p, x, y, seed=0, flower='flower_red', big=False):
    """Terracotta pot with a flowering plant; (x, y) = bottom-left at the ground."""
    rnd = random.Random(seed); w = 14 if big else 10; hh = 11 if big else 8
    for k in range(4 if big else 3):
        leaf_blob(p, x + 2 + k * 3 + rnd.randint(-1, 1), y - hh - 3 - rnd.randint(0, 3), 3 + big, 'leaf', rnd, k)
    for k in range(5 if big else 3):
        bloom(p, x + rnd.randint(0, w - 3), y - hh - 5 - rnd.randint(0, 5), flower, rnd, big=True)
    for yy in range(y - hh, y):
        inset = (yy - (y - hh)) // 4
        for xx in range(x + inset, x + w - inset):
            lx = xx - x
            p.r(xx, yy, 'tile_roof', 0 if lx < 3 else (1 if lx < w - 4 else (2 if lx < w - 2 else 3)))
    for xx in range(x - 1, x + w + 1):
        p.r(xx, y - hh, 'tile_roof', 0 if xx < x + w - 3 else 2); p.r(xx, y - hh + 1, 'tile_roof', 1 if xx < x + w - 3 else 3)
        p.r(xx, y - hh + 2, 'tile_roof', 3)
    for xx in range(x + 1, x + w + 2): p.shift(xx, y, 1)


def lantern(p, cx, y, lit=True):
    """Black coach lantern on a wall bracket; (cx, y) = top of the lantern."""
    for k in range(-5, 6): p.r(cx + k, y + 1, 'paint_black', 1 if k < 1 else 2)
    for k in range(-3, 4): p.r(cx + k, y, 'paint_black', 1)
    p.r(cx, y - 1, 'paint_black', 1); p.r(cx, y - 2, 'paint_black', 2); p.r(cx, y - 3, 'paint_black', 2)
    for yy in range(y + 2, y + 15):
        tp = (yy - y - 2)
        hw = 4 + (1 if 2 < tp < 11 else 0)
        for xx in range(cx - hw, cx + hw + 1):
            edge = xx in (cx - hw, cx + hw) or yy in (y + 2, y + 14) or xx == cx
            if edge: p.r(xx, yy, 'paint_black', 1 if xx < cx else 2)
            else: p.r(xx, yy, 'glow', (1 if abs(xx - cx) < 3 and 4 < tp < 10 else 2)) if lit else p.r(xx, yy, 'pane', 2)
    for xx in range(cx - 4, cx + 5): p.r(xx, y + 15, 'paint_black', 2); p.r(xx, y + 16, 'paint_black', 3)
    p.r(cx, y + 17, 'paint_black', 3); p.r(cx, y + 18, 'paint_black', 3)
    for yy in range(y + 3, y + 14):
        for xx in range(cx - 4, cx + 5):
            if p.m[yy][xx] == 'glow': p.glow(xx, yy, rc('glow', 0 if abs(xx - cx) < 3 and y + 5 < yy < y + 12 else 1))
    p.lights.append([cx, y + 8, 34])


def bunting(p, x0, x1, y, sag=6, seed=0, cols=('paint_red', 'paint_cream', 'paint_blue', 'mustard', 'paint_green')):
    """Cotton bunting on a sagging string: pennants 7 wide, 9 deep, every 13 px, alternating colours."""
    n = max(1, x1 - x0)
    sy = lambda xx: y + int(round(sag * 4 * ((xx - x0) / n) * (1 - (xx - x0) / n)))
    for xx in range(x0, x1): p.r(xx, sy(xx), 'cream', 3)
    k = 0
    for fx in range(x0 + 4, x1 - 7, 13):
        col = cols[k % len(cols)]; k += 1
        top = sy(fx + 3) + 1
        for d in range(9):
            half = 3.5 * (1 - d / 9.0)
            for xx in range(fx, fx + 7):
                if abs(xx + 0.5 - (fx + 3.5)) <= half + 0.01:
                    p.r(xx, top + d, col, 0 if d == 0 else (1 if xx < fx + 4 else 2))


def noticeboard(p, x, y, w=36, h=28, seed=0):
    """Glazed parish noticeboard with coloured notices pinned inside (paper and pins only, no writing)."""
    rnd = random.Random(seed)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            if lx < 3 or ly < 3 or lx >= w - 3 or ly >= h - 3:
                i = 1
                if lx == 0 or ly == 0: i = 0
                if lx >= w - 1 or ly >= h - 1: i = 4
                elif lx >= w - 3 or ly >= h - 3: i = 2
                p.r(xx, yy, 'wood_dark', i)
            else: p.r(xx, yy, 'leather', 2 if hash01(xx, yy, 7) < .5 else 3)
    papers = [('cream', 9, 12), ('flower_yel', 8, 8), ('white', 8, 10), ('flower_blu', 9, 8), ('rose_pink', 7, 7), ('paint_cream', 10, 9)]
    px, row = x + 4, 0
    for k, (r, pw, ph) in enumerate(papers):
        if px + pw > x + w - 4: px = x + 5; row += 1
        py = y + 4 + row * 11 + rnd.randint(0, 1)
        for yy in range(py, min(y + h - 4, py + ph)):
            for xx in range(px, min(x + w - 4, px + pw)):
                ly = yy - py
                p.r(xx, yy, r, 0 if ly < 1 or xx == px else 1)
                if r in ('cream', 'white', 'paint_cream') and ly % 2 == 0 and ly > 2 and 0 < xx - px < pw - 1 - (ly * 3 % 4): p.r(xx, yy, r, 3)
            p.shift(min(x + w - 4, px + pw), yy, 1)
        p.r(px + pw // 2, py, 'paint_red', 1); p.r(px + pw // 2, py + 1, 'paint_red', 3)
        px += pw + 2
    for k in range(6): p.r(x + 4 + k, y + 4 + k, 'white', 0)
    for k in range(3): p.r(x + 12 + k, y + 4 + k, 'white', 0)
    for xx in range(x + 1, x + w + 2): p.shift(xx, y + h, 2); p.shift(xx, y + h + 1, 1)


def figure_silhouette():
    """A Moira-sized stand-in (44 x 92 in a 48 x 96 frame, feet at (24, 93)) for scale in previews only."""
    c = Canvas(48, 96)
    col = (70, 58, 86, 255)
    c.ellipse(24, 10, 8, 7, col)
    c.ellipse(24, 26, 16, 15, col)
    for yy in range(40, 82):
        hw = 13 + (yy - 40) * 8 // 42
        for xx in range(24 - hw, 24 + hw): c.put(xx, yy, col)
    for yy in range(82, 94):
        for xx in list(range(13, 21)) + list(range(27, 35)): c.put(xx, yy, col)
    return c
