/**
 * Explore by train: a hand-drawn map of Great Britain and Northern Ireland with great places to reach
 * by rail, a native sheet for each, and the Field Book's Places set: stamp a place by being there
 * (or honestly marking a visit). Stamps live in the Field Book (fieldbook.spots["place.<id>"]).
 */
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pack } from "@/domain";
import type { Place } from "@/domain/types";
import { useStore } from "@/state/store";
import { BackButton, Body, Enter, Eyebrow, H1, H2, H3, PaperGrid, Small, tap, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius, space, TOUCH } from "@/ui/tokens";
import { placeKey } from "@/features/fieldbook/logic";
import { EmptyStamp, InkStamp } from "@/features/fieldbook/Stamp";
import { paintMap, paintPins, type Pin } from "./art";
import { GB_MAP, project } from "./gbmap";
import { CAT_ORDER, CATS, type Cat } from "./places";

type Filter = "all" | Cat;
const initials = (name: string) => name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("") || name.slice(0, 2).toUpperCase();

function MapView({ places, selected, stamped, onSelect }: { places: Place[]; selected: string | null; stamped: string[]; onSelect: (id: string) => void }) {
  const { c } = useTheme();
  const pal = usePal();
  const pins: Pin[] = places.map((p) => {
    const [x, y] = project(p.lat, p.lon);
    return { id: p.id, x, y, colour: CATS[p.category]?.colour(c) ?? c.accent, selected: p.id === selected, stamped: stamped.includes(p.id), name: p.name };
  });
  const pinKey = pins.map((p) => `${p.id}${p.selected ? "*" : ""}${p.stamped ? "s" : ""}`).join("|");
  return (
    <View style={{ width: "100%", aspectRatio: GB_MAP.W / GB_MAP.H, borderRadius: radius.l, overflow: "hidden", backgroundColor: c.bg, borderWidth: 1, borderColor: c.line }}>
      <Sketch w={GB_MAP.W} h={GB_MAP.H} pal={pal} deps={[c.surface, c.accent]} paint={(p) => paintMap(p, c)} accessibilityLabel="Hand-drawn map of Great Britain and Northern Ireland with simplified main railway lines" />
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
        <Sketch w={GB_MAP.W} h={GB_MAP.H} pal={pal} deps={[pinKey, c.surface]} paint={(p) => paintPins(p, pins, c)} />
      </View>
      {pins.map((pin) => (
        <Pressable
          key={pin.id}
          accessibilityRole="button"
          accessibilityState={{ selected: pin.selected }}
          accessibilityLabel={`${pin.name}, ${CATS[places.find((p) => p.id === pin.id)!.category]?.label ?? "place"}${pin.stamped ? ", stamped" : ""}`}
          onPress={() => { tap(); onSelect(pin.id); }}
          style={{ position: "absolute", left: `${(pin.x / GB_MAP.W) * 100}%`, top: `${((pin.y - 20) / GB_MAP.H) * 100}%`, width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: 20 }}
        />
      ))}
    </View>
  );
}

/** The Places set: one stamp per place, dotted until you've been. */
function PlacesBook({ places, onSelect }: { places: Place[]; onSelect: (id: string) => void }) {
  const { c } = useTheme();
  const spots = useStore((s) => s.fieldbook.spots);
  const got = places.filter((p) => (spots[placeKey(p.id)]?.grade ?? 0) > 0).length;
  return (
    <View style={{ gap: space.m }}>
      <View style={{ gap: 2 }}>
        <Eyebrow>Field Book · Places</Eyebrow>
        <H2 accessibilityRole="header">{got} of {places.length} stamped</H2>
        <Small color={c.soft}>Visit a place by train and stamp it while you are there, or mark a visit you have already made.</Small>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }} accessibilityRole="list">
        {places.map((p) => {
          const rec = spots[placeKey(p.id)];
          const on = (rec?.grade ?? 0) > 0;
          return (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name}, ${on ? "stamped" : "not stamped yet"}`} onPress={() => { tap(); onSelect(p.id); }} style={({ pressed }) => ({ width: "31.5%", minWidth: 96, alignItems: "center", gap: 4, padding: space.s, borderRadius: radius.l, borderWidth: on ? 1 : 1.5, borderStyle: on ? "solid" : "dashed", borderColor: on ? c.line : c.soft, backgroundColor: pressed ? c.sunk : on ? c.surface : "transparent" })}>
              {on ? <InkStamp k={placeKey(p.id)} grade={1} single day={rec!.days[rec!.days.length - 1] ?? ""} label={initials(p.name)} size={64} /> : <EmptyStamp size={64} />}
              <Text numberOfLines={2} style={{ fontFamily: F.bodySemi, fontSize: 12, lineHeight: 15, color: on ? c.ink : c.soft, textAlign: "center" }}>{p.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ExploreScreen() {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const places = pack.places;
  const spots = useStore((s) => s.fieldbook.spots);
  const stampedIds = useMemo(() => places.filter((p) => (spots[placeKey(p.id)]?.grade ?? 0) > 0).map((p) => p.id), [places, spots]);
  const [filter, setFilter] = useState<Filter>("all");
  const [sel, setSel] = useState<string | null>(null);
  const visible = useMemo(() => places.filter((p) => filter === "all" || p.category === filter), [places, filter]);
  const selected = places.find((p) => p.id === sel) ?? null;
  const counts = useMemo(() => Object.fromEntries(CAT_ORDER.map((k) => [k, places.filter((p) => p.category === k).length])) as Record<Cat, number>, [places]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/fieldbook"));
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const mapBox = useRef({ y: 0, h: 0 });
  const win = useWindowDimensions();
  const choose = (id: string) => {
    setSel(id);
    router.push({ pathname: "/place/[id]", params: { id } });
    const p = places.find((x) => x.id === id);
    if (p && filter !== "all" && p.category !== filter) setFilter("all");
    // Keep the chosen pin visible above the detail sheet, which covers the lower part of the screen.
    if (p && mapBox.current.h > 0) {
      const [, py] = project(p.lat, p.lon);
      const pinY = mapBox.current.y + (py / GB_MAP.H) * mapBox.current.h;
      scroller.current?.scrollTo({ y: Math.max(0, pinY - win.height * 0.2), animated: true });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PaperGrid />
      <ScrollView ref={scroller} contentContainerStyle={{ paddingHorizontal: space.l, paddingTop: ins.top + space.m, paddingBottom: ins.bottom + 96, gap: space.l, maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <BackButton label="Field Book" onPress={back} />
        <Enter style={{ gap: space.xs }}>
          <Eyebrow>Explore</Eyebrow>
          <H1 accessibilityRole="header">Great places to reach by train</H1>
          <Body color={c.soft}>{"Tap a pin to see where to get off and why it's worth the trip. Stamp it in your Field Book when you visit."}</Body>
        </Enter>

        <View accessibilityRole="radiogroup" accessibilityLabel="Filter places" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {(["all", ...CAT_ORDER] as Filter[]).map((f) => {
            const on = f === filter, col = f === "all" ? c.ink : CATS[f].colour(c);
            const label = f === "all" ? `All (${places.length})` : `${CATS[f].short} (${counts[f]})`;
            return (
              <Pressable key={f} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={f === "all" ? "All places" : CATS[f].label} onPress={() => { tap(); setFilter(f); if (sel && f !== "all" && selected?.category !== f) setSel(null); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: TOUCH, paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? col : c.line, backgroundColor: on ? c.surface : "transparent" }}>
                {f !== "all" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col }} />}
                <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.ink : c.soft }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {places.length === 0 ? (
          <View style={{ padding: space.l, borderRadius: radius.l, backgroundColor: c.sunk, gap: space.s }}>
            <H3>Places are on their way.</H3>
            <Body color={c.soft}>The list of great places is being checked. Come back soon.</Body>
          </View>
        ) : (
          <View onLayout={(e) => { mapBox.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }; }}>
            <MapView places={visible} selected={sel} stamped={stampedIds} onSelect={choose} />
          </View>
        )}
        <Small color={c.soft}>Lines are simplified to show the main routes, not every branch. Map outline from Natural Earth.</Small>

        {places.length > 0 && <PlacesBook places={places} onSelect={choose} />}
      </ScrollView>
    </View>
  );
}
