import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pack, type Audience, type Mindcast } from "@/domain";
import { ChecksList, INTEGRITY_LINE, integrityOf, MappingView, METHOD, MethodLine, ScoreBadge } from "@/features/mindcast/parts";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Card, Chip, Eyebrow, H2, Hand, Input, Row, Small, tap } from "@/ui/kit";
import { useMotion } from "@/ui/motion";
import { ScribbleTick } from "@/ui/ScribbleTick";
import { useTheme } from "@/ui/theme";
import { F, radius, space, TOUCH } from "@/ui/tokens";

type Draft = Pick<Mindcast, "title" | "observe" | "mechanism" | "mapping" | "limits" | "principle" | "action" | "railwayTopic" | "audience">;
const blank: Draft = { title: "", observe: "", mechanism: "", mapping: [{ railway: "", target: "" }, { railway: "", target: "" }], limits: "", principle: "", action: "", railwayTopic: "", audience: ["starter"] };

function Field({ value, onChange, placeholder, label, lines = 4 }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; lines?: number }) {
  return <Input accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} lines={lines} />;
}

export default function NewCast() {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  // Opened from a practice stamp: `topic` is the lesson, `note` is where they saw it. The note seeds the first
  // "in your world" relation, and stays visible as a reminder while they write.
  const { topic, note } = useLocalSearchParams<{ topic?: string; note?: string }>();
  const seedNote = typeof note === "string" ? note.slice(0, 600) : "";
  const [d, setD] = useState<Draft>(() => ({
    ...blank,
    railwayTopic: typeof topic === "string" && pack.lessons.some((l) => l.id === topic) ? topic : "",
    mapping: seedNote ? [{ railway: "", target: seedNote }, { railway: "", target: "" }] : blank.mapping,
  }));
  const [step, setStep] = useState(0); // 0 = topic and title, 1..6 = method, 7 = review
  const [leaving, setLeaving] = useState(false);
  const mo = useMotion();
  const dirty = !!(d.title.trim() || d.observe.trim() || d.mechanism.trim() || d.limits.trim() || d.principle.trim() || d.action.trim() || d.mapping.some((p) => p.railway.trim() || p.target.trim()));
  const close = () => { if (dirty && !leaving) setLeaving(true); else router.back(); };
  const integ = useMemo(() => integrityOf(d), [d]);
  const example = useMemo(() => pack.casts[(step * 3) % Math.max(1, pack.casts.length)], [step]);
  const up = (k: keyof Draft) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  const m = step >= 1 && step <= 6 ? METHOD[step - 1] : null;
  const publish = () => {
    const id = `mine-${Date.now()}`;
    const cast: Mindcast = { ...d, id, title: d.title.trim() || d.principle.trim().slice(0, 60), author: useStore.getState().profile.name.trim() || "You", sources: [], mapping: d.mapping.filter((p) => p.railway.trim() && p.target.trim()) };
    useStore.getState().set((s) => ({ casts: { ...s.casts, mine: [cast, ...s.casts.mine] } }));
    router.replace({ pathname: "/cast/[id]", params: { id, fresh: "1" } });
  };
  const toggleAud = (a: Audience) => setD((x) => ({ ...x, audience: x.audience.includes(a) ? (x.audience.length > 1 ? x.audience.filter((y) => y !== a) : x.audience) : [...x.audience, a] }));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: ins.top + 12, paddingBottom: 140, gap: 14, maxWidth: 760, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: "space-between" }}>
          <Button label="Close" kind="ghost" small onPress={close} accessibilityLabel={dirty ? "Close. You'll be asked before your draft is discarded" : "Close"} />
          {step >= 1 && d.observe.trim().length > 0 ? <Row><Small color={c.soft}>Integrity score</Small><ScoreBadge score={integ.score} small animate /></Row> : <Small color={c.soft}>Integrity score appears as you write</Small>}
        </Row>
        {leaving && (
          <Animated.View entering={mo.fade()}>
            <Card tone="sunk">
              <BodyB>Discard this draft?</BodyB>
              <Small color={c.soft}>{"Drafts aren't saved yet. If you close now, what you've written is lost."}</Small>
              <Row wrap>
                <Button small label="Keep writing" kind="primary" onPress={() => setLeaving(false)} />
                <Button small label="Discard and close" kind="ghost" onPress={() => router.back()} />
              </Row>
            </Card>
          </Animated.View>
        )}
        <MethodLine at={step - 1} done={step - 2} />

        {step === 0 && (
          <Animated.View key={step} entering={mo.next()} style={{ gap: 12 }}>
            <Eyebrow>New Mindcast</Eyebrow>
            <H2>Start from something real</H2>
            {seedNote ? (
              <Card tone="sunk">
                <Eyebrow>From your practice stamp</Eyebrow>
                <Hand>{seedNote}</Hand>
                <Small color={c.soft}>{"It's waiting in step 3 as the first relation in your world. Start with the railway side."}</Small>
              </Card>
            ) : null}
            <Body color={c.soft}>{"Pick the part of the railway your experience comes from. You'll build it in six steps, and the integrity score will coach you as you go."}</Body>
            <BodyB>Railway topic</BodyB>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {pack.lessons.map((l) => {
                const on = d.railwayTopic === l.id;
                return (
                  <Pressable key={l.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); setD((x) => ({ ...x, railwayTopic: l.id })); }} style={({ pressed }) => ({ paddingHorizontal: 12, minHeight: TOUCH, justifyContent: "center", borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : pressed ? c.sunk : c.surface })}>
                    <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{l.title}</Text>
                  </Pressable>
                );
              })}
            </View>
            <BodyB>Working title</BodyB>
            <Field label="Title" value={d.title} onChange={up("title")} placeholder="e.g. Why the warning comes a mile early" lines={1} />
            <BodyB>Who is it for? Pick one or more.</BodyB>
            <Row wrap>{(["explorer", "starter", "leader"] as Audience[]).map((a) => {
              const on = d.audience.includes(a);
              const name = `${a[0].toUpperCase() + a.slice(1)}s`;
              return (
                <Pressable key={a} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={name} onPress={() => { tap(); toggleAud(a); }}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, minHeight: TOUCH, paddingLeft: 8, paddingRight: 14, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: pressed ? c.sunk : c.surface })}>
                  <ScribbleTick checked={on} size={24} seed={a.length * 3} />
                  <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: c.ink }}>{name}</Text>
                </Pressable>
              );
            })}</Row>
          </Animated.View>
        )}

        {m && (
          <Animated.View key={step} entering={mo.next()} style={{ gap: 12 }}>
            <Eyebrow>Step {step} of 6 · {m.name}</Eyebrow>
            <H2>{m.ask}</H2>
            <Body color={c.soft}>{m.help}</Body>
            {m.key === "mapping" ? (
              <View style={{ gap: 10 }}>
                {d.mapping.map((pair, i) => (
                  <Card key={i}>
                    <Chip label={`Relation ${i + 1}`} color={c.accent} />
                    <Field label={`Railway relation ${i + 1}`} value={pair.railway} lines={2} placeholder="On the railway: A causes B (e.g. braking distance grows with the square of speed)" onChange={(v) => setD((x) => ({ ...x, mapping: x.mapping.map((p, j) => (j === i ? { ...p, railway: v } : p)) }))} />
                    <Field label={`Your world relation ${i + 1}`} value={pair.target} lines={2} placeholder="In your world: the same relationship (e.g. the time to change course grows faster than the size of the programme)" onChange={(v) => setD((x) => ({ ...x, mapping: x.mapping.map((p, j) => (j === i ? { ...p, target: v } : p)) }))} />
                    {d.mapping.length > 2 && <Button small kind="ghost" label="Remove" onPress={() => setD((x) => ({ ...x, mapping: x.mapping.filter((_, j) => j !== i) }))} />}
                  </Card>
                ))}
                {d.mapping.length < 5 && <Button small label="Add another relation" onPress={() => setD((x) => ({ ...x, mapping: [...x.mapping, { railway: "", target: "" }] }))} />}
              </View>
            ) : (
              <Field label={m.name} value={(d as never)[m.key] as string} onChange={up(m.key as keyof Draft)} lines={m.key === "principle" || m.key === "action" ? 2 : 6} placeholder={m.ask} />
            )}
            {example && (
              <Card tone="sunk">
                <Eyebrow>{`Example from "${example.title}"`}</Eyebrow>
                {m.key === "mapping" ? <MappingView mapping={example.mapping.slice(0, 2)} /> : <Small color={c.soft}>{(example as never)[m.key] as string}</Small>}
              </Card>
            )}
          </Animated.View>
        )}

        {step === 7 && (
          <Animated.View key={step} entering={mo.next()} style={{ gap: 12 }}>
            <Eyebrow>Review</Eyebrow>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <H2 style={{ flex: 1 }}>{d.title || "Untitled Mindcast"}</H2>
              <ScoreBadge score={integ.score} animate caption />
            </Row>
            <Hand style={{ color: c.accent }}>{d.principle}</Hand>
            <Card><Eyebrow>Integrity check</Eyebrow><Small color={c.soft}>{INTEGRITY_LINE}</Small><ChecksList integ={integ} /></Card>
            <Small color={c.soft}>{integ.verdict === "strong" ? "Strong. This is ready to share." : integ.verdict === "sound" ? "Sound. A couple of fixes would make it land even better." : "Needs work. You can still publish, but fix the checks marked above first if you can."}</Small>
          </Animated.View>
        )}
      </ScrollView>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.l, paddingTop: space.m, paddingBottom: ins.bottom + space.m, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, gap: space.s }}>
        {step === 0 && !d.railwayTopic && <Small color={c.soft} center>Pick a railway topic to carry on.</Small>}
        <View style={{ flexDirection: "row", gap: 10, maxWidth: 728, width: "100%", alignSelf: "center" }}>
          {step > 0 && <Button label="Back" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
          {step < 7 ? <Button label={step === 6 ? "Review" : "Next"} kind="primary" disabled={step === 0 && !d.railwayTopic} onPress={() => setStep(step + 1)} style={{ flex: 2 }} /> : <Button label="Publish" kind="primary" haptic="success" onPress={publish} style={{ flex: 2 }} />}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
