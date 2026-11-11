/**
 * Soft hills, a valley for the viaduct, a hill for the tunnel, higher ground for the cutting.
 *
 * Near the line the ground is shaped like real earthworks: a level formation, then cutting or
 * embankment slopes at 1 in 1.5 until they meet the natural ground. The terrain is a coarse grid
 * for the landscape plus a fine strip that follows the track, so cuttings stay crisp.
 */
import * as THREE from "three";
import { frame, inRange, makeNearest, newFrame, sample, smoothstep, type World } from "./track";

export const GRASS = ["#B7CB8F", "#A6BF82", "#C4D09A", "#D6CC94", "#AFC48A"];
const SLOPE = "#9FB680";
const CUT = "#BDBF8E";
const CESS = "#BDB4A3";

export type Terrain = {
  /** Ground height used for placing props (earthworks applied). */
  H: (x: number, z: number) => number;
  natural: (x: number, z: number) => number;
  nearest: (x: number, z: number) => [number, number];
  grid: THREE.BufferGeometry;
  strip: THREE.BufferGeometry;
  /** River: a strip along the valley floor. */
  river: THREE.BufferGeometry;
  size: { minX: number; maxX: number; minZ: number; maxZ: number };
};

export const FLAT = 6; // half-width of the level formation
const SLOPE_RATIO = 1.5;
const COVER = 14; // minimum cover over the tunnel

export function buildTerrain(w: World): Terrain {
  const nearest = makeNearest(w);
  const b = w.bounds;
  const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
  const rx = (b.maxX - b.minX) / 2 + 60, rz = (b.maxZ - b.minZ) / 2 + 60;

  // Feature anchors
  const f = newFrame();
  const vMid = (w.viaduct.from + w.viaduct.to) / 2;
  frame(w, vMid, f, true);
  const valley = { x: f.px, z: f.pz, fx: f.fx, fz: f.fz, half: (w.viaduct.to - w.viaduct.from) / 2 };
  const hillPts: [number, number][] = [];
  for (let s = w.tunnel.from - 40; s <= w.tunnel.to + 40; s += 25) { const p = sample(w, s); hillPts.push([p.x, p.z]); }
  const cutPts: [number, number][] = [];
  for (let s = w.cutting.from; s <= w.cutting.to; s += 25) { const p = sample(w, s); cutPts.push([p.x, p.z]); }
  const ridge = (pts: [number, number][], x: number, z: number, amp: number, sig: number) => {
    let m = 0;
    for (const [px, pz] of pts) { const d2 = (px - x) ** 2 + (pz - z) ** 2; const g = Math.exp(-d2 / (2 * sig * sig)); if (g > m) m = g; }
    return amp * m;
  };

  const natural = (x: number, z: number) => {
    let h = 2.6 * Math.sin(x * 0.0061 + 1.3) * Math.cos(z * 0.0053) + 1.8 * Math.sin(x * 0.0127 + z * 0.0093) + 1.1 * Math.cos(z * 0.019 - x * 0.0043);
    // hills around the edge of the world
    const e = Math.hypot((x - cx) / rx, (z - cz) / rz);
    h += smoothstep(1.0, 1.55, e) * (16 + 8 * Math.sin(x * 0.004 + z * 0.006));
    // valley under the viaduct (runs across the line)
    const along = (x - valley.x) * valley.fx + (z - valley.z) * valley.fz;
    h -= 15 * Math.exp(-(along * along) / (2 * (valley.half * 0.55) ** 2));
    h += ridge(hillPts, x, z, 26, 85);
    h += ridge(cutPts, x, z, 9, 70);
    return h;
  };

  /** Earthworks for a point at distance d from the line at s. */
  const shaped = (nat: number, d: number, s: number) => {
    const h = w.h[s];
    if (inRange(w, s, w.viaduct)) return Math.min(nat, h - 4);
    if (inRange(w, s, w.tunnel)) return Math.max(nat, h + COVER);
    const allow = Math.max(0, d - FLAT) / SLOPE_RATIO;
    return Math.min(h - 0.12 + allow, Math.max(h - 0.12 - allow, nat));
  };

  const H = (x: number, z: number) => {
    const nat = natural(x, z);
    const [d, s] = nearest(x, z);
    if (d === Infinity) return nat;
    return shaped(nat, d, s);
  };

  const fieldColour = (x: number, z: number) => {
    // a rotated patchwork of fields
    const u = x * 0.8 + z * 0.6, vv = -x * 0.6 + z * 0.8;
    const i = Math.floor(u / 95), j = Math.floor(vv / 70);
    const hsh = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
    return GRASS[Math.floor(hsh * GRASS.length)];
  };

  const col = new THREE.Color();
  // ---- coarse grid ----
  const M = 380, CELL = 14;
  const minX = b.minX - M, maxX = b.maxX + M, minZ = b.minZ - M, maxZ = b.maxZ + M;
  const nx = Math.ceil((maxX - minX) / CELL) + 1, nz = Math.ceil((maxZ - minZ) / CELL) + 1;
  const gp = new Float32Array(nx * nz * 3), gc = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = minX + i * CELL, z = minZ + j * CELL, k = (j * nx + i) * 3;
    const nat = natural(x, z);
    const [d, s] = nearest(x, z);
    let y = nat;
    if (d !== Infinity) {
      const sh = shaped(nat, d, s);
      // under the fine strip the grid is pushed down out of sight
      y = d < 36 ? Math.min(sh, w.h[s]) - 6 : sh;
    }
    gp[k] = x; gp[k + 1] = y; gp[k + 2] = z;
    col.set(fieldColour(x, z));
    gc[k] = col.r; gc[k + 1] = col.g; gc[k + 2] = col.b;
  }
  const gi: number[] = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, bb = a + 1, c = a + nx, d = c + 1;
    gi.push(a, c, bb, bb, c, d);
  }
  const grid = new THREE.BufferGeometry();
  grid.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  grid.setAttribute("color", new THREE.BufferAttribute(gc, 3));
  grid.setIndex(gi);
  grid.computeVertexNormals();

  // ---- fine strip along the line ----
  const lats = [-44, -35, -27, -21, -16, -12, -9.5, -7, -4.5, -2, 2, 4.5, 7, 9.5, 12, 16, 21, 27, 35, 44];
  const rowsS: number[] = [];
  for (let s = 0; s < w.L; s += 5) rowsS.push(s);
  const t = w.tunnel;
  const PORTAL = 6;
  rowsS.push(t.from - PORTAL, t.from, t.to, t.to + PORTAL);
  rowsS.sort((a, b2) => a - b2);
  const skip = (s0: number, s1: number, l0: number, l1: number) =>
    Math.max(Math.abs(l0), Math.abs(l1)) <= 9.5 && ((s0 >= t.from - PORTAL - 0.01 && s1 <= t.from + 0.01) || (s0 >= t.to - 0.01 && s1 <= t.to + PORTAL + 0.01));
  const nl = lats.length;
  const sp = new Float32Array(rowsS.length * nl * 3), sc = new Float32Array(rowsS.length * nl * 3);
  for (let r = 0; r < rowsS.length; r++) {
    const s = rowsS[r];
    frame(w, s, f, true);
    const si = Math.floor(s) % w.n;
    for (let c = 0; c < nl; c++) {
      const lat = lats[c];
      const x = f.px + f.rx * lat, z = f.pz + f.rz * lat;
      const nat = natural(x, z);
      const y = shaped(nat, Math.abs(lat), si);
      const k = (r * nl + c) * 3;
      sp[k] = x; sp[k + 1] = y; sp[k + 2] = z;
      const dev = Math.abs(y - nat);
      const hex = Math.abs(lat) < 5 && !inRange(w, si, w.viaduct) ? CESS : dev > 0.6 ? (y < nat ? CUT : SLOPE) : fieldColour(x, z);
      col.set(hex);
      sc[k] = col.r; sc[k + 1] = col.g; sc[k + 2] = col.b;
    }
  }
  const si2: number[] = [];
  const rows = rowsS.length;
  for (let r = 0; r < rows; r++) {
    const r2 = (r + 1) % rows;
    let s0 = rowsS[r], s1 = rowsS[r2];
    if (r2 === 0) s1 += w.L;
    if (s1 - s0 < 0.01) continue;
    for (let c = 0; c < nl - 1; c++) {
      if (skip(s0, s1, lats[c], lats[c + 1])) continue;
      const a = r * nl + c, bb = a + 1, cc = r2 * nl + c, d = cc + 1;
      si2.push(a, bb, cc, bb, d, cc);
    }
  }
  const strip = new THREE.BufferGeometry();
  strip.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  strip.setAttribute("color", new THREE.BufferAttribute(sc, 3));
  strip.setIndex(si2);
  strip.computeVertexNormals();

  // ---- river along the valley floor ----
  const rp: number[] = [];
  const rxv = -valley.fz, rzv = valley.fx; // across the line = along the valley
  const pts: THREE.Vector3[] = [];
  for (let u = -900; u <= 900; u += 20) {
    const x = valley.x + rxv * u, z = valley.z + rzv * u;
    pts.push(new THREE.Vector3(x, H(x, z) + 0.5, z));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const wdt = 7;
    const ox = valley.fx * wdt, oz = valley.fz * wdt;
    rp.push(a.x - ox, a.y, a.z - oz, c.x - ox, c.y, c.z - oz, a.x + ox, a.y, a.z + oz);
    rp.push(a.x + ox, a.y, a.z + oz, c.x - ox, c.y, c.z - oz, c.x + ox, c.y, c.z + oz);
  }
  const river = new THREE.BufferGeometry();
  river.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
  river.computeVertexNormals();

  return { H, natural, nearest, grid, strip, river, size: { minX, maxX, minZ, maxZ } };
}
