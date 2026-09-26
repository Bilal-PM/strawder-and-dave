"""Harrowby station: the building (closed 2009 / restored), the platform canopy and the running-in board."""
from rp import *  # noqa

T = TILE


# ------------------------------------------------------------------ windows and doors

def arch_opening(cx, top, w, spring, bottom):
    """Mask test for a round-headed opening: returns f(x, y)."""
    r = w / 2
    def f(x, y):
        if y >= bottom or x < cx - r or x >= cx + r: return False
        if y >= spring: return True
        dx = (x + 0.5 - cx) / r; dy = (y + 0.5 - spring) / (spring - top)
        return dx * dx + dy * dy <= 1
    return f


def glass(cv, mask, x0, y0, w, h, grime=0.0, seed=1, lit=False):
    """Window glass: deep blue interior, AO at the top, one clean diagonal sky reflection."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if not mask(x, y): continue
            lx, ly = x - x0, y - y0
            i = 3 if ly > 4 else 4
            s = (lx + (h - ly) * 0.5) % 22
            if 4 <= s < 7: i = 1
            elif s in (3, 7) or 8 <= s < 9: i = 2
            if lit: col = C('warm_in', 1 + (1 if ly < 4 else 0) + (0 if i > 2 else -1 if i == 1 else 0))
            else: col = C('glass_dk', i)
            if grime and i > 2 and ly > h * 0.6 and hash01(x // 2, y // 2, seed) < grime * 0.5: col = C('glass_dk', 2)
            P(cv, x, y, col)


def sash_window(cv, cx, top, w, spring, sill, state='glass', paint='paint_cream', seed=1, peel=0.0, lit=False):
    """Round-headed sash window with a stone surround, keystone and projecting sill.
    state: 'glass' | 'boarded' | 'cracked'."""
    r = w // 2; x0 = cx - r
    # stone surround: voussoirs (4px ring) + keystone
    ring = arch_opening(cx, top - 4, w + 8, spring, sill)
    inner = arch_opening(cx, top, w, spring, sill)
    for y in range(top - 5, sill):
        for x in range(x0 - 4, x0 + w + 4):
            if ring(x, y) and not inner(x, y):
                ang = math.atan2(y + 0.5 - spring, x + 0.5 - cx) if y < spring else 0
                if y < spring:
                    k = int((ang + math.pi) / math.pi * 9)
                    edge = abs(((ang + math.pi) / math.pi * 9) - k - 0.5) > 0.42
                    i = 3 if edge else (1 if x < cx else 2)
                else:
                    i = 1 if x < cx else 2
                    if (y - spring) % 12 == 11: i = 3
                P(cv, x, y, C('grit', i))
    # keystone
    for y in range(top - 6, top + 3):
        for x in range(cx - 3, cx + 3):
            P(cv, x, y, C('grit', 0 if x < cx - 1 else (1 if x < cx + 2 else 3)))
    # frame
    for y in range(top, sill):
        for x in range(x0, x0 + w):
            if inner(x, y): P(cv, x, y, C(paint, 2))
    # AO inside the reveal (top and right in shade)
    gx0, gw = x0 + 2, w - 4
    gmask = arch_opening(cx, top + 2, w - 4, spring, sill - 2)
    if state == 'boarded':
        glass(cv, gmask, gx0, top + 2, gw, spring - top, grime=0.5, seed=seed)
        # plywood sheet screwed over the lower opening, a second offcut over the head
        by0 = spring - 3
        for y in range(by0, sill - 1):
            for x in range(x0 - 1, x0 + w + 1):
                lx, ly = x - x0, y - by0
                i = 1 + (1 if hash01(x // 5, y // 2, seed + 3) < 0.15 else 0)
                if ly == 0: i = 0
                if x >= x0 + w - 1: i = 3
                
                col = C('plywood', min(4, i))
                if fbm(x, y, 8, seed + 9) < 0.2 and ly > 3: col = C('plywood', min(4, i + 1))
                P(cv, x, y, col)
        for y in range(by0 + 4, sill - 2, 9):
            for x in (x0 + 2, cx, x0 + w - 3): P(cv, x, y, C('iron', 1)); P(cv, x + 1, y, C('iron', 3))
        HL(cv, x0 - 1, x0 + w + 1, sill - 1, C('plywood', 4))
        # joint between two sheets
        VL(cv, cx + 3, by0 + 1, sill - 1, C('plywood', 3))
    else:
        glass(cv, gmask, gx0, top + 2, gw, sill - top - 4, grime=0.35 if state != 'clean' and not lit else 0.0,
              seed=seed, lit=lit)
        # glazing: 2-over-2 sashes; meeting rail at the spring line + 8
        mr = spring + 10
        HL(cv, x0 + 1, x0 + w - 1, mr, C(paint, 1)); HL(cv, x0 + 1, x0 + w - 1, mr + 1, C(paint, 2))
        HL(cv, x0 + 1, x0 + w - 1, mr + 2, C(paint, 3))
        for y in range(top + 1, sill - 1):
            if gmask(cx, y) or y > spring: P(cv, cx, y, C(paint, 1)); P(cv, cx - 1, y, C(paint, 2))
        HL(cv, x0 + 1, x0 + w - 1, sill - 2, C(paint, 1))
        if state == 'cracked':
            for k, (a, b) in enumerate([(3, 0), (4, 1), (5, 3), (7, 4), (8, 6), (6, 2), (2, 2), (1, 3)]):
                P(cv, cx + 3 + a, mr + 5 + b, C('white', 0))
        if peel:
            for y in range(top, sill):
                for x in range(x0, x0 + w):
                    if not inner(x, y) or gmask(x, y) and not (x in (cx, cx - 1)): continue
                    if hash01(x, y, seed + 17) < peel: P(cv, x, y, C('wood_dark', 1))
        # AO: reveal shadow on the top-right
        for y in range(top + 2, sill - 2):
            for x in range(gx0, gx0 + gw):
                if gmask(x, y) and (not gmask(x, y - 3) or x >= gx0 + gw - 2): dark(cv, x, y, 0.35)
    # projecting sill
    R(cv, x0 - 5, sill, w + 10, 2, C('grit', 1)); HL(cv, x0 - 5, x0 + w + 5, sill, C('grit', 0))
    R(cv, x0 - 5, sill + 2, w + 10, 2, C('grit', 3))
    ao_band(cv, x0 - 5, sill + 4, w + 10, (0.35, 0.18))


def poster(cv, x0, y0, w, h, faded=False, seed=1, torn=False, scene=0):
    """Framed railway poster: a textless travel-poster landscape."""
    R(cv, x0, y0, w, h, C('paint_green', 3)); HL(cv, x0, x0 + w, y0, C('paint_green', 1)); VL(cv, x0, y0, y0 + h, C('paint_green', 2))
    HL(cv, x0, x0 + w, y0 + h - 1, C('paint_green', 4))
    ix, iy, iw, ih = x0 + 2, y0 + 2, w - 4, h - 4
    def put(x, y, col):
        if faded: col = tuple(int(col[i] * 0.55 + hexrgb('#eadcb3')[i] * 0.45) for i in range(3)) + (255,)
        P(cv, x, y, col)
    for y in range(iy, iy + ih):
        for x in range(ix, ix + iw):
            ly = (y - iy) / ih; lx = (x - ix) / iw
            hill = 0.55 + 0.12 * math.sin(lx * 5 + seed) + 0.05 * math.sin(lx * 13 + seed * 2)
            hill2 = 0.7 + 0.08 * math.sin(lx * 3 + 1 + seed)
            if ly < 0.12: col = C('paint_cream', 1)                       # blank title band
            elif ly > 0.86: col = C('paint_cream', 1)                     # blank footer band
            elif ly > hill2: col = C('grass', 2 if scene == 0 else 1)
            elif ly > hill: col = C('forest', 1 if lx < 0.5 else 2)
            else:
                col = C('paint_blue', 0 if ly < 0.3 else 1) if scene == 0 else C('mustard', 0 if ly < 0.35 else 1)
            put(x, y, col)
    # sun / viaduct motif
    c = Canvas(1, 1)
    sx, sy = ix + int(iw * 0.72), iy + int(ih * 0.3)
    for y in range(sy - 3, sy + 4):
        for x in range(sx - 3, sx + 4):
            if (x - sx) ** 2 + (y - sy) ** 2 <= 9: put(x, y, C('flower_yel', 0))
    vy = iy + int(ih * 0.62)
    for x in range(ix + 2, ix + iw - 2):
        put(x, vy, C('grit', 3))
        if (x - ix) % 5 in (0, 4): put(x, vy + 1, C('grit', 3)); put(x, vy + 2, C('grit', 3))
    if torn:
        for k in range(6):
            for j in range(6 - k): P(cv, x0 + w - 2 - j, y0 + h - 2 - k, C('paint_cream', 2 if j else 3))
    # glass glint
    P(cv, ix + 1, iy + 1, C('white', 0)); P(cv, ix + 2, iy + 1, C('white', 1))


def panel_doors(cv, x0, y0, w, h, paint='paint_green', seed=1, weathered=0.0, notice=True, chain=True):
    """Pair of four-panel doors."""
    lw = w // 2
    for leaf in range(2):
        lx0 = x0 + leaf * lw
        for y in range(y0, y0 + h):
            for x in range(lx0, lx0 + lw):
                u, v = x - lx0, y - y0
                i = 2
                inpanel = False
                for (px, py, pw, ph) in ((3, 4, lw - 6, h // 2 - 7), (3, h // 2 + 2, lw - 6, h // 2 - 6)):
                    if px <= u < px + pw and py <= v < py + ph:
                        inpanel = True
                        if u == px or v == py: i = 3          # moulding in shade (top-left of a recessed panel)
                        elif u == px + pw - 1 or v == py + ph - 1: i = 1
                        else: i = 2
                if not inpanel:
                    i = 1 if u < 2 else 2
                    if u == lw - 1: i = 4
                if weathered and fbm(x, y, 4, seed) < weathered: col = C('wood_dark', 1 + (1 if hash01(x, y, 3) < 0.3 else 0))
                else: col = C(paint, i)
                P(cv, x, y, col)
        # letterbox / handles
    hx = x0 + lw
    for dy in range(h // 2 - 2, h // 2 + 3): P(cv, hx - 3, y0 + dy, C('gold', 1)); P(cv, hx + 2, y0 + dy, C('gold', 2))
    VL(cv, hx, y0, y0 + h, C(paint, 4)); VL(cv, hx - 1, y0, y0 + h, C(paint, 3))
    if chain:
        for k in range(10):
            xx = hx - 5 + k; yy = y0 + h // 2 + 1 + int(1.5 * math.sin(k / 9 * math.pi))
            P(cv, xx, yy, C('metal', 2 if k % 2 else 1)); P(cv, xx, yy + 1, C('metal', 4))
        R(cv, hx - 2, y0 + h // 2 + 3, 5, 5, C('mustard', 2)); HL(cv, hx - 2, hx + 3, y0 + h // 2 + 3, C('mustard', 0))
        P(cv, hx - 1, y0 + h // 2 + 2, C('metal', 2)); P(cv, hx + 1, y0 + h // 2 + 2, C('metal', 2))
        P(cv, hx + 2, y0 + h // 2 + 5, C('mustard', 3)); P(cv, hx, y0 + h // 2 + 5, C('mustard', 4))
    if notice:  # blank paper notice on the right leaf (the game letters "Station temporarily closed · 2009")
        nx, ny = hx + 3, y0 + 8
        R(cv, nx, ny, 16, 12, C('paint_cream', 0)); HL(cv, nx, nx + 16, ny + 11, C('paint_cream', 2))
        VL(cv, nx + 15, ny, ny + 12, C('paint_cream', 2)); P(cv, nx + 15, ny + 11, C('paint_cream', 3))
        P(cv, nx + 1, ny + 1, C('flower_red', 1)); P(cv, nx + 14, ny + 1, C('flower_red', 1))
        for k in range(3): P(cv, nx + 13 + k, ny + 11 - k, C('paint_cream', 1))


def valance(cv, x0, x1, y, depth, paint='paint_cream', seed=1, broken=()):
    """Timber dagger-board valance: 4px boards with pointed ends."""
    for x in range(x0, x1):
        k = (x - x0) // 4; u = (x - x0) % 4
        if k in broken: continue
        tip = depth if u in (1, 2) else depth - 2
        for v in range(tip):
            i = 1 if u == 1 else (2 if u in (0, 2) else 3)
            if v == tip - 1: i += 1
            P(cv, x, y + v, C(paint, min(4, i)))
        if u == 3 or k in broken: pass
    HL(cv, x0, x1, y, C(paint, 0))


def clock(cv, cx, cy, r, h1=-2.2, h2=0.5, rim='iron'):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r + 0.5:
                if d > r - 1.5: P(cv, x, y, C(rim, 1 if (x < cx and y < cy) else 3))
                else: P(cv, x, y, C('paint_cream', 0 if (x - cx) + (y - cy) < -2 else 1))
    for k in range(12):  # hour ticks (no numerals)
        a = k / 12 * 6.283
        P(cv, cx + math.sin(a) * (r - 2.6), cy - math.cos(a) * (r - 2.6), C('iron', 3))
    for (a, L) in ((h1, r * 0.5), (h2, r * 0.78)):
        for s in range(int(L * 2) + 1):
            t = s / 2; P(cv, cx + math.sin(a) * t, cy - math.cos(a) * t, C('iron', 4))
    P(cv, cx, cy, C('paint_red', 2))
    P(cv, cx - r * 0.5, cy - r * 0.5, C('white', 0))


# ------------------------------------------------------------------ the building

W, FH, OV = 14 * T, 6 * T, 24          # 448 x 192 footprint, 24px of chimney above it
H = FH + OV                            # 216
RIDGE, EAVE, PLINTH, BASE = 50, 112, 204, H
DOORX = 6 * T                          # door tiles at map cols 18-19 (building x0 = 12)
DCX = DOORX + T                        # 224, door centre
WINS = [50, 116, 332, 398]
GX0, GX1, GAPEX = DCX - 58, DCX + 58, 64    # cross-gable over the entrance


def station(live=False):
    seed = 11
    cv = Canvas(W, H)
    # ---- main roof: north slope (lit, foreshortened) + south slope
    nmask = lambda x, y: 7 <= x < W - 7
    slates(cv, nmask, 0, OV + 2, W, RIDGE - 2, RIDGE - 2, ch=3, sw=9, base=1, seed=seed, moss=0 if live else 0.55,
           lichen=0 if live else 0.6, fresh=live)
    miss = set() if live else {(12, 5), (13, 5), (33, 9), (41, 12), (40, 12)}
    slates(cv, nmask, 0, RIDGE + 2, W, EAVE, EAVE, ch=4, sw=9, base=2, seed=seed + 1, moss=0.08 if live else 0.3,
           lichen=0.1 if live else 0.8, missing=miss, fresh=live)
    # roof lit falloff: the south slope darkens slightly towards the eaves-right (one light from upper-left)
    for y in range(RIDGE + 2, EAVE):
        for x in range(7, W - 7):
            if x > W * 0.72 and hash01(x, y, 4) < (x - W * 0.72) / (W * 0.28) * 0.5: dark(cv, x, y, 0.12)
    # ridge tiles
    for x in range(7, W - 7):
        seg = (x - 7) % 14
        cols = [O, C('slate', 0), C('slate', 1), C('slate', 2), C('slate', 3), C('slate', 4), O]
        for k, c in enumerate(cols): P(cv, x, RIDGE - 2 + k, c)
        if seg == 0: VL(cv, x, RIDGE - 1, RIDGE + 2, C('slate', 4))
        elif seg in (1, 2): P(cv, x, RIDGE - 1, C('slate', 0))
    ao_band(cv, 7, RIDGE + 5, W - 14, (0.35, 0.2, 0.1))
    # gable-end coping + kneelers
    for (gx, side) in ((0, 0), (W - 7, 1)):
        for y in range(OV + 2, EAVE + 2):
            for x in range(gx, gx + 7):
                u = x - gx
                i = (1 if u < 2 else 2) if side == 0 else (1 if u < 3 else 3)
                if (y - OV) % 13 == 12: i = 3
                if u == (6 if side == 0 else 0): i = 4 if side == 0 else 2
                P(cv, x, y, C('grit', i))
        R(cv, gx - (0 if side == 0 else 3), EAVE - 6, 10, 9, C('grit', 1 if side == 0 else 2))
        HL(cv, gx - (0 if side == 0 else 3), gx + 10 - (0 if side == 0 else 3), EAVE - 6, C('grit', 0))
        HL(cv, gx - (0 if side == 0 else 3), gx + 10 - (0 if side == 0 else 3), EAVE + 2, C('grit', 4))
    # ---- walls
    ashlar(cv, 0, EAVE, W, PLINTH - EAVE, 'grit', seed + 2, ch=8, soot=0 if live else 0.5)
    # quoins (alternating long/short dressed blocks) at both corners
    for k, y in enumerate(range(EAVE + 2, PLINTH, 12)):
        L = 16 if k % 2 == 0 else 10
        for (qx, fl) in ((0, 0), (W - L, 1)):
            for yy in range(y, min(y + 12, PLINTH)):
                for xx in range(qx, qx + L):
                    u, v = xx - qx, yy - y
                    i = 1 if fl == 0 else 2
                    if v == 0: i -= 1
                    if v == 11 or (fl == 0 and u == L - 1) or (fl == 1 and u == 0): i = 3
                    if hash01(xx, yy, 77) < 0.06: i += 1
                    P(cv, xx, yy, C('grit', max(0, i)))
    # plinth: bigger, darker blocks with a chamfered top
    ashlar(cv, 0, PLINTH, W, BASE - PLINTH, 'grit', seed + 3, ch=6, bmin=16, bmax=28, base=(2, 3),
           soot=0 if live else 0.7, joint=4)
    HL(cv, 0, W, PLINTH - 1, C('grit', 0)); HL(cv, 0, W, PLINTH, C('grit', 3))
    # sill band
    for x in range(0, W):
        P(cv, x, 186, C('grit', 0)); P(cv, x, 187, C('grit', 1)); P(cv, x, 188, C('grit', 2)); P(cv, x, 189, C('grit', 3))
    ao_band(cv, 0, 190, W, (0.28, 0.12))
    # ---- cross gable over the entrance (stone face, fretted bargeboards, clock)
    def in_gable(x, y):
        if y >= EAVE + 1 or x < GX0 or x >= GX1: return False
        return y >= GAPEX + abs(x + 0.5 - DCX) * (EAVE - GAPEX) / (DCX - GX0)
    # small roof wedge behind the bargeboards (valleys into the main roof)
    def in_wedge(x, y):
        if x < GX0 - 2 or x >= GX1 + 2: return False
        top = GAPEX - 12 + abs(x + 0.5 - DCX) * (EAVE - GAPEX + 12) / (DCX - GX0 + 2)
        return top <= y and not in_gable(x, y) and y < EAVE
    for y in range(GAPEX - 14, EAVE):
        for x in range(GX0 - 2, GX1 + 2):
            if in_wedge(x, y):
                d = GAPEX - 12 + abs(x + 0.5 - DCX) * (EAVE - GAPEX + 12) / (DCX - GX0 + 2)
                u = int((y - d) / 3)
                i = (1 if x < DCX else 3) + (1 if (y - int(d)) % 3 == 2 else 0)
                P(cv, x, y, C('slate', min(4, i)))
    # cross ridge
    for y in range(GAPEX - 13, GAPEX + 1): P(cv, DCX - 1, y, C('slate', 1)); P(cv, DCX, y, C('slate', 3))
    ashlar(cv, GX0, GAPEX, GX1 - GX0, EAVE - GAPEX + 2, 'grit', seed + 5, ch=8, mask=in_gable, soot=0 if live else 0.3)
    # bargeboards (5px), with fretwork and a finial
    bb = 'paint_cream' if live else 'paint_cream'
    for x in range(GX0 - 3, GX1 + 3):
        yt = GAPEX + abs(x + 0.5 - DCX) * (EAVE - GAPEX) / (DCX - GX0) - 2
        for v in range(6):
            i = 0 if v == 0 else (1 if v < 3 else (2 if v < 5 else 3))
            if x > DCX: i += 1
            col = C(bb, min(4, i))
            if not live and hash01(x, int(yt) + v, 5) < 0.22: col = C('wood_dark', 1)
            P(cv, x, yt + v, col)
        if (x - GX0) % 6 == 3: P(cv, x, yt + 3, C('wood_dark', 3))     # fretted holes
        P(cv, x, yt + 6, C('grit', 4))
    for y in range(GAPEX - 16, GAPEX + 2):
        P(cv, DCX - 1, y, C(bb, 1)); P(cv, DCX, y, C(bb, 2))
    R(cv, DCX - 2, GAPEX - 12, 4, 3, C(bb, 1)); P(cv, DCX - 1, GAPEX - 17, C(bb, 0))
    # clock roundel in the gable
    ccy = 92
    for y in range(ccy - 16, ccy + 17):
        for x in range(DCX - 16, DCX + 17):
            d = math.hypot(x + 0.5 - DCX, y + 0.5 - ccy)
            if 12 < d <= 15.5:
                k = int((math.atan2(y - ccy, x - DCX) + math.pi) / math.pi * 8)
                P(cv, x, y, C('grit', 1 if x < DCX - 3 else (2 if x < DCX + 4 else 3)) if (k % 2 or d < 15) else C('grit', 3))
    clock(cv, DCX, ccy, 12, h1=(-2.2 if not live else 3.6), h2=(0.5 if not live else 0.0))
    if not live:  # clock stopped, grimy face
        for y in range(ccy - 10, ccy + 11):
            for x in range(DCX - 10, DCX + 11):
                if math.hypot(x - DCX, y - ccy) < 10 and fbm(x, y, 4, 91) < 0.3: dark(cv, x, y, 0.18)
    # ---- eaves gutter + AO
    for x in range(0, W):
        if in_gable(x, EAVE - 1) and GX0 + 4 < x < GX1 - 4: continue
        P(cv, x, EAVE, C('iron', 1)); P(cv, x, EAVE + 1, C('iron', 2)); P(cv, x, EAVE + 2, C('iron', 3)); P(cv, x, EAVE + 3, C('iron', 4))
        if x % 40 == 20: VL(cv, x, EAVE + 4, EAVE + 7, C('iron', 3))
    ao_band(cv, 0, EAVE + 4, W, (0.45, 0.3, 0.18, 0.08), mask=lambda x, y: not (GX0 + 6 < x < GX1 - 6))
    if not live:  # buddleia-free, but the gutter sprouts a tuft of grass
        for k in range(9):
            P(cv, 300 + k, EAVE - 1 - (k % 3), C('moss', 1 + k % 3)); P(cv, 301 + k, EAVE - 2 - (k % 2), C('grass', 2))
    # ---- windows
    states = ['glass', 'boarded', 'boarded', 'cracked'] if not live else ['glass'] * 4
    for k, cx in enumerate(WINS):
        sash_window(cv, cx, 128, 26, 142, 184, state=states[k], seed=seed + 20 + k, peel=0 if live else 0.14,
                    lit=False)
        if not live:  # soot / rain streaks under the sill
            for s in range(3):
                sx = cx - 10 + int(hash01(k, s, 5) * 20)
                for y in range(190, 190 + 6 + int(hash01(k, s, 6) * 10)): dark(cv, sx, y, 0.16)
    # ---- entrance: door surround, fanlight, doors, step
    dx0, dx1, dtop, dbot = DCX - 24, DCX + 24, 150, 210
    for y in range(dtop - 5, dbot):
        for x in range(dx0 - 5, dx1 + 5):
            if dx0 <= x < dx1 and y >= dtop: continue
            u = x - (dx0 - 5)
            i = 1 if x < DCX else 2
            if y < dtop: i = 0 if y == dtop - 5 else (1 if x < DCX else 2)
            if x in (dx0 - 1, dx1) : i = 3
            P(cv, x, y, C('grit', i))
    # fanlight
    glass(cv, lambda x, y: True, dx0 + 1, dtop, 46, 10, grime=0.4 if not live else 0, seed=5)
    for x in range(dx0 + 1, dx1 - 1, 6): VL(cv, x, dtop, dtop + 10, C('paint_cream', 2))
    HL(cv, dx0, dx1, dtop + 10, C('paint_cream', 1)); HL(cv, dx0, dx1, dtop + 11, C('paint_cream', 3))
    panel_doors(cv, dx0, dtop + 12, 48, dbot - dtop - 12, paint='paint_green', seed=9, weathered=0 if live else 0.12,
                notice=not live, chain=not live)
    ao_band(cv, dx0, dtop + 12, 48, (0.35, 0.2))
    for y in range(dtop, dbot): dark(cv, dx1 - 1, y, 0.3)
    # stone step
    R(cv, dx0 - 8, dbot, 64, 6, C('grit', 2)); HL(cv, dx0 - 8, dx0 + 56, dbot, C('grit', 0))
    HL(cv, dx0 - 8, dx0 + 56, dbot + 1, C('grit', 1))
    for x in range(dx0 - 8, dx0 + 56):
        if hash01(x, 3, 8) < 0.2: P(cv, x, dbot + 3, C('grit', 3))
    if not live:
        for x in range(dx0 - 4, dx0 + 50):  # worn hollow in the middle of the step
            if abs(x - DCX) < 14: P(cv, x, dbot + 2, C('grit', 3))
    # ---- posters
    poster(cv, 146, 150, 24, 32, faded=not live, seed=2, torn=not live, scene=0)
    poster(cv, 278, 150, 24, 32, faded=not live, seed=5, torn=False, scene=1)
    # ---- entrance awning: roof strip, fascia (blank for "HARROWBY"), dagger valance, iron brackets, lamp
    ax0, ax1 = DCX - 54, DCX + 54
    for y in range(120, 128):
        for x in range(ax0, ax1):
            v = y - 120; i = 1 if v < 2 else 2
            if (x - ax0) % 10 == 0: i = 3
            if v == 0: i = 0
            P(cv, x, y, C('lead' if v < 2 else 'slate', i))
    ao_band(cv, ax0 + 2, 118, ax1 - ax0 - 4, (0.3, 0.2), down=False)
    fp = 'paint_green'
    for y in range(128, 140):
        for x in range(ax0, ax1):
            v = y - 128; i = 2
            if v == 0: i = 0
            elif v == 1: i = 1
            elif v == 11: i = 4
            elif x == ax0: i = 1
            elif x == ax1 - 1: i = 4
            col = C(fp, i)
            if not live and hash01(x, y, 12) < 0.05: col = C(fp, 3)
            P(cv, x, y, col)
    # the blank lettering panel
    SIGN = (ax0 + 6, 130, ax1 - ax0 - 12, 8)
    sx, sy, sw, sh = SIGN
    R(cv, sx, sy, sw, sh, C('paint_cream', 1 if live else 2)); HL(cv, sx, sx + sw, sy, C('paint_cream', 0))
    HL(cv, sx, sx + sw, sy + sh - 1, C('paint_cream', 3))
    if not live:
        for x in range(sx, sx + sw):
            for y in range(sy, sy + sh):
                if fbm(x, y, 5, 44) < 0.2: P(cv, x, y, C('paint_cream', 3))
    valance(cv, ax0, ax1, 140, 7, paint='paint_cream', seed=3, broken=() if live else (6, 17))
    ao_band(cv, ax0, 146, ax1 - ax0, (0.35, 0.22, 0.1), mask=lambda x, y: not (dx0 <= x < dx1 and y >= dtop + 12))
    for (bx, fl) in ((ax0 + 2, False), (ax1 - 16, True)):
        iron_bracket(cv, bx, 140, 14, 16, flip=fl, rp='iron')
    # hanging lamp
    VL(cv, DCX, 147, 151, C('iron', 2))
    R(cv, DCX - 3, 151, 7, 2, C('iron', 1)); R(cv, DCX - 3, 153, 7, 6, C('iron', 3))
    R(cv, DCX - 2, 154, 5, 4, C('lamp_glow', 2) if live else C('glass_dk', 2)); P(cv, DCX - 2, 154, C('white', 0))
    HL(cv, DCX - 2, DCX + 3, 159, C('iron', 2))
    # ---- drainpipes
    drainpipe(cv, 22, EAVE + 3, PLINTH + 6); drainpipe(cv, W - 26, EAVE + 3, PLINTH + 6)
    # ---- planters by the doors
    half_barrel(cv, dx0 - 26, BASE, seed=4, flowers=('flower_red', 'flower_wht') if live else ('flower_red', 'flower_yel'))
    half_barrel(cv, dx1 + 12, BASE, seed=7, flowers=('flower_pur', 'flower_yel'))
    # ---- ivy up the west corner (kept trimmed once restored)
    top = 132 if live else 104
    for k in range(0, 34):
        y = BASE - 4 - k * (BASE - top) / 34
        x = 6 + 7 * math.sin(k * 0.55) + (k % 5)
        leaf_cluster(cv, x, y, 5 + (k % 3), 'ivy', 60 + k, 0.8)
    if not live:
        for k in range(8): leaf_cluster(cv, 30 + k * 4, EAVE + 2 + (k % 2) * 3, 4, 'ivy', 90 + k, 0.7)
    # moss + weeds at the foot of the wall
    for x in range(0, W):
        if fbm(x, 1, 12, 33) > (0.55 if not live else 0.75):
            for y in range(BASE - 3, BASE):
                if hash01(x, y, 34) < 0.6: P(cv, x, y, C('moss', 1 + int(hash01(x, y, 35) * 3)))
    if not live:
        for (wx, h_) in ((96, 9), (104, 6), (372, 8), (360, 5)):
            for k in range(h_):
                P(cv, wx + int(math.sin(k) * 1.5), BASE - 1 - k, C('grass', 2 + (k % 2)))
                if k % 3 == 0: P(cv, wx + 2, BASE - 1 - k, C('leaf', 1)); P(cv, wx - 2, BASE - 2 - k, C('leaf', 2))
    # ---- chimneys (drawn after the roof; cast shadows onto the slope)
    for cxs in (80, W - 104):
        sw_, top_ = 26, 8
        # shadow on the roof down-right
        for y in range(RIDGE, RIDGE + 22):
            for x in range(cxs + sw_, cxs + sw_ + 10 - (y - RIDGE) // 3):
                if opaque(cv, x, y): dark(cv, x, y, 0.3)
        for y in range(top_, RIDGE + 6):
            for x in range(cxs, cxs + sw_):
                u = x - cxs; i = 1 if u < 3 else (2 if u < sw_ - 5 else 3)
                if (y - top_) % 7 == 6: i += 1
                if u in (7, 16) and (y - top_) % 14 < 7: i += 1
                if hash01(x, y, 21) < 0.08: i += 1
                if not live and y < top_ + 14 and fbm(x, y, 5, 22) < 0.5: i += 1
                P(cv, x, y, C('grit', min(5, i)))
        # oversailing cap
        R(cv, cxs - 2, top_ - 1, sw_ + 4, 4, C('grit', 1)); HL(cv, cxs - 2, cxs + sw_ + 2, top_ - 1, C('grit', 0))
        HL(cv, cxs - 2, cxs + sw_ + 2, top_ + 3, C('grit', 4))
        # lead flashing where it meets the roof
        HL(cv, cxs - 1, cxs + sw_ + 1, RIDGE + 6, C('lead', 1)); HL(cv, cxs - 1, cxs + sw_ + 1, RIDGE + 7, C('lead', 3))
        # pots
        for (px_, capped) in ((cxs + 4, False), (cxs + 15, not live)):
            for y in range(top_ - 9, top_ - 1):
                for x in range(px_, px_ + 7):
                    u = x - px_; i = 1 if u < 2 else (2 if u < 5 else 3)
                    if y == top_ - 9: i = 0
                    P(cv, x, y, C('terracotta', i))
            R(cv, px_ + 1, top_ - 10, 5, 1, C('terracotta', 1))
            if capped: R(cv, px_ - 1, top_ - 12, 9, 2, C('iron', 2)); HL(cv, px_ - 1, px_ + 8, top_ - 12, C('iron', 0))
            else: R(cv, px_ + 2, top_ - 10, 3, 1, C('interior', 3))
        outline_where(cv, lambda x, y: y < RIDGE - 2 and cxs - 4 <= x <= cxs + sw_ + 4)
    # ---- finishing: selective outline
    sel_outline(cv, k=0.72, ridge_rows=[], base_rows=[BASE - 1])
    lights = [[DCX, 156, 34]] + ([[cx, 160, 16] for cx in WINS] if live else [])
    info = dict(sign={'fascia': list(SIGN), 'notice': [DCX + 3, 170, 16, 12] if not live else None},
                lights=lights)
    return cv, info


# ------------------------------------------------------------------ the platform canopy (separate object: fades)

CAN_COLS = 12
CW, CH = CAN_COLS * T, 90


def canopy(live=False):
    cv = Canvas(CW, CH)
    RT, RB = 0, 40          # roof top/bottom rows
    # roof: slate with a glazed band (patent glazing on iron bars)
    slates(cv, lambda x, y: True, 0, RT + 3, CW, RB, RB, ch=4, sw=9, base=2, seed=71, moss=0.05 if live else 0.4,
           lichen=0 if live else 0.6, fresh=live, missing=set() if live else {(9, 2), (30, 6)})
    broken = set() if live else {3, 7, 8, 15}
    for y in range(RT + 12, RT + 26):
        for x in range(4, CW - 4):
            pane = (x - 4) // 16; u = (x - 4) % 16; v = y - (RT + 12)
            if u in (0, 1):
                P(cv, x, y, C('iron', 1 if u == 0 else 3)); continue
            if pane in broken and hash01(pane, v, 3) < (0.9 if v > 3 else 0.2):
                P(cv, x, y, C('interior', 2 + (1 if u > 12 else 0)))   # missing pane: dark gap
                continue
            s = u - v * 0.7
            i = 1 if 3 < (s % 12) < 6 else 2
            if v == 0: i = 0
            col = C('glass', i)
            if not live and fbm(x, y, 6, 72) < 0.35: col = C('moss', 3) if hash01(x, y, 73) < 0.4 else C('grit', 2)
            P(cv, x, y, col)
    HL(cv, 4, CW - 4, RT + 11, C('lead', 1)); HL(cv, 4, CW - 4, RT + 26, C('lead', 3))
    # far (north) edge: gutter + lead flashing
    for x in range(CW):
        P(cv, x, RT, O); P(cv, x, RT + 1, C('iron', 1)); P(cv, x, RT + 2, C('iron', 3))
    # front fascia + valance
    fp = 'paint_green'
    for y in range(RB, RB + 6):
        for x in range(CW):
            v = y - RB; i = [0, 1, 2, 2, 3, 4][v]
            col = C(fp, i)
            if not live and hash01(x, y, 74) < 0.06: col = C('wood_dark', 2)
            P(cv, x, y, col)
    valance(cv, 0, CW, RB + 6, 10, paint='paint_cream', seed=5, broken=set() if live else {11, 12, 40, 67, 68, 69})
    ends = []
    # columns + spandrel brackets
    cols = [16 + 64 * k for k in range(6)]
    for cx in cols:
        top, bot = RB + 6, CH - 1
        for y in range(top, bot):
            for x in range(cx - 2, cx + 2):
                u = x - (cx - 2); i = [1, 1, 2, 3][u]
                P(cv, x, y, C('paint_green' if live else 'paint_green', i + (1 if not live and hash01(x, y, 75) < 0.1 else 0)))
            if (y - top) % 9 == 0: HL(cv, cx - 2, cx + 2, y, C('paint_green', 0))
        # capital + base
        R(cv, cx - 4, top, 8, 3, C('paint_green', 1)); HL(cv, cx - 4, cx + 4, top, C('paint_green', 0))
        R(cv, cx - 4, bot - 5, 8, 5, C('paint_green', 2)); HL(cv, cx - 4, cx + 4, bot - 5, C('paint_green', 0))
        HL(cv, cx - 4, cx + 4, bot, O)
        iron_bracket(cv, cx + 2, top, 18, 16, flip=False, rp='paint_green')
        iron_bracket(cv, cx - 20, top, 18, 16, flip=True, rp='paint_green')
    # hanging station clock (double-sided) between columns 2 and 3 + two lamps
    ccx = (cols[2] + cols[3]) // 2
    VL(cv, ccx, RB + 12, RB + 18, C('iron', 2))
    clock(cv, ccx, RB + 27, 9, h1=(-2.2 if not live else 3.2), h2=(0.5 if not live else 5.8))
    for lx in ((cols[0] + cols[1]) // 2, (cols[4] + cols[5]) // 2):
        VL(cv, lx, RB + 12, RB + 20, C('iron', 2))
        R(cv, lx - 4, RB + 20, 9, 2, C('iron', 1)); R(cv, lx - 3, RB + 22, 7, 8, C('iron', 3))
        R(cv, lx - 2, RB + 23, 5, 6, C('lamp_glow', 2) if live else C('glass_dk', 2)); P(cv, lx - 2, RB + 23, C('white', 0))
        R(cv, lx - 3, RB + 30, 7, 1, C('iron', 2)); P(cv, lx, RB + 31, C('iron', 3))
    if not live:  # a pigeon-friendly nest on one bracket, a hanging tendril of ivy
        for k in range(7): P(cv, cols[4] + 4 + k, RB + 7 + (k % 2), C('thatch', 2 + k % 2))
        for k in range(12): P(cv, 300 + (k % 3 == 0), RB + 16 + k, C('ivy', 2 + k % 2))
    sel_outline(cv, k=0.72)
    lights = [[(cols[0] + cols[1]) // 2, RB + 26, 30], [(cols[4] + cols[5]) // 2, RB + 26, 30]] if live else []
    return cv, dict(lights=lights, columns=cols)


# ------------------------------------------------------------------ running-in board (blank; the game letters it)

def running_in(live=False):
    w, h = 3 * T, 54
    cv = Canvas(w, h)
    bx0, by0, bw, bh = 0, 0, w, 24
    for y in range(by0, by0 + bh):
        for x in range(bx0, bx0 + bw):
            u, v = x - bx0, y - by0
            edge = u < 3 or v < 3 or u >= bw - 3 or v >= bh - 3
            if edge:
                i = 1 if (u < 1 or v < 1) else (3 if (u >= bw - 1 or v >= bh - 1) else 2)
                P(cv, x, y, C('paint_green', i))
            else:
                i = 1
                if v == 3: i = 2
                col = C('paint_cream', i if live else i + (1 if fbm(x, y, 5, 81) < 0.3 else 0))
                P(cv, x, y, col)
    for lx in (14, w - 16):
        for y in range(bh, h):
            for x in range(lx, lx + 4):
                u = x - lx; P(cv, x, y, C('paint_green', [1, 2, 3, 4][u]))
        R(cv, lx - 1, h - 3, 6, 3, C('grit', 2)); HL(cv, lx - 1, lx + 5, h - 3, C('grit', 1))
    if not live:
        for k in range(6): P(cv, 4 + k * 2, bh + (k % 2), C('rust', 2))    # rust bleeding from bolts
        for x in range(5, bw - 5, 11): P(cv, x, 5, C('rust', 1)); P(cv, x, 6, C('rust', 3))
    sel_outline(cv, k=0.7, base_rows=[h - 1])
    outline(cv)
    return cv, dict(sign={'face': [3, 3, bw - 6, bh - 6]})
