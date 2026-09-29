"""Export the v2 review sheets: style_v2.png (6x, the user's reference on the left) and style_v2_gamescale.png
(2x and 1x on the real grass and flagstone tiles). Run from the repo root."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2_preview import stand, all_specs
from PIL import Image, ImageDraw
IDS = ['avatar4', 'avatar0', 'avatar1', 'avatar2', 'avatar3', 'tom', 'moira', 'jo']
OUT = 'assets/hd/out/chars/'
specs = {cid: sp for cid, sp, lk in all_specs()}
views = ('down', 'left', 'up', 'right')
sc = 6; w, h = 48 * sc, 102 * sc
ref = Image.open('docs/visual-brief/reference_user_character.jpg').convert('RGB')
k = (93 * sc) / 1075.0; ref = ref.resize((int(ref.width * k), int(ref.height * k)), Image.LANCZOS)
cols = 8
page = Image.new('RGB', (ref.width + 24 + cols * (w + 6), 4 * (h + 10) + 40), (205, 214, 190)); d = ImageDraw.Draw(page)
page.paste(ref, (10, 30)); d.text((10, 10), 'reference (user)', fill=(40, 40, 40)); x0 = ref.width + 24
for i, cid in enumerate(IDS):
    for j, v in enumerate(views):
        r, c = divmod(i * 4 + j, cols); im = stand(specs[cid], v).im.resize((w, h), Image.NEAREST)
        page.paste(im, (x0 + c * (w + 6), 30 + r * (h + 10)), im)
    r, c = divmod(i * 4, cols); d.text((x0 + c * (w + 6), 18 + r * (h + 10)), cid, fill=(40, 40, 40))
page.save(OUT + 'style_v2.png')
grass = Image.open('assets/hd/out/terrain/tiles/grass.png').convert('RGB').crop((0, 0, 48, 48))
flags = Image.open('assets/hd/out/terrain/tiles/flags.png').convert('RGB').crop((0, 0, 48, 48))
def strip(scale):
    cw, ch = 48 * scale, 102 * scale; st = Image.new('RGB', (len(IDS) * 4 * cw, 2 * ch))
    for yy in range(0, 2 * ch, 48 * scale):
        for xx in range(0, st.width, 48 * scale):
            st.paste((grass if yy < ch else flags).resize((48 * scale, 48 * scale), Image.NEAREST), (xx, yy))
    for i, cid in enumerate(IDS):
        for j, v in enumerate(views):
            im = stand(specs[cid], v).im.resize((cw, ch), Image.NEAREST)
            st.paste(im, ((i * 4 + j) * cw, 0), im); st.paste(im, ((i * 4 + j) * cw, ch), im)
    return st
s2, s1 = strip(2), strip(1)
out = Image.new('RGB', (s2.width, s2.height + s1.height + 8), (30, 30, 30)); out.paste(s2, (0, 0)); out.paste(s1, (0, s2.height + 8))
out.save(OUT + 'style_v2_gamescale.png')
