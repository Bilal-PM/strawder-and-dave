"""A proper walk cycle for a sprite drawn standing still: the legs and arms are cut from the standing frame and moved on
joints (hip, knee, elbow) through a hand-set gait, frame by frame, so every frame is the same drawing of the same person.

    frames = walk(stand_rgba, facing, n=12)       # stand: an FW x FH RGBA array, feet on the ground row

Side views: each leg is a thigh and a shin (with the shoe) rotated about the hip and the knee through the classic
contact, down, passing, up keys; the far leg is the same leg half a cycle later, a shade darker; the forearm swings
against the near leg. Front and back views: the feet lift in turn (the shin rises under the thigh), the hands swing a
pixel against the feet and the body rises a pixel on each passing step. The whole figure is then set back down so the
supporting foot is on the ground, which gives the natural dip at contact.
"""
import math
import numpy as np

# gait keys for one leg over a cycle (8 keys, interpolated smoothly to n frames); degrees, + = foot forward.
# contact, down, passing, up, (other leg's contact) toe-off, lift, swing-through, reach
THIGH = [34, 19, 0, -16, -30, -17, 7, 26]   # big angles: a chibi's legs are short, so they swing wide
KNEE = [-3, -12, -6, -2, -14, -52, -46, -16]   # shin relative to thigh, - = foot folds back


def _interp(keys, t):
    """Cyclic cosine interpolation of keys at t in [0, 1)."""
    n = len(keys); x = (t % 1.0) * n; i = int(math.floor(x)); f = x - i
    a, b = keys[i % n], keys[(i + 1) % n]
    w = (1 - math.cos(math.pi * f)) / 2
    return a + (b - a) * w


def _lum(f): return f[..., :3].astype(float).mean(axis=2)


def _skin(f):
    rgb = f[..., :3].astype(float) / 255.0; r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(axis=2), rgb.min(axis=2); d = mx - mn
    hue = np.where(d > 0, np.where(mx == r, ((g - b) / np.maximum(d, 1e-6)) % 6, np.where(mx == g, (b - r) / np.maximum(d, 1e-6) + 2, (r - g) / np.maximum(d, 1e-6) + 4)) * 60, 0)
    sat = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return (f[..., 3] > 0) & (hue > 12) & (hue < 45) & (sat > 0.3) & (mx > 0.3)


def _paste_affine(dst, src, mask, fwd):
    """Draw the masked pixels of src into dst through fwd(x, y) -> (x', y') given as an inverse map inv(x', y') -> (x, y).
    fwd is a pair (fwd_fn, inv_fn); nearest-neighbour, so pixel art stays crisp."""
    fw, inv = fwd
    ys, xs = np.nonzero(mask)
    if not len(ys): return
    pts = [fw(x, y) for x, y in ((xs.min(), ys.min()), (xs.max(), ys.min()), (xs.min(), ys.max()), (xs.max(), ys.max()))]
    x0 = int(math.floor(min(p[0] for p in pts))) - 2; x1 = int(math.ceil(max(p[0] for p in pts))) + 2
    y0 = int(math.floor(min(p[1] for p in pts))) - 2; y1 = int(math.ceil(max(p[1] for p in pts))) + 2
    H, W = dst.shape[:2]
    for yy in range(max(0, y0), min(H, y1 + 1)):
        for xx in range(max(0, x0), min(W, x1 + 1)):
            sx, sy = inv(xx + 0.0, yy + 0.0)
            ix, iy = int(round(sx)), int(round(sy))
            if 0 <= iy < H and 0 <= ix < W and mask[iy, ix]:
                dst[yy, xx] = src[iy, ix]


def _rot(px, py, deg, s):
    """Rotation about (px, py); s = +1 turns a point below the pivot towards -x (forward for a left-facing figure)."""
    a = math.radians(deg) * s; c, si = math.cos(a), math.sin(a)
    fw = lambda x, y: (px + (x - px) * c - (y - py) * si, py + (x - px) * si + (y - py) * c)
    inv = lambda x, y: (px + (x - px) * c + (y - py) * si, py - (x - px) * si + (y - py) * c)
    return fw, inv


def _chain(hx, hy, kx, ky, th, kn, s):
    """Shin transform: rotate about the knee by th + kn, then carry the knee to where the thigh put it."""
    tf, _ = _rot(hx, hy, th, s); nkx, nky = tf(kx, ky)
    a = math.radians(th + kn) * s; c, si = math.cos(a), math.sin(a)
    fw = lambda x, y: (nkx + (x - kx) * c - (y - ky) * si, nky + (x - kx) * si + (y - ky) * c)
    inv = lambda x, y: (kx + (x - nkx) * c + (y - nky) * si, ky - (x - nkx) * si + (y - nky) * c)
    return fw, inv


def _seg(jx, jy, njx, njy, deg, s):
    """A segment rotated by deg about its own joint (jx, jy), with the joint carried to (njx, njy)."""
    a = math.radians(deg) * s; c, si = math.cos(a), math.sin(a)
    fw = lambda x, y: (njx + (x - jx) * c - (y - jy) * si, njy + (x - jx) * si + (y - jy) * c)
    inv = lambda x, y: (jx + (x - njx) * c + (y - njy) * si, jy - (x - njx) * si + (y - njy) * c)
    return fw, inv


def _fill_median(img, hole, ok):
    """Fill hole pixels with the median of the three nearest ok pixels on the same row (else clear them)."""
    out = img.copy()
    for y in sorted(set(np.nonzero(hole)[0])):
        xs_ok = np.nonzero(ok[y] & ~hole[y])[0]
        for x in np.nonzero(hole[y])[0]:
            if len(xs_ok):
                near = xs_ok[np.argsort(np.abs(xs_ok - x))[:3]]
                out[y, x, :3] = np.median(img[y, near, :3], axis=0).astype(np.uint8); out[y, x, 3] = 255
            else: out[y, x] = 0
    return out


def _sat(f):
    rgb = f[..., :3].astype(float); mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    return (mx - mn) / np.maximum(mx, 1)


def _fill_holes(fr, removed, avoid=None):
    """Where a limb was lifted off the body, carry the neighbouring body colour across (only inside the silhouette).
    `avoid`: pixels not to borrow colour from (the rest of the arm)."""
    out = fr.copy(); H, W = removed.shape
    keep = (fr[..., 3] > 0) & ~removed
    if avoid is not None: keep &= ~avoid
    for y, x in zip(*np.nonzero(removed)):
        L = next((x - d for d in range(1, 9) if x - d >= 0 and keep[y, x - d]), None)
        R = next((x + d for d in range(1, 9) if x + d < W and keep[y, x + d]), None)
        if L is not None and R is not None:
            src = L if (x - L) <= (R - x) else R
            out[y, x] = fr[y, src]
        else:
            out[y, x] = 0
    return out


def _ground(fr, sole_row):
    a = fr[..., 3] > 0; ys = np.nonzero(a.any(axis=1))[0]
    if not len(ys): return fr
    d = sole_row - ys.max()
    return np.roll(fr, d, axis=0) if d else fr


def _hip_row(fr):
    a = fr[..., 3] > 0; ys = np.nonzero(a.any(axis=1))[0]; top, sole = ys.min(), ys.max()
    # the trousers start where most of a row (skin aside) is near-black; the outline alone never gets there
    sk = _skin(fr); dark = a & (_lum(fr) < 50) & ~sk; body = a & ~sk
    rows = [y for y in range(int(top + (sole - top) * 0.5), sole) if body[y].sum() >= 6 and dark[y].sum() >= 0.6 * body[y].sum()]
    return (rows[0] if rows else int(top + (sole - top) * 0.62)), top, sole


def _limb(fr, p0, p1, w0, w1, fill, ink, hi=None):
    """A clean pixel limb from p0 to p1 (a tapered capsule), outlined in ink, optional 1px light edge."""
    from PIL import Image, ImageDraw
    H, W = fr.shape[:2]; S = 4   # draw at 4x and take the pixel centres: crisp, symmetric edges
    im = Image.new('L', (W * S, H * S), 0); d = ImageDraw.Draw(im)
    (x0, y0), (x1, y1) = p0, p1; dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
    def cap(w_a, w_b, grow):
        a, b = (w_a / 2 + grow) * S, (w_b / 2 + grow) * S
        poly = [((x0 + 0.5) * S + nx * a, (y0 + 0.5) * S + ny * a), ((x1 + 0.5) * S + nx * b, (y1 + 0.5) * S + ny * b),
                ((x1 + 0.5) * S - nx * b, (y1 + 0.5) * S - ny * b), ((x0 + 0.5) * S - nx * a, (y0 + 0.5) * S - ny * a)]
        m = Image.new('L', im.size, 0); dd = ImageDraw.Draw(m); dd.polygon(poly, fill=255)
        for (cx, cy, r) in ((x0, y0, a), (x1, y1, b)): dd.ellipse(((cx + 0.5) * S - r, (cy + 0.5) * S - r, (cx + 0.5) * S + r, (cy + 0.5) * S + r), fill=255)
        return np.array(m)[S // 2::S, S // 2::S] > 127
    outer, inner = cap(w0, w1, 0.5), cap(w0, w1, -0.5)
    fr[outer] = (*ink, 255); fr[inner] = (*fill, 255)
    if hi is not None:   # a light edge down the front of the limb
        e = inner & ~np.roll(inner, 1, axis=1)
        fr[e & inner] = (*hi, 255)


def walk_side(stand, facing, n=12):
    s = 1 if facing == 'left' else -1
    hip, top, sole = _hip_row(stand)
    a = stand[..., 3] > 0; skin = _skin(stand); H, W = a.shape
    rows = np.arange(H)[:, None]
    L0 = _lum(stand); S0 = _sat(stand)
    leg = a & (rows >= hip)
    ank = sole - 6
    # the trouser colours and the trainer, taken from the drawing
    tro = a & (rows >= hip) & (rows < ank) & (L0 > 14) & (L0 < 50) & (S0 < 0.3)
    tc = np.median(stand[tro][:, :3], axis=0) if tro.any() else np.array([40, 40, 44])
    fill, dark, ink = tuple(int(v) for v in tc), tuple(int(v * 0.72) for v in tc), (18, 14, 18)
    hi = tuple(int(min(255, v * 1.35 + 6)) for v in tc)
    shoe = a & (rows >= ank)
    sy, sx = np.nonzero(shoe)
    # the drawing shows both trainers overlapping; keep one: the toe end, a foot's length long
    FOOT = 11
    if s == 1: x0s, x1s = sx.min(), min(sx.max(), sx.min() + FOOT - 1)
    else: x0s, x1s = max(sx.min(), sx.max() - FOOT + 1), sx.max()
    shoe_img = np.where(shoe[..., None], stand, 0)[sy.min():sy.max() + 1, x0s:x1s + 1]
    shoe_m = shoe[sy.min():sy.max() + 1, x0s:x1s + 1].copy()
    # close the cut heel end with ink
    hc = shoe_m.shape[1] - 1 if s == 1 else 0
    shoe_img[shoe_m[:, hc], hc, :3] = (18, 14, 18)
    wrow = leg[min(H - 1, hip + 3)]; legw = max(8, int(wrow.sum()))
    ys, xs = np.nonzero(leg[hip:hip + 3]); hx = float(np.median(xs)) if len(xs) else W / 2; hy = hip + 1.0
    # the ankle sits over the heel end of the trainer (the back third)
    ank_off_x = (shoe_m.shape[1] - 4) if s == 1 else 3   # the ankle sits over the heel end
    Lt = (ank - hy) * 0.52; Ls = (ank - hy) * 0.48
    arm = skin & (rows > top + (sole - top) * 0.55)
    ay_, ax_ = np.nonzero(arm)
    ex, ey = (ax_.mean(), ay_.min() - 3.0) if len(ay_) else (hx, hip - 12.0)
    body = stand.copy(); body[leg] = 0
    lum = _lum(stand); hole = arm & (rows < hip)
    body = _fill_median(body, hole, (body[..., 3] > 0) & ~skin & (lum > 55) & (lum < 150))
    body[arm & (rows >= hip)] = 0
    def leg_pose(th, kn, hxx):
        a1 = math.radians(th) * s; a2 = math.radians(th + kn) * s
        kx_, ky_ = hxx - Lt * math.sin(a1), hy + Lt * math.cos(a1)
        ax2, ay2 = kx_ - Ls * math.sin(a2), ky_ + Ls * math.cos(a2)
        return (hxx, hy), (kx_, ky_), (ax2, ay2)
    def put_shoe(fr, at, darkk, lift_toe):
        img = shoe_img.copy()
        if darkk: img[..., :3] = (img[..., :3].astype(float) * 0.7).astype(np.uint8)
        ox = int(round(at[0] - ank_off_x)); oy = int(round(at[1])) - 1
        hh, ww = shoe_m.shape
        for yy in range(hh):
            for xx in range(ww):
                if shoe_m[yy, xx]:
                    # toe-off / heel-strike: the toe end tips a pixel up or down
                    tx = (xx if s == 1 else ww - 1 - xx) / max(1, ww - 1)   # 0 at the toe
                    dy = int(round(lift_toe * (1 - tx)))
                    Y, X = oy + yy - dy, ox + xx
                    if 0 <= Y < H and 0 <= X < W: fr[Y, X] = img[yy, xx]
    frames = []
    for i in range(n):
        t = i / n
        thA, knA = _interp(THIGH, t), _interp(KNEE, t)
        thB, knB = _interp(THIGH, t + 0.5), _interp(KNEE, t + 0.5)
        fr = np.zeros_like(stand)
        tw = min(10.5, max(8.0, legw * 0.8))   # each leg most of the width of the trousers seen side-on
        for (th, kn, hxx, col, sh_dark) in ((thB, knB, hx + s * 1.5, dark, True), (thA, knA, hx - s * 0.5, fill, False), (None, None, None, None, None)):
            if th is None:
                m = body[..., 3] > 0; fr[m] = body[m]; continue
            h0, k0, a0 = leg_pose(th, kn, hxx)
            toe = 1.5 if th + kn < -25 else (-1.0 if th > 22 else 0.0)   # toe-off behind, heel-strike in front
            _limb(fr, h0, k0, tw, tw * 0.82, col, ink, None if sh_dark else hi)
            _limb(fr, k0, (a0[0], a0[1] - 1.5), tw * 0.82, tw * 0.7, col, ink, None if sh_dark else hi)
            put_shoe(fr, a0, sh_dark, toe)
        _paste_affine(fr, stand, arm, _rot(ex, ey, -thA * 0.6, s))
        frames.append(_ground(fr, sole))
    return frames


def walk_front(stand, facing, n=12):
    hip, top, sole = _hip_row(stand)
    a = stand[..., 3] > 0; skin = _skin(stand); H, W = a.shape
    rows = np.arange(H)[:, None]; cols = np.arange(W)[None, :]
    leg = a & (rows >= hip) & ~skin
    ys, xs = np.nonzero(leg[sole - 8:sole + 1]); cx = (xs.min() + xs.max()) / 2.0 if len(xs) else W / 2
    knee = int(hip + (sole - hip) * 0.5)
    legL, legR = leg & (cols < cx), leg & (cols >= cx)
    # the hands and forearms hang either side of the body
    hem = max(top, hip - 2); tx = np.nonzero(a[hem] & ~skin[hem])[0]
    t0, t1 = (tx.min(), tx.max()) if len(tx) else (cx - 8, cx + 8)
    # each hand with its outline (the skin grown by a pixel, within the drawing) so the ink moves with it
    sk = skin & (rows > top + (sole - top) * 0.52)   # below the elbows: forearms and hands, never the neck
    g = sk | np.roll(sk, 1, 0) | np.roll(sk, -1, 0) | np.roll(sk, 1, 1) | np.roll(sk, -1, 1)
    g &= a & ~(sk == 0) | (g & a & (_lum(stand) < 60))
    armL = g & (cols < cx - 4) & (rows < hip + 12)
    armR = g & (cols > cx + 4) & (rows < hip + 12)
    frames = []
    for i in range(n):
        ph = 2 * math.pi * i / n; sw = math.sin(ph)
        liftL, liftR = int(round(4.2 * max(0.0, sw))), int(round(4.2 * max(0.0, -sw)))
        bob = int(round(abs(sw)))   # up a pixel as each foot passes
        fr = np.zeros_like(stand)
        up = stand.copy(); up[leg] = 0
        sway = int(round(0.9 * sw))   # the weight shifts a pixel over the supporting foot
        up = np.roll(np.roll(up, -bob, axis=0), sway, axis=1)
        # hands swing against the feet: forward hand two pixels lower, back hand two higher (the arm stays joined)
        hl, hr = int(round(2.0 * -sw)), int(round(2.0 * sw))
        for am, dy in ((armL, hl), (armR, hr)):
            mm = np.roll(np.roll(am, -bob, axis=0), sway, axis=1)
            if dy:
                px = up.copy()
                sh = np.roll(np.where(mm[..., None], px, 0), dy, axis=0); m2 = np.roll(mm, dy, axis=0)
                if dy < 0: up[mm & ~m2] = 0   # raised: the old hand position below empties
                up[m2] = sh[m2]
        for lg, lift in ((legL, liftL), (legR, liftR)):
            thigh = lg & (rows < knee); shin = lg & (rows >= knee)
            tmp = np.where(thigh[..., None], stand, 0)
            tmp2 = np.roll(np.where(shin[..., None], stand, 0), -lift, axis=0); m2 = np.roll(shin, -lift, axis=0)
            if bob:   # stretch the top of the thigh up under the lifted body so no gap opens at the hem
                t_up = np.roll(tmp, -bob, axis=0); m_up = np.roll(thigh, -bob, axis=0); fr[m_up] = t_up[m_up]
            fr[thigh] = tmp[thigh]; fr[m2] = tmp2[m2]
        m = up[..., 3] > 0; fr[m] = up[m]
        frames.append(_ground(fr, sole) if not (liftL and liftR) else fr)
    return frames


def _close_gaps(fr):
    """Pinholes inside the figure (a limb moved a pixel off its outline) take the colour of the pixel beside them."""
    out = fr.copy(); a = fr[..., 3] > 0; H, W = a.shape
    for y, x in zip(*np.nonzero(~a)):
        l = next((x - d for d in (1, 2) if x - d >= 0 and a[y, x - d]), None)
        r = next((x + d for d in (1, 2) if x + d < W and a[y, x + d]), None)
        u = next((y - d for d in (1, 2) if y - d >= 0 and a[y - d, x]), None)
        b = next((y + d for d in (1, 2) if y + d < H and a[y + d, x]), None)
        if l is not None and r is not None and u is not None and b is not None:
            out[y, x] = fr[y, l]
    return out


def walk(stand, facing, n=12):
    fr = walk_side(stand, facing, n) if facing in ('left', 'right') else walk_front(stand, facing, n)
    return [_close_gaps(f) for f in fr]
