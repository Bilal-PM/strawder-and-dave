"""The project site office: a two-storey cabin interior, 20x12 tiles at 48 art px per tile.
Worn carpet tiles, laminate wall panels, venetian blinds, the planning board (normal and 'planned'), kettle counter,
PPE lockers, meeting table, Steve's desk, plan chest and the sign-in desk."""
from ilib import *
import shed as SH

T = TILE
TW, TH = 20, 12
W, H = TW * T, TH * T
WALL_H = 2 * T
EXIT_X = 9 * T
SEED = 2024
STICKY = ['sticky_y', 'sticky_p', 'sticky_b', 'sticky_g', 'sticky_o']


# ------------------------------------------------------------------ floor
def floor():
    cv = Canvas(W, H); px = cv.px
    cp = [C('carpet', i) for i in range(6)]
    vi = [C('vinyl', i) for i in range(5)]
    for y in range(H):
        for x in range(W):
            tx, ty = x // T, y // T
            lx, ly = x % T, y % T
            if tx <= 3 and ty <= 4:   # vinyl by the kettle (easy to mop)
                i = 1 if hash01(x // 3, y // 3, 5) > 0.2 else 2
                if fbm(x, y, 12, 7, 2) > 0.66: i = 2
                if (x - T) % (T // 2) == 0 and x >= T: i = 3       # vinyl tile joints
                if y % (T // 2) == 0: i = 3
                px[x, y] = vi[i]; continue
            quarter = (tx + ty) % 2                                # carpet tiles laid quarter-turned
            pile = (lx if quarter else ly)
            i = 2
            if pile % 3 == 0: i = 3 if hash01(x, y, 3) < 0.5 else 2
            n = hash01(x, y, SEED)
            if n < 0.06: i = 3
            elif n > 0.95: i = 1
            tone = hash01(tx, ty, SEED + 1)
            if tone < 0.18: i = min(5, i + (1 if hash01(x, y, 4) < 0.5 else 0))
            # a worn, flattened path: door -> table -> board, and to the kettle
            wear = min(dist_path(x, y), 99)
            if wear < 34 and hash01(x, y, 9) < (1 - wear / 34) * 0.7: i = 1
            if lx == 0 or ly == 0: i = 4 if hash01(x, y, 8) < 0.8 else 3    # tile seams
            px[x, y] = cp[i]
    # a coffee stain and a biscuit crumb trail by the table
    for (cx, cy, r) in ((13 * T + 10, 6 * T + 20, 7), (6 * T + 30, 3 * T + 12, 5)):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                d = math.hypot(x - cx, (y - cy) * 1.4)
                if d < r: cv.put(x, y, C('leather', 3)[:3] + (90 if d > r - 2 else 50,))
    for k in range(12): cv.put(10 * T + int(hash01(k, 1, 6) * 90), 6 * T + 4 + int(hash01(k, 2, 6) * 20), C('sand', 1))
    # muddy boot prints coming in from the compound
    for k in range(9):
        bx = EXIT_X + 20 + (k % 2) * 26 + int(hash01(k, 3, 7) * 6); by = 10 * T - 20 - k * 30
        if by < 5 * T: break
        a = 1 - k / 9
        for yy in range(9):
            for xx in range(6):
                if (xx in (0, 5) and yy in (0, 8)) or yy == 5: continue
                cv.put(bx + xx, by + yy, C('mud', 2)[:3] + (int(150 * a),))
    # AO where the floor meets the walls
    for y in range(WALL_H, WALL_H + 16):
        a = int(100 * (1 - (y - WALL_H) / 16) ** 1.7)
        for x in range(W): cv.put(x, y, SHADOW[:3] + (a,))
    for d in range(12):
        a = int(80 * (1 - d / 12) ** 1.7)
        for y in range(WALL_H, H): cv.put(T + d, y, SHADOW[:3] + (a,)); cv.put(W - T - 1 - d, y, SHADOW[:3] + (a,))
    for y in range(H - T - 12, H - T):
        a = int(60 * ((y - (H - T - 12)) / 12) ** 1.6)
        for x in range(W): cv.put(x, y, SHADOW[:3] + (a,))
    # daylight pools under the windows
    for wc in (3, 16):
        cx = wc * T + T
        for y in range(WALL_H, WALL_H + 70):
            t = (y - WALL_H) / 70
            for x in range(int(cx - 40 + t * 20), int(cx + 40 + t * 30)):
                if hash01(x, y, 3) < 0.9: cv.put(x, y, C('lamp_glow', 0)[:3] + (int(46 * (1 - t)),))
    SH.mat(cv, EXIT_X + 4, 10 * T + 8, 2 * T - 8, 34)
    SH.spill(cv, EXIT_X, H - T, 2 * T, reach=110, alpha=54)
    return cv


def dist_path(x, y):
    pts = [(EXIT_X + T, 10 * T + 20), (EXIT_X + T, 7 * T), (11 * T, 6 * T + 30), (11 * T, 3 * T), (4 * T, 3 * T + 20)]
    best = 1e9
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy or 1
        t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / L2))
        best = min(best, math.hypot(x - ax - t * dx, y - ay - t * dy))
    return best


# ------------------------------------------------------------------ walls
def panel_wall(cv, x0, y0, w, h):
    """Cabin wall: laminate panels with H-section joints, a top trim and a blue-grey skirting."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            t = (y - y0) / h
            i = 1 if t < 0.8 else 2
            if fbm(x, y, 30, 11, 2) > 0.66: i += 1
            if hash01(x, y, 12) < 0.02: i += 1
            c = C('laminate', i)
            j = (x - x0) % 64
            if j == 0: c = C('laminate', 4)
            elif j == 1: c = C('laminate', 0)
            elif j == 63: c = C('laminate', 3)
            cv.put(x, y, c)


def blinds_window(cv, x0, y0, w, h, drawn=0.5, seed=0):
    """Aluminium window with a view of the compound, venetian blinds half down and tilted."""
    cv.rect(x0 - 3, y0 - 3, w + 6, h + 6, C('metal', 3)); hl(cv, x0 - 3, y0 - 3, w + 6, C('metal', 1)); vl(cv, x0 - 3, y0 - 3, h + 6, C('metal', 1))
    cv.rect(x0 - 1, y0 - 1, w + 2, h + 2, C('metal', 4))
    for y in range(y0, y0 + h):   # the view: sky, fells, the compound fence
        for x in range(x0, x0 + w):
            t = (y - y0) / h
            c = C('daylight', 0 if t < 0.3 else 1)
            hill = 0.5 + (fbm(x, 0, 16, seed, 2) - 0.5) * 0.3
            if t > hill: c = C('hills', 1 if t < hill + 0.12 else 2)
            if t > 0.78: c = C('tarmac', 1) if t < 0.86 else C('tarmac', 2)
            if t > 0.62 and t < 0.84 and ((x - x0) % 12 == 0 or (y - y0) % 5 == 0): c = C('metal', 2)   # Heras panel mesh
            cv.put(x, y, c)
    vl(cv, x0 + w // 2, y0, h, C('metal', 2)); vl(cv, x0 + w // 2 + 1, y0, h, C('metal', 4))
    by = y0 + int(h * drawn)
    cv.rect(x0 - 2, y0 - 5, w + 4, 5, C('white', 2)); hl(cv, x0 - 2, y0 - 5, w + 4, C('white', 0)); hl(cv, x0 - 2, y0 - 1, w + 4, C('white', 3))   # headrail
    for y in range(y0, by):
        s = (y - y0) % 4
        c = C('white', 1) if s == 0 else C('white', 2) if s == 1 else C('white', 3) if s == 2 else None
        if c is None: continue
        hl(cv, x0, y, w, c)
    hl(cv, x0 - 1, by, w + 2, C('white', 2)); hl(cv, x0 - 1, by + 1, w + 2, C('white', 4))   # bottom rail
    for yy in range(y0 - 1, by + 14): cv.put(x0 + 6, yy, C('white', 3))   # pull cord
    cv.rect(x0 + 5, by + 14, 3, 4, C('white', 2))
    cv.rect(x0 - 5, y0 + h + 2, w + 10, 4, C('white', 1)); hl(cv, x0 - 5, y0 + h + 2, w + 10, C('white', 0)); hl(cv, x0 - 5, y0 + h + 5, w + 10, C('white', 3))   # sill
    hl(cv, x0 - 4, y0 + h + 6, w + 8, SHADOW[:3] + (100,))


def walls():
    cv = Canvas(W, H)
    panel_wall(cv, 0, 8, W, WALL_H - 18)
    for y in range(0, 8):
        for x in range(W): cv.put(x, y, C('steel_blue', 4 if y < 5 else 3))
    hl(cv, 0, 7, W, C('metal', 1)); hl(cv, 0, 8, W, C('metal', 3)); hl(cv, 0, 9, W, SHADOW[:3] + (90,))
    for y in range(WALL_H - 10, WALL_H):   # skirting
        for x in range(W): cv.put(x, y, C('steel_blue', 3 if y > WALL_H - 9 else 1) if y < WALL_H - 1 else C('steel_blue', 5))
    for wc in (3, 16): blinds_window(cv, wc * T + 12, 26, 2 * T - 24, 46, drawn=0.42 if wc == 3 else 0.6, seed=wc)
    # a panel heater under each window
    for wc in (3, 16):
        hx = wc * T + 14
        cv.rect(hx, WALL_H - 22, 2 * T - 28, 11, C('white', 1)); hl(cv, hx, WALL_H - 22, 2 * T - 28, C('white', 0)); hl(cv, hx, WALL_H - 12, 2 * T - 28, C('white', 3))
        for x in range(hx + 3, hx + 2 * T - 30, 4): vl(cv, x, WALL_H - 19, 6, C('white', 3))
        cv.put(hx + 2 * T - 32, WALL_H - 20, C('paint_red', 1))
    # wall cupboard over the kettle counter, with a mug tree
    cx0 = T + 4
    cv.rect(cx0 + 3, 20, 2 * T - 8, 34, SHADOW[:3] + (90,))
    cv.rect(cx0, 17, 2 * T - 8, 34, C('wood', 2)); hl(cv, cx0, 17, 2 * T - 8, C('wood', 0)); vl(cv, cx0, 17, 34, C('wood', 1)); hl(cv, cx0, 50, 2 * T - 8, C('wood', 4)); vl(cv, cx0 + 2 * T - 9, 17, 34, C('wood', 4))
    vl(cv, cx0 + T - 4, 18, 32, C('wood', 4)); vl(cv, cx0 + T - 3, 18, 32, C('wood', 1))
    for hx in (cx0 + T - 9, cx0 + T + 3): vl(cv, hx, 30, 8, C('metal', 1)); vl(cv, hx + 1, 30, 8, C('metal', 3))
    # a rota and a first-aid box (colour only, blank)
    cv.rect(4 * T + 34, 28, 20, 26, OUTLINE); cv.rect(4 * T + 35, 29, 18, 24, C('paper', 1)); hl(cv, 4 * T + 35, 29, 18, C('paper', 0))
    for ly in range(33, 52, 4): hl(cv, 4 * T + 37, ly, 14, C('paper', 3))
    for ly in range(33, 52, 4): vl(cv, 4 * T + 42, 31, 21, C('paper', 3))
    fx = 14 * T + 10
    cv.rect(fx + 2, 30, 26, 22, SHADOW[:3] + (90,)); cv.rect(fx, 28, 26, 22, OUTLINE); cv.rect(fx + 1, 29, 24, 20, C('enamel_g', 2)); hl(cv, fx + 1, 29, 24, C('enamel_g', 1))
    cv.rect(fx + 10, 33, 6, 12, C('white', 0)); cv.rect(fx + 7, 36, 12, 6, C('white', 0))
    # clock
    SH.clock(cv, 7 * T + 26, 40, r=11)
    # a site-safety poster (pictogram shapes only) and a site plan pinned up
    px0 = 18 * T + 8
    cv.rect(px0 + 2, 26, 30, 40, SHADOW[:3] + (90,)); cv.rect(px0, 24, 30, 40, OUTLINE); cv.rect(px0 + 1, 25, 28, 38, C('white', 1))
    cv.rect(px0 + 1, 25, 28, 9, C('paint_blue', 2))
    for k, col in enumerate(('paint_blue', 'paint_blue', 'enamel_g', 'mustard')):
        cx, cy = px0 + 8 + (k % 2) * 14, 42 + (k // 2) * 13
        cv.ellipse(cx, cy, 5, 5, C(col, 1)); cv.ellipse(cx, cy, 2, 2, C('white', 0))
    side(cv, 0, True); side(cv, W - T, False)
    south(cv)
    return cv


def side(cv, x0, lit):
    for y in range(0, H):
        for x in range(x0, x0 + T):
            local = x - x0; inner = (T - 1 - local) if lit else local
            if 10 <= y < WALL_H and inner > 7: continue
            c = C('steel_blue', 4) if (y // 8) % 2 == 0 else C('steel_blue', 4)
            if inner > 7: c = C('steel_blue', 4 if (y % 64) else 5)
            if inner == 0: c = C('metal', 1 if lit else 3)
            elif inner == 1: c = C('metal', 2 if lit else 4)
            elif inner < 7: c = C('laminate', 3 if lit else 4)
            elif inner == 7: c = C('steel_blue', 5)
            cv.put(x, y, c)


def south(cv):
    y0 = H - T
    for y in range(y0, H):
        for x in range(W):
            if EXIT_X <= x < EXIT_X + 2 * T: continue
            ly = y - y0
            c = C('steel_blue', 4) if ly > 3 else [C('metal', 1), C('metal', 2), C('laminate', 3), C('steel_blue', 3)][ly]
            if ly > 3 and x % 64 == 0: c = C('steel_blue', 5)
            cv.put(x, y, c)
    SH.doorway(cv, EXIT_X, y0, 2 * T, T, 'metal')


# ------------------------------------------------------------------ objects
def mug(cv, x, y, rn, tea=True):
    cyl_v(cv, x, y + 1, 7, 8, rn, 0, 4)
    cv.ellipse(x + 3.5, y + 1, 3.5, 1.5, C(rn, 1))
    if tea: cv.ellipse(x + 3.5, y + 1, 2.5, 1, C('leather', 2))
    cv.put(x + 7, y + 3, C(rn, 2)); cv.put(x + 8, y + 4, C(rn, 3)); cv.put(x + 7, y + 6, C(rn, 3))


def paper_stack(cv, x, y, w, h, n=3, seed=0):
    for k in range(n):
        ox = int(hash01(k, 1, seed) * 3) - 1
        cv.rect(x + ox, y - k * 2, w, h, C('paper', 1 + (k == n - 1) * 0)); hl(cv, x + ox, y - k * 2, w, C('paper', 0))
        hl(cv, x + ox, y - k * 2 + h - 1, w, C('paper', 3))
    for ly in range(y - (n - 1) * 2 + 3, y - (n - 1) * 2 + h - 2, 2):
        hl(cv, x + 2, ly, w - 4 - (ly % 3) * 2, C('paper', 3))


def kettle():
    o = Obj('kettle', (1, 2, 2, 2), up=36, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 2 * T
    ground_shadow(cv, X(w // 2 + 4), Y(92), w // 2, 5, 80)
    top_y, top_d = 30, 22
    # base units: doors with handles, kickboard
    fy = top_y + top_d
    cv.rect(X(0), Y(fy), w, 96 - fy, C('white', 1)); vl(cv, X(0), Y(fy), 96 - fy, C('white', 0)); vl(cv, X(w - 1), Y(fy), 96 - fy, C('white', 3))
    hl(cv, X(0), Y(92), w, C('steel_blue', 4)); hl(cv, X(0), Y(93), w, C('steel_blue', 4)); hl(cv, X(0), Y(91), w, C('steel_blue', 3))
    for dx in (1, w // 2):
        cv.rect(X(dx + 1), Y(fy + 3), w // 2 - 4, 96 - fy - 10, C('white', 2)); hl(cv, X(dx + 1), Y(fy + 3), w // 2 - 4, C('white', 0)); vl(cv, X(dx + w // 2 - 4), Y(fy + 3), 96 - fy - 10, C('white', 3))
    for hx in (w // 2 - 7, w // 2 + 5): vl(cv, X(hx), Y(fy + 8), 8, C('metal', 2)); vl(cv, X(hx + 1), Y(fy + 8), 8, C('metal', 4))
    # worktop: wood-effect laminate with a lit front edge
    grain(cv, X(-1), Y(top_y), w + 2, top_d, 'wood', 1, 31, knots=False)
    hl(cv, X(-1), Y(top_y), w + 2, C('wood', 0)); cv.rect(X(-1), Y(fy - 3), w + 2, 3, C('wood', 2)); hl(cv, X(-1), Y(fy - 1), w + 2, C('wood', 4))
    # kettle: white plastic jug kettle with a blue level window, steam point on the spout
    kx, ky = X(8), Y(top_y - 16)
    for yy in range(22):
        ww = 13 - max(0, 6 - yy) // 2
        for xx in range(ww):
            lum = light((xx - ww / 2) / (ww / 2 + 0.5), 0.2, 0.7)
            cv.put(kx + xx + (13 - ww) // 2, ky + yy, shade('white', lum))
    cv.rect(kx + 3, ky + 8, 3, 9, C('paint_blue', 1)); vl(cv, kx + 3, ky + 8, 9, C('paint_blue', 0))
    for yy in range(4, 18): cv.put(kx + 14, ky + yy, C('white', 2)); cv.put(kx + 15, ky + yy, C('white', 3))
    hl(cv, kx + 12, ky + 4, 3, C('white', 2)); hl(cv, kx + 12, ky + 17, 3, C('white', 3))
    cv.rect(kx - 3, ky + 3, 4, 3, C('white', 1))
    cv.rect(kx - 2, ky + 21, 18, 3, C('charcoal', 2)); hl(cv, kx - 2, ky + 21, 18, C('charcoal', 1))
    cv.put(kx + 11, ky + 20, C('flower_blu', 0))
    o.extra['points'] = {'steam': [kx - 3, ky + 2]}
    # mugs, a tea caddy, a biscuit tin, a jar of coffee, a bottle of milk
    mug(cv, X(32), Y(top_y + 1), 'paint_red'); mug(cv, X(44), Y(top_y + 4), 'paint_blue', False); mug(cv, X(28), Y(top_y + 8), 'mustard')
    cyl_v(cv, X(56), Y(top_y - 12), 11, 16, 'forest', 0, 4); cv.ellipse(X(61.5), Y(top_y - 12), 5.5, 2, C('gold', 1)); cv.rect(X(58), Y(top_y - 7), 7, 5, C('gold', 2))
    cv.ellipse(X(78), Y(top_y + 4), 11, 4, C('wine', 1)); cyl_v(cv, X(67), Y(top_y + 4), 22, 8, 'wine', 0, 4); cv.ellipse(X(78), Y(top_y + 4), 11, 4, C('wine', 1))
    cv.ellipse(X(78), Y(top_y + 4), 7, 2, C('gold', 1))
    cyl_v(cv, X(70), Y(top_y - 11), 8, 13, 'glass', 1, 4); cv.rect(X(70), Y(top_y - 13), 8, 3, C('paint_red', 2)); cv.rect(X(71), Y(top_y - 6), 6, 5, C('leather', 3))
    cyl_v(cv, X(84), Y(top_y - 9), 6, 12, 'white', 0, 3); cv.rect(X(85), Y(top_y - 12), 4, 3, C('enamel_g', 2))
    cv.rect(X(20), Y(top_y + 14), 12, 4, C('white', 3))   # a teaspoon on a saucer
    hl(cv, X(22), Y(top_y + 15), 7, C('metal', 1))
    o.finish(); return o


def lockers():
    """PPE lockers: grey steel, two columns, hard hats on top, hi-vis on a hook, boots and a glove box at the base."""
    o = Obj('lockers', (17, 2, 2, 2), up=60, m=2, extra_left=10)
    cv, X, Y = o.cv, o.X, o.Y
    w = 2 * T - 6
    ground_shadow(cv, X(w // 2 + 6), Y(92), w // 2 + 4, 6, 90)
    y0 = -30; y1 = 88
    cv.rect(X(0), Y(y0), w, y1 - y0, C('steel_blue', 2))
    for cx in (0, w // 2):
        x0 = cx
        cv.rect(X(x0 + 2), Y(y0 + 3), w // 2 - 4, y1 - y0 - 12, C('steel_blue', 1))
        vl(cv, X(x0 + 2), Y(y0 + 3), y1 - y0 - 12, C('steel_blue', 0)); vl(cv, X(x0 + w // 2 - 3), Y(y0 + 3), y1 - y0 - 12, C('steel_blue', 3))
        hl(cv, X(x0 + 2), Y(y1 - 10), w // 2 - 4, C('steel_blue', 4))
        for vy in range(y0 + 8, y0 + 22, 3): hl(cv, X(x0 + 8), Y(vy), w // 2 - 16, C('steel_blue', 4))   # vents
        for vy in range(y1 - 26, y1 - 14, 3): hl(cv, X(x0 + 8), Y(vy), w // 2 - 16, C('steel_blue', 4))
        cv.rect(X(x0 + 10), Y(y0 + 28), w // 2 - 20, 7, C('paper', 1)); frame(cv, X(x0 + 10), Y(y0 + 28), w // 2 - 20, 7, C('metal', 2))   # blank name card
        cv.rect(X(x0 + w // 2 - 9), Y(y0 + 50), 3, 10, C('metal', 1)); cv.put(X(x0 + w // 2 - 8), Y(y0 + 56), OUTLINE)   # handle + lock
    vl(cv, X(w // 2 - 1), Y(y0), y1 - y0, C('steel_blue', 4)); vl(cv, X(w // 2), Y(y0), y1 - y0, C('steel_blue', 5))
    cv.rect(X(0), Y(y0 - 4), w, 4, C('steel_blue', 1)); hl(cv, X(0), Y(y0 - 4), w, C('steel_blue', 0))
    vl(cv, X(w - 1), Y(y0 - 4), y1 - y0 + 4, C('steel_blue', 4)); hl(cv, X(0), Y(y1 - 1), w, C('steel_blue', 5))
    # hard hats on top: white and orange, with a peak and a lit dome
    for (hx, rn) in ((6, 'white'), (w // 2 + 4, 'hivis'), (26, 'white')):
        if hx == 26: continue
        cv.ellipse(X(hx + 17), Y(y0 - 6), 18, 4, C(rn, 3))
        cv.ellipse(X(hx + 17), Y(y0 - 12), 15, 11, lambda x, y, nx, ny, nz, rn=rn: shade(rn, light(nx, ny, nz) + 0.15) if ny < 0.45 else None)
        hl(cv, X(hx + 2), Y(y0 - 7), 31, C(rn, 3)); hl(cv, X(hx + 2), Y(y0 - 6), 31, C(rn, 4))
        vl(cv, X(hx + 17), Y(y0 - 22), 15, C(rn, 0))   # the moulded ridge
        cv.put(X(hx + 11), Y(y0 - 19), C('white', 0))
    # hi-vis vest on a hook on the side: orange with silver reflective bands
    vx = -10
    for yy in range(30):
        for xx in range(14):
            if yy < 4 and xx in (0, 1, 12, 13): continue
            if 2 <= xx <= 11 and yy < 8 and 4 <= xx <= 9: continue    # neck opening
            c = C('hivis', 1 if xx < 5 else 2)
            if yy in (14, 15, 22, 23): c = C('reflect', 1 if xx < 6 else 2)
            if xx == 13: c = C('hivis', 3)
            cv.put(X(vx + xx), Y(y0 + 18 + yy), c)
    cv.rect(X(vx + 12), Y(y0 + 14), 3, 4, C('metal', 2))
    # boots at the base and a box of gloves
    for bx in (6, 22):
        cv.rect(X(bx), Y(y1 - 2), 12, 10, C('boot', 2)); hl(cv, X(bx), Y(y1 - 2), 12, C('boot', 1)); cv.rect(X(bx - 3), Y(y1 + 4), 15, 4, C('boot', 3))
        hl(cv, X(bx - 3), Y(y1 + 7), 15, C('boot', 4)); cv.rect(X(bx + 1), Y(y1 - 1), 3, 2, C('mustard', 2))
    cv.rect(X(w - 30), Y(y1 - 1), 24, 10, C('paint_blue', 2)); hl(cv, X(w - 30), Y(y1 - 1), 24, C('paint_blue', 1)); cv.rect(X(w - 22), Y(y1 - 2), 8, 3, C('white', 1))
    o.finish(); return o


def office_chair(cv, x, y, back='north', rn='charcoal'):
    """A small office chair at (x, y) = seat front-left. back='north' draws the back above the seat."""
    if back == 'north':
        cv.rect(x + 2, y - 16, 16, 16, C(rn, 2)); hl(cv, x + 2, y - 16, 16, C(rn, 1)); vl(cv, x + 17, y - 16, 16, C(rn, 3))
        cv.rect(x, y, 20, 8, C(rn, 1)); hl(cv, x, y, 20, C(rn, 0)); hl(cv, x, y + 7, 20, C(rn, 3))
        vl(cv, x + 9, y + 8, 6, C('metal', 3)); hl(cv, x + 2, y + 14, 16, C('metal', 4))
    else:   # back towards the viewer (south): we see the seat back face-on
        cv.rect(x, y - 4, 20, 6, C(rn, 1)); hl(cv, x, y - 4, 20, C(rn, 0))
        cv.rect(x + 1, y - 2, 18, 16, C(rn, 2)); hl(cv, x + 1, y - 2, 18, C(rn, 1)); vl(cv, x + 18, y - 2, 16, C(rn, 3)); hl(cv, x + 1, y + 13, 18, C(rn, 4))
        vl(cv, x + 9, y + 14, 4, C('metal', 3)); hl(cv, x + 2, y + 18, 16, C('metal', 4))


def meeting_table():
    o = Obj('table', (9, 4, 4, 2), up=24, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 4 * T
    ground_shadow(cv, X(w // 2 + 6), Y(86), w // 2 + 4, 10, 80)
    for cx in (22, 70, 118, 166):   # chairs on the far side (backs above the table)
        office_chair(cv, X(cx - 10), Y(10), 'north', 'navy')
    ty0, td, th = 14, 48, 8
    for lx in (8, w - 14):   # legs
        cv.rect(X(lx), Y(ty0 + td + th), 5, 12, C('metal', 3)); vl(cv, X(lx), Y(ty0 + td + th), 12, C('metal', 1))
    grain(cv, X(0), Y(ty0), w, td, 'wood', 1, 41, knots=False)
    hl(cv, X(0), Y(ty0), w, C('wood', 0))
    cv.rect(X(0), Y(ty0 + td), w, th, C('wood', 2)); hl(cv, X(0), Y(ty0 + td), w, C('wood', 1)); hl(cv, X(0), Y(ty0 + td + th - 1), w, C('wood', 4))
    vl(cv, X(w - 1), Y(ty0), td + th, C('wood', 4))
    # on the table: a drawing spread out with a scale rule, a rolled drawing, papers, laptop, mugs, biscuits
    dx0, dy0 = X(56), Y(ty0 + 8)
    cv.rect(dx0 + 2, dy0 + 2, 64, 32, SHADOW[:3] + (70,))
    cv.rect(dx0, dy0, 64, 32, C('paper', 1)); hl(cv, dx0, dy0, 64, C('paper', 0))
    frame(cv, dx0 + 2, dy0 + 2, 60, 28, C('paint_blue', 3))
    for k in range(5):   # a track plan: two long lines, a turnout, a platform block (no lettering)
        hl(cv, dx0 + 5, dy0 + 12 + (k > 2) * 6, 54, C('paint_blue', 2))
    for s in range(14): cv.put(dx0 + 30 + s, dy0 + 12 + s * 6 // 14, C('paint_blue', 2))
    cv.rect(dx0 + 10, dy0 + 21, 20, 5, C('paint_blue', 0)); cv.rect(dx0 + 48, dy0 + 4, 12, 6, C('paper', 3))
    cv.rect(dx0 + 8, dy0 + 27, 48, 3, C('mustard', 1)); hl(cv, dx0 + 8, dy0 + 27, 48, C('mustard', 0))   # scale rule
    for k in range(0, 48, 3): cv.put(dx0 + 8 + k, dy0 + 29, C('mustard', 3))
    cyl_h(cv, X(128), Y(ty0 + 4), 50, 8, 'paper', 0, 4); cv.ellipse(X(128), Y(ty0 + 8), 2, 4, C('paper', 2)); cv.put(X(128), Y(ty0 + 8), C('paper', 4))
    lx0, ly0 = X(8), Y(ty0 + 10)   # laptop (lid up, screen towards the far chair, so we see the lid back)
    cv.rect(lx0, ly0 + 14, 34, 16, C('charcoal', 2)); hl(cv, lx0, ly0 + 14, 34, C('charcoal', 1))
    for k in range(3): hl(cv, lx0 + 3, ly0 + 18 + k * 3, 28, C('charcoal', 3))
    cv.rect(lx0 + 1, ly0, 32, 14, C('charcoal', 1)); hl(cv, lx0 + 1, ly0, 32, C('charcoal', 0)); cv.ellipse(lx0 + 17, ly0 + 7, 3, 3, C('charcoal', 0))
    paper_stack(cv, X(128), Y(ty0 + 22), 22, 18, 3, 4)
    mug(cv, X(48), Y(ty0 + 30), 'white'); mug(cv, X(156), Y(ty0 + 30), 'paint_red'); mug(cv, X(170), Y(ty0 + 10), 'mustard', False)
    cv.ellipse(X(112), Y(ty0 + 40), 10, 4, C('white', 2)); cv.ellipse(X(112), Y(ty0 + 39), 8, 3, C('white', 0))
    for k in range(5): cv.ellipse(X(106 + k * 3), Y(ty0 + 38 + (k % 2)), 2.5, 1.5, C('sand', 1 if k % 2 else 2))
    for s in range(12): cv.put(X(146 + s), Y(ty0 + 44), C('paint_blue', 1))   # a pen
    for cx in (40, 150):   # chairs on the near side, backs to us
        office_chair(cv, X(cx - 10), Y(ty0 + td + 10), 'south', 'navy')
    o.fade = [9, 3, 4, 1]
    o.finish(); return o


def desk():
    """Steve's desk against the west wall: monitor, keyboard, paperwork, in-tray, desk lamp, phone, plant, chair."""
    o = Obj('desk', (1, 5, 2, 2), up=40, m=2, extra_w=12)
    cv, X, Y = o.cv, o.X, o.Y
    w = 2 * T + 4
    ground_shadow(cv, X(w // 2 + 4), Y(90), w // 2 + 2, 6, 80)
    ty0, td, th = 20, 44, 10
    cv.rect(X(0), Y(ty0 + td + th), 34, 22, C('wood', 3)); vl(cv, X(0), Y(ty0 + td + th), 22, C('wood', 2))   # drawer pedestal
    for k in range(3): hl(cv, X(2), Y(ty0 + td + th + 5 + k * 6), 30, C('wood', 4)); cv.rect(X(14), Y(ty0 + td + th + 2 + k * 6), 6, 1, C('metal', 2))
    cv.rect(X(w - 6), Y(ty0 + td + th), 4, 22, C('metal', 3))
    grain(cv, X(0), Y(ty0), w, td, 'wood', 1, 51, knots=False)
    hl(cv, X(0), Y(ty0), w, C('wood', 0))
    cv.rect(X(0), Y(ty0 + td), w, th, C('wood', 2)); hl(cv, X(0), Y(ty0 + td), w, C('wood', 1)); hl(cv, X(0), Y(ty0 + td + th - 1), w, C('wood', 4)); vl(cv, X(w - 1), Y(ty0), td + th, C('wood', 4))
    # monitor (screen faces us, a spreadsheet glow: cells, no text)
    mx0, my0 = X(18), Y(ty0 - 30)
    cv.rect(mx0, my0, 46, 32, C('charcoal', 3)); hl(cv, mx0, my0, 46, C('charcoal', 1)); vl(cv, mx0, my0, 32, C('charcoal', 2))
    cv.rect(mx0 + 3, my0 + 3, 40, 24, C('paint_blue', 0))
    for yy in range(my0 + 5, my0 + 26, 3): hl(cv, mx0 + 4, yy, 38, C('paint_blue', 1))
    for xx in range(mx0 + 12, mx0 + 43, 10): vl(cv, xx, my0 + 4, 22, C('paint_blue', 1))
    cv.rect(mx0 + 4, my0 + 4, 38, 3, C('enamel_g', 1)); cv.rect(mx0 + 24, my0 + 14, 10, 5, C('sticky_y', 1))
    cv.put(mx0 + 4, my0 + 4, C('white', 0))
    cv.rect(mx0 + 19, my0 + 32, 8, 8, C('charcoal', 3)); cv.rect(mx0 + 13, my0 + 38, 20, 3, C('charcoal', 2))
    cv.rect(mx0 + 40, my0 + 6, 5, 4, C('sticky_y', 1)); cv.rect(mx0 - 2, my0 + 18, 5, 4, C('sticky_p', 1))   # sticky notes on the bezel
    cv.rect(X(20), Y(ty0 + 22), 40, 8, C('charcoal', 2)); hl(cv, X(20), Y(ty0 + 22), 40, C('charcoal', 1))   # keyboard
    for k in range(3):
        for kk in range(12): cv.put(X(22 + kk * 3), Y(ty0 + 24 + k * 2), C('charcoal', 0))
    cv.ellipse(X(68), Y(ty0 + 26), 3, 4, C('charcoal', 1))   # mouse
    paper_stack(cv, X(64), Y(ty0 + 8), 22, 16, 4, 9)   # paperwork
    cv.rect(X(2), Y(ty0 + 30), 24, 12, C('metal', 3)); hl(cv, X(2), Y(ty0 + 30), 24, C('metal', 1)); paper_stack(cv, X(4), Y(ty0 + 30), 20, 8, 2, 3)   # in-tray
    for s in range(22):   # desk lamp
        cv.put(X(4 + s // 3), Y(ty0 + 4 - s), C('paint_black', 1))
    cv.ellipse(X(12), Y(ty0 - 18), 7, 4, C('paint_black', 1)); cv.ellipse(X(12), Y(ty0 - 16), 5, 2, C('lamp_glow', 0))
    cv.rect(X(2), Y(ty0 + 2), 8, 4, C('paint_black', 2))
    cv.rect(X(76), Y(ty0 + 30), 16, 10, C('charcoal', 3)); hl(cv, X(76), Y(ty0 + 30), 16, C('charcoal', 1)); cv.rect(X(78), Y(ty0 + 28), 12, 4, C('charcoal', 2))   # phone
    mug(cv, X(62), Y(ty0 + 30), 'navy')
    cyl_v(cv, X(88), Y(ty0 - 2), 10, 10, 'terracotta', 0, 4)   # a little cactus
    cv.ellipse(X(93), Y(ty0 - 10), 4, 9, lambda x, y, nx, ny, nz: shade('plant', light(nx, ny, nz)))
    cv.put(X(92), Y(ty0 - 16), C('flower_pur', 0))
    office_chair(cv, X(40), Y(ty0 + td + 14), 'south', 'charcoal')
    o.finish(); return o


def plan_chest():
    o = Obj('plan_chest', (15, 7, 3, 1), up=26, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 3 * T
    ground_shadow(cv, X(w // 2 + 4), Y(46), w // 2 + 2, 5, 80)
    ty0, td = 0, 16
    cv.rect(X(0), Y(ty0), w, td, C('steel_blue', 1)); hl(cv, X(0), Y(ty0), w, C('steel_blue', 0))
    cv.rect(X(0), Y(ty0 + td), w, 46 - td, C('steel_blue', 2)); vl(cv, X(w - 1), Y(ty0), 46, C('steel_blue', 4))
    for k in range(5):   # shallow drawers with handles and blank label holders
        yy = ty0 + td + 2 + k * 5
        hl(cv, X(2), Y(yy + 4), w - 4, C('steel_blue', 4)); hl(cv, X(2), Y(yy), w - 4, C('steel_blue', 1))
        hl(cv, X(w // 2 - 12), Y(yy + 2), 24, C('metal', 1)); cv.rect(X(12), Y(yy + 1), 10, 3, C('paper', 1))
    hl(cv, X(0), Y(45), w, C('steel_blue', 5))
    # on top: a spread drawing weighted with a mug, rolled drawings, a drawing tube
    cv.rect(X(8), Y(ty0 - 4), 64, 18, C('paper', 1)); hl(cv, X(8), Y(ty0 - 4), 64, C('paper', 0))
    for k in range(4): hl(cv, X(12), Y(ty0 + k * 4), 40 + k * 3, C('paint_blue', 2))
    cv.rect(X(56), Y(ty0 - 2), 12, 10, C('paint_blue', 0)); frame(cv, X(10), Y(ty0 - 2), 60, 14, C('paint_blue', 3))
    mug(cv, X(62), Y(ty0 - 10), 'paint_blue')
    for k, rn in enumerate(('paper', 'paper', 'sticky_b')):
        cyl_h(cv, X(80 + k * 4), Y(ty0 - 6 + k * 7), 56, 7, rn, 0, 4)
        cv.ellipse(X(80 + k * 4), Y(ty0 - 2.5 + k * 7), 1.5, 3.5, C(rn, 2))
    cyl_h(cv, X(84), Y(ty0 - 16), 52, 9, 'paint_black', 0, 4); cv.rect(X(84), Y(ty0 - 16), 5, 9, C('paint_black', 0))
    o.finish(); return o


def sign_in():
    o = Obj('sign_in', (2, 8, 2, 2), up=30, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    w = 2 * T
    ground_shadow(cv, X(w // 2 + 4), Y(90), w // 2 + 2, 6, 80)
    ty0, td = 16, 30
    grain(cv, X(0), Y(ty0), w, td, 'wood', 1, 61, knots=False); hl(cv, X(0), Y(ty0), w, C('wood', 0))
    fy = ty0 + td
    cv.rect(X(0), Y(fy), w, 90 - fy, C('navy', 2)); hl(cv, X(0), Y(fy), w, C('navy', 0)); hl(cv, X(0), Y(fy + 1), w, C('navy', 1))
    vl(cv, X(0), Y(fy), 90 - fy, C('navy', 1)); vl(cv, X(w - 1), Y(fy), 90 - fy, C('navy', 4)); hl(cv, X(0), Y(89), w, C('navy', 4))
    # blank sign plate on the front (the game letters SIGN IN)
    cv.rect(X(10), Y(fy + 8), w - 20, 16, OUTLINE); cv.rect(X(11), Y(fy + 9), w - 22, 14, C('white', 1)); hl(cv, X(11), Y(fy + 9), w - 22, C('white', 0))
    o.extra['text_slot'] = [X(13), Y(fy + 11), w - 26, 10]
    for k in range(4): vl(cv, X(10 + k * 24), Y(fy + 28), 14, C('navy', 3))   # panel seams
    # visitor book open, pen on a chain, lanyards tray, bell, hand gel
    bx, by = X(14), Y(ty0 + 6)
    cv.rect(bx - 1, by - 1, 44, 20, C('wine', 3))
    cv.rect(bx, by, 21, 18, C('paper', 1)); cv.rect(bx + 21, by, 21, 18, C('paper', 1)); vl(cv, bx + 21, by, 18, C('paper', 3))
    for ly in range(by + 3, by + 17, 3):
        hl(cv, bx + 2, ly, 17, C('paper', 3)); hl(cv, bx + 23, ly, 17, C('paper', 3))
        if ly < by + 11: hl(cv, bx + 3, ly - 1, 6 + (ly % 5), C('navy', 2)); hl(cv, bx + 24, ly - 1, 4 + (ly % 7), C('navy', 2))   # scribbles (not letters)
    for s in range(12): cv.put(bx + 30 + s, by + 12 - s // 3, C('paint_blue', 1))
    for s in range(16): cv.put(bx + 42 + s // 2, by + 9 + s // 3, C('metal', 2 if s % 2 else 4))
    cv.rect(X(64), Y(ty0 + 4), 24, 12, C('charcoal', 2)); hl(cv, X(64), Y(ty0 + 4), 24, C('charcoal', 1))
    for k in range(4): cv.rect(X(66 + k * 5), Y(ty0 + 6), 4, 8, [C('paint_red', 1), C('mustard', 1), C('paint_blue', 1), C('enamel_g', 1)][k])
    for k in range(4): cv.rect(X(67 + k * 5), Y(ty0 + 9), 2, 3, C('white', 0))
    cv.ellipse(X(78), Y(ty0 + 22), 5, 3, C('gold', 1)); cv.put(X(78), Y(ty0 + 18), C('gold', 2)); cv.put(X(76), Y(ty0 + 21), C('gold', 0))
    cyl_v(cv, X(4), Y(ty0 - 10), 7, 16, 'glass', 0, 3); cv.rect(X(5), Y(ty0 - 14), 5, 4, C('white', 2)); cv.rect(X(5), Y(ty0 - 5), 5, 5, C('enamel_g', 1))
    o.finish(); return o


def filing():
    o = Obj('filing', (5, 1, 2, 1), up=74, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(48), Y(44), 46, 5, 80)
    for (x0, rn) in ((2, 'steel_blue'), (48, 'steel_blue')):
        cv.rect(X(x0), Y(-56), 44, 100, C(rn, 2)); hl(cv, X(x0), Y(-60), 44, C(rn, 0))
        cv.rect(X(x0), Y(-60), 44, 4, C(rn, 1)); vl(cv, X(x0 + 43), Y(-60), 104, C(rn, 4)); vl(cv, X(x0), Y(-56), 100, C(rn, 1))
        for k in range(4):
            dy = -54 + k * 24
            cv.rect(X(x0 + 3), Y(dy), 38, 22, C(rn, 1)); hl(cv, X(x0 + 3), Y(dy), 38, C(rn, 0)); hl(cv, X(x0 + 3), Y(dy + 21), 38, C(rn, 4))
            cv.rect(X(x0 + 15), Y(dy + 4), 14, 6, C('paper', 1)); frame(cv, X(x0 + 15), Y(dy + 4), 14, 6, C('metal', 2))
            hl(cv, X(x0 + 16), Y(dy + 13), 12, C('metal', 1)); hl(cv, X(x0 + 16), Y(dy + 14), 12, C('metal', 4))
    cv.rect(X(52), Y(-47), 36, 20, C(rn, 3))   # one drawer left open with files poking up
    for k in range(6): cv.rect(X(54 + k * 6), Y(-54), 5, 8, [C('sticky_y', 1), C('paint_blue', 1), C('sticky_g', 1)][k % 3])
    # a spider plant on top, trailing
    cyl_v(cv, X(12), Y(-72), 20, 12, 'terracotta', 0, 4); cv.ellipse(X(22), Y(-72), 10, 3, C('terracotta', 1)); cv.ellipse(X(22), Y(-72), 8, 2, C('mud', 3))
    for k in range(16):
        a = -2.8 + k * 0.36; ln = 12 + (k % 4) * 4
        for s in range(ln):
            x = 22 + math.cos(a) * s * 0.9; y = -74 + math.sin(a) * s * 0.6 + (s * s) / (40 if k % 3 == 0 else 90)
            cv.put(X(int(x)), Y(int(y)), C('plant', 1 if s < ln // 2 else 2) if k % 2 else C('sticky_g', 1))
    # box files on the other cabinet
    for k in range(4):
        cv.rect(X(56 + k * 8), Y(-78), 7, 18, [C('wine', 2), C('navy', 2), C('forest', 2), C('mustard', 2)][k])
        hl(cv, X(56 + k * 8), Y(-78), 7, [C('wine', 1), C('navy', 1), C('forest', 1), C('mustard', 1)][k]); cv.ellipse(X(59 + k * 8), Y(-70), 1.5, 2, C('white', 2))
    o.finish(); return o


def cooler():
    """Water cooler and a tall yucca against the wall between the board and the right-hand window."""
    o = Obj('water_cooler', (14, 1, 2, 1), up=82, m=2)
    cv, X, Y = o.cv, o.X, o.Y
    ground_shadow(cv, X(48), Y(44), 44, 5, 80)
    cv.rect(X(4), Y(-20), 28, 64, C('white', 1)); vl(cv, X(4), Y(-20), 64, C('white', 0)); vl(cv, X(31), Y(-20), 64, C('white', 3)); hl(cv, X(4), Y(43), 28, C('white', 4))
    cv.rect(X(8), Y(-8), 20, 14, C('charcoal', 3)); cv.rect(X(12), Y(-6), 3, 4, C('paint_blue', 1)); cv.rect(X(21), Y(-6), 3, 4, C('paint_red', 1))
    cv.rect(X(9), Y(4), 18, 2, C('metal', 2))
    for yy in range(-50, -20):   # the big blue bottle
        t = (yy + 50) / 30
        ww = 22 if t > 0.2 else int(8 + t * 70)
        ww = min(ww, 22)
        for xx in range(ww):
            lum = light((xx - ww / 2) / (ww / 2 + 0.5), 0, 0.8)
            cv.put(X(18 - ww // 2 + xx), Y(yy), shade('glass', lum - 0.1) if t > 0.35 else shade('water', lum))
    hl(cv, X(7), Y(-36), 22, C('glass', 0)); cv.put(X(10), Y(-44), C('white', 0))
    cv.rect(X(8), Y(10), 20, 22, C('white', 2))   # cup dispenser column
    cyl_v(cv, X(34), Y(-26), 5, 30, 'white', 0, 3)
    # yucca in a big pot
    cyl_v(cv, X(50), Y(18), 32, 26, 'terracotta', 0, 4); cv.ellipse(X(66), Y(18), 16, 4, C('terracotta', 1)); cv.ellipse(X(66), Y(18), 13, 3, C('mud', 3))
    for yy in range(-40, 18): cv.put(X(65), Y(yy), C('bark', 2)); cv.put(X(66), Y(yy), C('bark', 3))
    for k in range(26):
        a = -3.0 + k * 0.23 + (hash01(k, 1, 5) - 0.5) * 0.3; ln = 16 + int(hash01(k, 2, 5) * 16)
        base = (65, -40 + (k % 3) * 10)
        for s in range(ln):
            x = base[0] + math.cos(a) * s; y = base[1] + math.sin(a) * s * 0.9 + (s * s) / 60
            cv.put(X(int(x)), Y(int(y)), C('plant', 1 if s < ln // 3 else 2 if s < 2 * ln // 3 else 3))
    o.finish(); return o


def board(planned):
    """The planning board: a whiteboard with two swim lanes of sticky notes (blank; the game labels the lanes).
    Normal: notes scattered. Planned: notes in columns and a red critical-path line through them."""
    o = Obj('board_planned' if planned else 'board', (8, 1, 6, 1), up=86, m=2, tile=[10, 1])
    cv, X, Y = o.cv, o.X, o.Y
    w = 6 * T
    x0, y0, bw, bh = 6, -72, w - 12, 70
    cv.rect(X(x0 + 3), Y(y0 + 3), bw, bh, SHADOW[:3] + (100,))
    cv.rect(X(x0), Y(y0), bw, bh, C('metal', 3)); hl(cv, X(x0), Y(y0), bw, C('metal', 1)); vl(cv, X(x0), Y(y0), bh, C('metal', 1)); vl(cv, X(x0 + bw - 1), Y(y0), bh, C('metal', 4))
    for y in range(y0 + 3, y0 + bh - 3):
        for x in range(x0 + 3, x0 + bw - 3):
            c = C('white', 0)
            if fbm(x, y, 12, 71, 2) > 0.7: c = C('white', 1)        # ghost of old marker
            if (x - y) % 90 < 2 and y < y0 + 30: c = C('white', 1)  # sheen
            cv.put(X(x), Y(y), c)
    lane = (bh - 6) // 2
    hl(cv, X(x0 + 3), Y(y0 + 3 + lane), bw - 6, C('navy', 2))   # lane divider
    for ln in range(2):   # lane label strips (blank; the game letters MARJORIE / TRACK)
        cv.rect(X(x0 + 5), Y(y0 + 6 + ln * lane), 40, 9, C('navy', 2)); hl(cv, X(x0 + 5), Y(y0 + 6 + ln * lane), 40, C('navy', 1))
    o.extra['text_slots'] = {'lane_marjorie': [X(x0 + 7), Y(y0 + 7), 36, 7], 'lane_track': [X(x0 + 7), Y(y0 + 7 + lane), 36, 7]}
    notes = []
    for ln in range(2):
        ly = y0 + 5 + ln * lane
        for k in range(9):
            if planned:
                nx = x0 + 54 + k * 24; ny = ly + 12 + (4 if (k + ln) % 3 == 1 else 0)
                rn = STICKY[(k // 3 + ln) % len(STICKY)]
            else:
                nx = x0 + 52 + int(hash01(k, ln, 81) * (bw - 72)); ny = ly + 2 + int(hash01(k, ln + 5, 81) * (lane - 17))
                rn = STICKY[int(hash01(k, ln, 82) * len(STICKY))]
            notes.append((nx, ny, rn))
    # critical path first (under the notes' shadows but over the board)
    if planned:
        path = [(nx + 7, ny + 7) for (nx, ny, rn) in notes[:9]]
        path = path[:4] + [(notes[13][0] + 7, notes[13][1] + 7), (notes[14][0] + 7, notes[14][1] + 7)] + path[6:]
        for (ax, ay), (bx, by) in zip(path, path[1:]):
            n = max(abs(bx - ax), abs(by - ay))
            for s in range(n + 1):
                x = ax + (bx - ax) * s / n; y = ay + (by - ay) * s / n
                cv.put(X(int(x)), Y(int(y)), C('paint_red', 1)); cv.put(X(int(x)), Y(int(y) + 1), C('paint_red', 2))
            cv.put(X(bx - 9), Y(by - 2), C('paint_red', 1)); cv.put(X(bx - 9), Y(by + 3), C('paint_red', 1))
        o.extra['critical_path'] = [[X(x), Y(y)] for x, y in path]
    for (nx, ny, rn) in notes:
        tilt = 0 if planned else (1 if hash01(nx, ny, 3) < 0.4 else 0)
        cv.rect(X(nx + 1), Y(ny + 1), 15, 14, SHADOW[:3] + (70,))
        for yy in range(14):
            ox = (yy * tilt) // 7
            hl(cv, X(nx + ox), Y(ny + yy), 15, C(rn, 1))
            cv.put(X(nx + ox + 14), Y(ny + yy), C(rn, 2))
        hl(cv, X(nx), Y(ny), 15, C(rn, 0)); hl(cv, X(nx + tilt * 2), Y(ny + 13), 15, C(rn, 2))
        for k in range(2): hl(cv, X(nx + 3), Y(ny + 5 + k * 3), 8 - k * 3, C(rn, 3))   # marker scribble (not letters)
    if planned:   # neat tick marks under the done column
        for k in range(3):
            cv.put(X(notes[k][0] + 5), Y(notes[k][1] + 16), C('enamel_g', 2)); cv.put(X(notes[k][0] + 6), Y(notes[k][1] + 17), C('enamel_g', 2)); cv.put(X(notes[k][0] + 7), Y(notes[k][1] + 16), C('enamel_g', 2)); cv.put(X(notes[k][0] + 8), Y(notes[k][1] + 15), C('enamel_g', 2))
    # marker tray with pens and an eraser
    cv.rect(X(x0 + 20), Y(y0 + bh), bw - 40, 4, C('metal', 2)); hl(cv, X(x0 + 20), Y(y0 + bh), bw - 40, C('metal', 0)); hl(cv, X(x0 + 20), Y(y0 + bh + 3), bw - 40, C('metal', 4))
    for k, col in enumerate(('paint_red', 'paint_blue', 'paint_black', 'enamel_g')):
        cv.rect(X(x0 + 40 + k * 12), Y(y0 + bh - 2), 9, 3, C(col, 1)); cv.put(X(x0 + 40 + k * 12), Y(y0 + bh - 2), C('white', 0))
    cv.rect(X(x0 + bw - 70), Y(y0 + bh - 4), 14, 5, C('navy', 2)); hl(cv, X(x0 + bw - 70), Y(y0 + bh - 4), 14, C('white', 2))
    o.finish(); return o


def build():
    objs = [kettle(), lockers(), meeting_table(), desk(), plan_chest(), sign_in(), filing(), cooler(), board(False), board(True),
            SH.exit_sign_at('exit_sign', EXIT_X, TH)]
    return {'size': [W, H], 'floor': floor(), 'walls': walls(), 'objects': objs,
            'variants': {'board': {'normal': 'board', 'planned': 'board_planned', 'flag': 'planned'}},
            'preview_skip': ['board_planned']}
