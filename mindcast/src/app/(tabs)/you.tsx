import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { pack, type Audience } from "@/domain";
import { CompanionSpeaker } from "@/features/companions/Companion";
import { isUnlocked, unlockText } from "@/features/companions/logic";
import { CompanionArt } from "@/features/companions/Art";
import { CREW_OPTIONS, paintAvatar, SKINS, type CrewKey } from "@/features/crew/draw";
import { CREW_LINES, KIT_LINES } from "@/features/crew/lines";
import { useFieldBook } from "@/features/fieldbook/hooks";
import { earnedKit, SET_KIT } from "@/features/fieldbook/logic";
import { LevelLadder } from "@/features/fieldbook/parts";
import { YourWeek } from "@/features/fieldbook/Week";
import { CITIES, DEFAULT_PLACE, locateOnce, roundedPlace } from "@/features/today/services/weather";
import { useStore } from "@/state/store";
import { BodyB, Bubble, Button, Card, Chip, Eyebrow, H1, H2, H3, Hand, Row, Screen, Segmented, Small, tap, usePal } from "@/ui/kit";
import { dur, ease, spring } from "@/ui/motion";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, ON_FILL, radius, space, TOUCH } from "@/ui/tokens";

const AUDIENCE_NOTE: Record<Audience, string> = {
  explorer: "Explorer: short, simple lessons for younger learners.",
  starter: "Starter: the full picture in plain English.",
  leader: "Leader: what each topic means when you run the work.",
};

function Avatar() {
  const pal = usePal(); const { c } = useTheme();
  const crew = useStore((s) => s.crew);
  const [line, setLine] = useState<string | null>(null);
  const n = useRef(0); const y = useSharedValue(0); const reduce = useReducedMotion();
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const talk = () => { if (!reduce) y.set(withSequence(withTiming(-16, { duration: dur.quick, easing: ease.out }), withSpring(0, spring.lively))); setLine(CREW_LINES[n.current++ % CREW_LINES.length]); };
  return (
    <View style={{ gap: 8 }}>
      {line && <Bubble who="Your crew member" text={line} onClose={() => setLine(null)} onMore={talk} />}
      <Pressable accessibilityRole="button" accessibilityLabel="Your crew member, tap to talk" onPress={() => { tap(); talk(); }}>
        <Animated.View style={[{ alignSelf: "center", width: 220 }, st]}>
          <Sketch w={240} h={300} pal={pal} deps={[JSON.stringify(crew), c.ppe, c.pass, c.line]} paint={(p) => paintAvatar(p, crew, { ink: c.ink, soft: c.soft, line: c.line, ppe: c.ppe, pass: c.pass })} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function CrewOptions() {
  const { c } = useTheme();
  const crew = useStore((s) => s.crew); const pass = useStore((s) => s.pass.preview);
  const spots = useStore((s) => s.fieldbook.spots);
  const earned = useMemo(() => earnedKit(pack, spots), [spots]);
  const setFor = (k: CrewKey, i: number) => Object.entries(SET_KIT).find(([, v]) => v.part === k && v.index === i)?.[0];
  const [note, setNote] = useState<string | null>(null);
  const pick = (k: CrewKey, i: number, locked: boolean, name: string) => {
    tap(); useStore.getState().set((s) => ({ crew: { ...s.crew, [k]: i } }));
    const set = setFor(k, i);
    const title = pack.spots.sets.find((x) => x.id === set)?.title;
    setNote(locked && !pass && !earned.has(`${k}:${i}`) ? `Trying on: ${name}. ${title ? `Free when ${title} reaches silver in your Field Book, or` : "It's"} a Season Pass extra${title ? "" : ", or £1 on its own"}.` : KIT_LINES[k]?.[i] ?? null);
  };
  return (
    <View style={{ gap: 12 }}>
      <BodyB>Skin tone</BodyB>
      <Row wrap>{SKINS.map((s, i) => <Pressable key={s} accessibilityRole="radio" accessibilityLabel={`Skin tone ${i + 1}`} accessibilityState={{ selected: crew.skin === i }} onPress={() => { tap(); useStore.getState().set((x) => ({ crew: { ...x.crew, skin: i } })); }} style={{ width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, backgroundColor: s, borderWidth: crew.skin === i ? 3 : 1, borderColor: crew.skin === i ? c.ink : c.line }} />)}</Row>
      {(Object.keys(CREW_OPTIONS) as CrewKey[]).map((k) => (
        <View key={k} style={{ gap: 6 }}>
          <BodyB>{k === "kit" ? "Kit" : k === "head" ? "Head" : k === "hand" ? "In hand" : "Hair"}</BodyB>
          <Row wrap>
            {CREW_OPTIONS[k].map(([name, locked], i) => {
              const on = crew[k] === i;
              return (
                <Pressable key={name} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => pick(k, i, locked, name)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: TOUCH, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : pressed ? c.sunk : c.surface })}>
                  <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{name}</Text>
                  {locked && !pass && !earned.has(`${k}:${i}`) && <Text style={{ fontFamily: F.mono, fontSize: 10, backgroundColor: setFor(k, i) ? c.good : c.pass, color: setFor(k, i) ? "#FFFFFF" : ON_FILL, paddingHorizontal: 4, borderRadius: 3, overflow: "hidden" }}>{setFor(k, i) ? "EARN" : "PASS"}</Text>}
                </Pressable>
              );
            })}
          </Row>
        </View>
      ))}
      {note && <Hand style={{ color: c.accent, fontSize: 20 }}>{note}</Hand>}
    </View>
  );
}

function Companions() {
  const { c } = useTheme();
  const st = useStore((s) => s);
  const chosen = st.crew.pet;
  return (
    <View style={{ gap: 12 }}>
      <CompanionSpeaker />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {pack.companions.map((comp) => {
          const ok = isUnlocked(comp, st), cur = chosen === comp.id;
          return (
            <Pressable key={comp.id} accessibilityRole="button" accessibilityState={{ selected: cur }} accessibilityLabel={`${comp.name}. ${ok ? (cur ? "With you now" : "Unlocked") : unlockText(comp)}`} onPress={() => { tap(); useStore.getState().set((s) => ({ crew: { ...s.crew, pet: comp.id }, companions: ok && !s.companions.unlocked.includes(comp.id) ? { ...s.companions, unlocked: [...s.companions.unlocked, comp.id] } : s.companions })); }}
              style={({ pressed }) => ({ width: "48%", flexGrow: 1, backgroundColor: pressed ? c.sunk : c.surface, borderRadius: radius.l, borderWidth: cur ? 2 : 1, borderColor: cur ? c.ink : c.line, padding: 10, gap: 4, opacity: ok ? 1 : 0.75 })}>
              <CompanionArt id={comp.id} size={84} />
              <BodyB>{comp.name}</BodyB>
              <Small color={c.soft}>{comp.bio}</Small>
              {ok ? <Chip label={cur ? "With you now" : "Unlocked"} color={c.good} /> : <><Chip label={comp.unlock.type === "pass" ? "Season Pass or £1" : comp.unlock.type === "event" ? "Seasonal" : "Earn it free"} color={comp.unlock.type === "pass" ? c.ppe : c.accent} /><Small color={c.soft}>{unlockText(comp)}</Small></>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FieldBookSummary() {
  const { c } = useTheme();
  const fb = useFieldBook();
  const started = fb.sets.filter((p) => p.tier).length;
  return (
    <View style={{ gap: space.m }}>
      <View style={{ flexDirection: "row", gap: space.m }}>
        {[[fb.stamps, fb.stamps === 1 ? "stamp" : "stamps"], [`${started}/${fb.sets.length}`, "sets started"], [fb.setsDone, fb.setsDone === 1 ? "set complete" : "sets complete"]].map(([v, l]) => (
          <View key={String(l)} accessible accessibilityLabel={`${v} ${l}`} style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 28, lineHeight: 32, color: c.ink, fontVariant: ["tabular-nums"] }}>{v}</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: c.soft }}>{l}</Text>
          </View>
        ))}
      </View>
      <LevelLadder stamps={fb.stamps} />
      <Button small label="Open your Field Book" onPress={() => router.navigate("/fieldbook")} style={{ alignSelf: "flex-start" }} />
    </View>
  );
}

/** Where railway weather (and the spot of the day) comes from. Explorers need a grown-up for location. */
function WeatherPlace() {
  const { c } = useTheme();
  const place = useStore((s) => s.settings.weatherPlace) ?? DEFAULT_PLACE;
  const kid = useStore((s) => s.profile.audience === "explorer");
  const allowed = useStore((s) => s.fieldbook.grownUpLocation);
  const [msg, setMsg] = useState<string | null>(null);
  const choose = (p: typeof place) => useStore.getState().set((s) => ({ settings: { ...s.settings, weatherPlace: p } }));
  const mine = async () => { setMsg(null); const r = await locateOnce(); if (r.ok) choose(roundedPlace(r.lat, r.lon)); else setMsg(r.message); };
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>Railway weather for</Eyebrow>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel="Railway weather place">
        {CITIES.map((p) => {
          const on = p.name === place.name;
          return (
            <Pressable key={p.name} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={p.name} onPress={() => { tap(); choose(p); }} style={{ minHeight: TOUCH, justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{p.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {(!kid || allowed) && <Button small kind="ghost" label="Use my location" onPress={mine} style={{ alignSelf: "flex-start" }} />}
      {msg && <Small color={c.warn}>{msg}</Small>}
      <Small color={c.soft}>Used for the spot of the day. A rounded place is kept on this phone, never an address.</Small>
    </View>
  );
}

export default function You() {
  const { c } = useTheme();
  const st = useStore((s) => s);
  const [confirm, setConfirm] = useState(false);
  const kid = st.profile.audience === "explorer";
  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Eyebrow>You</Eyebrow>
        <H1 accessibilityRole="header">{st.profile.name ? `${st.profile.name}'s railway` : "Your railway"}</H1>
      </View>
      <View style={{ gap: 6 }}>
        <Segmented label="Learning as" showLabel value={st.profile.audience} onChange={(v: Audience) => useStore.getState().set((s) => ({ profile: { ...s.profile, audience: v } }))} options={[{ value: "explorer", label: "Explorer" }, { value: "starter", label: "Starter" }, { value: "leader", label: "Leader" }]} />
        <Small color={c.soft}>{AUDIENCE_NOTE[st.profile.audience]} Lessons open at this depth; you can switch inside any lesson.</Small>
      </View>
      <FieldBookSummary />

      <Card><H2>Your week</H2><Small color={c.soft}>{kid ? "Plan one small thing, do it, then say what you noticed. Each one earns a practice stamp." : "Plan a small action, do it, then note what you noticed. Each note earns a practice stamp in your Field Book."}</Small><YourWeek /></Card>
      <Card><H2>Your crew member</H2><Small color={c.soft}>Real kit from the real railway. Tap them to talk. Some kit is earned by reaching silver in a Field Book set.</Small><Avatar /><CrewOptions /></Card>
      <Card><H2>Companions</H2><Small color={c.soft}>Earn them free by filling Field Book sets. Conker visits for the autumn event.</Small><Companions /></Card>

      <Card tone="pass" onPress={() => router.push("/pass")} accessibilityLabel="Season Pass. Optional extras. Lessons stay free.">
        <Chip label="Season Pass" color={c.pass} filled />
        <H3>The knowledge is free. The extras are yours.</H3>
        <Small color={c.soft}>Optional extras for this season: kit, ticket designs and your season certificate. Lessons, stamps and companions you earn stay free.</Small>
        <BodyB color={c.accent}>{"See what's included ›"}</BodyB>
      </Card>

      <Card>
        <H3>Settings</H3>
        <Segmented label="Appearance" showLabel value={st.settings.theme} onChange={(v) => useStore.getState().set((s) => ({ settings: { ...s.settings, theme: v } }))} options={[{ value: "system", label: "Match phone" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        <Segmented label="Companions" showLabel value={st.settings.chatty ? "on" : "off"} onChange={(v) => useStore.getState().set((s) => ({ settings: { ...s.settings, chatty: v === "on" } }))} options={[{ value: "on", label: "Chatty" }, { value: "off", label: "Quiet" }]} />
        {kid && (
          <View style={{ gap: 6 }}>
            <Segmented label="Location (for a grown-up)" showLabel value={st.fieldbook.grownUpLocation ? "on" : "off"} onChange={(v) => useStore.getState().set((s) => ({ fieldbook: { ...s.fieldbook, grownUpLocation: v === "on" } }))} options={[{ value: "off", label: "Off" }, { value: "on", label: "Allowed" }]} />
            <Small color={c.soft}>Off by default for Explorers. When allowed, Groundwork checks location once to stamp a place or fetch weather, on this phone only. Nothing is shared.</Small>
          </View>
        )}
        <WeatherPlace />
        {!confirm ? <Button label="Reset my progress" kind="ghost" onPress={() => setConfirm(true)} /> : (
          <View style={{ gap: 8 }}><Small color={c.warn}>{"This clears your progress, Field Book, crew and week on this phone. It can't be undone."}</Small><Row wrap><Button label="Reset everything" small onPress={() => { useStore.getState().reset(); router.replace("/onboarding"); }} /><Button label="Keep my progress" small kind="primary" onPress={() => setConfirm(false)} /></Row></View>
        )}
      </Card>
    </Screen>
  );
}
