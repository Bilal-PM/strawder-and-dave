/**
 * Static scenery for The Open Line, baked into merged geometry.
 * Track, platforms, signals, viaduct, tunnel, level crossing, signal box, tamper, trees, houses.
 */
import * as THREE from "three";
import { Builder, PRIM, rng, trs } from "./builder";
import type { Terrain } from "./terrain";
import { ahead, frame, inRange, newFrame, PLATFORM_H, RAIL_HALF, RAIL_TOP, sample, SLEEPER_SPACING, smoothstep, type Frame, type World } from "./track";

export const INK = "#1B1F24";
export const COL = {
  ballast: "#A39D92",
  ballastTop: "#B5AFA4",
  railSide: "#6E767F",
  railTop: "#D7DBDF",
  sleeper: "#D2CDC3",
  platFace: "#C9C1B2",
  platTop: "#E3DDD1",
  coping: "#F4F0E7",
  yellow: "#F2C230",
  stone: "#CFB896",
  stoneDark: "#B9A285",
  brick: "#B9775A",
  slate: "#5A5F66",
  timber: "#D2B079",
  glass: "#BFD9EA",
  dark: "#2A2E33",
  post: "#8A9099",
  white: "#F4F1EA",
  tunnel: "#4A4540",
  road: "#73767B",
  trunk: "#7A5A43",
  navy: "#1E3A6E",
  red: "#B4442E",
  cream: "#E9DFCB",
  orange: "#E8611A",
};
const AUTUMN = ["#D9822B", "#C8553D", "#E3A33B", "#B5651D", "#E8C15A", "#CF6F2E"];
const GREEN = ["#7FA36A", "#6E9460", "#8DB074", "#93B57A"];
const CONIFER = "#5E8257";

export type Label = { text: string; kind: "name" | "stop" | "id" | "num" | "term" | "watch"; m: THREE.Matrix4; w: number; h: number };
export type Pivot = { m: THREE.Matrix4; dir: 1 | -1 };
export type Scenery = {
  geo: THREE.BufferGeometry;
  lines: THREE.BufferGeometry;
  sleepers: THREE.Matrix4[];
  lamps: THREE.Matrix4[]; // 4 per signal, top to bottom
  leaves: { m: THREE.Matrix4[]; c: THREE.Color[] };
  crossing: { booms: Pivot[]; lights: THREE.Matrix4[] };
  esr: { geo: THREE.BufferGeometry; lines: THREE.BufferGeometry; labels: Label[] };
  labels: Label[];
  marker: { lamp: THREE.Matrix4 };
};

const F = newFrame();
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** World point at (s, lateral offset, height above formation), using the level frame. */
function at(w: World, s: number, lat: number, y: number, fr: Frame = F, level = true) {
  frame(w, s, fr, level);
  return V(fr.px + fr.rx * lat + fr.ux * y, fr.py + fr.ry * lat + fr.uy * y, fr.pz + fr.rz * lat + fr.uz * y);
}

/** Matrix for an object aligned with the track at s (local x forward, z right). */
function along(w: World, s: number, lat: number, y: number, sx: number, sy: number, sz: number, yawOff = 0, absY?: number) {
  const p = at(w, s, lat, y);
  const hd = sample(w, s).hdg;
  return trs(p.x, absY ?? p.y, p.z, -hd + yawOff, sx, sy, sz);
}

/** Matrix with an explicit basis. */
function basis(x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3, p: THREE.Vector3, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().makeBasis(x.clone().multiplyScalar(sx), y.clone().multiplyScalar(sy), z.clone().multiplyScalar(sz)).setPosition(p);
}
function frameVecs(w: World, s: number, level = true) {
  const f = newFrame();
  frame(w, s, f, level);
  return { f: V(f.fx, 0, f.fz).normalize(), r: V(f.rx, 0, f.rz).normalize(), u: V(0, 1, 0), p: V(f.px, f.py, f.pz) };
}

type SweepOpt = { level?: boolean; closed?: boolean; lines?: number[]; offset?: (s: number) => number; cap?: boolean };
function sweep(b: Builder, w: World, from: number, to: number, step: number, prof: [number, number][], cols: string[], opt: SweepOpt = {}) {
  const n = Math.max(1, Math.ceil((to - from) / step));
  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= n; i++) {
    const s = from + ((to - from) * i) / n;
    frame(w, s, F, !!opt.level);
    const off = opt.offset ? opt.offset(s) : 0;
    rings.push(prof.map(([lat, y]) => V(F.px + F.rx * (lat + off) + F.ux * y, F.py + F.ry * (lat + off) + F.uy * y, F.pz + F.rz * (lat + off) + F.uz * y)));
  }
  const m = prof.length, edges = opt.closed ? m : m - 1;
  for (let i = 0; i < n; i++) for (let e = 0; e < edges; e++) {
    const a = rings[i][e], bb = rings[i][(e + 1) % m], c = rings[i + 1][(e + 1) % m], d = rings[i + 1][e];
    b.quad(a, bb, c, d, cols[e % cols.length]);
  }
  for (const k of opt.lines ?? []) for (let i = 0; i < n; i++) b.line(rings[i][k], rings[i + 1][k]);
  if (opt.cap) for (const ring of [rings[0], rings[n]]) {
    for (let k = 1; k < m - 1; k++) b.tri(ring[0], ring[k], ring[k + 1], cols[0]);
    for (let k = 0; k < m; k++) b.line(ring[k], ring[(k + 1) % m]);
  }
}

export function buildScenery(w: World, ter: Terrain): Scenery {
  const b = new Builder();
  const R = rng(7);
  const sleepers: THREE.Matrix4[] = [];
  const labels: Label[] = [];
  const H = ter.H;

  // ---------------- track ----------------
  const ballastProf: [number, number][] = [[-2.7, -0.18], [-1.7, 0.3], [1.7, 0.3], [2.7, -0.18]];
  sweep(b, w, 0, w.L, 3, ballastProf, [COL.ballast, COL.ballastTop, COL.ballast]);
  for (const sgn of [-1, 1]) {
    const o = sgn * RAIL_HALF;
    sweep(b, w, 0, w.L, 2.5, [[o - sgn * 0.036, 0.38], [o - sgn * 0.036, RAIL_TOP], [o + sgn * 0.036, RAIL_TOP], [o + sgn * 0.036, 0.38]], [COL.railSide, COL.railTop, COL.railSide]);
  }
  const sleeperAt = (s: number, off = 0, level = false) => {
    frame(w, s, F, level);
    const m = new THREE.Matrix4().makeBasis(V(F.fx, F.fy, F.fz).multiplyScalar(0.28), V(F.ux, F.uy, F.uz).multiplyScalar(0.2), V(F.rx, F.ry, F.rz).multiplyScalar(2.5));
    m.setPosition(F.px + F.rx * off + F.ux * 0.28, F.py + F.ry * off + F.uy * 0.28, F.pz + F.rz * off + F.uz * 0.28);
    sleepers.push(m);
  };
  for (let s = 0.3; s < w.L; s += SLEEPER_SPACING) sleeperAt(s);

  // ---------------- tamper siding ----------------
  const tp = w.tamper;
  const sidingOff = (s: number) => tp.side * (2.2 + 2.6 * smoothstep(tp.from, tp.from + 40, s));
  sweep(b, w, tp.from, tp.to, 3, [[-2.2, -0.2], [-1.6, 0.28], [1.6, 0.28], [2.2, -0.2]], [COL.ballast, COL.ballastTop, COL.ballast], { level: true, offset: sidingOff });
  for (const sgn of [-1, 1]) {
    const o = sgn * RAIL_HALF;
    sweep(b, w, tp.from, tp.to, 3, [[o - 0.036, 0.38], [o - 0.036, RAIL_TOP], [o + 0.036, RAIL_TOP], [o + 0.036, 0.38]], [COL.railSide, COL.railTop, COL.railSide], { level: true, offset: sidingOff });
  }
  for (let s = tp.from + 0.3; s < tp.to; s += SLEEPER_SPACING) sleeperAt(s, sidingOff(s), true);
  // buffer stop
  {
    const s = tp.to - 1.5, off = sidingOff(s);
    b.add(PRIM.box, COL.red, along(w, s, off, 0.9, 0.5, 1.0, 2.6));
    b.add(PRIM.box, COL.white, along(w, s - 0.27, off, 1.1, 0.04, 0.25, 1.6), false);
    b.add(PRIM.box, COL.dark, along(w, s + 0.8, off, 0.6, 1.6, 0.25, 0.3, 0), 30);
  }
  // the tamper itself (Network Rail yellow), on the siding
  {
    const s = tp.s + 25, off = sidingOff(s), y0 = RAIL_TOP;
    const T = (lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, c: string, edge: number | false = 30, geo: THREE.BufferGeometry = PRIM.box) => {
      const base = along(w, s, off, 0, 1, 1, 1);
      const m = new THREE.Matrix4().makeTranslation(lx, y0 + ly, lz).multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
      b.add(geo, c, base.multiply(m), edge);
    };
    T(0, 0.95, 0, 23.4, 0.35, 2.6, COL.dark);
    T(-9.6, 2.45, 0, 4.0, 2.6, 2.8, COL.yellow);
    T(9.6, 2.45, 0, 4.0, 2.6, 2.8, COL.yellow);
    T(0, 2.15, 0, 15.2, 2.0, 2.6, COL.yellow);
    T(0, 2.0, 0, 15.25, 0.18, 2.62, COL.dark, false);
    for (const sx of [-1, 1]) {
      T(sx * 11.62, 2.95, 0, 0.06, 0.9, 2.3, COL.glass, false);
      for (const sz of [-1, 1]) T(sx * 9.6, 3.0, sz * 1.41, 2.6, 0.8, 0.04, COL.glass, false);
      T(sx * 9.6, 3.85, 0, 0.35, 0.3, 0.35, COL.orange, false, PRIM.cyl);
      // bogies and wheels
      T(sx * 7.5, 0.55, 0, 3.4, 0.4, 2.2, COL.dark);
      for (const wx of [-0.9, 0.9]) for (const sz of [-1, 1]) {
        const base = along(w, s, off, 0, 1, 1, 1);
        b.add(PRIM.cyl, "#1A1C1F", base.multiply(new THREE.Matrix4().makeTranslation(sx * 7.5 + wx, y0 + 0.45, sz * 0.72)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(0.9, 0.14, 0.9)), 40);
      }
    }
    T(1.5, 0.2, 0, 2.6, 1.3, 2.3, COL.dark);
    for (let i = 0; i < 4; i++) for (const sz of [-0.8, 0.8]) T(0.6 + i * 0.6, -0.4, sz, 0.08, 0.9, 0.08, COL.dark, false);
  }

  // ---------------- stations ----------------
  const PH = RAIL_TOP + PLATFORM_H;
  for (const st of w.stations) {
    const sd = st.side;
    const L = (lat: number) => sd * lat;
    const prof: [number, number][] = [[L(1.45), -0.5], [L(1.45), PH], [L(5.6), PH], [L(5.6), -0.5]];
    if (sd < 0) prof.reverse();
    sweep(b, w, st.platFrom, st.platTo, 6, prof, [COL.platFace, COL.platTop, COL.platFace], { level: true, lines: [1, 2], cap: true });
    sweep(b, w, st.platFrom, st.platTo, 6, [[L(1.45), PH + 0.01], [L(2.0), PH + 0.01]], [COL.coping], { level: true });
    sweep(b, w, st.platFrom + 1, st.platTo - 1, 6, [[L(2.12), PH + 0.015], [L(2.24), PH + 0.015]], [COL.yellow], { level: true });
    // shelter
    {
      const s = st.stopS - 55;
      b.add(PRIM.box, COL.navy, along(w, s, L(5.0), PH + 1.25, 7, 2.5, 0.15));
      b.add(PRIM.box, COL.slate, along(w, s, L(4.0), PH + 2.65, 7.6, 0.16, 2.8));
      for (const dx of [-3.3, 3.3]) b.add(PRIM.box, COL.navy, along(w, s + dx, L(3.0), PH + 1.3, 0.12, 2.6, 0.12));
      b.add(PRIM.box, COL.timber, along(w, s, L(4.6), PH + 0.45, 5, 0.12, 0.5));
    }
    // station building
    {
      const s = st.stopS - 100, lat = L(9.0), base = Math.min(H(...xz(at(w, s, lat, 0))), at(w, s, 0, 0).y) - 1.5;
      const top = at(w, s, 0, PH + 3.8).y;
      const hgt = top - base;
      b.add(PRIM.box, COL.brick, along(w, s, lat, 0, 14, hgt, 6, 0, base + hgt / 2));
      b.add(PRIM.roof, COL.slate, along(w, s, lat, 0, 14.8, 2.6, 6.8, 0, top));
      b.add(PRIM.box, COL.brick, along(w, s + 4, lat, 0, 0.8, 1.6, 0.8, 0, top + 1.6));
      for (const dx of [-4.5, -1.5, 1.5, 4.5]) b.add(PRIM.box, dx === -1.5 ? COL.navy : COL.glass, along(w, s + dx, L(5.98), PH + (dx === -1.5 ? 1.1 : 1.6), 1.4, dx === -1.5 ? 2.2 : 1.3, 0.06), false);
    }
    // lamps
    for (let s = st.platFrom + 12; s < st.platTo - 5; s += 26) {
      b.add(PRIM.cylLo, COL.dark, along(w, s, L(4.9), PH + 2.0, 0.12, 4.0, 0.12), false);
      b.add(PRIM.box, COL.dark, along(w, s, L(4.4), PH + 4.0, 0.3, 0.18, 1.1));
    }
    // name boards facing the track
    for (const s of [st.stopS - 25, st.stopS - 118]) {
      const { f, r, u } = frameVecs(w, s);
      for (const dx of [-1.6, 1.6]) b.add(PRIM.cylLo, COL.dark, along(w, s + dx, L(5.25), PH + 1.3, 0.1, 2.6, 0.1), false);
      const p = at(w, s, L(5.2), PH + 2.75);
      const nrm = r.clone().multiplyScalar(-sd);
      b.add(PRIM.box, COL.navy, basis(f.clone().multiplyScalar(-sd), u, nrm, p, 3.8, 0.85, 0.08));
      labels.push({ text: st.name, kind: "name", m: basis(f.clone().multiplyScalar(-sd), u, nrm, p.clone().addScaledVector(nrm, 0.05)), w: 3.6, h: 0.72 });
    }
    // stop marker facing the driver
    {
      const s = st.stopS;
      const { f, r, u } = frameVecs(w, s);
      b.add(PRIM.cylLo, COL.dark, along(w, s, L(1.9), PH + 0.9, 0.08, 1.8, 0.08), false);
      const p = at(w, s, L(1.9), PH + 1.95);
      const back = f.clone().multiplyScalar(-1);
      b.add(PRIM.box, COL.white, basis(r, u, back, p, 0.62, 0.62, 0.05));
      labels.push({ text: "3", kind: "stop", m: basis(r, u, back, p.clone().addScaledVector(back, 0.035)), w: 0.56, h: 0.56 });
    }
    // houses behind
    for (let i = 0; i < 4; i++) {
      const s = st.stopS - 30 - i * 30 + R() * 8, lat = L(20 + R() * 16);
      const p = at(w, s, lat, 0);
      const gy = H(p.x, p.z);
      const wall = R() < 0.5 ? COL.cream : "#C99A7C";
      const wd = 6 + R() * 3, dp = 5.5 + R() * 2;
      b.add(PRIM.box, wall, along(w, s, lat, 0, wd, 5, dp, 0, gy + 2.0));
      b.add(PRIM.roof, R() < 0.5 ? COL.slate : "#A65A44", along(w, s, lat, 0, wd + 0.6, 2.4, dp + 0.6, 0, gy + 4.5));
      b.add(PRIM.box, COL.glass, along(w, s, lat - sd * (dp / 2 + 0.01), 0, 1.2, 1.0, 0.04, 0, gy + 3.0), false);
      b.add(PRIM.box, COL.glass, along(w, s + 2, lat - sd * (dp / 2 + 0.01), 0, 1.2, 1.0, 0.04, 0, gy + 3.0), false);
    }
  }

  // ---------------- signals ----------------
  const lamps: THREE.Matrix4[] = [];
  for (const sg of w.signals) {
    const lat = -2.85;
    const { f, r, u } = frameVecs(w, sg.s);
    const back = f.clone().multiplyScalar(-1);
    b.add(PRIM.cylLo, COL.post, along(w, sg.s, lat, 2.3, 0.18, 4.6, 0.18), false);
    const head = at(w, sg.s, lat, 4.9);
    b.add(PRIM.box, COL.dark, basis(r, u, back, head, 0.56, 1.7, 0.34));
    // hood strips over each lamp
    const lampY = [0.6, 0.2, -0.2, -0.6];
    for (const ly of lampY) {
      const c = head.clone().addScaledVector(u, ly).addScaledVector(back, 0.175);
      lamps.push(basis(r, u, back, c.clone().addScaledVector(back, 0.003), 0.26, 0.26, 1));
      b.add(PRIM.box, "#1A1C1F", basis(r, u, back, c.clone().addScaledVector(u, 0.16).addScaledVector(back, 0.08), 0.32, 0.03, 0.16), false);
    }
    // identity plate
    const plate = at(w, sg.s, lat, 3.75);
    b.add(PRIM.box, COL.white, basis(r, u, back, plate.clone().addScaledVector(back, 0.12), 0.5, 0.24, 0.03));
    labels.push({ text: sg.label, kind: "id", m: basis(r, u, back, plate.clone().addScaledVector(back, 0.14)), w: 0.46, h: 0.2 });
    // AWS magnet between the rails
    b.add(PRIM.box, COL.dark, along(w, sg.aws, 0, 0.42, 0.45, 0.1, 0.35), false);
  }

  // ---------------- signal box ----------------
  {
    const sb = w.signalBox, lat = sb.side * 11;
    const p = at(w, sb.s, lat, 0);
    const gy = Math.min(H(p.x, p.z), at(w, sb.s, 0, 0).y) - 0.5;
    b.add(PRIM.box, COL.brick, along(w, sb.s, lat, 0, 10, 4, 4.6, 0, gy + 2.0));
    b.add(PRIM.box, COL.timber, along(w, sb.s, lat, 0, 10.4, 3.0, 5.0, 0, gy + 5.5));
    b.add(PRIM.box, COL.glass, along(w, sb.s, lat, 0, 10.45, 1.4, 5.05, 0, gy + 5.8), false);
    for (let i = -2; i <= 2; i++) b.add(PRIM.box, COL.white, along(w, sb.s + i * 2.1, lat, 0, 0.1, 1.45, 5.08, 0, gy + 5.8), false);
    b.add(PRIM.roof, COL.slate, along(w, sb.s, lat, 0, 11.2, 2.0, 5.8, 0, gy + 7.0));
    b.add(PRIM.box, COL.white, along(w, sb.s, lat - sb.side * 2.55, 0, 4, 0.6, 0.06, 0, gy + 4.5));
    b.add(PRIM.box, COL.timber, along(w, sb.s + 6, lat, 0, 2.5, 0.25, 1.2, 0.55, gy + 2.2));
    labels.push({ text: "OPEN LINE", kind: "watch", m: along(w, sb.s, lat - sb.side * 2.59, 0, 1, 1, 1, sb.side > 0 ? Math.PI : 0, gy + 4.5), w: 3.8, h: 0.5 });
  }

  // ---------------- viaduct ----------------
  {
    const v = w.viaduct;
    const deck: [number, number][] = [[-3.4, -0.2], [-3.4, -1.6], [3.4, -1.6], [3.4, -0.2]];
    sweep(b, w, v.from - 6, v.to + 6, 6, deck, [COL.stoneDark, COL.stoneDark, COL.stoneDark], { level: true, lines: [0, 3] });
    for (const sgn of [-1, 1]) {
      const pr: [number, number][] = [[sgn * 3.0, -0.2], [sgn * 3.0, 1.1], [sgn * 3.45, 1.1], [sgn * 3.45, -0.2]];
      if (sgn < 0) pr.reverse();
      sweep(b, w, v.from - 6, v.to + 6, 6, pr, [COL.stone, COL.coping, COL.stone], { level: true, lines: [1, 2] });
    }
    const len = v.to - v.from, count = Math.max(1, Math.round(len / 24)), span = len / count;
    for (let i = 0; i < count; i++) {
      const sc = v.from + span * (i + 0.5);
      const fv = frameVecs(w, sc);
      let ground = Infinity;
      for (const ds of [-span / 2, 0, span / 2]) for (const lat of [-3.4, 3.4]) { const q = at(w, sc + ds, lat, 0); ground = Math.min(ground, H(q.x, q.z)); }
      const bottom = ground - fv.p.y - 2.5;
      const a = span / 2 - 3, deckB = -1.6, spring = deckB - 1.3 - a;
      const sh = new THREE.Shape();
      sh.moveTo(-span / 2, bottom); sh.lineTo(span / 2, bottom); sh.lineTo(span / 2, deckB); sh.lineTo(-span / 2, deckB); sh.lineTo(-span / 2, bottom);
      if (spring > bottom + 1.5) {
        const hole = new THREE.Path();
        hole.moveTo(-a, bottom + 0.3); hole.lineTo(a, bottom + 0.3); hole.lineTo(a, spring); hole.absarc(0, spring, a, 0, Math.PI, false); hole.lineTo(-a, bottom + 0.3);
        sh.holes.push(hole);
      }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 6.6, bevelEnabled: false, curveSegments: 9 });
      geo.translate(0, 0, -3.3);
      b.add(geo, COL.stone, trs(fv.p.x, fv.p.y, fv.p.z, -sample(w, sc).hdg, 1, 1, 1), 30);
      geo.dispose();
      // pier cutwater
      if (i > 0) {
        const ps = v.from + span * i, pp = at(w, ps, 0, 0);
        const top = pp.y + spring, bot = ground - 2.5;
        if (top > bot + 1) b.add(PRIM.box, COL.stoneDark, along(w, ps, 0, 0, 6.4, top - bot, 7.4, 0, (top + bot) / 2));
      }
    }
    for (const sEnd of [v.from - 3, v.to + 3]) {
      const pp = at(w, sEnd, 0, 0), g = H(pp.x, pp.z) - 4;
      b.add(PRIM.box, COL.stoneDark, along(w, sEnd, 0, 0, 7, pp.y - 1.6 - g, 9, 0, (pp.y - 1.6 + g) / 2));
    }
  }

  // ---------------- tunnel ----------------
  {
    const t = w.tunnel, rad = 3.7, sprY = 3.3;
    const prof: [number, number][] = [[-rad, -0.3], [-rad, sprY]];
    for (let i = 1; i < 12; i++) { const a = Math.PI - (i * Math.PI) / 12; prof.push([Math.cos(a) * rad, sprY + Math.sin(a) * rad]); }
    prof.push([rad, sprY], [rad, -0.3]);
    sweep(b, w, t.from - 6, t.to + 6, 6, prof, [COL.tunnel, "#544E48"], { level: true });
    const portal = () => {
      const sh = new THREE.Shape();
      sh.moveTo(-11, -1.5); sh.lineTo(11, -1.5); sh.lineTo(11, 15); sh.lineTo(-11, 15); sh.lineTo(-11, -1.5);
      const hole = new THREE.Path();
      hole.moveTo(-rad, -0.5); hole.lineTo(rad, -0.5); hole.lineTo(rad, sprY); hole.absarc(0, sprY, rad, 0, Math.PI, false); hole.lineTo(-rad, -0.5);
      sh.holes.push(hole);
      return new THREE.ExtrudeGeometry(sh, { depth: 6, bevelEnabled: false, curveSegments: 12 });
    };
    const ring = () => {
      const sh = new THREE.Shape();
      sh.moveTo(rad + 0.9, sprY); sh.absarc(0, sprY, rad + 0.9, 0, Math.PI, false); sh.lineTo(-rad, sprY); sh.absarc(0, sprY, rad, Math.PI, 0, true); sh.lineTo(rad + 0.9, sprY);
      return new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false, curveSegments: 12 });
    };
    const pg = portal(), rg = ring();
    for (const [s, dir] of [[t.from, 1], [t.to, -1]] as const) {
      const { f, r, u, p } = frameVecs(w, s);
      const xAxis = r.clone().multiplyScalar(dir), zAxis = f.clone().multiplyScalar(-dir);
      b.add(pg, COL.stoneDark, basis(xAxis, u, zAxis, p), 30);
      b.add(rg, COL.stone, basis(xAxis, u, zAxis, p.clone().addScaledVector(zAxis, 6)), 30);
      b.add(PRIM.box, COL.stone, basis(xAxis, u, zAxis, p.clone().addScaledVector(zAxis, 6.2).addScaledVector(u, 14.6), 22.4, 0.8, 0.6));
    }
    pg.dispose(); rg.dispose();
  }

  // ---------------- level crossing ----------------
  const booms: Pivot[] = [];
  const xLights: THREE.Matrix4[] = [];
  {
    const s = w.crossing;
    const { f, r, u, p } = frameVecs(w, s);
    const road = (uu: number) => {
      const x = p.x + r.x * uu, z = p.z + r.z * uu;
      const y = Math.abs(uu) < 4.5 ? p.y + 0.5 : H(x, z) + (Math.abs(uu) > 40 ? 0.35 : 0.14);
      return V(x, y, z);
    };
    const pts: THREE.Vector3[] = [];
    for (let uu = -180; uu <= 180; uu += uu > -12 && uu < 12 ? 1.5 : 6) pts.push(road(uu));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];
      const a1 = a.clone().addScaledVector(f, -3), a2 = a.clone().addScaledVector(f, 3), c1 = c.clone().addScaledVector(f, -3), c2 = c.clone().addScaledVector(f, 3);
      b.quad(a1, c1, c2, a2, COL.road);
      b.line(a1, c1); b.line(a2, c2);
    }
    // centre dashes
    for (let uu = -170; uu < 170; uu += 8) {
      if (Math.abs(uu) < 8) continue;
      const a = road(uu), c = road(uu + 3.5);
      b.quad(a.clone().addScaledVector(f, -0.08).addScaledVector(u, 0.02), c.clone().addScaledVector(f, -0.08).addScaledVector(u, 0.02), c.clone().addScaledVector(f, 0.08).addScaledVector(u, 0.02), a.clone().addScaledVector(f, 0.08).addScaledVector(u, 0.02), COL.white);
    }
    for (const side of [-1, 1] as const) {
      // traffic approaching from this side keeps left
      const fo = side < 0 ? 3.4 : -3.4;
      const base = road(side * 4.8).addScaledVector(f, fo);
      const xAxis = f.clone(), zAxis = r.clone();
      b.add(PRIM.box, COL.white, basis(xAxis, u, zAxis, base.clone().addScaledVector(u, 0.6), 0.3, 1.2, 0.3));
      b.add(PRIM.box, COL.dark, basis(xAxis, u, zAxis, base.clone().addScaledVector(u, 2.1), 0.2, 3.0, 0.2), false);
      // light housings facing the road user
      const face = r.clone().multiplyScalar(side);
      const lx = f.clone().multiplyScalar(side);
      b.add(PRIM.box, COL.dark, basis(lx, u, face, base.clone().addScaledVector(u, 2.9).addScaledVector(face, 0.12), 1.0, 0.42, 0.1));
      for (const dx of [-0.28, 0.28]) xLights.push(basis(lx, u, face, base.clone().addScaledVector(u, 2.9).addScaledVector(face, 0.18).addScaledVector(lx, dx), 0.26, 0.26, 1));
      const pivot = basis(xAxis, u, zAxis, base.clone().addScaledVector(u, 1.05).addScaledVector(zAxis, -side * 0.25));
      booms.push({ m: pivot, dir: side < 0 ? -1 : 1 });
      // a car waiting in the left lane
      const carBase = road(side * 17).addScaledVector(f, side < 0 ? 1.5 : -1.5);
      const carX = r.clone().multiplyScalar(-side), carZ = f.clone().multiplyScalar(side);
      const cc = side < 0 ? "#4E8C8A" : "#E2D6B8";
      b.add(PRIM.box, cc, basis(carX, u, carZ, carBase.clone().addScaledVector(u, 0.75), 4.1, 0.8, 1.8));
      b.add(PRIM.box, cc, basis(carX, u, carZ, carBase.clone().addScaledVector(u, 1.45).addScaledVector(carX, -0.3), 2.3, 0.65, 1.7));
      b.add(PRIM.box, COL.glass, basis(carX, u, carZ, carBase.clone().addScaledVector(u, 1.45).addScaledVector(carX, -0.3), 2.32, 0.45, 1.72), false);
      for (const wx of [-1.3, 1.3]) for (const wz of [-0.85, 0.85]) b.add(PRIM.cyl, "#1A1C1F", basis(carX, carZ.clone().multiplyScalar(-1), u, carBase.clone().addScaledVector(carX, wx).addScaledVector(carZ, wz).addScaledVector(u, 0.35), 0.62, 0.2, 0.62), false);
    }
  }

  // ---------------- trees ----------------
  const tree = (x: number, z: number, autumn: boolean, scale = 1) => {
    const gy = H(x, z);
    const conifer = !autumn && R() < 0.22;
    const hgt = (4 + R() * 3) * scale;
    b.add(PRIM.cylLo, COL.trunk, trs(x, gy + hgt * 0.3, z, 0, 0.45 * scale, hgt * 0.6, 0.45 * scale), false);
    if (conifer) {
      b.add(PRIM.cone, CONIFER, trs(x, gy + hgt * 0.95, z, R() * 6, 3.6 * scale, hgt * 1.3, 3.6 * scale), 30);
    } else {
      const c = autumn ? AUTUMN[Math.floor(R() * AUTUMN.length)] : GREEN[Math.floor(R() * GREEN.length)];
      const rr = (2.6 + R() * 1.6) * scale;
      b.add(PRIM.ico, c, trs(x, gy + hgt * 0.6 + rr * 0.7, z, R() * 6, rr * 2, rr * 1.8, rr * 2, R(), R()), 30);
    }
  };
  const nearStation = (s: number) => w.stations.some((st) => ahead(w, st.platFrom - 40, s) < st.platTo - st.platFrom + 60);
  const okSpot = (x: number, z: number, minD: number) => {
    const [d, s] = ter.nearest(x, z);
    if (d < minD) return false;
    if (d < 40 && (nearStation(s) || Math.abs(s - w.crossing) < 30 || inRange(w, s, w.viaduct))) return false;
    return true;
  };
  // autumn trees lining the canted curve and the cutting top
  for (const z of w.leafZones) {
    for (let s = z.from; s < z.to; s += 5.5) {
      for (const sd of [-1, 1]) {
        if (R() < 0.25) continue;
        const p = at(w, s, sd * (10 + R() * 18), 0);
        if (okSpot(p.x, p.z, 9.5)) tree(p.x, p.z, R() < 0.85, 1 + R() * 0.3);
      }
    }
  }
  // woods and field trees
  const bx = ter.size;
  let placed = 0;
  for (let i = 0; i < 2000 && placed < 230; i++) {
    const x = bx.minX + 120 + R() * (bx.maxX - bx.minX - 240), z = bx.minZ + 120 + R() * (bx.maxZ - bx.minZ - 240);
    // clump into copses
    const clump = Math.sin(x * 0.011) * Math.cos(z * 0.013) > 0.35;
    if (!clump && R() < 0.8) continue;
    if (!okSpot(x, z, 14)) continue;
    tree(x, z, R() < 0.35);
    placed++;
  }

  // ---------------- leaves on the rails (shown in leaf-fall) ----------------
  const leafM: THREE.Matrix4[] = [], leafC: THREE.Color[] = [];
  for (const z of w.leafZones) for (let s = z.from; s < z.to; s += 0.3) {
    const lat = (R() - 0.5) * 3.6;
    frame(w, s, F, false);
    const onRail = Math.abs(Math.abs(lat) - RAIL_HALF) < 0.08;
    const y = onRail ? RAIL_TOP + 0.006 : 0.33;
    const m = new THREE.Matrix4().compose(V(F.px + F.rx * lat + F.ux * y, F.py + F.ry * lat + F.uy * y, F.pz + F.rz * lat + F.uz * y), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, R() * 6.28)), V(1, 1, 1));
    leafM.push(m);
    leafC.push(new THREE.Color(AUTUMN[Math.floor(R() * AUTUMN.length)]));
  }

  // ---------------- speed restriction boards (hot weather only) ----------------
  const eb = new Builder();
  const esrLabels: Label[] = [];
  const board = (s: number, lat: number, colr: string, text: string, kind: Label["kind"], wd = 1.1, ht = 0.9) => {
    const { f, r, u } = frameVecs(w, s);
    const back = f.clone().multiplyScalar(-1);
    eb.add(PRIM.cylLo, COL.post, along(w, s, lat, 1.4, 0.12, 2.8, 0.12), false);
    const p = at(w, s, lat, 2.9);
    eb.add(PRIM.box, colr, basis(r, u, back, p, wd, ht, 0.06));
    esrLabels.push({ text, kind, m: basis(r, u, back, p.clone().addScaledVector(back, 0.04)), w: wd * 0.9, h: ht * 0.85 });
  };
  board(w.esrWarning, -2.7, COL.yellow, "20", "num");
  board(w.hotSpot.from, -2.7, COL.yellow, "20", "num", 0.9, 0.9);
  board(w.hotSpot.to + 62, -2.7, COL.white, "T", "term", 0.8, 0.8);
  board(w.hotSpot.from + 40, 3.0, COL.white, "BUCKLE WATCH", "watch", 1.8, 0.7);

  return {
    geo: b.meshGeometry(),
    lines: b.lineGeometry(),
    sleepers,
    lamps,
    leaves: { m: leafM, c: leafC },
    crossing: { booms, lights: xLights },
    esr: { geo: eb.meshGeometry(), lines: eb.lineGeometry(), labels: esrLabels },
    labels,
    marker: { lamp: new THREE.Matrix4() },
  };
}

function xz(v: THREE.Vector3): [number, number] {
  return [v.x, v.z];
}
