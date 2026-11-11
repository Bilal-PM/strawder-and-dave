/**
 * Scene 8 · Your move. The same team-meeting plan as the lens, closer. A pencil comes in already moving,
 * draws the slot and writes "What's stuck? 5 min" into it, then lifts away and rests. The learner can add the
 * action to their Loop (the existing Loop store logic and dedupe, shared with the lens card).
 * Idle: the resting pencil rocks a little, the "every week" loop arrow turns slowly.
 */
import React from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { seg, wave } from "../../living";
import { dashed } from "../../art";
import { DrawOn, Layer, StageSvg, Still, clamp01, useArt, useSceneClocks, type Tick } from "../../layers";
import type { ArtProps } from "../../types";
import { useLoopAction } from "@/features/learn/LensCard";
import { Button } from "@/ui/kit";
import { useMotion } from "@/ui/motion";
import { useTheme } from "@/ui/theme";
import { F, space } from "@/ui/tokens";

const T = {
  LOOP: 36000,
  SHOT: 3800,
  BOARD: [0, 700],
  PENCIL_IN: [200, 900],
  SLOT: [700, 1200],
  WRITE: [900, 2600],
  PENCIL_OUT: [2700, 3400],
  NOTE: [2900, 3500],
} as const;
const WRITE_X = [88, 300] as const;
const WRITE_Y = 216;
const REST = [336, 318] as const;
const WORDS = [{ s: "What's", x: 88, w: 58 }, { s: "stuck?", x: 152, w: 60 }, { s: "5 min", x: 250, w: 50 }];

const pencilPose = (t: Tick) => {
  "worklet";
  const pin = seg(t.shot, T.PENCIL_IN[0], T.PENCIL_IN[1]);
  const pw = clamp01((t.shot - T.WRITE[0]) / (T.WRITE[1] - T.WRITE[0]));
  const pout = seg(t.shot, T.PENCIL_OUT[0], T.PENCIL_OUT[1], "inOut");
  const writing = pw > 0 && pw < 1 ? 1 : 0;
  const x = 420 + (WRITE_X[0] - 420) * pin + (WRITE_X[1] - WRITE_X[0]) * pw + (REST[0] - WRITE_X[1]) * pout;
  const y = 340 + (WRITE_Y - 340) * pin + 1.6 * wave(t.shot, 180) * writing + (REST[1] - WRITE_Y) * pout - 20 * Math.sin(Math.PI * pout);
  return { x, y, r: -8 * (1 - pin) + 8 * pout + 1.5 * wave(t.loop, 5000) * pout };
};
function makeWord(i: number) {
  const w = WORDS[i];
  return (t: Tick) => {
    "worklet";
    const pw = clamp01((t.shot - T.WRITE[0]) / (T.WRITE[1] - T.WRITE[0]));
    const tip = WRITE_X[0] + (WRITE_X[1] - WRITE_X[0]) * pw;
    return { o: clamp01((tip - w.x) / w.w) };
  };
}
const WORD_POSES = WORDS.map((_, i) => makeWord(i));
const notePose = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.NOTE[0], T.NOTE[1]);
  return { o: p, y: 4 * (1 - p) };
};
const loopPose = (t: Tick) => {
  "worklet";
  return { o: seg(t.shot, T.NOTE[0], T.NOTE[1]), r: (t.loop / T.LOOP) * 360 };
};

/** A pencil lying at about 50°, its tip at (0, 0). */
function pencilPoints(len: number, w: number, cone: number) {
  const a = (-50 * Math.PI) / 180;
  const u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
  const at = (l: number, s: number): [number, number] => [u[0] * l + n[0] * s, u[1] * l + n[1] * s];
  return { tip: [at(0, 0), at(cone, w / 2), at(cone, -w / 2)], lead: [at(0, 0), at(cone * 0.4, w * 0.2), at(cone * 0.4, -w * 0.2)], body: [at(cone, w / 2), at(len, w / 2), at(len, -w / 2), at(cone, -w / 2)], end: [at(len, w / 2), at(len + 9, w / 2), at(len + 9, -w / 2), at(len, -w / 2)] };
}

export function MoveScene({ active, reduced, lesson }: ArtProps) {
  const { c: th } = useTheme();
  const m = useMotion();
  const c = useSceneClocks(T.LOOP, T.SHOT, active, reduced);
  const { added, add } = useLoopAction(lesson.lens);
  const a = useArt("s1-01/move", (part, k) => ({
    board: part((p) => {
      p.rect(40, 30, 280, 262, k.surface, { roughness: 1, strokeWidth: 2.2 });
      p.line(40, 70, 320, 70, { stroke: k.soft, strokeWidth: 1, roughness: 0.6 });
      p.text(56, 56, "TEAM MEETING", 11, k.soft, "mono", "start");
      p.text(304, 58, "this week", 19, k.soft, "hand", "end");
      for (const [y, s] of [[112, "Updates"], [160, "Plans"]] as const) {
        p.rect(58, y - 15, 15, 15, null, { roughness: 0.8, strokeWidth: 1.5 });
        p.text(88, y, s, 23, k.ink, "hand", "start");
        p.line(56, y + 12, 304, y + 12, { stroke: k.grid, strokeWidth: 1, roughness: 0.3 });
      }
    }),
    slot: part((p) => {
      p.rect(52, 186, 256, 44, k.pass + "55", { stroke: "none", strokeWidth: 0, roughness: 0.6 });
      dashed(p, 52, 186, 308, 186, k.ink, 6, 4, 1.4);
      dashed(p, 52, 230, 308, 230, k.ink, 6, 4, 1.4);
    }),
    box3: part((p) => p.rect(58, 200, 15, 15, null, { roughness: 0.8, strokeWidth: 1.5 })),
    words: WORDS.map((w, i) => part((p) => p.text(w.x, WRITE_Y, w.s, 25, i === 2 ? k.soft : k.ink, "hand", "start"))),
    note: part((p) => p.text(58, 268, "every week, even when it's empty", 18, k.accent, "hand", "start")),
    loop: part((p) => {
      p.arc(296, 262, 26, 26, 0.3, Math.PI * 1.75, false, null, { stroke: k.accent, strokeWidth: 2, roughness: 0.4 });
      const ex = 296 + 13 * Math.cos(Math.PI * 1.75), ey = 262 + 13 * Math.sin(Math.PI * 1.75);
      p.line(ex, ey, ex - 1, ey - 7, { stroke: k.accent, strokeWidth: 2, roughness: 0.3 });
      p.line(ex, ey, ex + 6, ey - 2, { stroke: k.accent, strokeWidth: 2, roughness: 0.3 });
    }),
    pencil: part((p) => {
      const q = pencilPoints(78, 11, 15);
      p.poly(q.body, k.pass, { roughness: 0.6, strokeWidth: 1.6 });
      p.poly(q.end, k.ppe, { roughness: 0.5, strokeWidth: 1.4 });
      p.poly(q.tip, k.surface, { roughness: 0.4, strokeWidth: 1.4 });
      p.poly(q.lead, k.ink, { roughness: 0.2, strokeWidth: 1 });
    }),
  }));
  return (
    <>
      <StageSvg label="A team meeting plan for this week: updates, plans, and a pencil writing in a highlighted slot that says what's stuck, five minutes. A note says every week, even when it's empty, beside a small loop arrow.">
        <DrawOn c={c} nodes={a.board} from={T.BOARD[0]} to={T.BOARD[1]} share={0.25} />
        <DrawOn c={c} nodes={a.slot} from={T.SLOT[0]} to={T.SLOT[1]} />
        <Still nodes={a.box3} />
        {a.words.map((n, i) => <Layer key={i} c={c} pose={WORD_POSES[i]} nodes={n} />)}
        <Layer c={c} pose={notePose} nodes={a.note} />
        <Layer c={c} pose={loopPose} pivot={[296, 262]} nodes={a.loop} />
        <Layer c={c} pose={pencilPose} nodes={a.pencil} />
      </StageSvg>
      <View style={{ position: "absolute", left: 72, right: 72, bottom: space.m }}>
        {added ? (
          <Animated.View entering={m.fade()} accessibilityLiveRegion="polite" style={{ minHeight: 50, alignItems: "center", justifyContent: "center", gap: 2 }}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: th.good }}>✓ In Your week</Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: th.soft }}>Plan, do, notice, on the You tab</Text>
          </Animated.View>
        ) : (
          <Button label="Add to Your week" kind="primary" haptic="success" onPress={add} accessibilityLabel="Add this action to Your week" />
        )}
      </View>
    </>
  );
}
