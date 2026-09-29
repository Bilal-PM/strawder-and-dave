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

    def layer(self, name, dx=0, dy=0, dark=0, only=None, edge=False, clip=None):
        """Stamp grid `name` at its position + (dx, dy). dark: shift every step darker (far limbs).
        edge: the pixels this layer covers get a separation line (one step darker) where they border what is behind
        (an arm over a torso of the same cloth). clip(x, y): keep only pixels where it is true (hair under a hat)."""
        g = grids().get(name)
        if g is None: return False
        mp = g['map']
        mine = set()
        for j, row in enumerate(g['rows']):
            for i, c in enumerate(row):
                if c == '.': continue
                slot, k = KEYS[c]
                slot = mp.get(slot, slot)
                if only and slot not in only: continue
                rp = slot_ramp(slot, self.s)
                if rp is not None:
                    k = min(len(RAMPS[rp]) - 1, k + dark)
                p = (g['x'] + i + dx, g['y'] + j + dy + PAD)
                if clip and not clip(p[0], p[1] - PAD): continue
                if edge: mine.add(p)
                self.px[p] = [rp, k]
        if edge:
            for (x, y) in mine:
                for q in ((x + 1, y), (x - 1, y), (x, y + 1)):
                    if q in mine or q not in self.px: continue
                    rp, k = self.px[q]
                    if rp is None: continue
                    mrp = self.px[(x, y)][0]
                    if rp == mrp or (mrp and RAMPS[mrp] is not None):
                        self.px[q] = [rp, min(len(RAMPS[rp]) - 1, k + 2)]
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


# ------------------------------------------------------------------ poses (sheet columns: 0 stand, 1-12 walk, 13-16 idle)
NW, NI, SIT_COLS = 12, 4, 3
NCOLS = 1 + NW + NI
KEY12 = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7]     # 8 hand-keyed poses (C D P U per step) spread over 12 columns
BOB = [0, 1, 1, 0, -1, -1] * 2                  # the body bob per walk column, hand-set: contact, down, passing, up
SIT = 15                                        # seated: the upper body drops this far
# front: which leg pose per key (the swinging leg lifts), and arms (fwd / back / rest)
FRONT_LEGS = {0: ('stand', 'stand'), 1: ('stand', 'up1'), 2: ('stand', 'up3'), 3: ('stand', 'up1'),
              4: ('stand', 'stand'), 5: ('up1', 'stand'), 6: ('up3', 'stand'), 7: ('up1', 'stand')}
FRONT_ARMS = {0: ('back', 'fwd'), 1: ('back', 'fwd'), 2: ('rest', 'rest'), 3: ('fwd', 'back'),
              4: ('fwd', 'back'), 5: ('fwd', 'back'), 6: ('rest', 'rest'), 7: ('back', 'fwd')}
SIDE_ARM = ['b2', 'b1', 'mid', 'f1', 'f2', 'f1', 'mid', 'b1']      # near arm per key (against the near leg)


def pose(col, row=None):
    p = dict(key=None, bob=0, breath=0, blink=False, sit=row in ('sit_down', 'sit_up'), prev_bob=0)
    if p['sit']:
        p['breath'] = -1 if col == 1 else 0
        p['blink'] = col == 2
    elif 1 <= col <= NW:
        i = col - 1
        p['key'] = KEY12[i]; p['bob'] = BOB[i]; p['prev_bob'] = BOB[i - 1]
    elif col > NW:
        k = col - 1 - NW
        p['breath'] = -1 if k in (1, 2) else 0
        p['prev_bob'] = -1 if k in (2, 3) else 0
        p['blink'] = k == 3
    return p


def _top(s):
    return s['topStyle']


def render(spec, view, col, row=None):
    """view: down / up / left / right, or a seated row sit_down / sit_up. Returns a 48 x 102 pix.Canvas."""
    if view in ('sit_down', 'sit_up'):
        row, view = view, view[4:]
    s = spec
    P = pose(col, row)
    v = 'left' if view in ('left', 'right') else view
    f = Frame(s)
    up = P['bob'] + P['breath'] + (SIT if P['sit'] else 0)      # the upper body offset
    lag = P['prev_bob'] + P['breath'] + (SIT if P['sit'] else 0)  # trailing parts (bun, satchel) follow a frame late
    ts, hs = _top(s), s['hairStyle']
    hat = s.get('hat')
    k = P['key']

    def hair(part=''):
        name = f'hair_{hs}_{v}{part}'
        if hat and has(name + '_hat'): name += '_hat'
        clip = None
        if hat: clip = lambda x, y: y - up >= HAT_CLIP[v]
        f.layer(name, dy=(lag if part == '_bun' else up), clip=None if name.endswith('_hat') else clip)

    if v in ('down', 'up'):
        if hs == 'bun' and not hat and v == 'down': hair('_bun')
        if P['sit']:
            f.layer(f'sit_legs_{v}')
        else:
            lp, rp = FRONT_LEGS[k] if k is not None else ('stand', 'stand')
            if v == 'up': lp, rp = rp, lp
            f.layer(f'leg_{lp}_L'); f.layer(f'leg_{rp}_R')
        seat = (lambda x, y: y - up <= 68) if P['sit'] else None      # seated: the hem sits on the chair
        if s.get('legwear') == 'skirt' and not P['sit']: f.layer(f'skirt_{v}', dy=up)
        f.layer(f'torso_{ts}_{v}', dy=up, clip=seat)
        if s.get('vest') and ts != 'hivis': f.layer(f'vest_{v}', dy=up)
        la, ra = FRONT_ARMS[k] if k is not None else ('rest', 'rest')
        if v == 'up': la, ra = ra, la
        sl = '_short' if ts in ('tee', 'polo') else ''
        f.layer(f'arm_{la}_L{sl}', dy=up, edge=True); f.layer(f'arm_{ra}_R{sl}', dy=up, edge=True)
        if s.get('satchel'): f.layer(f'satchel_{v}', dy=lag, edge=True)
        f.layer(f'head_{v}', dy=up)
        if v == 'down':
            if P['blink']: f.layer('eyes_shut_down', dy=up)
            if s.get('beard'): f.layer('beard_down', dy=up)
        hair('')
        if hs == 'bun' and not hat and v == 'up': hair('_bun')     # seen from behind, the bun is nearest to us
        if v == 'down' and s.get('earrings') and not hat: f.layer('earrings_down', dy=up)
        if v == 'down' and s.get('glasses'): f.layer('glasses_down', dy=up)
        if hat: f.layer(f'hardhat_{v}', dy=up)
        return f.finish()
    # profile, painted facing left; the right-facing row is the mirror image
    if k is None:
        near, far = 'sleg_stand', 'sleg_stand_far'
        na, fa = 'mid', 'mid'
    else:
        near, far = f'sleg_k{k}', f'sleg_k{(k + 4) % 8}'
        na, fa = SIDE_ARM[k], SIDE_ARM[(k + 4) % 8]
    sl = '_short' if ts in ('tee', 'polo') else ''
    f.layer(f'sarm_{fa}{sl}', dy=up, dark=1)
    hair('_back')
    if not P['sit']:
        f.layer(far, dark=1)
        f.layer(near)
    if s.get('legwear') == 'skirt': f.layer('skirt_left', dy=up)
    f.layer(f'torso_{ts}_left', dy=up)
    if s.get('vest') and ts != 'hivis': f.layer('vest_left', dy=up)
    f.layer('head_left', dy=up)
    if P['blink']: f.layer('eyes_shut_left', dy=up)
    if s.get('beard'): f.layer('beard_left', dy=up)
    hair('')
    if hs == 'bun' and not hat: hair('_bun')
    if s.get('earrings') and not hat: f.layer('earrings_left', dy=up)
    if s.get('glasses'): f.layer('glasses_left', dy=up)
    if hat: f.layer('hardhat_left', dy=up)
    f.layer(f'sarm_{na}{sl}', dy=up, edge=True)
    if s.get('satchel'): f.layer('satchel_left', dy=lag, edge=True)
    return f.finish(flip=(view == 'right'))


HAT_CLIP = {'down': 22, 'up': 22, 'left': 22}    # under a hard hat, hair shows only below this row


def supports(spec):
    """True when every layer this character needs has been drawn."""
    need = [f'torso_{_top(spec)}_down', f'torso_{_top(spec)}_left', f'torso_{_top(spec)}_up',
            f'hair_{spec["hairStyle"]}_down', f'hair_{spec["hairStyle"]}_left', f'hair_{spec["hairStyle"]}_up']
    if spec.get('beard'): need += ['beard_down', 'beard_left']
    if spec.get('glasses'): need += ['glasses_down', 'glasses_left']
    if spec.get('hat') or spec.get('vest'): need += ['hardhat_down', 'hardhat_left', 'hardhat_up']
    if spec.get('satchel'): need += ['satchel_down', 'satchel_left', 'satchel_up']
    return all(has(n) for n in need)
