import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pack, type Audience, type Mindcast } from "@/domain";
import { ChecksList, integrityOf, MappingView, METHOD, MethodLine, ScoreBadge } from "@/features/mindcast/parts";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Card, Chip, Eyebrow, H2, Hand, Row, Small, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius } from "@/ui/tokens";

type Draft = Pick<Mindcast, "title" | "observe" | "mechanism" | "mapping" | "limits" | "principle" | "action" | "railwayTopic" | "audience">;
const blank: Draft = { title: "", observe: "", mechanism: "", mapping: [{ railway: "", target: "" }, { railway: "", target: "" }], limits: "", principle: "", action: "", railwayTopic: "", audience: ["starter"] };

function Field({ value, onChange, placeholder, label, lines = 4 }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; lines?: number }) {
  const { c } = useTheme();
  return (
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.soft} multiline={lines > 1} numberOfLines={lines}
      style={{ fontFamily: F.body, fontSize: 16, lineHeight: 22, color: c.ink, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.line, borderRadius: radius.m, padding: 12, minHeight: lines > 1 ? lines * 22 + 24 : 48, textAlignVertical: "top" }} />
  );
}

export default function NewCast() {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const [d, setD] = useState<Draft>(blank);
  const [step, setStep] = useState(0); // 0 = topic and title, 1..6 = method, 7 = review
  const integ = useMemo(() => integrityOf(d), [d]);
  const example = useMemo(() => pack.casts[(step * 3) % Math.max(1, pack.casts.length)], [step]);
  const up = (k: keyof Draft) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  const m = step >= 1 && step <= 6 ? METHOD[step - 1] : null;
  const publish = () => {
    const id = `mine-${Date.now()}`;
    const cast: Mindcast = { ...d, id, title: d.title.trim() || d.principle.trim().slice(0, 60), author: useStore.getState().profile.name.trim() || "You", sources: [], mapping: d.mapping.filter((p) => p.railway.trim() && p.target.trim()) };
    useStore.getState().set((s) => ({ casts: { ...s.casts, mine: [cast, ...s.casts.mine] } }));
    tap("success"); router.replace(`/cast/${id}`);
  };
  const toggleAud = (a: Audience) => setD((x) => ({ ...x, audience: x.audience.includes(a) ? (x.audience.length > 1 ? x.audience.filter((y) => y !== a) : x.audience) : [...x.audience, a] }));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: ins.top + 12, paddingBottom: 140, gap: 14, maxWidth: 760, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: "space-between" }}>
          <Button label="Close" kind="ghost" small onPress={() => router.back()} />
          <Row><Small color={c.soft}>Integrity</Small><ScoreBadge score={integ.score} small /></Row>
        </Row>
        <MethodLine at={step - 1} done={step - 2} />

        {step === 0 && (
          <View style={{ gap: 12 }}>
            <Eyebrow>New Mindcast</Eyebrow>
            <H2>Start from something real</H2>
            <Body color={c.soft}>Pick the part of the railway your experience comes from. You'll build it in six steps, and the integrity check will coach you as you go.</Body>
            <BodyB>Railway topic</BodyB>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {pack.lessons.map((l) => {
                const on = d.railwayTopic === l.id;
                return (
                  <Pressable key={l.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); setD((x) => ({ ...x, railwayTopic: l.id })); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }}>
                    <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: on ? c.bg : c.ink }}>{l.title}</Text>
                  </Pressable>
                );
              })}
            </View>
            <BodyB>Working title</BodyB>
            <Field label="Title" value={d.title} onChange={up("title")} placeholder="e.g. Why the warning comes a mile early" lines={1} />
            <BodyB>Who is it for?</BodyB>
            <Row wrap>{(["explorer", "starter", "leader"] as Audience[]).map((a) => <Button key={a} small kind={d.audience.includes(a) ? "primary" : "secondary"} label={a[0].toUpperCase() + a.slice(1)} onPress={() => toggleAud(a)} />)}</Row>
          </View>
        )}

        {m && (
          <View style={{ gap: 12 }}>
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
                <Eyebrow>Example from "{example.title}"</Eyebrow>
                {m.key === "mapping" ? <MappingView mapping={example.mapping.slice(0, 2)} /> : <Small color={c.soft}>{(example as never)[m.key] as string}</Small>}
              </Card>
            )}
          </View>
        )}

        {step === 7 && (
          <View style={{ gap: 12 }}>
            <Eyebrow>Review</Eyebrow>
            <H2>{d.title || "Untitled Mindcast"}</H2>
            <Hand style={{ color: c.accent }}>{d.principle}</Hand>
            <Card><Eyebrow>Integrity check</Eyebrow><ChecksList integ={integ} /></Card>
            <Small color={c.soft}>{integ.verdict === "strong" ? "Strong. This is ready to share." : integ.verdict === "sound" ? "Sound. A couple of fixes would make it land even better." : "Needs work. You can still publish, but fix the checks marked above first if you can."}</Small>
          </View>
        )}
      </ScrollView>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: ins.bottom + 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, flexDirection: "row", gap: 10 }}>
        {step > 0 && <Button label="Back" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
        {step < 7 ? <Button label={step === 6 ? "Review" : "Next"} kind="primary" disabled={step === 0 && !d.railwayTopic} onPress={() => setStep(step + 1)} style={{ flex: 2 }} /> : <Button label="Publish" kind="primary" onPress={publish} style={{ flex: 2 }} />}
      </View>
    </KeyboardAvoidingView>
  );
}
