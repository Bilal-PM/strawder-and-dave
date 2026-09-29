"""LINESIDE HD people, hand-drawn: the assembler.

All character art lives in assets/hd/chars/handmade/*.txt as literal pixel grids, one character per pixel, drawn by
hand. This module does NOT generate shapes. It only:
  * parses the grids,
  * palette-swaps each pixel's material key to the character's hand-picked ramp (skin, hair, clothes...),
  * stacks the layers for a view / sheet column (with the hand-set body bob per walk key),
  * adds the 1px silhouette outline, coloured by the material it wraps (lighter on the lit top-left),
  * mirrors left-facing frames for the right-facing row.

Grid file format
    == name X Y [map=slot:other,...]
    <rows>
X, Y: the grid's top-left in figure space (the frame is 48 x 102, the figure is drawn PAD rows down; feet at 93).
'.' is transparent; rows may be ragged. ';' starts a comment line. Keys (index = ramp step, 0 = lightest):
    1-5 skin        a-e hair        A-E top (main cloth)   F-J inner / second cloth   K-O legs   P-T feet
    U-X accent (buttons, buckles)   f-j bag     k-o hat    q r s glasses rim   + lens glint
    @ eye dark   & eye mid   % eye iris   * eye highlight   p blush   v w mouth   t x z reflective tape
    y Y scarf (1, 2)   # hand-placed line (coloured like the outline of what it touches)
A layer's map= renames slots for that layer only, e.g. map=top:sleeve or map=hair:beard.
"""
import os, re
from pix import RAMPS, OUTLINE, Canvas, hexrgb
import fig  # noqa: F401  (registers the extra ramps: eye, blush, lip, lens...)

HERE = os.path.dirname(os.path.abspath(__file__))
GRID_DIR = os.path.join(HERE, 'handmade')
W, H, PAD = 48, 102, 4

KEYS = {}
for _slot, _chars in (('skin', '12345'), ('hair', 'abcde'), ('top', 'ABCDE'), ('inner', 'FGHIJ'), ('legs', 'KLMNO'),
                      ('feet', 'PQRST'), ('accent', 'UVWX'), ('bag', 'fghij'), ('hat', 'klmno'), ('rim', 'qrs')):
    for _i, _c in enumerate(_chars): KEYS[_c] = (_slot, _i)
KEYS.update({'+': ('lens', 0), '@': ('eye', 4), '&': ('eye', 3), '%': ('eye', 2), '*': ('eye', 0),
             'p': ('blush', 1), 'v': ('lip', 1), 'w': ('lip', 2), 't': ('reflect', 0), 'x': ('reflect', 1),
             'z': ('reflect', 2), 'y': ('scarf', 1), 'Y': ('scarf', 2), '#': ('line', 0)})


def _mix(a, b, t):
    a, b = hexrgb(a), hexrgb(b)
    return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3)) + (255,)


# ------------------------------------------------------------------ grids
_GRIDS = None


def grids():
    global _GRIDS
    if _GRIDS is not None: return _GRIDS
    g = {}
    for fn in sorted(os.listdir(GRID_DIR)):
        if not fn.endswith('.txt'): continue
        cur = None
        for raw in open(os.path.join(GRID_DIR, fn)):
            line = raw.rstrip('\n').rstrip()
            if line.startswith(';'): continue
            if line.startswith('=='):
                parts = line[2:].split()
                name, x, y = parts[0], int(parts[1]), int(parts[2])
                mp = {}
                for p in parts[3:]:
                    if p.startswith('map='):
                        for kv in p[4:].split(','):
                            a, b = kv.split(':'); mp[a] = b
                if name in g: raise ValueError(f'{fn}: grid {name} defined twice')
                cur = g[name] = dict(x=x, y=y, map=mp, rows=[], file=fn)
                continue
            if cur is None: continue
            if not line:
                cur = None if cur['rows'] else cur
                continue
            for c in line:
                if c != '.' and c not in KEYS: raise ValueError(f'{fn}: {cur and name}: unknown key {c!r}')
            cur['rows'].append(line)
    _GRIDS = g
    return g


def has(name):
    return name in grids()


# ------------------------------------------------------------------ materials
def slot_ramp(slot, s):
    sk = s['skin']
    return {
        'skin': sk, 'hair': s['hair'], 'brow': s.get('brow', s['hair']), 'beard': s.get('beard_ramp', s['hair']),
        'top': s['top'], 'inner': s.get('inner', 'cream'), 'sleeve': s.get('sleeve', s['top']),
        'legs': s.get('legs', 'charcoal'), 'tights': s.get('tights', s.get('legs', 'charcoal')),
        'skirt': s.get('skirt', 'charcoal'), 'feet': s.get('feet_ramp', 'boot'),
        'accent': s.get('button', 'gold'), 'gold': 'gold', 'bag': s.get('bag_ramp', 'leather'),
        'hat': s.get('hat', 'hat_white'), 'rim': s.get('rim', 'rim_dark'), 'lens': 'lens', 'eye': s.get('eye', 'eye'),
        'blush': sk + '_blush', 'lip': ('wine' if s.get('lipstick') else sk + '_lip'), 'reflect': 'reflect',
        'scarf': s.get('scarf', 'wine'), 'hivis': 'hivis', 'white': 'white', 'cream': 'cream', 'navy': 'navy',
        'sole': 'sole', 'line': None,
    }.get(slot, slot)


class Frame:
    """A figure being assembled: (x, y) -> [ramp name or None for '#', step]."""
    def __init__(self, spec):
        self.s = spec
        self.px = {}

    def layer(self, name, dx=0, dy=0, dark=0, only=None):
        """Stamp grid `name` at its position + (dx, dy). dark: shift every step darker (far limbs)."""
        g = grids().get(name)
        if g is None: return False
        mp = g['map']
        for j, row in enumerate(g['rows']):
            for i, c in enumerate(row):
                if c == '.': continue
                slot, k = KEYS[c]
                slot = mp.get(slot, slot)
                if only and slot not in only: continue
                rp = slot_ramp(slot, self.s)
                if rp is not None:
                    k = min(len(RAMPS[rp]) - 1, k + dark)
                self.px[(g['x'] + i + dx, g['y'] + j + dy + PAD)] = [rp, k]
        return True

    def finish(self, flip=False):
        cv = Canvas(W, H)
        px = self.px
        if flip: px = {(W - 1 - x, y): v for (x, y), v in px.items()}
        OUT = hexrgb(OUTLINE)

        def dark_of(rp):
            return _mix(RAMPS[rp][-1], OUTLINE, 0.55)

        def lit_of(rp):
            r = RAMPS[rp]
            return _mix(r[-1], r[-2], 0.35)
        for (x, y), (rp, k) in px.items():
            if not (0 <= x < W and 0 <= y < H): continue
            if rp is None:                                  # hand-placed line: colour of the neighbouring material
                nb = [px.get((x + dx, y + dy)) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                nb = [n for n in nb if n and n[0]]
                cv.put(x, y, dark_of(nb[0][0]) if nb else OUT)
            else:
                cv.put(x, y, hexrgb(RAMPS[rp][k]))
        # silhouette outline: coloured by the material it wraps; lighter where the light (upper left) falls on it
        for y in range(H):
            for x in range(W):
                if (x, y) in px: continue
                right = px.get((x + 1, y)); below = px.get((x, y + 1))
                left = px.get((x - 1, y)); above = px.get((x, y - 1))
                cand = [n for n in (right, below, left, above) if n]
                if not cand: continue
                src = next((n for n in cand if n[0]), None)
                if src is None: cv.put(x, y, OUT); continue
                lit = (right is not None or below is not None) and left is None and above is None
                # on the lit top-left the line is a deep tone of the material; elsewhere it sinks towards the outline
                col = lit_of(src[0]) if lit else dark_of(src[0])
                cv.put(x, y, col)
        return cv
