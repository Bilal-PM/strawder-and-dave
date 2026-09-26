"""Transparent overlays: grass-over edges (verge and lawn), kerbs, path edges, road markings, concrete joints, and
the platform edge tiles (N coping with the yellow line, S retaining face).

Edge naming (all overlays go on the LOWER / receiving tile):
  <set>_N, _S, _E, _W   the other surface lies on that side (e.g. grass_edge_N: grass is north of this tile)
  <set>_L_NW ...        it lies on both of those sides (the corner of this tile is wrapped: an inner corner)
  <set>_diag_NW ...     it lies only diagonally at that corner (a small outer-corner nub)
"""
import math
import numpy as np
from tk import *  # noqa: F401,F403
import grass as GR
import stone as ST

SIDE = {'N': lambda: YY, 'S': lambda: T - 1 - YY, 'W': lambda: XX, 'E': lambda: T - 1 - XX}
R = 14.0


def sdist(sides, mode):
    """Distance field from the given side(s) (edge / L / diag) and, per pixel, which side is nearest."""
    if mode == 'edge':
        return SIDE[sides](), np.full((T, T), sides)
    a, b = SIDE[sides[0]](), SIDE[sides[1]]()
    near = np.where(a <= b, sides[0], sides[1])
    if mode == 'L':
        inside = (a < R) & (b < R)
        return np.where(inside, R - np.hypot(R - a, R - b), np.minimum(a, b)), near
    return np.hypot(a + 0.5, b + 0.5) - 0.5, near


def all_edges(fn, nvar_edge=4, nvar_corner=2):
    out = {}
    for s in 'NSEW': out[s] = [fn(s, 'edge', v) for v in range(nvar_edge)]
    for c in ('NW', 'NE', 'SW', 'SE'):
        out['L_' + c] = [fn(c, 'L', v) for v in range(nvar_corner)]
        out['diag_' + c] = [fn(c, 'diag', v) for v in range(nvar_corner)]
    return out


# ------------------------------------------------------------------ grass over anything
def grass_edge(sides, mode, v, kind='grass'):
    seed = 23 if kind == 'grass' else 11            # the same seed as the grass / lawn sets: identical at the border
    L = Layered(seed + 400, v)
    s, near = sdist(sides, mode)
    f = L.field((16, 8, 4)) * 1.8 + L.field((4, 2)) * 0.8
    d = 5.0 + f
    gimg, _ = GR.grass_tile(v, kind, seed=seed)
    out = blank()
    m = s < d
    out[m] = gimg[m]
    # the grass edge: a darker rim where the turf rolls over (not an outline: a ramp step)
    rim = m & (s > d - 1.5)
    out[rim] = from_idx(np.full((T, T), 4), 'grass')[rim]
    # tufts leaning out over the other surface along the edge
    tuft = blank()
    GR.clump_layer(tuft, L, 4.5, (3, 6, 3, 6), lambda q: 'grass', base_i=3, tip_lit=0, tip_dark=1, nbl=(3, 5),
                   skip=lambda q: abs(s[int(q[1]) % T, int(q[0]) % T] - d[int(q[1]) % T, int(q[0]) % T]) > 1.5 or q[2] > 0.75)
    # cast shadow on the lower surface when the grass is to the north or west (NW light)
    sh = (~m) & (s < d + 2.5) & np.isin(near, ['N', 'W'])
    out[sh] = np.array(SHADOW[:3] + (80,), np.uint8)
    sh2 = (~m) & (s >= d + 2.5) & (s < d + 4) & np.isin(near, ['N', 'W'])
    out[sh2] = np.array(SHADOW[:3] + (40,), np.uint8)
    return over(out, tuft)


# ------------------------------------------------------------------ kerbs
KW = 7   # kerb width (top) in px


def kerb(sides, mode, v):
    """Grey granite kerb on a pavement tile; the road lies on `sides`. The kerb face towards a road to the south is
    visible (3/4 view): a 4 px face with a gutter shadow. Other sides show the arris and a shadow line."""
    s, near = sdist(sides, mode)
    out = blank()
    along = np.where(np.isin(near, ['N', 'S']), XX, YY)
    L = Layered(733, v)
    gr = L.field((4, 2)); wn = L.white()
    K = 'concrete'
    for y in range(T):
        for x in range(T):
            sv = s[y, x]; nd = near[y, x]
            face = 4 if nd == 'S' else 1
            if sv >= KW + face: continue
            if sv < face:                          # the kerb face / drop to the road
                if nd == 'S':
                    c = rgb(K, 2 if sv >= 3 else (3 if sv >= 1.5 else 4))
                else:
                    c = rgb('stone', 5)
            else:
                t = sv - face
                if t > KW - 1.2: c = rgb('stone', 4)                  # joint to the flags
                elif t < 1.2: c = rgb(K, 0 if nd in ('N', 'W', 'S') else 2)  # lit arris
                else:
                    i = 1 if gr[y, x] > -0.5 else 2
                    if wn[y, x] > 0.93: i = 0
                    elif wn[y, x] < 0.05: i = 3
                    c = rgb(K, i)
                if mode == 'edge' and along[y, x] % 24 == 23: c = rgb(K, 4)
                if mode == 'edge' and along[y, x] % 24 == 0: c = rgb(K, 0)
            put(out, x, y, c, False)
    return out


# ------------------------------------------------------------------ path edges
def path_edge(sides, mode, v):
    """On a dirt/hoggin path tile where grass lies on `sides`: a darker compacted, slightly damp margin with pebbles
    pushed to the side. Draw the grass edge overlay on top."""
    L = Layered(811, v)
    s, near = sdist(sides, mode)
    f = L.field((8, 4)) * 1.2
    out = blank()
    m = s < 7 + f
    a = np.clip(70 - (s * 9), 0, 70).astype(np.uint8)
    out[m] = np.concatenate([np.broadcast_to(np.array(rgb('mud', 3)[:3], np.uint8), (T, T, 3)), a[..., None]], 2)[m]
    peb = blank()
    def mk(q, rr):
        x, y = int(q[0]) % T, int(q[1]) % T
        if not (3 < s[y, x] < 9): return None
        return pebble(rr, 'stone', 0.9 + q[2] * 1.2, 0.7 + q[3] * 0.8, tone=rr.normal() * 0.2, shadow_idx=SHADOW[:3] + (90,))
    scatter_sprites(peb, L, 5.0, mk, (3, 4, 3, 1), p=0.7)
    return over(out, peb)


# ------------------------------------------------------------------ markings
def worn(img, rng, p=0.12):
    m = img[..., 3] > 0
    k = m & (rng.random((T, T)) < p)
    img[k, 3] = 0
    k2 = m & ~k & (rng.random((T, T)) < 0.25)
    return img, k2


def paint(rect_mask, rampn, rng, i0=1, i1=2, wear=0.1):
    out = blank()
    out[rect_mask] = np.array(rgb(rampn, i0), np.uint8)
    out, k2 = worn(out, rng, wear)
    out[k2] = np.array(rgb(rampn, i1), np.uint8)
    return out


def markings():
    rng = np.random.default_rng(900)
    M = {}
    ctr = (np.abs(YY - 23.5) < 1.2) & (XX >= 12) & (XX < 36)
    M['mark_centre_H'] = [paint(ctr, 'white', np.random.default_rng(901 + i)) for i in range(3)]
    M['mark_centre_V'] = [rot90(a) for a in M['mark_centre_H']]
    gw = ((np.abs(YY - 20) < 1.1) | (np.abs(YY - 26) < 1.1)) & ((XX % 12) < 7)
    M['mark_giveway_H'] = [paint(gw, 'white', np.random.default_rng(911 + i)) for i in range(2)]
    M['mark_giveway_V'] = [rot90(a) for a in M['mark_giveway_H']]
    # give-way triangle, pointing south (towards the give-way line)
    tri = np.zeros((T, T), bool); inner = np.zeros((T, T), bool)
    for y in range(4, 44):
        hw = (44 - y) / 40 * 11
        tri[y, int(24 - hw):int(24 + hw) + 1] = True
        hw2 = hw - 2.4
        if 7 < y < 40 and hw2 > 0: inner[y, int(24 - hw2):int(24 + hw2) + 1] = True
    tri &= ~inner
    tS = paint(tri, 'white', np.random.default_rng(921))
    M['mark_triangle_S'] = [tS]; M['mark_triangle_N'] = [rot90(tS, 2)]
    M['mark_triangle_E'] = [rot90(tS, 1)]; M['mark_triangle_W'] = [rot90(tS, 3)]
    # double / single yellow lines alongside a kerb on the named side
    dy = (np.abs(YY - 3.5) < 0.8) | (np.abs(YY - 7.5) < 0.8)
    sy = np.abs(YY - 4.5) < 0.8
    for nm, m in (('mark_dyellow', dy), ('mark_syellow', sy)):
        a = paint(m, 'mustard', np.random.default_rng(931), 0, 1, 0.08)
        M[nm + '_N'] = [a]; M[nm + '_S'] = [a[::-1].copy()]
        M[nm + '_W'] = [np.ascontiguousarray(np.transpose(a, (1, 0, 2)))]; M[nm + '_E'] = [np.ascontiguousarray(np.transpose(a, (1, 0, 2))[:, ::-1])]
    bay = np.abs(YY - 0.5) < 1.0
    M['mark_bay_H'] = [paint(bay, 'white', np.random.default_rng(941))]
    M['mark_bay_V'] = [np.ascontiguousarray(np.transpose(M['mark_bay_H'][0], (1, 0, 2)))]
    return M


def concrete_joints():
    a = blank()
    for x in range(T):
        put(a, x, 0, rgb('concrete', 4), False); put(a, x, 1, rgb('concrete', 0), False)
        if x % 7 == 3: put(a, x, 1, rgb('concrete', 2), False)
    return {'concrete_joint_H': [a], 'concrete_joint_V': [np.ascontiguousarray(np.transpose(a, (1, 0, 2)))]}


# ------------------------------------------------------------------ platform edges
def platform_edges(closed=True):
    base, _ = ST.platform_variants(closed)
    N, S = [], []
    for v in range(4):
        rng = np.random.default_rng(1010 + v)
        a = base[v].copy()
        # coping along the north (track) edge: bullnose lip, lit top, joints every 24 px
        for x in range(T):
            j = (x % 24 == 23)
            col = [rgb('stone', 3), rgb('white', 1), rgb('stone', 0), rgb('stone', 0), rgb('stone', 1), rgb('stone', 1),
                   rgb('stone', 1), rgb('stone', 2), rgb('stone', 3)]
            for y, c in enumerate(col):
                put(a, x, y, rgb('stone', 3) if (j and 1 <= y <= 7) else c, False)
            if closed and rng.random() < 0.08: put(a, x, 4 + int(rng.integers(0, 3)), rgb('stone', 2), False)
        # yellow safety line (plain stripe, no text); faded on the closed platform
        for x in range(T):
            for y in range(11, 15):
                c = rgb('mustard', 1 if not closed else (1 if rng.random() > 0.35 else 2))
                if closed and rng.random() < 0.06: continue
                put(a, x, y, c, False)
        if closed:   # weeds in coping joints
            for jx in (23, 47):
                if rng.random() < 0.6:
                    for (dx, dy, i) in [(0, 8, 3), (-1, 7, 2), (1, 7, 2), (0, 6, 1)]: put(a, jx + dx, dy, rgb('grass', i), False)
        N.append(a)
        # south (back) edge: coping, then the visible retaining face in brick, AO at its foot
        b = base[v].copy()
        top = T - 13
        for x in range(T):
            for y, c in enumerate([rgb('stone', 3), rgb('stone', 1), rgb('stone', 1), rgb('stone', 2)]):
                put(b, x, top + y, c, False)
        for y in range(top + 4, T):
            course = (y - top - 4) // 4
            for x in range(T):
                if (y - top - 4) % 4 == 3 or (x + (course % 2) * 6) % 12 == 0: c = rgb('stone', 3)   # mortar
                else:
                    k = ((x + (course % 2) * 6) // 12 * 7 + course * 3 + v) % 5
                    c = rgb('brick_dark' if k == 0 else 'brick', 1 if (y - top - 4) % 4 == 0 else (2 if k < 3 else 3))
                if y >= T - 2: c = rgb('brick', 4)
                put(b, x, y, c, False)
        S.append(b)
    return {'platform_edge_N': N, 'platform_edge_S': S}
