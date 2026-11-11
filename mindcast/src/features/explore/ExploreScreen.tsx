/**
 * Explore by train: a hand-drawn map of Great Britain and Northern Ireland with great places to reach
 * by rail, a detail sheet for each, and a rail passport you stamp by being there (or honestly marking a visit).
 */
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { SlideInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pack } from "@/domain";
import type { Place } from "@/domain/types";
import { Sources, TopicChip } from "@/features/today/components/bits";
import { topicFromLinkString } from "@/features/today/services/links";
import { locateOnce } from "@/features/today/services/weather";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Chip, Eyebrow, H1, H2, H3, PaperGrid, Row, Small, tap, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { paintMap, paintPins, paintPlace, paintStamp, type Pin } from "./art";
import { GB_MAP, project } from "./gbmap";
import { CAT_ORDER, CATS, kmText, stampCheck, STAMP_RADIUS_KM, type Cat } from "./places";

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

function PlaceSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const { c } = useTheme();
  const pal = usePal();
  const ins = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const passport = useStore((s) => s.passport);
  const stamped = passport.includes(place.id);
  const [msg, setMsg] = useState<{ text: string; tone: "good" | "warn" | "soft" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const cat = CATS[place.category];
  const colour = cat?.colour(c) ?? c.accent;

  const stamp = () => {
    useStore.getState().set((s) => ({ passport: s.passport.includes(place.id) ? s.passport : [...s.passport, place.id] }));
    tap("success");
  };
  const checkIn = async () => {
    setBusy(true);
    setMsg(null);
    const r = await locateOnce();
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.message, tone: "warn" });
    const chk = stampCheck(place, r.lat, r.lon);
    if (chk.ok) {
      stamp();
      setMsg({ text: `Stamped. You are ${kmText(chk.km)} from ${chk.label}.`, tone: "good" });
    } else {
      setMsg({ text: `You are about ${kmText(chk.km)} from ${chk.label}. Stamps work within ${STAMP_RADIUS_KM} km. Been before? Use Mark as visited.`, tone: "soft" });
    }
  };

  return (
    <Animated.View
      entering={reduce ? undefined : SlideInDown.duration(260)}
      accessibilityViewIsModal
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "58%", backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: c.line, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: -4 }, elevation: 12 }}
    >
      <View style={{ alignItems: "center", paddingTop: 8 }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.line }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: ins.bottom + space.l, gap: space.s, maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Chip label={cat?.label ?? place.category} color={colour} />
            <H2 accessibilityRole="header">{place.name}</H2>
          </View>
          <Button small kind="ghost" label="Close" onPress={onClose} accessibilityLabel={`Close ${place.name}`} />
        </Row>
        <View style={{ borderRadius: radius.m, overflow: "hidden", backgroundColor: c.bg }}>
          <Sketch w={320} h={170} pal={pal} deps={[place.category, c.surface]} paint={(p) => paintPlace(p, place.category, c, colour)} accessibilityLabel={`Drawing: ${cat?.label ?? "place"}`} />
        </View>
        <BodyB>Get off at: {place.station}</BodyB>
        <Body>{place.fact}</Body>
        <TopicChip topic={topicFromLinkString((place as Place & { link?: string }).link)} prefix="Linked:" />
        {place.confidence && place.confidence !== "checked" && <Small color={c.soft}>Draft: wording still being checked against the source.</Small>}
        <Sources sources={place.sources} />

        <View style={{ marginTop: space.s, gap: space.s, padding: space.m, borderRadius: radius.m, backgroundColor: c.sunk }}>
          <Eyebrow>Rail passport</Eyebrow>
          {stamped ? (
            <>
              <Row gap={space.s}>
                <View style={{ width: 56 }}>
                  <Sketch w={100} h={100} pal={pal} deps={[colour, place.id]} paint={(p) => paintStamp(p, true, colour, c, initials(place.name))} />
                </View>
                <BodyB style={{ flex: 1 }}>Stamped in your rail passport.</BodyB>
              </Row>
              <Button small kind="ghost" label="Remove stamp" onPress={() => useStore.getState().set((s) => ({ passport: s.passport.filter((id) => id !== place.id) }))} accessibilityLabel={`Remove the ${place.name} stamp`} />
            </>
          ) : (
            <>
              <Small color={c.soft}>Stand within {STAMP_RADIUS_KM} km of the station and tap below. Your location is checked once, on this phone, and not stored.</Small>
              <Button kind="primary" label={busy ? "Checking where you are..." : "I'm here: stamp it"} onPress={checkIn} disabled={busy} accessibilityLabel={`Check my location and stamp ${place.name}`} />
              {confirm ? (
                <View style={{ gap: space.s }}>
                  <Small>Only if you have really been. Mark {place.name} as visited?</Small>
                  <Row gap={space.s}>
                    <Button small kind="pass" label="Yes, I've been" onPress={() => { stamp(); setConfirm(false); setMsg({ text: "Marked as visited.", tone: "good" }); }} />
                    <Button small kind="ghost" label="Cancel" onPress={() => setConfirm(false)} />
                  </Row>
                </View>
              ) : (
                <Button small label="Mark as visited" onPress={() => setConfirm(true)} accessibilityLabel={`Mark ${place.name} as visited without location`} />
              )}
            </>
          )}
          {msg && <Small accessibilityLiveRegion="polite" color={msg.tone === "good" ? c.good : msg.tone === "warn" ? c.warn : c.soft}>{msg.text}</Small>}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

function Passport({ places, stamped, onSelect }: { places: Place[]; stamped: string[]; onSelect: (id: string) => void }) {
  const { c } = useTheme();
  const pal = usePal();
  return (
    <View style={{ gap: space.m }}>
      <View style={{ gap: 2 }}>
        <Eyebrow>Rail passport</Eyebrow>
        <H2 accessibilityRole="header">{stamped.length} of {places.length} stamped</H2>
        <Small color={c.soft}>Visit a place by train and stamp it while you are there.</Small>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }} accessibilityRole="list">
        {places.map((p) => {
          const on = stamped.includes(p.id), colour = CATS[p.category]?.colour(c) ?? c.accent;
          return (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name}, ${on ? "stamped" : "not stamped yet"}`} onPress={() => { tap(); onSelect(p.id); }} style={({ pressed }) => ({ width: "31.5%", minWidth: 96, alignItems: "center", gap: 4, padding: space.s, borderRadius: radius.m, borderWidth: 1, borderColor: on ? colour : c.line, backgroundColor: c.surface, opacity: pressed ? 0.8 : 1 })}>
              <View style={{ width: 64 }}>
                <Sketch w={100} h={100} pal={pal} deps={[on, colour, p.id]} paint={(pt) => paintStamp(pt, on, colour, c, initials(p.name))} />
              </View>
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
  const places = pack.places ?? [];
  const passport = useStore((s) => s.passport);
  const [filter, setFilter] = useState<Filter>("all");
  const [sel, setSel] = useState<string | null>(null);
  const visible = useMemo(() => places.filter((p) => filter === "all" || p.category === filter), [places, filter]);
  const selected = places.find((p) => p.id === sel) ?? null;
  const counts = useMemo(() => Object.fromEntries(CAT_ORDER.map((k) => [k, places.filter((p) => p.category === k).length])) as Record<Cat, number>, [places]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const mapBox = useRef({ y: 0, h: 0 });
  const win = useWindowDimensions();
  const choose = (id: string) => {
    setSel(id);
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
      <ScrollView ref={scroller} contentContainerStyle={{ paddingHorizontal: space.l, paddingTop: ins.top + space.m, paddingBottom: ins.bottom + (selected ? win.height * 0.6 : 96), gap: space.l, maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <Row>
          <Button small kind="ghost" label="‹ Back" onPress={back} accessibilityLabel="Go back" />
        </Row>
        <View style={{ gap: space.xs }}>
          <Eyebrow>Explore</Eyebrow>
          <H1 accessibilityRole="header">Great places to reach by train</H1>
          <Body color={c.soft}>Tap a pin to see where to get off and what to look for.</Body>
        </View>

        <View accessibilityRole="radiogroup" accessibilityLabel="Filter places" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {(["all", ...CAT_ORDER] as Filter[]).map((f) => {
            const on = f === filter, col = f === "all" ? c.ink : CATS[f].colour(c);
            const label = f === "all" ? `All (${places.length})` : `${CATS[f].short} (${counts[f]})`;
            return (
              <Pressable key={f} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={f === "all" ? "All places" : CATS[f].label} onPress={() => { tap(); setFilter(f); if (sel && f !== "all" && selected?.category !== f) setSel(null); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? col : c.line, backgroundColor: on ? c.surface : "transparent" }}>
                {f !== "all" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col }} />}
                <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.ink : c.soft }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {places.length === 0 ? (
          <View style={{ padding: space.l, borderRadius: radius.l, backgroundColor: c.sunk }}>
            <H3>Places are on their way.</H3>
            <Body color={c.soft}>The list of great places is being checked. Come back soon.</Body>
          </View>
        ) : (
          <View onLayout={(e) => { mapBox.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }; }}>
            <MapView places={visible} selected={sel} stamped={passport} onSelect={choose} />
          </View>
        )}
        <Small color={c.soft}>Lines are simplified to show the main routes, not every branch. Map outline from Natural Earth.</Small>

        {places.length > 0 && <Passport places={places} stamped={passport} onSelect={choose} />}
      </ScrollView>
      {selected && <PlaceSheet key={selected.id} place={selected} onClose={() => setSel(null)} />}
    </View>
  );
}
