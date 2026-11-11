/** The "stop complete" moment: the train pulls in, the stop is stamped, miles gained, next stop open. */
import React, { useEffect } from "react";
import { Modal, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Lesson } from "@/domain/types";
import { useStore } from "@/state/store";
import { Bubble, Button, Eyebrow, H1, Small, usePal } from "@/ui/kit";
import { dur, ease, stagger, useMotion } from "@/ui/motion";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, onColour, radius, space } from "@/ui/tokens";
import { lessonAt, lineCompanion, pick } from "./content";
import { announce } from "./ui";

export type CelebrationData = { lesson: Lesson; miles: number; score: number; total: number; scoreLabel?: string; next?: Lesson; newlyOpen: boolean; who?: string; line?: string };

/**
 * Credit a stop and build its celebration: completeLesson in the store (miles, next stop open), the next
 * stop and the line companion's line. Used by the lesson notes (quiz score) and by illustrated stories
 * (their quick check, which leaves the quiz best untouched).
 */
export function completeStop(lesson: Lesson, r: { score: number; total: number; scoreLabel?: string; quiz?: boolean }): CelebrationData {
  const before = useStore.getState().progress;
  useStore.getState().completeLesson(lesson.id, lesson.stop, r.quiz ? r.score : undefined);
  const after = useStore.getState().progress;
  const next = lessonAt(lesson.season, lesson.stop + 1);
  const comp = lineCompanion(useStore.getState().companions.unlocked);
  return { lesson, miles: after.miles - before.miles, score: r.score, total: r.total, scoreLabel: r.scoreLabel, next, newlyOpen: before.stop < lesson.stop + 1 && after.stop >= lesson.stop + 1, who: comp?.name, line: comp ? pick(comp.lines, lesson.stop) : undefined };
}

/** When the train has pulled in (ms after the modal opens). Later beats key off this. */
const ARRIVE = 150 + dur.glide;

export function Celebration({ data, onDone, onNext }: { data: CelebrationData | null; onDone: () => void; onNext?: (next: Lesson) => void }) {
  const { c } = useTheme();
  const pal = usePal();
  const ins = useSafeAreaInsets();
  const m = useMotion();
  const x = useSharedValue(m.reduce ? 0 : -260);
  const train = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  useEffect(() => {
    if (!data) return;
    x.set(m.reduce ? 0 : -260);
    if (!m.reduce) x.set(withDelay(150, withTiming(0, { duration: dur.glide, easing: ease.out })));
    announce(`Stop ${data.lesson.stop} complete. ${data.miles} miles gained.${data.next && data.newlyOpen ? ` Stop ${data.next.stop}, ${data.next.title}, is now open.` : ""}`);
  }, [data, m.reduce, x]);
  // Beats after the train arrives: stamp, then stats, next stop, companion, buttons.
  const beat = (k: number) => (m.reduce ? 0 : ARRIVE + stagger(k, 90));
  const card = { flex: 1, backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l } as const;
  return (
    <Modal visible={!!data} transparent animationType="none" onRequestClose={onDone} statusBarTranslucent>
      {data && (
        <Animated.View entering={m.scrim()} style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top + space.xl, paddingBottom: ins.bottom + space.xl, paddingHorizontal: space.xl, justifyContent: "center" }}>
          <View style={{ maxWidth: 520, width: "100%", alignSelf: "center", gap: space.l }} accessibilityViewIsModal>
            <Animated.View entering={m.rise(0)}><Eyebrow color={c.good}>Stop {data.lesson.stop} complete</Eyebrow></Animated.View>
            <Animated.View entering={m.rise(1)}><H1>{data.lesson.title}</H1></Animated.View>
            <Animated.View entering={m.rise(2)} style={{ overflow: "hidden", borderRadius: radius.l, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
              <Sketch w={340} h={120} pal={pal} deps={[c.ink]} paint={(p) => {
                for (let xx = 6; xx < 340; xx += 16) p.line(xx, 96, xx, 108, { stroke: c.soft, strokeWidth: 4, roughness: 0.3 });
                p.line(0, 98, 340, 98, { strokeWidth: 2.5, roughness: 0.4 });
                p.line(0, 106, 340, 106, { strokeWidth: 2.5, roughness: 0.4 });
                p.rect(250, 40, 70, 40, c.sunk, { strokeWidth: 2 });
                p.poly([[244, 40], [285, 18], [326, 40]], c.surface, { strokeWidth: 2 });
              }} />
              <Animated.View style={[{ position: "absolute", left: "8%", bottom: "14%", width: "46%" }, train]}>
                <Sketch w={160} h={60} pal={pal} deps={[c.ink]} paint={(p) => {
                  p.rect(6, 10, 140, 36, c.surface, { strokeWidth: 2.2 });
                  p.rect(118, 16, 22, 14, c.pass, { strokeWidth: 1.4 });
                  for (const wx of [20, 44, 6 + 140 - 40, 6 + 140 - 16]) p.circle(wx, 50, 14, c.ink, { roughness: 0.3 });
                  p.rect(18, 18, 22, 12, pal.glass, { strokeWidth: 1.2 }); p.rect(48, 18, 22, 12, pal.glass, { strokeWidth: 1.2 }); p.rect(78, 18, 22, 12, pal.glass, { strokeWidth: 1.2 });
                }} />
              </Animated.View>
              {/* The station is stamped done once the train is in. */}
              <Animated.View entering={m.pop(beat(0))} style={{ position: "absolute", right: "6%", top: "6%", width: "17%", aspectRatio: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Sketch w={60} h={60} pal={pal} deps={[c.good]} paint={(p) => {
                  p.circle(30, 30, 50, c.good, { stroke: c.good, strokeWidth: 2, roughness: 0.7 });
                  p.linear([[18, 31], [27, 40], [43, 21]], { stroke: onColour(c.good), strokeWidth: 4.5, roughness: 0.4 });
                }} />
              </Animated.View>
            </Animated.View>
            <View style={{ flexDirection: "row", gap: space.m }}>
              <Animated.View entering={m.rise(0, beat(1))} style={card}>
                <Text style={{ fontFamily: F.display, fontSize: 36, color: c.ink, fontVariant: ["tabular-nums"] }}>+{data.miles}</Text>
                <Small color={c.soft}>miles on the line</Small>
              </Animated.View>
              <Animated.View entering={m.rise(0, beat(2))} style={card}>
                <Text style={{ fontFamily: F.display, fontSize: 36, color: data.score === data.total ? c.good : c.ink, fontVariant: ["tabular-nums"] }}>{data.score}/{data.total}</Text>
                <Small color={c.soft}>{data.scoreLabel ?? "quiz score"}</Small>
              </Animated.View>
            </View>
            {data.next && (
              <Animated.View entering={m.rise(0, beat(3))} style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, borderLeftWidth: 5, borderLeftColor: c.accent, padding: space.l, gap: 2 }}>
                <Eyebrow color={c.accent}>{data.newlyOpen ? "Next stop open" : "Next stop"}</Eyebrow>
                <Text style={{ fontFamily: F.displaySemi, fontSize: 19, lineHeight: 24, color: c.ink }}>Stop {data.next.stop}: {data.next.title}</Text>
              </Animated.View>
            )}
            {data.who && data.line && <Animated.View entering={m.rise(0, beat(4))}><Bubble who={data.who} text={data.line} /></Animated.View>}
            <Animated.View entering={m.rise(0, beat(5))} style={{ gap: space.s }}>
              {data.next && onNext ? (
                <>
                  <Button label={`Go to stop ${data.next.stop}`} kind="primary" onPress={() => onNext(data.next!)} />
                  <Button label="Back to the Line" kind="ghost" onPress={onDone} />
                </>
              ) : (
                <Button label="Back to the Line" kind="primary" onPress={onDone} />
              )}
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </Modal>
  );
}
