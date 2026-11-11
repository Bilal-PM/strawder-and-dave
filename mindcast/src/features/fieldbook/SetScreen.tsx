/** One set of the Field Book: tiers, the fence rule, and every item (spotted ones inked, the rest as dotted outlines). */
import { router, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { pack } from "@/domain";
import { GROUPS } from "@/features/trains/model";
import { useStore } from "@/state/store";
import { BackButton, Button, EmptyState, Eyebrow, H1, H3, Screen, Small } from "@/ui/kit";
import { PeekLink } from "@/ui/peek";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { meaningLine, setEntries, setProgress, type Entry } from "./logic";
import { FenceRule, ItemTile, TierBar } from "./parts";

/** "Class 66" → "66"; other names stay as they are. */
const abcLabel = (name: string) => name.replace(/^Class\s+/, "");

/** The Trains set as an ABC book: each class listed, underlined once you've spotted one. */
function TrainsAbc({ list }: { list: Entry[] }) {
  const { c } = useTheme();
  const spots = useStore((s) => s.fieldbook.spots);
  return (
    <View style={{ gap: space.l }}>
      {GROUPS.filter((g) => g.value !== "all").map((g) => {
        const rows = list.filter((e) => e.train?.group === g.value);
        if (!rows.length) return null;
        return (
          <View key={g.value} style={{ gap: 2 }}>
            <Eyebrow>{g.label}</Eyebrow>
            {rows.map((e) => {
              const on = (spots[e.key]?.grade ?? 0) > 0;
              return (
                <PeekLink key={e.key} href={`/spot/${e.key}` as Href} accessibilityLabel={`${e.name}, ${e.train?.type}. ${on ? "Spotted, underlined." : "Not spotted yet."}`}
                  style={{ flexDirection: "row", alignItems: "baseline", gap: space.m, minHeight: 44, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
                  <Text style={{ width: 92, fontFamily: F.display, fontSize: 20, color: on ? c.ink : c.soft, textDecorationLine: on ? "underline" : "none", textDecorationColor: c.accent, fontVariant: ["tabular-nums"] }} numberOfLines={1}>{abcLabel(e.name)}</Text>
                  <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: c.soft }} numberOfLines={1}>{e.train?.type}</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, color: on ? c.accent : c.soft }}>{on ? "SPOTTED" : e.rarity.toUpperCase()}</Text>
                </PeekLink>
              );
            })}
          </View>
        );
      })}
      <Button label="Open the full train library" onPress={() => router.push("/trains")} />
    </View>
  );
}

export function SetScreen({ id }: { id: string }) {
  const { c } = useTheme();
  const spots = useStore((s) => s.fieldbook.spots);
  const set = pack.spots.sets.find((s) => s.id === id);
  const list = useMemo(() => setEntries(pack, id), [id]);
  if (!set) return <Screen><BackButton label="Field Book" fallback="/fieldbook" /><EmptyState title="Set not found" body="That set may have moved. Head back to the Field Book." action="Field Book" onAction={() => router.replace("/fieldbook")} /></Screen>;
  const p = setProgress(pack, set, spots);
  return (
    <Screen>
      <BackButton label="Field Book" fallback="/fieldbook" />
      <View style={{ gap: 6 }}>
        <Eyebrow>Field Book · {p.spotted} of {p.total}</Eyebrow>
        <H1 accessibilityRole="header">{set.title}</H1>
        <Small color={c.soft}>{set.blurb}</Small>
      </View>
      <View style={{ gap: space.s, padding: space.m, borderRadius: radius.l, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
        <TierBar p={p} />
        <Text style={{ fontFamily: F.hand, fontSize: 23, lineHeight: 25, color: c.accent }}>{meaningLine(p)}</Text>
      </View>
      <FenceRule full />
      {set.from === "trains" ? (
        <TrainsAbc list={list} />
      ) : (
        <View style={{ gap: space.s }}>
          <H3>{p.spotted ? "Your stamps" : "What to look for"}</H3>
          <Small color={c.soft}>{p.spotted ? "Dotted outlines are still out there." : "Every dotted outline is something real to find. Tap one for where to look and why it's there."}</Small>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.s, marginTop: 4 }}>
            {list.map((e) => <ItemTile key={e.key} entry={e} rec={spots[e.key]} />)}
          </View>
        </View>
      )}
    </Screen>
  );
}
