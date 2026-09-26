"""Railway-structures drawing kit on top of pix.py (materials, windows, roofs, finishing).

Everything here is deterministic: randomness comes from pix.hash01 / pix.fbm with explicit seeds.
"""
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'assets', 'hd', 'lib'))
from pix import *  # noqa
import pix

# Extra ramps for this area (light -> dark, hue-shifted like pix.RAMPS). Registered into pix.RAMPS so shade()/ramp()
# work with them too.
EXTRA = {
    # Pennine gritstone: warm buff when clean, sooty grey-brown in the shadows
    'grit':      ['#efe3c6', '#d6c7a4', '#b8a886', '#94866d', '#6d6354', '#4a433d'],
    'grit_soot': ['#b9ae98', '#9a8f7c', '#7c7264', '#5f574f', '#443e3b', '#2e2a2c'],
    # cast iron / steel painted black (a touch of green-blue so it never goes dead grey)
    'iron':      ['#7c8488', '#586167', '#3f474f', '#2c323a', '#1d2128'],
    'lead':      ['#b6bcc6', '#9097a4', '#6d7382', '#505563', '#383b47'],
    'moss':      ['#c9d57a', '#a2b95a', '#7c9a42', '#5b7a34', '#3f5a2a'],
    'ivy':       ['#9cc466', '#74a24c', '#52803c', '#3a5f31', '#264226'],
    'plywood':   ['#ecc995', '#d6ac74', '#b98d59', '#936d44', '#6a4d33'],
    'galv':      ['#eef2f2', '#cdd4d6', '#a8b1b6', '#838d95', '#5f6873', '#434a55'],
    'cabin':     ['#f3f4ee', '#dadcd4', '#b9bcb6', '#949896', '#6f7376', '#4c5059'],
    'cabin_grn': ['#a9c79a', '#83a777', '#62865b', '#476644', '#314832'],
    'container': ['#7ea7cf', '#5a86b3', '#416994', '#304f73', '#223752'],
    'terracotta':['#f0a47a', '#d47e57', '#b05f40', '#86452f', '#5c2e22'],
    'glass_dk':  ['#b9d5de', '#7fa3b4', '#557a8f', '#3b566c', '#27394c'],
    'interior':  ['#6b5a55', '#4d403f', '#3a3033', '#2a2328', '#1c181d'],
    'warm_in':   ['#fff1c4', '#ffd98a', '#f2b05c', '#c47e44', '#8a5236'],
    'yellow':    ['#fff39a', '#ffd94a', '#e8b52c', '#b98620', '#7d5818'],
    'bluesign':  ['#8ec0f0', '#4f8fd6', '#2f6cb4', '#224f88', '#17365e'],
}
pix.RAMPS.update(EXTRA)

O = hexrgb(OUTLINE)
TRANSP = (0, 0, 0, 0)


def C(name, i):
    return ramp(name, i)


def new(w, h):
    return Canvas(w, h)


def P(cv, x, y, c):
    """Opaque pixel (fast path)."""
    x, y = int(x), int(y)
    if 0 <= x < cv.w and 0 <= y < cv.h and c is not None:
        if isinstance(c, str): c = hexrgb(c)
        if len(c) == 4 and c[3] < 255: cv.put(x, y, c)
        else: cv.px[x, y] = (c[0], c[1], c[2], 255)


def R(cv, x, y, w, h, c):
    for yy in range(int(y), int(y + h)):
        for xx in range(int(x), int(x + w)): P(cv, xx, yy, c)


def HL(cv, x0, x1, y, c):
    for x in range(int(x0), int(x1)): P(cv, x, y, c)


def VL(cv, x, y0, y1, c):
    for y in range(int(y0), int(y1)): P(cv, x, y, c)


def line(cv, x0, y0, x1, y1, c):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n):
        t = i / max(1, n - 1); P(cv, round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)


def get(cv, x, y):
    return cv.get(int(x), int(y))


def opaque(cv, x, y):
    return get(cv, x, y)[3] > 0


VIOLET = (46, 30, 58)


def dark(cv, x, y, a):
    """Darken an existing opaque pixel towards the violet shadow colour (alpha a in 0..1). Keeps it opaque."""
    x, y = int(x), int(y)
    if not (0 <= x < cv.w and 0 <= y < cv.h): return
    p = cv.px[x, y]
    if p[3] == 0: return
    cv.px[x, y] = (int(p[0] * (1 - a) + VIOLET[0] * a), int(p[1] * (1 - a) + VIOLET[1] * a),
                   int(p[2] * (1 - a) + VIOLET[2] * a), p[3])


def warm(cv, x, y, a, col=(255, 214, 140)):
    x, y = int(x), int(y)
    if not (0 <= x < cv.w and 0 <= y < cv.h): return
    p = cv.px[x, y]
    if p[3] == 0: return
    cv.px[x, y] = (int(p[0] * (1 - a) + col[0] * a), int(p[1] * (1 - a) + col[1] * a), int(p[2] * (1 - a) + col[2] * a), p[3])


def dark_rect(cv, x, y, w, h, a):
    for yy in range(int(y), int(y + h)):
        for xx in range(int(x), int(x + w)): dark(cv, xx, yy, a)


def ao_band(cv, x, y, w, steps=(0.42, 0.28, 0.16, 0.08), down=True, mask=None):
    """Banded (not smooth) ambient occlusion under an eave/sill: each step is one pixel row."""
    for i, a in enumerate(steps):
        yy = y + i if down else y - i
        for xx in range(int(x), int(x + w)):
            if mask is None or mask(xx, yy): dark(cv, xx, yy, a)


def shadow_px(cv, x, y, alpha=None):
    """Translucent violet cast shadow onto whatever is there (or onto transparency)."""
    c = SHADOW if alpha is None else SHADOW[:3] + (alpha,)
    p = get(cv, x, y)
    if p[3] == 255: dark(cv, x, y, (c[3] / 255) * 0.9)
    else: cv.put(x, y, c)


# ------------------------------------------------------------------ materials

def ashlar(cv, x0, y0, w, h, rp='grit', seed=1, ch=8, bmin=11, bmax=21, soot=0.0, base=(1, 2), mask=None,
           clean=False, joint=3):
    """Coursed gritstone blocks, painted like hand-placed pixel art: each block is a flat tone with a lit top-left
    rim and a shaded bottom-right rim; joints one step darker; soot as soft vertical rain streaks (banded)."""
    x1, y1 = x0 + w, y0 + h
    y = y0; r = 0
    while y < y1:
        x = x0 - int(hash01(r, 3, seed) * bmax); k = 0
        while x < x1:
            bw = bmin + int(hash01(r, k, seed + 5) * (bmax - bmin))
            hv = hash01(r * 31 + k, 7, seed)
            bi = base[0] if hv < 0.5 else base[1]
            if hv > 0.965: bi = max(0, base[0] - 1)
            elif hv < 0.12: bi = base[1] + 1
            rn = rp
            if soot and hash01(k, r, seed + 11) < soot * 0.45: rn = 'grit_soot' if rp == 'grit' else rp
            for yy in range(y, min(y + ch, y1)):
                for xx in range(max(x, x0), min(x + bw, x1)):
                    if mask and not mask(xx, yy): continue
                    lx, ly = xx - x, yy - y
                    if ly == ch - 1 or lx == bw - 1:
                        P(cv, xx, yy, C(rp, joint + (1 if (ly == ch - 1 and lx == bw - 1) else 0))); continue
                    i = bi
                    if ly == 0 and lx < bw - 2: i -= 1
                    elif lx == 0 and ly < ch - 3: i -= 1
                    elif (ly == ch - 2 and lx > 1) or (lx == bw - 2 and ly > 0): i += 1
                    elif not clean and hash01(xx, yy, seed + 2) < 0.025: i += 1
                    P(cv, xx, yy, C(rn, max(0, i)))
            x += bw; k += 1
        y += ch; r += 1
    if soot:  # rain/soot streaks: vertical, banded
        for sx in range(x0, x1):
            if hash01(sx, 0, seed + 30) < 0.10 * soot:
                L = int(6 + hash01(sx, 1, seed + 30) * h * 0.6)
                for yy in range(y0, min(y1, y0 + L)):
                    if mask and not mask(sx, yy): continue
                    dark(cv, sx, yy, 0.16 if yy - y0 < L * 0.6 else 0.08)


def K(v):
    """Layout scale: design values were first set on a 32px tile; everything is laid out natively at pix.TILE."""
    return int(round(v * TILE / 32))


def bricks(cv, x0, y0, w, h, rp='brick', seed=1, mask=None, mortar=None, burnt=0.07, soot=0.0, bond='english_garden',
           course=4, L=12):
    """Brickwork: courses of (course-1)px brick + 1px mortar; stretchers L px incl. 1px perp joint, headers L/2.
    english_garden: 3 stretcher courses then a header course (common in northern engine sheds).
    Each brick: flat tone, lit top-left pixel row, darker bottom row, occasional chip or burnt face."""
    mcol = mortar or C('concrete', 3)
    mdark = C('concrete', 4)
    for y in range(y0, y0 + h):
        ly = y - y0; crs = ly // course; v = ly % course
        header = bond == 'english_garden' and crs % 4 == 3
        LL = L // 2 if header else L
        off = (crs * (L // 2) + (L // 4 if header else 0)) % LL
        for x in range(x0, x0 + w):
            if mask and not mask(x, y): continue
            u = (x - x0 + off) % LL; bid = (x - x0 + off) // LL
            hv = hash01(bid, crs, seed + 3)
            if v == course - 1:
                P(cv, x, y, mdark if (u == LL - 1 or hash01(x, y, seed) < 0.1) else mcol); continue
            if u == LL - 1: P(cv, x, y, mdark if v == 0 else mcol); continue
            i = 2 if hv < 0.5 else 1
            rname = rp
            if hv > 1 - burnt: rname = 'brick_dark'; i = 1 if hv > 1 - burnt / 2 else 2
            elif hv < 0.07: i = 3
            if v == 0 and u < LL - 2: i -= 1 if (u + bid) % 3 else 0
            if v == course - 2: i += 1 if hash01(x, y, seed + 4) < 0.5 else 0
            if u == LL - 2 and v > 0: i += 1
            if hash01(x, y, seed + 5) < 0.012: i += 1
            # chipped corner
            if u == 0 and v == 0 and hash01(bid, crs, seed + 6) < 0.15: P(cv, x, y, mcol); continue
            if soot and fbm(x, y, 16, seed + 9) < soot: i += 1
            P(cv, x, y, C(rname, max(0, min(4, i))))


def slates(cv, mask, x0, y0, x1, y1, y_eave, ch=4, sw=9, base=2, rp='slate', seed=1, moss=0.0, lichen=0.0,
           missing=(), fresh=False):
    """Welsh slate courses seen from above. Courses counted up from the eave line y_eave.
    Each course: top row in the shadow of the course above, bottom row = the slate's lit lower edge."""
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not mask(x, y): continue
            d = y_eave - 1 - y; course = d // ch; v = d % ch  # v=0 bottom row of a course
            off = (course % 2) * (sw // 2)
            u = (x + off) % sw; sid = (x + off) // sw
            hv = hash01(sid, course, seed)
            i = base + (1 if hv < 0.2 else 0) - (1 if hv > 0.88 else 0)
            if fresh: i = base + (1 if hv < 0.1 else 0)
            if v == ch - 1: i += 2
            elif v == 0: i -= 1
            if u == 0 and v != ch - 1: i += 1
            if v == 0 and hash01(sid, course, seed + 12) < 0.18 and u in (sw - 2, sw - 3): i += 2   # chipped edge
            n = hash01(x, y, seed + 1)
            if n < 0.015: i += 1
            if not fresh and fbm(sid * 3, course * 5, 14, seed + 4) < 0.3 and v != ch - 1: i += 1
            col = C(rp, max(0, min(len(RAMPS[rp]) - 1, i)))
            if (sid, course) in missing:
                col = C('wood_dark', 3 if v != ch - 1 else 4)  # a slipped slate shows the batten/felt
            if moss and v < ch - 1:
                m = fbm(x, y, 10, seed + 7)
                if m > 1 - moss * 0.5 and hash01(x, y, seed + 8) < 0.85:
                    col = C('moss', 1 + int((1 - m) * 6) % 3 + (1 if v == 0 else 0))
            if lichen and hash01(x, y, seed + 9) < lichen * 0.004:
                col = hexrgb('#d9c77a') if hash01(x, y, seed + 10) < 0.6 else hexrgb('#e6b56a')
            P(cv, x, y, col)


def boards(cv, x0, y0, w, h, rp='wood', seed=1, vertical=True, bw=4, base=1, mask=None, weather=0.0):
    """Timber boarding (tongue & groove) with grain."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if mask and not mask(x, y): continue
            a, b = (x - x0, y - y0) if vertical else (y - y0, x - x0)
            k = a // bw; u = a % bw
            i = base
            if u == bw - 1: i += 2
            elif u == 0: i -= 1
            g = hash01(k, b // 3, seed)
            if g < 0.15 and u not in (0, bw - 1): i += 1
            if weather and fbm(x, y, 6, seed + 3) < weather: i += 1
            P(cv, x, y, C(rp, max(0, min(len(RAMPS[rp]) - 1, i))))


def speck(cv, x0, y0, w, h, cols, density, seed, mask=None):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if (mask is None or mask(x, y)) and hash01(x, y, seed) < density:
                P(cv, x, y, cols[int(hash01(x, y, seed + 1) * len(cols)) % len(cols)])


# ------------------------------------------------------------------ small structures

def leaf_cluster(cv, cx, cy, r, rp='ivy', seed=1, density=0.8):
    """A clump of leaves: small 2-3px leaves shaded as a sphere."""
    for y in range(int(cy - r), int(cy + r + 1)):
        for x in range(int(cx - r), int(cx + r + 1)):
            dx, dy = (x - cx) / max(r, 1), (y - cy) / max(r, 1); d = dx * dx + dy * dy
            if d > 1: continue
            if hash01(x, y, seed) > density * (1.15 - d * 0.5): continue
            nz = math.sqrt(max(0, 1 - d)); lum = light(dx, dy, nz)
            lum += (hash01(x // 3, y // 3, seed + 1) - 0.5) * 0.4
            if (x % 3 == 2 and y % 3 == 2) and hash01(x, y, seed + 2) < 0.5: lum -= 0.25
            P(cv, x, y, shade(rp, lum))


def ivy_patch(cv, x0, y0, w, h, seed=1, live=False):
    """Ivy climbing a wall: a ragged patch, dense at the foot and thinning upward, with stems showing through.
    Leaves are 3x3 clusters shaded by a lumpy volume (noise-based normal), lit from the upper left."""
    for k in range(4):   # stems
        sx = x0 + 4 + k * (w // 5)
        for y in range(y0 + h - 1, y0 + int(h * 0.3), -1):
            sx += (1 if hash01(k, y // 5, seed) > 0.6 else (-1 if hash01(k, y // 5, seed) < 0.3 else 0)) if y % 5 == 0 else 0
            P(cv, sx, y, C('bark', 3)); P(cv, sx + 1, y, C('bark', 4))
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            t = (y - y0) / max(1, h)                     # 0 top .. 1 bottom
            edge = (x - x0) / max(1, w)
            dens = fbm(x, y, 14, seed) + 0.35 * t - 0.55 * edge - (0.25 if t < 0.15 else 0)
            if dens < 0.42: continue
            if hash01(x // 3, y // 3, seed + 1) < 0.18: continue
            nx = fbm(x + 3, y, 7, seed + 2) - fbm(x - 3, y, 7, seed + 2)
            ny = fbm(x, y + 3, 7, seed + 2) - fbm(x, y - 3, 7, seed + 2)
            lum = light(nx * 4, ny * 4, 0.6) + (dens - 0.5) * 0.4
            if x % 3 == 2 and y % 3 == 2: lum -= 0.25
            P(cv, x, y, shade('ivy', lum))
def flower_dots(cv, cx, cy, r, rp, seed, n=8):
    for k in range(n):
        a = hash01(k, 1, seed) * 6.283; rr = r * math.sqrt(hash01(k, 2, seed))
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.7
        P(cv, x, y, C(rp, 1)); P(cv, x + 1, y, C(rp, 2)); P(cv, x, y - 1, C(rp, 0))


def half_barrel(cv, x, y, flowers=('flower_red', 'flower_yel'), seed=1):
    """Planter, bottom-left at (x, y): 21 wide, ~24 tall with flowers."""
    w, h = 21, 13
    for yy in range(y - h, y):
        for xx in range(x, x + w):
            t = (xx - x) / (w - 1); i = 1 if t < 0.3 else (2 if t < 0.75 else 3)
            if (xx - x) % 5 == 4: i += 1
            if yy == y - h: i -= 1
            P(cv, xx, yy, C('wood', max(0, min(4, i))))
    for yy in (y - h + 2, y - 4):
        HL(cv, x, x + w, yy, C('iron', 2)); HL(cv, x, x + w, yy + 1, C('iron', 3)); P(cv, x + 1, yy, C('iron', 0))
    HL(cv, x + 1, x + w - 1, y - h - 1, C('wood_dark', 3))
    leaf_cluster(cv, x + w / 2, y - h - 5, 10, 'leaf', seed, 0.9)
    for k, f in enumerate(flowers): flower_dots(cv, x + w / 2, y - h - 7, 8, f, seed + k * 13, 8)
    for xx in range(x + 2, x + w + 3): dark(cv, xx, y - 1, 0.0)


def drainpipe(cv, x, y0, y1, rp='iron', hopper=True):
    if hopper:
        R(cv, x - 3, y0, 10, 7, C(rp, 2)); HL(cv, x - 3, x + 7, y0, C(rp, 1)); HL(cv, x - 3, x + 7, y0 + 6, C(rp, 4))
        VL(cv, x - 3, y0, y0 + 6, C(rp, 1)); VL(cv, x + 6, y0, y0 + 6, C(rp, 3)); P(cv, x - 2, y0 + 1, C(rp, 0))
        for yy in range(y0 + 7, y0 + 10): HL(cv, x - 1 + (yy - y0 - 7), x + 5 - (yy - y0 - 7), yy, C(rp, 2))
    for y in range(y0 + 5, y1):
        P(cv, x, y, C(rp, 1)); P(cv, x + 1, y, C(rp, 1)); P(cv, x + 2, y, C(rp, 2)); P(cv, x + 3, y, C(rp, 3))
        if (y - y0) % 33 == 0:
            HL(cv, x - 1, x + 5, y, C(rp, 2)); HL(cv, x - 1, x + 5, y + 1, C(rp, 3)); P(cv, x - 1, y, C(rp, 0))
    R(cv, x - 1, y1 - 4, 6, 4, C(rp, 2)); HL(cv, x - 1, x + 5, y1 - 4, C(rp, 1))
    for y in range(y0 + 5, y1): dark(cv, x + 4, y, 0.35); dark(cv, x + 5, y, 0.15)


def iron_bracket(cv, x, y, w, h, flip=False, rp='iron', paint=None):
    """Cast-iron spandrel bracket anchored top-left (post side) at (x, y): a curved rib from the beam end down to the
    post, a C-scroll and a small rosette in the web, all shaded as round bar (lit top-left, dark bottom-right)."""
    pr = paint or rp
    def p(xx, yy, c):
        P(cv, (x + w - 1 - xx) if flip else (x + xx), y + yy, c)
    for xx in range(w): p(xx, 0, C(pr, 1)); p(xx, 1, C(pr, 2)); p(xx, 2, C(pr, 4))
    for yy in range(h): p(0, yy, C(pr, 1)); p(1, yy, C(pr, 2)); p(2, yy, C(pr, 4))
    # rib: quarter ellipse bowing towards the corner, centred on the far corner (w-1, h-1)
    n = (w + h) * 3; cx, cy = w - 1, h - 1
    for k in range(n + 1):
        a = (math.pi / 2) * k / n
        xx = int(round(cx - (w - 3) * math.sin(a))); yy = int(round(cy - (h - 3) * math.cos(a)))
        p(xx, yy, C(pr, 1)); p(xx, yy + 1, C(pr, 2)); p(xx + 1, yy + 1, C(pr, 4))
    # C-scroll in the web
    sx, sy, sr = w * 0.36, h * 0.36, max(2.0, min(w, h) * 0.2)
    for k in range(60):
        a = k / 60 * 6.283 * 1.3 + 1.0; rr = sr * (1 - k / 90)
        xx = int(round(sx + math.cos(a) * rr)); yy = int(round(sy + math.sin(a) * rr))
        p(xx, yy, C(pr, 2 if math.sin(a) > 0 else 1))
    p(int(sx), int(sy), C(pr, 0))
    # rosette near the corner
    rx, ry = 4, 4
    for (a, b) in ((0, 0), (1, 0), (0, 1), (1, 1)): p(rx + a, ry + b, C(pr, 1 if a + b == 0 else 2))
    p(rx + 2, ry + 2, C(pr, 4))


def sel_outline(cv, k=0.7, ridge_rows=(), base_rows=(), outline_cols=None):
    """Selective outline for buildings: darken the silhouette's own edge pixels, and paint OUTLINE on the given rows
    (roof ridge/base) where they are opaque."""
    src = cv.im.copy(); p = src.load(); w, h = cv.w, cv.h
    for y in range(h):
        for x in range(w):
            if p[x, y][3] == 0: continue
            edge = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if not (0 <= xx < w and 0 <= yy < h) or p[xx, yy][3] == 0: edge = True; break
            if edge: cv.px[x, y] = darker(p[x, y], k)
    for y in list(ridge_rows) + list(base_rows):
        for x in range(w):
            if 0 <= y < h and cv.px[x, y][3]: cv.px[x, y] = O


def outline_where(cv, pred=None, colour=OUTLINE):
    """1px outline outside the silhouette, only where pred(x, y) (default everywhere)."""
    src = cv.im.copy(); p = src.load(); w, h = cv.w, cv.h
    for y in range(h):
        for x in range(w):
            if p[x, y][3]: continue
            if pred and not pred(x, y): continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and p[xx, yy][3] > 128: cv.put(x, y, colour); break


def moira(h=94):
    """A Moira-sized scale figure (44 x 94, 48x96 frame, feet at the bottom) for previews only."""
    c = Canvas(44, 96)
    c.sphere(22, 10, 7, 7, 'hair_grey')              # bun
    c.sphere(22, 25, 16, 15, 'hair_grey')            # hair
    c.sphere(22, 31, 12, 10, 'skin_light')           # face
    for x in (15, 26):
        for (a, b) in ((0, 0), (1, 0), (2, 0), (0, 1), (2, 1), (0, 2), (1, 2), (2, 2)): P(c, x + a, 29 + b, C('boot', 3))
    for y in range(41, 79):
        t = (y - 41) / 38; hw = 13 + int(t * 6)
        for x in range(22 - hw, 22 + hw):
            c.px[x, y] = C('olive', 1 if x < 15 else (2 if x < 29 else 3))
    for x in range(22 - 19, 22 + 19):
        for y in range(76, 84): c.px[x, y] = C('charcoal', 2 if x < 22 else 3)
    for x0 in (12, 25):
        R(c, x0, 83, 9, 11, C('boot', 2)); HL(c, x0, x0 + 9, 83, C('boot', 1))
    for y in (48, 55, 62, 69): P(c, 18, y, C('gold', 1)); P(c, 27, y, C('gold', 1))
    outline(c)
    c2 = Canvas(44, 94); c2.im = c.im.crop((0, 0, 44, 94)); c2.px = c2.im.load()
    return c2


def with_scale(img, fig_x=None, pad=4):
    """Return a new Canvas: the image with a Moira figure standing just right of it (for previews only)."""
    m = moira(); im = img.im if isinstance(img, Canvas) else img
    W = im.width + m.w + pad * 2; H = max(im.height, m.h)
    out = Canvas(W, H); out.im.paste(im, (0, H - im.height), im); out.px = out.im.load()
    out.im.paste(m.im, (im.width + pad, H - m.h), m.im); out.px = out.im.load()
    return out


def fig_at(img, x, foot_y):
    """Stamp a Moira figure onto a copy of img with her feet at (x, foot_y) (x = centre)."""
    m = moira(); c = img.copy(); c.im.paste(m.im, (int(x - 22), int(foot_y - 94)), m.im); c.px = c.im.load(); return c
