"""LINESIDE HD railway structures. Run from the repo root:

    python3 assets/hd/rail/build.py            # writes assets/hd/out/rail/*.png + manifest.json + preview_*.png
    python3 assets/hd/rail/build.py station    # only rebuild the named group(s) (faster when iterating)

Deterministic: every random choice is a seeded hash.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rp import *  # noqa
import station as ST
import depot as DP
import compound as CP
import lineside as LN

OUT = os.path.join(ROOT, 'assets', 'hd', 'out', 'rail')
MAN = {}


def emit(name, cv, map_origin, tiles, info=None, door=None, fade=None, anchor=None, **extra):
    """Save one asset + its manifest entry. anchor defaults to the footprint's south-west corner at ground level,
    which for every sprite here is the bottom-left pixel row (x=0, y=h)."""
    save(cv, os.path.join(OUT, name + '.png'))
    e = {'file': name + '.png', 'w': cv.w, 'h': cv.h, 'anchor': anchor or [0, cv.h]}
    if tiles: e['tiles'] = list(tiles)
    if map_origin: e['map_origin'] = list(map_origin)
    if door: e['door'] = list(door)
    if fade: e['fade'] = fade
    if info:
        for k, v in info.items():
            if v is not None: e[k] = v
    e.update(extra)
    MAN[name] = e
    return cv


def prev(name, items, scale=2, cols=None):
    preview(items, os.path.join(OUT, 'preview_' + name + '.png'), scale=scale, cols=cols)


def build_station():
    for live in (False, True):
        tag = 'live' if live else 'closed'
        cv, info = ST.station(live)
        emit('station_' + tag, cv, (12, 25), (14, 6), info, door=(18, 30), door_tiles=[[18, 30], [19, 30]])
        cn, cinfo = ST.canopy(live)
        # canopy spans map cols 13-24; its bottom edge sits on map y = 25*48 = 1200 (top of row 25)
        emit('station_canopy_' + tag, cn, (13, 23), (12, 2), cinfo,
             anchor=[0, cn.h], fade={'x': 0, 'y': 0, 'w': cn.w, 'h': cn.h}, sortY_map=25 * TILE - 1,
             note='object: sprite bottom-left at map px (13*48, 25*48); not blocking; draws over actors on the platform; fade rect in sprite px')
        rb, rinfo = ST.running_in(live)
        emit('running_in_board_' + tag, rb, (28, 24), (3, 1), rinfo,
             note='free-standing on the platform back edge, row 24, cols 28-30; not blocking')
    prev('station', [('closed', with_scale(fig_at(load('station_closed'), 230, 324))),
                     ('live', with_scale(load('station_live')))], scale=2, cols=1)
    prev('station_detail', [('c', crop('station_closed', 200, 80, 440, 244)), ('l', crop('station_live', 200, 80, 440, 244))], scale=3, cols=2)
    prev('canopy', [('c', with_scale(load('station_canopy_closed'))), ('l', with_scale(load('station_canopy_live'))),
                    ('rb', with_scale(load('running_in_board_closed')))], scale=2, cols=1)
    prev('canopy_detail', [('c', crop('station_canopy_closed', 0, 0, 260, 135))], scale=4, cols=1)


def load(name):
    from PIL import Image
    im = Image.open(os.path.join(OUT, name + '.png')).convert('RGBA'); c = Canvas(im.width, im.height); c.im = im; c.px = im.load(); return c


def crop(name, x, y, w, h):
    return load(name).im.crop((x, y, x + w, y + h))


def build_depot():
    cv, info = DP.depot(False)
    emit('depot', cv, (42, 25), (19, 6), info, door=(51, 30),
         note='east gable face = last 96 px (map cols 59-60); siding rows 27-28 run into the open doorway (siding_door, sprite px)')
    prev('depot', [('d', with_scale(fig_at(cv, 380, cv.h)))], scale=2, cols=1)
    prev('depot_detail', [('a', cv.im.crop((380, 80, 912, 348)))], scale=3, cols=1)


def build_compound():
    cv, i = CP.project_office(); emit('project_office', cv, (56, 40), (14, 4), i, door=(62, 43))
    wv, i = CP.welfare(); emit('welfare_cabin', wv, (40, 40), (7, 3), i, door=(43, 42), door_enterable=False)
    sv, i = CP.stores(); emit('stores_container', sv, (71, 40), (3, 3), i)
    hh = CP.heras_h(); emit('heras_h', hh, None, (1, 1), note="one per 'k' tile in an east-west run; bottom-left on the tile's SW corner")
    hv = CP.heras_v(); emit('heras_v', hv, None, (1, 1), note="one per 'k' tile in a north-south run (edge-on); sprite bottom-left on the tile's SW corner")
    gates = {}
    for n, origin in ((1, (34, 23)), (3, (77, 23))):
        for op in (False, True):
            g = CP.ppe_gate(n, op); nm = f'ppe_gate_{n}_{"open" if op else "closed"}'
            gates[nm] = g
            emit(nm, g, origin, (n, 1), note='PPE gates: (34,23) is 1 wide; (77-79,23) and (50-52,34) are 3 wide')
    pp, i = CP.ppe_plate(); emit('ppe_plate', pp, None, (1, 1), i, note='blank blue/white plate on a post, beside each PPE gate')
    sb, i = CP.site_board(); emit('site_board', sb, (53, 39), (1, 1), i, anchor=[sb.w - 48, sb.h], note='anchor = SW corner of tile (53,39); board spans left over the fence line')
    prev('compound', [('o', with_scale(fig_at(cv, 240, cv.h))), ('w', with_scale(wv)), ('s', with_scale(sv))], scale=2, cols=1)
    prev('fences', [(k, v) for k, v in gates.items()] + [('hh', hh), ('hv', hv), ('pp', pp), ('sb', with_scale(sb))], scale=3, cols=5)


def build_lineside():
    items = []
    # Beck Bridge (x85-91): parapets on rows 18 (north) and 23 (south), arch face below row 23 over the beck
    for live in (False, True):
        tg = 'live' if live else 'closed'
        pn = LN.parapet(7, 'north', h=45, seed=3); emit('beck_bridge_parapet_n_' + tg, pn, (85, 18), (7, 1))
        ps = LN.parapet(7, 'south', h=54, seed=4, loose=not live, sapling=not live)
        emit('beck_bridge_parapet_s_' + tg, ps, (85, 23), (7, 1))
        fc = LN.arch_face(7, 3, 100, seed=5, scour=not live, soot=0.3 if not live else 0.1)
        emit('beck_bridge_face_' + tg, fc, (85, 24), (7, 2), anchor=[0, 0], layer='ground',
             note='ground decal: top-left at map px (85*48, 24*48), drawn over the water under the south parapet')
        items += [(tg + ' n', pn), (tg + ' s', ps), (tg + ' face', fc)]
    # road bridge over the beck (x85-91): parapets rows 55 and 61, face below row 61
    rn = LN.parapet(7, 'north', h=40, seed=13); emit('road_bridge_parapet_n', rn, (85, 55), (7, 1))
    rs = LN.parapet(7, 'south', h=48, seed=14); emit('road_bridge_parapet_s', rs, (85, 61), (7, 1))
    rf = LN.arch_face(7, 2, 80, seed=15, soot=0.15); emit('road_bridge_face', rf, (85, 62), (7, 2), anchor=[0, 0], layer='ground',
                                                           note='ground decal: top-left at map px (85*48, 62*48)')
    # packhorse bridge (row 73): low humped parapets rows 72 and 74, one segmental arch
    kn = LN.parapet(7, 'north', h=30, seed=23, hump=8); emit('packhorse_parapet_n', kn, (85, 72), (7, 1))
    ks = LN.parapet(7, 'south', h=34, seed=24, hump=8); emit('packhorse_parapet_s', ks, (85, 74), (7, 1))
    kf = LN.arch_face(7, 1, 56, seed=25, segmental=True, soot=0.2); emit('packhorse_face', kf, (85, 75), (7, 1), anchor=[0, 0], layer='ground',
                                                                      note='ground decal: top-left at map px (85*48, 75*48)')
    items += [('road n', rn), ('road s', rs), ('road face', rf), ('pack n', kn), ('pack s', ks), ('pack face', kf)]
    ub = LN.underbridge_deck(4, 4)
    emit('mainline_underbridge', ub, (119, 57), (4, 4), anchor=[12, 4 * TILE], fade={'x': 0, 'y': 0, 'w': ub.w, 'h': ub.h},
         note='object over the road (%), x119-122 rows 57-60: sprite x starts 12px west of col 119; fascia hangs 20px below row 60; fades')
    prev('bridges', [(l, with_scale(c)) for l, c in items[:6]] + [(l, c) for l, c in items[6:]] + [('ub', ub)], scale=2, cols=3)
    # Crag Lane level crossing (x104-106, rails rows 19-22)
    g = LN.crossing_gate_closed_line(4, live=False)
    emit('crossing_gate_closedline_w', g, (103, 18), (1, 6), note="closed-line state: white gates shut across the rails, padlocked; covers 'z' col 103, posts on rows 18 and 23")
    emit('crossing_gate_closedline_e', g.flip(), (107, 18), (1, 6), note="as _w, for 'z' col 107")
    sg0 = LN.crossing_sign(False); emit('crossing_sign_dead', sg0, (108, 17), (1, 1), anchor=[-4, sg0.h], placements=[[108, 17], [107, 24]], note='St Andrew cross + dead lights (closed line)')
    sg1 = LN.crossing_sign(True); emit('crossing_sign_live', sg1, (108, 17), (1, 1), anchor=[-4, sg1.h], placements=[[108, 17], [109, 24]])
    frames = [('gate', g), ('dead', sg0), ('live', sg1)]
    # live line: full-width barriers on the east verge at both approaches (the west verges are trees):
    # posts at (107,17) and (107,24); lowered booms cover the lane x104-106 on rows 17 / 24
    for stt in ('raised', 'lowered'):
        b = LN.barrier(stt, 'e', span=3)
        ax = b.w - TILE
        nm = f'crossing_barrier_{stt}'
        px, by = 20, b.h - 96
        lamps = [(b.w - 1 - x, y) for x, y in [(px - 8, by + 9), (px + 8, by + 9), (px, by + 20)]]
        emit(nm, b, (107, 17), (1, 1), anchor=[ax, b.h], placements=[[107, 17], [107, 24]],
             lamps={'red_l': list(lamps[1]), 'red_r': list(lamps[0]), 'amber': list(lamps[2])},
             note='live line: barrier post in tile (107,17) and again at (107,24); lowered boom spans x104-106; lamps in sprite px')
        frames.append((nm, b))
        if stt == 'lowered':
            for which, (lx, ly) in (('l', lamps[1]), ('r', lamps[0]), ('a', lamps[2])):
                lf = LN.light_frames(b, [(lx, ly, 'flower_red' if which != 'a' else 'lamp_glow')], 4)
                emit(nm + '_lit_' + which, lf, (107, 17), (1, 1), anchor=[ax, b.h], placements=[[107, 17], [107, 24]],
                     note='flash frames: steady _lit_a first, then alternate _lit_l/_lit_r at ~1.5 Hz')
                frames.append((which, lf))
    prev('crossing', [(l, with_scale(c) if i == 0 else c) for i, (l, c) in enumerate(frames)], scale=2, cols=6)
    sb, i = LN.signal_box(); emit('signal_box', sb, (110, 25), (5, 5), i, door=(112, 29), door_enterable=False)
    small = []
    for live in (False, True):
        tg = 'live' if live else 'closed'
        bs = LN.buffer_stop(live); emit('buffer_stop_' + tg, bs, (8, 20), (1, 2)); small.append((tg, bs))
    cb = LN.location_cabinet(False); emit('lineside_cabinet', cb, (109, 24), (1, 1), anchor=[-4, cb.h], note='free-standing; centred in its tile'); small.append(('cab', cb))
    mp, face = LN.milepost(False); emit('milepost', mp, (60, 19), (1, 1), anchor=[-9, mp.h], sign={'plate': face}, note='suggested spots: cess on row 19 every ~20 tiles'); small.append(('mp', mp))
    wb, face = LN.post_board(30, 30, 40); emit('whistle_board', wb, (100, 19), (1, 1), anchor=[-9, wb.h], sign={'face': face}); small.append(('wb', wb))
    lb, face = LN.post_board(96, 40, 40, legs=2); emit('limit_board', lb, (116, 22), (2, 1), anchor=[24, lb.h], sign={'face': face},
                                                        note='blank "LIMIT OF CLOSED LINE" / "BRANCH CLOSED" board; centred on col 116'); small.append(('lb', lb))
    sm = LN.semaphore(False); emit('semaphore_disused', sm, (36, 18), (1, 1), anchor=[0, sm.h]); small.append(('sem', sm))
    prev('signalbox', [('sb', with_scale(sb))], scale=3, cols=1)
    prev('lineside_small', [(l, c) for l, c in small], scale=3, cols=7)


GROUPS = {'station': build_station, 'depot': build_depot, 'compound': build_compound, 'lineside': build_lineside}


def main():
    want = sys.argv[1:] or list(GROUPS)
    mf = os.path.join(OUT, 'manifest.json')
    if os.path.exists(mf) and sys.argv[1:]: MAN.update(json.load(open(mf)))
    for g in want: GROUPS[g]()
    manifest(mf, MAN)
    tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.png') and not f.startswith('preview'))
    print(f'rail: {len(MAN)} assets, {tot / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
