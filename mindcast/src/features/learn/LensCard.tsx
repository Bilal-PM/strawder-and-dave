/** The Mindcast lens: Observe → Mechanism → Mapping → Limits → Principle → Action. */
import React from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import type { Mindcast } from "@/domain/types";
import { useStore } from "@/state/store";
import { Body, Button, Eyebrow, H2, Small, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { SourceChips, announce } from "./ui";

function Step({ n, label, children, last }: { n: number; label: string; children: React.ReactNode; last?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ alignItems: "center", width: 28 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: c.accent, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: c.accent }}>{n}</Text>
        </View>
        {!last && <View style={{ flex: 1, width: 2, backgroundColor: c.line, marginTop: 4 }} />}
      </View>
      <View style={{ flex: 1, gap: 6, paddingBottom: last ? 0 : space.xl }}>
        <Eyebrow color={c.accent}>{label}</Eyebrow>
        {children}
      </View>
    </View>
  );
}

export function LensCard({ lens }: { lens: Mindcast }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const items = useStore((s) => s.loop.items);
  const added = items.some((it) => it.text === lens.action);
  const add = () => {
    if (added) return;
    useStore.getState().set((s) => ({ loop: { ...s.loop, items: [...s.loop.items, { id: `loop-${lens.id}-${Date.now()}`, text: lens.action, stage: "plan" }] } }));
    tap("success");
    announce("Added to your Loop");
  };
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, borderTopWidth: 6, borderTopColor: c.accent, padding: space.xl, gap: space.l }}>
      <View style={{ gap: 4 }}>
        <Eyebrow>Mindcast · the lens</Eyebrow>
        <H2>{lens.title}</H2>
      </View>
      <View>
        <Step n={1} label="Observe"><Body>{lens.observe}</Body></Step>
        <Step n={2} label="Mechanism"><Body>{lens.mechanism}</Body></Step>
        <Step n={3} label="Mapping">
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, color: c.soft }}>ON THE RAILWAY</Text>
              <View style={{ width: 18 }} />
              <Text style={{ flex: 1, fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, color: c.soft }}>IN YOUR WORK</Text>
            </View>
            {lens.mapping.map((m, i) => (
              <View key={i} accessible accessibilityLabel={`On the railway: ${m.railway}. In your work: ${m.target}`} style={{ flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: c.bg, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, padding: 10 }}>
                <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 19, color: c.ink }}>{m.railway}</Text>
                <Text style={{ width: 18, textAlign: "center", fontFamily: F.bodySemi, fontSize: 16, color: c.accent }}>↔</Text>
                <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 19, color: c.ink }}>{m.target}</Text>
              </View>
            ))}
          </View>
        </Step>
        <Step n={4} label="Limits"><Body color={c.soft}>{lens.limits}</Body></Step>
        <Step n={5} label="Principle">
          <Text style={{ fontFamily: F.display, fontSize: 22, lineHeight: 28, color: c.ink, letterSpacing: -0.2 }}>{lens.principle}</Text>
        </Step>
        <Step n={6} label="Action" last>
          <View style={{ backgroundColor: c.pass + "33", borderRadius: radius.m, padding: 12, borderWidth: 1, borderColor: c.pass }}>
            <Text style={{ fontFamily: F.hand, fontSize: 24, lineHeight: 26, color: c.ink }}>{lens.action}</Text>
          </View>
          {added ? (
            <Animated.View entering={reduce ? undefined : FadeIn} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: c.good }}>✓ In your Loop, ready to plan</Text>
            </Animated.View>
          ) : (
            <Button label="Add this action to my Loop" kind="primary" onPress={add} />
          )}
        </Step>
      </View>
      {lens.sources.length > 0 && (
        <View style={{ gap: 6 }}>
          <Small color={c.soft}>Railway side checked against</Small>
          <SourceChips sources={lens.sources} />
        </View>
      )}
    </View>
  );
}
