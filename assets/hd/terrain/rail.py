"""Railway: ballast and cess tiles, timber / concrete sleepers (H and V track), rail strips (rusty / live), a rail
cross-section for curves, rail joint, and level-crossing decks.

Track geometry (art px, 48 px tiles, a straight track occupies a band 2 tiles = 96 px across):
  * rail strips: top row at 24 and 60 across the band (strip is 7 px: head, side, web/foot, cast shadow)
  * sleepers: 66 px long, centred on the band (from 15 to 81), 12 px wide, laid every 24 px
Vertical (N-S) track uses the same numbers across x.
"""
import math
import numpy as np
from tk import *  # noqa: F401,F403
import grass as GR

BAND = 96
RAIL_TOP = (24, 60)
RAIL_H = 7
SL_LEN, SL_W, SL_PITCH, SL_START = 66, 12, 24, 15
CHAIR_AT = (RAIL_TOP[0] - SL_START + 3, RAIL_TOP[1] - SL_START + 3)   # rail-head centre along the sleeper


# ------------------------------------------------------------------ ballast (periodic Voronoi of angular stones)
def _voronoi(pts, w=T, h=T):
    P = np.array([(p[0], p[1]) for p in pts])
    dx = XX[..., None] + 0.5 - P[:, 0]; dy = YY[..., None] + 0.5 - P[:, 1]
    dx = (dx + w / 2) % w - w / 2; dy = (dy + h / 2) % h - h / 2
    d = np.sqrt(dx * dx + dy * dy)
    o = np.argsort(d, axis=2)
    i1, i2 = o[..., 0], o[..., 1]
    d1 = np.take_along_axis(d, i1[..., None], 2)[..., 0]; d2 = np.take_along_axis(d, i2[..., None], 2)[..., 0]
    ddx = np.take_along_axis(dx, i1[..., None], 2)[..., 0]; ddy = np.take_along_axis(dy, i1[..., None], 2)[..., 0]
    return i1, d1, d2, ddx, ddy


def _stones(pts, rampn, rust_p, dirty, gap_ramp, gap_idx, tone_sd, facets=3):
    i1, d1, d2, ddx, ddy = _voronoi(pts)
    n = len(RAMPS[rampn])
    idx = np.zeros((T, T), int); rus = np.zeros((T, T), bool)
    tones = []; norms = []; rusty = []
    for p in pts:
        rr = np.random.default_rng(int(p[2] * 1e9) % (2 ** 31) + int(p[3] * 1e5))
        tones.append(rr.normal() * tone_sd)
        norms.append([(rr.normal() * 0.35, rr.normal() * 0.35) for _ in range(facets)])
        rusty.append(rr.random() < rust_p)
    for y in range(T):
        for x in range(T):
            k = i1[y, x]
            ang = math.atan2(ddy[y, x], ddx[y, x]); f = int(((ang + math.pi) / (2 * math.pi) * facets + norms[k][0][0] * 2) % facets)
            tx, ty = norms[k][f]
            r = math.hypot(ddx[y, x], ddy[y, x]) + 1e-6
            # domed stone + per-facet tilt: normal leans out towards the stone's rim
            nx = ddx[y, x] / r * min(1, r / 3.2) * 0.8 + tx; ny = ddy[y, x] / r * min(1, r / 3.2) * 0.8 + ty
            lum = float(lambert(np.array(nx), np.array(ny), np.array(1.0)))
            v = 1.3 - (lum - FLAT) * 3.2 + tones[k] + dirty
            idx[y, x] = int(np.clip(round(v), 0, n - 1)); rus[y, x] = rusty[k]
    img = from_idx(idx, rampn)
    if rust_p:
        img[rus] = from_idx(np.clip(idx + 1, 0, 4), 'rust')[rus] if False else from_idx(np.clip(idx, 1, 4), 'mud')[rus]
    gap = (d2 - d1) < 1.0
    # gaps: darker on the side away from the light
    shade = gap & ((ddx + ddy) > 0)
    img[gap] = from_idx(np.full((T, T), gap_idx), gap_ramp)[gap]
    img[shade] = from_idx(np.full((T, T), min(len(RAMPS[gap_ramp]) - 1, gap_idx + 1)), gap_ramp)[shade]
    return img


def ballast_tile(v, seed, rampn='ballast', spacing=4.6, rust_p=0.0, dirty=0.0, gap_ramp='ballast', gap_idx=3, tone_sd=0.45):
    L = Layered(seed, v)
    base_pts = jitter_pts(np.random.default_rng(seed), spacing)
    var_pts = jitter_pts(np.random.default_rng(seed * 7 + v + 1), spacing)
    mixed = [p for p in base_pts if edge_d(p[0], p[1]) < 5] + [p for p in var_pts if edge_d(p[0], p[1]) >= 5]
    a = _stones(base_pts, rampn, rust_p, dirty, gap_ramp, gap_idx, tone_sd)
    b = _stones(mixed, rampn, rust_p, dirty, gap_ramp, gap_idx, tone_sd)
    return np.where((EDGE_D < 3)[..., None], a, b), L


def weed(rng, big=False):
    """A ballast weed: a grass tuft, a dandelion rosette, or a little herb-robert-ish sprig."""
    k = rng.random()
    if k < 0.5:
        s, ax, ay = GR.clump(rng, 'grass', 6 if big else 4, 7 if big else 4, 5 if big else 3, base_i=4, tip_lit=0, tip_dark=2)
        return s
    if k < 0.8:   # dandelion rosette, maybe in flower
        a = blank(11, 9)
        for ang in range(0, 360, 45):
            r = 2 + (ang % 90 == 0)
            for t in range(1, r + 1):
                x = 5 + math.cos(math.radians(ang + t * 6)) * t; y = 4 + math.sin(math.radians(ang + t * 6)) * t * 0.7
                put(a, x, y, rgb('leaf', 2 if (ang in (180, 225, 270)) else 3), False)
        put(a, 5, 4, rgb('leaf', 4), False)
        if rng.random() < 0.6:
            for (x, y, i) in [(5, 3, 0), (4, 4, 1), (6, 4, 1), (5, 4, 1), (5, 5, 2)]: put(a, x, y, rgb('flower_yel', i), False)
        return a
    a = blank(7, 7)   # herb sprig
    for y in range(2, 7): put(a, 3, y, rgb('wine', 2), False)
    for (x, y) in [(1, 2), (2, 1), (5, 3), (4, 2), (1, 4), (2, 4), (5, 5)]: put(a, x, y, rgb('leaf', 2), False)
    put(a, 2, 0, rgb('flower_red', 0), False); put(a, 5, 2, rgb('flower_red', 1), False)
    return a


def grass_patches(img, L, v, thresh, seed=611, tufts=True, island=False):
    """Grass creeping over: a real grass texture inside a ragged, locked-noise mask, a shaded lip on the stones
    beyond it, and tufts leaning out over the edge."""
    f = L.field((16, 8, 4)) + (L.white() - 0.5) * 0.5
    if island:   # patches fade out before the border, so these tiles mix freely with the plain set
        t = np.clip((EDGE_D - 3) / 10, 0, 1); f = f - 3 * (1 - t * t * (3 - 2 * t))
    gimg, _ = GR.grass_tile(v, 'grass', seed=seed)
    m = f > thresh
    lip = np.zeros_like(m)
    for dx, dy in ((1, 0), (0, 1), (1, 1)): lip |= np.roll(np.roll(m, dy, 0), dx, 1)
    lip &= ~m
    sh = img.copy(); sh[..., :3] = (sh[..., :3] * 0.72).astype(np.uint8)
    img[lip] = sh[lip]
    img[m] = gimg[m]
    if tufts:
        GR.clump_layer(img, L, 5.0, (3, 6, 4, 7), lambda q: 'grass', base_i=3, tip_lit=0, tip_dark=1, nbl=(3, 5),
                       skip=lambda q: abs(f[int(q[1]) % T, int(q[0]) % T] - thresh) > 0.35 or q[2] > 0.8)
    return f


def weeds_on(img, L, spacing, p, big_p=0.3, interior=True):
    def mk(q, rr):
        return weed(rr, big=rr.random() < big_p)
    scatter_sprites(img, L, spacing, mk, (7, 10, 7, 1), p=p, interior_only=interior)


def ballast_sets():
    out = {}
    # closed line: dirty, rust-stained, fines in the gaps
    old = []
    for v in range(8):
        img, L = ballast_tile(v, 131, 'ballast', 4.4, rust_p=0.22, dirty=0.35, gap_ramp='mud', gap_idx=3)
        if v >= 6: weeds_on(img, L, 14, 0.5, 0.2)
        old.append(img)
    out['ballast_old'] = (old, [2, 2, 2, 2, 2, 2, 1, 1])
    weedy = []
    for v in range(8):
        img, L = ballast_tile(v, 137, 'ballast', 4.4, rust_p=0.25, dirty=0.4, gap_ramp='mud', gap_idx=3)
        grass_patches(img, L, v, 0.4 if v < 4 else -0.1, island=True)
        weeds_on(img, L, 12, 0.45, 0.4)
        weedy.append(img)
    out['ballast_old_weedy'] = (weedy, [1] * 8)
    live = []
    for v in range(8):
        img, L = ballast_tile(v, 149, 'ballast', 4.6, rust_p=0.0, dirty=-0.25, gap_ramp='ballast', gap_idx=3, tone_sd=0.4)
        live.append(img)
    out['ballast_live'] = (live, [1] * 8)
    # cess: the flat cinder walkway beside the ballast
    cold = []
    for v in range(8):
        img, L = ballast_tile(v, 151, 'charcoal', 3.2, rust_p=0.12, dirty=0.4, gap_ramp='mud', gap_idx=4, tone_sd=0.35)
        grass_patches(img, L, v, 1.0 if v < 5 else 0.45, seed=617)
        if v >= 3: weeds_on(img, L, 14, 0.4, 0.3)
        cold.append(img)
    out['cess_old'] = (cold, [2, 2, 2, 1, 1, 1, 1, 1])
    cnew = []
    for v in range(8):
        img, L = ballast_tile(v, 157, 'ballast', 3.0, dirty=0.2, gap_ramp='ballast', gap_idx=3, tone_sd=0.3)
        cnew.append(img)
    out['cess_new'] = (cnew, [1] * 8)
    return out


# ------------------------------------------------------------------ sleepers
def sleeper(rng, kind, orient='H'):
    """kind: 'rotten', 'weathered', 'new' (timber) or 'concrete'. orient 'H' = horizontal track (sleeper runs N-S in
    the sprite), 'V' = vertical track. Includes chairs (timber) or rail seats + clips (concrete), a visible south face,
    and a translucent cast shadow to the south-east. Anchor: centre of the sleeper's top face."""
    Ls, Ws, face = SL_LEN, SL_W, 3
    # build in "long" coords: u along the length (0..Ls), w across (0..Ws); map to image later
    if orient == 'H':
        W, H = Ws + 3, Ls + face + 2
        def uv(x, y): return y, x          # u = y, w = x
    else:
        W, H = Ls + 3, Ws + face + 2
        def uv(x, y): return x, y
    a = blank(W, H)
    ramp = {'rotten': 'wood_dark', 'weathered': 'sleeper', 'new': 'sleeper', 'concrete': 'concrete'}[kind]
    n = len(RAMPS[ramp])
    tone = {'rotten': 0.6, 'weathered': 0.0, 'new': 0.8, 'concrete': -0.2}[kind]
    # grain along the length: stretched noise
    g1 = [rng.random() for _ in range(Ws + 2)]
    g2 = [[rng.random() for _ in range(Ls // 6 + 3)] for _ in range(Ws + 2)]
    def grain(u, w):
        k = u / 6; i = int(k); f = k - i
        return (g1[w] - 0.5) * 0.9 + ((g2[w][i] * (1 - f) + g2[w][i + 1] * f) - 0.5) * 0.7
    # silhouette erosion for rotten ends and broken edges
    bite = {}
    if kind == 'rotten':
        for u in range(Ls):
            bite[u] = (1 if rng.random() < 0.18 else 0, 1 if rng.random() < 0.22 else 0)
        end0, end1 = int(rng.integers(0, 4)), int(rng.integers(0, 5))
    else:
        end0 = end1 = 0
    top = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            u, w = uv(x, y)
            if not (end0 <= u < Ls - end1 and 0 <= w < Ws): continue
            if kind == 'rotten':
                b0, b1 = bite.get(u, (0, 0))
                if w < b0 or w >= Ws - b1: continue
            if kind == 'concrete':   # slightly waisted between the rail seats
                mid = abs(u - Ls / 2) < 12
                if mid and (w == 0 or w == Ws - 1): continue
            top[y, x] = True
    for y in range(H):
        for x in range(W):
            if not top[y, x]: continue
            u, w = uv(x, y)
            edge_n = (y == 0 or not top[y - 1, x]); edge_w = (x == 0 or not top[y, x - 1])
            edge_s = (y == H - 1 or not top[y + 1, x]); edge_e = (x == W - 1 or not top[y, x + 1])
            v = 1.6 - tone * 0.8 + grain(u, w) * (0.35 if kind == 'concrete' else 1.0)
            if edge_n or edge_w: v -= 0.9
            if edge_s or edge_e: v += 0.8
            if kind == 'weathered': v -= 0.2
            put(a, x, y, rgb(ramp, int(np.clip(round(v), 0, n - 1))), False)
    # visible south face below each bottom edge pixel
    for x in range(W):
        for y in range(H - 1, -1, -1):
            if top[y, x]:
                depth = face if orient == 'V' else 2
                for k in range(1, depth + 1):
                    if y + k < H and not top[y + k, x]: put(a, x, y + k, rgb(ramp, n - 1 if k > 1 else n - 2), False)
                break
    # SE cast shadow (translucent)
    solid = a[..., 3] > 0
    for y in range(H):
        for x in range(W):
            if not solid[y, x] and x > 0 and y > 0 and solid[y - 1, x - 1]:
                put(a, x, y, shadow(70), False)
    # timber: splits along the grain, end checks, knots; rotten: holes, moss, fungus
    def at_uw(u, w):
        return (w, u) if orient == 'H' else (u, w)
    if kind != 'concrete':
        for _ in range(int(rng.integers(1, 3)) + (2 if kind == 'rotten' else 0)):
            w = int(rng.integers(2, Ws - 2)); u0 = int(rng.integers(end0 + 2, Ls - 20)); ln = int(rng.integers(8, 22))
            for u in range(u0, min(Ls - end1 - 2, u0 + ln)):
                x, y = at_uw(u, w + (1 if (u - u0) > ln * 0.6 and kind == 'rotten' else 0))
                if top[y, x]: put(a, x, y, rgb(ramp, n - 1), False)
        if kind == 'rotten':
            for _ in range(int(rng.integers(2, 5))):     # soft, crumbling holes
                u, w = int(rng.integers(end0 + 3, Ls - end1 - 3)), int(rng.integers(2, Ws - 3))
                for du in range(-1, 2):
                    for dw in range(0, 2):
                        x, y = at_uw(u + du, w + dw)
                        if top[y, x]: put(a, x, y, rgb(ramp, n - 1 if dw == 0 else n - 2), False)
            for _ in range(int(rng.integers(1, 3))):     # moss
                u, w = int(rng.integers(end0 + 2, Ls - end1 - 4)), int(rng.integers(1, Ws - 2))
                for k in range(int(rng.integers(4, 9))):
                    x, y = at_uw(u + int(rng.integers(-2, 3)), w + int(rng.integers(-1, 2)))
                    if 0 <= x < W and 0 <= y < H and top[y, x]: put(a, x, y, rgb('leaf', int(rng.integers(1, 4))), False)
        # chairs + keys (cast iron, a bit rusty on the closed line)
        for cu in CHAIR_AT:
            for du in range(-6, 7):
                for dw in range(-1, Ws + 1):
                    x, y = at_uw(cu + du, dw)
                    if not (0 <= x < W and 0 <= y < H): continue
                    lit = (du < -3) or dw <= 0
                    dark = (du > 4) or dw >= Ws - 1
                    base = 'rust' if kind in ('rotten', 'weathered') and ((x * 5 + y * 3) % 7 < 3) else 'paint_black'
                    i = 1 if lit else (3 if dark else 2)
                    if base == 'rust': i += 1
                    put(a, x, y, rgb(base, i), False)
            # jaws either side of the rail (the rail strip covers the middle)
            for dw in (1, Ws - 2):
                for du in (-4, 4):
                    x, y = at_uw(cu + du, dw)
                    if 0 <= x < W and 0 <= y < H: put(a, x, y, rgb('paint_black', 3), False)
            # wooden key on the north side of the rail
            for du in range(-6, -3):
                for dw in range(3, Ws - 3):
                    x, y = at_uw(cu + du, dw)
                    if 0 <= x < W and 0 <= y < H: put(a, x, y, rgb('wood', 2 if kind == 'new' else 3) if du > -6 else rgb('wood', 4), False)
    else:
        for cu in CHAIR_AT:   # rail seat pad + two steel clips
            for du in range(-4, 5):
                for dw in range(1, Ws - 1):
                    x, y = at_uw(cu + du, dw)
                    put(a, x, y, rgb('charcoal', 3 if abs(du) < 4 else 2), False)
            for du in (-6, 5):
                for dw in range(3, Ws - 3):
                    x, y = at_uw(cu + du, dw)
                    put(a, x, y, rgb('metal', 2 if dw < Ws // 2 else 3), False)
                x, y = at_uw(cu + du + (1 if du > 0 else -1), Ws // 2); put(a, x, y, rgb('metal', 4), False)
    return a


def sleeper_sets():
    out = {}
    for kind, nvar in [('rotten', 6), ('weathered', 6), ('new', 4), ('concrete', 4)]:
        for orient in ('H', 'V'):
            out['sleeper_%s_%s' % (kind, orient)] = [sleeper(np.random.default_rng(3000 + i * 13 + hash(kind) % 1 + len(kind) * 101 + (7 if orient == 'V' else 0)), kind, orient) for i in range(nvar)]
    return out


# ------------------------------------------------------------------ rails
def rail_strip(kind, orient='H', length=T):
    """A 48 px tiling length of rail. kind 'rust' (closed line) or 'live' (bright running head, rusty sides).
    H: 48 x 7 (rows: lit north edge, head top x2, south side, web, foot, cast shadow). V: 7 x 48."""
    rng = np.random.default_rng(4000 + (1 if kind == 'live' else 0))
    L = Layered(4001 + (1 if kind == 'live' else 0), 0)
    nz = pnoise(rng, 8, length, 8)[0] + pnoise(rng, 4, length, 8)[0] * 0.5   # periodic mottling along the rail
    a = blank(length, RAIL_H)
    for x in range(length):
        m = nz[x]
        if kind == 'rust':
            col = [rgb('rust', 1 if m > 0.3 else 2), rgb('rust', 1 if m > -0.2 else 2), rgb('rust', 2 if m > -0.5 else 3),
                   rgb('rust', 3), rgb('rust', 4), rgb('mud', 3)]
        else:
            col = [rgb('rail', 0), rgb('rail', 1 if m > -0.6 else 2), rgb('rail', 2), rgb('rust', 3), rgb('rust', 4), rgb('rust', 3)]
        for y, c in enumerate(col): put(a, x, y, c, False)
        put(a, x, 6, shadow(80), False)
    if kind == 'live':
        for x in range(5, length, 17): put(a, x, 0, rgb('white', 0), False)
    else:
        for x in range(length):          # flaky scale on the rusty head
            if (x * 7) % 11 == 0: put(a, x, 1, rgb('rust', 0), False)
            if (x * 5) % 13 == 3: put(a, x, 2, rgb('rust', 3), False)
    if orient == 'V':
        # rotate so the lit edge is on the left (west) and the shadow falls east
        a = np.ascontiguousarray(np.transpose(a, (1, 0, 2)))
    return a


def rail_xsec(kind):
    """1 px wide profile across the rail (index 0 = lit side, last = shadow) for plotting curves: stamp it along the
    curve's normal at every sample (the renderer rotates the order by the side facing the light)."""
    s = rail_strip(kind, 'H', 16)
    return s[:, 3:4].copy()


def rail_joint(kind):
    """Fishplated joint overlay for a horizontal rail (place every few tiles on top of the rail strip): the gap and the
    fishplate + bolts on the south side."""
    a = blank(16, RAIL_H + 2)
    for y in range(0, 4): put(a, 8, y, rgb('mud', 4) if kind == 'rust' else rgb('rail', 4), False)
    for x in range(1, 15):
        put(a, x, 3, rgb('rust', 2 if kind == 'rust' else 3), False); put(a, x, 4, rgb('rust', 3), False)
    for x in (3, 6, 10, 13): put(a, x, 3, rgb('metal', 2), False); put(a, x, 4, rgb('paint_black', 3), False)
    for x in range(1, 16): put(a, x, 5, shadow(70), False)
    return a


# ------------------------------------------------------------------ level crossing deck
def xing_deck(kind, v=0, rail='rust', rails=True, y0=10, y1=86, h=BAND):
    """48 x 96 slice of a road-over-rail deck for a horizontal track band (tiles along x). kind 'timber' (old, dead
    crossing) or 'rubber' (modern panels). Rails are inset, head flush, with a dark flangeway on the gauge side."""
    rng = np.random.default_rng(5000 + v + (100 if kind == 'rubber' else 0))
    a = blank(T, h)
    if kind == 'timber':
        L = Layered(5001, v)
        for y in range(y0, y1):
            plank = (y - y0) // 8
            joint = (y - y0) % 8 == 7
            off = [0, 20, 34, 10, 28, 40][plank % 6] + v * 7
            for x in range(T):
                g = math.sin((x + plank * 13) * 0.9) * 0.3 + ((x * 31 + y * 17 + plank * 7) % 13) / 13 * 0.8
                i = int(np.clip(round(1.8 + g - (0.8 if (y - y0) % 8 == 0 else 0) + (0.8 if (y - y0) % 8 == 6 else 0)), 0, 4))
                c = rgb('wood_dark', i) if not joint else rgb('wood_dark', 4)
                if (x - off) % T == 0 and not joint: c = rgb('wood_dark', 4)
                if (x - off - 3) % T == 0 and (y - y0) % 8 == 3: c = rgb('metal', 3)   # coach screw
                put(a, x, y, c, False)
    else:
        for y in range(y0, y1):
            for x in range(T):
                px, py = (x % 6), ((y - y0) % 6)
                stud = px in (2, 3) and py in (2, 3)
                c = rgb('charcoal', 2 if (stud and px == 2 and py == 2) else (3 if not stud else 3 if px == 3 else 2))
                if (y - y0) in (0, 1): c = rgb('charcoal', 1)
                if x % 24 == 23: c = rgb('charcoal', 4)
                put(a, x, y, c, False)
    if not rails: return a
    for x in range(T):   # deck edges: ramped lip lit on the north, shadow south
        put(a, x, y0 - 1, rgb('charcoal', 2) if kind == 'rubber' else rgb('wood_dark', 1), False)
        put(a, x, y1, rgb('paint_black', 3), False); put(a, x, y1 + 1, shadow(70), False)
    for rt in RAIL_TOP:   # rail heads flush with the deck, flangeway on the gauge side
        head = [rgb('rust', 1), rgb('rust', 2)] if rail == 'rust' else [rgb('rail', 0), rgb('rail', 1)]
        for x in range(T):
            put(a, x, rt, head[0], False); put(a, x, rt + 1, head[1], False)
            fy = rt + 2 if rt == RAIL_TOP[0] else rt - 1
            put(a, x, fy, rgb('paint_black', 4), False)
            put(a, x, fy + (1 if rt == RAIL_TOP[0] else -1), rgb('paint_black', 3), False)
    return a


def xing_panel(kind, v):
    """Plain 48x48 deck texture (timber planks E-W / rubber panel) for deck areas off the rails."""
    return xing_deck(kind, v, rails=False, y0=0, y1=T, h=T)
