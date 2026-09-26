"""Trees and woodland: English oak, ash, birch, sycamore, hawthorn (in blossom), rowan (berries), Scots pine, spruce,
plus a seamless forest canopy and forest edge strips. Everything is built in a z-buffered Vol (kit.py) so crowns are
lit as volumes (sunlit tops to the north-west, dark undersides) and every leaf clump casts a contact shadow."""
import math
from kit import *  # noqa

K = TILE / 32          # geometry scale (the art was laid out at 32 px tiles; tiles are now 48)
CL = 0.74             # leaf tufts grow less than the geometry: more, finer clusters at the new scale


# ------------------------------------------------------------------ bark textures
def bark_tex(seed, fiss=0.22, scale=0.3):
    def t(x, y, u):
        f = vnoise(x * 1.0, y * scale, 1.6, seed)
        v = 0.0
        if f < 0.28: v -= fiss
        elif f > 0.78: v += 0.07
        if abs(u) > 0.8: v -= 0.05
        return v
    return t


def birch_tex(seed):
    def t(x, y, u):
        v = 0.0
        h = hash01(x // 3, y // 2, seed)
        band = vnoise(0, y, 3, seed + 5)
        if band < 0.22 and hash01(x, y // 2, seed + 1) < 0.8: v -= 0.75           # black lenticel bands
        elif h < 0.05: v -= 0.55
        return v
    return t


def pine_tex(seed):
    def t(x, y, u):
        f = vnoise(x * 0.8, y * 0.5, 2.2, seed)
        return -0.2 if f < 0.26 else (0.06 if f > 0.8 else 0.0)
    return t


# ------------------------------------------------------------------ crowns
def lobe_clumps(vol, lx, ly, lz, lr, ramp, g, clr, dens, seed, ao, core=True, sq=0.92, lobes=6, lamp=0.16,
                bias=0.03, holes=0.0, jit=0.03, lobe_w=1.0, crown_w=0.72):
    """A crown lobe: a dark core volume plus many scalloped leaf clumps on its viewer-facing surface. Normals blend
    clump (own sphere), lobe and whole crown so the big form, then each lobe, then each tuft reads."""
    R = Rng(seed); grp = 100000 + vol.n
    gs = [(g[0], g[1], g[2], g[3], crown_w), (lx - lr * 0.1, ly - lr * 0.1, lz - lr * 0.2, lr, lobe_w)]
    if core:
        vol.clump(lx, ly, lz - lr * 0.15, lr * 0.9, ramp, gs=gs, lw=0.15, bias=bias - 0.1, lobes=lobes,
                  lamp=0.12, seed=seed, ao=ao, sq=sq, jit=jit, grp=grp)
    clr = clr * CL
    n = int(dens * (lr * lr) / (clr * clr)) + 3
    for k in range(n):
        th = R.u(0, 2 * math.pi); ph = math.acos(R.u(-0.15, 1.0))
        dx, dy, dz = math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th) * sq, math.cos(ph)
        if holes and R.r() < holes: continue
        rr = clr * R.u(0.7, 1.25)
        vol.clump(lx + dx * lr * 0.82, ly + dy * lr * 0.82, lz + dz * lr * 0.6, rr, ramp, gs=gs, lw=0.78,
                  bias=bias, lobes=lobes, lamp=lamp, seed=seed + k * 13, ao=ao, sq=0.9, jit=jit, flat=0.7, grp=grp)


def branch_to(vol, x0, y0, x1, y1, r0, r1, ramp, z0=0.0, z1=-4.0, bend=0.0, seed=0, tex=None):
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2 - abs(bend) * 0.3
    vol.tube([(x0, y0, z0), (mx, my, (z0 + z1) / 2), (x1, y1, z1)], r0, r1, ramp, tex=tex)


def trunk(vol, cx, by, top, r0, r1, ramp, seed, lean=0.0, roots=True, tex=None):
    tex = tex or bark_tex(seed)
    vol.tube([(cx, by, 0), (cx + lean * 0.4, by - (by - top) * 0.5, 0), (cx + lean, top, 0)], r0, r1, ramp, tex=tex)
    if roots:
        for s in (-1, 1):
            vol.tube([(cx + s * r0 * 0.3, by - r0 * 0.9, 0), (cx + s * (r0 + 2), by + 0.5, 1)], r0 * 0.45, 1.0, ramp, tex=tex)
        vol.tube([(cx + 1, by - r0 * 0.8, 1), (cx + 2, by + 1, r0 * 0.7)], r0 * 0.4, 1.0, ramp, tex=tex)


class Tree:
    def __init__(self, w, h, cx, by):
        self.v = Vol(w, h); self.w, self.h, self.cx, self.by = w, h, cx, by
        self.deco = []; self.shadow = None

    def finish(self, shadow, deco_fn=None):
        v = self.v; v.contact_shadows(0.24, 2)
        full = v.canvas(); crown = v.canvas({1}); wood = v.canvas({2, 3})
        # crown pixels hiding the trunk above its top belong to the crown for fading
        if deco_fn:
            deco_fn(full, v); deco_fn(crown, v)
        # outline and split outline pixels
        src = full.im.copy(); p = src.load()
        tags = v.tag
        for y in range(self.h):
            for x in range(self.w):
                if p[x, y][3]: continue
                nb = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
                hits = [(a, b) for a, b in nb if 0 <= a < self.w and 0 <= b < self.h and p[a, b][3] > 128]
                if not hits: continue
                full.put(x, y, OUTLINE)
                if any(tags[b, a] == 1 or (crown.px[a, b][3] and tags[b, a] == 0) for a, b in hits): crown.put(x, y, OUTLINE)
                else: wood.put(x, y, OUTLINE)
        sh = Canvas(self.w, self.h)
        cx, cy, rx, ry = shadow
        shadow_ellipse(sh, cx, cy, rx, ry, 88)
        f2 = sh.copy(); over(f2, full)
        w2 = sh.copy(); over(w2, wood)
        bb = crown.im.getbbox() or (0, 0, 1, 1)
        fade = {'x': bb[0], 'y': bb[1], 'w': bb[2] - bb[0], 'h': max(1, min(bb[3], self.by - 6) - bb[1])}
        return {'full': f2, 'crown': crown, 'trunk': w2, 'anchor': [self.cx, self.by], 'fade': fade}


def dome_lobes(R, cx, cy, rx, ry, n, rmin, rmax, front=True):
    """Lobe centres spread over a crown ellipse: a ring round the rim (upper side favoured) plus a front mass."""
    out = []
    for i in range(n):
        a = math.pi * (1.05 + 0.9 * i / max(1, n - 1)) + R.u(-0.12, 0.12)  # from left, over the top, to right
        rr = R.u(rmin, rmax)
        out.append((cx + math.cos(a) * (rx - rr * 0.8), cy + math.sin(a) * (ry - rr * 0.8), R.u(-4, 3), rr))
    for i, a0 in enumerate((0.12, 0.3, 0.7, 0.88)):   # hanging flank lobes: leafy underside, trunk stays clear
        a = math.pi * a0 + R.u(-0.05, 0.05)
        rr = R.u(rmin, rmax) * 0.7
        out.append((cx + math.cos(a) * (rx - rr * 1.1), cy + math.sin(a) * (ry - rr * 0.7), R.u(-8, -2), rr))
    if front:
        out.append((cx + R.u(-3, 3), cy + ry * 0.12, rx * 0.35, (rmin + rmax) * 0.62))
        out.append((cx - rx * 0.3, cy + ry * 0.25, rx * 0.2, rmin * 0.9))
        out.append((cx + rx * 0.32, cy + ry * 0.22, rx * 0.18, rmin * 0.9))
    return out


# ------------------------------------------------------------------ species
def oak(s, seed=1):
    """English oak: broad spreading lumpy crown wider than tall, short massive trunk dividing into limbs."""
    s = s * K
    R = Rng(seed)
    rx, ry = 52 * s, 38 * s; tc = int(30 * s) + 8
    W, H = int(rx * 2 + 44), int(ry * 2 + tc + 20 + 12 * s)
    cx, by = W // 2, H - int(10 + 8 * s)
    cy = by - tc - ry * 0.78
    t = Tree(W, H, cx, by); v = t.v
    g = (cx - rx * 0.1, cy - ry * 0.05, -rx * 0.1, max(rx, ry) * 1.02)
    ao = (cy + ry * 0.2, cy + ry, 0.12)
    trunk(v, cx, by, by - tc - 4, 8 * s + 2.5, 6 * s + 2, 'p_bark', seed, lean=R.u(-2, 2) * s)
    lobes = dome_lobes(R, cx, cy, rx, ry, 7 if s > 0.7 else 5, 16 * s + 4, 22 * s + 5)
    ttop = (cx, by - tc - 2)
    for i, (lx, ly, lz, lr) in enumerate(lobes):
        if ly < cy + ry * 0.2:
            branch_to(v, ttop[0], ttop[1], lx * 0.6 + ttop[0] * 0.4, ly * 0.55 + ttop[1] * 0.45, 4.2 * s + 1.4,
                      1.5 * s + 0.8, 'p_bark', z0=0, z1=lz - 6, bend=R.u(-6, 6) * s, tex=bark_tex(seed + i))
    for i, (lx, ly, lz, lr) in enumerate(lobes):
        lobe_clumps(v, lx, ly, lz, lr, 'p_oak', g, 6.4 * s + 2, 1.5, seed * 100 + i * 7, ao, lobes=5, lamp=0.15)
    return t.finish((cx + rx * 0.22, by + 1, rx * 0.78, ry * 0.3 + 3))


def sycamore(s, seed=2):
    """Sycamore: a big dense rounded dome, deep green, smooth grey trunk."""
    s = s * K
    R = Rng(seed)
    rx, ry = 44 * s, 44 * s; tc = int(18 * s) + 6
    W, H = int(rx * 2 + 44), int(ry * 2 + tc + 20 + 12 * s)
    cx, by = W // 2, H - int(10 + 8 * s)
    cy = by - tc - ry * 0.8
    t = Tree(W, H, cx, by); v = t.v
    g = (cx - rx * 0.1, cy, -rx * 0.05, rx * 1.02); ao = (cy - ry * 0.1, cy + ry, 0.3)
    trunk(v, cx, by, by - tc - 6, 5.5 * s + 2, 4.2 * s + 1.5, 'p_greyoak', seed, tex=bark_tex(seed, 0.12, 0.5))
    lobes = dome_lobes(R, cx, cy, rx * 0.98, ry * 0.95, 8 if s > 0.7 else 6, 15 * s + 4, 19 * s + 5)
    for i, (lx, ly, lz, lr) in enumerate(lobes):
        if i % 2 == 0 and ly < cy:
            branch_to(v, cx, by - tc - 4, lx * 0.5 + cx * 0.5, ly * 0.55 + (by - tc) * 0.45, 2.6 * s + 1, 1.2 * s + 0.7,
                      'p_greyoak', z1=lz - 6, bend=R.u(-4, 4))
    for i, (lx, ly, lz, lr) in enumerate(lobes):
        lobe_clumps(v, lx, ly, lz, lr, 'p_syc', g, 5.6 * s + 1.8, 2.1, seed * 100 + i * 7, ao, lobes=5, lamp=0.24)
    return t.finish((cx + rx * 0.22, by + 1, rx * 0.8, ry * 0.3 + 3))


def ash(s, seed=3):
    """Ash: tall open dome, pale grey bark, feathery light foliage in sprays at the ends of upswept limbs."""
    s = s * K
    R = Rng(seed)
    rx, ry = 40 * s, 46 * s; tc = int(26 * s) + 6
    W, H = int(rx * 2 + 46), int(ry * 2 + tc + 22 + 12 * s)
    cx, by = W // 2, H - int(10 + 8 * s)
    cy = by - tc - ry * 0.78
    t = Tree(W, H, cx, by); v = t.v
    g = (cx - rx * 0.1, cy, -rx * 0.1, max(rx, ry)); ao = (cy, cy + ry, 0.26)
    top = by - tc - 2
    trunk(v, cx, by, top - 8 * s, 4.8 * s + 1.6, 3.4 * s + 1.2, 'p_greyoak', seed, tex=bark_tex(seed, 0.16, 0.35))
    tips = []
    for i in range(7 if s > 0.7 else 5):
        a = math.pi * (1.1 + 0.8 * i / (6 if s > 0.7 else 4)) + R.u(-0.1, 0.1)
        tx, ty = cx + math.cos(a) * rx * 0.72, cy + math.sin(a) * ry * 0.7
        tips.append((tx, ty))
        branch_to(v, cx, top - 6 * s, tx, ty, 1.9 * s + 1, 0.8, 'p_greyoak', z0=0, z1=R.u(-6, 2), bend=R.u(-5, 5) * s)
    for i, (tx, ty) in enumerate(tips):
        lobe_clumps(v, tx, ty, R.u(-2, 4), 13 * s + 4, 'p_ash', g, 3.6 * s + 1.4, 1.7, seed * 100 + i * 5, ao,
                    core=True, lobes=7, lamp=0.28, holes=0.1)
    lobe_clumps(v, cx, cy + ry * 0.1, 6, 14 * s + 4, 'p_ash', g, 3.6 * s + 1.4, 1.3, seed * 77, ao, lobes=7, lamp=0.28,
                holes=0.3)
    return t.finish((cx + rx * 0.2, by + 1, rx * 0.72, ry * 0.26 + 3))


def birch(s, seed=4):
    """Silver birch: slender white trunk with black lenticels, a narrow airy crown of small bright drooping clumps."""
    s = s * K
    R = Rng(seed)
    rx, ry = 22 * s + 4, 44 * s + 6; tc = int(26 * s) + 8
    W, H = int(rx * 2 + 72), int(ry * 2 + tc + 20 + 10 * s)
    cx, by = W // 2, H - int(9 + 6 * s)
    cy = by - tc - ry * 0.8
    t = Tree(W, H, cx, by); v = t.v
    g = (cx - rx * 0.15, cy - ry * 0.1, -rx * 0.1, max(rx, ry) * 0.8); ao = (cy, cy + ry, 0.18)
    lean = R.u(-3, 3) * s
    tx = birch_tex(seed)
    v.tube([(cx, by, 0), (cx + lean * 0.5, by - tc, 0), (cx + lean, cy - ry * 0.7, -2)], 2.6 * s + 1.3, 0.9,
           'p_birchbark', tex=tx)
    v.tube([(cx - 1, by - 2, 1), (cx - 3 * s - 2, by + 0.5, 2)], 1.4 * s + 0.6, 0.8, 'p_birchbark', tex=tx)
    lob = []
    nl = 8 if s > 1.0 else 6
    for i in range(nl):
        f = i / (nl - 1)
        yy = cy - ry * 0.75 + f * ry * 1.35
        sd = -1 if i % 2 else 1
        spread = rx * (0.25 + 0.55 * math.sin(f * math.pi * 0.95 + 0.2))
        lx = cx + lean * (1 - f * 0.5) + sd * spread
        lob.append((lx, yy, R.u(-3, 4), (8 + 3 * math.sin(f * math.pi)) * s + 3))
        branch_to(v, cx + lean * (1 - f * 0.5), yy + 6 * s, lx * 0.8 + cx * 0.2, yy + 2, 1.1 * s + 0.4, 0.6,
                  'p_birchbark', z0=-1, z1=-4, bend=sd * 2)
    for i, (lx, ly, lz, lr) in enumerate(lob):
        lobe_clumps(v, lx, ly, lz, lr, 'p_birch', g, 3.4 * s + 1.3, 1.7, seed * 91 + i * 3, ao,
                    core=True, lobes=7, lamp=0.28, holes=0.12, sq=1.1)
        # drooping fringe: tiny tufts hanging below each lobe
        for k in range(3):
            v.clump(lx + R.u(-lr * 0.6, lr * 0.6), ly + lr * 0.8 + R.u(0, 3), lz + 2, 2.2 * s * CL + 1.2, 'p_birch',
                    gs=[(g[0], g[1], g[2], g[3], 0.7)], lw=0.8, lobes=6, lamp=0.3, seed=seed + i * 7 + k, sq=1.3)
    return t.finish((cx + rx * 0.25, by + 1, rx * 0.8, rx * 0.3 + 3))


def hawthorn(s, seed=5, blossom=True):
    """Hawthorn in May: a small gnarled tree, twisted trunk, dense rounded crown frosted with white blossom."""
    s = s * K
    R = Rng(seed)
    rx, ry = 30 * s + 4, 24 * s + 4; tc = int(12 * s) + 6
    W, H = int(rx * 2 + 44), int(ry * 2 + tc + 20 + 8 * s)
    cx, by = W // 2, H - int(9 + 6 * s)
    cy = by - tc - ry * 0.72
    t = Tree(W, H, cx, by); v = t.v
    g = (cx - rx * 0.1, cy, -rx * 0.1, max(rx, ry)); ao = (cy, cy + ry, 0.26)
    tx = bark_tex(seed, 0.22, 0.6)
    v.tube([(cx, by, 0), (cx - 3 * s, by - tc * 0.5, 0), (cx + 2 * s, by - tc - 2, 0)], 3.6 * s + 1.4, 2.6 * s + 1,
           'p_thornbark', tex=tx)
    v.tube([(cx - 2 * s, by - tc * 0.55, 0), (cx - rx * 0.5, cy + 2, -3)], 1.8 * s + 0.8, 1, 'p_thornbark', tex=tx)
    v.tube([(cx + 2 * s, by - tc, 0), (cx + rx * 0.45, cy, -3)], 1.8 * s + 0.8, 1, 'p_thornbark', tex=tx)
    trunk(v, cx, by, by - 3, 3.6 * s + 1.4, 3.4 * s + 1.3, 'p_thornbark', seed, tex=tx)
    lobes = dome_lobes(R, cx, cy, rx, ry, 5, 11 * s + 4, 14 * s + 4)
    for i, (lx, ly, lz, lr) in enumerate(lobes):
        lobe_clumps(v, lx, ly, lz, lr, 'p_thorn', g, 3.6 * s + 1.4, 2.0, seed * 50 + i * 11, ao, lobes=7, lamp=0.26)

    def deco(cv, vol):
        if not blossom: return
        # florets: 2x2 creamy-white flower heads with a pink-tinged shade pixel, clustered in sprays
        for y in range(0, cv.h - 1, 2):
            for x in range(0, cv.w - 1, 2):
                ox, oy = int(hash01(x, y, 557) * 2), int(hash01(y, x, 558) * 2)
                X, Y = x + ox, y + oy
                if X + 1 >= cv.w or Y + 1 >= cv.h: continue
                if any(vol.tag[Y + dy, X + dx] != 1 for dx in (0, 1) for dy in (0, 1)): continue
                if not cv.px[X, Y][3]: continue
                L = vol.lum[Y, X]
                if vnoise(X, Y, 5, 556) < 0.5 or hash01(X, Y, 555) > 0.55 or L < 0.28: continue
                b0 = 0 if L > 0.72 else (1 if L > 0.55 else (2 if L > 0.42 else 3))
                cv.put(X, Y, C('p_blossom', b0)); cv.put(X + 1, Y, C('p_blossom', min(4, b0 + 1)))
                cv.put(X, Y + 1, C('p_blossom', min(4, b0 + 1))); cv.put(X + 1, Y + 1, C('p_blossom', min(4, b0 + 2)))
                if b0 < 2 and hash01(X, Y, 559) < 0.25: cv.put(X + 1, Y, C('flower_yel', 1))
    return t.finish((cx + rx * 0.22, by + 1, rx * 0.8, ry * 0.3 + 2), deco)


def rowan(s, seed=6):
    """Rowan (mountain ash): an upright oval crown of fine pinnate foliage with bunches of orange-red berries."""
    s = s * K
    R = Rng(seed)
    rx, ry = 26 * s + 4, 34 * s + 5; tc = int(20 * s) + 6
    W, H = int(rx * 2 + 44), int(ry * 2 + tc + 20 + 8 * s)
    cx, by = W // 2, H - int(9 + 6 * s)
    cy = by - tc - ry * 0.75
    t = Tree(W, H, cx, by); v = t.v
    g = (cx - rx * 0.1, cy, -rx * 0.1, max(rx, ry) * 0.9); ao = (cy, cy + ry, 0.26)
    top = by - tc - 4
    trunk(v, cx, by, top, 3.2 * s + 1.4, 2.4 * s + 1, 'p_greyoak', seed, tex=bark_tex(seed, 0.1, 0.8), roots=False)
    for i, a in enumerate((-2.3, -1.9, -1.2, -0.85)):
        branch_to(v, cx, top + 2, cx + math.cos(a) * rx * 0.7, cy + math.sin(a) * ry * 0.5 + 8, 1.6 * s + 0.6, 0.6,
                  'p_greyoak', z1=-3)
    for i in range(7 if s > 0.7 else 5):
        a = R.u(0, 2 * math.pi); d = R.u(0.2, 0.7)
        lobe_clumps(v, cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d, R.u(-2, 5), 11 * s + 4, 'p_rowan', g,
                    3.2 * s + 1.3, 1.8, seed * 40 + i * 9, ao, lobes=8, lamp=0.3, holes=0.08)
    bunches = [(cx + R.u(-rx * 0.65, rx * 0.6), cy + R.u(-ry * 0.45, ry * 0.55)) for _ in range(int(6 * s) + 4)]

    UMBEL = [(0, 0), (2, -1), (4, 0), (-2, 1), (1, 2), (3, 2), (6, 1), (2, 4), (-1, 3), (5, 3)]

    def deco(cv, vol):
        for bi, (bx, by_) in enumerate(bunches):
            if not (0 <= int(by_) < cv.h and 0 <= int(bx) < cv.w) or vol.tag[int(by_), int(bx)] != 1: continue
            lit = vol.lum[int(by_), int(bx)]
            for k, (dx, dy) in enumerate(UMBEL[:6 + bi % 5]):
                x, y = int(bx + dx), int(by_ + dy)
                o = 0 if lit > 0.6 else 1
                cv.put(x, y, C('p_berry', o)); cv.put(x + 1, y, C('p_berry', o + 1))
                cv.put(x, y + 1, C('p_berry', o + 1)); cv.put(x + 1, y + 1, C('p_berry', o + 2))
                if 0 <= y + 2 < cv.h and vol.tag[min(cv.h - 1, y + 2), min(cv.w - 1, x)] == 1: cv.put(x + 1, y + 2, C('p_berry', 4))
    return t.finish((cx + rx * 0.22, by + 1, rx * 0.8, rx * 0.3 + 2), deco)


def scots_pine(s, seed=7):
    """Scots pine: tall bare trunk, grey and fissured below, glowing orange-pink up top; an irregular flat-topped
    umbrella of blue-green needle pads."""
    s = s * K
    R = Rng(seed)
    rx = 30 * s + 6; hgt = int(118 * s) + 20
    W, H = int(rx * 2 + 54), hgt + int(16 + 6 * s)
    cx, by = W // 2, H - int(10 + 6 * s)
    t = Tree(W, H, cx, by); v = t.v
    lean = R.u(-5, 5) * s; top = by - hgt + 12
    mid = (cx + lean * 0.35, by - hgt * 0.5, 0)
    v.tube([(cx, by, 0), mid], 3.4 * s + 1.8, 2.8 * s + 1.5, 'p_bark', tex=bark_tex(seed, 0.22, 0.22))
    v.tube([mid, (cx + lean * 0.8, top + hgt * 0.2, 0), (cx + lean, top + 14, 0)], 2.8 * s + 1.5, 1.4 * s + 0.8,
           'p_pinebark', tex=pine_tex(seed))
    trunk(v, cx, by, by - 4, 3.4 * s + 1.8, 3.4 * s + 1.8, 'p_bark', seed)
    pads = [(cx + lean + R.u(-6, 6) * s, top + 10 * s, 17 * s + 4)]
    for i in range(6 if s > 1.0 else 4):
        f = (i + 1) / (6 if s > 1.0 else 4)
        sd = (-1) ** i
        px_ = cx + lean * (1 - f * 0.2) + sd * rx * R.u(0.35, 0.8)
        py = top + 8 * s + f * hgt * 0.26 + R.u(-4, 4)
        pads.append((px_, py, (15 - 4 * f) * s + 4))
        branch_to(v, cx + lean * (1 - f * 0.25), py + 10 * s, px_, py + 3, 1.4 * s + 0.6, 0.8, 'p_pinebark', z0=0.5, z1=-3,
                  bend=sd * 3)
    for k in range(2):   # a couple of dead stubs lower down
        yy = by - hgt * (0.3 + 0.12 * k); sd = 1 if k else -1
        branch_to(v, cx + lean * 0.3, yy, cx + lean * 0.3 + sd * 9 * s, yy - 5 * s, 1.2 * s, 0.6, 'p_bark', z0=0.5, z1=0)
    g = (cx + lean - rx * 0.2, top, -4, rx * 1.2)
    for i, (px_, py, pr) in enumerate(pads):
        ao = (py - pr * 0.2, py + pr * 0.5, 0.34)
        lobe_clumps(v, px_, py, R.u(-2, 4), pr, 'p_pine', g, 3.6 * s + 1.4, 1.5,
                    seed * 60 + i * 7, ao, sq=0.62, lobes=11, lamp=0.24, core=True, crown_w=0.5, lobe_w=1.0)
    return t.finish((cx + rx * 0.3, by + 1, rx * 0.7, rx * 0.26 + 2))


def spruce(s, seed=8):
    """Spruce / plantation conifer: a dark tiered cone with drooping skirts, lit on its north-west flank."""
    s = s * K
    R = Rng(seed)
    rx = 24 * s + 5; hgt = int(92 * s) + 18
    W, H = int(rx * 2 + 44), hgt + int(16 + 6 * s)
    cx, by = W // 2, H - int(9 + 5 * s)
    t = Tree(W, H, cx, by); v = t.v
    top = by - hgt
    trunk(v, cx, by, by - 14, 2.6 * s + 1.2, 2.2 * s + 1, 'p_bark', seed)
    tiers = int(7 * s) + 4
    for i in range(tiers):
        f = (i + 1) / tiers
        ty = top + 4 + f * (hgt - 16) * 0.95; tw = rx * (0.18 + 0.82 * f)
        ao = (ty - 6, ty + 4, 0.35)
        n = int(tw / 2.0) + 2
        for k in range(n):
            u = (k / max(1, n - 1)) * 2 - 1
            x = cx + u * tw; y = ty - (1 - u * u) * 5 * s + abs(u) * 3
            nrmx = u * 0.9
            v.clump(x, y, 6 * (1 - abs(u)) + f * 2, (3.3 * s + 1.6) * CL, 'p_spruce', g=(cx - 2, top + hgt * 0.45, -8, rx * 1.3),
                    gw=0.9, lw=0.5, lobes=9, lamp=0.3, seed=seed + i * 17 + k, ao=ao, sq=0.75, jit=0.05)
        v.clump(cx, ty - 5 * s, 3, tw * 0.55, 'p_spruce', g=(cx - 2, top + hgt * 0.45, -8, rx * 1.3), gw=1, lw=0.1,
                bias=-0.12, seed=seed + i, sq=0.45, lobes=9, lamp=0.2)
    v.clump(cx, top + 3, 4, 2.4 * s + 1.2, 'p_spruce', g=(cx - 2, top, -2, 6), lw=0.5, seed=seed + 99, sq=1.4)
    return t.finish((cx + rx * 0.3, by + 1, rx * 0.8, rx * 0.3 + 2))


# ------------------------------------------------------------------ woodland
FOREST_RAMPS = ['p_syc', 'p_oak', 'p_syc', 'p_oak', 'p_ash', 'p_forest', 'p_thorn']
FT = 4 * TILE            # woodland pieces repeat every 4 tiles (192 px)


def wood_crown(v, X, Y, z, r, rp, seed, cr=None):
    """One woodland crown built like a free-standing tree: 4-5 lobes of leaf tufts with a dark core, so the canopy
    has the same cluster detail as the single trees."""
    R = Rng(seed * 7 + 3)
    g = (X - r * 0.15, Y - r * 0.12, z - r * 0.3, r * 1.1); ao = (Y - r * 0.1, Y + r, 0.2)
    v.clump(X, Y, z - 4, r * 0.92, rp, g=g, lw=0.2, bias=-0.2, lobes=6, lamp=0.12, seed=seed, ao=ao)
    lob = [(X + R.u(-3, 3), Y - r * 0.28, z + 3, r * 0.52)]
    for k in range(4):
        a = math.pi * (1.0 + 0.33 * k) + R.u(-0.2, 0.2)
        lob.append((X + math.cos(a) * r * 0.45, Y + math.sin(a) * r * 0.4, z + R.u(-2, 3), r * R.u(0.42, 0.52)))
    lob.append((X + R.u(-3, 3), Y + r * 0.25, z + 6, r * 0.46))
    for i, (lx, ly, lz, lr) in enumerate(lob):
        lobe_clumps(v, lx, ly, lz, lr, rp, g, 6.4, 1.7, seed * 13 + i * 5, ao, lobes=6, lamp=0.2, bias=0.07)


def _wrapped(v, items, px, py, pad_x, pad_y):
    for (x, y, z, r, rp, sd) in items:
        for ox in ((-px, 0, px) if px else (0,)):
            for oy in ((-py, 0, py) if py else (0,)):
                X, Y = x + ox + pad_x, y + oy + pad_y
                if -r * 2 < X < v.w + r * 2 and -r * 2 < Y < v.h + r * 2: wood_crown(v, X, Y, z, r, rp, sd)


def forest_fill(seed=11):
    """Seamless dense woodland canopy seen from above, FT px square (4x4 tiles): tile it over 't' interiors."""
    size = FT; pad = 36; W = size + pad * 2
    v = Vol(W, W); v.amb = {1: 0.2}; R = Rng(seed)
    step = size // 5; items = []
    for gy in range(0, size, step):
        for gx in range(0, size, step):
            items.append((gx + R.u(-9, 9) + (step / 2 if (gy // step) % 2 else 0), gy + R.u(-8, 8), R.u(-8, 8),
                          R.u(22, 30), R.pick(FOREST_RAMPS), len(items) + seed * 50))
    _wrapped(v, items, size, size, pad, pad)
    v.contact_shadows(0.3, 3, 0.14, 0.1)
    cv = v.canvas(); out = Canvas(size, size); dk = C('p_forest', 7)
    for y in range(size):
        for x in range(size):
            c = cv.px[x + pad, y + pad]; out.px[x, y] = c if c[3] else dk
    return out


def forest_edge_s(seed=12, H=168):
    """Front row of woodland along a southern boundary, FT wide and seamless left-right: trunks, dark skirts,
    ground shadow. Drawn over the fill; the trunk bases sit on the anchor row (base)."""
    width = FT; pad = 40; W = width + pad * 2
    v = Vol(W, H); v.amb = {1: 0.2}; R = Rng(seed)
    base = H - 20; n = width // 48
    back = [(i * 48 + R.u(-6, 6), base - 88 + R.u(-8, 8), -22, R.u(27, 33), R.pick(FOREST_RAMPS), 40 + i) for i in range(n)]
    front = []
    for i in range(n):
        x = i * 48 + 24 + R.u(-9, 9); r = R.u(28, 35); cy = base - 34 - r * 0.8 + R.u(-6, 6)
        front.append((x, cy, 0, r, R.pick(FOREST_RAMPS), i, R.u(-4, 4)))
    for ox in (-width, 0, width):
        for (x, cy, z, r, rp, sd, lean) in front:
            X = x + ox + pad
            if not (-60 < X < W + 60): continue
            tx = bark_tex(sd + 3)
            v.tube([(X, base, 0), (X + lean, cy + r * 0.3, -2)], 5.2, 3.8, 'p_bark', tex=tx)
            v.tube([(X - 1, base - 3, 1), (X - 7, base + 1, 2)], 2.8, 1.2, 'p_bark', tex=tx)
            v.tube([(X + 1, base - 3, 1), (X + 7, base + 0.5, 2)], 2.8, 1.2, 'p_bark', tex=tx)
    _wrapped(v, back, width, 0, pad, 0)
    _wrapped(v, [(x, cy, z, r, rp, sd) for (x, cy, z, r, rp, sd, _) in front], width, 0, pad, 0)
    v.contact_shadows(0.3, 3, 0.14, 0.1)
    cv = v.canvas(); out = Canvas(width, H)
    for y in range(H):
        for x in range(width): out.px[x, y] = cv.px[x + pad, y]
    dk = C('p_forest', 7)
    for x in range(width):
        for y in range(0, 44):
            if not out.px[x, y][3]: out.px[x, y] = dk
    fin(out)
    sh = Canvas(width, H)
    for x in range(width):
        for y in range(base - 3, base + 5):
            if ((y + 0.5 - (base + 1)) / 4) ** 2 <= 1: sh.put(x, y, SHADOW[:3] + (48,))
    for (x, cy, z, r, rp, sd, lean) in front:
        for ox in (-width, 0, width): shadow_ellipse(sh, x + ox + 8, base + 2, r * 0.8, 5, 70)
    over(sh, out)
    return sh, base


def forest_edge_side(side='w', seed=13, W=84):
    """West/east woodland edge: a vertical, seamless (FT tall) column of crowns bulging out over the ground."""
    height = FT; pad = 40; Hh = height + pad * 2
    v = Vol(W, Hh); v.amb = {1: 0.2}; R = Rng(seed + (0 if side == 'w' else 50))
    n = height // 42
    items = [((W - 30 if side == 'w' else 30) + R.u(-6, 6), i * 42 + R.u(-7, 7), R.u(-8, 4), R.u(25, 32),
              R.pick(FOREST_RAMPS), i + seed * 10) for i in range(n)]
    _wrapped(v, items, 0, height, 0, pad)
    v.contact_shadows(0.3, 3, 0.14, 0.1)
    cv = v.canvas(); out = Canvas(W, height)
    for y in range(height):
        for x in range(W): out.px[x, y] = cv.px[x, y + pad]
    dk = C('p_forest', 7)
    inner = range(W - 26, W) if side == 'w' else range(0, 26)
    for y in range(height):
        for x in inner:
            if not out.px[x, y][3]: out.px[x, y] = dk
    fin(out)
    return out


def forest_edge_n(seed=14, H=60):
    """Northern woodland edge: crown tops bulging up over the ground beyond; opaque below (joins the fill)."""
    width = FT; pad = 40; W = width + pad * 2
    v = Vol(W, H + 44); v.amb = {1: 0.2}; R = Rng(seed)
    n = width // 42
    items = [(i * 42 + R.u(-7, 7), 36 + R.u(-6, 6), R.u(-8, 4), R.u(25, 32), R.pick(FOREST_RAMPS), i + seed * 10)
             for i in range(n + 1)]
    _wrapped(v, items, width, 0, pad, 0)
    v.contact_shadows(0.3, 3, 0.14, 0.1)
    cv = v.canvas(); out = Canvas(width, H); dk = C('p_forest', 7)
    for y in range(H):
        for x in range(width):
            c = cv.px[x + pad, y]; out.px[x, y] = c if c[3] else (dk if y > 40 else (0, 0, 0, 0))
    fin(out)
    return out


def forest_clump(seed, r=32):
    """A single free-standing woodland crown (no trunk) to scatter along edges and outer corners."""
    W = int(r * 2 + 16); v = Vol(W, W); v.amb = {1: 0.2}; R = Rng(seed)
    wood_crown(v, W / 2, W / 2, 0, r, R.pick(FOREST_RAMPS), seed)
    v.contact_shadows(0.3, 3, 0.14, 0.1)
    return fin(v.canvas())
