/** Smaller Today cards: greeting, next stop, Open Line, featured Mindcast and the Explore teaser. */
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { pack } from "@/domain";
import { project, GB_PATHS } from "@/features/explore/gbmap";
import { CATS } from "@/features/explore/places";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Card, Chip, Eyebrow, H1, H3, Hand, Row, Small, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, space } from "@/ui/tokens";
import { go } from "./bits";

const hello = (h: number) => (h < 5 ? "Hello" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

export function Greeting() {
  const { c } = useTheme();
  const name = useStore((s) => s.profile.name.trim());
  const { streak, miles, completed } = useStore((s) => s.progress);
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <View style={{ gap: space.s }}>
      <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: c.soft }}>{date}</Text>
      <H1 accessibilityRole="header">{hello(now.getHours())}{name ? `, ${name}` : ""}.</H1>
      <View accessible accessibilityLabel={`${streak} day streak. ${miles} miles. ${completed.length} stops done.`}>
      <Row wrap gap={8}>
        <Chip label={streak === 1 ? "1 day streak" : `${streak} day streak`} color={streak > 0 ? c.ppe : c.soft} filled={streak > 1} />
        <Chip label={`${miles} miles`} color={c.accent} />
        <Chip label={`${completed.length} stops done`} color={c.good} />
      </Row>
      </View>
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
    <Card tone="pass" onPress={() => go(`/lesson/${lesson.id}`)} accessibilityLabel={`Next stop: stop ${lesson.stop}, ${lesson.title}. ${lesson.hook}`}>
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

export function OpenLineCard() {
  const { c } = useTheme();
  const pal = usePal();
  return (
    <Card onPress={() => go("/world")} accessibilityLabel="Open Line. A loop of railway in 3D to ride and explore.">
      <Row gap={space.m}>
        <View style={{ width: 96 }}>
          <Sketch w={120} h={80} pal={pal} deps={[c.accent]} paint={(p) => {
            p.line(4, 70, 116, 54, { strokeWidth: 2.5 });
            p.line(4, 78, 116, 62, { strokeWidth: 2.5 });
            for (let x = 10; x < 116; x += 12) p.line(x, 66 - x * 0.14, x + 4, 80 - x * 0.14, { stroke: c.soft, strokeWidth: 1.4 });
            p.line(86, 50, 86, 14, { strokeWidth: 2.5 });
            p.rect(78, 8, 16, 26, c.ink);
            p.circle(86, 16, 8, c.good);
            p.circle(30, 22, 18, c.pass);
          }} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>Open Line</Eyebrow>
          <H3>Step onto the railway</H3>
          <Small color={c.soft}>A loop of railway in 3D to ride and explore, from the signal box to the viaduct.</Small>
        </View>
      </Row>
    </Card>
  );
}

export function FeaturedCast() {
  const { c } = useTheme();
  const cast = useMemo(() => {
    const list = pack.casts ?? [];
    if (!list.length) return null;
    const d = new Date();
    const doy = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    return list[doy % list.length];
  }, []);
  if (!cast) return null;
  return (
    <Card onPress={() => go(`/cast/${cast.id}`)} accessibilityLabel={`Featured Mindcast: ${cast.title}. ${cast.principle}`}>
      <Eyebrow color={c.accent}>{"Today's Mindcast"}</Eyebrow>
      <H3>{cast.title}</H3>
      <Hand color={c.accent}>{cast.principle}</Hand>
      <Small color={c.soft} numberOfLines={3}>{cast.observe}</Small>
      <BodyB color={c.accent}>Read the Mindcast ›</BodyB>
    </Card>
  );
}

export function ExploreTeaser() {
  const { c } = useTheme();
  const pal = usePal();
  const stamped = useStore((s) => s.passport.length);
  const places = pack.places ?? [];
  const pins = useMemo(() => places.map((p) => ({ xy: project(p.lat, p.lon), col: CATS[p.category]?.colour(c) ?? c.accent })), [places, c]);
  return (
    <Card onPress={() => go("/explore")} accessibilityLabel={`Explore by train. ${places.length} great places to reach by train. ${stamped} stamped in your rail passport.`}>
      <Row gap={space.m} style={{ alignItems: "center" }}>
        <View style={{ width: 92 }}>
          <Sketch w={600} h={900} pal={pal} deps={[pins.length, c.accent, c.ppe]} paint={(p) => {
            GB_PATHS.uk.forEach((d) => p.path(d, c.surface, { roughness: 0.6, strokeWidth: 4 }));
            pins.forEach(({ xy: [x, y], col }) => p.circle(x, y, 34, col, { strokeWidth: 3, roughness: 0.5 }));
          }} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>Explore</Eyebrow>
          <H3>Great places to reach by train</H3>
          <Small color={c.soft}>Viaducts, coast lines and railway museums, each with the station to get off at.</Small>
          <Chip label={`Rail passport: ${stamped} of ${places.length}`} color={c.good} style={{ marginTop: 4 }} />
        </View>
      </Row>
    </Card>
  );
}
