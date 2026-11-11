/**
 * The Field Book (centre tab): your stamps. Sets with rings and tiers, the practice journal, and "Your line".
 * A routine screen, so it appears without entrance animations.
 */
import { router, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { lessonById, pack } from "@/domain";
import { useStore } from "@/state/store";
import { BodyB, Button, Eyebrow, H1, H2, H3, Hand, Screen, Small } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { useFieldBook } from "./hooks";
import { entries, seasonPreviewOpen, setEntries } from "./logic";
import { FenceRule, LevelLadder, SetCard } from "./parts";
import { DueTodayCard } from "./SpotOfDay";
import { PracticeMark } from "./Stamp";
import { castFromPractice } from "./UseIt";

const setHref = (id: string): Href => (id === "places" ? "/explore" : (`/set/${id}` as Href));

function Num({ value, label }: { value: number | string; label: string }) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: F.display, fontSize: 30, lineHeight: 34, color: c.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: c.soft }}>{label}</Text>
    </View>
  );
}

/** World features you can find on the Open Line, ticked when you have spotted the real thing. */
export function YourLine() {
  const { c } = useTheme();
  const spots = useStore((s) => s.fieldbook.spots);
  const features = useMemo(() => entries(pack).filter((e) => e.item?.world), []);
  const got = features.filter((e) => (spots[e.key]?.grade ?? 0) > 0).length;
  return (
    <View style={{ gap: space.m, padding: space.l, borderRadius: radius.l, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
      <View style={{ gap: 2 }}>
        <Eyebrow>Your line</Eyebrow>
        <H3>{got ? `${got} of ${features.length} found on the Open Line` : "Spot them for real, find them on the Open Line"}</H3>
        <Small color={c.soft}>Things you spot are marked when you pass them in the 3D world.</Small>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {features.map((e) => {
          const on = (spots[e.key]?.grade ?? 0) > 0;
          return (
            <View key={e.key} accessible accessibilityLabel={`${e.name}, ${on ? "spotted" : "not spotted yet"}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 36, borderRadius: radius.m, borderWidth: 1.5, borderStyle: on ? "solid" : "dashed", borderColor: on ? c.good : c.soft }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.good : c.soft }}>{on ? "✓" : "○"}</Text>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.ink : c.soft }}>{e.name}</Text>
            </View>
          );
        })}
      </View>
      <Button label="Ride the Open Line" onPress={() => router.push("/world")} />
    </View>
  );
}

function PracticeJournal() {
  const { c } = useTheme();
  const practice = useStore((s) => s.fieldbook.practice);
  const kid = useStore((s) => s.profile.audience === "explorer");
  const recent = practice.slice(0, 4);
  return (
    <View style={{ gap: space.m }}>
      <View style={{ gap: 2 }}>
        <H2 accessibilityRole="header">Practice stamps</H2>
        <Small color={c.soft}>{kid ? "Where you saw a lesson's idea at home or at school." : "Where you used a lesson's idea at work, at home or at school."}</Small>
      </View>
      {recent.length === 0 ? (
        <View style={{ padding: space.l, borderRadius: radius.l, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.soft, gap: 6 }}>
          <BodyB>No practice stamps yet.</BodyB>
          <Small color={c.soft}>Finish a stop, then notice its idea somewhere in your day. One line earns a stamp.</Small>
        </View>
      ) : (
        recent.map((p) => {
          const l = p.lessonId ? lessonById(p.lessonId) : undefined;
          return (
            <View key={p.id} style={{ flexDirection: "row", gap: space.m, paddingVertical: space.s, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <PracticeMark k={p.id} day={p.day} size={60} />
              <View style={{ flex: 1, gap: 2 }}>
                {l ? <Eyebrow>Stop {l.stop}: {l.title}</Eyebrow> : <Eyebrow>Your week</Eyebrow>}
                <Hand style={{ fontSize: 21, lineHeight: 24 }}>{p.text}</Hand>
                {!kid && <Text accessibilityRole="button" onPress={() => castFromPractice(p)} style={{ fontFamily: F.bodySemi, fontSize: 14, color: c.accent, paddingVertical: 8 }}>Turn into a Mindcast ›</Text>}
              </View>
            </View>
          );
        })
      )}
      <Button label="Add a practice stamp" onPress={() => router.push("/practice")} />
    </View>
  );
}

export function FieldBookScreen() {
  const { c } = useTheme();
  const fb = useFieldBook();
  const name = useStore((s) => s.profile.name.trim());
  const preview = seasonPreviewOpen(pack, fb.fb.spots);
  const s2 = pack.seasons.find((s) => s.n === 2);
  const lists = useMemo(() => Object.fromEntries(pack.spots.sets.map((s) => [s.id, setEntries(pack, s.id)])), []);
  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Eyebrow>Field Book</Eyebrow>
        <H1 accessibilityRole="header">{name ? `${name}'s Field Book` : "Your Field Book"}</H1>
        <Small color={c.soft}>Real things to spot from the platform. Stamp them, then use what they teach.</Small>
      </View>
      {fb.stamps > 0 ? (
        <View style={{ flexDirection: "row", gap: space.m }}>
          <Num value={fb.stamps} label={fb.stamps === 1 ? "stamp" : "stamps"} />
          <Num value={fb.noticedWeek} label={fb.noticedWeek === 1 ? "day this week" : "days this week"} />
          <Num value={fb.sets.filter((p) => p.tier).length} label="sets started" />
        </View>
      ) : (
        <Text style={{ fontFamily: F.hand, fontSize: 24, lineHeight: 27, color: c.accent }}>Nothing stamped yet. Every dotted outline below is something real to find.</Text>
      )}
      <LevelLadder stamps={fb.stamps} />
      <DueTodayCard />

      <View style={{ gap: space.m }}>
        <H2 accessibilityRole="header">Sets</H2>
        <FenceRule />
        {fb.sets.map((p) => <SetCard key={p.set.id} p={p} list={lists[p.set.id] ?? []} spots={fb.fb.spots} href={setHref(p.set.id)} />)}
      </View>

      {preview && s2 && (
        <View accessible style={{ padding: space.l, gap: 4, borderRadius: radius.l, backgroundColor: c.sunk, borderLeftWidth: 5, borderLeftColor: s2.colour }}>
          <Eyebrow>Unlocked: season preview</Eyebrow>
          <H3>Season {s2.n}: {s2.title}</H3>
          <Small color={c.soft}>{`${s2.time}. This season's event: ${s2.event.toLowerCase()}. The signals you have spotted are where it starts.`}</Small>
        </View>
      )}

      <PracticeJournal />
      <YourLine />
    </Screen>
  );
}
