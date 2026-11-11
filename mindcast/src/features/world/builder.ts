/**
 * Merged-geometry builder for the illustrated world.
 *
 * Every static prop is baked into one vertex-coloured triangle buffer plus one buffer of ink
 * outline segments (from EdgesGeometry), so the whole scenery costs two draw calls.
 */
import * as THREE from "three";

const v = new THREE.Vector3();
const nv = new THREE.Vector3();
const nm = new THREE.Matrix3();

export class Builder {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  lines: number[] = [];
  private colors = new Map<string, THREE.Color>();
  private edgeCache = new WeakMap<THREE.BufferGeometry, Map<number, Float32Array>>();
  private flatCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

  color(hex: string) {
    let c = this.colors.get(hex);
    if (!c) this.colors.set(hex, (c = new THREE.Color(hex)));
    return c;
  }

  private edgesOf(geo: THREE.BufferGeometry, angle: number) {
    let m = this.edgeCache.get(geo);
    if (!m) this.edgeCache.set(geo, (m = new Map()));
    let e = m.get(angle);
    if (!e) {
      const eg = new THREE.EdgesGeometry(geo, angle);
      e = new Float32Array(eg.attributes.position.array as ArrayLike<number>);
      eg.dispose();
      m.set(angle, e);
    }
    return e;
  }

  private flat(geo: THREE.BufferGeometry) {
    let g = this.flatCache.get(geo);
    if (!g) {
      g = geo.index ? geo.toNonIndexed() : geo;
      if (!g.attributes.normal) g.computeVertexNormals();
      this.flatCache.set(geo, g);
    }
    return g;
  }

  /** Bake a geometry with a matrix and a flat colour. `edge` is the outline angle in degrees, or false. */
  add(geo: THREE.BufferGeometry, hex: string, m: THREE.Matrix4, edge: number | false = 30) {
    const g = this.flat(geo);
    nm.getNormalMatrix(m);
    const p = g.attributes.position, n = g.attributes.normal, c = this.color(hex);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m);
      nv.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      this.pos.push(v.x, v.y, v.z);
      this.nor.push(nv.x, nv.y, nv.z);
      this.col.push(c.r, c.g, c.b);
    }
    if (edge !== false) {
      const e = this.edgesOf(geo, edge);
      for (let i = 0; i < e.length; i += 3) {
        v.set(e[i], e[i + 1], e[i + 2]).applyMatrix4(m);
        this.lines.push(v.x, v.y, v.z);
      }
    }
  }

  /** A raw triangle (counter-clockwise seen from the front). */
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, hex: string) {
    const col = this.color(hex);
    nv.subVectors(c, b).cross(v.subVectors(a, b)).normalize();
    for (const p of [a, b, c]) {
      this.pos.push(p.x, p.y, p.z);
      this.nor.push(nv.x, nv.y, nv.z);
      this.col.push(col.r, col.g, col.b);
    }
  }

  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, hex: string) {
    this.tri(a, b, c, hex);
    this.tri(a, c, d, hex);
  }

  line(a: THREE.Vector3, b: THREE.Vector3) {
    this.lines.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }

  meshGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }

  lineGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.lines, 3));
    g.computeBoundingSphere();
    return g;
  }
}

/** Shared unit primitives (scaled by the matrix). */
export const PRIM = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cylLo: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 7),
  pyramid: (() => { const g = new THREE.ConeGeometry(0.5 * Math.SQRT2, 1, 4); g.rotateY(Math.PI / 4); return g; })(),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  disc: new THREE.CircleGeometry(0.5, 14),
  /** Triangular prism for pitched roofs: ridge along x, spans z from -0.5 to 0.5, height 1. */
  roof: (() => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.lineTo(-0.5, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.rotateY(Math.PI / 2);
    return g;
  })(),
};

const q = new THREE.Quaternion();
const e = new THREE.Euler();
const pv = new THREE.Vector3();
const sv = new THREE.Vector3();
/** Matrix from position, yaw (around y), scale, and optional pitch/roll. */
export function trs(x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, pitch = 0, roll = 0, out = new THREE.Matrix4()) {
  e.set(roll, yaw, pitch, "YXZ");
  // Euler order YXZ: yaw, then roll about x, then pitch about z
  q.setFromEuler(e);
  return out.compose(pv.set(x, y, z), q, sv.set(sx, sy, sz));
}

/** Seeded random numbers so the world looks the same every time. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
