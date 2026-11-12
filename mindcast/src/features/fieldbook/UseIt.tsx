/**
 * <UseIt lessonId /> : "Where did you see this today?"
 * A short note earns a practice stamp. Practitioners see the lesson's principle and its action as the prompt;
 * Explorers get a home or school version. A note can become a Mindcast draft (not for Explorers).
 */
import { router } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { lessonById, pack } from "@/domain";
import { useStore } from "@/state/store";
import { BodyB, Button, Eyebrow, Row, Small, tap } from "@/ui/kit";
import { useMotion } from "@/ui/motion";
import { RuledInput } from "@/ui/Ruled";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { practicePrompt, type PracticeStamp } from "./logic";
import { PracticeMark } from "./Stamp";

/** Open the Mindcast composer prefilled from a practice stamp. */
export const castFromPractice = (p: Pick<PracticeStamp, "lessonId" | "text">) =>
  router.push({ pathname: "/cast/new", params: { ...(p.lessonId ? { topic: p.lessonId } : {}), note: p.text } });

export function UseIt({ lessonId, onStamped }: { lessonId: string; onStamped?: (p: PracticeStamp) => void }) {
  const { c } = useTheme();
  const m = useMotion();
  const kid = useStore((s) => s.profile.audience === "explorer");
  const lesson = lessonById(lessonId);
  const [text, setText] = useState("");
  const [done, setDone] = useState<PracticeStamp | null>(null);
  if (!lesson) return null;
  const { prompt, hint, example } = practicePrompt(lesson, kid, pack.spots.practice) as { prompt: string; hint: string; example?: string };
  const save = () => {
    const p = useStore.getState().stampPractice(lessonId, text, { from: "use-it" });
    if (!p) return;
    tap("success");
    setDone(p);
    onStamped?.(p);
  };
  if (done) {
    return (
      <Animated.View entering={m.pop()} style={{ gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: c.sunk }} accessibilityLiveRegion="polite">
        <Row gap={space.m}>
          <PracticeMark k={done.id} day={done.day} size={78} />
          <View style={{ flex: 1, gap: 2 }}>
            <BodyB>Practice stamp in your book.</BodyB>
            <Small color={c.soft}>It counts as a noticing day this week.</Small>
          </View>
        </Row>
        <Text style={{ fontFamily: F.hand, fontSize: 22, lineHeight: 24, color: c.ink }}>{done.text}</Text>
        <Row gap={space.s} wrap>
          {!kid && <Button small kind="primary" label="Turn it into a Mindcast" onPress={() => castFromPractice(done)} />}
          <Button small kind="ghost" label="Add another" onPress={() => { setDone(null); setText(""); }} />
        </Row>
      </Animated.View>
    );
  }
  return (
    <View style={{ gap: space.s }}>
      <Eyebrow color={c.good}>Use it</Eyebrow>
      <Text style={{ fontFamily: F.displaySemi, fontSize: 19, lineHeight: 24, color: c.ink }}>{prompt}</Text>
      <Small color={c.soft}>{hint}</Small>
      {example && <Small color={c.soft}>Try this week: {example}</Small>}
      <RuledInput accessibilityLabel={prompt} value={text} onChangeText={setText} lines={3} maxLength={600} placeholder={kid ? "What did you see?" : "At work, at home, on the way in..."} />
      <Button kind="primary" haptic="light" label="Stamp it" disabled={!text.trim()} onPress={save} accessibilityLabel="Save this and earn a practice stamp" />
    </View>
  );
}
