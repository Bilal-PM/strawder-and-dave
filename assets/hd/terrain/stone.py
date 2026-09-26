"""Coursed stone surfaces: Yorkshire gritstone setts, York-stone flag pavement, platform flags.

Each surface is laid in horizontal courses. In every course one stone straddles the tile's vertical edge: that stone is
the same in every variant (seeded from the base stream). The rest of the course is re-cut per variant, and every
interior stone gets its own tone, wear, cracks, lichen and moss. Stones are shaded from a height field (domed, worn
tops) with the shared NW light, so each sett reads as a worn, rounded block."""
import math, zlib
import numpy as np
from tk import *  # noqa: F401,F403


def _cut(rng, length, lo, hi):
    """Split a length into pieces within [lo, hi] (last piece absorbs the rest)."""
    out = []; left = length
    while left > hi:
        p = int(rng.integers(lo, hi + 1))
        if left - p < lo: p = left - lo
        out.append(p); left -= p
    out.append(left)
    return out


def course_layout(seed, v, row_h, lo, hi, joint=1):
    """List of stones (x, y, w, h, is_edge, sid) for variant v; x may be negative (wraps)."""
    rb = np.random.default_rng(seed)
    rv = np.random.default_rng(seed * 31 + 101 * (v + 1))
    stones = []
    rows = T // row_h
    for r in range(rows):
        y = r * row_h
        ew = int(rb.integers(lo, hi + 1))                  # the edge stone straddles x = 0
        ex = -int(rb.integers(max(3, ew // 4), ew - max(3, ew // 4)))
        stones.append((ex, y, ew, row_h, True, ('e', r)))
        x = ex + ew
        for k, pw in enumerate(_cut(rv, T + ex - x, lo, hi)):
            stones.append((x, y, pw, row_h, False, (v, r, k))); x += pw
    return stones


def render_courses(v, seed, rampn, row_h, lo, hi, joint=1, bevel=2.5, dome=0.6, gain=2.2, mid=1.6, tone_sd=0.45,
                   joint_idx=None, moss=0.25, lichen=0.0, cracks=0.0, grain=0.35, wear=0.0, chips=0.0, setts=False,
                   alt_ramp=None, alt_p=0.0):
    L = Layered(seed, v)
    n = len(RAMPS[rampn])
    H = np.full((T, T), -0.6)
    tone = np.zeros((T, T)); sid_map = np.full((T, T), -1, int); altm = np.zeros((T, T), bool)
    feats = []
    st = course_layout(seed, v, row_h, lo, hi, joint)
    for i, (x, y, w, h, edge, sid) in enumerate(st):
        rr = np.random.default_rng(zlib.crc32(repr(('stone', seed, sid)).encode()))
        t0 = rr.normal() * tone_sd
        alt = alt_ramp is not None and rr.random() < alt_p
        tilt_x, tilt_y = rr.normal() * 0.08, rr.normal() * 0.08       # stones sit a little proud / sunk
        rad = min(bevel, w / 2, h / 2)
        for yy in range(y, y + h - joint):
            for xx in range(x, x + w - joint):
                # distance to the stone's own border, with rounded corners
                dx = min(xx - x, x + w - joint - 1 - xx) + 0.5; dy = min(yy - y, y + h - joint - 1 - yy) + 0.5
                if dx < rad and dy < rad:
                    d = rad - math.hypot(rad - dx, rad - dy)
                    if d < 0.0: continue
                else:
                    d = min(dx, dy)
                u = (xx - x) / max(1, w - joint) - 0.5; vv = (yy - y) / max(1, h - joint) - 0.5
                hh = min(1.0, d / rad) ** 0.6 + dome * (1 - (u * u + vv * vv) * 2.0) + tilt_x * u * 8 + tilt_y * vv * 8
                X, Y = xx % T, yy % T
                H[Y, X] = hh; tone[Y, X] = t0; sid_map[Y, X] = i
                if alt: altm[Y, X] = True
        if not edge:
            feats.append((x, y, w, h, rr))
    gr = L.field((4, 2)) * grain
    lit = height_light(H * 1.4)
    val = mid - (lit - FLAT) * gain * (n - 1) / 3 - tone - gr
    idx = np.clip(np.round(val), 0, n - 1).astype(int)
    img = from_idx(idx, rampn)
    if alt_ramp is not None:
        img[altm] = from_idx(np.clip(idx, 0, len(RAMPS[alt_ramp]) - 1), alt_ramp)[altm]
    jm = sid_map < 0
    ji = (n - 1) if joint_idx is None else joint_idx
    jimg = from_idx(np.full((T, T), ji), rampn)
    # joints: dark, a lighter grain of sand here and there, moss in the damp ones
    jn = L.field((8, 4)); jw = L.white()
    img[jm] = jimg[jm]
    sandm = jm & (jw > 0.8)
    img[sandm] = from_idx(np.full((T, T), max(0, ji - 1)), rampn)[sandm]
    if moss:
        mm = jm & (jn > 1.1 - moss * 2) & (EDGE_D > 7)
        img[mm] = from_idx(np.where(jw > 0.5, 4, 3), 'grass')[mm]
        # moss creeping onto stone edges next to a mossy joint
        near = np.zeros_like(mm)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): near |= np.roll(np.roll(mm, dy, 0), dx, 1)
        mm2 = near & ~jm & (jw > 0.55) & (jn > 1.5 - moss * 2)
        img[mm2] = from_idx(np.full((T, T), 3), 'leaf')[mm2]
    # per-stone features (interior stones only, so nothing variant-specific touches the border)
    for (x, y, w, h, rr) in feats:
        if cracks and rr.random() < cracks and w > 10:
            pts = line_walk(rr, x + 2 + rr.random() * (w - 6), y + 1, int(h * 0.9), rr.random() - 0.5, 1, 0.7)
            for (px, py) in pts:
                if x + 1 <= px < x + w - 2 and y + 1 <= py < y + h - 2:
                    put(img, px, py, rgb(rampn, n - 1), False); put(img, px + 1, py, rgb(rampn, max(0, int(idx[py % T, px % T]) - 1)), False)
        if lichen and rr.random() < lichen:
            cx, cy = x + 2 + rr.random() * (w - 5), y + 2 + rr.random() * (h - 5)
            for _ in range(int(3 + rr.random() * 5)):
                px, py = int(cx + rr.normal() * 1.3), int(cy + rr.normal() * 1.0)
                if x + 1 <= px < x + w - 2 and y + 1 <= py < y + h - 2:
                    put(img, px, py, rgb('meadow', int(rr.integers(0, 2))), False)
        if chips and rr.random() < chips:
            cxs = x + (1 if rr.random() < 0.5 else w - 3); cys = y + (h - 3 if rr.random() < 0.6 else 1)
            put(img, cxs, cys, rgb(rampn, n - 1), False); put(img, cxs + 1, cys, rgb(rampn, n - 2), False)
        if wear and rr.random() < wear:   # polished, worn top: a soft light streak
            cy = y + h // 3
            for px in range(x + 2, x + w - 3):
                if rr.random() < 0.6: put(img, px, cy + (1 if rr.random() < 0.3 else 0), rgb(rampn, max(0, int(idx[cy % T, px % T]) - 1)), False)
    return img


def setts_variants():
    """Yorkshire gritstone setts (station forecourt): buff-grey blocks, domed worn tops, dark sandy joints, moss."""
    out = []
    for v in range(8):
        img = render_courses(v, 71, 'cobble', row_h=8, lo=9, hi=15, joint=1, bevel=2.2, dome=0.55, gain=2.4, mid=1.5,
                             tone_sd=0.5, moss=0.12 + (0.14 if v in (5, 6) else 0), lichen=0.18, cracks=0.1, chips=0.25,
                             wear=0.3, setts=True, alt_ramp='sandstone', alt_p=0.22)
        out.append(img)
    return out, [2, 2, 2, 2, 1.5, 1, 1, 1.5]


def flags_variants():
    """York-stone flag pavement: big courses, subtle bevel, grain, the odd crack and weed in a joint."""
    out = []
    for v in range(8):
        img = render_courses(v, 83, 'paving', row_h=16, lo=18, hi=30, joint=1, bevel=1.6, dome=0.12, gain=1.6, mid=1.4,
                             tone_sd=0.35, joint_idx=4, moss=0.12, lichen=0.12, cracks=0.35 if v >= 5 else 0.05,
                             grain=0.28, chips=0.3)
        out.append(img)
    return out, [2, 2, 2, 2, 1.5, 1, 1, 1]


def platform_variants(closed=True):
    """Platform flags: larger slabs, weathered; on the closed line weeds and moss in the joints."""
    out = []
    for v in range(8):
        img = render_courses(v, 97, 'stone', row_h=24, lo=20, hi=34, joint=1, bevel=1.5, dome=0.1, gain=1.6, mid=1.9,
                             tone_sd=0.4, joint_idx=4, moss=0.35 if closed else 0.08, lichen=0.3 if closed else 0.05,
                             cracks=0.3 if closed else 0.05, grain=0.3, chips=0.35)
        out.append(img)
    return out, [2, 2, 2, 2, 1.5, 1, 1, 1]
