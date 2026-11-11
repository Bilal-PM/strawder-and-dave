/** Work on the track: welding, tamping, possessions, renewals, inspection, safety and the case. */
import React, { useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import type { Lesson } from "@/domain/types";
import { Button, Tappable, tap, usePal } from "@/ui/kit";
import { Sketch, type Painter } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius, type Palette } from "@/ui/tokens";
import { factMatching } from "../content";
import { Frame, Pills, Slider, Stepper, announce } from "../ui";
import { arrow, clamp01, mix } from "./draw";

const W = 340;

/** A rail seen from the side, from x1 to x2, top at y. */
function railSide(p: Painter, x1: number, x2: number, y: number, fill: string) {
  if (x2 - x1 < 1) return;
  p.rect(x1, y, x2 - x1, 10, fill, { roughness: 0.5, strokeWidth: 1.8 });
  p.rect(x1, y + 10, x2 - x1, 12, null, { roughness: 0.4, strokeWidth: 1 });
  p.rect(x1, y + 22, x2 - x1, 6, fill, { roughness: 0.5, strokeWidth: 1.6 });
}

/** A worker in hi-vis, standing at x with feet on y. */
function worker(p: Painter, x: number, y: number, c: Palette, coat?: string) {
  p.circle(x, y - 30, 9, c.surface, { strokeWidth: 1.6 });
  p.rect(x - 5, y - 25, 10, 14, coat ?? c.ppe, { strokeWidth: 1.4, roughness: 0.4 });
  p.line(x - 3, y - 11, x - 4, y, { strokeWidth: 1.6 });
  p.line(x + 3, y - 11, x + 4, y, { strokeWidth: 1.6 });
}

/* ---------- Thermite weld ---------- */

const WELD = [
  { name: "Gap", text: "The two rail ends are lined up with a small gap between them, set by the welding procedure." },
  { name: "Moulds", text: "Moulds are clamped around the gap and sealed so no metal escapes." },
  { name: "Preheat", text: "A burner heats the rail ends so the new metal fuses with them." },
  { name: "Pour", text: "The thermite charge in the crucible burns into molten steel, which runs down and fills the gap." },
  { name: "Trim", text: "While it is still hot, the extra metal on top is sheared off." },
  { name: "Grind", text: "The railhead is ground to shape so wheels run smoothly over the weld." },
];

export function ThermiteWeld({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [i, setI] = useState(0);
  const fact = factMatching(lesson, /thermit|aluminothermic|crucible/i) ?? factMatching(lesson, /weld/i);
  return (
    <Frame title="Make a thermite weld" hint="Step through the weld, one stage at a time." status={`${i + 1}. ${WELD[i].name}: ${WELD[i].text}`} statusColor={i >= 2 && i <= 3 ? c.ppe : c.accent} fact={fact}
      control={<Stepper i={i} n={WELD.length} label="Weld" names={WELD.map((w) => w.name)} onChange={(n) => { setI(n); announce(`${WELD[n].name}. ${WELD[n].text}`); }} />}>
      <Sketch w={W} h={200} pal={pal} deps={[i, c.ink]} accessibilityLabel={`Thermite weld, step ${i + 1}: ${WELD[i].name}`} paint={(p) => {
        const y = 120, g = i >= 3 ? 0 : 14;
        const railFill = i === 2 ? mix(c.sunk, c.ppe, 0.5) : c.sunk;
        railSide(p, -4, 170 - g / 2, y, railFill);
        railSide(p, 170 + g / 2, W + 4, y, railFill);
        p.rect(-4, y + 28, W + 8, 30, c.soft, { fillStyle: "hachure", hachureGap: 7, strokeWidth: 1 });
        if (i === 0) { arrow(p, 130, 100, 160, 100, c.ink, 1.6, 6); arrow(p, 210, 100, 180, 100, c.ink, 1.6, 6); p.text(170, 90, "the gap", 16, c.ink, "hand"); }
        if (i >= 1 && i <= 3) p.rect(146, y - 10, 48, 48, i === 3 ? mix(c.surface, c.ppe, 0.35) : c.surface, { strokeWidth: 2.2, roughness: 0.6 });
        if (i === 1) p.text(170, 96, "moulds", 16, c.ink, "hand");
        if (i === 2) { for (let k = 0; k < 4; k++) p.path(`M ${158 + k * 8} 106 q -6 -14 0 -26 q 6 12 0 26`, c.ppe, { stroke: c.ppe, strokeWidth: 1.4 }); p.line(170, 40, 170, 80, { strokeWidth: 3 }); p.text(186, 52, "burner", 15, c.ppe, "hand", "start"); }
        if (i === 3) {
          p.poly([[140, 30], [200, 30], [188, 76], [152, 76]], c.surface, { strokeWidth: 2.2 });
          p.text(214, 46, "crucible", 15, c.ink, "hand", "start");
          p.line(170, 76, 170, 108, { stroke: c.ppe, strokeWidth: 6, roughness: 0.6 });
          for (let k = 0; k < 6; k++) p.circle(160 + k * 5, 24 - (k % 3) * 4, 3, c.pass, { strokeWidth: 0.5 });
        }
        if (i === 4) { p.rect(156, y - 10, 28, 10, c.ppe, { strokeWidth: 1.6 }); arrow(p, 120, y - 18, 154, y - 6, c.ink, 2); p.text(116, y - 24, "shear", 15, c.ink, "hand", "end"); p.rect(158, y + 10, 24, 18, mix(c.sunk, c.ppe, 0.3), { strokeWidth: 1.2 }); }
        if (i === 5) {
          p.rect(158, y + 10, 24, 18, mix(c.sunk, c.ppe, 0.15), { strokeWidth: 1.2 });
          p.circle(170, y - 26, 34, c.surface, { strokeWidth: 2 });
          for (let k = 0; k < 7; k++) p.line(186, y - 4, 210 + k * 6, y - 26 - k * 3, { stroke: c.pass, strokeWidth: 1.4, roughness: 0.4 });
          p.text(124, y - 34, "grinder", 15, c.ink, "hand", "end");
        }
      }} />
    </Frame>
  );
}

/* ---------- Tamping ---------- */

export function Tamping({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [t, setT] = useState(0);
  const lift = clamp01(t / 0.25), down = clamp01((t - 0.25) / 0.25), sq = clamp01((t - 0.5) / 0.25), up = clamp01((t - 0.75) / 0.25);
  const phase = t < 0.25 ? 0 : t < 0.5 ? 1 : t < 0.75 ? 2 : t < 1 ? 3 : 4;
  const STEPS = ["Lift: the machine grips the rails and lifts the track to the right level.", "Tines plunge into the ballast either side of the sleeper.", "Squeeze: the tines vibrate and squeeze stones in under the sleeper.", "The tines withdraw.", "Done: the sleeper sits on freshly packed ballast at its new level."];
  const fact = factMatching(lesson, /tamp|tine|lift|stone/i);
  return (
    <Frame title="Tamp a sleeper" hint="Slide to run one tamping cycle." status={STEPS[phase]} statusColor={phase >= 4 ? c.good : c.accent} fact={fact}
      control={<Slider value={t} onChange={(v) => { const np = v < 0.25 ? 0 : v < 0.5 ? 1 : v < 0.75 ? 2 : v < 1 ? 3 : 4; if (np !== phase) announce(STEPS[np]); setT(v); }} label="Tamping cycle" valueText={STEPS[phase]} left="Start" right="Done" steps={40} />}>
      <Sketch w={W} h={210} pal={pal} deps={[t, c.ink]} accessibilityLabel={STEPS[phase]} paint={(p) => {
        const L = lift * 12;
        p.rect(-4, 130, W + 8, 80, c.soft, { fillStyle: "hachure", hachureGap: 7, strokeWidth: 1 });
        for (const x of [30, 100, 240, 310]) p.rect(x - 22, 118 - L * 0.5, 44, 12, c.sunk, { strokeWidth: 1.6 });
        if (L > 1 && sq < 1) p.rect(148, 130 - L, 44, L * (1 - sq), c.bg, { strokeWidth: 0, stroke: "none" });
        if (sq > 0) p.rect(148, 130 - L * sq, 44, L * sq + 4, c.accent, { fillStyle: "cross-hatch", hachureGap: 3, strokeWidth: 0.8 });
        p.rect(148, 118 - L, 44, 12, c.surface, { strokeWidth: 2.2 });
        p.rect(-4, 106 - L * 0.7, W + 8, 12, c.sunk, { strokeWidth: 1.8, roughness: 0.5 });
        if (lift > 0 && up < 1) { arrow(p, 60, 106, 60, 96 - L, c.accent, 2); p.text(66, 92 - L, "lift", 14, c.accent, "hand", "start"); }
        // tamping unit
        p.rect(110, 10, 120, 28, c.pass, { strokeWidth: 2 });
        p.text(170, 30, "tamper", 14, "#1B1F24", "hand");
        const depth = 40 + 104 * down * (1 - up);
        const open = 30 - 10 * sq * (1 - up);
        for (const s of [-1, 1]) {
          const x = 170 + s * open;
          p.line(x, 38, x, depth, { strokeWidth: 4, roughness: 0.3 });
          p.poly([[x - 5, depth], [x + 5, depth], [x + s * -2, depth + 10]], c.ink, { roughness: 0.2 });
          if (sq > 0 && up < 1) arrow(p, x + s * 22, depth - 6, x + s * 8, depth - 6, c.ppe, 2, 6);
        }
      }} />
    </Frame>
  );
}

/* ---------- Possession ---------- */

const POSS = [
  { at: 0, name: "Open", text: "Line open: trains are running. Nobody is on the track." },
  { at: 0.18, name: "Block", text: "Block: the signaller stops trains on this line and gives the possession. Protection goes in at each end." },
  { at: 0.36, name: "Work", text: "Work: inside the protected area, the gangs and machines get on with the job." },
  { at: 0.78, name: "Handback", text: "Handback: the work is checked, people and kit are clear, protection comes out." },
  { at: 0.94, name: "Open", text: "Line open again: the signaller lets trains run." },
];

export function Possession({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [t, setT] = useState(0.1);
  let k = 0;
  POSS.forEach((s, i) => { if (t >= s.at) k = i; });
  const ph = POSS[k];
  const blocked = k >= 1 && k <= 3;
  const fact = factMatching(lesson, /possession|block|handback|protection|signaller/i);
  return (
    <Frame title="Run a possession" hint="Slide along the timeline from open line to handback." status={ph.text} statusColor={blocked ? c.warn : c.good} fact={fact}
      control={<Slider value={t} onChange={(v) => { let nk = 0; POSS.forEach((s, i) => { if (v >= s.at) nk = i; }); if (nk !== k) announce(POSS[nk].text); setT(v); }} label="Possession timeline" valueText={ph.name} left="Before" right="After" steps={50} />}>
      <Sketch w={W} h={200} pal={pal} deps={[k, t, c.ink]} accessibilityLabel={ph.text} paint={(p) => {
        for (let x = 6; x < W; x += 16) p.line(x, 64, x, 96, { stroke: c.line, strokeWidth: 4, roughness: 0.3 });
        p.line(0, 70, W, 70, { strokeWidth: 3, roughness: 0.4 }); p.line(0, 90, W, 90, { strokeWidth: 3, roughness: 0.4 });
        for (const x of [20, 320]) { p.line(x, 60, x, 20, { strokeWidth: 2.5 }); p.rect(x - 8, 6, 16, 24, c.board, { roughness: 0.3, strokeWidth: 1.4 }); p.circle(x, 18, 10, blocked ? c.warn : c.good, { strokeWidth: 0.6, roughness: 0.2 }); }
        if (blocked) for (const x of [56, 284]) { p.rect(x - 7, 52, 14, 14, c.warn, { strokeWidth: 1.2 }); p.line(x, 66, x, 80, { strokeWidth: 2 }); }
        if (k === 2) { worker(p, 130, 104, c); worker(p, 170, 104, c); worker(p, 210, 104, c); p.rect(150, 74, 44, 12, c.pass, { strokeWidth: 1.4 }); }
        if (k === 0 || k === 4) { const tx = k === 0 ? 40 + (t / 0.18) * 120 : 40 + ((t - 0.94) / 0.06) * 200; p.rect(tx, 58, 74, 26, c.surface, { strokeWidth: 2 }); p.rect(tx + 56, 62, 12, 10, c.pass, { strokeWidth: 1 }); }
        // timeline
        const ty = 150;
        const segs = POSS.map((s, i) => [s.at, POSS[i + 1]?.at ?? 1, s.name] as const);
        segs.forEach(([a, b, n], i) => {
          const x1 = 10 + a * 320, x2 = 10 + b * 320;
          p.rect(x1, ty, x2 - x1, 16, i === k ? (i >= 1 && i <= 3 ? c.warn : c.good) : c.sunk, { strokeWidth: 1.2, roughness: 0.4 });
          if (x2 - x1 > 40) p.text((x1 + x2) / 2, ty + 34, n, 12, i === k ? c.ink : c.soft, "body");
        });
        const cx = 10 + t * 320;
        p.poly([[cx - 7, ty - 12], [cx + 7, ty - 12], [cx, ty - 2]], c.ink, { roughness: 0.2 });
      }} />
    </Frame>
  );
}

/* ---------- Renewal ---------- */

const RENEW = [
  { name: "Possession", text: "The line is closed and protected. Machines and materials arrive." },
  { name: "Lift out", text: "The old rails and sleepers are lifted out." },
  { name: "Dig out", text: "Old, dirty ballast is dug out down to the right level." },
  { name: "New ballast", text: "A bottom layer of clean ballast is laid and compacted." },
  { name: "New track", text: "New sleepers go down, the rails are threaded on and clipped." },
  { name: "Tamp", text: "Top ballast is dropped and tamped to lift the track to its final level." },
  { name: "Handback", text: "The line is handed back. Trains often run slower at first while the new track settles." },
];

export function Renewal({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [i, setI] = useState(0);
  const fact = factMatching(lesson, /renewal|weekend|possession|hours|sleepers/i);
  return (
    <Frame title="Renew the track in a weekend" hint="Step through a renewal, from closing the line to handing it back." status={`${i + 1}. ${RENEW[i].name}: ${RENEW[i].text}`} statusColor={i === RENEW.length - 1 ? c.good : c.accent} fact={fact}
      control={<Stepper i={i} n={RENEW.length} label="Renewal" names={RENEW.map((r) => r.name)} onChange={(n) => { setI(n); announce(`${RENEW[n].name}. ${RENEW[n].text}`); }} />}>
      <Sketch w={W} h={190} pal={pal} deps={[i, c.ink]} accessibilityLabel={`Track renewal, step ${i + 1}: ${RENEW[i].name}`} paint={(p) => {
        const old = mix(c.soft, c.ppe, 0.35);
        p.rect(-4, 150, W + 8, 44, c.sunk, { fillStyle: "cross-hatch", hachureGap: 10, fill: c.soft, strokeWidth: 1.2 });
        const ballastTop = i <= 1 ? 120 : i === 2 ? 150 : i === 3 ? 134 : i === 4 ? 134 : 118;
        if (ballastTop < 150) p.rect(-4, ballastTop, W + 8, 150 - ballastTop, i <= 1 ? old : c.soft, { fillStyle: "hachure", hachureGap: i <= 1 ? 4 : 7, strokeWidth: 1.2 });
        const newTrack = i >= 4;
        const showTrack = i === 0 || i >= 4;
        if (showTrack) {
          const ty = i >= 5 ? 106 : i === 4 ? 122 : 108;
          for (let x = 14; x < W; x += 26) p.rect(x - 8, ty, 16, 12, newTrack ? c.surface : old, { strokeWidth: 1.4, roughness: 0.5 });
          p.rect(-4, ty - 10, W + 8, 10, newTrack ? c.sunk : old, { strokeWidth: 1.8 });
        }
        if (i === 0) { p.rect(10, 20, 80, 40, c.pass, { strokeWidth: 2 }); p.text(50, 46, "machines", 14, "#1B1F24", "hand"); for (const x of [120, 320]) { p.rect(x - 7, 70, 14, 14, c.warn, { strokeWidth: 1.2 }); } }
        if (i === 1) { p.rect(110, 30, 120, 22, old, { strokeWidth: 1.8 }); p.line(170, 0, 170, 30, { strokeWidth: 2 }); arrow(p, 250, 80, 250, 40, c.ink, 2); p.text(260, 64, "old track out", 14, c.ink, "hand", "start"); }
        if (i === 2) { p.poly([[200, 60], [260, 60], [270, 100], [190, 100]], c.pass, { strokeWidth: 2 }); p.text(230, 50, "digger", 14, c.ink, "hand"); arrow(p, 150, 130, 190, 100, c.ink, 2); }
        if (i === 3) { p.text(170, 126, "clean ballast", 14, c.ink, "hand"); }
        if (i === 4) { arrow(p, 60, 60, 60, 96, c.accent, 2); p.text(70, 72, "new sleepers and rail", 14, c.accent, "hand", "start"); }
        if (i === 5) { p.rect(140, 40, 60, 22, c.pass, { strokeWidth: 2 }); p.line(160, 62, 160, 120, { strokeWidth: 3 }); p.line(180, 62, 180, 120, { strokeWidth: 3 }); p.text(170, 30, "tamper", 14, c.ink, "hand"); }
        if (i === 6) { p.rect(40, 60, 100, 36, c.surface, { strokeWidth: 2 }); p.circle(60, 98, 10, c.ink); p.circle(120, 98, 10, c.ink); arrow(p, 150, 78, 200, 78, c.good, 2.5); p.text(210, 70, "trains back", 14, c.good, "hand", "start"); }
      }} />
    </Frame>
  );
}

/* ---------- Inspection: spot the defect ---------- */

const SLEEPERS = 8;
const DEFECTS: Record<number, string> = { 1: "A clip is missing, so the rail is not held down at this sleeper.", 4: "Wet, muddy ballast: water is not draining and the sleeper is pumping.", 6: "A cracked sleeper. It can no longer hold the gauge reliably." };

export function Inspection({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [found, setFound] = useState<number[]>([]);
  const [last, setLast] = useState<string>("Walk the track: tap anything that looks wrong. There are three defects.");
  const [w, setW] = useState(0);
  const total = Object.keys(DEFECTS).length;
  const done = found.length === total;
  const tapSleeper = (i: number) => {
    if (DEFECTS[i] && !found.includes(i)) { const n = [...found, i]; setFound(n); setLast(`${n.length} of ${total}. ${DEFECTS[i]}`); tap("success"); announce(`Found. ${DEFECTS[i]}`); }
    else if (!DEFECTS[i]) { setLast("This sleeper looks fine. Keep looking."); tap("light"); announce("Looks fine"); }
  };
  const fact = factMatching(lesson, /inspect|patrol|defect|walk/i);
  const H = 180, x = (i: number) => 26 + i * 41;
  return (
    <Frame title="Spot the defects" hint="You are the patroller. Tap the sleepers that need reporting." status={done ? `All ${total} found. Each one gets reported so it can be fixed before it gets worse.` : last} statusColor={done ? c.good : found.length ? c.pass : c.accent} fact={fact}
      control={done ? <Button label="Walk it again" kind="secondary" onPress={() => { setFound([]); setLast("Walk the track: tap anything that looks wrong. There are three defects."); }} /> : undefined}>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        <Sketch w={W} h={H} pal={pal} deps={[found.join(","), c.ink]} accessibilityLabel="Track seen from above with eight sleepers" paint={(p) => {
          p.rect(-4, 20, W + 8, 140, c.soft, { fillStyle: "hachure", hachureGap: 8, strokeWidth: 0.8 });
          const mud = mix(c.ppe, c.ink, 0.55);
          for (let i = 0; i < SLEEPERS; i++) {
            p.rect(x(i) - 11, 30, 22, 120, c.sunk, { strokeWidth: 1.8, roughness: 0.6 });
            if (i === 6) p.linear([[x(i) - 10, 84], [x(i) - 3, 90], [x(i) + 2, 86], [x(i) + 10, 94]], { strokeWidth: 2, stroke: c.ink });
            if (i === 4) { p.ellipse(x(i), 92, 34, 22, mud, { strokeWidth: 1 }); p.ellipse(x(i) + 14, 120, 18, 10, mud, { strokeWidth: 1 }); }
            for (const ry of [56, 124]) if (!(i === 1 && ry === 56)) { p.rect(x(i) - 4, ry - 9, 8, 6, c.ink, { roughness: 0.2 }); p.rect(x(i) - 4, ry + 3, 8, 6, c.ink, { roughness: 0.2 }); }
            if (found.includes(i)) p.ellipse(x(i), 90, 40, 140, null, { stroke: c.good, strokeWidth: 3 });
          }
          p.line(-4, 56, W + 4, 56, { strokeWidth: 5, roughness: 0.3 });
          p.line(-4, 124, W + 4, 124, { strokeWidth: 5, roughness: 0.3 });
        }} />
        {w > 0 && Array.from({ length: SLEEPERS }, (_, i) => (
          <Pressable key={i} onPress={() => tapSleeper(i)} accessibilityRole="button" accessibilityLabel={`Sleeper ${i + 1}${found.includes(i) ? ", reported" : ""}`}
            style={{ position: "absolute", left: ((x(i) - 20) / W) * w, width: (40 / W) * w, top: (20 / H) * (w * H / W), height: (140 / H) * (w * H / W) }} />
        ))}
      </View>
    </Frame>
  );
}

/* ---------- Safety: positions of safety ---------- */

const ZONES = [
  { value: "fence", label: "Behind the fence", tone: "good", text: "Behind the fence or back from the platform edge: this is where the public belongs. Never go on the line." },
  { value: "cess", label: "Cess", tone: "pass", text: "The cess is the strip beside the track. Trained and authorised staff use a position of safety here, far enough from the nearest rail." },
  { value: "four", label: "Four-foot", tone: "warn", text: "The four-foot is between the rails of one track. Never stand here: a train cannot stop or swerve." },
  { value: "six", label: "Six-foot", tone: "warn", text: "The six-foot is between two tracks. Trains can pass on both sides. Do not treat it as safe." },
] as const;
type Zone = (typeof ZONES)[number]["value"];

export function Safety({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const pal = usePal();
  const [z, setZ] = useState<Zone>("fence");
  const zone = ZONES.find((x) => x.value === z)!;
  const col = zone.tone === "good" ? c.good : zone.tone === "pass" ? c.pass : c.warn;
  const fact = factMatching(lesson, /position of safety|cess|four-foot|six-foot|safety|trained/i);
  return (
    <Frame title="Where is it safe to stand?" hint="Tap each place. Never go on the line without training and permission." status={zone.text} statusColor={col} fact={fact}
      control={<Pills silent label="Place" value={z} onChange={(v) => { setZ(v); const t = ZONES.find((x) => x.value === v)!; tap(t.tone === "warn" ? "warn" : "light"); announce(t.text); }} options={ZONES.map((x) => ({ value: x.value, label: x.label }))} />}>
      <Sketch w={W} h={190} pal={pal} deps={[z, c.ink]} accessibilityLabel={`Cross-section of a two-track railway. ${zone.label}: ${zone.text}`} paint={(p) => {
        const band: Record<Zone, [number, number][]> = { fence: [[0, 30]], cess: [[52, 94], [296, 340]], four: [[104, 152], [196, 244]], six: [[160, 188]] };
        for (const [a, b] of band[z]) p.rect(a, 104, b - a, 52, col, { fillStyle: "hachure", hachureGap: 5, strokeWidth: 1.2, stroke: col });
        p.rect(-4, 156, W + 8, 34, c.sunk, { strokeWidth: 1.2 });
        for (const x of [36, 48]) p.line(x, 156, x, 96, { strokeWidth: 2.5 });
        p.line(32, 106, 52, 106, { strokeWidth: 2 }); p.line(32, 126, 52, 126, { strokeWidth: 2 });
        p.text(42, 88, "fence", 12, c.soft, "hand");
        for (const [x1, x2] of [[104, 152], [196, 244]]) {
          p.rect(x1 - 8, 146, x2 - x1 + 16, 10, c.surface, { strokeWidth: 1.4 });
          for (const x of [x1, x2]) p.rect(x - 4, 134, 8, 12, c.ink, { roughness: 0.2 });
        }
        p.text(128, 182, "four-foot", 11, c.soft, "mono"); p.text(220, 182, "four-foot", 11, c.soft, "mono");
        p.text(174, 98, "six-foot", 11, c.soft, "mono");
        p.text(73, 182, "cess", 11, c.soft, "mono"); p.text(318, 182, "cess", 11, c.soft, "mono");
        if (zone.tone === "warn") { const [a, b] = band[z][0]; p.text((a + b) / 2, 70, "no", 28, c.warn, "hand"); }
        else if (zone.tone === "good") { worker(p, 16, 154, c, c.accent); p.text(4, 76, "public", 15, c.good, "hand", "start"); }
        else { const [a, b] = band[z][0]; worker(p, (a + b) / 2, 154, c); p.text((a + b) / 2, 76, "trained staff only", 15, c.ink, "hand"); }
      }} />
    </Frame>
  );
}

/* ---------- The case (the boss) ---------- */

const CLUES = [
  { k: "heat", title: "Weather", text: "It was the hottest afternoon of the year." },
  { k: "tamp", title: "Work log", text: "This stretch was tamped last week. The ballast had not settled yet." },
  { k: "shoulder", title: "Site photo", text: "The ballast shoulder is thin at one spot." },
  { k: "shape", title: "Driver report", text: "A sideways lurch. The track is out of line in an S shape." },
] as const;
const VERDICTS = [
  { value: "buckle", label: "Buckle" },
  { value: "broken", label: "Broken rail" },
  { value: "gauge", label: "Wide gauge" },
] as const;
type Verdict = (typeof VERDICTS)[number]["value"];

function ClueArt({ k }: { k: (typeof CLUES)[number]["k"] }) {
  const { c } = useTheme();
  const pal = usePal();
  return (
    <Sketch w={80} h={50} pal={pal} deps={[k, c.ink]} paint={(p) => {
      if (k === "heat") { p.circle(40, 25, 24, c.ppe, { strokeWidth: 1.4 }); for (let a = 0; a < 8; a++) { const r = (a / 8) * Math.PI * 2; p.line(40 + Math.cos(r) * 16, 25 + Math.sin(r) * 16, 40 + Math.cos(r) * 22, 25 + Math.sin(r) * 22, { stroke: c.ppe, strokeWidth: 1.6 }); } }
      if (k === "tamp") { p.rect(20, 6, 40, 12, c.pass, { strokeWidth: 1.4 }); p.line(34, 18, 34, 42, { strokeWidth: 2 }); p.line(46, 18, 46, 42, { strokeWidth: 2 }); }
      if (k === "shoulder") { p.poly([[4, 44], [24, 20], [56, 20], [76, 44]], c.soft, { fillStyle: "hachure", hachureGap: 4, strokeWidth: 1.2 }); p.ellipse(64, 34, 22, 18, null, { stroke: c.pass, strokeWidth: 2 }); }
      if (k === "shape") { const pts: [number, number][] = []; for (let x = 0; x <= 80; x += 8) { const u = (x - 40) / 16; pts.push([x, 25 - 12 * (-u * Math.exp(-u * u)) / 0.43]); } p.curve(pts, { strokeWidth: 2.4, stroke: c.warn }); }
    }} />
  );
}

export function Case({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const [open, setOpen] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const ready = open.length >= 3;
  const right = verdict === "buckle";
  const status = !ready ? `Open the clues. ${open.length} of ${CLUES.length} opened. Open at least three, then decide.` : verdict === null ? "What happened here?" : right ? "Solved: a buckle. Heat built up compression in the welded rail. Fresh tamping and a thin shoulder gave the track less grip sideways, so it jumped into an S shape." : "Not this one. Look at the shape and the weather again. Which fault needs heat and weak sideways support?";
  const fact = factMatching(lesson, /buckl|heat|shoulder/i);
  return (
    <Frame title="The case: what went wrong?" hint="Tap each clue card to turn it over." status={status} statusColor={verdict === null ? c.pass : right ? c.good : c.warn} fact={fact}
      control={ready ? <Pills silent label="Your verdict" value={verdict} color={verdict ? (right ? c.good : c.warn) : undefined} onChange={(v) => { setVerdict(v); tap(v === "buckle" ? "success" : "warn"); announce(v === "buckle" ? "Solved" : "Not this one"); }} options={VERDICTS.map((v) => ({ value: v.value, label: v.label }))} /> : undefined}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8 }}>
        {CLUES.map((cl) => {
          const on = open.includes(cl.k);
          return (
            <Tappable key={cl.k} accessibilityRole="button" accessibilityLabel={on ? `${cl.title}: ${cl.text}` : `Clue: ${cl.title}. Tap to open`} onPress={() => { if (!on) { setOpen([...open, cl.k]); announce(cl.text); } }}
              style={{ width: "48%", flexGrow: 1, minHeight: 120, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.surface : c.sunk, padding: 10, gap: 6 }}>
              <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: c.soft }}>{cl.title}</Text>
              {on ? (<><ClueArt k={cl.k} /><Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 19, color: c.ink }}>{cl.text}</Text></>) : <Text style={{ fontFamily: F.hand, fontSize: 26, color: c.soft, marginTop: 14 }}>?</Text>}
            </Tappable>
          );
        })}
      </View>
    </Frame>
  );
}
