"""Harrowby village hall (1911), 28x14 tiles at 48 art px per tile: herringbone parquet with faded court lines,
cream plaster over oak wainscot, tall sash windows, a stage with velvet drapes and a blank banner, bunting, tea urn,
noticeboard, the funding-panel table (panel state), rows of chairs, stacked chairs and an upright piano."""
from ilib import *
import shed as SH

T = TILE
TW, TH = 28, 14
W, H = TW * T, TH * T
WALL_H = 2 * T
EXIT_X = 12 * T
SEED = 1911 + 7
WINDOWS = [3, 24]
BUNT = ['paint_red', 'mustard', 'paint_blue', 'enamel_g', 'white', 'plum']


# ------------------------------------------------------------------ floor
def floor():
    cv = Canvas(W, H); px = cv.px
    pq = [C('parquet', i) for i in range(6)]
    BL, BW = 18, 6          # herringbone block length / width
    for y in range(H):
        for x in range(W):
            band = (x // BL) % 2
            q = x % BL
            s_ = (y + (q if band == 0 else BL - 1 - q))
            a, b = s_ // BW, x // BL
            lx, ly = s_ % BW, q
            tone = hash01(a, b, SEED)
            i = 2
            if tone > 0.8: i = 1
            elif tone < 0.18: i = 3
            if lx == 0: i = 3 if i < 3 else 4                    # joint between blocks
            elif lx == 1 and i > 1: i -= 1                       # lit edge
            if q == 0 and band == 0: i = 3
            if (ly * 5 + lx * 3 + a) % 13 == 0 and lx > 1: i = min(4, i + 1)   # grain flecks
            aisle = abs(x - (14 * T)) < 70 and y > 5 * T         # polished down the middle aisle
            if aisle and hash01(x, y, 3) < 0.35 and i > 1: i -= 1
            px[x, y] = pq[i]
    # faded badminton court lines (it's a village hall, of course)
    cx0, cy0, cx1, cy1 = 3 * T - 10, 4 * T + 20, 25 * T + 10, 12 * T + 20
    def line(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if fbm(x, y, 7, 5, 2) > 0.34 and hash01(x, y, 6) > 0.1: cv.put(x, y, C('mustard', 1)[:3] + (150,))
    for (x0, y0, x1, y1) in ((cx0, cy0, cx1, cy0 + 2), (cx0, cy1, cx1, cy1 + 2), (cx0, cy0, cx0 + 2, cy1), (cx1 - 2, cy0, cx1, cy1),
                             ((cx0 + cx1) // 2 - 1, cy0, (cx0 + cx1) // 2 + 1, cy1), (cx0, (cy0 + cy1) // 2, cx1, (cy0 + cy1) // 2 + 1)):
        line(x0, y0, x1, y1)
    # a rug in front of the stage (worn, fringed) where the panel sits
    rx0, ry0, rw, rh = 9 * T - 8, 3 * T + 4, 10 * T + 16, 2 * T - 8
    for y in range(ry0, ry0 + rh):
        for x in range(rx0, rx0 + rw):
            ex = min(x - rx0, rx0 + rw - 1 - x); ey = min(y - ry0, ry0 + rh - 1 - y)
            c = C('wine', 2)
            if ex < 4 or ey < 4: c = C('mustard', 2) if (ex + ey) % 2 else C('mustard', 3)
            elif ex < 8 or ey < 8: c = C('wine', 3)
            elif ex > 12 and ey > 12 and ((x - rx0) % 24 in (0, 1) and (y - ry0) % 24 in (11, 12) or (y - ry0) % 24 in (0,) and (x - rx0) % 24 == 12): c = C('mustard', 3)
            if hash01(x, y, 9) < 0.05: c = darker(c, 0.9)
            cv.put(x, y, c)
    for x in range(rx0, rx0 + rw, 3):
        cv.put(x, ry0 + rh, C('cream', 2)); cv.put(x, ry0 + rh + 1, C('cream', 3))
    hl(cv, rx0 + 2, ry0 + rh + 2, rw - 2, SHADOW[:3] + (80,))
    for y in range(WALL_H, WALL_H + 18):
        a = int(110 * (1 - (y - WALL_H) / 18) ** 1.7)
        for x in range(W): cv.put(x, y, SHADOW[:3] + (a,))
    for d in range(12):
        a = int(80 * (1 - d / 12) ** 1.7)
        for y in range(WALL_H, H): cv.put(T + d, y, SHADOW[:3] + (a,)); cv.put(W - T - 1 - d, y, SHADOW[:3] + (a,))
    for y in range(H - T - 12, H - T):
        a = int(60 * ((y - (H - T - 12)) / 12) ** 1.6)
        for x in range(W): cv.put(x, y, SHADOW[:3] + (a,))
    SH.mat(cv, EXIT_X + 4, 12 * T + 8, 2 * T - 8, 34)
    SH.spill(cv, EXIT_X, H - T, 2 * T, reach=120, alpha=56)
    return cv


# ------------------------------------------------------------------ walls
def sash_window(cv, x0, y0, w, h):
    cv.rect(x0 - 5, y0 - 5, w + 10, h + 8, C('white', 2)); hl(cv, x0 - 5, y0 - 5, w + 10, C('white', 0)); vl(cv, x0 - 5, y0 - 5, h + 8, C('white', 1)); vl(cv, x0 + w + 4, y0 - 5, h + 8, C('white', 3))
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            t = (y - y0) / h
            c = C('daylight', 0 if t < 0.4 else 1)
            hill = 0.58 + (fbm(x, 0, 14, 21, 2) - 0.5) * 0.25
            if t > hill: c = C('hills', 1 if t < hill + 0.1 else 2)
            if t > 0.85: c = C('stone', 2) if (x // 6 + y // 3) % 2 else C('stone', 3)   # the wall across the lane
            gx, gy = (x - x0) % 16, (y - y0) % 12
            if gx == 0 or gy == 0: c = C('white', 2)
            elif (gx == 1 or gy == 1) and t < 0.5: c = mix(c, C('white', 0), 0.5)
            cv.put(x, y, c)
    my = y0 + h // 2   # the meeting rail
    hl(cv, x0, my, w, C('white', 1)); hl(cv, x0, my + 1, w, C('white', 3)); hl(cv, x0, my + 2, w, SHADOW[:3] + (80,))
    cv.rect(x0 - 8, y0 + h + 2, w + 16, 5, C('oak', 1)); hl(cv, x0 - 8, y0 + h + 2, w + 16, C('oak', 0)); hl(cv, x0 - 8, y0 + h + 6, w + 16, C('oak', 3))
    hl(cv, x0 - 7, y0 + h + 7, w + 14, SHADOW[:3] + (110,))
    # a geranium on the sill
    cyl_v(cv, x0 + 6, y0 + h - 8, 10, 10, 'terracotta', 0, 4)
    for k in range(10):
        lx = x0 + 11 + int((hash01(k, 1, x0) - 0.5) * 16); ly = y0 + h - 12 - int(hash01(k, 2, x0) * 8)
        cv.ellipse(lx, ly, 3, 2, C('plant', 2 if k % 2 else 3))
    for k in range(5): cv.ellipse(x0 + 7 + k * 3, y0 + h - 20 + (k % 2) * 3, 2, 2, C('flower_red', k % 2))


def radiator(cv, x0, y0, w, h):
    cv.rect(x0 + 2, y0 + 2, w, h, SHADOW[:3] + (90,))
    for x in range(x0, x0 + w):
        k = (x - x0) % 6
        c = C('paint_cream', 1 if k in (1, 2) else 2 if k == 3 else 3 if k == 4 else 4)
        vl(cv, x, y0 + 2, h - 4, c)
    hl(cv, x0, y0, w, C('paint_cream', 1)); hl(cv, x0, y0 + 1, w, C('paint_cream', 2)); hl(cv, x0, y0 + h - 2, w, C('paint_cream', 3)); hl(cv, x0, y0 + h - 1, w, C('paint_cream', 4))
    cv.rect(x0 - 5, y0 + h - 6, 5, 3, C('metal', 2)); cv.put(x0 - 3, y0 + h - 8, C('metal', 1))


def walls():
    cv = Canvas(W, H)
    for y in range(0, WALL_H):
        for x in range(W):
            if y < 6: c = C('oak', 5 if y < 4 else 4)
            elif y < 10: c = C('plaster', 0 if y == 6 else 1)       # cornice
            elif y < 56:
                c = C('plaster', 1 if (y > 12 or hash01(x, y, 3) > 0.5) else 2)
                if hash01(x, y, 5) < 0.02: c = C('plaster', 2)
                if y == 18: c = C('oak', 2)                           # picture rail
                if y == 19: c = C('oak', 4)
            elif y < 60: c = C('oak', 0 if y == 56 else 1 if y == 57 else 3)   # dado rail
            elif y < WALL_H - 8:
                px_ = (x % 64)
                c = C('oak', 2)
                if px_ in (0, 1): c = C('oak', 4)
                elif px_ in (6, 57) or y in (64, WALL_H - 13): c = C('oak', 3) if px_ in (6,) or y == 64 else C('oak', 1)
                elif 7 <= px_ <= 56 and 65 <= y <= WALL_H - 14: c = C('oak', 2) if (x + y * 3) % 17 else C('oak', 3)
            else: c = C('oak', 4 if y < WALL_H - 1 else 5)             # skirting
            cv.put(x, y, c)
    for wc in WINDOWS:
        sash_window(cv, wc * T + 12, 14, 2 * T - 24, 38)
        radiator(cv, wc * T + 16, 64, 2 * T - 32, 22)
    # velvet drapes and a pelmet framing the stage, with a blank banner above it
    sx0, sx1 = 9 * T, 19 * T
    for (dx0, lit) in ((sx0 - 18, True), (sx1 - 6, False)):
        for y in range(8, WALL_H):
            for x in range(dx0, dx0 + 26):
                k = (x - dx0) % 8
                i = [1, 1, 2, 2, 3, 3, 2, 1][k] + (0 if lit else 1)
                if y > WALL_H - 18 and (x - dx0) % 8 in (3, 4): i += 1
                cv.put(x, y, C('velvet', min(4, i)))
        for x in range(dx0, dx0 + 26): cv.put(x, 36 + ((x - dx0) // 4) % 2, C('gold', 2))   # tie-back
    for y in range(6, 20):
        for x in range(sx0 - 20, sx1 + 22):
            c = C('velvet', 2 if y < 16 else 3)
            if y == 6: c = C('velvet', 1)
            if y >= 17: c = C('gold', 1 if (x // 2) % 2 else 2) if y < 19 else C('gold', 3)
            cv.put(x, y, c)
    bx0, by0, bw, bh = 10 * T + 8, 24, 10 * T - 16, 26   # banner: cream cloth, red border, cords (blank)
    for (cx_) in (bx0 + 6, bx0 + bw - 6):
        for y in range(20, by0): cv.put(cx_, y, C('tweed', 3))
    for y in range(by0, by0 + bh):
        sag = 0
        for x in range(bx0, bx0 + bw):
            c = C('paint_cream', 1)
            if y - by0 < 3 or by0 + bh - 1 - y < 3: c = C('paint_red', 2)
            elif y - by0 == 3: c = C('paint_cream', 0)
            if x - bx0 < 2 or bx0 + bw - 1 - x < 2: c = C('paint_red', 3)
            if 3 < y - by0 < bh - 3 and (x - bx0) % 56 == 28: c = C('paint_cream', 2)   # soft folds
            if 3 < y - by0 < bh - 3 and (x - bx0) % 56 == 29: c = C('paint_cream', 0)
            cv.put(x, y, c)
    hl(cv, bx0 + 2, by0 + bh, bw - 2, SHADOW[:3] + (100,))
    # honours board (gilt border, blank) and a clock
    hx0 = 6 * T
    cv.rect(hx0 + 3, 25, 84, 30, SHADOW[:3] + (100,)); cv.rect(hx0, 22, 84, 30, OUTLINE)
    cv.rect(hx0 + 1, 23, 82, 28, C('oak', 4)); frame(cv, hx0 + 3, 25, 78, 24, C('gold', 2)); hl(cv, hx0 + 3, 25, 78, C('gold', 0))
    for ly in (31, 36, 41, 46): hl(cv, hx0 + 8, ly, 68, C('oak', 3))
    cv.ellipse(hx0 + 42, 22, 9, 4, C('oak', 3)); cv.ellipse(hx0 + 42, 21, 7, 3, C('gold', 2))
    SH.clock(cv, 21 * T + 24, 34, r=12)
    # a framed picture of the fells
    fx0 = 22 * T + 6
    cv.rect(fx0 + 2, 26, 36, 26, SHADOW[:3] + (90,)); cv.rect(fx0, 24, 36, 26, C('gold', 3)); frame(cv, fx0, 24, 36, 26, C('gold', 1))
    for y in range(27, 47):
        for x in range(fx0 + 3, fx0 + 33):
            t = (y - 27) / 20
            c = C('daylight', 1) if t < 0.45 else C('hills', 1 + (t > 0.7) + (fbm(x, y, 5, 3) > 0.6))
            cv.put(x, y, c)
    side(cv, 0, True); side(cv, W - T, False)
    south(cv)
    return cv


def side(cv, x0, lit):
    """Side wall top seen from above: painted plaster cap with an oak edge on the room side."""
    for y in range(0, H):
        for x in range(x0, x0 + T):
            local = x - x0; inner = (T - 1 - local) if lit else local
            if 6 <= y < WALL_H and inner > 7: continue
            c = C('oak', 4) if (local + y // 40) % 9 else C('oak', 5)
            if inner in (9, 10): c = C('oak', 3)
            if inner == 0: c = C('oak', 1 if lit else 3)
            elif inner == 1: c = C('oak', 2 if lit else 4)
            elif inner < 8: c = C('plaster', 2 if lit else 3) if y % 64 else C('oak', 3)
            elif inner == 8: c = C('oak', 4)
            cv.put(x, y, c)


def south(cv):
    y0 = H - T
    for y in range(y0, H):
        for x in range(W):
            if EXIT_X <= x < EXIT_X + 2 * T: continue
            ly = y - y0
            c = [C('oak', 1), C('oak', 2), C('oak', 3), C('oak', 4)][ly] if ly < 4 else (C('oak', 4) if (x // 9 + ly // 40) % 9 else C('oak', 5))
            cv.put(x, y, c)
    SH.doorway(cv, EXIT_X, y0, 2 * T, T, 'oak')


# ------------------------------------------------------------------ overlay: bunting + warm light
def overlay():
    cv = Canvas(W, H)
    # bunting swags across the hall, strung between nails high on the north wall and across the side walls
    swags = [(T, 6, 9 * T - 22, 6), (19 * T + 22, 6, W - T, 6), (T, 22, 7 * T, 22), (7 * T, 22, 9 * T - 22, 20), (19 * T + 22, 20, 22 * T, 22), (22 * T, 22, W - T, 22)]
    for (x0, y0, x1, y1) in swags:
        sag = 12 if y0 < 10 else 9
        n = (x1 - x0) // 16
        for k in range(n + 1):
            pass
        for x in range(x0, x1):
            t = (x - x0) / (x1 - x0)
            y = int(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t))
            cv.put(x, y, C('tweed', 3))
        for k in range(1, n):
            t = k / n
            fx = int(x0 + (x1 - x0) * t); fy = int(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t))
            rn = BUNT[k % len(BUNT)]
            for yy in range(1, 13):
                half = max(0, 6 - yy // 2)
                for xx in range(-half, half + 1):
                    c = C(rn, 1 if xx < 0 else 2)
                    if yy == 1: c = C(rn, 0)
                    cv.put(fx + xx, fy + yy, c)
            cv.put(fx, fy + 13, C(rn, 3))
    # warm pools of light from the pendant lamps
    for (lx, ly) in ((7 * T, 6 * T), (14 * T, 6 * T), (21 * T, 6 * T)):
        for y in range(ly - 120, ly + 120):
            for x in range(lx - 200, lx + 200):
                d = math.hypot((x - lx) / 200, (y - ly) / 120)
                if d < 1: cv.put(x, y, C('lamp_glow', 1)[:3] + (int(26 * (1 - d) ** 1.5),))
    for wc in WINDOWS:
        cx = wc * T + T; y0 = 56
        for y in range(y0, y0 + 300):
            t = (y - y0) / 300; sx = cx - 10 + (y - y0) * 0.4; half = 26 + t * 20
            for x in range(int(sx - half), int(sx + half)):
                e = abs(x - sx) / half
                a = int(44 * (1 - t) ** 1.2 * (1 - e ** 4))
                if a > 2: cv.put(x, y, C('lamp_glow', 0)[:3] + (a,))
    return cv


# ------------------------------------------------------------------ objects
def cup(cv, x, y):
    cv.ellipse(x + 4, y + 6, 5, 2, C('white', 2)); cv.ellipse(x + 4, y + 5, 4, 1.5, C('white', 0))   # saucer
    cyl_v(cv, x + 1, y, 6, 5, 'white', 0, 3); cv.ellipse(x + 4, y, 3, 1, C('white', 3)); cv.put(x + 7, y + 2, C('white', 2))


def stage():
    o = Obj('stage', (9, 2, 10, 1), up=12, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 10 * T
    top_d = 26
    for y in range(-8, top_d - 8):   # boards run along the stage, butt joints staggered
        for x in range(w):
            row = (y + 8) // 6
            c = C('oak', 1) if hash01((x + row * 37) // 90, row, 91) > 0.4 else C('oak', 2)
            if (y + 8) % 6 == 0: c = C('oak', 3)
            if (x + row * 37) % 90 == 0: c = C('oak', 3)
            if hash01(x, y, 92) < 0.03: c = C('oak', 2)
            cv.put(X(x), Y(y), c)
    hl(cv, X(0), Y(-8), w, C('oak', 0))
    cv.rect(X(0), Y(top_d - 8), w, 4, C('oak', 1)); hl(cv, X(0), Y(top_d - 8), w, C('oak', 0))   # nosing
    fy = top_d - 4
    for y in range(fy, 48):   # front skirt: vertical tongue-and-groove, painted dark red below
        for x in range(w):
            c = C('oak', 3) if (x % 12) not in (0, 1) else C('oak', 4 if x % 12 == 0 else 2)
            cv.put(X(x), Y(y), c)
    hl(cv, X(0), Y(47), w, C('oak', 5))
    for (sx) in (w - 50,):   # steps up at the east end
        for k in range(3):
            cv.rect(X(sx + k * 0), Y(fy + 4 + k * 6), 44, 6, C('oak', 1 + k)); hl(cv, X(sx), Y(fy + 4 + k * 6), 44, C('oak', 0))
    # on the stage: a lectern, an aspidistra, a stacked pile of hymn-book boxes... and a tambourine from panto
    lx = 30
    cv.rect(X(lx), Y(-40), 26, 34, C('oak', 2)); hl(cv, X(lx), Y(-40), 26, C('oak', 0)); vl(cv, X(lx + 25), Y(-40), 34, C('oak', 4))
    cv.rect(X(lx - 3), Y(-44), 32, 6, C('oak', 1)); hl(cv, X(lx - 3), Y(-44), 32, C('oak', 0))
    cyl_v(cv, X(w - 90), Y(-24), 18, 18, 'terracotta', 0, 4)
    for k in range(14):
        a = -3.0 + k * 0.23; ln = 14 + (k % 4) * 4
        for s_ in range(ln):
            x = w - 81 + math.cos(a) * s_ * 0.7; y = -26 + math.sin(a) * s_ + (s_ * s_) / 50
            cv.put(X(int(x)), Y(int(y)), C('plant', 1 if s_ < ln // 2 else 3)); cv.put(X(int(x) + 1), Y(int(y)), C('plant', 2))
    cv.ellipse(X(w - 140), Y(-2), 9, 3, C('wood', 1)); cv.ellipse(X(w - 140), Y(-3), 7, 2, C('cream', 1))
    for k in range(4): cv.put(X(w - 147 + k * 5), Y(-2), C('gold', 0))
    o.finish(); return o


def urn():
    o = Obj('urn', (1, 2, 2, 2), up=40, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 2 * T
    ground_shadow(cv, X(w // 2 + 4), Y(92), w // 2 + 2, 6, 80)
    ty0, td = 10, 40
    for lx in (6, w - 12):
        for s_ in range(40): cv.put(X(lx + s_ // 8), Y(ty0 + td + s_), C('metal', 3)); cv.put(X(lx + 1 + s_ // 8), Y(ty0 + td + s_), C('metal', 4))
    for y in range(ty0, ty0 + td + 26):   # white cloth, draped with folds
        for x in range(-2, w + 2):
            if y > ty0 + td and (x < 0 or x > w - 1): continue
            c = C('white', 1)
            if y >= ty0 + td: c = C('white', 2) if (x % 10) not in (0, 1) else C('white', 3)
            if y == ty0: c = C('white', 0)
            if y == ty0 + td + 25: c = C('white', 3)
            cv.put(X(x), Y(y), c)
    for x in range(0, w, 5): cv.put(X(x), Y(ty0 + td + 26), C('white', 3))   # scalloped hem
    # the urn: stainless, tall, with a black tap and a gauge
    ux, uy = X(6), Y(ty0 - 38)
    cyl_v(cv, ux, uy + 6, 30, 44, 'metal', 0, 5)
    cv.ellipse(ux + 15, uy + 6, 15, 5, C('metal', 1)); cv.ellipse(ux + 15, uy + 6, 11, 3, C('metal', 2)); cv.ellipse(ux + 15, uy + 2, 5, 3, C('paint_black', 1))
    hl(cv, ux, uy + 40, 30, C('metal', 4))
    for hx in (ux - 3, ux + 30): cv.rect(hx, uy + 14, 3, 6, C('paint_black', 2))
    cv.rect(ux + 12, uy + 34, 7, 5, C('paint_black', 2)); cv.rect(ux + 14, uy + 39, 3, 5, C('paint_black', 3)); cv.put(ux + 13, uy + 34, C('paint_black', 0))
    vl(cv, ux + 24, uy + 12, 20, C('glass', 1)); vl(cv, ux + 25, uy + 12, 20, C('glass', 3))
    cv.put(ux + 5, uy + 12, C('white', 0)); vl(cv, ux + 5, uy + 14, 14, C('metal', 0))
    o.extra['points'] = {'steam': [ux + 15, uy - 2]}
    # rows of cups and saucers, a milk jug, sugar bowl, plate of biscuits, a donations tin (blank)
    for r in range(2):
        for k in range(4): cup(cv, X(42 + k * 12 + r * 5), Y(ty0 + 6 + r * 10))
    cyl_v(cv, X(46), Y(ty0 + 26), 9, 9, 'white', 0, 3); cv.put(X(45), Y(ty0 + 27), C('white', 1)); cv.put(X(55), Y(ty0 + 29), C('white', 2))
    cv.ellipse(X(64), Y(ty0 + 30), 6, 4, C('paint_blue', 1)); cv.ellipse(X(64), Y(ty0 + 29), 4, 2, C('white', 0))
    cv.ellipse(X(80), Y(ty0 + 30), 11, 5, C('white', 2)); cv.ellipse(X(80), Y(ty0 + 29), 9, 4, C('white', 0))
    for k in range(6): cv.ellipse(X(74 + (k % 3) * 5), Y(ty0 + 28 + (k // 3) * 3), 3, 2, C('sand', 1 if k % 2 else 0)); cv.put(X(74 + (k % 3) * 5), Y(ty0 + 28 + (k // 3) * 3), C('sand', 2))
    cyl_v(cv, X(8), Y(ty0 + 18), 12, 14, 'paint_red', 0, 4); cv.ellipse(X(14), Y(ty0 + 18), 6, 2, C('paint_red', 1)); hl(cv, X(11), Y(ty0 + 18), 6, OUTLINE)
    cv.rect(X(10), Y(ty0 + 23), 8, 5, C('paper', 1))
    o.finish(); return o


def hall_noticeboard():
    """A cork noticeboard on legs with pinned papers, leaflets and a drawing-pin tin."""
    o = Obj('hall_noticeboard', (25, 2, 2, 1), up=58, m=2, tile=[25, 2])
    cv, X, Y = o.cv, o.X, o.Y
    w = 2 * T
    ground_shadow(cv, X(w // 2), Y(44), w // 2 - 2, 5, 80)
    for lx in (10, w - 14):
        cv.rect(X(lx), Y(-10), 5, 54, C('oak', 3)); vl(cv, X(lx), Y(-10), 54, C('oak', 1)); cv.rect(X(lx - 4), Y(40), 13, 4, C('oak', 4))
    SH.noticeboard(cv, X(0), Y(-54), w, 50, SEED + 3, frame_r='oak')
    cv.rect(X(20), Y(4), w - 40, 5, C('oak', 2)); hl(cv, X(20), Y(4), w - 40, C('oak', 0))   # leaflet ledge
    for k in range(4):
        cv.rect(X(24 + k * 13), Y(-4), 11, 9, [C('paper', 1), C('sticky_b', 1), C('paper', 1), C('sticky_y', 1)][k]); hl(cv, X(24 + k * 13), Y(-4), 11, C('paper', 0))
    o.finish(); return o


def panel_table():
    """The funding panel's table (panel state only): white cloth to the floor, water jug and glasses, cups,
    papers, a small microphone and three blank tent name cards (the game letters the names)."""
    o = Obj('table', (9, 4, 10, 1), up=26, m=2, tile=[13, 4])
    cv, X, Y = o.cv, o.X, o.Y
    w = 10 * T
    ground_shadow(cv, X(w // 2 + 6), Y(46), w // 2 + 2, 6, 90)
    ty0, td = -6, 24
    for y in range(ty0, 46):
        for x in range(w):
            c = C('white', 1)
            if y >= ty0 + td:
                k = x % 16
                c = C('white', 1 if k < 6 else 2 if k < 12 else 3)
                if y > 42: c = C('white', 3)
            if y == ty0: c = C('white', 0)
            if y == ty0 + td: c = C('white', 0)
            cv.put(X(x), Y(y), c)
    for x in range(0, w, 4): cv.put(X(x), Y(46), C('white', 3))
    hl(cv, X(0), Y(ty0 + td + 5), w, C('paint_blue', 1)); hl(cv, X(0), Y(ty0 + td + 6), w, C('paint_blue', 2))   # a blue runner along the front
    cards = []
    for k, col in enumerate((1, 4, 8)):   # sue (col 10), helen (13), raj (17)
        cx = col * T + 10
        cv.rect(X(cx), Y(ty0 + 6), 30, 12, OUTLINE); cv.rect(X(cx + 1), Y(ty0 + 7), 28, 10, C('white', 0)); hl(cv, X(cx + 1), Y(ty0 + 16), 28, C('white', 2))
        hl(cv, X(cx + 1), Y(ty0 + 5), 28, C('white', 2))
        cards.append([X(cx + 3), Y(ty0 + 9), 24, 6])
        cup(cv, X(cx + 36), Y(ty0 + 8))
        cv.rect(X(cx - 14), Y(ty0 + 2), 14, 10, C('paper', 1)); hl(cv, X(cx - 14), Y(ty0 + 2), 14, C('paper', 0))
        for ly in range(3): hl(cv, X(cx - 12), Y(ty0 + 5 + ly * 2), 10, C('paper', 3))
    o.extra['text_slots'] = {'card_sue': cards[0], 'card_helen': cards[1], 'card_raj': cards[2]}
    jx = 6 * T + 20   # water jug + glasses
    cyl_v(cv, X(jx), Y(ty0 - 6), 12, 16, 'glass', 0, 3); cv.rect(X(jx + 1), Y(ty0 + 1), 10, 8, C('water', 1)); cv.put(X(jx + 12), Y(ty0 - 2), C('glass', 2)); cv.put(X(jx + 13), Y(ty0 - 1), C('glass', 3))
    for k in range(3): cyl_v(cv, X(jx + 18 + k * 8), Y(ty0 + 2), 6, 8, 'glass', 0, 3)
    mx = 4 * T + 30   # a little desk microphone
    cv.ellipse(X(mx), Y(ty0 + 14), 6, 2, C('paint_black', 2))
    for k in range(10): cv.put(X(mx + k // 3), Y(ty0 + 13 - k), C('metal', 2))
    cv.ellipse(X(mx + 4), Y(ty0 + 2), 3, 3, C('paint_black', 1)); cv.put(X(mx + 3), Y(ty0 + 1), C('metal', 1))
    o.finish(); return o


def chair(cv, x, y, seat='plastic_bl', frame_r='metal'):
    """A stacking hall chair seen from behind (facing the stage): back, seat edge, tubular legs."""
    for s_ in range(22):   # rear legs
        cv.put(x + 3, y + 8 + s_, C(frame_r, 3)); cv.put(x + 26, y + 8 + s_, C(frame_r, 4))
    for s_ in range(14): cv.put(x + 5, y + 16 + s_, C(frame_r, 2)); cv.put(x + 24, y + 16 + s_, C(frame_r, 3))
    cv.rect(x + 2, y + 12, 26, 6, C(seat, 2)); hl(cv, x + 2, y + 12, 26, C(seat, 1)); hl(cv, x + 2, y + 17, 26, C(seat, 4))   # seat edge beyond the back
    for yy in range(16):   # the back (moulded, curved)
        for xx in range(28):
            ex = min(xx, 27 - xx)
            if yy < 2 and ex < 3: continue
            lum = light((xx - 13.5) / 14, -0.2 + yy / 30, 0.7)
            cv.put(x + 1 + xx, y + yy - 8, shade(seat, lum + 0.05))
    hl(cv, x + 4, y - 8, 22, C(seat, 0))
    cv.rect(x + 11, y - 3, 8, 3, C(seat, 4))   # hand hole
    for yy in range(-6, 12): cv.put(x + 1, y + yy, C(frame_r, 1)); cv.put(x + 28, y + yy, C(frame_r, 3))


def chair_row(name, foot, seat):
    o = Obj(name, foot, up=12, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    tx, ty, tw, th = foot
    ground_shadow(cv, X(tw * T // 2), Y(42), tw * T // 2, 5, 70)
    for k in range(tw):
        dx = int((hash01(k, tx, ty) - 0.5) * 6); dy = int((hash01(k, ty, tx) - 0.5) * 4)
        chair(cv, X(k * T + 9 + dx), Y(8 + dy), seat)
        r = hash01(k, tx + ty, 77)
        if r < 0.12:   # a knitted scarf draped over the back
            rn = 'wine' if k % 2 else 'forest'
            for xx in range(24): cv.put(X(k * T + 12 + dx + xx), Y(-8 + dy), C(rn, 1)); cv.put(X(k * T + 12 + dx + xx), Y(-7 + dy), C(rn, 2))
            for (sx_) in (13, 30):
                for yy in range(24):
                    for xx in range(5):
                        c = C(rn, 1 if xx < 2 else 2) if (yy // 3) % 2 else C('cream', 1 if xx < 2 else 2)
                        cv.put(X(k * T + sx_ + dx + xx), Y(-7 + dy + yy), c)
                for xx in range(5): cv.put(X(k * T + sx_ + dx + xx), Y(17 + dy), C(rn, 3)) if xx % 2 else None
        elif r < 0.2:   # a handbag on the seat edge
            cv.rect(X(k * T + 15 + dx), Y(18 + dy), 14, 9, C('leather', 2)); hl(cv, X(k * T + 15 + dx), Y(18 + dy), 14, C('leather', 1))
            for s_ in range(8): cv.put(X(k * T + 17 + dx + s_), Y(16 + dy - (1 if 1 < s_ < 6 else 0)), C('leather', 3))
        elif r < 0.26:   # an order of service / leaflet left behind
            cv.rect(X(k * T + 13 + dx), Y(14 + dy), 10, 6, C('paper', 1)); hl(cv, X(k * T + 13 + dx), Y(14 + dy), 10, C('paper', 0))
    o.fade = [tx, ty - 1, tw, 1]
    o.finish(); return o


def stacked_chairs():
    o = Obj('stacked_chairs', (1, 11, 2, 1), up=70, m=2, tile=[1, 11])
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(48), Y(44), 44, 6, 90)
    for k in range(10):   # a stack of chairs, each a few px up
        yy = 30 - k * 7
        cv.rect(X(6), Y(yy), 32, 6, C('plastic_bl', 2 + (k % 2 == 0))); hl(cv, X(6), Y(yy), 32, C('plastic_bl', 1)); vl(cv, X(37), Y(yy), 6, C('plastic_bl', 4))
        cv.put(X(5), Y(yy + 2), C('metal', 1)); cv.put(X(38), Y(yy + 2), C('metal', 3))
    for yy in range(-52, -40):
        for xx in range(30): cv.put(X(7 + xx), Y(yy), shade('plastic_bl', light((xx - 15) / 15, 0, 0.8)))
    for s_ in range(14): cv.put(X(8), Y(30 + s_ // 2), C('metal', 3)); cv.put(X(35), Y(30 + s_ // 2), C('metal', 4))
    cyl_v(cv, X(56), Y(20), 26, 24, 'terracotta', 0, 4); cv.ellipse(X(69), Y(20), 13, 4, C('terracotta', 1))   # a big leafy plant
    for k in range(18):
        a = -3.1 + k * 0.18; ln = 18 + int(hash01(k, 1, 9) * 14)
        for s_ in range(ln):
            x = 69 + math.cos(a) * s_ * 0.8; y = 16 + math.sin(a) * s_ + (s_ * s_) / 70
            cv.ellipse(X(int(x)), Y(int(y)), 2, 1, C('plant', 1 if s_ < ln // 3 else 2 if s_ < ln * 2 // 3 else 3))
    o.finish(); return o


def piano():
    o = Obj('piano', (25, 11, 2, 1), up=62, m=2, tile=[25, 11])
    cv, X, Y = o.cv, o.X, o.Y
    w = 2 * T
    ground_shadow(cv, X(w // 2 + 4), Y(44), w // 2, 6, 90)
    # an upright piano seen from the front-ish (keys facing us): case, lid, keyboard, pedals, a candle bracket
    cv.rect(X(2), Y(-50), w - 4, 90, C('oak', 3)); vl(cv, X(2), Y(-50), 90, C('oak', 2)); vl(cv, X(w - 3), Y(-50), 90, C('oak', 5))
    cv.rect(X(0), Y(-56), w, 7, C('oak', 1)); hl(cv, X(0), Y(-56), w, C('oak', 0)); hl(cv, X(0), Y(-50), w, C('oak', 4))
    for (px0, py0, pw, ph) in ((10, -44, 34, 26), (w - 44, -44, 34, 26)):
        frame(cv, X(px0), Y(py0), pw, ph, C('oak', 4)); frame(cv, X(px0 + 1), Y(py0 + 1), pw - 2, ph - 2, C('oak', 2))
    cv.rect(X(2), Y(-14), w - 4, 8, C('oak', 2)); hl(cv, X(2), Y(-14), w - 4, C('oak', 1))   # key slip
    for x in range(4, w - 4):   # keys
        cv.put(X(x), Y(-6), C('white', 0)); cv.put(X(x), Y(-5), C('white', 1)); cv.put(X(x), Y(-4), C('white', 1)); cv.put(X(x), Y(-3), C('white', 2))
        if x % 4 == 0: vl(cv, X(x), Y(-6), 4, C('white', 3))
        if x % 28 in (2, 6, 14, 18, 22): cv.rect(X(x), Y(-6), 2, 2, C('paint_black', 3))
    hl(cv, X(2), Y(-2), w - 4, C('oak', 4))
    for px_ in (w // 2 - 8, w // 2 + 4): cv.rect(X(px_), Y(34), 4, 3, C('gold', 1))   # pedals
    cv.rect(X(20), Y(-26), 56, 12, C('paper', 1)); hl(cv, X(20), Y(-26), 56, C('paper', 0)); vl(cv, X(48), Y(-26), 12, C('paper', 3))   # music (blank staves)
    for ly in range(-24, -15, 2): hl(cv, X(22), Y(ly), 24, C('paper', 3)); hl(cv, X(50), Y(ly), 24, C('paper', 3))
    for (cx_) in (4, w - 10):   # candle brackets (brass)
        cv.rect(X(cx_), Y(-36), 6, 2, C('gold', 1)); cv.rect(X(cx_ + 2), Y(-42), 2, 6, C('cream', 0)); cv.put(X(cx_ + 2), Y(-43), C('gold', 0))
    for k in range(3):   # a doily and framed photos on top
        cv.rect(X(12 + k * 26), Y(-68), 14, 12, C('gold', 2)); cv.rect(X(14 + k * 26), Y(-66), 10, 8, [C('daylight', 1), C('sticky_p', 1), C('hills', 1)][k])
    for x in range(8, w - 8, 3): cv.put(X(x), Y(-56), C('white', 0))
    o.finish(); return o


def build():
    objs = [stage(), urn(), hall_noticeboard(), panel_table(),
            chair_row('chairs_front_w', (3, 6, 10, 1), 'plastic_bl'), chair_row('chairs_front_e', (16, 6, 10, 1), 'plastic_bl'),
            chair_row('chairs_back_w', (3, 8, 10, 1), 'plastic_or'), chair_row('chairs_back_e', (16, 8, 10, 1), 'plastic_or'),
            stacked_chairs(), piano(), SH.exit_sign_at('exit_sign', EXIT_X, TH)]
    for o in objs:
        if o.name == 'table': o.extra['hidden_until'] = 'panel'
    single = Obj('chair', (0, 0, 1, 1), up=12, m=2); chair(single.cv, single.X(9), single.Y(8)); single.finish()
    single.extra['note'] = 'one stacking chair (blue) for placing per seat; not placed in the room'
    single.tile = None
    return {'size': [W, H], 'floor': floor(), 'walls': walls(), 'overlay': overlay(), 'objects': objs + [single],
            'preview_skip': ['chair'],
            'text_slots': {'banner': [10 * T + 12, 28, 10 * T - 24, 18]},
            'variants': {'table': {'flag': 'panel', 'note': 'draw only when flags.panel'}}}
