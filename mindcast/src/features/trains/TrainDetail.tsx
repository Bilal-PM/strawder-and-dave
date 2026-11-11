/** Train detail: big side view or 3D view, spec sheet with sources, spotting tip, to-scale strip. */
import { router } from "expo-router";
import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { trainById } from "@/domain";
import type { Source, TrainClass } from "@/domain/types";
import { Body, Button, Card, Chip, Eyebrow, H1, H3, Hand, Row, Screen, Segmented, Small, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, space } from "@/ui/tokens";
import { ScaleStrip, SideView } from "./art";
import { classLivery, toDraw } from "./model";
import Viewer3D from "./Viewer3D";

export function BackLink({ label = "Back" }: { label?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={() => { tap(); if (router.canGoBack()) router.back(); else router.replace("/trains"); }}
      style={{ alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingRight: 12 }}>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: c.accent }}>‹ {label}</Text>
    </Pressable>
  );
}

const metres = (v: number, dp: number) => `${v.toFixed(dp)} m`;

function SpecSheet({ t }: { t: TrainClass }) {
  const { c } = useTheme();
  const approx = t.confidence !== "checked";
  const mark = approx ? " (approx.)" : "";
  const unit = t.cars && t.cars > 1 ? " per car" : "";
  const rows: [string, string][] = [
    ["Introduced", String(t.intro)],
    ["Top speed", t.speed],
    ["Power", t.power],
    [t.cars && t.cars > 1 ? "Formation" : "Wheels", t.arrangement],
    [`Length${unit}`, `${metres(t.lengthM, 1)}${mark}`],
    ["Height", `${metres(t.heightM, 2)}${mark}`],
  ];
  if (typeof t.built === "number") rows.push(["Built", String(t.built)]);
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <H3 accessibilityRole="header">Spec sheet</H3>
        {t.confidence === "checked" ? <Small color={c.soft}>Checked</Small> : <Chip label={t.confidence === "approx" ? "Approx." : "Not yet checked"} color={c.ppe} />}
      </Row>
      {approx && <Small color={c.soft}>{t.confidence === "approx" ? "Some figures are approximate and still being checked." : "These figures have not been checked yet."}</Small>}
      <View accessibilityRole="list">
        {rows.map(([k, v]) => (
          <View key={k} accessible accessibilityLabel={`${k}: ${v}`} style={{ flexDirection: "row", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
            <Text style={{ width: 120, fontFamily: F.mono, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: c.soft, paddingTop: 2 }}>{k}</Text>
            <Text style={{ flex: 1, fontFamily: F.body, fontSize: 16, lineHeight: 22, color: c.ink }}>{v}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Sources({ sources }: { sources: Source[] }) {
  const { c } = useTheme();
  if (!sources?.length) return null;
  return (
    <Card tone="sunk">
      <H3 accessibilityRole="header">Sources</H3>
      {sources.map((s, i) => {
        const text = `${s.label}${s.where ? `, ${s.where}` : ""}`;
        if (!s.url) return <Small key={i}>{text}</Small>;
        return (
          <Pressable key={i} accessibilityRole="link" accessibilityLabel={`Source: ${text}. Opens in your browser`} onPress={() => Linking.openURL(s.url!).catch(() => {})} style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.accent, textDecorationLine: "underline" }}>{text}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
}

export default function TrainDetail({ id }: { id: string }) {
  const { c } = useTheme();
  const t = trainById(id);
  const [view, setView] = useState<"side" | "3d">("side");
  if (!t) {
    return (
      <Screen>
        <BackLink label="Trains" />
        <H1>Train not found</H1>
        <Body>We couldn't find that class. It may have been renamed.</Body>
        <Button label="See all trains" onPress={() => router.replace("/trains")} />
      </Screen>
    );
  }
  const legacy = toDraw(t).model.kind === "legacy";
  return (
    <Screen>
      <BackLink label="Trains" />
      <View style={{ gap: 4 }}>
        <Eyebrow>{t.type}</Eyebrow>
        <H1 accessibilityRole="header">{t.name}</H1>
      </View>
      <Segmented label="Choose a view" value={view} onChange={setView} options={[{ value: "side", label: "Side view" }, { value: "3d", label: "3D view" }]} />
      {view === "side" ? (
        <Card style={{ paddingHorizontal: 8 }}>
          <SideView train={t} livery={classLivery(t)} />
        </Card>
      ) : (
        <Viewer3D spec={toDraw(t)} livery={classLivery(t)} label={t.name} />
      )}
      <Body>{t.fact}</Body>
      <SpecSheet t={t} />
      <Card tone="pass">
        <Hand color={c.accent}>How to spot one</Hand>
        <Body>{t.spotting}</Body>
      </Card>
      <View style={{ gap: space.s }}>
        <Eyebrow>To scale</Eyebrow>
        <Card style={{ paddingHorizontal: 8 }}>
          <ScaleStrip train={t} />
        </Card>
        <Small color={c.soft}>{legacy ? "Next to a 1.75 m person. Engineering machines are simplified drawings, set to their real length and height." : "Next to a 1.75 m person, at the same scale."}{toDraw(t).model.kind === "unit" && t.cars && t.cars > 2 ? ` Two of ${t.cars} cars shown.` : ""}</Small>
      </View>
      <Sources sources={t.sources} />
      <Button kind="primary" label="Make a postcard" accessibilityLabel={`Make a postcard of the ${t.name}`} onPress={() => router.push(`/postcard?train=${t.id}`)} />
    </Screen>
  );
}
