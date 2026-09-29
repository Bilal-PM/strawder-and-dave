"""v2 standing assembly for previews: python3 v2.py ids out scale [ppe]"""
import sys, os
sys.path.insert(0, 'assets/hd/chars'); sys.path.insert(0, 'assets/hd/lib')
import hand
from cast import all_specs, ppe
from PIL import Image
GD = os.path.join(hand.HERE, 'handmade2'); INK = '#15111a'
def stand(s, view):
    v = 'left' if view in ('left', 'right') else view
    f = hand.Frame(s, GD, ink=INK)
    ts, hs = s['topStyle'], s['hairStyle']; hat = s.get('hat')
    sl = '_short' if ts in ('tee', 'polo') else ''
    fem = s.get('fem')
    L = lambda n, **k: f.layer(n, **k)
    under = (lambda x, y: y >= 23) if hat else None
    if v in ('down', 'up'):
        L(f'hair_{hs}_{v}_back', clip=under)
        L(f'legs_stand_{v}')
        L(f'torso_{ts}_{v}')
        if s.get('vest') and ts != 'hivis': L(f'vest_{v}')
        L(f'arm_rest_L{sl}'); L(f'arm_rest_R{sl}')
        if s.get('satchel'): L(f'satchel_{v}')
        L(f'head_{v}_f' if fem and v == 'down' else f'head_{v}')
        if v == 'down':
            L('face_down_f' if fem and hand.has('face_down_f', GD) else 'face_down')
            if s.get('beard'): L('beard_down')
        L(f'hair_{hs}_{v}', clip=under)
        if v == 'down' and s.get('earrings') and not hat: L('earrings_down')
        if v == 'down' and s.get('glasses'): L('glasses_down')
        if hat: L(f'hardhat_{v}')
        return f.finish()
    L(f'sarm_rest{sl}', dark=1, dx=3)
    if s.get('satchel') and view == 'right': L('satchel_left_farbag', dark=1)
    L(f'hair_{hs}_left_back')
    L('sleg_stand_far', dark=1); L('sleg_stand')
    L(f'torso_{ts}_left')
    if s.get('vest') and ts != 'hivis': L('vest_left')
    L('head_left_f' if fem else 'head_left')
    L('face_left_f' if fem and hand.has('face_left_f', GD) else 'face_left')
    if s.get('beard'): L('beard_left')
    L(f'hair_{hs}_left', clip=under)
    if s.get('earrings') and not hat: L('earrings_left')
    if s.get('glasses'): L('glasses_left')
    if hat: L('hardhat_left')
    L(f'sarm_rest{sl}')
    if s.get('satchel'): L('satchel_left' if view == 'left' else 'satchel_left_far')
    return f.finish(flip=(view == 'right'))
if __name__ == '__main__':
    ids = sys.argv[1].split(','); out = sys.argv[2]; sc = int(sys.argv[3]); P = len(sys.argv) > 4
    rows = []
    for cid, sp, lk in all_specs():
        if cid in ids: rows.append([stand(ppe(sp) if P else sp, v).im for v in ('down', 'left', 'up', 'right')])
    w, h = 48 * sc, 102 * sc
    page = Image.new('RGB', (4 * (w + 4) + 8, len(rows) * (h + 4) + 8), (205, 214, 190))
    for r, ims in enumerate(rows):
        for c, im in enumerate(ims):
            b = im.resize((w, h), Image.NEAREST); page.paste(b, (4 + c * (w + 4), 4 + r * (h + 4)), b)
    page.save(out)
