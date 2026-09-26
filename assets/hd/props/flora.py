"""Small plants: shrubs, gorse, bracken, nettles, buddleia, foxgloves, reeds and bulrushes, rosebay willowherb,
ragwort, grass tufts, dandelions, ballast weeds, and a young sycamore sapling. 48 px tiles; outlined."""
import math
from kit import *  # noqa
from trees import lobe_clumps, Tree, bark_tex, K, CL


def _finish_plant(v, cv=None, shadow=None, amb=0.14):
    v.amb = {1: amb, 2: 0.0}
    v.contact_shadows(0.26, 2, 0.12, 0.1)
    cv = cv or v.canvas()
    return cv


def blade(cv, x0, y0, length, ang, bend, rp, w=1, seed=0, lit=None, tip=None):
    """A curved leaf blade / stem drawn from its base (x0, y0) upward. ang: radians from vertical (+ = right);
    bend: extra curvature towards the tip. Lit side on the left. Returns the tip position."""
    x, y = x0 + 0.5, y0 + 0.5; pts = []
    n = int(length * 1.6)
    for i in range(n):
        t = i / max(1, n - 1)
        a = ang + bend * t * t
        x += math.sin(a) * length / n; y -= math.cos(a) * length / n
        pts.append((x, y, t, a))
    for (x, y, t, a) in pts:
        ww = max(1, round(w * (1 - t * 0.6)))
        for d in range(ww):
            i = (1 if d == 0 else 2) if lit is None else lit
            if t > 0.85 and tip is not None: i = tip
            base = 0 if t > 0.5 else 1
            cv.put(int(x) + d, int(y), C(rp, min(len(RAMPS[rp]) - 1, i + (1 if t < 0.25 else 0) + (0 if base else 0))))
    return pts[-1][:2] if pts else (x0, y0)


def leaf(cv, cx, cy, rx, ry, ang, rp, bias=0.0):
    """A small lit leaf (rotated ellipse) with a midrib."""
    ca, sa = math.cos(ang), math.sin(ang)
    R = int(max(rx, ry)) + 2
    for y in range(int(cy) - R, int(cy) + R + 1):
        for x in range(int(cx) - R, int(cx) + R + 1):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            u = (dx * ca + dy * sa) / rx; v = (-dx * sa + dy * ca) / ry
            if u * u + v * v <= 1:
                L = light(-u * 0.3 + v * sa * 0.5, v * 0.8 - 0.2, 0.7) + bias
                if abs(v) < 0.18 and abs(u) < 0.8: L -= 0.15
                cv.put(x, y, shade(rp, L))


def shrub(size=1.0, seed=20, rp='p_hedge', flowers=None):
    """A rounded garden / field shrub: layered leaf clumps; optional flowers ('gorse', 'rose', 'white')."""
    s = size * K
    rx, ry = 20 * s + 4, 15 * s + 4
    W, H = int(rx * 2 + 30), int(ry * 2 + 18)
    cx, by = W // 2, H - 6
    cy = by - ry * 0.95
    t = Tree(W, H, cx, by); v = t.v; R = Rng(seed)
    g = (cx - rx * 0.15, cy - ry * 0.2, -rx * 0.1, max(rx, ry) * 1.05); ao = (cy, cy + ry, 0.18)
    lobes = [(cx + R.u(-rx * 0.45, rx * 0.45), cy + R.u(-ry * 0.3, ry * 0.25), R.u(-3, 4), R.u(0.5, 0.7) * min(rx, ry) + 3)
             for _ in range(4)] + [(cx, cy + ry * 0.1, 5, min(rx, ry) * 0.7)]
    for i, (lx, ly, lz, lr) in enumerate(lobes):
        lobe_clumps(v, lx, ly, lz, lr, rp, g, 5.2, 1.7, seed * 31 + i * 5, ao, lobes=6, lamp=0.2)
    deco = None
    if flowers:
        fr = {'gorse': 'flower_yel', 'rose': 'p_gerani', 'white': 'p_blossom'}[flowers]

        def deco(cv, vol):
            for y in range(cv.h - 1):
                for x in range(cv.w - 1):
                    if vol.tag[y, x] != 1 or not cv.px[x, y][3]: continue
                    if vnoise(x, y, 4, seed + 5) < 0.5 or hash01(x, y, seed) > 0.25: continue
                    L = vol.lum[y, x]; i = 0 if L > 0.62 else 1 if L > 0.42 else 2
                    cv.put(x, y, C(fr, i)); cv.put(x + 1, y, C(fr, min(2, i + 1)))
    return t.finish((cx + rx * 0.2, by + 1, rx * 0.85, ry * 0.3 + 2), deco)


def bracken(seed=30, autumn=False):
    """A clump of bracken: arching fronds with paired pinnae. 56 x 44."""
    W, H = 56, 44; cv = Canvas(W, H); R = Rng(seed)
    rp = 'p_bracken_o' if autumn else 'p_bracken'
    fr = []
    for i in range(7):
        a = R.u(-1.1, 1.1); fr.append((a, R.u(22, 34), R.u(-0.4, 0.4)))
    fr.sort(key=lambda f: -abs(f[0]))  # outer fronds first, front ones on top
    for (a, L, bnd) in fr:
        x, y = W / 2 + a * 4, H - 4.0; n = int(L * 1.5)
        for i in range(n):
            t = i / n; ang = a + (a * 0.9 + bnd) * t * 1.4 + (0.9 if a > 0 else -0.9) * t * t
            x += math.sin(ang) * L / n; y -= math.cos(ang) * L / n
            cv.put(int(x), int(y), C(rp, 3))
            if i % 3 == 0 and 0.15 < t < 0.95:
                pl = (1 - t) * 7 + 1.5
                for sd in (-1, 1):
                    pa = ang + sd * 1.25
                    for k in range(1, int(pl)):
                        px_, py_ = x + math.sin(pa) * k, y - math.cos(pa) * k + k * 0.25
                        lit = 1 if sd < 0 else 2
                        if k > pl - 2: lit += 1
                        cv.put(int(px_), int(py_), C(rp, lit + (1 if t < 0.35 else 0)))
                        if k < pl - 2: cv.put(int(px_), int(py_) + 1, C(rp, min(len(RAMPS[rp]) - 1, lit + 2)))
    fin(cv)
    sh = Canvas(W, H); shadow_ellipse(sh, W / 2 + 4, H - 4, 18, 3.5, 80); over(sh, cv)
    return sh


def nettles(seed=40):
    """A patch of stinging nettles: upright square stems with drooping serrated opposite leaves. 36 x 44."""
    W, H = 36, 44; cv = Canvas(W, H); R = Rng(seed); rp = 'p_nettle'
    stems = sorted([(R.u(8, W - 8), R.u(26, 38), R.u(-0.15, 0.15)) for _ in range(6)], key=lambda s: -s[1])
    for (x0, L, a) in stems:
        tip = blade(cv, x0, H - 4, L, a, 0.1, rp, w=1, lit=3)
        for j, k in enumerate(range(6, int(L), 5)):
            y = H - 4 - k; x = x0 + math.sin(a) * k
            sz = 1.8 + (L - k) / L * 2.6
            sd = 1 if j % 2 else -1          # alternate pairs, drooping heart-shaped leaves
            for q in (sd, -sd * 0.7):
                q0 = 1 if q > 0 else -1
                ex, ey = x + q0 * (sz * 0.9 + 0.5), y + sz * 0.6
                leaf(cv, ex, ey, sz, sz * 0.62, q0 * 0.9, rp, bias=-0.05 + 0.1 * (k / L))
                cv.put(int(ex + q0 * sz * 0.8), int(ey + sz * 0.7), C(rp, 3))
        leaf(cv, tip[0], tip[1] + 1, 2, 1.3, 0, rp, bias=0.1)
        # dangling catkins of tiny green flowers
        for k in range(10, int(L) - 4, 8):
            cv.put(int(x0 + 2), int(H - 4 - k + 3), C('p_weed', 1)); cv.put(int(x0 + 2), int(H - 4 - k + 4), C('p_weed', 2))
    fin(cv)
    sh = Canvas(W, H); shadow_ellipse(sh, W / 2 + 3, H - 4, 13, 3, 80); over(sh, cv)
    return sh


def buddleia(seed=50):
    """Buddleia (the railway weed): an arching shrub with long purple cone-shaped flower spikes. 84 x 78."""
    s = 1.0 * K
    t = Tree(84, 78, 42, 72); v = t.v; R = Rng(seed)
    g = (38, 38, -4, 34); ao = (36, 70, 0.2)
    for i in range(5):
        a = -0.9 + i * 0.45
        v.tube([(42 + a * 3, 72, 0), (42 + a * 14, 52, -2), (42 + a * 24, 36, -4)], 1.8, 0.8, 'p_thornbark')
    lobes = [(42 + R.u(-22, 22), 44 + R.u(-10, 12), R.u(-3, 4), R.u(12, 16)) for _ in range(6)]
    for i, (lx, ly, lz, lr) in enumerate(lobes):
        lobe_clumps(v, lx, ly, lz, lr, 'p_nettle', g, 5.4, 1.5, seed + i * 9, ao, lobes=5, lamp=0.35, sq=0.8)
    spikes = [(42 + (i - 3.5) * 9 + R.u(-3, 3), 26 + abs(i - 3.5) * 5 + R.u(-4, 4), (i - 3.5) * 0.22) for i in range(8)]

    def deco(cv, vol):
        for (sx, sy, a) in spikes:
            dx = 1 if a >= 0 else -1
            for k in range(17):      # an arching cone of florets: rises, then droops to a fine tip
                t_ = k / 16; ww = 2.1 * (1 - t_) + 0.6
                x = sx + dx * (k * 0.75 + abs(a) * k * 0.6); y = sy - 4 * math.sin(t_ * 1.6) + t_ * t_ * 9
                for d in range(-int(ww), int(ww) + 1):
                    h = hash01(int(x) + d, int(y), 51)
                    L = 0.6 - d / (ww + 1) * 0.3 - t_ * 0.12 + (0.28 if h < 0.3 else 0) - (0.2 if h > 0.85 else 0)
                    L = 0.62 + d / (ww + 1) * 0.3 - t_ * 0.12 + (0.28 if h < 0.3 else 0) - (0.2 if h > 0.85 else 0)
                    cv.put(int(x), int(y) + d, shade('p_budd', L)); cv.put(int(x) + dx, int(y) + d, shade('p_budd', L - 0.08))
                    pass
    return t.finish((48, 73, 30, 5), deco)


def foxgloves(seed=60):
    """Three foxglove spikes with pink bells on the upper half, over a rosette of soft leaves. 34 x 64."""
    W, H = 34, 64; cv = Canvas(W, H); R = Rng(seed)
    for k in range(7):
        leaf(cv, 17 + (k - 3) * 3.2, H - 6 - abs(k - 3) * 0.5, 5, 2.4, (k - 3) * 0.35, 'p_nettle', bias=0.1)
    for (x0, L) in ((10, 44), (22, 54), (16, 36)):
        tip = blade(cv, x0, H - 6, L, R.u(-0.06, 0.06), 0.05, 'p_weed', lit=2)
        for k in range(int(L * 0.45), int(L), 3):
            y = H - 6 - k; x = x0 + 0.5
            f = (k - L * 0.45) / (L * 0.55); sz = 1 if f > 0.8 else 2
            for sd in ((-1,) if (k // 3) % 2 else (1,)):
                bx = int(x + sd * 2) - (1 if sd < 0 else 0)
                for yy in range(3 if sz == 2 else 2):
                    for xx in range(2 + (sz == 2)):
                        L2 = 0.7 - yy * 0.18 - (xx if sd > 0 else 2 - xx) * 0.1
                        cv.put(bx + xx * sd, y + yy, shade('p_fox', L2))
                if sz == 2: cv.put(bx + sd, y + 2, C('p_fox', 4))
        cv.put(int(tip[0]), int(tip[1]), C('p_weed', 1))
    fin(cv)
    sh = Canvas(W, H); shadow_ellipse(sh, W / 2 + 3, H - 5, 12, 2.6, 80); over(sh, cv)
    return sh


def reeds(seed=70, bulrush=True):
    """Waterside reeds and bulrushes: a fan of long blades with brown velvet seed heads. 40 x 60."""
    W, H = 40, 60; cv = Canvas(W, H); R = Rng(seed)
    bl = sorted([(R.u(8, 32), R.u(30, 52), R.u(-0.35, 0.35), R.u(-0.5, 0.5)) for _ in range(14)], key=lambda b: b[1])
    for (x0, L, a, bnd) in bl:
        blade(cv, x0, H - 4, L, a, bnd, 'p_reed', w=2, tip=1)
    if bulrush:
        for (x0, L) in ((15, 50), (24, 44), (20, 38)):
            tip = blade(cv, x0, H - 4, L, 0.02, 0, 'p_reed', w=1, lit=3)
            hx, hy = int(tip[0]), int(tip[1]) + 3
            for yy in range(10):
                for xx in range(-1, 2):
                    L2 = 0.7 - (xx + 1) * 0.25 - (0.1 if yy > 7 else 0)
                    cv.put(hx + xx, hy + yy, shade('p_seedhead', L2))
            cv.put(hx, hy - 1, C('p_reed', 3)); cv.put(hx, hy - 2, C('p_reed', 3))
    fin(cv)
    return cv


def willowherb(seed=80):
    """Rosebay willowherb: tall magenta-pink spikes, the classic railway-cutting weed. 30 x 62."""
    W, H = 30, 62; cv = Canvas(W, H); R = Rng(seed)
    for (x0, L) in ((9, 42), (18, 52), (23, 38), (13, 30)):
        blade(cv, x0, H - 4, L, R.u(-0.08, 0.08), 0.04, 'p_nettle', lit=3)
        for j, k in enumerate(range(5, int(L * 0.6), 6)):
            sd = 1 if j % 2 else -1
            blade(cv, x0 + 0.5, H - 4 - k, 6, sd * 0.7, sd * 0.3, 'p_nettle', lit=2)
        for k in range(int(L * 0.6), int(L)):
            y = H - 4 - k; f = (k - L * 0.6) / (L * 0.4); ww = 2 if f < 0.7 else 1
            for d in range(-ww, ww + 1):
                if hash01(x0 + d, y, 81) < 0.8:
                    cv.put(int(x0 + d), y, shade('p_fox', 0.75 - d * 0.18 - (0.25 if f > 0.8 else 0)))
    fin(cv)
    return cv


def ragwort(seed=85):
    """Ragwort: a leggy stem with a flat head of small yellow daisies. 26 x 40."""
    W, H = 26, 40; cv = Canvas(W, H); R = Rng(seed)
    for (x0, L) in ((10, 28), (15, 32), (18, 24)):
        blade(cv, x0, H - 3, L, R.u(-0.15, 0.15), 0, 'p_weed', lit=3)
    for k in range(10):
        x, y = 5 + R.u(0, 16), 6 + R.u(0, 6)
        cv.put(int(x), int(y), C('flower_yel', 0)); cv.put(int(x) + 1, int(y), C('flower_yel', 1))
        cv.put(int(x), int(y) + 1, C('flower_yel', 1)); cv.put(int(x) + 1, int(y) + 1, C('flower_yel', 2))
    for k in range(4): leaf(cv, 12 + (k - 1.5) * 4, H - 8 - k * 3, 3, 1.6, (k - 1.5) * 0.5, 'p_weed')
    fin(cv)
    return cv


def grass_tuft(seed=90, tall=False):
    """A tuft of rough grass (with a seed-head or two when tall). 24 x 20 / 26 x 32."""
    W, H = (26, 32) if tall else (24, 20); cv = Canvas(W, H); R = Rng(seed)
    for i in range(9 if tall else 7):
        blade(cv, W / 2 + R.u(-5, 5), H - 3, R.u(H * 0.45, H * 0.8), R.u(-0.7, 0.7), R.u(-0.5, 0.5), 'p_weed', w=1)
    if tall:
        for x0 in (9, 16):
            tip = blade(cv, x0, H - 3, H - 6, R.u(-0.2, 0.2), 0.1, 'p_reed', lit=2)
            for k in range(6): cv.put(int(tip[0]) + (k % 2), int(tip[1]) + k, C('p_reed', 1 + k % 2))
    fin(cv)
    return cv


def dandelions(seed=95):
    """A flat rosette of dandelion leaves with yellow flowers and a clock. 26 x 18."""
    W, H = 26, 18; cv = Canvas(W, H); R = Rng(seed)
    for k in range(6):
        leaf(cv, 13 + math.cos(k * 1.05) * 6, 12 + math.sin(k * 1.05) * 2.4, 5, 1.8, k * 1.05, 'p_weed')
    for (x, y) in ((9, 7), (16, 8)):
        blade(cv, x, 12, 4, 0, 0, 'p_weed', lit=2)
        cv.ellipse(x, y, 2.4, 2, lambda xx, yy, nx, ny, nz: shade('flower_yel', light(nx, ny, nz) + 0.1))
    blade(cv, 20, 12, 8, 0.2, 0, 'p_weed', lit=2)
    cv.ellipse(21.5, 4, 2.8, 2.8, lambda xx, yy, nx, ny, nz: shade('p_daisy', light(nx, ny, nz) + 0.1))
    fin(cv)
    return cv


def ballast_weeds(seed=97):
    """Low weeds that grow between sleepers on a closed line: a few blades, a tiny flower, a dock leaf. 28 x 16."""
    W, H = 28, 16; cv = Canvas(W, H); R = Rng(seed)
    leaf(cv, 9, 11, 5, 2.4, -0.4, 'p_nettle', bias=0.05)
    for i in range(6): blade(cv, 14 + R.u(-6, 8), H - 2, R.u(5, 11), R.u(-0.8, 0.8), R.u(-0.4, 0.4), 'p_weed')
    cv.put(20, 5, C('p_daisy', 0)); cv.put(21, 5, C('p_daisy', 1)); cv.put(20, 4, C('p_daisy', 0)); cv.put(20, 6, C('flower_yel', 1))
    fin(cv)
    return cv


def sapling(seed=100):
    """A young self-seeded sycamore (as in the cutting and the bridge mortar). 40 x 76."""
    s = 0.34 * K
    t = Tree(40, 76, 20, 70); v = t.v; R = Rng(seed)
    v.tube([(20, 70, 0), (19, 50, 0), (21, 30, 0)], 1.8, 0.9, 'p_greyoak', tex=bark_tex(seed, 0.08, 0.5))
    for (y0, sd) in ((52, -1), (44, 1), (36, -1)):
        v.tube([(20, y0, 0), (20 + sd * 10, y0 - 8, -2)], 1.0, 0.6, 'p_greyoak')
    g = (18, 30, -2, 22); ao = (28, 56, 0.2)
    for i, (lx, ly, lr) in enumerate(((20, 24, 10), (11, 38, 8), (29, 34, 8), (20, 36, 7))):
        lobe_clumps(v, lx, ly, 2, lr, 'p_syc', g, 5.0, 1.6, seed + i * 7, ao, lobes=5, lamp=0.28, holes=0.1)
    return t.finish((24, 71, 10, 3))
