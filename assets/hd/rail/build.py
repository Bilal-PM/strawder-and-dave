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
        # canopy spans map cols 13-24, bottom on the platform's south edge (row 25 top = y 800)
        ox, oy = 13 * TILE, 25 * TILE - cn.h
        emit('station_canopy_' + tag, cn, (13, 23), (12, 2), cinfo,
             anchor=[0, cn.h], fade={'x': 0, 'y': 0, 'w': cn.w, 'h': cn.h}, sortY_map=25 * TILE - 1,
             note='object, bottom edge on map y=800 (top of row 25); not blocking; fade rect in sprite px')
        rb, rinfo = ST.running_in(live)
        emit('running_in_board_' + tag, rb, (28, 24), (3, 1), rinfo,
             note='free-standing on the platform back edge, row 24, cols 28-30; not blocking')
    prev('station', [('closed', with_scale(fig_at(load('station_closed'), 150, 216))),
                     ('live', with_scale(load('station_live')))], scale=2, cols=1)
    prev('station_detail', [('c', crop('station_closed', 150, 60, 300, 160)), ('l', crop('station_live', 150, 60, 300, 160))], scale=4, cols=2)
    prev('canopy', [('c', with_scale(load('station_canopy_closed'))), ('l', with_scale(load('station_canopy_live'))),
                    ('rb', with_scale(load('running_in_board_closed')))], scale=2, cols=1)


def load(name):
    from PIL import Image
    im = Image.open(os.path.join(OUT, name + '.png')).convert('RGBA'); c = Canvas(im.width, im.height); c.im = im; c.px = im.load(); return c


def crop(name, x, y, w, h):
    return load(name).im.crop((x, y, x + w, y + h))


def build_depot():
    cv, info = DP.depot(False)
    emit('depot', cv, (42, 25), (19, 6), info, door=(51, 30),
         note='east gable face = last 64 px (map cols 59-60); siding rows 27-28 run into the open doorway (siding_door, sprite px)')
    prev('depot', [('d', with_scale(fig_at(cv, 250, cv.h)))], scale=2, cols=1)
    prev('depot_detail', [('a', cv.im.crop((230, 60, 608, 232)))], scale=4, cols=1)


GROUPS = {'station': build_station, 'depot': build_depot}


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
