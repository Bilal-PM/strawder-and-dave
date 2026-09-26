"""The depot (brick engine shed, 1911) interior, 32x14 tiles. Oily concrete, rails set in the floor with an inspection
pit under Marjorie, a brick north wall with tall arched windows, big green doors on the east wall."""
from ilib import *
import marjorie as MJ

TW, TH = 32, 14
W, H = TW * TILE, TH * TILE
NEAR_RAIL = 216            # rail head (top row) of the near (south) rail: Marjorie's wheels sit here
FAR_RAIL = 166
PIT = (7 * TILE, 24 * TILE + 16, 174, 210)   # x0, x1, y0, y1 of the inspection pit (between the rails)
WINDOWS = [3, 10, 17, 24]
SEED = 1911


# ------------------------------------------------------------------ floor
def concrete(x, y):
    """Oily concrete: slab tone, mottle, joints, stains. Returns ramp index into 'concrete' / oil colour."""
    sx, sy = x // 128, (y - 8) // 112
    tone = hash01(sx, sy, SEED) * 0.14
    n = fbm(x, y, 20, SEED + 1, 3)
    grit = hash01(x, y, SEED + 2)
    v = 0.55 + (n - 0.5) * 0.5 - tone
    i = 1 if v > 0.62 else (2 if v > 0.4 else 3)
    if grit < 0.035: i += 1
    elif grit > 0.975: i -= 1
    return i


def oil_mask(x, y):
    """0..1 oil-stain strength: along the track, under where engines stood, and a few random blots."""
    s = 0.0
    if 150 < y < 236: s += 0.35 * (1 - abs(y - 196) / 46)
    for (cx, cy, r) in ((456 + 128, 232, 60), (300 + 128, 236, 40), (860, 330, 34), (140, 262, 30), (905, 250, 28), (60, 318, 22)):
        d = math.hypot((x - cx) / r, (y - cy) / (r * 0.55))
        if d < 1: s += (1 - d) * 0.9
    return s + (fbm(x, y, 14, SEED + 3, 3) - 0.5) * 0.7


def floor():
    cv = Canvas(W, H)
    px = cv.px
    oil = [C('oil', i) for i in range(5)]
    for y in range(H):
        for x in range(W):
            i = concrete(x, y)
            c = C('concrete', i)
            o = oil_mask(x, y)
            if o > 0.95: c = oil[2]
            elif o > 0.72: c = oil[1] if (x + y) % 2 == 0 and o < 0.8 else oil[0]
            elif o > 0.52: c = C('concrete', min(4, i + 1))
            px[x, y] = c
    # slab joints (sawn), with a lit lip on the far side
    for x0 in range(128, W, 128):
        for y in range(64, H):
            if not (160 <= y <= 224): px[x0, y] = C('concrete', 4); px[x0 + 1, y] = C('concrete', 1)
    for y0 in (120, 232, 344):
        for x in range(32, W - 32):
            px[x, y0] = C('concrete', 4); px[x, y0 + 1] = C('concrete', 1)
    # hairline cracks (random walks)
    for k in range(9):
        x = 40 + hash01(k, 1, SEED + 4) * (W - 80); y = 240 + hash01(k, 2, SEED + 4) * 170
        a = hash01(k, 3, SEED + 4) * 6.28
        for s in range(40 + int(hash01(k, 4, SEED + 4) * 60)):
            a += (hash01(k, s, SEED + 5) - 0.5) * 0.9
            x += math.cos(a); y += math.sin(a) * 0.6
            if 0 <= x < W and 64 < y < H: px[int(x), int(y)] = C('concrete', 4)
    # faded yellow walkway lines either side of the road (chipped)
    for yl in (132, 244):
        for x in range(40, W - 40):
            for yy in (yl, yl + 1, yl + 2):
                if fbm(x, yy, 6, SEED + 6, 2) > 0.36 and hash01(x, yy, 7) > 0.08:
                    px[x, yy] = C('warn', 2 if yy < yl + 2 else 3) if fbm(x, yy, 3, 9) > 0.42 else C('warn', 3)
    # the road: rails set flush in the concrete with flangeways
    track(cv)
    pit(cv)
    # Marjorie's shadow on the floor (under the car and a little to the lower right)
    for y in range(196, 226):
        for x in range(4 * TILE + 8, 28 * TILE + 6):
            t = (y - 196) / 30
            cv.put(x, y, SHADOW[:3] + (int(70 + 40 * (1 - abs(t - 0.6))),))
    # AO where the floor meets the walls
    for y in range(64, 76):
        a = int(110 * (1 - (y - 64) / 12) ** 1.6)
        for x in range(0, W): cv.put(x, y, SHADOW[:3] + (a,))
    for x in range(32, 42):
        a = int(90 * (1 - (x - 32) / 10) ** 1.6)
        for y in range(64, H): cv.put(x, y, SHADOW[:3] + (a,))
    # drain gully with a grate, near the workbench
    gx, gy = 22 * TILE + 8, 11 * TILE + 8
    cv.rect(gx - 1, gy - 1, 22, 14, C('under', 1)); cv.rect(gx, gy, 20, 12, C('under', 4))
    for xx in range(gx + 1, gx + 20, 3): vl(cv, xx, gy, 12, C('metal', 3)); vl(cv, xx + 1, gy + 1, 11, C('under', 2))
    hl(cv, gx - 1, gy - 1, 22, C('metal', 2))
    # sawdust spread on an oil spill by the bench
    speck(cv, 24 * TILE, 8 * TILE + 8, 70, 30, [C('sand', 1), C('sand', 2), C('sand', 0)], 0.35, SEED + 8,
          test=lambda x, y: ((x - 24 * TILE - 35) / 35) ** 2 + ((y - 8 * TILE - 23) / 15) ** 2 < 1)
    # coir mat at the door + light spill in from outside
    mat(cv, 15 * TILE + 2, 12 * TILE + 6, 60, 24)
    spill(cv, 15 * TILE, 13 * TILE, 2 * TILE)
    return cv


def rail_row(cv, x0, x1, y, rusty=True):
    """A rail head seen from above, set in concrete: groove, head (lit top), rusty edge."""
    for x in range(x0, x1):
        cv.put(x, y - 2, C('concrete', 4))
        cv.put(x, y - 1, C('under', 3))                     # flangeway groove
        n = hash01(x, y, 3)
        cv.put(x, y, C('rail', 1) if n > 0.3 else C('rust', 1))
        cv.put(x, y + 1, C('rust', 2) if n > 0.2 else C('rail', 2))
        cv.put(x, y + 2, C('rust', 3))
        cv.put(x, y + 3, C('concrete', 3))
        if x % 96 == 40:   # fishplate joint with bolts
            for xx in range(x - 5, x + 6): cv.put(xx, y + 2, C('under', 2)); cv.put(xx, y + 3, C('under', 3))
            cv.put(x - 3, y + 3, C('metal', 2)); cv.put(x + 3, y + 3, C('metal', 2))
            cv.put(x, y, C('under', 3))


def track(cv):
    # a darker, oilier band of concrete along the road with a four-foot of old timber-look infill at the ends
    for x in range(TILE, W - TILE):
        for y in (FAR_RAIL, NEAR_RAIL):
            pass
    rail_row(cv, TILE, W, FAR_RAIL)
    rail_row(cv, TILE, W, NEAR_RAIL)
    # at the ends (outside the car) the rails sit on old sleepers in a shallow ballast channel
    for (a, b) in ((TILE, 4 * TILE - 4), (28 * TILE + 4, W)):
        for y in range(FAR_RAIL + 4, NEAR_RAIL - 2):
            for x in range(a, b):
                cv.put(x, y, C('ballast', 2 + int(hash01(x, y, 4) * 3)) if hash01(x, y, 5) < 0.8 else C('ballast', 1))
        for x in range(a + 4, b - 8, 18):
            for y in range(FAR_RAIL - 4, NEAR_RAIL + 6):
                for xx in range(9):
                    c = C('sleeper', 1 if xx < 2 else (3 if xx > 6 else 2))
                    if hash01(x + xx, y, 6) < 0.12: c = C('sleeper', 4)
                    cv.put(x + xx, y, c)
            hl(cv, x, NEAR_RAIL + 6, 9, C('sleeper', 4))
        rail_row(cv, a, b, FAR_RAIL); rail_row(cv, a, b, NEAR_RAIL)
        # chairs holding the rails
        for x in range(a + 4, b - 8, 18):
            for y in (FAR_RAIL, NEAR_RAIL):
                cv.rect(x + 1, y - 2, 7, 1, C('under', 2)); cv.rect(x + 1, y + 3, 7, 2, C('under', 3)); cv.put(x + 2, y + 3, C('metal', 3))
        # weeds pushing through (it's been a long time)
        for k in range(10):
            wx = a + int(hash01(k, 1, a) * (b - a)); wy = FAR_RAIL + 6 + int(hash01(k, 2, a) * 36)
            for j in range(4):
                cv.put(wx + j - 1, wy - (j % 2), C('grass', 2 + (j % 2))); cv.put(wx, wy - 2, C('grass', 1))


def pit(cv):
    x0, x1, y0, y1 = PIT
    # kerb (white-painted edge, chipped)
    for x in range(x0 - 2, x1 + 2):
        for y in (y0 - 3, y0 - 2, y1, y1 + 1):
            cv.put(x, y, C('paint_cream', 1 if y in (y0 - 3, y1) else 2) if hash01(x, y, 11) > 0.1 else C('concrete', 3))
    # the far (north) inner wall faces us: lit concrete with a row of little pit lights
    for y in range(y0 - 1, y0 + 16):
        for x in range(x0, x1):
            t = (y - y0) / 16
            c = C('concrete', 2 if t < 0.35 else 3) if hash01(x, y, 12) > 0.05 else C('concrete', 4)
            cv.put(x, y, c)
    for lx in range(x0 + 30, x1 - 20, 64):
        cv.rect(lx, y0 + 5, 10, 4, C('under', 3)); cv.rect(lx + 1, y0 + 6, 8, 2, C('lamp_glow', 1)); hl(cv, lx + 1, y0 + 6, 8, C('lamp_glow', 0))
        for yy in range(y0 + 9, y0 + 20):
            for xx in range(lx - 6, lx + 16):
                d = abs(xx - lx - 5) / 12 + (yy - y0 - 9) / 14
                if d < 1: cv.put(xx, yy, C('lamp_glow', 2)[:3] + (int(60 * (1 - d)),))
    # pit floor: deep, cool, with a runnel of water
    for y in range(y0 + 16, y1):
        for x in range(x0, x1):
            c = C('under', 3) if hash01(x, y, 13) > 0.1 else C('under', 2)
            cv.put(x, y, c)
    hl(cv, x0, y1 - 3, x1 - x0, C('water', 4))
    for x in range(x0, x1, 7): cv.put(x, y1 - 3, C('water', 2))
    # west end: steps down into the pit
    for k in range(4):
        sx = x0 + k * 7
        cv.rect(sx, y0 + 2 + k * 5, 7, y1 - y0 - 2 - k * 5, C('concrete', 2 + k // 2))
        hl(cv, sx, y0 + 2 + k * 5, 7, C('concrete', 1)); vl(cv, sx + 6, y0 + 2 + k * 5, y1 - y0 - 2 - k * 5, C('concrete', 4))
    # yellow-black hazard ends on the kerb
    for x in range(x0 - 2, x0 + 14):
        for y in (y0 - 3, y0 - 2, y1, y1 + 1):
            cv.put(x, y, C('warn', 1) if ((x + y) // 3) % 2 else C('under', 4))


def mat(cv, x0, y0, w, h):
    for y in range(h):
        for x in range(w):
            e = x in (0, w - 1) or y in (0, h - 1)
            c = C('tweed', 3) if e else C('tweed', 1 if (x // 2 + y) % 3 == 0 else 2)
            if hash01(x, y, 44) < 0.08: c = C('tweed', 3)
            cv.put(x0 + x, y0 + y, c)
    hl(cv, x0 + 1, y0 + h, w - 1, SHADOW[:3] + (120,))


def spill(cv, x0, y1, w):
    """A fan of warm daylight spilling in from the open doorway on the south wall."""
    for y in range(y1 - 90, y1):
        t = (y1 - y) / 90
        half = w / 2 + t * 40
        cx = x0 + w / 2
        for x in range(int(cx - half), int(cx + half)):
            e = abs(x - cx) / half
            a = int(58 * (1 - t) * (1 - e ** 3))
            if a > 3: cv.put(x, y, C('lamp_glow', 1)[:3] + (a,))


# ------------------------------------------------------------------ walls
def brick_wall(cv, x0, y0, w, h, rampn='brick', seed=0, soot=True):
    bw, bh = 10, 4
    for y in range(y0, y0 + h):
        row = (y - y0) // bh; off = (row % 2) * (bw // 2)
        for x in range(x0, x0 + w):
            bx = (x - x0 + off) // bw
            iy, ix = (y - y0) % bh, (x - x0 + off) % bw
            if iy == bh - 1 or ix == bw - 1:
                c = C('stone', 3) if iy == bh - 1 else C('stone', 4)
            else:
                v = hash01(bx, row, seed)
                i = 1 if v > 0.8 else (2 if v > 0.25 else 3)
                if iy == 0 and ix < bw - 2: i = max(0, i - 1)      # the lit top edge of each brick
                if hash01(x, y, seed + 1) < 0.06: i += 1
                if soot:
                    s = (1 - (y - y0) / h) * 0.9 + (fbm(x, y, 16, seed + 3, 2) - 0.5) * 0.6
                    if s > 0.62: i += 1
                c = C(rampn, min(4, i))
            cv.put(x, y, c)


def arched_window(cv, cx, top, bot, half):
    """A tall round-headed iron-framed window with a brick arch ring and a stone sill."""
    r = half
    def inside(x, y, rr):
        if y >= top + rr: return abs(x - cx) < rr
        return (x - cx) ** 2 + (y - (top + rr)) ** 2 < rr * rr
    # arch ring (header bricks) + reveal
    for y in range(top - 5, bot + 1):
        for x in range(cx - r - 5, cx + r + 6):
            if inside(x + 0.5, y + 0.5, r + 4) and not inside(x + 0.5, y + 0.5, r):
                if y < top + r:
                    ang = math.atan2(y - (top + r), x - cx)
                    k = int((ang + math.pi) / 0.2)
                    c = C('brick_dark', 1 if k % 2 else 2)
                    if inside(x + 0.5, y + 0.5, r + 1): c = C('stone', 2)
                else:
                    c = C('stone', 2) if abs(x - cx) < r + 1 else cv.get(x, y)
                cv.put(x, y, c)
    # glass: dusty daylight, pale sky with a hint of the hills, iron glazing bars
    for y in range(top, bot):
        for x in range(cx - r, cx + r):
            if not inside(x + 0.5, y + 0.5, r - 1): continue
            t = (y - top) / (bot - top)
            i = 0 if t < 0.35 else 1 if t < 0.62 else 2
            c = C('daylight', i)
            if t > 0.66 and fbm(x, 0, 14, 5, 2) > 0.45 - (t - 0.66): c = C('hills', 1 if t < 0.8 else 2)
            if fbm(x, y, 7, SEED + 9, 2) > 0.66: c = mix(c, C('sand', 2), 0.35)    # dust
            gx, gy = (x - (cx - r)) % 8, (y - top) % 7
            if gx == 0 or gy == 0: c = C('paint_black', 2)
            elif gx == 1 or gy == 1: c = mix(c, C('white', 0), 0.5) if t < 0.6 else c
            cv.put(x, y, c)
    # a broken pane (dark) and a pane boarded with ply, at different places per window
    k = int(hash01(cx, 0, 3) * 4)
    px0 = cx - r + 1 + 8 * (1 + k % 3); py0 = top + r + 1 + 7 * (k % 2)
    cv.rect(px0, py0, 7, 6, C('wood', 2)); hl(cv, px0, py0, 7, C('wood', 1)); cv.put(px0 + 1, py0 + 1, C('wood', 3))
    qx = cx - r + 1 + 8 * ((k + 2) % 5); qy = top + r + 8
    for yy in range(6):
        for xx in range(7):
            if xx + yy < 7: cv.put(qx + xx, qy + yy, C('glass', 4))
    # stone sill with a drip shadow
    cv.rect(cx - r - 4, bot, 2 * r + 8, 3, C('sandstone', 1)); hl(cv, cx - r - 4, bot, 2 * r + 8, C('sandstone', 0))
    hl(cv, cx - r - 3, bot + 3, 2 * r + 6, C('brick', 4))


def clock(cv, cx, cy, r=8):
    cv.ellipse(cx + 1, cy + 1, r + 1, r + 1, SHADOW[:3] + (100,))
    cv.ellipse(cx, cy, r + 1, r + 1, OUTLINE)
    cv.ellipse(cx, cy, r, r, C('paint_black', 1))
    cv.ellipse(cx, cy, r - 2, r - 2, C('paint_cream', 1))
    cv.ellipse(cx - 1, cy - 1, r - 4, r - 4, C('paint_cream', 0))
    for k in range(12):
        a = k / 12 * 6.283
        cv.put(round(cx + math.sin(a) * (r - 3)), round(cy - math.cos(a) * (r - 3)), C('paint_black', 2))
    for i in range(1, r - 3): cv.put(cx, cy - i, OUTLINE)             # minute hand at 12
    for i in range(1, r - 4): cv.put(cx + i, cy + i // 2, OUTLINE)     # hour hand at about 4
    cv.put(cx, cy, C('paint_red', 1))
    cv.put(cx - r + 2, cy - r + 3, C('white', 0))


def noticeboard(cv, x0, y0, w, h, seed, frame_r='paint_green', back='cork'):
    cv.rect(x0 + 2, y0 + 2, w, h, SHADOW[:3] + (90,))
    cv.rect(x0, y0, w, h, OUTLINE)
    cv.rect(x0 + 1, y0 + 1, w - 2, h - 2, C(frame_r, 2)); hl(cv, x0 + 1, y0 + 1, w - 2, C(frame_r, 1))
    for y in range(y0 + 3, y0 + h - 3):
        for x in range(x0 + 3, x0 + w - 3):
            cv.put(x, y, C(back, 1 if hash01(x, y, seed) > 0.25 else 2))
    # blank sheets pinned up (the game letters nothing: these are just paper)
    k = 0; x = x0 + 5
    while x < x0 + w - 12:
        pw = 9 + int(hash01(k, 1, seed) * 5); ph = 11 + int(hash01(k, 2, seed) * 6)
        py = y0 + 5 + int(hash01(k, 3, seed) * max(1, h - ph - 9))
        if x + pw > x0 + w - 4: break
        rn = ['paper', 'paper', 'sticky_y', 'sticky_b', 'paper'][k % 5]
        cv.rect(x + 1, py + 1, pw, ph, SHADOW[:3] + (80,))
        cv.rect(x, py, pw, ph, C(rn, 1)); hl(cv, x, py, pw, C(rn, 0)); vl(cv, x + pw - 1, py, ph, C(rn, 2))
        for ly in range(py + 3, py + ph - 2, 2): hl(cv, x + 2, ly, pw - 4 - (ly % 3), C(rn, 2))   # lines, not letters
        cv.put(x + pw // 2, py + 1, C('paint_red', 1))
        x += pw + 3; k += 1


def walls():
    cv = Canvas(W, H)
    # north wall: brick with a blue-brick plinth, dark roof void above
    brick_wall(cv, 0, 6, W, 58, 'brick', SEED)
    for y in range(0, 7):
        for x in range(W): cv.put(x, y, C('under', 4 if y < 5 else 3))
    # wall plate + steel roof-truss feet between the windows
    hl(cv, 0, 6, W, C('oak', 3)); hl(cv, 0, 7, W, C('oak', 4)); hl(cv, 0, 8, W, SHADOW[:3] + (120,))
    for tx in (1, 7, 14, 21, 28):
        x = tx * TILE + 16
        cv.rect(x - 3, 0, 7, 10, C('paint_black', 2)); vl(cv, x - 3, 0, 10, C('paint_black', 1))
        for k in range(8): cv.put(x - 4 - k, 9 + k // 2, C('paint_black', 1)); cv.put(x + 4 + k, 9 + k // 2, C('paint_black', 2))
        cv.rect(x - 2, 10, 5, 3, C('paint_black', 3)); cv.put(x - 1, 11, C('metal', 2))
    for y in range(52, 64):
        for x in range(W):
            if y >= 56:
                c = C('brick_dark', 2 if ((x + ((y - 56) // 4) * 5) // 10 + y // 4) % 3 else 3)
                if (x + ((y - 56) // 4) * 5) % 10 == 9 or (y - 56) % 4 == 3: c = C('stone', 4)
                cv.put(x, y, c)
    hl(cv, 0, 55, W, C('sandstone', 1)); hl(cv, 0, 56, W, C('sandstone', 3))    # string course
    hl(cv, 0, 63, W, C('brick_dark', 4))
    for c in WINDOWS: arched_window(cv, c * TILE + 32, 12, 50, 22)
    # daylight bounce under each window + a warm wash on the brick
    for c in WINDOWS:
        cx = c * TILE + 32
        for y in range(10, 64):
            for x in range(cx - 44, cx + 44):
                d = abs(x - cx) / 44
                if d < 1 and cv.get(x, y)[3]:
                    col = cv.get(x, y)
                    if col[:3] in [C('brick', i)[:3] for i in (2, 3, 4)] and hash01(x, y, 3) < (1 - d) * 0.35:
                        cv.put(x, y, C('brick', 1 if col[:3] != C('brick', 4)[:3] else 3))
    # a conduit run with a junction box and cable drops
    for x in range(TILE, W - TILE):
        cv.put(x, 15, C('metal', 2)); cv.put(x, 16, C('metal', 4))
    for jx in (7 * TILE + 20, 20 * TILE + 26):
        cv.rect(jx, 13, 8, 7, C('metal', 3)); hl(cv, jx, 13, 8, C('metal', 1)); vl(cv, jx + 7, 13, 7, C('metal', 4))
    clock(cv, 7 * TILE + 16, 30)
    noticeboard(cv, 20 * TILE + 6, 20, 60, 30, SEED + 21)
    # a blank safety board (blue) and a blank fire-point plate (red) - the game letters nothing here, it's colour only
    for (bx, col) in ((13 * TILE + 34, 'paint_blue'), (22 * TILE + 30, 'paint_red')):
        cv.rect(bx + 1, 22, 20, 14, SHADOW[:3] + (90,)); cv.rect(bx, 21, 20, 14, OUTLINE); cv.rect(bx + 1, 22, 18, 12, C('white', 1))
        cv.ellipse(bx + 7, 28, 4, 4, C(col, 1)); cv.ellipse(bx + 7, 28, 2, 2, C('white', 0))
        for ly in (25, 28, 31): hl(cv, bx + 12, ly, 5, C('white', 3))
    # a hose reel on the wall
    hx = 29 * TILE + 10
    cv.ellipse(hx + 1, 33, 11, 11, SHADOW[:3] + (90,)); cv.ellipse(hx, 32, 11, 11, OUTLINE); cv.ellipse(hx, 32, 10, 10, C('paint_red', 2))
    for rr in (8, 6, 4):
        cv.ellipse(hx, 32, rr, rr, C('paint_red', 1 if rr % 4 else 3))
    cv.ellipse(hx, 32, 2, 2, C('metal', 1))
    # west wall (col 0): wall top seen from above
    side_wall(cv, 0, lit=True)
    side_wall(cv, W - TILE, lit=False)
    east_doors(cv)
    south_wall(cv)
    return cv


def side_wall(cv, x0, lit):
    for y in range(0, H):
        for x in range(x0, x0 + TILE):
            local = x - x0
            inner = (TILE - 1 - local) if lit else local     # distance from the room side
            if y < 64 and inner > 5 and x0 > 0 and y > 6: continue
            if y < 64 and inner > 5 and x0 == 0 and y > 6: continue
            row = y // 5
            c = C('brick_dark', 3 if (row + (local // 8)) % 2 else 4)
            if y % 5 == 4 or (local + (row % 2) * 4) % 8 == 7: c = C('under', 4)
            if inner == 0: c = C('brick', 1 if lit else 3)
            elif inner == 1: c = C('brick', 2 if lit else 4)
            elif inner < 6: c = C('brick_dark', 2 + (inner > 3))
            cv.put(x, y, c)


def east_doors(cv):
    x0 = W - TILE; y0, y1 = 3 * TILE - 4, 8 * TILE + 4
    for y in range(y0, y1):
        for x in range(x0 + 2, W):
            plank = (y - y0) // 8
            ly = (y - y0) % 8
            c = C('paint_green', 2)
            if ly == 0: c = C('paint_green', 1)
            if ly == 7: c = C('paint_green', 4)
            if fbm(x, y, 8, SEED + 30, 2) > 0.68: c = C('paint_green', 3)
            if hash01(x, y, 31) < 0.04: c = C('wood', 3)      # paint worn to the wood
            cv.put(x, y, c)
    for y in (y0, y1 - 1): hl(cv, x0, y, TILE, C('under', 4))
    vl(cv, x0 + 1, y0, y1 - y0, C('under', 4)); vl(cv, x0 + 2, y0, y1 - y0, C('paint_green', 0))
    # the join between the leaves leaks daylight
    my = (y0 + y1) // 2
    hl(cv, x0 + 2, my - 1, TILE - 2, C('under', 5)); hl(cv, x0 + 3, my, TILE - 3, C('lamp_glow', 0)); hl(cv, x0 + 2, my + 1, TILE - 2, C('under', 5))
    for y in range(my - 18, my + 18):   # glow on the floor edge next to the crack
        for x in range(x0 - 20, x0):
            d = abs(y - my) / 18 + (x0 - x) / 20
            if d < 1: cv.put(x, y, C('lamp_glow', 1)[:3] + (int(50 * (1 - d)),))
    # strap hinges + a drop bar
    for hy in (y0 + 14, y0 + 50, y1 - 50, y1 - 14):
        hl(cv, x0 + 3, hy, TILE - 4, C('paint_black', 1)); hl(cv, x0 + 3, hy + 1, TILE - 4, C('paint_black', 3))
        cv.put(x0 + 6, hy, C('metal', 1))
    cv.rect(x0 + 12, my - 30, 3, 60, C('paint_black', 2)); vl(cv, x0 + 12, my - 30, 60, C('paint_black', 0))
    # rails run out under the doors
    for y in (FAR_RAIL, NEAR_RAIL):
        hl(cv, x0 + 2, y + 2, TILE - 2, C('under', 5))


EXIT_X = 15 * TILE


def south_wall(cv):
    y0 = H - TILE
    for y in range(y0, H):
        for x in range(0, W):
            if EXIT_X <= x < EXIT_X + 2 * TILE: continue
            ly = y - y0
            c = C('brick_dark', 3 if ((x + (ly // 5) * 4) // 8 + ly // 5) % 2 else 4)
            if ly % 5 == 4 or (x + (ly // 5 % 2) * 4) % 8 == 7: c = C('under', 4)
            if ly == 0: c = C('brick', 2)
            elif ly == 1: c = C('brick_dark', 1)
            elif ly == 2: c = C('brick_dark', 2)
            cv.put(x, y, c)
    doorway(cv, EXIT_X, y0, 2 * TILE, TILE, 'paint_green')


def doorway(cv, x0, y0, w, h, frame_r):
    """The exit gap in the south wall: bright outside, timber jambs, a threshold."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            t = (y - y0) / h
            cv.put(x, y, C('lamp_glow', 0) if t < 0.3 else (C('paving', 0) if t < 0.7 else C('paving', 1)))
    hl(cv, x0, y0, w, C('stone', 1)); hl(cv, x0, y0 + 1, w, C('stone', 2))   # threshold
    for jx in (x0 - 4, x0 + w):
        cv.rect(jx, y0 - 2, 4, h + 2, C(frame_r, 2)); vl(cv, jx, y0 - 2, h + 2, C(frame_r, 1)); vl(cv, jx + 3, y0 - 2, h + 2, C(frame_r, 4))


# ------------------------------------------------------------------ overlay: light shafts, dust motes, pendant lamps
def overlay():
    cv = Canvas(W, H)
    for c in WINDOWS:
        cx = c * TILE + 32
        for y in range(52, 330):
            t = (y - 52) / 278
            sx = cx - 20 + (y - 52) * 0.42
            half = 20 + t * 16
            for x in range(int(sx - half), int(sx + half)):
                e = abs(x - sx) / half
                a = int(34 * (1 - t) ** 1.2 * (1 - e ** 4))
                if a > 2: cv.put(x, y, C('lamp_glow', 0)[:3] + (a,))
        for k in range(26):   # dust motes caught in the beam
            y = 60 + int(hash01(k, 1, c) * 220); sx = cx - 20 + (y - 52) * 0.42 + (hash01(k, 2, c) - 0.5) * 30
            cv.put(int(sx), y, C('lamp_glow', 0)[:3] + (150,))
    # pendant lamps (enamel shades on chains) hanging in front of the north wall
    for lx in (6 * TILE + 16, 14 * TILE, 21 * TILE + 16, 29 * TILE):
        for y in range(0, 36):
            cv.put(lx, y, C('metal', 3) if y % 3 else C('metal', 1))
        for yy in range(8):
            ww = 3 + yy
            for x in range(lx - ww, lx + ww + 1):
                lum = light((x - lx) / (ww + 0.5), -0.4, 0.6)
                cv.put(x, 36 + yy, shade('enamel_g', lum + 0.1))
        hl(cv, lx - 11, 44, 23, C('enamel_g', 4))
        cv.ellipse(lx, 45, 6, 2, C('lamp_glow', 0))
        cv.put(lx - 4, 37, C('white', 0))
        for y in range(46, 70):   # soft glow below the shade
            for x in range(lx - 24, lx + 25):
                d = math.hypot((x - lx) / 24, (y - 46) / 24)
                if d < 1: cv.put(x, y, C('lamp_glow', 1)[:3] + (int(40 * (1 - d)),))
        outline_pendant = None
    return cv


# ------------------------------------------------------------------ objects
def workbench():
    o = Obj('workbench', (26, 9, 3, 2), up=44, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 3 * TILE
    ground_shadow(cv, X(w // 2 + 4), Y(60), w // 2 + 2, 6, 90)
    # legs (back pair then front pair) and the lower shelf
    for lx in (4, w - 10):
        cv.rect(X(lx + 2), Y(10), 5, 26, C('oak', 4))
    top_y, top_d, apron = 6, 26, 8
    shelf_y = 48
    cv.rect(X(4), Y(shelf_y), w - 8, 5, C('oak', 3)); hl(cv, X(4), Y(shelf_y), w - 8, C('oak', 1)); hl(cv, X(4), Y(shelf_y + 4), w - 8, C('oak', 5))
    for lx in (2, w - 9):
        cv_leg = C('oak', 2)
        cv.rect(X(lx), Y(top_y + top_d + apron), 7, 60 - (top_y + top_d + apron), cv_leg)
        vl(cv, X(lx), Y(top_y + top_d + apron), 60 - (top_y + top_d + apron), C('oak', 1)); vl(cv, X(lx + 6), Y(top_y + top_d + apron), 60 - (top_y + top_d + apron), C('oak', 4))
    # things on the shelf: oil cans, a tool box, rags
    cv.rect(X(14), Y(shelf_y - 10), 20, 10, C('paint_red', 2)); hl(cv, X(14), Y(shelf_y - 10), 20, C('paint_red', 1)); hl(cv, X(18), Y(shelf_y - 12), 12, C('metal', 2)); vl(cv, X(33), Y(shelf_y - 10), 10, C('paint_red', 4))
    hl(cv, X(14), Y(shelf_y - 6), 20, C('paint_red', 4))
    cyl_v(cv, X(40), Y(shelf_y - 9), 7, 9, 'mustard', 0, 4); cyl_v(cv, X(49), Y(shelf_y - 7), 6, 7, 'forest', 0, 4)
    for k in range(10): cv.put(X(60 + k), Y(shelf_y - 2 - (k % 3)), C('cream', 2 + k % 2))
    # the top: thick worn timber, lit, with oil rings and knife marks
    grain(cv, X(0), Y(top_y), w, top_d, 'oak', 1, 7)
    hl(cv, X(0), Y(top_y), w, C('oak', 0))
    for (cx, cy) in ((22, 14), (70, 22)):
        cv.ellipse(X(cx), Y(cy), 5, 2, C('oak', 3)); cv.ellipse(X(cx), Y(cy), 3, 1, C('oak', 2))
    cv.rect(X(0), Y(top_y + top_d), w, apron, C('oak', 2)); hl(cv, X(0), Y(top_y + top_d), w, C('oak', 1)); hl(cv, X(0), Y(top_y + top_d + apron - 1), w, C('oak', 4))
    vl(cv, X(w - 1), Y(top_y), top_d + apron, C('oak', 4))
    for dx in (30, 62): cv.rect(X(dx), Y(top_y + top_d + 2), 10, 4, C('oak', 3)); hl(cv, X(dx + 3), Y(top_y + top_d + 3), 4, C('metal', 2))
    # engineer's vice on the left end
    cv.rect(X(3), Y(top_y - 5), 16, 9, C('paint_blue', 2)); hl(cv, X(3), Y(top_y - 5), 16, C('paint_blue', 1)); vl(cv, X(18), Y(top_y - 5), 9, C('paint_blue', 4))
    cv.rect(X(5), Y(top_y - 8), 5, 4, C('metal', 2)); cv.rect(X(12), Y(top_y - 8), 5, 4, C('metal', 3)); hl(cv, X(5), Y(top_y - 8), 12, C('metal', 1))
    hl(cv, X(-1), Y(top_y + 1), 6, C('metal', 1)); cv.put(X(-2), Y(top_y + 1), C('metal', 3))
    # spanners laid out, a hammer, a rag, a mug of tea
    for k in range(4):
        sx = X(26 + k * 6); sy = Y(top_y + 6)
        vl(cv, sx, sy + 2, 10 - k, C('metal', 1)); vl(cv, sx + 1, sy + 2, 10 - k, C('metal', 3))
        cv.rect(sx - 1, sy, 4, 3, C('metal', 2)); cv.put(sx, sy, C('under', 3))
    cv.rect(X(50), Y(top_y + 9), 14, 3, C('wood', 2)); hl(cv, X(50), Y(top_y + 9), 14, C('wood', 1))
    cv.rect(X(63), Y(top_y + 7), 5, 7, C('metal', 2)); hl(cv, X(63), Y(top_y + 7), 5, C('metal', 0))
    for k in range(18): cv.put(X(34 + k % 9), Y(top_y + 17 + k // 9 + (k % 3 == 0)), C('paint_red', 1 + k % 2))
    cyl_v(cv, X(46), Y(top_y + 14), 6, 7, 'white', 0, 4); cv.put(X(52), Y(top_y + 16), C('white', 3)); cv.put(X(52), Y(top_y + 17), C('white', 3))
    hl(cv, X(47), Y(top_y + 14), 4, C('tweed', 3))
    # the radio: a cream-and-teal 60s transistor with a big dial and a telescopic aerial
    rx, ry = X(70), Y(top_y - 12)
    cv.rect(rx, ry, 22, 16, C('teal', 2)); hl(cv, rx, ry, 22, C('teal', 1)); vl(cv, rx, ry, 16, C('teal', 1)); vl(cv, rx + 21, ry, 16, C('teal', 4)); hl(cv, rx, ry + 15, 22, C('teal', 4))
    cv.rect(rx + 2, ry + 3, 18, 9, C('paint_cream', 1)); hl(cv, rx + 2, ry + 3, 18, C('paint_cream', 0))
    for gx in range(rx + 3, rx + 10, 2): vl(cv, gx, ry + 4, 7, C('paint_cream', 3))    # speaker grille
    cv.ellipse(rx + 15, ry + 7, 3, 3, C('gold', 2)); cv.put(rx + 14, ry + 6, C('gold', 0)); cv.put(rx + 15, ry + 7, OUTLINE)
    hl(cv, rx + 4, ry - 2, 14, C('leather', 2)); vl(cv, rx + 4, ry - 2, 3, C('leather', 2)); vl(cv, rx + 17, ry - 2, 3, C('leather', 2))
    for k in range(22): cv.put(rx + 19 + k // 6, ry - 1 - k, C('metal', 1 if k % 4 else 3))
    cv.put(rx + 22, ry - 23, C('metal', 0))
    o.extra['points'] = {'radio': [rx + 11, ry - 2], 'aerial_tip': [rx + 22, ry - 23]}
    # an oil drum stood at the right end
    o.finish()
    return o


def drum(cv, x, y, w, h, rn, lying=False):
    cyl_v(cv, x, y + 3, w, h - 3, rn, 0, 4)
    for ry in (y + 3 + (h - 3) // 3, y + 3 + 2 * (h - 3) // 3):
        hl(cv, x, ry, w, C(rn, 4)); hl(cv, x, ry - 1, w, C(rn, 1))
    cv.ellipse(x + w / 2, y + 3, w / 2, 3, C(rn, 1)); cv.ellipse(x + w / 2, y + 3, w / 2 - 2, 2, C(rn, 2))
    cv.ellipse(x + w / 2 - 3, y + 3, 2, 1, C(rn, 3)); cv.put(x + w // 2 + 3, y + 3, C('metal', 2))
    for k in range(14):   # rust + drips
        rx = x + int(hash01(k, 1, x) * w); ry = y + 6 + int(hash01(k, 2, x) * (h - 8))
        if hash01(k, 3, x) < 0.6: cv.put(rx, ry, C('rust', 2)); cv.put(rx, ry + 1, C('rust', 3))


def oil_drums():
    o = Obj('oil_drums', (5, 1, 2, 1), up=16, m=2, extra_w=4)
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(34), Y(30), 34, 5, 90)
    cv.rect(X(2), Y(20), 62, 10, C('under', 3)); hl(cv, X(2), Y(20), 62, C('under', 1)); hl(cv, X(2), Y(29), 62, C('under', 5))   # drip tray
    drum(cv, X(4), Y(-14), 20, 38, 'paint_blue')
    drum(cv, X(25), Y(-12), 20, 36, 'paint_red')
    # a third drum lying on its side in front
    cyl_h(cv, X(44), Y(10), 22, 18, 'forest', 0, 4)
    cv.ellipse(X(45), Y(19), 3, 9, C('forest', 1)); cv.ellipse(X(45), Y(19), 1, 6, C('forest', 3))
    for yy in (Y(13), Y(25)): pass
    vl(cv, X(52), Y(10), 18, C('forest', 4)); vl(cv, X(59), Y(10), 18, C('forest', 4))
    # funnel and a pump on top of the blue drum
    cv.rect(X(10), Y(-22), 3, 9, C('metal', 2)); cv.rect(X(8), Y(-24), 9, 3, C('metal', 1)); hl(cv, X(13), Y(-20), 4, C('paint_red', 2))
    cv.ellipse(X(35), Y(-12), 5, 2, C('oil', 2))
    o.finish()
    return o


def hoist():
    """An A-frame gantry with a chain block and hook, stood against the north wall."""
    o = Obj('hoist', (13, 1, 3, 1), up=58, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 3 * TILE
    ground_shadow(cv, X(w // 2), Y(28), w // 2, 4, 80)
    beam_y = -52
    for (fx, tx) in ((4, 14), (24, 14), (w - 4, w - 14), (w - 24, w - 14)):
        # legs from the feet up to the beam ends
        steps = 80
        for s in range(steps):
            t = s / steps
            x = fx + (tx - fx) * t; y = 28 + (beam_y + 4 - 28) * t
            cv.put(X(int(x)), Y(int(y)), C('warn', 2)); cv.put(X(int(x) + 1), Y(int(y)), C('warn', 3)); cv.put(X(int(x) + 2), Y(int(y)), C('warn', 4))
    cv.rect(X(8), Y(beam_y), w - 16, 6, C('warn', 2)); hl(cv, X(8), Y(beam_y), w - 16, C('warn', 0)); hl(cv, X(8), Y(beam_y + 5), w - 16, C('warn', 4))
    for x in range(10, w - 10, 12): cv.put(X(x), Y(beam_y + 2), C('warn', 4))   # bolt heads
    # trolley + chain block
    tx = w // 2 - 6
    cv.rect(X(tx), Y(beam_y + 6), 12, 4, C('under', 2)); hl(cv, X(tx), Y(beam_y + 6), 12, C('under', 0))
    cv.rect(X(tx + 1), Y(beam_y + 12), 10, 12, C('paint_red', 2)); hl(cv, X(tx + 1), Y(beam_y + 12), 10, C('paint_red', 1)); vl(cv, X(tx + 10), Y(beam_y + 12), 12, C('paint_red', 4))
    cv.ellipse(X(tx + 6), Y(beam_y + 17), 3, 3, C('metal', 2))
    for y in range(beam_y + 24, beam_y + 50):   # lifting chain + hand chain loop
        cv.put(X(tx + 6), Y(y), C('metal', 1) if y % 2 else C('metal', 3))
    for y in range(beam_y + 24, beam_y + 64):
        cv.put(X(tx + 1), Y(y), C('metal', 2) if y % 2 else C('metal', 4)); cv.put(X(tx + 11), Y(y), C('metal', 2) if y % 2 else C('metal', 4))
    hl(cv, X(tx + 1), Y(beam_y + 64), 11, C('metal', 3))
    # hook
    hy = beam_y + 50
    cv.rect(X(tx + 4), Y(hy), 5, 3, C('warn', 2))
    for k, (dx, dy) in enumerate(((6, 3), (6, 4), (6, 5), (7, 6), (8, 7), (8, 8), (7, 9), (6, 9), (5, 8))):
        cv.put(X(tx + dx), Y(hy + dy), C('metal', 1 if k < 4 else 2))
    o.finish()
    return o


def fire_point():
    o = Obj('fire_point', (23, 1, 1, 1), up=26, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(16), Y(28), 14, 3, 80)
    cv.rect(X(4), Y(18), 24, 10, C('paint_red', 3)); hl(cv, X(4), Y(18), 24, C('paint_red', 1))    # stand
    for (ex, rn) in ((7, 'paint_red'), (17, 'paint_red')):
        cyl_v(cv, X(ex), Y(-8), 8, 26, rn, 0, 4)
        cv.rect(X(ex + 1), Y(0), 6, 5, C('paper', 1))    # blank label band
        cv.rect(X(ex + 2), Y(-12), 4, 4, C('under', 2)); hl(cv, X(ex + 2), Y(-12), 4, C('metal', 1))
        vl(cv, X(ex + 7), Y(-11), 8, C('under', 3))
    hl(cv, X(18), Y(1), 6, C('paint_black', 1))   # the CO2 one gets a black band
    o.finish()
    return o


def racking():
    """Steel shelving with spares: brake blocks, a spare headlamp, boxes, a jerry can, coiled hose."""
    o = Obj('racking', (27, 1, 4, 1), up=58, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 4 * TILE - 8
    ground_shadow(cv, X(w // 2 + 2), Y(28), w // 2 + 4, 4, 90)
    shelves = [-50, -26, -2, 22]
    for sy in shelves:
        cv.rect(X(0), Y(sy), w, 4, C('steel_blue', 2)); hl(cv, X(0), Y(sy), w, C('steel_blue', 0)); hl(cv, X(0), Y(sy + 3), w, C('steel_blue', 4))
        hl(cv, X(0), Y(sy + 4), w, SHADOW[:3] + (110,))
    for px in (0, w - 3, w // 2 - 1):
        cv.rect(X(px), Y(-54), 3, 84, C('steel_blue', 3)); vl(cv, X(px), Y(-54), 84, C('steel_blue', 1))
        for y in range(-50, 28, 4): cv.put(X(px + 1), Y(y), C('steel_blue', 5))
    # top shelf: cardboard boxes (blank labels)
    for k, bx in enumerate((4, 22, 36, 64, 84)):
        bw = 14 + (k % 2) * 4; bh = 14 + (k % 3) * 3
        cv.rect(X(bx), Y(-50 - bh), bw, bh, C('cork', 2)); hl(cv, X(bx), Y(-50 - bh), bw, C('cork', 1)); vl(cv, X(bx + bw - 1), Y(-50 - bh), bh, C('cork', 4))
        hl(cv, X(bx), Y(-50 - bh + 4), bw, C('cork', 3)); cv.rect(X(bx + 3), Y(-50 - bh + 7), 6, 4, C('paper', 1))
    # middle: brake blocks stacked, a spare headlamp, coiled air hose
    for k in range(4):
        for j in range(3 - k // 2):
            bx = X(6 + j * 12); by = Y(-26 - 5 - k * 4)
            cv.rect(bx, by, 10, 4, C('rust', 2)); hl(cv, bx, by, 10, C('rust', 1)); hl(cv, bx, by + 3, 10, C('rust', 4))
    cv.ellipse(X(62), Y(-36), 9, 9, C('under', 2)); cv.ellipse(X(62), Y(-36), 7, 7, C('metal', 1)); cv.ellipse(X(61), Y(-37), 5, 5, C('glass', 0)); cv.put(X(59), Y(-40), C('white', 0))
    for r in (10, 7):
        cv.ellipse(X(96), Y(-36), r, 7, C('under', 1 if r == 10 else 3)); cv.ellipse(X(96), Y(-36), r - 2, 5, C('under', 4))
    # lower: jerry can, a crate of bits, a paint tin
    cv.rect(X(8), Y(-18), 16, 16, C('paint_red', 2)); hl(cv, X(8), Y(-18), 16, C('paint_red', 1)); vl(cv, X(23), Y(-18), 16, C('paint_red', 4))
    for k in range(3): cv.put(X(12 + k * 4), Y(-10 + k), C('paint_red', 4))
    cv.rect(X(12), Y(-21), 7, 3, C('paint_red', 3))
    cv.rect(X(30), Y(-14), 30, 12, C('wood', 2)); hl(cv, X(30), Y(-14), 30, C('wood', 1)); hl(cv, X(30), Y(-8), 30, C('wood', 3))
    for k in range(8): cv.put(X(32 + k * 3), Y(-15 - (k % 2)), C('metal', 1 + k % 3))
    cyl_v(cv, X(70), Y(-13), 12, 11, 'metal', 0, 5); cv.ellipse(X(76), Y(-13), 6, 2, C('metal', 1)); cv.rect(X(72), Y(-9), 8, 4, C('paint_cream', 1))
    # bottom (floor level): two wheel chocks and a sack of sand
    cv.rect(X(6), Y(14), 14, 8, C('warn', 2)); hl(cv, X(6), Y(14), 14, C('warn', 1))
    cv.ellipse(X(76), Y(16), 14, 7, C('tweed', 2)); cv.ellipse(X(74), Y(14), 10, 4, C('tweed', 1))
    o.finish()
    return o


def cushions():
    """Salvaged railcar seat cushions (red moquette) piled into a nest, with a tartan blanket and a saucer: Sleeper's bed."""
    o = Obj('cushions', (1, 9, 2, 2), up=10, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(34), Y(58), 32, 7, 90)
    def cushion(x, y, w, h, rn, seed):
        for yy in range(h):
            for xx in range(w):
                ex = min(xx, w - 1 - xx); ey = min(yy, h - 1 - yy)
                if ex + ey < 2: continue
                nx = (xx + 0.5) / w * 2 - 1; ny = (yy + 0.5) / h * 2 - 1
                lum = light(nx * 0.6, ny * 0.9, 0.8)
                c = shade(rn, lum)
                if (xx * 3 + yy * 2) % 7 == 0 and 1 < yy < h - 2: c = C(rn, 0)
                cv.put(x + xx, y + yy, c)
        hl(cv, x + 2, y + h, w - 4, C(rn, 4))
        # piping round the edge + a button
        cv.put(x + w // 2, y + h // 2, C(rn, 4))
    cushion(X(2), Y(30), 44, 26, 'moquette_r', 1)
    cushion(X(22), Y(22), 40, 26, 'moquette_g', 2)
    cushion(X(6), Y(8), 38, 22, 'moquette_r', 3)
    # tartan blanket draped over, with a dip where the cat curls
    for yy in range(18):
        for xx in range(34):
            if (xx - 17) ** 2 / 300 + (yy - 9) ** 2 / 80 > 1: continue
            c = C('wine', 2)
            if xx % 8 in (0, 1): c = C('forest', 2)
            if yy % 6 in (0,): c = C('forest', 3)
            if xx % 8 == 4: c = C('mustard', 2)
            if (xx - 17) ** 2 / 70 + (yy - 8) ** 2 / 26 < 1: c = darker(c, 0.8)     # the hollow
            cv.put(X(14 + xx), Y(26 + yy), c)
    # saucer + a little tin bowl
    cv.ellipse(X(56), Y(56), 6, 2, C('white', 2)); cv.ellipse(X(56), Y(55), 4, 1, C('white', 0))
    cv.ellipse(X(8), Y(58), 5, 2, C('metal', 3)); cv.ellipse(X(8), Y(57), 3, 1, C('tweed', 2))
    o.extra['points'] = {'cat_bed': [X(31), Y(34)]}
    o.finish()
    return o


def buffer_stop():
    o = Obj('buffer_stop', (1, 5, 2, 2), up=20, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    # side view of a rail-built stop: bent rail struts to a red timber beam at the east face
    ny = NEAR_RAIL - 5 * TILE   # near rail row in footprint coords
    ground_shadow(cv, X(26), Y(ny + 4), 24, 4, 90)
    for (x0, y0, x1, y1) in ((2, ny, 34, ny - 30), (22, ny, 34, ny - 30)):
        for s in range(60):
            t = s / 60; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            cv.put(X(int(x)), Y(int(y)), C('rail', 2)); cv.put(X(int(x)), Y(int(y) + 1), C('rust', 3)); cv.put(X(int(x) + 1), Y(int(y) + 1), C('rust', 3))
    for x in range(34, 44):
        for y in range(ny - 34, ny + 2):
            cv.put(X(x), Y(y), C('rail', 2 if x < 36 else 3))
    # the beam (face-on to the line: we see its side, painted red with a white band) + timber stops
    cv.rect(X(36), Y(ny - 30), 16, 18, C('paint_red', 2)); hl(cv, X(36), Y(ny - 30), 16, C('paint_red', 0)); vl(cv, X(51), Y(ny - 30), 18, C('paint_red', 4))
    hl(cv, X(36), Y(ny - 22), 16, C('white', 1)); hl(cv, X(36), Y(ny - 21), 16, C('white', 3))
    cv.rect(X(52), Y(ny - 27), 8, 12, C('oak', 2)); hl(cv, X(52), Y(ny - 27), 8, C('oak', 1)); vl(cv, X(59), Y(ny - 27), 12, C('oak', 4))
    # a lamp on top
    cv.rect(X(40), Y(ny - 42), 8, 10, C('paint_black', 2)); hl(cv, X(40), Y(ny - 42), 8, C('paint_black', 0)); cv.rect(X(42), Y(ny - 39), 4, 4, C('paint_red', 1)); cv.put(X(42), Y(ny - 39), C('flower_red', 0))
    o.finish()
    return o


def exit_sign():
    o = Obj('exit_sign', (15, 13, 2, 0), up=18, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    cv.rect(X(12), Y(-16), 40, 14, OUTLINE)
    cv.rect(X(13), Y(-15), 38, 12, C('enamel_g', 2)); hl(cv, X(13), Y(-15), 38, C('enamel_g', 1)); hl(cv, X(13), Y(-4), 38, C('enamel_g', 3))
    cv.rect(X(14), Y(-14), 36, 10, C('enamel_g', 1)); cv.rect(X(15), Y(-13), 34, 8, C('enamel_g', 2))
    o.extra['text_slot'] = [X(15), Y(-13), 34, 8]
    o.extra['glow'] = True
    return o


def marjorie_obj():
    cv, pts, slots = MJ.build()
    anchor = [MJ.MX + 384, MJ.CONTACT - 1]
    at = [4 * TILE + 384, NEAR_RAIL + 1]
    return cv, {'w': cv.w, 'h': cv.h, 'anchor': anchor, 'at': at, 'tile': [16, 6], 'foot': [4, 4, 24, 3],
                'fade': [4, 2, 24, 2], 'points': pts, 'text_slots': slots}


def build():
    objs = [workbench(), oil_drums(), hoist(), fire_point(), racking(), cushions(), buffer_stop(), exit_sign()]
    return {'floor': floor(), 'walls': walls(), 'overlay': overlay(), 'objects': objs, 'marjorie': marjorie_obj()}
