/**
 * The same to-scale models as the side views, built as a THREE.Group with toon shading
 * and ink edge outlines. Units are metres; x runs along the train (front at -x), y is up.
 * Ported from the Groundwork web prototype (build3D).
 */
import * as THREE from "three";
import { drawLogoCanvas, drawPlateCanvas } from "./labels";
import { shownLen, type DrawSpec, type EndStyle, type Livery } from "./model";

type Pt = [number, number];
export type Built = { group: THREE.Group; len: number; h: number; dispose: () => void };

const DARK = "#2A2E33", GLASS = "#BFD9EA", YELLOW = "#F2C230";

/**
 * @param labels draw nameplate and logo textures (needs a 2D canvas; web only).
 */
export function build3D(spec: DrawSpec, L: Livery, opts: { ink: string; labels: boolean }): Built {
  const root = new THREE.Group();
  let target: THREE.Group = root;
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], texs: THREE.Texture[] = [];
  const matCache: Record<string, THREE.MeshToonMaterial> = {};
  const mat = (hex: string) => {
    if (!matCache[hex]) { matCache[hex] = new THREE.MeshToonMaterial({ color: new THREE.Color(hex) }); mats.push(matCache[hex]); }
    return matCache[hex];
  };
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(opts.ink) });
  mats.push(lineMat);
  const add = (geo: THREE.BufferGeometry, hex: string, x = 0, y = 0, z = 0, rot?: [number, number, number]) => {
    const m = new THREE.Mesh(geo, mat(hex));
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    const eg = new THREE.EdgesGeometry(geo, 28);
    m.add(new THREE.LineSegments(eg, lineMat));
    geos.push(geo, eg);
    target.add(m);
    return m;
  };
  const box = (w: number, h: number, d: number, hex: string, x: number, y: number, z: number) => add(new THREE.BoxGeometry(Math.max(0.001, w), Math.max(0.001, h), Math.max(0.001, d)), hex, x, y, z);
  const cylX = (r: number, len: number, hex: string, x: number, y: number, z: number) => add(new THREE.CylinderGeometry(r, r, len, 22), hex, x, y, z, [0, 0, Math.PI / 2]);
  const cylZ = (r: number, len: number, hex: string, x: number, y: number, z: number) => add(new THREE.CylinderGeometry(r, r, len, 22), hex, x, y, z, [Math.PI / 2, 0, 0]);
  const cylY = (r: number, h: number, hex: string, x: number, y: number, z: number) => add(new THREE.CylinderGeometry(r, r, h, 18), hex, x, y, z);
  const ext = (pts: Pt[], width: number, hex: string, z = 0) => {
    const sh = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: false });
    geo.translate(0, 0, -width / 2 + z);
    return add(geo, hex);
  };

  const m = spec.model, body = L.body, stripe = L.stripe;
  const ends = (m.ends && m.ends.length ? m.ends : ["flat", "flat"]) as EndStyle[];
  const W = /tube|metro/i.test(spec.type) && spec.h < 3 ? 2.6 : 2.75;
  const wheel = (x: number, d: number, hexC?: string) => [-0.72, 0.72].forEach((z) => { cylZ(d / 2, 0.13, "#1A1C1F", x, d / 2, z); cylZ((d / 2) * 0.72, 0.15, hexC || "#8A9099", x, d / 2, z); });
  const bogie = (x: number, ax: number, d = 0.92, sp?: number) => {
    const spc = sp || (ax === 3 ? 2.0 : 2.6), len = (ax - 1) * spc + d + 0.6;
    [-1.0, 1.0].forEach((z) => box(len, 0.35, 0.12, DARK, x, d / 2 + 0.05, z));
    for (let i = 0; i < ax; i++) wheel(x - ((ax - 1) * spc) / 2 + i * spc, d);
  };
  const prof = (x0: number, len: number, top: number, bot: number, endL: EndStyle, endR: EndStyle): Pt[] => {
    const xL = x0, xR = x0 + len;
    const p = (style: EndStyle, side: "L" | "R"): Pt[] => {
      const s = side === "L" ? 1 : -1, xe = side === "L" ? xL : xR;
      if (style === "aero") return [[xe, bot + 0.25], [xe + s * 0.6, bot + 1.0], [xe + s * 2.2, top - 0.55], [xe + s * 4.6, top]];
      if (style === "slope") return [[xe, bot], [xe, bot + 1.35], [xe + s * 0.35, top - 0.95], [xe + s * 1.15, top]];
      if (style === "round") return [[xe, bot], [xe, top - 0.7], [xe + s * 0.25, top - 0.25], [xe + s * 0.8, top]];
      if (style === "tram") return [[xe, bot], [xe, bot + 0.9], [xe + s * 0.5, top - 0.6], [xe + s * 1.1, top]];
      if (style === "nose") return [[xe, bot], [xe, bot + 1.55], [xe + s * 0.2, bot + 1.75], [xe + s * 2.3, bot + 1.75], [xe + s * 2.3, top - 0.35], [xe + s * 2.6, top]];
      if (style === "none") return [[xe, bot], [xe, top]];
      return [[xe, bot], [xe, top - 0.5], [xe + s * 0.35, top]];
    };
    return p(endL, "L").concat(p(endR, "R").reverse());
  };
  const cabFront = (style: EndStyle, xe: number, s: number, top: number, bot: number) => {
    if (style === "none") return;
    if (style === "aero") {
      ext([[xe, bot + 0.25], [xe + s * 0.6, bot + 1.0], [xe + s * 1.6, bot + 1.5], [xe + s * 1.6, bot + 0.25]], W + 0.04, YELLOW);
      ext([[xe + s * 2.0, top - 0.7], [xe + s * 3.4, top - 0.18], [xe + s * 3.4, top - 0.85]], W + 0.04, GLASS);
      return;
    }
    if (style === "nose") { box(0.06, 1.2, W * 0.9, YELLOW, xe + s * 0.03, bot + 0.9, 0); box(0.06, 0.6, W * 0.8, GLASS, xe + s * 2.33, top - 0.65, 0); return; }
    box(0.06, style === "round" ? 0.9 : 1.2, W * 0.86, YELLOW, xe, bot + (style === "round" ? 0.55 : 0.75), 0);
    box(0.06, 0.75, W * 0.8, GLASS, xe + s * (style === "slope" ? 0.55 : style === "tram" ? 0.75 : 0.18), top - 0.55, 0);
  };
  const sideBits = (x0: number, len: number, top: number, bot: number, doorsAt: number[], dw: number, cabL: number, cabR: number, tube?: boolean) => {
    [-1, 1].forEach((sd) => {
      const z = sd * (W / 2 + 0.012), winTop = top - (tube ? 0.55 : 0.75), winBot = bot + (tube ? 0.95 : 1.15);
      const pos = doorsAt.map((p) => x0 + p).sort((a, b) => a - b), segs: Pt[] = [];
      let st = x0 + cabL + 0.6;
      pos.forEach((p) => { segs.push([st, p - dw / 2 - 0.4]); st = p + dw / 2 + 0.4; });
      segs.push([st, x0 + len - cabR - 0.6]);
      segs.forEach(([a, b]) => { const span = b - a; if (span < 1) return; const n = Math.max(1, Math.round(span / 2.1)), w = span / n; for (let i = 0; i < n; i++) box(w - 0.24, winTop - winBot, 0.02, GLASS, a + i * w + w / 2, (winTop + winBot) / 2, z); });
      pos.forEach((p) => { box(dw, top - 0.45 - bot - 0.15, 0.04, body, p, (top - 0.45 + bot + 0.15) / 2, z + sd * 0.01); box(dw * 0.8, 0.8, 0.02, GLASS, p, top - 1.05, z + sd * 0.03); });
      box(len - 0.6, 0.18, 0.02, stripe, x0 + len / 2, bot + 0.5, z + sd * 0.005);
    });
  };
  const panto = (x: number, top: number) => {
    box(2.4, 0.15, 1.2, DARK, x, top + 0.08, 0);
    const pts = [[x - 0.9, top + 0.15], [x + 0.5, top + 1.1], [x + 0.5, top + 1.1], [x - 0.4, top + 1.7]].map(([a, b]) => new THREE.Vector3(a, b, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geos.push(geo);
    target.add(new THREE.LineSegments(geo, lineMat));
    box(1.9, 0.06, 1.6, DARK, x - 0.3, top + 1.72, 0);
  };
  const labelPlane = (draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, x: number, y: number, side: number) => {
    if (!opts.labels || typeof document === "undefined") return;
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = Math.round((512 * h) / w);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    draw(ctx, cv.width, cv.height);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    texs.push(tex);
    const pm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
    mats.push(pm);
    const pg = new THREE.PlaneGeometry(w, h);
    geos.push(pg);
    [-1, 1].forEach((sd) => { const mm = new THREE.Mesh(pg, pm); mm.position.set(x, y, sd * (side + 0.03)); if (sd < 0) mm.rotation.y = Math.PI; target.add(mm); });
  };
  const nameplate3 = (x: number, y: number, side: number) => { if (!L.name) return; const w = Math.max(2.2, L.name.length * 0.17 + 0.5); labelPlane((c, cw, ch) => drawPlateCanvas(c, cw, ch, L.name || ""), w, 0.45, x, y, side); };
  const logo3 = (x: number, y: number, side: number) => { if (!L.logo || L.logo === "none" || L.logo === "image") return; labelPlane((c, cw, ch) => drawLogoCanvas(c, cw, ch, L), 0.9, 0.9, x, y, side); };

  const shown = shownLen(spec);
  // track: ballast, sleepers, rails (street for trams)
  const trackLen = shown + 8, tram = /tram/i.test(spec.type) || !!m.tram || m.kind === "tram7";
  if (tram) box(trackLen, 0.2, 6, "#B9B4AA", 0, -0.1, 0);
  else {
    const bed = new THREE.Shape();
    bed.moveTo(-2.4, -0.4); bed.lineTo(2.4, -0.4); bed.lineTo(1.7, -0.1); bed.lineTo(-1.7, -0.1);
    const bg = new THREE.ExtrudeGeometry(bed, { depth: trackLen, bevelEnabled: false });
    bg.rotateY(Math.PI / 2); bg.translate(-trackLen / 2, 0, 0);
    add(bg, "#9A958C");
    for (let x = -trackLen / 2 + 0.3; x < trackLen / 2; x += 0.65) box(0.28, 0.16, 2.5, "#C9C4BA", x, -0.07, 0);
  }
  [-0.72, 0.72].forEach((z) => box(trackLen, 0.12, 0.07, "#7D858E", 0, tram ? -0.05 : 0.0, z));

  const G = new THREE.Group();
  G.position.set(-shown / 2, tram ? 0.01 : 0.06, 0); // wheels sit on the rail tops
  root.add(G);
  target = G;

  if (m.kind === "hood") {
    const fl = 1.15;
    box(5.6, 2.95 - fl, 2.2, body, 3.1, (2.95 + fl) / 2, 0);
    box(2.8, spec.h - fl, W, body, 7.3, (spec.h + fl) / 2, 0);
    [6.75, 7.85].forEach((x) => [-1, 1].forEach((sd) => box(0.9, 0.8, 0.02, GLASS, x, spec.h - 0.65, sd * (W / 2 + 0.01))));
    box(8.4, 0.25, W, DARK, 4.5, fl - 0.1, 0);
    box(8.4, 0.12, W + 0.02, stripe, 4.5, fl + 0.45, 0);
    [1.7, 3.3, 4.9].forEach((x) => wheel(x, 1.37));
    cylY(0.15, 0.4, DARK, 1.65, 3.15, 0);
    nameplate3(3.1, 2.1, 1.12); logo3(7.3, 2.4, W / 2 + 0.02);
  } else if (m.kind === "loco") {
    const fl = 1.15, eR = ends[1] || ends[0];
    ext(prof(0, spec.len, spec.h, fl, ends[0], eR), W, body);
    cabFront(ends[0], 0, 1, spec.h, fl); cabFront(eR, spec.len, -1, spec.h, fl);
    [-1, 1].forEach((sd) => box(spec.len - 1, 0.18, 0.02, stripe, spec.len / 2, fl + 0.55, sd * (W / 2 + 0.012)));
    box(spec.len - 0.4, 0.3, W - 0.2, DARK, spec.len / 2, fl - 0.15, 0);
    (m.roof || []).forEach(([t, f]) => { const x = spec.len * f; if (t === "panto") panto(x, spec.h); if (t === "fan") cylY(0.7, 0.12, DARK, x, spec.h + 0.06, 0); if (t === "exhaust") box(0.4, 0.25, 0.6, DARK, x, spec.h + 0.12, 0); if (t === "ac") box(3, 0.15, 1.6, "#8A9099", x, spec.h + 0.08, 0); });
    const diesel = spec.power.startsWith("Diesel");
    if (diesel) box(spec.len * 0.28, 0.55, 1.8, DARK, spec.len / 2, fl - 0.3, 0);
    const ax = m.axles === 3 ? 3 : 2;
    (ax === 3 ? [spec.len * 0.21, spec.len * 0.79] : [spec.len * 0.24, spec.len * 0.76]).forEach((x) => bogie(x, ax, ax === 3 ? 1.07 : 1.1));
    [0, spec.len].forEach((x) => [-0.88, 0.88].forEach((z) => cylX(0.18, 0.5, DARK, x + (x ? 0.2 : -0.2), 1.06, z)));
    const inset = ends[0] === "aero" ? 4.8 : ends[0] === "nose" ? 3.3 : 2.0, insetR = eR === "nose" ? 3.3 : 2.0;
    [-1, 1].forEach((sd) => {
      const z = sd * (W / 2 + 0.012);
      [inset - 0.9, spec.len - insetR + 0.9].forEach((x) => box(0.8, 0.7, 0.02, GLASS, x, spec.h - 0.75, z));
      [inset + 0.3, spec.len - insetR - 0.3].forEach((x) => box(0.6, spec.h - 0.75 - fl - 0.1, 0.03, body, x, (spec.h - 0.75 + fl + 0.1) / 2, z + sd * 0.01));
      if (diesel) box(spec.len * 0.36, 0.8, 0.02, "#3A3F45", spec.len / 2, spec.h - 1.1, z + sd * 0.004);
    });
    nameplate3(spec.len / 2, fl + 1.0, W / 2 + 0.02); logo3(spec.len * 0.8, fl + 1.35, W / 2 + 0.02);
  } else if (m.kind === "steam") {
    type C = { E: number; T: number; bog: number[]; drv: number[]; tr: number[]; drD: number; rp: number; bc: number; br: number; sb: Pt; ba: Pt; fb: Pt; cab: Pt; ch: number; tAx: number };
    const st = m.style || "lms";
    const P3: C = ({
      gwr: { E: 12.4, T: 7.2, bog: [1.6, 3.73], drv: [5.5, 7.75, 10.0], tr: [], drD: 2.04, rp: 1.6, bc: 2.6, br: 0.82, sb: [0.8, 2.6], ba: [2.6, 8.6], fb: [8.6, 10.6], cab: [10.6, 12.35], ch: 1.75, tAx: 3 },
      lms: { E: 12.0, T: 7.1, bog: [1.4, 3.38], drv: [4.75, 7.1, 9.45], tr: [], drD: 1.83, rp: 2.05, bc: 2.72, br: 0.8, sb: [0.7, 2.4], ba: [2.4, 8.1], fb: [8.1, 10.2], cab: [10.2, 11.95], ch: 1.5, tAx: 3 },
      a4: { E: 13.4, T: 8.0, bog: [1.5, 3.4], drv: [5.45, 7.66, 9.87], tr: [11.95], drD: 2.03, rp: 1.55, bc: 2.95, br: 0.85, sb: [0.8, 2.6], ba: [2.6, 9.0], fb: [9.0, 11.0], cab: [11.0, 13.35], ch: 2.0, tAx: 4 },
    } as Record<string, C>)[st];
    const tx0 = P3.E + 0.25, frTop = st === "lms" ? P3.rp : 1.6;
    box(P3.E - 0.4, frTop - 0.9, 1.3, DARK, P3.E / 2 + 0.1, (frTop + 0.9) / 2, 0);
    P3.bog.forEach((x) => wheel(x, 0.97, DARK)); P3.tr.forEach((x) => wheel(x, 1.12, DARK)); P3.drv.forEach((x) => wheel(x, P3.drD, body));
    [-1, 1].forEach((sd) => box(P3.drv[2] - P3.drv[0], 0.1, 0.06, "#B9BEC5", (P3.drv[0] + P3.drv[2]) / 2, P3.drD * 0.32, sd * 0.86));
    box(0.3, 0.62, 2.7, "#B23A3A", 0.45, 1.24, 0);
    [-0.88, 0.88].forEach((z) => cylX(0.17, 0.4, DARK, 0.15, 1.06, z));
    box(P3.T - 0.4, 0.42, 2.4, DARK, tx0 + P3.T / 2, 1.1, 0);
    for (let i = 0; i < P3.tAx; i++) wheel(tx0 + 1.0 + i * ((P3.T - 2.0) / (P3.tAx - 1)), 1.27, DARK);
    if (st === "a4") {
      const pts: Pt[] = [];
      const q = (a: Pt, b: Pt, c: Pt, n = 8) => { for (let i = 1; i <= n; i++) { const t = i / n; pts.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]]); } };
      pts.push([0.3, 1.55]); q([0.3, 1.55], [0.4, 2.9], [1.6, 3.55]); q([1.6, 3.55], [2.8, 3.95], [4.6, 3.97]); pts.push([P3.cab[1], 3.97], [P3.cab[1], 1.62], [0.3, 1.62]);
      ext(pts, 2.7, body);
      box(P3.cab[1] - 2.2, 0.06, 2.72, stripe, (P3.cab[1] + 2.2) / 2, 2.2, 0);
      [-1, 1].forEach((sd) => box(0.9, 0.6, 0.02, GLASS, P3.cab[0] + 0.6, 3.55, sd * 1.36));
      box(P3.T, 3.92 - 1.3, 2.7, body, tx0 + P3.T / 2, (3.92 + 1.3) / 2, 0);
      box(P3.T - 0.6, 0.06, 2.72, stripe, tx0 + P3.T / 2, 2.25, 0);
    } else {
      const rpY = P3.rp;
      box(P3.E - 0.5, 0.1, 2.6, DARK, P3.E / 2 + 0.25, rpY + 0.05, 0);
      cylX(P3.br, P3.ba[1] - P3.ba[0], body, (P3.ba[0] + P3.ba[1]) / 2, P3.bc, 0);
      cylX(P3.br + 0.06, P3.sb[1] - P3.sb[0], DARK, (P3.sb[0] + P3.sb[1]) / 2, P3.bc, 0);
      box(P3.fb[1] - P3.fb[0], P3.bc + P3.br + 0.15 - rpY, 2.1, body, (P3.fb[0] + P3.fb[1]) / 2, (P3.bc + P3.br + 0.15 + rpY) / 2, 0);
      // boiler support so the barrel does not float above the running plate
      box(P3.ba[1] - P3.ba[0], Math.max(0.05, P3.bc - rpY), 1.0, DARK, (P3.ba[0] + P3.ba[1]) / 2, (P3.bc + rpY) / 2, 0);
      cylY(0.27, 3.95 - P3.bc - P3.br + 0.15, DARK, P3.ch, (3.95 + P3.bc + P3.br - 0.15) / 2, 0);
      if (m.copper) cylY(0.33, 0.18, "#C9773F", P3.ch, 3.95, 0);
      if (st === "gwr") cylY(0.28, 0.45, "#D9A441", 6.3, P3.bc + P3.br + 0.15, 0);
      else cylY(0.45, 0.35, body, 6.0, P3.bc + P3.br + 0.12, 0);
      if (st === "gwr") P3.drv.forEach((x) => [-1, 1].forEach((sd) => cylZ(P3.drD / 2 + 0.08, 0.35, body, x, rpY + 0.02, sd * 1.12)));
      const cb = P3.cab;
      box(cb[1] - cb[0], 3.85 - rpY, 2.7, body, (cb[0] + cb[1]) / 2, (3.85 + rpY) / 2, 0);
      box(cb[1] - cb[0] + 0.5, 0.14, 2.9, DARK, (cb[0] + cb[1]) / 2 + 0.1, 3.95, 0);
      [-1, 1].forEach((sd) => box(0.55, 0.5, 0.02, GLASS, cb[0] + 0.45, 3.35, sd * 1.36));
      box(P3.T - 0.2, 3.3 - 1.3, 2.6, body, tx0 + P3.T / 2 - 0.1, 2.3, 0);
      const coal = new THREE.CylinderGeometry(1.0, 1.0, 4.0, 16, 1, false, 0, Math.PI);
      coal.rotateZ(Math.PI / 2); coal.rotateX(-Math.PI / 2); coal.scale(1, 0.4, 1.1);
      add(coal, "#2A2A2A", tx0 + 2.6, 3.3, 0);
      [-1, 1].forEach((sd) => box(P3.T - 1, 0.06, 0.02, stripe, tx0 + P3.T / 2, 2.35, sd * 1.32));
    }
    nameplate3(P3.drv[1], st === "lms" ? P3.rp + 0.55 : st === "a4" ? 2.75 : P3.drD + 0.45, st === "a4" ? 1.36 : 1.32);
    logo3(tx0 + P3.T / 2, 2.75, st === "a4" ? 1.36 : 1.31);
  } else if (m.kind === "unit" || m.kind === "nmt" || m.kind === "mpv") {
    const flH = m.tube ? 0.75 : m.tram ? 0.35 : 1.15;
    for (let c = 0; c < 2; c++) {
      const x0 = c * (spec.len + 0.6), lead = c === 0;
      if (m.kind === "mpv") {
        box(spec.len, 0.5, 2.6, DARK, x0 + spec.len / 2, 1.35, 0);
        const cx = lead ? x0 + 2 : x0 + spec.len - 2;
        box(4, spec.h - 1.6, 2.7, body, cx, (spec.h + 1.6) / 2, 0);
        box(13, 1.6, 2.4, lead ? "#D7DBE0" : body, lead ? x0 + 11.5 : x0 + 7.5, 2.4, 0);
        [x0 + 3, x0 + spec.len - 3].forEach((x) => bogie(x, 2, 0.92));
        cylY(0.18, 0.2, "#F59E0B", cx, spec.h + 0.1, 0);
        if (!lead) { nameplate3(x0 + 7.5, 2.3, 1.22); logo3(x0 + 12.6, 2.4, 1.22); }
        continue;
      }
      if (m.kind === "nmt" && !lead) {
        const cl = 23;
        box(cl, spec.h - 1.15, W, body, x0 + cl / 2, (spec.h + 1.15) / 2, 0);
        [-1, 1].forEach((sd) => [2.2, 5.0, 16.4, 19.2].forEach((p) => box(1.6, 0.9, 0.02, GLASS, x0 + p + 0.8, spec.h - 0.75, sd * (W / 2 + 0.01))));
        add(new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#D7DBE0", x0 + 10.5, spec.h, 0);
        [x0 + 3, x0 + cl - 3].forEach((x) => bogie(x, 2, 0.92));
        nameplate3(x0 + 11.5, 2.45, W / 2 + 0.02);
        continue;
      }
      const e0: EndStyle = m.kind === "nmt" ? "aero" : ends[0];
      const endL: EndStyle = lead ? e0 : "none";
      const endR: EndStyle = lead ? "none" : e0 !== "aero" && m.artic ? (m.tram ? "tram" : e0) : "none";
      const h = spec.h;
      if (m.tube) {
        const pts: Pt[] = [[x0, flH], [x0, h - 0.7]];
        for (let i = 1; i <= 6; i++) { const a = Math.PI - (i * Math.PI) / 12; pts.push([x0 + 1.4 + Math.cos(a) * 1.4, h - 0.7 + Math.sin(a) * 0.7]); }
        for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 - (i * Math.PI) / 12; pts.push([x0 + spec.len - 1.4 + Math.cos(a) * 1.4, h - 0.7 + Math.sin(a) * 0.7]); }
        pts.push([x0 + spec.len, flH]);
        ext(pts, W, body);
        if (lead) { box(0.06, 0.8, W * 0.8, YELLOW, x0, flH + 0.6, 0); box(0.06, 0.7, W * 0.7, GLASS, x0, h - 0.6, 0); }
      } else {
        ext(prof(x0, spec.len, h, flH, endL, endR), W, body);
        cabFront(endL, x0, 1, h, flH); cabFront(endR, x0 + spec.len, -1, h, flH);
      }
      const cabL = lead ? (endL === "aero" ? 4.8 : 2.2) : 0, cabR = !lead && endR !== "none" ? 2.2 : 0;
      const nd = m.doors === "ends" ? 2 : m.doors || 2, dw = m.doors === "ends" ? 0.85 : 1.35;
      const doorsAt = m.kind === "nmt" ? [] : m.doors === "ends" ? [cabL + 1.0, spec.len - 1.0 - cabR] : Array.from({ length: nd }, (_, i) => cabL + ((spec.len - cabL - cabR) * (i + 1)) / (nd + 1));
      sideBits(x0, spec.len, h, flH, doorsAt, dw, cabL, cabR, m.tube);
      if (m.under || m.kind === "nmt") box(spec.len * 0.3, 0.5, 2.0, DARK, x0 + spec.len / 2, flH - 0.25, 0);
      (m.roof || []).forEach(([t, f]) => { if (t === "panto" && ((c === 1 && f <= 1) || (m.artic && c === 0 && f > 0.9))) panto(m.artic && f > 0.9 ? spec.len + 0.3 : x0 + spec.len * f, h); });
      const wd = m.tube ? 0.7 : m.tram ? 0.62 : 0.84;
      if (m.tram) [x0 + 2.2, x0 + spec.len - 2.2].forEach((x) => { box(2.4, 0.3, 2.3, DARK, x, 0.45, 0); wheel(x - 0.7, wd); wheel(x + 0.7, wd); });
      else if (m.artic && c === 0) { bogie(x0 + 2.5, 2, wd, 2.0); bogie(spec.len + 0.3, 2, wd, 2.0); }
      else if (m.artic && c === 1) bogie(x0 + spec.len - 2.5, 2, wd, 2.0);
      else if (m.kind === "nmt") [spec.len * 0.24, spec.len * 0.76].forEach((x) => bogie(x, 2, 1.1));
      else { bogie(x0 + (m.tube ? 2.6 : 3.2), 2, wd, m.tube ? 2.0 : 2.6); bogie(x0 + spec.len - (m.tube ? 2.6 : 3.2), 2, wd, m.tube ? 2.0 : 2.6); }
      if (!lead) { nameplate3(x0 + spec.len / 2, flH + 0.95, W / 2); logo3(x0 + 3.2, h - 0.55, W / 2); }
      if (lead && m.kind === "nmt") logo3(spec.len * 0.8, 2.5, W / 2 + 0.02);
    }
    if (m.artic) box(0.6, spec.h - 0.6 - flH, W - 0.3, "#3A3F45", spec.len + 0.3, (spec.h - 0.3 + flH + 0.3) / 2, 0);
  } else if (m.kind === "tram7") {
    const secs = [6.9, 4.6, 6.9, 4.6, 6.9, 4.6, 6.9], gap = 0.25, h = spec.h, fl = 0.35;
    const k = spec.len / (secs.reduce((a, b) => a + b, 0) + gap * (secs.length - 1));
    let x = 0;
    secs.forEach((raw, i) => {
      const len = raw * k, eL: EndStyle = i === 0 ? "tram" : "none", eR: EndStyle = i === secs.length - 1 ? "tram" : "none";
      ext(prof(x, len, h, fl, eL, eR), W, body);
      cabFront(eL, x, 1, h, fl); cabFront(eR, x + len, -1, h, fl);
      const cL = i === 0 ? 1.6 : 0, cR = i === secs.length - 1 ? 1.6 : 0;
      sideBits(x, len, h, fl, len > 5 ? [cL + (len - cL - cR) / 2] : [], 1.3, cL, cR);
      if (len > 5) { box(2.4, 0.3, 2.3, DARK, x + len / 2, 0.45, 0); wheel(x + len / 2 - 0.7, 0.62); wheel(x + len / 2 + 0.7, 0.62); }
      if (i === 3) panto(x + len / 2, h);
      if (i < secs.length - 1) box(gap * k, h - 0.6 - fl, W - 0.3, "#3A3F45", x + len + (gap * k) / 2, (h - 0.3 + fl + 0.3) / 2, 0);
      x += len + gap * k;
    });
    nameplate3(spec.len / 2, 2.2, W / 2 + 0.02);
  } else if (m.kind === "wagon") {
    const fl = 1.25, L0 = spec.len;
    box(L0 - 0.8, 0.35, 2.6, DARK, L0 / 2, fl - 0.17, 0);
    [3.0, L0 - 3.0].forEach((x) => bogie(x, 2, 0.92, 1.8));
    if (m.w === "box") box(L0 - 1.6, 3.3 - fl, 2.8, body, L0 / 2, (3.3 + fl) / 2, 0);
    if (m.w === "tank") {
      const top = Math.min(3.75, spec.h - 0.15), r = (top - 1.55) / 2;
      cylX(r, L0 - 1.4, body, L0 / 2, 1.55 + r, 0);
      [3, L0 / 2, L0 - 3].forEach((x) => box(0.8, 0.35, 1.6, DARK, x, 1.4, 0));
      [-1, 1].forEach((sd) => box(L0 - 2, 0.3, 0.02, stripe, L0 / 2, 2.8, sd * (r + 0.02)));
    }
    if (m.w === "cont") { const ch = Math.min(2.9, spec.h - fl); box(12.19, ch, 2.44, body, L0 / 2, fl + ch / 2, 0); }
    nameplate3(L0 / 2, m.w === "cont" ? fl + 1.6 : 2.6, m.w === "cont" ? 1.24 : m.w === "tank" ? 1.12 : 1.42);
  } else if (m.kind === "crane") {
    const fl = 1.3;
    box(spec.len - 0.6, 0.45, 2.7, DARK, spec.len / 2, fl - 0.2, 0);
    [3, spec.len / 2, spec.len - 3].forEach((x) => bogie(x, 2, 0.92, 1.8));
    box(8, 3.6 - fl, 2.8, body, 8, (3.6 + fl) / 2, 0);
    const jib = box(12.5, 0.45, 0.8, body, 11.3, 3.75, 0); jib.rotation.z = 0.03;
    box(3, 1.5, 2.6, DARK, 11.5, 2.25, 0);
    cylY(0.04, 1.8, DARK, 17.2, 2.9, 0);
    box(1.2, 0.3, 1.2, DARK, 17.2, 2.0, 0);
    nameplate3(8, 2.3, 1.42);
  } else if (m.kind === "legacy") {
    // engineering machines (simplified, to scale)
    const k = m.k, len = spec.len, h = spec.h, Y0 = 1.3;
    if (k === "hopper") {
      for (let i = 0; i < 3; i++) {
        const a = i * 12.2, b = a + 11.6, mid = (a + b) / 2;
        box(11.2, 0.3, 2.6, DARK, mid, 1.15, 0);
        bogie(a + 2.2, 2, 0.92, 1.8); bogie(b - 2.2, 2, 0.92, 1.8);
        ext([[a + 0.3, 2.0], [b - 0.3, 2.0], [b - 0.3, h], [a + 0.3, h]], 2.8, body);
        ext([[mid - 1.5, 1.3], [mid + 1.5, 1.3], [b - 1.2, 2.0], [a + 1.2, 2.0]], 2.5, body);
        const stones = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        stones.scale(5.2, 0.5, 1.25);
        add(stones, "#9A958C", mid, h, 0);
      }
    } else if (k === "rrv") {
      box(4.6, 0.4, 2.4, DARK, 6, 1.0, 0);
      [4.6, 7.4].forEach((x) => [-1.05, 1.05].forEach((z) => cylZ(0.62, 0.45, "#1A1C1F", x, 0.62, z)));
      [3.9, 8.1].forEach((x) => wheel(x, 0.5));
      box(3.4, 0.9, 2.4, body, 6, 1.75, 0);
      box(1.3, 1.6, 1.0, body, 4.8, 2.6, 0.6);
      const b1 = box(3.4, 0.35, 0.4, body, 8.6, 2.9, 0); b1.rotation.z = 0.45;
      const b2 = box(2.6, 0.3, 0.35, body, 10.6, 2.6, 0); b2.rotation.z = -0.75;
      box(0.7, 0.6, 0.9, DARK, 11.4, 1.6, 0);
    } else {
      box(len - 0.4, 0.35, 2.6, DARK, len / 2, Y0 - 0.15, 0);
      [-1, 1].forEach((sd) => box(len - 0.4, 0.14, 0.02, stripe, len / 2, Y0 + 0.05, sd * 1.31));
      bogie(2.8, 2, 0.92); bogie(len - 2.8, 2, 0.92);
      if (k === "tamper") {
        ext(prof(0, 4.5, h, Y0, "slope", "none"), W, body); cabFront("slope", 0, 1, h, Y0);
        ext(prof(len - 4.5, 4.5, h, Y0, "none", "slope"), W, body); cabFront("slope", len, -1, h, Y0);
        box(len - 9.4, 2.0, 2.6, body, len / 2, Y0 + 1.0, 0);
        box(2.6, 1.0, 2.4, DARK, len * 0.55, 0.65, 0);
        for (let i = 0; i < 4; i++) [-0.8, 0.8].forEach((z) => box(0.08, 0.5, 0.08, DARK, len * 0.55 - 0.9 + i * 0.6, 0.0, z));
        [4.5, len - 4.5].forEach((x) => cylY(0.18, 0.2, "#F59E0B", x - 1.8, h + 0.1, 0));
      }
      if (k === "stoneblower") {
        ext(prof(0, 4.2, h, Y0, "slope", "none"), W, body); cabFront("slope", 0, 1, h, Y0);
        ([[5, 11.5], [12.5, 19]] as Pt[]).forEach(([a, b]) => ext([[a, Y0], [a + 0.4, h], [b - 0.4, h], [b, Y0]], 2.6, body));
        box(2, 1.8, 2.4, body, 21, Y0 + 0.9, 0);
        [-0.6, 0, 0.6].forEach((z) => box(0.08, 1.1, 0.08, "#5A6069", 21, 0.6, z));
        ext(prof(len - 4.2, 4.2, h - 0.4, Y0, "none", "slope"), W, body); cabFront("slope", len, -1, h - 0.4, Y0);
      }
      if (k === "regulator") {
        box(len - 3, 1.0, 2.6, body, len / 2, Y0 + 0.5, 0);
        box(5, 1.6, 2.6, body, len / 2, Y0 + 1.8, 0);
        [-1, 1].forEach((sd) => box(4.4, 1.0, 0.02, GLASS, len / 2, Y0 + 1.9, sd * 1.31));
        ext([[0.2, 0.05], [1.6, Y0], [2.4, Y0], [2.4, 0.05]], 3.2, body);
        cylZ(0.75, 2.4, "#5A6069", len - 1.2, 0.8, 0);
      }
    }
  } else {
    ext(prof(0, spec.len, spec.h, 1.15, "flat", "flat"), W, body);
    [spec.len * 0.2, spec.len * 0.8].forEach((x) => bogie(x, 2, 0.92));
  }

  const dispose = () => { geos.forEach((g) => g.dispose()); mats.forEach((mm) => mm.dispose()); texs.forEach((t) => t.dispose()); };
  return { group: root, len: shown, h: spec.h, dispose };
}
