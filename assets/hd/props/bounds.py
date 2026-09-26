"""Field and garden boundaries as 16-mask autotiles (bit N=1, E=2, S=4, W=8 = which neighbours are the same kind):
hawthorn hedgerow, gritstone dry-stone wall, timber post-and-rail, white picket fence, iron railings; plus a field
gate, wicket gates and a stile. Everything is 3/4 view: the footprint sits on the tile, height projects up the
screen, only south faces are visible. Tiles are rendered with padding from world-periodic textures (mod 48) and
then cropped, so neighbouring tiles join seamlessly (no outline or shading seams)."""
import math
from kit import *  # noqa

T = TILE                     # 48
N, E, S, W = 1, 2, 4, 8
P = 12                       # render padding


def fp_mask(mask, x0, x1, y0, y1, ext=P):
    """Footprint: centre block [x0,x1)x[y0,y1) plus arms to each connected side (extended ext px past the tile)."""
    def inside(x, y):
        if x0 <= x < x1 and y0 <= y < y1: return True
        if mask & N and x0 <= x < x1 and -ext <= y < y0: return True
        if mask & S and x0 <= x < x1 and y1 <= y < T + ext: return True
        if mask & W and y0 <= y < y1 and -ext <= x < x0: return True
        if mask & E and y0 <= y < y1 and x1 <= x < T + ext: return True
        return False
    return inside


def crop_tile(cv, top):
    """Cut the tile (T wide, T + top + 8 tall) out of a padded render."""
    out = Canvas(T, T + top + 8)
    out.im.paste(cv.im.crop((P, P, P + T, P + T + top + 8)), (0, 0)); out.px = out.im.load(); return out


def ground_shadow_fp(sh, inside, img, depth=4, east=3):
    """Violet cast shadow on the ground south and east of a footprint (light from the north-west)."""
    for fy in range(-P, T + P):
        for x in range(-P, T + P):
            if not inside(x, fy): continue
            if not inside(x, fy + 1):
                for k in range(1, depth + 1):
                    X, Y = img(x, fy + k, 0)
                    sh.put(X, Y, SHADOW[:3] + ((100 if k < depth else 60),))
            if not inside(x + 1, fy):
                for k in range(1, east + 1):
                    if inside(x + k, fy): break
                    X, Y = img(x + k, fy, 0); sh.put(X, Y, SHADOW[:3] + (66,))


# ================================================================== hawthorn hedgerow
HEDGE_H = 32
HX0, HX1, HY0, HY1 = 6, 42, 8, 40


def hedge_tile(mask, variant=0, flowers='may'):
    """One hedge autotile, 48 x (48 + HEDGE_H + 3 + 8). Draw it at (tx*48, ty*48 - HEDGE_H - 3)."""
    Hh = HEDGE_H; TOPM = 3; top = Hh + TOPM
    Wv, Hv = T + 2 * P, T + top + 8 + 2 * P
    v = Vol(Wv, Hv); v.amb = {1: 0.12}
    inside = fp_mask(mask, HX0, HX1, HY0, HY1)
    img = lambda x, fy, zh: (int(round(x)) + P, int(round(fy + top - zh)) + P)
    rp = 'p_hedge'; ri = v._ri(rp)
    for fy in range(-P, T + P):                         # dark leafy hull so nothing shows through
        for x in range(-P, T + P):
            if not inside(x, fy): continue
            for zh in range(0, Hh - 2):
                X, Y = img(x, fy, zh)
                if 0 <= X < Wv and 0 <= Y < Hv:
                    v.z[Y, X] = -1e6 + fy; v.lum[Y, X] = 0.1 + 0.2 * zh / Hh; v.rid[Y, X] = ri; v.tag[Y, X] = 1
    n = 8; sp = T / n
    for j in range(-3, n + 3):
        for i in range(-3, n + 3):
            ii, jj = i % n, j % n
            x = i * sp + (hash01(ii, jj, 11 + variant) - 0.5) * 3.6 + (sp / 2 if jj % 2 else 0)
            fy = j * sp + (hash01(ii, jj, 12 + variant) - 0.5) * 3.6
            if not inside(int(x), int(fy)): continue
            dist = lambda ddx, ddy: next((d for d in range(0, 9) if not inside(int(x) + ddx * d, int(fy) + ddy * d)), 9)
            dn, ds, dw, de = dist(0, -1), dist(0, 1), dist(-1, 0), dist(1, 0)
            zh = Hh - 2 + (pnoise(x, fy, 12, T, T, 20 + variant) - 0.5) * 6
            zh -= max(0, 4 - min(dn, ds, dw, de)) * 1.5
            nx = (-0.8 if dw < 5 else 0) + (0.8 if de < 5 else 0)
            ny = -0.6 - (0.55 if dn < 5 else 0) + (0.3 if ds < 4 else 0)
            X, Y = img(x, fy, zh)
            r = 5.2 + hash01(ii, jj, 13 + variant) * 2.0
            v.clump(X, Y, 0, r, rp, gn=(nx, ny, 0.85, 1.25), lw=0.85, lobes=7, lamp=0.18, seed=ii * 7 + jj * 3 + variant * 50,
                    dz=fy + zh * 0.8, sq=0.85, jit=0.025, grp=ii * 10 + jj)
    for i in range(-3, n + 3):                          # the south face: rows of tufts down to the foot
        for k in range(5):
            ii = i % n
            x = i * sp + (hash01(ii, k, 31 + variant) - 0.5) * 3 + (sp / 2 if k % 2 else 0)
            for fy in range(-P, T + P):
                if inside(int(x), fy) and not inside(int(x), fy + 1):
                    zh = 5 + k * (Hh - 8) / 4.4 + (hash01(ii, k, 32 + variant) - 0.5) * 2.4
                    X, Y = img(x, fy + 2, zh)
                    r = 5.0 + hash01(ii, k, 33 + variant) * 1.8
                    lift = zh / Hh
                    v.clump(X, Y, 0, r, rp, gn=(0, 0.3, 0.95, 1.0), lw=0.85, lobes=7, lamp=0.18, bias=-0.22 * (1 - lift),
                            seed=ii * 5 + k * 17 + variant * 70, dz=fy + 2 + zh * 0.8, sq=0.9, jit=0.025, grp=500 + ii * 10 + k)
    v.contact_shadows(0.28, 2, 0.14, 0.1)
    cv = v.canvas()
    for fy in range(-P, T + P):                         # woody stems and leaf litter at the foot
        for x in range(-P, T + P):
            if inside(x, fy) and not inside(x, fy + 1):
                for zh in range(0, 5):
                    X, Y = img(x, fy, zh)
                    if not (0 <= X < Wv and 0 <= Y < Hv): continue
                    wx = x % T; h = hash01(wx, zh, 40 + variant)
                    stem = wx % 7 == 2 or (wx % 11 == 6 and zh > 1)
                    col = C('p_thornbark', 2 if stem and zh > 1 else (3 if stem else 4)) if zh < 4 else C(rp, 6)
                    if zh >= 3 and not stem and hash01(wx, 1, 41) < 0.5: col = C(rp, 5)
                    if zh == 0 and h < 0.3: col = C('p_bracken_o', 3)
                    cv.px[X, Y] = col
    if flowers:
        for y in range(Hv):
            for x in range(Wv):
                if not cv.px[x, y][3] or v.tag[y, x] != 1: continue
                wx, wy = (x - P) % T, (y - P) % T
                h = hash01(wx, wy, 60 + variant); L = v.lum[y, x]
                cl = pnoise(wx, wy, 6, T, T, 61 + variant)
                if flowers == 'may' and cl > 0.6 and h < 0.16 and L > 0.4:
                    cv.px[x, y] = C('p_blossom', 0 if L > 0.66 else 2)
                    if L > 0.66 and h < 0.03: cv.px[x, y] = C('flower_yel', 1)
                elif flowers == 'haws' and cl > 0.62 and h < 0.1 and L > 0.3:
                    cv.px[x, y] = C('p_berry', 2 if L > 0.5 else 3)
    outline(cv)
    sh = Canvas(Wv, Hv); ground_shadow_fp(sh, inside, img, 5, 3); over(sh, cv)
    return crop_tile(sh, top)


# ================================================================== gritstone dry-stone wall
WALL_B = 20             # body height below the cope stones
WALL_C = 7              # cope stone height
WX0, WX1, WY0, WY1 = 15, 33, 18, 33


def _seq(seed, lo, hi, period=T):
    """Periodic sequence of widths that exactly fills `period`: list of (start, width, id)."""
    out = []; x = 0; k = 0
    while x < period:
        w = lo + int(hash01(k, 0, seed) * (hi - lo + 1))
        if period - (x + w) < lo: w = period - x
        out.append((x, w, k)); x += w; k += 1
    return out


def _find(seq, p):
    p %= T
    for (s0, w, k) in seq:
        if s0 <= p < s0 + w: return (k, p - s0, w)
    return (0, 0, 1)


def _courses(seed):
    """Periodic course map of the wall face (stone id, u, v, w, h) by (x, zh)."""
    courses = []; z = 0; k = 0
    while z < WALL_B:
        h = 4 + int(hash01(k, 0, seed) * 3.99)
        if WALL_B - (z + h) < 3: h = WALL_B - z
        off = int(hash01(k, 1, seed) * T)
        courses.append((z, h, _seq(seed * 7 + k, 6, 15), off, k)); z += h; k += 1

    def f(x, zz):
        for (z0, h, sq, off, k) in courses:
            if z0 <= zz < z0 + h:
                sid, u, w = _find(sq, x + off)
                return (k * 97 + sid, u, zz - z0, w, h)
        return None
    return f


def wall_tile(mask, variant=0, rp='p_gritdk'):
    """One gritstone dry-stone wall autotile, 48 x (48 + WALL_B + WALL_C + 3 + 8).
    Draw at (tx*48, ty*48 - WALL_B - WALL_C - 3)."""
    Hmax = WALL_B + WALL_C; TOPM = 3; top = Hmax + TOPM
    Wv, Hv = T + 2 * P, T + top + 8 + 2 * P
    cv = Canvas(Wv, Hv)
    inside = fp_mask(mask, WX0, WX1, WY0, WY1)
    img = lambda x, fy, zh: (x + P, fy + top - zh + P)
    face = _courses(90 + variant)
    copeH = _seq(120 + variant, 5, 9); copeV = _seq(140 + variant, 4, 6)
    hc = bool(mask & (E | W)) or not (mask & (N | S))

    def orient(x, fy):   # 'h' = cope slabs across an E-W run, 'v' = across a N-S run
        if WY0 <= fy < WY1 and (hc or not (WX0 <= x < WX1)): return 'h'
        return 'v'

    def cope(x, fy):
        o = orient(x, fy)
        k, u, w = _find(copeH, x) if o == 'h' else _find(copeV, fy)
        return o, k, u, w

    def height(x, fy):
        if not inside(x, fy): return 0
        o, k, u, w = cope(x, fy)
        if u == w - 1: return WALL_B + 1                 # the gap between cope stones
        hv = int(hash01(k, 5, 150 + variant) * 2.5)
        h = Hmax - hv
        if o == 'h' and (u == 0 or u == w - 2): h -= 1   # rounded shoulders
        if o == 'v' and (u == 0): h -= 1
        return h

    tone = lambda sid, s: (hash01(sid, 3, s) - 0.5) * 0.3
    for fy in range(-P, T + P):
        for x in range(-P, T + P):
            h = height(x, fy)
            if not h: continue
            o, k, u, w = cope(x, fy)
            ctone = tone(k, 160 + variant + (0 if o == 'h' else 9))
            wx, wy = x % T, fy % T
            for zh in range(0, h + 1):
                X, Y = img(x, fy, zh)
                if not (0 <= X < Wv and 0 <= Y < Hv): continue
                if zh == h:                                  # crests seen from above
                    if h <= WALL_B + 1: col = C(rp, 5)
                    else:
                        L = 0.8 + ctone + (0.08 if u == 0 else 0) - (0.2 if u == w - 2 else 0)
                        if o == 'h':
                            if not inside(x, fy - 1): L += 0.06
                            if not inside(x, fy + 1): L -= 0.1
                        L += (hash01(wx, wy, 98) - 0.5) * 0.12
                        col = shade(rp, L)
                        if pnoise(wx, wy, 6, T, T, 99 + variant) > 0.7: col = C('p_moss', 1 if L > 0.72 else 2)
                        elif hash01(wx, wy, 100) < 0.05: col = C('p_lichen', 1)
                elif zh >= WALL_B:                           # front of a cope slab
                    if h <= WALL_B + 1: col = C(rp, 5)
                    else:
                        L = 0.54 + ctone + (0.1 if u == 0 else 0) - (0.2 if u >= w - 2 else 0)
                        if zh == h - 1: L += 0.12
                        if zh == WALL_B: L -= 0.14
                        L += (hash01(wx, zh, 101) - 0.5) * 0.1
                        col = shade(rp, L)
                        if zh == h - 1 and pnoise(wx, wy, 6, T, T, 99 + variant) > 0.66: col = C('p_moss', 2)
                else:                                        # coursed body stones, no mortar
                    s = face(x % T, zh)
                    sid, su, sv, sw, sh_ = s
                    corner = (su in (0, sw - 1)) and (sv in (0, sh_ - 1))
                    if sv == 0 or su == sw - 1 or corner:
                        col = C(rp, 5) if (sv == 0 or corner) else C(rp, 4)
                    else:
                        L = 0.6 + tone(sid, 170 + variant)
                        if sv == sh_ - 1: L += 0.2
                        if su == 0: L += 0.1
                        if su == sw - 2 or sv == 1: L -= 0.1
                        L -= 0.28 * (1 - zh / WALL_B) ** 2
                        L += (hash01(wx, zh, 102) - 0.5) * 0.12
                        col = shade(rp, L)
                        if hash01(sid, 4, 171) < 0.18: col = shade('p_grit', L - 0.05)        # paler sandy stones
                        if pnoise(wx, zh, 6, T, 24, 103 + variant) > 0.72 and zh > 3 and sv >= sh_ - 2:
                            col = C('p_moss', 2 if L > 0.55 else 3)
                        elif hash01(sid, 9, 104) < 0.14 and hash01(wx, zh, 105) < 0.4:
                            col = C('p_lichen', 1 if sv > 1 else 2)
                    cv.put(X, Y, col); continue
                cv.put(X, Y, col)
    # through-stones poking out of the face
    for fy in range(-P, T + P):
        for x in range(-P, T + P):
            if inside(x, fy) and not inside(x, fy + 1) and (x % T) in (8 + variant * 5, 31 + variant * 3) and orient(x, fy) == 'h':
                if not all(inside(xx, fy) and not inside(xx, fy + 1) for xx in range(x - 1, x + 9)): continue
                zt = 10; X, Y = img(x, fy, zt)
                for xx in range(-1, 8):
                    cv.put(X + xx, Y - 1, C(rp, 1)); cv.put(X + xx, Y, C(rp, 2)); cv.put(X + xx, Y + 1, C(rp, 4))
                for xx in range(0, 9): cv.put(X + xx, Y + 2, C(rp, 5))
    outline(cv)
    sh = Canvas(Wv, Hv); ground_shadow_fp(sh, inside, img, 4, 3); over(sh, cv)
    return crop_tile(sh, top)


# ================================================================== box painter (fences, gates, stiles, benches)
def boxes(cv, items, top, ox=0, oy=0):
    """Paint 3/4-view boxes. Each item: (x0, x1, y0, y1, z0, z1, ramp, opts) in world px (y = footprint depth,
    z = height). Painted back (north) to front (south), then bottom to top. opts: round (cylinder shading
    across x), bias, tex(x, y, face) -> lum offset, cap (lit top), side (dark east face px)."""
    items = sorted(items, key=lambda b: (b[3], b[4]))
    for (x0, x1, y0, y1, z0, z1, rp, o) in items:
        o = o or {}; bias = o.get('bias', 0.0); tex = o.get('tex')
        w = x1 - x0
        # front (south) face
        for zh in range(int(z0), int(z1)):
            for xx in range(int(x0), int(x1)):
                u = (xx - x0 + 0.5) / max(1, w) * 2 - 1
                if o.get('round'): L = light(u, -0.1, math.sqrt(max(0, 1 - u * u))) * 0.85 + 0.08
                else: L = 0.6 + (0.1 if xx == x0 else 0) - (0.2 if xx >= x1 - (o.get('side', 1)) else 0)
                if zh == int(z1) - 1 and not o.get('nocap'): L += 0.12
                L += bias + (tex(xx, zh, 'f') if tex else 0)
                cv.put(xx + ox, y1 - 1 - zh + top + oy, shade(rp, L))
        # top face
        for yy in range(int(y0), int(y1)):
            for xx in range(int(x0), int(x1)):
                L = 0.86 + bias - (0.12 if xx >= x1 - 1 else 0) + (0.05 if yy == y0 else 0)
                L += (tex(xx, yy, 't') if tex else 0)
                cv.put(xx + ox, yy - int(z1) + top + oy, shade(rp, L))


def grain(seed, amt=0.1):
    return lambda x, y, f: ((vnoise(x * 0.35, y * 1.6, 2, seed) - 0.5) * amt * 2) if f == 'f' else ((vnoise(x * 1.6, y * 0.35, 2, seed) - 0.5) * amt * 2)


def post_shadow(sh, x0, x1, y1, top, h, ox=0, oy=0, a=90):
    """Short violet shadow falling south-east from a post or bar."""
    for k in range(1, 3 + h // 10):
        for xx in range(x0 + k // 2, x1 + k // 2 + 1):
            sh.put(xx + ox, y1 - 1 + k + top + oy, SHADOW[:3] + (a,))


def fence_tile(mask, kind='rail', variant=0):
    """Fence autotiles. kind: 'rail' (timber post-and-rail), 'picket' (white picket), 'rails' (iron railings on a
    stone plinth). Line runs along the tile centre. Draw at (tx*48, ty*48 - top) where top = FENCE_TOP[kind]."""
    top = FENCE_TOP[kind]
    cv = Canvas(T, T + top + 8); sh = Canvas(T, T + top + 8)
    items = []
    cy0, cy1 = 26, 30                           # line of the fence across the tile (footprint depth)
    cx0, cx1 = 22, 26
    hN, hE, hS, hW = mask & N, mask & E, mask & S, mask & W
    lone = not mask
    if kind == 'rail':
        tr = 'p_timber'; g = grain(300 + variant, 0.12)
        items.append((cx0 - 1, cx1 + 1, cy0 - 1, cy1 + 1, 0, 30, tr, {'tex': g, 'side': 2}))
        post_shadow(sh, cx0, cx1 + 1, cy1 + 1, top, 30)
        for (z0, z1) in ((11, 15), (22, 26)):
            if hW: items.append((0, cx0 - 1, cy0 + 1, cy1 - 1, z0, z1, tr, {'tex': g, 'nocap': False}))
            if hE: items.append((cx1 + 1, T, cy0 + 1, cy1 - 1, z0, z1, tr, {'tex': g}))
        for (z0, z1) in ((11, 15), (22, 26)):
            if hN: items.append((cx0 + 1, cx1 - 1, 0, cy0 - 1, z0, z1, tr, {'tex': g}))
            if hS: items.append((cx0 + 1, cx1 - 1, cy1 + 1, T, z0, z1, tr, {'tex': g}))
        if hS or hN:  # an intermediate stake halfway along N-S runs
            if hS: items.append((cx0, cx1, 44, 47, 0, 26, tr, {'tex': g}))
    elif kind == 'picket':
        pr = 'paint_cream'
        for (z0, z1) in ((6, 9), (17, 20)):
            if hW: items.append((0, cx0, cy0 + 2, cy1, z0, z1, pr, {'bias': -0.12}))
            if hE: items.append((cx1, T, cy0 + 2, cy1, z0, z1, pr, {'bias': -0.12}))
            if hN: items.append((cx0 + 1, cx1 - 1, 0, cy0, z0, z1, pr, {'bias': -0.12}))
            if hS: items.append((cx0 + 1, cx1 - 1, cy1, T, z0, z1, pr, {'bias': -0.12}))
        xs = [x for x in range(0, T, 6) if (hW and x < cx0) or (hE and x >= cx1)]
        for x in xs:
            items.append((x + 1, x + 5, cy0, cy0 + 2, 0, 24, pr, {'picket': True}))
            post_shadow(sh, x + 1, x + 5, cy0 + 2, top, 20, a=70)
        ys = [y for y in range(3, T, 6) if (hN and y < cy0) or (hS and y >= cy1)]
        for y in ys:
            items.append((cx0, cx1, y, y + 2, 0, 24, pr, {'picket': True}))
        items.append((cx0 - 1, cx1 + 1, cy0 - 1, cy1 + 1, 0, 27, pr, {'side': 2}))
        post_shadow(sh, cx0, cx1 + 1, cy1 + 1, top, 27)
    elif kind == 'rails':
        ir = 'p_iron'; st = 'p_gritdk'
        # dressed-stone plinth
        pl = []
        if hW: pl.append((0, cx0, cy0 - 1, cy1 + 1))
        if hE: pl.append((cx1, T, cy0 - 1, cy1 + 1))
        if hN: pl.append((cx0 - 1, cx1 + 1, 0, cy0))
        if hS: pl.append((cx0 - 1, cx1 + 1, cy1, T))
        pl.append((cx0 - 2, cx1 + 2, cy0 - 2, cy1 + 2))
        for (a, b, c, d) in pl: items.append((a, b, c, d, 0, 7, st, {'tex': lambda x, y, f: (hash01(x // 6, y, 7) - 0.5) * 0.16}))
        for (z0, z1) in ((9, 11), (33, 35)):
            if hW: items.append((0, cx0, cy0 + 1, cy0 + 3, z0, z1, ir, {}))
            if hE: items.append((cx1, T, cy0 + 1, cy0 + 3, z0, z1, ir, {}))
            if hN: items.append((cx0 + 1, cx1 - 1, 0, cy0, z0, z1, ir, {}))
            if hS: items.append((cx0 + 1, cx1 - 1, cy1, T, z0, z1, ir, {}))
        xs = [x for x in range(1, T, 5) if (hW and x < cx0 - 1) or (hE and x >= cx1 + 1)]
        for x in xs:
            items.append((x, x + 2, cy0 + 1, cy0 + 3, 7, 38, ir, {'spear': True}))
        ys = [y for y in range(2, T, 5) if (hN and y < cy0 - 1) or (hS and y >= cy1 + 1)]
        for y in ys:
            items.append((cx0 + 1, cx1 - 1, y, y + 2, 7, 38, ir, {'spear': True}))
        items.append((cx0 - 1, cx1 + 1, cy0 - 1, cy1 + 1, 7, 40, ir, {'round': True, 'finial': True}))
        post_shadow(sh, cx0 - 1, cx1 + 2, cy1 + 2, top, 30)
        for x in xs: post_shadow(sh, x, x + 2, cy0 + 4, top, 18, a=60)
    boxes(cv, items, top)
    # extras: picket points, spear heads, finials
    for (x0, x1, y0, y1, z0, z1, rp, o) in items:
        if o and o.get('picket'):
            yt = y0 - z1 + top
            for xx in range(int(x0), int(x1)):
                d = min(xx - x0, x1 - 1 - xx)
                for k in range(0, 2 - d): cv.px[xx, yt + k] = (0, 0, 0, 0)
            cv.put((x0 + x1) // 2 - 1 if x1 - x0 > 3 else x0, yt, C(rp, 0))
        if o and o.get('spear'):
            yt = y0 - z1 + top; xm = int(x0)
            cv.put(xm, yt - 1, C('gold', 1)); cv.put(xm + 1, yt - 1, C('gold', 2)); cv.put(xm, yt - 2, C('gold', 0))
            cv.put(xm - 1, yt, C('p_iron', 2)); cv.put(xm + 2, yt, C('p_iron', 3))
        if o and o.get('finial'):
            yt = y0 - z1 + top; xm = int((x0 + x1) / 2)
            cv.ellipse(xm, yt - 2, 2.5, 2.5, lambda x, y, nx, ny, nz: shade('gold', light(nx, ny, nz)))
    fin(cv)
    over(sh, cv)
    return sh


FENCE_TOP = {'rail': 34, 'picket': 30, 'rails': 46}


def field_gate(open_=False, variant=0):
    """A five-bar timber field gate, 2 tiles (96 px) wide, hanging post on the west. Closed, or swung open
    (edge-on). Anchor: the bottom of the hanging post. Draw with top = 40."""
    top = 44; Wd = 2 * T
    cv = Canvas(Wd, T + top + 8); sh = Canvas(Wd, T + top + 8)
    tr = 'p_greyoak'; g = grain(310 + variant, 0.12)
    cy0, cy1 = 26, 30
    items = [(2, 9, cy0 - 1, cy1 + 1, 0, 38, 'p_timber', {'tex': g, 'side': 2}),
             (Wd - 9, Wd - 2, cy0 - 1, cy1 + 1, 0, 36, 'p_timber', {'tex': g, 'side': 2})]
    post_shadow(sh, 2, 10, cy1 + 1, top, 38); post_shadow(sh, Wd - 9, Wd - 1, cy1 + 1, top, 36)
    if not open_:
        x0, x1 = 9, Wd - 11
        items.append((x0, x0 + 4, cy0 + 1, cy1 - 1, 4, 32, tr, {'tex': g}))          # hanging stile
        items.append((x1 - 3, x1, cy0 + 1, cy1 - 1, 4, 32, tr, {'tex': g}))          # shutting stile
        for z in (4, 10, 16, 22, 28):
            items.append((x0 + 4, x1 - 3, cy0 + 1, cy1 - 1, z, z + 3 + (1 if z == 28 else 0), tr, {'tex': g}))
        items.append(((x0 + x1) // 2 - 1, (x0 + x1) // 2 + 2, cy0 + 1, cy1 - 1, 4, 31, tr, {'tex': g}))
        boxes(cv, items, top)
        # the diagonal brace, from bottom of the hanging side up to the top of the middle upright
        bx0, bz0, bx1, bz1 = x0 + 4, 5, (x0 + x1) // 2 - 1, 29
        for i in range(0, 60):
            t = i / 59; xx = bx0 + (bx1 - bx0) * t; zz = bz0 + (bz1 - bz0) * t
            for d in range(3):
                cv.put(int(xx), int(cy1 - 2 - zz + top - d), shade(tr, 0.62 - d * 0.12 + g(int(xx), int(zz), 'f')))
        # ironwork: hinges and latch
        for z in (8, 26):
            for xx in range(2, 16): cv.put(xx, cy1 - 2 - z + top, C('p_iron', 2 if xx < 9 else 1))
        cv.rect(x1 - 1, cy1 - 2 - 22 + top, 6, 2, C('p_galv', 1))
        for x in range(10, x1, 8): post_shadow(sh, x, x + 5, cy1 + 1, top, 10, a=50)
    else:
        boxes(cv, items, top)
        # swung open to the north: seen edge-on it is a thin line of bar ends receding up the screen
        for fy in range(cy0 - 28, cy0 + 1):
            for z in (4, 10, 16, 22, 28):
                for d in range(3): cv.put(9 + d, fy - z + top, shade(tr, 0.8 - d * 0.18))
        for z in range(4, 33): cv.put(10, cy0 - 28 - z + top, C(tr, 1))
    fin(cv); over(sh, cv)
    return sh, top


def wicket_gate(open_=False, variant=0):
    """A one-tile timber wicket gate for public gaps in hedges and walls. Draw with top = 42."""
    top = 42
    cv = Canvas(T, T + top + 8); sh = Canvas(T, T + top + 8)
    tr = 'p_timber'; g = grain(320 + variant, 0.12)
    cy0, cy1 = 26, 30
    items = [(1, 7, cy0 - 1, cy1 + 1, 0, 36, tr, {'tex': g, 'side': 2}), (T - 7, T - 1, cy0 - 1, cy1 + 1, 0, 36, tr, {'tex': g, 'side': 2})]
    post_shadow(sh, 1, 8, cy1 + 1, top, 36); post_shadow(sh, T - 7, T, cy1 + 1, top, 36)
    if not open_:
        items += [(8, 11, cy0 + 1, cy1 - 1, 3, 30, tr, {'tex': g}), (T - 11, T - 8, cy0 + 1, cy1 - 1, 3, 30, tr, {'tex': g})]
        for z in (3, 15, 27):
            items.append((11, T - 11, cy0 + 1, cy1 - 1, z, z + 3, tr, {'tex': g}))
        for x in range(13, T - 12, 5):
            items.append((x, x + 3, cy0 + 1, cy0 + 3, 6, 27, tr, {'tex': g, 'bias': -0.05}))
        boxes(cv, items, top)
        cv.rect(T - 12, cy1 - 2 - 20 + top, 5, 2, C('p_iron', 1))
    else:
        boxes(cv, items, top)
        for fy in range(cy0 - 26, cy0):
            for z in (3, 15, 27):
                for d in range(3): cv.put(8 + d, fy - z + top, shade(tr, 0.82 - d * 0.18))
    fin(cv); over(sh, cv)
    return sh, top


def stile(variant=0):
    """A timber step stile: two posts, a step plank and a top rail, set over a wall or fence line. Top = 40."""
    top = 40
    cv = Canvas(T, T + top + 8); sh = Canvas(T, T + top + 8)
    tr = 'p_greyoak'; g = grain(330 + variant, 0.14)
    items = [(6, 11, 22, 27, 0, 34, tr, {'tex': g, 'side': 2}), (T - 11, T - 6, 22, 27, 0, 34, tr, {'tex': g, 'side': 2}),
             (4, T - 4, 27, 35, 10, 13, 'p_timber', {'tex': g}),                       # step plank (south side)
             (4, T - 4, 17, 22, 10, 13, 'p_timber', {'tex': g}),                       # step plank (north side)
             (8, T - 8, 23, 26, 26, 30, tr, {'tex': g})]                               # top rail
    items += [(9, 13, 29, 34, 0, 10, 'p_timber', {'tex': g}), (T - 13, T - 9, 29, 34, 0, 10, 'p_timber', {'tex': g})]
    boxes(cv, items, top)
    for (a, b, c) in ((6, 12, 27), (T - 11, T - 5, 27), (4, T - 3, 35)): post_shadow(sh, a, b, c, top, 20)
    fin(cv); over(sh, cv)
    return sh, top
