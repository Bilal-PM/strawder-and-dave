"""preview_profiles.png: every character's left + right standing head at 6x (normal and PPE)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import fig
from build import render
from cast import all_specs, ppe, ROOT
from pix import preview


def build(ids=None, out=None, ppe_too=True):
    ims = []
    for cid, sp, lk in all_specs():
        if ids and cid not in ids: continue
        for P in ((False, True) if ppe_too else (False,)):
            s = ppe(sp) if P else sp
            for v in ('left', 'right'):
                ims.append((cid, render(s, v, 0).im.crop((0, 6, 48, 54))))
    preview(ims, out or os.path.join(ROOT, 'assets', 'hd', 'out', 'chars', 'preview_profiles.png'), scale=6, cols=8)


if __name__ == '__main__':
    build(sys.argv[1].split(',') if len(sys.argv) > 1 else None,
          sys.argv[2] if len(sys.argv) > 2 else None, ppe_too=len(sys.argv) <= 3)


def turnaround(out=None, sc=4):
    """preview_turnaround.png: every character standing in down / left / up / right at 4x, two characters a row
    (normal and PPE side by side), so front and profile can be compared directly."""
    from PIL import Image
    views = ('down', 'left', 'up', 'right')
    cells = []
    for cid, sp, lk in all_specs():
        for P in (False, True):
            s = ppe(sp) if P else sp
            cells.append([render(s, v, 0).im for v in views])
    w, h = 48 * sc, 102 * sc
    per = 2
    page = Image.new('RGB', (per * (4 * (w + 4) + 16) + 8, ((len(cells) + per - 1) // per) * (h + 8) + 8), (205, 214, 190))
    for i, ims in enumerate(cells):
        r, c = divmod(i, per)
        for j, im in enumerate(ims):
            big = im.resize((w, h), Image.NEAREST)
            page.paste(big, (8 + c * (4 * (w + 4) + 16) + j * (w + 4), 8 + r * (h + 8)), big)
    page.save(out or os.path.join(ROOT, 'assets', 'hd', 'out', 'chars', 'preview_turnaround.png'))
