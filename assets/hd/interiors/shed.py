"""The depot (brick engine shed, 1911) interior, 32x14 tiles at 48 art px per tile. Oily concrete, rails set in the
floor with an inspection pit under Ruby, a brick north wall with tall arched windows, big green doors east."""
from ilib import *
import marjorie as MJ

T = TILE
TW, TH = 32, 14
W, H = TW * T, TH * T
WALL_H = 2 * T             # the north wall face (rows 0-1)
FAR_RAIL, NEAR_RAIL = 5 * T + 10, 6 * T + 34      # rail head rows; Ruby's wheels sit on the near rail
PIT = (7 * T, 25 * T + 24, FAR_RAIL + 12, NEAR_RAIL - 8)
WINDOWS = [3, 10, 17, 24]
EXIT_X = 15 * T
SEED = 1911


# ------------------------------------------------------------------ floor
def oil_mask(x, y):
    s = 0.0
    if FAR_RAIL - 20 < y < NEAR_RAIL + 26: s += 0.34 * (1 - abs(y - (FAR_RAIL + NEAR_RAIL) / 2) / 60)
    for (cx, cy, r) in ((4 * T + 668, NEAR_RAIL + 16, 90), (4 * T + 452, NEAR_RAIL + 20, 56), (1290, 500, 50),
                        (210, 392, 44), (1360, 380, 40), (90, 470, 32), (620, 470, 26)):
        d = math.hypot((x - cx) / r, (y - cy) / (r * 0.55))
        if d < 1: s += (1 - d) * 0.9
    return s + (fbm(x, y, 20, SEED + 3, 3) - 0.5) * 0.7


def floor():
    cv = Canvas(W, H); px = cv.px
    oil = [C('oil', i) for i in range(5)]
    cc = [C('shed_conc', i) for i in range(6)]
    for y in range(H):
        for x in range(W):
            sx, sy = x // (4 * T), (y - 12) // (7 * T // 2)
            tone = hash01(sx, sy, SEED) * 0.14
            big = fbm(x, y, 60, SEED + 1, 2) - 0.5 - tone * 0.6
            fine = fbm(x, y, 4, SEED + 12, 2)
            grit = hash01(x, y, SEED + 2)
            i = 2
            if fine > 0.74 - big * 0.4: i = 1
            elif fine < 0.2 - big * 0.4: i = 3
            if grit < 0.025: i = min(4, i + 1)
            elif grit > 0.985: i = max(0, i - 1)
            # a scuffed, slightly polished path worn from the door to the bench and the car
            p = min(abs(x - (EXIT_X + T)) / 60 + max(0, (8 * T - y)) / 400, 9)
            if p < 1 and y > 7 * T + 40 and hash01(x, y, 17) < (1 - p) * 0.5: i = 1
            c = cc[i]
            o = oil_mask(x, y)
            if o > 0.98: c = oil[2] if o < 1.25 else oil[3]
            elif o > 0.74: c = oil[1] if ((x + y) % 2 == 0 and o < 0.82) else oil[0]
            elif o > 0.56: c = cc[min(4, i + 1)]
            px[x, y] = c
    # a rainbow sheen on the biggest oil pool
    for k in range(40):
        a = k / 40 * 6.28; r = 30 + hash01(k, 1, 5) * 26
        x = int(4 * T + 668 + math.cos(a) * r); y = int(NEAR_RAIL + 16 + math.sin(a) * r * 0.5)
        if 0 <= x < W and 0 <= y < H and px[x, y] in oil[:3]:
            px[x, y] = [C('flower_pur', 1), C('teal', 1), C('mustard', 1)][k % 3]
    # slab joints (sawn), with a lit lip
    for x0 in range(4 * T, W, 4 * T):
        for y in range(WALL_H, H):
            if not (FAR_RAIL - 16 <= y <= NEAR_RAIL + 16): px[x0, y] = cc[4]; px[x0 + 1, y] = cc[1]
    for y0 in (4 * T - 12, 7 * T + 60, 11 * T):
        for x in range(T, W - T): px[x, y0] = cc[4]; px[x, y0 + 1] = cc[1]
    # hairline cracks
    for k in range(6):
        x = 60 + hash01(k, 1, SEED + 4) * (W - 120); y = 7 * T + 50 + hash01(k, 2, SEED + 4) * 260
        a = hash01(k, 3, SEED + 4) * 6.28
        for s in range(60 + int(hash01(k, 4, SEED + 4) * 90)):
            a += (hash01(k, s, SEED + 5) - 0.5) * 0.9
            x += math.cos(a); y += math.sin(a) * 0.6
            if 0 <= x < W and WALL_H < y < H - T:
                px[int(x), int(y)] = cc[3] if s % 5 else cc[4]
                if hash01(k, s, 9) < 0.3 and int(y) + 1 < H: px[int(x), int(y) + 1] = cc[1]
    # faded yellow walkway lines either side of the road (chipped)
    for yl in (FAR_RAIL - 34, NEAR_RAIL + 30):
        for x in range(60, W - 60):
            for yy in range(yl, yl + 4):
                if fbm(x, yy, 8, SEED + 6, 2) > 0.34 and hash01(x, yy, 7) > 0.07:
                    px[x, yy] = C('warn', 2 if yy < yl + 3 else 3) if fbm(x, yy, 4, 9) > 0.42 else C('warn', 3)
    track(cv)
    pit(cv)
    # Ruby's shadow on the floor (under the car, pushed a touch to the lower right)
    for y in range(NEAR_RAIL - 30, NEAR_RAIL + 16):
        t = (y - (NEAR_RAIL - 30)) / 46
        for x in range(4 * T + 14, 28 * T + 10):
            cv.put(x, y, SHADOW[:3] + (int(64 + 44 * (1 - abs(t - 0.55) * 1.6)),))
    # AO where the floor meets the walls
    for y in range(WALL_H, WALL_H + 18):
        a = int(115 * (1 - (y - WALL_H) / 18) ** 1.6)
        for x in range(W): cv.put(x, y, SHADOW[:3] + (a,))
    for d in range(14):
        a = int(90 * (1 - d / 14) ** 1.6)
        for y in range(WALL_H, H):
            cv.put(T + d, y, SHADOW[:3] + (a,)); cv.put(W - T - 1 - d, y, SHADOW[:3] + (a,))
    for y in range(H - T - 14, H - T):
        a = int(70 * ((y - (H - T - 14)) / 14) ** 1.6)
        for x in range(W): cv.put(x, y, SHADOW[:3] + (a,))
    # drain gully with a grate
    gx, gy = 22 * T + 12, 11 * T + 10
    cv.rect(gx - 2, gy - 2, 34, 22, C('concrete', 4)); cv.rect(gx - 1, gy - 1, 32, 20, C('under', 1)); cv.rect(gx, gy, 30, 18, C('under', 4))
    for xx in range(gx + 1, gx + 30, 4): vl(cv, xx, gy, 18, C('metal', 3)); vl(cv, xx + 1, gy + 1, 17, C('under', 2))
    hl(cv, gx - 1, gy - 1, 32, C('metal', 2))
    # sawdust spread on an oil spill by the bench
    speck(cv, 25 * T + 20, 11 * T - 6, 120, 44, [C('sand', 1), C('sand', 2), C('sand', 0)], 0.38, SEED + 8,
          test=lambda x, y: ((x - 25 * T - 80) / 60) ** 2 + ((y - 11 * T - 14) / 18) ** 2 < 1)
    # a broom's worth of swept dust and a dropped washer, a few dry leaves blown in
    for k in range(9):
        lx = int(hash01(k, 1, 77) * (W - 200)) + 100; ly = 7 * T + 70 + int(hash01(k, 2, 77) * 200)
        cv.put(lx, ly, C('rust', 1)); cv.put(lx + 1, ly, C('rust', 2)); cv.put(lx + 1, ly + 1, C('rust', 3)); cv.put(lx + 2, ly + 1, C('leaf', 3))
    dressing(cv)
    mat(cv, EXIT_X + 4, 12 * T + 8, 2 * T - 8, 34)
    spill(cv, EXIT_X, H - T, 2 * T)
    return cv


def dressing(cv):
    """Flat floor details: a roof-leak puddle, a hatched keep-clear box, flattened cardboard, bolts, tyre marks."""
    px, py = 10 * T + 10, 10 * T + 6
    for y in range(py - 16, py + 16):
        for x in range(px - 40, px + 40):
            d = ((x - px) / 38) ** 2 + ((y - py) / 13) ** 2 + (fbm(x, y, 10, 3, 2) - 0.5) * 0.5
            if d < 1:
                c = C('water', 4) if d > 0.8 else C('water', 3) if d > 0.35 else C('water', 2)
                if abs((x - px) - (y - py) * 1.5) < 2 and d < 0.6: c = C('water', 0)   # the window reflected
                cv.put(x, y, c[:3] + (150 if d > 0.8 else 200,))
    for k in range(4): cv.put(px - 18 + k * 9, py - 4 + (k % 2) * 5, C('water', 0))
    hx0, hy0, hw, hh = 27 * T + 8, 2 * T + 16, 3 * T + 20, T + 8     # keep-clear hatching in front of the racking
    for y in range(hy0, hy0 + hh):
        for x in range(hx0, hx0 + hw):
            edge = x - hx0 < 3 or hx0 + hw - x <= 3 or y - hy0 < 3 or hy0 + hh - y <= 3
            if edge or ((x - hx0) + (y - hy0)) % 16 < 4:
                if fbm(x, y, 6, 21, 2) > 0.3 and hash01(x, y, 22) > 0.06: cv.put(x, y, C('warn', 2 if edge else 3))
    cx0, cy0 = 19 * T + 6, 9 * T + 12                                  # a flattened cardboard box to kneel on
    for y in range(40):
        for x in range(60):
            if x + y * 0.2 < 3 or x > 56 - y * 0.1: continue
            c = C('cork', 2) if (x // 30 + y // 20) % 2 else C('cork', 1)
            if x in (29, 30) or y == 19: c = C('cork', 3)
            if hash01(x, y, 23) < 0.03: c = C('oil', 2)
            cv.put(cx0 + x, cy0 + y, c)
    hl(cv, cx0 + 4, cy0 + 40, 54, SHADOW[:3] + (100,))
    for k in range(7):                                                 # dropped nuts and washers
        bx = cx0 + 70 + int(hash01(k, 1, 24) * 40); by = cy0 + 10 + int(hash01(k, 2, 24) * 30)
        cv.put(bx, by, C('metal', 1)); cv.put(bx + 1, by, C('metal', 3)); cv.put(bx, by + 1, C('metal', 3)); cv.put(bx + 1, by + 1, C('metal', 4))
    for k in range(260):                                               # faint sack-truck tyre marks
        t = k / 260; x = 3 * T + t * 12 * T; y = 11 * T + 10 + math.sin(t * 5) * 18
        for dy in (0, 9):
            if hash01(k, dy, 25) < 0.6: cv.put(int(x), int(y + dy), C('shed_conc', 3))


def rail_row(cv, x0, x1, y):
    """A rail head seen from above, set in concrete: flangeway groove, rusty head, fishplates."""
    for x in range(x0, x1):
        n = hash01(x, y, 3)
        cv.put(x, y - 3, C('concrete', 4)); cv.put(x, y - 2, C('under', 4)); cv.put(x, y - 1, C('under', 3))
        cv.put(x, y, C('rail', 1) if n > 0.35 else C('rust', 1))
        cv.put(x, y + 1, C('rail', 2) if n > 0.5 else C('rust', 2))
        cv.put(x, y + 2, C('rust', 2) if n > 0.2 else C('rail', 3))
        cv.put(x, y + 3, C('rust', 3)); cv.put(x, y + 4, C('rust', 4)); cv.put(x, y + 5, C('concrete', 3))
        if x % 144 == 60:
            for xx in range(x - 8, x + 9): cv.put(xx, y + 3, C('under', 2)); cv.put(xx, y + 4, C('under', 3)); cv.put(xx, y + 5, C('under', 4))
            for bx in (x - 5, x - 2, x + 2, x + 5): cv.put(bx, y + 4, C('metal', 2))
            cv.put(x, y, C('under', 3)); cv.put(x, y + 1, C('under', 3))


def track(cv):
    rail_row(cv, T, W, FAR_RAIL); rail_row(cv, T, W, NEAR_RAIL)
    for (a, b) in ((T, 4 * T - 6), (28 * T + 6, W)):
        for y in range(FAR_RAIL + 6, NEAR_RAIL - 3):
            for x in range(a, b):
                cv.put(x, y, C('ballast', 2 + int(hash01(x // 2, y // 2, 4) * 3)) if hash01(x, y, 5) < 0.8 else C('ballast', 1))
        for x in range(a + 6, b - 12, 27):
            for y in range(FAR_RAIL - 6, NEAR_RAIL + 9):
                for xx in range(14):
                    c = C('sleeper', 1 if xx < 3 else (3 if xx > 10 else 2))
                    if hash01(x + xx, y // 3, 6) < 0.1: c = C('sleeper', 4)
                    if xx in (5, 9) and hash01(x, y, 2) < 0.3: c = C('sleeper', 3)
                    cv.put(x + xx, y, c)
            hl(cv, x, NEAR_RAIL + 9, 14, C('sleeper', 4)); hl(cv, x, NEAR_RAIL + 10, 14, SHADOW[:3] + (120,))
        rail_row(cv, a, b, FAR_RAIL); rail_row(cv, a, b, NEAR_RAIL)
        for x in range(a + 6, b - 12, 27):   # chairs holding the rails
            for y in (FAR_RAIL, NEAR_RAIL):
                cv.rect(x + 1, y - 3, 12, 2, C('under', 2)); cv.rect(x + 1, y + 5, 12, 3, C('under', 3)); hl(cv, x + 1, y + 5, 12, C('under', 1))
                cv.put(x + 3, y + 6, C('metal', 2)); cv.put(x + 10, y + 6, C('metal', 2))
        for k in range(14):   # weeds pushing through
            wx = a + int(hash01(k, 1, a) * (b - a)); wy = FAR_RAIL + 12 + int(hash01(k, 2, a) * 50)
            for j in range(6):
                cv.put(wx + j - 2, wy - (j % 3), C('grass', 2 + (j % 2)))
            cv.put(wx, wy - 3, C('grass', 1)); cv.put(wx + 1, wy - 4, C('grass', 0))


def pit(cv):
    x0, x1, y0, y1 = PIT
    for x in range(x0 - 3, x1 + 3):   # kerb (white-painted edge, chipped)
        for y in (y0 - 4, y0 - 3, y0 - 2, y1, y1 + 1, y1 + 2):
            ok = hash01(x, y, 11) > 0.1
            cv.put(x, y, C('paint_cream', 1 if y in (y0 - 4, y1) else 2) if ok else C('concrete', 3))
    for y in range(y0 - 1, y0 + 22):   # the far inner wall faces us: lit concrete with pit lights
        for x in range(x0, x1):
            t = (y - y0) / 22
            c = C('concrete', 2 if t < 0.35 else 3) if hash01(x, y, 12) > 0.05 else C('concrete', 4)
            if (x - x0) % 96 == 0: c = C('concrete', 4)
            cv.put(x, y, c)
    for lx in range(x0 + 44, x1 - 30, 96):
        cv.rect(lx, y0 + 6, 16, 6, C('under', 3)); cv.rect(lx + 1, y0 + 7, 14, 4, C('lamp_glow', 1)); hl(cv, lx + 1, y0 + 7, 14, C('lamp_glow', 0))
        for yy in range(y0 + 12, y0 + 30):
            for xx in range(lx - 10, lx + 26):
                d = abs(xx - lx - 8) / 18 + (yy - y0 - 12) / 20
                if d < 1: cv.put(xx, yy, C('lamp_glow', 2)[:3] + (int(64 * (1 - d)),))
    for y in range(y0 + 22, y1):   # pit floor: deep and cool, a runnel of water
        for x in range(x0, x1):
            cv.put(x, y, C('under', 3) if hash01(x, y, 13) > 0.1 else C('under', 2))
    hl(cv, x0, y1 - 4, x1 - x0, C('water', 4)); hl(cv, x0, y1 - 3, x1 - x0, C('water', 5))
    for x in range(x0, x1, 9): cv.put(x, y1 - 4, C('water', 2))
    for k in range(5):   # steps down at the west end
        sx = x0 + k * 8
        cv.rect(sx, y0 + 2 + k * 7, 8, y1 - y0 - 2 - k * 7, C('under', 2 + k // 2))
        hl(cv, sx, y0 + 2 + k * 7, 8, C('concrete', 3)); vl(cv, sx + 7, y0 + 2 + k * 7, y1 - y0 - 2 - k * 7, C('under', 4))
    for x in range(x0 - 3, x0 + 22):   # yellow-black hazard ends on the kerb
        for y in (y0 - 4, y0 - 3, y0 - 2, y1, y1 + 1, y1 + 2):
            cv.put(x, y, C('warn', 1) if ((x + y) // 4) % 2 else C('under', 4))


def mat(cv, x0, y0, w, h):
    for y in range(h):
        for x in range(w):
            e = x in (0, w - 1) or y in (0, h - 1)
            c = C('tweed', 3) if e else C('tweed', 1 if (x // 2 + y) % 3 == 0 else 2)
            if hash01(x, y, 44) < 0.08: c = C('tweed', 3)
            if 3 <= x < w - 3 and 3 <= y < h - 3 and (x in (3, w - 4) or y in (3, h - 4)): c = C('tweed', 4)
            cv.put(x0 + x, y0 + y, c)
    hl(cv, x0 + 1, y0 + h, w - 1, SHADOW[:3] + (120,)); vl(cv, x0 + w, y0 + 1, h, SHADOW[:3] + (90,))


def spill(cv, x0, y1, w, reach=130, alpha=60):
    """A fan of warm daylight spilling in from the open doorway on the south wall."""
    cx = x0 + w / 2
    for y in range(y1 - reach, y1):
        t = (y1 - y) / reach
        half = w / 2 + t * 56
        for x in range(int(cx - half), int(cx + half)):
            e = abs(x - cx) / half
            a = int(alpha * (1 - t) * (1 - e ** 3))
            if a > 3: cv.put(x, y, C('lamp_glow', 1)[:3] + (a,))


# ------------------------------------------------------------------ walls
def brick_wall(cv, x0, y0, w, h, rampn='brick', seed=0, soot=True, bw=12, bh=5):
    for y in range(y0, y0 + h):
        row = (y - y0) // bh; off = (row % 2) * (bw // 2)
        for x in range(x0, x0 + w):
            bx = (x - x0 + off) // bw
            iy, ix = (y - y0) % bh, (x - x0 + off) % bw
            if iy == bh - 1 or ix == bw - 1:
                c = C('stone', 3) if iy == bh - 1 else C('stone', 4)
                if hash01(x, y, seed + 7) < 0.15: c = C('stone', 2)
            else:
                v = hash01(bx, row, seed)
                i = 1 if v > 0.82 else (2 if v > 0.25 else 3)
                if v < 0.05: i = 4
                if iy == 0 and ix < bw - 2: i = max(0, i - 1)
                if ix == bw - 2 or iy == bh - 2: i = min(4, i + (1 if hash01(bx, row, seed + 2) < 0.5 else 0))
                if hash01(x, y, seed + 1) < 0.07: i += 1
                if soot:
                    s = (1 - (y - y0) / h) * 0.9 + (fbm(x, y, 22, seed + 3, 2) - 0.5) * 0.6
                    if s > 0.64: i += 1
                c = C(rampn, min(4, i))
            cv.put(x, y, c)


def arched_window(cv, cx, top, bot, r):
    """A tall round-headed iron-framed window: brick arch ring, reveal, dusty panes, stone sill."""
    def inside(x, y, rr):
        if y >= top + rr: return abs(x - cx) < rr
        return (x - cx) ** 2 + (y - (top + rr)) ** 2 < rr * rr
    for y in range(top - 8, bot + 1):
        for x in range(cx - r - 8, cx + r + 9):
            if inside(x + 0.5, y + 0.5, r + 6) and not inside(x + 0.5, y + 0.5, r):
                if y < top + r:
                    ang = math.atan2(y - (top + r), x - cx)
                    k = int((ang + math.pi) / 0.16)
                    c = C('brick_dark', 1 if k % 2 else 2)
                    if int((ang + math.pi) / 0.16 * 8) % 8 == 0: c = C('stone', 3)
                    if inside(x + 0.5, y + 0.5, r + 2): c = C('stone', 2) if inside(x + 0.5, y + 0.5, r + 1) else C('stone', 1)
                else:
                    c = C('stone', 2) if abs(x - cx) < r + 2 else cv.get(x, y)
                    if abs(x - cx) == r + 1: c = C('stone', 1) if x < cx else C('stone', 3)
                cv.put(x, y, c)
    for y in range(top, bot):   # glass: dusty daylight, a hint of the fells, iron glazing bars
        for x in range(cx - r, cx + r):
            if not inside(x + 0.5, y + 0.5, r - 1): continue
            t = (y - top) / (bot - top)
            c = C('daylight', 0 if t < 0.35 else 1 if t < 0.6 else 2)
            hill = 0.62 + (fbm(x, 0, 18, 5, 2) - 0.5) * 0.3
            if t > hill: c = C('hills', 1 if t < hill + 0.12 else 2)
            if t > 0.9: c = C('hills', 3)
            if fbm(x, y, 9, SEED + 9, 2) > 0.64: c = mix(c, C('sand', 2), 0.35)
            gx, gy = (x - (cx - r)) % 9, (y - top) % 8
            if gx == 0 or gy == 0: c = C('paint_black', 2)
            elif (gx == 1 or gy == 1) and t < 0.62: c = mix(c, C('white', 0), 0.5)
            cv.put(x, y, c)
    # a central opening hopper, tipped in (darker), a boarded pane, a cracked pane
    k = int(hash01(cx, 0, 3) * 3)
    px0 = cx - r + 1 + 9 * (1 + k); py0 = top + r + 33
    if py0 + 7 < bot:
        cv.rect(px0, py0, 8, 7, C('wood', 2)); hl(cv, px0, py0, 8, C('wood', 1)); cv.put(px0 + 2, py0 + 3, C('wood', 3)); cv.put(px0 + 5, py0 + 2, C('wood', 4))
    qx = cx + 6 + 9 * (k % 2); qy = top + r - 14
    for s in range(9): cv.put(qx + s, qy + (s * s) // 12, C('white', 0))
    cv.rect(cx - r - 6, bot, 2 * r + 12, 4, C('sandstone', 1)); hl(cv, cx - r - 6, bot, 2 * r + 12, C('sandstone', 0))
    hl(cv, cx - r - 6, bot + 3, 2 * r + 12, C('sandstone', 3))
    hl(cv, cx - r - 5, bot + 4, 2 * r + 10, C('brick', 4)); hl(cv, cx - r - 4, bot + 5, 2 * r + 8, SHADOW[:3] + (110,))


def clock(cv, cx, cy, r=12):
    cv.ellipse(cx + 2, cy + 2, r + 1, r + 1, SHADOW[:3] + (100,))
    cv.ellipse(cx, cy, r + 1, r + 1, OUTLINE)
    cv.ellipse(cx, cy, r, r, lambda x, y, nx, ny, nz: shade('paint_black', light(nx, ny, nz) + 0.2))
    cv.ellipse(cx, cy, r - 3, r - 3, C('paint_cream', 1))
    cv.ellipse(cx - 1, cy - 1, r - 5, r - 5, C('paint_cream', 0))
    for k in range(12):
        a = k / 12 * 6.283
        cv.put(round(cx + math.sin(a) * (r - 4)), round(cy - math.cos(a) * (r - 4)), C('paint_black', 2 if k % 3 else 3))
    for i in range(1, r - 4): cv.put(cx, cy - i, OUTLINE)
    for i in range(1, r - 6): cv.put(cx + i, cy + i // 2, OUTLINE)
    for i in range(1, r - 5): cv.put(cx - i // 3, cy + i, C('paint_red', 2))    # second hand
    cv.put(cx, cy, C('paint_red', 1))
    cv.put(cx - r + 3, cy - r + 4, C('white', 0)); cv.put(cx - r + 4, cy - r + 3, C('white', 0))


def noticeboard(cv, x0, y0, w, h, seed, frame_r='oak', back='cork'):
    cv.rect(x0 + 3, y0 + 3, w, h, SHADOW[:3] + (90,))
    cv.rect(x0, y0, w, h, OUTLINE)
    cv.rect(x0 + 1, y0 + 1, w - 2, h - 2, C(frame_r, 2)); hl(cv, x0 + 1, y0 + 1, w - 2, C(frame_r, 1)); vl(cv, x0 + 1, y0 + 1, h - 2, C(frame_r, 1))
    hl(cv, x0 + 1, y0 + h - 2, w - 2, C(frame_r, 4)); vl(cv, x0 + w - 2, y0 + 1, h - 2, C(frame_r, 4))
    for y in range(y0 + 4, y0 + h - 4):
        for x in range(x0 + 4, x0 + w - 4):
            v = hash01(x, y, seed)
            cv.put(x, y, C(back, 1 if v > 0.3 else (2 if v > 0.05 else 3)))
    hl(cv, x0 + 4, y0 + 4, w - 8, C(back, 3))
    k = 0; x = x0 + 7
    while x < x0 + w - 16:   # blank sheets pinned up (paper only; the game letters nothing here)
        pw = 13 + int(hash01(k, 1, seed) * 7); ph = 16 + int(hash01(k, 2, seed) * 9)
        py = y0 + 7 + int(hash01(k, 3, seed) * max(1, h - ph - 13))
        if x + pw > x0 + w - 6: break
        rn = ['paper', 'paper', 'sticky_y', 'sticky_b', 'paper', 'sticky_p'][k % 6]
        tilt = 1 if hash01(k, 4, seed) < 0.3 else 0
        cv.rect(x + 2, py + 2, pw, ph, SHADOW[:3] + (80,))
        for yy in range(ph):
            ox = (yy * tilt) // 10
            hl(cv, x + ox, py + yy, pw, C(rn, 1))
            cv.put(x + ox + pw - 1, py + yy, C(rn, 2))
        hl(cv, x, py, pw, C(rn, 0))
        for ly in range(py + 5, py + ph - 3, 3): hl(cv, x + 2 + ((ly - py) * tilt) // 10, ly, pw - 5 - (ly % 4), C(rn, 3))   # lines, not letters
        if rn == 'paper' and k % 2: cv.rect(x + 3, py + 4, 6, 5, C('sticky_g', 2))   # a little photo
        cv.put(x + pw // 2, py + 1, C('paint_red', 1)); cv.put(x + pw // 2, py + 2, C('paint_red', 3))
        x += pw + 4; k += 1


def pegboard(cv, x0, y0, w, h):
    """Tool board: pegboard with painted outlines and the tools hung on them (one missing: out on Ruby)."""
    cv.rect(x0 + 3, y0 + 3, w, h, SHADOW[:3] + (90,))
    cv.rect(x0, y0, w, h, C('oak', 4))
    for y in range(y0 + 1, y0 + h - 1):
        for x in range(x0 + 1, x0 + w - 1):
            c = C('sandstone', 1)
            if (x - x0) % 5 == 2 and (y - y0) % 5 == 2: c = C('sandstone', 3)
            cv.put(x, y, c)
    hl(cv, x0 + 1, y0 + 1, w - 2, C('sandstone', 0))
    def tool_outline(pts, col):
        for (px, py) in pts: cv.put(px, py, col)
    # spanners (graded), hammer, saw, and an empty outline where the big spanner should be
    for k in range(5):
        sx = x0 + 6 + k * 7; ln = 14 + k * 3
        vl(cv, sx, y0 + 8, ln, C('metal', 1)); vl(cv, sx + 1, y0 + 8, ln, C('metal', 3))
        cv.rect(sx - 1, y0 + 5, 4, 4, C('metal', 2)); cv.put(sx, y0 + 5, C('sandstone', 1))
        cv.put(sx, y0 + 4, C('metal', 4))
    ex = x0 + 44
    for yy in range(y0 + 6, y0 + 36):
        cv.put(ex, yy, C('paint_red', 2)); cv.put(ex + 3, yy, C('paint_red', 2))
    hl(cv, ex - 1, y0 + 5, 6, C('paint_red', 2)); hl(cv, ex, y0 + 36, 4, C('paint_red', 2))
    hx = x0 + 56   # hammer
    vl(cv, hx + 3, y0 + 12, 22, C('wood', 1)); vl(cv, hx + 4, y0 + 12, 22, C('wood', 3))
    cv.rect(hx - 1, y0 + 7, 11, 6, C('metal', 2)); hl(cv, hx - 1, y0 + 7, 11, C('metal', 0)); hl(cv, hx - 1, y0 + 12, 11, C('metal', 4))
    sx = x0 + 70   # saw
    for yy in range(26):
        for xx in range(8 - yy // 5):
            cv.put(sx + xx, y0 + 12 + yy, C('metal', 1 if xx == 0 else 2))
        if yy % 2: cv.put(sx + 8 - yy // 5, y0 + 12 + yy, C('metal', 4))
    cv.rect(sx - 1, y0 + 5, 10, 8, C('wood', 2)); cv.rect(sx + 2, y0 + 7, 4, 3, C('sandstone', 1))
    # screwdrivers in a rack along the bottom
    for k in range(6):
        rx = x0 + 6 + k * 6
        cv.rect(rx, y0 + h - 18, 3, 7, [C('paint_red', 2), C('mustard', 2), C('paint_blue', 2)][k % 3])
        vl(cv, rx + 1, y0 + h - 11, 6, C('metal', 1))
    hl(cv, x0 + 3, y0 + h - 12, 38, C('oak', 3))


def walls():
    cv = Canvas(W, H)
    brick_wall(cv, 0, 10, W, WALL_H - 10, 'brick', SEED)
    for y in range(0, 10):
        for x in range(W): cv.put(x, y, C('under', 4 if y < 7 else 3))
    hl(cv, 0, 8, W, C('oak', 3)); hl(cv, 0, 9, W, C('oak', 2)); hl(cv, 0, 10, W, C('oak', 4)); hl(cv, 0, 11, W, SHADOW[:3] + (120,))
    for tx in (1, 7, 14, 21, 28):   # steel roof-truss feet on padstones between the windows
        x = tx * T + 24
        cv.rect(x - 5, 0, 11, 14, C('paint_black', 2)); vl(cv, x - 5, 0, 14, C('paint_black', 1)); vl(cv, x + 5, 0, 14, C('paint_black', 3))
        for k in range(12): cv.put(x - 6 - k, 12 + k // 2, C('paint_black', 1)); cv.put(x + 6 + k, 12 + k // 2, C('paint_black', 2))
        cv.rect(x - 8, 14, 17, 5, C('sandstone', 2)); hl(cv, x - 8, 14, 17, C('sandstone', 0)); hl(cv, x - 8, 18, 17, C('sandstone', 4))
        for bx in (x - 3, x + 3): cv.put(bx, 7, C('metal', 2))
    # string course + blue-brick plinth
    for y in range(WALL_H - 14, WALL_H):
        for x in range(W):
            ly = y - (WALL_H - 14); row = ly // 5
            c = C('brick_dark', 2 if (((x + row * 6) // 12) + row) % 3 else 3)
            if (x + row * 6) % 12 == 11 or ly % 5 == 4: c = C('stone', 4)
            cv.put(x, y, c)
    hl(cv, 0, WALL_H - 17, W, C('sandstone', 0)); hl(cv, 0, WALL_H - 16, W, C('sandstone', 1)); hl(cv, 0, WALL_H - 15, W, C('sandstone', 3))
    hl(cv, 0, WALL_H - 14, W, SHADOW[:3] + (110,))
    hl(cv, 0, WALL_H - 1, W, C('brick_dark', 4))
    for c in WINDOWS: arched_window(cv, c * T + T, 18, WALL_H - 22, 32)
    for c in WINDOWS:   # warm daylight bounce on the brick around each window
        cx = c * T + T
        bricks = [C('brick', i)[:3] for i in (2, 3, 4)]
        for y in range(12, WALL_H - 17):
            for x in range(cx - 66, cx + 66):
                d = abs(x - cx) / 66
                col = cv.get(x, y)
                if col[3] and col[:3] in bricks and hash01(x, y, 3) < (1 - d) * 0.35:
                    cv.put(x, y, C('brick', bricks.index(col[:3]) + 1))
    for x in range(T, W - T):   # conduit run + cable drops + junction boxes
        cv.put(x, 22, C('metal', 1)); cv.put(x, 23, C('metal', 3)); cv.put(x, 24, SHADOW[:3] + (100,))
        if x % 60 == 0: cv.rect(x, 21, 2, 4, C('metal', 4))
    for jx in (7 * T + 30, 20 * T + 40):
        cv.rect(jx, 19, 12, 10, C('metal', 3)); hl(cv, jx, 19, 12, C('metal', 1)); vl(cv, jx + 11, 19, 10, C('metal', 4)); cv.put(jx + 5, 23, C('metal', 5))
    clock(cv, 7 * T + 24, 46)
    noticeboard(cv, 20 * T + 12, 30, 82, 44, SEED + 21)
    pegboard(cv, T + 8, 28, 84, 50)
    # a blank blue safety board and a blank red fire-point plate: colour only, the game letters nothing here
    for (bx, by, col) in ((8 * T + 20, 34, 'paint_blue'), (23 * T + 8, 32, 'paint_red')):
        cv.rect(bx + 2, by + 2, 30, 20, SHADOW[:3] + (90,)); cv.rect(bx, by, 30, 20, OUTLINE); cv.rect(bx + 1, by + 1, 28, 18, C('white', 1))
        hl(cv, bx + 1, by + 1, 28, C('white', 0))
        cv.ellipse(bx + 9, by + 10, 6, 6, C(col, 1)); cv.ellipse(bx + 9, by + 10, 3, 3, C('white', 0))
        for ly in (by + 6, by + 10, by + 14): hl(cv, bx + 17, ly, 8, C('white', 3))
    hx, hy = 26 * T + 22, 44   # hose reel
    cv.ellipse(hx + 2, hy + 2, 16, 16, SHADOW[:3] + (90,)); cv.ellipse(hx, hy, 16, 16, OUTLINE)
    cv.ellipse(hx, hy, 15, 15, lambda x, y, nx, ny, nz: shade('paint_red', light(nx, ny, nz) + 0.1))
    for rr in (12, 9, 6):
        cv.ellipse(hx, hy, rr, rr, C('paint_red', 1 if rr % 2 == 0 else 3))
    cv.ellipse(hx, hy, 3, 3, C('metal', 1)); cv.put(hx - 1, hy - 1, C('white', 0))
    for yy in range(hy + 16, hy + 34): cv.put(hx + 10, yy, C('paint_red', 2)); cv.put(hx + 11, yy, C('paint_red', 4))
    side_wall(cv, 0, lit=True)
    side_wall(cv, W - T, lit=False)
    east_doors(cv)
    south_wall(cv)
    return cv


def side_wall(cv, x0, lit, y_from=0):
    """Side wall seen from above: brick top with a lit edge on the room side."""
    for y in range(y_from, H):
        for x in range(x0, x0 + T):
            local = x - x0
            inner = (T - 1 - local) if lit else local
            if 12 <= y < WALL_H and inner > 8: continue
            row = y // 6
            c = C('brick_dark', 3 if (row + (local + (row % 2) * 6) // 12) % 2 else 4)
            if y % 6 == 5 or (local + (row % 2) * 6) % 12 == 11: c = C('under', 4)
            if inner == 0: c = C('brick', 1 if lit else 3)
            elif inner == 1: c = C('brick', 2 if lit else 4)
            elif inner < 8: c = C('brick_dark', 2 + (inner > 4))
            elif inner == 8: c = C('under', 5)
            cv.put(x, y, c)


def east_doors(cv):
    x0 = W - T; y0, y1 = 3 * T - 6, 8 * T + 6
    for y in range(y0, y1):
        for x in range(x0 + 3, W):
            ly = (y - y0) % 12
            c = C('paint_green', 2)
            if ly == 0: c = C('paint_green', 1)
            if ly == 11: c = C('paint_green', 4)
            if fbm(x, y, 10, SEED + 30, 2) > 0.68: c = C('paint_green', 3)
            if hash01(x, y, 31) < 0.04: c = C('wood', 3)
            cv.put(x, y, c)
    for y in (y0, y1 - 1): hl(cv, x0, y, T, C('under', 4))
    vl(cv, x0 + 1, y0, y1 - y0, C('under', 4)); vl(cv, x0 + 2, y0, y1 - y0, C('under', 3)); vl(cv, x0 + 3, y0, y1 - y0, C('paint_green', 0))
    my = (y0 + y1) // 2
    hl(cv, x0 + 3, my - 1, T - 3, C('under', 5)); hl(cv, x0 + 4, my, T - 4, C('lamp_glow', 0)); hl(cv, x0 + 3, my + 1, T - 3, C('under', 5))
    for y in range(my - 26, my + 26):   # daylight leaking through the join, onto the floor
        for x in range(x0 - 30, x0):
            d = abs(y - my) / 26 + (x0 - x) / 30
            if d < 1: cv.put(x, y, C('lamp_glow', 1)[:3] + (int(56 * (1 - d)),))
    for hy in (y0 + 20, y0 + 74, y1 - 74, y1 - 20):   # strap hinges
        hl(cv, x0 + 4, hy, T - 5, C('paint_black', 1)); hl(cv, x0 + 4, hy + 1, T - 5, C('paint_black', 2)); hl(cv, x0 + 4, hy + 2, T - 5, C('paint_black', 3))
        for bx in range(x0 + 8, W - 2, 10): cv.put(bx, hy + 1, C('metal', 1))
    cv.rect(x0 + 18, my - 44, 4, 88, C('paint_black', 2)); vl(cv, x0 + 18, my - 44, 88, C('paint_black', 0))
    for y in (FAR_RAIL, NEAR_RAIL): hl(cv, x0 + 3, y + 3, T - 3, C('under', 5))


def south_wall(cv):
    y0 = H - T
    for y in range(y0, H):
        for x in range(W):
            if EXIT_X <= x < EXIT_X + 2 * T: continue
            ly = y - y0
            row = ly // 6
            v = hash01((x + (row % 2) * 6) // 12, row, 5)
            c = C('brick_dark', 3 if v > 0.3 else 4)
            if ly % 6 == 5: c = C('brick_dark', 4)
            if (x + (row % 2) * 6) % 12 == 11: c = C('brick_dark', 4)
            if ly > 12: c = darker(c, 0.85)
            if ly == 0: c = C('brick', 1)
            elif ly == 1: c = C('brick', 2)
            elif ly == 2: c = C('brick_dark', 1)
            elif ly == 3: c = C('brick_dark', 2)
            cv.put(x, y, c)
    doorway(cv, EXIT_X, y0, 2 * T, T, 'paint_green')


def doorway(cv, x0, y0, w, h, frame_r):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            t = (y - y0) / h
            c = C('lamp_glow', 0) if t < 0.25 else (C('paving', 0) if t < 0.6 else C('paving', 1))
            if t >= 0.6 and ((x - x0) % 24 == 0 or (y - y0) % 12 == 0): c = C('paving', 2)
            cv.put(x, y, c)
    hl(cv, x0, y0, w, C('stone', 1)); hl(cv, x0, y0 + 1, w, C('stone', 2)); hl(cv, x0, y0 + 2, w, C('stone', 3))
    for jx in (x0 - 6, x0 + w):
        cv.rect(jx, y0 - 3, 6, h + 3, C(frame_r, 2)); vl(cv, jx, y0 - 3, h + 3, C(frame_r, 1)); vl(cv, jx + 5, y0 - 3, h + 3, C(frame_r, 4))
        hl(cv, jx, y0 - 3, 6, C(frame_r, 0))


# ------------------------------------------------------------------ overlay: light shafts, dust motes, pendant lamps
def overlay():
    cv = Canvas(W, H)
    for c in WINDOWS:
        cx = c * T + T
        y0 = WALL_H - 22
        for y in range(y0, y0 + 420):
            if y >= H - T: break
            t = (y - y0) / 420
            sx = cx - 28 + (y - y0) * 0.42
            half = 30 + t * 22
            for x in range(int(sx - half), int(sx + half)):
                e = abs(x - sx) / half
                a = int(50 * (1 - t) ** 1.1 * (1 - e ** 4))
                if a > 2: cv.put(x, y, C('lamp_glow', 0)[:3] + (a,))
        for k in range(36):
            y = y0 + 10 + int(hash01(k, 1, c) * 330); sx = cx - 28 + (y - y0) * 0.42 + (hash01(k, 2, c) - 0.5) * 44
            cv.put(int(sx), y, C('lamp_glow', 0)[:3] + (160,))
            if k % 5 == 0: cv.put(int(sx) + 1, y, C('lamp_glow', 0)[:3] + (90,))
    for lx in (6 * T + 24, 14 * T + 8, 21 * T + 24, 29 * T):   # enamel pendant lamps on chains
        for y in range(0, 52): cv.put(lx, y, C('metal', 3) if y % 3 else C('metal', 1))
        for yy in range(12):
            ww = 4 + yy + yy // 3
            for x in range(lx - ww, lx + ww + 1):
                cv.put(x, 52 + yy, shade('enamel_g', light((x - lx) / (ww + 0.5), -0.4, 0.6) + 0.1))
        hl(cv, lx - 18, 64, 37, C('enamel_g', 4)); hl(cv, lx - 17, 65, 35, C('enamel_g', 3))
        cv.ellipse(lx, 66, 9, 3, C('lamp_glow', 0)); cv.ellipse(lx, 65, 5, 1, C('white', 0))
        cv.put(lx - 6, 54, C('white', 0)); cv.put(lx - 7, 55, C('white', 0))
        cv.rect(lx - 3, 48, 7, 5, C('metal', 2)); hl(cv, lx - 3, 48, 7, C('metal', 0))
        for y in range(67, 104):
            for x in range(lx - 36, lx + 37):
                d = math.hypot((x - lx) / 36, (y - 67) / 36)
                if d < 1: cv.put(x, y, C('lamp_glow', 1)[:3] + (int(42 * (1 - d)),))
    # a light outline for the lamp shades (they're free-standing silhouettes)
    return cv


# ------------------------------------------------------------------ objects
def drum(cv, x, y, w, h, rn):
    cyl_v(cv, x, y + 4, w, h - 4, rn, 0, 4)
    for ry in (y + 4 + (h - 4) // 3, y + 4 + 2 * (h - 4) // 3):
        hl(cv, x, ry, w, C(rn, 4)); hl(cv, x, ry - 1, w, C(rn, 1))
    cv.ellipse(x + w / 2, y + 4, w / 2, 4, C(rn, 1)); cv.ellipse(x + w / 2, y + 4, w / 2 - 2, 3, C(rn, 2))
    cv.ellipse(x + w / 2 - 4, y + 4, 3, 1.5, C(rn, 3)); cv.put(x + w // 2 + 5, y + 4, C('metal', 2)); cv.put(x + w // 2 + 5, y + 3, C('metal', 0))
    cv.rect(x + 5, y + 4 + (h - 4) // 3 + 3, w - 10, 8, C('paper', 2)); hl(cv, x + 5, y + 4 + (h - 4) // 3 + 3, w - 10, C('paper', 1))   # blank label
    for k in range(22):
        rx = x + int(hash01(k, 1, x) * w); ry = y + 8 + int(hash01(k, 2, x) * (h - 10))
        if hash01(k, 3, x) < 0.6: cv.put(rx, ry, C('rust', 2)); cv.put(rx, ry + 1, C('rust', 3))
    for k in range(3):   # oil drips from the bung
        dx = x + w // 2 + 3 + k * 3
        for yy in range(3 + k * 4): cv.put(dx, y + 7 + yy, C('oil', 1))


def oil_drums():
    o = Obj('oil_drums', (5, 1, 2, 1), up=26, m=2, extra_w=6)
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(52), Y(44), 52, 7, 90)
    cv.rect(X(2), Y(30), 94, 14, C('under', 3)); hl(cv, X(2), Y(30), 94, C('under', 1)); hl(cv, X(2), Y(43), 94, C('under', 5))
    vl(cv, X(2), Y(30), 14, C('under', 2))
    cv.rect(X(5), Y(33), 88, 8, C('oil', 2)); hl(cv, X(10), Y(34), 20, C('oil', 0))
    drum(cv, X(6), Y(-20), 30, 56, 'paint_blue')
    drum(cv, X(38), Y(-17), 30, 53, 'paint_red')
    cyl_h(cv, X(64), Y(16), 34, 26, 'forest', 0, 4)   # a third drum lying in front
    cv.ellipse(X(65), Y(29), 4, 13, C('forest', 1)); cv.ellipse(X(65), Y(29), 2, 9, C('forest', 3)); cv.put(X(65), Y(24), C('metal', 1))
    vl(cv, X(76), Y(16), 26, C('forest', 4)); vl(cv, X(87), Y(16), 26, C('forest', 4))
    cv.rect(X(15), Y(-32), 4, 14, C('metal', 2)); vl(cv, X(15), Y(-32), 14, C('metal', 1))   # hand pump
    cv.rect(X(12), Y(-35), 12, 4, C('metal', 1)); hl(cv, X(19), Y(-28), 7, C('paint_red', 2)); hl(cv, X(25), Y(-27), 2, C('paint_red', 3))
    cv.ellipse(X(53), Y(-17), 7, 3, C('oil', 2)); cv.ellipse(X(51), Y(-18), 3, 1, C('oil', 0))
    cv.rect(X(44), Y(-24), 10, 7, C('metal', 2)); hl(cv, X(44), Y(-24), 10, C('metal', 0)); cv.rect(X(52), Y(-27), 2, 4, C('metal', 3))   # oil can
    o.finish(); return o


def hoist():
    o = Obj('hoist', (13, 1, 3, 1), up=48, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 3 * T
    ground_shadow(cv, X(w // 2), Y(44), w // 2, 6, 80)
    beam_y = -42
    for (fx, tx) in ((6, 20), (34, 20), (w - 6, w - 20), (w - 34, w - 20)):
        for s in range(140):
            t = s / 140; x = fx + (tx - fx) * t; y = 44 + (beam_y + 6 - 44) * t
            cv.put(X(int(x)), Y(int(y)), C('warn', 1)); cv.put(X(int(x) + 1), Y(int(y)), C('warn', 2))
            cv.put(X(int(x) + 2), Y(int(y)), C('warn', 3)); cv.put(X(int(x) + 3), Y(int(y)), C('warn', 4))
        cv.rect(X(fx - 4), Y(40), 10, 4, C('warn', 3)); hl(cv, X(fx - 4), Y(40), 10, C('warn', 2))
    for s in range(w - 40):   # cross tie at knee height
        cv.put(X(20 + s), Y(8), C('warn', 3)); cv.put(X(20 + s), Y(9), C('warn', 4))
    cv.rect(X(12), Y(beam_y), w - 24, 9, C('warn', 2)); hl(cv, X(12), Y(beam_y), w - 24, C('warn', 0)); hl(cv, X(12), Y(beam_y + 1), w - 24, C('warn', 1))
    hl(cv, X(12), Y(beam_y + 8), w - 24, C('warn', 4))
    for x in range(16, w - 14, 10): cv.put(X(x), Y(beam_y + 4), C('warn', 4)); cv.put(X(x), Y(beam_y + 3), C('warn', 0))
    cv.rect(X(w // 2 - 22), Y(beam_y + 2), 44, 5, C('warn', 1))   # blank SWL plate area (paint only)
    tx = w // 2 - 9
    cv.rect(X(tx), Y(beam_y + 9), 18, 6, C('under', 2)); hl(cv, X(tx), Y(beam_y + 9), 18, C('under', 0))
    for wx in (tx + 3, tx + 14): cv.ellipse(X(wx), Y(beam_y + 9), 2, 2, C('metal', 2))
    cv.rect(X(tx + 1), Y(beam_y + 17), 16, 18, C('paint_red', 2)); hl(cv, X(tx + 1), Y(beam_y + 17), 16, C('paint_red', 1)); vl(cv, X(tx + 1), Y(beam_y + 17), 18, C('paint_red', 1)); vl(cv, X(tx + 16), Y(beam_y + 17), 18, C('paint_red', 4))
    cv.ellipse(X(tx + 9), Y(beam_y + 25), 5, 5, C('metal', 2)); cv.ellipse(X(tx + 9), Y(beam_y + 25), 2, 2, C('metal', 4))
    for y in range(beam_y + 35, beam_y + 60): cv.put(X(tx + 9), Y(y), C('metal', 1) if y % 2 else C('metal', 3)); cv.put(X(tx + 10), Y(y), C('metal', 4) if y % 2 else C('metal', 2))
    for y in range(beam_y + 35, beam_y + 80):   # hand chain loop
        cv.put(X(tx + 1), Y(y), C('metal', 2) if y % 2 else C('metal', 4)); cv.put(X(tx + 16), Y(y), C('metal', 2) if y % 2 else C('metal', 4))
    hl(cv, X(tx + 1), Y(beam_y + 80), 16, C('metal', 3))
    hy = beam_y + 60
    cv.rect(X(tx + 6), Y(hy), 8, 4, C('warn', 2)); hl(cv, X(tx + 6), Y(hy), 8, C('warn', 1))
    for k, (dx, dy) in enumerate(((9, 4), (9, 5), (9, 6), (9, 7), (10, 8), (11, 9), (12, 10), (12, 11), (11, 12), (10, 13), (9, 13), (8, 12), (7, 11))):
        cv.put(X(tx + dx), Y(hy + dy), C('metal', 1 if k < 6 else 2)); cv.put(X(tx + dx + 1), Y(hy + dy), C('metal', 3))
    o.finish(); return o


def fire_point():
    o = Obj('fire_point', (23, 1, 1, 1), up=40, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(24), Y(44), 22, 4, 80)
    cv.rect(X(4), Y(28), 40, 16, C('paint_red', 3)); hl(cv, X(4), Y(28), 40, C('paint_red', 1)); hl(cv, X(4), Y(43), 40, C('paint_red', 4))
    for (ex, band) in ((8, None), (26, 'paint_black')):
        cyl_v(cv, X(ex), Y(-12), 13, 40, 'paint_red', 0, 4)
        cv.ellipse(X(ex + 6.5), Y(-12), 6.5, 3, C('paint_red', 1))
        cv.rect(X(ex + 2), Y(0), 9, 9, C('paper', 1)); hl(cv, X(ex + 2), Y(0), 9, C('paper', 0))   # blank label
        if band: hl(cv, X(ex + 1), Y(-3), 11, C(band, 1)); hl(cv, X(ex + 1), Y(-2), 11, C(band, 2))
        cv.rect(X(ex + 3), Y(-20), 7, 7, C('under', 2)); hl(cv, X(ex + 3), Y(-20), 7, C('metal', 1))
        for k in range(12): cv.put(X(ex + 11 + (k > 6)), Y(-17 + k), C('under', 3))
        cv.put(X(ex + 2), Y(-8), C('white', 0))
    o.finish(); return o


def racking():
    o = Obj('racking', (27, 1, 4, 1), up=50, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 4 * T - 12
    ground_shadow(cv, X(w // 2 + 4), Y(44), w // 2 + 6, 6, 90)
    shelves = [-28, 0, 30]
    for sy in shelves:
        cv.rect(X(0), Y(sy), w, 6, C('steel_blue', 2)); hl(cv, X(0), Y(sy), w, C('steel_blue', 0)); hl(cv, X(0), Y(sy + 1), w, C('steel_blue', 1)); hl(cv, X(0), Y(sy + 5), w, C('steel_blue', 4))
        hl(cv, X(0), Y(sy + 6), w, SHADOW[:3] + (120,)); hl(cv, X(0), Y(sy + 7), w, SHADOW[:3] + (70,))
    for px_ in (0, w - 4, w // 2 - 2):
        cv.rect(X(px_), Y(-32), 4, 76, C('steel_blue', 3)); vl(cv, X(px_), Y(-32), 76, C('steel_blue', 1)); vl(cv, X(px_ + 3), Y(-32), 76, C('steel_blue', 4))
        for y in range(-28, 42, 6): cv.put(X(px_ + 1), Y(y), C('steel_blue', 5)); cv.put(X(px_ + 2), Y(y), C('steel_blue', 5))
    for k, bx in enumerate((6, 32, 54, 96, 124, 150)):   # top: cardboard boxes (blank labels)
        bw = 20 + (k % 2) * 6; bh = 12 + (k % 3) * 3
        if bx + bw > w - 4: continue
        cv.rect(X(bx), Y(-28 - bh), bw, bh, C('cork', 2)); hl(cv, X(bx), Y(-28 - bh), bw, C('cork', 1)); vl(cv, X(bx), Y(-28 - bh), bh, C('cork', 1)); vl(cv, X(bx + bw - 1), Y(-28 - bh), bh, C('cork', 4))
        hl(cv, X(bx), Y(-28 - bh + 5), bw, C('cork', 3)); vl(cv, X(bx + bw // 2), Y(-28 - bh), 5, C('cork', 3))
        cv.rect(X(bx + 4), Y(-28 - bh + 9), 9, 6, C('paper', 1)); hl(cv, X(bx + 4), Y(-28 - bh + 9), 9, C('paper', 0))
    for k in range(4):   # middle: brake blocks, a spare headlamp, coiled air hose
        for j in range(3 - k // 2):
            if k > 2: continue
            bx = X(8 + j * 17); by = Y(0 - 7 - k * 5)
            cv.rect(bx, by, 15, 6, C('rust', 2)); hl(cv, bx, by, 15, C('rust', 1)); hl(cv, bx, by + 5, 15, C('rust', 4)); vl(cv, bx + 14, by, 6, C('rust', 3))
    cv.ellipse(X(96), Y(-13), 12, 12, C('under', 2)); cv.ellipse(X(96), Y(-13), 9, 9, C('metal', 1)); cv.ellipse(X(95), Y(-14), 7, 7, C('glass', 0))
    cv.ellipse(X(95), Y(-14), 4, 4, C('glass', 1)); cv.put(X(91), Y(-17), C('white', 0)); cv.put(X(92), Y(-18), C('white', 0))
    for r in (15, 11, 7):
        cv.ellipse(X(146), Y(-12), r, 10, C('under', 1 if r == 15 else (2 if r == 11 else 4))); cv.ellipse(X(146), Y(-12), r - 3, 7, C('under', 4))
    cv.rect(X(12), Y(6), 24, 22, C('paint_red', 2)); hl(cv, X(12), Y(0), 24, C('paint_red', 1)); vl(cv, X(35), Y(0), 24, C('paint_red', 4))   # jerry can
    for k in range(4): cv.put(X(17 + k * 5), Y(-15 + k), C('paint_red', 4)); cv.put(X(18 + k * 5), Y(-16 + k), C('paint_red', 4))
    cv.rect(X(18), Y(-5), 11, 5, C('paint_red', 3)); hl(cv, X(18), Y(-5), 11, C('paint_red', 1))
    cv.rect(X(44), Y(6), 46, 18, C('wood', 2)); hl(cv, X(44), Y(6), 46, C('wood', 1)); hl(cv, X(44), Y(15), 46, C('wood', 3)); vl(cv, X(89), Y(6), 18, C('wood', 4))
    for k in range(12): cv.put(X(47 + k * 3), Y(-23 - (k % 2)), C('metal', 1 + k % 3))
    cyl_v(cv, X(104), Y(8), 18, 16, 'metal', 0, 5); cv.ellipse(X(113), Y(8), 9, 3, C('metal', 1)); cv.rect(X(107), Y(13), 12, 6, C('paint_cream', 1))
    for k in range(3): cyl_v(cv, X(130 + k * 13), Y(10), 11, 14, ['mustard', 'forest', 'paint_blue'][k], 0, 4)
    cv.rect(X(8), Y(34), 22, 12, C('warn', 2)); hl(cv, X(8), Y(34), 22, C('warn', 1))   # wheel chocks
    cv.rect(X(34), Y(36), 22, 10, C('warn', 2)); hl(cv, X(34), Y(36), 22, C('warn', 1))
    cv.ellipse(X(118), Y(38), 22, 10, lambda x, y, nx, ny, nz: shade('tweed', light(nx, ny, nz)))   # sack of sand
    for k in range(5): cv.put(X(108 + k * 4), Y(20 + (k % 2)), C('tweed', 3))
    o.finish(); return o


def workbench():
    o = Obj('workbench', (26, 9, 3, 2), up=64, m=2, tile=[27, 9])
    cv, X, Y = o.cv, o.X, o.Y
    w, d = 3 * T, 2 * T
    ground_shadow(cv, X(w // 2 + 6), Y(d - 6), w // 2 + 4, 10, 90)
    top_y, top_d, apron = 10, 38, 12
    fy = top_y + top_d + apron
    for lx in (6, w - 16): cv.rect(X(lx + 3), Y(16), 7, fy - 16, C('oak', 4))   # back legs
    shelf_y = 72
    cv.rect(X(6), Y(shelf_y), w - 12, 7, C('oak', 3)); hl(cv, X(6), Y(shelf_y), w - 12, C('oak', 1)); hl(cv, X(6), Y(shelf_y + 6), w - 12, C('oak', 5))
    for k in range(5): vl(cv, X(10 + k * 26), Y(shelf_y + 1), 5, C('oak', 4))
    # on the shelf: a red toolbox, oil tins, rags
    cv.rect(X(18), Y(shelf_y - 16), 32, 16, C('paint_red', 2)); hl(cv, X(18), Y(shelf_y - 16), 32, C('paint_red', 1)); vl(cv, X(49), Y(shelf_y - 16), 16, C('paint_red', 4))
    hl(cv, X(18), Y(shelf_y - 9), 32, C('paint_red', 4)); hl(cv, X(18), Y(shelf_y - 8), 32, C('paint_red', 1))
    hl(cv, X(26), Y(shelf_y - 19), 16, C('metal', 2)); vl(cv, X(26), Y(shelf_y - 19), 3, C('metal', 2)); vl(cv, X(41), Y(shelf_y - 19), 3, C('metal', 2))
    cv.rect(X(32), Y(shelf_y - 11), 4, 3, C('metal', 1))
    cyl_v(cv, X(58), Y(shelf_y - 14), 11, 14, 'mustard', 0, 4); cv.rect(X(60), Y(shelf_y - 10), 7, 5, C('paper', 1))
    cyl_v(cv, X(72), Y(shelf_y - 11), 9, 11, 'forest', 0, 4)
    for k in range(30): cv.put(X(90 + k % 15), Y(shelf_y - 3 - k // 15 - (k % 4 == 0)), C('cream', 2 + k % 2))
    for lx in (3, w - 13):   # front legs
        cv.rect(X(lx), Y(fy), 10, d - 4 - fy, C('oak', 2))
        vl(cv, X(lx), Y(fy), d - 4 - fy, C('oak', 1)); vl(cv, X(lx + 9), Y(fy), d - 4 - fy, C('oak', 4)); hl(cv, X(lx), Y(d - 5), 10, C('oak', 4))
    grain(cv, X(0), Y(top_y), w, top_d, 'oak', 1, 7)   # the top: thick worn timber
    hl(cv, X(0), Y(top_y), w, C('oak', 0))
    for bx in range(0, w, 36): vl(cv, X(bx), Y(top_y), top_d, C('oak', 3))   # board joints
    for (cx, cy) in ((34, 22), (104, 36), (60, 42)):
        cv.ellipse(X(cx), Y(cy), 8, 3, C('oak', 3)); cv.ellipse(X(cx), Y(cy), 5, 2, C('oak', 2))
    for k in range(6): hl(cv, X(70 + k * 3), Y(top_y + 30 + k % 2), 4, C('oak', 3))   # knife marks
    cv.rect(X(0), Y(top_y + top_d), w, apron, C('oak', 2)); hl(cv, X(0), Y(top_y + top_d), w, C('oak', 1)); hl(cv, X(0), Y(fy - 1), w, C('oak', 4))
    vl(cv, X(w - 1), Y(top_y), top_d + apron, C('oak', 4))
    for dx in (44, 92):
        cv.rect(X(dx), Y(top_y + top_d + 2), 16, 7, C('oak', 3)); hl(cv, X(dx), Y(top_y + top_d + 2), 16, C('oak', 4))
        hl(cv, X(dx + 5), Y(top_y + top_d + 5), 6, C('metal', 1)); hl(cv, X(dx + 5), Y(top_y + top_d + 6), 6, C('metal', 3))
    # engineer's vice
    cv.rect(X(4), Y(top_y - 8), 24, 13, C('paint_blue', 2)); hl(cv, X(4), Y(top_y - 8), 24, C('paint_blue', 1)); vl(cv, X(27), Y(top_y - 8), 13, C('paint_blue', 4)); hl(cv, X(4), Y(top_y + 4), 24, C('paint_blue', 4))
    cv.rect(X(7), Y(top_y - 13), 8, 6, C('metal', 2)); cv.rect(X(17), Y(top_y - 13), 8, 6, C('metal', 3)); hl(cv, X(7), Y(top_y - 13), 18, C('metal', 0))
    for k in range(4): cv.put(X(15 + k // 2), Y(top_y - 12 + k), C('metal', 5))
    hl(cv, X(-1), Y(top_y + 1), 9, C('metal', 1)); hl(cv, X(-1), Y(top_y + 2), 9, C('metal', 3)); cv.rect(X(-2), Y(top_y), 2, 4, C('metal', 2))
    for k in range(5):   # spanners laid out
        sx = X(38 + k * 8); sy = Y(top_y + 8)
        vl(cv, sx, sy + 3, 16 - k, C('metal', 1)); vl(cv, sx + 1, sy + 3, 16 - k, C('metal', 3))
        cv.rect(sx - 1, sy, 5, 4, C('metal', 2)); cv.put(sx + 1, sy, C('oak', 1)); cv.put(sx + 1, sy + 19 - k, C('metal', 2))
    cv.rect(X(80), Y(top_y + 14), 20, 4, C('wood', 2)); hl(cv, X(80), Y(top_y + 14), 20, C('wood', 1))   # hammer
    cv.rect(X(98), Y(top_y + 10), 7, 11, C('metal', 2)); hl(cv, X(98), Y(top_y + 10), 7, C('metal', 0)); vl(cv, X(104), Y(top_y + 10), 11, C('metal', 4))
    for k in range(30): cv.put(X(52 + k % 14), Y(top_y + 26 + k // 14 + (k % 3 == 0)), C('paint_red', 1 + k % 2))   # rag
    cyl_v(cv, X(72), Y(top_y + 21), 9, 10, 'white', 0, 4)   # mug of tea
    cv.ellipse(X(76), Y(top_y + 21), 4, 1.5, C('tweed', 3)); cv.put(X(81), Y(top_y + 24), C('white', 3)); cv.put(X(82), Y(top_y + 25), C('white', 3)); cv.put(X(81), Y(top_y + 27), C('white', 3))
    for k in range(4): cv.put(X(10 + k * 3), Y(top_y + 30), C('metal', 2 + k % 2))   # nuts and washers
    # the radio: a cream-and-teal 60s transistor with a big dial and a telescopic aerial
    rx, ry = X(104), Y(top_y - 18)
    cv.rect(rx, ry, 34, 24, C('teal', 2)); hl(cv, rx, ry, 34, C('teal', 0)); hl(cv, rx, ry + 1, 34, C('teal', 1)); vl(cv, rx, ry, 24, C('teal', 1)); vl(cv, rx + 33, ry, 24, C('teal', 4)); hl(cv, rx, ry + 23, 34, C('teal', 4))
    cv.rect(rx + 3, ry + 5, 28, 14, C('paint_cream', 1)); hl(cv, rx + 3, ry + 5, 28, C('paint_cream', 0)); hl(cv, rx + 3, ry + 18, 28, C('paint_cream', 3))
    for gx in range(rx + 5, rx + 17, 2): vl(cv, gx, ry + 7, 10, C('paint_cream', 3))
    cv.ellipse(rx + 24, ry + 12, 5, 5, C('gold', 2)); cv.ellipse(rx + 23, ry + 11, 3, 3, C('gold', 1)); cv.put(rx + 22, ry + 10, C('gold', 0))
    for k in range(4): cv.put(rx + 24 + k // 2, ry + 12 - k, OUTLINE)
    hl(cv, rx + 5, ry - 3, 24, C('leather', 2)); hl(cv, rx + 5, ry - 2, 24, C('leather', 3)); vl(cv, rx + 5, ry - 3, 4, C('leather', 2)); vl(cv, rx + 28, ry - 3, 4, C('leather', 2))
    cv.rect(rx + 3, ry + 20, 6, 2, C('paint_black', 1)); cv.rect(rx + 25, ry + 20, 6, 2, C('paint_black', 1))
    for k in range(34): cv.put(rx + 30 + k // 8, ry - 1 - k, C('metal', 1 if k % 6 else 3))
    cv.put(rx + 34, ry - 35, C('metal', 0)); cv.put(rx + 34, ry - 36, C('metal', 2))
    cv.ellipse(X(92), Y(top_y + 4), 4, 2, C('under', 3))   # radio's lead to a plug
    o.extra['points'] = {'radio': [rx + 17, ry - 3], 'aerial_tip': [rx + 34, ry - 36]}
    o.finish(); return o


def cushions():
    """Salvaged railcar seat cushions (moquette) piled into a nest with a tartan blanket and a saucer: Sleeper's bed."""
    o = Obj('cushions', (1, 9, 2, 2), up=14, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(50), Y(88), 48, 10, 90)
    def cushion(x, y, w, h, rn):
        for yy in range(h):
            for xx in range(w):
                ex = min(xx, w - 1 - xx); ey = min(yy, h - 1 - yy)
                if ex < 6 and ey < 6 and (6 - ex) ** 2 + (6 - ey) ** 2 > 36: continue
                nx = (xx + 0.5) / w * 2 - 1; ny = (yy + 0.5) / h * 2 - 1
                nx, ny = nx * abs(nx) ** 1.5, ny * abs(ny) ** 1.5    # puffy: flat middle, rounded edges
                c = shade(rn, light(nx * 0.9, ny * 1.1, 0.7) + 0.08)
                li = int(round((1 - light(nx * 0.9, ny * 1.1, 0.7) - 0.08) * 4))
                if 3 < ex and 3 < ey and ((xx + yy) % 10 == 0 or (xx - yy) % 10 == 0): c = C(rn, max(0, min(4, li - 1)))   # lattice moquette
                if ex == 2 or ey == 2: c = C(rn, 3) if (xx + yy) % 2 else C(rn, 2)     # piping
                cv.put(x + xx, y + yy, c)
        hl(cv, x + 3, y + h, w - 6, C(rn, 4))
        for bx in (x + w // 3, x + 2 * w // 3):
            cv.put(bx, y + h // 2, C(rn, 4)); cv.put(bx, y + h // 2 - 1, C(rn, 1))
    cushion(X(3), Y(46), 66, 38, 'moquette_r')
    cushion(X(34), Y(34), 60, 38, 'moquette_g')
    cushion(X(9), Y(12), 57, 33, 'moquette_r')
    for yy in range(28):   # tartan blanket draped over, with a hollow where the cat curls
        for xx in range(52):
            if (xx - 26) ** 2 / 700 + (yy - 14) ** 2 / 196 > 1: continue
            c = C('wine', 2)
            if xx % 11 in (0, 1): c = C('forest', 2)
            if yy % 8 == 0: c = C('forest', 3)
            if xx % 11 == 6: c = C('mustard', 2)
            if yy % 8 == 4 and xx % 2: c = C('mustard', 3)
            if (xx - 26) ** 2 / 170 + (yy - 13) ** 2 / 60 < 1: c = darker(c, 0.8)
            cv.put(X(21 + xx), Y(38 + yy), c)
    for k in range(6): cv.put(X(20 + k * 9), Y(66 + (k % 2)), C('wine', 3)); cv.put(X(20 + k * 9), Y(67 + (k % 2)), C('wine', 3))   # fringe
    cv.ellipse(X(84), Y(86), 9, 3, C('white', 2)); cv.ellipse(X(84), Y(85), 6, 2, C('white', 0)); cv.ellipse(X(84), Y(85), 4, 1, C('paper', 1))
    cv.ellipse(X(12), Y(88), 7, 3, C('metal', 3)); cv.ellipse(X(12), Y(87), 5, 2, C('tweed', 2)); cv.put(X(10), Y(86), C('tweed', 1))
    for (mx, my) in ((70, 20), (74, 16)):   # a toy mouse (knitted)
        pass
    cv.ellipse(X(76), Y(24), 5, 3, C('hair_grey', 2)); cv.put(X(72), Y(23), C('flower_red', 1)); hl(cv, X(81), Y(25), 5, C('flower_red', 2))
    o.extra['points'] = {'cat_bed': [X(47), Y(52)]}
    o.finish(); return o


def buffer_stop():
    """A rail-built buffer stop at the west end: a red timber beam across both rails (seen from above, running
    north-south), braced back to the rails by bent-rail struts, timber buffer blocks and a lamp."""
    o = Obj('buffer_stop', (1, 5, 2, 2), up=40, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    fr, nr = FAR_RAIL - 5 * T, NEAR_RAIL - 5 * T      # rail rows in footprint coords
    bx0, bx1 = 58, 70                                  # beam (x) in footprint coords
    h = 22                                             # beam height above the rails
    for y in range(fr - 6, nr + 10):
        cv.put(X(bx1 + 4), Y(y), SHADOW[:3] + (90,)); cv.put(X(bx1 + 5), Y(y), SHADOW[:3] + (60,))
    for ry in (fr, nr):   # struts: from the beam top down to the rail, to the west
        for s_ in range(70):
            t = s_ / 70; x = bx0 - 50 * t; y = ry - h + (h + 1) * t
            cv.put(X(int(x)), Y(int(y)), C('rail', 1)); cv.put(X(int(x)), Y(int(y) + 1), C('rust', 2)); cv.put(X(int(x)), Y(int(y) + 2), C('rust', 4))
        for y in range(ry - h, ry + 3):   # upright
            cv.put(X(bx0 - 2), Y(y), C('rail', 1)); cv.put(X(bx0 - 1), Y(y), C('rust', 2)); cv.put(X(bx0), Y(y), C('rust', 3))
    # the beam: lit top face running across the road, front (south) end face, white band
    for y in range(fr - 8 - h, nr + 6 - h):
        for x in range(bx0, bx1):
            c = C('paint_red', 1 if x < bx0 + 3 else 2)
            if x == bx1 - 1: c = C('paint_red', 3)
            if hash01(x, y, 4) < 0.05: c = C('rust', 2)
            cv.put(X(x), Y(y), c)
    for y in range(fr - 8 - h, nr + 6 - h):
        if ((y - (fr - 8 - h)) // 6) % 2: 
            for x in range(bx0 + 1, bx1 - 1): cv.put(X(x), Y(y), C('white', 1 if x < bx0 + 4 else 2))
    cv.rect(X(bx0), Y(nr + 6 - h), bx1 - bx0, h - 2, C('paint_red', 3)); hl(cv, X(bx0), Y(nr + 6 - h), bx1 - bx0, C('paint_red', 2))
    hl(cv, X(bx0), Y(nr + 3), bx1 - bx0, C('paint_red', 4))
    for ry in (fr, nr):   # timber buffer blocks on the east face, facing the car
        cv.rect(X(bx1), Y(ry - h + 2), 9, 12, C('oak', 2)); hl(cv, X(bx1), Y(ry - h + 2), 9, C('oak', 0)); vl(cv, X(bx1 + 8), Y(ry - h + 2), 12, C('oak', 4)); hl(cv, X(bx1), Y(ry - h + 13), 9, C('oak', 4))
        for k in range(3): cv.put(X(bx1 + 2 + k * 3), Y(ry - h + 6), C('oak', 3))
    lx, ly = bx0 + 1, (fr + nr) // 2 - h - 18   # a lamp on top of the beam
    cv.rect(X(lx), Y(ly), 10, 13, C('paint_black', 2)); hl(cv, X(lx), Y(ly), 10, C('paint_black', 0)); vl(cv, X(lx + 9), Y(ly), 13, C('paint_black', 3))
    cv.rect(X(lx + 2), Y(ly + 3), 6, 6, C('paint_red', 1)); cv.put(X(lx + 2), Y(ly + 3), C('flower_red', 0)); cv.rect(X(lx + 3), Y(ly - 3), 4, 3, C('paint_black', 3))
    o.finish(); return o


def exit_sign():
    return exit_sign_at('exit_sign', EXIT_X, TH)


def exit_sign_at(name, exit_x, th=None):
    th = th or (H // T)
    o = Obj(name, (exit_x // T, th - 1, 2, 0), up=2, m=2, down=26)
    cv, X, Y = o.cv, o.X, o.Y
    cv.rect(X(18), Y(4), 60, 20, OUTLINE)
    cv.rect(X(19), Y(5), 58, 18, C('enamel_g', 2)); hl(cv, X(19), Y(5), 58, C('enamel_g', 0)); hl(cv, X(19), Y(22), 58, C('enamel_g', 4))
    cv.rect(X(21), Y(7), 54, 14, C('enamel_g', 1)); cv.rect(X(22), Y(8), 52, 12, C('enamel_g', 2))
    o.extra['text_slot'] = [X(22), Y(8), 52, 12]
    o.extra['note'] = 'hangs over the exit gap on the south wall; draw after actors'
    o.extra['glow'] = True
    return o


def marjorie_obj():
    cv, pts, slots = MJ.build()
    anchor = [MJ.MX + MJ.L // 2, MJ.CONTACT - 1]
    at = [4 * T + MJ.L // 2, NEAR_RAIL]
    return cv, {'w': cv.w, 'h': cv.h, 'anchor': anchor, 'at': at, 'tile': [16, 6], 'foot': [4, 4, 24, 3],
                'fade': [4, 2, 24, 2], 'points': pts, 'text_slots': slots}


def build():
    objs = [workbench(), oil_drums(), hoist(), fire_point(), racking(), cushions(), buffer_stop(), exit_sign()]
    return {'size': [W, H], 'floor': floor(), 'walls': walls(), 'overlay': overlay(), 'objects': objs, 'marjorie': marjorie_obj()}
