"""LINESIDE HD people: part generators and the four-view walking renderer (48 x 96 frames, feet at (24, 93)).

render(spec, view, frame) -> pix.Canvas 48x96.
view: 'down' (front), 'up' (back), 'left', 'right'. frame 0 = standing, 1-4 = walk cycle.
A spec is a plain dict (see cast.py): ramps for skin / hair / clothes plus style switches.

Everything is painted as parts on a fig.Fig (ramp + step per pixel), back to front, then finished (occlusion,
separation lines, outline). Right-facing frames are painted as left-facing with the light mirrored, then flipped,
with asymmetric details (satchel side, hair parting, ponytail) placed for the side that faces the viewer.
"""
import math
from fig import Fig, OUT, ell, rows, line
from pix import RAMPS, hash01

W, H = 48, 96
CX = 24            # the body's centre line runs between columns 23 and 24
SH_Y = 41          # top row of the shoulders
FEET = 93          # the sole row; the anchor is (24, 93)


def mx(x):
    """Mirror a column across the centre line."""
    return 2 * CX - 1 - x


# ------------------------------------------------------------------ poses (bob is the 1px body bob)
FRONT_POSE = [  # bob, left-foot dy, right-foot dy, left-arm swing, right-arm swing (+ = forward/down)
    (0, 0, 0, 0, 0),
    (0, 0, -1, -2, 2),
    (-1, 0, -3, 0, 0),
    (0, -1, 0, 2, -2),
    (-1, -3, 0, 0, 0),
]
SIDE_POSE = [  # bob, near-foot dx, far-foot dx, near lift, far lift, near-arm swing (+ = forward)
    (0, -2, 3, 0, 0, 0),
    (0, -6, 6, 0, 0, -1),
    (-1, 0, 0, 0, -3, 0),
    (0, 6, -6, 0, 0, 1),
    (-1, 0, 0, -3, 0, 0),
]

TOP_BOT = {'coat': 76, 'jacket': 68, 'suit': 68, 'cardigan': 68, 'tee': 65, 'hivis': 67, 'hoodie': 68,
           'wax': 71, 'overalls': 66, 'polo': 65, 'anorak': 70}
TAILORED = ('coat', 'jacket', 'suit', 'wax', 'anorak')


def strands(x, y, px, py, k, seed, amp=0.10, gapw=0.22):
    """Hair lock texture: locks radiate from a pivot (crown, parting or bun). Each lock is a coherent band with a
    small tone offset of its own, a darker groove on one edge and a lit ridge on the other."""
    a = math.atan2(y + 0.5 - py, x + 0.5 - px)
    r = math.hypot(x + 0.5 - px, y + 0.5 - py)
    u = a * k + 0.25 * math.sin(r * 0.32 + seed)
    f = u - math.floor(u)
    lock = math.floor(u)
    jitter = (hash01(int(lock) + 50, int(seed * 10), 7) - 0.5) * amp * 2
    if f < gapw: return jitter - 0.27
    if f > 0.62 and f < 0.86: return jitter + 0.09
    return jitter


def face_step(dx, yy, mask, x, y):
    """Hand-tuned face light: faces stay bright and friendly; shade the far (right) cheek and the jaw only."""
    i = 1
    if dx > 7.5 and yy > 24: i = 2
    if (x, y + 1) not in mask or (x, y + 2) not in mask and dx > 2: i = 2          # jaw line
    if dx > 10.2 and yy > 30: i = 3
    if (x, y + 1) not in mask and dx > 4: i = 3
    if dx < -8 and yy < 30: i = 1
    return i


class Person:
    def __init__(self, spec, view, frame):
        self.s = spec; self.view = view; self.frame = frame
        self.side = view in ('left', 'right')
        self.near = 'right' if view == 'left' else 'left'   # the character's side that faces us in profile
        self.f = Fig(W, H, lx=(-1 if view == 'right' else 1))
        if self.side:
            self.b, self.nfx, self.ffx, self.nl, self.fl, self.swing = SIDE_POSE[frame]
        else:
            self.b, self.lfy, self.rfy, self.las, self.ras = FRONT_POSE[frame]
        ts = spec['topStyle']
        self.bot = TOP_BOT[ts] if ts != 'coat' else spec.get('hem', 76)
        self.bot += self.b
        self.top = SH_Y + self.b
        self.hair_mask = set()

    def sleeve_ramp(self):
        s = self.s; ts = s['topStyle']
        if ts == 'hivis': return s.get('sleeve', 'navy')
        return s.get('sleeve', s['top'])

    def short_sleeves(self):
        return self.s['topStyle'] in ('tee', 'polo') or self.s.get('short_sleeves')

    # ============================================================================ FRONT / BACK
    def draw_frontback(self):
        back = self.view == 'up'
        self.hair_behind_fb(back)
        if not back: self.hood_front()
        self.legs_fb(back)
        self.skirt_fb()
        self.torso_fb(back)
        if back: self.hood_back()
        self.arms_fb(back)
        self.bag_fb(back)
        self.head_fb(back)
        self.hat_fb(back)

    # ---- long hair hanging behind the shoulders
    def hair_behind_fb(self, back):
        s, f, b = self.s, self.f, self.b
        if s['hairStyle'] != 'long' or back: return
        hr = s['hair']; pid = f.part(sep=False)
        m = []
        for y in range(30 + b, 56 + b):
            for x in range(9, 39):
                inner = abs(x + 0.5 - CX) < 10
                if inner and y > 36 + b: continue
                if y > 52 + b and abs(x + 0.5 - CX) > 14 - (y - 52 - b): continue
                m.append((x, y))
        f.paint(m, hr, pid, bias=-0.14, lo=2, hi=4, tex=lambda x, y: strands(x, y, CX, -12 + b, 14, 3))

    # ---- legs and feet
    def legs_fb(self, back):
        s, f, b = self.s, self.f, self.b
        lw = s.get('legwear', 'trousers'); lr = s.get('legs', 'charcoal'); ft = s.get('feet', 'boots')
        fr = s.get('feet_ramp', 'leather')
        for side, dy in (('L', self.lfy), ('R', self.rfy)):
            x0 = 14 if side == 'L' else 25          # footwear's left column (9 wide)
            legtop = 64 + b
            if lw == 'shorts':
                lb = 74 + b
            else:
                lb = 88 + dy
            lx0 = x0 + 1 if side == 'L' else x0
            lx1 = lx0 + 7
            lrp = lr if lw != 'skirt' else s.get('tights', lr)
            m = rows({y: (lx0, lx1) for y in range(legtop, lb + 1)})
            pid = f.paint(m, lrp, f.part(), bias=0.06 if side == 'L' else -0.06, lo=1, hi=4)
            if lw == 'trousers':
                for y in range(legtop + 8, lb - 1): f.step(lx0 + 3, y, 1)            # crease
                for y in range(legtop + 8, lb - 1): f.step(lx0 + 2, y, -1)
                for x in range(lx0, lx1 + 1): f.step(x, lb, 1)                     # break over the shoe
            if lw == 'shorts':
                for x in range(lx0, lx1 + 1): f.step(x, lb, 1)
                sm = rows({y: (lx0 + 1, lx1 - 1) for y in range(lb + 1, 88 + dy)})
                f.paint(sm, s['skin'], f.part(), bias=0.1, lo=1, hi=3)
                sk = rows({y: (lx0 + 1, lx1 - 1) for y in range(83 + dy, 87 + dy)})
                f.paint(sk, s.get('socks', 'white'), f.part(), lo=1, hi=3)
            self.foot_fb(x0, dy, ft, fr, side, back)

    def foot_fb(self, x0, dy, ft, fr, side, back):
        f, s = self.f, self.s
        L = side == 'L'
        base = FEET + dy
        if ft == 'wellies':
            m = rows({y: (x0 + (0 if y > base - 5 else 1), x0 + (8 if y > base - 5 else 7)) for y in range(base - 15, base + 1)})
            pid = f.paint(m, s.get('welly', 'welly'), f.part(), lo=1, hi=4, bias=0.05)
            for x in range(x0 + 1, x0 + 8): f.step(x, base - 15, -1); f.step(x, base - 14, 1)
            for x in range(x0, x0 + 9): f.put(x, base, 'sole', 2, pid)
            f.put(x0 + (2 if L else 6), base - 3, s.get('welly', 'welly'), 0, pid)
            return
        if ft == 'trainers':
            m = rows({y: (x0, x0 + 8) for y in range(base - 5, base + 1)})
            m = [p for p in m if not (p[1] == base - 5 and p[0] in (x0, x0 + 8))]
            pid = f.paint(m, 'trainer', f.part(), lo=1, hi=3)
            for x in range(x0, x0 + 9): f.put(x, base, 'sole', 1, pid); f.put(x, base - 1, 'trainer', 3, pid)
            if not back:
                for x in range(x0 + 2, x0 + 7): f.put(x, base - 3, s.get('accent', 'paint_red'), 1 if x < x0 + 4 else 2, pid)
                f.put(x0 + 4, base - 5, 'trainer', 3, pid)
            return
        if ft == 'shoes':
            m = rows({base - 4: (x0 + 1, x0 + 7), base - 3: (x0, x0 + 8), base - 2: (x0, x0 + 8), base - 1: (x0, x0 + 8)})
            pid = f.paint(m, fr, f.part(), lo=1, hi=4, mode='sph')
            if not back:
                f.put(x0 + (2 if L else 5), base - 3, fr, 0, pid); f.put(x0 + (3 if L else 6), base - 3, fr, 1, pid)
            for x in range(x0, x0 + 9): f.put(x, base, 'sole', 2, pid)
            return
        # boots: shaft, laced front, lit toe cap, welted sole
        y0 = base - 10
        spans = {}
        for y in range(y0, base + 1):
            spans[y] = (x0 + 1, x0 + 7) if y < y0 + 5 else (x0, x0 + 8)
        m = rows(spans)
        m = [p for p in m if not (p[1] == base - 1 and p[0] in (x0, x0 + 8))]
        pid = f.paint(m, fr, f.part(), lo=1, hi=4, bias=0.02)
        for x in range(x0 + 1, x0 + 8): f.step(x, y0, -1); f.step(x, y0 + 1, 1)     # rolled collar
        if not back:
            for (dx_, dy_) in ((3, 2), (4, 3), (3, 4), (4, 5)):
                f.put(x0 + dx_ + (0 if L else 1), y0 + dy_, 'gold', 2 if dy_ % 2 == 0 else 3, pid)   # laces
            for dy_ in (2, 3, 4, 5): f.step(x0 + (2 if L else 6), y0 + dy_, 1)                     # tongue edge
            tx = x0 + (2 if L else 5)
            f.put(tx, y0 + 7, fr, 0, pid); f.put(tx + 1, y0 + 7, fr, 1, pid); f.put(tx, y0 + 8, fr, 1, pid)
        else:
            for x in range(x0 + 1, x0 + 8): f.step(x, y0 + 6, 1)                          # heel counter
            f.put(x0 + 3, y0 + 1, fr, 3, pid); f.put(x0 + 4, y0 + 1, fr, 3, pid)            # pull tab
        for x in range(x0, x0 + 9): f.put(x, base, 'sole', 2, pid); f.put(x, base - 1, fr, 3, pid)

    # ---- skirt (under the coat hem)
    def skirt_fb(self):
        s, f, b = self.s, self.f, self.b
        if s.get('legwear') != 'skirt': return
        ts = s['topStyle']
        sk_top = (self.bot - 5) if ts == 'coat' else 64 + b
        sk_bot = 84 + b
        span = {}
        for y in range(sk_top, sk_bot + 1):
            t = (y - sk_top) / max(1, sk_bot - sk_top)
            w = 12 + t * 2.5
            span[y] = (round(CX - w), round(CX + w - 1))
        pid = f.part()
        skr = s.get('skirt', 'charcoal')
        # knife pleats: a dark fold every 4 columns, the pleat face lit on its left
        f.paint(rows(span), skr, pid, lo=1, hi=4,
                tex=lambda x, y: (-0.22 if x % 4 == 0 else (0.06 if x % 4 == 1 else 0)))
        for x in range(span[sk_bot][0], span[sk_bot][1] + 1):
            f.step(x, sk_bot, 1)
            if x % 4 == 0: f.step(x, sk_bot, 1)
        for x in range(span[sk_bot - 1][0], span[sk_bot - 1][1] + 1):
            if x % 4 == 2: f.step(x, sk_bot - 1, -1)

    # ---- torso garments
    def torso_fb(self, back):
        s, f, b = self.s, self.f, self.b
        ts = s['topStyle']; tr = s['top']; sh = s.get('sh', 12)
        top, bot = self.top, self.bot
        span = {}
        flare = s.get('flare', 3.4 if ts == 'coat' else 1.4)
        belly = s.get('belly', 0)
        for y in range(top, bot + 1):
            t = (y - top) / max(1, bot - top)
            w = sh - 0.4 + t * flare + belly * math.sin(min(1, t * 1.3) * math.pi) * 0.8
            if y == top: w = sh - 5
            elif y == top + 1: w = sh - 2.5
            elif y == top + 2: w = sh - 1.2
            span[y] = (round(CX - w), round(CX + w - 1))
        self.torso_span = span
        pid = f.part()
        f.paint(rows(span), tr, pid, bias=0.05 + s.get('top_bias', 0), lo=1, hi=4, tex=lambda x, y: self.fold_tex(x, y, top, bot, ts))
        for x in range(span[bot][0], span[bot][1] + 1): f.step(x, bot, 1)
        self.torso_pid = pid
        if back: self.torso_back_details(span, top, bot, ts, tr, pid)
        else: self.torso_front_details(span, top, bot, ts, tr, pid)
        if s.get('vest') and ts != 'hivis': self.vest_fb(span, top, back)

    def fold_tex(self, x, y, top, bot, ts):
        """Soft vertical folds deepening towards the hem (a lit ridge beside each groove), like the reference coat."""
        t = (y - top) / max(1, bot - top)
        if ts in ('tee', 'polo', 'hivis'): return 0
        v = 0
        for fx, st, start in ((CX - 9, 1, .45), (CX - 4, .7, .6), (CX + 6, 1, .5), (CX + 10, .7, .62)):
            if t > start:
                if x == fx: v -= 0.22 * st
                if x == fx - 1: v += 0.08 * st
        return v

    def torso_front_details(self, span, top, bot, ts, tr, pid):
        s, f, b = self.s, self.f, self.b
        inner = s.get('inner', 'cream')
        if ts in TAILORED:
            # shirt collar in the V
            vp = f.part()
            for dy in range(0, 9):
                hw = 4 - dy // 2
                for x in range(CX - hw, CX + hw):
                    f.put(x, top + dy, inner, 1 if x < CX - 1 else 2, vp)
            f.put(CX - 4, top, inner, 0, vp); f.put(CX - 3, top + 1, inner, 0, vp)       # collar points catch light
            f.put(CX + 3, top, inner, 2, vp); f.put(CX + 2, top + 1, inner, 3, vp)
            if s.get('scarf'):
                sc = f.part(); sr = s['scarf']
                knot = [(CX - 2, top + 1), (CX - 1, top + 1), (CX, top + 1), (CX + 1, top + 1),
                        (CX - 2, top + 2), (CX - 1, top + 2), (CX, top + 2), (CX + 1, top + 2),
                        (CX - 1, top + 3), (CX, top + 3)]
                tail = [(CX - 2, top + 4), (CX - 1, top + 4), (CX, top + 4), (CX - 2, top + 5), (CX - 1, top + 5),
                        (CX, top + 5), (CX - 2, top + 6), (CX - 1, top + 6), (CX, top + 6), (CX - 1, top + 7),
                        (CX, top + 7), (CX - 1, top + 8)]
                for (x, y) in knot: f.put(x, y, sr, 1 if x < CX else 2, sc)
                for (x, y) in tail: f.put(x, y, sr, 2 if x < CX else 3, sc)
                f.put(CX - 2, top + 1, sr, 0, sc); f.put(CX - 1, top + 3, sr, 3, sc)
                f.put(CX - 2, top + 5, sr, 1, sc); f.put(CX, top + 3, sr, 3, sc)
            elif s.get('tie'):
                tp = f.part(); tie = s['tie']
                for y in range(top + 2, top + 15):
                    w = 1 if y < top + 4 else 2
                    for x in range(CX - w, CX + w - (1 if y < top + 4 else 0) + (1 if y < top + 4 else 0)):
                        f.put(x, y, tie, 1 if x < CX else 2, tp)
                f.put(CX - 1, top + 2, tie, 0, tp)
            # lapels: lit edge on the left lapel, a shaded edge on the right one
            for dy in range(0, 9):
                xl = CX - 5 + dy // 2
                f.put(xl, top + dy + 1, tr, 0 if dy < 3 else 1, pid)
                f.put(xl + 1, top + dy + 1, tr, 1, pid)
                f.put(mx(xl), top + dy + 1, tr, 3, pid)
            if ts == 'coat':
                for y in range(top + 10, bot + 1): f.step(CX + 1, y, 1)       # the overlap edge
                for y in range(top + 10, bot + 1): f.step(CX + 2, y, -1)
                for yy in range(top + 12, bot - 5, 6):                          # double-breasted brass buttons
                    for bx in (CX - 6, CX + 4):
                        self.button(bx, yy, pid)
                py = bot - 12
                for px0 in (span[py][0] + 3, CX + 6):                           # flap pockets with stitching
                    for x in range(px0, px0 + 6):
                        f.step(x, py, -1); f.step(x, py + 1, 2); f.step(x, py + 2, 1)
                    for x in range(px0, px0 + 6, 2): f.step(x, py - 1, -1)
                    f.put(px0 + 2, py + 1, 'gold', 2, pid)
            else:
                # single-breasted: front edge, two buttons, jetted pockets, breast pocket
                for y in range(top + 9, bot + 1): f.step(CX, y, 1)
                for y in range(top + 9, bot + 1): f.step(CX - 1, y, -1)
                if ts == 'anorak':
                    for y in range(top + 6, bot + 1):
                        f.put(CX, y, 'metal', 2 if y % 2 else 3, pid); f.put(CX - 1, y, tr, 1, pid)
                    f.put(CX - 1, top + 8, 'metal', 1, pid)
                    for x in range(span[bot][0], span[bot][1] + 1): f.step(x, bot - 1, 1)
                elif ts == 'wax':
                    for yy in range(top + 11, bot - 2, 6): self.button(CX - 2, yy, pid, ramp='leather')
                else:
                    btn = s.get('button', 'charcoal' if ts == 'suit' else 'gold')
                    for yy in (top + 14, top + 20): self.button(CX - 2, yy, pid, ramp=btn)
                py = bot - 8
                for px0 in (span[py][0] + 3, CX + 4):
                    for x in range(px0, px0 + 5): f.step(x, py, 2 if ts != 'wax' else 1)
                    if ts in ('wax', 'anorak'):
                        for x in range(px0, px0 + 5): f.step(x, py - 1, -1); f.step(x, py + 4, 1)
                        for y in range(py, py + 5): f.step(px0 + 4, y, 1)
                if ts in ('suit', 'jacket'):
                    for x in range(CX + 5, CX + 9): f.step(x, top + 10, 1)      # breast pocket welt
                    if s.get('pocket_square'): f.put(CX + 6, top + 9, s['pocket_square'], 1, pid); f.put(CX + 7, top + 9, s['pocket_square'], 2, pid)
                if ts == 'wax':   # corduroy collar
                    cp = f.part()
                    for dy in range(0, 4):
                        for x in range(CX - 8 + dy, CX - 4 + dy // 2):
                            f.put(x, top + dy, 'cord', 1 if (x + dy) % 2 else 2, cp)
                            f.put(mx(x), top + dy, 'cord', 3, cp)
        elif ts == 'cardigan':
            it = s.get('inner', 'cream')
            ip = f.part(shadow=False)
            for y in range(top, bot - 1):
                hw = 3 if y < top + 6 else 2
                for x in range(CX - hw, CX + hw):
                    f.put(x, y, it, 1 if x < CX else 2, ip)
            for x in range(CX - 3, CX + 3): f.put(x, top, s['skin'], 2, ip)
            for y in range(top + 2, bot + 1):
                f.step(CX - 3, y, 1); f.step(CX + 2, y, 1)
                f.step(CX - 4, y, -1)
            for yy in range(top + 9, bot - 2, 6): self.button(CX - 5, yy, pid, ramp='cream', small=True)
            for x in range(span[bot][0], span[bot][1] + 1):               # ribbed hem
                f.step(x, bot - 1, x % 2); f.step(x, bot - 2, x % 2)
            for y in range(top + 6, bot - 3):                              # knit texture
                for x in range(span[y][0] + 1, span[y][1]):
                    if (x + y) % 4 == 0 and f.get(x, y) and f.get(x, y)[2] == pid: f.step(x, y, 1) if hash01(x, y, 9) > .5 else None
            if s.get('apron'): self.apron_fb(top, bot)
        elif ts in ('tee', 'polo', 'hoodie', 'overalls'):
            np_ = f.part(shadow=False)
            for x in range(CX - 4, CX + 4): f.put(x, top, s['skin'], 2, np_)
            for x in range(CX - 3, CX + 3): f.put(x, top + 1, s['skin'], 3, np_)
            for x in range(CX - 5, CX + 5): f.step(x, top + (2 if abs(x + .5 - CX) < 3 else 1), 1)   # neckband
            if ts == 'polo':
                cp = f.part()
                for (x, y) in [(CX - 5, top), (CX - 4, top), (CX - 4, top + 1), (CX - 3, top + 2), (CX - 2, top + 2)]:
                    f.put(x, y, tr, 0, cp); f.put(mx(x), y, tr, 2, cp)
                for y in range(top + 2, top + 7): f.step(CX, y, 1)
                for y in (top + 3, top + 6): f.put(CX - 1, y, 'white', 1, cp)
            if ts == 'hoodie':
                hp = f.part()
                for x in range(CX - 7, CX + 7): f.put(x, top, tr, 1 if x < CX else 2, hp)
                for x in range(CX - 6, CX + 6): f.put(x, top + 1, tr, 2 if x < CX else 3, hp)
                for x in range(CX - 5, CX + 5): f.put(x, top + 2, tr, 3, hp)
                for y in range(top + 3, top + 10):
                    f.put(CX - 3, y, 'white', 1, hp); f.put(CX + 2, y, 'white', 3, hp)
                f.put(CX - 3, top + 10, 'metal', 2, hp); f.put(CX + 2, top + 10, 'metal', 3, hp)
                py = bot - 11
                for x in range(CX - 6, CX + 6): f.step(x, py, 1)
                for y in range(py, bot - 2): f.step(CX - 7 + (y - py) // 4, y, 1); f.step(mx(CX - 7 + (y - py) // 4), y, 1)
                for x in range(span[bot][0], span[bot][1] + 1): f.step(x, bot - 1, 1); f.step(x, bot - 2, x % 2)
            if ts == 'overalls':
                orp = s.get('legs', tr); op = f.part()
                for y in range(top + 8, bot + 1):
                    for x in range(CX - 6, CX + 6):
                        f.put(x, y, orp, 1 if x < CX - 2 else (2 if x < CX + 3 else 3), op)
                for y in range(top, top + 9):
                    for bx in (CX - 8, CX - 7): f.put(bx, y, orp, 1 if bx == CX - 8 else 2, op)
                    for bx in (CX + 6, CX + 7): f.put(bx, y, orp, 3, op)
                self.button(CX - 7, top + 8, op, ramp='gold'); self.button(CX + 5, top + 8, op, ramp='gold')
                for x in range(CX - 3, CX + 3): f.step(x, top + 13, 1); f.step(x, top + 12, -1)   # bib pocket
                for y in range(top + 13, top + 18): f.step(CX - 3, y, 1); f.step(CX + 2, y, 1)
                f.put(CX + 1, top + 11, 'metal', 1, op); f.put(CX + 1, top + 12, 'metal', 3, op)  # a pencil
            if ts in ('tee', 'polo'):
                for y in range(top + 4, bot - 2):          # soft drape lines
                    if y % 7 == 0: f.step(CX + 7, y, 1)
            if s.get('apron'): self.apron_fb(top, bot)
        elif ts == 'hivis':
            self.hivis_marks(span, top, bot, pid, back=False)
            # a zip and the navy collar of the fleece underneath
            for y in range(top + 5, bot + 1): f.put(CX, y, 'hivis', 3, pid); f.put(CX - 1, y, 'hivis', 1, pid)
            np_ = f.part(shadow=False)
            for x in range(CX - 4, CX + 4): f.put(x, top, s['skin'], 2, np_)
            sl = self.sleeve_ramp()
            for x in range(CX - 5, CX + 5): f.put(x, top + 1, sl, 2 if x < CX else 3, np_)
            for x in range(CX - 3, CX + 3): f.put(x, top + 2, sl, 3, np_)

    def button(self, x, y, pid, ramp='gold', small=False):
        f = self.f
        if small:
            f.put(x, y, ramp, 0, pid); f.put(x, y + 1, ramp, 3, pid); return
        f.put(x, y, ramp, 0, pid); f.put(x + 1, y, ramp, 1, pid)
        f.put(x, y + 1, ramp, 2, pid); f.put(x + 1, y + 1, ramp, 3, pid)
        f.step(x + 1, y + 2, 1); f.step(x, y + 2, 1)

    def apron_fb(self, top, bot):
        f, b = self.f, self.b
        ap = f.part()
        m = []
        for y in range(top + 7, 80 + b):
            w = 8 if y > top + 14 else 6
            for x in range(CX - w, CX + w): m.append((x, y))
        f.paint(m, 'apron', ap, lo=1, hi=3, tex=lambda x, y: (-0.2 if (x - CX) % 5 == 2 and y > top + 20 else 0))
        for y in range(top, top + 8):
            f.put(CX - 6, y, 'apron', 1, ap); f.put(CX + 5, y, 'apron', 3, ap)
        for x in range(CX - 8, CX + 8): f.step(x, top + 15, 1)          # waist tie
        f.put(CX - 9, top + 15, 'apron', 1, ap); f.put(CX + 8, top + 15, 'apron', 3, ap)
        for x in range(CX - 4, CX + 4): f.step(x, top + 20, 1)          # pocket
        for y in range(top + 20, top + 25): f.step(CX - 4, y, 1); f.step(CX + 3, y, 1)
        f.put(CX - 5, top + 25, 'wheat' if 'wheat' in RAMPS else 'sand', 1, ap)  # a dusting of flour

    def hivis_marks(self, span, top, bot, pid, back):
        f = self.f
        for yy in (bot - 11, bot - 5):
            for x in range(span[yy][0], span[yy][1] + 1):
                f.put(x, yy, 'reflect', 0 if x < CX - 6 else (1 if x < CX + 4 else 2), pid)
                f.put(x, yy + 1, 'reflect', 2 if x < CX else 3, pid)
        for y in range(top + 1, bot - 11):
            for bx in ((CX - 6, CX + 5) if not back else (CX - 6, CX + 5)):
                f.put(bx, y, 'reflect', 1 if bx < CX else 2, pid)
                f.put(bx + (1 if bx < CX else -1), y, 'reflect', 2 if bx < CX else 3, pid)
        if back:   # X braces on the back
            for k in range(0, 10):
                pass

    def vest_fb(self, span, top, back):
        f, b = self.f, self.b
        vb = 69 + b
        vp = f.part()
        m = []
        for y in range(top + 1, vb + 1):
            x0, x1 = span[min(y, max(span))]
            x0 += 1 if y < top + 5 else 0; x1 -= 1 if y < top + 5 else 0
            for x in range(x0 - 1 if y > top + 4 else x0, x1 + (2 if y > top + 4 else 1)):
                if not back and y < top + 11 and abs(x + 0.5 - CX) < (top + 11 - y) * 0.75: continue   # V neck
                m.append((x, y))
        f.paint(m, 'hivis', vp, bias=0.12, lo=1, hi=3)
        ms = set(m)
        vspan = {}
        for x, y in m:
            a, c = vspan.get(y, (99, -1)); vspan[y] = (min(a, x), max(c, x))
        for yy in (vb - 10, vb - 4):
            for x in range(vspan[yy][0], vspan[yy][1] + 1):
                f.put(x, yy, 'reflect', 0 if x < CX - 6 else (1 if x < CX + 4 else 2), vp)
                f.put(x, yy + 1, 'reflect', 2 if x < CX else 3, vp)
        for y in range(top + 1, vb - 10):
            for bx in (CX - 7, CX + 6):
                if (bx, y) in ms:
                    f.put(bx, y, 'reflect', 1 if bx < CX else 2, vp)
                    f.put(bx + (1 if bx < CX else -1), y, 'reflect', 2 if bx < CX else 3, vp)
        for x in range(vspan[vb][0], vspan[vb][1] + 1): f.step(x, vb, 1)
        if not back:
            for y in range(top + 11, vb + 1): f.step(CX, y, 1)
            f.put(CX - 1, top + 14, 'metal', 1, vp); f.put(CX - 1, top + 20, 'metal', 1, vp)   # poppers
        self.vest_mask = ms

    def torso_back_details(self, span, top, bot, ts, tr, pid):
        f, s = self.f, self.s
        if ts in TAILORED:
            for y in range(bot - 12, bot + 1): f.step(CX, y, 1)          # centre vent
            for y in range(bot - 12, bot + 1): f.step(CX - 1, y, -1)
            for x in range(span[top + 6][0] + 2, span[top + 6][1] - 1): f.step(x, top + 6, 1 if ts != 'coat' else 0)
            if ts == 'coat':
                for x in range(CX - 7, CX + 7): f.step(x, top + 22, 1)   # half-belt
                for x in range(CX - 7, CX + 7): f.step(x, top + 24, 1)
                self.button(CX - 7, top + 22, pid); self.button(CX + 5, top + 22, pid)
            if ts == 'wax':
                cp = f.part()
                for x in range(CX - 8, CX + 8):
                    f.put(x, top, 'cord', 1 if x < CX else 2, cp); f.put(x, top + 1, 'cord', 2 if x < CX else 3, cp)
        if ts == 'hivis': self.hivis_marks(span, top, bot, pid, back=True)
        if ts == 'cardigan':
            for x in range(span[bot][0], span[bot][1] + 1): f.step(x, bot - 1, x % 2); f.step(x, bot - 2, x % 2)
        if ts == 'overalls':
            orp = s.get('legs', tr); op = f.part()
            for y in range(top + 1, top + 14):
                t = (y - top) / 13
                for bx in (round(CX - 8 + t * 5), round(CX + 7 - t * 5)):
                    f.put(bx, y, orp, 2, op); f.put(bx + 1, y, orp, 3, op)
            for y in range(top + 14, bot + 1):
                for x in range(CX - 6, CX + 6): f.put(x, y, orp, 2 if x < CX else 3, op)
        if ts == 'hoodie':
            hp = f.part()
            for y in range(top, top + 11):
                w = 8 - max(0, y - top - 4)
                for x in range(CX - w, CX + w):
                    f.put(x, y, tr, 1 if x < CX - 2 else (2 if x < CX + 3 else 3), hp)
            for x in range(CX - 4, CX + 4): f.step(x, top + 10, 1)
            for y in range(top + 1, top + 10): f.step(CX, y, 1)
        if ts in ('tee', 'polo'):
            for x in range(CX - 4, CX + 4): f.step(x, top + 1, 1)

    # ---- hood (bunched behind the neck from the front; lying over the back from behind)
    def hood_front(self):
        s, f, b = self.s, self.f, self.b
        if not s.get('hood'): return
        hp = f.part()
        f.paint(ell(CX, 42.5 + b, 12.4, 4.6), s['top'], hp, mode='sph', bias=-0.06, lo=1, hi=4)

    def hood_back(self):
        s, f, b = self.s, self.f, self.b
        if not s.get('hood'): return
        hp = f.part()
        m = ell(CX, 46 + b, 11.2, 7.6)
        ms = set(m)
        f.paint(m, s['top'], hp, mode='sph', bias=0.04, lo=1, hi=4)
        for (x, y) in m:
            if (x, y + 1) not in ms: f.step(x, y, 1)
            if (x, y + 2) not in ms and (x, y + 1) in ms: f.step(x, y, -1) if abs(x + .5 - CX) < 6 else None
        for y in range(40 + b, 50 + b): f.step(CX, y, 1)         # the hood's centre seam
        for (x, y) in [(CX - 3, 48 + b), (CX - 2, 49 + b), (CX + 2, 48 + b), (CX + 1, 49 + b)]: f.step(x, y, 1)

    # ---- arms and hands
    def arms_fb(self, back):
        s, f, b = self.s, self.f, self.b
        sh = s.get('sh', 12); ts = s['topStyle']
        sleeve = self.sleeve_ramp()
        short = self.short_sleeves()
        vested = s.get('vest') or ts == 'hivis'
        for side, sw in (('L', self.las), ('R', self.ras)):
            if back: sw = -sw
            L = side == 'L'
            sgn = -1 if L else 1
            xo = CX - sh - 3 if L else CX + sh - 3          # arm's left column (6 wide)
            top = 42 + b
            hand_y = 64 + b + sw
            m = []
            for y in range(top, hand_y):
                t = (y - top) / max(1, hand_y - top)
                dx = round(sgn * t * 1.2)
                if y == top: xs = range(xo + 1, xo + 5) if L else range(xo + 1, xo + 5)
                else: xs = range(xo + dx, xo + dx + 6)
                for x in xs: m.append((x, y))
            ap = f.part(sepk=3)
            if short:
                cut = top + 8
                f.paint([p for p in m if p[1] <= cut], sleeve, ap, lo=1, hi=4, bias=0.08 if L else -0.02)
                for x in range(xo - 1, xo + 8): f.step(x, cut, 1)
                sp = f.part(sepk=1)
                f.paint([(x + (1 if L else 0), y) for (x, y) in m if y > cut and x < xo + 5 + round(sgn * 1.2)],
                        s['skin'], sp, lo=1, hi=3, bias=0.18 if L else 0.05)
            else:
                f.paint(m, sleeve, ap, lo=1, hi=4, bias=(0.08 if L else -0.02) + (s.get('top_bias', 0) if sleeve == s['top'] else 0))
                cuff = s.get('cuff')
                for x in range(xo - 2, xo + 8):
                    p = f.get(x, hand_y - 3)
                    if p and p[2] == ap:
                        f.step(x, hand_y - 3, 1)
                        if ts in ('cardigan', 'hoodie') or cuff:
                            f.step(x, hand_y - 2, -1 + (x % 2)); f.step(x, hand_y - 1, x % 2)
                ey = top + 11                                           # elbow creases
                f.step(xo + (3 if L else 2), ey, 1); f.step(xo + (4 if L else 1), ey + 1, 1)
                f.step(xo + (3 if L else 2), ey + 3, 1)
                if ts == 'coat' and not back:
                    self.button(xo + (3 if L else 1), hand_y - 4, ap, small=True)
            # hand
            hx = xo + round(sgn * 1.2)
            hp = f.part()
            hm = [(hx + 1, hand_y), (hx + 2, hand_y), (hx + 3, hand_y), (hx + 4, hand_y),
                  (hx + 1, hand_y + 1), (hx + 2, hand_y + 1), (hx + 3, hand_y + 1), (hx + 4, hand_y + 1),
                  (hx + 1, hand_y + 2), (hx + 2, hand_y + 2), (hx + 3, hand_y + 2), (hx + 4, hand_y + 2),
                  (hx + 2, hand_y + 3), (hx + 3, hand_y + 3)]
            hm.append((hx, hand_y + 1) if L else (hx + 5, hand_y + 1))    # thumb
            f.paint(hm, s.get('gloves', s['skin']), hp, mode='sph', lo=1, hi=3, bias=0.12 if L else 0.02)
            f.step(hx + 2, hand_y + 2, 1); f.step(hx + 3, hand_y + 2, 1)      # knuckle shadow
            self.hand_props(side, hx, hand_y, back)

    def hand_props(self, side, hx, hy, back):
        s, f = self.s, self.f
        right_hand = (side == 'R') != back          # the character's right hand is on the viewer's left in front view
        right_hand = not right_hand
        if s.get('carry') == 'tote' and not right_hand:
            cp = f.part()
            m = rows({y: (hx - 1, hx + 7) for y in range(hy + 5, hy + 17)})
            m = [p for p in m if not (p[1] == hy + 16 and p[0] in (hx - 1, hx + 7))]
            f.paint(m, s.get('tote', 'cream'), cp, lo=1, hi=4)
            for y in range(hy + 2, hy + 5): f.put(hx + 1, y, s.get('tote', 'cream'), 3, cp); f.put(hx + 5, y, s.get('tote', 'cream'), 3, cp)
            if not back:
                f.put(hx, hy + 4, 'wood', 1, cp); f.put(hx, hy + 3, 'wood', 0, cp); f.put(hx + 1, hy + 4, 'wood', 2, cp)   # a loaf
                f.put(hx + 6, hy + 4, 'leaf', 1, cp); f.put(hx + 7, hy + 3, 'leaf', 2, cp); f.put(hx + 6, hy + 3, 'leaf', 0, cp)  # leeks
                for x in range(hx + 1, hx + 6): f.step(x, hy + 9, 1)
        if s.get('leash') and right_hand:
            lp = f.part(shadow=False)
            for k in range(0, 14): f.put(hx + 2 + (k // 5) * (1 if side == 'R' else -1), hy + 3 + k, 'wine', 2, lp)
            f.put(hx + 2 + (2 if side == 'R' else -2), hy + 17, 'metal', 1, lp)
        if s.get('stick') and not right_hand:
            sp = f.part()
            for y in range(hy - 1, FEET + 1):
                f.put(hx + 5 if side == 'R' else hx, y, 'wood_dark', 1 if y < hy + 3 else 2, sp)
            f.put(hx + 4 if side == 'R' else hx + 1, hy - 1, 'wood_dark', 1, sp)
            f.put(hx + 3 if side == 'R' else hx + 2, hy - 1, 'wood_dark', 2, sp)
        if s.get('carry') == 'parcel' and not right_hand:
            cp = f.part()
            m = rows({y: (hx - 2, hx + 6) for y in range(hy - 4, hy + 3)})
            f.paint(m, 'dirt', cp, mode='sph', lo=1, hi=3)
            for x in range(hx - 2, hx + 7): f.put(x, hy - 1, 'wood_dark', 2, cp)

    # ---- satchel / bags on a cross-body strap
    def bag_fb(self, back):
        s, f, b = self.s, self.f, self.b
        if not s.get('satchel'): return
        br = s.get('bag_ramp', 'leather')
        sh = s.get('sh', 12)
        top = self.top
        big = s.get('bag_big')
        sp = f.part(sep=False)
        if not back:   # from the character's right shoulder (viewer-left) to the left hip
            a = (CX - sh + 4, top + 1); c = (CX + sh + 1, top + 23)
        else:
            a = (CX + sh - 5, top + 1); c = (CX - sh - 2, top + 23)
        pts = line(a[0], a[1], c[0], c[1])
        for (x, y) in pts:
            f.put(x, y, br, 1, sp); f.put(x + 1, y, br, 2, sp); f.put(x, y + 1, br, 3, sp)
        bw, bh = (12, 13) if big else (10, 11)
        bx = CX + sh - 3 if not back else CX - sh - bw + 3
        by = top + 21
        bp = f.part()
        m = rows({y: (bx, bx + bw - 1) for y in range(by, by + bh)})
        m = [p for p in m if not (p[1] == by + bh - 1 and p[0] in (bx, bx + bw - 1))]
        f.paint(m, br, bp, lo=1, hi=4, bias=0.06, mode='sph')
        for x in range(bx, bx + bw): f.step(x, by, -1)
        if not back:
            fy = by + 5                                                     # flap edge with stitching
            for x in range(bx, bx + bw):
                f.put(x, fy, br, 3, bp)
                if x % 2 == 0 and bx < x < bx + bw - 1: f.put(x, fy - 1, br, 0, bp)
            for y in range(by + 1, fy): f.step(bx, y, -1)
            kx = bx + bw // 2 - 1
            f.put(kx, fy - 1, 'gold', 0, bp); f.put(kx + 1, fy - 1, 'gold', 1, bp)       # buckle
            f.put(kx, fy, 'gold', 1, bp); f.put(kx + 1, fy, 'gold', 3, bp)
            f.put(kx, fy + 1, 'gold', 2, bp); f.put(kx + 1, fy + 1, 'gold', 3, bp)
            for y in range(fy + 1, fy + 4): f.put(kx, y, br, 2, bp) if y > fy + 1 else None
            f.put(bx + 1, by + 1, br, 0, bp)
        else:
            for y in range(by + 2, by + bh - 1): f.step(bx + bw - 1, y, 1)

    # ---- head: neck, ears, face, features, hair, glasses
    def head_fb(self, back):
        s, f, b = self.s, self.f, self.b
        sk = s['skin']
        npid = f.part()
        f.paint(rows({y: (CX - 4, CX + 3) for y in range(37 + b, 43 + b)}), sk, npid, bias=-0.3, lo=2, hi=3)
        ep = f.part()
        for ex in (CX - 14, CX + 13):     # ears
            L = ex < CX
            em = [(ex, y) for y in range(27 + b, 33 + b)] + [(ex + (1 if L else -1), y) for y in range(27 + b, 34 + b)]
            em = [p for p in em if not (p[0] == ex and p[1] in (27 + b, 32 + b))]
            f.paint(em, sk, ep, mode='flat', bias=0.0 if L else -0.25, lo=1, hi=3)
            f.put(ex + (1 if L else -1), 29 + b, sk, 3, ep); f.put(ex + (1 if L else -1), 30 + b, sk, 2, ep)
            if s.get('earrings') and not back: f.put(ex + (1 if L else -1), 34 + b, 'gold', 1, ep)
        hp = f.part()
        fm = set(ell(CX, 28.4 + b, 12.8, 12.4))
        self.face_mask = fm
        for (x, y) in fm:
            f.put(x, y, sk, face_step(x + 0.5 - CX, y - b, fm, x, y), hp)
        self.head_pid = hp
        if not back:
            self.face_front()
            if s.get('beard'): self.beard_front()
        self.hair_fb(back)
        if not back:
            # soft ambient occlusion under the fringe (2 rows)
            for (x, y) in fm:
                p = f.get(x, y)
                if p and p[0] == sk and p[2] == hp and (x, y - 2) in self.hair_mask and (x, y - 1) not in self.hair_mask:
                    f.step(x, y, 1) if p[1] < 2 else None
            if s.get('glasses'): self.glasses_front()

    def face_front(self):
        s, f, b = self.s, self.f, self.b
        sk = s['skin']; fp = f.part(shadow=False, sep=False)
        ey = 28 + b
        eye = s.get('eye', 'eye')
        gl = s.get('glasses')
        for ex in (CX - 6, CX + 3):
            L = ex < CX
            # 3 x 4 eye: lash line, glint + iris, pupil, lit lower iris
            for k in range(3): f.put(ex + k, ey, OUT, 0, fp)
            f.put(ex - 1 if L else ex + 3, ey, OUT, 0, fp)                          # outer lash flick
            if not gl: f.put(ex - 1 if L else ex + 3, ey - 1, OUT, 0, fp) if s.get('lashes') else None
            f.put(ex, ey + 1, eye, 0, fp); f.put(ex + 1, ey + 1, eye, 3, fp); f.put(ex + 2, ey + 1, eye, 3, fp)
            f.put(ex, ey + 2, eye, 2, fp); f.put(ex + 1, ey + 2, eye, 4, fp); f.put(ex + 2, ey + 2, eye, 3, fp)
            f.put(ex, ey + 3, eye, 1, fp); f.put(ex + 1, ey + 3, eye, 1, fp); f.put(ex + 2, ey + 3, eye, 2, fp)
            f.put(ex + 2, ey + 2, 'white', 1, fp) if s.get('sparkle2') else None
            # lower lid: a single skin shadow under the outer corner
            f.put(ex + (0 if L else 2), ey + 4, sk, 2, fp)
            # brows
            br = s.get('brow', s['hair']); bi = s.get('brow_i', 3)
            by = ey - 3 if not gl else ey - 4
            bx = [ex - 1, ex, ex + 1, ex + 2] if L else [ex, ex + 1, ex + 2, ex + 3]
            for k, x in enumerate(bx):
                lift = 1 if (L and k == 0) or (not L and k == 3) else 0
                f.put(x, by + lift, br, bi if k in (1, 2) else bi + 1 if bi < 4 else bi, fp)
            if s.get('bushy_brows'):
                for x in bx[1:3]: f.put(x, by - 1, br, bi, fp)
            # cheeks
            cx0 = ex - 1 if L else ex + 2
            f.put(cx0, ey + 6, sk + '_blush', 1, fp); f.put(cx0 + 1, ey + 6, sk + '_blush', 1, fp)
            f.put(cx0 + (0 if L else 1), ey + 7, sk + '_blush', 2, fp)
        # nose: lit bridge, shaded underside
        f.put(CX - 1, ey + 3, sk, 0, fp); f.put(CX - 1, ey + 4, sk, 0, fp)
        f.put(CX, ey + 5, sk, 2, fp); f.put(CX - 1, ey + 6, sk, 2, fp); f.put(CX, ey + 6, sk, 3, fp)
        if s.get('nose_big'): f.put(CX + 1, ey + 5, sk, 2, fp); f.put(CX + 1, ey + 6, sk, 3, fp)
        # smile
        my = ey + 9
        if not s.get('beard'):
            lp = sk + '_lip'
            f.put(CX - 3, my - 1, lp, 2, fp); f.put(CX - 2, my, lp, 3, fp); f.put(CX - 1, my, lp, 3, fp)
            f.put(CX, my, lp, 3, fp); f.put(CX + 1, my, lp, 3, fp); f.put(CX + 2, my - 1, lp, 2, fp)
            f.put(CX - 1, my + 1, lp, 1, fp); f.put(CX, my + 1, lp, 1, fp)
            if s.get('lipstick'):
                for x in range(CX - 2, CX + 2): f.put(x, my, 'wine', 2, fp)
                f.put(CX - 1, my + 1, 'wine', 1, fp); f.put(CX, my + 1, 'wine', 1, fp)
        if s.get('age') == 'old':
            f.put(CX - 8, ey + 2, sk, 2, fp); f.put(CX - 8, ey + 3, sk, 2, fp)     # crow's feet
            f.put(CX + 7, ey + 2, sk, 3, fp); f.put(CX + 7, ey + 3, sk, 3, fp)
            f.put(CX - 4, my - 1, sk, 2, fp); f.put(CX + 3, my - 1, sk, 3, fp)        # smile lines
        if s.get('freckles'):
            for (x, y) in [(CX - 6, ey + 5), (CX - 4, ey + 6), (CX + 3, ey + 5), (CX + 5, ey + 6), (CX - 2, ey + 5), (CX + 1, ey + 5)]:
                f.put(x, y, sk, 2, fp)

    def beard_front(self):
        s, f, b = self.s, self.f, self.b
        hr = s.get('beard_ramp', s['hair']); bp = f.part()
        ey = 28 + b
        m = []
        style = s.get('beard')
        for (x, y) in self.face_mask:
            dx = x + 0.5 - CX
            if style == 'goatee':
                if y >= ey + 8 and abs(dx) < 4.5: m.append((x, y))
                continue
            if y >= ey + 8 and abs(dx) < 12.5: m.append((x, y))
            elif y >= ey + 3 and abs(dx) > 9.8: m.append((x, y))
            elif y >= ey + 6 and abs(dx) > 7.5: m.append((x, y))
        for x in range(CX - 7, CX + 7): m.append((x, 41 + b))
        for x in range(CX - 5, CX + 5): m.append((x, 42 + b))
        for x in range(CX - 3, CX + 3): m.append((x, 43 + b))
        mouth = {(x, ey + 9) for x in range(CX - 2, CX + 2)} | {(x, ey + 10) for x in range(CX - 1, CX + 1)}
        m = [p for p in m if p not in mouth]
        f.paint(m, hr, bp, mode='sph', cx=CX - 2, rx=14, cy=ey + 4, ry=13, bias=0.02, lo=1, hi=4,
                tex=lambda x, y: -0.16 if (hash01(x, y // 2, 5) > 0.7) else (0.06 if (x + y) % 5 == 0 else 0))
        # moustache
        for x in range(CX - 4, CX + 4):
            f.put(x, ey + 7, hr, 1 if x < CX - 1 else (2 if x < CX + 2 else 3), bp)
        for x in range(CX - 3, CX + 3): f.put(x, ey + 8, hr, 2 if x < CX else 3, bp)
        f.put(CX - 5, ey + 8, hr, 2, bp); f.put(CX + 4, ey + 8, hr, 3, bp)
        lp = s['skin'] + '_lip'
        for x in range(CX - 2, CX + 2): f.put(x, ey + 9, lp, 3, bp)
        f.put(CX - 1, ey + 10, lp, 1, bp); f.put(CX, ey + 10, lp, 2, bp)

    def glasses_front(self):
        s, f, b = self.s, self.f, self.b
        gp = f.part(shadow=False, sep=False)
        rim = s.get('rim', 'rim_dark'); ey = 28 + b
        for ex in (CX - 6, CX + 3):
            c = ex + 1                                                     # lens centre column
            ring = []
            for x in range(c - 1, c + 2): ring += [(x, ey - 2), (x, ey + 5)]
            ring += [(c - 2, ey - 1), (c + 2, ey - 1), (c - 2, ey + 4), (c + 2, ey + 4)]
            for y in range(ey, ey + 4): ring += [(c - 3, y), (c + 3, y)]
            for (x, y) in ring:
                f.put(x, y, rim, 2 if y <= ey - 1 else 1, gp)
            # lens: the skin behind the glass reads one step lighter
            for y in range(ey - 1, ey + 5):
                for x in range(c - 2, c + 3):
                    if (x, y) in ring: continue
                    p = f.get(x, y)
                    if p and p[0] == s['skin']: f.put(x, y, s['skin'], max(0, p[1] - 1), gp)
            f.put(c + 1, ey - 1, 'lens', 0, gp); f.put(c + 2, ey, 'lens', 1, gp)    # glint, upper right
        f.put(CX - 1, ey, rim, 1, gp); f.put(CX, ey, rim, 2, gp)                           # bridge
        for x in (CX - 12, CX - 11): f.put(x, ey, rim, 2, gp)                               # arms to the ears
        for x in (CX + 10, CX + 11): f.put(x, ey, rim, 3, gp)

    # ---- hair (front and back views)
    HAIR = {  # cranium cx-offset, cy, rx, ry ; side depth (front) ; nape (back)
        'bun':      (0, 24.4, 15.0, 13.8, 32, 38),
        'bob':      (0, 25.4, 16.6, 16.2, 41, 41),
        'short':    (0, 24.4, 14.6, 13.0, 27, 36),
        'curly':    (0, 23.6, 17.4, 16.2, 35, 39),
        'ponytail': (0, 24.4, 15.0, 13.8, 30, 38),
        'long':     (0, 24.6, 15.6, 14.4, 38, 40),
    }

    def hairline(self, st, dx):
        if st == 'bun': return 19.6 + 0.045 * dx * dx - 0.28 * dx
        if st == 'bob': return 24.0 + 0.012 * dx * dx + (0.25 * dx if dx > 0 else 0.05 * dx)
        if st == 'short': return 18.8 + 0.035 * dx * dx - 0.18 * dx
        if st == 'curly': return 20.5 + 0.035 * dx * dx
        if st == 'ponytail': return 19.2 + 0.05 * dx * dx + 0.2 * dx
        if st == 'long': return 19.8 + 0.04 * dx * dx - (0.45 * dx if dx < 0 else 0)
        return 19

    def hair_fb(self, back):
        s, f, b = self.s, self.f, self.b
        st = s['hairStyle']; hr = s['hair']
        if st == 'bald':
            self.bald_fb(back); return
        ox, ccy, crx, cry, depth, nape = self.HAIR[st]
        cran = set(ell(CX + ox, ccy + b, crx, cry))
        m = set()
        if back:
            m = set(cran)
            for (x, y) in self.face_mask:
                if y <= nape + b: m.add((x, y))
        else:
            for (x, y) in cran:
                if (x, y) in self.face_mask:
                    dx = x + 0.5 - CX
                    if y + 0.5 < self.hairline(st, dx) + b: m.add((x, y))
                    elif abs(dx) > 10.6 and y + 0.5 < depth + b: m.add((x, y))
                    elif abs(dx) > 9.4 and y + 0.5 < depth - 5 + b and st in ('bob', 'long', 'curly'): m.add((x, y))
                else:
                    m.add((x, y))
            m = set(p for p in m if p[1] < 26 + b or abs(p[0] + 0.5 - CX) >= 10)   # never cover the eyes
        if st == 'bob':
            for y in range(28 + b, 42 + b):
                for x in list(range(CX - 17, CX - 10)) + list(range(CX + 10, CX + 17)):
                    if abs(x + 0.5 - CX) < 16.8 - max(0, y - 38 - b) * 1.6: m.add((x, y))
        if st == 'long':
            for y in range(26 + b, 44 + b):
                for x in list(range(CX - 16, CX - 10)) + list(range(CX + 10, CX + 16)):
                    if back or abs(x + 0.5 - CX) < 15.8: m.add((x, y))
        if st == 'curly':
            for k in range(26):
                a = k / 26 * math.tau
                bx = CX + ox + math.cos(a) * (crx + 0.2); by = ccy + b + math.sin(a) * (cry + 0.1)
                if by > 31 + b and not back: continue
                for (x, y) in ell(bx, by, 2.4, 2.4):
                    if back or not (y >= 26 + b and abs(x + 0.5 - CX) < 10): m.add((x, y))
        if back and st in ('bob', 'long', 'curly', 'short', 'bun', 'ponytail'):
            pass
        if s.get('hat'): m = set(p for p in m if p[1] > 20 + b)
        pid = f.part()
        pivot = {'bun': (CX + 2, 6 + b), 'bob': (CX + 3, 8 + b), 'short': (CX + 3, 9 + b), 'curly': (CX, 22 + b),
                 'ponytail': (CX, 7 + b), 'long': (CX + 3, 8 + b)}[st]
        if back: pivot = {'bun': (CX, 11 + b), 'ponytail': (CX, 31 + b), 'curly': (CX, 22 + b)}.get(st, (CX, 4 + b))
        if st == 'bob' and not back: pivot = (CX + 4, 10 + b)

        def tex(x, y):
            if st == 'curly':
                # tight coils: little lit arcs with dark cores
                u, v = x % 4, (y + (x // 4) * 2) % 4
                if (u, v) in ((1, 1), (2, 1)): return 0.16
                if (u, v) in ((1, 3), (2, 3), (0, 2)): return -0.18
                return 0.0
            return strands(x, y, pivot[0], pivot[1], 2.3 if not back else 2.8, 1.7)
        f.paint(m, hr, pid, mode='sph', cx=CX - 2.5, rx=crx + 3, cy=ccy - 5 + b, ry=cry + 5, bias=0.04 + (0.05 if back else 0),
                lo=0, hi=4, tex=tex, th=(0.92, 0.70, 0.46, 0.25))
        # hair ends: flick the fringe tips a step darker so the fringe reads as separate locks
        if not back and st != 'curly':
            for (x, y) in m:
                if (x, y + 1) in self.face_mask and (x, y + 1) not in m and y > 16 + b:
                    f.step(x, y, 1)
        self.hair_mask = m
        if st == 'bun': self.bun(back, hr)
        if st == 'ponytail': self.ponytail_fb(back, hr)
        if st == 'long' and back:
            lp = f.part()
            mm = rows({y: (CX - 13, CX + 12) for y in range(36 + b, 57 + b)})
            mm = [p for p in mm if not (p[1] > 52 + b and abs(p[0] + 0.5 - CX) > 12 - (p[1] - 52 - b) * 2)]
            f.paint(mm, hr, lp, bias=0.0, lo=1, hi=4, tex=lambda x, y: strands(x, y, CX, -16 + b, 16, 2.3))
        if st == 'bob' and back:
            for x in range(CX - 15, CX + 15): f.step(x, 41 + b, 1) if (x, 41 + b) in m else None

    def bun(self, back, hr):
        s, f, b = self.s, self.f, self.b
        hat = s.get('hat')
        if hat and not back: return
        if not back:
            cy = 6.8 + b
            bp = f.part()
            m = [p for p in ell(CX + 1, cy, 7.8, 6.4) if p not in self.hair_mask]
            f.paint(m, hr, bp, mode='sph', cx=CX - 1, rx=8.5, cy=cy - 1, ry=7, bias=0.06, lo=0, hi=4,
                    tex=lambda x, y: strands(x, y, CX + 1, cy + 1, 1.3, 0.4, 0.06))
            for (x, y) in m:                         # shadowed crease where the bun meets the crown
                if (x, y + 1) in self.hair_mask: f.put(x, y, hr, 4, bp)
                elif (x, y + 2) in self.hair_mask: f.step(x, y, 1)
            # a hairpin
            f.put(CX + 5, cy - 1 + 3, 'gold', 1, bp) if s.get('hairpin') else None
        else:
            cy = (11.4 if not hat else 30) + b
            bp = f.part()
            m = ell(CX, cy, 8.0, 6.8)
            ring = set(m)
            f.paint(m, hr, bp, mode='sph', cx=CX - 1.5, rx=9, cy=cy - 1.5, ry=7.5, bias=0.1, lo=0, hi=4,
                    tex=lambda x, y: strands(x, y, CX + 0.5, cy + 0.5, 1.2, 0.9, 0.05))
            for (x, y) in m:
                below = (x, y + 1) not in ring
                if below or ((x + 1, y + 1) not in ring and x > CX + 2) or ((x - 1, y + 1) not in ring and x < CX - 3):
                    f.put(x, y, hr, 4, bp)
                elif (x, y + 2) not in ring: f.step(x, y, 1)
            # the spiral of the twist
            for (x, y) in [(CX - 2, cy - 2), (CX - 1, cy - 3), (CX, cy - 3), (CX + 1, cy - 2), (CX + 2, cy - 1),
                           (CX + 2, cy), (CX + 1, cy + 1), (CX - 1, cy + 1)]:
                f.step(int(x), int(y), 1)

    def ponytail_fb(self, back, hr):
        s, f, b = self.s, self.f, self.b
        pp = f.part()
        scr = s.get('scrunchie', 'teal')
        if back:
            m = []
            for y in range(31 + b, 52 + b):
                w = 3 if y < 46 + b else 3 - (y - 46 - b) // 2
                sway = 1 if y > 42 + b else 0
                for x in range(CX - w + sway, CX + w + sway): m.append((x, y))
            f.paint(m, hr, pp, bias=0.06, lo=0, hi=4, tex=lambda x, y: strands(x, y, CX, 16 + b, 10, 2))
            tie = f.part()
            for x in range(CX - 3, CX + 3):
                f.put(x, 31 + b, scr, 1 if x < CX else 2, tie); f.put(x, 32 + b, scr, 2 if x < CX else 3, tie)


    def bald_fb(self, back):
        s, f, b = self.s, self.f, self.b
        hr = s['hair']
        dp = f.part(sep=False)
        m = [p for p in ell(CX, 25 + b, 14.0, 13.6) if p[1] < 24 + b]
        f.paint(m, s['skin'], dp, mode='sph', cx=CX - 2.5, rx=15, cy=20 + b, ry=13, bias=0.14, lo=0, hi=3,
                th=(0.95, 0.66, 0.42, 0.2))
        for (x, y) in [(CX - 6, 14 + b), (CX - 5, 14 + b), (CX - 4, 14 + b), (CX - 6, 15 + b), (CX - 5, 15 + b)]:
            f.put(x, y, s['skin'], 0, dp)                                         # the shine
        hp = f.part()
        side = set(ell(CX, 27 + b, 14.6, 12.6))
        mm = []
        for y in range(21 + b, 35 + b):
            for x in list(range(CX - 15, CX - 10)) + list(range(CX + 10, CX + 15)):
                if (x, y) in side and not (abs(x + 0.5 - CX) > 13 and 27 + b <= y <= 33 + b and not back): mm.append((x, y))
        if back:
            mm += [p for p in ell(CX, 29 + b, 14, 9.6) if p[1] >= 25 + b]
        f.paint(mm, hr, hp, mode='sph', cx=CX - 3, rx=17, cy=24 + b, ry=13, lo=1, hi=4,
                tex=lambda x, y: -0.14 if (x + 2 * y) % 5 == 0 else 0.03)
        self.hair_mask = set(mm)

    # ---- hats
    def hat_fb(self, back):
        s, f, b = self.s, self.f, self.b
        if s.get('hat'):   # hard hat: dome, ridge, full brim with a peak
            hr = s['hat']
            hp = f.part()
            dome = [p for p in ell(CX, 21 + b, 15.4, 13.2) if p[1] <= 20 + b]
            f.paint(dome, hr, hp, mode='sph', cx=CX - 3, rx=17, cy=16 + b, ry=13, bias=0.12, lo=0, hi=3)
            for x in range(CX - 17, CX + 17): f.put(x, 22 + b, hr, 2 if x < CX + 8 else 3, hp)
            for x in range(CX - 16, CX + 16): f.put(x, 21 + b, hr, 1 if x < CX + 6 else 2, hp)
            if not back:
                for x in range(CX - 15, CX + 15): f.put(x, 23 + b, hr, 3 if abs(x + .5 - CX) < 12 else 4, hp)
            for y in range(9 + b, 21 + b):                                     # centre ridge
                f.put(CX - 2, y, hr, 0 if y < 15 + b else 1, hp); f.put(CX - 1, y, hr, 1, hp); f.put(CX, y, hr, 2, hp)
            for (x, y) in dome:
                if y == 20 + b: f.step(x, y, 1)
            return
        if s.get('cap'):
            cr = s['cap']; cp = f.part()
            dome = [p for p in ell(CX, 21.5 + b, 14.8, 11.6) if p[1] <= 20 + b]
            f.paint(dome, cr, cp, mode='sph', cx=CX - 3, rx=16, cy=15 + b, ry=12, bias=0.04, lo=1, hi=4)
            for y in range(11 + b, 21 + b): f.step(CX, y, 1); f.step(CX - 7 + (y - 11 - b) // 4, y, 1); f.step(mx(CX - 7 + (y - 11 - b) // 4), y, 1)
            f.put(CX - 1, 10 + b, cr, 0, cp); f.put(CX, 10 + b, cr, 1, cp)          # button on top
            if not back:
                for x in range(CX - 11, CX + 11):
                    f.put(x, 21 + b, cr, 1 if x < CX - 3 else 2, cp)
                    f.put(x, 22 + b, cr, 2 if x < CX else 3, cp)
                for x in range(CX - 10, CX + 10): f.put(x, 23 + b, cr, 4, cp)
                for x in range(CX - 8, CX + 8): f.step(x, 20 + b, -1)
            else:
                for x in range(CX - 3, CX + 3): f.put(x, 20 + b, 'sole', 2, cp)        # strap
                for x in range(CX - 2, CX + 2): f.put(x, 19 + b, s['hair'], 3, cp)
            return
        if s.get('flatcap'):
            cr = s['flatcap']; cp = f.part()
            dome = [p for p in ell(CX + 0.5, 20 + b, 15.6, 8.6) if p[1] <= 22 + b]
            f.paint(dome, cr, cp, mode='sph', cx=CX - 3, rx=17, cy=16 + b, ry=9, bias=0.02, lo=1, hi=4,
                    tex=lambda x, y: (-0.12 if (x + y) % 4 == 0 else 0.03) if (x // 2) % 2 else (-0.12 if (x - y) % 4 == 0 else 0.03))
            if not back:
                for x in range(CX - 13, CX + 13): f.put(x, 22 + b, cr, 3 if x < CX + 6 else 4, cp)
                for x in range(CX - 12, CX + 12): f.put(x, 23 + b, cr, 4, cp)
                for x in range(CX - 13, CX + 13): f.step(x, 21 + b, -1)
                f.put(CX - 1, 13 + b, cr, 1, cp)
            return

    # ============================================================================ PROFILE (faces LEFT)
    def draw_side(self):
        self.side_hair_behind()
        self.side_arm(False)
        self.side_legs()
        self.side_bag(far=True)
        self.side_torso()
        self.side_head()
        self.side_arm(True)
        self.side_bag(far=False)
        self.side_hat()

    def side_hair_behind(self):
        s, f, b = self.s, self.f, self.b
        if s['hairStyle'] != 'long': return
        hp = f.part(sep=False)
        m = []
        for y in range(28 + b, 56 + b):
            for x in range(CX + 2, CX + 14 - max(0, y - 50 - b)): m.append((x, y))
        f.paint(m, s['hair'], hp, bias=-0.1, lo=1, hi=4, tex=lambda x, y: strands(x, y, CX + 4, 4 + b, 12, 2))

    def side_legs(self):
        s, f, b = self.s, self.f, self.b
        lw = s.get('legwear', 'trousers'); lr = s.get('legs', 'charcoal'); ft = s.get('feet', 'boots')
        fr = s.get('feet_ramp', 'leather')
        for which, dx, lift in (('far', self.ffx, self.fl), ('near', self.nfx, self.nl)):
            far = which == 'far'
            hip = (CX - 1, 64 + b)
            ankle = (CX - 1 + dx, 86 + lift)
            lp = f.part()
            m = []
            n = ankle[1] - hip[1]
            for k in range(n + 1):
                t = k / max(1, n); xx = round(hip[0] + (ankle[0] - hip[0]) * t)
                for x in range(xx - 3, xx + 4): m.append((x, hip[1] + k))
            lrp = lr if lw != 'skirt' else s.get('tights', lr)
            if lw == 'shorts':
                cut = 74 + b
                f.paint([p for p in m if p[1] <= cut], lrp, lp, bias=-0.22 if far else 0.03, lo=1, hi=4)
                sp = f.part()
                f.paint([(x, y) for (x, y) in m if y > cut and abs(x + 0.5 - (hip[0] + (ankle[0] - hip[0]) * (y - hip[1]) / n)) < 2.8],
                        s['skin'], sp, bias=-0.1 if far else 0.12, lo=1, hi=3)
            else:
                f.paint(m, lrp, lp, bias=(-0.22 if far else 0.03), lo=1, hi=4)
                if lw == 'trousers' and not far:
                    for k in range(8, n - 1):
                        t = k / n; f.step(round(hip[0] + (ankle[0] - hip[0]) * t), hip[1] + k, 1)
            self.side_foot(ankle[0] - 3, lift, ft, fr, far)

    def side_foot(self, x0, lift, ft, fr, far):
        f, s = self.f, self.s
        base = FEET + lift
        bias = -0.2 if far else 0.03
        if ft == 'wellies':
            m = rows({y: (x0, x0 + 7) for y in range(base - 14, base + 1)})
            m += [(x0 - 1, y) for y in range(base - 4, base + 1)] + [(x0 - 2, y) for y in range(base - 2, base + 1)]
            pid = f.paint(m, s.get('welly', 'welly'), f.part(), bias=bias, lo=1, hi=4)
            for x in range(x0 - 2, x0 + 8): f.put(x, base, 'sole', 2, pid)
            for x in range(x0, x0 + 8): f.step(x, base - 14, -1)
            return
        if ft == 'trainers':
            m = rows({base - 5: (x0, x0 + 6), base - 4: (x0 - 1, x0 + 7), base - 3: (x0 - 2, x0 + 7),
                      base - 2: (x0 - 3, x0 + 7), base - 1: (x0 - 3, x0 + 7), base: (x0 - 3, x0 + 7)})
            pid = f.paint(m, 'trainer', f.part(), bias=bias, lo=1, hi=3)
            for x in range(x0 - 3, x0 + 8): f.put(x, base, 'sole', 1, pid)
            if not far:
                for x in range(x0 - 1, x0 + 5): f.put(x, base - 3 + (1 if x > x0 + 2 else 0), s.get('accent', 'paint_red'), 1, pid)
            return
        if ft == 'shoes':
            m = rows({base - 3: (x0 - 1, x0 + 6), base - 2: (x0 - 3, x0 + 7), base - 1: (x0 - 3, x0 + 7)})
            pid = f.paint(m, fr, f.part(), bias=bias, lo=1, hi=4)
            for x in range(x0 - 3, x0 + 8): f.put(x, base, 'sole', 2, pid)
            if not far: f.put(x0 - 2, base - 2, fr, 0, pid)
            return
        spans = {}
        for y in range(base - 10, base + 1):
            k = y - (base - 10)
            if k < 5: spans[y] = (x0, x0 + 6)
            elif k < 7: spans[y] = (x0 - 2, x0 + 7)
            else: spans[y] = (x0 - 3, x0 + 7)
        m = rows(spans)
        m = [p for p in m if p != (x0 - 3, base - 3)]
        pid = f.paint(m, fr, f.part(), bias=bias, lo=1, hi=4)
        for x in range(x0 - 3, x0 + 8): f.put(x, base, 'sole', 2 if not far else 3, pid)
        for x in range(x0, x0 + 7): f.step(x, base - 10, -1); f.step(x, base - 9, 1)
        if not far:
            for (dx_, dy_) in ((1, 2), (0, 4), (0, 6)):
                f.put(x0 + dx_, base - 10 + dy_, 'gold', 2, pid)
            f.put(x0 - 2, base - 3, fr, 0, pid); f.put(x0 - 1, base - 3, fr, 1, pid)
            f.put(x0 + 6, base - 2, fr, 3, pid)

    def side_torso(self):
        s, f, b = self.s, self.f, self.b
        ts = s['topStyle']; tr = s['top']; depth = s.get('depth', 9)
        lw = s.get('legwear', 'trousers')
        top, bot = self.top, self.bot
        if lw == 'skirt':
            sk_top = (bot - 5) if ts == 'coat' else 64 + b
            sk_bot = 84 + b
            span = {}
            for y in range(sk_top, sk_bot + 1):
                t = (y - sk_top) / max(1, sk_bot - sk_top)
                sway = (1 if self.frame in (1, 3) and y > sk_bot - 4 else 0)
                span[y] = (round(CX - depth - 0.5 - t * 2.4) - sway, round(CX + depth - 1 + t * 2.2))
            pid = f.part()
            f.paint(rows(span), s.get('skirt', 'charcoal'), pid, lo=1, hi=4,
                    tex=lambda x, y: (-0.22 if x % 4 == 0 else (0.06 if x % 4 == 1 else 0)))
            for x in range(span[sk_bot][0], span[sk_bot][1] + 1): f.step(x, sk_bot, 1)
        span = {}
        fl = s.get('flare', 3.4 if ts == 'coat' else 1.4)
        belly = s.get('belly', 0)
        chest = s.get('chest', 0)
        for y in range(top, bot + 1):
            t = (y - top) / max(1, bot - top)
            front = CX - depth + 0.5 - t * fl * 0.8 - belly * math.sin(min(1, t * 1.3) * math.pi) * 1.6 \
                - chest * math.sin(min(1, t * 2.5) * math.pi)
            backx = CX + depth - 1.5 + t * fl * 0.6
            if y == top: front += 3; backx -= 3
            elif y == top + 1: front += 1.5; backx -= 1.5
            elif y == top + 2: front += 0.5; backx -= 0.5
            span[y] = (round(front), round(backx))
        self.side_span = span
        pid = f.part()
        f.paint(rows(span), tr, pid, bias=0.03 + s.get('top_bias', 0), lo=1, hi=4,
                tex=lambda x, y: (-0.2 if (x == CX + 3 and (y - top) / (bot - top) > .55) else 0))
        for x in range(span[bot][0], span[bot][1] + 1): f.step(x, bot, 1)
        fx = lambda y: span[y][0]
        if ts in TAILORED:
            ip = f.part()
            for dy in range(0, 5):
                for x in range(fx(top + dy), fx(top + dy) + 2 - dy // 3):
                    f.put(x, top + dy, s.get('inner', 'cream'), 1, ip)
            for y in range(top + 3, top + 10): f.step(fx(y) + 2, y, 1)          # lapel roll
            for y in range(top + 3, top + 10): f.step(fx(y) + 1, y, -1)
            if s.get('scarf'):
                sc = f.part()
                for (dx_, dy_) in ((0, 1), (1, 1), (0, 2), (1, 2), (2, 2), (0, 3), (1, 3), (0, 4), (1, 5), (1, 6)):
                    f.put(fx(top + dy_) + dx_, top + dy_, s['scarf'], 1 if dx_ == 0 else 2, sc)
            elif s.get('tie'):
                tp = f.part()
                for y in range(top + 2, top + 12): f.put(fx(y), y, s['tie'], 1, tp)
            if ts == 'coat':
                for yy in range(top + 12, bot - 5, 6): self.button(fx(yy) + 1, yy, pid)
                py = bot - 12
                for x in range(fx(py) + 4, fx(py) + 11): f.step(x, py, -1); f.step(x, py + 1, 2); f.step(x, py + 2, 1)
            elif ts == 'anorak':
                for y in range(top + 6, bot + 1): f.put(fx(y), y, 'metal', 2 if y % 2 else 3, pid)
            else:
                for yy in (top + 14, top + 20):
                    self.button(fx(yy), yy, pid, ramp=s.get('button', 'charcoal' if ts == 'suit' else ('leather' if ts == 'wax' else 'gold')), small=True)
                py = bot - 8
                for x in range(fx(py) + 3, fx(py) + 9): f.step(x, py, 2 if ts != 'wax' else 1)
            if ts == 'wax':
                cp = f.part()
                for dy in range(0, 4):
                    for x in range(fx(top + dy) + 1, fx(top + dy) + 5): f.put(x, top + dy, 'cord', 1 if (x + dy) % 2 else 2, cp)
            if s.get('hood') or ts == 'anorak':
                hp = f.part()
                f.paint(ell(CX + depth - 3, top + 3.0, 4.6, 4.8), tr, hp, mode='sph', bias=-0.04, lo=1, hi=4)
            for y in range(top + 6, bot - 2): f.step(CX + 6, y, 1) if y > top + 14 else None     # side seam
        elif ts == 'cardigan':
            ip = f.part()
            for y in range(top, top + 7): f.put(fx(y), y, s.get('inner', 'cream'), 1, ip); f.put(fx(y) + 1, y, s.get('inner', 'cream'), 2, ip)
            for x in range(span[bot][0], span[bot][1] + 1): f.step(x, bot - 1, x % 2); f.step(x, bot - 2, x % 2)
            for yy in range(top + 9, bot - 2, 6): f.put(fx(yy) + 2, yy, 'cream', 0, pid)
            if s.get('apron'): self.side_apron(top, span)
        elif ts == 'hoodie':
            hp = f.part()
            f.paint(ell(CX + depth - 3, top + 3.5, 6.2, 6.4), tr, hp, mode='sph', bias=-0.04, lo=1, hi=4)
            for y in range(top + 3, top + 10): f.put(fx(y) + 2, y, 'white', 2, pid)
            for x in range(span[bot][0], span[bot][1] + 1): f.step(x, bot - 1, 1)
            for x in range(fx(bot - 11) + 1, fx(bot - 11) + 7): f.step(x, bot - 11, 1)
        elif ts == 'overalls':
            orp = s.get('legs', tr); op = f.part()
            for y in range(top + 8, bot + 1):
                for x in range(span[y][0], span[y][0] + 7): f.put(x, y, orp, 1 if x < span[y][0] + 3 else 2, op)
            for y in range(top, top + 9): f.put(CX + 1, y, orp, 2, op); f.put(CX + 2, y, orp, 3, op)
            self.button(CX + 1, top + 8, op, ramp='gold', small=True)
        elif ts in ('tee', 'polo'):
            np_ = f.part(shadow=False)
            for x in range(fx(top), fx(top) + 3): f.put(x, top, s['skin'], 2, np_)
            if ts == 'polo':
                cp = f.part()
                for (dx_, dy_) in ((0, 0), (1, 0), (2, 0), (0, 1), (1, 1)): f.put(fx(top + dy_) + dx_, top + dy_, tr, 0, cp)
            if s.get('apron'): self.side_apron(top, span)
        elif ts == 'hivis':
            np_ = f.part(shadow=False)
            for x in range(fx(top), fx(top) + 4): f.put(x, top, self.sleeve_ramp(), 2, np_)
        if ts == 'hivis':
            for yy in (bot - 11, bot - 5):
                for x in range(span[yy][0], span[yy][1] + 1):
                    f.put(x, yy, 'reflect', 0 if x < CX - 4 else 1, pid); f.put(x, yy + 1, 'reflect', 2, pid)
            for y in range(top + 1, bot - 11): f.put(CX - 3, y, 'reflect', 1, pid); f.put(CX - 2, y, 'reflect', 2, pid)
            for y in range(top + 5, bot + 1): f.put(fx(y), y, 'hivis', 3, pid)
        if s.get('vest') and ts != 'hivis':
            vp = f.part()
            vb = 69 + b
            m = []
            for y in range(top + 1, vb + 1):
                a, c = span[min(y, bot)]
                for x in range(a - (1 if y > top + 4 else 0) + (2 if y < top + 9 else 0), c + 2): m.append((x, y))
            f.paint(m, 'hivis', vp, bias=0.12, lo=1, hi=3)
            ms = set(m)
            for yy in (vb - 10, vb - 4):
                for x in range(min(p[0] for p in m if p[1] == yy), max(p[0] for p in m if p[1] == yy) + 1):
                    f.put(x, yy, 'reflect', 0 if x < CX - 4 else 1, vp); f.put(x, yy + 1, 'reflect', 2, vp)
            for y in range(top + 1, vb - 10):
                if (CX - 3, y) in ms: f.put(CX - 3, y, 'reflect', 1, vp); f.put(CX - 2, y, 'reflect', 2, vp)
            for (x, y) in m:
                if y == vb: f.step(x, y, 1)

    def side_apron(self, top, span):
        f, b = self.f, self.b
        ap = f.part()
        m = []
        for y in range(top + 7, 80 + b):
            x0 = span[min(y, max(span))][0] - (1 if y > top + 16 else 0)
            for x in range(x0, x0 + 4): m.append((x, y))
        f.paint(m, 'apron', ap, lo=1, hi=3)
        for y in range(top + 14, top + 17): f.put(CX + 4, y, 'apron', 2, ap); f.put(CX + 5, y, 'apron', 3, ap)
        for x in range(span[top + 15][0], CX + 4): f.put(x, top + 15, 'apron', 2, ap)

    def side_arm(self, near):
        s, f, b = self.s, self.f, self.b
        sleeve = self.sleeve_ramp()
        short = self.short_sleeves()
        sw = self.swing if near else -self.swing
        sx, sy = CX + 1, 43 + b
        hx = sx - 5 * sw; hy = 64 + b - abs(sw)
        ap = f.part(sepk=3)
        m = []
        n = hy - sy
        for k in range(n + 1):
            t = k / max(1, n); xx = round(sx + (hx - sx) * t)
            for x in range(xx - 3, xx + 3): m.append((x, sy + k))
        m += [(x, sy - 1) for x in range(sx - 3, sx + 2)] + [(x, sy - 2) for x in range(sx - 2, sx + 1)]
        bias = 0.05 if near else -0.24
        if short:
            cut = sy + 8
            f.paint([p for p in m if p[1] <= cut], sleeve, ap, lo=1, hi=4, bias=bias)
            for x in range(sx - 5, sx + 4): f.step(x, cut, 1)
            sp = f.part()
            f.paint([(x, y) for (x, y) in m if y > cut and abs(x + 0.5 - (sx + (hx - sx) * (y - sy) / n)) < 2.5],
                    s['skin'], sp, lo=1, hi=3, bias=bias + 0.12)
        else:
            f.paint(m, sleeve, ap, lo=1, hi=4, bias=bias + (s.get('top_bias', 0) if sleeve == s['top'] else 0))
            for x in range(hx - 4, hx + 4):
                p = f.get(x, hy - 3)
                if p and p[2] == ap: f.step(x, hy - 3, 1)
            f.step(sx - 1, sy + 11, 1); f.step(sx, sy + 12, 1)
        hp = f.part()
        hm = [(hx - 2, hy), (hx - 1, hy), (hx, hy), (hx + 1, hy), (hx - 2, hy + 1), (hx - 1, hy + 1), (hx, hy + 1),
              (hx + 1, hy + 1), (hx - 2, hy + 2), (hx - 1, hy + 2), (hx, hy + 2), (hx - 1, hy + 3), (hx - 3, hy + 1)]
        f.paint(hm, s.get('gloves', s['skin']), hp, mode='sph', lo=1, hi=3, bias=bias + 0.12)
        if not near: return
        right_hand = self.near == 'right'
        if s.get('carry') == 'tote' and not right_hand:
            cp = f.part(); tr_ = s.get('tote', 'cream')
            m2 = rows({y: (hx - 4, hx + 3) for y in range(hy + 5, hy + 17)})
            f.paint(m2, tr_, cp, lo=1, hi=4)
            for y in range(hy + 2, hy + 5): f.put(hx - 1, y, tr_, 3, cp)
            f.put(hx - 3, hy + 4, 'wood', 1, cp); f.put(hx - 3, hy + 3, 'wood', 0, cp); f.put(hx + 1, hy + 4, 'leaf', 1, cp)
        if s.get('stick') and not right_hand:
            sp2 = f.part()
            for y in range(hy - 1, FEET + 1): f.put(hx - 3 - (y - hy) // 10, y, 'wood_dark', 1 if y < hy + 3 else 2, sp2)
        if s.get('leash') and right_hand:
            lp = f.part(shadow=False)
            for k in range(0, 14): f.put(hx - 3 - k // 3, hy + 3 + k, 'wine', 2, lp)
        if s.get('carry') == 'parcel' and not right_hand:
            cp = f.part()
            f.paint(rows({y: (hx - 6, hx + 2) for y in range(hy - 4, hy + 3)}), 'dirt', cp, mode='sph', lo=1, hi=3)

    def side_bag(self, far):
        s, f, b = self.s, self.f, self.b
        if not s.get('satchel'): return
        br = s.get('bag_ramp', 'leather')
        top = self.top
        big = s.get('bag_big')
        bag_on_near = self.near == 'left'      # the bag hangs at the character's left hip
        bw, bh = (12, 13) if big else (10, 11)
        if far:
            if bag_on_near: return
            bp = f.part()
            m = rows({y: (CX + 6, CX + 11) for y in range(top + 20, top + 20 + bh)})
            f.paint(m, br, bp, bias=-0.22, lo=2, hi=4)
            return
        sp = f.part(sep=False)
        if bag_on_near:
            for (x, y) in line(CX - 6, top + 3, CX + 3, top + 21):
                f.put(x, y, br, 1, sp); f.put(x + 1, y, br, 2, sp)
            bx, by = CX + 1, top + 20
            bp = f.part()
            m = rows({y: (bx, bx + bw - 1) for y in range(by, by + bh)})
            m = [p for p in m if not (p[1] == by + bh - 1 and p[0] in (bx, bx + bw - 1))]
            f.paint(m, br, bp, lo=1, hi=4, bias=0.06, mode='sph')
            fy = by + 5
            for x in range(bx, bx + bw):
                f.put(x, fy, br, 3, bp)
                if x % 2 == 0 and bx < x < bx + bw - 1: f.put(x, fy - 1, br, 0, bp)
            for x in range(bx, bx + bw): f.step(x, by, -1)
            kx = bx + bw // 2 - 1
            f.put(kx, fy - 1, 'gold', 0, bp); f.put(kx + 1, fy - 1, 'gold', 1, bp)
            f.put(kx, fy, 'gold', 1, bp); f.put(kx + 1, fy, 'gold', 3, bp)
            f.put(kx, fy + 1, 'gold', 2, bp); f.put(kx + 1, fy + 1, 'gold', 3, bp)
        else:
            for (x, y) in line(CX + 1, top, CX - 8, top + 19):
                f.put(x, y, br, 1, sp); f.put(x + 1, y, br, 2, sp)

    def side_head(self):
        s, f, b = self.s, self.f, self.b
        sk = s['skin']
        np_ = f.part()
        f.paint(rows({y: (CX - 3, CX + 3) for y in range(37 + b, 43 + b)}), sk, np_, bias=-0.3, lo=2, hi=3)
        hp = f.part()
        m = set(ell(CX + 0.8, 27.6 + b, 13.2, 12.8))
        m |= {(11, 31 + b), (10, 32 + b), (11, 32 + b), (10, 33 + b), (11, 33 + b)}   # nose
        m -= {(11, 36 + b), (11, 37 + b), (12, 38 + b), (11, 38 + b), (12, 39 + b), (13, 39 + b), (12, 40 + b),
              (13, 40 + b), (14, 40 + b), (11, 35 + b)}                          # the jaw curving under the chin
        m |= {(11, 34 + b)}
        self.face_mask = m
        f.paint(m, sk, hp, mode='sph', cx=CX - 3, rx=15, cy=25 + b, ry=16, bias=0.34, lo=1, hi=3,
                th=(0.99, 0.52, 0.30, 0.12))
        for (x, y) in m:                                       # jaw line and the shaded back of the head
            if (x, y + 1) not in m and x > 14: f.step(x, y, 1)
        ep = f.part(shadow=False)
        ear = [(x, y) for x in range(CX + 2, CX + 6) for y in range(27 + b, 34 + b)]
        ear = [p for p in ear if p not in {(CX + 2, 27 + b), (CX + 5, 27 + b), (CX + 5, 33 + b), (CX + 2, 33 + b)}]
        for (x, y) in ear: f.put(x, y, sk, 2, ep)
        for (x, y) in [(CX + 3, 29 + b), (CX + 3, 30 + b), (CX + 4, 29 + b), (CX + 3, 31 + b)]: f.put(x, y, sk, 3, ep)
        f.put(CX + 2, 28 + b, sk, 1, ep); f.put(CX + 4, 28 + b, sk, 1, ep); f.put(CX + 5, 30 + b, sk, 3, ep)
        if s.get('earrings'): f.put(CX + 3, 34 + b, 'gold', 1, ep)
        self.ear = set(ear)
        fp = f.part(shadow=False, sep=False)
        ey = 28 + b; ex = 14
        eye = s.get('eye', 'eye')
        for x in (ex, ex + 1, ex + 2): f.put(x, ey, OUT, 0, fp)
        f.put(ex + 3, ey - 1, OUT, 0, fp) if not s.get('glasses') else None
        f.put(ex, ey + 1, eye, 3, fp); f.put(ex + 1, ey + 1, eye, 0, fp); f.put(ex + 2, ey + 1, sk, 1, fp)
        f.put(ex, ey + 2, eye, 3, fp); f.put(ex + 1, ey + 2, eye, 4, fp)
        f.put(ex, ey + 3, eye, 2, fp); f.put(ex + 1, ey + 3, eye, 1, fp)
        br = s.get('brow', s['hair']); bi = s.get('brow_i', 3)
        by = ey - 3 if not s.get('glasses') else ey - 4
        for k, x in enumerate(range(ex - 1, ex + 4)): f.put(x, by + (1 if k == 4 else 0), br, bi, fp)
        f.put(ex + 2, ey + 6, sk + '_blush', 1, fp); f.put(ex + 3, ey + 6, sk + '_blush', 1, fp); f.put(ex + 4, ey + 6, sk + '_blush', 2, fp)
        f.put(11, 31 + b, sk, 1, fp); f.put(10, 32 + b, sk, 0, fp); f.put(10, 33 + b, sk, 2, fp); f.put(11, 34 + b, sk, 3, fp); f.put(12, 34 + b, sk, 2, fp)
        if not s.get('beard'):
            lp = sk + '_lip'
            f.put(11, 35 + b, lp, 2, fp) if (11, 35 + b) in m else None
            f.put(12, 35 + b, lp, 3, fp); f.put(13, 35 + b, lp, 3, fp); f.put(14, 34 + b, lp, 2, fp)
            f.put(12, 36 + b, lp, 1, fp)
        if s.get('age') == 'old': f.put(ex + 4, ey + 2, sk, 2, fp); f.put(ex + 4, ey + 3, sk, 2, fp)
        if s.get('beard'):
            bp = f.part(); hr = s.get('beard_ramp', s['hair'])
            style = s.get('beard')
            bm = []
            for (x, y) in m:
                if style == 'goatee':
                    if y >= 35 + b and x < 17: bm.append((x, y))
                    continue
                if y >= 34 + b and x < CX + 3: bm.append((x, y))
                elif y >= 31 + b and x >= 17 and x < CX + 3: bm.append((x, y))
                elif CX - 1 <= x <= CX + 1 and 26 + b <= y: bm.append((x, y))     # sideburn
            bm += [(x, 41 + b) for x in range(12, 20)] + [(x, 42 + b) for x in range(13, 18)]
            bm = [p for p in bm if p not in {(11, 35 + b), (12, 35 + b), (13, 35 + b)}]
            f.paint(bm, hr, bp, mode='sph', cx=CX - 3, rx=13, cy=31 + b, ry=12, lo=1, hi=4,
                    tex=lambda x, y: -0.16 if hash01(x, y // 2, 5) > 0.7 else 0)
            for x in range(10, 16): f.put(x, 34 + b, hr, 2 if x < 13 else 3, bp)
            f.put(11, 33 + b, hr, 2, bp)
            f.put(11, 35 + b, sk + '_lip', 3, bp); f.put(12, 35 + b, sk + '_lip', 2, bp)
        self.side_hair()
        if s.get('glasses'):
            gp = f.part(shadow=False, sep=False)
            rim = s.get('rim', 'rim_dark')
            for (x, y) in [(ex - 1, ey - 2), (ex, ey - 2), (ex + 1, ey - 2), (ex - 2, ey - 1), (ex - 2, ey), (ex - 2, ey + 1),
                           (ex - 2, ey + 2), (ex - 2, ey + 3), (ex - 1, ey + 4), (ex, ey + 4), (ex + 1, ey + 4), (ex + 2, ey + 3),
                           (ex + 2, ey - 1)]:
                f.put(x, y, rim, 1 if y < ey + 2 else 2, gp)
            for x in range(ex + 3, CX + 3): f.put(x, ey - 1, rim, 2, gp)
            f.put(ex - 1, ey - 1, 'lens', 0, gp)

    def side_hair(self):
        s, f, b = self.s, self.f, self.b
        st = s['hairStyle']; hr = s['hair']
        if st == 'bald':
            dp = f.part(sep=False)
            m = [p for p in ell(CX + 1, 25.5 + b, 13.4, 13.4) if p[1] < 23 + b]
            f.paint(m, s['skin'], dp, mode='sph', cx=CX - 3, rx=15, cy=20 + b, ry=13, bias=0.14, lo=0, hi=3,
                    th=(0.95, 0.66, 0.42, 0.2))
            for (x, y) in [(CX - 5, 14 + b), (CX - 4, 14 + b), (CX - 5, 15 + b)]: f.put(x, y, s['skin'], 0, dp)
            hp = f.part()
            mm = [p for p in ell(CX + 7, 30 + b, 8.4, 6.4) if p[0] >= CX + 5 and p not in self.ear and p in self.face_mask]
            f.paint(mm, hr, hp, mode='sph', lo=1, hi=4, tex=lambda x, y: -0.14 if (x + 2 * y) % 5 == 0 else 0.03)
            self.hair_mask = set(mm)
            return
        geo = {'curly': (16.6, 16.2, 1.8, 23.6), 'bob': (15.4, 16.2, 1.6, 25.4), 'short': (14.2, 13.2, 1.4, 24.4),
               'bun': (14.6, 13.8, 1.6, 24.2), 'ponytail': (14.6, 13.8, 1.6, 24.2), 'long': (15.0, 14.4, 1.8, 24.4)}
        crx, cry, ox, ccy = geo[st]
        ccx = CX + ox
        cran = set(ell(ccx, ccy + b, crx, cry))
        front = {'bun': 19.2, 'bob': 23.5, 'short': 18.6, 'curly': 20.6, 'ponytail': 19.0, 'long': 19.6}[st]
        back_low = {'short': 36, 'bun': 38, 'ponytail': 36, 'bob': 41, 'curly': 39, 'long': 42}[st]
        m = set()
        sideburn = {'short': 31, 'bun': 27, 'ponytail': 27, 'bob': 40, 'curly': 34, 'long': 40}[st]
        for (x, y) in cran:
            if (x, y) not in self.face_mask: m.add((x, y)); continue
            yy = y + 0.5 - b
            if x <= CX + 1:
                # front hairline: from the forehead sweeping back and down towards the top of the ear
                t = max(0.0, (x - 12) / (CX + 1 - 12))
                lim = front + t * t * 8.5
                if st == 'bob': lim = front + 1 + (t > 0.78) * 20
                if st in ('long', 'curly') and t > 0.7: lim = sideburn
                if x >= CX - 1 and st in ('short',): lim = max(lim, sideburn)
                if yy < lim: m.add((x, y))
            elif x <= CX + 1 + 0:
                pass
            else:
                if yy < back_low: m.add((x, y))
        if st == 'bob':
            for y in range(26 + b, 42 + b):
                for x in range(CX - 2, CX + 16):
                    if ((x + 0.5 - ccx - 1) / 15.6) ** 2 + ((y + 0.5 - 27 - b) / 15.4) ** 2 < 1: m.add((x, y))
        if st == 'long':
            for y in range(26 + b, 46 + b):
                for x in range(CX - 1, CX + 15 - max(0, y - 40 - b)): m.add((x, y))
        if st == 'curly':
            for k in range(26):
                a = k / 26 * math.tau
                bx = ccx + math.cos(a) * (crx + 0.2); by = ccy + b + math.sin(a) * (cry + 0.1)
                if by > 28 + b and bx < CX: continue
                for p in ell(bx, by, 2.4, 2.4): m.add(p)
        if st not in ('bob', 'long', 'curly'):
            m -= self.ear
        if s.get('hat'): m = set(p for p in m if p[1] > 20 + b)
        pid = f.part()
        pivot = (CX - 7, 11 + b) if st != 'curly' else (CX + 2, 22 + b)

        def tex(x, y):
            if st == 'curly':
                u, v = x % 4, (y + (x // 4) * 2) % 4
                if (u, v) in ((1, 1), (2, 1)): return 0.16
                if (u, v) in ((1, 3), (2, 3), (0, 2)): return -0.18
                return 0.0
            return strands(x, y, pivot[0], pivot[1], 2.3, 1.7)
        f.paint(m, hr, pid, mode='sph', cx=ccx - 4, rx=crx + 3, cy=ccy - 5 + b, ry=cry + 5, bias=0.04,
                lo=0, hi=4, tex=tex, th=(0.92, 0.70, 0.46, 0.25))
        for (x, y) in m:
            if (x, y + 1) in self.face_mask and (x, y + 1) not in m and x < CX - 2: f.step(x, y, 1)
        self.hair_mask = m
        if st == 'bun' and not s.get('hat'):
            bp = f.part()
            bcx, bcy = CX + 9.5, 10.5 + b
            bm = ell(bcx, bcy, 6.8, 6.4)
            ring = set(bm)
            f.paint(bm, hr, bp, mode='sph', cx=bcx - 1.5, rx=7.5, cy=bcy - 1.5, ry=7, bias=0.08, lo=0, hi=4,
                    tex=lambda x, y: strands(x, y, bcx, bcy, 1.2, 0.4, 0.06))
            for (x, y) in bm:
                if (x, y + 1) not in ring and (x, y + 1) in m: f.put(x, y, hr, 4, bp)
                elif (x - 1, y + 1) in m and (x - 1, y + 1) not in ring and x < bcx: f.put(x, y, hr, 4, bp)
        if st == 'bun' and s.get('hat'):
            bp = f.part()
            f.paint(ell(CX + 12, 29 + b, 4.6, 4.2), hr, bp, mode='sph', bias=0.05, lo=0, hi=4)
        if st == 'ponytail':
            pp = f.part()
            pm = []
            path = [(CX + 13, 20), (CX + 14, 22), (CX + 15, 24), (CX + 16, 26), (CX + 16, 28), (CX + 16, 30),
                    (CX + 16, 32), (CX + 15, 34), (CX + 15, 36), (CX + 14, 38), (CX + 14, 40), (CX + 13, 42), (CX + 12, 44)]
            for k, (x, y) in enumerate(path):
                w = 2 if k < 9 else 1
                for yy in (y, y + 1):
                    for dx_ in range(-w, w + 1): pm.append((x + dx_, yy + b))
            f.paint(pm, hr, pp, bias=0.02, lo=0, hi=4, tex=lambda x, y: strands(x, y, CX, 8 + b, 9, 2))
            tie = f.part(); scr = s.get('scrunchie', 'teal')
            for (x, y) in [(CX + 12, 19), (CX + 13, 19), (CX + 13, 20), (CX + 14, 20), (CX + 14, 21)]:
                f.put(x, y + b, scr, 1 if x < CX + 13 else 2, tie)

    def side_hat(self):
        s, f, b = self.s, self.f, self.b
        if s.get('hat'):
            hr = s['hat']; hp = f.part()
            dome = [p for p in ell(CX + 1.5, 21 + b, 14.6, 13) if p[1] <= 20 + b]
            f.paint(dome, hr, hp, mode='sph', cx=CX - 3, rx=16, cy=15 + b, ry=13, bias=0.12, lo=0, hi=3)
            for x in range(CX - 16, CX + 17): f.put(x, 22 + b, hr, 2 if x < CX + 6 else 3, hp)
            for x in range(CX - 15, CX + 17): f.put(x, 21 + b, hr, 1 if x < CX + 4 else 2, hp)
            for x in range(CX - 17, CX - 11): f.put(x, 23 + b, hr, 3, hp)            # the peak
            for x in range(CX - 8, CX + 10):
                if f.has(x, 9 + b): f.put(x, 9 + b, hr, 0, hp)
            for x in range(CX - 6, CX + 8): f.put(x, 10 + b, hr, 0 if x < CX else 1, hp) if f.has(x, 10 + b) else None
            return
        if s.get('cap'):
            cr = s['cap']; cp = f.part()
            dome = [p for p in ell(CX + 1.5, 21.5 + b, 14.2, 11.4) if p[1] <= 20 + b]
            f.paint(dome, cr, cp, mode='sph', cx=CX - 3, rx=16, cy=15 + b, ry=12, lo=1, hi=4)
            for x in range(CX - 21, CX - 9):
                f.put(x, 20 + b, cr, 2, cp); f.put(x, 21 + b, cr, 3, cp)
            for x in range(CX - 20, CX - 10): f.put(x, 22 + b, cr, 4, cp)
            f.put(CX + 14, 20 + b, 'sole', 2, cp); f.put(CX + 13, 20 + b, 'sole', 2, cp)
            for y in range(11 + b, 21 + b): f.step(CX - 2 + (y - 11 - b) // 5, y, 1)
            return
        if s.get('flatcap'):
            cr = s['flatcap']; cp = f.part()
            dome = [p for p in ell(CX + 2, 20 + b, 15, 8.4) if p[1] <= 22 + b]
            f.paint(dome, cr, cp, mode='sph', cx=CX - 3, rx=17, cy=16 + b, ry=9, lo=1, hi=4,
                    tex=lambda x, y: (-0.12 if (x + y) % 4 == 0 else 0.03) if (x // 2) % 2 else (-0.12 if (x - y) % 4 == 0 else 0.03))
            for x in range(CX - 18, CX - 10): f.put(x, 22 + b, cr, 3, cp)
            for x in range(CX - 17, CX - 10): f.put(x, 21 + b, cr, 2, cp)
            return

    # ============================================================================ render
    def render(self):
        if self.side: self.draw_side()
        else: self.draw_frontback()
        cv = self.f.finish()
        if self.view == 'right': cv = cv.flip()
        return cv


def render(spec, view, frame):
    return Person(spec, view, frame).render()
