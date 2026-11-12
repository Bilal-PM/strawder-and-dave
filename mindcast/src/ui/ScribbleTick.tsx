/**
 * A hand-shaded tick: a rough.js box or circle, hatched in with pencil strokes when checked, with a tick (or a cross)
 * drawn on top. Used wherever a real choice or completion happens (quiz answers, Your week, the composer's audience).
 *
 * Motion: when it becomes checked the hatching and then the tick draw on in about 200 ms (stroke-dash reveal).
 * With reduce motion on nothing moves: the finished mark fades in. Unchecking clears it at once.
 *
 * It is decoration only. The parent owns the touch target (44pt or more), the role and the accessibility state.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { dur, useMotion } from "./motion";
import { Painter, type Node } from "./sketch";
import { useTheme } from "./theme";

type PathNode = Extract<Node, { k: "p" }>;
const NOPAL = { ink: "#000", paper: "#fff", glass: "#fff", soft: "#000" };

function draw(seed: number, fn: (p: Painter) => void): PathNode[] {
  const p = new Painter(NOPAL, seed);
  fn(p);
  return p.nodes().filter((n): n is PathNode => n.k === "p");
}

/**
 * Length of the longest subpath, over-estimated from control points. SVG restarts the dash pattern on every subpath,
 * so a dash of this length reveals each stroke (every hatch line, both passes of the tick) together.
 */
export function longestSubpath(d: string) {
  let max = 0, len = 0, x = 0, y = 0;
  const re = /([MLC])([^MLC]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (m[1] === "M") { max = Math.max(max, len); len = 0; x = n[0]; y = n[1]; continue; }
    for (let i = 0; i + 1 < n.length; i += 2) { len += Math.hypot(n[i] - x, n[i + 1] - y); x = n[i]; y = n[i + 1]; }
  }
  return Math.ceil(Math.max(max, len)) + 2;
}

/** 0 → 1 over `ms` each time `on` turns true (after mount, or on mount when `fromMount`). Off is instant. */
function useDrawOn(on: boolean, ms: number, enabled: boolean, fromMount: boolean) {
  const [t, setT] = useState(on && !fromMount ? 1 : 0);
  const cur = useRef(t);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const put = (k: number) => { cur.current = k; setT(k); };
    if (!on) { raf = requestAnimationFrame(() => put(0)); return () => cancelAnimationFrame(raf); }
    // Already drawn (mounted checked): nothing to animate.
    if (cur.current >= 1) return;
    const start = Date.now() - cur.current * ms;
    const step = () => {
      const k = Math.min(1, (Date.now() - start) / ms);
      put(k);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on, ms, enabled]);
  return t;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type ScribbleTickProps = {
  checked: boolean;
  /** Drawn size in points. The parent provides the 44pt touch target. */
  size?: number;
  shape?: "box" | "circle";
  /** "tick" for chosen or done, "cross" for a wrong answer. */
  mark?: "tick" | "cross";
  /** Hatching colour. Defaults to accent blue (selected or completed). */
  color?: string;
  /** Hatch the shape in when checked. Off draws only the mark (e.g. the right answer you did not pick). */
  shade?: boolean;
  /** Draw on when it first mounts already checked (an item that has just been completed). */
  drawOnMount?: boolean;
  /** Shown inside the empty shape, e.g. the answer letter. */
  children?: React.ReactNode;
  seed?: number;
  style?: StyleProp<ViewStyle>;
};

export function ScribbleTick({ checked, size = 26, shape = "box", mark = "tick", color, shade = true, drawOnMount = false, children, seed = 3, style }: ScribbleTickProps) {
  const { c } = useTheme();
  const m = useMotion();
  const col = color ?? c.accent;
  const outlineCol = checked ? c.ink : c.soft;
  const t = useDrawOn(checked, dur.quick + 20, !m.reduce, drawOnMount);
  const shown = m.reduce ? (checked ? 1 : 0) : t;

  // Drawn in a 100 x 100 box; strokes scale with `size`.
  const outline = useMemo(() => draw(seed, (p) => {
    if (shape === "circle") p.circle(50, 50, 84, null, { stroke: outlineCol, strokeWidth: 6, roughness: 0.8 });
    else p.rect(10, 10, 80, 80, null, { stroke: outlineCol, strokeWidth: 6, roughness: 1 });
  }), [seed, shape, outlineCol]);
  const hatch = useMemo(() => draw(seed + 11, (p) => {
    const ex = { stroke: "none", fill: col, fillStyle: "hachure", hachureAngle: -41, hachureGap: 11, fillWeight: 5, roughness: 1.4 };
    if (shape === "circle") p.circle(50, 50, 76, col, ex);
    else p.rect(15, 15, 70, 70, col, ex);
  }), [seed, shape, col]);
  const markPaths = useMemo(() => draw(seed + 23, (p) => {
    const o = { stroke: c.ink, strokeWidth: 10, roughness: 0.9, bowing: 1.2 };
    if (mark === "cross") { p.line(28, 28, 72, 72, o); p.line(72, 28, 28, 72, o); }
    else p.curve([[20, 50], [32, 62], [44, 74], [62, 48], [86, 18]], o);
  }), [seed, mark, c.ink]);

  const lens = useMemo(() => ({ hatch: hatch.map((n) => longestSubpath(n.d)), mark: markPaths.map((n) => longestSubpath(n.d)) }), [hatch, markPaths]);
  // Hatching first, the mark overlapping its end: hatch over 0 to 0.6, mark over 0.35 to 1.
  const hk = shade ? clamp01(shown / 0.6) : 0;
  const mk = shade ? clamp01((shown - 0.35) / 0.65) : shown;

  const reveal = (n: PathNode, len: number, k: number, key: string) => (
    <Path key={key} d={n.d} stroke={n.stroke === "none" ? undefined : n.stroke} strokeWidth={n.sw} fill="none" strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={k >= 1 ? undefined : [len, len]} strokeDashoffset={k >= 1 ? undefined : len * (1 - k)} />
  );

  const marks = (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {shade && hk > 0 && hatch.map((n, i) => reveal(n, lens.hatch[i], hk, `h${i}`))}
      {mk > 0 && markPaths.map((n, i) => reveal(n, lens.mark[i], mk, `m${i}`))}
    </Svg>
  );

  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <View style={{ position: "absolute", left: 0, top: 0 }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {outline.map((n, i) => <Path key={i} d={n.d} stroke={n.stroke} strokeWidth={n.sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
        </Svg>
      </View>
      {!checked && children}
      {checked && (
        m.reduce
          ? <Animated.View key={`${mark}-${shade}`} entering={m.fade()} style={{ position: "absolute", left: 0, top: 0 }}>{marks}</Animated.View>
          : <View style={{ position: "absolute", left: 0, top: 0 }}>{marks}</View>
      )}
    </View>
  );
}
