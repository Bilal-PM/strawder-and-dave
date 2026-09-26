"""preview_profiles.png: every character's left + right standing head at 6x (normal and PPE)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import fig
from people import render
from cast import all_specs, ppe, ROOT
from pix import preview


def build(ids=None, out=None, ppe_too=True):
    ims = []
    for cid, sp, lk in all_specs():
        if ids and cid not in ids: continue
        for P in ((False, True) if ppe_too else (False,)):
            s = ppe(sp) if P else sp
            for v in ('left', 'right'):
                ims.append((cid, render(s, v, 0).im.crop((0, 2, 48, 50))))
    preview(ims, out or os.path.join(ROOT, 'assets', 'hd', 'out', 'chars', 'preview_profiles.png'), scale=6, cols=8)


if __name__ == '__main__':
    build(sys.argv[1].split(',') if len(sys.argv) > 1 else None,
          sys.argv[2] if len(sys.argv) > 2 else None, ppe_too=len(sys.argv) <= 3)
