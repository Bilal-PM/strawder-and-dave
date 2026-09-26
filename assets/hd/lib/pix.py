"""LINESIDE HD pixel-art toolkit: one palette, one light, one outline rule for every generator.

Every HD asset (characters, terrain, buildings, props, interiors) is drawn by a Python generator that imports this
module, so the whole world shares the same ramps, light direction and finishing. See assets/hd/ART_BIBLE.md.

    from pix import Canvas, RAMPS, shade, outline, save, sheet
"""
import math, os, json, random
from PIL import Image

# ------------------------------------------------------------------ palette
# Each ramp runs LIGHT -> DARK (index 0 = highlight, last = deepest shadow). Hue-shifted: highlights lean warm/yellow,
# shadows lean cool/violet, the way the reference character is painted. Use ramps, never ad-hoc colours.
RAMPS = {
    # people
    'skin_fair':   ['#ffe6cf', '#f7cfae', '#e6ad88', '#c4866a', '#935a4c'],
    'skin_light':  ['#fbdcc0', '#eebe98', '#d99a74', '#b27558', '#7f4d42'],
    'skin_mid':    ['#e9b48c', '#cf9168', '#ad6f4f', '#86503f', '#5c3530'],
    'skin_brown':  ['#c98f66', '#a8704c', '#865337', '#643b2a', '#432621'],
    'skin_deep':   ['#9e6a48', '#7e4f34', '#5f3827', '#44271e', '#2c1a17'],
    'hair_grey':   ['#f1ede8', '#d2ccc6', '#aca4a0', '#827a7a', '#5a5259'],
    'hair_silver': ['#e6e4e8', '#c2bec6', '#99949e', '#6f6a77', '#4a4553'],
    'hair_blonde': ['#fbe7a6', '#e8c774', '#c79d4e', '#9a7236', '#664826'],
    'hair_ginger': ['#f2a466', '#d9783e', '#b0562b', '#833b20', '#552418'],
    'hair_brown':  ['#b0835a', '#8a603e', '#664429', '#472e1d', '#2e1d15'],
    'hair_dark':   ['#6a5048', '#4a3632', '#332426', '#22181b', '#150f12'],
    # cloth
    'olive':       ['#a4ad6c', '#7f8c4d', '#606e38', '#46522a', '#2f381f'],
    'forest':      ['#7fa56e', '#5b8552', '#41663f', '#2d4b31', '#1d3224'],
    'navy':        ['#7b94bb', '#5a7299', '#415577', '#2e3d59', '#1e283d'],
    'denim':       ['#8aa8c8', '#6886ab', '#4d6a8e', '#37506e', '#26374f'],
    'teal':        ['#7fc0b2', '#57a092', '#3d7e73', '#2b5d57', '#1d3f3d'],
    'plum':        ['#b58aa8', '#8f6687', '#6d4968', '#4e334c', '#332233'],
    'wine':        ['#c96a6a', '#a54b52', '#80353f', '#5c2530', '#3c1822'],
    'mustard':     ['#f1cf6e', '#d8ab45', '#b3852e', '#8a6121', '#5c3f18'],
    'charcoal':    ['#8a8a92', '#67676f', '#4b4b54', '#35353d', '#23232a'],
    'tweed':       ['#b8a078', '#957e5a', '#735f42', '#54442f', '#382d20'],
    'cream':       ['#fcf7ea', '#ece2c9', '#d2c3a2', '#aa9b7e', '#7a6f5b'],
    'white':       ['#ffffff', '#eef0f2', '#cfd4da', '#a4aab4', '#747a86'],
    'hivis':       ['#ffc15a', '#fb9a33', '#e0731f', '#b3531a', '#7a3514'],
    'reflect':     ['#fbfdff', '#dfe6ec', '#b6c0ca', '#8791a0'],
    'leather':     ['#c28a58', '#9c6a40', '#79502f', '#573821', '#3a2517'],
    'boot':        ['#8c6848', '#6c4e36', '#503826', '#37261b', '#231812'],
    'gold':        ['#fff0a0', '#f2c85a', '#c99a38', '#946c26'],
    'glass':       ['#e9f6fb', '#bcdce8', '#8fb8cb', '#6690a8', '#446a82'],
    # world
    'grass':       ['#c6dc86', '#a3c565', '#80a84b', '#608a3c', '#456b31', '#2f4d27'],
    'meadow':      ['#d6d98c', '#b6be6a', '#93a24f', '#72843f', '#536530'],
    'leaf':        ['#b5d36e', '#8fb853', '#6c9a41', '#4f7b35', '#37602c', '#244324'],
    'pine':        ['#7fa36a', '#5b8354', '#406542', '#2c4a34', '#1c3226'],
    'bark':        ['#a58564', '#80644a', '#5f4935', '#433326', '#2c211a'],
    'dirt':        ['#dcbc8e', '#c09a6c', '#9d7a52', '#7a5c3e', '#56402d'],
    'mud':         ['#a88d6c', '#86704f', '#66543b', '#4a3c2c', '#30281f'],
    'sand':        ['#f4e2b6', '#e1c893', '#c7aa74', '#a58a5a'],
    'stone':       ['#e8e2d4', '#c9c1b1', '#a79f91', '#847e74', '#615d58', '#423f3e'],
    'cobble':      ['#c9c2b6', '#a8a095', '#877f78', '#67615e', '#4a4545'],
    'tarmac':      ['#7d8088', '#666972', '#51545d', '#3f4149', '#2e3037'],
    'paving':      ['#dcd6ca', '#c2bbae', '#a59e93', '#888278', '#6a655e'],
    'ballast':     ['#b9b2a8', '#978f86', '#78716a', '#5a5550', '#403c3a'],
    'sleeper':     ['#9b7b5a', '#7a5d43', '#5c4432', '#432f24', '#2c1f19'],
    'concrete':    ['#d8d6cf', '#bab7af', '#9b9890', '#7b7872', '#5b5955'],
    'rail':        ['#e2e4e8', '#b3b7bf', '#8a8f99', '#646973', '#454a53'],
    'rust':        ['#d9955e', '#b8703f', '#92522e', '#6c3a23', '#472519'],
    'brick':       ['#e39a70', '#c77752', '#a2583d', '#7b402f', '#552b22'],
    'brick_dark':  ['#b8745a', '#965842', '#744131', '#542e25', '#381e1a'],
    'sandstone':   ['#efdcb0', '#d9c08e', '#b89e6f', '#927c55', '#6a593f'],
    'slate':       ['#9aa3b4', '#7a8396', '#5e6679', '#454c5d', '#2f3441'],
    'tile_roof':   ['#e0876a', '#c2664f', '#9c4c3d', '#76372f', '#512521'],
    'thatch':      ['#e8cf8a', '#c9aa62', '#a58545', '#7d6233', '#554224'],
    'wood':        ['#e2ad76', '#c28756', '#9c663e', '#77492d', '#533220'],
    'wood_dark':   ['#9a7156', '#795640', '#5b3f30', '#412c23', '#2a1c18'],
    'paint_green': ['#78b07e', '#55925f', '#3c7449', '#2a5636', '#1b3a25'],   # Brunswick-style railway green
    'paint_cream': ['#fbf2d6', '#eadcb3', '#cfbd8f', '#a8966d', '#7a6b4e'],
    'paint_red':   ['#ef7a66', '#d4523f', '#ae3a31', '#842a28', '#5a1d1f'],
    'paint_blue':  ['#86b3d9', '#5f90bd', '#44729c', '#32567a', '#223c56'],
    'paint_black': ['#6e6e78', '#50505a', '#393941', '#26262d', '#17171c'],
    'metal':       ['#eef1f4', '#c8ced6', '#9ea6b2', '#77808d', '#535a66', '#383d47'],
    'water':       ['#bfeaf0', '#8fd0dd', '#62b0c6', '#4690ad', '#346f8e', '#25516d'],
    'flower_red':  ['#ff9a8a', '#ec5e56', '#c23d43'],
    'flower_yel':  ['#fff2a0', '#f5d25a', '#d9a93a'],
    'flower_wht':  ['#ffffff', '#e8eaf0', '#c4c8d4'],
    'flower_pur':  ['#d8b0f0', '#aa7fd0', '#7f58a8'],
    'flower_blu':  ['#b8d8ff', '#7fa8ea', '#5a7fc4'],
    'lamp_glow':   ['#fffbe0', '#ffe9a0', '#ffd066', '#f5a742'],
}
OUTLINE = '#2a1d22'        # the one dark outline for characters and silhouettes (warm near-black, never pure black)
SHADOW = (42, 29, 50, 90)  # contact / cast shadow (violet, translucent)
LIGHT = (-0.55, -0.70, 0.46)  # light from the upper left (north-west), slightly in front: normalised below
_l = math.sqrt(sum(c * c for c in LIGHT)); LIGHT = tuple(c / _l for c in LIGHT)

TILE = 32  # art pixels per map tile (the game draws HD scenes at res 2: 16 world units = 32 art px)


def hexrgb(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def ramp(name, i):
    """Colour i of a ramp as RGBA (clamped)."""
    r = RAMPS[name]; return hexrgb(r[max(0, min(len(r) - 1, i))])


def shade(name, lum):
    """Pick a ramp colour from a lighting value lum in 0..1 (1 = fully lit)."""
    r = RAMPS[name]; i = int(round((1 - max(0.0, min(1.0, lum))) * (len(r) - 1))); return hexrgb(r[i])


def light(nx, ny, nz):
    """Lambert light for a surface normal (image coords: +x right, +y down, +z towards viewer). 0..1."""
    l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
    d = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / l
    return max(0.0, min(1.0, 0.18 + 0.82 * d))


def hash01(x, y, s=0):
    """Stable per-pixel random in 0..1."""
    n = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFFFF) / 0xFFFFFF


def vnoise(x, y, cell, s=0):
    """Smooth value noise in 0..1 with the given cell size (px)."""
    gx, gy = x / cell, y / cell; x0, y0 = math.floor(gx), math.floor(gy); fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = hash01(x0, y0, s), hash01(x0 + 1, y0, s), hash01(x0, y0 + 1, s), hash01(x0 + 1, y0 + 1, s)
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(x, y, cell, s=0, octaves=3):
    v, amp, tot = 0.0, 1.0, 0.0
    for o in range(octaves):
        v += vnoise(x, y, cell / (2 ** o), s + o * 17) * amp; tot += amp; amp *= 0.5
    return v / tot


BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def dither(x, y, t):
    """True if an ordered-dither threshold t (0..1) is met at this pixel. Use sparingly (texture, not gradients)."""
    return (BAYER4[y & 3][x & 3] + 0.5) / 16 < t


class Canvas:
    """RGBA pixel canvas with the drawing helpers every generator needs."""

    def __init__(self, w, h):
        self.w, self.h = w, h; self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); self.px = self.im.load()

    def get(self, x, y):
        return self.px[x, y] if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if not (0 <= x < self.w and 0 <= y < self.h) or c is None: return
        if isinstance(c, str): c = hexrgb(c)
        if len(c) == 4 and c[3] < 255:   # alpha blend over what is there
            b = self.px[x, y]; a = c[3] / 255; ba = b[3] / 255; oa = a + ba * (1 - a)
            if oa <= 0: return
            self.px[x, y] = tuple(int((c[i] * a + b[i] * ba * (1 - a)) / oa) for i in range(3)) + (int(oa * 255),)
        else:
            self.px[x, y] = tuple(c[:3]) + (255,)

    def rect(self, x, y, w, h, c):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)): self.put(xx, yy, c)

    def fill(self, test, colour):
        """Fill every pixel where test(x, y) is true; colour may be a colour or a function (x, y) -> colour."""
        f = colour if callable(colour) else (lambda x, y: colour)
        for y in range(self.h):
            for x in range(self.w):
                if test(x, y): self.put(x, y, f(x, y))

    def ellipse(self, cx, cy, rx, ry, colour):
        """Filled ellipse; colour may be a function (x, y, nx, ny, nz) -> colour for shaded volumes."""
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx, dy = (x + 0.5 - cx) / max(rx, 0.5), (y + 0.5 - cy) / max(ry, 0.5); d = dx * dx + dy * dy
                if d <= 1:
                    if callable(colour): self.put(x, y, colour(x, y, dx, dy, math.sqrt(max(0, 1 - d))))
                    else: self.put(x, y, colour)

    def sphere(self, cx, cy, rx, ry, rampname, bias=0.0):
        """A lit volume (head, bun, shrub, round tree crown) shaded with a ramp."""
        self.ellipse(cx, cy, rx, ry, lambda x, y, nx, ny, nz: shade(rampname, light(nx, ny, nz) + bias))

    def blit(self, other, ox, oy):
        for y in range(other.h):
            for x in range(other.w):
                c = other.px[x, y]
                if c[3]: self.put(ox + x, oy + y, c)

    def flip(self):
        c = Canvas(self.w, self.h); c.im = self.im.transpose(Image.FLIP_LEFT_RIGHT); c.px = c.im.load(); return c

    def copy(self):
        c = Canvas(self.w, self.h); c.im = self.im.copy(); c.px = c.im.load(); return c


def outline(cv, colour=OUTLINE, inner=None, diagonal=False):
    """Add a 1px outline around the opaque silhouette (outside). inner: optional function (rgba) -> rgba that darkens
    edge pixels of the sprite itself (selective outline for terrain/props, where a hard black line looks wrong)."""
    src = cv.im.copy(); p = src.load(); w, h = cv.w, cv.h
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (-1, -1), (1, -1), (-1, 1)] if diagonal else [])
    for y in range(h):
        for x in range(w):
            if p[x, y][3]: continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and p[x + dx, y + dy][3] > 128 for dx, dy in nb):
                cv.put(x, y, colour)
    if inner:
        for y in range(h):
            for x in range(w):
                if p[x, y][3] and any(not (0 <= x + dx < w and 0 <= y + dy < h) or p[x + dx, y + dy][3] == 0 for dx, dy in nb[:4]):
                    cv.px[x, y] = inner(p[x, y])
    return cv


def darker(rgba, k=0.72):
    return (int(rgba[0] * k), int(rgba[1] * k * 0.96), int(rgba[2] * k * 1.04 if rgba[2] * k * 1.04 < 255 else 255), rgba[3])


def ground_shadow(cv, cx, cy, rx, ry, alpha=90):
    """Soft oval contact shadow under a sprite (drawn first)."""
    for y in range(int(cy - ry), int(cy + ry + 1)):
        for x in range(int(cx - rx), int(cx + rx + 1)):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d <= 1: cv.put(x, y, SHADOW[:3] + (int(alpha * (1 - d * 0.5)),))


def save(cv, path):
    os.makedirs(os.path.dirname(path), exist_ok=True); cv.im.save(path); return path


def sheet(frames, cols, fw, fh):
    """Pack equal-size frames (Canvas or PIL) into one sheet, row-major."""
    rows = (len(frames) + cols - 1) // cols; out = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f.im if isinstance(f, Canvas) else f, ((i % cols) * fw, (i // cols) * fh))
    return out


def preview(images, path, scale=4, bg=(236, 230, 214), cols=None, pad=8):
    """Contact sheet at an integer zoom, for LOOKING at your work (open it with the Read tool). images: list of
    (label, PIL image | Canvas)."""
    ims = [(l, (i.im if isinstance(i, Canvas) else i)) for l, i in images]
    cols = cols or min(len(ims), 6)
    cw = max(i.width for _, i in ims) * scale + pad; ch = max(i.height for _, i in ims) * scale + pad
    rows = (len(ims) + cols - 1) // cols; out = Image.new('RGB', (cols * cw + pad, rows * ch + pad), bg)
    for k, (l, i) in enumerate(ims):
        big = i.resize((i.width * scale, i.height * scale), Image.NEAREST)
        out.paste(big, (pad + (k % cols) * cw, pad + (k // cols) * ch), big)
    os.makedirs(os.path.dirname(path), exist_ok=True); out.save(path); return path


def manifest(path, entries):
    """Write a manifest: {name: {file, w, h, anchor:[x,y], ...}} (anchor = the pixel that sits on the ground point)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(entries, open(path, 'w'), indent=1, sort_keys=True); return path
