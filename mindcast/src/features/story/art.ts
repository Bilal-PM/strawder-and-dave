/**
 * Drawing helpers for story scenes, matched to the reference plates in assets/illustrations/plates:
 * loose double ink lines, white rail and sleeper shapes, stippled ballast, Caveat labels with a small tick,
 * and blue only for fastenings and the thing to look at.
 */
import type { Painter } from "@/ui/sketch";
import type { Palette } from "@/ui/tokens";
import { mix } from "@/features/learn/diagrams/draw";
import { seeded } from "./living";

/** Ink for the stippled ballast: a dark grey on paper, a light grey at night. */
export const stoneInk = (c: Palette, dark: boolean) => mix(c.ink, c.bg, dark ? 0.45 : 0.28);

/** Loose ink, like the plates. */
export const LOOSE = { roughness: 1.15, strokeWidth: 2 } as const;
export const FIRM = { roughness: 0.7, strokeWidth: 2 } as const;

/**
 * Stippled ballast: many small irregular stones in ONE plain path (not rough.js: a few hundred stones through
 * rough would be slow and blotchy). `skip` leaves room for sleepers.
 */
export function stipple(p: Painter, x: number, y: number, w: number, h: number, color: string, seed: number, density = 0.05, skip: [number, number, number, number][] = []) {
  const count = Math.round(w * h * density * 0.12);
  let d = "";
  for (let i = 0; i < count; i++) {
    const sx = x + seeded(i, seed) * w;
    const sy = y + seeded(i, seed + 1) * h;
    // Thin out towards the bottom edge, like a shoulder of stones.
    if (seeded(i, seed + 5) < ((sy - y) / h) ** 3 * 0.6) continue;
    if (skip.some(([kx, ky, kw, kh]) => sx > kx - 2 && sx < kx + kw + 2 && sy > ky - 2 && sy < ky + kh + 2)) continue;
    const r = 1.1 + seeded(i, seed + 2) * 1.7;
    const sides = 5 + Math.floor(seeded(i, seed + 3) * 2);
    const rot = seeded(i, seed + 4) * Math.PI;
    for (let k = 0; k < sides; k++) {
      const a = rot + (k / sides) * Math.PI * 2;
      const rr = r * (0.7 + 0.5 * seeded(i * 7 + k, seed + 6));
      d += `${k === 0 ? "M" : "L"}${(sx + Math.cos(a) * rr).toFixed(1)} ${(sy + Math.sin(a) * rr * 0.8).toFixed(1)}`;
    }
    d += "Z";
  }
  p.raw(d, color);
}

/** A rail seen from the side, as in the plates: a long white bar with the head and foot lines inside. */
export function railSide(p: Painter, x1: number, x2: number, y: number, h: number, c: Palette, fill?: string) {
  p.rect(x1, y, x2 - x1, h, fill ?? c.surface, FIRM);
  p.line(x1 + 2, y + h * 0.3, x2 - 2, y + h * 0.3, { roughness: 0.8, strokeWidth: 1.3 });
  p.line(x1 + 2, y + h * 0.8, x2 - 2, y + h * 0.8, { roughness: 0.8, strokeWidth: 1.1, stroke: c.soft });
}

/** A sleeper end-on: a white block, slightly narrower at the top. */
export function sleeperEnd(p: Painter, x: number, y: number, w: number, h: number, c: Palette) {
  p.poly([[x + 2.5, y], [x + w - 2.5, y], [x + w, y + h], [x, y + h]], c.surface, LOOSE);
}

/** A fishplate across a joint with its bolts (dark dots, like the plate). */
export function fishplate(p: Painter, x1: number, x2: number, y: number, h: number, bolts: number[], c: Palette, r = 6) {
  p.rect(x1, y, x2 - x1, h, c.surface, { roughness: 0.8, strokeWidth: 2 });
  for (const bx of bolts) p.circle(bx, y + h / 2, r * 2, c.ink, { roughness: 0.6, strokeWidth: 1 });
}

/** A Caveat label with the plates' small tick mark before it. */
export function label(p: Painter, x: number, y: number, s: string, c: Palette, size = 17, color?: string, anchor: "start" | "middle" | "end" = "start") {
  const col = color ?? c.ink;
  if (anchor === "start") p.line(x - 9, y - size * 0.55, x - 4, y - size * 0.25, { stroke: col, strokeWidth: 1.4, roughness: 0.4 });
  p.text(x, y, s, size, col, "hand", anchor);
}

/** A soft cloud outline. */
export function cloud(p: Painter, x: number, y: number, s: number, c: Palette) {
  p.path(`M${x} ${y} h${62 * s} a${11 * s} ${11 * s} 0 0 0 ${-8 * s} ${-16 * s} a${15 * s} ${15 * s} 0 0 0 ${-24 * s} ${-9 * s} a${13 * s} ${13 * s} 0 0 0 ${-22 * s} ${8 * s} a${10 * s} ${10 * s} 0 0 0 ${-8 * s} ${17 * s} z`, c.bg, { stroke: c.soft, strokeWidth: 1.6, roughness: 0.9 });
}

/** A telegraph pole: post, cross-arm and two insulators. */
export function pole(p: Painter, x: number, top: number, bottom: number, c: Palette) {
  p.line(x, top, x, bottom, { strokeWidth: 2.4, roughness: 0.7, stroke: c.soft });
  p.line(x - 13, top + 8, x + 13, top + 8, { strokeWidth: 2, roughness: 0.6, stroke: c.soft });
  p.circle(x - 10, top + 5, 4, c.soft, { roughness: 0.3, strokeWidth: 1, stroke: c.soft });
  p.circle(x + 10, top + 5, 4, c.soft, { roughness: 0.3, strokeWidth: 1, stroke: c.soft });
}

/** The sun's disc (rays are a separate part, so they can turn). */
export function sunDisc(p: Painter, cx: number, cy: number, r: number, c: Palette) {
  p.circle(cx, cy, r * 2, c.pass, { roughness: 0.9, strokeWidth: 2, stroke: c.ink });
}
export function sunRays(p: Painter, cx: number, cy: number, r: number, c: Palette, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r1 = r + 5, r2 = r + (i % 2 ? 11 : 15);
    p.line(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, { stroke: c.ink, strokeWidth: 1.8, roughness: 0.5 });
  }
}

/** A hand-drawn arrow (line plus two barbs). */
export function arrow(p: Painter, x1: number, y1: number, x2: number, y2: number, color: string, sw = 2.2, head = 8) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.line(x1, y1, x2, y2, { stroke: color, strokeWidth: sw, roughness: 0.7 });
  p.line(x2, y2, x2 - head * Math.cos(a - 0.5), y2 - head * Math.sin(a - 0.5), { stroke: color, strokeWidth: sw, roughness: 0.5 });
  p.line(x2, y2, x2 - head * Math.cos(a + 0.5), y2 - head * Math.sin(a + 0.5), { stroke: color, strokeWidth: sw, roughness: 0.5 });
}

/** Car body for a simple two-car unit, drawn with its left end at x (no wheels: they turn on their own layers). */
export function carBody(p: Painter, x: number, y: number, len: number, c: Palette, front: boolean, glass: string) {
  const h = 44;
  if (front) p.path(`M${x} ${y + 6} Q${x} ${y} ${x + 8} ${y} L${x + len - 22} ${y} Q${x + len - 4} ${y + 2} ${x + len} ${y + 20} L${x + len} ${y + h} L${x} ${y + h} Z`, c.surface, FIRM);
  else p.path(`M${x} ${y + 6} Q${x} ${y} ${x + 8} ${y} L${x + len - 8} ${y} Q${x + len} ${y} ${x + len} ${y + 6} L${x + len} ${y + h} L${x} ${y + h} Z`, c.surface, FIRM);
  p.line(x + 3, y + h - 9, x + len - 3, y + h - 9, { stroke: c.accent, strokeWidth: 3, roughness: 0.5 });
  const wins = front ? 3 : 4;
  for (let i = 0; i < wins; i++) p.rect(x + 12 + i * 24, y + 9, 16, 13, glass, { roughness: 0.6, strokeWidth: 1.3 });
  if (front) {
    p.path(`M${x + len - 18} ${y + 4} Q${x + len - 6} ${y + 6} ${x + len - 3} ${y + 20} L${x + len - 18} ${y + 20} Z`, glass, { roughness: 0.6, strokeWidth: 1.3 });
    p.rect(x + len - 9, y + 24, 8, 10, c.pass, { roughness: 0.4, strokeWidth: 1.1 });
  }
  p.line(x + len * 0.45, y + 6, x + len * 0.45, y + h - 11, { strokeWidth: 1.2, roughness: 0.5 });
  // bogie frames
  for (const bx of [x + 22, x + len - 22]) p.rect(bx - 15, y + h, 30, 5, c.ink, { roughness: 0.4, strokeWidth: 1 });
}

/** A railway wheel seen from the side, centred on (cx, cy): rim, disc holes and hub, so turning shows. */
export function wheel(p: Painter, cx: number, cy: number, r: number, c: Palette, holes = 4) {
  p.circle(cx, cy, r * 2, c.surface, { roughness: 0.6, strokeWidth: r > 20 ? 2.2 : 1.6 });
  p.circle(cx, cy, r * 0.5, c.ink, { roughness: 0.3, strokeWidth: 1 });
  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * Math.PI * 2 + 0.4;
    p.circle(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58, r * 0.22, null, { roughness: 0.4, strokeWidth: 1.1 });
  }
}

/** A person, head and shoulders (for the team on the work side of a Mindcast). */
export function person(p: Painter, x: number, y: number, c: Palette, tone: string) {
  p.circle(x, y, 15, c.surface, { roughness: 0.7, strokeWidth: 1.8 });
  p.path(`M${x - 13} ${y + 26} Q${x - 12} ${y + 11} ${x} ${y + 11} Q${x + 12} ${y + 11} ${x + 13} ${y + 26}`, tone, { roughness: 0.8, strokeWidth: 1.8, fillStyle: "hachure", hachureGap: 4 });
}
