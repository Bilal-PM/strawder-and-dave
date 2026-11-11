/**
 * The Open Line: track layout.
 *
 * The loop is laid out like a real alignment: straights and circular curves joined by
 * transition curves (curvature ramps linearly), integrated from a heading. Two straights are
 * stretched so the loop closes exactly. Everything is in metres; +y is up.
 *
 * Cant (raising the outer rail) follows curvature: equilibrium cant for the design speed,
 * capped at 150 mm, and ramped in over the transitions, as on the real railway.
 */

export const G = 9.81;
/** Distance between rail centres (1,435 mm gauge plus a rail head width). */
export const RAIL_CENTRES = 1.507;
export const RAIL_HALF = RAIL_CENTRES / 2;
export const SLEEPER_SPACING = 0.65;
/** Height of the rail head above the formation (ballast + sleeper + rail). */
export const RAIL_TOP = 0.53;
/** Height of the platform above rail level (UK standard 915 mm). */
export const PLATFORM_H = 0.915;
const DESIGN_SPEED = 22.35; // 50 mph
const MAX_CANT = 0.15;
const TRANSITION = 40;

type Seg = { kind: "s"; len: number } | { kind: "a"; R: number; deg: number };
const S = (len: number): Seg => ({ kind: "s", len });
const A = (R: number, deg: number): Seg => ({ kind: "a", R, deg });

/** Index of each named piece of the alignment. */
const SEGS: Seg[] = [
  S(300), //  0 station 1 and the signal box
  A(230, 90), //  1
  S(260), //  2 cutting on a rising gradient
  A(400, -30), //  3 reverse curve
  S(380), //  4 tamper siding, station 2, level crossing
  A(200, 85), //  5 the canted curve, autumn trees
  S(340), //  6 viaduct
  A(270, 75), //  7 falling gradient
  S(420), //  8 station 3, then the hot spot
  A(260, 60), //  9
  S(480), // 10 tunnel, then station 4
  A(240, 50), // 11
  S(280), // 12 station 5
  A(290, 30), // 13
  S(260), // 14 approach to station 1
];
/** How freely each straight may stretch to close the loop (weighted least squares). */
const FLEX: Record<number, number> = { 0: 0.15, 2: 0.3, 4: 0.15, 6: 0.6, 8: 1.5, 10: 0.4, 12: 0.4, 14: 0.4 };

export type Range = { from: number; to: number };
export type Station = { idx: number; name: string; stopS: number; platFrom: number; platTo: number; side: 1 | -1 };
export type SignalDef = { idx: number; s: number; label: string; aws: number };
export type LandmarkKey =
  | "track"
  | "signalbox"
  | "tamper"
  | "cutting"
  | "crossing"
  | "cant"
  | "leaves"
  | "viaduct"
  | "tunnel"
  | "hot"
  | "platform";
export type Landmark = { key: LandmarkKey; s: number };

export type World = {
  L: number;
  n: number;
  x: Float32Array;
  z: Float32Array;
  h: Float32Array; // formation level
  hdg: Float32Array;
  k: Float32Array; // signed curvature (1/m), + turns right
  cant: Float32Array; // metres, unsigned
  grade: Float32Array; // rise per metre
  segStart: number[];
  stations: Station[];
  signals: SignalDef[];
  viaduct: Range;
  tunnel: Range;
  cutting: Range;
  cantCurve: Range;
  crossing: number;
  leafZones: Range[];
  hotSpot: Range; // the speed restriction itself
  esrWarning: number; // warning board position
  signalBox: { s: number; side: 1 | -1 };
  tamper: { s: number; side: 1 | -1; from: number; to: number };
  landmarks: Landmark[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};

function curvatureProfile(segs: Seg[]) {
  // Returns a function k(s) and segment lengths.
  const lens = segs.map((g) => (g.kind === "s" ? g.len : Math.abs((g.deg * Math.PI) / 180) * g.R + TRANSITION));
  const starts: number[] = [];
  let acc = 0;
  for (const l of lens) { starts.push(acc); acc += l; }
  const total = acc;
  const k = (s: number) => {
    let i = 0;
    while (i < segs.length - 1 && s >= starts[i + 1]) i++;
    const g = segs[i];
    if (g.kind === "s") return 0;
    const kk = (Math.sign(g.deg) * 1) / g.R;
    const u = s - starts[i], len = lens[i];
    if (u < TRANSITION) return (kk * u) / TRANSITION;
    if (u > len - TRANSITION) return (kk * (len - u)) / TRANSITION;
    return kk;
  };
  return { k, lens, starts, total };
}

function integrate(segs: Seg[], ds: number) {
  const { k, starts, total } = curvatureProfile(segs);
  const steps = Math.round(total / ds);
  const xs = new Float64Array(steps + 1), zs = new Float64Array(steps + 1), hs = new Float64Array(steps + 1), ks = new Float64Array(steps + 1);
  let x = 0, z = 0, th = 0;
  xs[0] = 0; zs[0] = 0; hs[0] = 0; ks[0] = k(0);
  for (let i = 0; i < steps; i++) {
    const s = i * ds;
    const km = k(s + ds / 2);
    const thm = th + (km * ds) / 2;
    x += Math.cos(thm) * ds;
    z += Math.sin(thm) * ds;
    th += km * ds;
    xs[i + 1] = x; zs[i + 1] = z; hs[i + 1] = th; ks[i + 1] = k(s + ds);
  }
  return { xs, zs, hs, ks, starts, total, steps };
}

const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Build the whole world layout. `names` are used for the station boards, in order. */
export function buildWorld(names: string[]): World {
  const segs = SEGS.map((g) => ({ ...g })) as Seg[];
  // Close the loop: stretch the straights (weighted least squares) so the end meets the start.
  {
    const r0 = integrate(segs, 0.5);
    const idx = segs.map((g, i) => (g.kind === "s" ? i : -1)).filter((i) => i >= 0);
    const head = (i: number) => r0.hs[Math.min(r0.steps, Math.round(r0.starts[i] / 0.5))];
    const wt = (i: number) => FLEX[i] ?? 1;
    let a = 0, b = 0, c = 0;
    for (const i of idx) { const cx = Math.cos(head(i)), cz = Math.sin(head(i)); a += wt(i) * cx * cx; b += wt(i) * cx * cz; c += wt(i) * cz * cz; }
    const det = a * c - b * b, rx = -r0.xs[r0.steps], rz = -r0.zs[r0.steps];
    const l1 = (c * rx - b * rz) / det, l2 = (-b * rx + a * rz) / det;
    for (const i of idx) (segs[i] as { len: number }).len += wt(i) * (l1 * Math.cos(head(i)) + l2 * Math.sin(head(i)));
  }
  const r = integrate(segs, 0.5);
  const L = r.total;
  const n = Math.floor(L);
  const x = new Float32Array(n), z = new Float32Array(n), hdg = new Float32Array(n), k = new Float32Array(n), cant = new Float32Array(n), h = new Float32Array(n), grade = new Float32Array(n);
  const resX = r.xs[r.steps], resZ = r.zs[r.steps];
  for (let i = 0; i < n; i++) {
    const s = (i * L) / n; // stretch so the table spans the loop exactly
    const j = Math.min(r.steps, Math.round(s / 0.5));
    const f = s / L;
    x[i] = r.xs[j] - resX * f;
    z[i] = r.zs[j] - resZ * f;
    hdg[i] = r.hs[j];
    k[i] = r.ks[j];
    cant[i] = Math.min(MAX_CANT, (RAIL_CENTRES * DESIGN_SPEED * DESIGN_SPEED * Math.abs(k[i])) / G);
  }
  const st = r.starts.map((v) => (v * n) / L); // segment starts in table metres
  const segEnd = (i: number) => (i + 1 < st.length ? st[i + 1] : n);
  const W = n; // use table length as loop length from here on

  // Vertical profile: keyframes, then smoothed into vertical curves.
  const climb = (segEnd(2) - 10 - (st[2] + 20)) / 60; // 1 in 60
  const keys: [number, number][] = [
    [0, 0],
    [st[2] + 20, 0],
    [segEnd(2) - 10, climb],
    [st[7] + 40, climb],
    [st[8] + 20, 0.6],
    [segEnd(10), 0.6],
    [st[12] + 60, 0],
    [W, 0],
  ];
  const raw = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    let a = 0;
    while (a < keys.length - 2 && i >= keys[a + 1][0]) a++;
    const [s0, h0] = keys[a], [s1, h1] = keys[a + 1];
    raw[i] = h0 + ((h1 - h0) * (i - s0)) / Math.max(1, s1 - s0);
  }
  const box = (src: Float32Array, rad: number) => {
    const out = new Float32Array(W);
    for (let i = 0; i < W; i++) { let acc = 0; for (let d = -rad; d <= rad; d++) acc += src[(i + d + W) % W]; out[i] = acc / (2 * rad + 1); }
    return out;
  };
  const hs = box(box(raw, 30), 30);
  h.set(hs);
  for (let i = 0; i < W; i++) grade[i] = (hs[(i + 1) % W] - hs[(i - 1 + W) % W]) / 2;

  // Stations: the front of the train stops at stopS; platforms are 150 m long.
  const station = (idx: number, stopS: number, side: 1 | -1): Station => ({ idx, name: names[idx] ?? `Stop ${idx + 1}`, stopS, platFrom: stopS - 145, platTo: stopS + 8, side });
  const stations: Station[] = [
    station(0, st[0] + 200, -1),
    station(1, st[4] + 250, 1),
    station(2, st[8] + 250, -1),
    station(3, segEnd(10) - 25, 1),
    station(4, st[12] + 170, -1),
  ];

  const tunnelFrom = st[10] + 30;
  const tunnel = { from: tunnelFrom, to: tunnelFrom + Math.min(230, segEnd(10) - st[10] - 250) };
  const vLen = segEnd(6) - st[6];
  const viaduct = { from: st[6] + Math.max(45, vLen * 0.12), to: segEnd(6) - Math.max(45, vLen * 0.12) };
  const cutting = { from: st[2] + 40, to: segEnd(2) - 20 };
  const cantCurve = { from: st[5], to: segEnd(5) };
  const crossing = Math.min(st[4] + 330, segEnd(4) - 25);
  const leafZones = [{ from: st[5] - 60, to: segEnd(5) + 40 }, { from: cutting.from, to: cutting.to }];
  const hotSpot = { from: st[8] + 470, to: st[8] + 590 };
  const esrWarning = hotSpot.from - 200;

  // Signals: a starter just beyond each platform, then intermediates so blocks are about 300 m.
  const starters = stations.map((s) => s.stopS + 30).sort((a, b) => a - b);
  const sigS: number[] = [];
  for (let i = 0; i < starters.length; i++) {
    const a = starters[i], b = i + 1 < starters.length ? starters[i + 1] : starters[0] + W;
    sigS.push(a);
    const gap = b - a, cnt = Math.max(0, Math.ceil(gap / 300) - 1);
    for (let j = 1; j <= cnt; j++) {
      let s = a + (gap * j) / (cnt + 1);
      if (Math.abs(s - crossing) < 40) s = crossing - 40; // keep clear of the crossing
      sigS.push(s % W);
    }
  }
  sigS.sort((a, b) => a - b);
  const signals: SignalDef[] = sigS.map((s, i) => ({ idx: i, s, label: `OL${String(i + 1).padStart(2, "0")}`, aws: (s - 180 + W) % W }));

  const signalBox = { s: stations[0].stopS - 60, side: 1 as const };
  const tamper = { s: st[4] + 60, side: -1 as const, from: st[4] + 5, to: st[4] + 125 };

  const landmarks: Landmark[] = [
    { key: "track", s: 40 },
    { key: "signalbox", s: signalBox.s },
    { key: "cutting", s: cutting.from + 20 },
    { key: "tamper", s: tamper.s },
    { key: "crossing", s: crossing },
    { key: "cant", s: cantCurve.from + 60 },
    { key: "leaves", s: cantCurve.from + 160 },
    { key: "viaduct", s: viaduct.from },
    { key: "tunnel", s: tunnel.from },
    { key: "hot", s: esrWarning },
  ];

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < W; i++) { minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]); minZ = Math.min(minZ, z[i]); maxZ = Math.max(maxZ, z[i]); }

  return { L: W, n: W, x, z, h, hdg, k, cant, grade, segStart: st, stations, signals, viaduct, tunnel, cutting, cantCurve, crossing, leafZones, hotSpot, esrWarning, signalBox, tamper, landmarks, bounds: { minX, maxX, minZ, maxZ } };
}

export const wrap = (w: World, s: number) => ((s % w.L) + w.L) % w.L;
/** Distance travelling forward from a to b around the loop. */
export const ahead = (w: World, a: number, b: number) => wrap(w, b - a);
export const inRange = (w: World, s: number, r: Range) => ahead(w, r.from, s) <= ahead(w, r.from, r.to);

/** Interpolated sample of the table at s. */
export function sample(w: World, s: number) {
  const ss = wrap(w, s);
  const i = Math.floor(ss), f = ss - i, j = (i + 1) % w.n;
  let dh = w.hdg[j] - w.hdg[i];
  if (dh > Math.PI) dh -= Math.PI * 2; else if (dh < -Math.PI) dh += Math.PI * 2;
  return {
    x: w.x[i] + (w.x[j] - w.x[i]) * f,
    z: w.z[i] + (w.z[j] - w.z[i]) * f,
    h: w.h[i] + (w.h[j] - w.h[i]) * f,
    hdg: w.hdg[i] + dh * f,
    k: w.k[i] + (w.k[j] - w.k[i]) * f,
    cant: w.cant[i] + (w.cant[j] - w.cant[i]) * f,
    grade: w.grade[i] + (w.grade[j] - w.grade[i]) * f,
  };
}

export type Frame = {
  /** Point on the track centre line at formation level. */
  px: number; py: number; pz: number;
  /** Forward (with gradient). */
  fx: number; fy: number; fz: number;
  /** Right, rolled by cant. */
  rx: number; ry: number; rz: number;
  /** Up, rolled by cant. */
  ux: number; uy: number; uz: number;
};

/** Track frame at s. With `level` the cant roll is ignored (for platforms and structures). */
export function frame(w: World, s: number, out: Frame, level = false): Frame {
  const p = sample(w, s);
  const c = Math.cos(p.hdg), sn = Math.sin(p.hdg);
  const gl = Math.hypot(1, p.grade);
  out.px = p.x; out.py = p.h; out.pz = p.z;
  out.fx = c / gl; out.fy = p.grade / gl; out.fz = sn / gl;
  // flat right and up
  const rx = -sn, rz = c;
  const phi = level ? 0 : Math.asin(Math.min(1, p.cant / RAIL_CENTRES)) * Math.sign(p.k);
  const cp = Math.cos(phi), sp = Math.sin(phi);
  // right' = r cos - up sin ; up' = up cos + r sin
  out.rx = rx * cp; out.ry = -sp; out.rz = rz * cp;
  out.ux = rx * sp; out.uy = cp; out.uz = rz * sp;
  return out;
}
export const newFrame = (): Frame => ({ px: 0, py: 0, pz: 0, fx: 1, fy: 0, fz: 0, rx: 0, ry: 0, rz: 1, ux: 0, uy: 1, uz: 0 });

/** Nearest-point lookup for terrain shaping: spatial hash of track samples every 4 m. */
export function makeNearest(w: World) {
  const CELL = 50, step = 4;
  const buckets = new Map<string, number[]>();
  for (let s = 0; s < w.L; s += step) {
    const key = `${Math.floor(w.x[s] / CELL)},${Math.floor(w.z[s] / CELL)}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = []));
    b.push(s);
  }
  /** Returns [distance, s] of the nearest track sample (distance Infinity when far away). */
  return (px: number, pz: number): [number, number] => {
    const cx = Math.floor(px / CELL), cz = Math.floor(pz / CELL);
    let best = Infinity, bs = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const arr = buckets.get(`${cx + a},${cz + b}`);
      if (!arr) continue;
      for (const s of arr) { const d = (w.x[s] - px) ** 2 + (w.z[s] - pz) ** 2; if (d < best) { best = d; bs = s; } }
    }
    if (best === Infinity) return [Infinity, 0];
    // refine to the metre
    for (let d = -3; d <= 3; d++) { const s = (bs + d + w.n) % w.n; const dd = (w.x[s] - px) ** 2 + (w.z[s] - pz) ** 2; if (dd < best) { best = dd; bs = s; } }
    return [Math.sqrt(best), bs];
  };
}

export { smoothstep };
