"""Harrowby Depot, 1911: red-brick engine shed. South elevation with tall arched iron windows between pilasters,
the PPE personnel door, and the east gable (in shade) with two arched train doorways: one closed, one open onto the
siding with a dark interior."""
from rp import *  # noqa
from station import arch_opening, glass

T = TILE
W, FH, OV = 19 * T, 6 * T, 40
H = FH + OV                 # 232
MW = W - 2 * T              # main block 544; the east gable face is the last 64 px
EAVE = H - 112              # 120
RIDGE = OV + 30             # 70
DOORC = 9 * T + 16          # door tile (51,30) -> x 288..320, centre 304
PIERS = [0, 68, 136, 204, 272, 340, 408, 476, 544]


def iron_window(cv, cx, top, w, spring, sill, seed, broken=0.25, boarded=False, live=False):
    r = w // 2; x0 = cx - r
    ring = arch_opening(cx, top - 6, w + 12, spring, sill)
    inner = arch_opening(cx, top, w, spring, sill)
    # brick arch ring: radial header bricks
    for y in range(top - 7, spring):
        for x in range(x0 - 6, x0 + w + 6):
            if ring(x, y) and not inner(x, y):
                a = math.atan2(y + 0.5 - spring, x + 0.5 - cx)
                k = (a + math.pi) / math.pi * 22
                j = abs(k - int(k) - 0.5) > 0.4
                d = math.hypot((x + 0.5 - cx) / (r + 6), (y + 0.5 - spring) / (spring - top + 6))
                col = C('concrete', 3) if j else C('brick', 1 if x < cx else 2)
                if d > 0.93 and not j: col = C('brick', 3)
                P(cv, x, y, col)
    # keystone (stone)
    for y in range(top - 8, top + 1):
        for x in range(cx - 3, cx + 3): P(cv, x, y, C('grit', 1 if x < cx else 2))
    HL(cv, cx - 3, cx + 3, top - 8, C('grit', 0))
    gm = arch_opening(cx, top + 1, w - 2, spring, sill)
    for y in range(top, sill):
        for x in range(x0, x0 + w):
            if not inner(x, y): continue
            if not gm(x, y): P(cv, x, y, C('iron', 2)); continue
            lx, ly = x - x0 - 1, y - top - 1
            if lx % 5 == 4 or ly % 6 == 5: P(cv, x, y, C('iron', 1 if lx % 5 == 4 and ly % 6 != 5 else 2)); continue
            pane = (lx // 5, ly // 6)
            hv = hash01(pane[0], pane[1], seed)
            if boarded and y > spring + 4:
                P(cv, x, y, C('plywood', 2 if (y - spring) % 7 else 3)); continue
            if not live and hv < broken:
                P(cv, x, y, C('interior', 3 if (lx % 5) < 2 else 4))       # broken pane: dark shed interior
            elif not live and hv > 0.86:
                P(cv, x, y, C('cream', 2 if (lx + ly) % 5 else 3))          # whitewashed / obscured pane
            else:
                s = (lx - ly * 0.6) % 19
                i = 1 if 3 <= s < 6 else (3 if ly > 3 else 4)
                P(cv, x, y, C('glass_dk', i))
    for y in range(top + 1, sill):
        for x in range(x0 + 1, x0 + w - 1):
            if gm(x, y) and not gm(x, y - 3): dark(cv, x, y, 0.3)
    # stone sill + rust stain under it
    R(cv, x0 - 4, sill, w + 8, 2, C('grit', 1)); HL(cv, x0 - 4, x0 + w + 4, sill, C('grit', 0)); R(cv, x0 - 4, sill + 2, w + 8, 2, C('grit', 3))
    ao_band(cv, x0 - 4, sill + 4, w + 8, (0.3, 0.15))
    if not live:
        for k in range(3):
            sx = x0 + 4 + int(hash01(k, seed, 3) * (w - 8))
            for y in range(sill + 4, sill + 8 + int(hash01(k, seed, 4) * 12)): P(cv, sx, y, C('rust', 2 if y % 3 else 3))


def buddleia(cv, cx, by, s=1.0, seed=1):
    """Buddleia clump sprouting from brickwork: arching leaves + purple flower cones."""
    leaf_cluster(cv, cx, by - 6 * s, 9 * s, 'leaf', seed, 0.85)
    leaf_cluster(cv, cx - 7 * s, by - 3 * s, 6 * s, 'leaf', seed + 1, 0.8)
    leaf_cluster(cv, cx + 8 * s, by - 4 * s, 6 * s, 'leaf', seed + 2, 0.8)
    for k in range(int(5 * s) + 1):
        fx = cx - 10 * s + hash01(k, 1, seed) * 20 * s; fy = by - 10 * s - hash01(k, 2, seed) * 8 * s
        L = int(6 + hash01(k, 3, seed) * 5 * s)
        lean = (fx - cx) / (12 * s)
        for j in range(L):
            wv = max(1, int((L - j) / 3))
            for q in range(-wv // 2, wv - wv // 2 + 1):
                xx = fx + q + lean * j; yy = fy - j
                P(cv, xx, yy, C('flower_pur', 0 if (q < 0 and j % 2 == 0) else (1 if j < L - 2 else 0)))
            if j % 2 == 0: P(cv, fx + lean * j + wv // 2 + 1, fy - j, C('flower_pur', 2))


def depot(live=False):
    seed = 31
    cv = Canvas(W, H)
    # ---------- roof (main block)
    rmask = lambda x, y: 6 <= x < MW
    slates(cv, rmask, 0, OV, MW, RIDGE - 3, RIDGE - 3, ch=3, sw=9, base=1, seed=seed, moss=0.6 if not live else 0.1, lichen=0.5)
    miss = set() if live else {(20, 4), (21, 4), (44, 9), (8, 11), (52, 2)}
    slates(cv, rmask, 0, RIDGE + 3, MW, EAVE, EAVE, ch=4, sw=9, base=2, seed=seed + 1, moss=0.35 if not live else 0.1,
           lichen=0.6, missing=miss)
    for x in range(6, MW):
        for k, c in enumerate([O, C('slate', 0), C('slate', 1), C('slate', 2), C('slate', 3), C('slate', 4), O]):
            P(cv, x, RIDGE - 3 + k, c)
    ao_band(cv, 6, RIDGE + 4, MW - 6, (0.35, 0.2, 0.1))
    # roof lights: patent glazing strips on the south slope, one per bay
    for k, px in enumerate(PIERS[:-1]):
        gx0 = px + 16; gw = 36
        for y in range(RIDGE + 12, RIDGE + 34):
            for x in range(gx0, gx0 + gw):
                u = x - gx0; v = y - (RIDGE + 12)
                if u in (0, gw - 1) or v in (0, 21) or u % 9 == 0:
                    P(cv, x, y, C('iron', 1 if (u == 0 or v == 0) else 3)); continue
                pane = u // 9
                if not live and hash01(pane, k, 5) < 0.3 and v > 4:
                    P(cv, x, y, C('interior', 3)); continue
                s = (u - v) % 14
                col = C('glass', 1 if 3 <= s < 6 else 2)
                if not live and fbm(x, y, 6, seed + k) < 0.45: col = C('moss', 3) if hash01(x, y, 1) < 0.3 else C('grit_soot', 1)
                P(cv, x, y, col)
        ao_band(cv, gx0, RIDGE + 34, gw, (0.3, 0.15))
    # smoke ventilator (louvred raised roof) along the ridge
    vx0, vx1 = 44, MW - 44
    vt = OV - 26
    for y in range(vt, RIDGE + 2):
        for x in range(vx0, vx1):
            v = y - vt
            if v < 12:  # its own little slate roof
                i = 1 if v < 5 else 2
                if v == 0: col = O
                elif v == 5: col = C('slate', 0)
                else: col = C('slate', i + (1 if (x + (v // 3) * 4) % 9 == 0 else 0))
            elif v == 12:
                col = C('iron', 4)
            else:
                # louvres: black-painted timber slats with dark gaps
                u = (y - vt - 13) % 4
                col = C('wood_dark', 1 if u == 0 else (2 if u == 1 else 4))
                if (x - vx0) % 34 in (0, 1): col = C('wood_dark', 1 if (x - vx0) % 34 == 0 else 3)
                if not live and hash01((x - vx0) // 5, y, 3) < 0.03: col = C('interior', 4)
            P(cv, x, y, col)
    for x in range(vx0 - 2, vx1 + 2): P(cv, x, vt + 12, C('iron', 3))
    for y in range(vt, RIDGE + 2): P(cv, vx0, y, C('wood_dark', 0)); dark(cv, vx1 - 1, y, 0.4)
    for y in range(RIDGE + 3, RIDGE + 10):
        for x in range(vx0, vx1):
            if y - RIDGE - 3 < 4: dark(cv, x + 3, y, 0.25)
    # two small brick smoke stacks at the ends of the ventilator
    for sx in (18, MW - 36):
        for y in range(OV - 18, RIDGE + 4):
            for x in range(sx, sx + 16):
                u = x - sx
                i = 1 if u < 3 else (2 if u < 12 else 3)
                if (y % 3) == 2: col = C('concrete', 3)
                else: col = C('brick', i + (1 if hash01(x // 4, y // 3, 9) < 0.2 else 0))
                if not live and y < OV - 8: col = C('brick_dark', 3 if (y % 3) else 4)
                P(cv, x, y, col)
        R(cv, sx - 2, OV - 20, 20, 3, C('grit', 2)); HL(cv, sx - 2, sx + 18, OV - 20, C('grit', 0))
        R(cv, sx + 3, OV - 21, 10, 1, C('interior', 4))
        outline_where(cv, lambda x, y, sx=sx: y < RIDGE - 3 and sx - 4 <= x <= sx + 20)
    # ---------- south wall (brick)
    bricks(cv, 0, EAVE + 8, MW, H - 14 - EAVE - 8, 'brick', seed + 3, soot=0 if live else 0.22)
    # corbelled eaves: dentil course + stone string under the gutter
    for x in range(0, MW):
        for y in range(EAVE + 3, EAVE + 8):
            v = y - EAVE - 3
            if v < 2: P(cv, x, y, C('brick', 1 if v == 0 else 2))
            else: P(cv, x, y, C('brick', 2) if (x % 6) < 3 else C('brick_dark', 4))
        P(cv, x, EAVE, C('iron', 1)); P(cv, x, EAVE + 1, C('iron', 2)); P(cv, x, EAVE + 2, C('iron', 4))
    ao_band(cv, 0, EAVE + 8, MW, (0.4, 0.26, 0.14, 0.06))
    # blue engineering-brick plinth
    bricks(cv, 0, H - 14, MW, 14, 'brick_dark', seed + 4, burnt=0.0)
    HL(cv, 0, MW, H - 15, C('grit', 1)); HL(cv, 0, MW, H - 14, C('grit', 3))
    # pilasters
    for px in PIERS:
        x0 = px - 5 if px > 0 else 0
        x1 = min(px + 5, MW)
        for y in range(EAVE + 3, H - 14):
            for x in range(x0, x1):
                u = x - x0
                v = (y - EAVE) % 3
                if v == 2 and u not in (0,): col = C('concrete', 3)
                else: col = C('brick', 1 if u < 2 else (2 if u < x1 - x0 - 2 else 3))
                P(cv, x, y, col)
        for y in range(EAVE + 8, H - 14): dark(cv, x1, y, 0.35); dark(cv, x1 + 1, y, 0.18)
        # stone pier cap
        R(cv, x0 - 1, EAVE + 3, x1 - x0 + 2, 3, C('grit', 1)); HL(cv, x0 - 1, x1 + 1, EAVE + 3, C('grit', 0))
    # tall arched windows in each bay (door bay has the date tablet instead)
    for k in range(len(PIERS) - 1):
        cx = (PIERS[k] + PIERS[k + 1]) // 2
        if abs(cx - DOORC) < 30: continue
        iron_window(cv, cx, EAVE + 26, 32, EAVE + 42, H - 30, seed + k, broken=0.3,
                    boarded=(not live and k in (1, 6)), live=live)
    # personnel door (PPE): ledged timber door in a brick arch, warm fanlight (enterable), step, yellow PPE plate
    dx0, dx1 = DOORC - 13, DOORC + 13
    dtop = H - 64
    ring = arch_opening(DOORC, dtop - 5, 36, dtop + 8, H - 4)
    inner = arch_opening(DOORC, dtop, 26, dtop + 8, H - 4)
    for y in range(dtop - 6, H - 4):
        for x in range(DOORC - 18, DOORC + 18):
            if ring(x, y) and not inner(x, y):
                a = math.atan2(y + 0.5 - dtop - 8, x + 0.5 - DOORC); k = (a + math.pi) / math.pi * 12
                P(cv, x, y, C('concrete', 3) if abs(k - int(k) - 0.5) > 0.4 and y < dtop + 8 else C('brick', 1 if x < DOORC else 2))
    glass(cv, arch_opening(DOORC, dtop + 1, 24, dtop + 8, dtop + 12), dx0 + 1, dtop, 24, 12, lit=True)
    for x in range(dx0 + 1, dx1 - 1, 6): VL(cv, x, dtop + 1, dtop + 12, C('iron', 2))
    HL(cv, dx0, dx1, dtop + 12, C('iron', 2))
    boards(cv, dx0 + 1, dtop + 13, 24, H - 4 - dtop - 13, 'paint_green', seed + 7, vertical=True, bw=4, base=2,
           weather=0 if live else 0.25)
    for yy in (dtop + 18, H - 12):
        HL(cv, dx0 + 1, dx1 - 1, yy, C('iron', 2)); HL(cv, dx0 + 1, dx1 - 1, yy + 1, C('iron', 4))
    P(cv, dx1 - 5, dtop + 32, C('gold', 1)); P(cv, dx1 - 5, dtop + 33, C('gold', 3))
    ao_band(cv, dx0 + 1, dtop + 13, 24, (0.35, 0.18))
    R(cv, dx0 - 5, H - 4, 36, 4, C('concrete', 2)); HL(cv, dx0 - 5, dx1 + 5, H - 4, C('concrete', 0))
    # warm light spilling from under the door
    HL(cv, dx0 + 2, dx1 - 2, H - 5, C('warm_in', 1))
    # PPE plate (blank yellow; the game letters "PPE ONLY")
    PPE = (dx1 + 8, H - 52, 22, 16)
    px_, py_, pw_, ph_ = PPE
    R(cv, px_ - 1, py_ - 1, pw_ + 2, ph_ + 2, C('iron', 3))
    R(cv, px_, py_, pw_, ph_, C('yellow', 1)); HL(cv, px_, px_ + pw_, py_, C('yellow', 0)); HL(cv, px_, px_ + pw_, py_ + ph_ - 1, C('yellow', 3))
    for (a, b) in ((1, 1), (pw_ - 2, 1), (1, ph_ - 2), (pw_ - 2, ph_ - 2)): P(cv, px_ + a, py_ + b, C('iron', 2))
    ao_band(cv, px_ - 1, py_ + ph_ + 1, pw_ + 2, (0.3, 0.12))
    # date tablet (blank stone panel; the game letters "HARROWBY DEPOT 1911")
    TAB = (DOORC - 44, EAVE + 16, 88, 12)
    tx, ty, tw, th = TAB
    R(cv, tx - 3, ty - 3, tw + 6, th + 6, C('grit', 2)); HL(cv, tx - 3, tx + tw + 3, ty - 3, C('grit', 0))
    VL(cv, tx - 3, ty - 3, ty + th + 3, C('grit', 1)); HL(cv, tx - 3, tx + tw + 3, ty + th + 2, C('grit', 4))
    R(cv, tx, ty, tw, th, C('grit', 1)); HL(cv, tx, tx + tw, ty, C('grit', 3)); VL(cv, tx, ty, ty + th, C('grit', 3))
    HL(cv, tx, tx + tw, ty + th - 1, C('grit', 0))
    ao_band(cv, tx - 3, ty + th + 3, tw + 6, (0.3, 0.14))
    # a wall lamp over the door (enterable doors get a warm light)
    R(cv, DOORC - 1, dtop - 16, 3, 3, C('iron', 2)); R(cv, DOORC - 3, dtop - 13, 7, 7, C('iron', 3))
    R(cv, DOORC - 2, dtop - 12, 5, 5, C('lamp_glow', 1)); P(cv, DOORC - 2, dtop - 12, C('white', 0))
    # downpipes
    for dxp in (PIERS[2] + 7, PIERS[6] + 7):
        drainpipe(cv, dxp, EAVE + 2, H - 4)
    # weathering: soot from the eaves, patched brick, moss on the plinth
    if not live:
        for x in range(0, MW):
            if fbm(x, 0, 16, 7) > 0.6:
                L = int((fbm(x, 3, 5, 8)) * 40)
                for y in range(EAVE + 8, EAVE + 8 + L): dark(cv, x, y, 0.14)
        for x in range(MW):
            if fbm(x, 2, 10, 44) > 0.55:
                for y in range(H - 5, H):
                    if hash01(x, y, 45) < 0.55: P(cv, x, y, C('moss', 1 + int(hash01(x, y, 46) * 3)))
        buddleia(cv, 420, EAVE + 4, 1.3, seed=5)       # the famous buddleia in the gutter
        buddleia(cv, 132, EAVE + 2, 0.7, seed=8)
        for (wx, hh) in ((60, 8), (214, 6), (370, 9), (500, 5)):
            for k in range(hh):
                P(cv, wx + int(math.sin(k * 0.9) * 1.5), H - 1 - k, C('grass', 2 + (k % 2)))
                if k % 3 == 1: P(cv, wx - 2, H - 2 - k, C('leaf', 2)); P(cv, wx + 2, H - 1 - k, C('leaf', 1))
    # ---------- east gable face (in shade) with the arched train doorways
    ex = MW
    slope = 34
    def face_top(x): return EAVE - int((x - ex) / (W - ex) * slope)
    for y in range(EAVE - slope - 8, H):
        for x in range(ex, W):
            if y < face_top(x): continue
            v = y - face_top(x)
            if v < 3:  # verge / coping
                P(cv, x, y, C('grit', 2 if v == 0 else 3)); continue
            ly = (y - EAVE) % 3
            col = C('concrete', 4) if ly == 2 else C('brick', 3 + (1 if hash01((x + (y // 3) * 4) // 8, y // 3, 12) < 0.3 else 0))
            if (x + ((y // 3) % 2) * 4) % 8 == 0 and ly != 2: col = C('concrete', 4)
            if y >= H - 14: col = C('brick_dark', 3 if ly != 2 else 4)
            P(cv, x, y, col)
    # corner quoin / pier where the south wall turns the corner
    for y in range(EAVE - 2, H):
        for x in range(ex - 3, ex + 3): P(cv, x, y, C('brick', 1 if x < ex else 3) if (y % 3) != 2 else C('concrete', 3))
    VL(cv, ex + 3, EAVE, H, C('brick_dark', 4))
    # the verge line of the roof continuing over the gable
    for x in range(ex - 6, W):
        yt = face_top(max(x, ex)) - 3
        P(cv, x, yt, O); P(cv, x, yt + 1, C('slate', 1)); P(cv, x, yt + 2, C('slate', 3))
    # oculus vent high in the gable
    ocx, ocy = ex + 38, EAVE - 6
    for y in range(ocy - 6, ocy + 7):
        for x in range(ocx - 6, ocx + 7):
            d = math.hypot(x - ocx, y - ocy)
            if d <= 6: P(cv, x, y, C('grit', 3) if d > 4.2 else C('interior', 4 if (x - ocx) % 3 else 3))
    doors = [(ex + 8, False), (ex + 36, True)]           # (x0, open)
    dw, dtop2 = 24, H - 96
    SIDING_DOOR = None
    for (x0, isopen) in doors:
        cx = x0 + dw // 2
        ar = arch_opening(cx, dtop2 - 4, dw + 6, dtop2 + 10, H)
        inn = arch_opening(cx, dtop2, dw, dtop2 + 10, H)
        for y in range(dtop2 - 5, H):
            for x in range(x0 - 3, x0 + dw + 3):
                if ar(x, y) and not inn(x, y): P(cv, x, y, C('brick', 2) if y < dtop2 + 10 else C('brick', 3))
                elif inn(x, y):
                    if isopen:
                        # dark interior with a hint of the shed beyond and the rails running in
                        d = (y - dtop2) / (H - dtop2)
                        col = C('interior', 4 if d < 0.55 else 3)
                        P(cv, x, y, col)
                    else:
                        u = x - x0
                        col = C('paint_green', (3 if u % 4 == 3 else 2) + (1 if not live and fbm(x, y, 5, 3) < 0.3 else 0))
                        if u == dw // 2 or u == dw // 2 - 1: col = C('paint_green', 4)
                        P(cv, x, y, col)
        if isopen:
            SIDING_DOOR = [x0, dtop2, dw, H - dtop2]
            # rails converging into the dark + a faint lit window far inside
            for k in range(26):
                yy = H - 1 - k
                if yy < H - 26: break
                for rx in (x0 + 6 + k // 5, x0 + dw - 7 - k // 5):
                    P(cv, rx, yy, C('rail', 2 if k < 12 else 3))
            R(cv, cx - 3, dtop2 + 28, 6, 8, C('glass_dk', 3)); P(cv, cx - 3, dtop2 + 28, C('glass_dk', 1))
            # door leaf folded back flat against the face (edge-on)
            for y in range(dtop2 + 12, H - 1):
                P(cv, x0 + dw + 3, y, C('paint_green', 2)); P(cv, x0 + dw + 4, y, C('paint_green', 3)); P(cv, x0 + dw + 5, y, C('paint_green', 4))
        else:
            for yy in (dtop2 + 24, dtop2 + 52, H - 18):  # strap hinges
                HL(cv, x0, x0 + 7, yy, C('iron', 2)); HL(cv, x0 + dw - 7, x0 + dw, yy, C('iron', 2))
            if not live:
                R(cv, cx - 2, dtop2 + 50, 4, 5, C('mustard', 2))   # padlock
                for yy in range(H - 10, H):   # weeds against the closed door
                    for k in range(0, dw, 3):
                        if hash01(k, yy, 5) < 0.5: P(cv, x0 + k, yy, C('grass', 2 + (yy % 2)))
    # the whole gable face is on the shadow side: darken a touch
    for y in range(EAVE - slope - 8, H):
        for x in range(ex + 4, W):
            if opaque(cv, x, y): dark(cv, x, y, 0.12)
    if not live:
        buddleia(cv, W - 10, EAVE - slope + 8, 0.6, seed=12)
    sel_outline(cv, k=0.72, base_rows=[H - 1])
    info = {'sign': {'date_tablet': list(TAB), 'ppe_plate': list(PPE)}, 'siding_door': SIDING_DOOR,
            'lights': [[DOORC, dtop - 10, 36], [DOORC, H - 4, 20]]}
    return cv, info
