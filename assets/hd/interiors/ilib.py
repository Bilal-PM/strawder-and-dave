"""Interiors helpers on top of pix.py (LINESIDE HD). Extends, never edits, the shared toolkit.

Conventions used by every interior generator:
  * room canvases are the full room at 32 art px per tile (res 2);
  * an object sprite is drawn in its own canvas; `Obj` maps footprint-local coordinates (0,0 = top-left of the
    object's floor footprint) into the canvas, which has `up` px of headroom above the footprint and `m` px margin
    for the outline. The anchor is the bottom-centre of the footprint.
"""
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
from pix import *          # noqa: F401,F403
import pix

OUT = os.path.join(HERE, '..', 'out', 'interiors')

# ------------------------------------------------------------------ extra ramps (light -> dark, hue-shifted)
EXTRA = {
    'brunswick':  ['#8fbf8a', '#62996a', '#437a54', '#2f5e42', '#20432f', '#142b1f'],
    'roof_grey':  ['#dcd8cf', '#b8b3ab', '#94908b', '#716e70', '#514f56', '#35343d'],
    'warn':       ['#fff4a8', '#f7d65c', '#e0ae38', '#b07f28', '#76521f'],
    'under':      ['#77757c', '#58565e', '#413f47', '#2e2c34', '#1f1d24', '#15131a'],
    'moquette_r': ['#d9876b', '#b35a4f', '#8a3d40', '#632a33', '#421d27'],
    'moquette_g': ['#b9b56d', '#8f8c4c', '#6a6a3a', '#4b4c2d', '#313322'],
    'carpet':     ['#b6b0c0', '#9a93aa', '#7d7690', '#635d77', '#4b465e', '#333046'],
    'laminate':   ['#fbf6ea', '#ece4d2', '#d5cbb6', '#b3a893', '#8c826f'],
    'vinyl':      ['#e8e0cc', '#d2c8b1', '#b6ab93', '#958a75', '#716857'],
    'parquet':    ['#f0c486', '#dca466', '#c0844b', '#9c6536', '#744829', '#4e2f1e'],
    'oak':        ['#c99a64', '#a67a4a', '#835b35', '#613f27', '#43291c', '#2b1a14'],
    'plaster':    ['#f7efd9', '#e8dcbf', '#cfc0a0', '#aa9c80', '#807561'],
    'sage':       ['#d8dfba', '#b9c498', '#98a57a', '#75825e', '#546045'],
    'velvet':     ['#d8747a', '#b24c5a', '#8a3346', '#632337', '#401828'],
    'cork':       ['#e6be86', '#cc9d63', '#aa7c48', '#855d35', '#5d4027'],
    'steel_blue': ['#c9d5de', '#a3b3c1', '#7f91a2', '#5f7083', '#435163', '#2e3847'],
    'plastic_or': ['#ffb77a', '#f28b4a', '#cf6632', '#a24a28', '#6f3220'],
    'plastic_bl': ['#8ec2e6', '#5f9ccc', '#437aa8', '#325b80', '#233f5a'],
    'oil':        ['#6c6a74', '#4d4b56', '#383641', '#28262f', '#1b1a21'],
    'plant':      ['#c3dd7c', '#95c05a', '#6d9c44', '#4e7a37', '#355a2d', '#223d24'],
    'terracotta': ['#f0a37a', '#d27d55', '#ad5c3e', '#823f2e', '#572920'],
    'paper':      ['#ffffff', '#f6f2e6', '#e2dbc8', '#c2b9a2', '#958c77'],
    'sticky_y':   ['#fff7b0', '#fbe777', '#e8c84c', '#bf9b34'],
    'sticky_p':   ['#ffd0dc', '#f7a8bf', '#dc7f9d', '#ae5a78'],
    'sticky_b':   ['#c9ecff', '#96d0f0', '#69aad2', '#4a82aa'],
    'sticky_g':   ['#d8f5b0', '#b1e184', '#87c060', '#5f9546'],
    'sticky_o':   ['#ffd9a8', '#ffb96e', '#ec9345', '#bb6c2f'],
    'enamel_g':   ['#9ad7a0', '#62b377', '#3c8f58', '#2b6b44', '#1d4a30'],
    'shed_conc':  ['#ece3d4', '#d3c8b8', '#b7ab9b', '#978c7f', '#746b63', '#524b48'],
    'daylight':   ['#fbfdf2', '#e3f1ee', '#c0dde2', '#97c2d0', '#739fb3'],
    'hills':      ['#c9dc9a', '#a6c47c', '#86a665', '#688851', '#4d6a40'],
}
RAMPS.update(EXTRA)
_CACHE = {}


def C(name, i):
    """Ramp colour, cached, clamped."""
    k = (name, i)
    if k not in _CACHE: _CACHE[k] = ramp(name, i)
    return _CACHE[k]


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


def hl(cv, x, y, w, c):
    for xx in range(int(x), int(x + w)): cv.put(xx, y, c)


def vl(cv, x, y, h, c):
    for yy in range(int(y), int(y + h)): cv.put(x, yy, c)


def P(cv, x, y, c): cv.put(x, y, c)


def frame(cv, x, y, w, h, c):
    hl(cv, x, y, w, c); hl(cv, x, y + h - 1, w, c); vl(cv, x, y, h, c); vl(cv, x + w - 1, y, h, c)


def rrect(cv, x, y, w, h, c, r=1):
    """Rect with the corner pixel(s) clipped."""
    for yy in range(h):
        for xx in range(w):
            cx = min(xx, w - 1 - xx); cy = min(yy, h - 1 - yy)
            if cx + cy < r: continue
            cv.put(x + xx, y + yy, c)


def shadow_rect(cv, x, y, w, h, a=70):
    for yy in range(int(y), int(y + h)):
        for xx in range(int(x), int(x + w)): cv.put(xx, yy, SHADOW[:3] + (a,))


def shadow_ellipse(cv, cx, cy, rx, ry, a=80):
    ground_shadow(cv, cx, cy, rx, ry, a)


def speck(cv, x, y, w, h, colours, density, seed, test=None):
    for yy in range(int(y), int(y + h)):
        for xx in range(int(x), int(x + w)):
            r = hash01(xx, yy, seed)
            if r < density and (test is None or test(xx, yy)):
                cv.put(xx, yy, colours[int(hash01(xx, yy, seed + 1) * len(colours)) % len(colours)])


def grain(cv, x, y, w, h, rampname, base, seed, horiz=True, knots=True):
    """Wood: base ramp step with long grain streaks one step either side, and the odd knot."""
    for yy in range(int(y), int(y + h)):
        for xx in range(int(x), int(x + w)):
            u, v = (xx, yy) if horiz else (yy, xx)
            n = vnoise(u * 0.08, v * 1.0, 1.0, seed) * 0.7 + vnoise(u * 0.3, v, 1.0, seed + 5) * 0.3
            i = base
            if n > 0.72: i = base - 1
            elif n < 0.24: i = base + 1
            cv.put(xx, yy, C(rampname, i))
    if knots and w * h > 300:
        for k in range(max(1, w * h // 900)):
            kx = x + 2 + int(hash01(k, 1, seed) * max(1, w - 4)); ky = y + 1 + int(hash01(k, 2, seed) * max(1, h - 2))
            cv.put(kx, ky, C(rampname, base + 2)); cv.put(kx + 1, ky, C(rampname, base + 1))


def cyl_h(cv, x, y, w, h, rampname, lo=0, hi=None, ends=True):
    """A horizontal cylinder (tank, pipe, drum lying down): shaded by row, lit on the upper side."""
    n = len(RAMPS[rampname]); hi = n - 1 if hi is None else hi
    for yy in range(h):
        ny = (yy + 0.5) / h * 2 - 1
        lum = light(0, ny, math.sqrt(max(0, 1 - ny * ny)))
        i = lo + int(round((1 - lum) * (hi - lo)))
        hl(cv, x, y + yy, w, C(rampname, i))
    if ends:
        vl(cv, x, y + 1, h - 2, C(rampname, min(hi, lo + 1))); vl(cv, x + w - 1, y + 1, h - 2, C(rampname, hi))


def cyl_v(cv, x, y, w, h, rampname, lo=0, hi=None):
    """An upright cylinder body (drum, urn, post): shaded by column, lit on the left."""
    n = len(RAMPS[rampname]); hi = n - 1 if hi is None else hi
    for xx in range(w):
        nx = (xx + 0.5) / w * 2 - 1
        lum = light(nx, 0.25, math.sqrt(max(0, 1 - nx * nx)))
        i = lo + int(round((1 - lum) * (hi - lo)))
        vl(cv, x + xx, y, h, C(rampname, i))


def disc(cv, cx, cy, rx, ry, c):
    cv.ellipse(cx, cy, rx, ry, c)


def box(cv, x, y, w, d, h, rampname, top=1, front=2, lip=True):
    """3/4 box: top face (w x d) at (x, y), front face (w x h) below it. Lit top, mid front, AO at the base."""
    cv.rect(x, y, w, d, C(rampname, top))
    hl(cv, x, y, w, C(rampname, max(0, top - 1)))
    cv.rect(x, y + d, w, h, C(rampname, front))
    if lip: hl(cv, x, y + d, w, C(rampname, front - 1 if front > 0 else 0))
    hl(cv, x, y + d + h - 1, w, C(rampname, front + 2))
    vl(cv, x + w - 1, y + d, h, C(rampname, front + 1))


class Obj:
    """An object sprite with a floor footprint. foot = (tx, ty, tw, th) in tiles; up = headroom in px above the
    footprint's top edge; m = outline margin. Use o.X(), o.Y() to map footprint-local px into the canvas."""

    def __init__(self, name, foot, up=32, m=2, tile=None, extra_w=0, extra_left=0, down=0):
        self.name = name; self.foot = foot; self.up = up; self.m = m
        tx, ty, tw, th = foot
        self.left = m + extra_left
        self.w = tw * TILE + self.left + m + extra_w; self.h = th * TILE + up + m + down
        self.cv = Canvas(self.w, self.h)
        self.tile = tile or [tx, ty]; self.fade = None; self.extra = {}

    def X(self, fx): return self.left + fx

    def Y(self, fy): return self.up + fy

    @property
    def anchor(self):
        return [self.left + self.foot[2] * TILE // 2, self.up + self.foot[3] * TILE]

    @property
    def at(self):
        tx, ty, tw, th = self.foot
        return [tx * TILE + tw * TILE // 2, (ty + th) * TILE]

    def finish(self, outline_=True):
        if outline_: outline(self.cv)
        return self

    def entry(self, rel):
        e = {'file': rel, 'w': self.w, 'h': self.h, 'anchor': self.anchor, 'at': self.at, 'tile': self.tile,
             'foot': list(self.foot)}
        if self.fade: e['fade'] = self.fade
        e.update(self.extra)
        return e


def save_png(cv_or_im, path):
    """Save, palettised when the image has <= 256 colours (lossless, smaller)."""
    im = cv_or_im.im if isinstance(cv_or_im, Canvas) else cv_or_im
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cols = im.getcolors(257)
    if cols is not None and len(cols) <= 256:
        from PIL import Image
        pal = [c for _, c in cols]
        idx = {c: i for i, c in enumerate(pal)}
        p = Image.new('P', im.size)
        flat = []
        for c in pal: flat += list(c[:3])
        p.putpalette(flat + [0] * (768 - len(flat)))
        p.putdata([idx[c] for c in im.getdata()])
        alpha = bytes(c[3] for c in pal)
        p.save(path, optimize=True, transparency=alpha)
    else:
        im.save(path, optimize=True)
    return path


def compose_preview(layers, path, scale=2, figs=()):
    """Compose a room (list of (PIL image, x, y)) and draw a Moira-sized 30x64 silhouette at each fig (x, y feet)."""
    from PIL import Image
    base = layers[0][0].copy()
    for im, x, y in layers[1:]:
        base.alpha_composite(im, (int(x), int(y)))
    fig = Canvas(30, 64)
    fig.sphere(15, 14, 11, 12, 'hair_grey'); fig.put(15, 1, OUTLINE)
    fig.rect(6, 24, 18, 32, C('olive', 2)); fig.rect(6, 24, 6, 32, C('olive', 1)); fig.rect(20, 24, 4, 32, C('olive', 3))
    fig.rect(8, 56, 5, 7, C('boot', 2)); fig.rect(17, 56, 5, 7, C('boot', 2))
    fig.sphere(15, 18, 7, 7, 'skin_light')
    outline(fig)
    for fx, fy in figs:
        ground_shadow(Canvas(1, 1), 0, 0, 1, 1)
        sh = Canvas(30, 10); ground_shadow(sh, 15, 5, 12, 4, 100)
        base.alpha_composite(sh.im, (int(fx - 15), int(fy - 5)))
        base.alpha_composite(fig.im, (int(fx - 15), int(fy - 63)))
    out = base.resize((base.width * scale, base.height * scale), Image.NEAREST).convert('RGB')
    os.makedirs(os.path.dirname(path), exist_ok=True); out.save(path); return path
