/** Train detail: big side view or 3D view, spec sheet with sources, spotting tip, to-scale strip. */
import { Link, router } from "expo-router";
import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { trainById } from "@/domain";
import type { Source, TrainClass } from "@/domain/types";
import { BackButton, Body, Button, Card, Chip, EmptyState, Enter, Eyebrow, H1, H3, Hand, Row, Screen, Segmented, Small } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, space } from "@/ui/tokens";
import { SpotIt } from "@/features/fieldbook/SpotIt";
import { trainKey } from "@/features/fieldbook/logic";
import { ScaleStrip, SideView } from "./art";
import { classLivery, toDraw } from "./model";
import Viewer3D from "./Viewer3D";

/** The shared back control, falling back to the Trains tab when there is no history (a deep link). */
export function BackLink({ label = "Back" }: { label?: string }) {
  return <BackButton label={label} fallback="/trains" />;
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
        <EmptyState eyebrow="Trains" title="Train not found" body="We couldn't find that class. It may have been renamed." action="See all trains" onAction={() => router.replace("/trains")} />
      </Screen>
    );
  }
  const legacy = toDraw(t).model.kind === "legacy";
  return (
    <Screen>
      <BackLink label="Trains" />
      <Enter style={{ gap: 4 }}>
        <Eyebrow>{t.type}</Eyebrow>
        <H1 accessibilityRole="header">{t.name}</H1>
      </Enter>
      <Segmented label="Choose a view" value={view} onChange={setView} options={[{ value: "side", label: "Side view" }, { value: "3d", label: "3D view" }]} />
      {view === "side" ? (
        <Link.AppleZoomTarget>
          <Card style={{ paddingHorizontal: 8 }}>
            <SideView train={t} livery={classLivery(t)} />
          </Card>
        </Link.AppleZoomTarget>
      ) : (
        <Viewer3D spec={toDraw(t)} livery={classLivery(t)} label={t.name} />
      )}
      <Body>{t.fact}</Body>
      <SpecSheet t={t} />
      <Card tone="pass">
        <Hand color={c.accent}>How to spot one</Hand>
        <Body>{t.spotting}</Body>
        <SpotIt itemId={trainKey(t.id)} compact />
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
