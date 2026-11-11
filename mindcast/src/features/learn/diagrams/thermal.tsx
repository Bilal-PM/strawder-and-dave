/** Heat in rails: expansion, stressing, buckling. Movement is exaggerated and labelled so. */
import React, { useState } from "react";
import type { Lesson } from "@/domain/types";
import { usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { factMatching, factQuantity } from "../content";
import { Frame, Pills, Slider, announce } from "../ui";
import { arrow, mix } from "./draw";

const W = 340;

export function RailExpansion({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [t, setT] = useState(0.5);
  const [mode, setMode] = useState<"jointed" | "cwr">("jointed");
  const heat = t < 0.34 ? "cold" : t > 0.66 ? "hot" : "mild";
  const k = (t - 0.5) * 2; // -1 tension .. +1 compression
  const status =
    mode === "jointed"
      ? heat === "cold" ? "Cold: each rail shrinks and the joint gap opens." : heat === "hot" ? "Hot: each rail grows and the joint gap closes up." : "Mild: the rails sit with a small gap at the joint."
      : Math.abs(k) < 0.1 ? "At its stress-free temperature the welded rail carries no thermal force." : k > 0 ? "Hot: the welded rail wants to grow, but sleepers and clips hold it. It stays put and builds up compression." : "Cold: the welded rail wants to shrink, so it is pulled in tension. It still stays put.";
  const fact = factMatching(lesson, /expan|contract|°C|temperature|stress[- ]free|neutral/i);
  return (
    <Frame title="Heat the rail" hint="Slide from cold to hot. Switch between jointed track and continuous welded rail." status={status} statusColor={k > 0.1 ? c.ppe : c.accent} fact={fact}
      control={<>
        <Slider value={t} onChange={setT} label="Rail temperature" valueText={heat} left="Cold" right="Hot" color={mix(c.accent, c.ppe, t)} />
        <Pills label="Type of track" value={mode} onChange={(m) => { setMode(m); announce(m === "cwr" ? "Continuous welded rail" : "Jointed track"); }} options={[{ value: "jointed", label: "Jointed" }, { value: "cwr", label: "Continuous welded" }]} />
      </>}>
      <Sketch w={W} h={170} pal={pal} deps={[t, mode, c.ink]} accessibilityLabel={`${mode === "cwr" ? "Continuous welded rail" : "Jointed rail"}, ${heat}. ${status}`} paint={(p) => {
        const railFill = mix(c.sunk, c.ppe, Math.max(0, t - 0.2) * 0.8);
        for (let x = 22; x < W; x += 30) p.rect(x, 104, 18, 14, c.sunk, { roughness: 0.8, strokeWidth: 1.4 });
        p.line(6, 118, W - 6, 118, { stroke: c.soft, strokeWidth: 1 });
        if (mode === "jointed") {
          const e = 18 * t;
          const lEnd = 152 + e, rStart = 188 - e;
          p.rect(-4, 82, lEnd + 4, 20, railFill, { roughness: 0.7 });
          p.rect(rStart, 82, W + 4 - rStart, 20, railFill, { roughness: 0.7 });
          p.rect(135, 85, 70, 13, null, { stroke: c.soft, strokeWidth: 1.4, roughness: 0.6 });
          for (const bx of [145, 160, 180, 195]) p.circle(bx, 91.5, 5, c.soft, { roughness: 0.3, strokeWidth: 1 });
          const gap = rStart - lEnd;
          p.line(lEnd, 60, lEnd, 76, { stroke: c.ppe, strokeWidth: 1.5 });
          p.line(rStart, 60, rStart, 76, { stroke: c.ppe, strokeWidth: 1.5 });
          p.text(170, 52, gap > 8 ? "gap" : "almost closed", 13, c.ppe, "hand");
          arrow(p, 128 + e, 40, 150 + e, 40, c.ink, 1.6, 6);
          arrow(p, 212 - e, 40, 190 - e, 40, c.ink, 1.6, 6);
          p.text(18, 150, "Movement exaggerated", 11, c.soft, "mono", "start");
        } else {
          p.rect(-4, 82, W + 8, 20, railFill, { roughness: 0.7 });
          for (let x = 31; x < W; x += 30) p.line(x - 6, 102, x + 6, 102, { stroke: c.ink, strokeWidth: 3, roughness: 0.4 });
          const L = 12 + 50 * Math.abs(k);
          const col = k > 0 ? c.ppe : c.accent;
          if (Math.abs(k) >= 0.1) {
            if (k > 0) { arrow(p, 30, 60, 30 + L, 60, col, 3); arrow(p, W - 30, 60, W - 30 - L, 60, col, 3); }
            else { arrow(p, 150, 60, 150 - L, 60, col, 3); arrow(p, W - 150, 60, W - 150 + L, 60, col, 3); }
          }
          p.text(170, 40, Math.abs(k) < 0.1 ? "stress-free" : k > 0 ? "compression" : "tension", 22, Math.abs(k) < 0.1 ? c.good : col, "hand");
          p.text(18, 150, "Rail held by sleepers and clips: it stays put", 11, c.soft, "mono", "start");
        }
      }} />
    </Frame>
  );
}

export function Stressing({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [t, setT] = useState(0);
  const sft = factQuantity(lesson, /stress[- ]free|neutral|stressing/i, /°C/);
  const closed = t >= 0.96;
  const status = t === 0 ? "The rail was cut and freed on rollers. It is cooler than its stress-free temperature, so it is shorter than it should be." : closed ? "Gap closed: weld now. Once clipped down, the rail behaves as if it had been laid at its stress-free temperature." : "Pulling: the tensor stretches the rail to the length it would have at its stress-free temperature.";
  const fact = factMatching(lesson, /stress|tensor|°C|neutral/i);
  return (
    <Frame title="Stress the rail" hint="Pull with the hydraulic tensor until the gap closes." status={status} statusColor={closed ? c.good : c.accent} fact={fact}
      control={<Slider value={t} onChange={(v) => { setT(v); if (v >= 0.96 && t < 0.96) announce("Gap closed. Ready to weld."); }} label="Tensor pull" valueText={closed ? "gap closed" : `${Math.round(t * 100)} percent pulled`} left="Free" right="Pulled" />}>
      <Sketch w={W} h={190} pal={pal} deps={[t, sft, c.ink]} accessibilityLabel={`Rail stressing. ${status}`} paint={(p) => {
        const gap = 6 + 34 * (1 - t);
        const lEnd = 150 - gap / 2 + 0, rStart = 150 + gap / 2;
        for (let x = 20; x < 290; x += 34) p.circle(x, 128, 10, c.sunk, { strokeWidth: 1.2 });
        p.rect(-4, 104, lEnd + 4, 18, c.sunk, { roughness: 0.7 });
        p.rect(rStart, 104, 290 - rStart, 18, c.sunk, { roughness: 0.7 });
        p.text(20, 152, "rollers", 12, c.soft, "hand", "start");
        // tensor frame
        p.rect(lEnd - 46, 92, 16, 34, c.ink, { roughness: 0.5 });
        p.rect(rStart + 30, 92, 16, 34, c.ink, { roughness: 0.5 });
        p.rect(lEnd - 40, 70, rStart - lEnd + 80, 14, null, { strokeWidth: 2, roughness: 0.6 });
        p.line(lEnd - 38, 84, lEnd - 38, 92, { strokeWidth: 2 });
        p.line(rStart + 38, 84, rStart + 38, 92, { strokeWidth: 2 });
        p.text(150, 62, "tensor", 14, c.ink, "hand");
        if (t > 0.02) { const L = 8 + 26 * t; arrow(p, 40, 113, 40 + L, 113, c.accent, 3); arrow(p, 260, 113, 260 - L, 113, c.accent, 3); }
        p.text(150, 146, closed ? "weld gap" : "gap", 13, closed ? c.good : c.ink, "hand");
        // thermometer: the rail is cooler than its stress-free temperature
        const tx = 312;
        p.rect(tx - 7, 30, 14, 110, c.surface, { roughness: 0.6, strokeWidth: 1.6 });
        p.circle(tx, 146, 22, c.accent, { roughness: 0.5 });
        p.rect(tx - 3, 100, 6, 44, c.accent, { roughness: 0.2, strokeWidth: 0 });
        p.line(tx - 14, 56, tx + 14, 56, { stroke: c.good, strokeWidth: 2.5 });
        p.text(tx - 16, 46, sft ? `SFT ${sft}` : "stress-free", 11, c.good, "mono", "end");
        p.text(tx - 16, 104, "rail now", 11, c.accent, "mono", "end");
      }} />
    </Frame>
  );
}

/** Lateral offset shape: derivative of a bell curve, which gives the S-shaped buckle. */
const sShape = (x: number) => { const u = (x - 170) / 55; return (-u * Math.exp(-u * u)) / 0.4289; };

export function Buckle({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [t, setT] = useState(0.3);
  const [weak, setWeak] = useState<"full" | "weak">("full");
  const thr = weak === "weak" ? 0.55 : 0.88;
  const A = t > thr ? Math.min(1, (t - thr) / 0.1) * 24 : 0;
  const buckled = A > 0;
  const status = buckled ? "Buckle: compression beat the track's sideways resistance. It has jumped into an S shape. Trains must stop." : t > 0.5 ? (weak === "weak" ? "Compression is building, and this spot has less ballast holding it sideways." : "Compression is building, but a full ballast shoulder holds the track straight.") : "Cool enough: little thermal force in the rail.";
  const fact = factMatching(lesson, /buckl|shoulder|lateral|°C|heat/i);
  return (
    <Frame title="Turn up the heat" hint="Raise the rail temperature. Then try again with a weak spot in the ballast shoulder." status={status} statusColor={buckled ? c.warn : t > 0.5 ? c.ppe : c.accent} fact={fact}
      control={<>
        <Slider value={t} onChange={(v) => { setT(v); const nb = v > thr; if (nb !== buckled) announce(nb ? "The track has buckled" : "Track straight"); }} label="Rail temperature" valueText={buckled ? "buckled" : t > 0.5 ? "hot" : "cool"} left="Cool" right="Very hot" color={mix(c.accent, c.ppe, t)} />
        <Pills label="Ballast shoulder" value={weak} onChange={setWeak} options={[{ value: "full", label: "Full shoulder" }, { value: "weak", label: "Weak spot" }]} />
      </>}>
      <Sketch w={W} h={180} pal={pal} deps={[t, weak, c.ink]} accessibilityLabel={`Track seen from above. ${status}`} paint={(p) => {
        const y1 = 74, y2 = 112, mid = (y1 + y2) / 2;
        // ballast shoulders
        const shoulder = (y: number, h: number) => {
          if (weak === "weak") { p.rect(4, y, 126, h, c.soft, { fillStyle: "hachure", hachureGap: 5, strokeWidth: 1 }); p.rect(214, y, 122, h, c.soft, { fillStyle: "hachure", hachureGap: 5, strokeWidth: 1 }); }
          else p.rect(4, y, 332, h, c.soft, { fillStyle: "hachure", hachureGap: 5, strokeWidth: 1 });
        };
        shoulder(36, 18); shoulder(132, 18);
        if (weak === "weak") { p.text(172, 30, "weak spot", 15, c.ink, "hand"); p.ellipse(172, 46, 88, 18, null, { stroke: c.pass, strokeWidth: 2 }); }
        for (let x = 10; x <= 330; x += 16) { const d = A * sShape(x); p.line(x, 62 + d, x, 124 + d, { stroke: c.soft, strokeWidth: 4, roughness: 0.4 }); }
        const col = buckled ? c.warn : mix(c.ink, c.ppe, Math.max(0, t - 0.3));
        for (const y of [y1, y2]) { const pts: [number, number][] = []; for (let x = 0; x <= W; x += 10) pts.push([x, y + A * sShape(x)]); p.curve(pts, { stroke: col, strokeWidth: 3, roughness: 0.5 }); }
        if (t > 0.35 && !buckled) { const L = 10 + 30 * t; arrow(p, 6, mid, 6 + L, mid, c.ppe, 3); arrow(p, W - 6, mid, W - 6 - L, mid, c.ppe, 3); }
        p.text(10, 172, "Seen from above. Movement exaggerated.", 11, c.soft, "mono", "start");
      }} />
    </Frame>
  );
}
