/** The track structure: layers, sleepers, ballast, fastenings, formation, drainage. */
import React, { useEffect, useState } from "react";
import type { Lesson } from "@/domain/types";
import { usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { factMatching, factQuantity, glossaryTerm } from "../content";
import { Frame, Pills, Slider, announce, useTween } from "../ui";
import { arrow, mix, railSection, tag } from "./draw";

const W = 340;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Plain description: the glossary wins; otherwise a short role description. */
const describe = (term: string, fallback: string) => glossaryTerm(term)?.plain ?? fallback;

/* ---------- Track layers ---------- */

const LAYERS = [
  { value: "rail", label: "Rail", role: "Steel beam that carries the wheels and guides them." },
  { value: "pad", label: "Pad", role: "A layer between rail and sleeper that cushions the load and insulates." },
  { value: "sleeper", label: "Sleeper", role: "Holds the two rails at the right distance apart and spreads their load into the ballast." },
  { value: "ballast", label: "Ballast", role: "Angular stones that lock together, hold the sleepers in place and let water drain away." },
  { value: "sub-ballast", label: "Sub-ballast", role: "A finer layer that spreads the load further and keeps the ground from mixing into the ballast." },
  { value: "formation", label: "Formation", role: "The prepared ground that the whole track sits on." },
] as const;
type LayerId = (typeof LAYERS)[number]["value"];

export function TrackLayers({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [sel, setSel] = useState<LayerId>("rail");
  const layer = LAYERS.find((l) => l.value === sel)!;
  const fact = factMatching(lesson, new RegExp(layer.value === "sub-ballast" ? "sub-ballast" : layer.value, "i")) ?? factMatching(lesson, /layer|ballast|sleeper/i);
  return (
    <Frame title="Dig down through the track" hint="Tap a layer to see what it does." status={`${layer.label}: ${describe(layer.value, layer.role)}`} fact={fact}
      control={<Pills label="Track layer" value={sel} onChange={(v) => { setSel(v); announce(v); }} options={LAYERS.map((l) => ({ value: l.value, label: l.label }))} />}>
      <Sketch w={W} h={200} pal={pal} deps={[sel, c.ink]} accessibilityLabel={`Cross-section of the track with ${layer.label} highlighted`} paint={(p) => {
        const hi = (id: LayerId, base: string) => (sel === id ? c.accent : base);
        const sw = (id: LayerId) => (sel === id ? 2.6 : 1.4);
        const K = 0.72, OY = 18;
        p.group(`translate(0 ${OY}) scale(${K})`, () => {
          p.rect(-4, 182, 344, 50, hi("formation", c.soft), { fillStyle: sel === "formation" ? "solid" : "cross-hatch", hachureGap: 9, strokeWidth: sw("formation") });
          p.poly([[40, 160], [300, 160], [330, 182], [10, 182]], hi("sub-ballast", c.soft), { fillStyle: sel === "sub-ballast" ? "solid" : "dots", hachureGap: 5, strokeWidth: sw("sub-ballast") });
          p.poly([[70, 104], [270, 104], [310, 160], [30, 160]], hi("ballast", c.sunk), { fillStyle: sel === "ballast" ? "solid" : "hachure", hachureGap: 6, strokeWidth: sw("ballast"), ...(sel === "ballast" ? {} : { fill: c.soft }) });
          for (let i = 0; i < 18; i++) { const x = 50 + rnd(i) * 240, y = 120 + rnd(i + 40) * 34; p.poly([[x - 5, y], [x - 1, y - 5], [x + 5, y - 2], [x + 3, y + 4], [x - 3, y + 4]], c.bg, { strokeWidth: 1, roughness: 0.8 }); }
          p.rect(78, 96, 184, 18, hi("sleeper", c.sunk), { strokeWidth: sw("sleeper"), roughness: 0.7 });
          for (const x of [116, 224]) {
            p.rect(x - 20, 91, 40, 5, hi("pad", c.ink), { strokeWidth: 1, roughness: 0.3 });
            railSection(p, x, 91, 1.3, hi("rail", c.sunk));
          }
        });
        const LBL: [LayerId, number, number, number][] = [["rail", 224, 50, 30], ["pad", 238, 93, 62], ["sleeper", 258, 105, 92], ["ballast", 290, 140, 122], ["sub-ballast", 316, 172, 152], ["formation", 330, 205, 184]];
        for (const [id, ax, ay, ly] of LBL) {
          const on = sel === id;
          p.line(ax * K + 2, ay * K + OY, 252, ly - 4, { stroke: on ? c.accent : c.line, strokeWidth: on ? 1.6 : 1, roughness: 0.4 });
          p.text(256, ly, id, on ? 17 : 13, on ? c.accent : c.soft, on ? "hand" : "body", "start");
        }
      }} />
    </Frame>
  );
}

/* ---------- Sleeper spacing ---------- */

export function SleeperSpacing({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [s, setS] = useState(0.3);
  const gap = 26 + 34 * s;
  const xs: number[] = [];
  for (let x = 170 - Math.floor(160 / gap) * gap; x <= 330; x += gap) xs.push(x);
  const L = 96;
  const raw = xs.map((x) => Math.max(0, 1 - Math.abs(x - 170) / L));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const share = raw.map((r) => r / sum);
  const sharing = share.filter((v) => v > 0.001).length;
  const status = s < 0.4 ? `Close spacing: ${sharing} sleepers share the wheel's load, so each presses gently on the ballast.` : s > 0.7 ? `Wide spacing: only ${sharing} sleepers share the load. Each presses harder and the rail bends more between them.` : `${sharing} sleepers share the load under the wheel.`;
  const fact = factMatching(lesson, /spacing|sleepers? (per|every)|mm apart|centres/i) ?? factMatching(lesson, /sleeper/i);
  return (
    <Frame title="Space the sleepers" hint="Slide to move the sleepers closer or further apart. Watch how the load shares out." status={status} fact={fact}
      control={<Slider value={s} onChange={setS} label="Sleeper spacing" valueText={s < 0.4 ? "close" : s > 0.7 ? "wide" : "medium"} left="Close" right="Wide" />}>
      <Sketch w={W} h={200} pal={pal} deps={[s, c.ink]} accessibilityLabel={status} paint={(p) => {
        const depth = 2 + 9 * s;
        const pts: [number, number][] = [];
        for (let x = 0; x <= W; x += 10) pts.push([x, 66 + depth * Math.exp(-(((x - 170) / 60) ** 2))]);
        p.curve(pts, { strokeWidth: 3.5, roughness: 0.4 });
        p.curve(pts.map(([x, y]) => [x, y + 8]), { strokeWidth: 1.5, roughness: 0.4, stroke: c.soft });
        p.circle(170, 46 + depth, 36, c.sunk, { strokeWidth: 2 });
        p.circle(170, 46 + depth, 6, c.ink);
        arrow(p, 170, 0, 170, 22 + depth, c.ppe, 3);
        p.text(184, 14, "wheel load", 14, c.ppe, "hand", "start");
        xs.forEach((x, i) => {
          const dy = depth * Math.exp(-(((x - 170) / 60) ** 2));
          p.rect(x - 8, 78 + dy, 16, 12, share[i] > 0.001 ? c.sunk : c.bg, { strokeWidth: 1.5, roughness: 0.5 });
          if (share[i] > 0.001) p.rect(x - 6, 178 - share[i] * 110, 12, share[i] * 110, mix(c.accent, c.ppe, Math.min(1, share[i] * 2.4)), { roughness: 0.4, strokeWidth: 1 });
        });
        p.line(4, 178, W - 4, 178, { stroke: c.soft, strokeWidth: 1 });
        p.text(8, 194, "Pressure under each sleeper", 11, c.soft, "mono", "start");
      }} />
    </Frame>
  );
}

/* ---------- Ballast lock ---------- */

export function BallastLock({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [kind, setKind] = useState<"angular" | "round">("angular");
  const [load, setLoad] = useState(0);
  const sink = kind === "angular" ? 3 * load : 26 * load;
  const status = load < 0.1 ? "No train yet. Press down with the load slider." : kind === "angular" ? "Angular stones lock together at their edges. The sleeper barely moves." : "Rounded stones roll past each other and spread out. The sleeper sinks and the track loses its shape.";
  const fact = factMatching(lesson, /angular|interlock|stone|ballast/i);
  return (
    <Frame title="Squeeze the ballast" hint="Choose the stone shape, then put a train's weight on the sleeper." status={status} statusColor={kind === "round" && load > 0.3 ? c.warn : c.accent} fact={fact}
      control={<>
        <Pills label="Stone shape" value={kind} onChange={(k) => { setKind(k); announce(`${k} stones`); }} options={[{ value: "angular", label: "Angular stones" }, { value: "round", label: "Rounded stones" }]} />
        <Slider value={load} onChange={setLoad} label="Load on the sleeper" valueText={load < 0.1 ? "none" : load > 0.7 ? "heavy" : "some"} left="No load" right="Heavy train" color={c.ppe} />
      </>}>
      <Sketch w={W} h={200} pal={pal} deps={[kind, load, c.ink]} accessibilityLabel={`${kind} ballast under load. ${status}`} paint={(p) => {
        if (load > 0.02) arrow(p, 170, 4, 170, 34 + sink, c.ppe, 3 + load * 2, 12);
        let n = 0;
        for (let row = 0; row < 5; row++) for (let col = 0; col < 10; col++) {
          const bx = 62 + col * 24 + (row % 2) * 12 + (rnd(n) - 0.5) * 6;
          const by = 74 + row * 22 + (rnd(n + 99) - 0.5) * 5;
          const depthK = 1 - row / 5;
          const near = Math.max(0, 1 - Math.abs(bx - 170) / 110);
          const dx = kind === "round" ? Math.sign(bx - 170) * load * 26 * depthK * near : 0;
          const dy = (kind === "round" ? load * 18 : load * 3) * depthK * near;
          const x = bx + dx, y = by + dy;
          if (kind === "round") p.circle(x, y, 19, c.sunk, { strokeWidth: 1.5, roughness: 0.6 });
          else { const r = 11; const pts: [number, number][] = []; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + rnd(n + k) * 0.6; const rr = r * (0.7 + rnd(n * 3 + k) * 0.45); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } p.poly(pts, c.sunk, { strokeWidth: 1.5, roughness: 0.6 }); }
          n++;
        }
        p.rect(80, 40 + sink, 180, 20, c.surface, { strokeWidth: 2.2, roughness: 0.6 });
        p.text(170, 55 + sink, "sleeper", 13, c.soft, "hand");
        if (kind === "round" && load > 0.35) { arrow(p, 56, 120, 22, 128, c.warn, 2.5); arrow(p, 284, 120, 318, 128, c.warn, 2.5); }
        p.line(10, 40, 70, 40, { stroke: c.good, strokeWidth: 1.2, strokeLineDash: [4, 4] });
        p.text(10, 34, "start level", 11, c.good, "mono", "start");
      }} />
    </Frame>
  );
}

/* ---------- Fastening ---------- */

const PARTS = [
  { value: "clip", label: "Clip", role: "A spring steel clip. Driven into place, it presses down on the rail foot and holds the rail." },
  { value: "shoulder", label: "Shoulder", role: "Cast into the sleeper. The clip anchors in it, and it stops the rail moving sideways." },
  { value: "insulator", label: "Insulator", role: "Sits between clip and rail so electrical current in the rail cannot leak into the sleeper." },
  { value: "pad", label: "Pad", role: "Sits under the rail. Cushions the load, reduces wear and insulates." },
  { value: "toe load", label: "Toe load", role: "The downward force from the clip's toe on the rail foot. It grips the rail and stops it creeping." },
] as const;
type PartId = (typeof PARTS)[number]["value"];

export function Fastening({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [sel, setSel] = useState<PartId>("clip");
  const part = PARTS.find((x) => x.value === sel)!;
  const toe = factQuantity(lesson, /toe load|clamp/i, /kN/);
  const fact = factMatching(lesson, new RegExp(sel, "i")) ?? factMatching(lesson, /clip|fasten|toe/i);
  return (
    <Frame title="Take apart a rail fastening" hint="Tap a part to find it on the drawing." status={`${part.label}: ${describe(part.value, part.role)}`} fact={fact}
      control={<Pills label="Fastening part" value={sel} onChange={(v) => { setSel(v); announce(v); }} options={PARTS.map((x) => ({ value: x.value, label: x.label }))} />}>
      <Sketch w={W} h={220} pal={pal} deps={[sel, toe, c.ink]} accessibilityLabel={`Rail fastening cross-section with the ${part.label} highlighted`} paint={(p) => {
        const on = (id: PartId) => sel === id;
        p.rect(-4, 160, W + 8, 64, c.sunk, { fillStyle: "dots", hachureGap: 7, fill: c.soft, strokeWidth: 1.6 });
        tag(p, 12, 212, "concrete sleeper", 11, c.soft, c.bg);
        for (const sx of [1, -1]) {
          const x0 = 170 + sx * 92;
          p.rect(x0 - 12, 128, 24, 34, on("shoulder") ? c.accent : c.soft, { strokeWidth: on("shoulder") ? 2.6 : 1.6, roughness: 0.5 });
          p.rect(170 + sx * 44 - 7, 140, 14, 10, on("insulator") ? c.accent : c.pass, { strokeWidth: on("insulator") ? 2.4 : 1.2, roughness: 0.3 });
          const clipCol = on("clip") ? c.accent : c.ink;
          const d = `M ${x0} ${148} C ${x0 + sx * -4} ${104}, ${170 + sx * 70} ${104}, ${170 + sx * 62} ${126} C ${170 + sx * 56} ${140}, ${170 + sx * 48} ${132}, ${170 + sx * 44} ${138}`;
          p.path(d, null, { stroke: clipCol, strokeWidth: on("clip") ? 6 : 4.5, roughness: 0.4 });
          if (on("toe load") || on("clip")) arrow(p, 170 + sx * 44, 96, 170 + sx * 44, 134, on("toe load") ? c.ppe : c.soft, on("toe load") ? 3.2 : 1.6, 10);
        }
        p.rect(130, 150, 80, 10, on("pad") ? c.accent : c.ink, { strokeWidth: 1, roughness: 0.3 });
        railSection(p, 170, 150, 2.8, c.surface);
        if (on("toe load")) { p.text(10, 52, "toe load", 18, c.ppe, "hand", "start"); if (toe) p.text(10, 72, `${toe} each`, 16, c.ppe, "hand", "start"); }
      }} />
    </Frame>
  );
}

/* ---------- Formation ---------- */

export function Formation({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [s, setS] = useState(0.2);
  const D = 34 + 84 * s;
  const fw = 70 + 2 * 0.75 * D;
  const pr = 70 / fw;
  const status = s < 0.35 ? "Thin layers: the load reaches the ground on a narrow patch, so the pressure there is high. Soft ground can give way." : s > 0.7 ? "Deep layers spread the same load over a wide patch. The ground feels much less pressure." : "The layers spread the load as it travels down.";
  const fact = factMatching(lesson, /formation|subgrade|spread|pressure|depth/i);
  return (
    <Frame title="Spread the load" hint="Slide to make the ballast and sub-ballast deeper." status={status} statusColor={s < 0.35 ? c.ppe : c.accent} fact={fact}
      control={<Slider value={s} onChange={setS} label="Depth of ballast and sub-ballast" valueText={s < 0.35 ? "thin" : s > 0.7 ? "deep" : "medium"} left="Thin" right="Deep" />}>
      <Sketch w={W} h={220} pal={pal} deps={[s, c.ink]} accessibilityLabel={status} paint={(p) => {
        const top = 52, base = top + D;
        arrow(p, 170, 2, 170, 36, c.ppe, 3.5, 12);
        p.text(184, 18, "load", 15, c.ppe, "hand", "start");
        p.poly([[40, top + 6], [300, top + 6], [330, base], [10, base]], c.soft, { fillStyle: "hachure", hachureGap: 7, strokeWidth: 1.4 });
        p.rect(135, 38, 70, 16, c.surface, { strokeWidth: 2.2 });
        const l = 170 - fw / 2, r = 170 + fw / 2;
        p.line(135, 54, l, base, { stroke: c.accent, strokeWidth: 2, strokeLineDash: [6, 5] });
        p.line(205, 54, r, base, { stroke: c.accent, strokeWidth: 2, strokeLineDash: [6, 5] });
        p.rect(-4, base, W + 8, 220 - base + 4, c.sunk, { fillStyle: "cross-hatch", hachureGap: 10, fill: c.soft, strokeWidth: 1.4 });
        tag(p, 12, Math.min(base + 26, 212), "formation (the ground)", 11, c.soft, c.bg);
        const h = 10 + 40 * pr;
        const col = mix(c.accent, c.ppe, Math.min(1, pr * 1.2));
        p.rect(l, base - 3, fw, 6, col, { strokeWidth: 0, roughness: 0.3 });
        for (let x = l + 8; x < r - 4; x += Math.max(14, fw / 8)) arrow(p, x, base - h - 2, x, base - 2, col, 2, 6);
      }} />
    </Frame>
  );
}

/* ---------- Drainage ---------- */

export function Drainage({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [rain, setRain] = useState<"dry" | "rain">("dry");
  const [drain, setDrain] = useState<"clear" | "blocked">("clear");
  const target = rain === "dry" ? 0 : drain === "clear" ? 0.25 : 1;
  const level = useTween(target, 0.05, 90);
  const pumping = level > 0.7;
  const status = pumping ? "The drain is blocked, so water rises into the ballast. Each train pumps the sleeper up and down and squeezes mud up through the stones." : rain === "rain" ? (drain === "clear" ? "Rain runs through the ballast and away down the drain. The track stays firm." : "Water is building up. Nowhere for it to go.") : "Dry. The water table sits well below the track.";
  useEffect(() => { if (pumping) announce("Mud pumping under the sleeper"); }, [pumping]);
  const fact = factMatching(lesson, /drain|water|wet|mud|pump/i);
  return (
    <Frame title="Make it rain" hint="Turn the rain on, then block the drain and watch the water." status={status} statusColor={pumping ? c.warn : c.accent} fact={fact}
      control={<>
        <Pills label="Weather" value={rain} onChange={setRain} options={[{ value: "dry", label: "Dry" }, { value: "rain", label: "Rain" }]} />
        <Pills label="Drain" value={drain} onChange={setDrain} options={[{ value: "clear", label: "Drain clear" }, { value: "blocked", label: "Drain blocked" }]} />
      </>}>
      <Sketch w={W} h={220} pal={pal} deps={[level, rain, drain, c.ink]} accessibilityLabel={status} paint={(p) => {
        if (rain === "rain") for (let i = 0; i < 22; i++) { const x = 10 + rnd(i) * 320, y = 6 + rnd(i + 7) * 40; p.line(x, y, x - 5, y + 12, { stroke: c.accent, strokeWidth: 1.5, roughness: 0.3 }); }
        p.rect(-4, 160, W + 8, 64, c.sunk, { fillStyle: "cross-hatch", hachureGap: 10, fill: c.soft, strokeWidth: 1.2 });
        p.poly([[100, 104], [300, 104], [330, 160], [70, 160]], c.soft, { fillStyle: "hachure", hachureGap: 6, strokeWidth: 1.4 });
        const wy = 216 - level * 108;
        if (level > 0.02) p.rect(-2, wy, W + 4, 220 - wy, c.accent, { fillStyle: "hachure", hachureGap: 5, hachureAngle: 0, fillWeight: 1, strokeWidth: 0, stroke: "none" });
        p.line(-2, wy, W + 2, wy, { stroke: c.accent, strokeWidth: 2, roughness: 1.4 });
        const bob = pumping ? 4 : 0;
        p.rect(112, 92 + bob, 176, 14, c.surface, { strokeWidth: 2 });
        railSection(p, 150, 92 + bob, 1, c.sunk);
        railSection(p, 250, 92 + bob, 1, c.sunk);
        // cess drain
        p.poly([[14, 150], [56, 150], [50, 196], [20, 196]], c.bg, { strokeWidth: 1.5 });
        p.circle(35, 182, 22, drain === "blocked" ? c.soft : c.surface, { strokeWidth: 2, ...(drain === "blocked" ? { fillStyle: "cross-hatch", hachureGap: 3 } : {}) });
        p.text(35, 144, drain === "blocked" ? "drain blocked" : "drain", 13, drain === "blocked" ? c.warn : c.ink, "hand");
        if (rain === "rain" && drain === "clear") arrow(p, 90, 150, 50, 176, c.accent, 2);
        if (pumping) {
          const mud = mix(c.ppe, c.ink, 0.55);
          for (const x of [100, 124, 280, 302]) p.ellipse(x, 104, 20, 8, mud, { strokeWidth: 1 });
          arrow(p, 192, 58, 192, 84, c.warn, 2.5); arrow(p, 208, 84, 208, 58, c.warn, 2.5);
          p.text(200, 46, "pumping", 16, c.warn, "hand");
        }
        tag(p, W - 8, wy - 6 < 20 ? 20 : wy - 6, "water table", 11, c.accent, c.bg, "mono", "end");
      }} />
    </Frame>
  );
}

