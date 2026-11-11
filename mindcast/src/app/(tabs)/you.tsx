import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useMemo, useRef, useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import { pack, type Audience } from "@/domain";
import { CompanionSpeaker } from "@/features/companions/Companion";
import { isUnlocked, unlockText } from "@/features/companions/logic";
import { CompanionArt } from "@/features/companions/Art";
import { CREW_OPTIONS, paintAvatar, SKINS, type CrewKey } from "@/features/crew/draw";
import { CREW_LINES, KIT_LINES } from "@/features/crew/lines";
import { useStore, type LoopItem } from "@/state/store";
import { Body, BodyB, Bubble, Button, Card, Chip, Enter, Eyebrow, H1, H2, H3, Hand, Input, Mono, Row, Screen, Segmented, Small, Stat, tap, usePal } from "@/ui/kit";
import { dur, ease, spring } from "@/ui/motion";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, ON_FILL, radius, TOUCH } from "@/ui/tokens";

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
  const [note, setNote] = useState<string | null>(null);
  const pick = (k: CrewKey, i: number, locked: boolean, name: string) => {
    tap(); useStore.getState().set((s) => ({ crew: { ...s.crew, [k]: i } }));
    setNote(locked && !pass ? `Trying on: ${name}. It's a Season Pass extra, or £1 on its own.` : KIT_LINES[k]?.[i] ?? null);
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
                  {locked && !pass && <Text style={{ fontFamily: F.mono, fontSize: 10, backgroundColor: c.pass, color: ON_FILL, paddingHorizontal: 4, borderRadius: 3, overflow: "hidden" }}>PASS</Text>}
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
  const pal = usePal(); const { c } = useTheme();
  const st = useStore((s) => s);
  const chosen = st.crew.pet;
  return (
    <View style={{ gap: 12 }}>
      <CompanionSpeaker />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {pack.companions.map((comp) => {
          const ok = isUnlocked(comp, st), cur = chosen === comp.id;
          return (
            <Pressable key={comp.id} accessibilityRole="button" accessibilityState={{ selected: cur }} accessibilityLabel={`${comp.name}. ${ok ? (cur ? "With you now" : "Unlocked") : unlockText(comp)}`} onPress={() => { tap(); useStore.getState().set((s) => ({ crew: { ...s.crew, pet: comp.id } })); }}
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

function LoopCard() {
  const { c } = useTheme(); const pal = usePal();
  const loop = useStore((s) => s.loop);
  const [draft, setDraft] = useState("");
  const [learned, setLearned] = useState<Record<string, string>>({});
  const ticket = useRef<React.ComponentRef<typeof View>>(null);
  const set = (fn: (l: typeof loop) => Partial<typeof loop>) => useStore.getState().set((s) => ({ loop: { ...s.loop, ...fn(s.loop) } }));
  const move = (it: LoopItem) => {
    if (it.stage === "plan") { set((l) => ({ items: l.items.map((x) => (x.id === it.id ? { ...x, stage: "do" } : x)) })); }
    else if (it.stage === "do") { const t = (learned[it.id] || "").trim(); if (!t) return; set((l) => ({ laps: l.laps + 1, items: l.items.map((x) => (x.id === it.id ? { ...x, stage: "learn", learned: t, doneAt: Date.now() } : x)) })); }
    else set((l) => ({ items: l.items.filter((x) => x.id !== it.id) }));
  };
  const next = loop.items.filter((i) => i.stage !== "learn").slice(0, 3);
  const share = async () => {
    const text = `My Groundwork ticket\nWant: ${loop.want}\nNext:\n${next.map((n, i) => `${i + 1}. ${n.text}`).join("\n")}`;
    try { if (Platform.OS !== "web" && ticket.current && (await Sharing.isAvailableAsync())) { await Sharing.shareAsync(await captureRef(ticket as never, { format: "png" })); } else await Share.share({ message: text }); } catch {}
  };
  const addItem = () => { if (draft.trim()) { tap(); set((l) => ({ items: [...l.items, { id: `a${Date.now()}`, text: draft.trim(), stage: "plan" }] })); setDraft(""); } };
  return (
    <View style={{ gap: 12 }}>
      <Sketch w={340} h={150} pal={pal} deps={[loop.items.map((i) => i.stage).join(), c.good]} accessibilityLabel="Your loop: want, strategy, plan, do, learn" paint={(p) => {
        const st = ["Want", "Strategy", "Plan", "Do", "Learn"], cx = 170, cy = 76, rx = 130, ry = 40;
        p.ellipse(cx, cy, rx * 2, ry * 2, null, { stroke: c.good, strokeWidth: 5, roughness: 0.8 });
        st.forEach((name, i) => { const a = -Math.PI / 2 + (i * Math.PI * 2) / 5, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; const count = loop.items.filter((it) => (i === 2 && it.stage === "plan") || (i === 3 && it.stage === "do") || (i === 4 && it.stage === "learn")).length; p.circle(x, y, 26, i < 2 ? c.accent : i === 2 ? c.surface : i === 3 ? c.ppe : c.good, { strokeWidth: 2 }); if (count) p.text(x, y + 5, String(count), 13, i === 2 ? c.ink : "#fff", "mono"); p.text(x, y + (y > cy ? 32 : -20), name, 20, c.ink, "hand"); });
      }} />
      <Input accessibilityLabel="What do you want?" value={loop.want} onChangeText={(v) => set(() => ({ want: v }))} placeholder="Want: e.g. my first railway job" />
      <Input accessibilityLabel="Your strategy" value={loop.strategy} onChangeText={(v) => set(() => ({ strategy: v }))} placeholder="Strategy: how will you get there?" lines={2} />
      <Row>
        <Input accessibilityLabel="Add a small action" value={draft} onChangeText={setDraft} placeholder="Plan: one small action" style={{ flex: 1 }} onSubmitEditing={addItem} returnKeyType="done" />
        <Button label="Add" small disabled={!draft.trim()} onPress={addItem} />
      </Row>
      {loop.items.map((it, i) => (
        <Enter key={it.id} i={i}>
        <Card style={{ padding: 12 }}>
          <Row style={{ alignItems: "flex-start" }}>
            <Chip label={it.stage === "plan" ? "Plan" : it.stage === "do" ? "Do" : "Learned"} color={it.stage === "plan" ? c.accent : it.stage === "do" ? c.ppe : c.good} />
            <View style={{ flex: 1, gap: 4 }}>
              <Body>{it.text}</Body>
              {it.learned && <Hand style={{ color: c.good, fontSize: 20 }}>Learned: {it.learned}</Hand>}
              {it.stage === "do" && <Input accessibilityLabel="What did you learn?" value={learned[it.id] ?? ""} onChangeText={(v) => setLearned((x) => ({ ...x, [it.id]: v }))} placeholder="What did you learn? One line." />}
            </View>
            <Button small label={it.stage === "plan" ? "Done it" : it.stage === "do" ? "Save" : "Remove"} kind={it.stage === "learn" ? "ghost" : "secondary"} haptic={it.stage === "do" ? "success" : "light"} disabled={it.stage === "do" && !(learned[it.id] || "").trim()} accessibilityLabel={it.stage === "plan" ? `Mark done: ${it.text}` : it.stage === "do" ? "Save what you learned" : `Remove: ${it.text}`} onPress={() => move(it)} />
          </Row>
        </Card>
        </Enter>
      ))}
      <View ref={ticket} collapsable={false} style={{ backgroundColor: "#FBF4E4", borderRadius: 10, borderWidth: 1, borderColor: "#E3D6B8", overflow: "hidden" }}>
        <View style={{ height: 12, backgroundColor: "#E8611A" }} />
        <View style={{ padding: 16, gap: 6 }}>
          <Row style={{ justifyContent: "space-between" }}><Mono color="#6B5D45">SEASON TICKET · LOOP</Mono><Mono color="#6B5D45">{loop.laps} LAPS</Mono></Row>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 20, color: "#1D1D1D" }}>{loop.want || "Say what you want first"}</Text>
          {next.map((n, i) => <Text key={n.id} style={{ fontFamily: F.mono, fontSize: 13, color: "#1D1D1D" }}>{i + 1}. {n.text}</Text>)}
          <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: "#CDBE9C", marginTop: 6, paddingTop: 6 }}><Mono color="#6B5D45">VALID UNTIL YOU'VE DONE IT · GROUNDWORK</Mono></View>
        </View>
      </View>
      <Button label="Share my ticket" onPress={share} />
    </View>
  );
}

export default function You() {
  const { c } = useTheme();
  const st = useStore((s) => s);
  const [confirm, setConfirm] = useState(false);
  const done = st.progress.completed.length;
  const ready = useMemo(() => pack.lessons.length, []);
  const kid = st.profile.audience === "explorer";
  return (
    <Screen>
      <Enter style={{ gap: 6 }}>
        <Eyebrow>You</Eyebrow>
        <H1 accessibilityRole="header">{st.profile.name ? `${st.profile.name}'s railway` : "Your railway"}</H1>
      </Enter>
      <Enter i={1} style={{ gap: 6 }}>
        <Segmented label="Learning as" showLabel value={st.profile.audience} onChange={(v: Audience) => useStore.getState().set((s) => ({ profile: { ...s.profile, audience: v } }))} options={[{ value: "explorer", label: "Explorer" }, { value: "starter", label: "Starter" }, { value: "leader", label: "Leader" }]} />
        <Small color={c.soft}>{AUDIENCE_NOTE[st.profile.audience]} Lessons open at this depth; you can switch inside any lesson.</Small>
      </Enter>
      <Enter i={2}><Row style={{ alignItems: "stretch" }}><Stat value={`${done}/${ready}`} label="stops" /><Stat value={st.progress.miles} label="miles" /><Stat value={st.progress.streak} label="streak" /><Stat value={st.loop.laps} label="loops" /></Row></Enter>

      <Enter i={3}><Card><H2>Your crew member</H2><Small color={c.soft}>Real kit from the real railway. Tap them to talk.</Small><Avatar /><CrewOptions /></Card></Enter>
      <Enter i={4}><Card><H2>Companions</H2><Small color={c.soft}>Earn some for free by learning. Others come with the Season Pass, or for £1 each.</Small><Companions /></Card></Enter>
      <Enter i={5}><Card><H2>The Loop</H2><Small color={c.soft}>{kid ? "Pick something you want to get better at. Plan one small step, do it, then say what you learned. Then go round again." : "Turn what you learn into action. Say what you want, plan small steps, do them, and note what you learned. Then go round again."}</Small><LoopCard /></Card></Enter>

      <Card tone="pass" onPress={() => router.push("/pass")} accessibilityLabel="Season Pass. Optional extras. Lessons stay free.">
        <Chip label="Season Pass" color={c.pass} filled />
        <H3>The knowledge is free. The extras are yours.</H3>
        <Small color={c.soft}>Optional extras for this season: a reward at every stop, unlimited loops, ticket designs and your season certificate. Lessons stay free.</Small>
        <BodyB color={c.accent}>See what's included ›</BodyB>
      </Card>

      <Card>
        <H3>Settings</H3>
        <Segmented label="Appearance" showLabel value={st.settings.theme} onChange={(v) => useStore.getState().set((s) => ({ settings: { ...s.settings, theme: v } }))} options={[{ value: "system", label: "Match phone" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        <Segmented label="Companions" showLabel value={st.settings.chatty ? "on" : "off"} onChange={(v) => useStore.getState().set((s) => ({ settings: { ...s.settings, chatty: v === "on" } }))} options={[{ value: "on", label: "Chatty" }, { value: "off", label: "Quiet" }]} />
        {!confirm ? <Button label="Reset my progress" kind="ghost" onPress={() => setConfirm(true)} /> : (
          <View style={{ gap: 8 }}><Small color={c.warn}>This clears your progress, crew and Loop on this phone. It can't be undone.</Small><Row wrap><Button label="Reset everything" small onPress={() => { useStore.getState().reset(); router.replace("/onboarding"); }} /><Button label="Keep my progress" small kind="primary" onPress={() => setConfirm(false)} /></Row></View>
        )}
      </Card>
    </Screen>
  );
}
