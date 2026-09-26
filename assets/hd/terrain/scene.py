"""Test compositions built only from the published sheets + manifest (exactly what the renderer gets):
preview_track.png and preview_scene.png."""
import os, json
import numpy as np
from PIL import Image
import tk

T = tk.T


class Atlas:
    def __init__(self, out):
        self.out = out
        self.man = json.load(open(os.path.join(out, 'manifest.json')))
        self.cache = {}

    def sheet(self, f):
        if f not in self.cache: self.cache[f] = np.array(Image.open(os.path.join(self.out, f)).convert('RGBA'))
        return self.cache[f]

    def get(self, name, v=0, frame=0):
        e = self.man[name]; s = self.sheet(e['file'])
        c = e['cells'][v % e['variants']]
        if e.get('animFrames', 1) > 1: c = c[frame % e['animFrames']]
        x, y = c
        return s[y:y + e['h'], x:x + e['w']]

    def nvar(self, name): return self.man[name]['variants']

    def pick(self, name, x, y, seed=0):
        e = self.man[name]; w = e.get('weights') or [1] * e['variants']
        r = tk.hash01 if hasattr(tk, 'hash01') else None
        h = ((x * 374761393 + y * 668265263 + seed * 97) & 0xFFFFFFFF)
        h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
        u = ((h ^ (h >> 16)) & 0xFFFFFF) / 0xFFFFFF * sum(w)
        for i, wi in enumerate(w):
            u -= wi
            if u <= 0: return i
        return len(w) - 1


class Canvas:
    def __init__(self, tw, th):
        self.a = np.zeros((th * T, tw * T, 4), np.uint8); self.a[..., 3] = 255

    def draw(self, spr, x, y):
        x, y = int(x), int(y); h, w = spr.shape[:2]
        H, W = self.a.shape[:2]
        x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
        if x1 <= x0 or y1 <= y0: return
        src = spr[y0 - y:y1 - y, x0 - x:x1 - x]
        self.a[y0:y1, x0:x1] = tk.over(self.a[y0:y1, x0:x1], src)

    def tile(self, A, name, tx, ty, seed=0, v=None, frame=0):
        self.draw(A.get(name, A.pick(name, tx, ty, seed) if v is None else v, frame), tx * T, ty * T)

    def save(self, path, scale=4):
        im = Image.fromarray(self.a, 'RGBA')
        im.resize((im.width * scale, im.height * scale), Image.NEAREST).save(path)


def track_h(C, A, x0, x1, band_y, kind='old', seed=1, rotten_from=None):
    """Draw a horizontal track: sleepers every 24 px then the two rails. x in px, band_y = top px of the 2-tile band."""
    import rail
    sl = {'old': ['sleeper_weathered_H', 'sleeper_rotten_H'], 'live': ['sleeper_concrete_H']}[kind]
    rng = np.random.default_rng(seed)
    for sx in range(x0 + 12, x1 - 6, rail.SL_PITCH):
        if kind == 'old':
            nm = sl[1] if (rng.random() < 0.3 or (rotten_from and rotten_from[0] <= sx < rotten_from[1])) else sl[0]
        else: nm = sl[0]
        s = A.get(nm, int(rng.integers(0, A.nvar(nm))))
        an = A.man[nm]['anchor']
        C.draw(s, sx - an[0], band_y + 48 - an[1] + (int(rng.integers(0, 2)) if kind == 'old' else 0))
    rn = 'rail_rust_H' if kind == 'old' else 'rail_live_H'
    r = A.get(rn)
    for rt in rail.RAIL_TOP:
        for x in range(x0, x1, T): C.draw(r[:, :min(T, x1 - x)], x, band_y + rt)
    j = A.get('rail_joint_%s_H' % ('rust' if kind == 'old' else 'live'))
    for rt in rail.RAIL_TOP:
        for x in range(x0 + 150, x1 - 16, 288): C.draw(j, x, band_y + rt)


def track_v(C, A, bx, y0, y1, seed=2):
    import rail
    rng = np.random.default_rng(seed)
    for sy in range(y0 + 12, y1 - 6, rail.SL_PITCH):
        s = A.get('sleeper_concrete_V', int(rng.integers(0, 4))); an = A.man['sleeper_concrete_V']['anchor']
        C.draw(s, bx + 48 - an[0], sy - an[1])
    r = A.get('rail_live_V')
    for rt in rail.RAIL_TOP:
        for y in range(y0, y1, T): C.draw(r[:min(T, y1 - y)], bx + rt, y)


def track_preview(out):
    A = Atlas(out)
    C = Canvas(12, 9)
    for ty in range(9):
        for tx in range(12):
            if tx >= 9: nm = 'ballast_live' if tx in (9, 10) else 'cess_new'
            elif ty in (1, 2): nm = 'ballast_old' if (tx + ty) % 3 else 'ballast_old_weedy'
            elif ty in (0, 3): nm = 'cess_old'
            elif ty in (5, 6): nm = 'ballast_live'
            else: nm = 'cess_new'
            C.tile(A, nm, tx, ty, 5)
    track_h(C, A, 0, 9 * T, 1 * T, 'old', rotten_from=(4 * T, 6 * T))
    track_h(C, A, 0, 9 * T, 5 * T, 'live')
    track_v(C, A, 9 * T, 0, 9 * T)
    for tx in (6, 7): C.tile(A, 'xing_timber_H', tx, 1, v=tx - 6)
    for tx in (3, 4): C.tile(A, 'xing_rubber_H', tx, 5, v=tx - 3)
    for tx in range(9):
        C.tile(A, 'platform_edge_N', tx, 7, 2); C.tile(A, 'platform_edge_S', tx, 8, 2)
    C.save(os.path.join(out, 'preview_track.png'), 4)
    Image.fromarray(C.a).save(os.path.join(out, 'preview_track_1x.png'))


def autotile(C, A, grid, tx, ty, setname, is_other, seed=0):
    """Draw edge overlays of `setname` on tile (tx,ty) for neighbours where is_other(ch) is true."""
    def o(dx, dy):
        y, x = ty + dy, tx + dx
        return 0 <= y < len(grid) and 0 <= x < len(grid[0]) and is_other(grid[y][x])
    sides = {'N': o(0, -1), 'S': o(0, 1), 'W': o(-1, 0), 'E': o(1, 0)}
    used = set()
    for c in ('NW', 'NE', 'SW', 'SE'):
        a, b = c[0], c[1]
        if sides[a] and sides[b]:
            C.tile(A, '%s_L_%s' % (setname, c), tx, ty, seed); used |= {a, b}
    for s in 'NSEW':
        if sides[s] and s not in used: C.tile(A, '%s_%s' % (setname, s), tx, ty, seed)
    for c, (dx, dy) in (('NW', (-1, -1)), ('NE', (1, -1)), ('SW', (-1, 1)), ('SE', (1, 1))):
        if not sides[c[0]] and not sides[c[1]] and o(dx, dy):
            C.tile(A, '%s_diag_%s' % (setname, c), tx, ty, seed)


SCENE = [
    '..................',
    '::::::::::::::::::',
    '==================',
    '==================',
    ':::::::::::::,,,,,',
    'ppppppppppp.,wwww"',
    ',,,,,,,,,,,,,wwww"',
    '------------.wwww"',
    'rrrrrrrrrrrr.wwww"',
    'rrrrrrrrrrrr.wwww"',
    'rrrrrrrrrrrr.wwww"',
    '------------.wwww"',
]
BASE = {'.': 'grass', ',': 'lawn', '"': 'meadow', ':': 'cess_old', '=': 'ballast_old', 'p': 'dirt', '-': 'flags',
        'r': 'tarmac', 'w': 'water'}


def scene_preview(out):
    A = Atlas(out)
    G = SCENE; H, W = len(G), len(G[0])
    C = Canvas(W, H)
    for ty in range(H):
        for tx in range(W):
            ch = G[ty][tx]; nm = BASE[ch]
            if ch == '=' and A.pick('ballast_old', tx, ty, 7) % 4 == 0: nm = 'ballast_old_weedy'
            if ch == 'r' and (tx, ty) == (3, 8): nm = 'tarmac_drain_N'
            if ch == 'r' and (tx, ty) == (8, 9): nm = 'tarmac_manhole'
            C.tile(A, nm, tx, ty, 3)
    # water banks
    for ty in range(H):
        for tx in range(W):
            if G[ty][tx] == 'w': autotile(C, A, G, tx, ty, 'bank', lambda c: c != 'w')
    # path, pavement, cess: grass creeps over them
    soft = lambda c: c in '.,"'
    for ty in range(H):
        for tx in range(W):
            ch = G[ty][tx]
            if ch == 'p': autotile(C, A, G, tx, ty, 'path_edge', soft)
            if ch == '-': autotile(C, A, G, tx, ty, 'kerb', lambda c: c == 'r')
    for ty in range(H):
        for tx in range(W):
            ch = G[ty][tx]
            if ch in 'p:-':
                autotile(C, A, G, tx, ty, 'grass_edge', lambda c: c == '.')
                autotile(C, A, G, tx, ty, 'lawn_edge', lambda c: c in ',"')
    # railway (closed line): rotten sleepers in the middle, a blocked-drain puddle on the cess
    track_h(C, A, 0, W * T, 2 * T, 'old', seed=4, rotten_from=(6 * T, 9 * T))
    C.draw(A.get('puddle_m', 1), 9 * T + 4, 4 * T + 14)
    C.draw(A.get('puddle_s', 0), 3 * T + 20, 5 * T + 18)
    # road markings
    for tx in range(12):
        C.tile(A, 'mark_centre_V' if False else 'mark_centre_H', tx, 9, v=0)
        if 1 <= tx <= 5: C.tile(A, 'mark_dyellow_N', tx, 8, v=0)
    C.save(os.path.join(out, 'preview_scene.png'), 4)
    Image.fromarray(C.a).save(os.path.join(out, 'preview_scene_1x.png'))
