import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fig
from people import render
from cast import all_specs, ppe
from pix import preview
ids = sys.argv[1].split(',')
views = sys.argv[2].split(',') if len(sys.argv) > 2 else ['down']
crop = sys.argv[3] if len(sys.argv) > 3 else 'head'
P = sys.argv[4] == 'ppe' if len(sys.argv) > 4 else False
ims = []
for cid, sp, lk in all_specs():
    if cid in ids:
        if P: sp = ppe(sp)
        for v in views:
            c = render(sp, v, int(os.environ.get('FR', 0)))
            ims.append((cid, c.im.crop((0, 0, 48, 48)) if crop == 'head' else c.im))
preview(ims, 'assets/hd/out/chars/zoom.png', scale=6 if crop == 'head' else 4, cols=min(len(ims), 7 if crop == 'head' else 6))
