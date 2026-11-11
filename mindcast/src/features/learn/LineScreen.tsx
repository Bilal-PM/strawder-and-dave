/** The Line tab: season header, stats, companion, the hand-drawn line of stops, and the season map. */
import { router, useIsFocused } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { ScrollView, Text, View, type ScrollViewInstance } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pack } from "@/domain";
import { useStore } from "@/state/store";
import { Bubble, Button, Card, Chip, Eyebrow, H1, H2, H3, PaperGrid, Row, Small, Stat, Hand } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { lineCompanion, pick, seasonInfo, seasonSlots } from "./content";
import { LineMap, MAP_W, stopXY, type StopState } from "./LineMap";
import { Sheet, useEnter } from "./ui";
import { hasStory } from "@/features/story/stories";

export function LineScreen() {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const focused = useIsFocused();
  const progress = useStore((s) => s.progress);
  const unlocked = useStore((s) => s.companions.unlocked);
  const season = seasonInfo(progress.season);
  const slots = useMemo(() => seasonSlots(progress.season), [progress.season]);
  const current = Math.max(0, Math.min(slots.length - 1, progress.stop - 1));
  const states: StopState[] = slots.map((l, i) => {
    if (!l) return "soon";
    if (progress.completed.includes(l.id)) return "done";
    if (i === current) return "current";
    return i < current ? "open" : "locked";
  });
  const scores = slots.map((l) => (l ? progress.quizBest[l.id] : undefined));
  const [sel, setSel] = useState<number | null>(null);
  const [say, setSay] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const mapTop = useRef(0);
  const scrolled = useRef(false);

  const comp = lineCompanion(unlocked);
  const here = slots[current];
  const facts = here?.keyFacts ?? [];
  const sayings = [...facts.map((f) => (comp?.tag ?? "") + f.text), ...(comp?.lines ?? [])];
  const greeting = say === 0 && comp ? `${comp.hello} ${sayings[0] ?? ""}`.trim() : pick(sayings, say) ?? comp?.hello ?? "";
  const enter = [useEnter(0), useEnter(55), useEnter(110), useEnter(165), useEnter(220)];
  const open = (id: string) => router.push({ pathname: "/lesson/[id]", params: { id } });
  const hereDone = here ? progress.completed.includes(here.id) : true;

  const scrollToCurrent = (w: number) => {
    if (scrolled.current || !w || current < 3) return;
    scrolled.current = true;
    setTimeout(() => {
      const y = mapTop.current + stopXY(current)[1] * (w / MAP_W) - 260;
      scroll.current?.scrollTo({ y: Math.max(0, y), animated: false });
    }, 80);
  };

  const selLesson = sel != null ? slots[sel] : undefined;
  const selState = sel != null ? states[sel] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PaperGrid />
      <ScrollView ref={scroll} contentInsetAdjustmentBehavior="never">
        <View style={{ paddingHorizontal: space.l, paddingTop: ins.top + space.m, paddingBottom: ins.bottom + 110, gap: space.l, maxWidth: 760, width: "100%", alignSelf: "center" }}>
          <Animated.View entering={enter[0]} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {season && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: season.colour }} />}
              <Eyebrow>Season {season?.n ?? progress.season}{season?.time ? ` · ${season.time}` : ""}</Eyebrow>
            </View>
            <H1 accessibilityRole="header">{season?.title ?? "The Line"}</H1>
            <Small color={c.soft}>{slots.length} stops, one topic each. Finish a stop to open the next.{season?.event ? ` This season's event: ${season.event.toLowerCase()}.` : ""}</Small>
          </Animated.View>

          <Animated.View entering={enter[1]} style={{ flexDirection: "row", gap: space.s }}>
            <Stat value={`${current + 1}/${slots.length}`} label="Stop" />
            <Stat value={progress.miles} label="Miles" />
            <Stat value={progress.streak} label={progress.streak === 1 ? "Day streak" : "Days streak"} />
          </Animated.View>

          {here && !hereDone ? (
            <Animated.View entering={enter[4]}>
              <Card tone="pass" onPress={() => open(here.id)} accessibilityLabel={`Your next stop: stop ${current + 1}, ${here.title}${hasStory(here.id) ? ", an illustrated story" : ""}`}>
                <Row gap={space.s} style={{ justifyContent: "space-between" }}>
                  <Eyebrow>Your next stop</Eyebrow>
                  {hasStory(here.id) && <Chip label="Illustrated story" color={c.accent} />}
                </Row>
                <Row gap={space.m} style={{ alignItems: "flex-start" }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: c.ink, alignItems: "center", justifyContent: "center", backgroundColor: c.pass }}>
                    <Text style={{ fontFamily: F.display, fontSize: 18, color: "#1B1F24" }}>{current + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <H3>{here.title}</H3>
                    <Small color={c.soft} numberOfLines={2}>{here.hook}</Small>
                  </View>
                </Row>
                <Button label={progress.completed.length ? "Carry on" : "Start the first stop"} kind="primary" onPress={() => open(here.id)} />
              </Card>
            </Animated.View>
          ) : null}

          {comp && greeting ? (
            <Animated.View entering={enter[2]}>
              <Bubble who={comp.name} text={greeting} onMore={sayings.length > 1 ? () => setSay((s) => s + 1) : undefined} />
            </Animated.View>
          ) : null}

          <Animated.View entering={enter[3]} style={{ gap: space.s }} onLayout={(e) => { mapTop.current = e.nativeEvent.layout.y + 40; }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <H2>The line</H2>
              <Hand color={c.soft}>{progress.completed.filter((id) => slots.some((l) => l?.id === id)).length} of {slots.length} done</Hand>
            </View>
            <View onLayout={(e) => scrollToCurrent(e.nativeEvent.layout.width)}>
              <LineMap slots={slots} states={states} current={current} scores={scores} onSelect={setSel} active={focused} />
            </View>
          </Animated.View>

          <View style={{ gap: space.s }}>
            <H2>Season map</H2>
            <Small color={c.soft}>Six seasons through the year. Each one is a new line to travel.</Small>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s, paddingVertical: 4, paddingRight: space.l }} style={{ marginHorizontal: -space.l }}>
              <View style={{ width: space.l - space.s }} />
              {pack.seasons.map((s) => {
                const isHere = s.n === progress.season;
                const past = s.n < progress.season;
                return (
                  <View key={s.n} accessible accessibilityLabel={`Season ${s.n}, ${s.title}, ${s.time}. ${isHere ? "You are here" : past ? "Done" : "Coming up"}`}
                    style={{ width: 168, minHeight: 132, padding: space.m, gap: 6, borderRadius: radius.l, borderWidth: isHere ? 2 : 1, borderColor: isHere ? c.ink : c.line, backgroundColor: isHere ? c.surface : c.sunk, opacity: isHere || past ? 1 : 0.75 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 26, color: isHere ? c.ink : c.soft }}>{s.n}</Text>
                      <View style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: s.colour }} />
                    </View>
                    <Text numberOfLines={2} style={{ fontFamily: F.bodySemi, fontSize: 15, lineHeight: 19, color: c.ink }}>{s.title}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: c.soft }}>{s.time}</Text>
                    {isHere ? <Chip label="You are here" color={c.pass} filled /> : past ? <Chip label="Done" color={c.good} /> : null}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      <Sheet open={sel != null} onClose={() => setSel(null)} label={selLesson ? `Stop ${(sel ?? 0) + 1}: ${selLesson.title}` : "Stop"}>
        {sel != null && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Eyebrow>Stop {sel + 1} of {slots.length}</Eyebrow>
              {selState === "done" ? <Chip label={`Done${scores[sel] != null ? ` · quiz ${scores[sel]}/3` : ""}`} color={c.accent} />
                : selState === "current" ? <Chip label="Current stop" color={c.pass} filled />
                : selState === "open" ? <Chip label="Open" color={c.accent} />
                : <Chip label={selState === "soon" ? "Coming soon" : "Locked"} color={c.soft} />}
            </View>
            <H2>{selLesson?.title ?? `Stop ${sel + 1}`}</H2>
            {selLesson && hasStory(selLesson.id) && <Chip label="Illustrated story" color={c.accent} />}
            {selLesson ? <Text style={{ fontFamily: F.hand, fontSize: 26, lineHeight: 28, color: c.ink }}>{selLesson.hook}</Text> : <Small color={c.soft}>This stop is still being written.</Small>}
            {selLesson && (selState === "locked" ? (
              <>
                <Small color={c.soft}>Stops open in order. Finish stop {current + 1} first, then this one opens.</Small>
                <Button label={`Go to stop ${current + 1} instead`} kind="primary" onPress={() => { setSel(null); if (here) open(here.id); }} />
              </>
            ) : (
              <Button label={selState === "done" ? "Revisit this stop" : selState === "current" ? "Start this stop" : "Open this stop"} kind="primary" onPress={() => { const id = selLesson.id; setSel(null); open(id); }} />
            ))}
          </>
        )}
      </Sheet>
    </View>
  );
}
