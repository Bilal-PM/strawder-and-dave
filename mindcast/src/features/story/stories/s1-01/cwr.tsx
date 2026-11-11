/**
 * Scene 5 · Today's railway. Continuous welded rail, told as one sequence:
 *   the three rail lengths slide together and are welded (a glow at each weld, then a collar) →
 *   a tensor clamps on and stretches the long rail a little (exaggerated) →
 *   the clips drop on, one after another along the sleepers →
 *   the tensor lifts away, force arrows draw on in the ballast: sleepers and ballast hold it still →
 *   a train glides over, quiet. "no clack".
 * Idle: clouds drift. Final frame (reduced motion): welded, clipped rail with its arrows and labels.
 */
import React from "react";
import { G } from "react-native-svg";
import { EASE_IN, loop, seg, wave } from "../../living";
import { arrow, carBody, cloud, label, railSide, sleeperEnd, stipple, stoneInk, wheel } from "../../art";
import { DrawOn, Layer, StageSvg, Still, clamp01, useArt, useSceneClocks, type Tick } from "../../layers";
import type { ArtProps } from "../../types";
import { FRAME, WHEELS } from "./hook";

const T = {
  LOOP: 45000,
  SHOT: 13400,
  WELD: [300, 1300],
  GLOW_IN: [1100, 1500],
  GLOW_OUT: [1700, 2600],
  LONG_LABEL: [1400, 1900],
  TENSOR_IN: [1900, 2200],
  PULL: [2200, 3200],
  /** How much the long rail is stretched, drawn (exaggerated). */
  STRETCH: 0.022,
  CLIPS: 3300,
  CLIP_STEP: 110,
  CLIP_FALL: 260,
  TENSOR_OUT: [4800, 5200],
  ARROWS: [5100, 6000],
  HOLD_LABEL: [5800, 6300],
  /** The train: same unit, same speed as scene 1. */
  TRAIN_AT: 6400,
  V: 690 / 6800,
  QUIET_LABEL: [9300, 9800],
} as const;
const RAIL_Y = 278;
const RAIL_H = 16;
const WR = 7;
const WY = RAIL_Y - WR;
const SLEEPERS = Array.from({ length: 12 }, (_, i) => 4 + i * 30);
const WELDS = [124, 236];

const trainX = (shot: number) => {
  "worklet";
  return -290 + T.V * Math.max(0, shot - T.TRAIN_AT);
};
/** Rail A slides right, rail C slides left, closing the two gaps. */
const railA = (t: Tick) => {
  "worklet";
  return { x: 6 * seg(t.shot, T.WELD[0], T.WELD[1], "inOut") };
};
const railC = (t: Tick) => {
  "worklet";
  return { x: -6 * seg(t.shot, T.WELD[0], T.WELD[1], "inOut") };
};
const strand = (t: Tick) => {
  "worklet";
  return { sx: 1 + T.STRETCH * seg(t.shot, T.PULL[0], T.PULL[1], "inOut") };
};
const glow = (t: Tick) => {
  "worklet";
  return { o: seg(t.shot, T.GLOW_IN[0], T.GLOW_IN[1]) * (1 - seg(t.shot, T.GLOW_OUT[0], T.GLOW_OUT[1])), s: 0.92 + 0.08 * seg(t.shot, T.GLOW_IN[0], T.GLOW_IN[1]) };
};
const collar = (t: Tick) => {
  "worklet";
  return { o: seg(t.shot, T.GLOW_IN[0] + 200, T.GLOW_IN[1] + 300) };
};
const fadeIn = (a: number, b: number) => (t: Tick) => {
  "worklet";
  const p = seg(t.shot, a, b);
  return { o: p, y: 4 * (1 - p) };
};
const LONG_POSE = fadeIn(T.LONG_LABEL[0], T.LONG_LABEL[1]);
const HOLD_POSE = fadeIn(T.HOLD_LABEL[0], T.HOLD_LABEL[1]);
const QUIET_POSE = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.QUIET_LABEL[0], T.QUIET_LABEL[1]);
  return { o: p, y: 6 * (1 - p) + 1.2 * wave(t.loop, 4500) * p };
};
const tensor = (t: Tick) => {
  "worklet";
  const inn = seg(t.shot, T.TENSOR_IN[0], T.TENSOR_IN[1]);
  const out = seg(t.shot, T.TENSOR_OUT[0], T.TENSOR_OUT[1]);
  // Clamped to the rail end, it moves with the stretch; then lifts off and goes.
  const pull = seg(t.shot, T.PULL[0], T.PULL[1], "inOut");
  return { o: inn * (1 - out), y: -10 * out + 6 * (1 - inn), x: (300 + 40) * T.STRETCH * pull };
};
const pullArrow = (t: Tick) => {
  "worklet";
  const out = seg(t.shot, T.TENSOR_OUT[0], T.TENSOR_OUT[1]);
  return { o: (1 - out) * seg(t.shot, T.PULL[0], T.PULL[0] + 250), sx: 0.3 + 0.7 * seg(t.shot, T.PULL[0], T.PULL[1]) };
};
const pullLabel = (t: Tick) => {
  "worklet";
  const out = seg(t.shot, T.TENSOR_OUT[0], T.TENSOR_OUT[1]);
  return { o: (1 - out) * seg(t.shot, T.PULL[0] + 200, T.PULL[0] + 600) };
};
/** Clips fall onto the rail foot one after another (gravity: ease-in), with a tiny settle. */
function makeClip(i: number) {
  const a = T.CLIPS + i * T.CLIP_STEP;
  return (t: Tick) => {
    "worklet";
    const p = clamp01((t.shot - a) / T.CLIP_FALL);
    const fall = EASE_IN(p);
    const settle = t.shot > a + T.CLIP_FALL ? 0.8 * Math.sin(Math.PI * clamp01((t.shot - a - T.CLIP_FALL) / 140)) : 0;
    return { o: t.shot > a ? 1 : 0, y: -22 * (1 - fall) + settle };
  };
}
const CLIP_POSES = SLEEPERS.map((_, i) => makeClip(i));
const carRear = (t: Tick) => {
  "worklet";
  return { x: trainX(t.shot), y: 0.4 * wave(t.loop, 1500) };
};
const carFront = (t: Tick) => {
  "worklet";
  return { x: trainX(t.shot), y: 0.4 * wave(t.loop, 1500, 0.2) };
};
const wheelPose = (t: Tick) => {
  "worklet";
  const L = trainX(t.shot);
  return { x: L, r: (L / WR) * (180 / Math.PI) };
};
const cloudA = (t: Tick) => {
  "worklet";
  return { x: -110 + 540 * loop(t.loop, 22500, 0.6) };
};
const cloudB = (t: Tick) => {
  "worklet";
  return { x: -110 + 540 * loop(t.loop, 45000, 0.15) };
};

export function CwrScene({ active, reduced }: ArtProps) {
  const c = useSceneClocks(T.LOOP, T.SHOT, active, reduced);
  const a = useArt("s1-01/cwr", (part, k, dark) => {
    const sl: [number, number, number, number][] = SLEEPERS.map((x) => [x, RAIL_Y + RAIL_H, 20, 12]);
    const glass = dark ? "#3E5566" : "#BFD9EA";
    return {
      cloudA: part((p) => cloud(p, 0, 96, 1.1, k)),
      cloudB: part((p) => cloud(p, 0, 62, 0.75, k)),
      horizon: part((p) => p.curve([[-10, 206], [70, 196], [150, 202], [240, 192], [370, 200]], { stroke: k.line, strokeWidth: 1.6, roughness: 0.8 })),
      bed: part((p) => { stipple(p, -10, RAIL_Y + RAIL_H + 4, 380, 44, stoneInk(k, dark), 51, 0.06, sl); for (const s of sl) sleeperEnd(p, s[0], s[1], s[2], s[3], k); }),
      railA: part((p) => railSide(p, -40, 118, RAIL_Y, RAIL_H, k)),
      railB: part((p) => railSide(p, 124, 236, RAIL_Y, RAIL_H, k)),
      railC: part((p) => railSide(p, 242, 400, RAIL_Y, RAIL_H, k)),
      glow: part((p) => { for (const w of WELDS) p.ellipse(w, RAIL_Y + RAIL_H / 2, 20, 30, k.ppe, { stroke: k.ppe, strokeWidth: 1, roughness: 0.6 }); }),
      collar: part((p) => { for (const w of WELDS) p.rect(w - 3, RAIL_Y - 2, 6, RAIL_H + 4, k.surface, { roughness: 0.4, strokeWidth: 1.6 }); }),
      longLabel: part((p) => label(p, 52, 262, "welded into one long rail", k, 17)),
      tensor: part((p) => {
        p.rect(268, RAIL_Y - 10, 12, RAIL_H + 20, k.ink, { roughness: 0.5, strokeWidth: 1.2 });
        p.rect(316, RAIL_Y - 10, 12, RAIL_H + 20, k.ink, { roughness: 0.5, strokeWidth: 1.2 });
        p.rect(266, RAIL_Y - 24, 64, 12, k.sunk, { roughness: 0.6, strokeWidth: 1.8 });
        p.text(298, RAIL_Y - 30, "tensor", 16, k.ink, "hand");
      }),
      pull: part((p) => arrow(p, 300, RAIL_Y - 52, 340, RAIL_Y - 52, k.accent, 2.4, 7)),
      pullLabel: part((p) => p.text(296, RAIL_Y - 46, "stretched first", 16, k.accent, "hand", "end")),
      clips: SLEEPERS.map((x) => part((p) => p.path(`M${x - 1} ${RAIL_Y + RAIL_H} L${x + 3} ${RAIL_Y + RAIL_H - 6} L${x + 17} ${RAIL_Y + RAIL_H - 6} L${x + 21} ${RAIL_Y + RAIL_H} Z`, k.accent, { stroke: k.accent, roughness: 0.4, strokeWidth: 1.2 }))),
      arrows: part((p) => {
        for (const i of [2, 6, 10]) {
          const x = SLEEPERS[i];
          arrow(p, x - 16, RAIL_Y + RAIL_H + 8, x - 3, RAIL_Y + RAIL_H + 8, k.accent, 1.8, 5);
          arrow(p, x + 36, RAIL_Y + RAIL_H + 8, x + 23, RAIL_Y + RAIL_H + 8, k.accent, 1.8, 5);
          arrow(p, x + 10, RAIL_Y + RAIL_H + 38, x + 10, RAIL_Y + RAIL_H + 15, k.accent, 1.8, 5);
        }
      }),
      holdLabel: part((p) => p.text(180, 356, "clipped down, held by sleepers and ballast", 15, k.ink, "hand")),
      rear: part((p) => carBody(p, 0, RAIL_Y - 60, 120, k, false, glass)),
      front: part((p) => { carBody(p, 126, RAIL_Y - 60, 120, k, true, glass); p.line(118, RAIL_Y - 28, 128, RAIL_Y - 28, { strokeWidth: 2.4, roughness: 0.3 }); }),
      wheels: WHEELS.map((wx) => part((p) => wheel(p, wx, WY, WR, k, 3))),
      quiet: part((p) => p.text(180, 196, "quiet: no clack", 22, k.accent, "hand")),
    };
  });
  return (
    <StageSvg label="Today's main line. Three rail lengths slide together and are welded into one long rail. A tensor clamps on and stretches it a little before blue clips drop onto every sleeper, one after another. Arrows show the sleepers and ballast holding the rail still. Then a train glides over, quietly, with no clack.">
      <G transform={FRAME}>
        <Layer c={c} pose={cloudB} nodes={a.cloudB} />
        <Layer c={c} pose={cloudA} nodes={a.cloudA} />
        <Still nodes={a.horizon} />
        <Still nodes={a.bed} />
        <Layer c={c} pose={strand} pivot={[-40, RAIL_Y]}>
          <Layer c={c} pose={railA} nodes={a.railA} />
          <Still nodes={a.railB} />
          <Layer c={c} pose={railC} nodes={a.railC} />
          <Layer c={c} pose={collar} nodes={a.collar} />
        </Layer>
        <Layer c={c} pose={glow} pivot={[180, RAIL_Y + 8]} nodes={a.glow} />
        {SLEEPERS.map((x, i) => <Layer key={x} c={c} pose={CLIP_POSES[i]} nodes={a.clips[i]} />)}
        <Layer c={c} pose={tensor} nodes={a.tensor} />
        <Layer c={c} pose={pullArrow} pivot={[300, RAIL_Y - 52]} nodes={a.pull} />
        <Layer c={c} pose={pullLabel} nodes={a.pullLabel} />
        <Layer c={c} pose={LONG_POSE} nodes={a.longLabel} />
        <DrawOn c={c} nodes={a.arrows} from={T.ARROWS[0]} to={T.ARROWS[1]} />
        <Layer c={c} pose={HOLD_POSE} nodes={a.holdLabel} />
        <Layer c={c} pose={carRear} nodes={a.rear} />
        <Layer c={c} pose={carFront} nodes={a.front} />
        {WHEELS.map((wx, i) => <Layer key={wx} c={c} pose={wheelPose} pivot={[wx, WY]} nodes={a.wheels[i]} />)}
        <Layer c={c} pose={QUIET_POSE} nodes={a.quiet} />
      </G>
    </StageSvg>
  );
}
