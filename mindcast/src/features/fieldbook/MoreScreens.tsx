/** Smaller Field Book screens: add a practice stamp (a sheet), and what is due today. */
import { router, type Href } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { pack } from "@/domain";
import { useStore } from "@/state/store";
import { BackButton, Body, Button, Eyebrow, H1, H2, Screen, Small, tap } from "@/ui/kit";
import { PeekLink } from "@/ui/peek";
import { useTheme } from "@/ui/theme";
import { F, radius, space, TOUCH } from "@/ui/tokens";
import { useDue } from "./hooks";
import { ItemArt } from "./parts";
import { UseIt } from "./UseIt";

/** Pick a stop, then say where you saw its idea. Finished stops come first. */
export function PracticeScreen({ lessonId }: { lessonId?: string }) {
  const { c } = useTheme();
  const completed = useStore((s) => s.progress.completed);
  const lessons = useMemo(() => {
    const all = pack.lessons.filter((l) => l.season === 1).sort((a, b) => a.stop - b.stop);
    const done = all.filter((l) => completed.includes(l.id));
    return done.length ? done : all.slice(0, 5);
  }, [completed]);
  const [sel, setSel] = useState<string | undefined>(lessonId ?? lessons[lessons.length - 1]?.id);
  return (
    <Screen grid={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>Practice stamp</Eyebrow>
        <Button small kind="ghost" label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace("/fieldbook"))} />
      </View>
      <H1 accessibilityRole="header">Use it</H1>
      <Small color={c.soft}>{completed.length ? "Which stop's idea did you notice?" : "Finish a stop to unlock its idea. Here are the first few to try."}</Small>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Stop">
        {lessons.map((l) => {
          const on = l.id === sel;
          return (
            <Pressable key={l.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Stop ${l.stop}: ${l.title}`} onPress={() => { tap(); setSel(l.id); }}
              style={{ minHeight: TOUCH, justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{l.stop}. {l.title}</Text>
            </Pressable>
          );
        })}
      </View>
      {sel && <UseIt key={sel} lessonId={sel} />}
    </Screen>
  );
}

/** Things due for another look today, scheduled from how well you recalled them. */
export function DueScreen() {
  const { c } = useTheme();
  const due = useDue();
  return (
    <Screen>
      <BackButton label="Back" fallback="/" />
      <View style={{ gap: 6 }}>
        <Eyebrow>Due today</Eyebrow>
        <H1 accessibilityRole="header">Worth another look</H1>
        <Small color={c.soft}>Spaced out by how well you remembered each one. Seeing it again, a few days apart, is what makes it stick.</Small>
      </View>
      {due.look.length > 0 && (
        <View style={{ gap: space.s }}>
          <H2>Look for again</H2>
          {due.look.map((e) => (
            <PeekLink key={e.key} href={`/spot/${e.key}` as Href} accessibilityLabel={`${e.name}. ${e.look}`} style={{ flexDirection: "row", gap: space.m, alignItems: "center", paddingVertical: space.s, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <View style={{ width: 96 }}><ItemArt entry={e} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: c.ink }}>{e.name}</Text>
                <Small color={c.soft} numberOfLines={2}>{e.look}</Small>
              </View>
            </PeekLink>
          ))}
        </View>
      )}
      {due.revisit.length > 0 && (
        <View style={{ gap: space.s }}>
          <H2>Stops to revisit</H2>
          {due.revisit.map((l) => (
            <PeekLink key={l.id} href={`/lesson/${l.id}` as Href} accessibilityLabel={`Stop ${l.stop}: ${l.title}. ${l.hook}`} style={{ paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: c.line, gap: 2 }}>
              <Eyebrow>Stop {l.stop}</Eyebrow>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: c.ink }}>{l.title}</Text>
              <Small color={c.soft}>{l.hook}</Small>
            </PeekLink>
          ))}
        </View>
      )}
      {!due.look.length && !due.revisit.length && <Body color={c.soft}>Nothing due today. Things you stamp and stops you finish come back here when they are worth another look.</Body>}
    </Screen>
  );
}
