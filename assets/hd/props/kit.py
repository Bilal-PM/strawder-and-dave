"""Props-area extension of the LINESIDE HD toolkit (assets/hd/lib/pix.py is never edited).

Adds:
  * extra hue-shifted ramps for nature and street furniture (registered into pix.RAMPS, prefixed p_)
  * Vol: a tiny z-buffered volume renderer (spheres, leaf clumps, tubes) used for tree crowns, trunks, shrubs
  * periodic noise helpers (so autotiles and forest canopy tile seamlessly)
  * extrude(): 3/4-view extrusion of a footprint (hedges, walls) with separate top / face shaders
  * small drawing helpers for hard-surface props (cylinders, boxes, lines)
"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import numpy as np
from pix import *  # noqa
import pix

EXTRA = {
    # foliage (7-step canopy ramps: warm sunlit yellow-green -> cool blue-violet shade)
    'p_oak':      ['#f0ee94', '#bfdc68', '#8cbd4c', '#5f9a45', '#3f7a44', '#2a5a45', '#1e3e3a'],
    'p_ash':      ['#e8efa4', '#c2dc7c', '#98c05f', '#73a04d', '#557f43', '#3d5f39', '#2a432f'],
    'p_birch':    ['#f4f4a6', '#d4e67a', '#abcc5c', '#83ab4a', '#608940', '#446636', '#2f482d'],
    'p_syc':      ['#d4e67c', '#a5ca5e', '#79ac4b', '#558c43', '#3c6c3c', '#2b4f34', '#1d372b'],
    'p_thorn':    ['#cfe07a', '#a3c45c', '#7aa44a', '#588440', '#3f6538', '#2c4830', '#1e3328'],
    'p_rowan':    ['#dce67e', '#b1cf5f', '#88b04b', '#649040', '#487039', '#325232', '#23392a'],
    'p_pine':     ['#b8cf86', '#8fb26c', '#6a935a', '#4d764d', '#375b42', '#264236', '#1a2e2b'],
    'p_spruce':   ['#a6c486', '#7ea56c', '#5b8659', '#41694b', '#2e4e3f', '#203933', '#162828'],
    'p_hedge':    ['#d0e27c', '#a6c95d', '#7eaa4a', '#5c8b41', '#426c3a', '#2f5032', '#20382a'],
    'p_forest':   ['#c8dc76', '#9dc25a', '#74a348', '#548440', '#3c6639', '#2a4a31', '#1c3329', '#142522'],
    'p_bracken':  ['#dfe685', '#b6cc5e', '#8eae47', '#6b8e3b', '#4d6c32', '#35502a'],
    'p_bracken_o': ['#f1d492', '#d9ab5e', '#b5823e', '#8a5e2f', '#5e3f24'],
    'p_nettle':   ['#a9c878', '#80a85a', '#5e8a47', '#446c3b', '#304f31', '#213828'],
    'p_weed':     ['#d8e68a', '#aecb62', '#86ab4b', '#62893e', '#456835'],
    'p_reed':     ['#eae6a4', '#c7c97a', '#9da85a', '#768746', '#556536', '#3b472b'],
    'p_seedhead': ['#c9a07a', '#9e7456', '#74503c', '#4e3429'],
    # flowers
    'p_blossom':  ['#ffffff', '#fdf1f2', '#f4d6dd', '#dfb0c0', '#b98a9f'],
    'p_berry':    ['#ffc08a', '#f37b45', '#cf4a31', '#973027', '#62201f'],
    'p_budd':     ['#f0d0f6', '#cc9ee6', '#a275cc', '#7a53a8', '#553a7e'],
    'p_fox':      ['#ffe0ef', '#f6a6cf', '#dc72ae', '#b14e8c', '#7c3566'],
    'p_daisy':    ['#ffffff', '#f3f1ea', '#d6d2cc'],
    'p_gerani':   ['#ffb4a0', '#f46a5a', '#d2403f', '#9b2c33'],
    'p_lav':      ['#dcd0ff', '#ae9ce8', '#8570c4', '#5f4f98'],
    'p_marigold': ['#ffe28a', '#ffb43e', '#e6862a', '#b0601f'],
    # bark / wood
    'p_bark':     ['#b8a48a', '#937f68', '#705f4f', '#524438', '#392f29', '#261f1e'],
    'p_birchbark': ['#ffffff', '#efebe3', '#d2cac0', '#a69c93', '#6f6666', '#3b3339'],
    'p_pinebark': ['#f0ac78', '#cd8352', '#a4623c', '#77452f', '#4c2d23'],
    'p_thornbark': ['#a08a78', '#7c675a', '#5c4b43', '#40342f', '#2a2222'],
    'p_timber':   ['#d9b88e', '#b8936a', '#937150', '#6d523c', '#4a372b'],   # weathered fence timber
    'p_oakwood':  ['#e8c08a', '#c89a63', '#a37649', '#7b5536', '#533826'],   # bench slats, varnished
    'p_greyoak':  ['#d8d0c2', '#b4ab9c', '#8f877b', '#6b645c', '#4a4541'],   # silvered old gate / stile
    # stone
    'p_grit':     ['#ece2c8', '#cfc2a4', '#aca085', '#887d69', '#655c50', '#443e39'],
    'p_gritdk':   ['#c9c0ae', '#a69d8c', '#847b6d', '#645c53', '#46403c', '#2e2a29'],
    'p_moss':     ['#d3d98a', '#aab861', '#7f9447', '#5d733a', '#43552f'],
    'p_lichen':   ['#f6f0c6', '#dcd7a2', '#bcb782'],
    'p_marble':   ['#ffffff', '#eeeef0', '#d5d6dc', '#b0b2bc', '#858895', '#5c5e6c'],
    # paint / metal
    'p_iron':     ['#7c7f8e', '#575a68', '#3e404c', '#2b2c36', '#1c1c24'],
    'p_bingreen': ['#6ea27e', '#4b8061', '#35634b', '#244737', '#173026'],
    'p_bluepaint': ['#9cc6e6', '#6fa0cc', '#4d7cab', '#375b85', '#253d5c'],
    'p_terracotta': ['#f0a57a', '#d47d55', '#ae5d3e', '#83432f', '#592c22'],
    'p_galv':     ['#e4e8ea', '#bec5ca', '#98a1a8', '#737c85', '#525961'],
    'p_hessian':  ['#eadbb0', '#cfbb88', '#ad9766', '#86724b', '#5c4d34'],
    'p_canvas':   ['#f2eedf', '#dcd5c0', '#bdb49c', '#958c78'],
    'p_bunt_r':   ['#ff9d8c', '#e8534b', '#b93a3c'],
    'p_bunt_b':   ['#9ec9ff', '#5b8fe0', '#3e66b0'],
    'p_bunt_y':   ['#fff1a0', '#f5cc4a', '#cf9d2e'],
    'p_bunt_w':   ['#ffffff', '#e6e8ee', '#bfc4cf'],
    'p_bunt_g':   ['#b4e39a', '#6fb85e', '#468a45'],
}
RAMPS.update(EXTRA)

OUT = os.path.normpath(os.path.join(HERE, '..', 'out', 'props'))


def C(name, i):
    return ramp(name, i)


def nrm(v):
    l = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / l for c in v)


def smooth(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ periodic noise (for seamless tiles)
def pnoise(x, y, cell, px, py, s=0):
    """Value noise that repeats every px (x) and py (y) pixels. cell must divide px/py for exact wrap."""
    nx, ny = max(1, round(px / cell)), max(1, round(py / cell))
    gx, gy = (x % px) / px * nx, (y % py) / py * ny
    x0, y0 = int(math.floor(gx)), int(math.floor(gy)); fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    h = lambda a, b: hash01(a % nx, b % ny, s)
    a, b, c, d = h(x0, y0), h(x0 + 1, y0), h(x0, y0 + 1), h(x0 + 1, y0 + 1)
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def pfbm(x, y, cell, px, py, s=0, oct=3):
    v, a, t = 0.0, 1.0, 0.0
    for o in range(oct):
        v += pnoise(x, y, cell / (2 ** o), px, py, s + o * 31) * a; t += a; a *= 0.5
    return v / t


class Rng:
    """Tiny deterministic RNG (independent of Python's random module state)."""

    def __init__(self, seed): self.s = (seed * 2654435761 + 12345) & 0xFFFFFFFF

    def r(self):
        self.s = (self.s * 1664525 + 1013904223) & 0xFFFFFFFF; return ((self.s >> 8) & 0xFFFFFF) / 0xFFFFFF

    def u(self, a, b): return a + (b - a) * self.r()

    def i(self, a, b): return int(a + (b - a + 1) * self.r()) if b >= a else a

    def pick(self, seq): return seq[min(len(seq) - 1, int(self.r() * len(seq)))]


# ------------------------------------------------------------------ Vol: z-buffered volume renderer
class Vol:
    """Accumulates shaded volumes in a z-buffer, then quantises to ramps. Tags: 1 = leaf/crown, 2 = wood/trunk,
    3 = other. Each primitive gets an id so clumps can cast small contact shadows on the ones behind them."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.z = np.full((h, w), -1e9); self.lum = np.zeros((h, w)); self.rid = np.full((h, w), -1, np.int32)
        self.cid = np.full((h, w), -1, np.int32); self.tag = np.zeros((h, w), np.int8)
        self.ramps = []; self.n = 0; self.noshadow = set(); self.grp = {}; self.amb = {1: 0.16}

    def _ri(self, name):
        if name not in self.ramps: self.ramps.append(name)
        return self.ramps.index(name)

    def clump(self, cx, cy, cz, r, rampname, tag=1, g=None, gw=1.0, lw=0.6, bias=0.0, jit=0.06, lobes=0, lamp=0.0,
              seed=0, flat=1.0, ao=None, sq=1.0, shadow=True, gs=None, grp=None, gn=None, dz=None):
        """A shaded blob. g = (gx, gy, gz, R) crown centre: the normal is blended between the blob's own sphere
        (weight lw) and the whole crown (weight gw) so big forms read first. lobes/lamp scallop the rim (leafy).
        ao = (y_top, y_bottom, amount): darken towards the underside. sq squashes vertically."""
        cid = self.n; self.n += 1; ri = self._ri(rampname)
        self.grp[cid] = cid if grp is None else grp
        if not shadow: self.noshadow.add(cid)
        ph = hash01(cid, 7, seed) * 6.283
        ry = r * sq
        y0, y1 = int(cy - ry * (1 + lamp)) - 1, int(cy + ry * (1 + lamp)) + 2
        x0, x1 = int(cx - r * (1 + lamp)) - 1, int(cx + r * (1 + lamp)) + 2
        for y in range(max(0, y0), min(self.h, y1)):
            for x in range(max(0, x0), min(self.w, x1)):
                dx, dy = x + 0.5 - cx, (y + 0.5 - cy) / sq
                d = math.hypot(dx, dy)
                rr = r
                if lobes:
                    a = math.atan2(dy, dx)
                    rr = r * (1 + lamp * math.sin(lobes * a + ph) + lamp * 0.6 * math.sin((lobes + 3) * a - ph * 1.7))
                if d > rr: continue
                u, v = dx / rr, dy / rr; w = math.sqrt(max(0.0, 1 - u * u - v * v))
                zz = cz + w * rr * flat
                zb = zz if dz is None else dz + w * rr * flat * 0.3
                if zb <= self.z[y, x]: continue
                n = (u * lw, v * lw, w * lw)
                if g:
                    gq = ((x + 0.5 - g[0]) / g[3], (y + 0.5 - g[1]) / g[3], (zz - g[2]) / g[3])
                    n = (n[0] + gq[0] * gw, n[1] + gq[1] * gw, n[2] + gq[2] * gw)
                if gs:
                    for (hx, hy, hz, hr, hw) in gs:
                        n = (n[0] + (x + 0.5 - hx) / hr * hw, n[1] + (y + 0.5 - hy) / hr * hw, n[2] + (zz - hz) / hr * hw)
                L = light(*n) + bias + (hash01(x, y, seed * 7 + 3) - 0.5) * 2 * jit
                if gn: n = (n[0] + gn[0] * gn[3], n[1] + gn[1] * gn[3], n[2] + gn[2] * gn[3])
                L = light(*n) + bias + (hash01(x, y, seed * 7 + 3) - 0.5) * 2 * jit if gn else L
                if ao: L -= ao[2] * smooth((y - ao[0]) / max(1, ao[1] - ao[0]))
                self.z[y, x] = zb; self.lum[y, x] = L; self.rid[y, x] = ri; self.cid[y, x] = cid; self.tag[y, x] = tag
        return cid

    def tube(self, pts, r0, r1, rampname, tag=2, bias=0.0, tex=None, seed=0, zoff=0.0):
        """Sweep a tapering cylinder along a polyline [(x, y, z), ...]; shaded as a cylinder across its width.
        tex(x, y, u) -> lum offset gives bark texture (u = -1..1 across the tube)."""
        ri = self._ri(rampname); cid = self.n; self.n += 1; self.grp[cid] = cid
        segs = []; total = 0.0
        for a, b in zip(pts, pts[1:]):
            l = math.dist(a[:2], b[:2]) or 0.01; segs.append((a, b, l)); total += l
        acc = 0.0
        for a, b, l in segs:
            steps = max(2, int(l * 2))
            for k in range(steps + 1):
                t = k / steps; f = (acc + l * t) / total
                x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t; zc = a[2] + (b[2] - a[2]) * t + zoff
                r = r0 + (r1 - r0) * f
                # direction for the across-tube axis
                ddx, ddy = b[0] - a[0], b[1] - a[1]; dl = math.hypot(ddx, ddy) or 1; px_, py_ = -ddy / dl, ddx / dl
                for yy in range(int(y - r) - 1, int(y + r) + 2):
                    for xx in range(int(x - r) - 1, int(x + r) + 2):
                        if not (0 <= xx < self.w and 0 <= yy < self.h): continue
                        ox, oy = xx + 0.5 - x, yy + 0.5 - y
                        if ox * ox + oy * oy > r * r: continue
                        u = (ox * px_ + oy * py_) / max(r, 0.5)
                        u = max(-1, min(1, u)); w = math.sqrt(max(0, 1 - u * u))
                        zz = zc + w * r
                        if zz <= self.z[yy, xx]: continue
                        n = (u * px_, u * py_, w)
                        L = light(*n) + bias
                        if tex: L += tex(xx, yy, u)
                        self.z[yy, xx] = zz; self.lum[yy, xx] = L; self.rid[yy, xx] = ri; self.cid[yy, xx] = cid; self.tag[yy, xx] = tag
            acc += l
        return cid

    def contact_shadows(self, amt=0.22, reach=2, inner=0.12, rim=0.1):
        """Whatever is in front casts a thin shadow just below-right of its lower rim: `amt` (reaching `reach` px)
        across different groups (lobes, crowns), `inner` (1 px) between clumps of the same group."""
        cid, z = self.cid, self.z; out = self.lum.copy(); G = self.grp
        for y in range(self.h):
            for x in range(self.w):
                c = cid[y, x]
                if c < 0: continue
                g0 = G.get(c, c); done = False
                if rim and x > 0 and y > 0:   # upper-left rim of a tuft standing in front of what is behind it
                    c3 = cid[y - 1, x - 1]
                    if c3 != c and (c3 < 0 or z[y - 1, x - 1] < z[y, x] - 0.5) and self.tag[y, x] == 1:
                        out[y, x] += rim
                for k in range(1, reach + 1):
                    for ax, ay in ((0, -k), (-k, -k), (-k, 0)):
                        yy, xx = y + ay, x + ax
                        if yy < 0 or xx < 0: continue
                        c2 = cid[yy, xx]
                        if c2 < 0 or c2 == c or c2 in self.noshadow or z[yy, xx] <= z[y, x] + 0.5: continue
                        if G.get(c2, c2) != g0: out[y, x] -= amt * (1.0 if k == 1 else 0.6); done = True; break
                        elif k == 1: out[y, x] -= inner; done = True; break
                    if done: break
        self.lum = out

    def canvas(self, tags=None, amb=None):
        """Quantise to ramps. amb = {tag: a}: bounce light lifts that tag's lum to a + (1 - a) * lum."""
        amb = amb if amb is not None else getattr(self, 'amb', {})
        cv = Canvas(self.w, self.h)
        for y in range(self.h):
            for x in range(self.w):
                ri = self.rid[y, x]
                if ri < 0: continue
                if tags is not None and self.tag[y, x] not in tags: continue
                L = float(self.lum[y, x]); a = amb.get(int(self.tag[y, x]), 0.0)
                cv.px[x, y] = shade(self.ramps[ri], a + (1 - a) * L if L > 0 else L)
        return cv


# ------------------------------------------------------------------ canvas helpers
def blank(w, h): return Canvas(w, h)


def opaque(cv, x, y): return 0 <= x < cv.w and 0 <= y < cv.h and cv.px[x, y][3] == 255


def line(cv, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / max(1, n); cv.put(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), col)


def vcyl(cv, x, y, w, h, rampname, bias=0.0, lo=0, hi=None, tex=None):
    """Vertical cylinder (post, shaft) shaded across its width; lit from the left."""
    for xx in range(w):
        u = (xx + 0.5) / w * 2 - 1; L = light(u, -0.15, math.sqrt(max(0, 1 - u * u))) + bias
        for yy in range(h):
            l2 = L + (tex(x + xx, y + yy, u) if tex else 0)
            cv.put(x + xx, y + yy, shade(rampname, l2))


def hcyl(cv, x, y, w, h, rampname, bias=0.0, tex=None):
    """Horizontal cylinder (rail, log, pipe) shaded top->bottom."""
    for yy in range(h):
        v = (yy + 0.5) / h * 2 - 1; L = light(-0.1, v, math.sqrt(max(0, 1 - v * v))) + bias
        for xx in range(w):
            cv.put(x + xx, y + yy, shade(rampname, L + (tex(x + xx, y + yy, v) if tex else 0)))


def box(cv, x, y, w, h, top, rampname, side=0, bias=0.0, tex=None):
    """3/4-view box: a lit top band (top px deep), a mid front face and an optional dark right side (side px)."""
    for yy in range(h):
        for xx in range(w):
            if yy < top: i = 0.92
            elif xx >= w - side: i = 0.38
            else: i = 0.62
            cv.put(x + xx, y + yy, shade(rampname, i + bias + (tex(x + xx, y + yy, 0 if yy < top else 1) if tex else 0)))


def fin(cv, col=OUTLINE, diagonal=False):
    """Final outline pass for free-standing props."""
    return outline(cv, col, diagonal=diagonal)


def paste(dst, src, ox, oy):
    dst.blit(src, ox, oy); return dst


def shadow_ellipse(cv, cx, cy, rx, ry, alpha=84):
    """Crisp two-level violet cast shadow (no gradient ramps): a core and a lighter rim."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d <= 1: cv.put(x, y, SHADOW[:3] + ((alpha if d < 0.62 else int(alpha * 0.62)),))


def shadow_under(cv, alpha=84):
    """Put already-drawn shadow canvas beneath: returns a helper that composites sprite over shadow."""
    return cv


def over(base, top):
    """Composite canvas `top` over `base` (same size) honouring alpha. Returns base."""
    base.im.alpha_composite(top.im); base.px = base.im.load(); return base


def crop_bbox(cv, pad=0):
    bb = cv.im.getbbox()
    return bb


def moira_silhouette():
    """44x94 scale figure (grey-violet silhouette with the reference's proportions, 48x96 frame, feet at y=93)."""
    c = Canvas(48, 96); col = (120, 110, 132, 255)
    c.ellipse(24, 22, 17, 18, col); c.ellipse(24, 6, 8, 6, col)          # head (~40% of height) + bun
    for y in range(38, 82):
        hw = 13 + (y - 38) * 0.2
        for x in range(int(24 - hw), int(24 + hw) + 1): c.put(x, y, col)
    c.rect(13, 82, 9, 12, col); c.rect(26, 82, 9, 12, col)
    return outline(c)
