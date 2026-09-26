"""Harrowby station at 48 px per tile: the building (closed 2009 / restored), the platform canopy and the
running-in board. All layout is native to pix.TILE = 48."""
from rp import *  # noqa

T = TILE


# ------------------------------------------------------------------ windows and doors

def arch_opening(cx, top, w, spring, bottom):
    """Mask test for a round-headed opening: returns f(x, y)."""
    r = w / 2
    def f(x, y):
        if y >= bottom or x < cx - r or x >= cx + r: return False
        if y >= spring: return True
        dx = (x + 0.5 - cx) / r; dy = (y + 0.5 - spring) / max(1, (spring - top))
        return dx * dx + dy * dy <= 1
    return f


def glass(cv, mask, x0, y0, w, h, grime=0.0, seed=1, lit=False, curtain=None):
    """Window glass: deep blue interior, AO at the top, one clean diagonal sky reflection (two bands)."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if not mask(x, y): continue
            lx, ly = x - x0, y - y0
            i = 3 if ly > 5 else 4
            s = (lx + (h - ly) * 0.55) % 30
            if 5 <= s < 10: i = 1
            elif s in (4, 10) or 13 <= s < 15: i = 2
            if lit:
                col = C('warm_in', 1 + (1 if ly < 5 else 0) + (-1 if i == 1 else 0))
            else:
                col = C('glass_dk', i)
            if grime and i > 2 and ly > h * 0.55 and hash01(x // 3, y // 2, seed) < grime * 0.5: col = C('glass_dk', 2)
            if curtain and (lx < curtain or lx >= w - curtain) and not lit:
                col = C(('wine' if seed % 2 else 'plum'), 2 + (lx % 3 == 0) + (1 if ly < 5 else 0))
            P(cv, x, y, col)


def sash_window(cv, cx, top, w, spring, sill, state='glass', paint='paint_cream', seed=1, peel=0.0, live=False):
    """Round-headed two-over-two sash window: gritstone voussoirs, keystone, projecting sill.
    state: 'glass' | 'boarded' | 'cracked'."""
    r = w // 2; x0 = cx - r
    ring = arch_opening(cx, top - 6, w + 12, spring, sill)
    inner = arch_opening(cx, top, w, spring, sill)
    for y in range(top - 7, sill):
        for x in range(x0 - 6, x0 + w + 6):
            if ring(x, y) and not inner(x, y):
                if y < spring:
                    ang = math.atan2(y + 0.5 - spring, x + 0.5 - cx)
                    kf = (ang + math.pi) / math.pi * 11
                    edge = abs(kf - int(kf) - 0.5) > 0.44
                    d = math.hypot((x + 0.5 - cx) / (r + 6), (y + 0.5 - spring) / (spring - top + 6))
                    i = 3 if edge else (1 if x < cx else 2)
                    if d > 0.95 and not edge: i += 1
                    if d < 0.86 and not edge and x < cx: i -= 1
                else:
                    i = 1 if x < cx else 2
                    if (y - spring) % 18 == 17: i = 3
                    if x in (x0 - 6, x0 + w + 5): i += 1
                P(cv, x, y, C('grit', max(0, i)))
    for y in range(top - 9, top + 4):   # keystone
        for x in range(cx - 4, cx + 5):
            P(cv, x, y, C('grit', 0 if x < cx - 2 else (1 if x < cx + 3 else 3)))
    HL(cv, cx - 4, cx + 5, top + 4, C('grit', 4))
    for y in range(top, sill):          # painted frame
        for x in range(x0, x0 + w):
            if inner(x, y): P(cv, x, y, C(paint, 2 if x > x0 + 1 else 1))
    gx0, gw = x0 + 3, w - 6
    gmask = arch_opening(cx, top + 3, w - 6, spring, sill - 3)
    if state == 'boarded':
        glass(cv, gmask, gx0, top + 3, gw, spring - top, grime=0.5, seed=seed)
        by0 = spring - 4
        for y in range(by0, sill - 1):
            for x in range(x0 - 2, x0 + w + 2):
                ly = y - by0
                i = 1 + (1 if hash01(x // 7, y // 2, seed + 3) < 0.15 else 0)
                if ly == 0: i = 0
                if x >= x0 + w: i = 3
                if (x + ly // 3) % 11 == 0 and hash01(x, y // 4, seed) < 0.6: i += 1   # grain
                if fbm(x, y, 10, seed + 9) < 0.22 and ly > 4: i += 1                   # rain-darkened
                P(cv, x, y, C('plywood', min(4, i)))
        for y in range(by0 + 6, sill - 3, 12):
            for x in (x0 + 2, cx - 1, x0 + w - 4):
                P(cv, x, y, C('iron', 1)); P(cv, x + 1, y, C('iron', 3)); P(cv, x + 1, y + 1, C('rust', 3))
                for q in range(2, 5): dark(cv, x + 1, y + q, 0.12)
        HL(cv, x0 - 2, x0 + w + 2, sill - 1, C('plywood', 4))
        VL(cv, cx + 5, by0 + 1, sill - 1, C('plywood', 3)); VL(cv, cx + 6, by0 + 1, sill - 1, C('plywood', 0))
    else:
        glass(cv, gmask, gx0, top + 3, gw, sill - top - 6, grime=0.35 if not live else 0.0, seed=seed,
              curtain=(5 if live else None))
        mr = spring + 16   # meeting rail
        HL(cv, x0 + 1, x0 + w - 1, mr, C(paint, 0)); HL(cv, x0 + 1, x0 + w - 1, mr + 1, C(paint, 1))
        HL(cv, x0 + 1, x0 + w - 1, mr + 2, C(paint, 2)); HL(cv, x0 + 1, x0 + w - 1, mr + 3, C(paint, 3))
        for y in range(top + 1, sill - 1):
            if gmask(cx, y) or y > spring:
                P(cv, cx - 1, y, C(paint, 1)); P(cv, cx, y, C(paint, 2)); P(cv, cx + 1, y, C(paint, 3))
        HL(cv, x0 + 1, x0 + w - 1, sill - 3, C(paint, 1)); HL(cv, x0 + 1, x0 + w - 1, sill - 2, C(paint, 2))
        if state == 'cracked':
            for (a, b) in [(4, 0), (5, 1), (6, 3), (8, 4), (10, 6), (11, 8), (7, 2), (3, 2), (2, 3), (1, 5), (9, 5)]:
                P(cv, cx + 4 + a, mr + 7 + b, C('white', 0))
        if peel:
            for y in range(top, sill):
                for x in range(x0, x0 + w):
                    if not inner(x, y) or (gmask(x, y) and x not in (cx - 1, cx, cx + 1) and not (mr <= y < mr + 4)): continue
                    if hash01(x // 2, y // 2, seed + 17) < peel: P(cv, x, y, C('wood_dark', 1 + (y % 2)))
        for y in range(top + 3, sill - 3):   # reveal shadow top/right
            for x in range(gx0, gx0 + gw):
                if gmask(x, y) and (not gmask(x, y - 4) or x >= gx0 + gw - 3): dark(cv, x, y, 0.35)
        # sash horns / latch
        P(cv, cx, mr + 1, C('gold', 0)); P(cv, cx + 1, mr + 1, C('gold', 2))
    R(cv, x0 - 8, sill, w + 16, 3, C('grit', 1)); HL(cv, x0 - 8, x0 + w + 8, sill, C('grit', 0))
    R(cv, x0 - 8, sill + 3, w + 16, 3, C('grit', 3)); HL(cv, x0 - 8, x0 + w + 8, sill + 5, C('grit', 4))
    ao_band(cv, x0 - 8, sill + 6, w + 16, (0.35, 0.22, 0.1))


def poster(cv, x0, y0, w, h, faded=False, seed=1, torn=False, scene=0):
    """Framed railway poster: a textless travel-poster landscape (dales, viaduct, sun)."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            u, v = x - x0, y - y0
            i = 2 if 0 < u < w - 1 and 0 < v < h - 1 else 3
            if v == 0 or u == 0: i = 1
            if v == h - 1 or u == w - 1: i = 4
            P(cv, x, y, C('paint_green', i))
    ix, iy, iw, ih = x0 + 3, y0 + 3, w - 6, h - 6
    cream = hexrgb('#eadcb3')
    def put(x, y, col):
        if faded: col = tuple(int(col[i] * 0.55 + cream[i] * 0.45) for i in range(3)) + (255,)
        P(cv, x, y, col)
    for y in range(iy, iy + ih):
        for x in range(ix, ix + iw):
            ly = (y - iy) / ih; lx = (x - ix) / iw
            hill = 0.55 + 0.12 * math.sin(lx * 5 + seed) + 0.05 * math.sin(lx * 13 + seed * 2)
            hill2 = 0.72 + 0.07 * math.sin(lx * 3 + 1 + seed)
            if ly < 0.13 or ly > 0.87: col = C('paint_cream', 1)             # blank title/footer bands
            elif ly > hill2: col = C('grass', 1 if (x + y) % 7 else 2)
            elif ly > hill: col = C('forest', 1 if lx < 0.45 else 2)
            else:
                if scene == 0: col = C('paint_blue', 0 if ly < 0.32 else 1)
                else: col = C('mustard', 0 if ly < 0.36 else 1)
            put(x, y, col)
    sx, sy = ix + int(iw * 0.72), iy + int(ih * 0.3)
    for y in range(sy - 4, sy + 5):
        for x in range(sx - 4, sx + 5):
            if (x - sx) ** 2 + (y - sy) ** 2 <= 16: put(x, y, C('flower_yel', 0 if (x - sx) + (y - sy) < 0 else 1))
    vy = iy + int(ih * 0.6)   # a little stone viaduct
    for x in range(ix + 2, ix + iw - 2):
        put(x, vy, C('grit', 2)); put(x, vy + 1, C('grit', 3))
        if (x - ix) % 7 in (0, 1, 6): put(x, vy + 2, C('grit', 3)); put(x, vy + 3, C('grit', 3)); put(x, vy + 4, C('grit', 4))
    if torn:
        for k in range(8):
            for j in range(8 - k): P(cv, x0 + w - 3 - j, y0 + h - 3 - k, C('paint_cream', 2 if j else 3))
    P(cv, ix + 1, iy + 1, C('white', 0)); P(cv, ix + 2, iy + 1, C('white', 1)); P(cv, ix + 1, iy + 2, C('white', 1))


def panel_doors(cv, x0, y0, w, h, paint='paint_green', seed=1, weathered=0.0, notice=True, chain=True):
    """Pair of four-panel doors with bolection mouldings, brass handles and kick plates."""
    lw = w // 2
    for leaf in range(2):
        lx0 = x0 + leaf * lw
        panels = ((5, 6, lw - 10, h // 2 - 10), (5, h // 2 + 3, lw - 10, h // 2 - 12))
        for y in range(y0, y0 + h):
            for x in range(lx0, lx0 + lw):
                u, v = x - lx0, y - y0
                i = 1 if u < 3 else 2
                if u >= lw - 2: i = 4 if u == lw - 1 else 3
                for (px, py, pw, ph) in panels:
                    if px - 1 <= u <= px + pw and py - 1 <= v <= py + ph:
                        if u in (px - 1,) or v == py - 1: i = 1          # raised moulding, lit
                        elif u == px + pw or v == py + ph: i = 4
                        elif u == px or v == py: i = 3                  # recess in shade
                        else: i = 2 if (v - py) > 2 else 3
                col = C(paint, i)
                if weathered and fbm(x, y, 6, seed) < weathered:
                    col = C('wood_dark', 1 + (1 if hash01(x, y, 3) < 0.3 else 0))
                P(cv, x, y, col)
        # kick plate
        R(cv, lx0 + 3, y0 + h - 7, lw - 6, 4, C('gold', 2)); HL(cv, lx0 + 3, lx0 + lw - 3, y0 + h - 7, C('gold', 1))
    hx = x0 + lw
    VL(cv, hx, y0, y0 + h, C(paint, 4)); VL(cv, hx - 1, y0, y0 + h, C(paint, 3))
    for dy in range(h // 2 - 3, h // 2 + 4):
        P(cv, hx - 4, y0 + dy, C('gold', 1)); P(cv, hx + 3, y0 + dy, C('gold', 2))
    P(cv, hx - 4, y0 + h // 2 - 3, C('gold', 0))
    if chain:
        for k in range(15):
            xx = hx - 7 + k; yy = y0 + h // 2 + 1 + int(2.5 * math.sin(k / 14 * math.pi))
            P(cv, xx, yy, C('metal', 1 if k % 2 else 2)); P(cv, xx, yy + 1, C('metal', 4))
        R(cv, hx - 3, y0 + h // 2 + 5, 7, 7, C('mustard', 2)); HL(cv, hx - 3, hx + 4, y0 + h // 2 + 5, C('mustard', 0))
        VL(cv, hx - 3, y0 + h // 2 + 5, y0 + h // 2 + 12, C('mustard', 1)); VL(cv, hx + 3, y0 + h // 2 + 5, y0 + h // 2 + 12, C('mustard', 3))
        for (a, b) in ((-2, 2), (-2, 3), (-2, 4), (-1, 1), (0, 1), (1, 1), (2, 2), (2, 3), (2, 4)):
            P(cv, hx + a, y0 + h // 2 + b, C('metal', 2))
        P(cv, hx, y0 + h // 2 + 8, C('mustard', 4))
        for k in range(3): P(cv, hx + 1 + k, y0 + h // 2 + 12, C('rust', 2))
    if notice:  # blank paper notice (the game letters "Station temporarily closed · 2009")
        nx, ny = hx + 4, y0 + 10
        R(cv, nx, ny, 24, 17, C('paint_cream', 0)); HL(cv, nx, nx + 24, ny + 16, C('paint_cream', 2))
        VL(cv, nx + 23, ny, ny + 17, C('paint_cream', 2)); P(cv, nx + 23, ny + 16, C('paint_cream', 3))
        for (a, b) in ((1, 1), (22, 1)): P(cv, nx + a, ny + b, C('flower_red', 1)); P(cv, nx + a, ny + b + 1, C('flower_red', 2))
        for k in range(4): P(cv, nx + 20 + k, ny + 16 - k, C('paint_cream', 1)); P(cv, nx + 21 + k, ny + 16 - k, C('paint_cream', 3))
        ao_band(cv, nx + 1, ny + 17, 24, (0.3,))


def valance(cv, x0, x1, y, depth, paint='paint_cream', seed=1, broken=(), bw=6):
    """Timber dagger-board valance: bw-px boards with pointed ends, each shaded as a board (lit left edge)."""
    for x in range(x0, x1):
        k = (x - x0) // bw; u = (x - x0) % bw
        if k in broken: continue
        mid = (bw - 1) / 2
        tip = depth - int(abs(u - mid) * 2 * 0.9)
        for v in range(max(1, tip)):
            i = 1 if u <= 1 else (2 if u < bw - 1 else 3)
            if v >= tip - 1: i += 1
            P(cv, x, y + v, C(paint, min(4, i)))
        if u == bw - 1:
            for v in range(0, max(1, tip) - 1): P(cv, x, y + v, C(paint, 4))
    HL(cv, x0, x1, y, C(paint, 0)); HL(cv, x0, x1, y + 1, C(paint, 1))


def clock(cv, cx, cy, r, h1=-2.2, h2=0.5, rim='iron'):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r + 0.5:
                if d > r - 2.2: P(cv, x, y, C(rim, 0 if (x < cx and y < cy and d > r - 1) else (1 if (x < cx and y < cy) else 3)))
                else: P(cv, x, y, C('paint_cream', 0 if (x - cx) + (y - cy) < -3 else (1 if d < r - 4 else 2)))
    for k in range(12):
        a = k / 12 * 6.283; rr = r - 4.2
        P(cv, cx + math.sin(a) * rr, cy - math.cos(a) * rr, C('iron', 3))
        if k % 3 == 0: P(cv, cx + math.sin(a) * (rr - 1), cy - math.cos(a) * (rr - 1), C('iron', 3))
    for (a, L, wd) in ((h1, r * 0.5, 2), (h2, r * 0.75, 1)):
        for s in range(int(L * 2) + 1):
            t = s / 2; xx, yy = cx + math.sin(a) * t, cy - math.cos(a) * t
            P(cv, xx, yy, C('iron', 4))
            if wd == 2: P(cv, xx + 1, yy, C('iron', 3))
    P(cv, cx, cy, C('paint_red', 2)); P(cv, cx - r * 0.45, cy - r * 0.5, C('white', 0)); P(cv, cx - r * 0.45 + 1, cy - r * 0.5, C('white', 1))


# ------------------------------------------------------------------ the building

W, FH, OV = 14 * T, 6 * T, 36          # 672 x 288 footprint, 36px of chimney above it
H = FH + OV                            # 324
RIDGE, EAVE, PLINTH, BASE = 74, 168, 306, H
DCX = 7 * T                            # door tiles at map cols 18-19 (building x0 = 12): centre x = 336
WINS = [75, 174, 498, 597]
WTOP, WSPR, WSILL = 192, 212, 276
GX0, GX1, GAPEX = DCX - 87, DCX + 87, 96


def station(live=False):
    seed = 11
    cv = Canvas(W, H)
    # ---- main roof: north slope (lit, foreshortened) + south slope
    nmask = lambda x, y: 10 <= x < W - 10
    slates(cv, nmask, 0, OV + 3, W, RIDGE - 3, RIDGE - 3, ch=4, sw=13, base=1, seed=seed, moss=0 if live else 0.55,
           lichen=0 if live else 0.6, fresh=live)
    miss = set() if live else {(12, 5), (13, 5), (33, 9), (41, 12), (40, 12), (22, 3)}
    slates(cv, nmask, 0, RIDGE + 3, W, EAVE, EAVE, ch=6, sw=13, base=2, seed=seed + 1, moss=0.08 if live else 0.3,
           lichen=0.1 if live else 0.8, missing=miss, fresh=live)
    for y in range(RIDGE + 3, EAVE):          # the slope falls off slightly away from the light (right)
        for x in range(10, W - 10):
            if x > W * 0.7 and hash01(x, y, 4) < (x - W * 0.7) / (W * 0.3) * 0.5: dark(cv, x, y, 0.1)
    # ridge tiles (half-round, 21px long)
    for x in range(10, W - 10):
        seg = (x - 10) % 21
        cols = [O, C('slate', 0), C('slate', 1), C('slate', 1), C('slate', 2), C('slate', 3), C('slate', 4), O]
        for k, c in enumerate(cols): P(cv, x, RIDGE - 4 + k, c)
        if seg == 0: VL(cv, x, RIDGE - 3, RIDGE + 3, C('slate', 4))
        elif seg in (1, 2, 3): P(cv, x, RIDGE - 3, C('white', 1)) if seg == 2 else None
    ao_band(cv, 10, RIDGE + 4, W - 20, (0.36, 0.22, 0.12, 0.05))
    # gable-end coping + kneelers
    for (gx, side) in ((0, 0), (W - 10, 1)):
        for y in range(OV + 3, EAVE + 3):
            for x in range(gx, gx + 10):
                u = x - gx
                i = (1 if u < 3 else 2) if side == 0 else (1 if u < 4 else 3)
                if (y - OV) % 19 == 18: i = 3
                if u == (9 if side == 0 else 0): i = 4 if side == 0 else 2
                if hash01(x, y, 9) < 0.04: i += 1
                P(cv, x, y, C('grit', i))
        kx = gx - (0 if side == 0 else 5)
        R(cv, kx, EAVE - 9, 15, 13, C('grit', 1 if side == 0 else 2))
        HL(cv, kx, kx + 15, EAVE - 9, C('grit', 0)); HL(cv, kx, kx + 15, EAVE + 3, C('grit', 4))
        VL(cv, kx + (14 if side == 0 else 0), EAVE - 9, EAVE + 4, C('grit', 3))
    # ---- walls: coursed gritstone
    ashlar(cv, 0, EAVE, W, PLINTH - EAVE, 'grit', seed + 2, ch=12, bmin=16, bmax=32, soot=0 if live else 0.5)
    for k, y in enumerate(range(EAVE + 3, PLINTH, 18)):     # quoins
        L = 24 if k % 2 == 0 else 15
        for (qx, fl) in ((0, 0), (W - L, 1)):
            for yy in range(y, min(y + 18, PLINTH)):
                for xx in range(qx, qx + L):
                    u, v = xx - qx, yy - y
                    i = 1 if fl == 0 else 2
                    if v == 0: i -= 1
                    if v >= 16 or (fl == 0 and u == L - 1) or (fl == 1 and u == 0): i = 3
                    if v == 17: i = 4
                    if hash01(xx, yy, 77) < 0.03: i += 1
                    P(cv, xx, yy, C('grit', max(0, i)))
    ashlar(cv, 0, PLINTH, W, BASE - PLINTH, 'grit', seed + 3, ch=9, bmin=24, bmax=42, base=(2, 3),
           soot=0 if live else 0.7, joint=4)
    HL(cv, 0, W, PLINTH - 2, C('grit', 0)); HL(cv, 0, W, PLINTH - 1, C('grit', 1)); HL(cv, 0, W, PLINTH, C('grit', 3))
    for x in range(0, W):   # sill band
        for k, i in enumerate((0, 1, 1, 2, 3, 4)): P(cv, x, 279 + k, C('grit', i))
    ao_band(cv, 0, 285, W, (0.3, 0.16, 0.06))
    # ---- cross gable over the entrance (stone face, fretted bargeboards, clock)
    def in_gable(x, y):
        if y >= EAVE + 1 or x < GX0 or x >= GX1: return False
        return y >= GAPEX + abs(x + 0.5 - DCX) * (EAVE - GAPEX) / (DCX - GX0)
    def wedge_top(x): return GAPEX - 18 + abs(x + 0.5 - DCX) * (EAVE - GAPEX + 18) / (DCX - GX0 + 3)
    for y in range(GAPEX - 20, EAVE):
        for x in range(GX0 - 3, GX1 + 3):
            if wedge_top(x) <= y and not in_gable(x, y):
                d = wedge_top(x)
                i = (1 if x < DCX else 3) + (1 if (y - int(d)) % 4 == 3 else 0)
                if (x + (y // 4) * 6) % 13 == 0: i += 1
                P(cv, x, y, C('slate', min(4, i)))
    for y in range(GAPEX - 19, GAPEX + 1):
        P(cv, DCX - 2, y, C('slate', 0)); P(cv, DCX - 1, y, C('slate', 1)); P(cv, DCX, y, C('slate', 3)); P(cv, DCX + 1, y, C('slate', 4))
    ashlar(cv, GX0, GAPEX, GX1 - GX0, EAVE - GAPEX + 3, 'grit', seed + 5, ch=12, bmin=16, bmax=30, mask=in_gable,
           soot=0 if live else 0.3)
    bb = 'paint_cream'
    for x in range(GX0 - 5, GX1 + 5):       # bargeboards (8px) with fretted quatrefoil holes and a drip edge
        yt = GAPEX + abs(x + 0.5 - DCX) * (EAVE - GAPEX) / (DCX - GX0) - 3
        for v in range(9):
            i = 0 if v == 0 else (1 if v < 4 else (2 if v < 7 else 3))
            if x > DCX: i += 1
            col = C(bb, min(4, i))
            if not live and hash01(x // 2, int(yt) + v, 5) < 0.18: col = C('wood_dark', 1 + (v > 5))
            P(cv, x, yt + v, col)
        if (x - GX0) % 9 in (4, 5): P(cv, x, yt + 4, C('wood_dark', 3)); P(cv, x, yt + 5, C('wood_dark', 4))
        if (x - GX0) % 9 == 0: P(cv, x, yt + 9, C(bb, 2)); P(cv, x, yt + 10, C(bb, 3))   # drip points
        P(cv, x, yt + 9 + ((x - GX0) % 9 == 0) * 2, C('grit', 4))
    for y in range(GAPEX - 24, GAPEX + 3):  # finial
        P(cv, DCX - 1, y, C(bb, 0)); P(cv, DCX, y, C(bb, 1)); P(cv, DCX + 1, y, C(bb, 3))
    R(cv, DCX - 3, GAPEX - 18, 6, 4, C(bb, 1)); HL(cv, DCX - 3, DCX + 3, GAPEX - 18, C(bb, 0))
    P(cv, DCX, GAPEX - 25, C(bb, 0)); P(cv, DCX, GAPEX - 26, C(bb, 0))
    ccy = 138   # clock roundel in the gable
    for y in range(ccy - 24, ccy + 25):
        for x in range(DCX - 24, DCX + 25):
            d = math.hypot(x + 0.5 - DCX, y + 0.5 - ccy)
            if 18 < d <= 23.5:
                kk = int((math.atan2(y - ccy, x - DCX) + math.pi) / math.pi * 10)
                joint = abs((math.atan2(y - ccy, x - DCX) + math.pi) / math.pi * 10 - kk - 0.5) > 0.44
                i = 3 if joint or d > 23 else (1 if x < DCX - 4 else (2 if x < DCX + 6 else 3))
                P(cv, x, y, C('grit', i))
    clock(cv, DCX, ccy, 18, h1=(-2.2 if not live else 3.6), h2=(0.5 if not live else 0.0))
    if not live:
        for y in range(ccy - 15, ccy + 16):
            for x in range(DCX - 15, DCX + 16):
                if math.hypot(x - DCX, y - ccy) < 15 and fbm(x, y, 6, 91) < 0.3: dark(cv, x, y, 0.16)
    # ---- eaves: cast-iron ogee gutter + brackets + AO
    for x in range(0, W):
        if GX0 + 6 < x < GX1 - 6: continue
        for k, i in enumerate((0, 1, 2, 3, 4)): P(cv, x, EAVE + k, C('iron', i))
        if x % 60 == 30: VL(cv, x, EAVE + 5, EAVE + 9, C('iron', 3)); VL(cv, x + 1, EAVE + 5, EAVE + 9, C('iron', 4))
    ao_band(cv, 0, EAVE + 5, W, (0.46, 0.32, 0.2, 0.1, 0.04), mask=lambda x, y: not (GX0 + 8 < x < GX1 - 8))
    if not live:   # tuft of grass in the gutter
        for k in range(14):
            P(cv, 450 + k, EAVE - 1 - (k % 3), C('moss', 1 + k % 3)); P(cv, 451 + k, EAVE - 2 - (k % 2), C('grass', 2))
            if k % 3 == 0: VL(cv, 452 + k, EAVE - 6 - (k % 4), EAVE - 1, C('grass', 1 + k % 2))
    # ---- windows
    states = ['glass', 'boarded', 'boarded', 'cracked'] if not live else ['glass'] * 4
    for k, cx in enumerate(WINS):
        sash_window(cv, cx, WTOP, 40, WSPR, WSILL, state=states[k], seed=seed + 20 + k, peel=0 if live else 0.12, live=live)
        if not live:
            for s in range(4):
                sx = cx - 16 + int(hash01(k, s, 5) * 32)
                for y in range(WSILL + 6, WSILL + 10 + int(hash01(k, s, 6) * 14)): dark(cv, sx, y, 0.15)
    # ---- entrance: surround, fanlight, doors, step
    dx0, dx1, dtop, dbot = DCX - 33, DCX + 33, 225, 315
    for y in range(dtop - 8, dbot):
        for x in range(dx0 - 8, dx1 + 8):
            if dx0 <= x < dx1 and y >= dtop: continue
            i = 1 if x < DCX else 2
            if y < dtop: i = 0 if y == dtop - 8 else (1 if x < DCX else 2)
            if y == dtop - 1: i = 3
            if x in (dx0 - 1, dx1): i = 3
            if x in (dx0 - 8, dx1 + 7): i += 1
            if y >= dtop and (y - dtop) % 18 == 17 and x not in (dx0 - 1, dx1): i = 3
            P(cv, x, y, C('grit', i))
    glass(cv, lambda x, y: True, dx0 + 1, dtop, 64, 15, grime=0.4 if not live else 0, seed=5, lit=live)
    for x in range(dx0 + 1, dx1 - 1, 9): VL(cv, x, dtop, dtop + 15, C('paint_cream', 2)); VL(cv, x + 1, dtop, dtop + 15, C('paint_cream', 3))
    HL(cv, dx0, dx1, dtop + 15, C('paint_cream', 1)); HL(cv, dx0, dx1, dtop + 16, C('paint_cream', 2)); HL(cv, dx0, dx1, dtop + 17, C('paint_cream', 3))
    panel_doors(cv, dx0, dtop + 18, 66, dbot - dtop - 18, paint='paint_green', seed=9, weathered=0 if live else 0.12,
                notice=not live, chain=not live)
    ao_band(cv, dx0, dtop + 18, 66, (0.38, 0.22, 0.1))
    for y in range(dtop, dbot): dark(cv, dx1 - 1, y, 0.3); dark(cv, dx1 - 2, y, 0.15)
    R(cv, dx0 - 12, dbot, 90, 9, C('grit', 2))   # stone step
    HL(cv, dx0 - 12, dx1 + 12, dbot, C('grit', 0)); HL(cv, dx0 - 12, dx1 + 12, dbot + 1, C('grit', 1))
    HL(cv, dx0 - 12, dx1 + 12, dbot + 8, C('grit', 4))
    for x in range(dx0 - 12, dx1 + 12):
        if hash01(x, 3, 8) < 0.15: P(cv, x, dbot + 4, C('grit', 3))
        if not live and abs(x - DCX) < 20: P(cv, x, dbot + 2, C('grit', 3)); P(cv, x, dbot + 3, C('grit', 2))
    # ---- posters
    poster(cv, 219, 225, 36, 48, faded=not live, seed=2, torn=not live, scene=0)
    poster(cv, 417, 225, 36, 48, faded=not live, seed=5, torn=False, scene=1)
    # ---- entrance awning: leaded roof strip, fascia (blank for "HARROWBY"), dagger valance, iron brackets, lamp
    ax0, ax1 = DCX - 81, DCX + 81
    for y in range(180, 192):
        for x in range(ax0, ax1):
            v = y - 180
            if v < 3: col = C('lead', 0 if v == 0 else 1)
            else:
                i = 2 + (1 if (x - ax0) % 15 == 0 else 0) + (1 if v == 11 else 0) - (1 if v == 3 else 0)
                col = C('slate', i)
            P(cv, x, y, col)
    ao_band(cv, ax0 + 2, 179, ax1 - ax0 - 4, (0.32, 0.2, 0.08), down=False)
    fp = 'paint_green'
    for y in range(192, 210):
        for x in range(ax0, ax1):
            v = y - 192; i = 2
            if v == 0: i = 0
            elif v in (1, 2): i = 1
            elif v >= 16: i = 4 if v == 17 else 3
            elif x in (ax0, ax0 + 1): i = 1
            elif x >= ax1 - 2: i = 4
            col = C(fp, i)
            if not live and hash01(x // 2, y, 12) < 0.05: col = C(fp, 3)
            P(cv, x, y, col)
    SIGN = (ax0 + 9, 195, ax1 - ax0 - 18, 12)     # blank lettering panel
    sx, sy, sw, sh = SIGN
    R(cv, sx, sy, sw, sh, C('paint_cream', 1 if live else 2)); HL(cv, sx, sx + sw, sy, C('paint_cream', 3))
    VL(cv, sx, sy, sy + sh, C('paint_cream', 3)); HL(cv, sx, sx + sw, sy + sh - 1, C('paint_cream', 0))
    if not live:
        for x in range(sx + 1, sx + sw):
            for y in range(sy + 1, sy + sh - 1):
                if fbm(x, y, 7, 44) < 0.18: P(cv, x, y, C('paint_cream', 3))
    valance(cv, ax0, ax1, 210, 11, paint='paint_cream', seed=3, broken=() if live else (6, 17, 18))
    ao_band(cv, ax0, 219, ax1 - ax0, (0.36, 0.24, 0.12), mask=lambda x, y: not (dx0 <= x < dx1 and y >= dtop + 18))
    iron_bracket(cv, ax0 + 3, 210, 22, 25, flip=False)
    iron_bracket(cv, ax1 - 25, 210, 22, 25, flip=True)
    VL(cv, DCX, 221, 227, C('iron', 2))        # hanging lamp
    R(cv, DCX - 5, 227, 11, 3, C('iron', 1)); HL(cv, DCX - 5, DCX + 6, 227, C('iron', 0))
    R(cv, DCX - 4, 230, 9, 9, C('iron', 3))
    R(cv, DCX - 3, 231, 7, 7, C('lamp_glow', 2) if live else C('glass_dk', 2))
    if live: R(cv, DCX - 1, 233, 3, 3, C('lamp_glow', 0))
    P(cv, DCX - 3, 231, C('white', 0)); HL(cv, DCX - 4, DCX + 5, 239, C('iron', 2)); P(cv, DCX, 240, C('iron', 3))
    # ---- drainpipes
    drainpipe(cv, 33, EAVE + 4, PLINTH + 9); drainpipe(cv, W - 39, EAVE + 4, PLINTH + 9)
    # ---- planters by the doors
    half_barrel(cv, dx0 - 36, BASE, seed=4, flowers=('flower_red', 'flower_wht') if live else ('flower_red', 'flower_yel'))
    half_barrel(cv, dx1 + 15, BASE, seed=7, flowers=('flower_pur', 'flower_yel'))
    # ---- ivy up the west corner (kept trimmed once restored)
    top = 200 if live else 158
    ivy_patch(cv, 0, top, 44, BASE - top, seed=60, live=live)
    if not live:
        for k in range(11): leaf_cluster(cv, 42 + k * 6, EAVE + 3 + (k % 2) * 4, 6, 'ivy', 90 + k, 0.7)
    # ---- moss + weeds at the foot of the wall
    for x in range(0, W):
        if fbm(x, 1, 18, 33) > (0.55 if not live else 0.75):
            for y in range(BASE - 4, BASE):
                if hash01(x, y, 34) < 0.6: P(cv, x, y, C('moss', 1 + int(hash01(x, y, 35) * 3)))
    if not live:
        for (wx, h_) in ((144, 13), (156, 9), (558, 12), (540, 7)):
            for k in range(h_):
                P(cv, wx + int(math.sin(k * 0.7) * 2), BASE - 1 - k, C('grass', 2 + (k % 2)))
                if k % 3 == 0: P(cv, wx + 3, BASE - 1 - k, C('leaf', 1)); P(cv, wx - 3, BASE - 2 - k, C('leaf', 2)); P(cv, wx + 2, BASE - 2 - k, C('leaf', 2))
    # ---- chimneys (drawn after the roof; cast shadows onto the slope)
    for cxs in (120, W - 159):
        sw_, top_ = 39, 12
        for y in range(RIDGE, RIDGE + 33):
            for x in range(cxs + sw_, cxs + sw_ + 15 - (y - RIDGE) // 3):
                if opaque(cv, x, y): dark(cv, x, y, 0.3)
        for y in range(top_, RIDGE + 9):
            for x in range(cxs, cxs + sw_):
                u = x - cxs; i = 1 if u < 4 else (2 if u < sw_ - 7 else 3)
                v = (y - top_) % 11
                blk = (x - cxs + (6 if ((y - top_) // 11) % 2 else 0)) // 13
                if v == 10 or ((x - cxs + (6 if ((y - top_) // 11) % 2 else 0)) % 13 == 12): i += 1
                if v == 0 and u < sw_ - 7: i -= 1 if i > 1 else 0
                if hash01(x, y, 21) < 0.04: i += 1
                if not live and y < top_ + 20 and fbm(x, y, 8, 22) < 0.5: i += 1
                P(cv, x, y, C('grit', min(5, i)))
        R(cv, cxs - 3, top_ - 1, sw_ + 6, 6, C('grit', 1)); HL(cv, cxs - 3, cxs + sw_ + 3, top_ - 1, C('grit', 0))
        HL(cv, cxs - 3, cxs + sw_ + 3, top_ + 4, C('grit', 4)); VL(cv, cxs + sw_ + 2, top_, top_ + 5, C('grit', 3))
        ao_band(cv, cxs, top_ + 5, sw_, (0.3, 0.14))
        for yy in (RIDGE + 9, RIDGE + 10, RIDGE + 11):  # lead flashing
            HL(cv, cxs - 2, cxs + sw_ + 2, yy, C('lead', 1 + (yy - RIDGE - 9)))
        for (px_, capped) in ((cxs + 6, False), (cxs + 23, not live)):
            for y in range(top_ - 13, top_ - 1):
                for x in range(px_, px_ + 10):
                    u = x - px_; i = 1 if u < 3 else (2 if u < 7 else 3)
                    if y == top_ - 13: i = 0
                    if y in (top_ - 11,): i += 1
                    P(cv, x, y, C('terracotta', min(4, i)))
            R(cv, px_ - 1, top_ - 15, 12, 2, C('terracotta', 1)); HL(cv, px_ - 1, px_ + 11, top_ - 15, C('terracotta', 0))
            if capped:
                R(cv, px_ - 2, top_ - 19, 14, 3, C('iron', 2)); HL(cv, px_ - 2, px_ + 12, top_ - 19, C('iron', 0))
                for x in (px_ + 1, px_ + 8): VL(cv, x, top_ - 16, top_ - 14, C('iron', 3))
            else: R(cv, px_ + 2, top_ - 15, 6, 1, C('interior', 4))
        outline_where(cv, lambda x, y, cxs=cxs: y < RIDGE - 4 and cxs - 6 <= x <= cxs + sw_ + 6)
    sel_outline(cv, k=0.72, base_rows=[BASE - 1])
    lights = [[DCX, 234, 50]] + ([[cx, 240, 24] for cx in WINS] if live else [])
    info = dict(sign={'fascia': list(SIGN), 'notice': [DCX + 4, dtop + 28, 24, 17] if not live else None},
                lights=lights)
    return cv, info


# ------------------------------------------------------------------ the platform canopy (separate object: fades)

CAN_COLS = 12
CW, CH = CAN_COLS * T, 150


def canopy(live=False):
    cv = Canvas(CW, CH)
    RT, RB = 0, 60
    slates(cv, lambda x, y: True, 0, RT + 4, CW, RB, RB, ch=6, sw=13, base=2, seed=71, moss=0.05 if live else 0.4,
           lichen=0 if live else 0.6, fresh=live, missing=set() if live else {(9, 2), (30, 6)})
    broken = set() if live else {3, 7, 8, 15, 22}
    g0, g1 = RT + 18, RT + 39     # patent glazing band
    for y in range(g0, g1):
        for x in range(6, CW - 6):
            pane = (x - 6) // 24; u = (x - 6) % 24; v = y - g0
            if u in (0, 1, 2):
                P(cv, x, y, C('iron', (0, 1, 3)[u])); continue
            if pane in broken and hash01(pane, v, 3) < (0.9 if v > 4 else 0.2):
                P(cv, x, y, C('interior', 2 + (1 if u > 18 else 0))); continue
            s = (u - v * 0.7) % 18
            i = 1 if 4 < s < 9 else 2
            if v == 0: i = 0
            col = C('glass', i)
            if not live and fbm(x, y, 9, 72) < 0.3: col = C('moss', 3) if hash01(x, y, 73) < 0.4 else C('grit', 2)
            P(cv, x, y, col)
    HL(cv, 6, CW - 6, g0 - 1, C('lead', 1)); HL(cv, 6, CW - 6, g0 - 2, C('lead', 0)); HL(cv, 6, CW - 6, g1, C('lead', 3))
    ao_band(cv, 6, g1 + 1, CW - 12, (0.25, 0.12))
    for x in range(CW):    # far edge: gutter
        P(cv, x, RT, O); P(cv, x, RT + 1, C('iron', 1)); P(cv, x, RT + 2, C('iron', 2)); P(cv, x, RT + 3, C('iron', 4))
    fp = 'paint_green'
    for y in range(RB, RB + 9):   # fascia
        for x in range(CW):
            v = y - RB; i = [0, 1, 1, 2, 2, 2, 3, 3, 4][v]
            col = C(fp, i)
            if not live and hash01(x // 2, y, 74) < 0.06: col = C('wood_dark', 2)
            P(cv, x, y, col)
    valance(cv, 0, CW, RB + 9, 15, paint='paint_cream', seed=5, broken=set() if live else {11, 12, 40, 67, 68, 69})
    cols = [24 + 96 * k for k in range(6)]
    for cx in cols:
        top, bot = RB + 9, CH - 1
        for y in range(top, bot):   # fluted column
            for x in range(cx - 3, cx + 3):
                u = x - (cx - 3); i = [1, 0, 1, 2, 3, 4][u]
                if not live and hash01(x, y // 2, 75) < 0.08: i = min(4, i + 1)
                P(cv, x, y, C('paint_green', i))
            if (y - top) % 14 == 0: HL(cv, cx - 3, cx + 3, y, C('paint_green', 0)); HL(cv, cx - 3, cx + 3, y + 1, C('paint_green', 3))
        R(cv, cx - 6, top, 12, 5, C('paint_green', 1)); HL(cv, cx - 6, cx + 6, top, C('paint_green', 0)); HL(cv, cx - 6, cx + 6, top + 4, C('paint_green', 3))
        for k, (wd, i) in enumerate(((5, 1), (6, 2), (6, 2), (7, 2), (7, 3), (7, 3), (8, 3), (8, 4))):
            HL(cv, cx - wd, cx + wd, bot - 8 + k, C('paint_green', i)); P(cv, cx - wd, bot - 8 + k, C('paint_green', 0))
        HL(cv, cx - 8, cx + 8, bot, O)
        iron_bracket(cv, cx + 3, top, 27, 24, flip=False, rp='paint_green')
        iron_bracket(cv, cx - 30, top, 27, 24, flip=True, rp='paint_green')
    ccx = (cols[2] + cols[3]) // 2    # hanging double-sided clock + two lamps
    VL(cv, ccx, RB + 18, RB + 26, C('iron', 2)); HL(cv, ccx - 3, ccx + 4, RB + 18, C('iron', 1))
    clock(cv, ccx, RB + 40, 14, h1=(-2.2 if not live else 3.2), h2=(0.5 if not live else 5.8))
    for lx in ((cols[0] + cols[1]) // 2, (cols[4] + cols[5]) // 2):
        VL(cv, lx, RB + 18, RB + 30, C('iron', 2))
        R(cv, lx - 6, RB + 30, 13, 3, C('iron', 1)); HL(cv, lx - 6, lx + 7, RB + 30, C('iron', 0))
        R(cv, lx - 5, RB + 33, 11, 12, C('iron', 3))
        R(cv, lx - 4, RB + 34, 9, 10, C('lamp_glow', 2) if live else C('glass_dk', 2))
        if live: R(cv, lx - 1, RB + 37, 3, 4, C('lamp_glow', 0))
        P(cv, lx - 4, RB + 34, C('white', 0)); VL(cv, lx, RB + 34, RB + 44, C('iron', 3))
        R(cv, lx - 5, RB + 45, 11, 2, C('iron', 2)); P(cv, lx, RB + 47, C('iron', 3))
    if not live:
        for k in range(10): P(cv, cols[4] + 5 + k, RB + 10 + (k % 2), C('thatch', 2 + k % 2))
        for k in range(18): P(cv, 450 + (k % 3 == 0), RB + 24 + k, C('ivy', 2 + k % 2))
    sel_outline(cv, k=0.72)
    lights = [[(cols[0] + cols[1]) // 2, RB + 40, 45], [(cols[4] + cols[5]) // 2, RB + 40, 45]] if live else []
    return cv, dict(lights=lights, columns=cols)


# ------------------------------------------------------------------ running-in board (blank; the game letters it)

def running_in(live=False):
    w, h = 3 * T, 81
    cv = Canvas(w, h)
    bh = 36
    for y in range(bh):
        for x in range(w):
            u, v = x, y
            if u < 4 or v < 4 or u >= w - 4 or v >= bh - 4:
                i = 1 if (u < 1 or v < 1) else (4 if (u >= w - 1 or v >= bh - 1) else (2 if (u < 3 or v < 3) else 3))
                P(cv, x, y, C('paint_green', i))
            else:
                i = 1 if v > 4 else 2
                if not live and fbm(x, y, 7, 81) < 0.3: i += 1
                P(cv, x, y, C('paint_cream', i))
    for lx in (21, w - 26):
        for y in range(bh, h):
            for x in range(lx, lx + 5):
                P(cv, x, y, C('paint_green', [0, 1, 2, 3, 4][x - lx]))
        R(cv, lx - 2, h - 5, 9, 5, C('grit', 2)); HL(cv, lx - 2, lx + 7, h - 5, C('grit', 1))
        ao_band(cv, lx, bh, 5, (0.4, 0.2))
    if not live:
        for x in (6, w - 7):
            for yy in (6, 29): P(cv, x, yy, C('rust', 1)); P(cv, x, yy + 1, C('rust', 3))
    sel_outline(cv, k=0.7, base_rows=[h - 1])
    outline(cv)
    return cv, dict(sign={'face': [4, 4, w - 8, bh - 8]})
