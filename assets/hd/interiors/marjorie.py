"""MARJORIE: 1961 single-car diesel railcar, lined Brunswick green, cream band, yellow warning ends.
3/4 top-down side view (roof from above, south bodyside, underframe and bogies), drawn at 48 art px per tile.
She spans shed tiles x4-27 (24 tiles = 1152 px). The game letters 'MARJORIE' and 'KVL 61' in the blank slots."""
from ilib import *

L = 24 * TILE              # 1152
MX = 2
W, H = L + 2 * MX, 234
BX0, BX1 = MX + 16, MX + L - 16     # bodyside ends (sprite x)
ROOF_T, CANT, WAIST, BOT = 20, 58, 124, 172
SOLE = BOT + 9
CONTACT = 230              # wheel/rail contact row (the anchor row)
WEST_BOGIE, EAST_BOGIE = MX + 264, MX + L - 264
WHEEL_R = 21
SEED = 61
WIN_T, WIN_B = CANT + 12, CANT + 54


def layout():
    o = MX
    Lx = []
    Lx.append(('cabwin', o + 32, o + 60)); Lx.append(('door', o + 68, o + 100))
    Lx.append(('door', o + 112, o + 144))
    for x in range(o + 154, o + 420, 54): Lx.append(('win', x, x + 45))
    Lx.append(('door', o + 424, o + 456))
    for x in range(o + 466, o + 790, 54): Lx.append(('win', x, x + 45))
    Lx.append(('door', o + 792, o + 824))
    Lx.append(('luggage', o + 834, o + 896))
    Lx.append(('guardwin', o + 908, o + 944))
    Lx.append(('door', o + 954, o + 986))
    Lx.append(('win', o + 996, o + 1036))
    Lx.append(('door', o + 1048, o + 1080)); Lx.append(('cabwin', o + 1092, o + 1120))
    return Lx


# ------------------------------------------------------------------ roof
def roof(cv):
    x0, x1 = BX0 - 9, BX1 + 9
    R = 26
    for x in range(x0, x1):
        de = min(x - x0, x1 - 1 - x)
        top = ROOF_T + (0 if de > R else int(round(R - math.sqrt(max(0, R * R - (R - de) ** 2)))))
        for y in range(top, CANT + 1):
            t = (y - top) / max(1, CANT - top)
            ny = max(-0.95, min(0.97, -0.6 + 1.55 * t))
            lum = light(0, ny, math.sqrt(max(0.02, 1 - ny * ny)))
            lum += (fbm(x * 0.6, y * 2, 20, SEED, 2) - 0.5) * 0.14
            soot = max(0, 1 - abs(x - (MX + 676)) / 130.0) * (1 - t * 0.3) + (fbm(x, y, 12, SEED + 7, 2) - 0.5) * 0.55
            if soot > 0.4: lum -= 0.14
            if soot > 0.68: lum -= 0.12
            cv.put(x, y, shade('roof_grey', lum))
    for x in range(x0 + R, x1 - R):   # the specular strip along the crown
        if hash01(x, 0, 3) > 0.25: cv.put(x, ROOF_T + 5, C('roof_grey', 0))
    for x in range(BX0 + 10, BX1 - 10):   # rain strip above the cant rail
        cv.put(x, CANT - 6, C('roof_grey', 1)); cv.put(x, CANT - 5, C('roof_grey', 4)); cv.put(x, CANT - 4, C('roof_grey', 5))
    for x in range(BX0 + 44, BX1 - 30, 70):   # roof panel seams with rivets
        for y in range(ROOF_T + 3, CANT - 7):
            cv.put(x, y, C('roof_grey', 3)); cv.put(x + 1, y, C('roof_grey', 1))
            if y % 5 == 0: cv.put(x - 2, y, C('roof_grey', 1)); cv.put(x + 3, y, C('roof_grey', 1))
    for kind, a, b in layout():   # torpedo ventilators, one per saloon bay
        if kind != 'win': continue
        vx = (a + b) // 2
        for k in range(10): cv.put(vx - 3 + k, 38, SHADOW[:3] + (110,))
        cv.ellipse(vx, 33, 8, 4, lambda px, py, nx, ny, nz: shade('metal', light(nx, ny, nz) - 0.12))
        cv.put(vx - 4, 31, C('metal', 0)); cv.put(vx - 3, 31, C('metal', 0))
        hl(cv, vx + 4, 33, 3, C('metal', 4))
    for sx in (MX + 656, MX + 690):   # exhaust stacks, sooty
        for y in range(3, 34):
            for k in range(8):
                cv.put(sx + k, y, shade('under', light((k - 3.5) / 4, 0.2, 0.8)))
        cv.ellipse(sx + 4, 4, 4.5, 2, C('under', 5)); cv.put(sx + 1, 3, C('under', 2)); cv.put(sx + 2, 3, C('under', 2))
        hl(cv, sx - 2, 34, 12, C('under', 4)); hl(cv, sx - 1, 33, 10, C('under', 3))
        for y in range(10, 30, 7): hl(cv, sx, y, 8, C('under', 4))
    for hx in (BX0 + 12, BX1 - 24):   # horns on the domes
        cv.rect(hx, 26, 12, 5, C('under', 2)); hl(cv, hx, 26, 12, C('under', 0)); hl(cv, hx, 30, 12, C('under', 4))
        cv.ellipse(hx + (0 if hx < W // 2 else 12), 28, 2, 2, C('under', 5))
    for bx in (BX0 - 6, BX1 - 6):   # destination blind boxes on the dome fronts (blank)
        cv.rect(bx, 38, 12, 9, OUTLINE); cv.rect(bx + 1, 39, 10, 7, C('paint_cream', 1)); hl(cv, bx + 1, 39, 10, C('paint_cream', 0))
        hl(cv, bx + 1, 45, 10, C('paint_cream', 3))
    for k in range(18):   # Kevin's handiwork above the guard's window
        x = MX + 890 + int(hash01(k, 1, 71) * 80); y = 30 + int(hash01(k, 2, 71) * 18)
        cv.put(x, y, C('white', 1 if k % 3 else 0))
    for k in range(6): cv.put(MX + 940 + k, 27 + k // 2, C('white', 2 + (k > 3)))   # a stray feather
    for (lx, ly) in ((MX + 300, 32), (MX + 520, 44), (MX + 810, 36)):   # dry leaves
        cv.put(lx, ly, C('rust', 1)); cv.put(lx + 1, ly, C('rust', 2)); cv.put(lx + 1, ly + 1, C('rust', 3))


# ------------------------------------------------------------------ bodyside
def body_colour(x, y):
    t = (y - CANT) / (BOT - CANT)
    if y <= CANT + 2: i = 1
    elif t < 0.8: i = 2
    elif t < 0.94: i = 3
    else: i = 4
    n = fbm(x * 0.5, y * 2.2, 26, SEED + 1, 3)
    dirt = n * 0.55 + t * 0.5
    if dirt > 0.8: i += 1
    elif n < 0.2 and t < 0.5: i -= 1
    return C('brunswick', max(0, min(5, i)))


def glass(cv, x0, y0, w, h, seats=True, seed=0):
    """Window glass: dim interior, far-side windows glowing, seat backs, a slanted reflection."""
    rack = int(h * 0.22); far1 = int(h * 0.6)
    for yy in range(h):
        for xx in range(w):
            if yy < rack: c = C('glass', 4)
            elif yy < far1: c = C('glass', 3)
            else: c = C('under', 4)
            cv.put(x0 + xx, y0 + yy, c)
    for xx in range(4 + seed % 7, w, 19):
        vl(cv, x0 + xx, y0 + rack, far1 - rack, C('glass', 4)); vl(cv, x0 + xx + 1, y0 + rack, far1 - rack, C('glass', 4))
    for xx in range(w): cv.put(x0 + xx, y0 + rack + 1, C('glass', 2))
    hl(cv, x0, y0 + rack, w, C('metal', 2))     # luggage rack and its netting
    for xx in range(0, w, 2): cv.put(x0 + xx, y0 + rack - 1, C('metal', 4))
    if seats:
        sy = y0 + far1 - 2
        for k in range(1, w - 1, 12):
            for yy in range(sy, y0 + h):
                for xx in range(k, min(w - 1, k + 11)):
                    lx = xx - k; ly = yy - sy
                    if ly == 0 and (lx < 2 or lx > 8): continue
                    if ly == 1 and (lx < 1 or lx > 9): continue
                    if lx == 10: continue
                    i = 2
                    if ly <= 1: i = 1
                    elif lx in (0, 9): i = 3
                    if (lx * 3 + ly * 2) % 7 == 0 and ly > 2: i = 0
                    cv.put(x0 + xx, yy, C('moquette_r', i))
            hl(cv, x0 + k + 3, sy + 1, 5, C('white', 2)); hl(cv, x0 + k + 2, sy + 2, 7, C('white', 3))   # antimacassar
    off = int(hash01(seed, 3, 5) * (w - 10)) - 6
    wide = 3 if hash01(seed, 4, 5) < 0.5 else 2
    for yy in range(int(h * 0.08), int(h * 0.78)):
        for k in range(wide):
            xx = off + k + (h - yy) // 2
            if 0 <= xx < w: cv.put(x0 + xx, y0 + yy, C('glass', 1) if k else C('glass', 2))
        xx = off + wide + 3 + (h - yy) // 2
        if 0 <= xx < w and yy % 3: cv.put(x0 + xx, y0 + yy, C('glass', 2))
    cv.put(x0, y0, C('glass', 0)); cv.put(x0 + 1, y0, C('glass', 1)); cv.put(x0, y0 + 1, C('glass', 1))


def win_frame(cv, x0, x1, y0, y1, vent=True, seed=0, seats=True):
    rrect(cv, x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, C('under', 4), r=2)       # rubber gasket
    rrect(cv, x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, C('under', 3), r=1)
    glass(cv, x0, y0, x1 - x0, y1 - y0, seats, seed)
    hl(cv, x0, y0 - 3, x1 - x0, C('brunswick', 1))
    hl(cv, x0 - 1, y1 + 2, x1 - x0 + 2, C('brunswick', 5))
    hl(cv, x0, y1 + 3, x1 - x0, C('brunswick', 1))
    if vent:   # sliding top-lights with catches
        vy = y0 + 8
        hl(cv, x0, vy, x1 - x0, C('metal', 1)); hl(cv, x0, vy + 1, x1 - x0, C('metal', 3)); hl(cv, x0, vy + 2, x1 - x0, C('under', 4))
        mid = (x0 + x1) // 2
        vl(cv, mid, y0, 8, C('metal', 2)); vl(cv, mid + 1, y0, 8, C('metal', 4))
        cv.put(mid - 3, vy - 2, C('metal', 0)); cv.put(mid + 4, vy - 2, C('metal', 0))
        if hash01(seed, 9, 1) < 0.3:   # one left open a crack
            for yy in range(y0, vy): cv.put(mid - 6, yy, C('under', 5)); cv.put(mid - 5, yy, C('under', 5))


def door(cv, x0, x1, seed):
    y0 = CANT + 4
    for x in (x0, x1): vl(cv, x, y0, BOT - y0, C('brunswick', 5))
    vl(cv, x0 + 1, y0, BOT - y0, C('brunswick', 1)); vl(cv, x1 - 1, y0, BOT - y0, C('brunswick', 3))
    hl(cv, x0, y0, x1 - x0 + 1, C('brunswick', 5)); hl(cv, x0 + 1, y0 + 1, x1 - x0 - 1, C('brunswick', 1))
    wx0, wx1 = x0 + 6, x1 - 5
    win_frame(cv, wx0, wx1, CANT + 14, CANT + 47, vent=False, seed=seed, seats=False)
    hl(cv, wx0, CANT + 12, wx1 - wx0, C('metal', 1))
    for yy in range(CANT + 50, CANT + 60): cv.put((wx0 + wx1) // 2, yy, C('leather', 2 if yy % 3 else 3))   # droplight strap
    cv.put((wx0 + wx1) // 2, CANT + 60, C('metal', 1))
    hx = x1 - 9   # handle + lock plate
    hl(cv, hx, WAIST + 9, 6, C('metal', 1)); hl(cv, hx, WAIST + 10, 6, C('metal', 4)); cv.put(hx + 5, WAIST + 9, C('metal', 0))
    vl(cv, hx + 2, WAIST + 11, 3, C('metal', 3))
    cv.rect(hx + 1, WAIST + 17, 3, 4, C('metal', 3)); cv.put(hx + 1, WAIST + 17, C('metal', 1)); cv.put(hx + 2, WAIST + 19, OUTLINE)
    for gx in (x0 - 4, x1 + 4):   # grab rails
        for y in range(CANT + 18, WAIST + 18):
            cv.put(gx, y, C('metal', 1 if y < WAIST - 12 else 2)); cv.put(gx + 1, y, C('brunswick', 5))
        for yy in (CANT + 17, WAIST + 18): cv.put(gx, yy, C('metal', 3)); cv.put(gx - 1, yy, C('metal', 3))
    for k in range(40):   # rust at the bottom corners
        rx = x0 + 1 + int(hash01(k, 1, seed) * (x1 - x0 - 1)); ry = BOT - 1 - int(hash01(k, 2, seed) ** 2 * 13)
        if hash01(k, 3, seed) < 0.55 and not (x0 + 7 < rx < x1 - 7): continue
        cv.put(rx, ry, C('rust', 2 + int(hash01(k, 4, seed) * 2)))
        if hash01(k, 5, seed) < 0.3: cv.put(rx, ry - 1, C('rust', 1))


def guard_window(cv, x0, x1):
    y0, y1 = CANT + 14, CANT + 47
    win_frame(cv, x0, x1, y0, y1, vent=False, seed=5, seats=False)
    for bx in range(x0 + 5, x1 - 2, 7):
        vl(cv, bx, y0, y1 - y0, C('metal', 1)); vl(cv, bx + 1, y0, y1 - y0, C('metal', 3)); vl(cv, bx + 2, y0, y1 - y0, C('under', 4))
    hl(cv, x0 - 4, y1 + 2, x1 - x0 + 8, C('metal', 0)); hl(cv, x0 - 4, y1 + 3, x1 - x0 + 8, C('metal', 2)); hl(cv, x0 - 4, y1 + 4, x1 - x0 + 8, C('metal', 4))
    hl(cv, x0 - 3, y1 + 5, x1 - x0 + 6, C('brunswick', 5))
    for (dx, ln) in ((7, 7), (18, 4), (25, 10)):
        for yy in range(ln): cv.put(x0 + dx, y1 + 6 + yy, C('white', 2 if yy else 1))


def luggage_doors(cv, x0, x1):
    y0 = CANT + 4; mid = (x0 + x1) // 2
    for a in (x0, mid):
        vl(cv, a, y0, BOT - y0, C('brunswick', 5)); vl(cv, a + 1, y0, BOT - y0, C('brunswick', 1))
    vl(cv, x1, y0, BOT - y0, C('brunswick', 5))
    hl(cv, x0, y0, x1 - x0, C('brunswick', 5)); hl(cv, x0 + 1, y0 + 1, x1 - x0 - 1, C('brunswick', 1))
    for a in (x0 + 6, mid + 6):
        win_frame(cv, a, a + 19, CANT + 14, CANT + 38, vent=False, seed=a, seats=False)
    for a in (x0 + 26, mid + 26):
        vl(cv, a, WAIST + 8, 32, C('brunswick', 1)); vl(cv, a + 1, WAIST + 8, 32, C('brunswick', 4))
    for hx in (mid - 8, mid + 4):
        hl(cv, hx, WAIST + 12, 5, C('metal', 1)); hl(cv, hx, WAIST + 13, 5, C('metal', 4))
    for k in range(10): cv.put(x0 + 8 + k * 2, WAIST + 30 + (k % 3 == 0), C('white', 3))   # old chalk marks


NAMEPLATE = (MX + 522, MX + 630, WAIST + 15, WAIST + 34)
NUMBER_SLOTS = [(MX + 34, WAIST + 18, 66, 13), (MX + L - 100, WAIST + 18, 66, 13)]


def bodyside(cv):
    for y in range(CANT, BOT):
        for x in range(BX0, BX1):
            cv.put(x, y, body_colour(x, y))
    for x in range(BX0 + 4, BX1 - 4, 9):   # rivet rows
        cv.put(x, CANT + 5, C('brunswick', 1)); cv.put(x, CANT + 6, C('brunswick', 4))
        cv.put(x, BOT - 3, C('brunswick', 2)); cv.put(x, BOT - 2, C('brunswick', 5))
    for x in range(BX0, BX1):   # lining
        n = hash01(x, 1, 3)
        cv.put(x, CANT + 1, C('paint_cream', 2 if n < 0.1 else 1)); cv.put(x, CANT + 2, C('paint_cream', 3))
        cv.put(x, WAIST, C('paint_cream', 0)); cv.put(x, WAIST + 1, C('paint_cream', 1)); cv.put(x, WAIST + 2, C('paint_cream', 1))
        cv.put(x, WAIST + 3, C('paint_cream', 2 if n > 0.2 else 3)); cv.put(x, WAIST + 4, C('brunswick', 4))
        cv.put(x, BOT - 9, C('paint_cream', 2 if n > 0.15 else 3))
    for k in range(110):   # grime streaks
        x = BX0 + 4 + int(hash01(k, 1, 23) * (BX1 - BX0 - 8)); y = WAIST + 5 + int(hash01(k, 2, 23) * 8)
        ln = 8 + int(hash01(k, 3, 23) * 26)
        for yy in range(ln):
            if y + yy < BOT - 1 and hash01(k, yy, 24) < 0.85:
                c = cv.get(x, y + yy)
                if c[3] and c[:3] not in (C('paint_cream', 2)[:3], C('paint_cream', 3)[:3]): cv.put(x, y + yy, darker(c, 0.84))
    for i, (kind, a, b) in enumerate(layout()):
        if kind == 'win':
            win_frame(cv, a, b, WIN_T, WIN_B, vent=True, seed=i)
            for k in range(7):
                if hash01(i, k, 31) < 0.5: cv.put(a - 2 + int(hash01(i, k, 32) * 4), WIN_B + 3 + (k % 3), C('rust', 2))
                if hash01(i, k, 33) < 0.5: cv.put(b - 2 + int(hash01(i, k, 34) * 4), WIN_B + 3 + (k % 3), C('rust', 3))
            for k in range(3):
                for yy in range(6 + k * 3): cv.put(b + 1 - k, WIN_B + 6 + yy, darker(cv.get(b + 1 - k, WIN_B + 6 + yy), 0.85))
        elif kind == 'cabwin':
            win_frame(cv, a, b, CANT + 11, CANT + 45, vent=False, seed=i + 40, seats=False)
            hl(cv, a, CANT + 26, b - a, C('metal', 2)); hl(cv, a, CANT + 27, b - a, C('metal', 4))
        elif kind == 'door': door(cv, a, b, 100 + i)
        elif kind == 'luggage': luggage_doors(cv, a, b)
        elif kind == 'guardwin': guard_window(cv, a, b)
    nx0, nx1, ny0, ny1 = NAMEPLATE   # raised plate with a polished brass edge, blank
    cv.rect(nx0 - 1, ny0 - 1, nx1 - nx0 + 2, ny1 - ny0 + 2, OUTLINE)
    cv.rect(nx0, ny0, nx1 - nx0, ny1 - ny0, C('gold', 2))
    hl(cv, nx0, ny0, nx1 - nx0, C('gold', 0)); vl(cv, nx0, ny0, ny1 - ny0, C('gold', 1)); hl(cv, nx0, ny1 - 1, nx1 - nx0, C('gold', 3)); vl(cv, nx1 - 1, ny0, ny1 - ny0, C('gold', 3))
    cv.rect(nx0 + 3, ny0 + 3, nx1 - nx0 - 6, ny1 - ny0 - 6, C('wine', 3))
    hl(cv, nx0 + 3, ny0 + 3, nx1 - nx0 - 6, C('wine', 4)); vl(cv, nx0 + 3, ny0 + 3, ny1 - ny0 - 6, C('wine', 4))
    for (sx, sy) in ((nx0 + 1, ny0 + 1), (nx1 - 2, ny0 + 1), (nx0 + 1, ny1 - 2), (nx1 - 2, ny1 - 2)): cv.put(sx, sy, C('gold', 0))
    hl(cv, nx0 + 1, ny1 + 1, nx1 - nx0, C('brunswick', 5)); vl(cv, nx1 + 1, ny0 + 1, ny1 - ny0, C('brunswick', 5))
    cv.put(nx0 + 2, ny0 + 1, C('white', 0))
    for k in range(26):   # rust patches low on the bodyside
        x = BX0 + 30 + int(hash01(k, 1, 88) * (BX1 - BX0 - 60)); y = BOT - 7 - int(hash01(k, 2, 88) * 6)
        w = 3 + int(hash01(k, 3, 88) * 6)
        for xx in range(w):
            cv.put(x + xx, y, C('rust', 2)); cv.put(x + xx, y + 1, C('rust', 3))
            if 0 < xx < w - 1: cv.put(x + xx, y - 1, C('rust', 1))
            if xx == w // 2: cv.put(x + xx, y + 2, C('rust', 4)); cv.put(x + xx, y + 3, C('rust', 4))


def ends(cv):
    """Cab ends seen almost edge-on: a slim curved face with windscreen and the yellow warning panel."""
    for side in (0, 1):
        lit = side == 0
        for k in range(12):
            x = (BX0 - 12 + k) if side == 0 else (BX1 + 11 - k)
            inset = [9, 6, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0][k]
            for y in range(CANT - 8 + inset, BOT + inset // 2):
                if y < CANT - 1: c = C('brunswick', 1 if lit else 3)
                elif y < CANT + 38:
                    c = C('glass', 1 if lit else 3) if k in (3, 4, 5) else C('glass', 3 if lit else 4)
                    if y in (CANT - 1, CANT + 37): c = C('under', 3)
                elif y < CANT + 41: c = C('under', 3)
                else: c = C('warn', (0 if k < 4 else 1) if lit else (2 if k < 4 else 3))
                cv.put(x, y, c)
            if k == 11:
                for y in range(CANT - 8, BOT): cv.put(x, y, C('brunswick', 4 if lit else 5))
        mx = BX0 - 8 if side == 0 else BX1 + 5
        for (yy, c) in ((BOT - 12, 'white'), (CANT + 50, 'white')):
            cv.rect(mx, yy, 3, 3, C(c, 0)); cv.put(mx + 2, yy + 2, C(c, 3))
        cv.put(mx + 1, CANT + 56, C('paint_red', 1))
        for k in range(10): cv.put(mx + (k // 5), CANT + 10 + k, C('under', 2))   # wiper
        for k in range(15):   # warning panel wraps a little onto the side
            wx = (BX0 + k) if side == 0 else (BX1 - 1 - k)
            for y in range(CANT + 46 + k // 2, BOT - 3 - k // 3):
                cv.put(wx, y, C('warn', (1 if k < 10 else 2) if side == 0 else (2 if k < 10 else 3)))
        for j in range(3):   # cream whiskers
            for k in range(34 - j * 6):
                wx = (BX0 + 15 + k) if side == 0 else (BX1 - 16 - k)
                cv.put(wx, CANT + 48 + j * 7 + k // 9, C('paint_cream', 1 + (j > 1)))


# ------------------------------------------------------------------ underframe + bogies
def crate(cv, x, y, w, h, rn='under', lo=2):
    cv.rect(x, y, w, h, C(rn, lo + 1)); hl(cv, x, y, w, C(rn, lo)); vl(cv, x, y, h, C(rn, lo))
    hl(cv, x, y + h - 1, w, C(rn, lo + 3)); vl(cv, x + w - 1, y, h, C(rn, lo + 2))


def underframe(cv):
    for x in range(BX0 - 3, BX1 + 3):   # solebar
        cv.put(x, BOT, C('under', 1)); cv.put(x, BOT + 1, C('under', 2))
        for y in range(BOT + 2, SOLE): cv.put(x, y, C('under', 3 if y < SOLE - 1 else 4))
        if x % 12 == 0: cv.put(x, BOT + 4, C('under', 1)); cv.put(x, BOT + 5, C('under', 5))
    for k in range(60):
        x = BX0 + int(hash01(k, 1, 12) * (BX1 - BX0))
        for yy in range(int(hash01(k, 2, 12) * 7) + 1): cv.put(x, BOT + 1 + yy, C('rust', 3))
    for kind, a, b in layout():   # footsteps under the doors
        if kind in ('door', 'luggage'):
            cv.rect(a + 3, SOLE + 1, b - a - 5, 4, C('under', 2)); hl(cv, a + 3, SOLE + 1, b - a - 5, C('under', 0))
            hl(cv, a + 3, SOLE + 4, b - a - 5, C('under', 4))
            vl(cv, a + 4, SOLE, 7, C('under', 3)); vl(cv, b - 3, SOLE, 7, C('under', 3))
    o = MX
    cyl_h(cv, o + 96, SOLE, 86, 18, 'under', 1, 5); hl(cv, o + 104, SOLE + 4, 30, C('under', 0))   # fuel tank
    for sx in (o + 112, o + 160): vl(cv, sx, SOLE, 18, C('under', 5)); vl(cv, sx + 1, SOLE, 18, C('under', 2))
    cv.rect(o + 140, SOLE + 1, 8, 4, C('warn', 3)); hl(cv, o + 140, SOLE + 1, 8, C('warn', 2))
    cyl_h(cv, o + 372, SOLE + 1, 50, 16, 'under', 1, 5)   # brake cylinder
    cyl_h(cv, o + 426, SOLE, 56, 20, 'under', 1, 5)       # vacuum reservoir
    for x in (o + 438, o + 468): vl(cv, x, SOLE, 20, C('under', 5)); vl(cv, x + 1, SOLE, 20, C('under', 1))
    cv.rect(o + 400, SOLE + 16, 4, 12, C('under', 2)); hl(cv, o + 360, SOLE + 24, 60, C('metal', 4)); hl(cv, o + 360, SOLE + 23, 60, C('under', 1))
    crate(cv, o + 490, SOLE, 46, 18)    # battery box
    for x in range(o + 494, o + 532, 9): hl(cv, x, SOLE + 4, 4, C('under', 1)); cv.put(x + 1, SOLE + 5, C('metal', 2))
    ex0, ex1 = o + 560, o + 776   # engine
    cv.rect(ex0, SOLE, ex1 - ex0, 24, C('under', 3))
    for x in range(ex0, ex1):
        cv.put(x, SOLE, C('under', 1)); cv.put(x, SOLE + 23, C('under', 5))
        if (x - ex0) % 5 == 1: vl(cv, x, SOLE + 3, 14, C('under', 1))
        if (x - ex0) % 5 == 2: vl(cv, x, SOLE + 3, 14, C('under', 4))
    for cx in range(ex0 + 10, ex0 + 130, 20):   # cylinder heads
        cv.rect(cx, SOLE + 1, 14, 5, C('under', 2)); hl(cv, cx, SOLE + 1, 14, C('under', 0)); cv.put(cx + 3, SOLE + 3, C('metal', 2)); cv.put(cx + 10, SOLE + 3, C('metal', 2))
    for x in range(ex0 + 12, ex0 + 130): cv.put(x, SOLE + 7 + ((x // 20) % 2), C('metal', 3))
    cv.rect(ex0 + 14, SOLE + 18, 80, 10, C('under', 4)); hl(cv, ex0 + 14, SOLE + 18, 80, C('under', 2))   # sump
    cv.rect(ex1 - 56, SOLE + 1, 46, 22, C('under', 5))   # radiator
    for y in range(SOLE + 3, SOLE + 21, 2): hl(cv, ex1 - 54, y, 42, C('under', 2))
    vl(cv, ex1 - 56, SOLE + 1, 22, C('under', 1))
    speck(cv, ex0, SOLE, ex1 - ex0, 28, [C('oil', 0), C('rust', 3)], 0.04, 17, test=lambda x, y: cv.get(x, y)[3] > 0)
    crate(cv, ex1 + 6, SOLE + 1, 26, 20)       # final drive
    cv.ellipse(ex1 + 19, SOLE + 11, 5, 5, C('under', 1)); cv.ellipse(ex1 + 19, SOLE + 11, 3, 3, C('under', 4))
    cyl_h(cv, o + 972, SOLE, 96, 18, 'under', 1, 5)   # water tank
    for sx in (o + 990, o + 1044): vl(cv, sx, SOLE, 18, C('under', 5))
    cv.put(ex0 + 50, SOLE + 29, C('oil', 1)); cv.put(ex0 + 50, SOLE + 30, C('oil', 0))
    for side in (0, 1):   # buffer beams, buffers, couplings, hoses
        bx = BX0 - 12 if side == 0 else BX1
        cv.rect(bx, BOT - 3, 12, 15, C('under', 3)); hl(cv, bx, BOT - 3, 12, C('under', 1))
        for dy in (BOT - 2, BOT + 7):
            if side == 0:
                cv.rect(MX, dy, 6, 6, C('metal', 1)); vl(cv, MX, dy, 6, C('metal', 0)); vl(cv, MX + 5, dy, 6, C('metal', 3)); hl(cv, MX, dy + 5, 6, C('metal', 4))
                cv.rect(MX + 6, dy + 1, 4, 4, C('under', 2))
            else:
                cv.rect(W - MX - 6, dy, 6, 6, C('metal', 2)); vl(cv, W - MX - 1, dy, 6, C('metal', 4)); hl(cv, W - MX - 6, dy, 6, C('metal', 1))
                cv.rect(W - MX - 10, dy + 1, 4, 4, C('under', 3))
        cx = BX0 - 8 if side == 0 else BX1 + 6
        for k in range(4): cv.put(cx + (1 if k % 2 else 0), BOT + 13 + k * 2, C('metal', 2)); cv.put(cx, BOT + 14 + k * 2, C('metal', 4))
        for k in range(12): cv.put(cx + (3 if side == 0 else -3), SOLE + k, C('under', 2 if k % 2 else 4))


def bogie(cv, cx):
    y0 = SOLE + 2
    fx0, fx1 = cx - 78, cx + 78
    for x in range(fx0, fx1):
        for y in range(y0, y0 + 20):
            edge = x in (fx0, fx1 - 1)
            i = 1 if y == y0 else (4 if y == y0 + 19 or edge else 3)
            if y == y0 + 1: i = 2
            cv.put(x, y, C('under', i))
        if (x - fx0) % 10 == 5: cv.put(x, y0 + 3, C('under', 1)); cv.put(x, y0 + 4, C('under', 5))
    for hx in (cx - 26, cx + 14):
        cv.rect(hx, y0 + 6, 12, 8, C('under', 5)); hl(cv, hx, y0 + 14, 12, C('under', 2)); vl(cv, hx + 11, y0 + 6, 8, C('under', 4))
    for wx in (cx - 45, cx + 45):
        wy = CONTACT - WHEEL_R
        def wcol(x, y, nx, ny, nz):
            d = math.sqrt(nx * nx + ny * ny)
            if d > 0.86: return C('rust', 2 if nx < 0.2 else 4) if ny > -0.2 else C('rust', 3)
            if d > 0.78: return C('under', 5)
            if d < 0.2: return C('metal', 3) if nx < 0 else C('metal', 4)
            if 0.45 < d < 0.52: return C('under', 4)
            return shade('under', light(nx, ny, nz) * 0.7 + 0.1)
        tmp = Canvas(WHEEL_R * 2 + 3, WHEEL_R * 2 + 3)
        tmp.ellipse(WHEEL_R + 1.5, WHEEL_R + 1.5, WHEEL_R, WHEEL_R, wcol)
        for yy in range(tmp.h):
            for xx in range(tmp.w):
                c = tmp.px[xx, yy]
                X, Y = wx - WHEEL_R - 1 + xx, wy - WHEEL_R - 1 + yy
                if c[3] and (Y >= y0 + 18 or cv.get(X, Y)[3] == 0): cv.put(X, Y, c)
        cv.put(wx - 14, wy + 12, C('rust', 0)); cv.put(wx - 15, wy + 11, C('rust', 1)); cv.put(wx - 13, wy + 13, C('rust', 1))
        cv.rect(wx - 9, y0 + 9, 18, 15, C('under', 2)); hl(cv, wx - 9, y0 + 9, 18, C('under', 0)); vl(cv, wx + 8, y0 + 9, 15, C('under', 4))
        cv.rect(wx - 5, y0 + 13, 10, 8, C('mustard', 2)); hl(cv, wx - 5, y0 + 13, 10, C('mustard', 1)); vl(cv, wx + 4, y0 + 13, 8, C('mustard', 3))
        for (bx, by) in ((wx - 4, y0 + 14), (wx + 3, y0 + 14), (wx - 4, y0 + 19), (wx + 3, y0 + 19)): cv.put(bx, by, C('mustard', 4))
        for k in range(4):
            for sx in (wx - 18, wx + 12):
                hl(cv, sx, y0 + 1 + k * 2, 6, C('metal', 2)); hl(cv, sx, y0 + 2 + k * 2, 6, C('under', 4))
                cv.put(sx, y0 + 1 + k * 2, C('metal', 1))
        for bx in (wx - WHEEL_R - 4, wx + WHEEL_R):   # brake blocks
            cv.rect(bx, y0 + 20, 4, 12, C('rust', 3)); vl(cv, bx, y0 + 20, 12, C('rust', 2)); hl(cv, bx, y0 + 31, 4, C('rust', 4))
    cv.rect(cx - 9, y0 + 3, 18, 16, C('under', 2)); hl(cv, cx - 9, y0 + 3, 18, C('under', 0)); vl(cv, cx + 8, y0 + 3, 16, C('under', 4))
    cv.rect(cx - 6, y0 + 8, 12, 3, C('under', 4))
    for k in range(14): cv.put(cx + 12 + k // 2, y0 + 4 + k, C('metal', 3))   # damper
    hl(cv, cx - 45, y0 + 26, 90, C('metal', 3)); hl(cv, cx - 45, y0 + 27, 90, C('under', 4))   # brake rod
    for gx in (fx0 + 3, fx1 - 6):
        vl(cv, gx, y0 + 18, 20, C('under', 2)); vl(cv, gx + 1, y0 + 18, 20, C('under', 4))
    if cx < W // 2:   # a cobweb (years in the shed)
        for k in range(11):
            cv.put(fx0 - 1 - k // 2, y0 + 1 + k, C('white', 3)); cv.put(fx0 - 1 - k, y0 + 1 + k // 3, C('white', 3))
        for k in range(5): cv.put(fx0 - 3 - k, y0 + 6, C('white', 3))


def build():
    cv = Canvas(W, H)
    roof(cv); bodyside(cv); ends(cv); underframe(cv)
    bogie(cv, WEST_BOGIE); bogie(cv, EAST_BOGIE)
    outline(cv)
    gw = [l for l in layout() if l[0] == 'guardwin'][0]
    points = {
        'pigeon': [(gw[1] + gw[2]) // 2, CANT + 49],
        'cab': [BX0 + 30, CANT + 26], 'cab_east': [BX1 - 30, CANT + 26],
        'bogie_west': [WEST_BOGIE, CONTACT - 12], 'bogie_east': [EAST_BOGIE, CONTACT - 12],
        'brakes': [MX + 452, SOLE + 10], 'engine': [MX + 668, SOLE + 12], 'body': [MX + 980, WAIST - 10],
        'exhaust': [MX + 676, 3],
    }
    nx0, nx1, ny0, ny1 = NAMEPLATE
    text_slots = {'nameplate': [nx0 + 3, ny0 + 3, nx1 - nx0 - 6, ny1 - ny0 - 6],
                  'number_west': list(NUMBER_SLOTS[0]), 'number_east': list(NUMBER_SLOTS[1])}
    return cv, points, text_slots


if __name__ == '__main__':
    cv, pts, ts = build()
    save_png(cv, os.path.join(OUT, 'marjorie.png'))
