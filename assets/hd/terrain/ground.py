"""Ground registrations (grass family and soft ground)."""
from sets import tileset, emit_tiles
import grass


@tileset('lawn', group='grass')
def _lawn(out, man, pv):
    v, w = grass.lawn_variants(); emit_tiles(out, man, 'lawn', v, w, pv)


@tileset('grass', group='grass')
def _grass(out, man, pv):
    v, w = grass.grass_variants(); emit_tiles(out, man, 'grass', v, w, pv)


@tileset('meadow', group='grass')
def _meadow(out, man, pv):
    v, w = grass.meadow_variants(); emit_tiles(out, man, 'meadow', v, w, pv)


import stone


@tileset('setts', group='stone')
def _setts(out, man, pv):
    v, w = stone.setts_variants(); emit_tiles(out, man, 'setts', v, w, pv)


@tileset('flags', group='stone')
def _flags(out, man, pv):
    v, w = stone.flags_variants(); emit_tiles(out, man, 'flags', v, w, pv)


@tileset('platform', group='stone')
def _platform(out, man, pv):
    v, w = stone.platform_variants(True); emit_tiles(out, man, 'platform', v, w, pv)


import soft

for _n, _fn in [('tarmac', soft.tarmac_variants), ('concrete', soft.concrete_variants), ('gravel', soft.gravel_variants),
                ('hoggin', soft.hoggin_variants), ('dirt', soft.dirt_variants), ('mud', soft.mud_variants),
                ('soil', soft.soil_variants), ('woodland', soft.woodland_variants)]:
    def _mk(n=_n, fn=_fn):
        def f(out, man, pv):
            v, w = fn(); emit_tiles(out, man, n, v, w, pv)
        return f
    tileset(_n, group='soft')(_mk())


@tileset('tarmac_specials', group='soft')
def _tsp(out, man, pv):
    sp = soft.tarmac_specials()
    names = list(sp)
    import numpy as np
    sheet = np.concatenate([sp[k] for k in names], axis=1)
    from sets import entry
    import tk, os
    tk.save_png(sheet, os.path.join(out, 'tiles/tarmac_specials.png'))
    for i, k in enumerate(names):
        man[k] = entry('tiles/tarmac_specials.png', [[[i * tk.T, 0, tk.T, tk.T]]], tk.T, tk.T, note='single tile; tiles with any tarmac variant')
    if pv:
        tk.save_png(tk.tile_preview([sp[k] for k in names], cols=6, rows=1), os.path.join(out, 'preview_tarmac_specials.png'))


import rail
import numpy as _np


def emit_sprites(out, man, name, sprites, file, anchor='centre', **extra):
    """Pack same-size sprites in a row; one manifest entry with `variants` cells."""
    import tk, os
    from sets import entry
    h, w = sprites[0].shape[:2]
    sheet = _np.concatenate(sprites, axis=1)
    f = 'sprites/%s.png' % file
    tk.save_png(sheet, os.path.join(out, f))
    e = entry(f, [[[i * w, 0, w, h]] for i in range(len(sprites))], w, h, kind='sprite', **extra)
    e['anchor'] = [w // 2, h // 2] if anchor == 'centre' else anchor
    man[name] = e
    return e


@tileset('ballast', group='rail')
def _ballast(out, man, pv):
    for k, (v, w) in rail.ballast_sets().items(): emit_tiles(out, man, k, v, w, pv)


@tileset('rail_parts', group='rail')
def _rail(out, man, pv):
    import tk, os
    ss = rail.sleeper_sets()
    for k, v in ss.items():
        emit_sprites(out, man, k, v, k, anchor=[v[0].shape[1] // 2 - 1, v[0].shape[0] // 2 - 2] if k.endswith('_H') else [v[0].shape[1] // 2 - 1, v[0].shape[0] // 2 - 2],
                     note='place every %d px along the track, centred on the band centre line' % rail.SL_PITCH)
    for kind in ('rust', 'live'):
        for o in ('H', 'V'):
            a = rail.rail_strip(kind, o)
            emit_sprites(out, man, 'rail_%s_%s' % (kind, o), [a], 'rail_%s_%s' % (kind, o), anchor=[0, 0],
                         tiling='x' if o == 'H' else 'y', note='top-left at the rail offset (24 or 60 across the 96 px band)')
        emit_sprites(out, man, 'rail_xsec_%s' % kind, [rail.rail_xsec(kind)], 'rail_xsec_%s' % kind, anchor=[0, 0],
                     note='cross-section, row 0 = lit side, last = cast shadow; stamp along the curve normal')
        emit_sprites(out, man, 'rail_joint_%s_H' % kind, [rail.rail_joint(kind)], 'rail_joint_%s_H' % kind, anchor=[8, 0])
    for kind in ('timber', 'rubber'):
        emit_tiles(out, man, 'xing_%s_H' % kind, [rail.xing_deck(kind, v, 'rust' if kind == 'timber' else 'live') for v in range(3)],
                   None, False, note='48x96 slice across the whole 2-tile track band; tiles along x')
        emit_tiles(out, man, 'xing_panel_%s' % kind, [rail.xing_panel(kind, v) for v in range(3)], None, pv)


import water


@tileset('water', group='water')
def _water(out, man, pv):
    import tk, os
    fr = water.water_sets()
    emit_tiles(out, man, 'water', None, None, pv, frames=fr, note='animFrames: frames go down the sheet; ~6-8 fps; flow is north->south')
    if pv:
        ims = [tk.tile_preview([f[k] for f in fr], cols=6, rows=4, seed=9) for k in range(water.FRAMES)]
        tk.compose(ims, 2).save(os.path.join(out, 'preview_water_frames.png'))


@tileset('banks', group='water')
def _banks(out, man, pv):
    for k, v in water.bank_sets().items():
        emit_tiles(out, man, k, v, None, False, kind='overlay', note='draw over the water tile; land side = the letters')
    for k, v in water.puddle_set().items():
        emit_sprites(out, man, k, v, k, anchor='centre')


import overlays as OV


@tileset('edges', group='overlays')
def _edges(out, man, pv):
    import tk, os
    for setname, fn in [('grass_edge', lambda s, m, v: OV.grass_edge(s, m, v, 'grass')),
                        ('lawn_edge', lambda s, m, v: OV.grass_edge(s, m, v, 'lawn')),
                        ('kerb', OV.kerb), ('path_edge', OV.path_edge)]:
        d = OV.all_edges(fn, 4 if setname != 'kerb' else 2, 2 if setname != 'kerb' else 1)
        for k, v in d.items():
            emit_tiles(out, man, '%s_%s' % (setname, k), v, None, False, kind='overlay', file='%s_%s' % (setname, k))
    for k, v in OV.markings().items():
        emit_tiles(out, man, k, v, None, False, kind='overlay', file=k)
    for k, v in OV.concrete_joints().items():
        emit_tiles(out, man, k, v, None, False, kind='overlay', file=k)
    for k, v in OV.platform_edges(True).items():
        emit_tiles(out, man, k, v, None, False, file=k)
