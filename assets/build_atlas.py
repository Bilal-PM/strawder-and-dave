"""LINESIDE atlas builder (offline, Pillow).

Reads the CC0 Kenney source sheets in assets/src/, crops only what the renderer uses,
applies a hand-made ENDESGA-32 colour LUT to the RPG Urban pieces, bakes the character
bodies into *class maps* (one class id per pixel, so js/world/tileart.js can palette-swap
each cast member), and writes js/world/atlas.js:

    LS.ATLAS       = { name: 'data:image/png;base64,...' }
    LS.ATLAS_INDEX = { sheet: { sprite: [x, y, w, h] } }

Run from the repo root:  python3 assets/build_atlas.py
"""
import base64, io, json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, '..', 'js', 'world', 'atlas.js')
T = 16


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- RPG Urban -> ENDESGA-32 (hand-made)
# Nearest-colour remap turns Kenney's teal into cyan and its purple-greys into blues, so every
# colour that appears in the pieces we crop is mapped by hand to a Tiny Town / ENDESGA tone.
LUT = {
    # dark outline + metals
    '5c6278': '3f2631', '7a77a4': '5a6988', 'a09cca': '8b9bb4', 'cdc9e7': 'c0cbdc', 'beb8cd': 'c0cbdc',
    'aaa8bd': '8b9bb4', 'd6d0e4': 'ffffff', '69717b': '5a6988', '595962': '3a4466', '71717b': '5a6988',
    '3a3a40': '262b44', '545a6e': '3a4466', '646b83': '5a6988',
    # timber (bench slats, crates) -> Tiny Town wood ramp
    'f5aa57': 'eaa56c', 'dc8652': 'cf8254', 'c57652': 'bd6c4a', '7d4552': '3f2631', '965652': '763b36',
    # reds (litter bin, barriers)
    'c2504d': 'e43b44', 'dc615d': 'f6757a', 'a54240': 'a22633', '742c34': '3f2631', '874d27': '733e39',
    # yellows / oranges (barriers)
    'da923e': 'feae34', 'f5a94c': 'fee761',
    # greens (heritage lamp) - never teal
    '296360': '193c3e', '2e8864': '265c42', '39a077': '3e8948', '44b58a': '63c74d', '21837c': '265c42',
    '38cbab': '63c74d', '42dfab': '63c74d', '30b6af': '3e8948',
    # blues (post box, unused but mapped)
    '3f4488': '124e89', '576cb6': '124e89', '6b86d4': '0099db', '86a2e7': '2ce8f5', 'f4f7ee': 'ffffff',
    'ffffff': 'fee761',  # lamp glass reads warm
}


def lut(im):
    im = im.convert('RGBA')
    px = im.load()
    miss = set()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            k = '%02x%02x%02x' % (r, g, b)
            if k in LUT:
                px[x, y] = hx(LUT[k]) + (a,)
            else:
                miss.add(k)
    if miss:
        print('LUT miss', sorted(miss))
    return im


# ---------------------------------------------------------------- simple shelf packer
class Sheet:
    def __init__(self, width):
        self.w = width
        self.items = []

    def add(self, name, im):
        self.items.append((name, im))

    def build(self):
        items = sorted(self.items, key=lambda it: -it[1].size[1])
        x = y = rowh = 0
        pos = {}
        for name, im in items:
            w, h = im.size
            if x + w > self.w:
                x, y, rowh = 0, y + rowh + 1, 0
            pos[name] = [x, y, w, h]
            x += w + 1
            rowh = max(rowh, h)
        H = y + rowh
        out = Image.new('RGBA', (self.w, H), (0, 0, 0, 0))
        for name, im in items:
            p = pos[name]
            out.paste(im, (p[0], p[1]))
        return out, pos


def png_uri(im):
    buf = io.BytesIO()
    # palette-bake when possible (smaller, exact)
    cols = im.getcolors(256)
    if cols is not None and len(cols) <= 256:
        q = im.convert('RGBA')
        # keep RGBA to preserve exact alpha 0/255
        q.save(buf, 'PNG', optimize=True)
    else:
        im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


# ---------------------------------------------------------------- characters -> class maps
# class ids (must match CL in tileart.js)
OUT_, HAIR_HI, HAIR, HAIR_DK, SKIN_HI, SKIN, SKIN_DK, EYE, MOUTH, TOP_HI, TOP, TOP_DK, LEGS, LEGS_DK, SHOE, \
    HAT, HAT_DK, HAT_HI, BAND, FRAME = range(1, 21)
ERASE = 99

BODY = {
    0: {'8d5243': OUT_, 'c57652': HAIR_DK, 'dc8652': HAIR, 'f1b089': SKIN_DK, 'ffc999': SKIN, '654140': EYE,
        'e29779': MOUTH, '369069': TOP_DK, '42a379': TOP, 'ffc8a1': SKIN_HI, 'c5b993': LEGS_DK, 'd6d4aa': LEGS},
    1: {'8d5243': OUT_, 'c57652': HAIR_DK, 'dc8652': HAIR, 'f1b089': SKIN_DK, 'ffc999': SKIN, '654140': EYE,
        'ffc8a1': SKIN_HI, 'c2504d': TOP, 'a54240': TOP_DK, 'a09cca': LEGS, '7a77a4': LEGS_DK},
    2: {'5c6278': OUT_, '8d5243': OUT_, 'a09cca': HAIR, '7a77a4': HAIR_DK, 'ffc999': SKIN, 'f1b089': SKIN_DK,
        '654140': EYE, 'ffc8a1': SKIN_HI, 'aaaeba': TOP_HI, '898ca6': TOP_HI, 'dc8652': TOP, 'c57652': TOP_DK,
        '369069': LEGS_DK, '42a379': LEGS},
    3: {'874d27': OUT_, 'f5a94c': HAT_HI, 'da923e': HAT, 'bc7d36': HAT_DK, '60605a': BAND, '373733': OUT_,
        '955f3e': SKIN_DK, 'b4734a': SKIN, '71482f': OUT_, '654140': EYE, 'c5b993': TOP_HI, 'a19dcc': TOP_HI,
        '918eb9': LEGS, '7a77a4': LEGS_DK, 'd6d4aa': TOP, '8d5243': OUT_, 'dc8652': SHOE, 'c57652': SHOE},
    4: {'8d5243': OUT_, 'f1b089': SKIN_DK, 'ffc999': SKIN, '654140': EYE, 'dc8652': SKIN_DK, 'ffc8a1': SKIN_HI,
        '898ca6': TOP_DK, 'aaa8bd': TOP, '60605a': LEGS, '54544e': LEGS_DK, 'c57652': SKIN_DK},
    5: {'373733': OUT_, '50504a': HAIR_DK, '60605a': HAIR, 'ff7143': BAND, 'ffc999': SKIN, 'f1b089': SKIN_DK,
        '654140': EYE, 'ffc8a1': SKIN_HI, '8d5243': OUT_, 'a9673b': TOP_DK, 'c77b47': TOP, '898ca6': LEGS_DK,
        'aaa8bd': LEGS, 'dc8652': SKIN_DK},
}
VIEWS = [23, 24, 25]  # left, down, up   (right = mirrored left at runtime)
CH = 18  # cell height: 2 spare rows on top for buns / hats


def body_cell(ur, b, view, frame):
    """16x18 class grid for Kenney body b, sheet column view, frame 0..2."""
    tbl = BODY[b]
    g = [[0] * 16 for _ in range(CH)]
    col, row = view, b * 3 + frame
    for y in range(16):
        for x in range(16):
            r, gg, bb, a = ur.getpixel((col * T + x, row * T + y))
            if a == 0:
                continue
            k = '%02x%02x%02x' % (r, gg, bb)
            c = tbl.get(k)
            if c is None:
                print('unmapped', b, view, frame, k)
                c = OUT_
            g[y + 2][x] = c
    # feet: the last two painted rows' hair/top-coloured pixels are shoes
    rows = [y for y in range(CH) if any(g[y])]
    last = rows[-1]
    for y in (last, last - 1):
        for x in range(16):
            if y == last and g[y][x] in (HAIR, HAIR_DK, TOP, SKIN_DK, LEGS, HAIR_HI):
                g[y][x] = SHOE
            if y == last - 1 and b in (0, 1, 2, 4) and g[y][x] in (HAIR, HAIR_DK) and y >= 13:
                g[y][x] = SHOE
    return g


def head_top(g):
    for y in range(CH):
        if any(g[y]):
            return y
    return 0


def copy(g):
    return [r[:] for r in g]


def outline_fix(g):
    """add OUT around any painted pixel that touches transparency on the top/sides (after edits)."""
    h, w = len(g), len(g[0])
    add = []
    for y in range(h):
        for x in range(w):
            if g[y][x] in (HAIR, HAIR_HI, HAIR_DK):
                for dx, dy in ((1, 0), (-1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and g[ny][nx] == 0:
                        add.append((nx, ny))
    for x, y in add:
        g[y][x] = OUT_


def make_chars(ur):
    cells = {}
    for vi, view in enumerate(VIEWS):
        for f in range(3):
            key = (vi, f)
            b0 = body_cell(ur, 0, view, f)
            b1 = body_cell(ur, 1, view, f)
            b2 = body_cell(ur, 2, view, f)
            b3 = body_cell(ur, 3, view, f)
            b4 = body_cell(ur, 4, view, f)
            b5 = body_cell(ur, 5, view, f)
            ht = head_top(b0)  # 4 in stand frames, 3 in step frames
            cells[('short', key)] = b0
            cells[('long', key)] = b1
            cells[('bald', key)] = b4
            # curly: dark bushy hair of body 5 (headband -> curls), puffed out one pixel each side + crown
            cu = copy(b5)
            for y in range(CH):
                for x in range(16):
                    if cu[y][x] == BAND:
                        cu[y][x] = HAIR
            hair_c = (HAIR, HAIR_DK, HAIR_HI)
            for y in range(ht, ht + 5):
                xs = [x for x in range(16) if cu[y][x] in hair_c]
                if xs:
                    if vi != 0 or True:
                        cu[y][min(xs) - 1] = HAIR
                    cu[y][max(xs) + 1] = HAIR
            for x in range(6, 10):
                cu[ht - 1][x] = HAIR
            for y in range(CH):
                for x in range(16):
                    if cu[y][x] in (HAIR, HAIR_DK) and (x + 2 * y) % 4 == 0 and y < ht + 6:
                        cu[y][x] = HAIR_HI
            outline_fix(cu)
            cells[('curly', key)] = cu
            # bob: long hair to jaw length (rows below the chin come from body 0)
            bo = copy(b1)
            cut = ht + 8
            for y in range(cut, CH):
                bo[y] = b0[y][:]
            # keep hair falling to jaw at the sides
            for y in range(ht + 4, cut):
                for x in range(16):
                    if b1[y][x] in (HAIR, HAIR_DK) and b0[y][x] in (OUT_, 0):
                        bo[y][x] = b1[y][x]
            cells[('bob', key)] = bo
            # bun: short hair + bun on top
            bu = copy(b0)
            if vi == 0:   # side (facing left): bun at the back of the crown
                blob = [(8, ht - 2), (9, ht - 2), (7, ht - 1), (8, ht - 1), (9, ht - 1), (10, ht - 1)]
            else:
                blob = [(7, ht - 2), (8, ht - 2), (6, ht - 1), (7, ht - 1), (8, ht - 1), (9, ht - 1)]
            for (x, y) in blob:
                bu[y][x] = HAIR
            bu[blob[0][1]][blob[0][0]] = HAIR_HI
            outline_fix(bu)
            cells[('bun', key)] = bu
            # ponytail
            po = copy(b0)
            if vi == 0:   # facing left: tail hangs behind (right side)
                tail = [(12, ht + 3), (13, ht + 3), (12, ht + 4), (13, ht + 4), (13, ht + 5), (13, ht + 6), (12, ht + 6)]
            elif vi == 2:  # back view: tail down the middle
                tail = [(7, ht + 6), (8, ht + 6), (7, ht + 7), (8, ht + 7), (7, ht + 8), (8, ht + 8), (8, ht + 9)]
            else:          # front: hidden behind the head
                tail = []
            for (x, y) in tail:
                po[y][x] = HAIR
            outline_fix(po)
            cells[('ponytail', key)] = po
            # ---- overlays (0 = keep, ERASE = clear)
            hat = [[0] * 16 for _ in range(CH)]
            h3 = head_top(b3)
            for y in range(h3, h3 + 5):
                for x in range(16):
                    c = b3[y][x]
                    if c in (HAT, HAT_HI, HAT_DK, BAND) or (c == OUT_ and y < h3 + 4):
                        hat[y][x] = c
                    elif c == 0 and y < h3 + 3:
                        hat[y][x] = ERASE
            cells[('o_hardhat', key)] = hat
            # flat cap: hair crown rows of body 0 become cap + a brim line
            cap = [[0] * 16 for _ in range(CH)]
            for y in range(ht, ht + 3):
                for x in range(16):
                    c = b0[y][x]
                    if c in (HAIR, HAIR_HI, HAIR_DK):
                        cap[y][x] = HAT if y > ht else HAT_HI
            if vi == 1:
                for x in range(5, 11):
                    cap[ht + 3][x] = HAT_DK
            elif vi == 0:
                for x in range(3, 8):
                    cap[ht + 3][x] = HAT_DK
                cap[ht + 3][2] = OUT_
            cells[('o_cap', key)] = cap
            # beard: body 2's hair pixels under the eyes
            be = [[0] * 16 for _ in range(CH)]
            if vi != 2:
                for y in range(ht + 5, ht + 10):
                    for x in range(16):
                        if b2[y][x] in (HAIR, HAIR_DK):
                            be[y][x] = b2[y][x]
            cells[('o_beard', key)] = be
            # glasses: dark frame line across the upper eye row
            gl = [[0] * 16 for _ in range(CH)]
            if vi != 2:
                eyes = [(x, y) for y in range(CH) for x in range(16) if b0[y][x] == EYE]
                if eyes:
                    ey = min(y for x, y in eyes)
                    xs = [x for x, y in eyes if y == ey]
                    if vi == 1:
                        for x in range(min(xs) - 1, max(xs) + 2):
                            gl[ey][x] = FRAME
                    else:
                        for x in range(min(xs) - 1, min(xs) + 4):
                            if b0[ey][x] not in (0,):
                                gl[ey][x] = FRAME
            cells[('o_glasses', key)] = gl
    order = ['short', 'long', 'bald', 'curly', 'bob', 'bun', 'ponytail', 'o_hardhat', 'o_cap', 'o_beard', 'o_glasses']
    W, H = 9 * 16, len(order) * CH
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = im.load()
    for ri, name in enumerate(order):
        for vi in range(3):
            for f in range(3):
                g = cells[(name, (vi, f))]
                for y in range(CH):
                    for x in range(16):
                        c = g[y][x]
                        if c:
                            px[(vi * 3 + f) * 16 + x, ri * CH + y] = (c, 0, 0, 255)
    return im, order


def preview_chars(im, order, path):
    pal = {OUT_: '3e2731', HAIR_HI: 'e4a672', HAIR: 'b86f50', HAIR_DK: '733e39', SKIN_HI: 'fce0c8',
           SKIN: 'e8b796', SKIN_DK: 'c28569', EYE: '262b44', MOUTH: 'be4a2f', TOP_HI: '63c74d', TOP: '3e8948',
           TOP_DK: '265c42', LEGS: '5a6988', LEGS_DK: '3a4466', SHOE: '181425', HAT: 'feae34', HAT_DK: 'f77622',
           HAT_HI: 'fee761', BAND: '5a6988', FRAME: '181425', ERASE: 'ff00ff'}
    out = Image.new('RGBA', im.size, (200, 210, 220, 255))
    p, q = im.load(), out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = p[x, y]
            if a:
                q[x, y] = hx(pal.get(r, 'ff00ff')) + (255,)
    out.resize((im.size[0] * 6, im.size[1] * 6), Image.NEAREST).save(path)


def main():
    tt = Image.open(os.path.join(SRC, 'kenney_tiny-town_tilemap_packed.png')).convert('RGBA')
    ur_raw = Image.open(os.path.join(SRC, 'kenney_rpg-urban-pack_tilemap_packed.png')).convert('RGBA')
    ur = ur_raw.copy()

    def U(box):
        return lut(ur.crop(box))

    # --- RPG Urban props (LUT)
    sh = Sheet(96)
    sh.add('lamp', U((117, 96, 124, 126)))
    sh.add('benchF', U((3 * T, 14 * T, 4 * T, 15 * T)))
    sh.add('benchS', U((3 * T, 12 * T, 4 * T, 14 * T)))
    sh.add('bin_grey', U((9 * T, 10 * T, 10 * T, 11 * T)))
    sh.add('bin_grey2', U((10 * T, 10 * T, 11 * T, 11 * T)))
    sh.add('bin_red', U((8 * T, 9 * T, 9 * T, 10 * T)))
    sh.add('barrier_rw', U((5 * T, 8 * T, 6 * T, 9 * T)))
    sh.add('barrier_yb', U((5 * T, 9 * T, 6 * T, 10 * T)))
    sh.add('crate', U((3 * T, 10 * T, 4 * T, 11 * T)))
    urs, urpos = sh.build()
    # trim fully transparent borders of each sprite rect (keeps drawing offsets predictable)
    chars, order = make_chars(ur_raw)
    here_tmp = os.environ.get('ATLAS_PREVIEW')
    if here_tmp:
        preview_chars(chars, order, os.path.join(here_tmp, 'chars_classes.png'))
        urs.resize((urs.size[0] * 6, urs.size[1] * 6), Image.NEAREST).save(os.path.join(here_tmp, 'ur_lut.png'))

    atlas = {'tt': png_uri(tt), 'ur': png_uri(urs), 'chars': png_uri(chars)}
    index = {'ur': urpos, 'chars': {'order': order, 'cellW': 16, 'cellH': CH}}
    js = ['/* LINESIDE — embedded sprite atlas (generated by assets/build_atlas.py; do not edit by hand).',
          ' * Sources: Kenney Tiny Town + RPG Urban Pack (CC0) — see assets/CREDITS.md.',
          ' * Data URIs keep canvases untainted on file:// and make the single-file bundle work. */',
          'window.LS = window.LS || {};',
          'LS.ATLAS = ' + json.dumps(atlas, indent=0) + ';',
          'LS.ATLAS_INDEX = ' + json.dumps(index, separators=(',', ':')) + ';', '']
    with open(OUT, 'w') as fh:
        fh.write('\n'.join(js))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
