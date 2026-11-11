/**
 * Hand-drawn drawing for the whole app.
 *
 * <Sketch> renders a react-native-svg canvas. You give it a `paint` function that receives a Painter
 * (rect, circle, line, path, poly, curve, ellipse, arc, text, image, group). Shapes are generated with
 * rough.js (sketchy strokes and hachure fills) and rendered as plain SVG paths, so it works on iOS,
 * Android and web, and can be captured as an image (postcards).
 *
 * Determinism: every shape gets a seed from a running counter, so a drawing looks the same on every render
 * unless you change `seed` (use that for a gentle "boil" animation).
 */
import React, { useMemo } from "react";
import { Platform } from "react-native";
import Svg, { G, Image as SvgImage, Path, Text as SvgText } from "react-native-svg";
import { RoughGenerator } from "roughjs/bin/generator";
import type { Options } from "roughjs/bin/core";
import { F } from "./tokens";

export type Pal = { ink: string; paper: string; glass: string; soft: string };
export type Opt = Partial<Options> & { fill?: string; fillStyle?: string };
export type Node = { k: "p"; d: string; stroke: string; sw: number; fill: string } | { k: "t"; x: number; y: number; s: string; size: number; color: string; font: string; anchor: "start" | "middle" | "end"; weight?: string } | { k: "img"; href: string; x: number; y: number; w: number; h: number } | { k: "g"; transform: string; children: Node[] };

export type Font = "display" | "hand" | "mono" | "body";
const fontFamily = (f: Font) => (f === "display" ? F.display : f === "hand" ? F.hand : f === "mono" ? F.mono : F.bodySemi);

/** Approximate text width (no canvas on native). Good enough for sizing nameplates and labels. */
export function measure(s: string, size: number, font: Font = "body") {
  const k = font === "display" ? 0.6 : font === "mono" ? 0.62 : font === "hand" ? 0.42 : 0.52;
  return s.length * size * k;
}

export class Painter {
  private gen = new RoughGenerator();
  private seed: number;
  private stack: Node[][] = [[]];
  pal: Pal;
  constructor(pal: Pal, seed = 1) { this.pal = pal; this.seed = seed; }
  private o(fill?: string | null, ex?: Opt): Options {
    const base: Opt = { roughness: 1, stroke: this.pal.ink, strokeWidth: 2, seed: this.seed++ };
    if (fill) Object.assign(base, { fill, fillStyle: "solid" });
    return Object.assign(base, ex || {}) as Options;
  }
  private push(drawable: ReturnType<RoughGenerator["rectangle"]>) {
    for (const p of this.gen.toPaths(drawable)) this.stack[this.stack.length - 1].push({ k: "p", d: p.d, stroke: p.stroke, sw: p.strokeWidth, fill: p.fill || "none" });
  }
  rect(x: number, y: number, w: number, h: number, fill?: string | null, ex?: Opt) { this.push(this.gen.rectangle(x, y, w, h, this.o(fill, ex))); }
  circle(x: number, y: number, d: number, fill?: string | null, ex?: Opt) { this.push(this.gen.circle(x, y, d, this.o(fill, ex))); }
  ellipse(x: number, y: number, w: number, h: number, fill?: string | null, ex?: Opt) { this.push(this.gen.ellipse(x, y, w, h, this.o(fill, ex))); }
  line(x1: number, y1: number, x2: number, y2: number, ex?: Opt) { this.push(this.gen.line(x1, y1, x2, y2, this.o(null, ex))); }
  path(d: string, fill?: string | null, ex?: Opt) { this.push(this.gen.path(d, this.o(fill, ex))); }
  poly(pts: [number, number][], fill?: string | null, ex?: Opt) { this.push(this.gen.polygon(pts, this.o(fill, ex))); }
  curve(pts: [number, number][], ex?: Opt) { this.push(this.gen.curve(pts, this.o(null, ex))); }
  linear(pts: [number, number][], ex?: Opt) { this.push(this.gen.linearPath(pts, this.o(null, ex))); }
  arc(x: number, y: number, w: number, h: number, a0: number, a1: number, closed = false, fill?: string | null, ex?: Opt) { this.push(this.gen.arc(x, y, w, h, a0, a1, closed, this.o(fill, ex))); }
  text(x: number, y: number, s: string, size: number, color: string, font: Font = "body", anchor: "start" | "middle" | "end" = "middle") {
    this.stack[this.stack.length - 1].push({ k: "t", x, y, s, size, color, font: fontFamily(font), anchor });
  }
  /** A plain (not rough) path: for dense textures such as ballast stipple, which would be slow and noisy through rough.js. */
  raw(d: string, fill: string, stroke = "none", sw = 0) { this.stack[this.stack.length - 1].push({ k: "p", d, stroke, sw, fill }); }
  image(href: string, x: number, y: number, w: number, h: number) { this.stack[this.stack.length - 1].push({ k: "img", href, x, y, w, h }); }
  /** Draw children inside a transformed group, e.g. painter.group("translate(10 0) scale(2)", () => ...) */
  group(transform: string, fn: () => void) { this.stack.push([]); fn(); const children = this.stack.pop()!; this.stack[this.stack.length - 1].push({ k: "g", transform, children }); }
  nodes() { return this.stack[0]; }
}

export function renderNodes(nodes: Node[], key = "n"): React.ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}-${i}`;
    if (n.k === "p") return <Path key={k} d={n.d} stroke={n.stroke === "none" ? undefined : n.stroke} strokeWidth={n.sw} fill={n.fill} strokeLinecap="round" strokeLinejoin="round" />;
    if (n.k === "t") return <SvgText key={k} x={n.x} y={n.y} fill={n.color} fontSize={n.size} fontFamily={n.font} textAnchor={n.anchor}>{n.s}</SvgText>;
    if (n.k === "img") return <SvgImage key={k} href={n.href} x={n.x} y={n.y} width={n.w} height={n.h} preserveAspectRatio="xMidYMid meet" />;
    return <G key={k} transform={n.transform}>{renderNodes(n.children, k)}</G>;
  });
}

type SketchProps = {
  /** viewBox width and height (drawing units). */
  w: number;
  h: number;
  pal: Pal;
  paint: (p: Painter) => void;
  /** Change to re-roll the hand-drawn wobble (animation). */
  seed?: number;
  /** Values that should trigger a redraw. */
  deps?: unknown[];
  style?: object;
  accessibilityLabel?: string;
};

/** A hand-drawn SVG canvas that scales to its container width. */
export function Sketch({ w, h, pal, paint, seed = 1, deps = [], style, accessibilityLabel }: SketchProps) {
  const nodes = useMemo(() => {
    const p = new Painter(pal, seed);
    try { paint(p); } catch (e) { if (__DEV__) console.warn("Sketch paint failed", e); }
    return p.nodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pal.ink, pal.paper, pal.glass, pal.soft, seed, ...deps]);
  return (
    <Svg viewBox={`0 0 ${w} ${h}`} width="100%" style={[{ aspectRatio: w / h }, style as object]} accessibilityLabel={accessibilityLabel} accessible={!!accessibilityLabel} {...(Platform.OS === "web" ? { role: "img" } : {})}>
      {renderNodes(nodes)}
    </Svg>
  );
}
