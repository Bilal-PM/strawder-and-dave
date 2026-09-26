"""LINESIDE HD people: part generators and the four-view walking renderer (48 x 96 frames, feet at (24, 93)).

render(spec, view, frame) -> pix.Canvas 48x96.
view: 'down' (front), 'up' (back), 'left', 'right', or a seated row 'sit_down' / 'sit_up'.
frame: the sheet column (anim.py): 0 = standing, 1-12 = the walk cycle, 13-16 = idle; seated rows use 0-2.
A spec is a plain dict (see cast.py): ramps for skin / hair / clothes plus style switches.

Everything is painted as parts on a fig.Fig (ramp + step per pixel), back to front, then finished (occlusion,
separation lines, outline). Right-facing frames are painted as left-facing with the light mirrored, then flipped,
with asymmetric details (satchel side, hair parting, ponytail) placed for the side that faces the viewer.
"""
import math
from fig import Fig, OUT, ell, rows, line, poly, lum, tone
from pix import RAMPS, hash01

W, H = 48, 102
PAD = 4            # headroom: the figure is drawn 4 rows down the frame so a bun or a bob-up never clips the top
CX = 24            # the body's centre line runs between columns 23 and 24
SH_Y = 41          # top row of the shoulders
FEET = 93          # the sole row in figure space; in the frame it is FEET + PAD, the anchor is (24, 97)


def mx(x):
    """Mirror a column across the centre line."""
    return 2 * CX - 1 - x


# ------------------------------------------------------------------ poses
# The motion model lives in anim.py (Pose): 13 sheet columns (0 stand, 1-8 walk, 9-12 idle). The head, hair and
# torso are painted once per frame with only a vertical offset (bob / breath), so the face never shimmers.
from anim import Pose, NCOLS, NW, NI, SIT_COLS, paint_limb, capsule, ik, rot
NFRAMES = NCOLS


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
    def __init__(self, spec, view, frame, row=None):
        self.s = spec; self.view = view; self.frame = frame
        self.side = view in ('left', 'right')
        self.near = 'right' if view == 'left' else 'left'   # the character's side that faces us in profile
        self.f = Fig(W, H, lx=(-1 if view == 'right' else 1), base=PAD)
        self.P = P = Pose(view, frame, stride=spec.get('stride', 1.0), row=row)
        self.sit = P.sit
        self.bob = P.bob
        self.b = P.breath                 # the upper body (head, shoulders, arms) rises 1px on the in-breath
        ts = spec['topStyle']
        self.bot = TOP_BOT[ts] if ts != 'coat' else spec.get('hem', 76)
        self.top = SH_Y + self.b
        self.hair_mask = set()

    def sleeve_ramp(self):
        s = self.s; ts = s['topStyle']
        if ts == 'hivis': return s.get('sleeve', 'navy')
        return s.get('sleeve', s['top'])

    def short_sleeves(self):
        return self.s['topStyle'] in ('tee', 'polo') or self.s.get('short_sleeves')

    # ============================================================================ FRONT / BACK
    SIT = 15      # seated: the upper body drops this far (the seat is about knee height, 16 px above the soles)

    def draw_sit(self, back):
        """Seated on a chair, seen from the front (sit_down) or from behind (sit_up). The torso stops at the seat,
        the thighs lie on it towards the viewer, the shins hang down to the floor. Feet stay on the anchor."""
        s, f, P = self.s, self.f, self.P
        self.bot = min(self.bot, 66)
        if not back:
            f.oy = 0
            self.sit_shins()
        f.oy = self.SIT
        self.hair_behind_fb(back)
        if not back: self.hood_front()
        self.arms_fb(back, behind=True)
        self.torso_fb(back)
        if back: self.hood_back()
        if not back:
            f.oy = 0
            self.sit_lap()
            f.oy = self.SIT
        self.arms_fb(back, behind=False)
        self.bag_fb(back)
        self.head_fb(back)
        self.hat_fb(back)
        f.oy = 0

    def sit_shins(self):
        s, f = self.s, self.f
        lw = s.get('legwear', 'trousers'); lr = s.get('legs', 'charcoal'); ft = s.get('feet', 'boots')
        fr = s.get('feet_ramp', 'leather')
        lrp = lr if lw != 'skirt' else s.get('tights', lr)
        for side in ('L', 'R'):
            L = side == 'L'
            cx = 19 if L else 29
            fh = self.FOOT_H.get(ft, 11)
            ankle_y = FEET - fh + 3
            pid = f.part()
            rp = s['skin'] if lw == 'shorts' else lrp
            paint_limb(f, [(cx, 84), (cx, ankle_y)], [3.8, 3.4], rp, pid, bias=(0.06 if L else -0.06), lo=1, hi=4)
            if lw == 'trousers':
                for x in range(cx - 3, cx + 4): f.step(x, ankle_y, 1)
            self.foot_fb(cx - 5, 9, FEET, fh, ft, fr, side, False, 0, 0, 0.0)

    def sit_lap(self):
        """The thighs on the seat, foreshortened towards us: a shallow block from the hips to two rounded knees.
        A coat or a skirt drapes over them to the knee."""
        s, f = self.s, self.f
        ts = s['topStyle']; lw = s.get('legwear', 'trousers')
        if ts == 'coat': rp = s['top']
        elif lw == 'skirt': rp = s.get('skirt', 'charcoal')
        else: rp = s.get('legs', 'charcoal')
        y0, y1 = 80, 86
        m = []
        for y in range(y0, y1 + 1):
            for x in range(CX - 12, CX + 12):
                kx = (x + 0.5 - (CX - 5.5)) if x < CX else (x + 0.5 - (CX + 5.5))
                if y == y1 and abs(kx) > 3.5: continue                          # two rounded knees
                if y == y1 - 1 and abs(kx) > 4.8: continue
                if y == y0 and (x < CX - 11 or x > CX + 10): continue
                m.append((x, y))
        pid = f.part()
        f.paint(m, rp, pid, mode='cyl', cx=CX, rx=13, bias=0.0, lo=1, hi=4, tilt=-0.45,
                tex=(lambda x, y: (-0.22 if x % 4 == 0 else 0)) if (lw == 'skirt' and ts != 'coat') else None)
        for y in range(y0 + 1, y1 + 1): f.step(CX - 1, y, 1); f.step(CX, y, 2)   # the gap between the knees
        for x in range(CX - 11, CX + 11): f.step(x, y0, 1)                           # under the torso
        for x in (CX - 7, CX - 6, CX - 5, CX + 4, CX + 5, CX + 6): f.step(x, y1 - 2, -1)   # lit kneecaps
        for (x, y) in m:                                                                     # the knee's underside
            if (x, y + 1) not in m: f.step(x, y, 1)
        sp = f.part(shadow=False)
        for x in range(CX - 10, CX + 10):                                                    # its shadow on the shins
            p = f.get(x, y1 + 1)
            if p and p[2] != pid: f.step(x, y1 + 1, 1)

    def draw_frontback(self):
        back = self.view == 'up'
        f, P = self.f, self.P
        if self.sit: return self.draw_sit(back)
        up = P.sway                                # the upper body rides over the planted leg
        f.oy = self.bob; f.ox = up + P.lag_x
        self.hair_behind_fb(back)
        f.ox = up
        if not back: self.hood_front()
        f.oy = 0; f.ox = 0
        self.legs_fb(back)
        f.oy = self.bob; f.ox = up
        self.skirt_fb()
        self.arms_fb(back, behind=True)           # an arm swinging away passes behind the body
        self.torso_fb(back)
        if back: self.hood_back()
        self.arms_fb(back, behind=False)
        f.oy = self.bob + P.lag_bob; f.ox = P.hang_x   # the satchel trails the body: a damped swing
        self.bag_fb(back)
        f.oy = self.bob; f.ox = up
        self.head_fb(back)
        self.hat_fb(back)
        f.ox = 0

    # ---- long hair hanging behind the shoulders
    def hair_behind_fb(self, back):
        s, f, b = self.s, self.f, self.b
        if s['hairStyle'] != 'long' or back: return
        hr = s['hair']; pid = f.part(sep=False)
        lag = self.P.lag_bob
        m = []
        for y in range(30 + b, 56 + b + lag):
            for x in range(9, 39):
                inner = abs(x + 0.5 - CX) < 10
                if inner and y > 36 + b: continue
                if y > 52 + b + lag and abs(x + 0.5 - CX) > 14 - (y - 52 - b - lag): continue
                m.append((x, y))
        f.paint(m, hr, pid, bias=-0.14, lo=2, hi=4, tex=lambda x, y: strands(x, y, CX, -12 + b, 14, 3))

    # ---- legs and feet: each leg steps along its own stride (the leading foot drops lower on screen and reads
    # 1px bigger, the trailing foot rises and shortens), the hips carry the weight over the stance leg
    FOOT_H = {'boots': 11, 'shoes': 5, 'trainers': 6, 'wellies': 16}

    def legs_fb(self, back, hip_y=None, seated=False):
        s, f, P = self.s, self.f, self.P
        lw = s.get('legwear', 'trousers'); lr = s.get('legs', 'charcoal'); ft = s.get('feet', 'boots')
        fr = s.get('feet_ramp', 'leather')
        hip_y = (62 + self.bob) if hip_y is None else hip_y
        order = sorted(('L', 'R'), key=lambda sd: P.leg[sd]['near'])        # the far leg first
        for side in order:
            lg = P.leg[side]
            k = 0.55 + 0.45 * min(1.0, P.stride)            # older folk take shorter, lower steps
            near, lift, toe, bend = lg['near'] * k, lg['lift'] * k, lg['toe'], lg.get('bend', 0.0)
            L = side == 'L'
            inward = 1 if L else -1
            grow = 1 if near > 0.55 else (-1 if near < -0.55 else 0)
            cx = (19 if L else 29)
            # the stepping foot: ahead of the body it lands lower on screen (towards us) and a pixel bigger; behind
            # it rises and shortens. The swinging foot lifts 3-4 px, the knee bends and drifts a pixel inward.
            gy = FEET + int(round(1.8 * near))
            base = gy - int(round(lift))
            fh0 = self.FOOT_H.get(ft, 11)
            fh = fh0 + (1 if grow > 0 else 0) - (1 if (toe and not back) else 0)
            if lift >= 1.5 and not back and ft in ('boots', 'wellies'): fh -= 1        # toe dropped: foreshortened
            ankle_y = base - fh + 3
            hx = cx + P.hip_sway
            kx = cx + inward * (1 if bend > 0.6 else 0)
            lrp = lr if lw != 'skirt' else s.get('tights', lr)
            depth_bias = 0.05 * near - (0.03 if lift else 0)
            far = 1 if near < -0.55 else 0                                  # the leg stepping away: a step darker
            r = 4.0 + 0.25 * grow
            pid = f.part()
            knee_y = hip_y + (ankle_y - hip_y) * (0.46 if not bend else 0.46 + 0.06 * bend)
            m = paint_limb(f, [(hx, hip_y), (kx, knee_y), (cx, ankle_y)], [r, r - 0.1, r - 0.45],
                           lrp, pid, bias=(0.06 if L else -0.06) + depth_bias, lo=1, hi=4, far=far)
            knee_y = int(round(knee_y))
            xs = sorted(set(x for x, y in m))
            x0, x1 = xs[0], xs[-1]
            if lw == 'trousers':
                for y in range(knee_y + 2, ankle_y + 1): f.step(x0 + 3, y, 1)          # crease
                for y in range(knee_y + 2, ankle_y + 1): f.step(x0 + 2, y, -1)
                if bend > 0.3:
                    if not back:                                                 # knee pushes towards us: lit cap
                        for x in range(x0 + 2, x1 - 1): f.step(x, knee_y - 1, -1)
                        for x in range(x0 + 1, x1): f.step(x, knee_y + 1, 1)
                        f.step(x0 + 2, knee_y, -1)
                    else:                                                        # the crease behind the knee
                        for x in range(x0 + 1, x1): f.step(x, knee_y, 1)
                        for x in range(x0 + 2, x1 - 1): f.step(x, knee_y + 1, 1)
                for x in range(x0, x1 + 1): f.step(x, ankle_y, 1)                        # break over the shoe
            if lw == 'shorts':
                lb = 74
                for (x, y) in m:
                    if y > lb: f.erase(x, y)
                for x in range(x0, x1 + 1): f.step(x, lb, 1)
                sm = rows({y: (x0 + 1, x1 - 1) for y in range(lb + 1, ankle_y + 1)})
                f.paint(sm, s['skin'], f.part(), bias=0.1 + depth_bias - 0.1 * far, lo=1, hi=3)
                sk = rows({y: (x0 + 1, x1 - 1) for y in range(ankle_y - 4, ankle_y + 1)})
                f.paint(sk, s.get('socks', 'white'), f.part(), lo=1, hi=3)
            fw = 9 + grow
            fx0 = cx - 5 - (grow if L else 0)
            self.foot_fb(fx0, fw, base, fh, ft, fr, side, back, lift, toe, depth_bias - 0.08 * far)

    def foot_fb(self, x0, fw, base, fh, ft, fr, side, back, lift, toe, bias):
        f, s = self.f, self.s
        L = side == 'L'
        x1 = x0 + fw - 1
        top = base - fh + 1
        lace = x0 + fw // 2 - (0 if L else -0)
        if ft == 'wellies':
            m = rows({y: (x0 + (0 if y > base - 5 else 1), x1 - (0 if y > base - 5 else 1)) for y in range(top, base + 1)})
            pid = f.paint(m, s.get('welly', 'welly'), f.part(), lo=1, hi=4, bias=0.05 + bias)
            for x in range(x0 + 1, x1): f.step(x, top, -1); f.step(x, top + 1, 1)
            for x in range(x0, x1 + 1): f.put(x, base, 'sole', 2, pid)
            f.put(x0 + (2 if L else fw - 3), base - 3, s.get('welly', 'welly'), 0, pid)
        elif ft == 'trainers':
            m = rows({y: (x0, x1) for y in range(top, base + 1)})
            m = [p for p in m if not (p[1] == top and p[0] in (x0, x1))]
            pid = f.paint(m, 'trainer', f.part(), lo=1, hi=3, bias=bias)
            for x in range(x0, x1 + 1): f.put(x, base, 'sole', 1, pid); f.put(x, base - 1, 'trainer', 3, pid)
            if not back:
                for x in range(x0 + 2, x1 - 1): f.put(x, base - 3, s.get('accent', 'paint_red'), 1 if x < x0 + 4 else 2, pid)
                f.put(x0 + fw // 2, top, 'trainer', 3, pid)
        elif ft == 'shoes':
            m = rows({top: (x0 + 1, x1 - 1), **{y: (x0, x1) for y in range(top + 1, base)}})
            pid = f.paint(m, fr, f.part(), lo=1, hi=4, mode='sph', bias=bias)
            if not back:
                f.put(x0 + (2 if L else fw - 4), top + 1, fr, 0, pid); f.put(x0 + (3 if L else fw - 3), top + 1, fr, 1, pid)
            for x in range(x0, x1 + 1): f.put(x, base, 'sole', 2, pid)
        else:
            # boots: shaft, laced front, lit toe cap, welted sole
            spans = {}
            for y in range(top, base + 1):
                spans[y] = (x0 + 1, x1 - 1) if y < top + fh // 2 else (x0, x1)
            m = rows(spans)
            m = [p for p in m if not (p[1] == base - 1 and p[0] in (x0, x1))]
            pid = f.paint(m, fr, f.part(), lo=1, hi=4, bias=0.02 + bias)
            for x in range(x0 + 1, x1): f.step(x, top, -1); f.step(x, top + 1, 1)     # rolled collar
            if not back:
                lx = x0 + 3 + (0 if L else 1)
                for k, dy_ in enumerate(range(2, fh - 5)):
                    f.put(lx + (k % 2), top + dy_, 'gold', 2 if dy_ % 2 == 0 else 3, pid)   # laces
                    f.step(x0 + (2 if L else fw - 3), top + dy_, 1)                           # tongue edge
                tx = x0 + (2 if L else fw - 4)
                f.put(tx, base - 3, fr, 0, pid); f.put(tx + 1, base - 3, fr, 1, pid); f.put(tx, base - 2, fr, 1, pid)
            else:
                for x in range(x0 + 1, x1): f.step(x, base - 4, 1)                        # heel counter
                f.put(x0 + 3, top + 1, fr, 3, pid); f.put(x0 + 4, top + 1, fr, 3, pid)      # pull tab
            for x in range(x0, x1 + 1): f.put(x, base, 'sole', 2, pid); f.put(x, base - 1, fr, 3, pid)
        if back and (lift or toe):
            # walking away, the lifting foot shows its sole and heel to the viewer
            for x in range(x0 + 1, x1):
                f.put(x, base, 'sole', 1, pid); f.put(x, base - 1, 'sole', 2, pid)
            f.put(x0 + 2, base - 1, 'sole', 0, pid)

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
            a0, a1 = round(CX - w), round(CX + w - 1)
            if bot - y < 4 and bot - top > 24:       # a long hem flares out over the leading knee, a frame late
                fl_ = self.P.hem_flare
                if fl_ > 0.5: a0 -= 1
                elif fl_ < -0.5: a1 += 1
            span[y] = (a0, a1)
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
        for y in range(top + 7, (80 if not self.sit else 67) + b):
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

    # ---- arms and hands: upper arm + forearm with a soft elbow. An arm swinging towards the viewer drops its hand
    # lower on screen, tucks it in towards the body and reads a pixel bigger; one swinging away rises, narrows, darkens
    def arms_fb(self, back, behind=False):
        s, f, b, P = self.s, self.f, self.b, self.P
        sh = s.get('sh', 12); ts = s['topStyle']
        sleeve = self.sleeve_ramp()
        short = self.short_sleeves()
        for side in ('L', 'R'):
            L = side == 'L'
            sgn = -1 if L else 1                      # outward
            a = P.arm[side]
            na = a if not back else -a                 # + = the hand comes towards the viewer
            if (na < -0.3) != behind: continue
            cxa = (CX - sh) if L else (CX + sh)        # arm centre line (6 wide)
            # the leading shoulder rolls forward and down; the shoulder over the planted leg dips a pixel
            top = 42 + b + (1 if na > 0.5 else 0) + P.sh_drop[side]
            sho = (cxa + sgn * 0.2, top + 2)
            # the elbow bends as the forearm swings: forwards it comes in and down towards us, back it rises
            elb = (cxa + sgn * (0.9 + 0.9 * max(0, na) - 0.3 * max(0, -na)), top + 11 + 0.8 * max(0, na) - 1.2 * max(0, -na))
            wy = 63 + b + (round(5.2 * na) if na >= 0 else round(4.0 * na)) + P.sh_drop[side]
            wx = cxa + sgn * (1.0 - 3.6 * max(0, na) + 0.6 * max(0, -na))
            wri = (wx, wy)
            ap = f.part(sepk=3)
            dim = -0.1 if na < -0.3 else (0.04 if na > 0.3 else 0)
            bias = (0.08 if L else -0.02) + dim
            if short:
                m = paint_limb(f, [sho, elb, wri], [3.1, 2.9, 2.5], sleeve, ap, bias=bias, lo=1, hi=4,
                               clip=lambda x, y, t: y <= top + 8)
                for (x, y) in m:
                    if y == top + 8: f.step(x, y, 1)
                sp = f.part(sepk=1)
                paint_limb(f, [(elb[0], top + 8), elb, wri], [2.3, 2.3, 2.1], s['skin'], sp, bias=bias + 0.14, lo=1, hi=3,
                           clip=lambda x, y, t: y > top + 8)
            else:
                m = paint_limb(f, [sho, elb, wri], [3.2, 2.9, 2.6], sleeve, ap,
                               bias=bias + (s.get('top_bias', 0) if sleeve == s['top'] else 0), lo=1, hi=4)
                cuff = s.get('cuff')
                for (x, y) in m:
                    if y == wy - 2:
                        f.step(x, y, 1)
                        if ts in ('cardigan', 'hoodie') or cuff: f.step(x, y + 1, -1 + (x % 2))
                # elbow: a crease on the inside of the bend, deeper when the forearm swings forward
                ex, ey_ = int(round(elb[0])), int(round(elb[1]))
                inner = -sgn
                f.step(ex + inner, ey_, 1); f.step(ex + inner, ey_ + 1, 1 if abs(na) > 0.3 else 0)
                f.step(ex - inner, ey_ - 1, -1)
                if ts == 'coat' and not back:
                    self.button(int(round(wx)) - 1, wy - 4, ap, small=True)
            # hand: 4x4 with a thumb; leading hands 5 wide, trailing hands 3 tall
            hw = 5 if na > 0.45 else (3 if na < -0.6 else 4)
            hh = 5 if na > 0.75 else (3 if na < -0.5 else 4)
            hx = int(round(wx - hw / 2))
            hy = wy
            hp = f.part()
            hm = [(x, y) for y in range(hy, hy + hh) for x in range(hx, hx + hw)
                  if not (y == hy + hh - 1 and x in (hx, hx + hw - 1))]
            hm.append((hx - 1, hy + 1) if not L else (hx + hw, hy + 1))    # thumb, on the body side
            f.paint(hm, s.get('gloves', s['skin']), hp, mode='sph', lo=1, hi=3, bias=(0.12 if L else 0.02) + dim)
            for x in range(hx + 1, hx + hw - 1): f.step(x, hy + hh - 2, 1) if x % 2 == 0 else None   # finger gaps
            self.hand_props(side, hx - 1 if hw == 4 else hx - 1, hy, back)

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
            for y in range(hy - 1, FEET + 1 - f.oy):
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
            if self.P.blink:   # closed: the lid comes down, the lash line curves under it
                for k in range(3): f.put(ex + k, ey, sk, 1, fp); f.put(ex + k, ey + 1, sk, 1, fp)
                for k in range(3): f.put(ex + k, ey + 2, OUT, 0, fp)
                f.put(ex - 1 if L else ex + 3, ey + 1, OUT, 0, fp)
                f.put(ex - 1 if L else ex + 3, ey, sk, 1, fp)
            else:
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
            mc = 'wine' if s.get('lipstick') else lp
            f.put(CX - 2, my - 1, lp, 2, fp); f.put(CX - 1, my, mc, 3 if mc == lp else 2, fp)
            f.put(CX, my, mc, 3 if mc == lp else 2, fp); f.put(CX + 1, my - 1, lp, 2, fp)
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
        mouth = {(CX - 1, ey + 9), (CX, ey + 9)}
        m = [p for p in m if p not in mouth]
        f.paint(m, hr, bp, mode='sph', cx=CX - 2, rx=14, cy=ey + 4, ry=13, bias=0.02, lo=1, hi=4,
                tex=lambda x, y: -0.16 if (hash01(x, y // 2, 5) > 0.7) else (0.06 if (x + y) % 5 == 0 else 0))
        # moustache
        for x in range(CX - 4, CX + 4):
            f.put(x, ey + 7, hr, 1 if x < CX - 1 else (2 if x < CX + 2 else 3), bp)
        for x in range(CX - 3, CX + 3): f.put(x, ey + 8, hr, 2 if x < CX else 3, bp)
        f.put(CX - 5, ey + 8, hr, 2, bp); f.put(CX + 4, ey + 8, hr, 3, bp)
        lp = s['skin'] + '_lip'
        f.put(CX - 1, ey + 9, lp, 3, bp); f.put(CX, ey + 9, lp, 3, bp)

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
        for x in (CX - 12, CX - 11, CX + 10, CX + 11):                                      # arms to the ears,
            if (x, ey) in self.hair_mask or (x, ey) in self.face_mask:                       # inside the silhouette
                f.put(x, ey, rim, 2 if x < CX else 3, gp)

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
            cy = 6.8 + b + self.P.lag_bob          # trails the head by a frame
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
            cy = (11.4 if not hat else 30) + b + self.P.lag_bob
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
            lag = self.P.lag_bob
            for y in range(31 + b, 52 + b + lag):
                w = 3 if y < 46 + b + lag else 3 - (y - 46 - b - lag) // 2
                sway = (1 if y > 42 + b else 0) + (self.P.lag_x if y > 44 + b else 0)
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
        f, P = self.f, self.P
        lean = P.lean                                  # the upper body leans a pixel into the walk
        self.side_span = self._side_span()
        f.oy = self.bob; f.ox = lean
        self.side_hair_behind()
        self.side_arm(False)
        f.oy = 0; f.ox = 0
        self.side_legs()
        f.oy = self.bob + P.lag_bob; f.ox = lean + P.bag_dx
        self.side_bag(far=True)
        f.oy = self.bob; f.ox = lean
        self.side_torso()
        self.side_head()
        self.side_arm(True)
        f.oy = self.bob + P.lag_bob; f.ox = lean + P.bag_dx   # the satchel swings on its strap, a beat behind
        self.side_bag(far=False)
        f.oy = self.bob; f.ox = lean
        self.side_hat()
        f.ox = 0

    def side_hair_behind(self):
        s, f, b = self.s, self.f, self.b
        if s['hairStyle'] != 'long': return
        hp = f.part(sep=False)
        lag = self.P.lag_bob
        m = []
        for y in range(28 + b, 56 + b + lag):
            for x in range(CX + 2, CX + 14 - max(0, y - 50 - b - lag)): m.append((x, y))
        f.paint(m, s['hair'], hp, bias=-0.1, lo=1, hi=4, tex=lambda x, y: strands(x, y, CX + 4, 4 + b, 12, 2))

    # ---- profile legs: two hip pivots, two-bone IK, heel strike / flat / toe-off / swing foot pitch
    L_THIGH, L_SHIN = 13.4, 13.4
    SOLE_Y = FEET + 1.0                       # the ground line under the sole row
    FOOT = {   # foot outline in ankle-local coordinates (facing left), sole at y = 5.5
        'boots':    [(-3.2, -1.0), (3.2, -1.0), (3.7, 5.5), (-6.0, 5.5), (-7.0, 4.6), (-6.9, 3.2), (-4.8, 1.6)],
        'shoes':    [(-2.8, 1.2), (3.0, 1.2), (3.5, 5.5), (-6.4, 5.5), (-7.2, 4.5), (-5.6, 2.9)],
        'trainers': [(-3.0, 0.2), (3.4, 0.2), (3.9, 5.5), (-6.8, 5.5), (-7.4, 4.0), (-5.6, 1.9)],
        'wellies':  [(-3.4, -1.0), (3.6, -1.0), (3.9, 5.5), (-6.4, 5.5), (-7.0, 3.8), (-5.0, 1.8)],
    }
    SHAFT = {'boots': 6, 'wellies': 12, 'shoes': 0, 'trainers': 0}

    def side_leg_geo(self, which, pose=None):
        P = pose or self.P
        lg = P.sleg[which]
        ft = self.s.get('feet', 'boots')
        far = which == 'far'
        hip = (CX - 1.5 + (2 if far else 0), 62.5 + P.bob - (0.5 if far else 0))
        ang = math.radians(lg['fa'])
        poly_ = rot(self.FOOT[ft], ang, (0, 0))
        low = max(y for x, y in poly_)
        ankle = (hip[0] + lg['ax'], self.SOLE_Y - lg['lift'] - low)
        knee = ik(hip, ankle, self.L_THIGH, self.L_SHIN, forward=-1)
        return hip, knee, ankle, ang, lg

    def side_legs(self):
        s, f = self.s, self.f
        lw = s.get('legwear', 'trousers'); lr = s.get('legs', 'charcoal'); ft = s.get('feet', 'boots')
        fr = s.get('feet_ramp', 'leather')
        lrp = lr if lw != 'skirt' else s.get('tights', lr)
        for which in ('far', 'near'):
            far = which == 'far'
            hip, knee, ankle, ang, lg = self.side_leg_geo(which)
            bias = -0.1 if far else 0.04
            fstep = 1 if far else 0                  # the far leg: a ramp step darker and cooler, so the legs separate
            shaft = self.SHAFT.get(ft, 0)
            boot_r = s.get('welly', 'welly') if ft == 'wellies' else fr
            lp = f.part()
            m = capsule([hip, knee, ankle], [4.0, 3.6, 3.1])
            for (x, y), (nx, t) in m.items():
                nz = math.sqrt(max(0.02, 1 - nx * nx))
                # distance up the shin from the ankle decides trouser / boot shaft / bare leg (shorts)
                up = math.hypot(x + 0.5 - ankle[0], y + 0.5 - ankle[1]) if y + 0.5 > knee[1] else 99
                rp, lb = lrp, bias
                if shaft and up <= shaft + 0.5: rp = boot_r
                elif lw == 'shorts' and y > 73: rp = s['skin']; lb += 0.1
                if lw == 'shorts' and y > 73 and up <= 5.5 and not (shaft and up <= shaft + 0.5): rp = s.get('socks', 'white')
                l = lum(nx, -0.15, nz, f.lx) + lb
                f.put(x, y, rp, min(4, tone(l, 1, 4 if rp != s['skin'] else 3) + fstep), lp)
            if lw == 'trousers':
                # the crease follows the shin; the knee reads as a soft lit bump; the hem breaks over the shoe
                if not far:
                    for k in range(3, 11):
                        t = k / 12; x = knee[0] + (ankle[0] - knee[0]) * t; y = knee[1] + (ankle[1] - knee[1]) * t
                        f.step(int(x), int(y), 1)
                kx, ky = int(round(knee[0] - 3)), int(round(knee[1]))
                f.step(kx + 1, ky, -1)
                if knee[0] < min(hip[0], ankle[0]) - 1.5:
                    bx_, by_ = int(round(knee[0] + 2.5)), int(round(knee[1] + 1))      # fold behind the bent knee
                    f.step(bx_, by_, 1); f.step(bx_, by_ - 1, 1)
                if not shaft:
                    for (x, y), (nx, t) in m.items():
                        up = math.hypot(x + 0.5 - ankle[0], y + 0.5 - ankle[1])
                        if 1.0 <= up < 2.2 and y + 0.5 > knee[1]: f.step(x, y, 1)
            self.side_foot(ankle, ang, ft, fr, far, lg)

    def side_foot(self, ankle, ang, ft, fr, far, lg):
        f, s = self.f, self.s
        bias = -0.12 if far else 0.04
        rp = s.get('welly', 'welly') if ft == 'wellies' else ('trainer' if ft == 'trainers' else fr)
        pts = [(ankle[0] + x, ankle[1] + y) for x, y in rot(self.FOOT[ft], ang, (0, 0))]
        m = poly(pts)
        ms = set(m)
        pid = f.part()
        c, sn = math.cos(-ang), math.sin(-ang)

        def local(x, y):
            dx, dy = x + 0.5 - ankle[0], y + 0.5 - ankle[1]
            return dx * c - dy * sn, dx * sn + dy * c
        for (x, y) in m:
            lx_, ly_ = local(x, y)
            # a rounded shoe: lit along the instep and toe cap, darker towards the heel and the sole
            l = 0.72 - 0.05 * lx_ - 0.07 * max(0, ly_ - 2) + bias
            if ly_ < 1.5 and lx_ < -2: l += 0.1
            f.put(x, y, rp, min(4, tone(l, 1, 4 if rp != 'trainer' else 3) + (1 if far else 0)), pid)
        for (x, y) in m:
            lx_, ly_ = local(x, y)
            if (x, y + 1) not in ms and ly_ > 3.0:
                f.put(x, y, 'sole', 2 if not far else 3, pid)                          # the welt / sole
        if far: return
        pt = lambda lx_, ly_: (int(math.floor(ankle[0] + lx_ * math.cos(ang) - ly_ * math.sin(ang))),
                               int(math.floor(ankle[1] + lx_ * math.sin(ang) + ly_ * math.cos(ang))))
        if ft == 'boots':
            for lx_, ly_ in ((-2.0, -0.2), (-3.2, 1.3), (-4.4, 2.6)):
                x, y = pt(lx_, ly_)
                if (x, y) in ms: f.put(x, y, 'gold', 2, pid)                             # laces
            x, y = pt(-5.9, 3.6)
            if (x, y) in ms: f.put(x, y, fr, 0, pid)                                     # toe cap glint
        elif ft == 'trainers':
            for lx_ in (-4.5, -3.0, -1.5, 0.0):
                x, y = pt(lx_, 3.4)
                if (x, y) in ms: f.put(x, y, s.get('accent', 'paint_red'), 1, pid)        # side flash
        elif ft == 'shoes':
            x, y = pt(-5.6, 3.4)
            if (x, y) in ms: f.put(x, y, fr, 0, pid)

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
                fw, bk = self.hem_sway(y, sk_bot, 9)
                span[y] = (round(CX - depth - 0.5 - t * 2.4 - fw), round(CX + depth - 1 + t * 2.2 + bk))
            pid = f.part()
            f.paint(rows(span), s.get('skirt', 'charcoal'), pid, lo=1, hi=4,
                    tex=lambda x, y: (-0.22 if x % 4 == 0 else (0.06 if x % 4 == 1 else 0)))
            for x in range(span[sk_bot][0], span[sk_bot][1] + 1): f.step(x, sk_bot, 1)
        span = self.side_span
        pid = f.part()
        f.paint(rows(span), tr, pid, bias=0.03 + s.get('top_bias', 0), lo=1, hi=4,
                tex=lambda x, y: (-0.2 if (x == CX + 3 and (y - top) / (bot - top) > .55) else 0))
        self.side_torso_details(span, pid)

    def _side_span(self):
        s = self.s
        ts = s['topStyle']; depth = s.get('depth', 9)
        top, bot = self.top, self.bot
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
            fw, bk = self.hem_sway(y, bot, 10 if (ts == 'coat' or bot > 68) else 5)
            front -= fw; backx += bk
            span[y] = (round(front), round(backx))
        return span

    def side_torso_details(self, span, pid):
        s, f, b = self.s, self.f, self.b
        ts = s['topStyle']; tr = s['top']; depth = s.get('depth', 9)
        top, bot = self.top, self.bot
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

    def hem_sway(self, y, bot, rows_):
        """Profile: the lower hem is pushed forward by the leading knee and trails behind the back leg. It reads the
        previous frame's stride, so the cloth follows the legs a beat late."""
        t = (y - (bot - rows_)) / rows_
        if t <= 0: return 0.0, 0.0
        n, fa = self.P.prev_ax['near'], self.P.prev_ax['far']
        fwd = max(0, -min(n, fa) - 3) * 0.3
        bck = max(0, max(n, fa) - 3) * 0.22
        return t * t * fwd, t * t * bck

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
        s, f, b, P = self.s, self.f, self.b, self.P
        sleeve = self.sleeve_ramp()
        short = self.short_sleeves()
        a = P.sarm['near' if near else 'far']
        d = lambda th: (-math.sin(th), math.cos(th))
        thu = math.radians(30 * a)
        # the elbow bends as the arm swings forward (the forearm lifts), and a little on the back swing
        thf = thu + math.radians(14 + 26 * max(0.0, a) + 12 * max(0.0, -a))
        # shoulders counter-rotate against the hips: the near shoulder comes forward with the near arm
        rot_ = P.sh_rot if near else -P.sh_rot
        sx, sy = CX - 1.5 - 0.8 * rot_ + (0 if near else 1.5), 44.0 + b + (0 if near else -0.5)
        sho = (sx, sy)
        du, df = d(thu), d(thf)
        elb = (sx + du[0] * 10.0, sy + du[1] * 10.0)
        wri = (elb[0] + df[0] * 9.0, elb[1] + df[1] * 9.0)
        far = 0 if near else 1
        if not near:
            # the far arm is mostly hidden by the body. Where its hand clears the chest, show the sleeve that leads to
            # it; if only a knuckle would peep out, keep the whole hand tucked behind the torso
            sp_ = self.side_span
            hc = (wri[0] + df[0] * 1.8, wri[1] + df[1] * 1.8)
            def outside(x, y):
                if int(y) not in sp_: return True
                a0, a1 = sp_[int(y)]
                return x < a0 or x > a1
            cap = capsule([sho, elb, wri], [3.3, 3.0, 2.6])
            vis = sum(1 for (x, y), (nx, t) in cap.items() if t > 0.55 and outside(x, y))
            self._far_hand_hidden = vis < 4
        ap = f.part(sepk=3)
        bias = 0.05 if near else -0.1
        if short:
            cut = sy + 8
            paint_limb(f, [sho, elb, wri], [3.3, 3.0, 2.6], sleeve, ap, bias=bias, lo=1, hi=4, clip=lambda x, y, t: t < 0.36, far=far)
            sp = f.part()
            paint_limb(f, [sho, elb, wri], [2.5, 2.4, 2.2], s['skin'], sp, bias=bias + 0.12, lo=1, hi=3,
                       clip=lambda x, y, t: t >= 0.36, far=far)
        else:
            m = paint_limb(f, [sho, elb, wri], [3.3, 3.0, 2.6], sleeve, ap, lo=1, hi=4,
                           bias=bias + (s.get('top_bias', 0) if sleeve == s['top'] else 0), far=far)
            for (x, y), (nx, t) in m.items():
                if 0.86 < t < 0.93: f.step(x, y, 1)                          # cuff seam
            ex, ey_ = int(round(elb[0])), int(round(elb[1]))
            f.step(ex - 2, ey_, 1)                                           # crook of the elbow
            if a > 0.3: f.step(ex - 2, ey_ + 1, 1)
            f.step(ex + 2, ey_ - 1, -1)
        # hand: a 4x4 mitt with a thumb on the front and a knuckle shadow, turned with the forearm
        hc = (wri[0] + df[0] * 1.8, wri[1] + df[1] * 1.8)
        hx, hy = int(round(hc[0])), int(round(hc[1]))
        if not near and self._far_hand_hidden: return
        hp = f.part()
        hm = [(x, y) for y in range(hy - 2, hy + 2) for x in range(hx - 2, hx + 2)
              if not (y == hy + 1 and x in (hx - 2, hx + 1))]
        hm.append((hx - 3, hy - 1))                                           # thumb, forward
        f.paint(hm, s.get('gloves', s['skin']), hp, mode='sph', lo=1, hi=3 + far, bias=bias + 0.12 - 0.12 * far)
        f.step(hx, hy, 1)
        hx, hy = hx, hy - 2            # hand props below use the top of the hand
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
            for y in range(hy - 1, FEET + 1 - f.oy): f.put(hx - 3 - (y - hy) // 10, y, 'wood_dark', 1 if y < hy + 3 else 2, sp2)
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

    # ---- profile head (character faces LEFT). Rows line up with the front view: brow 25, lash line 28, nose 30-34,
    # mouth 37, chin 38-40. An egg-shaped skull whose back sits a good 12px behind the ear; the face plane leads.
    # Every character has their own silhouette (spec 'prof': nose, chin, brow, jaw), chosen by age and build.
    EAR_X = 24                                             # ear columns 24..26, rows 29..33, on the skull's centre line
    SKULL = (26.4, 26.4, 13.2, 12.8)
    FOREHEAD = {16: 18, 17: 16, 18: 15, 19: 14, 20: 14, 21: 13, 22: 13, 23: 13, 24: 13, 25: 13, 27: 13, 28: 13, 29: 13}
    NOSES = {   # row -> leading column; the lowest row is the underside (nostril) row
        'straight': {30: 12, 31: 11, 32: 10, 33: 10, 34: 11},
        'button':   {30: 13, 31: 12, 32: 11, 33: 11, 34: 12},
        'soft':     {30: 12, 31: 12, 32: 11, 33: 10, 34: 11},
        'pointed':  {30: 12, 31: 11, 32: 10, 33: 9, 34: 11},
        'big':      {29: 12, 30: 11, 31: 10, 32: 9, 33: 9, 34: 10},
        'round':    {30: 12, 31: 11, 32: 10, 33: 9, 34: 9, 35: 11},
    }
    CHINS = {   # philtrum, mouth notch, chin; the jaw exponent (higher = a squarer jaw), bottom row
        'normal':   ({35: 12, 36: 12, 37: 13, 38: 12, 39: 12, 40: 13}, 1.5, 40),
        'receding': ({35: 12, 36: 13, 37: 14, 38: 14, 39: 14, 40: 15}, 1.15, 40),
        'strong':   ({35: 12, 36: 12, 37: 13, 38: 12, 39: 11, 40: 12}, 1.9, 40),
        'round':    ({35: 12, 36: 12, 37: 13, 38: 12, 39: 12, 40: 13}, 1.7, 40),
        'double':   ({35: 12, 36: 12, 37: 13, 38: 12, 39: 12, 40: 13, 41: 15}, 1.3, 41),
    }

    @staticmethod
    def hat_rim(x):
        """Profile hard-hat rim row at column x: level over the brow, dropping towards the back of the head."""
        return 22.0 + max(0.0, x - 22) * 0.3

    @staticmethod
    def cap_rim(x):
        """Profile flat-cap band row at column x."""
        return 22.0 + max(0.0, x - 24) * 0.3

    def cover_rim(self):
        if self.s.get('hat'): return self.hat_rim
        if self.s.get('flatcap'): return self.cap_rim
        return None

    def prof(self):
        p = dict(nose='straight', chin='normal', brow=False)
        p.update(self.s.get('prof', {}))
        return p

    def jaw_bottom(self, x):
        """The underside of the face: flat under the chin, then curving up to the ear lobe."""
        _, pw, cy = self.CHINS[self.prof()['chin']]
        x0 = 14.0
        if x <= x0: return float(cy)
        t = min(1.0, (x - x0) / (self.EAR_X + 1 - x0))
        return cy - (cy - 34.5) * (t ** pw)

    def side_front(self):
        pr = self.prof()
        fr = dict(self.FOREHEAD)
        fr[26] = 12 if pr['brow'] else 13
        nose = self.NOSES[pr['nose']]
        chin = self.CHINS[pr['chin']][0]
        fr.update(chin); fr.update(nose)
        return fr, nose, chin

    def side_head(self):
        s, f, b = self.s, self.f, self.b
        sk = s['skin']; EX = self.EAR_X
        FRONT, NOSE, CHIN = self.side_front()
        self.FRONTX = FRONT
        hat = s.get('hat')
        # neck: set under the ear and behind the jaw; one shadow row directly under the jawline, mid-tone below
        np_ = f.part(sep=False)
        # the neck leans forward out of the shoulders: throat at x 19-20, the back of the neck just behind the ear
        nm = [(x, y) for y in range(33 + b, 45 + b) for x in range(19, 28)
              if y - b > self.jaw_bottom(x) - 0.5 and x <= 27.4 - max(0, y - b - 35) * 0.45
              and x >= 20 - (1 if y - b > 40 else 0)]
        nms = set(nm)
        for (x, y) in nm:
            f.put(x, y, sk, 3 if (x, y - 1) not in nms and x < EX + 1 else 2, np_)
        hp = f.part()
        scx, scy, srx, sry = self.SKULL
        skull = set(ell(scx, scy + b, srx, sry))
        if hat or s.get('flatcap'):   # under a hat the back of the head tapers into the nape just below the rim
            skull = set(p for p in skull if p[0] <= 36.5 - max(0, p[1] - b - 25) * 0.9)
        right = {}
        for (x, y) in skull: right[y] = max(right.get(y, -1), x)
        m = set(p for p in skull if p[1] - b < 16)
        for yy, x0 in FRONT.items():
            y = yy + b
            for x in range(x0, right.get(y, 30) + 1):
                if x <= EX + 1 and yy > self.jaw_bottom(x) + 0.01: continue
                if x > EX + 1 and (x, y) not in skull: continue
                m.add((x, y))
        self.face_mask = m
        young = s.get('age') != 'old'
        for (x, y) in m:
            yy = y - b
            fx0 = FRONT.get(yy, 14)
            i = 1
            if x >= EX - 2 or yy <= 17: i = 2                                  # towards the ear, under the hair
            if x - fx0 <= 1 and 19 <= yy <= 25: i = 0                          # the lit forehead plane
            if (x, y + 1) not in m and x <= EX + 1: i = 2                       # the jawline
            f.put(x, y, sk, i, hp)
        if young:   # a soft, lit cheek
            for (x, y) in ((17, 32), (18, 32), (17, 31)): f.put(x, y + b, sk, 0, hp) if (x, y + b) in m else None
        self.head_pid = hp
        # ear: a small 3x5 ear with a lit rim, a shaded bowl, the lobe
        ep = f.part(shadow=False)
        ear = [(EX + 1, 29), (EX + 2, 29), (EX, 30), (EX + 1, 30), (EX + 2, 30), (EX, 31), (EX + 1, 31), (EX + 2, 31),
               (EX, 32), (EX + 1, 32), (EX + 2, 32), (EX + 1, 33)]
        ear = [(x, y + b) for x, y in ear]
        for (x, y) in ear: f.put(x, y, sk, 2, ep)
        for (x, y) in ((EX + 1, 29), (EX + 2, 30), (EX + 2, 31), (EX + 1, 33)): f.put(x, y + b, sk, 1, ep)   # rim, lobe
        for (x, y) in ((EX + 1, 31), (EX + 1, 32)): f.put(x, y + b, sk, 3, ep)                             # the bowl
        f.put(EX + 2, 32 + b, sk, 2, ep)
        if s.get('earrings'): f.put(EX + 1, 34 + b, 'gold', 1, ep)
        self.ear = set(ear)
        # features
        fp = f.part(shadow=False, sep=False)
        eye = s.get('eye', 'eye')
        if self.P.blink:
            for (x, y) in ((14, 29), (15, 30), (16, 30)): f.put(x, y + b, OUT, 0, fp)
            f.put(15, 29 + b, sk, 1, fp); f.put(16, 29 + b, sk, 2, fp)
        else:
            for x in (14, 15, 16): f.put(x, 28 + b, OUT, 0, fp)                   # lash line
            f.put(14, 29 + b, eye, 0, fp)                                          # the white / catchlight
            f.put(15, 29 + b, eye, 4, fp); f.put(16, 29 + b, eye, 3, fp)
            f.put(15, 30 + b, eye, 1, fp); f.put(16, 30 + b, eye, 2, fp)
        f.put(15, 31 + b, sk, 2, fp)                                               # lower lid
        br = s.get('brow', s['hair']); bi = s.get('brow_i', 3)
        by = 25 + b if not s.get('glasses') else 24 + b
        for k, x in enumerate(range(13, 18)):
            f.put(x, by + (1 if k == 4 else 0), br, bi if k < 3 else min(4, bi + 1), fp)
        if s.get('bushy_brows'): f.put(14, by - 1, br, bi, fp); f.put(15, by - 1, br, bi, fp)
        f.put(FRONT[27], 27 + b, sk, 2, fp); f.put(FRONT[27] + 1, 27 + b, sk, 2, fp)   # the socket under the brow
        # nose: a lit bridge down to a highlighted tip, the underside and nostril wing in shadow
        ns = sorted(NOSE)
        tipx = min(NOSE.values())
        tip = max(yy for yy in ns if NOSE[yy] == tipx)
        for yy in ns:
            x0 = NOSE[yy]
            if yy < tip: f.put(x0, yy + b, sk, 0 if yy >= ns[0] + 1 else 1, fp)
        f.put(tipx + 1, tip + b, sk, 0, fp)                                           # the tip highlight
        f.put(tipx, tip + b, sk, 1, fp)
        und = ns[-1]
        f.put(NOSE[und], und + b, sk, 2, fp); f.put(NOSE[und] + 1, und + b, sk, 3, fp)   # underside, nostril
        f.put(NOSE[und] + 2, und - 1 + b, sk, 2, fp)                                   # nostril wing
        # mouth: one recessed line, no lip pixels; philtrum and chin catch the light
        mx0 = CHIN[37]
        f.put(mx0, 37 + b, sk, 3, fp); f.put(mx0 + 1, 37 + b, sk, 3, fp); f.put(mx0 + 2, 37 + b, sk, 2, fp)
        f.put(CHIN[39], 39 + b, sk, 0, fp)
        if 41 in CHIN:                                                                  # a soft double chin
            for x in range(CHIN[41], CHIN[41] + 4): f.put(x, 40 + b, sk, 2, fp)
        f.put(18, 34 + b, sk + '_blush', 1, fp); f.put(19, 34 + b, sk + '_blush', 1, fp); f.put(19, 33 + b, sk + '_blush', 1, fp)
        if s.get('age') == 'old':
            f.put(18, 29 + b, sk, 2, fp); f.put(18, 30 + b, sk, 2, fp)                # crow's feet
            f.put(mx0 + 2, 35 + b, sk, 2, fp); f.put(mx0 + 3, 36 + b, sk, 2, fp)      # smile line
        if s.get('freckles'):
            for (x, y) in ((17, 31), (19, 32), (16, 32)): f.put(x, y + b, sk, 2, fp)
        if s.get('lipstick'): f.put(mx0, 37 + b, 'wine', 2, fp); f.put(mx0 + 1, 37 + b, 'wine', 3, fp)
        if s.get('beard'): self.side_beard(m)
        self.side_hair()
        if s.get('glasses'):
            gp = f.part(shadow=False, sep=False)
            rim = s.get('rim', 'rim_dark')
            ring = [(13, 28), (13, 29), (13, 30), (14, 27), (15, 27), (16, 27), (17, 27), (18, 28), (18, 29), (18, 30),
                    (14, 31), (15, 32), (16, 32), (17, 31)]
            for (x, y) in ring: f.put(x, y + b, rim, 1 if y < 30 else 2, gp)
            for x in range(19, EX + 1): f.put(x, 28 + b, rim, 2, gp)                  # the arm, back to the ear
            f.put(14, 30 + b, 'lens', 1, gp) if not self.P.blink else None
            f.put(17, 28 + b, 'lens', 0, gp)

    def side_beard(self, m):
        """Profile beard: the lower front of the face only: chin, jaw and the cheek below the cheekbone, running back
        along the jaw to a sideburn in front of the ear. A moustache under the nose; the mouth reads through."""
        s, f, b = self.s, self.f, self.b
        bp = f.part(); hr = s.get('beard_ramp', s['hair'])
        style = s.get('beard'); EX = self.EAR_X
        FRONT = self.FRONTX
        bm = []
        for (x, y) in m:
            yy = y - b
            if style == 'goatee':
                if yy >= 38 and x <= 16: bm.append((x, y))
                continue
            if x >= EX: continue
            edge = 35.5 - (x - 14) * 0.55                   # the cheek line slopes up and back to the sideburn
            if yy >= edge and yy >= 33 - (1 if x > 19 else 0): bm.append((x, y))
            if x >= EX - 2 and 29 <= yy: bm.append((x, y))  # sideburn
        if style != 'goatee':
            for x in range(FRONT[39], EX - 1):              # fullness under the chin and jaw
                yb = int(math.floor(self.jaw_bottom(x))) + 1
                bm.append((x, yb + b))
                if x < 19: bm.append((x, yb + 1 + b))
            fx = FRONT[39] - 1
            for y in (38, 39, 40): bm.append((fx, y + b))
        mx0 = FRONT[37]
        bm = [p for p in bm if (p[0], p[1] - b) not in ((mx0, 37), (mx0 + 1, 37)) and p not in self.ear]
        f.paint(bm, hr, bp, mode='sph', cx=14, rx=10, cy=35 + b, ry=8, lo=1, hi=4, bias=0.02,
                tex=lambda x, y: -0.16 if hash01(x, (y - b) // 2, 5) > 0.72 else (0.05 if (x + y) % 4 == 0 else 0))
        # moustache under the nose, the mouth line reads through as the darkest beard step
        nx = FRONT[35]
        for x in range(nx, nx + 5): f.put(x, 35 + b, hr, 1 if x < nx + 2 else 2, bp)
        for x in range(nx + 1, nx + 5): f.put(x, 36 + b, hr, 2 if x < nx + 3 else 3, bp)
        f.put(mx0, 37 + b, hr, 4, bp); f.put(mx0 + 1, 37 + b, hr, 4, bp)
        f.put(FRONT[39], 39 + b, hr, 1, bp)

    PHAIR = {   # (cx, cy, rx, ry) of the hair volume, forehead hairline row, nape row, row the hair covers the ear to
        'short':    ((26.6, 25.4, 14.2, 13.9), 19.5, 37, None),
        'bun':      ((26.6, 25.6, 14.0, 13.6), 20.0, 36, None),
        'ponytail': ((26.6, 25.6, 14.0, 13.6), 19.8, 36, None),
        'bob':      ((27.2, 26.4, 15.2, 15.2), 23.0, 41, 40),
        'long':     ((27.0, 25.8, 14.8, 14.4), 20.0, 44, 41),
        'curly':    ((25.0, 24.4, 13.8, 15.0), 20.5, 38, 33),
    }

    def side_hair(self):
        s, f, b, P = self.s, self.f, self.b, self.P
        st = s['hairStyle']; hr = s['hair']; EX = self.EAR_X
        if st == 'bald':
            dp = f.part(sep=False)
            scx, scy, srx, sry = self.SKULL
            m = [p for p in ell(scx, scy + b, srx, sry) if p[0] >= 14 and (p[1] < 24 + b if p[0] < 20 else p[1] < 27 + b)]
            f.paint(m, s['skin'], dp, mode='sph', cx=CX - 4, rx=15, cy=19 + b, ry=12, bias=0.14, lo=0, hi=2,
                    th=(0.95, 0.66, 0.42, 0.2))
            for (x, y) in [(CX - 6, 16 + b), (CX - 5, 16 + b), (CX - 6, 17 + b)]: f.put(x, y, s['skin'], 0, dp)
            hp = f.part()
            # a horseshoe of hair: above and behind the ear, round the back of the head
            inner = set(ell(scx - 2.6, scy - 3.5 + b, srx - 2.4, sry - 2.2))
            mm = [p for p in ell(scx, scy + b, srx + 0.8, sry + 0.3)
                  if p not in inner and p[0] >= EX + 2 + max(0, 27 + b - p[1]) and 24 + b <= p[1] <= 36 + b and p not in self.ear]
            mm += [(x, y + b) for x in range(EX, EX + 3) for y in (27,)]
            f.paint(mm, hr, hp, mode='sph', cx=EX + 2, rx=16, cy=24 + b, ry=12, lo=1, hi=3,
                    tex=lambda x, y: -0.14 if (x + 2 * y) % 5 == 0 else 0.03)
            self.hair_mask = set(mm)
            return
        (hcx, hcy, hrx, hry), front, nape, cover = self.PHAIR[st]
        cran = set(ell(hcx, hcy + b, hrx, hry))
        m = set()
        for (x, y) in cran:
            yy = y + 0.5 - b
            if x < EX:
                t = max(0.0, (x - 12) / (EX - 12))
                lim = front + (t ** 1.7) * (28 - front)          # hairline sweeps back and down to the top of the ear
                if st == 'short' and EX - 3 <= x < EX: lim = 31.5  # sideburn
                if st == 'bob' and x < 19: lim = front + (1 if x > 15 else 0)
                if cover and x >= EX - 4: lim = max(lim, cover - (EX - x) * 1.2)
            elif x <= EX + 3:
                lim = cover or 28
            else:
                lim = nape
            if yy < lim: m.add((x, y))
        if st == 'long':
            for y in range(34 + b, 46 + b + P.lag_bob):
                for x in range(EX - 1, 40 - max(0, y - 42 - b)): m.add((x, y))
        if st == 'bob':
            for x in range(EX - 3, 42):                                   # the bob's curled-under ends
                m.discard((x, 41 + b))
        if st == 'curly':
            for k in range(26):
                a = k / 26 * math.tau
                bx = hcx + math.cos(a) * (hrx + 0.2); by = hcy + b + math.sin(a) * (hry + 0.1)
                if (by > 27 + b and bx < EX) or bx < 14 or by > 40 + b: continue
                for p in ell(bx, by, 2.4, 2.4): m.add(p)
        if not cover:
            m -= self.ear
        rim = self.cover_rim()
        if rim:
            # tucked under the hat: a sideburn in front of the ear and 2-3 px of hair at the nape, no more
            m = set(p for p in m if p[1] - b > rim(p[0]) and (p[0] < EX or p[1] - b <= rim(p[0]) + (3.2 if s.get('hat') else 6.2)))
        m = set(p for p in m if not (p[0] < 14 and p[1] > 22 + b))           # never over the brow or the nose
        pid = f.part()
        pivot = (15, 13 + b) if st != 'curly' else (CX + 2, 22 + b)

        def tex(x, y):
            if st == 'curly':
                u, v = x % 4, (y + (x // 4) * 2) % 4
                if (u, v) in ((1, 1), (2, 1)): return 0.16
                if (u, v) in ((1, 3), (2, 3), (0, 2)): return -0.18
                return 0.0
            return strands(x, y, pivot[0], pivot[1], 2.3, 1.7)
        f.paint(m, hr, pid, mode='sph', cx=hcx - 7, rx=hrx + 6, cy=hcy - 7 + b, ry=hry + 6, bias=0.12,
                lo=0, hi=4, tex=tex, th=(0.92, 0.70, 0.46, 0.25))
        for (x, y) in m:
            if (x, y + 1) not in m and y > 24 + b: f.step(x, y, 1)             # the underside of the hair mass
        for (x, y) in m:                                                     # soft shadow the hair casts on the skin
            if (x, y + 1) in self.face_mask and (x, y + 1) not in m and (x, y + 1) not in self.ear:
                p = f.get(x, y + 1)
                if p and p[0] == s['skin'] and p[1] < 2: f.step(x, y + 1, 1)
        self.hair_mask = m
        lag = P.lag_bob
        if st == 'bun' and not s.get('hat'):
            bp = f.part()
            bcx, bcy = CX + 8.5, 10.8 + b + lag                              # the bun trails the head by a frame
            bm = ell(bcx, bcy, 6.6, 6.2)
            ring = set(bm)
            f.paint(bm, hr, bp, mode='sph', cx=bcx - 1.5, rx=7.5, cy=bcy - 1.5, ry=7, bias=0.08, lo=0, hi=4,
                    tex=lambda x, y: strands(x, y, bcx, bcy, 1.2, 0.4, 0.06))
            for (x, y) in bm:
                if (x, y + 1) not in ring and (x, y + 1) in m: f.put(x, y, hr, 4, bp)
                elif (x - 1, y + 1) in m and (x - 1, y + 1) not in ring and x < bcx: f.put(x, y, hr, 3, bp)
            if s.get('hairpin'): f.put(int(bcx) - 3, int(bcy) + 2, 'gold', 1, bp)
        if st == 'bun' and s.get('hat'):
            bp = f.part()
            f.paint(ell(CX + 13, 29 + b + lag, 4.6, 4.2), hr, bp, mode='sph', bias=0.05, lo=0, hi=4)
        if st == 'ponytail':
            pp = f.part()
            pm = []
            sw = 1 if P.lag_bob > 0 else 0                            # the tail swings back as the body rises
            path = [(CX + 13, 21), (CX + 14, 23), (CX + 15, 25), (CX + 16, 27), (CX + 16, 29), (CX + 16, 31),
                    (CX + 16, 33), (CX + 15, 35), (CX + 15, 37), (CX + 14, 39), (CX + 14, 41), (CX + 13, 43), (CX + 12, 45)]
            for k, (x, y) in enumerate(path):
                w = 2 if k < 9 else 1
                dl = (lag if k > 5 else 0); dx = sw if k > 7 else 0
                for yy in (y, y + 1):
                    for dx_ in range(-w, w + 1): pm.append((x + dx_ + dx, yy + b + dl))
            f.paint(pm, hr, pp, bias=0.02, lo=0, hi=4, tex=lambda x, y: strands(x, y, CX, 8 + b, 9, 2))
            tie = f.part(); scr = s.get('scrunchie', 'teal')
            for (x, y) in [(CX + 12, 20), (CX + 13, 20), (CX + 13, 21), (CX + 14, 21), (CX + 14, 22)]:
                f.put(x, y + b, scr, 1 if x < CX + 13 else 2, tie)

    def side_hat(self):
        s, f, b = self.s, self.f, self.b
        if s.get('hat'):
            # hard hat: the shell sits level at the brow and low at the back (as a real one does, over the nape),
            # a short peak projects forward over the brow; the rim is a lip that follows the shell's edge
            hr = s['hat']; hp = f.part()
            dome = [p for p in ell(26.2, 23.0 + b, 14.2, 12.8) if p[1] - b <= self.hat_rim(p[0]) - 1]
            f.paint(dome, hr, hp, mode='sph', cx=CX - 4, rx=16, cy=15 + b, ry=13, bias=0.12, lo=0, hi=3)
            ds = set(dome)
            xs = sorted(set(x for x, y in dome))
            for x in range(11, xs[-1] + 2):
                ry_ = int(round(self.hat_rim(x)))
                f.put(x, ry_ + b, hr, 2 if x < 30 else 3, hp)
                if x > 16: f.put(x, ry_ - 1 + b, hr, 1 if x < 28 else 2, hp)
            for x in range(7, 13): f.put(x, 22 + b, hr, 1, hp); f.put(x, 23 + b, hr, 3, hp)     # the peak
            f.put(12, 23 + b, hr, 3, hp)
            for (x, y) in dome:                                                              # the crown ridge
                if (x, y - 1) not in ds and 14 < x < 38: f.put(x, y, hr, 0, hp); f.put(x, y + 1, hr, 1, hp)
            return
        if s.get('cap'):
            cr = s['cap']; cp = f.part()
            dome = [p for p in ell(26.6, 22.0 + b, 14.0, 11.4) if p[1] <= 21 + b]
            f.paint(dome, cr, cp, mode='sph', cx=CX - 4, rx=16, cy=15 + b, ry=12, lo=1, hi=4)
            for x in range(4, 14):
                f.put(x, 20 + b, cr, 1 if x < 9 else 2, cp); f.put(x, 21 + b, cr, 3, cp)
            for x in range(5, 13): f.put(x, 22 + b, cr, 4, cp)
            f.put(39, 20 + b, 'sole', 2, cp); f.put(38, 20 + b, 'sole', 2, cp)
            for y in range(11 + b, 21 + b): f.step(CX - 3 + (y - 11 - b) // 5, y, 1)
            return
        if s.get('flatcap'):
            cr = s['flatcap']; cp = f.part()
            # the cap is pulled down over the back of the head; only a fringe of hair shows beneath it
            dome = [p for p in ell(27, 21.0 + b, 15.2, 8.6) if p[1] - b <= self.cap_rim(p[0])]
            f.paint(dome, cr, cp, mode='sph', cx=CX - 4, rx=17, cy=16 + b, ry=9, lo=1, hi=4,
                    tex=lambda x, y: (-0.12 if (x + y) % 4 == 0 else 0.03) if (x // 2) % 2 else (-0.12 if (x - y) % 4 == 0 else 0.03))
            ds = set(dome)
            for (x, y) in dome:
                if (x, y + 1) not in ds and x > 14: f.step(x, y, 1)                          # the band's lower edge
            for x in range(7, 14): f.put(x, 22 + b, cr, 3, cp)
            for x in range(8, 14): f.put(x, 21 + b, cr, 2, cp)
            return

    # ============================================================================ render
    def render(self):
        if self.side: self.draw_side()
        else: self.draw_frontback()
        cv = self.f.finish()
        if self.view == 'right': cv = cv.flip()
        return cv


def render(spec, view, frame, row=None):
    """view: down / up / left / right, or a seated row: sit_down / sit_up (frames 0..SIT_COLS-1)."""
    if view in ('sit_down', 'sit_up'):
        row, view = view, view[4:]
    return Person(spec, view, frame, row=row).render()
