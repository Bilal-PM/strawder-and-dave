/** The "stop complete" moment: miles gained, next stop open, a companion line. */
import React, { useEffect } from "react";
import { Modal, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Lesson } from "@/domain/types";
import { Bubble, Button, Eyebrow, H1, Small, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { announce } from "./ui";

export type CelebrationData = { lesson: Lesson; miles: number; score: number; total: number; next?: Lesson; newlyOpen: boolean; who?: string; line?: string };

export function Celebration({ data, onDone }: { data: CelebrationData | null; onDone: () => void }) {
  const { c } = useTheme();
  const pal = usePal();
  const ins = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const x = useSharedValue(reduce ? 0 : -260);
  const train = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  useEffect(() => {
    if (!data) return;
    x.set(reduce ? 0 : -260);
    if (!reduce) x.set(withDelay(150, withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) })));
    announce(`Stop ${data.lesson.stop} complete. ${data.miles} miles gained.${data.next && data.newlyOpen ? ` Stop ${data.next.stop}, ${data.next.title}, is now open.` : ""}`);
  }, [data, reduce, x]);
  const enter = (d: number) => (reduce ? undefined : FadeInDown.duration(380).delay(d));
  return (
    <Modal visible={!!data} transparent animationType="none" onRequestClose={onDone} statusBarTranslucent>
      {data && (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(220)} style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top + space.xl, paddingBottom: ins.bottom + space.xl, paddingHorizontal: space.xl, justifyContent: "center" }}>
          <View style={{ maxWidth: 520, width: "100%", alignSelf: "center", gap: space.l }} accessibilityViewIsModal>
            <Animated.View entering={enter(0)}><Eyebrow color={c.good}>Stop {data.lesson.stop} complete</Eyebrow></Animated.View>
            <Animated.View entering={enter(80)}><H1>{data.lesson.title}</H1></Animated.View>
            <View style={{ overflow: "hidden", borderRadius: radius.l, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
              <Sketch w={340} h={120} pal={pal} deps={[c.ink]} paint={(p) => {
                for (let xx = 6; xx < 340; xx += 16) p.line(xx, 96, xx, 108, { stroke: c.soft, strokeWidth: 4, roughness: 0.3 });
                p.line(0, 98, 340, 98, { strokeWidth: 2.5, roughness: 0.4 });
                p.line(0, 106, 340, 106, { strokeWidth: 2.5, roughness: 0.4 });
                p.rect(250, 40, 70, 40, c.sunk, { strokeWidth: 2 });
                p.poly([[244, 40], [285, 18], [326, 40]], c.surface, { strokeWidth: 2 });
                p.line(300, 6, 300, 36, { strokeWidth: 2 });
                p.poly([[300, 6], [326, 12], [300, 18]], c.good, { strokeWidth: 1.4 });
              }} />
              <Animated.View style={[{ position: "absolute", left: "8%", bottom: "14%", width: "46%" }, train]}>
                <Sketch w={160} h={60} pal={pal} deps={[c.ink]} paint={(p) => {
                  p.rect(6, 10, 140, 36, c.surface, { strokeWidth: 2.2 });
                  p.rect(118, 16, 22, 14, c.pass, { strokeWidth: 1.4 });
                  for (const wx of [20, 44, 6 + 140 - 40, 6 + 140 - 16]) p.circle(wx, 50, 14, c.ink, { roughness: 0.3 });
                  p.rect(18, 18, 22, 12, pal.glass, { strokeWidth: 1.2 }); p.rect(48, 18, 22, 12, pal.glass, { strokeWidth: 1.2 }); p.rect(78, 18, 22, 12, pal.glass, { strokeWidth: 1.2 });
                }} />
              </Animated.View>
            </View>
            <Animated.View entering={reduce ? undefined : ZoomIn.duration(420).delay(500)} style={{ flexDirection: "row", gap: space.m }}>
              <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l }}>
                <Text style={{ fontFamily: F.display, fontSize: 36, color: c.ink, fontVariant: ["tabular-nums"] }}>+{data.miles}</Text>
                <Small color={c.soft}>miles on the line</Small>
              </View>
              <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l }}>
                <Text style={{ fontFamily: F.display, fontSize: 36, color: data.score === data.total ? c.good : c.ink, fontVariant: ["tabular-nums"] }}>{data.score}/{data.total}</Text>
                <Small color={c.soft}>quiz score</Small>
              </View>
            </Animated.View>
            {data.next && (
              <Animated.View entering={enter(650)} style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, borderLeftWidth: 5, borderLeftColor: c.accent, padding: space.l, gap: 2 }}>
                <Eyebrow color={c.accent}>{data.newlyOpen ? "Next stop open" : "Next stop"}</Eyebrow>
                <Text style={{ fontFamily: F.displaySemi, fontSize: 19, color: c.ink }}>Stop {data.next.stop}: {data.next.title}</Text>
              </Animated.View>
            )}
            {data.who && data.line && <Animated.View entering={enter(800)}><Bubble who={data.who} text={data.line} /></Animated.View>}
            <Animated.View entering={enter(900)}><Button label="Back to the Line" kind="primary" onPress={onDone} /></Animated.View>
          </View>
        </Animated.View>
      )}
    </Modal>
  );
}
