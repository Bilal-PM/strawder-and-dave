#!/usr/bin/env python3
"""LINESIDE HD town buildings generator (48 art px per map tile).

    python3 assets/hd/town/build.py                  # every building + previews
    python3 assets/hd/town/build.py hall cottage_a   # just these (manifest entries for the rest are kept)

Output in assets/hd/out/town/: <name>.png (day sprite), <name>_lit.png (dusk overlay, same size: warm window
panes, fanlights and open doorways only), manifest.json, preview_*.png (never loaded by the game).
Deterministic: every random draw is seeded.

Geometry: each sprite is exactly its footprint wide; its bottom edge is the footprint's south edge; it may rise
north of the footprint (roof ridge, chimneys, towers) but never extends sideways or south.
anchor = [0, h] = the footprint's south-west ground corner in sprite pixels.
"""
import os, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from townlib import T, save, preview, manifest, figure_silhouette  # noqa: E402
from buildings import BUILDINGS  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUTD = os.path.join(ROOT, 'assets', 'hd', 'out', 'town')

RECORDED = {  # computed from js/world/level.js on claude/lineside-chapter-1; used only if node is unavailable
    'M': [{'origin': [52, 8], 'tiles': [7, 5], 'door': [55, 12]}],
    'E': [{'origin': [3, 48], 'tiles': [12, 5], 'door': [8, 52]}],
    'H': [{'origin': [24, 49], 'tiles': [12, 6], 'door': [29, 54]}],
    'A': [{'origin': [38, 49], 'tiles': [9, 6], 'door': [42, 54]}],
    'P': [{'origin': [53, 49], 'tiles': [8, 6], 'door': [56, 54]}],
    'V': [{'origin': [63, 49], 'tiles': [6, 6], 'door': [65, 54]}, {'origin': [71, 49], 'tiles': [6, 6], 'door': [73, 54]}],
    'Y': [{'origin': [54, 63], 'tiles': [13, 7], 'door': [58, 69]}],
    'F': [{'origin': [8, 66], 'tiles': [8, 6], 'door': [11, 71]}],
    'R': [{'origin': [23, 66], 'tiles': [6, 6], 'door': [25, 71]}],
}


def footprints():
    """Flood-fill every town building letter in LS.LEVEL.rows (doors '*123' belong to the building they sit in)."""
    try:
        js = ("global.window=global;global.LS={};require(%r);process.stdout.write(JSON.stringify(LS.LEVEL.rows))"
              % os.path.join(ROOT, 'js', 'world', 'level.js'))
        rows = json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))
    except Exception as e:
        print('  (node unavailable, using recorded footprints)', e)
        return dict(RECORDED)
    seen = set(); out = {}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch not in 'HAPVMEYFR' or (x, y) in seen: continue
            st = [(x, y)]; cells = []
            while st:
                a, b = st.pop()
                if (a, b) in seen or not (0 <= b < len(rows)) or not (0 <= a < len(rows[b])): continue
                c = rows[b][a]
                if c != ch and c not in '*123': continue
                seen.add((a, b)); cells.append((a, b))
                st += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)]
            xs = [c[0] for c in cells]; ys = [c[1] for c in cells]
            x0, y0 = min(xs), min(ys)
            doors = sorted((a, b) for a, b in cells if rows[b][a] in '*123')
            for (a, b) in doors:
                assert b == max(ys), 'door not on the bottom row of %s' % ch
            out.setdefault(ch, []).append({'origin': [x0, y0], 'tiles': [max(xs) - x0 + 1, max(ys) - y0 + 1],
                                           'door': list(doors[0]) if doors else None})
    return out


def dusk(im, lit):
    """Preview-only dusk grade: cool the day sprite and lay the lit overlay on top."""
    a = im.copy(); px = a.load()
    for y in range(a.height):
        for x in range(a.width):
            r, g, b_, al = px[x, y]
            if al: px[x, y] = (int(r * .45 + 10), int(g * .42 + 10), int(b_ * .55 + 26), al)
    a.alpha_composite(lit)
    return a


def with_figure(im, x, ground):
    a = im.copy()
    a.alpha_composite(figure_silhouette().im, (int(x) - 24, int(ground - 95)))
    return a


def main(only):
    fps = footprints()
    os.makedirs(OUTD, exist_ok=True)
    mpath = os.path.join(OUTD, 'manifest.json')
    man = json.load(open(mpath)) if (os.path.exists(mpath) and only) else {}
    built = []
    for name, letter, idx, fn in BUILDINGS:
        if only and name not in only: continue
        fp = fps[letter][idx]
        b = fn(fp); p = b.p
        p.silhouette(2)
        p.finish_lit()
        save(p.cv, os.path.join(OUTD, name + '.png'))
        save(p.lit, os.path.join(OUTD, name + '_lit.png'))
        man[name] = {'file': name + '.png', 'lit': name + '_lit.png', 'w': b.W, 'h': b.Hh, 'anchor': [0, b.Hh],
                     'tiles': fp['tiles'], 'map_origin': fp['origin'], 'door': fp['door'], 'letter': letter,
                     'door_px': [b.dcx, b.Hh], 'lights': p.lights, 'signs': p.signs, 'tile_px': T}
        built.append((name, b))
        print('  %-14s %3dx%-3d  tiles %-8s origin %-9s door %s' % (name, b.W, b.Hh, fp['tiles'], fp['origin'], fp['door']))
    manifest(mpath, man)
    for name, b in built:
        day, lit = b.p.cv.im, b.p.lit.im
        fx = b.dcx + 64 if b.dcx + 90 < b.W else b.dcx - 64
        sc = 2 if b.W > 300 else 3
        preview([('day', with_figure(day, fx, b.Hh)), ('dusk', dusk(day, lit))],
                os.path.join(OUTD, 'preview_%s.png' % name), scale=sc, cols=2)
    return built


if __name__ == '__main__':
    main(sys.argv[1:])
