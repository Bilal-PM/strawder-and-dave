import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import type { Audience } from "@/domain";
import { CastCard, MethodLine, useAllCasts } from "@/features/mindcast/parts";
import { Body, Button, Card, Eyebrow, H1, Hand, Segmented, Screen, Small } from "@/ui/kit";
import { useTheme } from "@/ui/theme";

export default function MindcastTab() {
  const { c } = useTheme();
  const casts = useAllCasts();
  const [who, setWho] = useState<"all" | Audience>("all");
  const list = useMemo(() => casts.filter((m) => who === "all" || m.audience.includes(who)), [casts, who]);
  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Eyebrow>Mindcast</Eyebrow>
        <H1>Experience that sticks</H1>
        <Body color={c.soft}>Take something real from the railway, explain why it happens, and carry the cause and effect across to how we lead and deliver. No slogans, no clichés.</Body>
      </View>
      <Card>
        <Hand style={{ color: c.accent }}>The method</Hand>
        <MethodLine />
        <Small color={c.soft}>Every Mindcast is checked as you write it: is it specific, does it explain the mechanism, does it carry relationships rather than words, and does it say where it stops working?</Small>
        <Button label="Write a Mindcast" kind="primary" onPress={() => router.push("/cast/new")} />
      </Card>
      <Segmented label="Who it's for" value={who} onChange={setWho} options={[{ value: "all", label: "All" }, { value: "explorer", label: "Explorers" }, { value: "starter", label: "Starters" }, { value: "leader", label: "Leaders" }]} />
      <View style={{ gap: 12 }}>
        {list.map((m) => <CastCard key={m.id} cast={m} />)}
        {list.length === 0 && <Small color={c.soft}>Nothing here yet for this group. Write the first one.</Small>}
      </View>
    </Screen>
  );
}
