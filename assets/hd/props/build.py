"""Build every LINESIDE HD nature & street prop.  Run from the repo root:

    python3 assets/hd/props/build.py            # all assets + manifest + previews
    python3 assets/hd/props/build.py --no-preview

Output: assets/hd/out/props/*.png, manifest.json, preview_*.png. Deterministic (every generator is seeded).
"""
import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from kit import *  # noqa
import trees, bounds, flora, street
from bounds import N, E, S, W

OUTD = OUT
MAN = {}
PREV = {}          # preview group -> [(label, image)]


def _name_file(name): return name + '.png'


def _pad_if_clipped(cv, anchor, extra, keep=False):
    """If art touches the canvas edge its outline was clipped: pad 2 px all round and redo the outline there."""
    if keep: return cv, anchor
    a = cv.im.getchannel('A'); w, h = cv.w, cv.h
    touch = any(a.getpixel((0, y)) == 255 or a.getpixel((w - 1, y)) == 255 for y in range(h)) or \
        any(a.getpixel((x, 0)) == 255 for x in range(w))
    if not touch: return cv, anchor
    p = 2; big = Canvas(w + 2 * p, h + 2 * p); big.im.paste(cv.im, (p, p)); big.px = big.im.load()
    outline(big)
    for k in ('text',):
        if k in extra: extra[k] = dict(extra[k], x=extra[k]['x'] + p, y=extra[k]['y'] + p)
    if 'arms' in extra: extra['arms'] = [dict(r, x=r['x'] + p, y=r['y'] + p) for r in extra['arms']]
    if 'fade' in extra: extra['fade'] = dict(extra['fade'], x=extra['fade']['x'] + p, y=extra['fade']['y'] + p)
    if 'ends' in extra: extra['ends'] = [[x + p, y + p] for x, y in extra['ends']]
    if 'light' in extra: extra['light'] = [extra['light'][0] + p, extra['light'][1] + p]
    return big, [anchor[0] + p, anchor[1] + p]


def put(name, cv, anchor, group, **extra):
    """Save one sprite and record it in the manifest."""
    tiled = 'origin' in extra or 'seamless' in extra or 'parts' in extra
    cv, anchor = _pad_if_clipped(cv, anchor, extra, keep=tiled)
    save(cv, os.path.join(OUTD, _name_file(name)))
    e = {'file': _name_file(name), 'w': cv.w, 'h': cv.h, 'anchor': [int(anchor[0]), int(anchor[1])]}
    e.update(extra); MAN[name] = e
    PREV.setdefault(group, []).append((name, cv))
    return e


def build_trees():
    sizes = {'s': 0.62, 'm': 0.8, 'l': 1.0}
    species = [('oak', trees.oak, 1), ('sycamore', trees.sycamore, 2), ('ash', trees.ash, 3), ('birch', trees.birch, 4),
               ('hawthorn', trees.hawthorn, 5), ('rowan', trees.rowan, 6), ('scots_pine', trees.scots_pine, 7),
               ('spruce', trees.spruce, 8)]
    for sp, fn, seed in species:
        for sz, s in sizes.items():
            r = fn(s, seed=seed * 10 + len(sz) + int(s * 10))
            name = '%s_%s' % (sp, sz)
            save(r['crown'], os.path.join(OUTD, name + '_crown.png'))
            save(r['trunk'], os.path.join(OUTD, name + '_trunk.png'))
            put(name, r['full'], r['anchor'], 'trees', fade=r['fade'], tiles=[1, 1],
                parts={'crown': name + '_crown.png', 'trunk': name + '_trunk.png'})
    r = trees.hawthorn(0.8, seed=58, blossom=False)
    save(r['crown'], os.path.join(OUTD, 'hawthorn_leaf_m_crown.png')); save(r['trunk'], os.path.join(OUTD, 'hawthorn_leaf_m_trunk.png'))
    put('hawthorn_leaf_m', r['full'], r['anchor'], 'trees', fade=r['fade'], tiles=[1, 1],
        parts={'crown': 'hawthorn_leaf_m_crown.png', 'trunk': 'hawthorn_leaf_m_trunk.png'})


def build_woods():
    ft = trees.FT // TILE
    put('forest_fill', trees.forest_fill(), [0, 0], 'woods', tiles=[ft, ft], seamless='xy',
        note='opaque canopy; tile it on a 4x4-tile grid aligned to the map (tile x%4, y%4)')
    cv, base = trees.forest_edge_s()
    put('forest_edge_s', cv, [0, base], 'woods', tiles=[ft, 1], seamless='x',
        note='front row of trees for a southern woodland boundary; anchor y = ground line of the last t row')
    put('forest_edge_n', trees.forest_edge_n(), [0, 0], 'woods', tiles=[ft, 1], seamless='x',
        note='crown tops bulging north; bottom 20 px are opaque canopy; y = 0 is ~0.8 tile above the first t row')
    put('forest_edge_w', trees.forest_edge_side('w'), [0, 0], 'woods', tiles=[1, ft], seamless='y',
        note='crowns bulging west; right 26 px opaque (overlap the fill)')
    put('forest_edge_e', trees.forest_edge_side('e'), [0, 0], 'woods', tiles=[1, ft], seamless='y',
        note='crowns bulging east; left 26 px opaque (overlap the fill)')
    for i in range(4):
        cv = trees.forest_clump(300 + i, r=26 + i * 3)
        put('forest_clump_%d' % i, cv, [cv.w // 2, cv.h // 2], 'woods', note='scatter on edges and outer corners; anchor = crown centre')


def build_flora():
    for i, (sz, s) in enumerate((('s', 0.6), ('m', 0.8), ('l', 1.0))):
        r = flora.shrub(s, seed=20 + i); put('shrub_' + sz, r['full'], r['anchor'], 'flora', fade=r['fade'])
    r = flora.shrub(0.8, 25, 'p_thorn', 'gorse'); put('gorse', r['full'], r['anchor'], 'flora')
    r = flora.shrub(0.7, 26, 'p_hedge', 'rose'); put('shrub_rose', r['full'], r['anchor'], 'flora')
    r = flora.buddleia(); put('buddleia', r['full'], r['anchor'], 'flora', fade=r['fade'])
    r = flora.sapling(); put('sapling_sycamore', r['full'], r['anchor'], 'flora')
    simple = [('bracken', flora.bracken(30)), ('bracken_2', flora.bracken(33)), ('bracken_autumn', flora.bracken(31, True)),
              ('nettles', flora.nettles()), ('foxgloves', flora.foxgloves()), ('reeds', flora.reeds(70)),
              ('reeds_plain', flora.reeds(71, False)), ('willowherb', flora.willowherb()), ('ragwort', flora.ragwort()),
              ('grass_tuft', flora.grass_tuft(90)), ('grass_tuft_2', flora.grass_tuft(92)), ('grass_tall', flora.grass_tuft(91, True)),
              ('dandelions', flora.dandelions()), ('ballast_weeds', flora.ballast_weeds(97)), ('ballast_weeds_2', flora.ballast_weeds(98))]
    for name, cv in simple:
        put(name, cv, [cv.w // 2, cv.h - 3], 'flora')


def build_bounds():
    ht = bounds.HEDGE_H + 3; wt = bounds.WALL_B + bounds.WALL_C + 3
    for m in range(16):
        for v in range(2):
            cv = bounds.hedge_tile(m, v, 'may' if v == 0 else None)
            put('hedge_%d_%d' % (m, v), cv, [24, ht + 47], 'hedge', tiles=[1, 1], origin=[0, ht], mask=m)
            cv = bounds.wall_tile(m, v)
            put('wall_%d_%d' % (m, v), cv, [24, wt + 47], 'wall', tiles=[1, 1], origin=[0, wt], mask=m)
    for m in range(16):
        cv = bounds.wall_tile(m, 0, 'p_grit'); put('wall_sand_%d' % m, cv, [24, wt + 47], 'wall', tiles=[1, 1], origin=[0, wt], mask=m)
    for kind in ('rail', 'picket', 'rails'):
        t = bounds.FENCE_TOP[kind]
        for m in range(16):
            cv = bounds.fence_tile(m, kind)
            put('fence_%s_%d' % (kind, m), cv, [24, t + 47], 'fence', tiles=[1, 1], origin=[0, t], mask=m)
    for o in (False, True):
        cv, t = bounds.field_gate(o); put('gate_field' + ('_open' if o else ''), cv, [5, t + 29], 'fence', tiles=[2, 1], origin=[0, t])
        cv, t = bounds.wicket_gate(o); put('gate_wicket' + ('_open' if o else ''), cv, [24, t + 29], 'fence', tiles=[1, 1], origin=[0, t])
    cv, t = bounds.stile(); put('stile', cv, [24, t + 34], 'fence', tiles=[1, 1], origin=[0, t])


def build_street():
    for lit in (False, True):
        cv, a = street.lamp_post(lit); put('lamp_post' + ('_lit' if lit else ''), cv, a, 'street', light=[20, 17])
    cv, a = street.bench(); put('bench', cv, a, 'street', tiles=[2, 1])
    cv, a = street.bench(1, plaque=False); put('bench_plain', cv, a, 'street', tiles=[2, 1])
    for name, fn in (('litter_bin', street.litter_bin), ('pillar_box', street.pillar_box), ('phone_box', street.phone_box),
                     ('bus_stop', street.bus_stop), ('planter_barrel', street.planter_barrel), ('planter_trough', street.planter_trough),
                     ('bicycle', street.bicycle), ('milk_churn', street.milk_churn), ('crate', street.crate),
                     ('pallet', street.pallet), ('sandbags', street.sandbags), ('traffic_cone', street.traffic_cone),
                     ('wheelbarrow', street.wheelbarrow), ('bean_canes', street.bean_canes), ('cold_frame', street.cold_frame),
                     ('water_butt', street.water_butt), ('garden_shed', street.garden_shed), ('war_memorial', street.war_memorial)):
        cv, a = fn(); put(name, cv, a, 'street')
    cv, a = street.milk_churn(True); put('milk_churn_dented', cv, a, 'street')
    cv, a = street.crate('apples'); put('crate_apples', cv, a, 'street')
    for k in ('iron', 'timber', 'concrete'):
        cv, a = street.bollard(k); put('bollard_' + k, cv, a, 'street')
    for k in ('round', 'cross', 'slab', 'chest'):
        for v in range(2 if k != 'chest' else 1):
            cv, a = street.gravestone(k, v); put('grave_%s_%d' % (k, v), cv, a, 'street')
    for arms in (('E', 'W'), ('N', 'E'), ('N', 'E', 'W'), ('N', 'E', 'S', 'W')):
        cv, a, rects = street.fingerpost(arms)
        put('fingerpost_' + ''.join(arms), cv, a, 'signs', arms=rects)
    for sz in ('s', 'm', 'l'):
        cv, a, r = street.notice_board(sz); put('notice_board_' + sz, cv, a, 'signs', text=r)
    for sz in ('s', 'm', 'l', 'xl'):
        cv, a, r = street.sign_board(sz); put('sign_board_' + sz, cv, a, 'signs', text=r)
    cv, a, r = street.sign_board('m', 'paint_blue', 'white'); put('sign_board_blue_m', cv, a, 'signs', text=r)
    cv, a, r = street.sign_board('l', 'paint_cream', 'paint_green'); put('sign_board_green_l', cv, a, 'signs', text=r)
    for (w, h, c, f, nm) in ((40, 14, 'paint_cream', 'wood_dark', 'plaque_s'), (64, 18, 'paint_green', 'gold', 'plaque_m'),
                             (96, 22, 'paint_cream', 'paint_green', 'plaque_l')):
        cv, r = street.wall_plaque(w, h, c, f); put(nm, cv, [w // 2, h - 1], 'signs', text=r)
    cv, a = street.window_box(); put('window_box', cv, a, 'street')
    cv, a = street.hanging_basket(); put('hanging_basket', cv, a, 'street')
    cv, a = street.washing_line(); put('washing_line', cv, a, 'street', tiles=[3, 1])
    cv, a = street.washing_line(oily=True); put('washing_line_overalls', cv, a, 'street', tiles=[3, 1])
    for i, L in enumerate((96, 144)):
        cv, ends = street.bunting(L, 8 + i * 4, seed=i); put('bunting_%d' % L, cv, ends[0], 'street', ends=ends)


# ------------------------------------------------------------------ previews
def ground(w, h):
    """Simple grass and lane ground for the composed preview only (terrain is another artist's area)."""
    g = Canvas(w, h)
    for y in range(h):
        for x in range(w):
            n = fbm(x, y, 18, 5); i = 2 if n > 0.55 else 3
            if hash01(x, y, 6) < 0.06: i = 1
            if hash01(x, y, 7) < 0.04: i = 4
            g.px[x, y] = C('grass', i)
    return g


def scene():
    Wt, Ht = 16, 11; w, h = Wt * TILE, Ht * TILE
    g = ground(w, h)
    lane_y0, lane_y1 = 6 * TILE + 8, 7 * TILE + 40
    for y in range(lane_y0, lane_y1):
        for x in range(w):
            e = min(y - lane_y0, lane_y1 - 1 - y)
            n = fbm(x, y, 7, 9)
            i = 1 if n > 0.6 else 2
            if e < 3: i = 3
            if (abs(y - (lane_y0 + lane_y1) / 2) < 5) and hash01(x // 3, y, 8) < 0.5: g.px[x, y] = C('grass', 3); continue
            if hash01(x, y, 10) < 0.05: i = 3
            g.px[x, y] = C('dirt', i)
    draw = []   # (sort y, image, x, y)
    # woodland across the top 3 rows
    fill = trees.forest_fill(); es, base = trees.forest_edge_s()
    for x in range(0, w, fill.w): g.im.alpha_composite(fill.im.crop((0, 0, min(fill.w, w - x), 2 * TILE)), (x, 0)); g.px = g.im.load()
    for x in range(0, w, es.w): draw.append((2 * TILE + 40, es, x, 2 * TILE + 40 - base))
    # wall along the north side of the lane (row 5), with a stile; hedge along the south (row 8)
    wt = bounds.WALL_B + bounds.WALL_C + 3; ht = bounds.HEDGE_H + 3
    for tx in range(Wt):
        if tx == 9:
            cv, t = bounds.stile(); draw.append((5 * TILE + 34, cv, tx * TILE, 5 * TILE - t)); continue
        m = (E if tx < Wt - 1 and tx != 8 else 0) | (W if tx > 0 and tx != 10 else 0)
        cv = bounds.wall_tile(m, tx % 2); draw.append((5 * TILE + 32, cv, tx * TILE, 5 * TILE - wt))
    for tx in range(Wt):
        if tx in (4,):
            cv, t = bounds.wicket_gate(); draw.append((8 * TILE + 30, cv, tx * TILE, 8 * TILE - t)); continue
        m = (E if tx < Wt - 1 and tx != 3 else 0) | (W if tx > 0 and tx != 5 else 0) | (S if tx == 12 else 0)
        cv = bounds.hedge_tile(m, tx % 2, 'may' if tx % 3 else None); draw.append((8 * TILE + 40, cv, tx * TILE, 8 * TILE - ht))
    cv = bounds.hedge_tile(N | S, 0); draw.append((9 * TILE + 40, cv, 12 * TILE, 9 * TILE - ht))
    cv = bounds.hedge_tile(N, 1); draw.append((10 * TILE + 40, cv, 12 * TILE, 10 * TILE - ht))

    def at(img, anchor, tx, ty, dx=0):
        X = tx * TILE + TILE // 2 + dx; Y = ty * TILE + 44
        draw.append((Y, img, X - anchor[0], Y - anchor[1]))
    for (fn, s, tx, ty, sd) in ((trees.oak, 1.0, 2, 4, 11), (trees.sycamore, 0.8, 6, 4, 21), (trees.birch, 0.8, 12, 4, 41),
                                (trees.ash, 0.8, 14, 4, 31), (trees.scots_pine, 0.8, 8, 3, 71), (trees.rowan, 0.8, 10, 10, 61),
                                (trees.hawthorn, 0.8, 15, 9, 51), (trees.oak, 0.62, 1, 10, 12)):
        r = fn(s, seed=sd); at(r['full'], r['anchor'], tx, ty)
    for (cv, a), tx, ty, dx in ((street.lamp_post(True), 3, 7, -18), (street.lamp_post(False), 11, 7, -18),
                                (street.bench(), 7, 5, 24), (street.pillar_box(), 13, 7, -10), (street.litter_bin(), 8, 7, -6)):
        at(cv, a, tx, ty, dx)
    fp = street.fingerpost(('N', 'E', 'W'))
    at(fp[0], fp[1], 5, 7, 0)
    for (cv, tx, ty) in ((flora.foxgloves(), 1, 8), (flora.bracken(30), 0, 5), (flora.nettles(), 13, 8), (flora.grass_tuft(92, True), 6, 8)):
        at(cv, [cv.w // 2, cv.h - 3], tx, ty, -4)
    at(flora.buddleia()['full'], [48, 73], 14, 6, 10)
    at(moira_silhouette(), [24, 93], 6, 7, 0)
    draw.sort(key=lambda d: d[0])
    for (_, img, x, y) in draw: g.im.alpha_composite(img.im, (int(x), int(y)))
    g.px = g.im.load()
    return g


def previews():
    m = moira_silhouette()
    groups = [('trees', 3, 8), ('woods', 2, 4), ('flora', 3, 12), ('hedge', 3, 16), ('wall', 3, 16), ('fence', 3, 16),
              ('street', 3, 12), ('signs', 3, 8)]
    for gname, sc, cols in groups:
        items = PREV.get(gname, [])
        if gname == 'trees': items = [x for x in items if x[0].endswith('_l') or x[0].endswith('_m')]
        if gname in ('hedge', 'wall'): items = [x for x in items if x[0].endswith('_0') or x[0].startswith('wall_sand')][:32]
        preview(items + [('moira', m)], os.path.join(OUTD, 'preview_%s.png' % gname), scale=sc, cols=cols)
    preview([('scene', scene())], os.path.join(OUTD, 'preview_scene.png'), scale=2)


if __name__ == '__main__':
    t0 = time.time()
    os.makedirs(OUTD, exist_ok=True)
    for f in os.listdir(OUTD):
        if f.endswith('.png') or f == 'manifest.json': os.remove(os.path.join(OUTD, f))
    for step in (build_trees, build_woods, build_flora, build_bounds, build_street):
        step(); print('%-14s %5.1fs' % (step.__name__, time.time() - t0))
    manifest(os.path.join(OUTD, 'manifest.json'), MAN)
    if '--no-preview' not in sys.argv:
        previews(); print('previews       %5.1fs' % (time.time() - t0))
    tot = sum(os.path.getsize(os.path.join(OUTD, f)) for f in os.listdir(OUTD) if f.endswith('.png') and not f.startswith('preview_'))
    print('%d assets, %.2f MB (excluding previews)' % (len(MAN), tot / 1e6))
