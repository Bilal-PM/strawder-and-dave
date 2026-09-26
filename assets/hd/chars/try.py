import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from people import render
from pix import preview
MOIRA = dict(skin='skin_light', hair='hair_grey', hairStyle='bun', top='olive', topStyle='coat', hood=True,
             inner='cream', scarf='wine', legwear='skirt', legs='charcoal', skirt='charcoal', feet='boots', feet_ramp='leather',
             glasses=True, satchel=True, bag_ramp='leather', age='old', sh=8, hem=51, brow='hair_grey', brow_i=3)
ims = [(v, render(MOIRA, v, 0)) for v in ('down', 'up', 'left', 'right')]
preview(ims, 'assets/hd/out/chars/preview_moira.png', scale=6, cols=4)
from PIL import Image
heads = [(v, c.im.crop((0, 0, 32, 32))) for v, c in ims]
preview(heads, 'assets/hd/out/chars/zoom_head.png', scale=12, cols=4)
