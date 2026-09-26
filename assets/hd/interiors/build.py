"""LINESIDE HD interiors: office, village hall, depot (with MARJORIE). Deterministic.

    python3 assets/hd/interiors/build.py            # everything
    python3 assets/hd/interiors/build.py shed       # one room (office | hall | shed)

Writes assets/hd/out/interiors/<room>_floor.png, <room>_walls.png, <room>_overlay.png (shed), <room>_<object>.png,
marjorie.png, manifest.json and preview_<room>.png (the composed room at 2x with Moira-sized figures)."""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ilib import *
from PIL import Image


def figure():
    """A Moira-sized (44x94, feet at 22,93) stand-in for judging scale in previews."""
    f = Canvas(48, 96)
    f.rect(11, 38, 26, 44, C('olive', 2)); f.rect(11, 38, 8, 44, C('olive', 1)); f.rect(30, 38, 7, 44, C('olive', 3))
    f.rect(13, 80, 22, 6, C('charcoal', 3))
    f.rect(14, 86, 8, 8, C('boot', 2)); f.rect(26, 86, 8, 8, C('boot', 2))
    f.sphere(24, 20, 17, 18, 'hair_grey'); f.sphere(24, 5, 8, 6, 'hair_grey')
    f.sphere(24, 27, 11, 10, 'skin_light')
    for x in (19, 29): f.put(x, 27, OUTLINE); f.put(x, 26, OUTLINE)
    for k in range(5): f.put(24 + (k % 2), 45 + k * 7, C('gold', 1))
    outline(f)
    return f


FIG = None


def compose(res, figs=()):
    global FIG
    FIG = FIG or figure()
    base = res['floor'].im.copy()
    base.alpha_composite(res['walls'].im)
    items = []
    for o in res['objects']:
        if o.name in res.get('preview_skip', ()): continue
        ax, ay = o.anchor; tx, ty = o.at
        items.append((ty, o.cv.im, tx - ax, ty - ay))
    if res.get('marjorie'):
        cv, e = res['marjorie']
        items.append((e['at'][1], cv.im, e['at'][0] - e['anchor'][0], e['at'][1] - e['anchor'][1]))
    for (fx, fy) in figs:
        sh = Canvas(40, 12); ground_shadow(sh, 20, 6, 17, 5, 100)
        items.append((fy, None, fx, fy))
    items.sort(key=lambda t: t[0])
    for sy, im, x, y in items:
        if im is None:
            sh = Canvas(40, 12); ground_shadow(sh, 20, 6, 17, 5, 100)
            base.alpha_composite(sh.im, (int(x - 20), int(y - 6)))
            base.alpha_composite(FIG.im, (int(x - 24), int(y - 93)))
        else:
            base.alpha_composite(im, (int(x), int(y)))
    if res.get('overlay'): base.alpha_composite(res['overlay'].im)
    return base


def save_room(room, res, man, figs):
    for alt in [a for a in res.get('preview_skip', ()) if a.endswith('_planned')]:   # alternate states get their own preview
        r2 = dict(res); r2['objects'] = [o for o in res['objects'] if o.name != alt.replace('_planned', '').replace('_panel', '') or o.name == alt]
        r2['preview_skip'] = []
        c2 = compose(r2, figs)
        c2.resize((c2.width * 2, c2.height * 2), Image.NEAREST).convert('RGB').save(os.path.join(OUT, f'preview_{room}_{alt}.png'))
    d = {}
    save_png(res['floor'], os.path.join(OUT, f'{room}_floor.png')); d['floor'] = {'file': f'{room}_floor.png', 'w': res['floor'].w, 'h': res['floor'].h}
    save_png(res['walls'], os.path.join(OUT, f'{room}_walls.png')); d['walls'] = {'file': f'{room}_walls.png', 'w': res['walls'].w, 'h': res['walls'].h}
    if res.get('overlay'):
        save_png(res['overlay'], os.path.join(OUT, f'{room}_overlay.png'))
        d['overlay'] = {'file': f'{room}_overlay.png', 'w': res['overlay'].w, 'h': res['overlay'].h, 'draw': 'after everything'}
    d['objects'] = {}
    for o in res['objects']:
        fn = (o.name if o.name.startswith(room + '_') else f'{room}_{o.name}') + '.png'
        save_png(o.cv, os.path.join(OUT, fn)); d['objects'][o.name] = o.entry(fn)
    for k in ('variants', 'text_slots', 'points'):
        if res.get(k): d[k] = res[k]
    if res.get('marjorie'):
        cv, e = res['marjorie']
        save_png(cv, os.path.join(OUT, 'marjorie.png'))
        man['marjorie'] = dict(file='marjorie.png', room=room, **e)
    man[room] = d
    comp = compose(res, figs)
    big = comp.resize((comp.width * 2, comp.height * 2), Image.NEAREST).convert('RGB')
    big.save(os.path.join(OUT, f'preview_{room}.png'))
    return comp


FIGS = {'shed': [(15 * TILE + 24, 12 * TILE + 40), (25 * TILE, 8 * TILE + 40), (9 * TILE, 7 * TILE + 44)],
        'office': [(9 * TILE + 24, 10 * TILE + 40), (16 * TILE + 24, 4 * TILE + 40)],
        'hall': [(13 * TILE + 24, 12 * TILE + 40), (11 * TILE + 24, 3 * TILE + 40)]}


def main(which):
    import json
    mpath = os.path.join(OUT, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) and which != ['office', 'hall', 'shed'] else {}
    man['_about'] = {'tile': TILE, 'res': 3, 'units': 'art px; at = room art px where the sprite anchor lands; '
                     'tile = the level.js entity tile; foot = [x, y, w, h] map tiles; fade = [x, y, w, h] tiles where '
                     'the player behind the object makes it draw at half alpha; points/text_slots are sprite px'}
    for room in which:
        t0 = time.time()
        mod = __import__(room)
        res = mod.build()
        save_room(room, res, man, FIGS.get(room, []))
        print(f'{room}: {time.time() - t0:.1f}s')
    manifest(mpath, man)
    tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.png') and not f.startswith('preview'))
    print(f'assets: {tot / 1024:.0f} KB')


if __name__ == '__main__':
    main(sys.argv[1:] or ['shed', 'office', 'hall'])
