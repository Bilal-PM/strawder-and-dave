"""Lineside fencing autotiles, anti-trespass guards, a main-line colour-light signal, the cutting's shopping trolley and
the depot siding's trap points (48 px per tile).

Fence autotiles: one sprite per neighbour mask (N=1, E=2, S=4, W=8; a neighbour counts if it is 'f' or '!'), two
variants each, for three styles (palisade, wire, timber). Each image is 48 wide and 48 + FH tall; its `origin`
([0, FH]) is the image pixel that sits on the tile's top-left, so the fence may rise FH px above its tile. The fence
line runs through the tile centre (x = 24) and stands on ground line y = FH + GY (a little south of the tile centre,
so posts read as standing in the tile)."""
from rp import *  # noqa

T = TILE
GY = 30   # ground line of an east-west run, in tile px

pix.RAMPS['palisade'] = ['#93a69c', '#6d8279', '#52655f', '#3c4c49', '#2a3637', '#1c2426']
pix.RAMPS['wire'] = ['#e6e9ea', '#b9bfc3', '#8c949b', '#666e77']
pix.RAMPS['cpost'] = ['#e4e1d7', '#c5c1b6', '#a19d93', '#7e7a73', '#5b5853']
RAMPS.update(pix.RAMPS)

STYLE = {'palisade': 66, 'wire': 44, 'timber': 42}


def _canvas(style):
    fh = STYLE[style]
    return Canvas(T, T + fh), fh


# ---------- palisade: W-section pales with triple-pointed heads on two rails; RHS posts

def _pal_ew(cv, fh, x0, x1, seed, v):
    gy = fh + GY; top = gy - fh
    for x in range(x0, x1):
        u = x % 6
        if u == 5:   # gap between pales: the dark rails behind show through
            continue
        i = (1, 0, 1, 2, 3)[u]
        head = top + (0 if u in (0, 2, 4) else 3)
        for y in range(head, gy):
            c = C('palisade', i)
            if v and fbm(x, y, 7, seed) < 0.12: c = C('rust', 2 + (u > 2))
            if y > gy - 4 and hash01(x, y, seed) < 0.4: c = C('palisade', min(5, i + 1))
            P(cv, x, y, c)
        P(cv, x, head, C('palisade', 0 if u in (0, 2) else 2))
    for ry in (top + 12, gy - 14):   # rails (behind the pales' lit faces, visible in the gaps)
        for x in range(x0, x1):
            if x % 6 == 5:
                P(cv, x, ry, C('palisade', 2)); P(cv, x, ry + 1, C('palisade', 3)); P(cv, x, ry + 2, C('palisade', 5))
            else:
                P(cv, x, ry + 3, C('palisade', 4))   # rail shadow under the bolts
            if x % 6 == 2: P(cv, x, ry + 1, C('palisade', 0)); P(cv, x, ry + 2, C('palisade', 4))   # bolt head
    for x in range(x0, x1):
        if hash01(x, 0, seed) < 0.75: shadow_px(cv, x, gy); shadow_px(cv, x + 1, gy + 1)


def _pal_ns(cv, fh, g0, g1, seed, v):
    """North-south run seen edge-on between ground rows g0..g1 (tile px): pale tips seen from above as a serrated
    ridge, the face in shade."""
    cx = T // 2
    for gy in range(g0, g1):
        sy = fh + gy
        for y in range(sy - fh, sy):
            for x in range(cx - 3, cx + 4):
                u = x - cx + 3
                i = (1, 1, 2, 2, 3, 4, 5)[u]
                if (sy - fh) == y and u < 3: i = 0
                P(cv, x, y, C('palisade', i))
        if gy % 3 == 0: P(cv, cx - 4, sy - fh, C('palisade', 1)); P(cv, cx + 4, sy - fh, C('palisade', 3))
    for gy in range(g0, g1):
        sy = fh + gy
        shadow_px(cv, cx + 4, sy - 1); shadow_px(cv, cx + 5, sy - 1)


def _pal_post(cv, fh):
    gy = fh + GY; cx = T // 2
    for y in range(gy - fh - 4, gy + 1):
        for x in range(cx - 4, cx + 4):
            P(cv, x, y, C('palisade', (0, 1, 1, 2, 2, 3, 4, 5)[x - cx + 4]))
    R(cv, cx - 5, gy - fh - 6, 10, 3, C('palisade', 1)); HL(cv, cx - 5, cx + 5, gy - fh - 6, C('palisade', 0))
    for x in range(cx - 6, cx + 7): shadow_px(cv, x + 2, gy + 1)


# ---------- post-and-wire: concrete posts, five strands

def _wire_ew(cv, fh, x0, x1, seed, v):
    gy = fh + GY
    for k in range(5):
        wy = gy - 6 - k * 8
        for x in range(x0, x1):
            sag = int(round(1.5 * math.sin(math.pi * ((x % T) / T)))) if k < 4 else 0
            if v and k == 2 and 30 < x < 40: continue   # a slack/broken strand
            P(cv, x, wy + sag, C('wire', 1 if (x + k) % 3 else 2))
            if (x + k * 2) % 7 == 0: shadow_px(cv, x + 1, wy + sag + 1, 60)
    # intermediate droppers + tufts at the foot
    for x in range(x0, x1):
        if fbm(x, 1, 6, seed) > 0.55:
            for k in range(int(2 + hash01(x, 2, seed) * 6)): P(cv, x, gy - k, C('grass', 1 + (k % 3)))


def _wire_ns(cv, fh, g0, g1, seed, v):
    cx = T // 2
    for gy in range(g0, g1):
        sy = fh + gy
        P(cv, cx, sy - 6 - 32, C('wire', 1)); P(cv, cx + 1, sy - 6 - 32, C('wire', 3))
    for gy in range(g0, g1):
        if (gy - g0) % 24 == 12: _cpost(cv, fh, cx, gy, small=True)


def _cpost(cv, fh, cx, gy_tile, small=False):
    gy = fh + gy_tile
    h = fh - (2 if small else 0)
    for y in range(gy - h, gy + 1):
        for x in range(cx - 3, cx + 3):
            P(cv, x, y, C('cpost', (0, 1, 1, 2, 3, 4)[x - cx + 3]))
    HL(cv, cx - 3, cx + 3, gy - h, C('cpost', 0))
    for k in range(5): P(cv, cx - 2, gy - 6 - k * 8, C('cpost', 4))   # wire holes
    for x in range(cx - 3, cx + 5): shadow_px(cv, x + 2, gy + 1)


# ---------- timber post-and-rail (station approach)

def _tim_ew(cv, fh, x0, x1, seed, v):
    gy = fh + GY
    for ry in (gy - fh + 4, gy - fh + 18, gy - fh + 32):
        for x in range(x0, x1):
            for k, i in enumerate((1, 2, 2, 3, 4)):
                c = C('wood', i)
                if v and fbm(x, ry + k, 8, seed) < 0.25: c = C('wood_dark', i - 1 if i > 0 else 0)
                if (x * 7 + k) % 23 == 0: c = C('wood', min(4, i + 1))
                P(cv, x, ry + k, c)
            P(cv, x, ry, C('wood', 0 if x % 11 else 1))
            shadow_px(cv, x, ry + 5, 70)
    for x in range(x0, x1):
        if fbm(x, 1, 6, seed) > 0.5:
            for k in range(int(2 + hash01(x, 2, seed) * 5)): P(cv, x, gy - k, C('grass', 1 + (k % 3)))


def _tim_ns(cv, fh, g0, g1, seed, v):
    cx = T // 2
    for gy in range(g0, g1):
        sy = fh + gy
        for ry in (sy - fh + 4, sy - fh + 18, sy - fh + 32):
            P(cv, cx - 1, ry, C('wood', 1)); P(cv, cx, ry, C('wood', 2)); P(cv, cx + 1, ry, C('wood', 3)); P(cv, cx + 2, ry, C('wood', 4))


def _tpost(cv, fh, cx, gy_tile):
    gy = fh + gy_tile
    for y in range(gy - fh - 2, gy + 1):
        for x in range(cx - 4, cx + 4):
            c = C('wood', (0, 1, 1, 2, 2, 3, 3, 4)[x - cx + 4])
            if (x * 5 + y // 7) % 11 == 0 and x > cx - 3: c = C('wood', 3)
            P(cv, x, y, c)
    HL(cv, cx - 4, cx + 4, gy - fh - 2, C('wood', 0))
    for x in range(cx - 4, cx + 6): shadow_px(cv, x + 2, gy + 1)


def fence(style, mask, v):
    cv, fh = _canvas(style)
    seed = mask * 7 + v * 101 + {'palisade': 1, 'wire': 2, 'timber': 3}[style]
    N, E, S, Wm = mask & 1, mask & 2, mask & 4, mask & 8
    ew = {'palisade': _pal_ew, 'wire': _wire_ew, 'timber': _tim_ew}[style]
    ns = {'palisade': _pal_ns, 'wire': _wire_ns, 'timber': _tim_ns}[style]
    cx = T // 2
    if N: ns(cv, fh, 0, GY, seed, v)                    # behind the centre post
    if Wm: ew(cv, fh, 0, cx, seed, v)
    if E: ew(cv, fh, cx, T, seed, v)
    if not (Wm or E or N or S): pass
    # centre post (always: ends, corners, junctions; straight runs get one per tile, like a real fence bay)
    if style == 'palisade': _pal_post(cv, fh)
    elif style == 'wire': _cpost(cv, fh, cx, GY)
    else: _tpost(cv, fh, cx, GY)
    if S: ns(cv, fh, GY + 1, T, seed, v)                # in front
    if v and style != 'palisade' and hash01(mask, v, 9) < 0.6:   # a nettle / bramble clump
        leaf_cluster(cv, cx + 13, fh + GY - 4, 6, 'leaf', seed, 0.8)
    return cv


# ---------- anti-trespass guards ('z' beside the crossing)

RAIL_TOP = {'n': 29, 's': 17}   # rail top edges in the two track rows (band y 29 and 65); rails are 7 px strips


def draw_sleepers(cv, band_off, closed=True):
    """Sleepers 66x12 every 24 px (centred on x = 12 + 24k), centred on the band centre y=48; band_off maps band y
    to this piece's y."""
    for sx in range(6, cv.w, 24):
        y0, y1 = 15 + band_off, 81 + band_off
        for y in range(max(0, y0), min(cv.h, y1)):
            for x in range(sx, sx + 12):
                u = x - sx
                i = (1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4)[u] + (1 if closed and hash01(x // 2, y // 5, 3) < 0.15 else 0)
                if y in (y0, y1 - 1): i = 1 if y == y0 else 4
                P(cv, x, y, C('sleeper', min(4, i)))


def draw_rail(cv, top, closed=True):
    rr = 'rust' if closed else 'rail'
    for x in range(cv.w):
        for k, i in enumerate((0, 1, 1, 2, 2, 3, 4)): P(cv, x, top + k, C(rr, i))
        if x % 24 in (10, 11, 12, 13): P(cv, x, top + 7, C('iron', 2)); P(cv, x, top - 1, C('iron', 1))   # chairs on the sleepers
        shadow_px(cv, x, top + 7)


def guard_panel(cv, x0, y0, w, h, seed, worn=True):
    """A field of triangular-section ridges (running north-south) on a panel: lit west faces, dark east faces."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            u = (x - x0) % 6
            i = (0, 1, 2, 3, 4, 4)[u]
            if (y - y0) in (0, h - 1): i = 3
            if (y - y0) % 16 == 15: i = 4                         # panel joint
            c = C('charcoal', i)
            if worn and fbm(x, y, 8, seed) < 0.18: c = C('moss', 3) if u < 3 else C('charcoal', 4)
            P(cv, x, y, c)
    ao_band(cv, x0, y0 + h, w, (0.35, 0.15))


def antitrespass(kind='cess', closed=True):
    """48x48 ground piece. kind: 'cess' (rows 19 and 22: panels over the ballast shoulder), 'track_n' (row 20) or
    'track_s' (row 21): panels between and beside the rails, with the rails and sleepers drawn in."""
    cv = Canvas(T, T)
    seed = {'cess': 1, 'track_n': 2, 'track_s': 3}[kind]
    for y in range(T):   # ballast underneath (only glimpsed at the panel edges)
        for x in range(T):
            P(cv, x, y, C('ballast', 1 + int(hash01(x // 2, y // 2, seed) * 3)))
    if kind == 'cess':
        guard_panel(cv, 3, 6, T - 6, 34, seed, closed)
    else:
        rt = RAIL_TOP[kind[-1]]; band = 0 if kind == 'track_n' else -T   # piece y -> 96px band y offset
        draw_sleepers(cv, band, closed)
        if kind == 'track_n':
            guard_panel(cv, 1, 2, T - 2, rt - 5, seed, closed)                  # outside the north rail
            guard_panel(cv, 1, rt + 10, T - 2, T - rt - 10, seed + 1, closed)   # four-foot
        else:
            guard_panel(cv, 1, 0, T - 2, rt - 3, seed, closed)                  # four-foot
            guard_panel(cv, 1, rt + 10, T - 2, T - rt - 12, seed + 1, closed)   # outside the south rail
        draw_rail(cv, rt, closed)
    return cv


# ---------- main-line colour-light signal

def colour_light(aspect='red'):
    """Tall galvanised post, ladder and cage, a 4-aspect head (Y, G, R, Y top to bottom) on a black backboard with a
    white border, hoods; a blank identification plate and a signal post telephone at the foot. Faces south."""
    Wd, Hh = 48, 230
    cv = Canvas(Wd, Hh)
    px = 21
    for y in range(40, Hh - 6):   # post
        for x in range(px, px + 6): P(cv, x, y, C('galv', (0, 1, 2, 2, 3, 4)[x - px]))
    for y in range(90, Hh - 20, 8):   # ladder on the left
        HL(cv, px - 10, px - 2, y, C('galv', 2))
    VL(cv, px - 11, 86, Hh - 20, C('galv', 2)); VL(cv, px - 2, 86, Hh - 20, C('galv', 3))
    R(cv, px - 18, 80, 42, 4, C('galv', 1)); HL(cv, px - 18, px + 24, 80, C('galv', 0)); HL(cv, px - 18, px + 24, 83, C('galv', 4))   # platform
    for y in range(64, 80):   # handrail, clear of the backboard
        P(cv, px - 18, y, C('yellow', 2)); P(cv, px + 23, y, C('yellow', 2))
    HL(cv, px - 18, px + 24, 64, C('yellow', 1)); HL(cv, px - 18, px + 24, 72, C('yellow', 2))
    # head + backboard
    hx0, hy0, hw, hh = px - 8, 2, 22, 70
    R(cv, hx0 - 5, hy0 - 2, hw + 10, hh + 4, C('white', 1))
    R(cv, hx0 - 3, hy0, hw + 6, hh, C('paint_black', 3))
    R(cv, hx0, hy0 + 2, hw, hh - 4, C('paint_black', 2)); VL(cv, hx0, hy0 + 2, hy0 + hh - 2, C('paint_black', 1))
    lit = {'red': 2, 'green': 1, 'yellow': 0, 'double_yellow': (0, 3)}[aspect]
    cols = ['mustard', 'forest', 'paint_red', 'mustard']
    for k in range(4):
        cy = hy0 + 10 + k * 16; cx = hx0 + hw // 2
        R(cv, cx - 7, cy - 8, 15, 3, C('paint_black', 1))    # hood
        on = (k == lit) or (isinstance(lit, tuple) and k in lit)
        for y in range(cy - 5, cy + 6):
            for x in range(cx - 5, cx + 6):
                d = (x - cx) ** 2 + (y - cy) ** 2
                if d <= 25:
                    if on:
                        rp = {'mustard': 'lamp_glow', 'forest': 'teal', 'paint_red': 'flower_red'}[cols[k]]
                        P(cv, x, y, C(rp, 0 if d < 5 else 1))
                    else:
                        P(cv, x, y, C('paint_black', 4) if d > 12 else C(cols[k], 4))
        if not on: P(cv, cx - 2, cy - 2, C('paint_black', 1))
    # ID plate (blank) + telephone box
    R(cv, px + 7, 120, 16, 10, C('white', 0)); HL(cv, px + 7, px + 23, 129, C('white', 2)); R(cv, px + 6, 119, 1, 12, C('paint_black', 3))
    R(cv, px + 7, Hh - 48, 14, 20, C('paint_black', 2)); HL(cv, px + 7, px + 21, Hh - 48, C('paint_black', 0))
    R(cv, px + 10, Hh - 44, 8, 3, C('yellow', 1))
    R(cv, px - 6, Hh - 8, 18, 8, C('concrete', 2)); HL(cv, px - 6, px + 12, Hh - 8, C('concrete', 0))
    for x in range(px - 6, px + 16): shadow_px(cv, x + 2, Hh - 1)
    outline(cv)
    lamp = [hx0 + hw // 2, hy0 + 10 + (lit if isinstance(lit, int) else 0) * 16]
    return cv, lamp


# ---------- shopping trolley in the cutting

def trolley():
    """A rusty shopping trolley lying on its side, basket mesh, castors, a faded red handle; nettles through it."""
    Wd, Hh = 42, 30
    cv = Canvas(Wd, Hh)
    bx0, by0, bw, bh = 4, 4, 30, 18   # basket side (lying on its side: we see the mesh side)
    for y in range(by0, by0 + bh):
        for x in range(bx0 + (y - by0) // 4, bx0 + bw):
            edge = y in (by0, by0 + bh - 1) or x in (bx0 + (y - by0) // 4, bx0 + bw - 1)
            if edge or (x - bx0) % 4 == 0 or (y - by0) % 4 == 0:
                c = C('rust', 1 if (x + y) % 3 else 2) if edge else C('metal', 2 if hash01(x, y, 3) > 0.4 else 3)
                if fbm(x, y, 5, 4) < 0.4: c = C('rust', 2 + (x % 2))
                P(cv, x, y, c)
    for x in range(bx0 + bw - 2, Wd - 1):   # handle (red plastic, faded)
        P(cv, x, by0 + 2, C('paint_red', 1)); P(cv, x, by0 + 3, C('paint_red', 3))
    VL(cv, Wd - 2, by0 + 2, by0 + 12, C('rust', 2))
    for (wx, wy) in ((bx0 + 2, by0 + bh + 2), (bx0 + bw - 4, by0 + bh + 2), (bx0 + 6, by0 + bh + 5)):   # castors
        R(cv, wx, wy, 5, 5, C('charcoal', 3)); P(cv, wx + 1, wy + 1, C('charcoal', 1)); VL(cv, wx + 2, wy - 3, wy, C('rust', 2))
    leaf_cluster(cv, 14, 16, 6, 'leaf', 5, 0.7)   # nettles growing through
    leaf_cluster(cv, 26, 20, 5, 'leaf', 6, 0.7)
    for x in range(3, Wd - 2): shadow_px(cv, x, Hh - 1)
    outline(cv)
    return cv


# ---------- trap points / scotch block on the depot siding

def trap_points(closed=True):
    """Ground piece 48x96 over the 2-row siding band (x66, rows 27-28): a pair of trap switch blades set to throw a
    runaway off the siding, a stretcher bar, the rodding to a ground-frame lever, and a yellow scotch block clamped
    on the south rail. Rails: 7 px strips with tops at y 29 and 65; sleepers 66x12 every 24 px centred on y 48."""
    Wd, Hh = T, 2 * T
    cv = Canvas(Wd, Hh)
    rr = 'rust' if closed else 'rail'
    draw_sleepers(cv, 0, closed)
    for top in (29, 65): draw_rail(cv, top, closed)
    for ry in (29, 65):   # switch blades against the inside of each stock rail's north face, diverging north-west
        for x in range(4, Wd - 2):
            off = int((Wd - 2 - x) * 0.18)
            y = ry - 3 - off
            P(cv, x, y, C(rr, 1)); P(cv, x, y + 1, C(rr, 3))
            if x < Wd - 16: P(cv, x, y - 1, C(rr, 0))
    R(cv, 8, 22, 4, 52, C('iron', 2)); VL(cv, 8, 22, 74, C('iron', 1))   # stretcher bar (x8, y22-74)
    for y in range(40, 44): HL(cv, 12, Wd, y, C('iron', 3 if y > 41 else 2))   # rodding to the ground frame
    # ground-frame lever (painted black, lever handle) at the east edge
    R(cv, Wd - 12, 34, 10, 14, C('paint_black', 2)); HL(cv, Wd - 12, Wd - 2, 34, C('paint_black', 0))
    for k in range(12): P(cv, Wd - 8 + k // 4, 34 - k, C('paint_black', 1 if k < 10 else 0))
    # scotch block on the south rail: yellow timber block with a hinge, padlocked
    R(cv, 22, 61, 14, 13, C('yellow', 1 if not closed else 2)); HL(cv, 22, 36, 61, C('yellow', 0)); HL(cv, 22, 36, 73, C('yellow', 3))
    VL(cv, 35, 61, 74, C('yellow', 3)); R(cv, 26, 74, 6, 5, C('mustard', 2)); R(cv, 36, 64, 4, 4, C('iron', 2))
    if closed:
        for x in range(Wd):
            for y in range(Hh):
                if opaque(cv, x, y) and fbm(x, y, 9, 13) > 0.72: P(cv, x, y, C('grass', 2 + (hash01(x, y, 1) < 0.4)))
    return cv
