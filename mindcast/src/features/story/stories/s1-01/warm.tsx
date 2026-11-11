/**
 * Scene 2 · Warm steel. One action: the day warms. The sun arcs up about a point below the horizon, the
 * thermometer rises and, a beat behind, the rail gets longer from its fixed left end (exaggerated, and lettered
 * so). Idle: heat shimmer over the rail, sun rays turning, a cloud drifting.
 * Final frame (reduced motion): sun high, rail long, "warm" and "exaggerated" lettered.
 */
import React from "react";
import { bell, loop, seg, wave } from "../../living";
import { arrow, cloud, dashed, label, railSide, sleeperEnd, stipple, stoneInk, sunDisc, sunRays } from "../../art";
import { DrawOn, Layer, StageSvg, Still, useArt, useSceneClocks, type Tick } from "../../layers";
import type { ArtProps } from "../../types";

const T = {
  LOOP: 36000,
  SHOT: 4800,
  SUN: [0, 3200],
  /** The sun is drawn at its high point and turns up to it about a pivot below the horizon. */
  SUN_PIVOT: [190, 360] as const,
  SUN_FROM_DEG: -55,
  MERCURY: [400, 3400],
  RAIL: [900, 3800],
  /** How much longer the rail gets, drawn: 12%, wildly exaggerated so you can see it. */
  STRETCH: 0.12,
  LABELS: [3600, 4300],
  EXAG: [4000, 4700],
} as const;
const RAIL = { x1: 24, x2: 272, y: 300, h: 24 };
const SUN = { x: 250, y: 92, r: 26 };
const THERMO = { x: 330, top: 120, bulb: 262 };

const sunPose = (t: Tick) => {
  "worklet";
  return { r: T.SUN_FROM_DEG * (1 - seg(t.shot, T.SUN[0], T.SUN[1], "inOut")) };
};
const raysPose = (t: Tick) => {
  "worklet";
  return { r: (t.loop / T.LOOP) * 360 };
};
const mercuryPose = (t: Tick) => {
  "worklet";
  return { sy: 0.3 + 0.55 * seg(t.shot, T.MERCURY[0], T.MERCURY[1], "inOut") };
};
const railPose = (t: Tick) => {
  "worklet";
  return { sx: 1 + T.STRETCH * seg(t.shot, T.RAIL[0], T.RAIL[1], "inOut") };
};
const warmLabel = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.LABELS[0], T.LABELS[1]);
  return { o: p, y: 4 * (1 - p) };
};
const exagLabel = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.EXAG[0], T.EXAG[1]);
  return { o: p, y: 4 * (1 - p) + 1.2 * wave(t.loop, 4000) * p };
};
const cloudPose = (t: Tick) => {
  "worklet";
  return { x: -120 + 560 * loop(t.loop, 36000, 0.18) };
};
const WISP_X = [80, 150, 220];
/** Shimmer wisps rise and fade; there is more of it as the day warms. */
function makeWisp(i: number) {
  const x0 = WISP_X[i];
  const period = [2400, 3000, 2000][i];
  return (t: Tick) => {
    "worklet";
    const p = loop(t.loop, period, i * 0.37);
    const warm = seg(t.shot, T.RAIL[0], T.RAIL[1]);
    return { x: x0 + 1.5 * wave(t.loop, 1200, i * 0.3), y: RAIL.y - 8 - 12 * p, o: bell(p) * (0.25 + 0.75 * warm) };
  };
}
const WISPS = [0, 1, 2].map(makeWisp);

export function WarmScene({ active, reduced }: ArtProps) {
  const c = useSceneClocks(T.LOOP, T.SHOT, active, reduced);
  const a = useArt("s1-01/warm", (part, k, dark) => ({
    cloud: part((p) => cloud(p, 0, 70, 1.05, k)),
    ground: part((p) => {
      p.curve([[-10, 248], [80, 238], [170, 244], [260, 234], [370, 242]], { stroke: k.line, strokeWidth: 1.6, roughness: 0.8 });
      const sleepers: [number, number, number, number][] = [40, 96, 152, 208, 264].map((x) => [x, RAIL.y + RAIL.h, 26, 20]);
      stipple(p, 6, 330, 348, 44, stoneInk(k, dark), 21, 0.06, sleepers);
      for (const s of sleepers) sleeperEnd(p, s[0], s[1], s[2], s[3], k);
    }),
    sun: part((p) => sunDisc(p, SUN.x, SUN.y, SUN.r, k)),
    rays: part((p) => sunRays(p, SUN.x, SUN.y, SUN.r, k)),
    thermo: part((p) => {
      p.rect(THERMO.x - 8, THERMO.top, 16, THERMO.bulb - THERMO.top - 8, k.surface, { roughness: 0.7, strokeWidth: 1.8 });
      for (let y = THERMO.top + 14; y < THERMO.bulb - 14; y += 16) p.line(THERMO.x - 8, y, THERMO.x - 3, y, { strokeWidth: 1, roughness: 0.3, stroke: k.soft });
    }),
    mercury: part((p) => p.rect(THERMO.x - 3.5, THERMO.top + 6, 7, THERMO.bulb - THERMO.top - 6, k.ppe, { stroke: "none", strokeWidth: 0, roughness: 0.3 })),
    bulb: part((p) => p.circle(THERMO.x, THERMO.bulb, 26, k.ppe, { roughness: 0.6, strokeWidth: 1.8 })),
    coolMark: part((p) => {
      dashed(p, RAIL.x2, RAIL.y - 18, RAIL.x2, RAIL.y + RAIL.h + 4, k.soft);
      p.text(RAIL.x2 - 6, RAIL.y - 8, "cool", 17, k.soft, "hand", "end");
      dashed(p, RAIL.x1, RAIL.y - 18, RAIL.x1, RAIL.y + RAIL.h + 4, k.soft);
    }),
    rail: part((p) => railSide(p, RAIL.x1, RAIL.x2, RAIL.y, RAIL.h, k)),
    warm: part((p) => {
      arrow(p, RAIL.x2 + 4, RAIL.y - 14, RAIL.x2 + 28, RAIL.y - 14, k.ppe, 2, 6);
      p.text(RAIL.x2 + 34, RAIL.y - 8, "warm", 18, k.ppe, "hand", "start");
    }),
    exag: part((p) => {
      p.curve([[262, 392], [282, 384], [296, 362], [300, 340]], { stroke: k.ink, strokeWidth: 1.4, roughness: 0.4 });
      p.line(300, 340, 295, 348, { strokeWidth: 1.4, roughness: 0.3 });
      p.line(300, 340, 305, 347, { strokeWidth: 1.4, roughness: 0.3 });
      label(p, 164, 402, "(exaggerated)", k, 19, k.ink);
    }),
    wisp: part((p) => p.curve([[0, 0], [3, -5], [-2, -10], [2, -15], [0, -19]], { stroke: k.ppe, strokeWidth: 1.6, roughness: 0.3 })),
  }));
  return (
    <StageSvg label="A rail lies on sleepers on a cool morning. The sun rises in an arc and the thermometer climbs. As the day warms, the rail gets longer, from its fixed left end past the line that marks its cool length. The change is exaggerated so you can see it. Heat shimmers above the rail.">
      <Layer c={c} pose={cloudPose} nodes={a.cloud} />
      <Layer c={c} pose={sunPose} pivot={T.SUN_PIVOT}>
        <Layer c={c} pose={raysPose} pivot={[SUN.x, SUN.y]} nodes={a.rays} />
        <Still nodes={a.sun} />
      </Layer>
      <Still nodes={a.ground} />
      <Still nodes={a.thermo} />
      <Layer c={c} pose={mercuryPose} pivot={[THERMO.x, THERMO.bulb]} nodes={a.mercury} />
      <Still nodes={a.bulb} />
      <Still nodes={a.coolMark} />
      <Layer c={c} pose={railPose} pivot={[RAIL.x1, RAIL.y]} nodes={a.rail} />
      {WISPS.map((w, i) => <Layer key={i} c={c} pose={w} nodes={a.wisp} />)}
      <Layer c={c} pose={warmLabel} nodes={a.warm} />
      <DrawOn c={c} nodes={a.exag} from={T.EXAG[0]} to={T.EXAG[1]} />
    </StageSvg>
  );
}
