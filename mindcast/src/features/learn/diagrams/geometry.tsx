/** Track geometry: faults, gauge, cant and switches. */
import React, { useState } from "react";
import { View } from "react-native";
import type { Lesson } from "@/domain/types";
import { Button, tap, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { factMatching, factQuantity } from "../content";
import { dur, useTweenTo } from "@/ui/motion";
import { Frame, Pills, Slider, announce } from "../ui";
import { arrow, tag } from "./draw";

const W = 340;

/* ---------- Geometry: spot the fault ---------- */

const FAULTS = [
  { value: "line", label: "Line", why: "Line: the track has kinked sideways. Seen from above it is no longer a smooth line." },
  { value: "level", label: "Level", why: "Level (engineers also say top): the track dips along its length. Seen from the side, both rails sag together." },
  { value: "twist", label: "Twist", why: "Twist: one rail rises while the other falls over a short distance. That can lift a wheel." },
  { value: "gauge", label: "Gauge", why: "Gauge: the rails have spread apart. Too wide and a wheel can drop between them." },
] as const;
type Fault = (typeof FAULTS)[number]["value"];
const ORDER: Fault[] = ["twist", "line", "gauge", "level"];

export function Geometry({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<Fault | null>(null);
  const [score, setScore] = useState(0);
  const fault = ORDER[round % ORDER.length];
  const right = guess === fault;
  const status = guess === null ? `Fault ${(round % 4) + 1} of 4. Which one is it?` : right ? `Yes. ${FAULTS.find((f) => f.value === fault)!.why}` : `Not this time. ${FAULTS.find((f) => f.value === fault)!.why}`;
  const fact = factMatching(lesson, /twist|gauge|line|level|geometry|recording/i);
  const choose = (g: Fault) => {
    if (guess) return;
    setGuess(g);
    const ok = g === fault;
    if (ok) setScore((s) => s + 1);
    tap(ok ? "success" : "warn");
    announce(ok ? "Correct" : `Not quite, it was ${fault}`);
  };
  const side = fault === "level" || fault === "twist";
  return (
    <Frame title="Spot the fault" hint="Look at the track, then name the geometry fault." status={status} statusColor={guess === null ? c.pass : right ? c.good : c.warn} fact={fact}
      control={<View style={{ gap: 10 }}>
        <Pills silent label="Which fault" value={guess} onChange={choose} color={guess && right ? c.good : guess ? c.warn : undefined} options={FAULTS.map((f) => ({ value: f.value, label: f.label }))} />
        {guess && <Button label={round % 4 === 3 ? `You spotted ${score} of 4. Play again` : "Next fault"} kind="primary" onPress={() => { if (round % 4 === 3) setScore(0); setRound(round + 1); setGuess(null); }} />}
      </View>}>
      <Sketch w={W} h={170} pal={pal} deps={[fault, guess, c.ink]} accessibilityLabel={`Track ${side ? "seen from the side" : "seen from above"}. Which fault is shown?`} paint={(p) => {
        const bump = (x: number, w = 40) => Math.exp(-(((x - 170) / w) ** 2));
        if (!side) {
          const pts1: [number, number][] = [], pts2: [number, number][] = [];
          for (let x = 0; x <= W; x += 10) {
            const off = fault === "line" ? 18 * bump(x) : 0;
            const spread = fault === "gauge" ? 10 * bump(x, 50) : 0;
            pts1.push([x, 64 + off - spread]); pts2.push([x, 104 + off + spread]);
            p.line(x, 56 + off, x, 112 + off, { stroke: c.soft, strokeWidth: 4, roughness: 0.4 });
          }
          p.curve(pts1, { strokeWidth: 3, roughness: 0.4 }); p.curve(pts2, { strokeWidth: 3, roughness: 0.4 });
          p.text(10, 160, "Seen from above", 11, c.soft, "mono", "start");
        } else {
          const a: [number, number][] = [], b: [number, number][] = [];
          for (let x = 0; x <= W; x += 10) {
            if (fault === "level") { const d = 16 * bump(x, 50); a.push([x, 70 + d]); b.push([x, 100 + d]); }
            else { const t = Math.max(-1, Math.min(1, (x - 170) / 40)); a.push([x, 70 - 10 * t]); b.push([x, 100 + 10 * t]); }
          }
          p.curve(a, { strokeWidth: 3, roughness: 0.4 });
          p.curve(b, { strokeWidth: 3, roughness: 0.4, stroke: c.accent });
          p.text(10, 52, "left rail", 13, c.ink, "hand", "start");
          p.text(10, 126, "right rail", 13, c.accent, "hand", "start");
          p.line(0, 70, W, 70, { stroke: c.line, strokeWidth: 1, strokeLineDash: [4, 6] });
          p.line(0, 100, W, 100, { stroke: c.line, strokeWidth: 1, strokeLineDash: [4, 6] });
          p.text(10, 160, "Seen from the side (heights exaggerated)", 11, c.soft, "mono", "start");
        }
        if (guess) p.ellipse(170, 85, 130, 90, null, { stroke: c.pass, strokeWidth: 3 });
      }} />
    </Frame>
  );
}

/* ---------- Gauge ---------- */

export function Gauge({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [t, setT] = useState(0.2);
  const value = factQuantity(lesson, /gauge/i, /mm/);
  const x0 = 100, target = 240, len = 30 + t * 210;
  const end = x0 + len;
  const on = Math.abs(end - target) <= 6;
  const status = on ? `That's the gauge: ${value ?? "standard gauge"}, measured between the inside faces of the rail heads.` : end < target ? "Keep going: stretch the tape to the inside face of the far rail." : "Too far: you have gone past the far rail's inside face.";
  const fact = factMatching(lesson, /gauge/i);
  return (
    <Frame title="Measure the gauge" hint="Stretch the tape across to the far rail." status={status} statusColor={on ? c.good : c.pass} fact={fact}
      control={<Slider value={t} onChange={(v) => { setT(v); const e = x0 + 30 + v * 210; if (Math.abs(e - target) <= 6) { tap("success"); announce(`Gauge found${value ? `: ${value}` : ""}`); } }} label="Tape length" valueText={on ? "on the rail" : "measuring"} left="Short" right="Long" steps={42} />}>
      <Sketch w={W} h={190} pal={pal} deps={[t, value, c.ink]} accessibilityLabel={status} paint={(p) => {
        p.rect(-4, 150, W + 8, 30, c.sunk, { strokeWidth: 1.4 });
        // rails: inner faces of the heads at x = 100 (left) and 240 (right)
        for (const [cx, face] of [[78, 1], [262, -1]] as const) {
          p.poly([[cx - 26, 150], [cx + 26, 150], [cx + 26, 144], [cx + 7, 136], [cx + 6, 96], [cx + 22, 88], [cx + 22, 64], [cx - 22, 64], [cx - 22, 88], [cx - 6, 96], [cx - 7, 136], [cx - 26, 144]], c.surface, { strokeWidth: 2, roughness: 0.5 });
          p.line(cx + face * 22, 60, cx + face * 22, 44, { stroke: c.soft, strokeWidth: 1, strokeLineDash: [3, 3] });
        }
        const col = on ? c.good : c.pass;
        p.rect(x0, 72, len, 10, col, { strokeWidth: 1.4, roughness: 0.4 });
        for (let x = x0 + 10; x < end; x += 10) p.line(x, 72, x, 77, { strokeWidth: 1, stroke: c.ink, roughness: 0.2 });
        p.rect(end - 3, 66, 6, 22, c.ink, { roughness: 0.2 });
        p.text(170, 36, on ? (value ?? "standard gauge") : "?", on ? 26 : 22, on ? c.good : c.soft, on ? "display" : "hand");
        p.text(170, 120, "gauge", 15, c.soft, "hand");
        arrow(p, 150, 110, 102, 110, c.soft, 1.2, 6); arrow(p, 190, 110, 238, 110, c.soft, 1.2, 6);
      }} />
    </Frame>
  );
}

/* ---------- Cant ---------- */

export function Cant({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [v, setV] = useState(0.55);
  const EQ = 0.55;
  const theta = (10 * Math.PI) / 180;
  const g = 62;
  const a = g * Math.tan(theta) * (v / EQ) ** 2; // outward pull felt at speed v
  const lean = Math.atan2(a, g) - theta; // >0 outward of the perpendicular
  const state = Math.abs(lean) < 0.03 ? "balanced" : lean > 0 ? "deficiency" : "excess";
  const status = state === "balanced" ? "Balanced speed: the felt force points straight through the floor. Both rails share the load." : state === "deficiency" ? "Faster than balance: cant deficiency. Passengers feel pushed outwards and the outer rail takes more load." : "Slower than balance: cant excess. The train leans in, and the inner rail takes more load.";
  const fact = factMatching(lesson, /cant|deficien|superelevation|curve/i);
  return (
    <Frame title="Take the curve" hint="Change the speed through a curve with the outer rail raised." status={status} statusColor={state === "balanced" ? c.good : state === "deficiency" ? c.ppe : c.accent} fact={fact}
      control={<Slider value={v} onChange={(n) => { const old = state; setV(n); const na = g * Math.tan(theta) * (n / EQ) ** 2; const nl = Math.atan2(na, g) - theta; const ns = Math.abs(nl) < 0.03 ? "balanced" : nl > 0 ? "cant deficiency" : "cant excess"; if (ns !== old) announce(ns); }} label="Train speed" valueText={state} left="Slow" right="Fast" color={state === "deficiency" ? c.ppe : c.accent} />}>
      <Sketch w={W} h={210} pal={pal} deps={[v, c.ink]} accessibilityLabel={status} paint={(p) => {
        const cx = 170, cy = 168;
        const rot = (x: number, y: number): [number, number] => [cx + x * Math.cos(theta) + y * Math.sin(theta), cy - x * Math.sin(theta) + y * Math.cos(theta)];
        p.poly([rot(-130, 0), rot(130, 0), rot(130, 12), rot(-130, 12)], c.sunk, { strokeWidth: 1.6 });
        p.poly([[20, 200], [320, 200], rot(130, 12), rot(-130, 12)], c.soft, { fillStyle: "hachure", hachureGap: 7, strokeWidth: 1.2 });
        for (const x of [-70, 70]) { const [rx, ry] = rot(x, -6); p.rect(rx - 8, ry - 6, 16, 12, c.ink, { roughness: 0.3 }); }
        p.poly([rot(-80, -14), rot(80, -14), rot(80, -110), rot(-80, -110)], c.surface, { strokeWidth: 2.2, roughness: 0.6 });
        const [mx, my] = rot(0, -62);
        const [px, py] = rot(0, 40);
        p.line(mx, my, px, py, { stroke: c.soft, strokeWidth: 1, strokeLineDash: [5, 5] });
        arrow(p, mx, my, mx, my + g, c.ink, 2.5);
        arrow(p, mx, my, mx + a, my, c.ppe, 2.5);
        const col = state === "balanced" ? c.good : state === "deficiency" ? c.ppe : c.accent;
        arrow(p, mx, my, mx + a, my + g, col, 4, 12);
        tag(p, mx - 8, my + g - 2, "weight", 13, c.ink, c.surface, "hand", "end");
        tag(p, mx + a + 6, my - 6, "outward pull", 13, c.ppe, c.surface, "hand", "start");
        p.text(14, 24, "inside of curve", 11, c.soft, "mono", "start");
        p.text(W - 6, 104, "outer rail", 11, c.soft, "mono", "end");
        p.text(W - 6, 118, "raised", 11, c.soft, "mono", "end");
      }} />
    </Frame>
  );
}

/* ---------- Switch ---------- */

export function Switch({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [route, setRoute] = useState<"main" | "diverge">("main");
  const k = useTweenTo(route === "diverge" ? 1 : 0, dur.base); // 0 = set for main, 1 = set for diverging
  const status = route === "main" ? "Set for the main line: the straight switch rail is closed against its stock rail, so wheels run straight on." : "Set for the branch: the curved switch rail is closed against the other stock rail, so wheel flanges are steered onto the diverging route.";
  const fact = factMatching(lesson, /switch|points|crossing|turnout/i);
  const throwIt = () => { const n = route === "main" ? "diverge" : "main"; setRoute(n); tap(); announce(n === "main" ? "Set for the main line" : "Set for the branch"); };
  return (
    <Frame title="Throw the switch" hint="Move the switch rails and watch the route change." status={status} statusColor={c.accent} fact={fact}
      control={<Button label={route === "main" ? "Throw to the branch" : "Throw to the main line"} kind="primary" onPress={throwIt} />}>
      <Sketch w={W} h={210} pal={pal} deps={[k, c.ink]} accessibilityLabel={status} paint={(p) => {
        const f = (x: number) => (x < 80 ? 0 : 0.00133 * (x - 80) ** 2);
        const curve = (fn: (x: number) => number, x1: number, x2: number, opt = {}) => { const pts: [number, number][] = []; for (let x = x1; x <= x2; x += 10) pts.push([x, fn(x)]); p.curve(pts, { strokeWidth: 3, roughness: 0.4, ...opt }); };
        for (let x = 6; x < W; x += 18) p.line(x, 58, x, 122 + f(x) * 0.9, { stroke: c.line, strokeWidth: 5, roughness: 0.3 });
        // route
        if (k < 0.5) curve(() => 90, 0, W, { stroke: c.accent, strokeWidth: 10, roughness: 0.2 });
        else curve((x) => 90 + f(x), 0, W, { stroke: c.accent, strokeWidth: 10, roughness: 0.2 });
        // stock rails
        curve(() => 70, 0, W);
        curve((x) => 110 + f(x), 0, W);
        // straight closure rail and onward
        curve(() => 110, 160, 240); curve(() => 110, 268, W);
        // curved closure rail and onward
        curve((x) => 70 + f(x), 160, 240); curve((x) => 70 + f(x), 268, W);
        // switch rails, pivoting at x = 160
        const straightToe = 110 - 2 - 8 * k; // closed (k=0) against the lower stock rail
        const curvedToe = 72 + 8 * (1 - k); // closed (k=1) against the upper stock rail
        p.line(80, straightToe, 160, 110, { strokeWidth: 3.5, stroke: k < 0.5 ? c.ink : c.soft, roughness: 0.3 });
        p.line(80, curvedToe, 160, 70 + f(160), { strokeWidth: 3.5, stroke: k >= 0.5 ? c.ink : c.soft, roughness: 0.3 });
        p.circle(80, 50, 10, c.pass, { strokeWidth: 1.4 });
        p.text(92, 46, "switch rails", 12, c.ink, "hand", "start");
        p.text(254, 100, "crossing", 12, c.soft, "hand", "middle");
        p.text(10, 200, k < 0.5 ? "Route: main line" : "Route: branch", 11, c.accent, "mono", "start");
        // train arrow
        arrow(p, 6, 90, 50, 90, c.ink, 3, 10);
      }} />
    </Frame>
  );
}
