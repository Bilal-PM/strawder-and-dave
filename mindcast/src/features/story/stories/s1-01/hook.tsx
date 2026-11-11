/**
 * Scene 1 · Listen. A two-car train runs over jointed track. At each joint a hand-lettered "clack" rises and
 * fades as a bogie crosses, and the car dips a hair. Idle: wires sag and lift between the poles, clouds drift.
 * Frame 0 (reduced motion) has the train in the middle with one clack showing.
 */
import React from "react";
import { G } from "react-native-svg";
import { bell, loop, wave } from "../../living";
import { carBody, cloud, fishplate, pole, railSide, sleeperEnd, stipple, stoneInk, wheel } from "../../art";
import { Layer, StageSvg, Still, clamp01, useArt, useSceneClocks, type Tick } from "../../layers";
import type { ArtProps } from "../../types";

/** Every number in one place. Periods divide LOOP so the loop closes without a jump. */
const T = {
  LOOP: 45000,
  /** One train every 9 s: ~6.8 s on screen, the rest off it. */
  TRAIN_PERIOD: 9000,
  /** Train's left end: from x = −290 (off-left) at speed V; phase puts it mid-screen at frame 0. */
  START: -290,
  V: 690 / 6800,
  PHASE: 3419,
  CLACK_MS: 700,
  DIP_MS: 220,
  DIP: 1.2,
  BOB: 0.5,
  RAIL_TOP: 286,
  WHEEL_R: 7,
} as const;
/** Shared with the welded-rail scene, so the train is the same size in both. */
export const FRAME = "translate(-36 -13) scale(1.2)";
const JOINTS = [70, 190, 310] as const;
const BOGIES_REAR = [22, 98] as const;
const BOGIES_FRONT = [148, 224] as const;
/** Wheel centres along the two-car unit, from its left end. Shared with the welded-rail scene. */
export const WHEELS = [14, 30, 90, 106, 140, 156, 216, 232] as const;
const WHEEL_Y = T.RAIL_TOP - T.WHEEL_R;

function trainX(t: number) {
  "worklet";
  return T.START + T.V * ((t + T.PHASE) % T.TRAIN_PERIOD);
}

/** How strongly a car dips right now: a short dip as each of its bogies crosses a joint. */
function dip(L: number, bogies: readonly number[]) {
  "worklet";
  let d = 0;
  for (let j = 0; j < JOINTS.length; j++) {
    for (let b = 0; b < bogies.length; b++) {
      const dt = (L + bogies[b] - JOINTS[j]) / T.V;
      if (dt >= 0 && dt <= T.DIP_MS) d = Math.max(d, bell(dt / T.DIP_MS));
    }
  }
  return d;
}

const rearPose = (t: Tick) => {
  "worklet";
  const L = trainX(t.loop);
  return { x: L, y: T.BOB * wave(t.loop, 1500) + T.DIP * dip(L, BOGIES_REAR) };
};
const frontPose = (t: Tick) => {
  "worklet";
  const L = trainX(t.loop);
  return { x: L, y: T.BOB * wave(t.loop, 1500, 0.2) + T.DIP * dip(L, BOGIES_FRONT) };
};
const wheelPose = (t: Tick) => {
  "worklet";
  const L = trainX(t.loop);
  return { x: L, r: (L / T.WHEEL_R) * (180 / Math.PI) };
};

/** A clack at joint `xj`: rises 8 units and fades over 0.7 s after each bogie crosses. */
function makeClack(xj: number) {
  return (t: Tick) => {
    "worklet";
    const L = trainX(t.loop);
    let best = -1;
    const all = [BOGIES_REAR[0], BOGIES_REAR[1], BOGIES_FRONT[0], BOGIES_FRONT[1]];
    for (let b = 0; b < all.length; b++) {
      const dt = (L + all[b] - xj) / T.V;
      if (dt >= 0 && dt <= T.CLACK_MS && (best < 0 || dt < best)) best = dt;
    }
    if (best < 0) return { o: 0 };
    const p = best / T.CLACK_MS;
    return { o: bell(Math.min(1, p * 1.6)) * (p < 0.3 ? 1 : 1 - clamp01((p - 0.6) / 0.4)), y: -8 * p };
  };
}
const CLACKS = JOINTS.map(makeClack);

/** Wires sag and lift a little, each span on its own phase. */
function makeWire(i: number) {
  return (t: Tick) => {
    "worklet";
    return { sy: 1 + 0.16 * wave(t.loop, i % 2 ? 5000 : 4500, i * 0.27) };
  };
}
const WIRES = [0, 1, 2, 3].map(makeWire);

const cloudFront = (t: Tick) => {
  "worklet";
  return { x: -110 + 540 * loop(t.loop, 22500, 0.42) };
};
const cloudBack = (t: Tick) => {
  "worklet";
  return { x: -110 + 540 * loop(t.loop, 45000, 0.71) };
};

export function HookScene({ active, reduced }: ArtProps) {
  const c = useSceneClocks(T.LOOP, 1, active, reduced);
  const a = useArt("s1-01/hook", (part, k, dark) => ({
    sky: part((p) => {
      p.curve([[-10, 206], [70, 196], [150, 202], [240, 192], [370, 200]], { stroke: k.line, strokeWidth: 1.6, roughness: 0.8 });
    }),
    cloudA: part((p) => cloud(p, 0, 92, 1.1, k)),
    cloudB: part((p) => cloud(p, 0, 58, 0.75, k)),
    poles: part((p) => { pole(p, 30, 118, 296, k); pole(p, 210, 118, 296, k); }),
    wire0: part((p) => p.curve([[40, 123], [130, 137], [220, 123]], { stroke: k.soft, strokeWidth: 1.2, roughness: 0.4 })),
    wire1: part((p) => p.curve([[20, 123], [110, 139], [200, 123]], { stroke: k.soft, strokeWidth: 1.2, roughness: 0.4 })),
    wire2: part((p) => p.curve([[220, 123], [310, 137], [400, 123]], { stroke: k.soft, strokeWidth: 1.2, roughness: 0.4 })),
    wire3: part((p) => p.curve([[200, 123], [290, 139], [380, 123]], { stroke: k.soft, strokeWidth: 1.2, roughness: 0.4 })),
    track: part((p) => {
      const sleepers: [number, number, number, number][] = [];
      for (let x = 2; x < 370; x += 30) sleepers.push([x, 296, 20, 12]);
      stipple(p, -10, 300, 380, 44, stoneInk(k, dark), 3, 0.06, sleepers);
      for (const s of sleepers) sleeperEnd(p, s[0], s[1], s[2], s[3], k);
      const ends = [-20, ...JOINTS.flatMap((j) => [j - 1.5, j + 1.5]), 380];
      for (let i = 0; i < ends.length; i += 2) railSide(p, ends[i], ends[i + 1], T.RAIL_TOP, 12, k);
      for (const j of JOINTS) fishplate(p, j - 14, j + 14, 289, 6, [j - 8, j + 8], k, 1.6);
    }),
    rear: part((p) => carBody(p, 0, 226, 120, k, false, dark ? "#3E5566" : "#BFD9EA")),
    front: part((p) => { carBody(p, 126, 226, 120, k, true, dark ? "#3E5566" : "#BFD9EA"); p.line(118, 258, 128, 258, { strokeWidth: 2.4, roughness: 0.3 }); }),
    wheels: WHEELS.map((wx) => part((p) => wheel(p, wx, WHEEL_Y, T.WHEEL_R, k, 3))),
    clacks: JOINTS.map((j) => part((p) => {
      p.rect(j - 6, 314, 46, 21, k.bg, { stroke: "none", strokeWidth: 0, roughness: 0 });
      p.line(j + 1, 300, j - 2, 312, { stroke: k.accent, strokeWidth: 1.6, roughness: 0.3 });
      p.line(j + 5, 301, j + 8, 311, { stroke: k.accent, strokeWidth: 1.6, roughness: 0.3 });
      p.text(j + 16, 331, "clack", 21, k.accent, "hand");
    })),
  }));
  const { wheels, clacks } = a;
  return (
    <StageSvg label="A two-carriage train runs along older track made of separate rail lengths. At each joint between two rails the wheels go over a small gap, and the word clack appears. Telegraph wires hang between poles and clouds drift by.">
      {/* Framing: the scene is drawn at the plates' scale and shown 1.2× so the train fills the stage. */}
      <G transform={FRAME}>
      <Layer c={c} pose={cloudBack} nodes={a.cloudB} />
      <Layer c={c} pose={cloudFront} nodes={a.cloudA} />
      <Still nodes={a.sky} />
      <Still nodes={a.poles} />
      <Layer c={c} pose={WIRES[0]} pivot={[0, 123]} nodes={a.wire0} />
      <Layer c={c} pose={WIRES[1]} pivot={[0, 123]} nodes={a.wire1} />
      <Layer c={c} pose={WIRES[2]} pivot={[0, 123]} nodes={a.wire2} />
      <Layer c={c} pose={WIRES[3]} pivot={[0, 123]} nodes={a.wire3} />
      <Still nodes={a.track} />
      <Layer c={c} pose={rearPose} nodes={a.rear} />
      <Layer c={c} pose={frontPose} nodes={a.front} />
      {WHEELS.map((wx, i) => <Layer key={wx} c={c} pose={wheelPose} pivot={[wx, WHEEL_Y]} nodes={wheels[i]} />)}
      {JOINTS.map((j, i) => <Layer key={j} c={c} pose={CLACKS[i]} nodes={clacks[i]} />)}
      </G>
    </StageSvg>
  );
}
