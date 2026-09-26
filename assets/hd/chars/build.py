"""LINESIDE HD characters: build every walking sheet, PPE sheet, animal sheet, the manifest and the previews.

Run from the repo root:  python3 assets/hd/chars/build.py
Deterministic (no randomness beyond the seeded pixel hashes). Output: assets/hd/out/chars/
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import fig  # noqa: F401  (extra ramps)
from pix import sheet, preview, manifest, save
from people import render, W, H, PAD, NFRAMES, NW, NI, SIT_COLS
from cast import all_specs, ppe, ROOT

OUT = os.path.join(ROOT, 'assets', 'hd', 'out', 'chars')
ROWS = ['down', 'up', 'left', 'right', 'sit_down', 'sit_up']
WALKROWS = 4
ANCHOR = [24, 93 + PAD]


def person_sheet(spec):
    from pix import Canvas
    frames = [render(spec, v, i) if (r < WALKROWS or i < SIT_COLS) else Canvas(W, H)
              for r, v in enumerate(ROWS) for i in range(NFRAMES)]
    return sheet(frames, NFRAMES, W, H), frames


def save_small(im, path):
    """Save losslessly as an 8-bit palette PNG when the sheet has at most 255 opaque colours (it always does: every
    pixel is a ramp colour or the outline), which roughly halves the size of the embedded atlas."""
    from PIL import Image
    im = im.convert('RGBA')
    cols = im.getcolors(1 << 16)
    opaque = sorted(set(c[:3] for n, c in cols if c[3] == 255)) if cols else None
    if not cols or len(opaque) > 255 or any(0 < c[3] < 255 for n, c in cols):
        im.save(path, optimize=True); return
    idx = {c: i + 1 for i, c in enumerate(opaque)}
    p = Image.new('P', im.size, 0)
    pal = [0, 0, 0] + [v for c in opaque for v in c]
    p.putpalette(pal + [0] * (768 - len(pal)))
    src = im.load(); dst = p.load()
    for y in range(im.height):
        for x in range(im.width):
            c = src[x, y]
            if c[3]: dst[x, y] = idx[c[:3]]
    p.save(path, optimize=True, transparency=0)


def main(only=None):
    os.makedirs(OUT, exist_ok=True)
    entries = {}
    fronts, ppe_fronts, walks, gifs, walk_all = [], [], [], {}, []
    for cid, spec, look in all_specs():
        if only and cid not in only: continue
        for is_ppe in (False, True):
            sp = ppe(spec) if is_ppe else spec
            im, frames = person_sheet(sp)
            key = cid + ('_ppe' if is_ppe else '')
            fn = key + '.png'
            save_small(im, os.path.join(OUT, fn))
            entries[key] = dict(id=cid, file=fn, w=im.width, h=im.height, frame=[W, H], rows=ROWS, cols=NFRAMES,
                                walk=[1, NW], idle=[1 + NW, NI], sit=[0, SIT_COLS], anchor=ANCHOR, look=look, ppe=is_ppe)
            (ppe_fronts if is_ppe else fronts).append((key, frames[0]))
            if not is_ppe:
                walk_all += [(f'{cid} {ROWS[r]}{i}', frames[r * NFRAMES + i]) for r in (0, 2) for i in range(1, NW + 1)]
            if not is_ppe and cid in ('moira', 'tom', 'jo'):
                walks += [(f'{cid}{r}{i}', frames[r * NFRAMES + i]) for r in range(4) for i in range(1, NW + 1)]
            if cid in ('moira', 'tom', 'jo') and not is_ppe:
                gifs[cid] = frames
    if not only:
        import animals
        entries.update(animals.build(OUT))
        manifest(os.path.join(OUT, 'manifest.json'), entries)
    preview(fronts, os.path.join(OUT, 'preview_all.png'), scale=3, cols=9)
    preview(ppe_fronts, os.path.join(OUT, 'preview_ppe.png'), scale=3, cols=9)
    if not only or 'moira' in only:
        moira_vs_reference()
    import profiles
    profiles.build(only, os.path.join(OUT, 'preview_profiles.png'))
    if walk_all and not only: preview(walk_all, os.path.join(OUT, 'preview_walk_all.png'), scale=2, cols=24)
    if walks: preview(walks, os.path.join(OUT, 'preview_walk.png'), scale=3, cols=NW)
    if gifs: walk_gif(gifs)
    if not only:
        sits = [(f'{cid} {v}{i}', render(sp, v, i)) for cid, sp, lk in all_specs() if cid in ('moira', 'jo', 'tom', 'june', 'brian')
                for v in ('sit_down', 'sit_up') for i in range(SIT_COLS)]
        preview(sits, os.path.join(OUT, 'preview_sit.png'), scale=3, cols=6)
    return entries


def walk_gif(gifs, scale=3, ms=50):
    """preview_walk.gif: each character walking in all four directions, at 3x, looping the 8 walk frames."""
    from PIL import Image
    ids = list(gifs)
    cw, ch = W * scale + 8, H * scale + 8
    out = []
    for i in range(1, NW + 1):
        page = Image.new('RGB', (4 * cw + 8, len(ids) * ch + 8), (236, 230, 214))
        for r, cid in enumerate(ids):
            for d in range(4):
                im = gifs[cid][d * NFRAMES + i].im
                big = im.resize((W * scale, H * scale), Image.NEAREST)
                page.paste(big, (8 + d * cw, 8 + r * ch), big)
        out.append(page.convert('P', palette=Image.ADAPTIVE, colors=255))
    out[0].save(os.path.join(OUT, 'preview_walk.gif'), save_all=True, append_images=out[1:], duration=ms, loop=0)


def moira_vs_reference():
    """preview_moira.png: Moira's four standing views at 4x above the reference turnaround at the same height."""
    from PIL import Image
    from cast import all_specs
    spec = [s for c, s, l in all_specs() if c == 'moira'][0]
    views = [render(spec, v, 0).im for v in ('down', 'up', 'left', 'right')]
    sc = 4
    top = Image.new('RGB', (4 * W * sc + 40, H * sc + 20), (236, 230, 214))
    for i, im in enumerate(views):
        big = im.resize((W * sc, H * sc), Image.NEAREST); top.paste(big, (8 + i * (W * sc + 8), 10), big)
    ref = Image.open(os.path.join(ROOT, 'docs', 'visual-brief', 'reference_character_detail.jpg')).convert('RGB')
    ref = ref.resize((round(ref.width * H * sc / ref.height), H * sc))
    out = Image.new('RGB', (max(top.width, ref.width), top.height + ref.height + 10), (236, 230, 214))
    out.paste(top, (0, 0)); out.paste(ref, (0, top.height + 10))
    out.save(os.path.join(OUT, 'preview_moira.png'))


if __name__ == '__main__':
    main(sys.argv[1:] or None)
