#!/usr/bin/env python3
"""LINESIDE HD terrain generator. Run from the repo root:  python3 assets/hd/terrain/build.py [--no-preview] [--only a,b]

Writes tile sheets, overlay sheets and manifest.json to assets/hd/out/terrain/ (see assets/hd/terrain/README.md).
Deterministic: every random stream is seeded.
"""
import os, sys, json, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from PIL import Image
import tk
import sets

OUT = os.path.normpath(os.path.join(HERE, '..', 'out', 'terrain'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-preview', action='store_true')
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    only = [s for s in a.only.split(',') if s]
    os.makedirs(OUT, exist_ok=True)
    man = {}
    sets.build_all(OUT, man, preview=not a.no_preview, only=only)
    if not only:
        import pix
        pix.manifest(os.path.join(OUT, 'manifest.json'), man)
        tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs
                  if f.endswith('.png') and not f.startswith('preview'))
        if not a.no_preview:
            import scene
            scene.track_preview(OUT)
            if hasattr(scene, 'scene_preview'): scene.scene_preview(OUT)
        print('assets: %d entries, %.0f KB of sheets (previews excluded)' % (len(man), tot / 1024))


if __name__ == '__main__':
    main()
