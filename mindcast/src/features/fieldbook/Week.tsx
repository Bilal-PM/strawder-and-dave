/**
 * Your week (was the Loop): plan, do, notice. Noticing logs a practice stamp.
 * The weekly rhythm is "noticed on N days", against a target you choose, with rest days built in.
 * Nothing resets and nothing is for sale here.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { useStore, type LoopItem } from "@/state/store";
import { Body, BodyB, Button, Chip, Eyebrow, Hand, Input, Row, Segmented, Small, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { radius, space } from "@/ui/tokens";
import { useFieldBook } from "./hooks";
import { dayKey } from "./logic";
import { NoticingRing } from "./parts";
import { PracticeMark } from "./Stamp";

const lessonFromItem = (id: string) => /^loop-(s\d+-\d+)-lens/.exec(id)?.[1] ?? null;

/** The rhythm block: noticing ring, week dots and the target picker. */
export function WeeklyRhythm({ picker = true }: { picker?: boolean }) {
  const { c } = useTheme();
  const fb = useFieldBook();
  return (
    <View style={{ gap: space.m }}>
      <NoticingRing strength={fb.strength} noticed={fb.noticedWeek} target={fb.target} week={fb.week} />
      {picker && (
        <View style={{ gap: 6 }}>
          <Segmented label="Aim for" showLabel value={String(fb.target)} onChange={(v) => useStore.getState().set((s) => ({ fieldbook: { ...s.fieldbook, target: Number(v) } }))}
            options={[2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} days` }))} />
          <Small color={c.soft}>{`${fb.target} noticing days a week, and ${7 - fb.target} rest days. A missed day only dents your strength a little. It never goes back to zero.`}</Small>
        </View>
      )}
    </View>
  );
}

export function YourWeek() {
  const { c } = useTheme();
  const loop = useStore((s) => s.loop);
  const kid = useStore((s) => s.profile.audience === "explorer");
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const set = (fn: (l: typeof loop) => Partial<typeof loop>) => useStore.getState().set((s) => ({ loop: { ...s.loop, ...fn(s.loop) } }));
  const add = () => { const t = draft.trim(); if (!t) return; tap(); set((l) => ({ items: [...l.items, { id: `w${Date.now()}`, text: t, stage: "plan" }] })); setDraft(""); };
  const notice = (it: LoopItem) => {
    const t = (notes[it.id] ?? "").trim();
    if (!t) return;
    const p = useStore.getState().stampPractice(lessonFromItem(it.id), t, { from: "week" });
    if (!p) return;
    tap("success");
    set((l) => ({ items: l.items.map((x) => (x.id === it.id ? { ...x, stage: "learn", learned: t, doneAt: p.at } : x)) }));
  };
  const open = loop.items.filter((i) => i.stage !== "learn");
  const noticed = loop.items.filter((i) => i.stage === "learn").slice(-3).reverse();

  return (
    <View style={{ gap: space.l }}>
      <WeeklyRhythm />
      <View style={{ gap: 6 }}>
        <Eyebrow>This week</Eyebrow>
        <Input accessibilityLabel="What do you want from this week?" value={loop.want} onChangeText={(v) => set(() => ({ want: v }))} placeholder={kid ? "This week I want to..." : "This week I want to... e.g. get better at handovers"} />
      </View>
      <View style={{ gap: space.s }}>
        <Row>
          <Input accessibilityLabel="Plan one small action" value={draft} onChangeText={setDraft} placeholder="Plan: one small action" style={{ flex: 1 }} onSubmitEditing={add} returnKeyType="done" />
          <Button label="Add" small disabled={!draft.trim()} onPress={add} />
        </Row>
        {open.length === 0 && <Small color={c.soft}>{"Nothing planned. Lessons add their action here when you tap \u201cAdd to Your week\u201d."}</Small>}
        {open.map((it) => (
          <View key={it.id} style={{ gap: space.s, padding: space.m, borderRadius: radius.m, backgroundColor: c.sunk }}>
            <Row style={{ alignItems: "flex-start" }}>
              <Chip label={it.stage === "plan" ? "Plan" : "Doing"} color={it.stage === "plan" ? c.accent : c.ppe} />
              <Body style={{ flex: 1 }}>{it.text}</Body>
            </Row>
            {it.stage === "plan" ? (
              <Row gap={space.s}>
                <Button small label="Doing it" onPress={() => set((l) => ({ items: l.items.map((x) => (x.id === it.id ? { ...x, stage: "do" } : x)) }))} accessibilityLabel={`Start: ${it.text}`} />
                <Button small kind="ghost" label="Remove" onPress={() => set((l) => ({ items: l.items.filter((x) => x.id !== it.id) }))} accessibilityLabel={`Remove: ${it.text}`} />
              </Row>
            ) : (
              <View style={{ gap: space.s }}>
                <Input accessibilityLabel="What did you notice?" value={notes[it.id] ?? ""} onChangeText={(v) => setNotes((x) => ({ ...x, [it.id]: v }))} placeholder="What did you notice? One line." lines={2} />
                <Button small kind="primary" label="Notice it: stamp" disabled={!(notes[it.id] ?? "").trim()} onPress={() => notice(it)} accessibilityLabel="Save what you noticed and earn a practice stamp" />
              </View>
            )}
          </View>
        ))}
      </View>
      {noticed.length > 0 && (
        <View style={{ gap: space.s }}>
          <Eyebrow>Noticed</Eyebrow>
          {noticed.map((it) => (
            <Row key={it.id} gap={space.m} style={{ alignItems: "flex-start" }}>
              <PracticeMark k={it.id} day={it.doneAt ? dayKey(new Date(it.doneAt)) : ""} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <BodyB>{it.text}</BodyB>
                {it.learned ? <Hand style={{ fontSize: 20, lineHeight: 22 }} color={c.good}>{it.learned}</Hand> : null}
              </View>
              <Button small kind="ghost" label="Clear" onPress={() => set((l) => ({ items: l.items.filter((x) => x.id !== it.id) }))} accessibilityLabel={`Clear from Your week: ${it.text}. The stamp stays in your Field Book.`} />
            </Row>
          ))}
        </View>
      )}
    </View>
  );
}
