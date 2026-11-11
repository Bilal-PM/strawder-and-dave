/** Three questions, one at a time, with instant feedback, the `why`, haptics and a score. */
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInRight, useReducedMotion } from "react-native-reanimated";
import type { Quiz as Q } from "@/domain/types";
import { Body, Button, Eyebrow, H2, H3, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { announce } from "./ui";

export function Quiz({ questions, onDone, best }: { questions: Q[]; onDone: (score: number) => void; best?: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const total = questions.length;
  if (!total) return null;

  if (finished) {
    const msg = score === total ? "Full marks." : score === 0 ? "Worth another go: read the why and try again." : "Good. Have another look at the one you missed.";
    return (
      <Animated.View entering={reduce ? undefined : FadeIn.duration(300)} style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.xl, gap: space.m, alignItems: "flex-start" }}>
        <Eyebrow>Quiz score</Eyebrow>
        <Text accessibilityLabel={`${score} out of ${total}`} style={{ fontFamily: F.display, fontSize: 56, lineHeight: 60, color: score === total ? c.good : c.ink, fontVariant: ["tabular-nums"] }}>{score}/{total}</Text>
        <Body color={c.soft}>{msg}{best != null && best > 0 ? ` Your best: ${best}/${total}.` : ""}</Body>
        <Button label="Try the quiz again" kind="ghost" onPress={() => { setI(0); setPicked(null); setScore(0); setFinished(false); }} />
      </Animated.View>
    );
  }

  const q = questions[i];
  const answered = picked !== null;
  const right = picked === q.answer;
  const choose = (k: number) => {
    if (answered) return;
    setPicked(k);
    const ok = k === q.answer;
    if (ok) setScore((s) => s + 1);
    tap(ok ? "success" : "warn");
    announce(`${ok ? "Correct." : `Not quite. The answer is ${q.options[q.answer]}.`} ${q.why}`);
  };
  const next = () => {
    if (i + 1 >= total) { setFinished(true); onDone(score); announce(`Quiz done. ${score} out of ${total}.`); return; }
    setI(i + 1); setPicked(null);
  };

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l, gap: space.m }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>Question {i + 1} of {total}</Eyebrow>
        <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel={`Score so far ${score}`} accessible>
          {questions.map((_, k) => <View key={k} style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: k < i || (k === i && answered) ? c.ink : c.line }} />)}
        </View>
      </View>
      <Animated.View key={i} entering={reduce ? undefined : FadeInRight.duration(260)} style={{ gap: space.m }}>
        <H3>{q.q}</H3>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {q.options.map((o, k) => {
            const isAns = k === q.answer, isPick = k === picked;
            const border = answered ? (isAns ? c.good : isPick ? c.warn : c.line) : c.line;
            const bg = answered && isAns ? c.good + "1A" : answered && isPick ? c.warn + "14" : c.bg;
            return (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: isPick, disabled: answered }} accessibilityLabel={`${o}${answered && isAns ? ", correct answer" : answered && isPick ? ", your answer, incorrect" : ""}`} onPress={() => choose(k)}
                style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.m, borderWidth: 1.5, borderColor: border, backgroundColor: bg, opacity: answered && !isAns && !isPick ? 0.55 : pressed ? 0.85 : 1, transform: [{ scale: pressed && !answered ? 0.99 : 1 }] })}>
                <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: answered && (isAns || isPick) ? border : c.soft, backgroundColor: answered && isAns ? c.good : answered && isPick ? c.warn : "transparent", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 12, color: answered && (isAns || isPick) ? c.bg : c.soft }}>{answered && isAns ? "✓" : answered && isPick ? "✕" : String.fromCharCode(65 + k)}</Text>
                </View>
                <Text style={{ flex: 1, fontFamily: F.body, fontSize: 16, lineHeight: 22, color: c.ink }}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
      {answered && (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(240)} style={{ gap: space.s, borderLeftWidth: 3, borderLeftColor: right ? c.good : c.warn, paddingLeft: 12 }}>
          <H2 color={right ? c.good : c.warn}>{right ? "Yes." : "Not quite."}</H2>
          <Body>{q.why}</Body>
        </Animated.View>
      )}
      {answered && <Button label={i + 1 >= total ? "See my score" : "Next question"} kind="primary" onPress={next} />}
    </View>
  );
}
