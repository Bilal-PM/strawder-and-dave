/**
 * Scene 3 · Try it. The learner drags the sun (or the thermometer) up and down the sky. The heat value drives
 * the drawing directly: the joint gap closes as it warms and opens as it cools. Past the point where the gap
 * has closed, the rails push: they turn a hair about their far ends, so the joint steps sideways (a kink) and
 * the sleepers nearby follow. A calm warning is lettered. Haptics: a detent when the gap closes, a warning
 * when the kink starts. Idle: heat shimmer (more as it warms), sun rays turning, a jiggle on the sun until it
 * has been moved once.
 */
import React, { useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { bell, loop, wave } from "../../living";
import { arrow, label, sunDisc, sunRays, stipple, stoneInk } from "../../art";
import { Layer, StageSvg, Still, clamp01, unitRect, useArt, useSceneClocks, useStage, type Tick } from "../../layers";
import type { ArtProps } from "../../types";
import { tap } from "@/ui/kit";
import { announce } from "@/features/learn/ui";

const T = {
  LOOP: 36000,
  START_HEAT: 0.3,
  /** Heat at which the gap has closed, and at which the kink starts and is fully shown. */
  CLOSED: 0.72,
  KINK_FROM: 0.84,
  /** Largest turn of each rail about its far end, degrees (exaggerated). */
  KINK_DEG: 2.2,
  GAP: 14,
  /** Sun height range (drawing units) for heat 0 → 1. */
  SUN_LOW: 186,
  SUN_HIGH: 56,
} as const;
const JOINT = 180;
const FAR_L = -90;
const FAR_R = 450;
const RAILS_Y = [266, 316] as const;
const SUN = { x: 262, y: 110, r: 24 };
const THERMO = { x: 84, top: 44, bulb: 206 };
const SLEEPERS = Array.from({ length: 12 }, (_, i) => 6 + i * 32);

const gapNow = (h: number) => {
  "worklet";
  return T.GAP * (1 - clamp01(h / T.CLOSED));
};
const kinkDeg = (h: number) => {
  "worklet";
  return T.KINK_DEG * clamp01((h - T.KINK_FROM) / (1 - T.KINK_FROM));
};

const leftRail = (t: Tick) => {
  "worklet";
  return { x: (T.GAP - gapNow(t.x)) / 2, r: kinkDeg(t.x) };
};
const rightRail = (t: Tick) => {
  "worklet";
  return { x: -(T.GAP - gapNow(t.x)) / 2, r: -kinkDeg(t.x) };
};
/** Each sleeper follows the rails sideways by how far the kink has moved the rail above it. */
function makeSleeper(sx: number) {
  const cx = sx + 6;
  return (t: Tick) => {
    "worklet";
    const tan = Math.tan((kinkDeg(t.x) * Math.PI) / 180);
    return { y: cx < JOINT ? Math.max(0, cx - FAR_L) * tan : Math.max(0, FAR_R - cx) * tan };
  };
}
const SLEEPER_POSES = SLEEPERS.map(makeSleeper);

const raysPose = (t: Tick) => {
  "worklet";
  return { r: (t.loop / T.LOOP) * 360 };
};
const mercuryPose = (t: Tick) => {
  "worklet";
  return { sy: 0.1 + 0.88 * t.x };
};
const gapLabel = (t: Tick) => {
  "worklet";
  return { o: clamp01(gapNow(t.x) / T.GAP * 2.2) };
};
const pushArrows = (t: Tick) => {
  "worklet";
  return { o: clamp01((t.x - T.CLOSED) / 0.08) };
};
const sayOpen = (t: Tick) => {
  "worklet";
  return { o: 1 - clamp01((t.x - 0.46) / 0.08) };
};
const sayClosed = (t: Tick) => {
  "worklet";
  return { o: clamp01((t.x - 0.62) / 0.08) * (1 - clamp01((t.x - 0.8) / 0.05)) };
};
const sayPush = (t: Tick) => {
  "worklet";
  return { o: clamp01((t.x - 0.86) / 0.06) };
};
function makeWisp(i: number) {
  const x0 = [60, 150, 240, 310][i], period = [2400, 3000, 2000, 3600][i];
  return (t: Tick) => {
    "worklet";
    const p = loop(t.loop, period, i * 0.29);
    return { x: x0 + 1.5 * wave(t.loop, 1200, i * 0.2), y: 252 - 12 * p, o: bell(p) * clamp01((t.x - 0.35) / 0.4) };
  };
}
const WISPS = [0, 1, 2, 3].map(makeWisp);

export function TryScene({ active, reduced }: ArtProps) {
  const heat = useSharedValue<number>(T.START_HEAT);
  const waiting = useSharedValue<number>(1);
  const c = useSceneClocks(T.LOOP, 1, active, reduced, heat);
  const box = useStage();
  const last = useRef<number>(T.START_HEAT);
  const startY = useRef(0);
  const [valueText, setValueText] = useState(describeHeat(T.START_HEAT));

  const a = useArt("s1-01/try", (part, k, dark) => ({
    sky: part((p) => {
      p.curve([[-10, 214], [80, 206], [170, 212], [260, 204], [370, 210]], { stroke: k.line, strokeWidth: 1.6, roughness: 0.8 });
      p.text(16, 238, "THE TRACK, SEEN FROM ABOVE", 10, k.soft, "mono", "start");
    }),
    thermo: part((p) => {
      p.rect(THERMO.x - 9, THERMO.top, 18, THERMO.bulb - THERMO.top - 9, k.surface, { roughness: 0.7, strokeWidth: 1.8 });
      for (let y = THERMO.top + 14; y < THERMO.bulb - 14; y += 16) p.line(THERMO.x - 9, y, THERMO.x - 4, y, { strokeWidth: 1, roughness: 0.3, stroke: k.soft });
      p.text(THERMO.x + 16, THERMO.top + 14, "hot", 17, k.ppe, "hand", "start");
      p.text(THERMO.x + 16, THERMO.bulb - 14, "cold", 17, k.accent, "hand", "start");
    }),
    mercury: part((p) => p.rect(THERMO.x - 4, THERMO.top + 6, 8, THERMO.bulb - THERMO.top - 6, k.ppe, { stroke: "none", strokeWidth: 0, roughness: 0.3 })),
    bulb: part((p) => p.circle(THERMO.x, THERMO.bulb, 28, k.ppe, { roughness: 0.6, strokeWidth: 1.8 })),
    sun: part((p) => sunDisc(p, SUN.x, SUN.y, SUN.r, k)),
    rays: part((p) => sunRays(p, SUN.x, SUN.y, SUN.r, k)),
    hint: part((p) => {
      p.text(SUN.x + 44, SUN.y - 4, "drag", 18, k.accent, "hand", "start");
      p.text(SUN.x + 44, SUN.y + 14, "me", 18, k.accent, "hand", "start");
      arrow(p, SUN.x + 36, SUN.y - 2, SUN.x + 36, SUN.y - 22, k.accent, 1.6, 5);
      arrow(p, SUN.x + 36, SUN.y + 4, SUN.x + 36, SUN.y + 24, k.accent, 1.6, 5);
    }),
    bed: part((p) => stipple(p, -4, 246, 368, 92, stoneInk(k, dark), 31, 0.035)),
    sleepers: SLEEPERS.map((sx) => part((p) => p.rect(sx, 250, 12, 82, k.surface, { roughness: 0.8, strokeWidth: 1.6 }))),
    railL: part((p) => { for (const y of RAILS_Y) p.rect(FAR_L, y - 5, JOINT - T.GAP / 2 - FAR_L, 10, k.surface, { roughness: 0.6, strokeWidth: 1.8 }); }),
    railR: part((p) => { for (const y of RAILS_Y) p.rect(JOINT + T.GAP / 2, y - 5, FAR_R - JOINT - T.GAP / 2, 10, k.surface, { roughness: 0.6, strokeWidth: 1.8 }); }),
    gap: part((p) => {
      p.line(JOINT - T.GAP / 2, 246, JOINT - T.GAP / 2, 256, { stroke: k.accent, strokeWidth: 1.4, roughness: 0.2 });
      p.line(JOINT + T.GAP / 2, 246, JOINT + T.GAP / 2, 256, { stroke: k.accent, strokeWidth: 1.4, roughness: 0.2 });
      label(p, JOINT + 14, 248, "gap", k, 18, k.accent);
    }),
    push: part((p) => {
      arrow(p, 14, 291, 64, 291, k.ppe, 2.6, 8);
      arrow(p, 346, 291, 296, 291, k.ppe, 2.6, 8);
    }),
    sayOpen: part((p) => p.text(180, 372, "cool: the gap gives the rail room", 19, k.ink, "hand")),
    sayClosed: part((p) => p.text(180, 372, "gap closed: the room is used up", 19, k.ink, "hand")),
    sayPush: part((p) => {
      p.text(180, 368, "hotter still: no room left,", 19, k.warn, "hand");
      p.text(180, 390, "so the steel pushes sideways", 19, k.warn, "hand");
    }),
    wisp: part((p) => p.curve([[0, 0], [3, -5], [-2, -10], [2, -15], [0, -19]], { stroke: k.ppe, strokeWidth: 1.5, roughness: 0.3 })),
  }));

  const sunJiggle = useRef((t: Tick) => {
    "worklet";
    // Waiting to be dragged: a small squash-and-widen pulse (skill §3). Gone once the learner has moved it.
    const w = waiting.value;
    const h = t.x;
    return { x: -16 * Math.sin(Math.PI * h), y: T.SUN_LOW - (T.SUN_LOW - T.SUN_HIGH) * h - SUN.y, sx: (0.88 + 0.2 * h) * (1 + 0.025 * w * wave(t.loop, 600)), sy: (0.88 + 0.2 * h) * (1 - 0.025 * w * wave(t.loop, 600)) };
  }).current;
  const hintPose = useRef((t: Tick) => {
    "worklet";
    return { y: T.SUN_LOW - (T.SUN_LOW - T.SUN_HIGH) * t.x - SUN.y, x: -16 * Math.sin(Math.PI * t.x), o: waiting.value };
  }).current;

  const setHeat = (h: number) => {
    const v = Math.max(0, Math.min(1, h));
    const prev = last.current;
    last.current = v;
    heat.value = v;
    if (prev < T.CLOSED && v >= T.CLOSED) { tap("medium"); announce("The gap has closed. The rail has used its room."); }
    if (prev < T.KINK_FROM && v >= T.KINK_FROM) { tap("warn"); announce("No room left. The rail is pushing sideways."); }
    setValueText((s) => { const n = describeHeat(v); return n === s ? s : n; });
  };
  const firstMove = () => { if (waiting.value > 0.5) waiting.value = reduced ? 0 : withTiming(0, { duration: 250 }); };

  // The drag area: the sky, between the page-turn edges. A touch puts the sun at that height; dragging moves it.
  const area = { x: 58, y: 20, w: 268, h: 200 };
  const r = unitRect(box, area.x, area.y, area.w, area.h);
  const toHeat = (localY: number) => {
    const yU = (r.top + localY - box.oy) / box.s;
    return (T.SUN_LOW - yU) / (T.SUN_LOW - T.SUN_HIGH);
  };
  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { startY.current = e.nativeEvent.locationY; firstMove(); handlers.current.set(handlers.current.toHeat(startY.current)); },
    onPanResponderMove: (_, g) => handlers.current.set(handlers.current.toHeat(startY.current + g.dy)),
  })).current;
  const handlers = useRef({ set: setHeat, toHeat });
  handlers.current = { set: setHeat, toHeat };

  return (
    <>
      <StageSvg label="Drag the sun up and down the sky. On a cool day there is a gap between the rail ends at the joint. As the sun climbs and a thermometer rises, the rails expand and the gap closes. Hotter still, with no room left, the rails push and the joint starts to kink sideways.">
        <Still nodes={a.sky} />
        <Layer c={c} pose={sunJiggle}>
          <Layer c={c} pose={raysPose} pivot={[SUN.x, SUN.y]} nodes={a.rays} />
          <Still nodes={a.sun} />
        </Layer>
        <Layer c={c} pose={hintPose} nodes={a.hint} />
        <Still nodes={a.thermo} />
        <Layer c={c} pose={mercuryPose} pivot={[THERMO.x, THERMO.bulb]} nodes={a.mercury} />
        <Still nodes={a.bulb} />
        <Still nodes={a.bed} />
        {SLEEPERS.map((sx, i) => <Layer key={sx} c={c} pose={SLEEPER_POSES[i]} nodes={a.sleepers[i]} />)}
        <Layer c={c} pose={leftRail} pivot={[FAR_L, 291]} nodes={a.railL} />
        <Layer c={c} pose={rightRail} pivot={[FAR_R, 291]} nodes={a.railR} />
        <Layer c={c} pose={gapLabel} nodes={a.gap} />
        <Layer c={c} pose={pushArrows} nodes={a.push} />
        {WISPS.map((w, i) => <Layer key={i} c={c} pose={w} nodes={a.wisp} />)}
        <Layer c={c} pose={sayOpen} nodes={a.sayOpen} />
        <Layer c={c} pose={sayClosed} nodes={a.sayClosed} />
        <Layer c={c} pose={sayPush} nodes={a.sayPush} />
      </StageSvg>
      <View
        {...pr.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="The sun. Drag up to warm the day, down to cool it."
        accessibilityValue={{ text: valueText }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => { firstMove(); setHeat(last.current + (e.nativeEvent.actionName === "increment" ? 0.1 : -0.1)); }}
        style={[r, { cursor: "grab" } as object]}
      />
    </>
  );
}

function describeHeat(h: number) {
  if (h < 0.4) return "Cool. The gap is open.";
  if (h < T.CLOSED) return "Warm. The gap is closing.";
  if (h < T.KINK_FROM) return "Hot. The gap has closed.";
  return "Very hot. No room left, the rail is pushing sideways.";
}
