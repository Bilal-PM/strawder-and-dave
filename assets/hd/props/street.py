"""Street furniture and town props (48 px per tile, a person is ~44x94): Victorian lamp post (lit/unlit), park bench,
litter bin, pillar box, phone box, bus stop, fingerposts, notice boards, planters, hanging baskets, bollards, bike,
milk churns, crates, pallets, sandbags, cones, wheelbarrow, allotment kit, gravestones, war memorial, washing line
and bunting. All signs are blank (the game letters them). Every sprite gets the 1 px warm outline."""
import math
from kit import *  # noqa
from bounds import boxes, grain, post_shadow

T = TILE


def lathe(cv, cx, y0, prof, rp, bias=0.0, flutes=0, tex=None, lum_fn=None):
    """Turned / cast profile: prof = list of half-widths, one per row from y0 down. Shaded as a solid of
    revolution lit from the upper left. flutes > 0 adds vertical fluting (castings)."""
    for i, hw in enumerate(prof):
        if hw <= 0: continue
        y = y0 + i
        slope = (prof[min(len(prof) - 1, i + 1)] - prof[max(0, i - 1)]) / 2.0   # widening downwards => faces up
        for x in range(int(math.floor(cx - hw)), int(math.ceil(cx + hw))):
            u = (x + 0.5 - cx) / hw
            if abs(u) > 1: continue
            nz = math.sqrt(max(0, 1 - u * u)); ny = -max(-0.9, min(0.9, slope)) * 0.9
            L = light(u, ny, nz) + bias
            if flutes and hw > 3: L += 0.16 * math.cos(u * math.pi * flutes) * nz
            if tex: L += tex(x, y, u)
            if lum_fn: L = lum_fn(x, y, u, L)
            cv.put(x, y, shade(rp, L))


def spec(cv, x, y, col='#ffffff'):
    cv.put(x, y, col)


# ------------------------------------------------------------------ Victorian lamp post
def lamp_post(lit=False):
    """Heritage cast-iron street lamp: fluted base, slender shaft with collars, ladder bar, tapered lantern with
    a canopy and finial. 40 x 140; anchor at the base centre. lit=True gives a warm glowing lantern."""
    Wd, H = 40, 142; cx = 20; by = 137
    cv = Canvas(Wd, H); ir = 'paint_black'
    # base: step, bell, collar
    base = [7] * 1 + [11] * 3 + [10] * 2 + [9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6.2, 6, 5.8, 5.6, 5.4, 5.2, 5, 4.8, 4.6] + [6, 6, 5] + [4.2] * 3
    base = base[::-1]
    lathe(cv, cx, by - len(base) + 1, base, ir, flutes=3)
    # shaft with collars
    top_shaft = 34; shaft_bot = by - len(base) + 1
    prof = []
    for y in range(top_shaft, shaft_bot):
        t = (y - top_shaft) / (shaft_bot - top_shaft)
        hw = 2.4 + t * 0.9
        if abs(y - (top_shaft + (shaft_bot - top_shaft) * 0.55)) < 2: hw += 1.5
        if y - top_shaft < 4: hw = 3.8 - (y - top_shaft) * 0.25
        prof.append(hw)
    lathe(cv, cx, top_shaft, prof, ir)
    # ladder bar with ball ends
    ly = 40
    for x in range(cx - 13, cx + 14):
        cv.put(x, ly, C(ir, 1)); cv.put(x, ly + 1, C(ir, 2)); cv.put(x, ly + 2, C(ir, 3))
    for bx in (cx - 14, cx + 14):
        cv.ellipse(bx, ly + 1, 2.2, 2.2, lambda x, y, nx, ny, nz: shade(ir, light(nx, ny, nz)))
    for k in range(5):  # little scroll brackets under the bar
        cv.put(cx - 4 - k, ly + 3 + k // 2, C(ir, 2)); cv.put(cx + 4 + k, ly + 3 + k // 2, C(ir, 3))
    # spigot + lantern
    lathe(cv, cx, 29, [3, 3.5, 4, 4.5, 5], ir)
    lt, lb = 6, 29                    # lantern body rows
    for y in range(lt, lb):
        t = (y - lt) / (lb - lt)
        hw = 9 - t * 3.5
        for x in range(int(cx - hw), int(math.ceil(cx + hw))):
            u = (x + 0.5 - cx) / hw
            frame = abs(u) > 0.84 or y in (lt, lt + 1, lb - 1) or abs(u) < 0.07 or (abs(abs(u) - 0.46) < 0.07)
            if frame:
                L = light(u, -0.2, math.sqrt(max(0, 1 - u * u))) + 0.05
                cv.put(x, y, shade(ir, L)); continue
            if lit:
                d = math.hypot(u * 1.3, (t - 0.55) * 2.2)
                i = 0 if d < 0.35 else (1 if d < 0.7 else 2)
                if abs(u) > 0.6: i = min(3, i + 1)
                cv.put(x, y, C('lamp_glow', i))
            else:
                i = 2 + (1 if u > 0.1 else 0) + (1 if t > 0.7 else 0)
                if abs(u + 0.62) < 0.1 and 0.15 < t < 0.7: i = 0               # reflection streak
                cv.put(x, y, C('glass', i))
    if lit:  # the mantle
        cv.rect(cx - 1, 17, 3, 5, C('lamp_glow', 0)); cv.put(cx, 16, '#ffffff')
    # canopy and finial
    can = [1, 2, 3, 4, 5.5, 7, 8.5, 10, 11]
    lathe(cv, cx, lt - 6, can, ir, bias=0.05)
    for x in range(cx - 11, cx + 12): cv.put(x, lt + 3 - 1, C(ir, 3))
    lathe(cv, cx, 0, [0.8, 1.2, 1.8, 2.2, 1.6], 'gold')
    fin(cv)
    sh = Canvas(Wd, H); shadow_ellipse(sh, cx + 4, by + 1, 11, 3.2, 90); over(sh, cv)
    return sh, [cx, by]


# ------------------------------------------------------------------ planks and grain
def plank(cv, x0, x1, y, h, rp, seed=0, top_lit=True, bias=0.0, ends=True):
    """A horizontal plank h px tall: lit top edge, mid face, dark lower edge, sparse long grain streaks, knots."""
    for yy in range(h):
        for x in range(x0, x1):
            L = 0.62 + bias
            if yy == 0: L += 0.24 if top_lit else 0.1
            elif yy == h - 1: L -= 0.22
            elif yy == 1 and h > 3: L += 0.06
            if ends and x == x0: L += 0.08
            if ends and x == x1 - 1: L -= 0.18
            k = hash01((x + int(hash01(yy, y, seed) * 13)) // 6, yy + y * 3, seed)
            if 0 < yy < h - 1 and k < 0.2: L -= 0.12
            cv.put(x, y + yy, shade(rp, L))
    kx = x0 + 4 + int(hash01(y, 1, seed) * max(1, x1 - x0 - 8))
    if h >= 4: cv.put(kx, y + h // 2, C(rp, 3)); cv.put(kx + 1, y + h // 2, C(rp, 2))


def iron_bar(cv, pts, rp='paint_black', w=2):
    """Cast-iron bar along a polyline, 2-3 px, lit on its upper-left edge."""
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        n = int(max(abs(bx - ax), abs(by - ay))) + 1
        for i in range(n + 1):
            t = i / max(1, n); x = ax + (bx - ax) * t; y = ay + (by - ay) * t
            for d in range(w):
                cv.put(int(round(x)) + d, int(round(y)), C(rp, 1 if d == 0 else (2 if d < w - 1 else 3)))


# ------------------------------------------------------------------ park bench
def bench(variant=0, plaque=True):
    """Park bench facing south (towards the camera): oak slats on black cast-iron ends with scrolled arms.
    104 x 72, anchor at the ground centre under the front legs."""
    Wd, H = 104, 72
    cv = Canvas(Wd, H); sh = Canvas(Wd, H)
    wd = 'p_oakwood'; ir = 'paint_black'
    L0, L1 = 12, Wd - 16            # iron ends x
    # rear legs / back posts (behind everything)
    for ex in (L0, L1):
        vcyl(cv, ex, 6, 4, 54, ir)
        lathe(cv, ex + 2, 3, [1.2, 2, 2.4, 2.4, 2], ir)
    # back rest: 3 slats
    for k, y in enumerate((9, 16, 23)):
        plank(cv, 6, Wd - 6, y, 5, wd, 400 + variant + k, bias=-0.04)
    # seat seen from above: 4 slats with dark gaps, then the front edge of the front slat
    for k, y in enumerate((31, 35, 39, 43)):
        plank(cv, 5, Wd - 5, y, 3, wd, 410 + variant + k, bias=0.14 - 0.03 * k)
    plank(cv, 5, Wd - 5, 46, 3, wd, 420 + variant, top_lit=False, bias=-0.1)
    # seat bearers and front legs with feet
    for ex in (L0, L1):
        for y in range(31, 49): cv.put(ex + 3, y, C(ir, 3))
        vcyl(cv, ex, 49, 4, 17, ir)
        for fx in range(ex - 2, ex + 6): cv.put(fx, 65, C(ir, 2)); cv.put(fx, 66, C(ir, 3))
        for fx in range(ex - 1, ex + 5): cv.put(fx, 59, C(ir, 3))
        # arm: from the back post forward and down to a scroll above the front leg
        iron_bar(cv, [(ex, 25), (ex + 1, 30), (ex + 1, 36), (ex + 1, 40)], ir, 3)
        cv.ellipse(ex + 2, 41, 3.2, 3.2, lambda x, y, nx, ny, nz: shade(ir, light(nx, ny, nz)))
        cv.put(ex + 2, 41, C(ir, 3)); cv.put(ex + 1, 40, C(ir, 0))
        for y in (12, 19, 26): cv.put(ex + 1, y + 1, C('p_galv', 1))       # bolt heads
    if plaque:  # small blank brass memorial plaque on the middle back slat
        cv.rect(Wd // 2 - 7, 17, 14, 3, C('gold', 2)); cv.rect(Wd // 2 - 7, 17, 14, 1, C('gold', 1))
        cv.put(Wd // 2 - 6, 18, C('gold', 0)); cv.put(Wd // 2 + 6, 19, C('gold', 3))
    fin(cv)
    for y in range(50, 69):
        for x in range(8 + (y - 50) // 3, Wd - 2 + (y - 50) // 3):
            if y >= 60 or (x < L0 + 8 or x > L1 - 2): pass
        pass
    for x in range(6, Wd - 6):
        for y in range(62, 69): sh.put(x + (y - 62) // 2, y, SHADOW[:3] + (80 if y < 67 else 50,))
    over(sh, cv)
    return sh, [Wd // 2, 66]


# ================================================================== helpers for hard props
def box3(cv, x, y, w, h, d, rp, bias=0.0, tex=None, edge=True):
    """3/4 box: a lit top face d px deep over a front face h px tall (x, y = top-left of the top face)."""
    for yy in range(d + h):
        for xx in range(w):
            top = yy < d
            L = (0.88 if top else 0.6) + bias
            if edge and xx == 0: L += 0.08
            if edge and xx == w - 1: L -= 0.2
            if not top and yy == d: L += 0.08
            if not top and yy == d + h - 1: L -= 0.14
            if top and yy == d - 1: L -= 0.06
            if tex: L += tex(x + xx, y + yy, top)
            cv.put(x + xx, y + yy, shade(rp, L))


def sphere(cv, cx, cy, r, rp, bias=0.0):
    cv.ellipse(cx, cy, r, r, lambda x, y, nx, ny, nz: shade(rp, light(nx, ny, nz) + bias))


def done(cv, anchor, shadow=None, a=86):
    """Outline, then put a cast shadow (cx, cy, rx, ry) under it."""
    fin(cv)
    if shadow:
        big = Canvas(cv.w + 10, cv.h + 3); big.im.paste(cv.im, (0, 0)); big.px = big.im.load()   # room for the shadow
        sh = Canvas(big.w, big.h); shadow_ellipse(sh, *shadow, alpha=a); over(sh, big); cv = sh
        bb = cv.im.getbbox(); cv.im = cv.im.crop((0, 0, max(bb[2], anchor[0] + 1), max(bb[3], anchor[1] + 1))); cv.w, cv.h = cv.im.size; cv.px = cv.im.load()
    return cv, anchor


def wood_tex(seed, amt=0.1):
    return lambda x, y, top: ((0.0 if hash01((x + int(hash01(y, 0, seed) * 9)) // 5, y, seed) > 0.2 else -amt)
                              if not top else (0.0 if hash01(x, (y + int(hash01(x, 1, seed) * 7)) // 4, seed) > 0.2 else -amt))


# ================================================================== street furniture
def litter_bin():
    """Black cast-iron litter bin with a gold band and a domed lid. 26 x 44."""
    cv = Canvas(26, 44); cx = 13
    prof = [5, 7, 8.5, 9.5, 10] + [10.5] * 3 + [10] * 26 + [10.8, 10.8, 9.5, 9, 9]
    lathe(cv, cx, 1, prof, 'paint_black', flutes=4)
    for y in (10, 11): 
        for x in range(cx - 10, cx + 11): cv.put(x, y, shade('gold', 0.7 - (x - cx) / 14))
    for y in (6, 7):
        for x in range(cx - 7, cx + 8): cv.put(x, y, C('paint_black', 4))       # the mouth under the lid
    return done(cv, [cx, 41], (cx + 3, 41, 11, 3))


def pillar_box():
    """Red cylindrical pillar box: domed cap with a rim, posting slot, blank collection plate, black plinth.
    30 x 64 (no cipher, no lettering)."""
    cv = Canvas(30, 64); cx = 15
    cap = [4, 7, 9, 10.5, 11.5, 12.5, 13, 13.5, 13.5, 12]
    lathe(cv, cx, 1, cap, 'paint_red', bias=0.04)
    body = [11.2] * 3 + [11] * 40
    lathe(cv, cx, 11, body, 'paint_red')
    lathe(cv, cx, 54, [11.6, 12, 12, 12, 12, 12, 12, 11.5], 'paint_black')
    for x in range(cx - 7, cx + 7): cv.put(x, 16, C('paint_black', 4)); cv.put(x, 17, C('paint_red', 4))   # slot
    cv.rect(cx - 5, 23, 10, 8, C('white', 1)); cv.rect(cx - 5, 23, 10, 1, C('white', 0)); cv.rect(cx + 4, 23, 1, 8, C('white', 3))
    cv.rect(cx - 3, 38, 6, 3, C('paint_red', 3)); cv.put(cx - 3, 38, C('paint_red', 1))            # door handle plate
    return done(cv, [cx, 61], (cx + 4, 61, 13, 3.4))


def phone_box():
    """Red cast-iron telephone kiosk (domed roof, glazed door with small panes, blank header panels). 44 x 110."""
    W, H = 44, 110; cv = Canvas(W, H); rp = 'paint_red'
    # domed roof with its top face
    for y in range(0, 12):
        hw = 16 + min(5, y * 0.8)
        for x in range(int(22 - hw), int(22 + hw)):
            u = (x + 0.5 - 22) / hw
            cv.put(x, y, shade(rp, light(u, -0.8 + y * 0.08, 0.6)))
    cv.rect(4, 12, 36, 7, C(rp, 2)); cv.rect(4, 12, 36, 1, C(rp, 1))
    cv.rect(8, 13, 28, 5, C('white', 1)); cv.rect(8, 13, 28, 1, C('white', 0))                      # blank header
    box3(cv, 3, 19, 38, 82, 0, rp)
    cv.rect(3, 19, 3, 82, C(rp, 1)); cv.rect(38, 19, 3, 82, C(rp, 3))                               # corner posts
    # door: 3 x 8 panes of glass
    for r in range(8):
        for c in range(3):
            x0, y0 = 9 + c * 9, 23 + r * 9
            for yy in range(7):
                for xx in range(7):
                    i = 2 + (xx > 3) + (yy > 4)
                    if xx + yy < 3 and r < 5: i = 0
                    cv.put(x0 + xx, y0 + yy, C('glass', min(4, i)))
    cv.rect(34, 58, 2, 8, C('gold', 2))                                                             # door handle
    cv.rect(1, 101, 42, 5, C('concrete', 2)); cv.rect(1, 101, 42, 1, C('concrete', 1))              # plinth
    return done(cv, [22, 105], (26, 106, 20, 4))


def bus_stop():
    """Bus stop: a slim pole with a round-cornered blank flag and a timetable case. 34 x 118."""
    W, H = 34, 118; cv = Canvas(W, H); px_ = 8
    vcyl(cv, px_, 6, 4, 108, 'p_galv')
    # flag: white with a coloured band (the game letters "41")
    for y in range(4, 30):
        for x in range(px_ + 3, px_ + 26):
            r = (y in (4, 29)) and x in (px_ + 3, px_ + 25)
            if r: continue
            L = 0.85 - (0.2 if x == px_ + 25 else 0) + (0.08 if y == 4 else 0) - (0.14 if y == 29 else 0)
            rp = 'paint_green' if 5 <= y <= 11 else 'white'
            cv.put(x, y, shade(rp, L if rp == 'white' else L - 0.15))
    cv.rect(px_ + 7, 15, 15, 11, C('white', 0)); cv.rect(px_ + 7, 25, 15, 1, C('white', 2))           # blank number disc area
    # timetable case
    box3(cv, px_ + 3, 56, 18, 22, 2, 'p_galv')
    cv.rect(px_ + 5, 60, 14, 17, C('white', 1)); cv.rect(px_ + 5, 60, 14, 1, C('glass', 0))
    return done(cv, [px_ + 2, 113], (px_ + 6, 114, 9, 2.6))


def fingerpost(arms=('E', 'W')):
    """Traditional white fingerpost with blank arms and a ring finial. arms: any of N/E/S/W (E/W point sideways,
    N points away up the screen, S points towards the viewer). Returns (canvas, anchor, arm rects)."""
    W, H = 96, 104; cv = Canvas(W, H); cx = 48; rp = 'white'
    lathe(cv, cx, 88, [5, 5.5, 6, 6.5, 7, 7, 7, 7, 7.5, 7.5, 7.5, 7.5, 7], 'paint_black')
    vcyl(cv, cx - 3, 12, 6, 77, rp, bias=-0.05)
    for yy in (30, 58): lathe(cv, cx, yy, [3.8, 4.2, 4.2, 3.8], rp)
    # ring finial
    for a in range(0, 360, 6):
        t = math.radians(a); x = cx + math.cos(t) * 5; y = 5 + math.sin(t) * 5
        cv.put(int(x), int(y), shade(rp, 0.8 - math.cos(t) * 0.25 + math.sin(t) * 0.2))
    lathe(cv, cx, 10, [2, 3, 3], rp)
    rects = []
    ay = 16
    order = [a for a in ('N', 'W', 'E', 'S') if a in arms]
    for k, a in enumerate(order):
        y0 = ay + k * 11
        if a in ('E', 'W'):
            L_, h_ = 40, 9
            x0 = cx + 3 if a == 'E' else cx - 3 - L_
            for yy in range(h_):
                for xx in range(L_):
                    tipd = (L_ - 1 - xx) if a == 'E' else xx
                    if tipd < 5 and abs(yy - h_ // 2) > tipd: continue
                    L = 0.86 - (0.05 * (yy > 5)) + (0.1 if yy == 0 else 0) - (0.3 if yy == h_ - 1 else 0)
                    border = yy in (1, h_ - 2) or (tipd == 5 and abs(yy - h_ // 2) < 4)
                    cv.put(x0 + xx, y0 + yy, C('paint_black', 2) if border and 5 <= tipd else shade(rp, L))
            rects.append({'arm': a, 'x': x0 + (0 if a == 'E' else 6), 'y': y0 + 2, 'w': L_ - 6, 'h': h_ - 4})
        else:
            # N / S: foreshortened arm seen end-on, the board face visible as a narrow plate
            L_ = 12 if a == 'S' else 8
            x0 = cx - 11; hh = 9
            for yy in range(hh):
                for xx in range(22):
                    L = 0.8 if a == 'S' else 0.66
                    if yy == 0: L += 0.1
                    if yy == hh - 1: L -= 0.3
                    cv.put(x0 + xx, y0 + yy, shade(rp, L))
            for xx in range(22): cv.put(x0 + xx, y0 + (hh if a == 'S' else -1), C(rp, 3 if a == 'S' else 1))
            rects.append({'arm': a, 'x': x0 + 2, 'y': y0 + 2, 'w': 18, 'h': hh - 4})
    cv, anc = done(cv, [cx, 100], (cx + 4, 100, 9, 2.6))
    return cv, anc, rects


def notice_board(size='m'):
    """A village notice board on two posts with a little pitched roof and a blank cork panel behind glass.
    sizes s/m/l. Returns (canvas, anchor, text rect)."""
    Wb, Hb = {'s': (40, 28), 'm': (56, 36), 'l': (80, 44)}[size]
    W, H = Wb + 12, Hb + 60; cv = Canvas(W, H); wd = 'wood_dark'
    x0, y0 = 6, 12
    for px_ in (x0 + 3, x0 + Wb - 7):
        vcyl(cv, px_, y0, 5, H - y0 - 4, wd, tex=lambda x, y, u: -0.1 if hash01(x, y // 4, 3) < 0.2 else 0)
    # roof
    for y in range(0, 10):
        for x in range(x0 - 4 + (9 - y) // 3, x0 + Wb + 4 - (9 - y) // 3):
            cv.put(x, y + 3, shade('slate', 0.85 - y * 0.03 - (0.25 if (x + y // 3) % 7 == 0 else 0)))
    for x in range(x0 - 3, x0 + Wb + 3): cv.put(x, 13, C(wd, 3))
    box3(cv, x0, y0 + 2, Wb, Hb, 2, wd)
    cv.rect(x0 + 3, y0 + 6, Wb - 6, Hb - 6, C('p_hessian', 1))
    for yy in range(y0 + 6, y0 + Hb):
        for xx in range(x0 + 3, x0 + Wb - 3):
            if hash01(xx, yy, 9) < 0.2: cv.put(xx, yy, C('p_hessian', 2))
            if xx - x0 + (yy - y0) < 12 and (xx + yy) % 3 == 0: cv.put(xx, yy, C('glass', 0))       # glass glint
    rect = {'x': x0 + 5, 'y': y0 + 8, 'w': Wb - 10, 'h': Hb - 10}
    cv, anc = done(cv, [W // 2, H - 3], (W // 2 + 4, H - 3, Wb * 0.55, 3))
    return cv, anc, rect


def sign_board(size='m', colour='white', frame='paint_black'):
    """A blank sign on two galvanised posts (site boards, 'Limit of closed line' style). Sizes s/m/l/xl.
    Returns (canvas, anchor, text rect)."""
    Wb, Hb = {'s': (32, 20), 'm': (56, 30), 'l': (88, 40), 'xl': (132, 52)}[size]
    W, H = Wb + 8, Hb + 52; cv = Canvas(W, H); x0, y0 = 4, 3
    for px_ in (x0 + 5, x0 + Wb - 9):
        vcyl(cv, px_, y0 + 4, 4, H - y0 - 7, 'p_galv')
    for yy in range(Hb):
        for xx in range(Wb):
            fr = xx < 2 or yy < 2 or xx >= Wb - 2 or yy >= Hb - 2
            L = 0.86 - (0.04 * yy / Hb) + (0.08 if yy == 0 else 0)
            if xx == Wb - 1 or yy == Hb - 1: L -= 0.3
            cv.put(x0 + xx, y0 + yy, shade(frame if fr else colour, L - (0.15 if fr else 0)))
    rect = {'x': x0 + 4, 'y': y0 + 4, 'w': Wb - 8, 'h': Hb - 8}
    cv, anc = done(cv, [W // 2, H - 3], (W // 2 + 4, H - 3, Wb * 0.4, 2.6))
    return cv, anc, rect


def wall_plaque(w=40, h=14, colour='paint_cream', frame='wood_dark'):
    """A blank framed plaque for fixing to a wall (building names, house signs). Returns (canvas, text rect)."""
    cv = Canvas(w, h)
    for yy in range(h):
        for xx in range(w):
            fr = xx < 2 or yy < 2 or xx >= w - 2 or yy >= h - 2
            L = 0.84 + (0.1 if yy == 0 or xx == 0 else 0) - (0.3 if yy == h - 1 or xx == w - 1 else 0)
            cv.put(xx, yy, shade(frame if fr else colour, L))
    fin(cv)
    return cv, {'x': 3, 'y': 3, 'w': w - 6, 'h': h - 6}


def flowers_on(cv, x0, x1, y0, y1, seed, cols=('p_gerani', 'flower_yel', 'p_lav', 'flower_wht', 'p_marigold')):
    """Pile leafy mounds and bright flower heads into a region (planters, baskets, window boxes)."""
    R = Rng(seed)
    for k in range(int((x1 - x0) * (y1 - y0) / 10)):
        x, y = R.u(x0, x1), R.u(y0, y1)
        leafr = R.u(1.8, 3.2)
        cv.ellipse(x, y, leafr, leafr * 0.8, lambda xx, yy, nx, ny, nz: shade('p_hedge', light(nx, ny, nz) - 0.05))
    for k in range(int((x1 - x0) * (y1 - y0) / 14)):
        x, y = int(R.u(x0, x1)), int(R.u(y0 - 1, y1 - 2)); fc = R.pick(cols)
        cv.put(x, y, C(fc, 0)); cv.put(x + 1, y, C(fc, 1)); cv.put(x, y + 1, C(fc, 1)); cv.put(x + 1, y + 1, C(fc, 2))


def planter_barrel(seed=0):
    """Half-barrel planter overflowing with geraniums and trailing lobelia. 40 x 38."""
    cv = Canvas(40, 38); cx = 20
    prof = [15, 15.5, 16, 16, 16.2, 16.2, 16, 15.8, 15.5, 15, 14.5, 14, 13.5, 13]
    lathe(cv, cx, 22, prof, 'wood', tex=lambda x, y, u: -0.14 if (x - 4) % 5 == 0 else 0)
    for y in (24, 32):
        for x in range(cx - 16, cx + 17): cv.put(x, y, shade('p_iron', 0.6 - (x - cx) / 30))
    for x in range(cx - 14, cx + 15): cv.put(x, 22, C('mud', 3))
    flowers_on(cv, 6, 34, 8, 23, seed)
    for k in range(5): cv.put(6 + k * 7, 26 + k % 2, C('p_bunt_b', 1)); cv.put(6 + k * 7, 27 + k % 2, C('p_lav', 2))
    return done(cv, [cx, 35], (cx + 4, 35, 16, 3))


def planter_trough(seed=1):
    """Gritstone trough planter (village green / station forecourt). 72 x 36."""
    cv = Canvas(72, 36)
    def tt(x, y, top):
        blk = hash01(x // 11, 0, 5) if not top else hash01(x // 9, y // 3, 6)
        v = (blk - 0.5) * 0.22 + (hash01(x, y, 7) - 0.5) * 0.12
        if not top and x % 11 == 0: v -= 0.25
        return v
    box3(cv, 2, 16, 68, 14, 6, 'p_gritdk', tex=tt)
    for x in range(4, 68, 5):
        if hash01(x, 2, 8) < 0.4: cv.put(x, 29, C('p_moss', 3)); cv.put(x + 1, 28, C('p_moss', 2))
    cv.rect(5, 18, 62, 3, C('mud', 3))
    flowers_on(cv, 5, 67, 6, 19, seed)
    return done(cv, [36, 33], (40, 33, 34, 3))


def window_box(w=44, seed=2):
    """Timber window box with flowers, to hang under a window. w x 24; anchor = top-centre of the box front."""
    cv = Canvas(w, 24)
    box3(cv, 1, 12, w - 2, 8, 2, 'paint_green')
    flowers_on(cv, 3, w - 3, 3, 13, seed)
    fin(cv)
    return cv, [w // 2, 12]


def hanging_basket(seed=3):
    """Wall bracket, chains and a round moss basket of trailing flowers. 40 x 52; anchor = bracket fixing."""
    cv = Canvas(40, 52)
    for x in range(2, 24): cv.put(x, 3, C('paint_black', 1)); cv.put(x, 4, C('paint_black', 3))
    for k in range(10): cv.put(2 + k, 5 + k, C('paint_black', 2))
    cv.put(22, 5, C('paint_black', 1)); sphere(cv, 2, 4, 1.5, 'paint_black')
    for (x0, x1) in ((22, 12), (22, 22), (22, 32)):
        for k in range(18):
            t = k / 17; cv.put(int(22 + (x1 - 22) * t), 6 + k, C('p_galv', 2 if k % 2 else 3))
    cv.ellipse(22, 32, 13, 8, lambda x, y, nx, ny, nz: shade('p_moss', light(nx, ny, nz) - 0.1))
    flowers_on(cv, 9, 35, 20, 32, seed)
    for k in range(9):   # trailing lobelia and petunias
        x = 11 + k * 3; L = 4 + (k * 7) % 9
        for j in range(L): cv.put(x + (j // 4) % 2, 34 + j, C('p_hedge', 2 + j % 2) if j % 3 else C('p_bunt_b' if k % 2 else 'p_fox', 1))
    fin(cv)
    return cv, [2, 4]


def bollard(kind='iron'):
    """Bollards: 'iron' (black cast iron, gold band, cannon-style), 'timber' (square oak post), 'concrete'
    (white-topped). About 16 x 36."""
    cv = Canvas(18, 38); cx = 9
    if kind == 'iron':
        lathe(cv, cx, 1, [2, 3.5, 4.5, 5, 5, 4.2, 4.6] + [4.4] * 20 + [5, 5.5, 6, 6.5, 6.5], 'paint_black')
        for x in range(cx - 5, cx + 6): cv.put(x, 8, shade('gold', 0.7 - (x - cx) / 8))
    elif kind == 'timber':
        box3(cv, 4, 4, 10, 29, 3, 'p_timber', tex=wood_tex(7))
        cv.rect(4, 11, 10, 2, C('p_galv', 1))
    else:
        lathe(cv, cx, 2, [4, 5.5, 6, 6, 6] + [6] * 26, 'concrete')
        for y in range(4, 9):
            for x in range(cx - 6, cx + 6): cv.put(x, y, shade('white', 0.8 - (x - cx) / 12))
    return done(cv, [cx, 34], (cx + 3, 34, 7, 2.2))


# ================================================================== town & yard props
def ashlar(seed, bw=12, bh=6, joints=True, amt=0.22):
    """Dressed-stone texture for box3/lathe tex: blocks with per-block tone, weathering speckle and joints."""
    def t(x, y, top):
        row = y // bh; xo = (x + (row % 2) * (bw // 2)) // bw
        v = (hash01(xo, row, seed) - 0.5) * amt + (hash01(x, y, seed + 1) - 0.5) * 0.14
        if vnoise(x, y, 4, seed + 2) > 0.7: v -= 0.12             # weathering streaks
        if joints and not top and (y % bh == 0 or (x + (row % 2) * (bw // 2)) % bw == 0): v -= 0.3
        return v
    return t


def bicycle():
    """A black upright bicycle side-on, wicker basket on the front. 56 x 38; anchor between the wheels."""
    cv = Canvas(56, 38); ir = 'paint_black'
    for (wx) in (12, 44):
        for a in range(0, 360, 3):
            t = math.radians(a)
            for r, col in ((10, C(ir, 1 if 200 < a < 300 else 3)), (9, C('charcoal', 3))):
                cv.put(int(wx + math.cos(t) * r), int(26 + math.sin(t) * r), col)
        for a in range(0, 180, 30):
            t = math.radians(a)
            line(cv, wx - math.cos(t) * 8, 26 - math.sin(t) * 8, wx + math.cos(t) * 8, 26 + math.sin(t) * 8, C('p_galv', 2))
        sphere(cv, wx, 26, 1.6, 'p_galv')
    for (a, b) in (((12, 26), (26, 26)), ((26, 26), (22, 12)), ((22, 12), (40, 13)), ((40, 13), (26, 26)),
                   ((40, 13), (44, 26)), ((12, 26), (22, 12)), ((40, 13), (38, 7))):
        line(cv, *a, *b, C('paint_green', 2)); line(cv, a[0], a[1] + 1, b[0], b[1] + 1, C('paint_green', 3))
    cv.rect(18, 9, 8, 3, C('leather', 2)); cv.rect(18, 9, 8, 1, C('leather', 0))          # saddle
    line(cv, 34, 6, 42, 6, C(ir, 1))
    box3(cv, 42, 4, 12, 9, 2, 'p_hessian', tex=lambda x, y, t: -0.12 if (x + y) % 3 == 0 else 0)  # basket
    sphere(cv, 26, 27, 2.2, ir)
    return done(cv, [28, 36], (30, 36, 22, 2.4))


def milk_churn(dented=False):
    """Galvanised railway milk churn with a mushroom lid and handles. 22 x 36."""
    cv = Canvas(22, 36); cx = 11
    prof = [3, 5, 6, 6, 5, 3.5, 3.5, 4.5, 6, 7.5, 8.5, 9] + [9.5] * 18 + [9.8, 9.8]
    lathe(cv, cx, 1, prof, 'p_galv', tex=(lambda x, y, u: -0.14 if (dented and 20 < y < 25 and u > 0.2) else 0))
    for y in (14, 28):
        for x in range(cx - 10, cx + 10): cv.put(x, y, C('p_galv', 3))
    cv.put(cx - 9, 11, C('p_galv', 1)); cv.put(cx - 10, 12, C('p_galv', 2)); cv.put(cx + 9, 11, C('p_galv', 3)); cv.put(cx + 10, 12, C('p_galv', 3))
    for y in range(22, 30):
        if hash01(y, 3, 8) < 0.5: cv.put(cx + 6, y, C('rust', 2))
    return done(cv, [cx, 33], (cx + 3, 33, 9, 2.5))


def crate(kind='wood'):
    """A wooden slatted crate ('wood') or one full of apples ('apples'). 30 x 28."""
    cv = Canvas(30, 28)
    box3(cv, 1, 3, 28, 18, 6, 'p_timber', tex=lambda x, y, top: (-0.22 if (not top and (y - 9) % 6 == 5) else 0) + (hash01(x // 4, y, 11) - 0.5) * 0.1)
    if kind == 'apples':
        for k in range(14):
            x, y = 4 + (k % 7) * 3.4, 4 + (k // 7) * 2.6
            sphere(cv, x, y, 1.8, 'p_gerani' if k % 3 else 'p_weed')
    else:
        cv.rect(3, 4, 24, 4, C('p_timber', 4))
    for x in (1, 28): 
        for y in range(9, 27): cv.put(x, y, C('p_timber', 2 if x == 1 else 4))
    return done(cv, [15, 26], (18, 26, 14, 2.4))


def pallet():
    """A timber pallet lying flat, seen from the south: top boards and the blocks between. 50 x 20."""
    cv = Canvas(50, 20)
    for k in range(5): box3(cv, 1, 2 + k * 2, 48, 0, 2, 'p_timber', bias=-0.05 * (k % 2), tex=lambda x, y, t: (hash01(x // 6, y, 4) - 0.5) * 0.16)
    cv.rect(1, 12, 48, 6, C('p_timber', 4))
    for bx in (2, 22, 42): box3(cv, bx, 12, 6, 5, 0, 'p_timber')
    cv.rect(1, 12, 48, 1, C('p_timber', 1))
    return done(cv, [25, 18], (28, 18, 25, 2))


def sandbags(n=5):
    """A little stack of hessian sandbags (flood defence / trackside). ~56 x 30."""
    cv = Canvas(56, 32)
    rows = [(3, 22, n // 2 + 1), (8, 12, n // 2)]
    for (x0, y0, k) in rows[::-1][::-1]:
        pass
    for (x0, y0, k) in ((2, 20, 3), (10, 11, 2)):
        for i in range(k):
            cx, cy = x0 + 9 + i * 17, y0 + 4
            cv.ellipse(cx, cy, 9.5, 5.5, lambda x, y, nx, ny, nz: shade('p_hessian', light(nx, ny, nz) + (0.12 if (x + y) % 4 == 0 else 0) * nz * 0.3))
            cv.put(cx - 8, cy - 1, C('p_hessian', 3)); cv.put(cx + 8, cy - 1, C('p_hessian', 3))
            for yy in range(-4, 5, 2): cv.put(cx - 6, cy + yy, C('p_hessian', 3))
    return done(cv, [28, 29], (30, 29, 26, 2.6))


def traffic_cone():
    """A traffic cone: orange with a reflective white band and a black base. 20 x 30."""
    cv = Canvas(20, 30); cx = 10
    prof = [1.2 + i * 0.3 for i in range(22)]
    lathe(cv, cx, 2, prof, 'hivis', lum_fn=lambda x, y, u, L: L)
    for y in range(9, 14):
        hw = prof[y - 2]
        for x in range(int(cx - hw), int(math.ceil(cx + hw))):
            u = (x + 0.5 - cx) / hw
            if abs(u) <= 1: cv.put(x, y, shade('reflect', light(u, -0.2, math.sqrt(max(0, 1 - u * u)))))
    box3(cv, 1, 24, 18, 3, 1, 'paint_black')
    return done(cv, [cx, 27], (cx + 3, 27, 9, 2))


def wheelbarrow():
    """A green metal garden wheelbarrow with a pneumatic wheel, wooden handles and a tip of soil. 54 x 34."""
    cv = Canvas(54, 34)
    for i in range(3):
        line(cv, 2, 13 + i, 26, 13 + i, C('p_timber', 1 + i))
    for x0 in (14, 34):
        line(cv, x0, 20, x0 - 2, 30, C('p_iron', 2)); line(cv, x0 + 1, 20, x0 - 1, 30, C('p_iron', 3))
    for y in range(10, 22):  # tray, tapering to the front
        t = (y - 10) / 12
        for x in range(int(10 + t * 4), int(46 - t * 6)):
            L = 0.66 - t * 0.3 + (0.12 if y == 10 else 0) + (0.08 if x < 14 else 0)
            cv.put(x, y, shade('paint_green', L))
    for x in range(12, 44):
        cv.put(x, 9, C('mud', 1 if x % 5 else 2))
        if 16 < x < 40: cv.put(x, 8, C('mud', 2))
    for a in range(0, 360, 4):
        t = math.radians(a)
        for r in (6, 5, 4):
            cv.put(int(46 + math.cos(t) * r), int(26 + math.sin(t) * r), C('charcoal', 3 if r == 6 else (2 if r == 5 else 1)))
    sphere(cv, 46, 26, 1.5, 'p_galv')
    return done(cv, [30, 31], (32, 31, 20, 2.5))


def bean_canes(seed=5):
    """A wigwam of bamboo canes smothered in runner beans, scarlet flowers and a few pods. 44 x 78."""
    cv = Canvas(44, 78); R = Rng(seed)
    for k in range(6):
        bx = 6 + k * 6.4
        line(cv, bx, 74, 22, 3, C('p_reed', 1)); line(cv, bx + 1, 74, 23, 3, C('p_reed', 3))
    from flora import leaf
    for k in range(70):
        t = R.u(0.1, 0.95); side = R.u(0, 1)
        x = 22 + (side * 32 - 16) * t; y = 3 + 71 * t
        leaf(cv, x + R.u(-2, 2), y, R.u(2.2, 3.4), R.u(1.6, 2.4), R.u(-1, 1), 'p_hedge', bias=0.08 - side * 0.12)
    for k in range(16):
        x, y = int(22 + R.u(-12, 12) * 0.8), int(R.u(16, 66))
        cv.put(x, y, C('p_gerani', 1)); cv.put(x + 1, y, C('p_gerani', 2)); cv.put(x, y + 1, C('p_gerani', 2))
    for k in range(6):
        x, y = int(22 + R.u(-12, 12)), int(R.u(30, 64))
        for j in range(6): cv.put(x, y + j, C('p_weed', 2 if j < 5 else 3))
    return done(cv, [22, 74], (25, 74, 16, 3))


def cold_frame():
    """A timber cold frame with a sloping glass light, seedlings showing through. 58 x 36."""
    cv = Canvas(58, 36)
    box3(cv, 2, 12, 54, 16, 0, 'p_timber', tex=wood_tex(21))
    for y in range(2, 14):
        t = (y - 2) / 12
        for x in range(2, 56):
            fr = x in (2, 3, 28, 29, 54, 55) or y in (2, 13)
            if fr: cv.put(x, y, shade('p_timber', 0.8 - t * 0.2)); continue
            i = 1 + int(t * 2)
            if (x - y * 2) % 19 < 3: i = 0
            cv.put(x, y, C('glass', i))
            if hash01(x, y, 22) < 0.12 and y > 5: cv.put(x, y, C('p_weed', 1 + int(t * 2)))
    return done(cv, [29, 28], (32, 28, 28, 3))


def water_butt():
    """A green plastic water butt with a lid, a brass tap and a drip stain. 30 x 44."""
    cv = Canvas(30, 44); cx = 15
    lathe(cv, cx, 2, [9, 11, 11.5, 11.5, 11, 12] + [12.5] * 28 + [12] * 3, 'p_bingreen')
    for y in (14, 26): 
        for x in range(cx - 12, cx + 13): cv.put(x, y, C('p_bingreen', 3))
    cv.rect(cx - 8, 34, 5, 3, C('gold', 1)); cv.put(cx - 8, 37, C('gold', 2)); cv.put(cx - 7, 38, C('water', 1))
    box3(cv, cx - 11, 38, 22, 3, 2, 'p_gritdk')
    return done(cv, [cx, 41], (cx + 4, 41, 13, 3))


def garden_shed():
    """A small timber garden / allotment shed: shiplap walls, felt roof seen from above, door, window.
    96 x 108 (2 tiles wide); anchor = centre of the south wall base."""
    W, H = 96, 108; cv = Canvas(W, H)
    # roof (felt) seen from above, with a ridge and battens, eaves overhang
    for y in range(2, 48):
        for x in range(2, W - 2):
            north = y < 25
            L = (0.78 if north else 0.52) + (hash01(x, y, 30) - 0.5) * 0.12
            if x % 16 in (0, 1): L += 0.14 if x % 16 == 0 else -0.2          # battens over the felt joints
            if y in (24, 25): L = 0.92 if y == 24 else 0.7
            if y == 47: L -= 0.2
            col = shade('charcoal', L)
            if pnoise(x, y, 6, 96, 48, 33) > 0.8 and not north: col = C('p_moss', 3)
            cv.put(x, y, col)
    for x in range(2, W - 2): cv.put(x, 48, C('wood_dark', 2)); cv.put(x, 49, C('wood_dark', 3))
    # shiplap front wall
    for y in range(50, 102):
        for x in range(6, W - 6):
            k = (y - 50) % 6
            L = 0.66 - (0.25 if k == 5 else 0) + (0.1 if k == 0 else 0) - (0.2 if x >= W - 9 else 0)
            L -= 0.18 * max(0, (56 - y) / 6)       # eave shadow
            L += (hash01(x // 7, y // 6, 31) - 0.5) * 0.08
            cv.put(x, y, shade('p_bingreen', L + 0.05))
    # door and window
    box3(cv, 16, 58, 26, 44, 0, 'p_timber', tex=lambda x, y, t: (-0.22 if (x - 16) % 6 == 5 else 0) + (hash01(x // 6, y // 3, 34) - 0.5) * 0.1)
    for yy in (62, 96): box3(cv, 17, yy, 24, 3, 0, 'p_timber', bias=0.08)       # ledges
    for i in range(34):                                                           # the brace
        x = 18 + i * 20 / 33; y = 95 - i
        cv.put(int(x), y, C('p_timber', 1)); cv.put(int(x) + 1, y, C('p_timber', 1)); cv.put(int(x) + 2, y, C('p_timber', 3))
    cv.rect(36, 80, 3, 2, C('p_iron', 1))
    cv.rect(56, 62, 26, 18, C('wood_dark', 2))
    for yy in range(64, 78):
        for xx in range(58, 80):
            i = 2 + (xx > 69) + (yy > 71)
            if (xx - yy) % 13 < 2: i = 0
            cv.put(xx, yy, C('glass', min(4, i)))
    cv.rect(69, 64, 1, 14, C('wood_dark', 2)); cv.rect(58, 71, 22, 1, C('wood_dark', 2))
    cv.rect(56, 80, 26, 2, C('wood_dark', 0))
    for x in range(58, 82, 3): cv.put(x, 79, C('p_gerani', 1))
    for x in range(6, W - 6): cv.put(x, 102, C('p_gritdk', 3)); cv.put(x, 103, C('p_gritdk', 4))
    return done(cv, [W // 2, 103], (W // 2 + 8, 104, 44, 3.5))


def gravestone(kind='round', seed=0):
    """Weathered churchyard headstones: 'round' (round-topped), 'cross' (celtic-ish cross), 'slab' (leaning slate),
    'chest' (a table tomb). Blank faces, lichen and moss. ~24-44 wide."""
    rp = 'p_grit' if kind != 'slab' else 'slate'
    tex = lambda x, y, u: (hash01(x, y, 40 + seed) - 0.5) * 0.12
    if kind == 'chest':
        cv = Canvas(46, 34)
        box3(cv, 2, 8, 42, 18, 0, rp, tex=ashlar(41, 14, 18), bias=-0.06)
        box3(cv, 0, 2, 46, 2, 8, rp, tex=ashlar(43, 46, 40, False))            # overhanging lid slab
        for (px_, pw) in ((6, 14), (26, 14)):                                   # sunk panels
            cv.rect(px_, 15, pw, 8, C(rp, 3)); cv.rect(px_ + 1, 16, pw - 2, 6, C(rp, 2)); cv.rect(px_ + 1, 21, pw - 2, 1, C(rp, 1))
        for y in range(2, 12):
            for x in range(0, 46):
                if cv.px[x, y][3] and vnoise(x, y, 3, 44) > 0.74: cv.put(x, y, C('p_lichen', 1))
        for x in range(4, 44, 3):
            if hash01(x, 0, 42) < 0.5: cv.put(x, 25, C('p_moss', 2)); cv.put(x + 1, 24, C('p_moss', 3))
        return done(cv, [23, 30], (26, 30, 22, 3))
    cv = Canvas(28, 44); cx = 14
    if kind == 'cross':
        vcyl(cv, cx - 3, 4, 7, 34, rp, tex=tex)
        box3(cv, cx - 11, 11, 22, 6, 0, rp)
        for a in range(0, 360, 5):
            t = math.radians(a); cv.put(int(cx + math.cos(t) * 7), int(14 + math.sin(t) * 7), C(rp, 2 if a < 180 else 1))
        box3(cv, cx - 7, 36, 14, 4, 2, rp)
    else:
        lean = 0 if kind == 'round' else 2
        for y in range(4, 40):
            sh_ = int(lean * (40 - y) / 36)
            hw = 9 if y > 10 else int(math.sqrt(max(0, 81 - (10 - y) ** 2 * 1.3)))
            for x in range(cx - hw, cx + hw):
                u = (x + 0.5 - cx) / 9
                L = 0.66 - u * 0.2 + (0.2 if y < 10 and (y - 4) < 2 else 0) + tex(x, y, u)
                if x >= cx + hw - 2: L -= 0.18
                cv.put(x + sh_, y, shade(rp, L))
        for y in range(4, 40):   # lichen crusts and moss from the ground up
            for x in range(cx - 9, cx + 9):
                if not cv.px[x, y][3]: continue
                if vnoise(x, y, 3, 50 + seed) > 0.72: cv.put(x, y, C('p_lichen', 1 if y < 20 else 2))
                if y > 34 and hash01(x, y, 51) < 0.4: cv.put(x, y, C('p_moss', 2 + (y > 37)))
        cv.rect(cx - 5, 16, 10, 1, C(rp, 3)); cv.rect(cx - 5, 17, 10, 1, C(rp, 1))
    return done(cv, [cx, 40], (cx + 4, 40, 10, 2.6))


def war_memorial():
    """Village war memorial: a stone cross on a tapering shaft and three steps, a blank panel for names, and a
    wreath of red poppies at the foot. 64 x 132."""
    W, H = 64, 132; cv = Canvas(W, H); cx = 32; rp = 'p_grit'
    tex = lambda x, y, u: (hash01(x, y, 60) - 0.5) * 0.1
    for (i, (w, d, h)) in enumerate(((60, 6, 6), (48, 5, 6), (36, 4, 6))):
        y = 128 - (i + 1) * 10
        box3(cv, cx - w // 2, y, w, h, d, rp, tex=ashlar(61 + i, 10, 6), bias=-0.04)
    box3(cv, cx - 12, 70, 24, 28, 3, rp, tex=ashlar(64, 12, 7), bias=-0.02)
    cv.rect(cx - 9, 76, 18, 18, C(rp, 1)); cv.rect(cx - 9, 76, 18, 1, C(rp, 3)); cv.rect(cx - 9, 93, 18, 1, C(rp, 0))   # blank panel
    shaft = [3.2 + (i / 50) * 3 for i in range(52)]
    lathe(cv, cx, 18, shaft, rp, tex=ashlar(65, 40, 13, amt=0.16))
    box3(cv, cx - 14, 20, 28, 6, 2, rp, tex=ashlar(66, 40, 40, False))                 # cross arms
    box3(cv, cx - 4, 4, 8, 14, 2, rp, tex=ashlar(67, 40, 40, False))                   # head
    for y in range(4, 70):
        for x in range(cx - 14, cx + 14):
            if cv.px[x, y][3] and vnoise(x, y, 3, 62) > 0.78: cv.put(x, y, C('p_lichen', 2))
    # poppy wreath leaning on the lower step
    for a in range(0, 360, 12):
        t = math.radians(a); x, y = cx + math.cos(t) * 7, 108 + math.sin(t) * 5
        cv.ellipse(x, y, 1.8, 1.6, lambda xx, yy, nx, ny, nz: shade('p_gerani', light(nx, ny, nz) + 0.1))
        cv.put(int(x), int(y), C('paint_black', 3))
    for a in range(0, 360, 24):
        t = math.radians(a + 6); cv.put(int(cx + math.cos(t) * 8.5), int(108 + math.sin(t) * 6.2), C('p_hedge', 3))
    return done(cv, [cx, 127], (cx + 6, 127, 30, 4))


CLOTHES = [('shirt', 'white'), ('trousers', 'denim'), ('towel', 'p_bunt_r'), ('shirt', 'p_bunt_b'), ('sock', 'mustard'),
           ('towel', 'teal'), ('sock', 'plum'), ('shirt', 'cream'), ('dress', 'p_bunt_y')]
OVERALLS = [('overalls', 'navy'), ('overalls', 'navy'), ('shirt', 'white'), ('towel', 'cream'), ('sock', 'charcoal')]


def _garment(cv, x, y, kind, rp, oily=False):
    """One pegged garment hanging from the line at (x, y); returns its width."""
    shapes = {'shirt': (16, 16), 'trousers': (12, 22), 'towel': (14, 14), 'sock': (5, 9), 'dress': (14, 20), 'overalls': (16, 26)}
    w, h = shapes[kind]
    for yy in range(h):
        for xx in range(w):
            ok = True
            if kind == 'shirt' and yy > 5 and (xx < 3 or xx >= w - 3): ok = False
            if kind in ('trousers', 'overalls') and yy > (8 if kind == 'overalls' else 7) and w // 2 - 1 <= xx <= w // 2: ok = False
            if kind == 'dress' and yy > 6: ok = abs(xx - w / 2) < 3 + (yy - 6) * 0.35
            if kind == 'sock' and yy > 6 and xx < 2: ok = False
            if not ok: continue
            fold = math.sin((xx + yy * 0.2) * 1.1) * 0.12
            L = 0.7 + fold - yy / h * 0.18 - (0.18 if xx == w - 1 else 0) + (0.1 if yy == 0 else 0)
            col = shade(rp, L)
            if oily and hash01(xx, yy, 70 + x) < 0.1 and yy > 4: col = C('charcoal', 3)
            cv.put(x + xx, y + yy, col)
    if kind == 'overalls':
        cv.rect(x + 3, y, 2, 3, C(rp, 3)); cv.rect(x + w - 5, y, 2, 3, C(rp, 3)); cv.put(x + 4, y + 4, C('gold', 1)); cv.put(x + w - 4, y + 4, C('gold', 1))
    for px_ in (x + 1, x + w - 2):  # pegs
        cv.put(px_, y - 1, C('wood', 1)); cv.put(px_, y, C('wood', 2)); cv.put(px_, y + 1, C('wood', 3))
    return w


def washing_line(length=144, clothes=None, oily=False):
    """Two T-posts, a sagging line and pegged washing. length px wide (default 3 tiles); anchor = left post base."""
    W, H = length, 64; cv = Canvas(W, H)
    for px_ in (2, W - 6):
        vcyl(cv, px_, 6, 4, 54, 'p_timber'); box3(cv, px_ - 4, 4, 12, 2, 1, 'p_timber')
    sag = lambda x: 7 + 6 * math.sin(math.pi * (x - 4) / (W - 10))
    for x in range(4, W - 4): cv.put(x, int(sag(x)), C('white', 3))
    x = 10
    for (kind, rp) in (clothes or (OVERALLS if oily else CLOTHES)):
        if x > W - 22: break
        w = _garment(cv, x, int(sag(x + 6)) + 1, kind, rp, oily and kind == 'overalls')
        x += w + 3
    fin(cv)
    sh = Canvas(W, H)
    for xx in range(4, W):
        sh.put(xx, 61, SHADOW[:3] + (50,)); sh.put(xx, 62, SHADOW[:3] + (40,))
    over(sh, cv)
    return cv, [4, 60]


def bunting(length=96, sag=10, seed=0):
    """A string of triangular cotton flags, sagging between two fixings (left and right top corners).
    length x (sag + 14). Hang between buildings / lamp posts; anchors are the two ends of the string."""
    W, H = length, sag + 16; cv = Canvas(W, H)
    cols = ['p_bunt_r', 'p_bunt_w', 'p_bunt_b', 'p_bunt_y', 'p_bunt_g']
    y = lambda x: 1 + sag * math.sin(math.pi * x / (W - 1))
    for x in range(W): cv.put(x, int(y(x)), C('white', 3))
    k = seed
    for fx in range(3, W - 8, 11):
        c = cols[k % len(cols)]; k += 1
        y0 = int(y(fx + 4)) + 1
        for yy in range(10):
            hw = 4 - yy * 0.42
            for xx in range(int(fx + 4 - hw), int(math.ceil(fx + 4 + hw))):
                L = 0.72 - (xx - fx - 4) * 0.06 - yy * 0.02 + (0.1 if yy == 0 else 0)
                cv.put(xx, y0 + yy, shade(c, L))
    return cv, [[0, 1], [W - 1, 1]]
