"""LINESIDE HD people: the motion model (poses per sheet column) and the limb painters.

Sheet columns (17): 0 = stand, 1-12 = walk, 13-16 = idle.   Sheet rows: down, up, left, right, sit_down, sit_up.
  walk i = col - 1 (0..11), phase u = i / 12. Each leg has its own phase p (the near / screen-left leg p = u, the
  other p = u + 1/2): p 0 heel strike, 0..1/2 stance (the planted foot slides back at an even rate, so it stays put
  on the ground as long as the legs can reach), 1/2 toe-off, 1/2..1 swing (lift, knee bend, reach, heel down).
  Per step (6 frames, j = i % 6): 0 contact, 1-2 down (weight drops, hips over the planted leg), 3 passing,
  4-5 up (rising onto the toe of the back foot).
  idle k = col - 13: 0 rest, 1 breathe in (shoulders +1px), 2 held, 3 rest with a blink.
  sit rows: col 0 sit, col 1 fidget (shoulders settle, head turns a touch), col 2 blink.

Secondary motion (bun, ponytail, long hair, coat hem, satchel) is a damped spring driven by the body: it lags the
body by about a frame, overshoots a little and settles (overlapping action). The head and face only ever move by
whole-pixel offsets, so features never shimmer.
"""
import math
from pix import RAMPS, LIGHT
from fig import lum, tone

NW = 12                       # walk frames per cycle (two steps)
NI = 4                        # idle frames
NCOLS = 1 + NW + NI
WALK = (1, NW)
IDLE = (1 + NW, NI)
SIT_COLS = 3

# ---- body bob per step (j = i % 6): contact, down, down, passing, up, up (+ = lower on screen)
BOB6 = [0, 1, 1, 0, -1, -1]


def _ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, t)))


def side_leg(p, A, L):
    """Profile ankle track for one leg at phase p (character facing LEFT, - = forward).
    Returns ax (ankle x relative to the hip), lift (sole height) and foot pitch in degrees (+ toe up, - heel up)."""
    p %= 1.0
    if p < 0.5:                                    # stance: slides back at a constant rate
        ax = -A + 2 * A * (p / 0.5)
        lift = 0.0
        q = p / 0.5
        if q < 0.01: fa = 17.0                     # heel strike, toe up
        elif q < 0.2: fa = 5.0                     # foot slapping down
        elif q < 0.6: fa = 0.0
        elif q < 0.75: fa = -9.0                   # heel peels off
        else: fa = -22.0
    else:                                          # swing
        s = (p - 0.5) / 0.5
        ax = A - 2 * A * _ease(s)
        lift = L * math.sin(math.pi * min(1.0, s ** 0.85))
        fa = [-34.0, -24.0, -10.0, 0.0, 8.0, 14.0][min(5, int(s * 6 + 1e-6))]
    return ax, lift, fa


def front_leg(p):
    """Front / back view for one leg: depth (+ = the foot is ahead in the walking direction, -1..1), lift (px),
    toe (the heel is up, the toe still down) and bend (0..1, how far the knee is bent)."""
    p %= 1.0
    if p < 0.5:
        d = 1 - 2 * (p / 0.5)
        return dict(depth=d, lift=0.0, toe=1 if p >= 5 / 12 - 1e-6 else 0, bend=0.0, stance=True)
    s = (p - 0.5) / 0.5
    d = -1 + 2 * _ease(s)
    lift = 5.0 * math.sin(math.pi * min(1.0, s ** 0.8))
    return dict(depth=d, lift=lift, toe=0, bend=math.sin(math.pi * s), stance=False)


def spring(drive, k=0.55, c=0.45, cycles=8):
    """Periodic response of a damped spring following the signal `drive` (one value per frame, looping).
    Returns the follower's position per frame (float)."""
    n = len(drive); x = drive[0]; v = 0.0; out = [0.0] * n
    for cyc in range(cycles):
        for i in range(n):
            a = k * (drive[i] - x) - c * v
            v += a; x += v
            if cyc == cycles - 1: out[i] = x
    return out


class Pose:
    def __init__(self, view, col, stride=1.0, row=None):
        self.view, self.col = view, col
        self.sit = row in ('sit_down', 'sit_up')
        self.side = view in ('left', 'right')
        self.walk = (1 <= col <= NW) and not self.sit
        self.idle = (col > NW) and not self.sit
        self.i = col - 1 if self.walk else None
        self.k = col - 1 - NW if self.idle else None
        self.stride = stride
        # the upper body offset per frame, the lag of trailing parts, blink
        self.bob = BOB6[self.i % 6] if self.walk else 0
        self.breath = -1 if (self.idle and self.k in (1, 2)) else 0
        if self.sit: self.breath = -1 if col == 1 else 0
        self.blink = (self.idle and self.k == 3 and view != 'up') or (self.sit and col == 2)
        s = 1 if view == 'down' else -1
        A = 10.0 * stride
        if self.walk:
            u = self.i / NW
            self.j = self.i % 6
            # which leg carries the weight this step: L (screen-left in front view, near in profile) on 0..5
            stanceL = self.i < 6
            self.leg = {}
            for side, p in (('L', u), ('R', u + 0.5)):
                fl = front_leg(p)
                fl['near'] = s * fl['depth']               # + = towards the viewer
                fl['p'] = p % 1
                self.leg[side] = fl
            # arms swing against the leg on the same side; + = forward in the walking direction
            self.arm = {'L': -math.cos(2 * math.pi * u), 'R': math.cos(2 * math.pi * u)}
            # hips and shoulders move over the planted leg on the 'down' frames
            sw = (-1 if stanceL else 1) if self.j in (1, 2, 3) else 0
            self.sway = sw
            self.hip_sway = sw
            # the shoulder over the planted leg drops a pixel while the weight is on it
            self.sh_drop = {'L': 1 if (stanceL and self.j in (1, 2)) else 0,
                            'R': 1 if ((not stanceL) and self.j in (1, 2)) else 0}
            # profile
            self.sleg = {}
            for which, p in (('near', u), ('far', u + 0.5)):
                ax, lift, fa = side_leg(p, A, 4.0 + 0.6 * stride)
                self.sleg[which] = dict(p=p % 1, ax=ax, lift=lift, fa=fa)
            self.sarm = {'near': -math.cos(2 * math.pi * u), 'far': math.cos(2 * math.pi * u)}
            self.lean = -1                                  # the torso leans a pixel into the walk (profile)
            # shoulders counter-rotate against the hips: the near shoulder comes forward as the near arm swings
            self.sh_rot = round(0.6 * self.sarm['near'])    # - = back, + = forward
        else:
            self.j = None
            self.leg = {side: dict(p=None, near=0, lift=0, toe=0, depth=0, bend=0.0, stance=True) for side in 'LR'}
            self.arm = {'L': 0.0, 'R': 0.0}
            self.sway = self.hip_sway = 0
            self.sh_drop = {'L': 0, 'R': 0}
            self.sleg = {'near': dict(p=None, ax=-2, lift=0, fa=0), 'far': dict(p=None, ax=2, lift=0, fa=0)}
            self.sarm = {'near': 0.0, 'far': 0.0}
            self.lean = 0
            self.sh_rot = 0
            if self.sit and col == 1: self.arm = {'L': 0.35, 'R': -0.2}   # the fidget: hands shift in the lap
        self._secondary()

    def _secondary(self):
        """Trailing parts: vertical lag (+ = lower than the body), lateral lag, the satchel swing and the hem."""
        if self.walk:
            ys = [BOB6[i % 6] for i in range(NW)]
            fol = spring(ys)
            self.lag_bob = max(-2, min(2, int(round(fol[self.i] - ys[self.i] + (0.35 if ys[self.i] < 0 else 0)))))
            sw = []
            for i in range(NW):
                j = i % 6; st = i < 6
                sw.append(((-1 if st else 1) if j in (1, 2, 3) else 0))
            folx = spring(sw, k=0.5, c=0.4)
            self.lag_x = max(-2, min(2, int(round(folx[self.i] - sw[self.i]))))
            self.hang_x = int(round(folx[self.i]))            # where a hanging part sits (absolute lateral)
            # satchel (profile): pushed forward by the near thigh, a frame late, swinging counter to the far arm
            axs = [side_leg(i / NW, 10.0 * self.stride, 4)[0] for i in range(NW)]
            fb = spring([-0.2 * a for a in axs], k=0.45, c=0.35)
            self.bag_dx = max(-2, min(2, int(round(fb[self.i]))))
            # the near thigh position a frame ago drives the hem (profile)
            self.prev_ax = {w: side_leg(((self.i - 1) % NW) / NW + (0 if w == 'near' else 0.5), 10.0 * self.stride, 4)[0]
                            for w in ('near', 'far')}
            # front hem: flares towards the leading leg, a frame late
            dL = [front_leg(((i - 1) % NW) / NW)['depth'] for i in range(NW)]
            self.hem_flare = dL[self.i]                         # + = the screen-left leg leads
        else:
            if self.idle:
                ys = [0, -1, -1, 0]
                fol = spring(ys)
                self.lag_bob = int(round(fol[self.k] - ys[self.k]))
            else:
                self.lag_bob = 0
            self.lag_x = 0; self.hang_x = 0; self.bag_dx = 0
            self.prev_ax = {'near': -2, 'far': 2}
            self.hem_flare = 0.0
        self.prev = self


# ------------------------------------------------------------------ limb painters
def capsule(joints, radii):
    """Pixels inside a chain of tapered capsules. Returns {(x, y): (nx, t)} with nx the signed cross-section
    position (-1 = the limb's left edge, +1 its right edge) and t the distance along the chain (0..1)."""
    out = {}
    segs = list(zip(joints[:-1], joints[1:], radii[:-1], radii[1:]))
    tot = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b, _, _ in segs) or 1
    xs = [p[0] for p in joints]; ys = [p[1] for p in joints]; R = max(radii) + 1
    acc = 0
    seglen = []
    for a, b, _, _ in segs:
        seglen.append(acc); acc += math.hypot(b[0] - a[0], b[1] - a[1])
    for y in range(int(min(ys) - R), int(max(ys) + R) + 1):
        for x in range(int(min(xs) - R), int(max(xs) + R) + 1):
            px, py = x + 0.5, y + 0.5
            best = None
            for k, (a, b, ra, rb) in enumerate(segs):
                dx, dy = b[0] - a[0], b[1] - a[1]
                L2 = dx * dx + dy * dy or 1e-6
                u = max(0.0, min(1.0, ((px - a[0]) * dx + (py - a[1]) * dy) / L2))
                cx, cy = a[0] + dx * u, a[1] + dy * u
                d = math.hypot(px - cx, py - cy)
                r = ra + (rb - ra) * u
                if d <= r:
                    L = math.sqrt(L2)
                    cross = ((px - a[0]) * dy - (py - a[1]) * dx) / L
                    nx = max(-1.0, min(1.0, -cross / r))
                    tt = (seglen[k] + u * L) / tot
                    if best is None or abs(nx) < abs(best[0]): best = (nx, tt)
            if best: out[(x, y)] = best
    return out


def paint_limb(f, joints, radii, rp, pid, bias=0.0, lo=1, hi=4, tilt=-0.15, tex=None, clip=None, far=0):
    """far: ramp steps added for a limb on the far side of the body (darker and, by the ramps' hue shift, cooler)."""
    m = capsule(joints, radii)
    for (x, y), (nx, t) in m.items():
        if clip and not clip(x, y, t): continue
        nz = math.sqrt(max(0.02, 1 - nx * nx))
        l = lum(nx, tilt, nz, f.lx) + bias
        if tex: l += tex(x, y, t)
        f.put(x, y, rp, min(len(RAMPS[rp]) - 1, tone(l, lo, hi) + far), pid)
    return m


def ik(hip, ankle, l1, l2, forward=-1):
    """Two-bone IK: knee position for a leg from hip to ankle, bending towards `forward` (-1 = left)."""
    dx, dy = ankle[0] - hip[0], ankle[1] - hip[1]
    d = math.hypot(dx, dy)
    if d >= l1 + l2 - 1e-3:
        t = l1 / (l1 + l2); return (hip[0] + dx * t, hip[1] + dy * t)
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    mx_, my_ = hip[0] + dx * a / d, hip[1] + dy * a / d
    px, py = -dy / d, dx / d
    if px * forward < 0: px, py = -px, -py
    return (mx_ + px * h, my_ + py * h)


def rot(pts, ang, pivot):
    c, s = math.cos(ang), math.sin(ang)
    return [(pivot[0] + (x - pivot[0]) * c - (y - pivot[1]) * s, pivot[1] + (x - pivot[0]) * s + (y - pivot[1]) * c) for x, y in pts]
