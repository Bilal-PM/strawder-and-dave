"""Lineside structures (48 px per tile): Beck Bridge + road bridge + packhorse bridge (parapets as objects, arch faces
as ground decals), the main-line underbridge deck, Crag Lane level crossing (closed-line gates / live barriers and
lights), Kestrel Junction signal box, buffer stops, a location cabinet, milepost, whistle board, limit board and a
disused semaphore."""
from rp import *  # noqa
from station import arch_opening, glass

T = TILE


# ------------------------------------------------------------------ bridges

def parapet(n_tiles, face='south', h=54, rp='grit', seed=1, loose=False, sapling=False, low=False, hump=0):
    """A stone parapet, n tiles long. face='south': the outer south face is seen (south parapet); 'north': the inner
    face of the north parapet is seen. Coping on top, coursed stone, a drip course. hump: packhorse rise in px."""
    Wd = n_tiles * T
    top = hump + 2
    Hh = h + hump + 4
    cv = Canvas(Wd, Hh)
    def lift(x): return int(round(hump * math.sin(math.pi * (x + 0.5) / Wd))) if hump else 0
    for x in range(Wd):
        L = lift(x); y0 = top - L + hump
        yb = Hh
        # coping: half-round capstone, 9px, lit top
        for k, i in enumerate((0, 0, 1, 1, 2, 2, 3, 4, 4)):
            c = C(rp, i)
            if (x + 3) % 27 == 0 and k > 1: c = C(rp, 4)
            P(cv, x, y0 - hump + k, c)
    body_top = lambda x: top - lift(x) + 9
    ashlar(cv, 0, 0, Wd, Hh, rp, seed, ch=11, bmin=18, bmax=34, base=(1, 2) if face == 'south' else (2, 3),
           mask=lambda x, y: y >= body_top(x), soot=0.2)
    for x in range(Wd):
        by = body_top(x)
        dark(cv, x, by, 0.35); dark(cv, x, by + 1, 0.2)
    if face == 'north':   # inner face in its own shadow, weeds at the foot
        for y in range(Hh):
            for x in range(Wd):
                if y > body_top(x): dark(cv, x, y, 0.1)
        for x in range(Wd):
            if fbm(x, 0, 12, seed) > 0.5:
                for k in range(int(3 + hash01(x, 1, seed) * 7)): P(cv, x, Hh - 1 - k, C('grass', 2 + k % 2))
    if loose:   # a displaced capstone mid-span + fallen fragments
        mx = Wd // 2 + 6
        for y in range(top - 3, top + 7):
            for x in range(mx, mx + 22): P(cv, x, y, C(rp, 1 if y < top else (2 if x < mx + 18 else 4)))
        HL(cv, mx, mx + 22, top - 3, C(rp, 0)); VL(cv, mx + 22, top - 2, top + 8, O)
        for (a, b) in ((-6, 14), (-5, 15), (-4, 16), (-3, 17), (-3, 18), (-2, 19)): P(cv, mx + a, top + b, C(rp, 5))   # crack
    if sapling:  # a sycamore sapling rooted in the mortar
        sx = Wd // 3
        for k in range(16): P(cv, sx + (k // 5), top + 30 - k, C('bark', 2 + (k % 2)))
        leaf_cluster(cv, sx + 4, top + 12, 7, 'leaf', seed + 3, 0.9)
        leaf_cluster(cv, sx - 2, top + 18, 5, 'leaf', seed + 4, 0.85)
    sel_outline(cv, k=0.72, base_rows=[Hh - 1] if face == 'south' else [])
    outline_where(cv, lambda x, y: y < 12 + hump)
    return cv


def arch_face(n_tiles, n_arch=3, depth=100, rp='grit', seed=1, scour=False, soot=0.2, segmental=False, bank=True):
    """South face of a stone arch bridge below the parapet: spandrel wall, voussoir rings, piers with cutwaters,
    dark barrel, water glimpse. Ground decal, drawn onto the ground layer beneath the south parapet."""
    Wd = n_tiles * T
    cv = Canvas(Wd, depth)
    ashlar(cv, 0, 0, Wd, depth, rp, seed, ch=11, bmin=18, bmax=34, base=(2, 3), soot=soot)
    for x in range(Wd):   # string course under the parapet
        for k, i in enumerate((0, 1, 2, 4)): P(cv, x, k, C(rp, i))
    ao_band(cv, 0, 4, Wd, (0.35, 0.2, 0.1))
    pier = 30 if n_arch > 1 else 0
    span = (Wd - 24 - pier * (n_arch - 1)) // n_arch
    spring = depth - 18 if not segmental else depth - 8
    rise = min(span // 2, spring - 18) if not segmental else 30
    piers = []
    for i in range(n_arch):
        ax = 12 + i * (span + pier); cx = ax + span / 2; r = span / 2
        if i: piers.append(ax - pier / 2)
        for y in range(spring - rise - 10, depth):
            for x in range(ax - 10, ax + span + 10):
                dx = (x + 0.5 - cx) / r
                if segmental:
                    ro = (r + 9); ri = r
                    # segmental: circle centre below spring
                    R0 = (r * r + rise * rise) / (2 * rise); cy = spring - rise + R0
                    d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                    inside = d < R0 and y < depth
                    ring = R0 <= d < R0 + 9 and y <= spring + 2
                else:
                    dy = (y + 0.5 - spring) / rise
                    d = math.hypot(dx, dy if y < spring else 0)
                    inside = (d < 1 and y < spring) or (y >= spring and abs(dx) < 1)
                    dd = math.hypot((x + 0.5 - cx) / (r + 9), (y + 0.5 - spring) / (rise + 9)) if y < spring else 9
                    ring = dd < 1 and not inside
                if inside:
                    if segmental: e = min(1.0, (R0 - d) / 22.0)
                    else: e = min(1.0, (1 - d) * 3.0) if y < spring else min(1.0, (1 - abs(dx)) * 3.0)
                    rpn = 'grit_soot' if rp == 'grit' else rp
                    i2 = 3 if e < 0.18 else (4 if e < 0.5 else 5)
                    if e < 0.5 and (y % 7 == 0 or (x + (y // 7) * 5) % 17 == 0): i2 += 1
                    col = C(rpn, min(5, i2))
                    if y >= depth - 14:   # the beck flowing under, catching a little light
                        w = (y - (depth - 14))
                        col = C('water', 4 if w < 5 else 3)
                        if (x + y * 3) % 23 < 4 and w > 3: col = C('water', 2)
                        if e < 0.15: col = C('water', 5)
                        if bank and (x < T or x >= Wd - T): col = C('mud', 3 if w < 6 else 4) if hash01(x, y, 2) < 0.8 else C('moss', 3)
                    P(cv, x, y, col)
                elif ring:
                    a = math.atan2(y + 0.5 - spring, x + 0.5 - cx)
                    kf = (a + math.pi) / math.pi * (16 + span // 12)
                    j = abs(kf - int(kf) - 0.5) > 0.42
                    P(cv, x, y, C(rp, 4 if j else (1 if x < cx else 2)))
    for pxc in piers:   # cutwaters
        for k in range(10):
            for x in range(int(pxc - 12 + k), int(pxc + 12 - k)):
                P(cv, x, depth - 10 + k, C(rp, 1 if x < pxc else 3) if k < 9 else C(rp, 4))
        if scour and abs(pxc - Wd / 2) < 40:
            for x in range(int(pxc - 16), int(pxc + 16)):
                for y in range(depth - 6, depth):
                    if hash01(x, y, 9) < 0.5: P(cv, x, y, C('mud', 3 + (y % 2)))
    if soot:   # damp and algae staining down the face
        for x in range(Wd):
            if fbm(x, 1, 14, seed + 5) > 0.6:
                for y in range(8, int(8 + fbm(x, 2, 6, seed) * depth * 0.6)):
                    if opaque(cv, x, y): P(cv, x, y, C('moss', 3)) if hash01(x, y, 3) < 0.2 else dark(cv, x, y, 0.12)
    return cv


def underbridge_deck(n_rows=4, n_cols=4, live=True):
    """Main-line bridge deck over the road (x119-122, rows 57-60): two tracks on ballast between painted steel
    parapet girders; a girder fascia on the south edge; fades when walked under."""
    Wd, Dh = n_cols * T + 24, n_rows * T
    Hh = Dh + 20
    cv = Canvas(Wd, Hh)
    for y in range(Dh):
        for x in range(12, Wd - 12):
            P(cv, x, y, C('ballast', 1 + (1 if hash01(x // 3, y // 3, 3) < 0.6 else (2 if hash01(x // 3, y // 3, 4) < 0.5 else 0)) + (1 if (x % 3 == 2 and y % 3 == 2) else 0)))
    for tx in (12 + 20, 12 + 20 + 2 * T):   # two N-S tracks
        for y in range(0, Dh, 10):
            R(cv, tx - 6, y, 60, 6, C('concrete', 2)); HL(cv, tx - 6, tx + 54, y, C('concrete', 0)); HL(cv, tx - 6, tx + 54, y + 5, C('concrete', 4))
        for rx in (tx + 8, tx + 38):
            for y in range(Dh):
                P(cv, rx, y, C('rail', 3)); P(cv, rx + 1, y, C('rail', 0)); P(cv, rx + 2, y, C('rail', 2)); P(cv, rx + 3, y, C('rail', 4))
    for (gx, side) in ((0, 0), (Wd - 12, 1)):   # parapet girders (painted grey-green), rivet rows
        for y in range(Hh - 20):
            for x in range(gx, gx + 12):
                u = x - gx
                i = (0, 1, 1, 2, 2, 2, 2, 2, 3, 3, 4, 4)[u] if side == 0 else (1, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4)[u]
                P(cv, x, y, C('paint_green', i))
            if y % 8 == 4: P(cv, gx + 5, y, C('paint_green', 0)); P(cv, gx + 6, y, C('paint_green', 4))
    for y in range(Dh, Hh):   # south fascia girder, stiffeners
        for x in range(Wd):
            v = y - Dh
            i = 1 if v < 2 else (2 if v < 16 else 4)
            if x % 24 in (0, 1): i = 1 if x % 24 == 0 else 3
            if v in (2, 17) : i = 3
            P(cv, x, y, C('paint_green', i))
        for x in range(4, Wd, 8): P(cv, x, Dh + 4, C('paint_green', 0)); P(cv, x, Dh + 14, C('paint_green', 0))
    for y in range(Dh - 30, Dh):   # a little weathering at the girder foot
        for x in range(Wd):
            if hash01(x, y, 5) < 0.01: P(cv, x, y, C('rust', 2))
    sel_outline(cv, k=0.74, base_rows=[Hh - 1])
    return cv


# ------------------------------------------------------------------ level crossing

def crossing_gate_closed_line(rows=4, live=False):
    """Old white timber field gates across the railway at Crag Lane (closed line: shut across the rails, rusted,
    chained and padlocked). The gate runs north-south so it is seen nearly edge-on: a white top rail band with the
    ends of the pales, iron straps, a red target disc facing the line, and a dead gate lamp on the hinge post.
    Covers the 'z' column (x103 or x107), rows 19-22; the posts stand on rows 18 and 23."""
    Hh_ground = (rows + 2) * T
    gh = 66                 # gate height
    Wd = T
    Hh = Hh_ground + gh
    cv = Canvas(Wd, Hh)
    cx = Wd // 2
    # posts (square timber, painted white, weathered)
    for py in (T, Hh_ground - T + 12):
        for y in range(py - gh - 10, py + 6):
            for x in range(cx - 5, cx + 6):
                u = x - cx + 5; i = (0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4)[u]
                col = C('white', i)
                if not live and fbm(x, y, 6, 3) < 0.25: col = C('cream', 2 + (u > 6))
                P(cv, x, y, col)
        R(cv, cx - 6, py - gh - 13, 13, 4, C('white', 1)); HL(cv, cx - 6, cx + 7, py - gh - 13, C('white', 0))
    y0, y1 = T - gh + 6, Hh_ground - T + 12 - 8
    # gate leaves (two, meeting mid-track): top rail band + pales seen end-on + rails
    for y in range(y0, y1 + gh - 6):
        for x in range(cx - 5, cx + 6):
            u = x - cx + 5
            base = (1, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4)[u]
            v = y - y0
            if v < 6: i = base - 1
            elif (y - y0) % 16 in (0, 1): i = base               # pale ends
            else: i = base + 1 if u > 5 else base
            col = C('white', max(0, min(4, i)))
            if not live and fbm(x, y, 7, 11) < 0.3: col = C('rust', 2) if hash01(x, y, 12) < 0.3 else C('cream', 3)
            P(cv, x, y, col)
    mid = (y0 + y1 + gh - 6) // 2
    for yy in range(mid - 3, mid + 4): HL(cv, cx - 6, cx + 7, yy, C('white', 4 if yy in (mid - 3, mid + 3) else 2))   # meeting stiles
    # red target disc (seen edge-on as a red bar) + iron straps
    for yy in (y0 + 30, y1 - 10):
        R(cv, cx - 8, yy, 17, 20, C('paint_red', 2)); VL(cv, cx - 8, yy, yy + 20, C('paint_red', 1)); VL(cv, cx + 8, yy, yy + 20, C('paint_red', 4)); HL(cv, cx - 8, cx + 9, yy, C('paint_red', 1))
    for yy in range(y0 + 8, y1 + gh - 12, 24): HL(cv, cx - 4, cx + 5, yy, C('iron', 2 if live else 3)); P(cv, cx - 4, yy, C('rust', 1))
    if not live:
        for k in range(22):   # chain + padlock at the meeting stiles
            yy = mid - 11 + k; xx = cx + 5 + int(2 * math.sin(k / 3))
            P(cv, xx, yy, C('metal', 2 if k % 2 else 3))
        R(cv, cx + 4, mid + 10, 8, 9, C('rust', 2)); HL(cv, cx + 4, cx + 12, mid + 10, C('rust', 1))
        for k in range(10): P(cv, cx - 5 + (k % 3), Hh_ground - 2 - k, C('grass', 2))
    # gate lamp on the north post (dead / lit)
    ly = T - gh - 22
    R(cv, cx - 5, ly, 11, 12, C('iron', 3)); R(cv, cx - 3, ly + 2, 7, 7, C('paint_red', 2) if live else C('interior', 2))
    HL(cv, cx - 6, cx + 6, ly - 1, C('iron', 1)); P(cv, cx, ly - 3, C('iron', 2))
    outline(cv)
    return cv


def barrier(state='raised', side='e', live=True, span=2):
    """UK half-barrier with the road traffic light unit on the post: twin reds + amber, a St Andrew's-free plate
    (blank backboard), striped boom. state: 'raised' (boom upright) | 'lowered' (boom across 2 tiles of lane).
    side 'w' = post on the west verge, boom reaching east; 'e' = mirrored."""
    L = span * T + 6
    if state == 'raised': Wd, Hh = 48, 180
    else: Wd, Hh = 48 + L, 110
    cv = Canvas(Wd, Hh)
    px = 20 if state == 'raised' else 20
    # pedestal + post
    R(cv, px - 10, Hh - 22, 22, 22, C('galv', 2)); HL(cv, px - 10, px + 12, Hh - 22, C('galv', 0)); VL(cv, px + 11, Hh - 22, Hh, C('galv', 4))
    for y in range(Hh - 96, Hh - 22):
        for x in range(px - 3, px + 4): P(cv, x, y, C('galv', (0, 1, 1, 2, 2, 3, 4)[x - px + 3]))
    # light unit: black backboard with white border, two reds + amber
    by = Hh - 96
    R(cv, px - 16, by, 33, 30, C('white', 1)); R(cv, px - 14, by + 2, 29, 26, C('paint_black', 3))
    for (lx, ly, col) in ((px - 8, by + 9, 'r'), (px + 8, by + 9, 'r'), (px, by + 20, 'a')):
        for y in range(ly - 5, ly + 6):
            for x in range(lx - 5, lx + 6):
                d = (x - lx) ** 2 + (y - ly) ** 2
                if d <= 25:
                    if d > 16: P(cv, x, y, C('paint_black', 1))
                    else:
                        P(cv, x, y, C('paint_red', 3) if col == 'r' else C('mustard', 3))
        R(cv, lx - 6, ly - 7, 13, 2, C('paint_black', 1))   # hood
    # boom
    def stripe(t):
        return C('paint_red', 2) if int(t / 16) % 2 == 0 else C('white', 0)
    if state == 'raised':
        for y in range(4, Hh - 30):
            for x in range(px + 19, px + 25):
                u = x - px - 19; c = stripe(y)
                P(cv, x, y, c if u < 4 else darker(c, 0.75))
        R(cv, px + 11, Hh - 38, 16, 12, C('galv', 3)); HL(cv, px + 11, px + 27, Hh - 38, C('galv', 1))   # pivot housing
        R(cv, px + 18, 2, 8, 6, C('paint_red', 1))       # tip lamp
    else:
        by2 = Hh - 44
        for x in range(px, Wd):
            for y in range(by2, by2 + 6):
                c = stripe(x - px); P(cv, x, y, c if y < by2 + 4 else darker(c, 0.75))
            if (x - px) % 32 == 16:   # skirt pendants
                VL(cv, x, by2 + 6, by2 + 18, C('galv', 3))
        R(cv, px - 4, by2 - 4, 12, 14, C('galv', 3))
        R(cv, Wd - 8, by2 - 2, 7, 5, C('paint_red', 1))
        for x in range(px, Wd):
            if hash01(x, 2, 1) < 0.8: shadow_px(cv, x, Hh - 1)
    if side == 'e': cv = cv.flip()
    outline(cv)
    return cv


def barrier_lit(img_state, which):
    """A lit frame of the crossing lights: which = 'l' | 'r' (alternating wig-wag reds) | 'a' (steady amber)."""
    cv = img_state.copy()
    return cv


def crossing_sign(live=False):
    """St Andrew's cross on a post with the (dead or working) twin lights below (no text)."""
    Wd, Hh = 40, 132
    cv = Canvas(Wd, Hh)
    cx = Wd // 2
    for y in range(26, Hh):
        for x in range(cx - 2, cx + 3): P(cv, x, y, C('galv', (0, 1, 2, 3, 4)[x - cx + 2]))
    for k in range(34):   # the cross: two boards
        for q in range(-3, 4):
            for (x, y) in ((3 + k + q * 0, 2 + k - q), (36 - k, 2 + k - q)):
                band = (k // 6) % 2 == 0
                P(cv, x, y, C('white', 0 if q < 0 else 1) if band else C('paint_red', 2 if q < 0 else 3))
    R(cv, cx - 16, 48, 33, 16, C('paint_black', 3)); HL(cv, cx - 16, cx + 17, 48, C('paint_black', 1))
    for lx in (cx - 8, cx + 8):
        for y in range(51, 62):
            for x in range(lx - 5, lx + 6):
                if (x - lx) ** 2 + (y - 56) ** 2 <= 25: P(cv, x, y, C('paint_red', 3 if live else 4) if not live else C('paint_red', 3))
    if not live:
        for y in range(48, 64):
            for x in range(cx - 16, cx + 17):
                if fbm(x, y, 5, 3) < 0.3: P(cv, x, y, C('rust', 3))
    outline(cv)
    return cv


def light_frames(base, centres, r=4):
    """Return a copy of base with the given lamp centres glowing (for flashing frames)."""
    cv = base.copy()
    for (lx, ly, rp) in centres:
        for y in range(ly - r, ly + r + 1):
            for x in range(lx - r, lx + r + 1):
                d = (x - lx) ** 2 + (y - ly) ** 2
                if d <= r * r: P(cv, x, y, C(rp, (0 if d < 3 else 1) + (1 if rp == 'lamp_glow' else 0)))
    return cv


# ------------------------------------------------------------------ signal box

def signal_box():
    """Kestrel Junction signal box, 5 x 5 tiles at (110,25): brick locking room, timber operating floor glazed on
    three sides, hipped slate roof with a finial and stove chimney, external stair + landing, blank nameboard.
    Ground-floor door '*' at (112,29) (not enterable)."""
    Wd, FH, OV = 5 * T, 5 * T, 70
    Hh = FH + OV
    cv = Canvas(Wd, Hh)
    roof_b = 96
    # hipped roof: trapezoid seen from above-south
    for y in range(12, roof_b):
        t = (y - 12) / (roof_b - 12)
        inset = int((1 - t) * 44)
        for x in range(inset + 4, Wd - inset - 4):
            pass
    def in_roof(x, y):
        if y < 12 or y >= roof_b: return False
        t = (y - 12) / (roof_b - 12)
        inset = (1 - t) * 60
        return 2 + inset <= x < Wd - 2 - inset
    slates(cv, in_roof, 0, 12, Wd, roof_b, roof_b, ch=6, sw=13, base=2, seed=5)
    for y in range(12, roof_b):   # hip lines + shade on the east hip
        t = (y - 12) / (roof_b - 12); inset = (1 - t) * 60
        xl, xr = int(2 + inset), int(Wd - 3 - inset)
        P(cv, xl, y, C('slate', 0)); P(cv, xl + 1, y, C('slate', 1)); P(cv, xr, y, C('slate', 4)); P(cv, xr - 1, y, C('slate', 3))
        for x in range(xr - 14, xr - 1):
            if in_roof(x, y) and x > Wd / 2 + 30: dark(cv, x, y, 0.15)
    HL(cv, 62, Wd - 62, 12, O); HL(cv, 62, Wd - 62, 13, C('slate', 1))
    for y in range(0, 14): P(cv, Wd // 2, y, C('iron', 1)); P(cv, Wd // 2 + 1, y, C('iron', 3))   # finial
    R(cv, Wd // 2 - 2, 0, 5, 3, C('iron', 1))
    for y in range(2, 40):   # stove chimney (cast iron pipe)
        for x in range(170, 178): P(cv, x, y, C('iron', (0, 1, 1, 2, 2, 3, 3, 4)[x - 170]))
    R(cv, 166, 0, 16, 4, C('iron', 2)); HL(cv, 166, 182, 0, C('iron', 1))
    for x in range(0, Wd):   # eaves: gutter + deep shadow
        for k, i in enumerate((1, 2, 3, 4)): P(cv, x, roof_b + k, C('iron', i))
    # operating floor: timber, big multi-pane windows (lit warm: the box is switched in)
    of0, of1 = roof_b + 4, roof_b + 88
    boards(cv, 0, of0, Wd, of1 - of0, 'paint_cream', 7, vertical=False, bw=5, base=1)
    for k in range(6):
        wx = 8 + k * 38; wy = of0 + 12
        R(cv, wx, wy, 34, 48, C('paint_green', 2)); HL(cv, wx, wx + 34, wy, C('paint_green', 1))
        glass(cv, lambda x, y: True, wx + 3, wy + 3, 28, 42, seed=k, lit=(k % 2 == 0))
        for gx in (wx + 12, wx + 21): VL(cv, gx, wy + 3, wy + 45, C('paint_green', 2))
        for gy in (wy + 17, wy + 31): HL(cv, wx + 3, wx + 31, gy, C('paint_green', 2))
        ao_band(cv, wx + 3, wy + 3, 28, (0.3, 0.15))
    ao_band(cv, 0, of0, Wd, (0.45, 0.3, 0.15))
    # nameboard (blank; the game letters "KESTREL JUNCTION")
    NB = (26, of1 - 20, Wd - 52, 16)
    R(cv, NB[0] - 2, NB[1] - 2, NB[2] + 4, NB[3] + 4, C('paint_black', 3))
    R(cv, *NB, C('paint_cream', 1)); HL(cv, NB[0], NB[0] + NB[2], NB[1], C('paint_cream', 3))
    # floor band + locking room (brick) with small windows and the door
    R(cv, 0, of1, Wd, 5, C('paint_green', 2)); HL(cv, 0, Wd, of1, C('paint_green', 0))
    lr0 = of1 + 5
    bricks(cv, 0, lr0, Wd, Hh - lr0, 'brick', 13)
    ao_band(cv, 0, lr0, Wd, (0.4, 0.22, 0.1))
    for wx in (18, 150):
        R(cv, wx - 3, lr0 + 30, 46, 4, C('grit', 1))
        glass(cv, lambda x, y: True, wx, lr0 + 34, 40, 28, seed=wx)
        for gx in range(wx + 8, wx + 40, 8): VL(cv, gx, lr0 + 34, lr0 + 62, C('iron', 2))
        HL(cv, wx - 4, wx + 44, lr0 + 62, C('grit', 1)); HL(cv, wx - 4, wx + 44, lr0 + 63, C('grit', 3))
    dcx = 2 * T + T // 2     # door tile x=112 -> sprite 96..144
    R(cv, dcx - 24, Hh - 86, 48, 86, C('grit', 2)); HL(cv, dcx - 24, dcx + 24, Hh - 86, C('grit', 0))
    boards(cv, dcx - 20, Hh - 82, 40, 82, 'paint_green', 17, vertical=True, bw=6, base=2)
    R(cv, dcx + 12, Hh - 44, 4, 6, C('gold', 1))
    ao_band(cv, dcx - 20, Hh - 82, 40, (0.35, 0.18))
    # external timber stair up the east side to a landing and the operating-floor door
    sx0 = Wd - 70
    for k in range(12):
        x = sx0 + k * 5; y = Hh - 8 - k * 9
        R(cv, x, y, 16, 3, C('wood', 1)); HL(cv, x, x + 16, y + 3, C('wood', 4))
    for k in range(60):
        yy = Hh - 4 - int(k * 9 / 5)
        P(cv, sx0 + k, yy, C('wood', 3)); P(cv, sx0 + k, yy - 30, C('white', 1)); P(cv, sx0 + k, yy - 29, C('white', 3))
    R(cv, Wd - 12, lr0 - 6, 12, 4, C('wood', 1))
    sel_outline(cv, k=0.74, base_rows=[Hh - 1])
    return cv, {'sign': {'nameboard': list(NB)}, 'lights': [[8 + k * 38 + 17, of0 + 36, 40] for k in range(0, 6, 2)]}


# ------------------------------------------------------------------ small lineside furniture

def buffer_stop(live=False):
    """Rail-built buffer stop at the west end (x8, rows 20-21), buffers facing east. Seen from the south: a raked
    rail frame under each rail (the far one higher up the screen), a stout beam across both, sprung buffers, a lamp
    and (closed) the rambling rose."""
    Wd, Hh = T, 2 * T + 44
    cv = Canvas(Wd, Hh)
    mat = (lambda i: C('rail', i)) if live else (lambda i: C('rust', i))
    near, far = Hh - 10, Hh - 10 - 40
    for (base, dk) in ((far, 1), (near, 0)):
        for k in range(36):   # raked strut
            x = 3 + k * 0.62; y = base - k
            for q in range(4): P(cv, x + q, y, mat(min(4, 1 + q // 2 + dk)))
        for y in range(base - 40, base + 2):   # upright
            for q in range(5): P(cv, 24 + q, y, mat(min(4, (1, 1, 2, 3, 4)[q] + dk)))
        HL(cv, 0, 34, base + 1, C('sleeper', 3 + dk)); HL(cv, 0, 34, base + 2, C('sleeper', 4))
    bx0, bx1, by0, by1 = 20, 40, far - 54, near - 26
    for y in range(by0, by1):
        for x in range(bx0, bx1):
            u, v = x - bx0, y - by0
            if v < 6: i = 0 if v < 2 else 1          # lit top of the beam
            else: i = 2 if u < 15 else 3
            if u == bx1 - bx0 - 1: i = 4
            if live:
                c = C('paint_red', i) if ((v - 6) // 12) % 2 == 0 or v < 6 else C('white', i)
            else:
                c = C('wood_dark', i)
                if (x + y * 3) % 17 == 0: c = C('wood_dark', min(4, i + 1))
            P(cv, x, y, c)
    for (by, dk) in ((far - 42, 1), (near - 38, 0)):   # buffers
        R(cv, 40, by, 5, 9, C('metal', 2 + dk)); HL(cv, 40, 45, by, C('metal', 1 + dk))
        R(cv, 44, by - 4, 4, 17, C('metal', 1 + dk)); VL(cv, 47, by - 4, by + 13, C('metal', 4)); P(cv, 44, by - 4, C('metal', 0))
    ly = by0 - 14   # lamp
    R(cv, 24, ly, 13, 14, C('iron', 3)); HL(cv, 23, 38, ly - 1, C('iron', 1))
    R(cv, 26, ly + 3, 9, 8, C('paint_red', 1) if live else C('interior', 2)); P(cv, 26, ly + 3, C('white', 0))
    if not live:   # the red rose rambling up the frame
        for k in range(44):
            x = 6 + 14 * math.sin(k * 0.28) * (0.4 + k / 70); y = Hh - 4 - k * 2.1
            P(cv, x, y, C('forest', 2)); P(cv, x + 1, y, C('forest', 3))
            if k % 3 == 0: leaf_cluster(cv, x, y, 4.5, 'forest', k, 0.9)
            if k % 6 == 3: R(cv, x - 1, y - 1, 3, 3, C('flower_red', 1)); P(cv, x - 1, y - 1, C('flower_red', 0)); P(cv, x + 1, y + 1, C('flower_red', 2))
    for x in range(0, Wd - 2): shadow_px(cv, x, Hh - 1)
    outline(cv)
    return cv


def location_cabinet(live=False):
    """Lineside location case: galvanised/green steel cabinet on a plinth, two doors, vents, warning triangle."""
    Wd, Hh = 40, 84
    cv = Canvas(Wd, Hh)
    rp = 'galv'
    R(cv, 0, 0, Wd, 10, C(rp, 1)); HL(cv, 0, Wd, 0, C(rp, 0)); HL(cv, 0, Wd, 9, C(rp, 3))     # lid
    for y in range(10, Hh - 10):
        for x in range(1, Wd - 1):
            i = 1 if x < 4 else (2 if x < Wd - 5 else 3)
            if x in (Wd // 2, Wd // 2 - 1): i = 4 if x == Wd // 2 else 3
            P(cv, x, y, C(rp, i))
    for y in range(18, 26, 2): HL(cv, 6, 16, y, C(rp, 4)); HL(cv, Wd - 16, Wd - 6, y, C(rp, 4))
    # warning triangle (symbol only)
    for k in range(9): HL(cv, Wd // 2 - 12 + 8 - k // 2 + 4, Wd // 2 - 12 + 8 + k // 2 + 5, 38 + k, C('yellow', 1))
    HL(cv, Wd // 2 - 8, Wd // 2 + 1, 47, C('paint_black', 3))
    R(cv, 4, 54, 3, 6, C(rp, 0)); R(cv, Wd - 7, 54, 3, 6, C(rp, 0))
    R(cv, -2 + 2, Hh - 10, Wd - 0, 10, C('concrete', 2)); HL(cv, 0, Wd, Hh - 10, C('concrete', 0))
    if not live:
        for y in range(Hh - 30, Hh - 10):
            for x in range(1, Wd - 1):
                if fbm(x, y, 6, 3) < 0.15: P(cv, x, y, C('rust', 2))
    outline(cv)
    return cv


def post_board(bw, bh, post_h, face='white', frame='paint_black', legs=1, seed=1):
    """A blank board on post(s): milepost plates, whistle boards, limit board."""
    Wd = bw; Hh = bh + post_h
    cv = Canvas(Wd, Hh)
    xs = [Wd // 2 - 2] if legs == 1 else [8, Wd - 13]
    for lx in xs:
        for y in range(bh, Hh):
            for x in range(lx, lx + 5): P(cv, x, y, C('galv', (0, 1, 2, 3, 4)[x - lx]))
    R(cv, 0, 0, bw, bh, C(frame, 2)); HL(cv, 0, bw, 0, C(frame, 0))
    R(cv, 3, 3, bw - 6, bh - 6, C(face, 0)); HL(cv, 3, bw - 3, bh - 4, C(face, 2)); VL(cv, bw - 4, 3, bh - 3, C(face, 2))
    ao_band(cv, xs[0], bh, 5, (0.4, 0.2))
    outline(cv)
    return cv, [3, 3, bw - 6, bh - 6]


def milepost(live=False):
    """Cast-iron milepost: a raked plate on a short post (blank; numbers drawn by the game if wanted)."""
    Wd, Hh = 30, 60
    cv = Canvas(Wd, Hh)
    for y in range(24, Hh):
        for x in range(12, 18): P(cv, x, y, C('paint_black', (1, 1, 2, 2, 3, 4)[x - 12]))
    for y in range(0, 26):   # plate, angled towards the line: lit top face
        for x in range(1, Wd - 1):
            edge = x in (1, Wd - 2) or y in (0, 25)
            P(cv, x, y, C('paint_black', 2) if edge else C('white', 0 if y < 12 else 1))
    HL(cv, 1, Wd - 1, 0, C('paint_black', 0))
    outline(cv)
    return cv, [3, 2, Wd - 6, 22]


def semaphore(live=False):
    """Disused lower-quadrant semaphore: lattice/rail post, arm at danger, dead lamp, ladder."""
    Wd, Hh = 60, 200
    cv = Canvas(Wd, Hh)
    px = 22
    for y in range(18, Hh):
        for x in range(px, px + 7): P(cv, x, y, C('rust' if not live else 'white', (1, 1, 2, 2, 3, 3, 4)[x - px]))
    R(cv, px - 2, 10, 11, 9, C('iron', 2)); R(cv, px + 1, 4, 5, 7, C('iron', 1))   # cap + finial
    for y in range(40, Hh - 10, 10): HL(cv, px - 8, px - 2, y, C('iron', 3))        # ladder rungs
    VL(cv, px - 9, 40, Hh - 10, C('iron', 3)); VL(cv, px - 2, 40, Hh - 10, C('iron', 2))
    ay = 30
    for x in range(px + 7, Wd - 2):   # arm: red with a white stripe (at danger, horizontal)
        for y in range(ay, ay + 9):
            c = C('paint_red', 2 if y < ay + 7 else 4)
            if Wd - 16 <= x < Wd - 11: c = C('white', 0 if y < ay + 7 else 2)
            if not live and fbm(x, y, 9, 9) < 0.22: c = darker(c, 0.8)
            P(cv, x, y, c)
    R(cv, px - 10, ay + 2, 10, 12, C('iron', 3)); R(cv, px - 8, ay + 4, 6, 7, C('interior', 2))   # spectacle / lamp
    for x in range(px - 6, px + 14): shadow_px(cv, x, Hh - 1)
    outline(cv)
    return cv
