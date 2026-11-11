/** The lesson player: hook, diagram, text at three depths, key facts, quiz, Mindcast lens, finish. */
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Audience, Lesson } from "@/domain/types";
import { useStore } from "@/state/store";
import { BackButton, Body, Button, EmptyState, Eyebrow, H1, Note, Screen, Small, tap } from "@/ui/kit";
import { useMotion } from "@/ui/motion";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { Celebration, type CelebrationData } from "./Celebration";
import { lessonAt, lessonGlossary, lineCompanion, pick, seasonInfo, STOPS } from "./content";
import { Diagram } from "./diagrams";
import { LessonPlate } from "./Plate";
import { GlossaryText, useTermSheet } from "./GlossaryText";
import { LensCard } from "./LensCard";
import { Quiz } from "./Quiz";
import { Pills, SourceChips, useEnter } from "./ui";

const AUDIENCES: { value: Audience; label: string; note: string }[] = [
  { value: "explorer", label: "Explorer", note: "Short and simple, for younger learners." },
  { value: "starter", label: "Starter", note: "The full picture in plain English." },
  { value: "leader", label: "Leader", note: "What it means when you run the work." },
];

function Section({ label, children, delay = 0 }: { label: string; children: React.ReactNode; delay?: number }) {
  const enter = useEnter(delay);
  return (
    <Animated.View entering={enter} style={{ gap: space.m, marginTop: space.l }}>
      <Eyebrow>{label}</Eyebrow>
      {children}
    </Animated.View>
  );
}

/** Back to wherever the learner came from (usually the Line). */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/line");
}

export function LessonScreen({ lesson }: { lesson: Lesson }) {
  const { c } = useTheme();
  const m = useMotion();
  const profileAudience = useStore((s) => s.profile.audience);
  const best = useStore((s) => s.progress.quizBest[lesson.id]);
  const completed = useStore((s) => s.progress.completed.includes(lesson.id));
  const [aud, setAud] = useState<Audience>(profileAudience ?? "starter");
  const [score, setScore] = useState<number | null>(null);
  const [cele, setCele] = useState<CelebrationData | null>(null);
  const terms = useMemo(() => lessonGlossary(lesson), [lesson]);
  const { open: openTerm, sheet } = useTermSheet();
  const season = seasonInfo(lesson.season);
  const total = lesson.quiz.length;
  const hookEnter = useEnter(60);
  const [grownUp, setGrownUp] = useState(false);

  const finish = () => {
    const s = score ?? 0;
    const before = useStore.getState().progress;
    useStore.getState().completeLesson(lesson.id, lesson.stop, s);
    const after = useStore.getState().progress;
    const next = lessonAt(lesson.season, lesson.stop + 1);
    const comp = lineCompanion(useStore.getState().companions.unlocked);
    setCele({ lesson, miles: after.miles - before.miles, score: s, total, next, newlyOpen: before.stop < lesson.stop + 1 && after.stop >= lesson.stop + 1, who: comp?.name, line: comp ? pick(comp.lines, lesson.stop) : undefined });
  };

  const depthText = aud === "explorer" ? [lesson.explorer] : aud === "leader" ? [lesson.leader] : lesson.starter;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <BackButton label="Line" onPress={goBack} />
          <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1, color: c.soft }}>STOP {lesson.stop} OF {STOPS}{completed ? " · DONE" : ""}</Text>
        </View>

        <View style={{ gap: 6, marginTop: space.s }}>
          <Eyebrow>Season {lesson.season}{season ? ` · ${season.title}` : ""}</Eyebrow>
          <H1 accessibilityRole="header">{lesson.title}</H1>
        </View>

        <View style={{ gap: 6 }}>
          <Pills label="Choose your depth" value={aud} onChange={setAud} options={AUDIENCES.map((a) => ({ value: a.value, label: a.label }))} />
          <Small color={c.soft}>{AUDIENCES.find((a) => a.value === aud)!.note}</Small>
        </View>

        {/* The hook */}
        <Animated.View entering={hookEnter} style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.xl, gap: space.s, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: 14, top: 6 }} pointerEvents="none">
            <Text style={{ fontFamily: F.hand, fontSize: 96, lineHeight: 110, color: c.pass, opacity: 0.6 }}>?</Text>
          </View>
          <Eyebrow>The question</Eyebrow>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.4, color: c.ink, paddingRight: 36 }}>{lesson.hook}</Text>
        </Animated.View>

        <Section label="See it work" delay={120}>
          <Diagram lesson={lesson} />
          <LessonPlate lessonId={lesson.id} />
        </Section>

        <Section label={aud === "explorer" ? "The simple version" : aud === "leader" ? "For leaders" : "How it works"}>
          <Animated.View key={aud} entering={m.fade()} style={{ gap: space.m }}>
            {depthText.map((t, i) => <GlossaryText key={i} text={t} terms={terms} onTerm={openTerm} size={aud === "explorer" ? "big" : "body"} />)}
          </Animated.View>
          {terms.length > 0 && (
            <View style={{ gap: 8, marginTop: space.s }}>
              <Small color={c.soft}>Words in this stop. Tap for a plain meaning.</Small>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[...terms].sort((a, b) => a.term.localeCompare(b.term)).map((g) => (
                  <Pressable key={g.term} accessibilityRole="button" accessibilityLabel={`${g.term}: what it means`} onPress={() => { tap(); openTerm(g); }}
                    style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, backgroundColor: pressed ? c.sunk : c.surface })}>
                    <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: c.ink, textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: c.accent }}>{g.term}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </Section>

        {lesson.keyFacts.length > 0 && (
          <Section label="Key facts">
            <View style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.l }}>
              {lesson.keyFacts.map((f, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12, paddingVertical: space.l, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <Text style={{ fontFamily: F.display, fontSize: 18, color: c.accent, width: 20, fontVariant: ["tabular-nums"] }}>{i + 1}</Text>
                  <View style={{ flex: 1, gap: 8 }}>
                    <Body>{f.text}</Body>
                    <SourceChips sources={f.sources} />
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section label="Check yourself">
          <Quiz questions={lesson.quiz} best={best} onDone={(s) => setScore(s)} />
        </Section>

        {aud === "explorer" ? (
          <Section label="For grown-ups">
            {grownUp ? <LensCard lens={lesson.lens} /> : (
              <View style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l, gap: space.m }}>
                <Body color={c.soft}>There is a part of this stop for grown-ups: what it teaches about leading people at work.</Body>
                <Button label="Show the grown-up part" onPress={() => setGrownUp(true)} />
              </View>
            )}
          </Section>
        ) : (
          <Section label="Carry it into your work">
            <LensCard lens={lesson.lens} />
          </Section>
        )}

        {lesson.action && lesson.action !== lesson.lens.action && (
          <Section label="Try this week">
            <View style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l }}>
              <Body>{lesson.action}</Body>
            </View>
          </Section>
        )}

        <View style={{ gap: space.s, marginTop: space.xl }}>
          <Button label={completed ? "Finish stop again" : "Finish stop"} kind="primary" haptic="success" disabled={score === null} onPress={finish} accessibilityLabel={score === null ? "Finish stop. Answer the quiz first." : "Finish stop"} />
          {score === null && <Small color={c.soft} center>Answer the {total === 3 ? "three" : total} questions above to finish this stop.</Small>}
        </View>

        <View style={{ marginTop: space.l }}>
          <Note title="About the figures">{"Figures and limits differ from railway to railway. Groundwork explains the principle; at work, always follow your own railway's standards."}</Note>
        </View>
      </Screen>
      {sheet}
      <Celebration data={cele} onDone={() => { setCele(null); router.navigate("/line"); }} onNext={(next) => { setCele(null); router.replace({ pathname: "/lesson/[id]", params: { id: next.id } }); }} />
    </View>
  );
}

export function LessonMissing() {
  return (
    <Screen>
      <BackButton label="Line" onPress={goBack} />
      <EmptyState eyebrow="Not found" title="This stop isn't on the line yet" body="It may still be being written. Head back and pick another stop." action="Back to the Line" onAction={() => router.replace("/line")} />
    </Screen>
  );
}
