"""Noise-and-scatter surfaces: tarmac, yard concrete, gravel, hoggin, dirt path, farmyard mud, garden soil, woodland floor.
All edge-locked (see tk.py): any variant sits next to any other."""
import math
import numpy as np
from tk import *  # noqa: F401,F403


def aggregate(idx, L, n, lo=0.06, hi=0.94, vlo=0.018, vhi=0.985):
    w = L.white()
    idx = idx.copy()
    idx[w < lo] -= 1; idx[w < vlo] -= 1; idx[w > hi] += 1; idx[w > vhi] += 1
    return np.clip(idx, 0, n - 1)


# ------------------------------------------------------------------ tarmac
def tarmac_base(v, seed=41, mid=2.1):
    L = Layered(seed, v)
    idx = noise_idx(L, 5, mid, cells=(4, 2), amp=0.22)
    idx = aggregate(idx, L, 5)
    return from_idx(idx, 'tarmac'), idx, L


def crack(img, rng, x, y, steps, dx, dy, ramp='tarmac', dark=4, lit=1, branch=0.25, box=(4, 4, 44, 44)):
    pts = line_walk(rng, x, y, steps, dx, dy, 0.6)
    for k, (px, py) in enumerate(pts):
        if not (box[0] <= px < box[2] and box[1] <= py < box[3]): break
        put(img, px, py, rgb(ramp, dark), False)
        if rng.random() < 0.5: put(img, px, py + 1, rgb(ramp, lit), False)
        if branch and rng.random() < branch * 0.08 and k > 2:
            crack(img, rng, px, py, int(steps * 0.4), dy + rng.normal() * 0.5, -dx + rng.normal() * 0.5, ramp, dark, lit, 0, box)


def tarmac_variants():
    out = []
    for v in range(8):
        img, idx, L = tarmac_base(v)
        rng = np.random.default_rng(1200 + v)
        if v in (4, 7):   # cracks (with a weed in the worst one)
            crack(img, rng, 8 + rng.integers(0, 8), 10 + rng.integers(0, 20), 34, 1, rng.normal() * 0.4)
            if v == 7:
                crack(img, rng, 20, 8, 26, rng.normal() * 0.3, 1)
                for (x, y) in [(24, 22), (25, 21), (23, 21), (25, 22)]: put(img, x, y, rgb('grass', 2 if x < 25 else 3), False)
        if v in (5, 6):   # a patch repair: darker, fresher aggregate, sealed edge
            pw, ph = int(rng.integers(16, 26)), int(rng.integers(12, 20))
            px, py = int(rng.integers(6, T - 6 - pw)), int(rng.integers(6, T - 6 - ph))
            P = Layered(1300, v)
            pidx = aggregate(noise_idx(P, 5, 2.8, cells=(4, 2), amp=0.25), P, 5, lo=0.04, hi=0.96)
            pimg = from_idx(pidx, 'tarmac')
            img[py:py + ph, px:px + pw] = pimg[py:py + ph, px:px + pw]
            for x in range(px - 1, px + pw + 1):
                put(img, x, py - 1, rgb('tarmac', 4), False); put(img, x, py + ph, rgb('tarmac', 1 if x % 3 else 2), False)
            for y in range(py - 1, py + ph + 1):
                put(img, px - 1, y, rgb('tarmac', 4), False); put(img, px + pw, y, rgb('tarmac', 3), False)
        out.append(img)
    return out, [3, 3, 3, 3, 1, 1, 0.8, 0.6]


def drain_grate(img, x, y, w=22, h=12):
    """Cast-iron gully grate in a frame, slots across, NW-lit."""
    M = 'metal'
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            put(img, xx, yy, rgb('paint_black', 2), False)
    for xx in range(x, x + w): put(img, xx, y, rgb('paint_black', 1), False); put(img, xx, y + h - 1, rgb('paint_black', 3), False)
    for yy in range(y, y + h): put(img, x, yy, rgb('paint_black', 1), False); put(img, x + w - 1, yy, rgb('paint_black', 3), False)
    for k in range(x + 2, x + w - 2, 3):          # bars
        for yy in range(y + 2, y + h - 2):
            put(img, k, yy, rgb(M, 3), False); put(img, k + 1, yy, rgb('paint_black', 4), False)
        put(img, k, y + 2, rgb(M, 2), False)
    for xx in range(x + 1, x + w - 1): put(img, xx, y + h // 2, rgb('rust', 3), False)   # cross rib, rusty
    for xx in range(x - 1, x + w + 1): put(img, xx, y + h, rgb('tarmac', 4), False)     # shadowed lip
    for yy in range(y - 1, y + h + 1): put(img, x + w, yy, rgb('tarmac', 4), False)


def manhole(img, cx, cy, r=12):
    """Round cast-iron cover with a raised pattern and a rusty, shadowed rim."""
    M = 'metal'
    for yy in range(int(cy - r - 2), int(cy + r + 3)):
        for xx in range(int(cx - r - 2), int(cx + r + 3)):
            dx, dy = xx + 0.5 - cx, yy + 0.5 - cy; d = math.hypot(dx, dy)
            if d <= r + 1.5:
                if d > r:        # frame ring: lit on the lower right inner wall, shade top left
                    c = rgb('tarmac', 4) if (dx + dy) < 0 else rgb(M, 3)
                elif d > r - 1.2: c = rgb('paint_black', 3)
                else:
                    ring = int(d) % 4 == 0
                    grid = (int(xx - cx + 100) % 4 == 0) != (int(yy - cy + 100) % 4 == 0)
                    lit = (dx + dy) < -r * 0.3
                    base = 1 if lit else 2
                    c = rgb('paint_black', base - 1 if (ring or grid) and lit else (base if not (ring or grid) else base + 1))
                    if (xx * 7 + yy * 3) % 11 == 0: c = rgb('rust', 3)
                put(img, xx, yy, c, False)
    put(img, cx - r * 0.45, cy - r * 0.45, rgb(M, 2), False)
    for k in (-3, 3): put(img, cx + k, cy, rgb('paint_black', 4), False); put(img, cx + k + 1, cy, rgb(M, 3), False)   # lifting keyholes


def tarmac_specials():
    d_n, _, _ = tarmac_base(10); drain_grate(d_n, 13, 4)
    d_s, _, _ = tarmac_base(11); drain_grate(d_s, 13, 31)
    d_w, _, _ = tarmac_base(12)
    # vertical grate against the west edge (drawn horizontally, then turned)
    gg = blank(); drain_grate(gg, 0, 0, 22, 12); gg = rot90(gg[:13, :23], 1)
    for y in range(gg.shape[0]):
        for x in range(gg.shape[1]):
            if gg[y, x, 3]: d_w[12 + y, 4 + x] = gg[y, x]
    d_e = d_w[:, ::-1].copy()
    mh1, _, _ = tarmac_base(13); manhole(mh1, 24, 24, 12)
    mh2, _, _ = tarmac_base(14); manhole(mh2, 22, 25, 9)
    return {'tarmac_drain_N': d_n, 'tarmac_drain_S': d_s, 'tarmac_drain_W': d_w, 'tarmac_drain_E': d_e,
            'tarmac_manhole': mh1, 'tarmac_manhole_small': mh2}


# ------------------------------------------------------------------ concrete
def concrete_variants():
    out = []
    for v in range(8):
        L = Layered(51, v)
        idx = noise_idx(L, 5, 1.1, cells=(8, 4, 2), amp=0.3)
        idx = aggregate(idx, L, 5, lo=0.03, hi=0.95, vlo=0.0, vhi=0.995)
        img = from_idx(idx, 'concrete')
        rng = np.random.default_rng(1500 + v)
        if v == 4:   # oil stain
            cx, cy = 24 + rng.integers(-6, 6), 24 + rng.integers(-6, 6)
            f = Layered(1501, v).field((8, 4))
            for y in range(8, 40):
                for x in range(8, 40):
                    d = math.hypot((x - cx) / 11, (y - cy) / 8) + f[y, x] * 0.18
                    if d < 1: put(img, x, y, rgb('concrete', 3 if d < 0.6 else 2), False)
                    if d < 0.35 and (x + y) % 5 == 0: put(img, x, y, rgb('charcoal', 3), False)
        if v in (5, 7):
            crack(img, rng, 8, 14 + rng.integers(0, 16), 34, 1, rng.normal() * 0.3, ramp='concrete', dark=4, lit=0)
            if v == 7:
                for (x, y, c) in [(25, 24, 2), (24, 23, 1), (26, 23, 3), (25, 22, 1)]: put(img, x, y, rgb('grass', c), False)
        if v == 6:   # rust stain from something once stored here
            for y in range(14, 34):
                for x in range(16, 30):
                    if rng.random() < 0.25 * (1 - abs(x - 23) / 8) and (y - 14) < 20 * rng.random() + 4:
                        put(img, x, y, rgb('rust', 3 if rng.random() < 0.6 else 2), False)
        out.append(img)
    return out, [3, 3, 3, 3, 1, 1, 0.7, 0.7]


# ------------------------------------------------------------------ gravel / hoggin / dirt
def gravel_like(v, seed, ground_ramp, gmid, stones, spacing, rx, p=1.0, tone_sd=0.25, shadow=None, gamp=0.4, speck=0.12):
    L = Layered(seed, v)
    n = len(RAMPS[ground_ramp])
    img = from_idx(noise_idx(L, n, gmid, cells=(4, 2), amp=gamp, speck=speck), ground_ramp)
    sh = shadow or rgb(ground_ramp, n - 1)

    def mk(q, rr):
        rmp = stones[int(q[4] * len(stones)) % len(stones)]
        a = rx[0] + q[2] * (rx[1] - rx[0]) if q[2] <= 1 else rx[0]
        return pebble(rr, rmp, a, a * (0.6 + rr.random() * 0.35), tone=rr.normal() * tone_sd, shadow_idx=sh)
    ext = (int(rx[1]) + 2, int(rx[1] * 2) + 3, int(rx[1]) + 3, 2)
    scatter_sprites(img, L, spacing, mk, ext, p=p)
    return img, L


def gravel_variants():
    """Compound hardstanding: dense grey limestone chippings, a few darker and rust-stained stones."""
    out = []
    for v in range(8):
        img, L = gravel_like(v, 61, 'ballast', 2.6, ['ballast', 'concrete', 'stone', 'ballast'], 3.3, (1.4, 2.6), tone_sd=0.25,
                             shadow=rgb('ballast', 4), gamp=0.3)
        out.append(img)
    return out, [1] * 8


def hoggin_variants():
    """Hoggin: buff, compacted clay-and-gravel footpath with small rounded stones."""
    out = []
    for v in range(8):
        img, L = gravel_like(v, 67, "sand", 1.15, ['sandstone', 'stone', 'dirt'], 4.6, (0.9, 1.9), p=0.7, tone_sd=0.25,
                             shadow=rgb('dirt', 2), gamp=0.3, speck=0.05)
        out.append(img)
    return out, [1] * 8


def dirt_variants():
    """Dirt / earth path: trodden earth, darker compacted patches, pebbles, the odd twig or leaf."""
    out = []
    for v in range(8):
        img, L = gravel_like(v, 73, 'dirt', 1.9, ['stone', 'sandstone', 'dirt'], 6.5, (0.8, 2.0), p=0.55, tone_sd=0.3,
                             shadow=rgb('dirt', 3), gamp=0.33, speck=0.08)
        rng = np.random.default_rng(1700 + v)
        if v in (5, 6):  # a boot print or two, pressed into the path
            for _ in range(2):
                bx, by = int(rng.integers(10, 34)), int(rng.integers(10, 30))
                for yy in range(9):
                    for xx in range(4):
                        if (yy in (0, 8) and xx in (0, 3)) or yy == 5: continue
                        put(img, bx + xx, by + yy, rgb('dirt', 3), False)
                    put(img, bx + 4, by + yy, rgb('dirt', 1), False) if yy not in (0, 5, 8) else None
        if v == 7:  # a twig
            for k, (x, y) in enumerate(line_walk(rng, 12, 20, 18, 1, 0.3, 0.25)):
                put(img, x, y, rgb('bark', 2), False); put(img, x, y + 1, rgb('bark', 4), False)
        out.append(img)
    return out, [3, 3, 3, 3, 2, 1, 1, 1]


# ------------------------------------------------------------------ farmyard mud
def mud_variants():
    out = []
    for v in range(8):
        L = Layered(79, v)
        idx = noise_idx(L, 5, 2.0, cells=(8, 4, 2), amp=0.4, speck=0.08)
        img = from_idx(idx, 'mud')
        # wet sheen where the mud is lowest
        f = L.field((8, 4))
        wet = f < -1.3
        img[wet] = from_idx(np.where(L.white() > 0.5, 3, 4), 'mud')[wet]
        sheen = (f < -1.55) & (L.white() > 0.8)
        img[sheen] = from_idx(np.full((T, T), 0), 'mud')[sheen]
        rng = np.random.default_rng(1900 + v)
        # hoof prints (paired cleaves), straw
        for _ in range(int(rng.integers(1, 4)) if v % 2 == 0 else 0):
            hx, hy = int(rng.integers(8, 36)), int(rng.integers(8, 36))
            for (ox, oy) in [(0, 0), (3, 0)]:
                for yy in range(4):
                    for xx in range(2):
                        put(img, hx + ox + xx, hy + oy + yy, rgb('mud', 4), False)
                put(img, hx + ox, hy + oy + 4, rgb('mud', 1), False); put(img, hx + ox + 1, hy + oy + 4, rgb('mud', 1), False)
        for _ in range(int(rng.integers(2, 7))):
            sx, sy = rng.integers(6, 40), rng.integers(6, 40); ln = int(rng.integers(3, 7)); d = rng.integers(-1, 2)
            for k in range(ln): put(img, sx + k, sy + (k * d) // 3, rgb('thatch', 1 if k < ln // 2 else 2), False)
            put(img, sx, sy + 1, rgb('mud', 4), False)
        if v == 3:   # a small puddle in a hollow: sky reflection, dark wet rim
            puddle_into(img, np.random.default_rng(1999), 22, 24, 13, 7, 'mud')
        out.append(img)
    return out, [2, 2, 2, 1, 2, 2, 2, 2]


# ------------------------------------------------------------------ garden soil
def soil_variants():
    """Garden / veg bed soil: dug rows (ridges every 12 px) shaded from a height field, clods, seedlings."""
    out = []
    for v in range(8):
        L = Layered(89, v)
        yy = YY
        rows = True
        h = (np.sin(yy / 12 * 2 * math.pi) * 1.2 if rows else 0) + L.field((8, 4, 2)) * 0.35
        lit = height_light(h * 1.6)
        idx = np.clip(np.round(2.2 - (lit - FLAT) * 5 - L.field((4, 2)) * 0.35), 0, 4).astype(int)
        img = from_idx(idx, 'mud')
        # clods
        def mk(q, rr):
            return pebble(rr, 'mud', 0.8 + q[2] * 1.0, 0.7 + q[3] * 0.6, tone=rr.normal() * 0.2, lo=0, hi=4, shadow_idx=rgb('mud', 4))
        scatter_sprites(img, L, 6.0, mk, (4, 6, 4, 1), p=0.6)
        rng = np.random.default_rng(2100 + v)
        if v in (2, 3, 4):  # seedlings along the ridges
            for ry in range(3, T, 12):
                for x in range(6, T - 6, int(rng.integers(6, 9))):
                    if rng.random() < 0.8:
                        y = ry + 1
                        put(img, x, y, rgb('leaf', 3), False); put(img, x, y - 1, rgb('leaf', 2), False)
                        put(img, x - 1, y - 2, rgb('leaf', 1), False); put(img, x + 1, y - 2, rgb('leaf', 2), False)
                        if v == 4: put(img, x - 2, y - 3, rgb('leaf', 0), False); put(img, x + 2, y - 3, rgb('leaf', 2), False)
                        put(img, x + 1, y, rgb('mud', 4), False)
        out.append(img)
    return out, [2, 2, 1, 1, 1, 2, 1, 1]


# ------------------------------------------------------------------ woodland floor
LEAF_RAMPS = ['wood', 'rust', 'mustard', 'bark', 'dirt', 'wood_dark']


def leaf(rng):
    rmp = LEAF_RAMPS[int(rng.integers(0, len(LEAF_RAMPS)))]
    ang = rng.random() * math.pi
    L = 2.2 + rng.random() * 1.3; W = 1.1 + rng.random() * 0.5
    s = int(math.ceil(L * 2)) + 2
    a = blank(s, s); c = s / 2
    for y in range(s):
        for x in range(s):
            dx, dy = x + 0.5 - c, y + 0.5 - c
            u = dx * math.cos(ang) + dy * math.sin(ang); w = -dx * math.sin(ang) + dy * math.cos(ang)
            d = (u / L) ** 2 + (w / W) ** 2
            if d <= 1:
                lit = (dx + dy) < -0.5
                put(a, x, y, rgb(rmp, 1 if lit else (2 if d < 0.5 else 3)), False)
    # midrib / shade
    put(a, c, c, rgb(rmp, 3), False)
    return a


def woodland_variants():
    out = []
    for v in range(8):
        L = Layered(97, v)
        img = from_idx(noise_idx(L, 5, 3.0, cells=(8, 4, 2), amp=0.5, speck=0.1), 'mud')
        # moss patches (from the locked field, so they flow across edges)
        mf = L.field((16, 8, 4))
        m1 = mf > (0.9 if v < 6 else 0.3)
        mw = L.white()
        img[m1] = from_idx(np.where(mw > 0.7, 1, np.where(mw > 0.25, 2, 3)), 'leaf')[m1]
        m2 = mf > (1.5 if v < 6 else 0.9)
        img[m2 & (mw > 0.55)] = from_idx(np.full((T, T), 0), 'leaf')[m2 & (mw > 0.55)]
        scatter_sprites(img, L, 3.4, lambda q, rr: leaf(rr), (5, 9, 5, 1), p=0.8 if v < 6 else 0.4)
        rng = np.random.default_rng(2300 + v)
        if v in (3, 4):   # twigs
            for _ in range(2):
                pts = line_walk(rng, rng.integers(10, 20), rng.integers(10, 38), int(rng.integers(10, 20)), 1, rng.normal() * 0.5, 0.3)
                for (x, y) in pts:
                    if 3 <= x < T - 3 and 3 <= y < T - 3:
                        put(img, x, y, rgb('bark', 1), False); put(img, x, y + 1, rgb('bark', 4), False)
        if v == 5:   # a fallen conker-brown beech mast cluster / small mushrooms
            for (x, y) in [(20, 22), (23, 24), (26, 21)]:
                put(img, x, y, rgb('cream', 1), False); put(img, x + 1, y, rgb('cream', 2), False)
                put(img, x - 1, y, rgb('cream', 0), False); put(img, x, y + 1, rgb('cream', 3), False); put(img, x + 1, y + 1, rgb('mud', 4), False)
        out.append(img)
    return out, [2, 2, 2, 1, 1, 0.6, 1.5, 1.5]


def puddle_into(img, rng, cx, cy, rx, ry, rim_ramp, rim_idx=4):
    """An irregular puddle drawn into a tile: dark wet rim, deep water at the top edge (shaded by the bank, NW light),
    pale sky reflection lower down, a glint."""
    f = [1 + (rng.random() - 0.5) * 0.4 for _ in range(7)]
    for y in range(int(cy - ry - 2), int(cy + ry + 3)):
        for x in range(int(cx - rx - 2), int(cx + rx + 3)):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            ang = (math.atan2(dy, dx) / (2 * math.pi) * 7) % 7; k = int(ang); t = ang - k
            r = f[k] * (1 - t) + f[(k + 1) % 7] * t
            d = (dx * dx + dy * dy) / (r * r)
            if d < 1:
                c = 'water'
                i = 4 if dy < -0.45 else (3 if dy < 0.2 else 2)
                if d > 0.75 and dy < 0: i = 5
                put(img, x, y, rgb(c, i), False)
            elif d < 1.45:
                put(img, x, y, rgb(rim_ramp, rim_idx if d < 1.2 else rim_idx - 1), False)
    for k in range(3): put(img, cx - rx * 0.3 + k, cy + ry * 0.25, rgb('water', 0), False)
    put(img, cx + rx * 0.35, cy - ry * 0.05, rgb('water', 0), False)
