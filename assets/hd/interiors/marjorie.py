"""MARJORIE: 1961 single-car diesel railcar, lined Brunswick green, cream band, yellow warning ends.
3/4 top-down side view (roof from above, south bodyside, underframe and bogies). Spans shed tiles x4-27 (24 tiles)."""
from ilib import *

W, H = 772, 156
MX = 2                     # outline margin
BX0, BX1 = 12, 760         # bodyside (sprite x)
ROOF_T, CANT, WAIST, BOT = 12, 38, 82, 114
SOLE = BOT + 6             # bottom of solebar
CONTACT = 152              # wheel/rail contact row (the anchor row)
WEST_BOGIE, EAST_BOGIE = 178, 594
WHEEL_R = 13
SEED = 61


def layout():
    """Openings along the bodyside: (kind, x0, x1)."""
    L = []
    L.append(('cabwin', 22, 40)); L.append(('door', 46, 66))
    L.append(('door', 76, 96))
    for x in range(102, 282, 36): L.append(('win', x, x + 30))
    L.append(('door', 288, 308))
    for x in range(316, 530, 36): L.append(('win', x, x + 30))
    L.append(('door', 532, 552))
    L.append(('luggage', 560, 600))
    L.append(('guardwin', 610, 632))
    L.append(('door', 640, 660))
    L.append(('win', 666, 690))
    L.append(('door', 700, 720)); L.append(('cabwin', 730, 748))
    return L


def roof(cv):
    for x in range(BX0 - 6, BX1 + 6):
        # dome at the ends: the roof top edge curves down near the ends
        de = min(x - (BX0 - 6), (BX1 + 6) - x)
        top = ROOF_T + (0 if de > 18 else int(round(18 - math.sqrt(max(0, 18 * 18 - (18 - de) ** 2)))))
        for y in range(top, CANT + 1):
            t = (y - top) / max(1, CANT - top)
            ny = -0.55 + 1.5 * t
            ny = max(-0.95, min(0.97, ny))
            lum = light(0, ny, math.sqrt(max(0.02, 1 - ny * ny)))
            n = fbm(x, y * 3, 22, SEED, 2)
            lum += (n - 0.5) * 0.18
            # exhaust soot around the stacks (engine at ~x 450) and generally dustier in the middle
            soot = max(0, 1 - abs(x - 452) / 80.0) * (1 - t * 0.3) + (fbm(x, y, 9, SEED + 7, 2) - 0.5) * 0.6
            if soot > 0.42: lum -= 0.16
            if soot > 0.7: lum -= 0.12
            cv.put(x, y, shade('roof_grey', lum))
    # rain strip (gutter) above the cant rail, sweeping down at the ends
    for x in range(BX0 + 6, BX1 - 6):
        cv.put(x, CANT - 3, C('roof_grey', 4)); cv.put(x, CANT - 4, C('roof_grey', 1))
    # roof panel seams
    for x in range(BX0 + 30, BX1 - 20, 46):
        for y in range(ROOF_T + 2, CANT - 4):
            if hash01(x, y, 9) < 0.85: cv.put(x, y, C('roof_grey', 3))
            cv.put(x + 1, y, C('roof_grey', 1) if y < ROOF_T + 12 else cv.get(x + 1, y))
    # torpedo ventilators down the roof
    for x in list(range(110, 280, 36)) + list(range(324, 530, 36)):
        vx = x + 11
        cv.put(vx + 1, 25, SHADOW[:3] + (120,)); hl(cv, vx, 25, 9, SHADOW[:3] + (110,))
        cv.ellipse(vx + 4, 21, 5, 3, lambda px, py, nx, ny, nz: shade('metal', light(nx, ny, nz) - 0.1))
        cv.put(vx + 2, 20, C('metal', 0))
    # exhaust stacks (two short pipes), sooty
    for sx in (440, 462):
        for y in range(4, 22):
            for k in range(5):
                lum = light((k - 2) / 2.5, 0.2, 0.8)
                cv.put(sx + k, y, shade('under', lum))
        cv.ellipse(sx + 2.5, 4, 3, 1.5, C('under', 5)); cv.put(sx + 1, 4, C('under', 2))
        hl(cv, sx - 1, 22, 7, C('under', 4))
    # horns / marker lamp housings on the domes
    for hx in (BX0 + 10, BX1 - 16):
        cv.rect(hx, 18, 6, 3, C('under', 2)); hl(cv, hx, 18, 6, C('under', 0))
    # destination blind boxes on the dome fronts (blank; the game letters nothing here)
    for bx in (BX0 - 3, BX1 - 5):
        cv.rect(bx, 26, 8, 6, OUTLINE); cv.rect(bx + 1, 27, 6, 4, C('paint_cream', 1)); hl(cv, bx + 1, 27, 6, C('paint_cream', 0))
    # Kevin's handiwork: droppings on the roof above the guard's window
    for k in range(14):
        x = 600 + int(hash01(k, 1, 71) * 50); y = 20 + int(hash01(k, 2, 71) * 14)
        cv.put(x, y, C('white', 1 if k % 3 else 0))
    # dust pale patches
    speck(cv, BX0, ROOF_T, BX1 - BX0, CANT - ROOF_T - 5, [C('roof_grey', 1)], 0.004, 44,
          test=lambda x, y: cv.get(x, y)[3] > 0)


def body_colour(x, y):
    t = (y - CANT) / (BOT - CANT)
    if y <= CANT + 2: i = 1
    elif y <= CANT + 5: i = 2
    elif t < 0.82: i = 2
    elif t < 0.95: i = 3
    else: i = 4
    # grime: dirt collects low down and in noisy patches, faded paint in others
    n = fbm(x * 0.5, y * 2.2, 18, SEED + 1, 3)
    dirt = n * 0.55 + t * 0.5
    if dirt > 0.8: i += 1
    elif n < 0.2 and t < 0.5: i -= 1
    return C('brunswick', max(0, min(5, i)))


def glass(cv, x0, y0, w, h, seats=True, seed=0):
    """Window glass: dim interior, far-side windows glowing, seat backs, a slanted reflection."""
    for yy in range(h):
        for xx in range(w):
            x, y = x0 + xx, y0 + yy
            t = yy / max(1, h - 1)
            if t < 0.2: c = C('glass', 4)
            elif t < 0.62: c = C('glass', 3)   # light through the far-side windows
            else: c = C('under', 4)
            cv.put(x, y, c)
    # far windows' pillars (dark verticals seen through the car)
    for xx in range(3 + seed % 5, w, 13): vl(cv, x0 + xx, y0 + int(h * 0.2), int(h * 0.42), C('glass', 4))
    for xx in range(w):   # the far windows' top edge catches the light
        if hash01(xx // 13, seed, 2) < 0.8: cv.put(x0 + xx, y0 + int(h * 0.2) + 1, C('glass', 2))
    # luggage rack
    hl(cv, x0, y0 + int(h * 0.2), w, C('metal', 3))
    if seats:
        sy = y0 + int(h * 0.62)
        for k in range(0, w, 8):
            rampn = 'moquette_r'
            for yy in range(sy, y0 + h):
                for xx in range(k + 1, min(w - 1, k + 7)):
                    edge = xx == k + 1 or xx == k + 6
                    top = yy == sy
                    if top and edge: continue
                    i = 1 if top else (3 if edge else 2)
                    if (xx * 3 + yy * 2) % 7 == 0 and not top: i = 0   # the moquette's pattern
                    if yy - sy == 1 and not edge: i = 0 if xx < k + 4 else 1
                    cv.put(x0 + xx, yy, C(rampn, i))
    # reflection: a slanted pale streak
    off = int(hash01(seed, 3, 5) * (w - 6)) - 4
    wide = 2 if hash01(seed, 4, 5) < 0.6 else 1
    for yy in range(int(h * 0.1), int(h * 0.75)):
        for k in range(wide):
            xx = off + k + (h - yy) // 2
            if 0 <= xx < w: cv.put(x0 + xx, y0 + yy, C('glass', 1) if k else C('glass', 2))
    cv.put(x0, y0, C('glass', 0)); cv.put(x0 + 1, y0, C('glass', 1))


def win_frame(cv, x0, x1, y0, y1, vent=True, seed=0, seats=True):
    rrect(cv, x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, C('under', 4), r=1)
    glass(cv, x0, y0, x1 - x0, y1 - y0, seats, seed)
    # aluminium frame highlight on top/left, sill shadow
    hl(cv, x0 + 1, y0 - 2, x1 - x0 - 2, C('brunswick', 1))
    hl(cv, x0, y1 + 1, x1 - x0, C('brunswick', 4))
    hl(cv, x0 + 1, y1 + 2, x1 - x0 - 2, C('brunswick', 1))
    if vent:
        vy = y0 + 6
        hl(cv, x0, vy, x1 - x0, C('metal', 2)); hl(cv, x0, vy + 1, x1 - x0, C('metal', 4))
        mid = (x0 + x1) // 2
        vl(cv, mid, y0, 6, C('metal', 3))


def door(cv, x0, x1, seed):
    y0 = CANT + 3
    vl(cv, x0, y0, BOT - y0, C('brunswick', 5)); vl(cv, x1, y0, BOT - y0, C('brunswick', 5))
    vl(cv, x0 + 1, y0, BOT - y0, C('brunswick', 1))
    hl(cv, x0, y0, x1 - x0 + 1, C('brunswick', 5)); hl(cv, x0 + 1, y0 + 1, x1 - x0 - 1, C('brunswick', 1))
    # droplight
    wx0, wx1 = x0 + 4, x1 - 3
    win_frame(cv, wx0, wx1, CANT + 9, CANT + 31, vent=False, seed=seed, seats=False)
    # droplight top rail + strap
    hl(cv, wx0, CANT + 8, wx1 - wx0, C('metal', 2))
    # door handle (chrome) + lock
    hx = x1 - 6
    hl(cv, hx, WAIST + 6, 4, C('metal', 1)); hl(cv, hx, WAIST + 7, 4, C('metal', 4)); cv.put(hx + 3, WAIST + 6, C('metal', 0))
    cv.put(hx + 1, WAIST + 11, C('metal', 2)); cv.put(hx + 1, WAIST + 12, C('under', 3))
    # grab rails (commode handles) either side
    for gx in (x0 - 3, x1 + 3):
        for y in range(CANT + 12, WAIST + 12):
            cv.put(gx, y, C('metal', 1 if y < WAIST - 10 else 2)); cv.put(gx + 1, y, C('brunswick', 4))
        cv.put(gx, CANT + 11, C('metal', 3)); cv.put(gx, WAIST + 12, C('metal', 3))
    # rust at the bottom corners (door bottoms always go first)
    for k in range(26):
        rx = x0 + 1 + int(hash01(k, 1, seed) * (x1 - x0 - 1)); ry = BOT - 1 - int(hash01(k, 2, seed) ** 2 * 9)
        if hash01(k, 3, seed) < 0.55 and not (x0 + 5 < rx < x1 - 5): continue
        cv.put(rx, ry, C('rust', 2 + int(hash01(k, 4, seed) * 2)))
        if hash01(k, 5, seed) < 0.3: cv.put(rx, ry - 1, C('rust', 1))


def guard_window(cv, x0, x1):
    y0, y1 = CANT + 9, CANT + 31
    win_frame(cv, x0, x1, y0, y1, vent=False, seed=5, seats=False)
    for bx in range(x0 + 4, x1 - 1, 5):   # guard's window bars
        vl(cv, bx, y0, y1 - y0, C('metal', 2)); vl(cv, bx + 1, y0, y1 - y0, C('metal', 4))
    # sill Kevin sits on
    hl(cv, x0 - 2, y1 + 1, x1 - x0 + 4, C('metal', 1)); hl(cv, x0 - 2, y1 + 2, x1 - x0 + 4, C('metal', 3))
    hl(cv, x0 - 1, y1 + 3, x1 - x0 + 2, C('brunswick', 5))
    # a couple of pale streaks below the sill (gently funny, not gross)
    for k, (dx, ln) in enumerate(((5, 5), (13, 3), (17, 7))):
        for yy in range(ln): cv.put(x0 + dx, y1 + 4 + yy, C('white', 2 if yy else 1))


def luggage_doors(cv, x0, x1):
    y0 = CANT + 3; mid = (x0 + x1) // 2
    for a, b in ((x0, mid), (mid, x1)):
        vl(cv, a, y0, BOT - y0, C('brunswick', 5)); vl(cv, a + 1, y0, BOT - y0, C('brunswick', 1))
    vl(cv, x1, y0, BOT - y0, C('brunswick', 5))
    hl(cv, x0, y0, x1 - x0, C('brunswick', 5)); hl(cv, x0 + 1, y0 + 1, x1 - x0 - 1, C('brunswick', 1))
    for a in (x0 + 4, mid + 4):
        win_frame(cv, a, a + 12, CANT + 9, CANT + 25, vent=False, seed=a, seats=False)
    # vertical bump strips (the guard's van got knocked about)
    for a in (x0 + 17, mid + 17):
        vl(cv, a, WAIST + 6, 20, C('brunswick', 1)); vl(cv, a + 1, WAIST + 6, 20, C('brunswick', 4))
    for hx in (mid - 5, mid + 3):
        hl(cv, hx, WAIST + 8, 3, C('metal', 1)); hl(cv, hx, WAIST + 9, 3, C('metal', 4))


def bodyside(cv):
    for y in range(CANT, BOT):
        for x in range(BX0, BX1):
            cv.put(x, y, body_colour(x, y))
    # cant rail lining (thin cream) + waist band (cream) + lower lining
    for x in range(BX0, BX1):
        n = hash01(x, 1, 3)
        cv.put(x, CANT + 1, C('paint_cream', 2 if n < 0.1 else 1))
        cv.put(x, WAIST, C('paint_cream', 0)); cv.put(x, WAIST + 1, C('paint_cream', 1)); cv.put(x, WAIST + 2, C('paint_cream', 2 if n > 0.2 else 3))
        cv.put(x, WAIST + 3, C('brunswick', 4))
        cv.put(x, BOT - 7, C('paint_cream', 2 if n > 0.15 else 3))
    # rain streaks: grime running down from the waist and window corners
    for k in range(80):
        x = BX0 + 4 + int(hash01(k, 1, 23) * (BX1 - BX0 - 8)); y = WAIST + 4 + int(hash01(k, 2, 23) * 6)
        ln = 6 + int(hash01(k, 3, 23) * 18)
        for yy in range(ln):
            if y + yy < BOT - 1 and hash01(k, yy, 24) < 0.85:
                c = cv.get(x, y + yy)
                if c[3] and c != C('paint_cream', 2) and c != C('paint_cream', 3): cv.put(x, y + yy, darker(c, 0.82))
    # openings
    for i, (kind, a, b) in enumerate(layout()):
        if kind == 'win':
            win_frame(cv, a, b, CANT + 8, CANT + 36, vent=True, seed=i)
            # rust bloom at the lower window corners
            for k in range(5):
                if hash01(i, k, 31) < 0.5: cv.put(a - 1 + int(hash01(i, k, 32) * 3), CANT + 38 + (k % 2), C('rust', 2))
                if hash01(i, k, 33) < 0.5: cv.put(b - 1 + int(hash01(i, k, 34) * 3), CANT + 38 + (k % 2), C('rust', 3))
        elif kind == 'cabwin':
            win_frame(cv, a, b, CANT + 7, CANT + 30, vent=False, seed=i + 40, seats=False)
            hl(cv, a, CANT + 18, b - a, C('metal', 3))
        elif kind == 'door': door(cv, a, b, 100 + i)
        elif kind == 'luggage': luggage_doors(cv, a, b)
        elif kind == 'guardwin': guard_window(cv, a, b)
    # nameplate: a raised plate with a brass edge, blank (the game letters MARJORIE)
    nx0, nx1, ny0, ny1 = NAMEPLATE
    cv.rect(nx0 - 1, ny0 - 1, nx1 - nx0 + 2, ny1 - ny0 + 2, OUTLINE)
    cv.rect(nx0, ny0, nx1 - nx0, ny1 - ny0, C('gold', 2))
    hl(cv, nx0, ny0, nx1 - nx0, C('gold', 0)); vl(cv, nx0, ny0, ny1 - ny0, C('gold', 1)); hl(cv, nx0, ny1 - 1, nx1 - nx0, C('gold', 3))
    cv.rect(nx0 + 2, ny0 + 2, nx1 - nx0 - 4, ny1 - ny0 - 4, C('wine', 3))
    hl(cv, nx0 + 2, ny0 + 2, nx1 - nx0 - 4, C('wine', 4))
    for (sx, sy) in ((nx0 + 1, ny0 + 1), (nx1 - 2, ny0 + 1), (nx0 + 1, ny1 - 2), (nx1 - 2, ny1 - 2)): cv.put(sx, sy, C('gold', 0))
    hl(cv, nx0, ny1 + 1, nx1 - nx0 + 1, C('brunswick', 5))
    # little rust patches low on the bodyside
    for k in range(18):
        x = BX0 + 20 + int(hash01(k, 1, 88) * (BX1 - BX0 - 40)); y = BOT - 5 - int(hash01(k, 2, 88) * 4)
        w = 2 + int(hash01(k, 3, 88) * 4)
        for xx in range(w):
            cv.put(x + xx, y, C('rust', 2)); cv.put(x + xx, y + 1, C('rust', 3))
            if xx and xx < w - 1: cv.put(x + xx, y - 1, C('rust', 1))


NAMEPLATE = (352, 424, WAIST + 11, WAIST + 23)
NUMBER_SLOTS = [(22, WAIST + 12, 44, 9), (BX1 - 66, WAIST + 12, 44, 9)]


def ends(cv):
    """Cab ends, seen almost edge-on: a slim curved face with windscreen and the yellow warning panel."""
    for side in (0, 1):
        for k in range(8):
            x = (BX0 - 8 + k) if side == 0 else (BX1 + 7 - k)
            inset = [6, 4, 2, 1, 1, 0, 0, 0][k]       # the end curves back at the top and bottom
            lit = side == 0                            # west end faces the light
            for y in range(CANT - 6 + inset, BOT + inset // 2):
                if y < CANT + 26:   # windscreen
                    c = C('glass', 1 if lit else 3) if k in (2, 3) else C('glass', 3 if lit else 4)
                    if y < CANT - 1: c = C('brunswick', 1 if lit else 3)
                elif y < CANT + 28: c = C('under', 3)
                else:
                    c = C('warn', (0 if k < 3 else 1) if lit else (2 if k < 3 else 3))
                cv.put(x, y, c)
            if k == 7:   # seam where the end meets the bodyside
                for y in range(CANT - 6, BOT): cv.put(x, y, C('brunswick', 4 if lit else 5))
        # marker lamps + a hint of the whiskers wrapping onto the side
        mx = BX0 - 5 if side == 0 else BX1 + 3
        cv.put(mx, BOT - 8, C('white', 0)); cv.put(mx + 1, BOT - 8, C('white', 2))
        cv.put(mx, CANT + 34, C('paint_red', 1))
        # the yellow warning panel wraps a little onto the bodyside, then thin cream whiskers run back
        for k in range(10):
            wx = (BX0 + k) if side == 0 else (BX1 - 1 - k)
            for y in range(CANT + 30 + k // 2, BOT - 2 - k // 3): cv.put(wx, y, C('warn', (1 if k < 7 else 2) if side == 0 else (2 if k < 7 else 3)))
        for j in range(3):
            for k in range(22 - j * 4):
                wx = (BX0 + 10 + k) if side == 0 else (BX1 - 11 - k)
                cv.put(wx, CANT + 32 + j * 5 + k // 7, C('paint_cream', 1 + (j > 1)))


def underframe(cv):
    # solebar
    for x in range(BX0 - 2, BX1 + 2):
        cv.put(x, BOT, C('under', 1)); cv.put(x, BOT + 1, C('under', 2))
        for y in range(BOT + 2, SOLE): cv.put(x, y, C('under', 3 if y < SOLE - 1 else 4))
        if x % 10 == 0: cv.put(x, BOT + 3, C('under', 1)); cv.put(x, BOT + 4, C('under', 4))
    # rust drips from the body onto the solebar
    for k in range(40):
        x = BX0 + int(hash01(k, 1, 12) * (BX1 - BX0))
        for yy in range(int(hash01(k, 2, 12) * 5) + 1): cv.put(x, BOT + 1 + yy, C('rust', 3))
    # footsteps under the doors
    for kind, a, b in layout():
        if kind in ('door', 'luggage'):
            cv.rect(a + 2, SOLE, b - a - 3, 3, C('under', 2)); hl(cv, a + 2, SOLE, b - a - 3, C('under', 0))
            vl(cv, a + 3, SOLE, 5, C('under', 3)); vl(cv, b - 3, SOLE, 5, C('under', 3))
    # equipment (in the shadow under the car)
    def crate(x, y, w, h, rn='under', lo=2):
        cv.rect(x, y, w, h, C(rn, lo + 1)); hl(cv, x, y, w, C(rn, lo)); vl(cv, x, y, h, C(rn, lo))
        hl(cv, x, y + h - 1, w, C(rn, lo + 3)); vl(cv, x + w - 1, y, h, C(rn, lo + 2))
    # fuel tank (west)
    cyl_h(cv, 64, SOLE, 58, 12, 'under', 1, 5); hl(cv, 70, SOLE + 3, 20, C('under', 0))
    cv.rect(96, SOLE + 1, 5, 3, C('warn', 3))   # filler cap (faded yellow)
    # brake cylinders + vacuum reservoirs (under h_brakes, x 288-320)
    cyl_h(cv, 246, SOLE + 1, 34, 11, 'under', 1, 5)
    cyl_h(cv, 284, SOLE, 40, 13, 'under', 1, 5)
    for x in (292, 312): vl(cv, x, SOLE, 13, C('under', 4)); vl(cv, x + 1, SOLE, 13, C('under', 1))
    crate(328, SOLE, 30, 12)    # battery box
    for x in range(331, 356, 6): hl(cv, x, SOLE + 3, 3, C('under', 1))
    # engine (under h_engine, x 448-480): block with cooling fins, sump, radiator grille
    ex0, ex1 = 372, 512
    cv.rect(ex0, SOLE, ex1 - ex0, 16, C('under', 3))
    for x in range(ex0, ex1):
        cv.put(x, SOLE, C('under', 1)); cv.put(x, SOLE + 15, C('under', 5))
        if (x - ex0) % 4 == 1: vl(cv, x, SOLE + 2, 10, C('under', 1))
        if (x - ex0) % 4 == 2: vl(cv, x, SOLE + 2, 10, C('under', 4))
    cv.rect(ex0 + 8, SOLE + 12, 50, 7, C('under', 4)); hl(cv, ex0 + 8, SOLE + 12, 50, C('under', 2))   # sump
    cv.rect(ex1 - 36, SOLE + 1, 30, 14, C('under', 5))   # radiator
    for y in range(SOLE + 2, SOLE + 14, 2): hl(cv, ex1 - 35, y, 28, C('under', 2))
    speck(cv, ex0, SOLE, ex1 - ex0, 18, [C('oil', 0), C('rust', 3)], 0.05, 17, test=lambda x, y: cv.get(x, y)[3] > 0)
    # oil drip line and a gearbox
    crate(516, SOLE + 1, 18, 13)
    cyl_h(cv, 660, SOLE, 60, 12, 'under', 1, 5)   # water tank (east)
    # brake pipe along the underframe
    # buffer beams, buffers, couplings
    for side in (0, 1):
        bx = BX0 - 8 if side == 0 else BX1
        cv.rect(bx, BOT - 2, 8, 10, C('under', 3)); hl(cv, bx, BOT - 2, 8, C('under', 1))
        for dy in (BOT - 1, BOT + 5):
            px0 = 0 if side == 0 else BX1 + 8
            cyl_h(cv, px0 + MX, dy, 6, 4, 'metal', 0, 4, ends=False)
            vl(cv, (px0 + MX) if side == 0 else px0 + MX + 5, dy - 1, 6, C('metal', 2))
        # coupling hook + hanging chain links
        cx = BX0 - 6 if side == 0 else BX1 + 4
        for k in range(3): cv.put(cx + (1 if k % 2 else 0), BOT + 8 + k * 2, C('metal', 2)); cv.put(cx, BOT + 9 + k * 2, C('metal', 4))
        # vacuum hose
        for k in range(8): cv.put(cx + (2 if side == 0 else -2), SOLE + k, C('under', 2 if k % 2 else 4))


def bogie(cv, cx):
    y0 = SOLE + 1
    # frame side
    fx0, fx1 = cx - 52, cx + 52
    for x in range(fx0, fx1):
        for y in range(y0, y0 + 14):
            edge = x in (fx0, fx1 - 1)
            i = 1 if y == y0 else (4 if y == y0 + 13 or edge else 3)
            cv.put(x, y, C('under', i))
    # lightening holes + a cut-out between the axles
    for hx in (cx - 18, cx + 10):
        cv.rect(hx, y0 + 4, 8, 6, C('under', 5)); hl(cv, hx, y0 + 10, 8, C('under', 2))
    # wheels (behind the frame bottom): rusty treads from years stood still
    for wx in (cx - 30, cx + 30):
        wy = CONTACT - WHEEL_R
        def wcol(x, y, nx, ny, nz):
            d = math.sqrt(nx * nx + ny * ny)
            if d > 0.82: return C('rust', 3 if ny < 0 else 2) if nx < 0.3 else C('rust', 4)
            if d > 0.72: return C('under', 5)
            if d < 0.22: return C('metal', 3) if nx < 0 else C('metal', 4)
            return shade('under', light(nx, ny, nz) * 0.7 + 0.1)
        # only draw below the frame line so the frame reads in front
        tmp = Canvas(WHEEL_R * 2 + 3, WHEEL_R * 2 + 3)
        tmp.ellipse(WHEEL_R + 1.5, WHEEL_R + 1.5, WHEEL_R, WHEEL_R, wcol)
        for yy in range(tmp.h):
            for xx in range(tmp.w):
                c = tmp.px[xx, yy]
                X, Y = wx - WHEEL_R - 1 + xx, wy - WHEEL_R - 1 + yy
                if c[3] and (Y >= y0 + 12 or cv.get(X, Y)[3] == 0): cv.put(X, Y, c)
        # glint on the rim
        cv.put(wx - 9, wy + 8, C('rust', 0)); cv.put(wx - 10, wy + 7, C('rust', 1))
        # axlebox with a faded yellow cover + coil springs above it
        cv.rect(wx - 6, y0 + 6, 12, 10, C('under', 2)); hl(cv, wx - 6, y0 + 6, 12, C('under', 0)); vl(cv, wx + 5, y0 + 6, 10, C('under', 4))
        cv.rect(wx - 3, y0 + 9, 6, 5, C('mustard', 2)); hl(cv, wx - 3, y0 + 9, 6, C('mustard', 1)); cv.put(wx + 2, y0 + 13, C('mustard', 3))
        for k in range(3):
            for sx in (wx - 12, wx + 8):
                hl(cv, sx, y0 + 1 + k * 2, 4, C('metal', 2)); hl(cv, sx, y0 + 2 + k * 2, 4, C('under', 4))
        # brake block against the tread
        for bx in (wx - WHEEL_R - 3, wx + WHEEL_R):
            cv.rect(bx, y0 + 14, 3, 8, C('rust', 3)); vl(cv, bx, y0 + 14, 8, C('rust', 2))
    # bolster + sandbox
    cv.rect(cx - 6, y0 + 2, 12, 11, C('under', 2)); hl(cv, cx - 6, y0 + 2, 12, C('under', 0))
    cv.rect(cx - 4, y0 + 5, 8, 2, C('under', 4))
    for (gx) in (fx0 + 2, fx1 - 5):   # guard irons
        vl(cv, gx, y0 + 12, 12, C('under', 2)); vl(cv, gx + 1, y0 + 12, 12, C('under', 4))
    # a cobweb in one corner of the west bogie (years in the shed)
    if cx < 300:
        for k in range(7):
            cv.put(fx0 - 1 - k // 2, y0 + 1 + k, C('white', 3)); cv.put(fx0 - 1 - k, y0 + 1 + k // 3, C('white', 3))


def build():
    cv = Canvas(W, H)
    roof(cv)
    bodyside(cv)
    ends(cv)
    underframe(cv)
    bogie(cv, WEST_BOGIE); bogie(cv, EAST_BOGIE)
    outline(cv)
    # key points for the engine (sprite px)
    gw = [l for l in layout() if l[0] == 'guardwin'][0]
    points = {
        'pigeon': [(gw[1] + gw[2]) // 2, CANT + 32],    # Kevin sits here (feet on the sill)
        'cab': [BX0 + 20, CANT + 18],
        'cab_east': [BX1 - 20, CANT + 18],
        'bogie_west': [WEST_BOGIE, CONTACT - 8], 'bogie_east': [EAST_BOGIE, CONTACT - 8],
        'brakes': [304, SOLE + 6], 'engine': [456, SOLE + 8],
    }
    text_slots = {
        'nameplate': [NAMEPLATE[0] + 2, NAMEPLATE[2] + 2, NAMEPLATE[1] - NAMEPLATE[0] - 4, NAMEPLATE[3] - NAMEPLATE[2] - 4],
        'number_west': list(NUMBER_SLOTS[0]), 'number_east': list(NUMBER_SLOTS[1]),
    }
    return cv, points, text_slots


if __name__ == '__main__':
    cv, pts, ts = build()
    save_png(cv, os.path.join(OUT, 'marjorie.png'))
    preview([('m', cv)], os.path.join(OUT, 'preview_marjorie.png'), scale=2)
