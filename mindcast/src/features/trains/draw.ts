/**
 * To-scale side elevations of every class, drawn from the numbers in `pack.trains`.
 * Ported from the Groundwork web prototype onto the Painter API (src/ui/sketch.tsx).
 *
 * Conventions: the front of the vehicle is on the left. Positions are in metres from the front.
 * X(m) and Y(m) convert metres to drawing units; the rail top is at `railY`.
 */
import type { Opt, Painter } from "@/ui/sketch";
import { measure } from "@/ui/sketch";
import { INK, LEGACY_TOP, onColour, shownLen, type DrawSpec, type EndStyle, type Livery } from "./model";

type P = Painter;
type Pt = [number, number];

const DARK = "#2A2E33";
const YELLOW = "#F2C230";
const PLATE = "#22262B";
const BRASS = "#E8C66A";

/** A transformed group, matching the prototype's D.__push(sc, railY, sy). */
function push(D: P, sc: number, railY: number, sy: number, fn: () => void) {
  D.group(`translate(0 ${railY - 184 * sy}) scale(${sc} ${sy})`, fn);
}

/** The personal logo: a stripe-coloured roundel with initials or a simple mark. */
export function drawLogo(D: P, x: number, y: number, s: number, L: Livery) {
  const t = L.logo;
  if (!t || t === "none") return;
  if (t === "image") {
    if (L.img) { D.circle(x, y, s + 6, D.pal.paper, { strokeWidth: 1.4 }); D.image(L.img, x - s / 2, y - s / 2, s, s); }
    return;
  }
  const ink = onColour(L.stripe);
  D.circle(x, y, s + 8, L.stripe, { strokeWidth: 1.6 });
  if (t === "initials") D.text(x, y + s * 0.2, (L.initials || "").slice(0, 3).toUpperCase(), s * 0.55, ink, "display");
  if (t === "star") {
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.22 : s * 0.48; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    D.poly(pts, ink, { strokeWidth: 1, roughness: 0.6, stroke: ink });
  }
  if (t === "wheel") {
    D.circle(x, y, s * 0.8, null, { strokeWidth: 2.4, stroke: ink });
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; D.line(x, y, x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.4, { strokeWidth: 1.6, stroke: ink }); }
  }
  if (t === "leaf") D.path(`M${x} ${y + s * 0.42} Q${x - s * 0.5} ${y} ${x} ${y - s * 0.45} Q${x + s * 0.5} ${y} ${x} ${y + s * 0.42} Z`, ink, { strokeWidth: 1, roughness: 0.6, stroke: ink });
  if (t === "chevron") [-0.18, 0.14].forEach((dx) => D.path(`M${x + dx * s - s * 0.16} ${y - s * 0.3} L${x + dx * s + s * 0.14} ${y} L${x + dx * s - s * 0.16} ${y + s * 0.3}`, null, { strokeWidth: 3.4, roughness: 0.5, stroke: ink }));
  if (t === "shield") D.path(`M${x - s * 0.34} ${y - s * 0.36} L${x + s * 0.34} ${y - s * 0.36} L${x + s * 0.3} ${y + s * 0.06} Q${x} ${y + s * 0.42} ${x} ${y + s * 0.44} Q${x} ${y + s * 0.42} ${x - s * 0.3} ${y + s * 0.06} Z`, ink, { strokeWidth: 1, roughness: 0.6, stroke: ink });
}

/**
 * Simplified engineering machines (hopper, tamper, stoneblower, regulator, road-rail vehicle),
 * drawn in a 640 x 200 box with the rail top at y = 184.
 */
export function drawVehicle(D: P, kind: string, L: Livery) {
  const P = D.pal, glass = P.glass, body = L.body, stripe = L.stripe;
  const wheel = (x: number, r = 13, y = 184 - r) => { D.circle(x, y, r * 2, DARK); D.circle(x, y, r * 0.7, "#8A9099", { strokeWidth: 1 }); };
  const bogie = (x: number, n = 2, sp = 34, r = 13) => { D.rect(x - ((n - 1) * sp) / 2 - r - 6, 184 - r - 10, (n - 1) * sp + 2 * r + 12, 10, DARK, { strokeWidth: 1.4 }); for (let i = 0; i < n; i++) wheel(x - ((n - 1) * sp) / 2 + i * sp, r); };
  const wins = (x0: number, x1: number, y: number, h: number, n: number) => { const w = (x1 - x0) / n - 8; for (let i = 0; i < n; i++) D.rect(x0 + 4 + i * (w + 8), y, w, h, glass, { strokeWidth: 1.4 }); };
  const band = (x0: number, x1: number, y: number, h = 8) => D.rect(x0, y, x1 - x0, h, stripe, { strokeWidth: 1 });
  const beacon = (x: number, y: number) => D.circle(x, y, 9, "#F59E0B", { strokeWidth: 1.2 });
  const nameplate = (x: number, y: number, size = 15) => { if (!L.name) return; const w = measure(L.name, size, "display") + 18; D.rect(x - w / 2, y - size - 3, w, size + 10, PLATE, { strokeWidth: 1.4, roughness: 0.6 }); D.text(x, y + 2, L.name, size, BRASS, "display"); };
  const number = (x: number, y: number) => { if (L.number) D.text(x, y, L.number, 14, onColour(body), "mono"); };
  const logo = (x: number, y: number, s = 30) => drawLogo(D, x, y, s, L);

  if (kind === "hopper") {
    ([[20, 210], [225, 415], [430, 620]] as Pt[]).forEach(([a, b], k) => {
      const m = (a + b) / 2;
      ([[m - 30, 74], [m, 66], [m + 30, 74], [m - 60, 78], [m + 60, 78]] as Pt[]).forEach(([x, y]) => D.circle(x, y, 22, "#9A958C", { strokeWidth: 1 }));
      D.poly([[a, 80], [b, 80], [b - 22, 140], [m + 20, 150], [m - 20, 150], [a + 22, 140]], body);
      band(a + 6, b - 6, 92, 6);
      // underframe sits on the bogies, so the body does not float
      D.rect(a + 6, 150, b - a - 12, 12, DARK, { strokeWidth: 1.4 });
      bogie(a + 40, 2, 36, 11); bogie(b - 40, 2, 36, 11);
      if (k === 0) nameplate(m, 128, 11);
      if (k === 1) logo(m, 118, 20);
      if (k < 2) D.rect(b, 154, 15, 6, DARK, { strokeWidth: 1 });
    });
    number(110, 112);
    return;
  }
  if (kind === "tamper" || kind === "stoneblower" || kind === "regulator") {
    if (kind !== "regulator") { D.rect(20, 140, 600, 16, DARK, { strokeWidth: 1.6 }); band(20, 620, 140, 6); }
    if (kind === "tamper") {
      D.poly([[20, 140], [20, 92], [40, 64], [120, 64], [120, 140]], body); D.poly([[24, 92], [42, 70], [70, 70], [70, 92]], glass, { strokeWidth: 1.4 });
      D.rect(130, 92, 360, 48, body); [170, 210, 250].forEach((x) => D.rect(x, 100, 26, 28, null, { strokeWidth: 1, stroke: "#5A6069" }));
      D.poly([[500, 140], [500, 64], [600, 64], [620, 92], [620, 140]], body); D.poly([[616, 92], [598, 70], [570, 70], [570, 92]], glass, { strokeWidth: 1.4 });
      D.rect(300, 120, 70, 40, DARK); [310, 326, 344, 360].forEach((x) => D.line(x, 160, x, 182, { strokeWidth: 3 })); D.rect(392, 156, 40, 10, DARK, { strokeWidth: 1 });
      // measuring trolley wheels, on the rail
      [180, 440].forEach((x) => { D.line(x, 156, x, 170, { strokeWidth: 2 }); wheel(x, 7); });
      beacon(70, 58); beacon(560, 58); bogie(80, 2, 36, 12); bogie(556, 2, 36, 12);
      nameplate(400, 124, 11); logo(450, 112, 18); number(90, 128);
    }
    if (kind === "stoneblower") {
      D.poly([[20, 140], [20, 92], [40, 64], [120, 64], [120, 140]], body); D.poly([[24, 92], [42, 70], [70, 70], [70, 92]], glass, { strokeWidth: 1.4 });
      ([[150, 300], [320, 470]] as Pt[]).forEach(([a, b]) => { D.poly([[a, 140], [a + 10, 64], [b - 10, 64], [b, 140]], body); D.line(a + 14, 76, b - 14, 76, { strokeWidth: 1.2 }); });
      D.rect(490, 96, 50, 44, body); [500, 516, 532].forEach((x) => D.line(x, 156, x, 182, { strokeWidth: 3, stroke: "#5A6069" }));
      D.poly([[548, 140], [548, 76], [600, 76], [620, 100], [620, 140]], body); D.rect(570, 84, 30, 18, glass, { strokeWidth: 1.4 });
      beacon(70, 58); beacon(590, 70); bogie(80, 2, 36, 12); bogie(580, 2, 36, 12);
      nameplate(225, 116, 11); logo(395, 110, 18); number(90, 128);
    }
    if (kind === "regulator") {
      D.rect(70, 140, 540, 16, DARK, { strokeWidth: 1.6 });
      D.poly([[20, 182], [60, 120], [110, 120], [110, 140], [80, 182]], body); D.rect(110, 104, 420, 36, body); band(110, 530, 140, 6);
      D.rect(230, 50, 180, 56, body); wins(238, 402, 58, 36, 3);
      // sweeper brush, just touching the sleeper tops
      D.circle(560, 157, 52, "#5A6069");
      for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 + 0.3; D.line(560 + Math.cos(a) * 18, 157 + Math.sin(a) * 18, 560 + Math.cos(a) * 25, 157 + Math.sin(a) * 25, { strokeWidth: 1.2 }); }
      D.rect(530, 104, 70, 36, body); beacon(250, 44); beacon(390, 44); bogie(190, 1, 0, 14); bogie(460, 1, 0, 14);
      nameplate(320, 132, 11); logo(160, 122, 16); number(470, 128);
    }
    return;
  }
  if (kind === "rrv") {
    D.rect(170, 140, 260, 22, DARK);
    [220, 380].forEach((x) => { D.circle(x, 161, 46, "#1A1C1F"); D.circle(x, 161, 18, "#8A9099", { strokeWidth: 1 }); });
    [168, 432].forEach((x) => { D.line(x, 158, x, 172, { strokeWidth: 3 }); wheel(x, 8); });
    D.rect(200, 94, 180, 46, body); D.rect(200, 60, 70, 80, body); D.rect(212, 70, 46, 40, glass, { strokeWidth: 1.4 }); D.rect(380, 104, 26, 36, DARK);
    D.path("M350 100 L470 40 L486 52 L372 118 Z", body); D.path("M470 40 L560 112 L548 122 L462 56 Z", body); D.poly([[548, 112], [590, 120], [586, 154], [552, 150]], DARK);
    beacon(240, 54); band(200, 380, 122, 6); nameplate(300, 112, 11); logo(330, 82, 18); number(234, 134);
  }
}

/**
 * Draw a class side-on, to scale. Fits `shownLen` metres into `fitW` units (10 unit margin), at most `maxH` tall.
 * `strict` keeps simplified machines at their true height (used by the to-scale strip).
 */
export function drawClass(D: P, s: DrawSpec, L: Livery, fitW = 640, railY = 184, maxH = 172, strict = false, fitLen?: number) {
  const m = s.model;
  if (m.kind === "legacy") {
    const sc = fitW / 640, top = LEGACY_TOP[m.k || ""];
    const sy = strict && top ? (s.h * ((fitW - 20) / shownLen(s))) / top : sc;
    push(D, sc, railY, sy, () => drawVehicle(D, m.k || "tamper", L));
    return;
  }
  const S = Math.min((fitW - 20) / (fitLen ?? shownLen(s)), maxH / (s.h + 0.3));
  const X = (v: number) => 10 + v * S, Y = (hm: number) => railY - hm * S;
  const P = D.pal, glass = P.glass, body = L.body, stripe = L.stripe;
  const ends = (m.ends && m.ends.length ? m.ends : ["flat", "flat"]) as EndStyle[];
  const wheel = (xm: number, d: number) => { const r = (d / 2) * S; D.circle(X(xm), railY - r, r * 2, DARK, { strokeWidth: 1.4 }); if (r > 6) D.circle(X(xm), railY - r, r * 0.8, "#8A9099", { strokeWidth: 1 }); };
  const bogie = (xm: number, ax: number, d = 0.92, sp?: number) => {
    const spc = sp || (ax === 3 ? 2.0 : 2.6), w = (ax - 1) * spc + d + 0.6;
    D.rect(X(xm - w / 2), Y(d + 0.15), w * S, 0.32 * S, DARK, { strokeWidth: 1.2 });
    for (let i = 0; i < ax; i++) wheel(xm - ((ax - 1) * spc) / 2 + i * spc, d);
  };
  const panto = (xm: number, top: number) => {
    const y = Y(top), u = S;
    D.rect(X(xm) - 1.2 * u, y - 0.18 * u, 2.4 * u, 0.18 * u, DARK, { strokeWidth: 1 });
    D.line(X(xm) - 0.9 * u, y - 0.18 * u, X(xm) + 0.5 * u, y - 1.1 * u, { strokeWidth: 1.8 });
    D.line(X(xm) + 0.5 * u, y - 1.1 * u, X(xm) - 0.4 * u, y - 1.7 * u, { strokeWidth: 1.8 });
    D.line(X(xm) - 1.2 * u, y - 1.7 * u, X(xm) + 0.6 * u, y - 1.7 * u, { strokeWidth: 2.6 });
  };
  const nameplate = (xm: number, ym: number, size?: number) => {
    if (!L.name) return;
    const sz = size || Math.max(9, Math.min(15, S * 0.6)), w = measure(L.name, sz, "display") + 14;
    D.rect(X(xm) - w / 2, Y(ym) - sz - 2, w, sz + 8, PLATE, { strokeWidth: 1.2, roughness: 0.6 });
    D.text(X(xm), Y(ym) + 2, L.name, sz, BRASS, "display");
  };
  const number = (xm: number, ym: number) => { if (L.number) D.text(X(xm), Y(ym), L.number, Math.max(9, S * 0.5), onColour(body), "mono"); };
  const logo = (xm: number, ym: number) => drawLogo(D, X(xm), Y(ym), Math.max(14, Math.min(34, S * 1.1)), L);

  type G = { xL: number; xR: number; top: number; bot: number };
  /** A car body with chosen end shapes. */
  function carBody(x0: number, len: number, h: number, floor: number, endL: EndStyle, endR: EndStyle, opts: { noYellow?: boolean; noBand?: boolean } = {}): G {
    const top = h, bot = floor, xL = x0, xR = x0 + len;
    const prof = (style: EndStyle, side: "L" | "R"): Pt[] => {
      const sgn = side === "L" ? 1 : -1, xe = side === "L" ? xL : xR;
      if (style === "aero") return [[xe, bot + 0.25], [xe + sgn * 0.6, bot + 1.0], [xe + sgn * 2.2, top - 0.55], [xe + sgn * 4.6, top]];
      if (style === "slope") return [[xe, bot], [xe, bot + 1.35], [xe + sgn * 0.35, top - 0.95], [xe + sgn * 1.15, top]];
      if (style === "round") return [[xe, bot], [xe, top - 0.7], [xe + sgn * 0.25, top - 0.25], [xe + sgn * 0.8, top]];
      if (style === "tram") return [[xe, bot], [xe, bot + 0.9], [xe + sgn * 0.5, top - 0.6], [xe + sgn * 1.1, top]];
      if (style === "nose") return [[xe, bot], [xe, bot + 1.55], [xe + sgn * 0.2, bot + 1.75], [xe + sgn * 2.3, bot + 1.75], [xe + sgn * 2.3, top - 0.35], [xe + sgn * 2.6, top]];
      if (style === "none") return [[xe, bot], [xe, top]];
      return [[xe, bot], [xe, top - 0.5], [xe + sgn * 0.35, top]];
    };
    const l = prof(endL, "L"), r = prof(endR, "R").reverse();
    D.poly(l.concat(r).map(([xm, hm]) => [X(xm), Y(hm)] as Pt), body, { strokeWidth: 2 });
    // yellow warning panel on cab fronts (UK requirement), plus windscreen
    const cab = (style: EndStyle, side: "L" | "R") => {
      if (style === "none") return;
      const sgn = side === "L" ? 1 : -1, xe = side === "L" ? xL : xR;
      if (style === "nose") {
        D.poly([[X(xe), Y(bot + 0.3)], [X(xe), Y(bot + 1.55)], [X(xe + sgn * 0.2), Y(bot + 1.75)], [X(xe + sgn * 0.6), Y(bot + 1.75)], [X(xe + sgn * 0.6), Y(bot + 0.3)]], YELLOW, { strokeWidth: 1.2 });
        D.poly([[X(xe + sgn * 2.35), Y(top - 0.45)], [X(xe + sgn * 2.55), Y(top - 0.1)], [X(xe + sgn * 3.3), Y(top - 0.1)], [X(xe + sgn * 3.3), Y(top - 0.95)], [X(xe + sgn * 2.35), Y(top - 0.95)]], glass, { strokeWidth: 1.2 });
        return;
      }
      if (style === "aero") {
        D.poly([[X(xe + sgn * 0.1), Y(bot + 0.3)], [X(xe + sgn * 0.6), Y(bot + 1.0)], [X(xe + sgn * 1.6), Y(bot + 1.5)], [X(xe + sgn * 1.6), Y(bot + 0.3)]], YELLOW, { strokeWidth: 1.2 });
        D.poly([[X(xe + sgn * 2.0), Y(top - 0.7)], [X(xe + sgn * 3.4), Y(top - 0.18)], [X(xe + sgn * 3.4), Y(top - 0.85)]], glass, { strokeWidth: 1.2 });
        return;
      }
      const fw = style === "round" ? 0.5 : 0.9;
      if (!opts.noYellow) D.rect(Math.min(X(xe), X(xe + sgn * fw)), Y(bot + (style === "round" ? 1.0 : 1.3)), fw * S, (style === "round" ? 0.9 : 1.2) * S, YELLOW, { strokeWidth: 1.1 });
      const wx0 = xe + sgn * (style === "slope" ? 0.45 : style === "tram" ? 0.3 : 0.12), wx1 = xe + sgn * (style === "round" ? 0.9 : 1.6);
      D.poly([[X(wx0), Y(top - (style === "round" ? 0.75 : 1.0))], [X(wx0 + sgn * (style === "flat" ? 0.12 : 0.3)), Y(top - (style === "round" ? 0.3 : 0.25))], [X(wx1), Y(top - 0.25)], [X(wx1), Y(top - (style === "round" ? 0.75 : 1.0))]], glass, { strokeWidth: 1.2 });
    };
    cab(endL, "L"); cab(endR, "R");
    if (!opts.noBand) {
      const a = endL === "aero" ? 2 : 0.3, b = endR === "aero" ? 2 : 0.3;
      D.rect(X(xL + a), Y(bot + 0.55), (len - a - b) * S, Math.max(3, 0.18 * S), stripe, { strokeWidth: 1 });
    }
    return { xL, xR, top, bot };
  }

  function doorsAndWindows(g: G, doorsAt: number[], dw: number, opts: { cabL?: number; cabR?: number; tube?: boolean; tram?: boolean } = {}) {
    const winTop = g.top - (opts.tube ? 0.55 : 0.75), winBot = g.bot + (opts.tube ? 0.95 : 1.15);
    const cabL = opts.cabL || 0, cabR = opts.cabR || 0, segs: Pt[] = [], pos = doorsAt.map((p) => g.xL + p).sort((a, b) => a - b);
    let start = g.xL + cabL + 0.6;
    pos.forEach((p) => { segs.push([start, p - dw / 2 - 0.4]); start = p + dw / 2 + 0.4; });
    segs.push([start, g.xR - cabR - 0.6]);
    segs.forEach(([a, b]) => {
      const span = b - a;
      if (span < 1) return;
      const n = Math.max(1, Math.round(span / 2.1)), w = span / n;
      for (let i = 0; i < n; i++) D.rect(X(a + i * w + 0.12), Y(winTop), (w - 0.24) * S, (winTop - winBot) * S, glass, { strokeWidth: 1 });
    });
    pos.forEach((p) => {
      const d0 = g.bot + (opts.tram ? 0.05 : 0.15);
      D.rect(X(p - dw / 2), Y(g.top - 0.45), dw * S, (g.top - 0.45 - d0) * S, body, { strokeWidth: 1.4 });
      if (dw > 1) D.line(X(p), Y(g.top - 0.45), X(p), Y(d0), { strokeWidth: 1 });
      D.rect(X(p - dw / 2 + 0.12), Y(g.top - 0.65), (dw > 1 ? dw / 2 - 0.24 : dw - 0.24) * S, 0.8 * S, glass, { strokeWidth: 0.9 });
      if (dw > 1) D.rect(X(p + 0.12), Y(g.top - 0.65), (dw / 2 - 0.24) * S, 0.8 * S, glass, { strokeWidth: 0.9 });
    });
  }

  if (m.kind === "hood") {
    const fl = 1.15;
    D.rect(X(0.3), Y(fl), 8.4 * S, 0.3 * S, DARK, { strokeWidth: 1.2 });
    D.poly([[X(0.3), Y(fl)], [X(0.3), Y(2.75)], [X(0.6), Y(2.95)], [X(5.9), Y(2.95)], [X(5.9), Y(fl)]], body);
    for (let x = 1.0; x < 5.6; x += 0.45) D.line(X(x), Y(2.7), X(x), Y(1.6), { strokeWidth: 0.9, stroke: "#5A6069" });
    D.poly([[X(5.9), Y(fl)], [X(5.9), Y(s.h)], [X(8.7), Y(s.h)], [X(8.7), Y(fl)]], body);
    D.rect(X(6.3), Y(s.h - 0.25), 0.9 * S, 0.8 * S, glass, { strokeWidth: 1.1 }); D.rect(X(7.5), Y(s.h - 0.25), 0.9 * S, 0.8 * S, glass, { strokeWidth: 1.1 });
    D.rect(X(1.5), Y(3.25), 0.3 * S, (3.25 - 2.95) * S, DARK, { strokeWidth: 1 });
    D.rect(X(0.0), Y(1.55), 0.3 * S, 0.3 * S, DARK); D.rect(X(8.7), Y(1.55), 0.3 * S, 0.3 * S, DARK);
    [1.7, 3.3, 4.9].forEach((x) => wheel(x, 1.37));
    D.line(X(1.7), Y(0.55), X(4.9), Y(0.55), { strokeWidth: 3, stroke: "#8A9099" });
    D.rect(X(0.3), Y(fl + 0.35), 8.4 * S, 0.22 * S, stripe, { strokeWidth: 1 });
    nameplate(3.1, 2.3, 10); number(7.3, 1.9); logo(7.3, 2.6);
    return;
  }

  if (m.kind === "loco") {
    const fl = 1.15;
    carBody(0, s.len, s.h, fl, ends[0], ends[1] || ends[0]);
    (m.roof || []).forEach(([t, f]) => {
      const x = s.len * f;
      if (t === "panto") panto(x, s.h);
      if (t === "fan") D.rect(X(x - 0.7), Y(s.h + 0.12), 1.4 * S, 0.12 * S, DARK, { strokeWidth: 1 });
      if (t === "exhaust") D.rect(X(x - 0.2), Y(s.h + 0.25), 0.4 * S, 0.25 * S, DARK, { strokeWidth: 1 });
      if (t === "ac") D.rect(X(x - 1.5), Y(s.h + 0.15), 3 * S, 0.15 * S, "#8A9099", { strokeWidth: 1 });
    });
    // body-side cab doors
    const inset = ends[0] === "aero" ? 4.8 : ends[0] === "nose" ? 3.3 : 2.0, insetR = (ends[1] || ends[0]) === "nose" ? 3.3 : 2.0;
    D.rect(X(inset), Y(s.h - 0.55), 0.6 * S, (s.h - 0.75 - fl) * S, body, { strokeWidth: 1 });
    D.rect(X(s.len - insetR - 0.6), Y(s.h - 0.55), 0.6 * S, (s.h - 0.75 - fl) * S, body, { strokeWidth: 1 });
    if (s.power.startsWith("Diesel")) {
      const a = s.len * 0.3, b = s.len * 0.7;
      for (let x = a; x < b; x += 0.55) D.line(X(x), Y(s.h - 0.7), X(x), Y(s.h - 1.5), { strokeWidth: 0.9, stroke: "#5A6069" });
      D.rect(X(s.len * 0.36), Y(fl + 0.05), s.len * 0.28 * S, 0.55 * S, DARK, { strokeWidth: 1 });
    } else {
      [0.35, 0.5, 0.65].forEach((f) => D.rect(X(s.len * f - 0.5), Y(s.h - 0.7), 1 * S, 0.9 * S, glass, { strokeWidth: 1 }));
    }
    const ax = m.axles === 3 ? 3 : 2;
    const bc = ax === 3 ? [s.len * 0.21, s.len * 0.79] : [s.len * 0.24, s.len * 0.76];
    bc.forEach((x) => bogie(x, ax, ax === 3 ? 1.07 : 1.1));
    // buffers
    [-0.25, s.len - 0.05].forEach((x) => { D.rect(X(x), Y(1.25), 0.3 * S, 0.22 * S, DARK, { strokeWidth: 1 }); });
    nameplate(s.len / 2, s.h - 1.3);
    number(inset + 1.6, fl + 1.0);
    logo(s.len - insetR - 1.6, fl + 1.35);
    return;
  }

  if (m.kind === "steam") {
    drawSteam(D, s, L, S, X, Y, railY, nameplate, number, logo);
    return;
  }

  if (m.kind === "unit" || m.kind === "nmt" || m.kind === "mpv") {
    const flH = m.tube ? 0.75 : m.tram ? 0.35 : 1.15;
    for (let c = 0; c < 2; c++) {
      const x0 = c * (s.len + 0.6), lead = c === 0;
      if (m.kind === "nmt") {
        if (lead) {
          carBody(0, s.len, s.h, 1.15, "aero", "flat");
          D.rect(X(5.2), Y(s.h - 0.7), 1 * S, 0.8 * S, glass, { strokeWidth: 1 });
          D.rect(X(6.5), Y(s.h - 0.55), 0.6 * S, (s.h - 1.9) * S, body, { strokeWidth: 1 });
          [s.len * 0.24, s.len * 0.76].forEach((x) => bogie(x, 2, 1.1));
          for (let x = s.len * 0.35; x < s.len * 0.7; x += 0.55) D.line(X(x), Y(s.h - 0.8), X(x), Y(s.h - 1.6), { strokeWidth: 0.9, stroke: "#5A6069" });
          number(4.1, 2.1); logo(s.len * 0.8, 2.5);
        } else {
          const cl = NMT_COACH;
          D.rect(X(x0), Y(s.h), cl * S, (s.h - 1.15) * S, body);
          D.rect(X(x0 + 0.3), Y(1.7), (cl - 0.6) * S, 0.18 * S, stripe, { strokeWidth: 1 });
          [2.2, 5.0, 16.4, 19.2].forEach((p) => D.rect(X(x0 + p), Y(s.h - 0.75), 1.6 * S, 0.9 * S, glass, { strokeWidth: 1 }));
          D.path(`M${X(x0 + 9)} ${Y(s.h)} Q${X(x0 + 10.5)} ${Y(s.h + 0.7)} ${X(x0 + 12)} ${Y(s.h)} Z`, "#D7DBE0");
          D.rect(X(x0 + 8.5), Y(1.15), 3 * S, 0.5 * S, DARK, { strokeWidth: 1 });
          [9, 10, 11].forEach((p) => D.line(X(x0 + p), Y(0.65), X(x0 + p), Y(0.1), { stroke: "#E63946", strokeWidth: 1.6 }));
          [x0 + 3, x0 + cl - 3].forEach((x) => bogie(x, 2, 0.92));
          nameplate(x0 + 11.5, 2.75);
        }
        continue;
      }
      if (m.kind === "mpv") {
        const L2 = s.len;
        D.rect(X(x0), Y(1.6), L2 * S, 0.5 * S, DARK, { strokeWidth: 1.4 });
        const cx = lead ? x0 : x0 + L2 - 4;
        D.rect(X(cx), Y(s.h), 4 * S, (s.h - 1.6) * S, body);
        D.rect(X(cx + (lead ? 0.4 : 1.6)), Y(s.h - 0.4), 2 * S, 0.9 * S, glass, { strokeWidth: 1 });
        D.rect(X(lead ? x0 : x0 + L2 - 0.9), Y(2.5), 0.9 * S, 0.9 * S, YELLOW, { strokeWidth: 1 });
        const mx = lead ? x0 + 5 : x0 + 1;
        D.rect(X(mx), Y(3.2), 13 * S, 1.6 * S, lead ? "#D7DBE0" : body);
        if (lead) {
          D.text(X(mx + 6.5), Y(2.25), "WATER", Math.max(8, S * 0.5), INK, "mono");
          [x0 + 6.5, x0 + 9.5].forEach((x) => { D.line(X(x), Y(1.1), X(x), Y(0.2), { stroke: "#3A86FF", strokeWidth: 2 }); D.line(X(x) - 3, Y(0.25), X(x) + 3, Y(0.05), { stroke: "#3A86FF", strokeWidth: 1.4 }); });
          number(cx + 2, 2.0);
        } else { nameplate(mx + 6.5, 2.3); logo(mx + 11.6, 2.4); }
        [x0 + 3, x0 + L2 - 3].forEach((x) => bogie(x, 2, 0.92));
        D.circle(X(cx + 2), Y(s.h + 0.2), 0.35 * S, "#F59E0B", { strokeWidth: 1 });
        continue;
      }
      const e0 = ends[0];
      const endL: EndStyle = lead ? e0 : "none";
      const endR: EndStyle = lead ? "none" : e0 === "aero" ? "none" : m.artic ? (m.tram ? "tram" : e0) : "none";
      const h = s.h;
      let g: G;
      if (m.tube) {
        D.path(`M${X(x0)} ${Y(flH)} L${X(x0)} ${Y(h - 0.7)} Q${X(x0)} ${Y(h)} ${X(x0 + 1.4)} ${Y(h)} L${X(x0 + s.len - 1.4)} ${Y(h)} Q${X(x0 + s.len)} ${Y(h)} ${X(x0 + s.len)} ${Y(h - 0.7)} L${X(x0 + s.len)} ${Y(flH)} Z`, body);
        g = { xL: x0, xR: x0 + s.len, top: h, bot: flH };
        D.rect(X(x0 + 0.3), Y(flH + 0.35), (s.len - 0.6) * S, 0.14 * S, stripe, { strokeWidth: 1 });
        if (lead) { D.rect(X(x0), Y(flH + 1.0), 0.45 * S, 0.8 * S, YELLOW, { strokeWidth: 1 }); D.rect(X(x0 + 0.1), Y(h - 0.5), 0.8 * S, 0.75 * S, glass, { strokeWidth: 1 }); }
      } else g = carBody(x0, s.len, m.tilt ? h - 0.1 : h, flH, endL, endR);
      const cabL = lead ? (e0 === "aero" ? 4.8 : 2.2) : 0, cabR = !lead && endR !== "none" ? 2.2 : 0;
      const nd = m.doors === "ends" ? 2 : m.doors || 2;
      const dw = m.doors === "ends" ? 0.85 : 1.35;
      const doorsAt = m.doors === "ends" ? [cabL + 1.0, s.len - 1.0 - cabR] : Array.from({ length: nd }, (_, i) => cabL + ((s.len - cabL - cabR) * (i + 1)) / (nd + 1));
      doorsAndWindows(g, doorsAt, dw, { cabL, cabR, tube: m.tube, tram: m.tram });
      if (m.under) D.rect(X(x0 + s.len * 0.35), Y(flH - 0.05), s.len * 0.3 * S, 0.5 * S, DARK, { strokeWidth: 1 });
      if (m.exhaust && lead) D.rect(X(x0 + s.len * 0.55), Y(h + 0.3), 0.25 * S, 0.3 * S, DARK, { strokeWidth: 1 });
      (m.roof || []).forEach(([t, f]) => { if (t === "panto" && ((c === 1 && f <= 1) || (m.artic && c === 0 && f > 0.9))) panto(m.artic && f > 0.9 ? s.len + 0.3 : x0 + s.len * f, h); });
      const wd = m.tube ? 0.7 : m.tram ? 0.62 : 0.84;
      if (m.tram) [x0 + 2.2, x0 + s.len - 2.2].forEach((x) => { D.rect(X(x - 1.2), Y(0.5), 2.4 * S, 0.35 * S, DARK, { strokeWidth: 1 }); wheel(x - 0.7, wd); wheel(x + 0.7, wd); });
      else if (m.artic && c === 0) { bogie(x0 + 2.5, 2, wd, 2.0); bogie(s.len + 0.3, 2, wd, 2.0); }
      else if (m.artic && c === 1) bogie(x0 + s.len - 2.5, 2, wd, 2.0);
      else { bogie(x0 + (m.tube ? 2.6 : 3.2), 2, wd, m.tube ? 2.0 : 2.6); bogie(x0 + s.len - (m.tube ? 2.6 : 3.2), 2, wd, m.tube ? 2.0 : 2.6); }
      if (m.shoes) [x0 + 3.2 - 1.9, x0 + s.len - 3.2 + 1.9].forEach((x) => D.rect(X(x) - 0.3 * S, Y(0.2), 0.6 * S, 0.12 * S, "#8A9099", { strokeWidth: 0.8 }));
      if (lead) number(cabL + 0.9, flH + 0.9);
      else { nameplate(x0 + s.len / 2, flH + 0.95); logo(x0 + 3.2, h - 0.55); }
    }
    if (m.artic) D.rect(X(s.len), Y(s.h - 0.3), 0.6 * S, (s.h - 0.6 - flH) * S, "#3A3F45", { strokeWidth: 1 });
    if (s.cars > 2 && !L.noMore) D.text(X(shownLen(s)) - 4, railY + MORE_DY, `+ ${s.cars - 2} more ${m.kind === "unit" ? "cars" : "vehicles"}`, Math.max(10, S * 0.5), P.ink, "mono", "end");
    return;
  }

  if (m.kind === "tram7") {
    const secs = [6.9, 4.6, 6.9, 4.6, 6.9, 4.6, 6.9], gap = 0.25, h = s.h, fl = 0.35;
    const k = s.len / (secs.reduce((a, b) => a + b, 0) + gap * (secs.length - 1));
    let x = 0;
    secs.forEach((raw, i) => {
      const len = raw * k;
      const endL: EndStyle = i === 0 ? "tram" : "none", endR: EndStyle = i === secs.length - 1 ? "tram" : "none";
      const g = carBody(x, len, h, fl, endL, endR);
      const cabL = i === 0 ? 1.6 : 0, cabR = i === secs.length - 1 ? 1.6 : 0;
      doorsAndWindows(g, len > 5 ? [cabL + (len - cabL - cabR) / 2] : [], 1.3, { cabL, cabR, tram: true });
      if (len > 5) { D.rect(X(x + len / 2 - 1.2), Y(0.5), 2.4 * S, 0.35 * S, DARK, { strokeWidth: 1 }); wheel(x + len / 2 - 0.7, 0.62); wheel(x + len / 2 + 0.7, 0.62); }
      if (i === 3) panto(x + len / 2, h);
      if (i < secs.length - 1) D.rect(X(x + len), Y(h - 0.3), gap * k * S, (h - 0.6 - fl) * S, "#3A3F45", { strokeWidth: 0.8 });
      x += len + gap * k;
    });
    nameplate(s.len / 2, 2.2); logo(3.5, 2.6); number(1.3, 1.4);
    return;
  }

  if (m.kind === "wagon") {
    const fl = 1.25, L0 = s.len;
    D.rect(X(0.4), Y(fl), (L0 - 0.8) * S, 0.35 * S, DARK, { strokeWidth: 1.4 });
    [3.0, L0 - 3.0].forEach((x) => bogie(x, 2, 0.92, 1.8));
    [0.1, L0 - 0.1].forEach((x) => D.rect(X(x) - 0.2 * S, Y(1.2), 0.3 * S, 0.2 * S, DARK, { strokeWidth: 1 }));
    if (m.w === "box") {
      D.rect(X(0.8), Y(3.3), (L0 - 1.6) * S, (3.3 - fl) * S, body);
      for (let x = 2; x < L0 - 1; x += 1.6) D.line(X(x), Y(3.25), X(x), Y(fl + 0.4), { strokeWidth: 1, stroke: "#3A3F45" });
      D.rect(X(1.0), Y(2.0), (L0 - 2) * S, 0.18 * S, stripe, { strokeWidth: 1 });
      for (let i = 0; i < 9; i++) D.circle(X(1.6 + (i * (L0 - 3.2)) / 8), Y(3.4), 0.7 * S, "#9A958C", { strokeWidth: 0.8 });
    }
    if (m.w === "tank") {
      [3, L0 / 2, L0 - 3].forEach((x) => D.rect(X(x - 0.4), Y(1.6), 0.8 * S, 0.35 * S, DARK, { strokeWidth: 1 }));
      const top = Math.min(3.75, s.h - 0.15);
      D.path(`M${X(1.2)} ${Y(1.55)} Q${X(0.6)} ${Y(1.55)} ${X(0.6)} ${Y((1.55 + top) / 2)} Q${X(0.6)} ${Y(top)} ${X(1.2)} ${Y(top)} L${X(L0 - 1.2)} ${Y(top)} Q${X(L0 - 0.6)} ${Y(top)} ${X(L0 - 0.6)} ${Y((1.55 + top) / 2)} Q${X(L0 - 0.6)} ${Y(1.55)} ${X(L0 - 1.2)} ${Y(1.55)} Z`, body);
      D.rect(X(1.0), Y(2.95), (L0 - 2) * S, 0.3 * S, stripe, { strokeWidth: 1 });
      D.rect(X(L0 / 2 - 0.5), Y(top + 0.2), 1 * S, 0.2 * S, DARK, { strokeWidth: 1 });
      D.line(X(L0 / 2 - 2), Y(top + 0.1), X(L0 / 2 + 2), Y(top + 0.1), { strokeWidth: 1.4 });
    }
    if (m.w === "cont") {
      const cl = 12.19, ch = Math.min(2.9, s.h - fl);
      D.rect(X((L0 - cl) / 2), Y(fl + ch), cl * S, ch * S, body);
      for (let x = (L0 - cl) / 2 + 0.6; x < (L0 + cl) / 2 - 0.3; x += 0.42) D.line(X(x), Y(fl + ch - 0.2), X(x), Y(fl + 0.45), { strokeWidth: 0.7, stroke: "#26303A" });
      D.rect(X((L0 - cl) / 2 + 0.6), Y(fl + ch - 0.3), 2.4 * S, 0.5 * S, CARD_PAPER, { strokeWidth: 1 });
      D.text(X((L0 - cl) / 2 + 1.8), Y(fl + ch - 0.65), "40 FT", Math.max(8, S * 0.4), INK, "mono");
    }
    nameplate(L0 / 2, m.w === "cont" ? fl + 1.6 : 2.6);
    logo(m.w === "cont" ? (L0 + 12.19) / 2 - 1.6 : L0 - 2.4, m.w === "tank" ? 2.4 : 2.6);
    number(2.2, m.w === "tank" ? 2.4 : 2.6);
    return;
  }

  if (m.kind === "crane") {
    const fl = 1.3;
    D.rect(X(0.3), Y(fl), (s.len - 0.6) * S, 0.45 * S, DARK, { strokeWidth: 1.4 });
    [3, s.len / 2, s.len - 3].forEach((x) => bogie(x, 2, 0.92, 1.8));
    D.rect(X(4), Y(3.6), 8 * S, (3.6 - fl) * S, body);
    D.rect(X(4.4), Y(3.4), 2.2 * S, 1.2 * S, glass, { strokeWidth: 1 });
    D.rect(X(10), Y(3.0), 3 * S, (3.0 - fl) * S, DARK);
    D.path(`M${X(5)} ${Y(3.6)} L${X(17.5)} ${Y(3.95)} L${X(17.5)} ${Y(3.6)} L${X(6.5)} ${Y(3.1)} Z`, body);
    D.line(X(17.2), Y(3.8), X(17.2), Y(2.0), { strokeWidth: 1.4 });
    D.rect(X(16.6), Y(2.0), 1.2 * S, 0.3 * S, DARK, { strokeWidth: 1 });
    D.circle(X(5.5), Y(3.75), 0.35 * S, "#F59E0B", { strokeWidth: 1 });
    D.rect(X(4), Y(fl + 0.55), 8 * S, 0.18 * S, stripe, { strokeWidth: 1 });
    nameplate(8, 2.3); logo(13.2, 2.4); number(1.6, 2.4);
    return;
  }

  // Unknown model: a plain box on two bogies, so a new class never crashes the screen.
  carBody(0, s.len, s.h, 1.15, "flat", "flat");
  [s.len * 0.2, s.len * 0.8].forEach((x) => bogie(x, 2, 0.92));
  nameplate(s.len / 2, s.h - 1.3); number(2.4, 2.2); logo(s.len - 3, 2.5);
}

const CARD_PAPER = "#FBF7EE";
/** The measurement train draws its power car plus one 23 m coach. */
export const NMT_COACH = 23;
/** Baseline of the "+ N more cars" label, below the ballast. */
const MORE_DY = 26;

/** Steam locomotives, detailed side elevations (GWR Castle, LMS Black Five, LNER A4). */
function drawSteam(
  D: P, s: DrawSpec, L: Livery, S: number, X: (v: number) => number, Y: (v: number) => number, railY: number,
  nameplate: (xm: number, ym: number, size?: number) => void, number: (xm: number, ym: number) => void, logo: (xm: number, ym: number) => void,
) {
  const m = s.model, st = m.style || "lms", body = L.body, stripe = L.stripe, glass = D.pal.glass;
  const dark = "#24282D", tyre = "#1A1C1F", red = "#B23A3A", brass = "#D9A441", copper = "#C9773F";
  type C = { E: number; T: number; bog: number[]; drv: number[]; trail: number[]; drD: number; bogD: number; trD?: number; tenD: number; tenAx: number; rp: number; bc: number; br: number; smoke: Pt; barrel: Pt; fire: Pt; cab: Pt; chim: number; cyl: Pt };
  const C3: C = ({
    gwr: { E: 12.4, T: 7.2, bog: [1.6, 3.73], drv: [5.5, 7.75, 10.0], trail: [], drD: 2.04, bogD: 0.97, tenD: 1.27, tenAx: 3, rp: 1.6, bc: 2.6, br: 0.82, smoke: [0.8, 2.6], barrel: [2.6, 8.6], fire: [8.6, 10.6], cab: [10.6, 12.35], chim: 1.75, cyl: [3.95, 5.0] },
    lms: { E: 12.0, T: 7.1, bog: [1.4, 3.38], drv: [4.75, 7.1, 9.45], trail: [], drD: 1.83, bogD: 1.0, tenD: 1.29, tenAx: 3, rp: 2.05, bc: 2.72, br: 0.8, smoke: [0.7, 2.4], barrel: [2.4, 8.1], fire: [8.1, 10.2], cab: [10.2, 11.95], chim: 1.5, cyl: [2.0, 3.4] },
    a4: { E: 13.4, T: 8.0, bog: [1.5, 3.4], drv: [5.45, 7.66, 9.87], trail: [11.95], drD: 2.03, bogD: 0.97, trD: 1.12, tenD: 1.27, tenAx: 4, rp: 1.55, bc: 2.95, br: 0.85, smoke: [0.8, 2.6], barrel: [2.6, 9.0], fire: [9.0, 11.0], cab: [11.0, 13.35], chim: 2.0, cyl: [3.7, 4.8] },
  } as Record<string, C>)[st];
  const tx0 = C3.E + 0.25, tx1 = tx0 + C3.T;
  const wheelSteam = (xm: number, d: number, drive: boolean) => {
    const r = (d / 2) * S, cx = X(xm), cy = railY - r;
    D.circle(cx, cy, r * 2, tyre, { strokeWidth: 1.6 });
    D.circle(cx, cy, r * 1.72, drive ? body : dark, { strokeWidth: 1 });
    const n = drive ? 16 : 10;
    if (r > 5) for (let k = 0; k < n; k++) { const a = (k * Math.PI * 2) / n; D.line(cx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.22, cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84, { strokeWidth: 0.8, roughness: 0.5 }); }
    if (drive) D.path(`M${cx - r * 0.62} ${cy + r * 0.38} A ${r * 0.72} ${r * 0.72} 0 0 0 ${cx + r * 0.62} ${cy + r * 0.38} L${cx + r * 0.4} ${cy + r * 0.22} A ${r * 0.48} ${r * 0.48} 0 0 1 ${cx - r * 0.4} ${cy + r * 0.22} Z`, dark, { strokeWidth: 0.8, roughness: 0.4 });
    D.circle(cx, cy, r * 0.42, dark, { strokeWidth: 1 });
  };
  // tender
  D.rect(X(tx0 + 0.2), Y(1.3), (C3.T - 0.4) * S, 0.42 * S, dark, { strokeWidth: 1.4 });
  const tsp = (C3.T - 2.0) / (C3.tenAx - 1);
  for (let i = 0; i < C3.tenAx; i++) wheelSteam(tx0 + 1.0 + i * tsp, C3.tenD, false);
  if (st === "a4") {
    D.path(`M${X(tx0)} ${Y(1.3)} L${X(tx0)} ${Y(3.55)} Q${X(tx0)} ${Y(3.92)} ${X(tx0 + 0.6)} ${Y(3.92)} L${X(tx1)} ${Y(3.92)} L${X(tx1)} ${Y(1.3)} Z`, body);
    D.rect(X(tx0 + 0.4), Y(2.25), (C3.T - 0.8) * S, 0.06 * S, stripe, { strokeWidth: 0.6 });
  } else {
    D.path(`M${X(tx0 + 0.7)} ${Y(3.38)} Q${X(tx0 + 2.6)} ${Y(3.95)} ${X(tx0 + 4.6)} ${Y(3.34)} Z`, "#2A2A2A", { strokeWidth: 1 });
    D.path(`M${X(tx0)} ${Y(1.3)} L${X(tx0)} ${Y(3.25)} Q${X(tx0 + 0.15)} ${Y(3.45)} ${X(tx0 + 0.6)} ${Y(3.45)} L${X(tx1 - 0.2)} ${Y(3.3)} L${X(tx1 - 0.2)} ${Y(1.3)} Z`, body);
    D.rect(X(tx0 + 0.4), Y(2.35), (C3.T - 1.0) * S, 0.06 * S, stripe, { strokeWidth: 0.6 });
  }
  D.rect(X(tx1 - 0.05), Y(1.18), 0.32 * S, 0.18 * S, dark, { strokeWidth: 1 });
  // frames
  const frTop = st === "lms" ? C3.rp : 1.6;
  D.rect(X(0.5), Y(frTop), (C3.E - 0.4) * S, (frTop - 0.9) * S, dark, { strokeWidth: 1.4 });
  // wheels behind the running gear
  C3.bog.forEach((x) => wheelSteam(x, C3.bogD, false));
  C3.trail.forEach((x) => wheelSteam(x, C3.trD || 1.12, false));
  C3.drv.forEach((x) => wheelSteam(x, C3.drD, true));
  // cylinder, slide bars, connecting and coupling rods
  const crank = (x: number, a: number): Pt => [X(x) + Math.cos(a) * C3.drD * 0.18 * S, railY - (C3.drD / 2) * S + Math.sin(a) * C3.drD * 0.18 * S];
  const pins = C3.drv.map((x) => crank(x, 2.4));
  D.rect(X(C3.cyl[0]), Y(1.55), (C3.cyl[1] - C3.cyl[0]) * S, 0.62 * S, st === "a4" ? body : dark, { strokeWidth: 1.4 });
  const cylY = Y(1.24), xh = X(C3.cyl[1]) + 0.9 * S;
  D.line(X(C3.cyl[1]), cylY - 0.1 * S, X(C3.drv[0]) - 0.2 * S, cylY - 0.1 * S, { strokeWidth: 1.4, stroke: "#8A9099" });
  D.rect(xh - 0.2 * S, cylY - 0.12 * S, 0.4 * S, 0.24 * S, "#8A9099", { strokeWidth: 1 });
  D.line(xh, cylY, pins[1][0], pins[1][1], { strokeWidth: 3.2, stroke: "#9AA0A8", roughness: 0.4 });
  D.line(pins[0][0], pins[0][1], pins[pins.length - 1][0], pins[pins.length - 1][1], { strokeWidth: 3.6, stroke: "#B9BEC5", roughness: 0.4 });
  pins.forEach(([px, py]) => D.circle(px, py, Math.max(3, 0.12 * S), "#6B7178", { strokeWidth: 0.8 }));
  if (st !== "gwr") {
    D.line(X(C3.drv[1]) + 0.3 * S, Y(1.95), xh + 0.6 * S, Y(1.5), { strokeWidth: 1.6, stroke: "#9AA0A8" });
    D.line(X(C3.drv[1]) + 0.3 * S, Y(1.95), X(C3.drv[1]) + 0.3 * S, Y(1.3), { strokeWidth: 1.6, stroke: "#9AA0A8" });
  }
  // buffer beam, buffers, lamp
  D.rect(X(0.3), Y(1.55), 0.3 * S, 0.62 * S, red, { strokeWidth: 1.2 });
  D.rect(X(0.0), Y(1.15), 0.32 * S, 0.18 * S, dark, { strokeWidth: 1 });
  D.rect(X(0.05), Y(1.45), 0.22 * S, 0.12 * S, "#BFC4CA", { strokeWidth: 0.8 });
  if (st === "a4") {
    // streamlined casing: wedge nose, smooth sides, cab with raked front
    D.path(`M${X(0.3)} ${Y(1.55)} Q${X(0.4)} ${Y(2.9)} ${X(1.6)} ${Y(3.55)} Q${X(2.8)} ${Y(3.95)} ${X(4.6)} ${Y(3.97)} L${X(C3.cab[0])} ${Y(3.97)} L${X(C3.cab[0])} ${Y(1.62)} Q${X(3.0)} ${Y(1.5)} ${X(2.6)} ${Y(1.62)} Q${X(1.2)} ${Y(1.62)} ${X(0.3)} ${Y(1.55)} Z`, body, { strokeWidth: 2 });
    D.path(`M${X(1.5)} ${Y(1.62)} Q${X(1.05)} ${Y(2.6)} ${X(1.9)} ${Y(3.55)}`, null, { strokeWidth: 1.2 });
    D.line(X(2.2), Y(2.2), X(C3.cab[0]), Y(2.2), { stroke: stripe, strokeWidth: 2.2 });
    D.rect(X(1.95), Y(3.8), 0.45 * S, 0.08 * S, dark, { strokeWidth: 0.8 });
    D.path(`M${X(C3.cab[0])} ${Y(1.62)} L${X(C3.cab[0])} ${Y(3.97)} L${X(C3.cab[0] + 0.5)} ${Y(4.0)} Q${X(C3.cab[1] - 0.6)} ${Y(4.08)} ${X(C3.cab[1])} ${Y(3.8)} L${X(C3.cab[1])} ${Y(1.62)} Z`, body);
    D.poly([[X(C3.cab[0] + 0.12), Y(3.75)], [X(C3.cab[0] + 0.45), Y(3.88)], [X(C3.cab[0] + 1.05), Y(3.88)], [X(C3.cab[0] + 1.05), Y(3.25)], [X(C3.cab[0] + 0.12), Y(3.25)]], glass, { strokeWidth: 1 });
    D.line(X(C3.cab[0] + 0.15), Y(2.2), X(C3.cab[1] - 0.1), Y(2.2), { stroke: stripe, strokeWidth: 2.2 });
  } else {
    if (st === "gwr") {
      D.rect(X(0.55), Y(C3.rp + 0.08), (C3.E - 0.6) * S, 0.12 * S, dark, { strokeWidth: 1.2 });
      D.rect(X(2.55), Y(C3.rp + 0.42), (C3.cyl[1] - 2.55 + 0.1) * S, 0.12 * S, dark, { strokeWidth: 1.1 });
      C3.drv.forEach((x) => {
        const rr = (C3.drD / 2 + 0.08) * S;
        D.path(`M${X(x) - rr} ${Y(C3.rp + 0.08)} A ${rr} ${rr} 0 0 1 ${X(x) + rr} ${Y(C3.rp + 0.08)} Z`, body, { strokeWidth: 1.4 });
        D.path(`M${X(x) - rr * 0.92} ${Y(C3.rp + 0.08)} A ${rr * 0.92} ${rr * 0.92} 0 0 1 ${X(x) + rr * 0.92} ${Y(C3.rp + 0.08)}`, null, { stroke: brass, strokeWidth: 1.2 });
      });
    } else {
      D.path(`M${X(0.55)} ${Y(1.62)} L${X(1.6)} ${Y(1.62)} Q${X(2.1)} ${Y(1.62)} ${X(2.3)} ${Y(C3.rp)} L${X(C3.E - 0.05)} ${Y(C3.rp)} L${X(C3.E - 0.05)} ${Y(C3.rp + 0.12)} L${X(2.3)} ${Y(C3.rp + 0.12)} Q${X(1.95)} ${Y(1.74)} ${X(1.6)} ${Y(1.74)} L${X(0.55)} ${Y(1.74)} Z`, dark, { strokeWidth: 1.2 });
    }
    // boiler: smokebox, barrel (tapered for LMS), Belpaire firebox
    const sb = C3.smoke, ba = C3.barrel, fb = C3.fire, bc = C3.bc;
    const rf = st === "lms" ? C3.br - 0.06 : C3.br, rb = st === "lms" ? C3.br + 0.08 : C3.br;
    D.path(`M${X(ba[0])} ${Y(bc + rf)} L${X(ba[1])} ${Y(bc + rb)} L${X(ba[1])} ${Y(bc - rb)} L${X(ba[0])} ${Y(bc - rf)} Z`, body, { strokeWidth: 1.8 });
    [0.32, 0.62].forEach((f) => { const x = ba[0] + (ba[1] - ba[0]) * f; D.line(X(x), Y(bc + rf + (rb - rf) * f), X(x), Y(bc - rf - (rb - rf) * f), { strokeWidth: 1, stroke: stripe }); });
    D.rect(X(sb[0]), Y(bc + C3.br + 0.06), (sb[1] - sb[0]) * S, (2 * C3.br + 0.12) * S, dark, { strokeWidth: 1.8 });
    D.path(`M${X(sb[0])} ${Y(bc + C3.br + 0.06)} Q${X(sb[0] - 0.25)} ${Y(bc)} ${X(sb[0])} ${Y(bc - C3.br - 0.06)}`, dark, { strokeWidth: 1.4 });
    D.path(`M${X(fb[0])} ${Y(bc - rb)} L${X(fb[0])} ${Y(bc + rb + 0.05)} Q${X(fb[0] + 0.15)} ${Y(bc + rb + 0.16)} ${X(fb[0] + 0.5)} ${Y(bc + rb + 0.16)} L${X(fb[1])} ${Y(bc + rb + 0.13)} L${X(fb[1])} ${Y(C3.rp)} L${X(fb[0] + 0.6)} ${Y(C3.rp)} L${X(fb[0] + 0.6)} ${Y(bc - rb)} Z`, body, { strokeWidth: 1.8 });
    D.line(X(sb[1]), Y(bc - C3.br), X(sb[1]), Y(C3.rp + 0.1), { strokeWidth: 1.4 });
    const ch = C3.chim;
    D.rect(X(ch - 0.27), Y(3.95), 0.54 * S, (3.95 - bc - C3.br) * S, dark, { strokeWidth: 1.4 });
    if (m.copper) D.rect(X(ch - 0.33), Y(3.97), 0.66 * S, 0.18 * S, copper, { strokeWidth: 1.1 });
    if (st === "gwr") D.path(`M${X(6.0)} ${Y(bc + C3.br)} Q${X(6.05)} ${Y(bc + C3.br + 0.5)} ${X(6.3)} ${Y(bc + C3.br + 0.5)} Q${X(6.55)} ${Y(bc + C3.br + 0.5)} ${X(6.6)} ${Y(bc + C3.br)} Z`, brass, { strokeWidth: 1.2 });
    else {
      D.path(`M${X(5.6)} ${Y(bc + rf + 0.05)} Q${X(5.65)} ${Y(bc + rf + 0.42)} ${X(6.0)} ${Y(bc + rf + 0.42)} Q${X(6.35)} ${Y(bc + rf + 0.42)} ${X(6.4)} ${Y(bc + rf + 0.07)} Z`, body, { strokeWidth: 1.4 });
      D.rect(X(3.4), Y(bc + rf + 0.18), 0.5 * S, 0.18 * S, body, { strokeWidth: 1 });
      D.rect(X(8.6), Y(bc + rb + 0.24), 0.25 * S, 0.24 * S, dark, { strokeWidth: 1 });
    }
    // cab
    const cb = C3.cab;
    D.path(`M${X(cb[0])} ${Y(C3.rp)} L${X(cb[0])} ${Y(3.85)} L${X(cb[1])} ${Y(3.85)} L${X(cb[1])} ${Y(3.15)} Q${X(cb[1] - 0.55)} ${Y(3.1)} ${X(cb[1] - 0.6)} ${Y(2.6)} L${X(cb[1] - 0.6)} ${Y(C3.rp + 0.25)} L${X(cb[1])} ${Y(C3.rp + 0.25)} L${X(cb[1])} ${Y(C3.rp)} Z`, body, { strokeWidth: 1.8 });
    D.rect(X(cb[0] - 0.2), Y(4.0), (cb[1] - cb[0] + 0.5) * S, 0.14 * S, dark, { strokeWidth: 1.2 });
    D.rect(X(cb[0] + 0.18), Y(3.6), 0.55 * S, 0.5 * S, glass, { strokeWidth: 1 });
    D.line(X(cb[0] + 0.1), Y(C3.rp + 0.35), X(cb[1] - 0.7), Y(C3.rp + 0.35), { stroke: stripe, strokeWidth: 1.2 });
  }
  nameplate(C3.drv[1], st === "lms" ? C3.rp + 0.55 : st === "a4" ? 2.75 : C3.drD + 0.42, Math.max(9, Math.min(13, S * 0.45)));
  number(C3.cab[0] + 0.85, st === "a4" ? 2.7 : 2.6);
  logo(tx0 + C3.T / 2, 2.75);
}

/** Ballast ticks and a rail, as in the library cards. */
export function drawTrack(D: P, w = 640, railY = 184, tram = false) {
  if (!tram) for (let x = 6; x < w; x += 22) D.line(x, railY + 2, x + 10, railY + 8, { roughness: 0.6, stroke: D.pal.soft, strokeWidth: 1.2 });
  else D.line(0, railY + 6, w, railY + 6, { roughness: 0.4, stroke: D.pal.soft, strokeWidth: 1, strokeLineDash: [6, 8] } as Opt);
  D.line(0, railY, w, railY, { roughness: 0.6, stroke: D.pal.ink, strokeWidth: 2.4 });
}

/** Metres above the roof taken by pantographs and other roof gear. */
const extraTop = (s: DrawSpec) => ((s.model.roof || []).some(([t]) => t === "panto") || s.model.kind === "tram7" ? 2.0 : 0.5);
const isTramish = (s: DrawSpec) => s.model.kind === "tram7" || !!s.model.tram;

/**
 * Side view box: the 640 x 200 drawing with empty sky trimmed off the top.
 * Returns the viewBox height and how far the drawing is shifted up.
 */
export function sideBox(s: DrawSpec) {
  if (s.model.kind === "legacy") return { h: 170, dy: 30 };
  const S = Math.min(620 / shownLen(s), 172 / (s.h + 0.3));
  const dy = Math.max(0, Math.floor(184 - (s.h + extraTop(s)) * S - 16));
  const more = (s.model.kind === "unit" || s.model.kind === "mpv" || s.model.kind === "nmt") && s.cars > 2 ? MORE_DY + 6 - 16 : 0;
  return { h: 200 - dy + more, dy };
}

/** A side view with track, sized by sideBox(). */
export function paintSide(D: P, s: DrawSpec, L: Livery) {
  const { dy } = sideBox(s);
  D.group(`translate(0 ${-dy})`, () => {
    drawTrack(D, 640, 184, isTramish(s));
    drawClass(D, s, L);
  });
}

export const THUMB_H = 150;
/** Library thumbnail in a 640 x 150 box. Long trains show the leading car running off the edge. */
export function paintThumb(D: P, s: DrawSpec, L: Livery) {
  const k = s.model.kind;
  D.group("translate(0 -50)", () => {
    drawTrack(D, 640, 184, isTramish(s));
    if (k === "legacy") { D.group("translate(40 0)", () => drawClass(D, s, L, 560)); return; }
    const fitLen = k === "unit" || k === "mpv" ? s.len + 5 : k === "nmt" ? s.len + 7 : k === "tram7" ? 26 : undefined;
    drawClass(D, s, L, 640, 184, (126 * (s.h + 0.3)) / (s.h + extraTop(s)), false, fitLen);
  });
}

/** Pixels per metre used by the to-scale strip. */
export const SCALE_PX = 11;

/**
 * To-scale strip in a 640 x 120 box: the vehicle next to a 1.75 m person, with a 10 m bar.
 * `personColour` is the hi-vis colour for the person's head.
 */
export function paintScale(D: P, s: DrawSpec, L: Livery, personColour: string) {
  const S2 = SCALE_PX, rail = 84, ink = D.pal.ink, soft = D.pal.soft;
  D.line(0, rail, 640, rail, { roughness: 0.5, stroke: ink, strokeWidth: 1.6 });
  drawClass(D, s, { ...L, name: "", number: "", logo: "none", noMore: true }, shownLen(s) * S2 + 20, rail, 999, true);
  const px = 618, ph = 1.75 * S2;
  D.circle(px, rail - ph + 2.5, 5, personColour, { roughness: 0.4, strokeWidth: 1.2 });
  D.line(px, rail - ph + 5, px, rail - 7, { roughness: 0.3, strokeWidth: 2 });
  D.line(px, rail - 7, px - 3, rail, { roughness: 0.3, strokeWidth: 1.6 });
  D.line(px, rail - 7, px + 3, rail, { roughness: 0.3, strokeWidth: 1.6 });
  D.line(10, 102, 10 + 10 * S2, 102, { roughness: 0.3, strokeWidth: 2 });
  [0, 5, 10].forEach((mm) => D.line(10 + mm * S2, 97, 10 + mm * S2, 107, { roughness: 0.2, strokeWidth: 1.4 }));
  D.text(10 + 10 * S2 + 10, 109, "10 m", 18, soft, "mono", "start");
  D.text(px + 12, 112, "1.75 m person", 18, soft, "mono", "end");
}
