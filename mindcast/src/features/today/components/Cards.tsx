/** Smaller Today cards: the greeting (with the noticing ring) and the next stop. */
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { pack } from "@/domain";
import { useFieldBook } from "@/features/fieldbook/hooks";
import { NoticingRing } from "@/features/fieldbook/parts";
import { useStore } from "@/state/store";
import { Body, Button, Card, Eyebrow, H1, H3, Row } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, space } from "@/ui/tokens";
import { go } from "./bits";

const hello = (h: number) => (h < 5 ? "Hello" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

export function Greeting() {
  const fb = useFieldBook();
  const name = useStore((s) => s.profile.name.trim());
  const { c } = useTheme();
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <View style={{ gap: space.m }}>
      <View style={{ gap: space.xs }}>
        <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: c.soft }}>{date}</Text>
        <H1 accessibilityRole="header">{hello(now.getHours())}{name ? `, ${name}` : ""}.</H1>
      </View>
      <NoticingRing strength={fb.strength} noticed={fb.noticedWeek} target={fb.target} week={fb.week} size={64} />
    </View>
  );
}

export function NextStopCard() {
  const { c } = useTheme();
  const { season, stop, completed } = useStore((s) => s.progress);
  const lesson = useMemo(() => {
    const inSeason = pack.lessons.filter((l) => l.season === season).sort((a, b) => a.stop - b.stop);
    return inSeason.find((l) => l.stop === stop && !completed.includes(l.id)) ?? inSeason.find((l) => !completed.includes(l.id)) ?? pack.lessons.find((l) => !completed.includes(l.id));
  }, [season, stop, completed]);
  const s = pack.seasons.find((x) => x.n === (lesson?.season ?? season));
  if (!lesson) {
    return (
      <Card tone="pass">
        <Eyebrow>Next stop</Eyebrow>
        <H3>{pack.lessons.length ? "You have finished every stop so far." : "Lessons are on their way."}</H3>
        <Body color={c.soft}>{pack.lessons.length ? "New stops arrive with each season. Try a Mindcast in the meantime." : "Check back soon."}</Body>
      </Card>
    );
  }
  return (
    <Card primary onPress={() => go(`/lesson/${lesson.id}`)} accessibilityLabel={`Next stop: stop ${lesson.stop}, ${lesson.title}. ${lesson.hook}`}>
      <Eyebrow>Next stop{s ? ` · Season ${s.n}: ${s.title}` : ""}</Eyebrow>
      <Row gap={space.m} style={{ alignItems: "flex-start" }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: c.ink, alignItems: "center", justifyContent: "center", backgroundColor: c.pass }}>
          <Text style={{ fontFamily: F.display, fontSize: 22, color: "#1B1F24" }}>{lesson.stop}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <H3>{lesson.title}</H3>
          <Body color={c.soft}>{lesson.hook}</Body>
        </View>
      </Row>
      <Button kind="primary" label={completed.length ? "Carry on" : "Start the first stop"} onPress={() => go(`/lesson/${lesson.id}`)} accessibilityLabel={`Open stop ${lesson.stop}, ${lesson.title}`} />
    </Card>
  );
}
