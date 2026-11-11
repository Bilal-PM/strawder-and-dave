/**
 * Scene 9 · Quick check. A hot afternoon over jointed track. The learner taps the drawing where the steel has
 * room to expand. Right: a ring draws round the joint gap and it is lettered. Elsewhere: a soft ring where they
 * tapped and a hint; after two misses the answer is shown. Then they finish the stop (it is credited exactly
 * as the lesson notes credit it). Finding the gap on any try counts; nothing is lost for a miss. Three labelled touch targets make the check work with a screen reader.
 * Idle: the sun's rays turn and heat shimmers over the rail.
 */
import React, { useState } from "react";
import { Pressable, View, type GestureResponderEvent } from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { bell, loop, wave } from "../../living";
import { fishplate, railSide, sleeperEnd, stipple, stoneInk, sunDisc, sunRays } from "../../art";
import { DrawOn, Layer, StageSvg, Still, unitRect, useArt, useStage, type Clocks, type Tick, useSceneClocks } from "../../layers";
import type { ArtProps } from "../../types";
import { announce } from "@/features/learn/ui";
import { Button, tap } from "@/ui/kit";
import { space } from "@/ui/tokens";

const T = { LOOP: 36000, RING_MS: 520 } as const;
const RAIL = { y: 232, h: 34 };
const GAP = 238;
const SUN = { x: 296, y: 92, r: 28 };
const SLEEPERS = [24, 96, 168, 300];
/** The three answers a screen reader offers, and the hit areas for a finger (drawing units). */
const SPOTS = [
  { id: "gap", label: "The gap where two rails meet", x: GAP - 26, y: RAIL.y - 26, w: 52, h: RAIL.h + 52, right: true },
  { id: "rail", label: "The middle of a rail", x: 70, y: RAIL.y - 14, w: 90, h: RAIL.h + 28, right: false },
  { id: "sleeper", label: "A sleeper under the rail", x: SLEEPERS[2] - 8, y: RAIL.y + RAIL.h, w: 60, h: 44, right: false },
] as const;

const raysPose = (t: Tick) => {
  "worklet";
  return { r: (t.loop / T.LOOP) * 360 };
};
function makeWisp(i: number) {
  const x0 = [70, 150, 330][i], period = [2400, 3000, 2000][i];
  return (t: Tick) => {
    "worklet";
    const p = loop(t.loop, period, i * 0.33);
    return { x: x0 + 1.5 * wave(t.loop, 1200, i * 0.2), y: RAIL.y - 8 - 12 * p, o: bell(p) };
  };
}
const WISPS = [0, 1, 2].map(makeWisp);

type Answer = { kind: "right" | "wrong" | "shown"; x: number; y: number };

export function CheckScene({ active, reduced, api }: ArtProps) {
  const c = useSceneClocks(T.LOOP, 1, active, reduced);
  const box = useStage();
  const ring = useSharedValue(0);
  const ringClocks: Clocks = { loop: c.loop, shot: ring, x: c.x };
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [misses, setMisses] = useState(0);
  const done = answer?.kind === "right" || answer?.kind === "shown";

  const a = useArt("s1-01/check", (part, k, dark) => {
    const sl: [number, number, number, number][] = SLEEPERS.map((x) => [x, RAIL.y + RAIL.h, 48, 30]);
    return {
      sky: part((p) => {
        p.curve([[-10, 184], [80, 176], [170, 182], [260, 172], [370, 180]], { stroke: k.line, strokeWidth: 1.6, roughness: 0.8 });
        p.text(16, 48, "A HOT AFTERNOON", 10, k.soft, "mono", "start");
      }),
      sun: part((p) => sunDisc(p, SUN.x, SUN.y, SUN.r, k)),
      rays: part((p) => sunRays(p, SUN.x, SUN.y, SUN.r, k)),
      track: part((p) => {
        stipple(p, 6, RAIL.y + RAIL.h + 4, 348, 60, stoneInk(k, dark), 71, 0.07, sl);
        for (const s of sl) sleeperEnd(p, s[0], s[1], s[2], s[3], k);
        railSide(p, -10, GAP - 3, RAIL.y, RAIL.h, k);
        railSide(p, GAP + 3, 370, RAIL.y, RAIL.h, k);
        fishplate(p, GAP - 40, GAP + 40, RAIL.y + 11, 14, [GAP - 28, GAP - 12, GAP + 12, GAP + 28], k, 3.6);
      }),
      wisp: part((p) => p.curve([[0, 0], [3, -5], [-2, -10], [2, -15], [0, -19]], { stroke: k.ppe, strokeWidth: 1.5, roughness: 0.3 })),
      ringGood: part((p) => p.ellipse(0, 0, 70, 84, null, { stroke: k.good, strokeWidth: 3, roughness: 1.1 })),
      ringSoft: part((p) => p.ellipse(0, 0, 44, 44, null, { stroke: k.soft, strokeWidth: 2.2, roughness: 1.1 })),
    };
  });

  const playRing = () => {
    ring.value = 0;
    ring.value = reduced ? T.RING_MS : withTiming(T.RING_MS, { duration: T.RING_MS });
  };
  const choose = (id: string, x: number, y: number) => {
    if (done) return;
    if (id === "gap") {
      tap("success");
      setAnswer({ kind: "right", x: GAP, y: RAIL.y + RAIL.h / 2 });
      announce("Yes. The gap at the joint gives the steel room to expand.");
    } else {
      tap("warn");
      const n = misses + 1;
      setMisses(n);
      if (n >= 2) { setAnswer({ kind: "shown", x: GAP, y: RAIL.y + RAIL.h / 2 }); announce("Here it is: the gap at the joint, where two rails meet."); }
      else { setAnswer({ kind: "wrong", x, y }); announce("Not there. The steel is held there. Try where two rails meet."); }
    }
    playRing();
  };
  const onTapDrawing = (e: GestureResponderEvent) => {
    const xU = (e.nativeEvent.locationX - box.ox) / box.s;
    const yU = (e.nativeEvent.locationY - box.oy) / box.s;
    const hit = SPOTS.find((s) => xU >= s.x && xU <= s.x + s.w && yU >= s.y && yU <= s.y + s.h);
    choose(hit ? hit.id : "elsewhere", xU, yU);
  };
  const say = !answer ? null : answer.kind === "right" ? "yes: room to expand" : answer.kind === "shown" ? "here: the gap at the joint" : "held here. Try where two rails meet";
  const sayColor = answer?.kind === "wrong" ? "soft" : "good";

  return (
    <>
      <StageSvg label={`A hot afternoon over jointed track: two rails meet at a joint with a fishplate, on sleepers in ballast. ${say ? `Marked: ${say}.` : "Tap where the steel has room to expand."}`}>
        <Still nodes={a.sky} />
        <Layer c={c} pose={raysPose} pivot={[SUN.x, SUN.y]} nodes={a.rays} />
        <Still nodes={a.sun} />
        <Still nodes={a.track} />
        {WISPS.map((w, i) => <Layer key={i} c={c} pose={w} nodes={a.wisp} />)}
        {answer && (
          <Layer key={`${answer.kind}-${misses}`} c={c} pose={at(answer.x, answer.y)}>
            <DrawOn c={ringClocks} nodes={answer.kind === "wrong" ? a.ringSoft : a.ringGood} from={0} to={T.RING_MS} />
          </Layer>
        )}
        {say && <Label key={say} c={ringClocks} x={Math.max(140, Math.min(230, answer!.x))} y={RAIL.y - 52} text={say} color={sayColor} />}
      </StageSvg>
      {!done && (
        <Pressable accessible={false} onPress={onTapDrawing} style={{ position: "absolute", left: 64, right: 64, top: 0, bottom: 90 }} />
      )}
      {!done && SPOTS.map((s) => (
        <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.label} onPress={() => choose(s.id, s.x + s.w / 2, s.y + s.h / 2)} style={unitRect(box, s.x, s.y, s.w, s.h)} />
      ))}
      {done && (
        <View style={{ position: "absolute", left: 72, right: 72, bottom: space.m, gap: space.s }}>
          <Button label="Finish stop" kind="primary" haptic="success" onPress={() => api.finish(answer?.kind === "right" ? 1 : 0, 1)} accessibilityLabel="Finish this stop" />
        </View>
      )}
    </>
  );
}

const at = (x: number, y: number) => (_t: Tick) => {
  "worklet";
  return { x, y };
};

/** A hand-lettered feedback line that rises in with the ring. */
function Label({ c, x, y, text, color }: { c: Clocks; x: number; y: number; text: string; color: "good" | "soft" }) {
  const a = useArt(`s1-01/check-label/${text}/${Math.round(x)}/${Math.round(y)}`, (part, k) => ({ t: part((p) => p.text(x, y, text, 22, color === "good" ? k.good : k.soft, "hand")) }));
  return <Layer c={c} pose={LABEL_POSE} nodes={a.t} />;
}
const LABEL_POSE = (t: Tick) => {
  "worklet";
  const p = Math.min(1, Math.max(0, (t.shot - 200) / 320));
  return { o: p, y: 4 * (1 - p) };
};
