/**
 * Scene 4 · The joint. After Bilal's joint plate: the close-up draws itself on (rail ends, sleepers and
 * ballast, fishplate, bolts, labels, the end-on view). Then one wheel rolls in from off-screen, dips over the
 * gap, and a "clack" is lettered. Idle: the gap pointer bobs, the clack floats.
 * Final frame (reduced motion): the full labelled joint with "clack".
 */
import React from "react";
import { bell, seg, wave } from "../../living";
import { fishplate, label, railSide, sleeperEnd, stipple, stoneInk, wheel } from "../../art";
import { DrawOn, Layer, StageSvg, clamp01, useArt, useSceneClocks, type Tick } from "../../layers";
import type { ArtProps } from "../../types";

const T = {
  LOOP: 36000,
  SHOT: 6000,
  RAILS: [0, 1100],
  SLEEPERS: [250, 1000],
  BALLAST: [500, 1300],
  PLATE: [1000, 1800],
  BOLTS: [1700, 2300],
  LABELS: [2000, 2900],
  INSET: [2300, 3200],
  /** The wheel crosses the frame at a steady roll. */
  WHEEL: [3000, 5600],
  WHEEL_FROM: -60,
  WHEEL_TO: 420,
  DIP: 3,
} as const;
const GAP_X = 180;
const RAIL = { y: 150, h: 56 };
const WR = 34;
const WY = RAIL.y - WR;
const BOLTS = [128, 158, 202, 232];
const CLACK_AT = T.WHEEL[0] + ((GAP_X - T.WHEEL_FROM) / (T.WHEEL_TO - T.WHEEL_FROM)) * (T.WHEEL[1] - T.WHEEL[0]);

const wheelX = (shot: number) => {
  "worklet";
  const p = clamp01((shot - T.WHEEL[0]) / (T.WHEEL[1] - T.WHEEL[0]));
  return T.WHEEL_FROM + (T.WHEEL_TO - T.WHEEL_FROM) * p;
};
const wheelPose = (t: Tick) => {
  "worklet";
  const x = wheelX(t.shot);
  // The tread drops into the gap a little (exaggerated) as the wheel crosses it.
  const dip = T.DIP * bell(clamp01((x - (GAP_X - 10)) / 20));
  return { x: x - GAP_X, y: dip, r: ((x - GAP_X) / WR) * (180 / Math.PI) };
};
function makeBolt(i: number) {
  const a = T.BOLTS[0] + i * 120;
  return (t: Tick) => {
    "worklet";
    const p = seg(t.shot, a, a + 220);
    return { o: p > 0.01 ? 1 : 0, s: 0.6 + 0.4 * p };
  };
}
const BOLT_POSES = BOLTS.map((_, i) => makeBolt(i));
function makeLabel(i: number) {
  const a = T.LABELS[0] + i * 160;
  return (t: Tick) => {
    "worklet";
    const p = seg(t.shot, a, a + 400);
    return { o: p, y: 4 * (1 - p) };
  };
}
const LABEL_POSES = [0, 1, 2, 3].map(makeLabel);
const pointerPose = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.LABELS[0] + 160, T.LABELS[0] + 560);
  return { o: p, y: 1.5 * wave(t.loop, 2400) };
};
const clackPose = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, CLACK_AT, CLACK_AT + 350);
  return { o: p, y: 8 * (1 - p) + 1 * wave(t.loop, 3600) * p, s: 0.94 + 0.06 * p };
};
const fillFade = (a: number, b: number) => (t: Tick) => {
  "worklet";
  return { o: seg(t.shot, a, b) };
};
const BALLAST_POSE = fillFade(T.BALLAST[0], T.BALLAST[1]);

export function JointScene({ active, reduced }: ArtProps) {
  const c = useSceneClocks(T.LOOP, T.SHOT, active, reduced);
  const a = useArt("s1-01/joint", (part, k, dark) => {
    const sleepers: [number, number, number, number][] = [[30, RAIL.y + RAIL.h, 80, 44], [250, RAIL.y + RAIL.h, 80, 44]];
    return {
      rails: part((p) => { railSide(p, 4, GAP_X - 3, RAIL.y, RAIL.h, k); railSide(p, GAP_X + 3, 356, RAIL.y, RAIL.h, k); }),
      sleepers: part((p) => { for (const s of sleepers) sleeperEnd(p, s[0], s[1], s[2], s[3], k); }),
      ballast: part((p) => stipple(p, 6, RAIL.y + RAIL.h + 6, 348, 82, stoneInk(k, dark), 41, 0.07, sleepers)),
      plate: part((p) => p.rect(106, 168, 148, 26, k.surface, { roughness: 0.8, strokeWidth: 2.2 })),
      bolts: BOLTS.map((bx) => part((p) => p.circle(bx, 181, 14, k.ink, { roughness: 0.6, strokeWidth: 1 }))),
      railEndL: part((p) => { label(p, 34, 58, "rail end", k, 19); p.line(60, 64, 82, RAIL.y - 4, { stroke: k.soft, strokeWidth: 1, roughness: 0.6 }); }),
      gapLabel: part((p) => p.text(GAP_X, 40, "small gap", 19, k.accent, "hand")),
      railEndR: part((p) => { label(p, 262, 58, "rail end", k, 19); p.line(290, 64, 272, RAIL.y - 4, { stroke: k.soft, strokeWidth: 1, roughness: 0.6 }); }),
      plateLabel: part((p) => { label(p, 30, 318, "fishplate and bolts", k, 19); p.line(84, 300, 120, 196, { stroke: k.soft, strokeWidth: 1, roughness: 0.6 }); }),
      pointer: part((p) => {
        p.line(GAP_X, 50, GAP_X, 70, { stroke: k.accent, strokeWidth: 1.8, roughness: 0.3 });
        p.line(GAP_X, 70, GAP_X - 5, 63, { stroke: k.accent, strokeWidth: 1.8, roughness: 0.3 });
        p.line(GAP_X, 70, GAP_X + 5, 63, { stroke: k.accent, strokeWidth: 1.8, roughness: 0.3 });
      }),
      inset: part((p) => {
        const cx = 300, fy = 410, s = 1.9;
        const pts: [number, number][] = [[-14, 0], [14, 0], [14, -3], [4, -7], [3.2, -26], [8, -29], [8, -38], [-8, -38], [-8, -29], [-3.2, -26], [-4, -7], [-14, -3]];
        p.poly(pts.map(([x, y]) => [cx + x * s, fy + y * s]), k.ink, { roughness: 0.7, strokeWidth: 1.8, fillStyle: "hachure", hachureGap: 3.2, hachureAngle: -40 });
        p.rect(cx - 17 * s, fy - 25 * s, 10 * s, 15 * s, k.ink, { roughness: 0.5, strokeWidth: 1.4 });
        p.rect(cx + 7 * s, fy - 25 * s, 10 * s, 15 * s, k.ink, { roughness: 0.5, strokeWidth: 1.4 });
        p.line(cx - 22 * s, fy - 17.5 * s, cx + 22 * s, fy - 17.5 * s, { strokeWidth: 2.2, roughness: 0.4 });
      }),
      insetLabel: part((p) => { p.text(224, 334, "seen end on:", 17, k.soft, "hand", "end"); label(p, 102, 362, "a fishplate each side", k, 17); p.line(258, 358, 262, 364, { stroke: k.soft, strokeWidth: 1, roughness: 0.4 }); }),
      wheel: part((p) => wheel(p, GAP_X, WY, WR, k, 5)),
      clack: part((p) => {
        p.line(GAP_X + 8, 140, GAP_X + 18, 128, { stroke: k.accent, strokeWidth: 2, roughness: 0.3 });
        p.line(GAP_X + 14, 146, GAP_X + 28, 140, { stroke: k.accent, strokeWidth: 2, roughness: 0.3 });
        p.text(GAP_X + 70, 124, "clack", 28, k.accent, "hand");
      }),
    };
  });
  return (
    <StageSvg label="A rail joint up close, drawing itself on: two rail ends with a small gap between them, sitting on sleepers in stony ballast. A steel fishplate is bolted across both rail ends with four bolts, and a small end-on view shows a fishplate each side of the rail. A wheel rolls along the rail, dips slightly over the gap, and the word clack appears.">
      <Layer c={c} pose={BALLAST_POSE} nodes={a.ballast} />
      <DrawOn c={c} nodes={a.sleepers} from={T.SLEEPERS[0]} to={T.SLEEPERS[1]} />
      <DrawOn c={c} nodes={a.rails} from={T.RAILS[0]} to={T.RAILS[1]} share={0.7} />
      <DrawOn c={c} nodes={a.plate} from={T.PLATE[0]} to={T.PLATE[1]} />
      {BOLTS.map((bx, i) => <Layer key={bx} c={c} pose={BOLT_POSES[i]} pivot={[bx, 181]} nodes={a.bolts[i]} />)}
      <Layer c={c} pose={LABEL_POSES[0]} nodes={a.railEndL} />
      <Layer c={c} pose={LABEL_POSES[1]} nodes={a.gapLabel} />
      <Layer c={c} pose={pointerPose} nodes={a.pointer} />
      <Layer c={c} pose={LABEL_POSES[2]} nodes={a.railEndR} />
      <Layer c={c} pose={LABEL_POSES[3]} nodes={a.plateLabel} />
      <DrawOn c={c} nodes={a.inset} from={T.INSET[0]} to={T.INSET[1]} />
      <Layer c={c} pose={LABEL_POSES[3]} nodes={a.insetLabel} />
      <Layer c={c} pose={wheelPose} pivot={[GAP_X, WY]} nodes={a.wheel} />
      <Layer c={c} pose={clackPose} pivot={[GAP_X + 70, 116]} nodes={a.clack} />
    </StageSvg>
  );
}
