/** Shared hand-drawn shapes for the Learn diagrams. */
import { measure, type Painter } from "@/ui/sketch";
import type { Palette } from "@/ui/tokens";

/** A hand-drawn arrow from (x1,y1) to (x2,y2). */
export function arrow(p: Painter, x1: number, y1: number, x2: number, y2: number, color: string, sw = 2.5, head = 9) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = Math.min(head, len * 0.6);
  p.line(x1, y1, x2, y2, { stroke: color, strokeWidth: sw, roughness: 0.8 });
  p.line(x2, y2, x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45), { stroke: color, strokeWidth: sw, roughness: 0.6 });
  p.line(x2, y2, x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45), { stroke: color, strokeWidth: sw, roughness: 0.6 });
}

/** Flat-bottom rail cross-section (head, web, foot) centred on x, foot resting on y. s = scale. */
export function railSection(p: Painter, x: number, y: number, s: number, fill: string | null, stroke?: string) {
  const pts: [number, number][] = [
    [-14, 0], [14, 0], [14, -3], [4, -7], [3.2, -26], [8, -29], [8, -38], [-8, -38], [-8, -29], [-3.2, -26], [-4, -7], [-14, -3],
  ];
  p.poly(pts.map(([px, py]) => [x + px * s, y + py * s]), fill, { roughness: 0.6, strokeWidth: 1.8, ...(stroke ? { stroke } : {}) });
}

/** Ballast stones as a hachured trapezoid with a few drawn stones. */
export function ballastBed(p: Painter, x: number, y: number, topW: number, botW: number, h: number, color: string, stones = true) {
  const cx = x;
  p.poly([[cx - topW / 2, y], [cx + topW / 2, y], [cx + botW / 2, y + h], [cx - botW / 2, y + h]], color, { fillStyle: "hachure", hachureGap: 6, roughness: 1.2, strokeWidth: 1.6 });
  if (!stones) return;
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9;
    const sx = cx - botW / 2 + 8 + t * (botW - 16);
    const sy = y + h * (0.35 + 0.4 * ((i * 37) % 10) / 10);
    if (Math.abs(sx - cx) > (topW / 2 + ((sy - y) / h) * (botW - topW) / 2) - 6) continue;
    p.poly([[sx - 5, sy], [sx - 1, sy - 5], [sx + 5, sy - 2], [sx + 3, sy + 4], [sx - 3, sy + 4]], null, { strokeWidth: 1, roughness: 0.8 });
  }
}

/** A small label with a hand-drawn leader line. */
export function callout(p: Painter, x: number, y: number, tx: number, ty: number, label: string, c: Palette, color?: string) {
  p.line(x, y, tx, ty + (ty > y ? -12 : 4), { stroke: color ?? c.soft, strokeWidth: 1, roughness: 0.6 });
  p.text(tx, ty, label, 12, color ?? c.ink, "body", tx > x + 4 ? "start" : tx < x - 4 ? "end" : "middle");
}

/** Mix two hex colours (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return "#" + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
}

/** Clamp to 0..1. */
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Text on a small paper patch so it stays readable over hatching. */
export function tag(p: Painter, x: number, y: number, s: string, size: number, color: string, bg: string, font: "body" | "hand" | "mono" = "mono", anchor: "start" | "middle" | "end" = "start") {
  const w = measure(s, size, font) + 8;
  const x0 = anchor === "start" ? x - 4 : anchor === "end" ? x - w + 4 : x - w / 2;
  p.rect(x0, y - size, w, size + 5, bg, { strokeWidth: 0, stroke: "none", roughness: 0 });
  p.text(x, y, s, size, color, font, anchor);
}
