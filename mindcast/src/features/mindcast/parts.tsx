import { router } from "expo-router";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { pack, type Mindcast } from "@/domain";
import { useStore } from "@/state/store";
import { Body, BodyB, Card, Chip, Eyebrow, H3, Hand, Row, Small, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F } from "@/ui/tokens";
import { checkIntegrity, type Integrity } from "./integrity";

export const METHOD = [
  { key: "observe", name: "Observe", ask: "What really happens on the railway?", help: "A real, specific, checkable fact. Name the parts. Add a number or condition if you have one." },
  { key: "mechanism", name: "Mechanism", ask: "Why does it happen?", help: "Cause, constraint, effect. Explain it so a new joiner would get it." },
  { key: "mapping", name: "Map", ask: "Which relationships carry across?", help: "Pair each railway relationship with the same relationship in your world. Relations, not objects." },
  { key: "limits", name: "Limits", ask: "Where does it stop working?", help: "Every honest analogy breaks somewhere. Saying where makes people trust the rest." },
  { key: "principle", name: "Principle", ask: "What's the idea in one sentence?", help: "Plain words. Something someone could repeat to a colleague." },
  { key: "action", name: "Action", ask: "What can someone do this week?", help: "Start with a verb. Small enough to do in the next seven days." },
] as const;

export const integrityOf = (m: Pick<Mindcast, "observe" | "mechanism" | "mapping" | "limits" | "principle" | "action" | "title">): Integrity => checkIntegrity(m, pack.lexicon);

export function useAllCasts() {
  const mine = useStore((s) => s.casts.mine);
  return useMemo(() => [...mine, ...pack.casts], [mine]);
}

/** The six-step method as a little hand-drawn line. `at` highlights a step. */
export function MethodLine({ at = -1, done = -1 }: { at?: number; done?: number }) {
  const pal = usePal(); const { c } = useTheme();
  return (
    <Sketch w={660} h={96} pal={pal} deps={[at, done, c.accent, c.ppe, c.good]} accessibilityLabel="The Mindcast method: Observe, Mechanism, Map, Limits, Principle, Action" paint={(p) => {
      const xs = METHOD.map((_, i) => 40 + i * 116);
      p.line(40, 40, 620, 40, { stroke: c.soft, strokeWidth: 4, roughness: 0.8 });
      if (done >= 0) p.line(40, 40, xs[Math.min(done, 5)], 40, { stroke: c.good, strokeWidth: 4, roughness: 0.8 });
      METHOD.forEach((m, i) => {
        const on = i === at, ok = i <= done;
        p.circle(xs[i], 40, on ? 30 : 22, ok ? c.good : on ? c.accent : c.surface, { strokeWidth: on ? 2.6 : 1.8 });
        p.text(xs[i], 45, String(i + 1), 13, ok || on ? "#FFFFFF" : c.ink, "mono");
        p.text(xs[i], 84, m.name, 20, on ? c.accent : c.ink, "hand");
      });
    }} />
  );
}

/** Integrity score as a ring with the verdict. */
export function ScoreBadge({ score, small }: { score: number; small?: boolean }) {
  const pal = usePal(); const { c } = useTheme();
  const col = score >= 85 ? c.good : score >= 60 ? c.pass : c.warn;
  const size = small ? 44 : 72;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Integrity ${score} out of 100`}>
      <Sketch w={80} h={80} pal={pal} deps={[score, col]} paint={(p) => {
        p.circle(40, 40, 68, null, { stroke: c.line, strokeWidth: 6, roughness: 0.6 });
        p.arc(40, 40, 68, 68, -Math.PI / 2, -Math.PI / 2 + Math.max(0.05, score / 100) * Math.PI * 2, false, null, { stroke: col, strokeWidth: 6, roughness: 0.7 });
      }} />
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: small ? 15 : 22, color: c.ink }}>{score}</Text>
      </View>
    </View>
  );
}

export function CastCard({ cast }: { cast: Mindcast }) {
  const { c } = useTheme();
  const integ = useMemo(() => integrityOf(cast), [cast]);
  const lesson = pack.lessons.find((l) => l.id === cast.railwayTopic);
  return (
    <Card onPress={() => router.push(`/cast/${cast.id}`)} accessibilityLabel={`Mindcast: ${cast.title}`}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Chip label={lesson ? lesson.title : "Railway"} color={c.ppe} />
          <H3>{cast.title}</H3>
        </View>
        <ScoreBadge score={integ.score} small />
      </Row>
      <Hand style={{ color: c.accent }}>{cast.principle}</Hand>
      <Small color={c.soft}>{cast.author} · {cast.audience.map((a) => a[0].toUpperCase() + a.slice(1)).join(", ")}</Small>
    </Card>
  );
}

/** Railway relation ↔ target relation, drawn as two rails joined by sleepers. */
export function MappingView({ mapping }: { mapping: Mindcast["mapping"] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between" }}><Eyebrow color={c.ppe}>On the railway</Eyebrow><Eyebrow color={c.accent}>In your world</Eyebrow></Row>
      {mapping.map((m, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "stretch" }}>
          <View style={{ flex: 1, backgroundColor: c.sunk, borderRadius: 8, padding: 10, borderLeftWidth: 4, borderLeftColor: c.ppe }}><Small>{m.railway}</Small></View>
          <View style={{ width: 14, justifyContent: "center", alignItems: "center", gap: 6 }}>{[0, 1, 2].map((k) => <View key={k} style={{ width: 14, height: 3, backgroundColor: c.soft, borderRadius: 2 }} />)}</View>
          <View style={{ flex: 1, backgroundColor: c.sunk, borderRadius: 8, padding: 10, borderRightWidth: 4, borderRightColor: c.accent }}><Small>{m.target}</Small></View>
        </View>
      ))}
    </View>
  );
}

export function ChecksList({ integ }: { integ: Integrity }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {integ.hardFails.map((f) => <Small key={f} color={c.warn}>Must fix: {f}.</Small>)}
      {integ.checks.map((k) => (
        <Row key={k.id} style={{ alignItems: "flex-start" }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: k.pass ? c.good : c.sunk, borderWidth: 1.5, borderColor: k.pass ? c.good : c.line }}>
            <Text style={{ color: k.pass ? "#fff" : c.soft, fontSize: 12, fontFamily: F.bodySemi }}>{k.pass ? "✓" : "·"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <BodyB style={{ fontSize: 15 }}>{k.label}{k.max ? `  ${k.points}/${k.max}` : ""}</BodyB>
            <Small color={c.soft}>{k.detail}</Small>
          </View>
        </Row>
      ))}
      {integ.warnings.map((w) => <Small key={w} color={c.soft}>Note: {w}</Small>)}
    </View>
  );
}

export const audienceLabel = { explorer: "Explorer", starter: "Starter", leader: "Leader" } as const;
export { Body };
