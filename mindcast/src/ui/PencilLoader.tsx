/**
 * The one loading state: a small rough.js pencil whose tip draws a wavy line, over and over, with a short label.
 * Use it only for real waits (live departures, the forecast, building a 3D scene). With reduce motion on it is a
 * still pencil at the end of its line, plus the label.
 */
import React, { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useMotion } from "./motion";
import { Painter, type Node } from "./sketch";
import { useTheme } from "./theme";
import { F, type as T } from "./tokens";

type PathNode = Extract<Node, { k: "p" }>;

/** Line width and the wave the tip follows (drawing units are points). */
const W = 132, H = 22, BASE = 13, AMP = 4.5, WAVE = 26;
const waveY = (x: number) => BASE + AMP * Math.sin((x / WAVE) * Math.PI * 2);
/** One loop: draw for most of it, then the line fades and the pencil lifts back to the start. */
const LOOP = 2200, DRAW = 0.8;
const PENCIL = 44, TIP = { x: 5, y: 39 };

function paths(ink: string, wood: string, seed: number, fn: (p: Painter, ink: string, wood: string) => void): PathNode[] {
  const p = new Painter({ ink, paper: wood, glass: wood, soft: ink }, seed);
  fn(p, ink, wood);
  return p.nodes().filter((n): n is PathNode => n.k === "p");
}

/** A pencil pointing down and left, its graphite tip at TIP. */
function paintPencil(p: Painter, ink: string, wood: string) {
  const d = [0.62, -0.785], n = [0.785, 0.62], hw = 4.6;
  const at = (s: number, side: number): [number, number] => [TIP.x + d[0] * s + n[0] * hw * side, TIP.y + d[1] * s + n[1] * hw * side];
  const o = { stroke: ink, strokeWidth: 1.5, roughness: 0.7 };
  // body, ferrule, eraser
  p.poly([at(10, -1), at(32, -1), at(32, 1), at(10, 1)], wood, o);
  p.poly([at(32, -1), at(36.5, -1), at(36.5, 1), at(32, 1)], null, { ...o, fill: ink, fillStyle: "hachure", hachureGap: 1.6, fillWeight: 0.6 });
  p.poly([at(36.5, -1), at(42, -1), at(42, 1), at(36.5, 1)], null, o);
  // a line down the body, then the sharpened wood and the graphite
  p.line(...at(10, 0), ...at(32, 0), { stroke: ink, strokeWidth: 0.8, roughness: 0.6 });
  p.poly([at(10, -1), [TIP.x, TIP.y], at(10, 1)], null, o);
  p.poly([at(3.4, -0.34), [TIP.x, TIP.y], at(3.4, 0.34)], ink, { ...o, strokeWidth: 1 });
}

function Paths({ nodes }: { nodes: PathNode[] }) {
  return <>{nodes.map((n, i) => <Path key={i} d={n.d} stroke={n.stroke === "none" ? undefined : n.stroke} strokeWidth={n.sw} fill={n.fill} strokeLinecap="round" strokeLinejoin="round" />)}</>;
}

export function PencilLoader({ label, tone = "paper" }: { label: string; tone?: "paper" | "board" }) {
  const { c } = useTheme();
  const m = useMotion();
  // The departure board is dark in both themes, so it brings its own ink.
  const ink = tone === "board" ? "#ECEAE4" : c.ink;
  const wood = tone === "board" ? "#22282F" : c.surface;
  const soft = tone === "board" ? "#A3ABB5" : c.soft;

  const pencil = useMemo(() => paths(ink, wood, 7, paintPencil), [ink, wood]);
  const line = useMemo(() => paths(soft, wood, 19, (p) => {
    const pts: [number, number][] = [];
    for (let x = 2; x <= W - 2; x += 4) pts.push([x, waveY(x)]);
    p.curve(pts, { stroke: soft, strokeWidth: 1.6, roughness: 0.5 });
  }), [soft, wood]);

  const t = useSharedValue(0);
  useEffect(() => {
    if (m.reduce) return;
    t.set(withRepeat(withTiming(1, { duration: LOOP, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [m.reduce, t]);

  const clip = useAnimatedStyle(() => {
    const k = t.get();
    return { width: Math.min(1, k / DRAW) * W, opacity: k <= DRAW ? 1 : 1 - (k - DRAW) / (1 - DRAW) };
  });
  const lead = useAnimatedStyle(() => {
    const k = t.get();
    const x = Math.min(1, k / DRAW) * W;
    const y = BASE + AMP * Math.sin((x / WAVE) * Math.PI * 2);
    const fade = k < 0.06 ? k / 0.06 : k <= DRAW ? 1 : 1 - (k - DRAW) / (1 - DRAW);
    return { opacity: fade, transform: [{ translateX: x - TIP.x }, { translateY: y - TIP.y - (k > DRAW ? (k - DRAW) * 20 : 0) }] };
  });

  const still = { transform: [{ translateX: W - TIP.x }, { translateY: waveY(W) - TIP.y }] };

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: 10, paddingVertical: 6 }}>
      <View style={{ width: W + PENCIL - TIP.x, height: PENCIL + 2, justifyContent: "flex-end" }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Animated.View style={[{ position: "absolute", left: 0, bottom: 0, height: H, overflow: "hidden" }, m.reduce ? { width: W } : clip]}>
          <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}><Paths nodes={line} /></Svg>
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, top: PENCIL + 2 - H }, m.reduce ? still : lead]}>
          <Svg width={PENCIL} height={PENCIL} viewBox={`0 0 ${PENCIL} ${PENCIL}`}><Paths nodes={pencil} /></Svg>
        </Animated.View>
      </View>
      <Text style={{ fontFamily: F.mono, fontSize: T.eyebrow[0], lineHeight: T.eyebrow[1], letterSpacing: 0.6, color: soft, textAlign: "center" }}>{label}</Text>
    </View>
  );
}
