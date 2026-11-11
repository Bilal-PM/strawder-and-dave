import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import type { Audience } from "@/domain";
import { CastCard, INTEGRITY_LINE, MethodLine, useAllCasts } from "@/features/mindcast/parts";
import { useStore } from "@/state/store";
import { Body, Button, Card, Enter, Eyebrow, H1, Hand, Segmented, Screen, Small } from "@/ui/kit";
import { useTheme } from "@/ui/theme";

const GROUPS: { value: "all" | Audience; label: string }[] = [{ value: "all", label: "All" }, { value: "explorer", label: "Explorers" }, { value: "starter", label: "Starters" }, { value: "leader", label: "Leaders" }];

export default function MindcastTab() {
  const { c } = useTheme();
  const casts = useAllCasts();
  const me = useStore((s) => s.profile.audience);
  const [who, setWho] = useState<"all" | Audience>("all");
  const list = useMemo(() => casts.filter((m) => who === "all" || m.audience.includes(who)), [casts, who]);
  // Only offer a filter when there is something behind it.
  const groups = useMemo(() => GROUPS.filter((g) => g.value === "all" || casts.some((m) => m.audience.includes(g.value as Audience))), [casts]);
  return (
    <Screen>
      <Enter style={{ gap: 6 }}>
        <Eyebrow>{me === "explorer" ? "Ideas" : "Mindcast"}</Eyebrow>
        <H1 accessibilityRole="header">Experience that sticks</H1>
        <Body color={c.soft}>A Mindcast takes one real thing from the railway, explains why it happens, and carries that cause and effect across to how we lead and deliver. No slogans, no clichés.</Body>
      </Enter>
      {me === "explorer" && (
        <Enter i={1}>
          <Card tone="sunk">
            <Hand color={c.accent}>For grown-ups</Hand>
            <Small color={c.soft}>Mindcasts are written for older learners and people at work. Ask a grown-up to read one with you, or head to Learn for your next stop.</Small>
            <Button small label="Go to Learn" onPress={() => router.navigate("/line")} style={{ alignSelf: "flex-start" }} />
          </Card>
        </Enter>
      )}
      <Enter i={1}>
        <Card>
          <Hand style={{ color: c.accent }}>The method, in six steps</Hand>
          <MethodLine />
          <Small color={c.soft}>{INTEGRITY_LINE} You see it as you write.</Small>
          <Button label="Write a Mindcast" kind="primary" onPress={() => router.push("/cast/new")} />
        </Card>
      </Enter>
      {groups.length > 2 && <Segmented label="Who it's for" showLabel value={who} onChange={setWho} options={groups} />}
      <View style={{ gap: 12 }}>
        {list.map((m, i) => <Enter key={m.id} i={i + 2}><CastCard cast={m} /></Enter>)}
        {list.length === 0 && <Small color={c.soft}>Nothing here yet for this group.</Small>}
      </View>
    </Screen>
  );
}
