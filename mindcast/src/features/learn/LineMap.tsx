/** The season line: 20 stops on a gently curving, hand-drawn track. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import type { Lesson } from "@/domain/types";
import { usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { dur, ease } from "@/ui/motion";
import { F } from "@/ui/tokens";

export const MAP_W = 340;
const TOP = 56, GAP = 64;
export type StopState = "done" | "current" | "open" | "locked" | "soon";

/** Stop centre in viewBox units. */
export const stopXY = (i: number): [number, number] => [170 + 92 * Math.sin(i * 0.6 + 0.3), TOP + i * GAP];

/** Catmull-Rom samples through the stops, so the track is smooth and we can place sleepers. */
function sample(n: number) {
  const pts = Array.from({ length: n }, (_, i) => stopXY(i));
  const ext = [[pts[0][0], pts[0][1] - GAP], ...pts, [pts[n - 1][0], pts[n - 1][1] + GAP]] as [number, number][];
  const out: { x: number; y: number; seg: number }[] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]];
    for (let k = 0; k < 12; k++) {
      const t = k / 12, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]), seg: i - 1 });
    }
  }
  out.push({ x: pts[n - 1][0], y: pts[n - 1][1], seg: n - 1 });
  return out;
}

/**
 * `active` is false while the Line tab is behind another screen: the map then holds its last shown position,
 * so the train glides and the finished stop is stamped when the learner actually comes back to see it.
 */
export function LineMap({ slots, states, current, scores, onSelect, active = true }: { slots: (Lesson | undefined)[]; states: StopState[]; current: number; scores: (number | undefined)[]; onSelect: (i: number) => void; active?: boolean }) {
  const { c } = useTheme();
  const pal = usePal();
  const reduce = useReducedMotion();
  const n = slots.length;
  const H = TOP + (n - 1) * GAP + 50;
  const [w, setW] = useState(0);
  const k = w / MAP_W;
  const samples = useMemo(() => sample(n), [n]);
  const key = states.join(",");

  // What the learner last saw. Stops that became done since then get a one-off stamp when they look again.
  const seen = useRef<{ key: string; current: number } | null>(null);
  const [shownCurrent, setShownCurrent] = useState(current);
  const [stamps, setStamps] = useState<number[]>([]);
  useEffect(() => {
    if (!active) return;
    const before = seen.current;
    if (before && before.key !== key) {
      const old = before.key.split(",");
      setStamps(states.map((st, i) => (st === "done" && old[i] !== "done" ? i : -1)).filter((i) => i >= 0));
    }
    seen.current = { key, current };
    setShownCurrent(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key, current]);

  // train position: glides between stops (after any stamp has landed)
  const [cx, cy] = stopXY(shownCurrent);
  const tx = useSharedValue(cx), ty = useSharedValue(cy);
  useEffect(() => {
    const [x, y] = stopXY(shownCurrent);
    if (reduce) { tx.set(x); ty.set(y); return; }
    const delay = stamps.length ? dur.slow : 0;
    tx.set(withDelay(delay, withTiming(x, { duration: dur.glide, easing: ease.inOut })));
    ty.set(withDelay(delay, withTiming(y, { duration: dur.glide, easing: ease.inOut })));
  }, [shownCurrent, reduce, tx, ty, stamps.length]);
  const trainStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() * k - 26 }, { translateY: ty.get() * k - 46 }] }));

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      <Sketch w={MAP_W} h={H} pal={pal} deps={[key, n, c.ink]} accessibilityLabel={`Season line with ${n} stops`} paint={(p) => {
        const passedTo = current; // segments before the current stop are travelled
        const rail = (off: number, from: number, to: number, col: string, sw: number) => {
          const pts: [number, number][] = [];
          for (let i = from; i <= to && i < samples.length; i += 2) {
            const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
            const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
            pts.push([samples[i].x - (dy / L) * off, samples[i].y + (dx / L) * off]);
          }
          if (pts.length > 1) p.curve(pts, { stroke: col, strokeWidth: sw, roughness: 0.6 });
        };
        const split = samples.findIndex((s) => s.seg >= passedTo);
        const cut = split < 0 ? samples.length - 1 : split;
        // sleepers
        for (let i = 1; i < samples.length - 1; i += 2) {
          const a = samples[i - 1], b = samples[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
          const nx = -dy / L, ny = dx / L;
          p.line(samples[i].x - nx * 9, samples[i].y - ny * 9, samples[i].x + nx * 9, samples[i].y + ny * 9, { stroke: i < cut ? c.accent : c.line, strokeWidth: 2.2, roughness: 0.4 });
        }
        for (const off of [-5, 5]) {
          if (cut > 0) rail(off, 0, cut, c.accent, 2.6);
          rail(off, Math.max(0, cut - 1), samples.length - 1, c.soft, 1.6);
        }
        states.forEach((st, i) => {
          const [x, y] = stopXY(i);
          if (st === "done") { p.circle(x, y, 28, c.accent, { strokeWidth: 2, stroke: c.accent, roughness: 0.6 }); p.linear([[x - 6, y], [x - 1, y + 5], [x + 7, y - 5]], { stroke: c.onAccent, strokeWidth: 2.6, roughness: 0.3 }); }
          else if (st === "current") { p.circle(x, y, 40, c.pass, { strokeWidth: 0, stroke: "none", roughness: 0.8 }); p.circle(x, y, 28, c.surface, { strokeWidth: 3, roughness: 0.5 }); p.text(x, y + 4.5, String(i + 1), 13, c.ink, "mono"); }
          else if (st === "open") { p.circle(x, y, 28, c.surface, { strokeWidth: 2.4, stroke: c.accent, roughness: 0.5 }); p.text(x, y + 4.5, String(i + 1), 12, c.accent, "mono"); }
          else { p.circle(x, y, 26, c.sunk, { strokeWidth: 1.4, stroke: c.soft, roughness: 0.7, ...(st === "soon" ? { strokeLineDash: [3, 3] } : {}) }); p.text(x, y + 4, String(i + 1), 11, c.soft, "mono"); }
        });
        p.text(stopXY(n - 1)[0], H - 8, "end of season", 16, c.soft, "hand");
      }} />
      {w > 0 && states[shownCurrent] === "current" && <Pulse x={stopXY(shownCurrent)[0] * k} y={stopXY(shownCurrent)[1] * k} size={40 * k} color={c.pass} />}
      {w > 0 && stamps.map((i) => <Stamp key={`stamp-${i}`} x={stopXY(i)[0] * k} y={stopXY(i)[1] * k} size={28 * k} color={c.good} />)}
      {w > 0 && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, trainStyle]}>
          <Train />
        </Animated.View>
      )}
      {w > 0 && slots.map((l, i) => {
        const [x, y] = stopXY(i);
        const right = x < 170;
        const st = states[i];
        const sub = st === "done" ? `Done${scores[i] != null ? ` · ${scores[i]}/3` : ""}` : st === "current" ? "You are here" : st === "open" ? "Open" : st === "soon" ? "Coming soon" : "Locked";
        const title = l?.title ?? `Stop ${i + 1}`;
        const left = right ? x * k - 22 : 4;
        const width = right ? w - left - 4 : x * k + 22 - 4;
        return (
          <Pressable key={i} onPress={() => onSelect(i)} accessibilityRole="button" accessibilityLabel={`Stop ${i + 1}, ${title}. ${sub}`}
            style={({ pressed }) => ({ position: "absolute", top: y * k - 22, left, width, minHeight: 44, flexDirection: right ? "row" : "row-reverse", alignItems: "center", opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 44, height: 44 }} />
            <View style={{ flexShrink: 1, paddingHorizontal: 8, alignItems: right ? "flex-start" : "flex-end" }}>
              <Text numberOfLines={2} style={{ fontFamily: F.bodySemi, fontSize: 14, lineHeight: 18, color: st === "locked" || st === "soon" ? c.soft : c.ink, textAlign: right ? "left" : "right", backgroundColor: c.bg + "CC" }}>{title}</Text>
              <Text style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: st === "done" ? c.accent : st === "current" ? c.ink : c.soft }}>{sub}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A slow ring breathing out from the current stop: "you are here". Nothing moves with reduce motion on. */
function Pulse({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) { cancelAnimation(t); t.set(0); return; }
    t.set(withRepeat(withTiming(1, { duration: dur.pulse, easing: ease.out }), -1, false));
    return () => cancelAnimation(t);
  }, [reduce, t]);
  const st = useAnimatedStyle(() => ({ opacity: 0.75 * (1 - t.get()), transform: [{ scale: 0.9 + t.get() * 0.7 }] }));
  if (reduce) return null;
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color }, st]} />;
}

/** One-off confirmation on a stop that has just been finished: a green ring swells out and fades. */
function Stamp({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withTiming(1, { duration: dur.slow + 200, easing: ease.out }));
  }, [reduce, t]);
  const st = useAnimatedStyle(() => ({ opacity: 1 - t.get(), transform: [{ scale: 1 + t.get() * 1.2 }] }));
  if (reduce) return null;
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: color }, st]} />;
}

function Train() {
  const { c } = useTheme();
  const pal = usePal();
  return (
    <View style={{ width: 52, height: 28 }}>
      <Sketch w={52} h={28} pal={pal} deps={[c.ink]} paint={(p) => {
        p.rect(3, 4, 40, 16, c.surface, { strokeWidth: 1.8, roughness: 0.5 });
        p.poly([[43, 4], [50, 12], [50, 20], [43, 20]], c.pass, { strokeWidth: 1.6, roughness: 0.4 });
        p.rect(8, 8, 9, 6, pal.glass, { strokeWidth: 1, roughness: 0.2 });
        p.rect(21, 8, 9, 6, pal.glass, { strokeWidth: 1, roughness: 0.2 });
        for (const x of [11, 35]) p.circle(x, 22, 8, c.ink, { roughness: 0.2 });
      }} />
    </View>
  );
}
