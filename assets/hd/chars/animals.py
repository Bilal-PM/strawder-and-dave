"""LINESIDE HD animals: Sleeper the ginger tabby, a mallard, a Swaledale-style sheep and Kevin the pigeon.

Painted facing LEFT; right-facing rows are painted with the light mirrored and flipped (light stays upper-left).
Each sheet: one row per animation+direction, frames left to right. Manifest: anims {name: [row, frames]}.
"""
import math, os
from fig import Fig, OUT, ell, rows, line
from pix import sheet, preview, RAMPS, hash01


def finish(f, flip):
    cv = f.finish()
    return cv.flip() if flip else cv


def leg(f, x, y0, y1, rp, pid, w=2, dx=0, bias=0):
    m = []
    n = max(1, y1 - y0)
    for k in range(n + 1):
        xx = round(x + dx * k / n)
        for i in range(w): m.append((xx + i, y0 + k))
    f.paint(m, rp, pid, lo=1, hi=4, bias=bias)


# ------------------------------------------------------------------ cat (36 x 28), anchor (18, 26)
CAT = (36, 28)


def tabby(x, y):
    return -0.26 if (x * 2 + y) % 6 in (0, 1) and hash01(x // 3, y // 4, 2) > 0.25 else 0.0


def cat_head(f, hx, hy, blink=False):
    hp = f.part()
    f.paint(ell(hx, hy, 6.2, 5.4), 'ginger', hp, mode='sph', bias=0.08, lo=0, hi=4,
            tex=lambda x, y: -0.24 if (y < hy - 1.5 and x % 3 == 1) else 0)
    ep = f.part()
    for (ex, flipx) in ((hx - 4, 1), (hx + 2, -1)):   # ears
        for (dx, dy) in ((0, 0), (1, 0), (2, 0), (0, -1), (1, -1), (0, -2) if flipx > 0 else (2, -1), (1, -2)):
            f.put(ex + dx, int(hy) - 5 + dy, 'ginger', 2 if flipx > 0 else 3, ep)
        f.put(ex + 1, int(hy) - 5, 'feet_pink', 1, ep)
    mp = f.part(shadow=False)
    # muzzle and chin in cream
    for (x, y) in [(int(hx) - 5, int(hy) + 1), (int(hx) - 4, int(hy) + 1), (int(hx) - 5, int(hy) + 2), (int(hx) - 4, int(hy) + 2),
                   (int(hx) - 3, int(hy) + 2), (int(hx) - 3, int(hy) + 3), (int(hx) - 2, int(hy) + 3), (int(hx) - 4, int(hy) + 3)]:
        f.put(x, y, 'cream', 1, mp)
    f.put(int(hx) - 6, int(hy) + 1, 'feet_pink', 2, mp)                       # nose
    ex, ey = int(hx) - 3, int(hy) - 1
    if blink:
        f.put(ex, ey + 1, OUT, 0, mp); f.put(ex + 1, ey + 1, OUT, 0, mp)
    else:
        f.put(ex, ey, 'mallard_g', 1, mp); f.put(ex + 1, ey, OUT, 0, mp)
        f.put(ex, ey + 1, OUT, 0, mp); f.put(ex + 1, ey + 1, 'mallard_g', 2, mp)
        f.put(ex, ey, 'white', 0, mp)
    f.put(int(hx) - 7, int(hy) + 2, 'cream', 2, mp); f.put(int(hx) - 7, int(hy) + 3, 'cream', 3, mp)   # whiskers


def cat_sit(frame, flip):
    f = Fig(*CAT, lx=-1 if flip else 1)
    tail = f.part()
    sway = [0, 1][frame % 2]
    tm = []
    for k in range(14):
        a = math.pi * 0.1 + k / 13 * math.pi * 0.9
        x = 20 - math.cos(a) * 9 + sway * (k > 9); y = 25 - math.sin(a) * 2.2 * (k > 6)
        for d in (0, 1): tm.append((round(x), round(y) + d - 1))
    f.paint(tm, 'ginger', tail, lo=1, hi=4, bias=-0.05, tex=lambda x, y: -0.3 if x % 3 == 0 else 0)
    bp = f.part()
    f.paint(ell(20, 18, 7.4, 8.4), 'ginger', bp, mode='sph', bias=0.02, lo=0, hi=4, tex=tabby)
    cp = f.part(shadow=False)
    for (x, y) in ell(15.5, 17.5, 2.6, 5.2): f.put(x, y, 'cream', 1 if x < 16 else 2, cp)   # chest
    lp = f.part()
    for lx in (14, 17):
        leg(f, lx, 20, 25, 'ginger', lp, w=2, bias=0.05 if lx == 14 else -0.1)
        f.put(lx, 25, 'cream', 1, lp); f.put(lx + 1, 25, 'cream', 2, lp)
    cat_head(f, 15, 9.5 + (0 if frame == 0 else 0), blink=frame == 1)
    return finish(f, flip)


def cat_walk(frame, flip):
    f = Fig(*CAT, lx=-1 if flip else 1)
    ph = frame * math.pi / 2
    bob = [0, -1, 0, -1][frame]
    lp = f.part()
    for (lx, off, far) in ((11, 0, True), (24, math.pi, True)):
        s = math.sin(ph + off) * 2
        leg(f, lx, 18 + bob, 25, 'ginger', lp, dx=round(s), bias=-0.25)
    tp = f.part()
    tm = []
    for k in range(12):
        t = k / 11
        x = 28 + math.sin(t * math.pi * 0.8) * 3.5 + t * 1.5; y = 14 + bob - t * 10
        for d in (0, 1): tm.append((round(x) + d, round(y)))
    f.paint(tm, 'ginger', tp, lo=1, hi=4, tex=lambda x, y: -0.3 if y % 3 == 0 else 0)
    bp = f.part()
    f.paint(ell(19, 16 + bob, 10.6, 5.2), 'ginger', bp, mode='sph', bias=0.04, lo=0, hi=4, tex=tabby)
    for x in range(12, 26): f.put(x, 20 + bob, 'cream', 2, bp) if f.has(x, 20 + bob) and 13 < x < 24 else None
    lp2 = f.part()
    for (lx, off) in ((13, math.pi), (26, 0)):
        s = math.sin(ph + off) * 2
        leg(f, lx, 18 + bob, 25, 'ginger', lp2, dx=round(s), bias=0.06)
        f.put(lx + round(s), 25, 'cream', 1, lp2); f.put(lx + 1 + round(s), 25, 'cream', 2, lp2)
    cat_head(f, 9, 11 + bob)
    return finish(f, flip)


def cat_sleep(frame, flip):
    f = Fig(*CAT, lx=-1 if flip else 1)
    br = frame   # breathing
    bp = f.part()
    f.paint(ell(18, 20 - br * 0.5, 11.5, 6.4 + br * 0.4), 'ginger', bp, mode='sph', bias=0.05, lo=0, hi=4, tex=tabby)
    tp = f.part()
    tm = []
    for k in range(18):
        a = math.pi * 0.05 + k / 17 * math.pi * 0.95
        x = 18 - math.cos(a) * 11; y = 25 - math.sin(a) * 1.5
        tm.append((round(x), round(y))); tm.append((round(x), round(y) - 1))
    f.paint(tm, 'ginger', tp, lo=1, hi=4, bias=0.04, tex=lambda x, y: -0.3 if x % 3 == 0 else 0)
    hp = f.part()
    f.paint(ell(10, 20, 5.2, 4.2), 'ginger', hp, mode='sph', bias=0.1, lo=0, hi=4)
    ep = f.part()
    for (dx, dy) in ((0, 0), (1, 0), (0, -1), (2, 0)): f.put(8 + dx, 15 + dy, 'ginger', 2, ep)
    for (dx, dy) in ((0, 0), (1, 0), (1, -1)): f.put(12 + dx, 16 + dy, 'ginger', 3, ep)
    mp = f.part(shadow=False)
    f.put(7, 20, OUT, 0, mp); f.put(8, 21, OUT, 0, mp); f.put(9, 21, OUT, 0, mp)          # closed eye, content
    f.put(5, 22, 'feet_pink', 2, mp); f.put(6, 23, 'cream', 1, mp); f.put(7, 23, 'cream', 1, mp)
    return finish(f, flip)


# ------------------------------------------------------------------ duck (24 x 22), anchor (12, 20)
DUCK = (24, 22)


def duck_body(f, bob, swim):
    bp = f.part()
    body = ell(13, 13 + bob, 8.6, 4.8)
    f.paint(body, 'pigeon', bp, mode='sph', bias=0.1, lo=0, hi=4,
            tex=lambda x, y: -0.12 if (x + y) % 3 == 0 else 0)          # vermiculated grey flank
    # chestnut breast, dark rump, a flash of blue speculum
    for (x, y) in body:
        if x < 8: f.put(x, y, 'duckbrown', 2 if y < 13 + bob else 3, bp)
        if x > 18: f.put(x, y, 'paint_black', 2, bp)
    for x in range(12, 17): f.put(x, 12 + bob, 'paint_blue', 1, bp); f.put(x, 13 + bob, 'white', 1, bp) if x in (12, 16) else None
    for x in range(10, 19): f.step(x, 11 + bob, -1)
    tp = f.part()
    for (x, y) in [(21, 10 + bob), (22, 9 + bob), (22, 10 + bob), (21, 9 + bob)]: f.put(x, y, 'paint_black', 1, tp)
    f.put(22, 8 + bob, 'paint_black', 2, tp)                                  # the drake's curl
    for (x, y) in [(20, 11 + bob), (21, 11 + bob), (22, 11 + bob)]: f.put(x, y, 'white', 2, tp)
    hp = f.part()
    f.paint(ell(5.5, 6 + bob, 3.8, 3.6), 'mallard_g', hp, mode='sph', bias=0.1, lo=0, hi=4)
    np_ = f.part()
    for y in range(9 + bob, 11 + bob):
        for x in range(4, 8): f.put(x, y, 'mallard_g', 3, np_)
    for x in range(4, 8): f.put(x, 10 + bob, 'white', 1, np_)               # white collar
    kp = f.part(shadow=False)
    for (x, y) in [(0, 7 + bob), (1, 7 + bob), (2, 7 + bob), (1, 6 + bob), (2, 6 + bob)]: f.put(x, y, 'beak', 1 if y == 6 + bob else 2, kp)
    f.put(0, 6 + bob, 'beak', 2, kp)
    f.put(4, 5 + bob, OUT, 0, kp); f.put(4, 4 + bob, 'white', 0, kp) if False else None


def duck_swim(frame, flip):
    f = Fig(*DUCK, lx=-1 if flip else 1)
    bob = frame
    duck_body(f, bob, True)
    # waterline: cut the lower body, lay ripple arcs (translucent-free: pale water ramp pixels)
    for (x, y) in list(f.px.keys()):
        if y > 15 + bob * 0: f.erase(x, y)
    cv = f.finish()
    wp = [(x, 16) for x in range(3, 23)] + [(x, 17) for x in range(1 + frame, 21 + frame, 3)]
    for (x, y) in wp:
        if 0 <= x < 24: cv.put(x, y, RAMPS['water'][0 if y == 16 else 1])
    return cv.flip() if flip else cv


def duck_waddle(frame, flip):
    f = Fig(*DUCK, lx=-1 if flip else 1)
    bob = [0, -1, 0, -1][frame]
    tilt = [0, 1, 0, -1][frame]
    lp = f.part()
    for (lx, ph) in ((10, 0), (14, math.pi)):
        s = round(math.sin(frame * math.pi / 2 + ph) * 1.5)
        for y in range(17 + bob, 20): f.put(lx + s, y, 'beak', 2, lp)
        for x in range(lx - 2 + s, lx + 1 + s): f.put(x, 20, 'beak', 1 if x < lx + s else 2, lp)
    duck_body(f, bob + (1 if tilt else 0) * 0, False)
    return finish(f, flip)


# ------------------------------------------------------------------ sheep (60 x 46), anchor (30, 44)
SHEEP = (60, 46)


def fleece(x, y):
    # lumpy locks: little lit crescents over darker gaps
    u, v = (x + (y // 3) % 2 * 2) % 4, y % 3
    if (u, v) in ((1, 0), (2, 0)): return 0.14
    if (u, v) in ((0, 2), (3, 2)): return -0.2
    return 0.0


def sheep_frame(kind, frame, flip):
    f = Fig(*SHEEP, lx=-1 if flip else 1)
    bob = [0, -1, 0, -1][frame] if kind == 'walk' else 0
    lp = f.part()
    ph = frame * math.pi / 2
    for (lx, off) in ((18, math.pi), (40, 0)):
        s = round(math.sin(ph + off) * 2.5) if kind == 'walk' else 0
        leg(f, lx, 30 + bob, 42, 'sheepface', lp, w=2, dx=s, bias=-0.05)
        for x in range(lx + s, lx + s + 3): f.put(x, 43, 'sheepface', 3, lp)
    bp = f.part()
    body = set(ell(31, 22 + bob, 20.5, 12.5))
    for k in range(30):   # scalloped silhouette
        a = k / 30 * math.tau
        cx = 31 + math.cos(a) * 20; cy = 22 + bob + math.sin(a) * 12
        if math.sin(a) < 0.7: body |= set(ell(cx, cy, 2.3, 2.3))
    f.paint(body, 'sheep', bp, mode='sph', cx=28, rx=24, cy=18 + bob, ry=15, bias=0.08, lo=0, hi=4, tex=fleece)
    for (x, y) in body:
        if (x, y + 1) not in body: f.step(x, y, 1)
    lp2 = f.part()
    for (lx, off) in ((21, 0), (43, math.pi)):
        s = round(math.sin(ph + off) * 2.5) if kind == 'walk' else 0
        leg(f, lx, 31 + bob, 43, 'sheepface', lp2, w=2, dx=s, bias=0.25)
        for x in range(lx + s, lx + s + 3): f.put(x, 43, 'sheepface', 4, lp2)
        f.put(lx + s, 38, 'sheep', 2, lp2); f.put(lx + s + 1, 35, 'sheep', 3, lp2)   # white knee flash (Swaledale legs are speckled)
    # head: black face, white muzzle and eye rings, curled horns
    if kind == 'graze':
        hx, hy = 9, 31 + (frame % 2)
    else:
        hx, hy = 9, 17 + bob
    hp = f.part()
    head = set(ell(hx, hy, 5.8, 7.2))
    head |= set(ell(hx - 3, hy + 4, 3.4, 3.2))
    f.paint(head, 'sheepface', hp, mode='sph', bias=0.1, lo=0, hi=4)
    wp = f.part(shadow=False)
    for (x, y) in ell(hx - 4.2, hy + 5, 2.6, 2.0): f.put(x, y, 'sheep', 1 if x < hx - 4 else 2, wp)   # white nose
    f.put(hx - 6, hy + 4, 'sheepface', 3, wp)
    ex, ey = int(hx) - 3, int(hy) - 1
    for (x, y) in [(ex - 1, ey), (ex, ey - 1), (ex + 1, ey - 1), (ex + 2, ey), (ex, ey + 1), (ex + 1, ey + 1)]: f.put(x, y, 'sheep', 2, wp)
    f.put(ex, ey, OUT, 0, wp); f.put(ex + 1, ey, 'beak', 2, wp)                # amber eye
    hp2 = f.part()
    for k in range(14):                                                        # the curled horn
        a = -math.pi * 0.6 + k / 13 * math.pi * 1.5
        r = 5.0 - k * 0.2
        x = hx + 3 + math.cos(a) * r; y = hy - 1 + math.sin(a) * r
        for (ox, oy) in ((0, 0), (1, 0), (0, 1)):
            f.put(round(x) + ox, round(y) + oy, 'sandstone', (0 if k < 5 else (1 if k < 10 else 2)) + (1 if oy else 0), hp2)
    ep = f.part()
    f.put(hx + 5, hy - 1, 'sheepface', 2, ep); f.put(hx + 6, hy - 1, 'sheepface', 3, ep); f.put(hx + 6, hy, 'sheepface', 3, ep)
    # top-knot of fleece between the horns
    for (x, y) in ell(hx + 1, hy - 6, 2.6, 1.8): f.put(x, y, 'sheep', 1, ep)
    if kind == 'graze':
        gp = f.part()
        for (x, y) in [(hx - 7, hy + 7), (hx - 6, hy + 6), (hx - 8, hy + 6), (hx - 5, hy + 7)]: f.put(x, y, 'grass', 2 if x % 2 else 3, gp)
    return finish(f, flip)


# ------------------------------------------------------------------ pigeon Kevin (22 x 22), anchor (11, 20)
PIGEON = (22, 22)


def pigeon_frame(kind, frame, flip):
    f = Fig(*PIGEON, lx=-1 if flip else 1)
    fwd = [0, -2, -1, 0][frame] if kind == 'bob' else 0
    puff = 1 if (kind == 'idle' and frame == 1) else 0
    lp = f.part()
    for lx in (10, 13):
        for y in range(17, 20): f.put(lx, y, 'feet_pink', 2, lp)
        for x in range(lx - 2, lx + 1): f.put(x, 20, 'feet_pink', 1 if x < lx else 2, lp)
    tp = f.part()
    for (x, y) in [(17, 13), (18, 13), (19, 14), (20, 14), (18, 14), (19, 15), (20, 15), (21, 15)]: f.put(x, y, 'pigeon', 3, tp)
    for x in (19, 20, 21): f.put(x, 15, 'paint_black', 2, tp)                 # dark tail band
    bp = f.part()
    body = ell(12, 13, 7.6 + puff * 0.5, 5.4 + puff * 0.5)                    # he is a well-fed pigeon
    f.paint(body, 'pigeon', bp, mode='sph', bias=0.1, lo=0, hi=4)
    for x in range(11, 18): f.put(x, 12, 'paint_black', 1, bp) if x % 3 != 0 else None   # wing bars
    for x in range(12, 18): f.put(x, 14, 'paint_black', 1, bp) if x % 3 != 1 else None
    for (x, y) in body:
        if x > 11 and y > 11 and (x, y + 1) in set(body) and y < 16: pass
    np_ = f.part()
    hx, hy = 6 + fwd, 7
    neck = set(ell(8 + fwd * 0.5, 10, 3.6, 3.2)) | set(ell(hx, hy, 3.2, 3.0))
    f.paint(neck, 'pigeon', np_, mode='sph', bias=0.06, lo=0, hi=4)
    for (x, y) in neck:
        if y >= 9: f.put(x, y, 'irid', 1 if x < 7 + fwd else (2 if y < 11 else 3), np_)   # iridescent green-purple neck
    kp = f.part(shadow=False)
    f.put(hx - 2, hy - 1, 'beak', 3, kp) if False else None
    f.put(hx - 3, hy, 'paint_black', 1, kp); f.put(hx - 4, hy + 1 - 1, 'paint_black', 2, kp)
    f.put(hx - 2, hy - 1, 'white', 1, kp)                                     # cere
    f.put(hx - 1, hy - 1, 'beak', 1, kp); f.put(hx - 1, hy - 2 + 1, OUT, 0, kp) if False else None
    ex, ey = hx - 1, hy - 1
    f.put(ex, ey, 'beak', 2, kp); f.put(ex + 1, ey, OUT, 0, kp)                # orange eye, black pupil
    if kind == 'idle' and frame == 1: f.put(ex, ey, 'pigeon', 3, kp); f.put(ex + 1, ey, 'pigeon', 3, kp)   # blink
    return finish(f, flip)


# ------------------------------------------------------------------ build
def build(out):
    entries = {}
    specs = [
        ('cat', CAT, (18, 26), [('sit', cat_sit, 2), ('walk', cat_walk, 4), ('sleep', cat_sleep, 2)]),
        ('duck', DUCK, (12, 20), [('swim', duck_swim, 2), ('waddle', duck_waddle, 4)]),
        ('sheep', SHEEP, (30, 44), [('graze', lambda i, fl: sheep_frame('graze', i, fl), 2),
                                    ('walk', lambda i, fl: sheep_frame('walk', i, fl), 4)]),
        ('pigeon', PIGEON, (11, 20), [('idle', lambda i, fl: pigeon_frame('idle', i, fl), 2),
                                      ('bob', lambda i, fl: pigeon_frame('bob', i, fl), 4)]),
    ]
    looks = []
    for name, (fw, fh), anchor, anims in specs:
        cols = max(n for _, _, n in anims)
        frames, am, row = [], {}, 0
        for flip in (False, True):
            for an, fn, n in anims:
                rowf = [fn(i, flip) for i in range(n)]
                from pix import Canvas
                while len(rowf) < cols: rowf.append(Canvas(fw, fh))
                frames += rowf
                am[an + ('_right' if flip else '_left')] = [row, n]
                row += 1
                looks += [(f'{name}_{an}{i}{"R" if flip else "L"}', rowf[i]) for i in range(n)]
        im = sheet(frames, cols, fw, fh)
        fn_ = f'animal_{name}.png'
        im.save(os.path.join(out, fn_), optimize=True)
        entries['animal_' + name] = dict(id=name, file=fn_, w=im.width, h=im.height, frame=[fw, fh], cols=cols,
                                         anims=am, anchor=list(anchor), name='Kevin' if name == 'pigeon' else (
                                             'Sleeper' if name == 'cat' else None))
    preview(looks, os.path.join(out, 'preview_animals.png'), scale=4, cols=10)
    return entries
