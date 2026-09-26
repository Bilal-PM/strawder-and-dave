"""The beck: animated water tiles (4 frames, flowing north -> south), bank overlays with earth, stones and reeds,
and standalone puddle overlays."""
import math
import numpy as np
from tk import *  # noqa: F401,F403
import grass as GR

FRAMES = 4
STEP = T // FRAMES   # the ripple field moves 12 px south per frame: frame 4 == frame 0, so the loop is seamless


def anoise(rng, cx, cy):
    """Periodic anisotropic value noise (cell cx by cy px)."""
    nx, ny = T // cx, T // cy
    g = rng.random((ny, nx)) * 2 - 1
    gx, gy = (XX + 0.5) / cx, (YY + 0.5) / cy
    x0, y0 = np.floor(gx).astype(int), np.floor(gy).astype(int); fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = g[y0 % ny, x0 % nx]; b = g[y0 % ny, (x0 + 1) % nx]; c = g[(y0 + 1) % ny, x0 % nx]; d = g[(y0 + 1) % ny, (x0 + 1) % nx]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def flow_field(rng):
    f = anoise(rng, 4, 16) + anoise(rng, 8, 24) * 0.7 + anoise(rng, 2, 8) * 0.35
    return (f - f.mean()) / (f.std() + 1e-9)


def water_frames(v, seed=171):
    rb, rv = np.random.default_rng(seed), np.random.default_rng(seed * 13 + v + 1)
    fb, fv = flow_field(rb), flow_field(rv)
    slow_b, slow_v = flow_field(np.random.default_rng(seed + 5)), flow_field(np.random.default_rng(seed * 17 + v + 3))
    frames = []
    for t in range(FRAMES):
        sh = t * STEP
        f = lock_blend(np.roll(fb, sh, 0), np.roll(fv, sh, 0))
        s = lock_blend(np.roll(slow_b, sh // 2 if False else 0, 0), slow_v)       # static depth mottling
        val = 2.45 - f * 0.42 + s * 0.3
        idx = np.clip(np.round(val), 1, 4).astype(int)
        img = from_idx(idx, 'water')
        # ripple crests: thin light streaks where the flow field peaks
        crest = (f > 1.2) & (np.roll(f, 1, 0) < f + 0.4)
        img[crest] = from_idx(np.full((T, T), 1), 'water')[crest]
        # glints twinkle per frame (base-locked near the border)
        wb = np.random.default_rng(seed * 101 + t).random((T, T)); wv = np.random.default_rng(seed * 103 + v * 7 + t).random((T, T))
        w = np.where(EDGE_D < 3, wb, wv)
        g = (w > 0.992) & (f > 0.6)
        img[g] = from_idx(np.full((T, T), 0), 'water')[g]
        frames.append(img)
    return frames


def water_sets():
    return [water_frames(v) for v in range(6)]


# ------------------------------------------------------------------ banks
SIDES = {'N': lambda: YY, 'S': lambda: T - 1 - YY, 'W': lambda: XX, 'E': lambda: T - 1 - XX}
# per side: visible earth depth (the north bank's face looks south, towards the camera), earth tone
FACE = {'N': (12.0, 2.4), 'S': (3.0, 1.8), 'W': (8.0, 2.7), 'E': (7.0, 1.7)}


def bank_overlay(sides, v, mode='edge', seed=191):
    """sides: e.g. 'N' (edge), 'NW' L-corner (land N and W), or diagonal nub 'NW' with mode='diag'.
    Returns a transparent 48x48 overlay to draw over the water tile."""
    L = Layered(seed, v)
    R = 16.0
    if mode == 'edge':
        s = SIDES[sides]()
    elif mode == 'L':
        a, b = SIDES[sides[0]](), SIDES[sides[1]]()
        inside = (a < R) & (b < R)
        s = np.where(inside, R - np.hypot(R - a, R - b), np.minimum(a, b))
    else:  # diag nub: land only at that corner
        a, b = SIDES[sides[0]](), SIDES[sides[1]]()
        s = np.hypot(a + 0.5, b + 0.5) - 0.5
    # which side's look applies at each pixel
    if len(sides) == 2:
        a, b = SIDES[sides[0]](), SIDES[sides[1]]()
        face = np.where(a <= b, FACE[sides[0]][0], FACE[sides[1]][0]); etone = np.where(a <= b, FACE[sides[0]][1], FACE[sides[1]][1])
    else:
        face = np.full((T, T), FACE[sides][0]); etone = np.full((T, T), FACE[sides][1])
    (f1, f1b), (f2, f2b), f3 = L.field((16, 8, 4), both=True), L.field((8, 4, 2), both=True), L.field((4, 2))
    d1 = 2.5 + 1.5 * f1                    # grass lip
    d2 = d1 + face + 2.0 * f2              # earth / stones down to the waterline
    d2b = 2.5 + 1.5 * f1b + face + 2.0 * f2b
    out = blank()
    gimg, _ = GR.grass_tile(v, 'grass', seed=613)
    grass_m = s < d1
    out[grass_m] = gimg[grass_m]
    earth_m = (s >= d1) & (s < d2)
    t = np.clip((s - d1) / np.maximum(face, 1), 0, 1)
    eidx = np.clip(np.round(etone + t * 1.2 + f3 * 0.5), 0, 4).astype(int)
    e = from_idx(eidx, 'mud')
    out[earth_m] = e[earth_m]
    # grass lip casts a dark line onto the earth
    lip = earth_m & (s < d1 + 1.2)
    out[lip] = from_idx(np.full((T, T), 4), 'mud')[lip]
    # shallow, shaded water along the waterline (translucent)
    wl = (s >= d2) & (s < d2 + 3.5)
    out[wl] = np.array(SHADOW[:3] + (95,), np.uint8)
    wl2 = (s >= d2 + 3.5) & (s < d2 + 5.5)
    out[wl2] = np.array(SHADOW[:3] + (45,), np.uint8)
    # stones at the waterline, wet highlights (band-locked scatter along the bank)
    stones = blank()
    def mk(q, rr):
        x, y = int(q[0]) % T, int(q[1]) % T
        if abs(s[y, x] - (d2b if is_base(q) else d2)[y, x]) > 2.5: return None
        return pebble(rr, 'stone', 1.4 + q[2] * 2.0, 1.1 + q[3] * 1.3, tone=rr.normal() * 0.25 - 0.1, lo=0, hi=5,
                      shadow_idx=SHADOW[:3] + (110,))
    scatter_sprites(stones, L, 4.0, mk, (5, 6, 5, 1), p=0.85)
    out = over(out, stones)
    # reeds and rushes (interior only, near the waterline)
    rng = np.random.default_rng(seed * 7 + v * 31 + len(sides) * 3 + ord(sides[0]))
    if v % 2 == 0 and mode == 'edge':
        for _ in range(int(rng.integers(2, 4))):
            for tries in range(40):
                x, y = int(rng.integers(8, T - 8)), int(rng.integers(24, T - 3))
                if abs(s[y, x] - d2[y, x]) < 1.5: break
            else:
                continue
            for k in range(int(rng.integers(3, 6))):
                rx = x + k * 2 - 4 + int(rng.integers(-1, 2)); hh = int(rng.integers(12, 20)); lean = rng.integers(-1, 2)
                for j in range(hh):
                    xx = rx + (lean if j > hh * 0.6 else 0)
                    if 0 < xx < T - 1 and 0 < y - j < T:
                        put(out, xx, y - j, rgb('leaf', 3 if j < 3 else (2 if k % 2 else 1) if j < hh - 1 else 1), False)
                if k % 2 == 0 and y - hh - 3 > 0:   # bulrush head
                    for j in range(3): put(out, rx, y - hh - j, rgb('bark', 1 if j == 2 else 2), False); put(out, rx + 1, y - hh - j, rgb('bark', 3), False)
                put(out, rx + 1, y + 1, SHADOW[:3] + (100,), False)
    return out


def bank_sets():
    out = {}
    for sd in 'NSEW':
        out['bank_%s' % sd] = [bank_overlay(sd, v, 'edge') for v in range(4)]
    for c in ('NW', 'NE', 'SW', 'SE'):
        out['bank_L_%s' % c] = [bank_overlay(c, v, 'L') for v in range(2)]
        out['bank_diag_%s' % c] = [bank_overlay(c, v, 'diag') for v in range(2)]
    return out


# ------------------------------------------------------------------ puddles
def puddle(rng, rx, ry):
    w, h = int(rx * 2 + 8), int(ry * 2 + 8)
    a = blank(w, h)
    cx, cy = w / 2, h / 2
    f = [1 + (rng.random() - 0.5) * 0.45 for _ in range(7)]
    for y in range(h):
        for x in range(w):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            ang = (math.atan2(dy, dx) / (2 * math.pi) * 7) % 7; k = int(ang); t = ang - k
            r = f[k] * (1 - t) + f[(k + 1) % 7] * t
            d = (dx * dx + dy * dy) / (r * r)
            if d < 1:
                i = 5 if dy < -0.4 else (4 if dy < 0.25 else 3)
                if d > 0.72 and dy < 0: i = 5
                put(a, x, y, rgb('water', i), False)
            elif d < 1.5:
                put(a, x, y, SHADOW[:3] + (95 if d < 1.22 else 50,), False)   # wet, darkened ground around it
    for k in range(int(rx * 0.6)): put(a, cx - rx * 0.35 + k, cy + ry * 0.3, rgb('water', 1), False)
    put(a, cx + rx * 0.3, cy - ry * 0.1, rgb('water', 0), False)
    return a


def puddle_set():
    return {'puddle_s': [puddle(np.random.default_rng(80 + i), 6, 3) for i in range(3)],
            'puddle_m': [puddle(np.random.default_rng(90 + i), 11, 5) for i in range(3)],
            'puddle_l': [puddle(np.random.default_rng(99 + i), 17, 8) for i in range(2)]}
