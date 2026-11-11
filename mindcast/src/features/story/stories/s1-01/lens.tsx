/**
 * Scene 7 · The lens. The Mindcast told in the drawing.
 *   The two rail lengths lift off the railway picture and morph, in an arc, into two pieces of work on a team
 *   meeting plan; the planned gap between them becomes a planned slot ("what's stuck?"). The railway redraws
 *   itself faintly where they left. Then a relation line draws across from each railway element to its
 *   workplace counterpart, labelled from the lens mapping:
 *     the gap ↔ the slot, the seized joint ↔ pressure coming out sideways, the ballast ↔ the team.
 *   It ends on the principle in large hand lettering and one honest line on where the analogy stops.
 * Idle: the slot breathes a little, the team's heads bob out of phase.
 */
import React, { useMemo } from "react";
import { seg, wave } from "../../living";
import { dashed, fishplate, person, sleeperEnd, stipple, stoneInk } from "../../art";
import { DrawOn, Layer, MorphPath, StageSvg, Still, rectOutline, useArt, useSceneClocks, type Tick } from "../../layers";
import { useTheme } from "@/ui/theme";
import type { ArtProps } from "../../types";

/** Short labels for the relation lines, taken from the lens mapping (src/domain/railway/lessons.ts, s1-01). */
export const LENS_LABELS = {
  gap: "a planned place to go",
  seized: "blocked: it comes out sideways",
  ballast: "steady relationships hold it together",
  principle: ["Give pressure a planned place to go,", "or it will find an unplanned one."],
  limits: "Where it stops: steel is predictable. People aren't.",
} as const;

const T = {
  LOOP: 36000,
  SHOT: 8400,
  MORPH: [700, 2300],
  GHOST: [1500, 2700],
  BLOCK_LABELS: [2300, 2700],
  BOARD: [2200, 3000],
  SLOT: [2700, 3200],
  TEAM: [2900, 3700],
  L1: [3600, 4300],
  L2: [4400, 5200],
  L3: [5300, 6000],
  P1: [6300, 6900],
  P2: [6700, 7300],
  LIMITS: [7600, 8300],
} as const;
const RAIL_L = { x: 14, y: 46, w: 158, h: 16 };
const RAIL_R = { x: 188, y: 46, w: 158, h: 16 };
const BLOCK_L = { x: 44, y: 182, w: 110, h: 30 };
const BLOCK_R = { x: 206, y: 182, w: 110, h: 30 };
const SLOT = { x: 158, y: 179, w: 44, h: 36 };
const HEADS = [64, 108, 152, 196];

const fade = (a: number, b: number, rise = 4) => (t: Tick) => {
  "worklet";
  const p = seg(t.shot, a, b);
  return { o: p, y: rise * (1 - p) };
};
const BLOCK_LABEL_POSE = fade(T.BLOCK_LABELS[0], T.BLOCK_LABELS[1], 2);
const L1_LABEL = fade(T.L1[1] - 200, T.L1[1] + 250);
const L2_LABEL = fade(T.L2[1] - 200, T.L2[1] + 250);
const L3_LABEL = fade(T.L3[1] - 200, T.L3[1] + 250);
const P1_POSE = fade(T.P1[0], T.P1[1], 6);
const P2_POSE = fade(T.P2[0], T.P2[1], 6);
const LIMITS_POSE = fade(T.LIMITS[0], T.LIMITS[1]);
const BUBBLE_POSE = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.L2[1] - 300, T.L2[1] + 100);
  return { o: p, s: 0.94 + 0.06 * p, y: 1 * wave(t.loop, 3600, 0.4) * p };
};
const slotPose = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.SLOT[0], T.SLOT[1]);
  return { o: p, s: (0.95 + 0.05 * p) * (1 + 0.015 * wave(t.loop, 4500) * p) };
};
function makeHead(i: number) {
  const period = [3000, 3600, 4500, 3000][i];
  return (t: Tick) => {
    "worklet";
    return { y: 1 * wave(t.loop, period, i * 0.31) };
  };
}
const HEAD_POSES = HEADS.map((_, i) => makeHead(i));

export function LensScene({ active, reduced }: ArtProps) {
  const { c: k } = useTheme();
  const c = useSceneClocks(T.LOOP, T.SHOT, active, reduced);
  const a = useArt("s1-01/lens", (part, kk, dark) => {
    const sleepers: [number, number, number, number][] = [40, 100, 232, 292].map((x) => [x, 62, 28, 12]);
    return {
      tags: part((p) => p.text(14, 24, "ON THE RAILWAY", 10, kk.soft, "mono", "start")),
      railway: part((p) => {
        stipple(p, 10, 70, 340, 32, stoneInk(kk, dark), 61, 0.07, sleepers);
        for (const s of sleepers) sleeperEnd(p, s[0], s[1], s[2], s[3], kk);
      }),
      plate: part((p) => fishplate(p, 146, 214, 50, 8, [156, 170, 190, 204], kk, 2.6)),
      ghost: part((p) => {
        p.rect(RAIL_L.x, RAIL_L.y, RAIL_L.w, RAIL_L.h, null, { stroke: kk.soft, strokeWidth: 1.5, roughness: 0.8 });
        p.rect(RAIL_R.x, RAIL_R.y, RAIL_R.w, RAIL_R.h, null, { stroke: kk.soft, strokeWidth: 1.5, roughness: 0.8 });
      }),
      board: part((p) => {
        p.rect(32, 152, 296, 80, null, { roughness: 1, strokeWidth: 2 });
        p.line(32, 172, 328, 172, { stroke: kk.soft, strokeWidth: 1, roughness: 0.6 });
      }),
      boardTag: part((p) => p.text(42, 166, "IN YOUR WORK · TEAM MEETING", 10, kk.soft, "mono", "start")),
      blockLabels: part((p) => {
        p.text(BLOCK_L.x + BLOCK_L.w / 2, 203, "updates", 17, kk.ink, "hand");
        p.text(BLOCK_R.x + BLOCK_R.w / 2, 203, "plans", 17, kk.ink, "hand");
      }),
      slot: part((p) => {
        p.rect(SLOT.x, SLOT.y, SLOT.w, SLOT.h, kk.pass + "55", { stroke: "none", strokeWidth: 0, roughness: 0.6 });
        dashed(p, SLOT.x, SLOT.y, SLOT.x + SLOT.w, SLOT.y, kk.ink, 4, 3, 1.3);
        dashed(p, SLOT.x, SLOT.y + SLOT.h, SLOT.x + SLOT.w, SLOT.y + SLOT.h, kk.ink, 4, 3, 1.3);
        p.text(180, 194, "what's", 14, kk.ink, "hand");
        p.text(180, 208, "stuck?", 14, kk.ink, "hand");
      }),
      team: part((p) => { for (const x of HEADS) p.line(x - 16, 290, x + 16, 290, { stroke: kk.line, strokeWidth: 1, roughness: 0.5 }); }),
      heads: HEADS.map((x) => part((p) => person(p, x, 260, kk, kk.accent))),
      bubble: part((p) => {
        p.path("M282 250 Q282 240 292 240 L326 240 Q336 240 336 250 L336 262 Q336 272 326 272 L300 272 L290 282 L292 272 Q282 272 282 262 Z", kk.surface, { stroke: kk.ppe, strokeWidth: 1.8, roughness: 0.9 });
        for (const x of [298, 309, 320]) p.circle(x, 256, 4, kk.ppe, { stroke: kk.ppe, roughness: 0.3, strokeWidth: 1 });
      }),
      l1: part((p) => p.line(180, 66, 180, 176, { stroke: kk.accent, strokeWidth: 2, roughness: 0.6 })),
      l1Label: part((p) => p.text(172, 116, LENS_LABELS.gap, 16, kk.accent, "hand", "end")),
      l2: part((p) => p.path("M214 54 C 300 62, 346 100, 344 160 L 343 214 C 342 230, 340 236, 338 240", null, { stroke: kk.ppe, strokeWidth: 2, roughness: 0.6 })),
      l2Label: part((p) => p.text(336, 142, LENS_LABELS.seized, 16, kk.ppe, "hand", "end")),
      l3: part((p) => p.path("M20 92 C 8 130, 8 200, 14 236 C 18 254, 30 262, 46 264", null, { stroke: kk.accent, strokeWidth: 2, roughness: 0.6 })),
      l3Label: part((p) => p.text(26, 314, LENS_LABELS.ballast, 16, kk.accent, "hand", "start")),
      p1: part((p) => p.text(180, 348, LENS_LABELS.principle[0], 23, kk.ink, "hand")),
      p2: part((p) => p.text(180, 374, LENS_LABELS.principle[1], 23, kk.ink, "hand")),
      limits: part((p) => p.text(180, 406, LENS_LABELS.limits, 12.5, kk.soft, "body")),
    };
  });
  const shapes = useMemo(() => ({
    l1: rectOutline(RAIL_L.x, RAIL_L.y, RAIL_L.w, RAIL_L.h, 8, 2, 0.8, 1),
    l2: rectOutline(RAIL_L.x, RAIL_L.y, RAIL_L.w, RAIL_L.h, 8, 2, 1.1, 2),
    r1: rectOutline(RAIL_R.x, RAIL_R.y, RAIL_R.w, RAIL_R.h, 8, 2, 0.8, 3),
    r2: rectOutline(RAIL_R.x, RAIL_R.y, RAIL_R.w, RAIL_R.h, 8, 2, 1.1, 4),
    bl1: rectOutline(BLOCK_L.x, BLOCK_L.y, BLOCK_L.w, BLOCK_L.h, 8, 2, 0.8, 1),
    bl2: rectOutline(BLOCK_L.x, BLOCK_L.y, BLOCK_L.w, BLOCK_L.h, 8, 2, 1.1, 2),
    br1: rectOutline(BLOCK_R.x, BLOCK_R.y, BLOCK_R.w, BLOCK_R.h, 8, 2, 0.8, 3),
    br2: rectOutline(BLOCK_R.x, BLOCK_R.y, BLOCK_R.w, BLOCK_R.h, 8, 2, 1.1, 4),
  }), []);
  const m = (from: typeof shapes.l1, to: typeof shapes.l1, fill: string, sw: number) => (
    <MorphPath c={c} a={from} b={to} from={T.MORPH[0]} to={T.MORPH[1]} stroke={k.ink} sw={sw} fill={fill} lift={16} />
  );
  return (
    <StageSvg label={`The railway picture: two rail lengths with a planned gap at the joint, a fishplate, sleepers and ballast. The two rails lift off and turn into two pieces of work on a team meeting plan, updates and plans, and the gap between them becomes a planned slot: what's stuck? Lines join each railway part to its match at work. The gap: ${LENS_LABELS.gap}. The seized joint: ${LENS_LABELS.seized}, shown as a side conversation. The ballast: ${LENS_LABELS.ballast}, shown as the team. Then: ${LENS_LABELS.principle.join(" ")} ${LENS_LABELS.limits}`}>
      <Still nodes={a.tags} />
      <Still nodes={a.railway} />
      <DrawOn c={c} nodes={a.ghost} from={T.GHOST[0]} to={T.GHOST[1]} share={0.8} />
      <Still nodes={a.plate} />
      <DrawOn c={c} nodes={a.board} from={T.BOARD[0]} to={T.BOARD[1]} />
      <Layer c={c} pose={BLOCK_LABEL_POSE} nodes={a.boardTag} />
      {m(shapes.l1, shapes.bl1, k.surface, 2)}
      {m(shapes.l2, shapes.bl2, "none", 1.3)}
      {m(shapes.r1, shapes.br1, k.surface, 2)}
      {m(shapes.r2, shapes.br2, "none", 1.3)}
      <Layer c={c} pose={BLOCK_LABEL_POSE} nodes={a.blockLabels} />
      <Layer c={c} pose={slotPose} pivot={[180, 197]} nodes={a.slot} />
      <DrawOn c={c} nodes={a.team} from={T.TEAM[0]} to={T.TEAM[1]} />
      {HEADS.map((x, i) => (
        <Layer key={x} c={c} pose={HEAD_POSES[i]}>
          <DrawOn c={c} nodes={a.heads[i]} from={T.TEAM[0] + i * 120} to={T.TEAM[0] + i * 120 + 500} />
        </Layer>
      ))}
      <DrawOn c={c} nodes={a.l1} from={T.L1[0]} to={T.L1[1]} />
      <Layer c={c} pose={L1_LABEL} nodes={a.l1Label} />
      <DrawOn c={c} nodes={a.l2} from={T.L2[0]} to={T.L2[1]} />
      <Layer c={c} pose={BUBBLE_POSE} pivot={[309, 260]} nodes={a.bubble} />
      <Layer c={c} pose={L2_LABEL} nodes={a.l2Label} />
      <DrawOn c={c} nodes={a.l3} from={T.L3[0]} to={T.L3[1]} />
      <Layer c={c} pose={L3_LABEL} nodes={a.l3Label} />
      <Layer c={c} pose={P1_POSE} nodes={a.p1} />
      <Layer c={c} pose={P2_POSE} nodes={a.p2} />
      <Layer c={c} pose={LIMITS_POSE} nodes={a.limits} />
    </StageSvg>
  );
}
