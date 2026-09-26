"""Field and garden boundaries as 16-mask autotiles (bit N=1, E=2, S=4, W=8 = which neighbours are the same kind):
hawthorn hedgerow, gritstone dry-stone wall, plus fences (post-and-rail, picket, iron railings), a field gate
and a stile. Everything is 3/4 view: the footprint sits on the tile, height projects up the screen, and only
south faces are visible. Textures are periodic in world pixels (mod 32) so neighbouring tiles join seamlessly."""
import math
from kit import *  # noqa

N, E, S, W = 1, 2, 4, 8


def fp_mask(mask, x0, x1, y0, y1, ext=0):
    """Footprint of a boundary tile: centre block [x0,x1)x[y0,y1) plus arms to each connected side. ext > 0
    extends connected arms past the tile edge (for rendering seamlessly with padding)."""
    def inside(x, y):
        if x0 <= x < x1 and y0 <= y < y1: return True
        if mask & N and x0 <= x < x1 and -ext <= y < y0: return True
        if mask & S and x0 <= x < x1 and y1 <= y < 32 + ext: return True
        if mask & W and y0 <= y < y1 and -ext <= x < x0: return True
        if mask & E and y0 <= y < y1 and x1 <= x < 32 + ext: return True
        return False
    return inside


# ================================================================== hawthorn hedgerow
HEDGE_H = 22            # height of the hedge body (px)
HX0, HX1, HY0, HY1 = 4, 28, 5, 27   # centre block of the footprint


def hedge_tile(mask, variant=0, flowers='may'):
    """One hedge autotile, 32 x (32 + HEDGE_H + 4). Draw it at (tx*32, ty*32 - HEDGE_H - 2)."""
    P = 10; Hh = HEDGE_H; TOPM = 2
    Wv, Hv = 32 + 2 * P, 32 + Hh + 6 + 2 * P
    v = Vol(Wv, Hv); v.amb = {1: 0.14}
    inside = fp_mask(mask, HX0, HX1, HY0, HY1, ext=P)
    img = lambda x, fy, zh: (x + P, fy + Hh + TOPM - zh + P)   # world tile px -> vol px
    ramp_ = 'p_hedge'
    # hull backdrop so no holes show: dark leafy interior
    for fy in range(-P, 32 + P):
        for x in range(-P, 32 + P):
            if not inside(x, fy): continue
            for zh in range(0, Hh - 1):
                X, Y = img(x, fy, zh)
                if 0 <= X < Wv and 0 <= Y < Hv:
                    v.z[Y, X] = -1e6 + fy; v.lum[Y, X] = 0.12 + 0.18 * zh / Hh; v.rid[Y, X] = v._ri(ramp_); v.tag[Y, X] = 1
    sp = 32 / 6
    pts = []
    for j in range(-3, 10):
        for i in range(-3, 10):
            ii, jj = i % 6, j % 6
            x = i * sp + (hash01(ii, jj, 11 + variant) - 0.5) * 3.4 + (sp / 2 if jj % 2 else 0)
            fy = j * sp + (hash01(ii, jj, 12 + variant) - 0.5) * 3.4
            if inside(int(x), int(fy)): pts.append((x, fy, ii, jj))
    for (x, fy, ii, jj) in pts:
        # distance to free edges decides the rounding of the hedge's shoulders
        dn = next((d for d in range(0, 7) if not inside(int(x), int(fy) - d)), 7)
        ds = next((d for d in range(0, 7) if not inside(int(x), int(fy) + d)), 7)
        dw = next((d for d in range(0, 7) if not inside(int(x) - d, int(fy))), 7)
        de = next((d for d in range(0, 7) if not inside(int(x) + d, int(fy))), 7)
        zh = Hh - 1.5 + (pnoise(x, fy, 8, 32, 32, 20 + variant) - 0.5) * 4
        zh -= max(0, 3 - min(dn, ds, dw, de)) * 1.4
        nx = (-0.7 if dw < 4 else 0) + (0.7 if de < 4 else 0)
        ny = -0.55 - (0.5 if dn < 4 else 0) + (0.3 if ds < 3 else 0)
        X, Y = img(x, fy, zh)
        r = 4.2 + hash01(ii, jj, 13 + variant) * 1.6
        v.clump(X, Y, 0, r, ramp_, gn=(nx, ny, 0.85, 1.1), lw=0.75, lobes=6, lamp=0.2, seed=ii * 7 + jj * 3 + variant * 50,
                dz=fy + zh * 0.8, sq=0.85, jit=0.03, grp=ii * 10 + jj)
    # south face clumps along every free southern boundary
    for i in range(-3, 10):
        for k in range(4):
            ii = i % 6
            x = i * sp + (hash01(ii, k, 31 + variant) - 0.5) * 2.5 + (sp / 2 if k % 2 else 0)
            for fy in range(-P, 32 + P):
                if inside(int(x), fy) and not inside(int(x), fy + 1):
                    zh = 3.5 + k * (Hh - 6) / 3.4 + (hash01(ii, k, 32 + variant) - 0.5) * 2
                    X, Y = img(x, fy + 1.5, zh)
                    r = 4.0 + hash01(ii, k, 33 + variant) * 1.4
                    lift = zh / Hh
                    v.clump(X, Y, 0, r, ramp_, gn=(0, 0.3, 0.95, 1.0), lw=0.75, lobes=6, lamp=0.2, bias=-0.2 * (1 - lift),
                            seed=ii * 5 + k * 17 + variant * 70, dz=fy + 1.5 + zh * 0.8, sq=0.9, jit=0.03, grp=500 + ii * 10 + k)
    v.contact_shadows(0.26, 2, 0.12, 0.1)
    cv = v.canvas()
    # woody stems and dark litter at the foot of the face
    for fy in range(-P, 32 + P):
        for x in range(-P, 32 + P):
            if inside(x, fy) and not inside(x, fy + 1):
                for zh in range(0, 4):
                    X, Y = img(x, fy, zh)
                    if not (0 <= X < Wv and 0 <= Y < Hv): continue
                    h = hash01(x % 32, zh, 40 + variant)
                    col = C('p_thornbark', 3 if (x % 32) % 5 == 1 or h < 0.2 else 4) if zh < 3 else C(ramp_, 6)
                    if zh >= 2 and hash01(x % 32, 1, 41) < 0.55: col = C(ramp_, 5)
                    cv.px[X, Y] = col
    # blossom / haws
    if flowers:
        for y in range(Hv):
            for x in range(Wv):
                if not cv.px[x, y][3] or v.tag[y, x] != 1: continue
                wx, wy = (x - P) % 32, (y - P) % 32
                h = hash01(wx, wy, 60 + variant); L = v.lum[y, x]
                if flowers == 'may' and h < 0.06 and L > 0.35:
                    cv.px[x, y] = C('p_blossom', 0 if L > 0.62 else 2)
                elif flowers == 'haws' and h < 0.035 and L > 0.3:
                    cv.px[x, y] = C('p_berry', 2 if L > 0.5 else 3)
    outline(cv)
    # contact shadow on the ground to the south (and a touch east)
    sh = Canvas(Wv, Hv)
    for fy in range(-P, 32 + P):
        for x in range(-P, 32 + P):
            if inside(x, fy) and not inside(x, fy + 1):
                for k in range(1, 4):
                    X, Y = img(x, fy + k, 0)
                    if 0 <= X < Wv and 0 <= Y < Hv: sh.put(X, Y, SHADOW[:3] + ((96 if k < 3 else 60),))
            if inside(x, fy) and not inside(x + 1, fy):
                for k in range(1, 3):
                    X, Y = img(x + k, fy, 0)
                    if 0 <= X < Wv and 0 <= Y < Hv and not inside(x + k, fy): sh.put(X, Y, SHADOW[:3] + (70,))
    over(sh, cv)
    out = Canvas(32, 32 + Hh + 6)
    out.im.paste(sh.im.crop((P, P, P + 32, P + 32 + Hh + 6)), (0, 0)); out.px = out.im.load()
    return out


# ================================================================== gritstone dry-stone wall
WALL_B = 14            # body height (px) below the cope stones
WALL_C = 5             # cope stone height
WX0, WX1, WY0, WY1 = 10, 22, 12, 22   # centre block


def _stone_face(seed):
    """Periodic (32 px) course map for the wall face: returns fn(x, z) -> (stone id, u, v, w, h) or None (gap)."""
    courses = []
    z = 0; k = 0
    while z < WALL_B:
        h = 3 + int(hash01(k, 0, seed) * 2.2)
        if z + h > WALL_B: h = WALL_B - z
        stones = []; x = int(hash01(k, 1, seed) * 6)
        start = x
        while x < start + 32:
            w = 4 + int(hash01(k, x, seed + 2) * 6)
            if x + w > start + 32: w = start + 32 - x
            stones.append((x, w)); x += w
        courses.append((z, h, stones, k)); z += h; k += 1

    def f(x, zz):
        for (z0, h, stones, k) in courses:
            if z0 <= zz < z0 + h:
                for (sx, w) in stones:
                    xx = (x - sx) % 32
                    if xx < w: return (k * 64 + sx, xx, zz - z0, w, h)
        return None
    return f


def wall_tile(mask, variant=0, ramp_='p_grit'):
    """One dry-stone wall autotile, 32 x (32 + WALL_B + WALL_C + 4). Draw at (tx*32, ty*32 - WALL_B - WALL_C - 2)."""
    Hmax = WALL_B + WALL_C; TOPM = 2
    out = Canvas(32, 32 + Hmax + 6)
    inside = fp_mask(mask, WX0, WX1, WY0, WY1)
    face = _stone_face(90 + variant)
    horiz_centre = bool(mask & (E | W)) or not (mask & (N | S))

    def height(x, fy):
        if not inside(x, fy): return 0
        if (WX0 <= x < WX1 and WY0 <= fy < WY1 and horiz_centre) or (not (WX0 <= x < WX1) and WY0 <= fy < WY1):
            # H run: cope stones are slabs across the wall, 4 px wide with 1 px dark gaps
            k = (x + variant * 2) % 4
            return Hmax - (2 if k == 3 else 0) - (1 if hash01(x // 4, 0, 95 + variant) < 0.3 else 0)
        k = (fy + variant) % 4
        return Hmax - (2 if k == 3 else 0) - (1 if hash01(fy // 4, 1, 96 + variant) < 0.3 else 0)

    stone_tone = lambda sid: (hash01(sid, 3, 97 + variant) - 0.5) * 0.28
    for fy in range(0, 32):
        for x in range(0, 32):
            h = height(x, fy)
            if not h: continue
            south_free = not inside(x, fy + 1)
            for zh in range(0, h + 1):
                iy = fy + Hmax + TOPM - zh
                top = zh == h
                if top:
                    # the crest of a cope stone: lit, weathered, the odd moss cushion
                    k = (x % 4) if (WY0 <= fy < WY1 and (horiz_centre or not (WX0 <= x < WX1))) else (fy % 4)
                    L = 0.86 - (0.25 if k == 3 else 0) + (0.08 if k == 0 else 0)
                    if not inside(x, fy - 1): L += 0.06
                    if not inside(x + 1, fy): L -= 0.2
                    L += (hash01(x, fy, 98) - 0.5) * 0.12
                    col = shade(ramp_, L)
                    m = pnoise(x, fy, 4, 32, 32, 99 + variant)
                    if m > 0.72: col = C('p_moss', 1 if L > 0.7 else 2)
                    elif hash01(x, fy, 100) < 0.04: col = C('p_lichen', 1)
                    out.put(x, iy, col)
                else:
                    if zh >= WALL_B:          # the front of a cope slab
                        k = (x % 4) if (WY0 <= fy < WY1 and (horiz_centre or not (WX0 <= x < WX1))) else None
                        L = 0.58 - (0.18 if k == 3 else 0) + (0.06 if k == 0 else 0) - (0.06 if zh == WALL_B else 0)
                        if k is None: L = 0.55 if zh > WALL_B else 0.42
                        out.put(x, iy, shade(ramp_, L + (hash01(x, zh, 101) - 0.5) * 0.1))
                    else:
                        s = face(x % 32, zh)
                        if s is None: out.put(x, iy, C(ramp_, 5)); continue
                        sid, u, vv, w, hh = s
                        L = 0.6 + stone_tone(sid)
                        if vv == hh - 1: L += 0.2                  # top edge of each stone catches the light
                        if u == 0: L += 0.08
                        if vv == 0 or u == w - 1: col = C(ramp_, 5)  # dark joints: dry stone, no mortar
                        else:
                            L -= 0.24 * (1 - zh / WALL_B) ** 2     # ground AO
                            L += (hash01(x, zh, 102) - 0.5) * 0.1
                            col = shade(ramp_, L)
                            if pnoise(x, zh, 4, 32, 16, 103 + variant) > 0.74 and zh > 2 and vv >= hh - 2: col = C('p_moss', 2 if L > 0.55 else 3)
                            elif hash01(sid, 9, 104) < 0.12 and hash01(x, zh, 105) < 0.35: col = C('p_lichen', 1 + (vv < 1))
                        if vv == 0 and u > 0 and u < w - 1 and zh > 0:
                            col = C(ramp_, 4)
                        out.put(x, iy, col)
    # through-stones: a protruding flat stone every so often, casting a tiny shadow
    for tx in (5 + variant * 3, 21 + variant):
        if not all(inside(xx, WY1 - 1) and not inside(xx, WY1) for xx in range(tx, tx + 6)): continue
        zt = 7; iy = WY1 - 1 + Hmax + TOPM - zt
        for xx in range(tx - 1, tx + 6):
            out.put(xx, iy, C(ramp_, 1)); out.put(xx, iy + 1, C(ramp_, 3))
        for xx in range(tx, tx + 7): out.put(xx, iy + 2, C(ramp_, 5))
    # outline only at the ground line and the silhouette of the crest (selective outline, like buildings)
    src = out.im.copy(); p = src.load()
    for y in range(out.h):
        for x in range(out.w):
            if p[x, y][3]: continue
            up = y > 0 and p[x, y - 1][3]; dn = y + 1 < out.h and p[x, y + 1][3]
            lf = x > 0 and p[x - 1, y][3]; rt = x + 1 < out.w and p[x + 1, y][3]
            if up or dn or lf or rt: out.put(x, y, OUTLINE)
    sh = Canvas(out.w, out.h)
    for fy in range(0, 32):
        for x in range(0, 32):
            if inside(x, fy) and not inside(x, fy + 1):
                for k in range(1, 4): sh.put(x, fy + k + Hmax + TOPM + 1, SHADOW[:3] + ((96 if k < 3 else 56),))
            if inside(x, fy) and not inside(x + 1, fy):
                for k in range(1, 3):
                    if not inside(x + k, fy): sh.put(x + k, fy + Hmax + TOPM, SHADOW[:3] + (64,))
    over(sh, out)
    return sh
