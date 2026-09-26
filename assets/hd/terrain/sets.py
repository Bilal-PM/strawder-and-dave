"""Registry: which generator makes which sheet, how it is packed, and its manifest entries."""
import os
import numpy as np
from PIL import Image
import tk

REG = []  # (name, fn, meta)


def tileset(name, **meta):
    def deco(fn):
        REG.append((name, fn, meta)); return fn
    return deco


def pack(frames_by_variant, cols=None):
    """frames_by_variant: list (variants) of list (frames) of arrays, equal size. Variants go across, frames down."""
    nv = len(frames_by_variant); nf = len(frames_by_variant[0])
    h, w = frames_by_variant[0][0].shape[:2]
    out = np.zeros((nf * h, nv * w, 4), np.uint8)
    cells = []
    for v, fr in enumerate(frames_by_variant):
        cv = []
        for f, a in enumerate(fr):
            out[f * h:(f + 1) * h, v * w:(v + 1) * w] = a; cv.append([v * w, f * h, w, h])
        cells.append(cv)
    return out, cells


def entry(file, cells, w, h, weights=None, anim=1, kind='tile', **extra):
    e = {'file': file, 'x': cells[0][0][0], 'y': cells[0][0][1], 'w': w, 'h': h, 'anchor': [0, 0],
         'variants': len(cells), 'kind': kind,
         'cells': [[c[:2] for c in cv] for cv in cells] if anim > 1 else [cv[0][:2] for cv in cells]}
    if anim > 1: e['animFrames'] = anim
    if weights is not None: e['weights'] = [round(float(x), 3) for x in weights]
    e.update(extra)
    return e


def build_all(out, man, preview=True, only=()):
    import grass, ground, stone, rail, water, overlays  # noqa: F401  (registers)
    for name, fn, meta in REG:
        if only and name not in only and meta.get('group') not in only: continue
        fn(out, man, preview)
        print('built', name)


def emit_tiles(out, man, name, variants, weights=None, preview=True, frames=None, file=None, pv_seed=3, **extra):
    """Save a variant row (optionally with animation frames) as tiles/<file>.png and add manifest entry `name`."""
    fr = frames if frames is not None else [[v] for v in variants]
    sheet, cells = pack(fr)
    f = 'tiles/%s.png' % (file or name)
    tk.save_png(sheet, os.path.join(out, f))
    h, w = fr[0][0].shape[:2]
    man[name] = entry(f, cells, w, h, weights, anim=len(fr[0]), **extra)
    if preview:
        tk.save_png(tk.tile_preview([x[0] for x in fr], seed=pv_seed, weights=weights), os.path.join(out, 'preview_%s.png' % name))
    return man[name]
