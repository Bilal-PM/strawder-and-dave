"""Grass family (48 px tiles): lawn, verge grass, meadow/rough, plus the flower sprites they share.

Layers, bottom to top: a calm ground tone, short blade marks, shared micro tufts (tiny enough that the shared border
band never reads as a lattice), interior tufts, then per-variant flowers/clover. Every tuft is a fan of 1 px blades lit
from the upper left, painted back-to-front by ground y."""
import math
import numpy as np
from tk import *  # noqa: F401,F403

G = 'grass'


# ------------------------------------------------------------------ sprites
def clump(rng, rampn, w, h, nbl, base_i=4, tip_lit=0, tip_dark=2):
    """A tuft: straight 1 px blades from a narrow base, centre tallest, fanning out. Returns (sprite, ax, ay)."""
    W, H = w + 4, h + 3
    a = blank(W, H)
    ax, ay = W // 2, H - 1
    n = len(RAMPS[rampn])
    nbl = max(2, min(nbl, w // 2 + 1))
    bl = []
    for k in range(nbl):
        u = ((k + 0.5) / nbl * 2 - 1) + (rng.random() - 0.5) * 0.25
        hk = max(2, int(round(h * (1 - 0.3 * u * u) * (0.8 + 0.2 * rng.random())))) + 1
        bx = ax + int(round(u * 0.9)); tx = ax + int(round(u * w * 0.5))
        lit = 0.5 - 0.5 * u + (rng.random() - 0.5) * 0.3
        bl.append((lit, bx, tx, hk))
    for lit, bx, tx, hk in sorted(bl):
        tip = tip_lit if lit > 0.6 else (tip_lit + 1 if lit > 0.35 else tip_dark)
        body = base_i - 1 if lit > 0.3 else base_i
        for s in range(hk):
            t = s / max(1, hk - 1)
            x = bx + (tx - bx) * (t ** 1.3)
            if s == 0: idx = base_i
            elif s == hk - 1: idx = tip
            elif s == hk - 2 and hk >= 4: idx = (tip + body + 1) // 2
            else: idx = body
            put(a, round(x), ay - s, rgb(rampn, min(n - 1, idx)), False)
    put(a, ax + 1, ay, rgb(rampn, min(n - 1, base_i + 1)), False)
    if rng.random() < 0.6: put(a, ax + 2, ay, rgb(rampn, min(n - 1, base_i + 1)), False)
    return a, ax, ay


def _spr(rows, pal):
    h, w = len(rows), max(len(r) for r in rows)
    a = blank(w, h)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in pal: put(a, x, y, pal[ch], False)
    return a


def daisy(rng):
    return _spr(['.WW..', 'WwYyw', 'WYyzw', '.wvvs', '..ss.'],
                {'W': rgb('flower_wht', 0), 'w': rgb('flower_wht', 1), 'v': rgb('flower_wht', 2),
                 'Y': rgb('flower_yel', 0), 'y': rgb('flower_yel', 1), 'z': rgb('flower_yel', 2), 's': rgb(G, 4)})


def daisy_small(rng):
    return _spr(['.W.', 'WYw', '.vs'], {'W': rgb('flower_wht', 0), 'w': rgb('flower_wht', 1), 'v': rgb('flower_wht', 2),
                                        'Y': rgb('flower_yel', 1), 's': rgb(G, 4)})


def buttercup(rng):
    return _spr(['.a.', 'aHb', '.bcs', '..g'], {'H': rgb('flower_yel', 0), 'a': rgb('flower_yel', 1),
                                                'b': rgb('flower_yel', 1), 'c': rgb('flower_yel', 2),
                                                's': rgb(G, 4), 'g': rgb(G, 3)})


def clover_patch(rng, n=6, spread=6):
    w = h = spread * 2 + 6
    a = blank(w, h)
    L0, L1, L2, L3 = rgb('leaf', 1), rgb('leaf', 2), rgb('leaf', 3), rgb('leaf', 4)
    for _ in range(n):
        x = int(w / 2 + rng.normal() * spread * 0.45); y = int(h / 2 + rng.normal() * spread * 0.45)
        for (ox, oy) in [(-1, -2), (-2, 0), (1, 0)]:            # three heart-shaped leaflets
            put(a, x + ox, y + oy, L1, False); put(a, x + ox + 1, y + oy, L2, False)
            put(a, x + ox, y + oy + 1, L2, False); put(a, x + ox + 1, y + oy + 1, L3, False)
        put(a, x - 1, y - 2, L0, False); put(a, x - 2, y, L0, False)
        put(a, x + 2, y + 2, rgb(G, 5), False)
    if rng.random() < 0.85:
        x, y = w // 2 + int(rng.integers(-2, 3)), h // 2 + int(rng.integers(-3, 1))
        head = _spr(['.ab.', 'abbc', 'bbcc', '.cc.'], {'a': rgb('flower_wht', 0), 'b': rgb('flower_wht', 1), 'c': rgb('flower_wht', 2)})
        stamp(a, head, x - 2, y - 2, False)
    return a


def wildflower(rng, kind):
    r = {'pur': 'flower_pur', 'red': 'flower_red', 'yel': 'flower_yel', 'blu': 'flower_blu', 'wht': 'flower_wht'}[kind]
    head = {'pur': ['.ab.', 'abbc', '.bc.'], 'red': ['a.b', '.b.', 'b.c'], 'yel': ['.a.', 'abc', '.c.'],
            'blu': ['a.a', '.b.', 'b.c'], 'wht': ['aab', 'abc', '.c.']}[kind]
    spr = _spr(head, {'a': rgb(r, 0), 'b': rgb(r, 1), 'c': rgb(r, 2)})
    hh, hw = spr.shape[:2]
    a = blank(hw + 1, hh + 5)
    stamp(a, spr, 0, 0, False)
    cx = hw // 2
    for y in range(hh, hh + 5): put(a, cx, y, rgb(G, 3 if y < hh + 3 else 4), False)
    put(a, cx + 1, hh + 2, rgb(G, 2), False)
    put(a, cx + 1, hh + 4, rgb(G, 5), False)
    return a


def seedhead(rng):
    a = blank(3, 8)
    for y in range(3, 8): put(a, 1, y, rgb('meadow', 2 if y < 5 else 3), False)
    put(a, 1, 0, rgb('thatch', 0), False); put(a, 0, 1, rgb('thatch', 1), False); put(a, 1, 1, rgb('thatch', 1), False)
    put(a, 1, 2, rgb('thatch', 2), False); put(a, 2, 2, rgb('thatch', 3), False)
    return a


# ------------------------------------------------------------------ layers
def ground_idx(L, mid, n, cells=(8, 4), lo=-1.2, hi=1.2):
    f = L.field(cells)
    idx = np.full((T, T), mid, int); idx[f > hi] = mid - 1; idx[f < lo] = mid + 1
    return np.clip(idx, 0, n - 1)


def marks(img, L, spacing, rampn, bi, p=1.0, lens=(2, 3)):
    """Blade marks: a darker blade body with a lit tip above it, relative to the local tone."""
    n = len(RAMPS[rampn])
    for (x, y, r1, r2, r3, isb) in locked_pts(L, spacing, 0, jit=1.0, ext=(1, lens[1] + 1, 1, 0)):
        if r1 > p: continue
        xi, yi = int(x), int(y); b = bi[yi % T, xi % T]
        ln = lens[0] + int(r2 * (lens[1] - lens[0] + 0.99))
        for s in range(ln):
            v = b + 1 if s == 0 else (b - 2 if (s == ln - 1 and r3 < 0.45) else b - 1)
            dx = (1 if (s == ln - 1 and r2 > 0.85) else 0) - (1 if (s == ln - 1 and r2 < 0.12) else 0)
            put(img, xi + dx, yi - s, rgb(rampn, int(np.clip(v, 0, n - 1))), isb)


def clump_layer(img, L, spacing, sizes, rampf, base_i=4, tip_lit=0, tip_dark=2, nbl=(3, 6), jit=1.0, extra=None,
                skip=None, interior_only=False):
    """Overlapping tufts in painter's order. sizes=(wmin,wmax,hmin,hmax). rampf(point) -> ramp name."""
    wmx, hmx = sizes[1], sizes[3]
    ext = (wmx // 2 + 2, hmx + 2, wmx // 2 + 2, 1)
    pts = periodic_copies(locked_pts(L, spacing, 0, jit=jit, ext=ext), (ext[0] + 2, ext[1] + 9, ext[2] + 2, ext[3] + 1))
    pts.sort(key=lambda p: (p[1], p[0]))
    for p in pts:
        x, y, r1, r2, r3, isb = p
        if skip and skip(p): continue
        if interior_only and not (1 + ext[0] <= x <= T - 2 - ext[2] and 1 + ext[1] <= y <= T - 2 - ext[3]): continue
        rr = np.random.default_rng(int(r2 * 1e7) + int(r3 * 1e3))
        x, y = int(math.floor(x)), int(math.floor(y))
        w = int(sizes[0] + r1 * (sizes[1] - sizes[0] + 0.99)); h = int(sizes[2] + r3 * (sizes[3] - sizes[2] + 0.99))
        spr, ax, ay = clump(rr, rampf(p), w, h, int(nbl[0] + rr.random() * (nbl[1] - nbl[0] + 0.99)), base_i, tip_lit, tip_dark)
        stamp(img, spr, x - ax, y - ay, False)
        if extra:
            e = extra(p, rr)
            if e is not None:
                es, ex, ey = e; stamp(img, es, x + ex, y + ey, False)


def scatter(img, rng, fn, n, lo=9, hi=38):
    for _ in range(n):
        s = fn(rng)
        stamp(img, s, int(rng.integers(lo, hi - s.shape[1] + 1)), int(rng.integers(lo, hi - s.shape[0] + 1)), False)


# ------------------------------------------------------------------ tiles
def grass_tile(v, kind='lawn', seed=11):
    """Ground sits one step darker than the blades (it is the shade between them); blades rise lighter with lit tips."""
    L = Layered(seed, v)
    if kind == 'lawn':
        bi = ground_idx(L, 2, 6, cells=(8, 4), lo=-1.2, hi=1.3)
        img = from_idx(bi, G)
        marks(img, L, 2.3, G, bi, p=0.9, lens=(2, 3))
        clump_layer(img, L, 5.0, (2, 4, 2, 3), lambda p: G, base_i=3, tip_lit=0, tip_dark=1, nbl=(2, 3), skip=lambda p: p[2] > 0.6)
        clump_layer(img, L, 10.0, (4, 6, 3, 5), lambda p: G, base_i=3, tip_lit=0, tip_dark=1, nbl=(3, 4),
                    skip=lambda p: p[2] > 0.6, interior_only=True)
    else:  # verge grass
        bi = ground_idx(L, 3, 6, cells=(8, 4), lo=-1.4, hi=0.9)
        img = from_idx(bi, G)
        marks(img, L, 2.2, G, bi, p=0.95, lens=(2, 4))
        clump_layer(img, L, 4.6, (3, 5, 3, 4), lambda p: G, base_i=3, tip_lit=0, tip_dark=1, nbl=(2, 3), skip=lambda p: p[2] > 0.7)
        clump_layer(img, L, 8.0, (5, 8, 5, 7), lambda p: G, base_i=3, tip_lit=0, tip_dark=1, nbl=(4, 6),
                    skip=lambda p: p[2] > 0.75, interior_only=True)
    return img, L


def lawn_variants():
    """8 lawn variants. 0-2 plain, 3 two small daisies, 4 daisies, 5 clover, 6 buttercups, 7 daisies + clover."""
    out = []
    for v in range(8):
        img, L = grass_tile(v, 'lawn', seed=11)
        rng = np.random.default_rng(500 + v)
        if v in (5, 7):
            c = clover_patch(rng, n=int(rng.integers(6, 10)))
            stamp(img, c, int(rng.integers(8, T - 8 - c.shape[1])), int(rng.integers(8, T - 8 - c.shape[0])), False)
        if v in (4, 7): scatter(img, rng, lambda r: daisy(r) if r.random() < 0.6 else daisy_small(r), int(rng.integers(3, 6)))
        if v == 6: scatter(img, rng, buttercup, int(rng.integers(3, 6)))
        if v == 3: scatter(img, rng, daisy_small, 2)
        out.append(img)
    return out, [3, 3, 3, 2, 1, 1, 1, 0.6]


def grass_variants():
    """Verge grass (the '.' tiles): tuftier and a little wilder than lawn."""
    out = []
    for v in range(8):
        img, L = grass_tile(v, 'grass', seed=23)
        rng = np.random.default_rng(700 + v)
        if v == 5: scatter(img, rng, daisy, int(rng.integers(2, 4)))
        if v == 6:
            c = clover_patch(rng, n=8); stamp(img, c, 12, 12, False)
        if v == 7: scatter(img, rng, buttercup, 4)
        if v == 4: scatter(img, rng, lambda r: wildflower(r, 'wht'), 2)
        out.append(img)
    return out, [3, 3, 3, 3, 1.2, 1, 1, 1]


def meadow_variants():
    """Rough / long grass & pasture: lush and straw clumps interleaved, tall blades, seed heads, wild flowers."""
    out = []
    M = 'meadow'
    for v in range(8):
        L = Layered(37, v)
        dry = L.field((8, 4))
        img = from_idx(ground_idx(L, 4, 6, lo=-1.0, hi=0.5), G)
        rf = lambda p: M if (dry[int(p[1]) % T, int(p[0]) % T] > 0.7 or p[4] < 0.12) else G

        def ex(p, rr):
            if p[2] > 0.9: return seedhead(rr), -1, -9 - int(rr.random() * 3)
            return None
        clump_layer(img, L, 5.2, (6, 10, 7, 11), rf, base_i=4, tip_lit=0, tip_dark=2, nbl=(5, 8), extra=ex)
        rng = np.random.default_rng(900 + v)
        if v >= 3:
            kinds = [['pur', 'pur'], ['yel', 'wht'], ['red', 'red'], ['pur', 'yel', 'wht'], ['blu', 'wht']][v - 3]
            for k in kinds:
                scatter(img, rng, lambda r: wildflower(r, k), int(rng.integers(1, 3)))
        out.append(img)
    return out, [3, 3, 3, 1.4, 1.4, 1, 1.2, 1]
