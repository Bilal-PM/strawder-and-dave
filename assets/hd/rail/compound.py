"""Project compound (48 px per tile): two-storey project office, welfare cabin, stores container, Heras fence
pieces, PPE access gates (closed/open), the blank PPE plate and the blank site board."""
from rp import *  # noqa
from station import glass

T = TILE


def ribbed(cv, x0, y0, w, h, rp, pitch=6, seed=1, dirt=0.0):
    """Profiled (box-rib) steel cladding: vertical ribs lit on the left, shaded on the right."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            u = (x - x0) % pitch
            i = (2, 1, 1, 2, 2, 3)[u * 6 // pitch]
            if hash01(x, y, seed) < 0.015: i += 1
            if dirt and (y - y0) > h * 0.75 and fbm(x, y, 9, seed) < dirt: i += 1
            P(cv, x, y, C(rp, min(len(RAMPS[rp]) - 1, i)))


def upvc_window(cv, x0, y0, w, h, lit=True, blind=False, seed=1):
    R(cv, x0, y0, w, h, C('white', 1)); HL(cv, x0, x0 + w, y0, C('white', 0)); VL(cv, x0 + w - 1, y0, y0 + h, C('white', 3))
    HL(cv, x0, x0 + w, y0 + h - 1, C('white', 3))
    gx, gy, gw, gh = x0 + 3, y0 + 3, w - 6, h - 6
    glass(cv, lambda x, y: True, gx, gy, gw, gh, seed=seed, lit=lit)
    if blind:
        for y in range(gy, gy + gh // 2):
            if (y - gy) % 3 != 2: HL(cv, gx, gx + gw, y, C('cream', 1 if (y - gy) % 3 == 0 else 2))
    VL(cv, x0 + w // 2, gy, gy + gh, C('white', 1)); VL(cv, x0 + w // 2 + 1, gy, gy + gh, C('white', 3))
    ao_band(cv, gx, gy, gw, (0.3, 0.15))
    R(cv, x0 - 2, y0 + h, w + 4, 2, C('white', 2)); ao_band(cv, x0 - 2, y0 + h + 2, w + 4, (0.25, 0.1))


def flat_roof(cv, x0, y0, w, h, seed=1, rp='cabin'):
    """Flat cabin roof seen from above: membrane with lap seams, a drip edge, a little standing water and grit."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            v = y - y0
            i = 1
            if (x - x0) % 72 in (0, 1): i = 2
            if v in (0, 1) or v >= h - 3 or x - x0 < 2 or x0 + w - x <= 2: i = 2 if v < h - 3 else 3
            if hash01(x // 2, y // 2, seed) < 0.02: i += 1
            col = C(rp, i)
            if fbm(x, y, 28, seed + 1, 2) < 0.13 and 3 < v < h - 4: col = C('cabin', 3) if fbm(x, y, 28, seed + 1, 2) > 0.11 else C('glass', 2)  # puddle
            elif fbm(x, y, 20, seed + 5, 2) < 0.16 and 3 < v < h - 4: col = C(rp, min(4, i + 1))       # dirt
            P(cv, x, y, col)
    HL(cv, x0, x0 + w, y0, O)
    HL(cv, x0, x0 + w, y0 + h - 1, C(rp, 4))


def steps(cv, cx, base, w=44, n=3, rail=True, hivis=True):
    """Galvanised step unit with a handrail (yellow-topped)."""
    for k in range(n):
        y = base - (k + 1) * 7
        x0 = cx - w // 2 + k * 2; ww = w - k * 4
        R(cv, x0, y, ww, 7, C('galv', 2)); HL(cv, x0, x0 + ww, y, C('galv', 0)); HL(cv, x0, x0 + ww, y + 1, C('galv', 1))
        for x in range(x0 + 2, x0 + ww - 2, 3): P(cv, x, y + 1, C('galv', 3))    # tread plate
        HL(cv, x0, x0 + ww, y + 6, C('galv', 4))
    if rail:
        for rx in (cx - w // 2 - 2, cx + w // 2 + 1):
            VL(cv, rx, base - n * 7 - 30, base, C('galv', 1)); VL(cv, rx + 1, base - n * 7 - 30, base, C('galv', 3))
            HL(cv, rx - 1, rx + 3, base - n * 7 - 30, C('yellow', 1) if hivis else C('galv', 0))
            VL(cv, rx, base - n * 7 - 30, base - n * 7 - 18, C('yellow', 1) if hivis else C('galv', 1))


def project_office():
    """14 x 4 tiles: two stacked cabins, door (62,43) = x 288..336, steel stair to the upper floor at the east."""
    Wd, FH, OV = 14 * T, 4 * T, 60
    Hh = FH + OV
    cv = Canvas(Wd, Hh)
    roof_h = OV
    flat_roof(cv, 0, 0, Wd, roof_h, seed=3)
    # vents + a cable tray on the roof
    for vx in (120, 420):
        R(cv, vx, 16, 16, 12, C('galv', 2)); HL(cv, vx, vx + 16, 16, C('galv', 0)); VL(cv, vx + 15, 16, 28, C('galv', 4))
        ao_band(cv, vx + 2, 28, 16, (0.3, 0.15))
    wall0 = roof_h
    st = (Hh - wall0) // 2          # storey height (~66)
    for s in range(2):
        y0 = wall0 + s * st
        ribbed(cv, 0, y0, Wd, st, 'cabin', pitch=6, seed=5 + s, dirt=0.3)
        HL(cv, 0, Wd, y0, C('cabin', 0)); HL(cv, 0, Wd, y0 + 1, C('cabin', 1))
        R(cv, 0, y0 + st - 5, Wd, 5, C('cabin', 4)); HL(cv, 0, Wd, y0 + st - 5, C('cabin', 3))    # chassis rail
        for mx in range(0, Wd, 168):   # module joints with corner castings
            VL(cv, mx, y0, y0 + st, C('cabin', 4)); VL(cv, mx + 1, y0, y0 + st, C('cabin', 5))
            R(cv, mx, y0, 5, 5, C('charcoal', 2)); R(cv, mx, y0 + st - 5, 5, 5, C('charcoal', 2))
    ao_band(cv, 0, wall0, Wd, (0.4, 0.24, 0.1))
    DX = (62 - 56) * T      # door tile x
    dcx = DX + T // 2
    for s in range(2):
        y0 = wall0 + s * st
        for k, wx in enumerate(range(24, Wd - 30, 84)):
            if s == 1 and abs(wx + 26 - dcx) < 56: continue
            if wx > Wd - 160: continue
            upvc_window(cv, wx, y0 + 20, 52, 40, lit=True, blind=(k + s) % 3 == 0, seed=k + s * 9)
    # banner board between storeys (blank; the game letters "KESTREL VALE LINE · PROJECT OFFICE")
    SIGN = (60, wall0 + st - 38, Wd - 220, 20)
    sx, sy, sw, sh = SIGN
    R(cv, sx - 2, sy - 2, sw + 4, sh + 4, C('paint_blue', 3))
    R(cv, sx, sy, sw, sh, C('white', 0)); HL(cv, sx, sx + sw, sy + sh - 1, C('white', 2)); VL(cv, sx + sw - 1, sy, sy + sh, C('white', 2))
    for (a, b) in ((1, 1), (sw - 2, 1), (1, sh - 2), (sw - 2, sh - 2)): P(cv, sx + a, sy + b, C('galv', 3))
    ao_band(cv, sx - 2, sy + sh + 2, sw + 4, (0.28, 0.12))
    # door: steel door with vision panel, canopy, lamp, steps
    dy0 = Hh - 88
    R(cv, dcx - 25, dy0 - 3, 50, 82, C('galv', 3))
    R(cv, dcx - 23, dy0, 46, 79, C('paint_blue', 2)); VL(cv, dcx - 23, dy0, dy0 + 79, C('paint_blue', 1)); VL(cv, dcx + 22, dy0, dy0 + 79, C('paint_blue', 4))
    upvc_window(cv, dcx - 10, dy0 + 10, 20, 28, lit=True, seed=4)
    R(cv, dcx + 12, dy0 + 42, 8, 3, C('galv', 1)); P(cv, dcx + 12, dy0 + 42, C('white', 0))
    R(cv, dcx - 21, dy0 + 70, 42, 6, C('galv', 2))
    R(cv, dcx - 30, dy0 - 12, 60, 6, C('galv', 1)); HL(cv, dcx - 30, dcx + 30, dy0 - 12, C('galv', 0)); HL(cv, dcx - 30, dcx + 30, dy0 - 7, C('galv', 4))
    ao_band(cv, dcx - 28, dy0 - 6, 56, (0.35, 0.2, 0.08))
    R(cv, dcx - 4, dy0 - 22, 9, 8, C('charcoal', 2)); R(cv, dcx - 3, dy0 - 21, 7, 5, C('lamp_glow', 1))
    steps(cv, dcx, Hh, w=48, n=1, rail=True)
    # external stair to the upper floor (east end), landing, yellow handrails
    sx0 = Wd - 150
    ly = wall0 + st - 4
    rise = (Hh - ly) / 90
    for k in range(13):
        x = sx0 + k * 7; y = Hh - 6 - int(k * 7 * rise)
        R(cv, x, y, 12, 3, C('galv', 1)); HL(cv, x, x + 12, y, C('galv', 0)); HL(cv, x, x + 12, y + 3, C('galv', 4))
    for k in range(92):   # stringer + yellow handrail
        yy = Hh - 3 - int(k * rise)
        P(cv, sx0 + k, yy, C('galv', 3)); P(cv, sx0 + k, yy + 1, C('galv', 4))
        P(cv, sx0 + k, yy - 32, C('yellow', 1)); P(cv, sx0 + k, yy - 31, C('yellow', 3))
    for k in range(0, 92, 23): VL(cv, sx0 + k, Hh - 35 - int(k * rise), Hh - 3 - int(k * rise), C('galv', 2))
    R(cv, Wd - 60, ly, 58, 5, C('galv', 1)); HL(cv, Wd - 60, Wd - 2, ly, C('galv', 0))
    HL(cv, Wd - 60, Wd - 2, ly - 24, C('yellow', 1)); HL(cv, Wd - 60, Wd - 2, ly - 23, C('yellow', 3))
    for x in (Wd - 60, Wd - 32, Wd - 3): VL(cv, x, ly - 24, ly, C('galv', 2))
    for x in (Wd - 56, Wd - 8): VL(cv, x, ly + 5, Hh, C('galv', 2)); VL(cv, x + 1, ly + 5, Hh, C('galv', 4))
    R(cv, Wd - 52, ly - 82, 44, 80, C('paint_blue', 2)); VL(cv, Wd - 52, ly - 82, ly - 2, C('paint_blue', 1))   # upper door
    upvc_window(cv, Wd - 40, ly - 72, 20, 28, lit=True, seed=8)
    # AC unit, a hi-vis vest drying on the rail, a pot plant
    R(cv, 440, wall0 + st + 20, 36, 28, C('white', 1)); HL(cv, 440, 476, wall0 + st + 20, C('white', 0)); VL(cv, 475, wall0 + st + 20, wall0 + st + 48, C('white', 3))
    for y in range(wall0 + st + 24, wall0 + st + 44, 2): HL(cv, 443, 462, y, C('white', 3))
    for y in range(wall0 + st + 26, wall0 + st + 42):
        for x in range(463, 473):
            if (x - 468) ** 2 + (y - 34 - wall0 - st) ** 2 < 22: P(cv, x, y, C('charcoal', 2 + ((x + y) % 3 == 0)))
    ao_band(cv, 440, wall0 + st + 48, 36, (0.3, 0.14))
    ell = lambda: None
    for y in range(Hh - 26, Hh - 8):
        for x in range(dcx + 36, dcx + 50):
            t = (x - dcx - 36) / 14
            P(cv, x, y, C('hivis', 1 if t < 0.4 else 2))
    HL(cv, dcx + 36, dcx + 50, Hh - 20, C('reflect', 1)); HL(cv, dcx + 36, dcx + 50, Hh - 14, C('reflect', 1))
    half_barrel(cv, dcx - 60, Hh, flowers=('flower_yel', 'flower_wht'), seed=21)
    sel_outline(cv, k=0.74, base_rows=[Hh - 1])
    lights = [[wx + 26, wall0 + s * st + 40, 36] for s in range(2) for wx in range(24, Wd - 160, 84)] + [[dcx, dy0 - 18, 50]]
    return cv, {'sign': {'banner': list(SIGN)}, 'lights': lights}


def welfare():
    """7 x 3 tiles, green cabin, door '*' at (43,42) = x 144..192."""
    Wd, FH, OV = 7 * T, 3 * T, 0
    Hh = FH + OV
    cv = Canvas(Wd, Hh)
    flat_roof(cv, 0, OV, Wd, 40, seed=9)
    w0 = OV + 40
    ribbed(cv, 0, w0, Wd, Hh - w0, 'cabin_grn', pitch=6, seed=11, dirt=0.35)
    HL(cv, 0, Wd, w0, C('cabin_grn', 0)); R(cv, 0, Hh - 6, Wd, 6, C('cabin_grn', 4))
    ao_band(cv, 0, w0 + 1, Wd, (0.4, 0.24, 0.1))
    upvc_window(cv, 22, w0 + 22, 52, 40, lit=True, seed=2)
    upvc_window(cv, Wd - 78, w0 + 22, 52, 40, lit=True, blind=True, seed=3)
    dcx = 3 * T + T // 2
    R(cv, dcx - 24, Hh - 90, 48, 84, C('galv', 3)); R(cv, dcx - 22, Hh - 88, 44, 82, C('cabin_grn', 3))
    VL(cv, dcx - 22, Hh - 88, Hh - 6, C('cabin_grn', 1)); VL(cv, dcx + 21, Hh - 88, Hh - 6, C('cabin_grn', 4))
    R(cv, dcx + 12, Hh - 48, 7, 3, C('galv', 1))
    SIGN = (dcx - 40, w0 + 6, 80, 12)
    R(cv, SIGN[0], SIGN[1], SIGN[2], SIGN[3], C('white', 0)); HL(cv, SIGN[0], SIGN[0] + SIGN[2], SIGN[1] + SIGN[3] - 1, C('white', 2))
    R(cv, Wd - 14, OV + 6, 8, 6, C('hivis', 1)); HL(cv, Wd - 14, Wd - 6, OV + 6, C('hivis', 0))   # beacon
    steps(cv, dcx, Hh, w=46, n=1)
    sel_outline(cv, k=0.74, base_rows=[Hh - 1])
    return cv, {'sign': {'board': list(SIGN)}, 'beacon': [Wd - 10, OV + 9], 'lights': [[48, w0 + 42, 32], [Wd - 52, w0 + 42, 32]]}


def stores():
    """3 x 3 tiles: blue steel container end-on, lockbars, blank sign plate."""
    Wd, FH, OV = 3 * T, 3 * T, 4
    Hh = FH + OV
    cv = Canvas(Wd, Hh)
    for y in range(OV, OV + 40):   # corrugated roof seen from above
        for x in range(Wd):
            i = 1 if (y - OV) % 5 in (0, 1) else 2
            if x in (0, 1, Wd - 2, Wd - 1): i = 3
            if fbm(x, y, 8, 3) < 0.25: i += 1
            P(cv, x, y, C('container', min(4, i)))
    HL(cv, 0, Wd, OV, O)
    w0 = OV + 40
    R(cv, 0, w0, Wd, Hh - w0, C('container', 3))
    for y in range(w0 + 4, Hh - 5):  # doors: horizontal corrugations
        for x in range(4, Wd - 4):
            v = (y - w0) % 6
            P(cv, x, y, C('container', (1, 1, 2, 3, 3, 2)[v]))
    VL(cv, Wd // 2, w0 + 4, Hh - 5, C('container', 4)); VL(cv, Wd // 2 + 1, w0 + 4, Hh - 5, C('container', 1))
    for bx in (18, 40, Wd - 42, Wd - 20):  # lockbars
        VL(cv, bx, w0 + 2, Hh - 2, C('galv', 1)); VL(cv, bx + 1, w0 + 2, Hh - 2, C('galv', 3))
        R(cv, bx - 2, w0 + 50, 6, 3, C('galv', 1)); R(cv, bx + 2, w0 + 52, 3, 8, C('galv', 2))
    for (cx_, cy_) in ((0, w0), (Wd - 6, w0), (0, Hh - 6), (Wd - 6, Hh - 6)):
        R(cv, cx_, cy_, 6, 6, C('charcoal', 2)); P(cv, cx_ + 2, cy_ + 2, C('charcoal', 4))
    ao_band(cv, 4, w0 + 4, Wd - 8, (0.35, 0.18))
    R(cv, 60, w0 + 60, 6, 6, C('mustard', 2))   # padlock
    for x in range(4, Wd - 4):                   # rust streaks from the bottom rail and the hinges
        if hash01(x, 7, 5) < 0.07:
            L = 4 + int(hash01(x, 8, 5) * 18)
            for y in range(Hh - 8 - L, Hh - 5): P(cv, x, y, C('rust', 2 if y % 3 else 3))
    for x in range(4, Wd - 4):
        for y in range(Hh - 8, Hh - 5): P(cv, x, y, C('rust', 2 + (hash01(x, y, 1) < 0.4)))
    SIGN = (Wd // 2 - 30, w0 + 12, 60, 18)
    R(cv, SIGN[0] - 1, SIGN[1] - 1, SIGN[2] + 2, SIGN[3] + 2, C('galv', 3)); R(cv, *SIGN, C('white', 0))
    HL(cv, SIGN[0], SIGN[0] + SIGN[2], SIGN[1] + SIGN[3] - 1, C('white', 2))
    sel_outline(cv, k=0.74, base_rows=[Hh - 1])
    return cv, {'sign': {'plate': list(SIGN)}}


# ------------------------------------------------------------------ fencing and gates

HERAS_H = 96


def heras_h():
    """One tile of Heras panel running east-west: galvanised welded mesh in a tube frame, rubber foot + coupler."""
    Wd, Hh = T, HERAS_H + 8
    cv = Canvas(Wd, Hh)
    top, bot = 4, Hh - 10
    for y in range(top, bot):
        for x in range(Wd):
            if (x % 8 == 3) or ((y - top) % 12 == 0): P(cv, x, y, C('galv', 2 if (x % 8 == 3) else 1))
    for x in range(Wd):
        for (yy, i) in ((top - 2, 0), (top - 1, 1), (top, 2), (top + 1, 3), (bot, 1), (bot + 1, 3)): P(cv, x, yy, C('galv', i))
    for xx in (0, Wd - 1):
        VL(cv, xx, top - 2, bot + 2, C('galv', 1 if xx == 0 else 3))
    # coupler clamps at the panel joint
    for yy in (top + 10, bot - 14): R(cv, Wd - 3, yy, 6, 6, C('galv', 1)); P(cv, Wd - 1, yy + 2, C('galv', 4))
    # rubber foot block with the ground shadow
    for y in range(Hh - 10, Hh):
        for x in range(Wd - 14, Wd + 14):
            if 0 <= x < Wd: P(cv, x, y, C('charcoal', 1 if y < Hh - 7 else 3))
    for x in range(Wd):
        if hash01(x, 1, 3) < 0.6: shadow_px(cv, x, Hh - 1)
    return cv


def heras_v():
    """One tile of Heras running north-south (seen edge-on): the tube frame and mesh as a thin band."""
    Wd, Hh = T, T + HERAS_H
    cv = Canvas(Wd, Hh)
    o = T // 2 - 6
    for y in range(0, Hh - 8):
        P(cv, o + 4, y, C('galv', 1)); P(cv, o + 5, y, C('galv', 2)); P(cv, o + 6, y, C('galv', 3)); P(cv, o + 7, y, C('galv', 4))
        if y % 4 == 0: P(cv, o + 3, y, C('galv', 2)); P(cv, o + 8, y, C('galv', 3))
    for y in (6, T // 2 + 6, T + 6): R(cv, o + 2, y, 8, 5, C('galv', 1))
    for y in range(Hh - 12, Hh):
        for x in range(o, o + 12): P(cv, x, y, C('charcoal', 1 if x < o + 5 else 3))
    return cv


def palisade(cv, x0, x1, top, bot, rp='galv', seed=1, rust=0.0):
    """Steel palisade: W-section pales with triple-pointed heads on two rails."""
    for x in range(x0, x1):
        u = (x - x0) % 9
        if u in (7, 8): continue
        i = (1, 0, 1, 2, 2, 3, 4)[u]
        head = top + (0 if u in (0, 3, 6) else 3)
        for y in range(head, bot):
            c = C(rp, i)
            if rust and fbm(x, y, 6, seed) < rust: c = C('rust', 2 + (u > 3))
            P(cv, x, y, c)
    for ry in (top + 12, bot - 12):
        for x in range(x0, x1):
            P(cv, x, ry, C(rp, 1)); P(cv, x, ry + 1, C(rp, 2)); P(cv, x, ry + 2, C(rp, 4))


def ppe_gate(n, open_=False, rust=True):
    """PPE access gate in a lineside palisade fence, n tiles wide, east-west. Closed: palisade leaves, a padlocked
    drop bolt; open: leaves swung back (seen edge-on at the hinge posts)."""
    Wd, Hh = n * T, 84
    cv = Canvas(Wd, Hh)
    top, bot = 6, Hh - 6
    for px in (0, Wd - 6):
        for y in range(top - 4, Hh - 2):
            for x in range(px, px + 6): P(cv, x, y, C('galv', (0, 1, 2, 2, 3, 4)[x - px]))
        R(cv, px - 1, top - 6, 8, 3, C('galv', 1))
    if not open_:
        leaves = 2 if n > 1 else 1
        lw = (Wd - 12) // leaves
        for l in range(leaves):
            lx0 = 6 + l * lw
            palisade(cv, lx0 + 2, lx0 + lw - 2, top, bot - 2, seed=l + 3, rust=0.18 if rust else 0)
            for x in range(lx0, lx0 + lw):   # frame
                for yy in (top + 10, bot - 14): P(cv, x, yy, C('galv', 0)); P(cv, x, yy + 3, C('galv', 3))
            VL(cv, lx0, top, bot, C('galv', 1)); VL(cv, lx0 + 1, top, bot, C('galv', 3)); VL(cv, lx0 + lw - 1, top, bot, C('galv', 3))
            # a diagonal brace
            for k in range(lw - 4):
                P(cv, lx0 + 2 + k, bot - 14 - int(k * (bot - top - 26) / (lw - 4)), C('galv', 2))
        mx = Wd // 2 if n > 1 else Wd - 14
        R(cv, mx - 4, Hh // 2, 8, 10, C('galv', 1))
        R(cv, mx - 3, Hh // 2 + 10, 7, 8, C('yellow', 2)); HL(cv, mx - 3, mx + 4, Hh // 2 + 10, C('yellow', 0))
        for (a, b) in ((-2, -2), (-2, -1), (-1, -3), (0, -3), (1, -3), (2, -2), (2, -1)): P(cv, mx + a, Hh // 2 + 10 + b, C('metal', 2))
    else:
        for (hx, d) in ((6, 1), (Wd - 12, -1)) if n > 1 else ((6, 1),):
            for y in range(top - 18, bot - 10):   # leaf edge-on, swung inward (north), rises up the screen
                for q in range(4): P(cv, hx + q, y, C('galv', (1, 2, 3, 4)[q]))
            for y in range(top - 18, bot - 10, 9): R(cv, hx - 1, y, 6, 2, C('galv', 1))
    for x in range(Wd):
        if hash01(x, 0, 5) < 0.7: shadow_px(cv, x, Hh - 1); shadow_px(cv, x, Hh - 2)
    outline(cv)
    return cv


def ppe_plate():
    """Blue-and-white plate on a post (blank; the game letters "PPE beyond this point · Authorised persons only")."""
    Wd, Hh = 60, 78
    cv = Canvas(Wd, Hh)
    for y in range(40, Hh):
        for x in range(27, 33): P(cv, x, y, C('galv', (0, 1, 2, 3, 3, 4)[x - 27]))
    R(cv, 0, 0, Wd, 42, C('white', 0))
    R(cv, 0, 0, Wd, 15, C('bluesign', 2)); HL(cv, 0, Wd, 0, C('bluesign', 1))
    # two pictogram roundels (hard hat + vest), no text
    for (cx, cy) in ((16, 7), (44, 7)):
        for y in range(cy - 5, cy + 6):
            for x in range(cx - 5, cx + 6):
                if (x - cx) ** 2 + (y - cy) ** 2 <= 25: P(cv, x, y, C('white', 0))
    for x in range(12, 21): P(cv, x, 7, C('bluesign', 2)); P(cv, x, 8, C('bluesign', 3))
    for y in range(4, 7):
        for x in range(13 + (6 - y), 20 - (6 - y)): P(cv, x, y, C('bluesign', 2))
    R(cv, 41, 3, 7, 8, C('bluesign', 2)); R(cv, 43, 3, 3, 3, C('white', 0))
    HL(cv, 0, Wd, 41, C('white', 3)); VL(cv, Wd - 1, 0, 42, C('white', 3))
    FACE = [2, 17, Wd - 4, 22]
    for x in range(22, 38): shadow_px(cv, x, Hh - 1)
    outline(cv)
    return cv, {'sign': {'face': FACE}}


def site_board():
    """Free-standing blank site board on two posts (the game letters the compound notice)."""
    Wd, Hh = 3 * T, 96
    cv = Canvas(Wd, Hh)
    for lx in (18, Wd - 24):
        for y in range(40, Hh):
            for x in range(lx, lx + 6): P(cv, x, y, C('wood', (0, 1, 2, 2, 3, 4)[x - lx]))
    bh = 56
    R(cv, 0, 0, Wd, bh, C('paint_blue', 3))
    R(cv, 3, 3, Wd - 6, bh - 6, C('white', 0)); R(cv, 3, 3, Wd - 6, 12, C('paint_blue', 2))
    HL(cv, 0, Wd, 0, C('paint_blue', 1)); HL(cv, 3, Wd - 3, bh - 4, C('white', 2))
    R(cv, Wd - 30, bh - 18, 24, 11, C('hivis', 1))   # a colour band (the logo spot is left blank)
    ao_band(cv, 0, bh, Wd, (0.3, 0.12))
    for x in range(10, Wd - 10): shadow_px(cv, x, Hh - 1)
    outline(cv)
    return cv, {'sign': {'title': [5, 4, Wd - 10, 10], 'body': [5, 17, Wd - 40, bh - 22]}}
