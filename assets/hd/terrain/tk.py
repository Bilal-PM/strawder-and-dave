"""Terrain toolkit for the LINESIDE HD terrain generator (extends assets/hd/lib/pix.py; never edits it).

Core idea: EDGE-LOCKED VARIANTS. Every variant of a surface is built from two statistically identical layers:
  * a BASE layer, periodic on the 32 px tile, shared by every variant;
  * a VARIANT layer, also periodic, different per variant.
Near the tile border (d < LOCK_A px) only the base layer exists; deeper in (d > LOCK_B) only the variant layer. Noise is
blended variance-preserving (cos/sin weights) so no ring of lower contrast appears. Scattered details (tufts, stones,
flowers) come from the base layer if their anchor lies in the border band, from the variant layer otherwise. Result:
any variant may sit next to any other variant in any direction with no seam, and the interiors differ.
"""
import os, sys, math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import pix  # noqa: E402
from pix import RAMPS, hexrgb, OUTLINE, SHADOW  # noqa: E402,F401

T = pix.TILE  # 48 art px per map tile (res 3)
LOCK_A, LOCK_B = 2.0, 10.0
LX, LY, LZ = pix.LIGHT

YY, XX = np.mgrid[0:T, 0:T].astype(np.float64)
EDGE_D = np.minimum.reduce([XX + 0.5, T - XX - 0.5, YY + 0.5, T - YY - 0.5])  # distance to nearest tile edge


def ramp_rgb(name):
    return np.array([hexrgb(c)[:3] for c in RAMPS[name]], np.uint8)


def edge_d(x, y, w=T, h=T):
    x %= w; y %= h
    return min(x + 0.5, w - x - 0.5, y + 0.5, h - y - 0.5)


# ------------------------------------------------------------------ periodic noise
def pnoise(rng, cell, w=T, h=T):
    """Periodic value noise (period w x h px), zero mean-ish in -1..1."""
    nx, ny = max(1, w // cell), max(1, h // cell)
    g = rng.random((ny, nx)) * 2 - 1
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64)
    gx, gy = (xs + 0.5) / (w / nx), (ys + 0.5) / (h / ny)
    x0, y0 = np.floor(gx).astype(int), np.floor(gy).astype(int)
    fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = g[y0 % ny, x0 % nx]; b = g[y0 % ny, (x0 + 1) % nx]
    c = g[(y0 + 1) % ny, x0 % nx]; d = g[(y0 + 1) % ny, (x0 + 1) % nx]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(rng, cells=(16, 8, 4, 2), amps=None, w=T, h=T):
    amps = amps or [0.5 ** i for i in range(len(cells))]
    v = sum(pnoise(rng, c, w, h) * a for c, a in zip(cells, amps))
    s = v.std() or 1
    return (v - v.mean()) / s


def white(rng, w=T, h=T):
    return rng.random((h, w))


def lock_blend(base, var):
    """Variance-preserving blend: base at the tile border, var in the interior."""
    t = np.clip((EDGE_D - LOCK_A) / (LOCK_B - LOCK_A), 0, 1)
    t = t * t * (3 - 2 * t)
    th = t * math.pi / 2
    return base * np.cos(th) + var * np.sin(th)


def lock_hard(base, var, a=2.0):
    """Hard lock (for crisp cell structures): the outer a px come from base."""
    return np.where(EDGE_D[..., None] < a, base, var) if base.ndim == 3 else np.where(EDGE_D < a, base, var)


class Layered:
    """Two rngs: base (shared by all variants) and variant."""

    def __init__(self, seed, variant):
        self.seed, self.variant = seed, variant
        self.base = np.random.default_rng(seed)
        self.var = np.random.default_rng(seed * 1000 + 7919 * (variant + 1))

    def field(self, cells=(16, 8, 4, 2), amps=None, both=False):
        b = fbm(self.base, cells, amps); v = fbm(self.var, cells, amps)
        return (lock_blend(b, v), b) if both else lock_blend(b, v)

    def white(self):
        b = white(self.base); v = white(self.var)
        return lock_hard(b, v, 3.0)


def jitter_pts(rng, spacing, w=T, h=T, jit=0.9):
    pts = []
    n_x, n_y = max(1, round(w / spacing)), max(1, round(h / spacing))
    sx, sy = w / n_x, h / n_y
    for j in range(n_y):
        for i in range(n_x):
            x = (i + 0.5 + (rng.random() - 0.5) * jit) * sx
            y = (j + 0.5 + (rng.random() - 0.5) * jit) * sy
            pts.append((x % w, y % h, rng.random(), rng.random(), rng.random()))
    return pts


def locked_pts(L, spacing, band, jit=0.9, ext=None):
    """Scatter points: base points (drawn wrapped, shared by all variants) plus variant points (clipped).
    A point is 'inside' when its anchor is >= band px from every edge, or, with ext=(left, up, right, down), when that
    box around the anchor stays 1 px clear of the tile edge. Inside points come from the variant stream, the rest from
    the base stream, so the density is uniform and nothing variant-specific ever touches the border.
    Each point: (x, y, r1, r2, r3, is_base)."""
    b = jitter_pts(L.base, spacing, jit=jit); v = jitter_pts(L.var, spacing, jit=jit)
    def inside(p):
        if ext is None: return edge_d(p[0], p[1]) >= band
        l, u, r, d = ext; x, y = int(p[0]), int(p[1])
        return x - l >= 1 and y - u >= 1 and x + r <= T - 2 and y + d <= T - 2
    return [p + (True,) for p in b if not inside(p)] + [p + (False,) for p in v if inside(p)]


# ------------------------------------------------------------------ images
def blank(w=T, h=T):
    return np.zeros((h, w, 4), np.uint8)


def from_idx(idx, rampname, alpha=None):
    r = ramp_rgb(rampname); idx = np.clip(idx, 0, len(r) - 1)
    out = np.zeros(idx.shape + (4,), np.uint8); out[..., :3] = r[idx]; out[..., 3] = 255 if alpha is None else alpha
    return out


def quant(v, n, jitter=None, amp=0.0):
    """v in 0..1 (1 = lit) -> ramp index 0..n-1."""
    f = (1 - np.clip(v, 0, 1)) * (n - 1)
    if jitter is not None: f = f + (jitter - 0.5) * amp
    return np.clip(np.round(f), 0, n - 1).astype(int)


def lambert(nx, ny, nz):
    l = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    d = (nx * LX + ny * LY + nz * LZ) / l
    return np.clip(0.18 + 0.82 * d, 0, 1)


def height_light(h, k=1.0, wrap=True):
    """Light (0..1) from a height field with NW light. Flat = light(0,0,1)."""
    if wrap:
        dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2; dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2
    else:
        p = np.pad(h, 1, mode='edge'); dx = (p[1:-1, 2:] - p[1:-1, :-2]) / 2; dy = (p[2:, 1:-1] - p[:-2, 1:-1]) / 2
    return lambert(-dx * k, -dy * k, np.ones_like(h))


FLAT = float(lambert(np.array(0.0), np.array(0.0), np.array(1.0)))


def put(img, x, y, c, wrap=True):
    h, w = img.shape[:2]
    x, y = int(math.floor(x)), int(math.floor(y))
    if wrap: x %= w; y %= h
    elif not (0 <= x < w and 0 <= y < h): return
    if isinstance(c, str): c = hexrgb(c)
    if len(c) == 4 and c[3] < 255:
        a = c[3] / 255; b = img[y, x].astype(float); ba = b[3] / 255; oa = a + ba * (1 - a)
        if oa <= 0: return
        rgb = [(c[i] * a + b[i] * ba * (1 - a)) / oa for i in range(3)]
        img[y, x] = [int(rgb[0]), int(rgb[1]), int(rgb[2]), int(oa * 255)]
    else:
        img[y, x] = [c[0], c[1], c[2], 255]


def stamp(img, spr, x, y, wrap=True):
    """Blit sprite (RGBA array) with its top-left at (x, y)."""
    sh, sw = spr.shape[:2]
    for j in range(sh):
        for i in range(sw):
            c = spr[j, i]
            if c[3] == 0: continue
            put(img, x + i, y + j, tuple(int(v) for v in c), wrap)


def over(dst, src):
    """Alpha-composite src over dst (arrays)."""
    a = src[..., 3:4] / 255.0; ba = dst[..., 3:4] / 255.0; oa = a + ba * (1 - a)
    rgb = np.where(oa > 0, (src[..., :3] * a + dst[..., :3] * ba * (1 - a)) / np.maximum(oa, 1e-6), 0)
    out = np.zeros_like(dst); out[..., :3] = np.clip(rgb, 0, 255); out[..., 3] = np.clip(oa[..., 0] * 255, 0, 255)
    return out.astype(np.uint8)


def rgb(name, i):
    r = RAMPS[name]; return hexrgb(r[max(0, min(len(r) - 1, i))])


def shadow(a=90):
    return SHADOW[:3] + (a,)


def mix(c1, c2, t):
    return tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3)) + (255,)


def to_pil(a):
    return Image.fromarray(a, 'RGBA')


def rot90(a, k=1):
    return np.ascontiguousarray(np.rot90(a, k))


# ------------------------------------------------------------------ previews
def tile_preview(variants, cols=8, rows=6, seed=1, weights=None, frame=0, scale=4, grid=False):
    """Tile an area with random variants (like the renderer would) to judge seams/repetition."""
    rng = np.random.default_rng(seed)
    n = len(variants)
    p = None
    if weights is not None:
        p = np.array(weights, float); p /= p.sum()
    th, tw = variants[0].shape[:2]
    out = np.zeros((rows * th, cols * tw, 4), np.uint8)
    for j in range(rows):
        for i in range(cols):
            k = rng.choice(n, p=p)
            out[j * th:(j + 1) * th, i * tw:(i + 1) * tw] = variants[k]
    im = to_pil(out)
    if scale != 1: im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    return im


def save_png(a, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    (a if isinstance(a, Image.Image) else to_pil(a)).save(path, optimize=True)
    return path


def compose(ims, cols, pad=8, bg=(236, 230, 214)):
    cw = max(i.width for i in ims) + pad; ch = max(i.height for i in ims) + pad
    rows = (len(ims) + cols - 1) // cols
    out = Image.new('RGB', (cols * cw + pad, rows * ch + pad), bg)
    for k, i in enumerate(ims):
        out.paste(i, (pad + (k % cols) * cw, pad + (k // cols) * ch), i if i.mode == 'RGBA' else None)
    return out


def periodic_copies(pts, ext, w=T, h=T):
    """For painter's-order drawing: replace each base (wrapping) point by its copies at +-w/h offsets whose
    box (left, up, right, down) intersects the tile. Copies draw clipped, sorted by their own y, so a clump anchored
    in the next tile down is correctly drawn IN FRONT here. Variant points pass through."""
    l, u, r, d = ext
    out = []
    for p in pts:
        if not p[5]: out.append(p); continue
        for oy in (-h, 0, h):
            for ox in (-w, 0, w):
                x, y = p[0] + ox, p[1] + oy
                if x + r < 0 or x - l >= w or y + d < 0 or y - u >= h: continue
                out.append((x, y) + tuple(p[2:5]) + (False, True))   # index 6: came from the base stream
    return out


# ------------------------------------------------------------------ shared material helpers
def pebble(rng, rampn, rx, ry, tone=0.0, lo=0, hi=None, shadow_idx=None):
    """A little lit stone (ellipsoid, NW light) as an RGBA sprite, plus a 1 px contact shade bottom-right.
    tone shifts it lighter (+) or darker (-). Returns sprite (anchor = top-left)."""
    n = len(RAMPS[rampn]); hi = n - 1 if hi is None else hi
    w, h = int(math.ceil(rx * 2)) + 2, int(math.ceil(ry * 2)) + 2
    a = blank(w, h)
    cx, cy = rx + 0.5, ry + 0.5
    # slightly irregular outline
    wob = [1 + (rng.random() - 0.5) * 0.35 for _ in range(6)]
    for y in range(h):
        for x in range(w):
            dx, dy = (x + 0.5 - cx) / max(rx, 0.5), (y + 0.5 - cy) / max(ry, 0.5)
            ang = (math.atan2(dy, dx) / (2 * math.pi) * 6) % 6; k0 = int(ang); f = ang - k0
            r = wob[k0] * (1 - f) + wob[(k0 + 1) % 6] * f
            d = (dx * dx + dy * dy) / (r * r)
            if d <= 1:
                nz = math.sqrt(max(0.0, 1 - d)) + 0.35
                lum = float(lambert(np.array(dx), np.array(dy), np.array(nz))) + tone
                idx = int(round(lo + (1 - max(0, min(1, (lum - 0.25) / 0.75))) * (hi - lo)))
                put(a, x, y, rgb(rampn, idx), False)
    if shadow_idx is not None:
        src = a.copy()
        for y in range(h):
            for x in range(w):
                if src[y, x, 3] == 0 and ((x > 0 and y > 0 and src[y - 1, x - 1, 3]) or (y > 0 and src[y - 1, x, 3] and x >= w // 2)):
                    put(a, x, y, shadow_idx, False)
    return a


def scatter_sprites(img, L, spacing, make, ext, p=1.0, interior_only=False, sort=True):
    """Band-locked painter's-order scatter of sprites. make(point, rng) -> sprite or None; the sprite's anchor is
    its centre-bottom-ish: drawn with top-left at (x - w//2, y - h + 1)."""
    pts = periodic_copies(locked_pts(L, spacing, 0, ext=ext), (ext[0] + 2, ext[1] + 2, ext[2] + 2, ext[3] + 2))
    if sort: pts.sort(key=lambda q: (q[1], q[0]))
    for q in pts:
        x, y, r1, r2, r3, isb = q
        if r1 > p: continue
        if interior_only and not (1 + ext[0] <= x <= T - 2 - ext[2] and 1 + ext[1] <= y <= T - 2 - ext[3]): continue
        rr = np.random.default_rng(int(r2 * 1e7) + int(r3 * 1e4) + 17)
        s = make(q, rr)
        if s is None: continue
        sh, sw = s.shape[:2]
        stamp(img, s, int(math.floor(x)) - sw // 2, int(math.floor(y)) - sh + 1, False)


def noise_idx(L, n, mid, cells=(8, 4, 2), amp=1.0, speck=0.0):
    """Quantised fbm around ramp index `mid` (float); amp in index steps per std; speck = fraction of +-1 specks."""
    f = L.field(cells) * amp + mid
    if speck:
        w = L.white(); f = f + np.where(w < speck / 2, 1, 0) - np.where(w > 1 - speck / 2, 1, 0)
    return np.clip(np.round(f), 0, n - 1).astype(int)


def rgba_idx(img_idx, rampn):
    return from_idx(img_idx, rampn)


def line_walk(rng, x, y, steps, dirx, diry, wobble=0.5):
    """A crack / twig path: list of integer points."""
    pts = []; ang = math.atan2(diry, dirx)
    for _ in range(steps):
        pts.append((int(round(x)), int(round(y))))
        ang += (rng.random() - 0.5) * wobble
        x += math.cos(ang); y += math.sin(ang)
    return pts


def draw_crack(img, pts, dark, lit=None, clip=True):
    for (x, y) in pts:
        put(img, x, y, dark, not clip)
        if lit is not None: put(img, x, y + 1, lit, not clip)   # lit lower lip (the far wall catches the NW light)


def is_base(q):
    """True for a scatter point from the shared base stream (decisions for it must use base-only data)."""
    return bool(q[5]) or (len(q) > 6 and q[6])


def blend_thr(base_thr, var_thr):
    """A per-variant threshold that equals the shared one at the tile border."""
    t = np.clip((EDGE_D - LOCK_A) / (LOCK_B - LOCK_A), 0, 1)
    return base_thr + (var_thr - base_thr) * t
