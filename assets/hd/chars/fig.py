"""Figure buffer for LINESIDE HD characters.

A figure is painted as a stack of *parts* (back to front). Every pixel stores (ramp, step, part-id) rather than a
colour, so the finishing pass can do what a pixel artist does by hand:
  * cast occlusion: a part in front darkens the part behind it one step on its lower-right side (light is NW);
  * separation lines: where a front part meets a part of the same material, the part behind gets a darker line;
  * then every pixel resolves to its ramp colour and the silhouette gets the 1px warm-dark outline (pix.outline).
Views facing right are painted as a left view with the light mirrored (lx=-1) and flipped at the end, so the light
always comes from the upper left in the final image.
"""
import math, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from pix import RAMPS, LIGHT, OUTLINE, Canvas, hexrgb, outline, hash01

# ---- extra ramps (extending the shared palette in our own module, never editing pix.py)
def _mix(a, b, t):
    a, b = hexrgb(a), hexrgb(b)
    return '#%02x%02x%02x' % tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3))

EXTRA = {
    'eye':      ['#fffaf2', '#8a5a3c', '#5b3a2a', '#3a2622', '#2a1d22'],
    'eye_blue': ['#fffaf2', '#6f90a8', '#4a6680', '#33475c', '#2a1d22'],
    'lip':      ['#e89a8c', '#c9716a', '#a4535a', '#7c3a44', '#55283a'],
    'rim_dark': ['#6a5048', '#4a3632', '#3a2a2a', '#2a1d22', '#2a1d22'],
    'lens':     ['#ffffff', '#eaf4f6', '#cfe2e8', '#a9c6d2', '#86a6b6'],
    'wax':      ['#8f9a66', '#6d7a4c', '#525e39', '#3c452b', '#282e1f'],   # waxed cotton: olive with a sheen
    'cord':     ['#b28a5e', '#8e6a44', '#6c4f33', '#4d3825', '#332519'],   # corduroy collar
    'welly':    ['#6f9a63', '#4f7a4a', '#3a5c39', '#28422a', '#1a2c1d'],
    'trainer':  ['#ffffff', '#e6e8ec', '#c3c8d0', '#9aa0ab', '#6d7380'],
    'hood_red': ['#e0776a', '#c45248', '#9c3a3a', '#742a2f', '#4e1d24'],
    'sole':     ['#6a5a52', '#4c403c', '#3a302e', '#2a2224', '#1e1a1c'],
    'safety':   ['#5a5a62', '#44444c', '#34343b', '#26262c', '#1c1c21'],
    'hat_white':['#ffffff', '#f4f3ee', '#dcdad4', '#b4b2b0', '#86848a'],
    'apron':    ['#fffdf6', '#f3ecdf', '#dcd0bc', '#b5a88f', '#857a66'],
    'sheep':    ['#fffdf5', '#f1ebdc', '#dcd2bf', '#b8ad9b', '#8a8078', '#5f5752'],
    'sheepface':['#6a6264', '#4a4448', '#343036', '#242026', '#1a171c'],
    'ginger':   ['#ffd08a', '#f5a95a', '#dc823a', '#b0602c', '#7c3f22'],
    'mallard_g':['#8fe0a8', '#3fae7a', '#1f7c62', '#18594e', '#123c38'],
    'duckbrown':['#d8b48a', '#b48d66', '#8c6a4c', '#664b37', '#443226'],
    'beak':     ['#fff09a', '#f5cf4a', '#dca83a', '#b0802c', '#7a5620'],
    'pigeon':   ['#d8dce6', '#b3b8c6', '#8e93a4', '#6b6f82', '#4b4e60'],
    'irid':     ['#b6f0c8', '#6ccaa6', '#8a78c0', '#5e4f94', '#3e3468'],
    'feet_pink':['#f7b0a8', '#e0867e', '#b8625e', '#8a4446', '#5e2e34'],
}
for _k, _v in EXTRA.items():
    RAMPS.setdefault(_k, _v)

for _s in ('skin_fair', 'skin_light', 'skin_mid', 'skin_brown', 'skin_deep'):
    r = RAMPS[_s]
    # blush: the skin's own mid step warmed towards rose, so every skin tone gets cheeks, not just fair ones
    RAMPS[_s + '_blush'] = [_mix(r[0], '#f08a80', .30), _mix(r[1], '#e0707a', .30), _mix(r[2], '#c65a64', .30),
                            _mix(r[3], '#a04450', .25), r[4]]
    # lips: a deeper, rosier step of the skin
    RAMPS[_s + '_lip'] = [_mix(r[1], '#d66a6a', .35), _mix(r[2], '#b44a55', .35), _mix(r[3], '#8a3440', .35),
                          _mix(r[4], '#5a2030', .30), _mix(r[4], '#2a1d22', .4)]

OUT = '__out__'   # pseudo-ramp: the outline colour (used only where the reference uses it: lash line, pupils)


def lum(nx, ny, nz, lx=1):
    l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
    d = (nx * LIGHT[0] * lx + ny * LIGHT[1] + nz * LIGHT[2]) / l
    return max(0.0, min(1.0, 0.18 + 0.82 * d))


def tone(l, lo=1, hi=4, th=(0.93, 0.70, 0.47, 0.27)):
    i = 4
    for k, t in enumerate(th):
        if l > t: i = k; break
    return max(lo, min(hi, i))


class Fig:
    def __init__(self, w=48, h=96, lx=1):
        self.w, self.h, self.lx = w, h, lx
        self.px = {}          # (x, y) -> [ramp, step, pid]
        self.flags = {}       # pid -> dict(shadow=bool casts shadow, sep=bool separation line, recv=bool)
        self.n = 0
        self.oy = 0           # vertical offset applied to everything drawn (the body bob), so textures never shift

    # -- parts
    def part(self, shadow=True, sep=True, recv=True, sepk=1):
        self.n += 1; self.flags[self.n] = dict(shadow=shadow, sep=sep, recv=recv, sepk=sepk); return self.n

    def put(self, x, y, rp, i, pid):
        x, y = int(x), int(y) + self.oy
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[(x, y)] = [rp, max(0, min(len(RAMPS[rp]) - 1 if rp != OUT else 0, int(i))), pid]

    def get(self, x, y):
        return self.px.get((int(x), int(y) + self.oy))

    def has(self, x, y):
        return (int(x), int(y) + self.oy) in self.px

    def erase(self, x, y):
        self.px.pop((int(x), int(y) + self.oy), None)

    def step(self, x, y, d, rp=None):
        """Shift the step of an existing pixel by d (darker +), optionally recolour to ramp rp."""
        p = self.px.get((int(x), int(y) + self.oy))
        if p:
            if rp: p[0] = rp
            if p[0] != OUT: p[1] = max(0, min(len(RAMPS[p[0]]) - 1, p[1] + d))

    # -- filled shapes. mask = iterable of (x, y); normals derive from the mask when not given
    def paint(self, mask, rp, pid=None, mode='cyl', bias=0.0, lo=1, hi=4, cx=None, rx=None, cy=None, ry=None,
              tilt=-0.25, tex=None, th=(0.93, 0.70, 0.47, 0.27), clip=None):
        pid = pid or self.part()
        mask = set((int(x), int(y)) for x, y in mask)
        if clip: mask = set(p for p in mask if clip(*p))
        if not mask: return pid
        rows, cols = {}, {}
        for x, y in mask:
            rows.setdefault(y, []).append(x); cols.setdefault(x, []).append(y)
        for (x, y) in mask:
            if mode == 'flat':
                l = 0.62 + bias
            else:
                if cx is not None and rx:
                    nx = (x + 0.5 - cx) / rx
                else:
                    xs = rows[y]; l0, r0 = min(xs), max(xs) + 1; nx = 2 * (x + 0.5 - l0) / max(1, r0 - l0) - 1
                nx = max(-1, min(1, nx))
                if mode == 'sph':
                    if cy is not None and ry:
                        ny = (y + 0.5 - cy) / ry
                    else:
                        ys = cols[x]; t0, b0 = min(ys), max(ys) + 1; ny = 2 * (y + 0.5 - t0) / max(1, b0 - t0) - 1
                    ny = max(-1, min(1, ny)); nz = math.sqrt(max(0.02, 1 - nx * nx - ny * ny))
                else:
                    ny = tilt; nz = math.sqrt(max(0.02, 1 - nx * nx))
                l = lum(nx, ny, nz, self.lx) + bias
            if tex: l += tex(x, y)
            self.put(x, y, rp, tone(l, lo, hi, th), pid)
        return pid

    # -- finishing
    def finish(self, outline_on=True):
        px = self.px; fl = self.flags
        new = {k: list(v) for k, v in px.items()}
        for (x, y), (rp, i, pid) in px.items():
            if rp == OUT or not fl[pid]['recv']: continue
            d = 0
            # cast occlusion from a front part at the upper-left (upper-right when mirrored)
            for dx, dy in ((-self.lx, 0), (0, -1)):
                q = px.get((x + dx, y + dy))
                if q and q[2] > pid and fl[q[2]]['shadow'] and q[0] != OUT:
                    d = max(d, 1)
            # separation: a front part of the same material next to us
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = px.get((x + dx, y + dy))
                if q and q[2] > pid and fl[q[2]]['sep'] and q[0] == rp:
                    d = max(d, fl[q[2]]['sepk'] + (1 if q[1] >= i else 0))
            if d:
                new[(x, y)][1] = min(len(RAMPS[rp]) - 1, i + d)
        cv = Canvas(self.w, self.h)
        for (x, y), (rp, i, pid) in new.items():
            cv.put(x, y, OUTLINE if rp == OUT else RAMPS[rp][i])
        if outline_on: outline(cv)
        return cv


# ---- mask helpers
def ell(cx, cy, rx, ry):
    out = []
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1.0: out.append((x, y))
    return out


def rows(spans):
    """spans: {y: (x0, x1)} inclusive -> mask"""
    return [(x, y) for y, (a, b) in spans.items() for x in range(int(a), int(b) + 1)]


def poly(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; out = []
    for y in range(int(min(ys)) - 1, int(max(ys)) + 2):
        for x in range(int(min(xs)) - 1, int(max(xs)) + 2):
            px, py = x + 0.5, y + 0.5; ins = False; j = len(pts) - 1
            for i in range(len(pts)):
                xi, yi = pts[i]; xj, yj = pts[j]
                if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi: ins = not ins
                j = i
            if ins: out.append((x, y))
    return out


def line(x0, y0, x1, y1):
    out = []; n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for k in range(n):
        t = k / max(1, n - 1); out.append((int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t))))
    return out
