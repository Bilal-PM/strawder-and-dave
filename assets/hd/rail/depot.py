"""Harrowby Depot, 1911 (48 px per tile): red-brick engine shed. South elevation with tall arched iron windows
between pilasters, a louvred smoke ventilator and roof lights, the PPE personnel door, and the east gable (in shade)
with two arched train doorways: one closed, one open onto the siding with a dark interior."""
from rp import *  # noqa
from station import arch_opening, glass

T = TILE
W, FH, OV = 19 * T, 6 * T, 60
H = FH + OV                 # 348
MW = W - 2 * T              # main block 816; the east gable face is the last 96 px (map cols 59-60)
EAVE = H - 168              # 180
RIDGE = OV + 45             # 105
DOORC = 9 * T + T // 2      # door tile (51,30) -> x 432..480, centre 456
PIERS = [0, 102, 204, 306, 408, 510, 612, 714, 816]


def iron_window(cv, cx, top, w, spring, sill, seed, broken=0.25, boarded=False, live=False):
    r = w // 2; x0 = cx - r
    ring = arch_opening(cx, top - 9, w + 18, spring, sill)
    inner = arch_opening(cx, top, w, spring, sill)
    for y in range(top - 10, spring):      # arch of radiating header bricks (two rings)
        for x in range(x0 - 9, x0 + w + 9):
            if ring(x, y) and not inner(x, y):
                a = math.atan2(y + 0.5 - spring, x + 0.5 - cx)
                d = math.hypot((x + 0.5 - cx) / (r + 9), (y + 0.5 - spring) / (spring - top + 9))
                n = 22 if d < 0.9 else 30
                kf = (a + math.pi) / math.pi * n
                j = abs(kf - int(kf) - 0.5) > 0.42
                ringj = abs(d - 0.9) < 0.025
                bi = int(kf)
                col = C('concrete', 3) if (j or ringj) else C('brick', (1 if x < cx else 2) + (1 if hash01(bi, int(d * 10), seed) < 0.25 else 0))
                if d > 0.965 and not j: col = C('brick', 3)
                P(cv, x, y, col)
    for y in range(top - 12, top + 2):      # stone keystone
        for x in range(cx - 5, cx + 5): P(cv, x, y, C('grit', 1 if x < cx - 1 else (2 if x < cx + 3 else 3)))
    HL(cv, cx - 5, cx + 5, top - 12, C('grit', 0)); HL(cv, cx - 5, cx + 5, top + 2, C('grit', 4))
    gm = arch_opening(cx, top + 2, w - 3, spring, sill)
    for y in range(top, sill):
        for x in range(x0, x0 + w):
            if not inner(x, y): continue
            if not gm(x, y): P(cv, x, y, C('iron', 2)); continue
            lx, ly = x - x0 - 2, y - top - 2
            if lx % 7 == 6 or ly % 8 == 7:
                P(cv, x, y, C('iron', 1 if (lx % 7 == 6 and ly % 8 != 7) else 2)); continue
            pane = (lx // 7, ly // 8)
            hv = hash01(pane[0], pane[1], seed)
            if boarded and y > spring + 6:
                P(cv, x, y, C('plywood', 2 if (y - spring) % 10 else 3) if (x - x0) % 23 else C('plywood', 3)); continue
            if not live and hv < broken:
                P(cv, x, y, C('interior', 3 if (lx % 7) < 3 else 4))
            elif not live and hv > 0.94:
                P(cv, x, y, C('cream', 2 if (lx + ly) % 6 else 3))            # whitewashed pane
            else:
                s = (lx - ly * 0.6) % 28
                i = 1 if 4 <= s < 9 else (3 if ly > 4 else 4)
                P(cv, x, y, C('glass_dk', i))
    if live:   # reglazed: no broken panes
        pass
    for y in range(top + 2, sill):
        for x in range(x0 + 1, x0 + w - 1):
            if gm(x, y) and (not gm(x, y - 4) or x >= x0 + w - 3): dark(cv, x, y, 0.3)
    R(cv, x0 - 6, sill, w + 12, 3, C('grit', 1)); HL(cv, x0 - 6, x0 + w + 6, sill, C('grit', 0))
    R(cv, x0 - 6, sill + 3, w + 12, 3, C('grit', 3)); HL(cv, x0 - 6, x0 + w + 6, sill + 5, C('grit', 4))
    ao_band(cv, x0 - 6, sill + 6, w + 12, (0.32, 0.18, 0.08))
    if not live:
        for k in range(3):
            sx = x0 + 6 + int(hash01(k, seed, 3) * (w - 12))
            for y in range(sill + 6, sill + 12 + int(hash01(k, seed, 4) * 18)):
                P(cv, sx, y, C('rust', 2 if y % 3 else 3))
                if y % 2: P(cv, sx + 1, y, C('rust', 3))


def buddleia(cv, cx, by, s=1.0, seed=1):
    """Buddleia sprouting from brickwork: arching leaf clumps + purple flower cones."""
    leaf_cluster(cv, cx, by - 9 * s, 13 * s, 'leaf', seed, 0.85)
    leaf_cluster(cv, cx - 11 * s, by - 4 * s, 9 * s, 'leaf', seed + 1, 0.8)
    leaf_cluster(cv, cx + 12 * s, by - 6 * s, 9 * s, 'leaf', seed + 2, 0.8)
    for k in range(int(6 * s) + 1):
        fx = cx - 15 * s + hash01(k, 1, seed) * 30 * s; fy = by - 15 * s - hash01(k, 2, seed) * 12 * s
        L = int(9 + hash01(k, 3, seed) * 7 * s)
        lean = (fx - cx) / (16 * s)
        for j in range(L):
            wv = max(1, int((L - j) / 3))
            for q in range(-wv // 2, wv - wv // 2 + 1):
                xx = fx + q + lean * j; yy = fy - j
                P(cv, xx, yy, C('flower_pur', 0 if (q < 0 and j % 2 == 0) else (1 if (j < L - 3 and (q + j) % 3) else 2 if j < L - 3 else 0)))
            if j % 2 == 0: P(cv, fx + lean * j + wv // 2 + 1, fy - j, C('flower_pur', 2))


def depot(live=False):
    seed = 31
    cv = Canvas(W, H)
    # ---------- roof (main block)
    rmask = lambda x, y: 9 <= x < MW
    slates(cv, rmask, 0, OV, MW, RIDGE - 4, RIDGE - 4, ch=4, sw=13, base=1, seed=seed, moss=0.6 if not live else 0.1, lichen=0.5)
    miss = set() if live else {(20, 4), (21, 4), (44, 9), (8, 11), (52, 2), (60, 7)}
    slates(cv, rmask, 0, RIDGE + 4, MW, EAVE, EAVE, ch=6, sw=13, base=2, seed=seed + 1, moss=0.35 if not live else 0.1,
           lichen=0.6, missing=miss)
    for x in range(9, MW):
        for k, c in enumerate([O, C('slate', 0), C('slate', 1), C('slate', 1), C('slate', 2), C('slate', 3), C('slate', 4), O]):
            P(cv, x, RIDGE - 4 + k, c)
    ao_band(cv, 9, RIDGE + 4, MW - 9, (0.36, 0.22, 0.12, 0.05))
    # roof lights: patent glazing, one per bay
    for k, px in enumerate(PIERS[:-1]):
        gx0 = px + 24; gw = 54
        gy0, gy1 = RIDGE + 20, RIDGE + 52
        for y in range(gy0, gy1):
            for x in range(gx0, gx0 + gw):
                u = x - gx0; v = y - gy0
                if u in (0, 1, gw - 2, gw - 1) or v in (0, 1, gy1 - gy0 - 1) or u % 13 in (0, 1):
                    P(cv, x, y, C('iron', 1 if (u in (0,) or v == 0 or u % 13 == 0) else 3)); continue
                pane = u // 13
                if not live and hash01(pane, k, 5) < 0.3 and v > 6:
                    P(cv, x, y, C('interior', 3 + (u % 13 > 9))); continue
                s = (u - v) % 20
                col = C('glass', 1 if 4 <= s < 9 else 2)
                if not live and fbm(x, y, 9, seed + k) < 0.45: col = C('moss', 3) if hash01(x, y, 1) < 0.3 else C('grit_soot', 1)
                P(cv, x, y, col)
        ao_band(cv, gx0, gy1, gw, (0.32, 0.18, 0.08))
    # smoke ventilator (louvred raised roof) along the ridge
    vx0, vx1 = 84, MW - 84
    vt = RIDGE - 33
    for y in range(vt, RIDGE + 3):
        for x in range(vx0, vx1):
            v = y - vt
            if v < 14:
                if v == 0: col = O
                elif v == 1: col = C('slate', 0)
                else:
                    cr = (14 - v) // 4; vv = (14 - v) % 4
                    col = C('slate', (1 if v < 7 else 2) + (2 if vv == 3 else 0) - (1 if vv == 0 else 0) + (1 if (x + cr * 6) % 13 == 0 else 0))
            elif v in (14, 15):
                col = C('iron', 4 if v == 14 else 3)
            else:
                u = (y - vt - 16) % 4
                col = C('wood_dark', (1, 2, 4, 4)[u])
                if (x - vx0) % 51 in (0, 1, 2): col = C('wood_dark', (0, 1, 3)[(x - vx0) % 51])
                if not live and hash01((x - vx0) // 7, y, 3) < 0.03: col = C('interior', 4)
            P(cv, x, y, col)
    for y in range(vt, RIDGE + 3): P(cv, vx0, y, C('wood_dark', 0)); dark(cv, vx1 - 1, y, 0.4); dark(cv, vx1 - 2, y, 0.2)
    for y in range(RIDGE + 4, RIDGE + 10):
        for x in range(vx0 + 4, vx1 + 4): dark(cv, x, y, 0.25 if y < RIDGE + 7 else 0.12)
    for sx in (27, MW - 54):   # two brick smoke stacks
        for y in range(OV - 27, RIDGE + 6):
            for x in range(sx, sx + 24):
                u = x - sx
                crs = (y - (OV - 27)) // 4
                if (y - (OV - 27)) % 4 == 3 or (u + (crs % 2) * 6) % 12 == 11: col = C('concrete', 3)
                else: col = C('brick', (1 if u < 5 else (2 if u < 18 else 3)) + (1 if hash01((u + (crs % 2) * 6) // 12, crs, 9) < 0.2 else 0))
                if not live and y < OV - 12 and ((y - (OV - 27)) % 4 != 3): col = C('brick_dark', 3 if hash01(x, y, 1) < 0.7 else 4)
                P(cv, x, y, col)
        R(cv, sx - 3, OV - 30, 30, 4, C('grit', 2)); HL(cv, sx - 3, sx + 27, OV - 30, C('grit', 0)); HL(cv, sx - 3, sx + 27, OV - 27, C('grit', 4))
        R(cv, sx + 4, OV - 31, 16, 1, C('interior', 4))
        for yy in range(RIDGE + 6, RIDGE + 9): HL(cv, sx - 2, sx + 26, yy, C('lead', yy - RIDGE - 5))
        for y in range(RIDGE + 9, RIDGE + 30):
            for x in range(sx + 24, sx + 36 - (y - RIDGE) // 3):
                dark(cv, x, y, 0.28)
        outline_where(cv, lambda x, y, sx=sx: y < RIDGE - 4 and sx - 6 <= x <= sx + 30)
    # ---------- south wall (brick)
    bricks(cv, 0, EAVE + 12, MW, H - 21 - EAVE - 12, 'brick', seed + 3, soot=0 if live else 0.22)
    for x in range(0, MW):   # corbelled eaves: gutter, two brick courses, dentils
        for k, i in enumerate((0, 1, 2, 3, 4)): P(cv, x, EAVE + k, C('iron', i))
        for y in range(EAVE + 5, EAVE + 12):
            v = y - EAVE - 5
            if v < 3: P(cv, x, y, C('brick', (1, 2, 3)[v]) if (x % 12) != 11 else C('concrete', 3))
            elif v == 3: P(cv, x, y, C('concrete', 3))
            else: P(cv, x, y, C('brick', 2 if v == 4 else 3) if (x % 9) < 5 else C('brick_dark', 4))
    ao_band(cv, 0, EAVE + 12, MW, (0.42, 0.28, 0.16, 0.08))
    bricks(cv, 0, H - 21, MW, 21, 'brick_dark', seed + 4, burnt=0.0)          # blue engineering-brick plinth
    HL(cv, 0, MW, H - 23, C('grit', 0)); HL(cv, 0, MW, H - 22, C('grit', 2)); HL(cv, 0, MW, H - 21, C('grit', 4))
    if not live:
        for x in range(0, MW):   # soot from the eaves
            if fbm(x, 0, 24, 7) > 0.6:
                L = int(fbm(x, 3, 8, 8) * 60)
                for y in range(EAVE + 12, EAVE + 12 + L): dark(cv, x, y, 0.14 if y < EAVE + 12 + L * 0.6 else 0.07)
    for px in PIERS:   # pilasters
        x0 = px - 7 if px > 0 else 0
        x1 = min(px + 8, MW)
        for y in range(EAVE + 5, H - 21):
            for x in range(x0, x1):
                u = x - x0; v = (y - EAVE) % 4
                crs = (y - EAVE) // 4
                if v == 3 or (u + (crs % 2) * 6) % 12 == 11 and u > 0: col = C('concrete', 3)
                else: col = C('brick', 1 if u < 3 else (2 if u < x1 - x0 - 3 else 3))
                P(cv, x, y, col)
        for y in range(EAVE + 12, H - 21):
            dark(cv, x1, y, 0.35); dark(cv, x1 + 1, y, 0.22); dark(cv, x1 + 2, y, 0.1)
        R(cv, x0 - 2, EAVE + 5, x1 - x0 + 4, 5, C('grit', 1)); HL(cv, x0 - 2, x1 + 2, EAVE + 5, C('grit', 0)); HL(cv, x0 - 2, x1 + 2, EAVE + 9, C('grit', 3))
        R(cv, x0 - 2, H - 27, x1 - x0 + 4, 4, C('grit', 1)); HL(cv, x0 - 2, x1 + 2, H - 27, C('grit', 0))
    for k in range(len(PIERS) - 1):
        cx = (PIERS[k] + PIERS[k + 1]) // 2
        if abs(cx - DOORC) < 40: continue
        iron_window(cv, cx, EAVE + 39, 50, EAVE + 63, H - 45, seed + k, broken=0.13,
                    boarded=(not live and k in (1, 6)), live=live)
    # personnel door (PPE): ledged timber door in a brick arch, warm fanlight (enterable), step, yellow PPE plate
    dx0, dx1 = DOORC - 24, DOORC + 24
    dtop = H - 96
    ring = arch_opening(DOORC, dtop - 8, 64, dtop + 12, H - 6)
    inner = arch_opening(DOORC, dtop, 48, dtop + 12, H - 6)
    for y in range(dtop - 9, H - 6):
        for x in range(DOORC - 33, DOORC + 33):
            if ring(x, y) and not inner(x, y):
                a = math.atan2(y + 0.5 - dtop - 12, x + 0.5 - DOORC); kf = (a + math.pi) / math.pi * 16
                if y < dtop + 12: P(cv, x, y, C('concrete', 3) if abs(kf - int(kf) - 0.5) > 0.42 else C('brick', 1 if x < DOORC else 2))
                else: P(cv, x, y, C('grit', 1 if x < DOORC else 2) if (y - dtop) % 16 != 15 else C('grit', 3))
    glass(cv, arch_opening(DOORC, dtop + 1, 46, dtop + 12, dtop + 18), dx0 + 1, dtop, 46, 18, lit=True)
    for x in range(dx0 + 1, dx1 - 1, 9): VL(cv, x, dtop + 1, dtop + 18, C('iron', 2))
    HL(cv, dx0, dx1, dtop + 18, C('iron', 1)); HL(cv, dx0, dx1, dtop + 19, C('iron', 3))
    boards(cv, dx0 + 1, dtop + 20, 46, H - 6 - dtop - 20, 'paint_green', seed + 7, vertical=True, bw=6, base=2,
           weather=0 if live else 0.25)
    for yy in (dtop + 28, H - 20):   # ledges + strap hinges
        HL(cv, dx0 + 1, dx1 - 1, yy, C('paint_green', 1)); HL(cv, dx0 + 1, dx1 - 1, yy + 1, C('paint_green', 3))
        HL(cv, dx0 + 1, dx0 + 20, yy + 3, C('iron', 1)); HL(cv, dx0 + 1, dx0 + 20, yy + 4, C('iron', 3))
        P(cv, dx0 + 19, yy + 3, C('iron', 0))
    R(cv, dx1 - 9, dtop + 48, 3, 6, C('gold', 1)); P(cv, dx1 - 9, dtop + 48, C('gold', 0)); P(cv, dx1 - 7, dtop + 53, C('gold', 3))
    ao_band(cv, dx0 + 1, dtop + 20, 46, (0.38, 0.22, 0.1))
    R(cv, dx0 - 8, H - 6, 64, 6, C('concrete', 2)); HL(cv, dx0 - 8, dx1 + 8, H - 6, C('concrete', 0)); HL(cv, dx0 - 8, dx1 + 8, H - 1, C('concrete', 4))
    HL(cv, dx0 + 3, dx1 - 3, H - 7, C('warm_in', 1))
    PPE = (dx1 + 14, H - 78, 33, 24)       # blank yellow plate (the game letters "PPE ONLY")
    px_, py_, pw_, ph_ = PPE
    R(cv, px_ - 2, py_ - 2, pw_ + 4, ph_ + 4, C('iron', 3))
    R(cv, px_, py_, pw_, ph_, C('yellow', 1)); HL(cv, px_, px_ + pw_, py_, C('yellow', 0)); HL(cv, px_, px_ + pw_, py_ + ph_ - 1, C('yellow', 3))
    VL(cv, px_ + pw_ - 1, py_, py_ + ph_, C('yellow', 2))
    for (a, b) in ((2, 2), (pw_ - 3, 2), (2, ph_ - 3), (pw_ - 3, ph_ - 3)): P(cv, px_ + a, py_ + b, C('iron', 2))
    ao_band(cv, px_ - 2, py_ + ph_ + 2, pw_ + 4, (0.32, 0.14))
    TAB = (DOORC - 66, EAVE + 24, 132, 18)  # blank stone date tablet ("HARROWBY DEPOT 1911")
    tx, ty, tw, th = TAB
    R(cv, tx - 5, ty - 5, tw + 10, th + 10, C('grit', 2)); HL(cv, tx - 5, tx + tw + 5, ty - 5, C('grit', 0))
    VL(cv, tx - 5, ty - 5, ty + th + 5, C('grit', 1)); HL(cv, tx - 5, tx + tw + 5, ty + th + 4, C('grit', 4))
    VL(cv, tx + tw + 4, ty - 5, ty + th + 5, C('grit', 3))
    R(cv, tx, ty, tw, th, C('grit', 1)); HL(cv, tx, tx + tw, ty, C('grit', 3)); VL(cv, tx, ty, ty + th, C('grit', 3))
    HL(cv, tx, tx + tw, ty + th - 1, C('grit', 0))
    ao_band(cv, tx - 5, ty + th + 5, tw + 10, (0.32, 0.16, 0.06))
    # wall lamp over the door
    R(cv, DOORC - 2, dtop - 25, 5, 4, C('iron', 2)); R(cv, DOORC - 5, dtop - 21, 11, 11, C('iron', 3))
    R(cv, DOORC - 4, dtop - 20, 9, 8, C('lamp_glow', 1)); R(cv, DOORC - 1, dtop - 18, 3, 4, C('lamp_glow', 0))
    P(cv, DOORC - 4, dtop - 20, C('white', 0)); HL(cv, DOORC - 6, DOORC + 7, dtop - 22, C('iron', 1))
    for dxp in (PIERS[2] + 10, PIERS[6] + 10): drainpipe(cv, dxp, EAVE + 3, H - 6)
    if not live:
        for x in range(MW):
            if fbm(x, 2, 15, 44) > 0.55:
                for y in range(H - 7, H):
                    if hash01(x, y, 45) < 0.55: P(cv, x, y, C('moss', 1 + int(hash01(x, y, 46) * 3)))
        buddleia(cv, 630, EAVE + 6, 1.4, seed=5)       # the buddleia in the gutter
        buddleia(cv, 198, EAVE + 3, 0.8, seed=8)
        for (wx, hh) in ((90, 12), (321, 9), (555, 13), (750, 8)):
            for k in range(hh):
                P(cv, wx + int(math.sin(k * 0.7) * 2), H - 1 - k, C('grass', 2 + (k % 2)))
                if k % 3 == 1: P(cv, wx - 3, H - 2 - k, C('leaf', 2)); P(cv, wx + 3, H - 1 - k, C('leaf', 1)); P(cv, wx + 2, H - 2 - k, C('leaf', 2))
    # ---------- east gable face (in shade) with the arched train doorways
    ex = MW
    slope = 51
    def face_top(x): return EAVE - int((x - ex) / (W - ex) * slope)
    for y in range(EAVE - slope - 12, H):
        for x in range(ex, W):
            if y < face_top(x): continue
            v = y - face_top(x)
            if v < 5:
                P(cv, x, y, C('grit', (1, 2, 2, 3, 4)[v])); continue
            crs = (y - EAVE) // 4; ly = (y - EAVE) % 4
            u = (x - ex + (crs % 2) * 6)
            col = C('concrete', 4) if (ly == 3 or u % 12 == 11) else C('brick', 3 + (1 if hash01(u // 12, crs, 12) < 0.3 else 0) - (1 if hash01(u // 12, crs, 13) < 0.2 else 0))
            if y >= H - 21: col = C('brick_dark', 3 if not (ly == 3 or u % 12 == 11) else 4)
            P(cv, x, y, col)
    for y in range(EAVE - 3, H):   # corner pier
        for x in range(ex - 5, ex + 5):
            crs = (y - EAVE) // 4
            P(cv, x, y, C('brick', 1 if x < ex - 1 else (2 if x < ex + 2 else 4)) if ((y - EAVE) % 4) != 3 else C('concrete', 3))
    VL(cv, ex + 5, EAVE, H, C('brick_dark', 4))
    for x in range(ex - 9, W):     # roof verge over the gable
        yt = face_top(max(x, ex)) - 5
        P(cv, x, yt, O); P(cv, x, yt + 1, C('slate', 0)); P(cv, x, yt + 2, C('slate', 2)); P(cv, x, yt + 3, C('slate', 3)); P(cv, x, yt + 4, C('slate', 4))
    ocx, ocy = ex + 57, EAVE - 9   # oculus vent
    for y in range(ocy - 9, ocy + 10):
        for x in range(ocx - 9, ocx + 10):
            d = math.hypot(x - ocx, y - ocy)
            if d <= 9: P(cv, x, y, C('grit', 2 if (x < ocx and y < ocy) else 3) if d > 6.3 else C('interior', 4 if (x - ocx) % 4 else 2))
    doors = [(ex + 12, False), (ex + 54, True)]
    dw, dtop2 = 36, H - 144
    SIDING_DOOR = None
    for (x0, isopen) in doors:
        cx = x0 + dw // 2
        ar = arch_opening(cx, dtop2 - 6, dw + 9, dtop2 + 15, H)
        inn = arch_opening(cx, dtop2, dw, dtop2 + 15, H)
        for y in range(dtop2 - 7, H):
            for x in range(x0 - 5, x0 + dw + 5):
                if ar(x, y) and not inn(x, y): P(cv, x, y, C('brick', 2 if x < cx else 3) if y < dtop2 + 15 else C('brick', 3))
                elif inn(x, y):
                    if isopen:
                        d = (y - dtop2) / (H - dtop2)
                        P(cv, x, y, C('interior', 4 if d < 0.55 else 3))
                    else:
                        u = x - x0
                        col = C('paint_green', (3 if u % 6 == 5 else 2) + (1 if not live and fbm(x, y, 7, 3) < 0.3 else 0))
                        if u in (dw // 2, dw // 2 - 1): col = C('paint_green', 4)
                        P(cv, x, y, col)
        if isopen:
            SIDING_DOOR = [x0, dtop2, dw, H - dtop2]
            for k in range(39):   # rails converging into the dark
                yy = H - 1 - k
                for rx in (x0 + 9 + k // 5, x0 + dw - 10 - k // 5):
                    P(cv, rx, yy, C('rail', 2 if k < 18 else 3)); P(cv, rx + 1, yy, C('rail', 4))
            for k in range(0, 39, 6):
                HL(cv, x0 + 6 + k // 6, x0 + dw - 6 - k // 6, H - 2 - k, C('sleeper', 4))
            # a glimpse of Ruby's yellow warning end deep in the gloom
            for y in range(dtop2 + 60, H - 30):
                for x in range(x0 + 8, x0 + dw - 8):
                    col = C('mustard', 3) if y > dtop2 + 74 else C('paint_green', 4)
                    if y in (dtop2 + 66, dtop2 + 67) and (x0 + 12 <= x < x0 + 16 or x0 + dw - 16 <= x < x0 + dw - 12): col = C('glass_dk', 3)
                    P(cv, x, y, col); dark(cv, x, y, 0.45)
            R(cv, cx - 5, dtop2 + 42, 9, 12, C('glass_dk', 3)); P(cv, cx - 5, dtop2 + 42, C('glass_dk', 1)); VL(cv, cx - 1, dtop2 + 42, dtop2 + 54, C('interior', 4))
            for y in range(dtop2 + 18, H - 1):   # door leaf folded back flat against the face
                for q, i in enumerate((1, 2, 3, 4)): P(cv, x0 + dw + 4 + q, y, C('paint_green', i))
        else:
            for yy in (dtop2 + 36, dtop2 + 78, H - 27):
                HL(cv, x0, x0 + 11, yy, C('iron', 1)); HL(cv, x0, x0 + 11, yy + 1, C('iron', 3))
                HL(cv, x0 + dw - 11, x0 + dw, yy, C('iron', 1)); HL(cv, x0 + dw - 11, x0 + dw, yy + 1, C('iron', 3))
            if not live:
                R(cv, cx - 3, dtop2 + 75, 6, 8, C('mustard', 2)); HL(cv, cx - 3, cx + 3, dtop2 + 75, C('mustard', 0))
                for k in range(8): P(cv, cx - 2 + (k % 5), dtop2 + 73 - (k // 5), C('metal', 2))
                for yy in range(H - 15, H):
                    for k in range(0, dw, 3):
                        if hash01(k, yy, 5) < 0.5: P(cv, x0 + k, yy, C('grass', 2 + (yy % 2)))
    for y in range(EAVE - slope - 12, H):   # the gable face is on the shadow side
        for x in range(ex + 6, W):
            if opaque(cv, x, y): dark(cv, x, y, 0.12)
    if not live: buddleia(cv, W - 15, EAVE - slope + 12, 0.7, seed=12)
    sel_outline(cv, k=0.72, base_rows=[H - 1])
    info = {'sign': {'date_tablet': list(TAB), 'ppe_plate': list(PPE)}, 'siding_door': SIDING_DOOR,
            'lights': [[DOORC, dtop - 15, 54], [DOORC, H - 6, 30]]}
    return cv, info
