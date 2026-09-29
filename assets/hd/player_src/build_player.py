"""The player character "You" (avatar4), from the owner's own sprite sheets (made by the project owner with ChatGPT image
generation; see assets/CREDITS.md). Slices the source sheets, cleans them to crisp pixel art at the game's scale and
writes avatar4.png / avatar4_ppe.png plus their manifest entries into assets/hd/out/chars/.

    python3 assets/hd/player_src/build_player.py      # (build.py calls this at the end, so a full rebuild keeps it)

Sources (assets/hd/player_src/):
  sheet_walk8.png    8 rows x 8 walk frames: down, down-left, left, up, up-right, right, down-right, down-left
  sheet_actions.png  14 rows x 6 frames: idle down/left/up/right, walk, run, and a wave in each direction
Output sheet: frames FW x FH, rows down/up/left/right/sit_down/sit_up (sit rows empty), cols 0 stand, 1-8 walk,
9-12 idle (9 rest, 10 breathe in, 11 held, 12 rest). The PPE sheet recolours the T-shirt as a hi-vis vest with
reflective bands and adds a white safety helmet.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'hd', 'out', 'chars')
FW, FH, AX, AY = 64, 102, 32, 97
TARGET_H = 86                     # sole to top of hair: the standing height of the rest of the cast (85-91)
LOOK = {'skin': '#e3b673', 'hair': '#18181a', 'hairStyle': 'short', 'beard': True, 'top': '#737165', 'topStyle': 'tee',
        'legs': '#333333', 'bg': '#e6e0d4'}   # must equal PACK.avatars[4] (the engine finds a sheet by its look)


def bands(mask, axis, n):
    """Split the sheet into n bands along an axis at the emptiest lines between sprites."""
    prof = mask.sum(axis=axis).astype(float)
    on = prof > 2; runs, s = [], None
    for i, v in enumerate(on):
        if v and s is None: s = i
        if not v and s is not None: runs.append([s, i]); s = None
    if s is not None: runs.append([s, len(on)])
    runs = [r for r in runs if r[1] - r[0] > 6]
    while len(runs) > n:   # merge across the narrowest gap
        g = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]; i = int(np.argmin(g))
        runs[i] = [runs[i][0], runs[i + 1][1]]; del runs[i + 1]
    while len(runs) < n:   # split the longest run at its emptiest line near the middle
        i = max(range(len(runs)), key=lambda j: runs[j][1] - runs[j][0]); a, b = runs[i]
        per = (b - a) / 2; lo, hi = int(a + per * 0.6), int(b - per * 0.6)
        c = lo + int(np.argmin(prof[lo:hi])); runs[i:i + 1] = [[a, c], [c, b]]
    return [(max(0, a - 3), min(len(prof), b + 3)) for a, b in runs]


def cells(path, nrows, ncols):
    im = np.array(Image.open(path).convert('RGBA'))
    m = im[..., 3] > 128
    R, C = bands(m, 1, nrows), bands(m, 0, ncols)
    return [[im[r0:r1, c0:c1] for (c0, c1) in C] for (r0, r1) in R]


def clean(cell):
    """Keep the largest blob (drops neighbours' stray edges and the soft halo), return RGBA with hard alpha."""
    a = cell[..., 3] > 110
    from collections import deque
    H, W = a.shape; lab = np.zeros((H, W), int); best, bestn, k = 0, 0, 0
    for y in range(H):
        for x in range(W):
            if a[y, x] and not lab[y, x]:
                k += 1; q = deque([(y, x)]); lab[y, x] = k; n = 0
                while q:
                    cy, cx = q.popleft(); n += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and a[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = k; q.append((ny, nx))
                if n > bestn: best, bestn = k, n
    keep = np.zeros((H, W), bool)
    if best:
        # the main blob plus anything big that sits close to it (a detached hand or shoe tip)
        ys, xs = np.nonzero(lab == best); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        for j in range(1, k + 1):
            yy, xx = np.nonzero(lab == j)
            if j == best or (len(yy) > 25 and yy.min() >= y0 - 4 and yy.max() <= y1 + 4 and xx.min() >= x0 - 6 and xx.max() <= x1 + 6):
                keep |= lab == j
    out = cell.copy(); out[..., 3] = np.where(keep, 255, 0)
    # the halo pixels ChatGPT leaves around the outline are tinted by the old background: darken the rim to ink
    return out


def figure_box(rgba):
    ys, xs = np.nonzero(rgba[..., 3] > 0)
    return ys.min(), ys.max(), xs.min(), xs.max()


def resample(rgba, k):
    """Downscale with premultiplied alpha (box filter), then harden the alpha."""
    h, w = rgba.shape[:2]; nw, nh = max(1, round(w * k)), max(1, round(h * k))
    f = rgba.astype(float) / 255.0
    pm = np.dstack([f[..., :3] * f[..., 3:4], f[..., 3:4]])
    im = Image.fromarray((pm * 255).astype(np.uint8), 'RGBA').resize((nw, nh), Image.BOX)
    g = np.array(im).astype(float) / 255.0; al = g[..., 3:4]
    rgb = np.where(al > 0, g[..., :3] / np.maximum(al, 1e-6), 0)
    out = np.dstack([np.clip(rgb, 0, 1), (al > 0.5).astype(float)])
    return (out * 255).astype(np.uint8)


def ink_rim(rgba):
    """A crisp 1px dark outline: any opaque pixel touching transparency is pulled to the ink colour."""
    a = rgba[..., 3] > 0; p = np.pad(a, 1)
    edge = a & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    out = rgba.copy(); rgb = out[..., :3].astype(float)
    dark = np.array([26, 20, 24], float)
    lum = rgb.mean(axis=2, keepdims=True)
    mix = np.where(lum > 70, 0.78, 0.5)
    out[..., :3] = np.where(edge[..., None], (rgb * (1 - mix) + dark * mix), rgb).astype(np.uint8)
    return out


def place(rgba, cx_src, base_src):
    """Paste a resampled sprite into an FW x FH frame, its body centre on AX and its sole on AY."""
    fr = np.zeros((FH, FW, 4), np.uint8)
    h, w = rgba.shape[:2]
    ox, oy = AX - int(round(cx_src)), AY + 1 - int(base_src)   # the cast stand with their soles on row 98
    y0, x0 = max(0, oy), max(0, ox); y1, x1 = min(FH, oy + h), min(FW, ox + w)
    if y1 > y0 and x1 > x0:
        fr[y0:y1, x0:x1] = rgba[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    return fr


def body_cx(rgba):
    """Horizontal centre of the head and torso (the top 55% of the figure), steady through a walk cycle."""
    y0, y1, _, _ = figure_box(rgba); top = int(y0 + (y1 - y0) * 0.55)
    ys, xs = np.nonzero(rgba[y0:top, :, 3] > 0)
    return xs.mean() if len(xs) else rgba.shape[1] / 2


def process(cell, k):
    c = clean(cell)
    y0, y1, x0, x1 = figure_box(c)
    c = c[max(0, y0 - 2):y1 + 3, max(0, x0 - 2):x1 + 3]
    r = resample(c, k)
    if (r[..., 3] > 0).sum() == 0: return np.zeros((FH, FW, 4), np.uint8)
    r = ink_rim(r)
    yy0, yy1, _, _ = figure_box(r)
    return place(r, body_cx(r), yy1)


def scale_for(cells_row):
    hs = []
    for c in cells_row:
        cc = clean(c); y0, y1, _, _ = figure_box(cc); hs.append(y1 - y0 + 1)
    return TARGET_H / float(np.median(hs))


def quantize(sheet, n=64):
    """Share one tidy palette across the sheet so the pixels read as deliberate clusters, not JPEG soup."""
    im = Image.fromarray(sheet, 'RGBA'); a = sheet[..., 3]
    rgb = Image.fromarray(sheet[..., :3], 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.array(rgb), a]); out[a == 0] = 0
    return out


def skin_tone(sheet):
    """ChatGPT pushed the skin towards orange; pull it back to the reference's warm tan (less saturation, a touch lighter)."""
    import colorsys
    out = sheet.copy(); a = sheet[..., 3] > 0
    f = sheet[..., :3].astype(float) / 255.0
    mx, mn = f.max(axis=2), f.min(axis=2); d = mx - mn
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    hue = np.where(d > 0, (np.where(mx == r, ((g - b) / np.maximum(d, 1e-6)) % 6, np.where(mx == g, (b - r) / np.maximum(d, 1e-6) + 2, (r - g) / np.maximum(d, 1e-6) + 4))) * 60, 0)
    sat = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    skin = a & (hue > 14) & (hue < 42) & (sat > 0.35) & (mx > 0.35)
    k = 0.72   # saturation scale
    grey = mx[..., None]
    nf = grey - (grey - f) * k
    nf = np.clip(nf * 1.03 + 0.01, 0, 1)
    out[..., :3] = np.where(skin[..., None], (nf * 255).astype(np.uint8), sheet[..., :3])
    return out


# ----------------------------------------------------------------------------- PPE
def ppe(frame, facing):
    """Hi-vis vest over the grey T-shirt (orange, two silver bands) and a white helmet over the hair."""
    f = frame.copy(); rgb = f[..., :3].astype(int); a = f[..., 3] > 0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    ys = np.nonzero(a.any(axis=1))[0]
    if not len(ys): return f
    top, sole = ys.min(), ys.max(); H = sole - top
    rows = np.arange(FH)[:, None]
    torso = (rows > top + H * 0.36) & (rows < top + H * 0.72)
    grey = a & (mx - mn < 26) & (mx > 60) & torso
    lum = rgb.mean(axis=2)
    shade = np.clip((lum - 60) / 90.0, 0, 1)
    orange = np.stack([200 + 55 * shade, 90 + 60 * shade, 24 + 20 * shade], axis=2)
    f[..., :3] = np.where(grey[..., None], orange, f[..., :3]).astype(np.uint8)
    gy = np.nonzero(grey.any(axis=1))[0]
    if len(gy) > 6:
        y0, y1 = gy.min(), gy.max(); hh = y1 - y0
        for by in (int(y0 + hh * 0.55), int(y0 + hh * 0.78)):
            for yy in (by, by + 1):
                band = grey[yy]
                f[yy, band, :3] = (np.array([222, 226, 228]) if yy == by else np.array([176, 182, 188]))
        if facing in ('down', 'up'):   # the braces over the shoulders
            xs = np.nonzero(grey[y0 + 2])[0]
            if len(xs) > 10:
                for xc in (xs.min() + (xs.max() - xs.min()) // 4, xs.max() - (xs.max() - xs.min()) // 4):
                    for yy in range(y0, int(y0 + hh * 0.55)):
                        for xx in (xc, xc + 1):
                            if grey[yy, xx]: f[yy, xx, :3] = (222, 226, 228) if xx == xc else (176, 182, 188)
    # helmet: a white dome that replaces the top of the hair, with a brim (longer at the front in profile)
    lum2 = f[..., :3].astype(int).mean(axis=2); a2 = f[..., 3] > 0
    headH = H * 0.40
    y_brim = int(top + headH * 0.42)
    hairrow = np.nonzero(a2[y_brim] & (lum2[y_brim] < 70))[0]
    if len(hairrow) < 4: return f
    x0, x1 = hairrow.min(), hairrow.max()
    if facing == 'left': x0 += 1
    if facing == 'right': x1 -= 1
    cx = (x0 + x1) / 2.0; w = (x1 - x0) / 2.0 + 1
    y_top = int(top + headH * 0.02)
    f[:y_brim, :, 3] = 0   # clear the hair above the brim; the dome goes back on top
    ink, hi, mid, lo = (26, 20, 24), (252, 250, 244), (228, 226, 218), (186, 184, 178)
    for yy in range(y_top, y_brim):
        t = (yy - y_top + 0.5) / max(1, y_brim - y_top)
        half = w * np.sqrt(max(0.0, 1 - (1 - t) ** 2))
        xa, xb = int(round(cx - half)), int(round(cx + half))
        for xx in range(max(0, xa), min(FW, xb + 1)):
            rel = (xx - xa) / max(1, xb - xa)
            col = ink if (xx in (xa, xb) or yy == y_top) else (hi if rel < 0.38 else mid if rel < 0.78 else lo)
            if yy == y_top + 1 and not xx in (xa, xb): col = hi
            f[yy, xx, :3] = col; f[yy, xx, 3] = 255
    # the ridge down the middle (front and back) or along the crown (profile)
    if facing in ('down', 'up'):
        for yy in range(y_top + 1, y_brim): f[yy, int(round(cx)), :3] = mid
    bx0, bx1 = int(round(cx - w)) - 1, int(round(cx + w)) + 1
    if facing == 'left': bx0 -= 3
    if facing == 'right': bx1 += 3
    for xx in range(max(0, bx0), min(FW, bx1 + 1)):
        f[y_brim, xx, :3] = ink if xx in (bx0, bx1) else mid; f[y_brim, xx, 3] = 255
        f[y_brim + 1, xx, :3] = ink; f[y_brim + 1, xx, 3] = 255
    return f


def write_portraits(files):
    """js/world/portraits_img.js: LS.PORTRAIT_IMG[key][mood] as data URIs (one image serves every mood for now)."""
    import base64
    P = {}
    for key, path in files.items():
        uri = 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()
        P[key] = {'neutral': uri, 'smile': uri, 'concern': uri}
    with open(os.path.join(ROOT, 'js', 'world', 'portraits_img.js'), 'w') as o:
        o.write('/* Dialogue portraits as images: generated by assets/hd/player_src/build_player.py. Do not edit. */\n')
        o.write('window.LS = window.LS || {};\nLS.PORTRAIT_IMG = Object.assign(LS.PORTRAIT_IMG || {}, ')
        json.dump(P, o, separators=(',', ':')); o.write(');\n')


def main():
    walk = cells(os.path.join(HERE, 'sheet_walk8.png'), 8, 8)
    act = cells(os.path.join(HERE, 'sheet_actions.png'), 14, 6)
    k_walk, k_act = scale_for(walk[0]), scale_for(act[0])
    src_walk = {'down': walk[0], 'left': walk[2], 'up': walk[3], 'right': walk[5]}
    src_idle = {'down': act[0], 'left': act[1], 'up': act[2], 'right': act[3]}
    ROWS = ['down', 'up', 'left', 'right', 'sit_down', 'sit_up']
    NW = 12   # walk frames per cycle (two steps)
    NC = 1 + NW   # col 0 stands, 1-12 walk; no idle columns, so the engine's own breathing (shoulders settle 1px) applies
    import puppet
    sheet = np.zeros((FH * len(ROWS), FW * NC, 4), np.uint8)
    # the owner's 8-direction walk sheet (13 columns: col 0 stands, 1-12 walk). Its front and back walks alternate the
    # feet cleanly, so they are used as drawn; its side walks never pass the legs, so the sides are walked on joints
    # from its own standing profile (puppet.py).
    w13 = cells(os.path.join(HERE, 'sheet_walk13_b.png'), 8, 13); k13 = scale_for(w13[0])
    src13 = {'down': w13[0], 'up': w13[4], 'left': w13[2], 'right': w13[6]}
    for ri, v in enumerate(ROWS[:4]):
        if v in ('down', 'up'):
            stand = process(src13[v][0], k13); wk = [process(c, k13) for c in src13[v][1:1 + NW]]
        else:
            # the side walk: the owner's 8-frame left-facing cycle (contact, down, passing, up, then the other leg),
            # spread over the 12 columns (each frame shown for one or two columns) and mirrored for right
            side = cells(os.path.join(HERE, 'sheet_side8_b.png'), 1, 8)[0]; ks = scale_for(side)
            s8 = [process(c, ks) for c in side]
            if v == 'right': s8 = [f[:, ::-1].copy() for f in s8]
            wk = [s8[int(round(i * 8 / NW)) % 8] for i in range(NW)]
            stand = process(src_idle[v][0], k_act)
        for ci, fr in enumerate([stand] + wk):
            sheet[ri * FH:(ri + 1) * FH, ci * FW:(ci + 1) * FW] = fr
    sheet = skin_tone(sheet)
    sheet = quantize(sheet)
    ppe_sheet = sheet.copy()
    for ri, v in enumerate(ROWS[:4]):
        for ci in range(NC):
            sl = (slice(ri * FH, (ri + 1) * FH), slice(ci * FW, (ci + 1) * FW))
            ppe_sheet[sl] = ppe(sheet[sl], v)
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'avatar4.png'), optimize=True)
    Image.fromarray(ppe_sheet, 'RGBA').save(os.path.join(OUT, 'avatar4_ppe.png'), optimize=True)
    mf = os.path.join(OUT, 'manifest.json'); man = json.load(open(mf))
    for key, is_ppe in (('avatar4', False), ('avatar4_ppe', True)):
        man[key] = dict(id='avatar4', file=key + '.png', w=FW * NC, h=FH * len(ROWS), frame=[FW, FH], rows=ROWS, cols=NC,
                        walk=[1, NW], sit=[0, 0], anchor=[AX, AY], look=LOOK, ppe=is_ppe)
    json.dump(man, open(mf, 'w'), indent=1, sort_keys=True)
    # portrait for the dialogue box and the setup screen: head and shoulders from the front idle, at source detail
    c = clean(act[0][0]); y0, y1, x0, x1 = figure_box(c)
    bust = c[max(0, y0 - 2):y0 + int((y1 - y0) * 0.62), max(0, x0 - 4):x1 + 5]
    b = Image.fromarray(skin_tone(bust[None])[0] if False else bust, 'RGBA')
    b = Image.fromarray(skin_tone(np.array(b)), 'RGBA')
    S = 160; card = Image.new('RGBA', (S, S), LOOK['bg']); k = (S * 0.96) / max(b.width, b.height * 0.92)
    bb = b.resize((round(b.width * k), round(b.height * k)), Image.LANCZOS)
    card.alpha_composite(bb, ((S - bb.width) // 2, S - bb.height + round(S * 0.04)))
    card.convert('RGB').save(os.path.join(HERE, 'portrait_avatar4.png'))
    write_portraits({'avatar4': os.path.join(HERE, 'portrait_avatar4.png')})
    # review preview: 4x, on grass
    prev = Image.new('RGBA', (FW * NC * 4, FH * 4 * 8), (104, 150, 88, 255))
    big = Image.fromarray(sheet, 'RGBA').crop((0, 0, FW * NC, FH * 4)).resize((FW * NC * 4, FH * 16), Image.NEAREST)
    bigp = Image.fromarray(ppe_sheet, 'RGBA').crop((0, 0, FW * NC, FH * 4)).resize((FW * NC * 4, FH * 16), Image.NEAREST)
    prev.alpha_composite(big, (0, 0)); prev.alpha_composite(bigp, (0, FH * 16))
    prev.save(os.path.join(OUT, 'preview_avatar4.png'))
    print('avatar4: scales', round(k_walk, 3), round(k_act, 3))


if __name__ == '__main__':
    main()
