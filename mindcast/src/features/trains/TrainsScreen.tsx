/** Trains tab: a library of UK classes drawn to scale. */
import { router } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View, type ListRenderItem } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pack } from "@/domain";
import type { TrainClass, TrainGroup } from "@/domain/types";
import { Body, Enter, Eyebrow, H1, Mono, PaperGrid, Small, Tappable, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { Thumb } from "./art";
import { GROUPS } from "./model";

type G = "all" | TrainGroup;

const TrainCard = memo(function TrainCard({ train, index }: { train: TrainClass; index: number }) {
  const { c } = useTheme();
  return (
    <Enter i={index < 8 ? index : 0} style={{ flex: 1 }}>
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${train.name}, ${train.type}`}
      accessibilityHint="Opens details and a 3D view"
      onPress={() => router.push(`/train/${train.id}`)}
      style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: 10, gap: 6, minHeight: 44 }}>
      <View style={{ backgroundColor: c.sunk, borderRadius: radius.m, paddingVertical: 6, paddingHorizontal: 2 }}>
        <Thumb train={train} />
      </View>
      <Text numberOfLines={2} style={{ fontFamily: F.displaySemi, fontSize: 16, color: c.ink }}>{train.name}</Text>
      <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 17, color: c.soft }}>{train.type}</Text>
    </Tappable>
    </Enter>
  );
});

function Filters({ value, onChange }: { value: G; onChange: (g: G) => void }) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel="Filter by group" contentContainerStyle={{ gap: 8, paddingRight: space.l }}>
      {GROUPS.map((g) => {
        const on = g.value === value;
        return (
          <Pressable key={g.value} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`Show ${g.label === "All" ? "all trains" : g.label}`} onPress={() => { if (!on) tap(); onChange(g.value); }}
            style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{g.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function TrainsScreen() {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const [group, setGroup] = useState<G>("all");
  const [q, setQ] = useState("");
  const all = pack.trains ?? [];
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((t) => (group === "all" || t.group === group) && (!s || `${t.name} ${t.type} ${t.power}`.toLowerCase().includes(s)));
  }, [all, group, q]);

  // keep the last card half width when the count is odd
  const data = useMemo<(TrainClass | null)[]>(() => (list.length % 2 ? [...list, null] : list), [list]);
  const renderItem = useCallback<ListRenderItem<TrainClass | null>>(({ item, index }) => (item ? <TrainCard train={item} index={index} /> : <View style={{ flex: 1 }} importantForAccessibility="no" />), []);

  const header = (
    <View style={{ gap: space.m, paddingBottom: space.m }}>
      <Eyebrow>Trains</Eyebrow>
      <H1 accessibilityRole="header">{"Britain's trains, drawn to scale"}</H1>
      <Body color={c.soft}>{"Each drawing is built from the class's real length and height. Tap one for its details, a 3D view and a postcard."}</Body>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.line, borderRadius: radius.m, paddingLeft: 12 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by name or type"
          placeholderTextColor={c.soft}
          accessibilityLabel="Search trains"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          style={{ flex: 1, minHeight: 46, fontFamily: F.body, fontSize: 16, color: c.ink }}
        />
        {q ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQ("")} hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, color: c.soft }}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <Filters value={group} onChange={setGroup} />
      <Mono color={c.soft} accessibilityLiveRegion="polite">{list.length === 1 ? "1 class" : `${list.length} classes`}</Mono>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PaperGrid />
      <FlatList
        data={data}
        keyExtractor={(t) => (t ? t.id : "spacer")}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ListHeaderComponent={header}
        ListEmptyComponent={<Small color={c.soft}>{all.length ? "No trains match. Try another word or group." : "The train library is loading."}</Small>}
        contentContainerStyle={{ gap: 12, paddingHorizontal: space.l, paddingTop: ins.top + space.m, paddingBottom: ins.bottom + 96, maxWidth: 760, width: "100%", alignSelf: "center" }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}
