/** Railway weather: 7 hand-drawn days, what each means for the track, and this week's seasonal event. */
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Card, Eyebrow, H2, Row, Small, tap, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius, space, type Palette } from "@/ui/tokens";
import { LEAF, paintSky } from "../art";
import { useLive, useNow } from "../hooks";
import { ago } from "../services/cache";
import { describeDay, impacts, skyFromCode, weekEvent, type Impact, type Sky } from "../services/railImpacts";
import { cachedForecast, CITIES, DEFAULT_PLACE, loadForecast, locateOnce, roundedPlace, type Place } from "../services/weather";
import { Meta, TopicChip } from "./bits";

const toneColour = (t: Impact["tone"], c: Palette) => (t === "ppe" ? c.ppe : t === "accent" ? c.accent : t === "leaf" ? LEAF : c.soft);

const dayLabel = (iso: string, i: number) => (i === 0 ? "Today" : new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" }));
const dayLong = (iso: string, i: number) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long" }));

export function SkyIcon({ sky, size }: { sky: Sky; size?: number }) {
  const { c } = useTheme();
  const pal = usePal();
  return (
    <View style={size ? { width: size } : { width: "100%" }}>
      <Sketch w={60} h={60} pal={pal} deps={[sky, c.accent]} paint={(p) => paintSky(p, sky, c)} />
    </View>
  );
}

function PlacePicker({ onDone }: { onDone: () => void }) {
  const { c } = useTheme();
  const place = useStore((s) => s.settings.weatherPlace) ?? DEFAULT_PLACE;
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = (p: Place) => {
    useStore.getState().set((s) => ({ settings: { ...s.settings, weatherPlace: p } }));
    onDone();
  };
  const useMine = async () => {
    setBusy(true);
    setMsg(null);
    const r = await locateOnce();
    setBusy(false);
    if (r.ok) choose(roundedPlace(r.lat, r.lon));
    else setMsg(r.message);
  };
  return (
    <View style={{ gap: space.s, backgroundColor: c.sunk, borderRadius: radius.m, padding: space.m }}>
      <Small color={c.soft}>Your location is checked once to fetch the forecast. We keep a rounded place on this phone, never an address.</Small>
      <Button small kind="primary" label={busy ? "Finding you..." : "Use my location"} onPress={useMine} disabled={busy} accessibilityLabel="Use my location for railway weather" />
      {msg && <Small color={c.warn} accessibilityLiveRegion="polite">{msg}</Small>}
      <Small color={c.soft}>Or pick a place:</Small>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel="Places">
        {CITIES.map((p) => {
          const on = p.name === place.name;
          return (
            <Pressable key={p.name} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={p.name} onPress={() => { tap(); choose(p); }} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{p.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function WeatherCard() {
  const { c } = useTheme();
  const stored = useStore((s) => s.settings.weatherPlace);
  const place = stored ?? DEFAULT_PLACE;
  const key = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
  const { data, loading, error, refresh } = useLive(key, () => cachedForecast(place), (force) => loadForecast(place, { force }), 30 * 60 * 1000);
  const [sel, setSel] = useState(0);
  const [picking, setPicking] = useState(false);
  const now = useNow();

  const days = data?.forecast.days ?? [];
  const all = days.map((d) => impacts(d));
  const ev = days.length ? weekEvent(days) : null;
  const day = days[Math.min(sel, Math.max(0, days.length - 1))];
  const dayImp = all[Math.min(sel, Math.max(0, all.length - 1))] ?? [];

  return (
    <Card>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>Railway weather</Eyebrow>
          <H2 accessibilityRole="header">{place.name}</H2>
        </View>
        <Button small kind="ghost" label={picking ? "Done" : "Change"} onPress={() => setPicking((v) => !v)} accessibilityLabel={picking ? "Close place picker" : `Change place. Currently ${place.name}`} />
      </Row>
      {!stored && !picking && <Small color={c.soft}>Showing London. Tap Change to use your location or another city.</Small>}
      {picking && <PlacePicker onDone={() => { setPicking(false); setSel(0); }} />}

      {ev && (
        <View accessible accessibilityLabel={`${ev.title}. ${ev.text}`} style={{ flexDirection: "row", gap: space.m, alignItems: "center", backgroundColor: ev.id === "quiet" ? c.sunk : c.bg, borderRadius: radius.m, borderWidth: ev.id === "quiet" ? 0 : 1.5, borderColor: ev.id === "buckle" ? c.ppe : ev.id === "ice" ? c.accent : LEAF, padding: space.m }}>
          <SkyIcon sky={ev.sky} size={48} />
          <View style={{ flex: 1, gap: 4 }}>
            <BodyB>{ev.title}</BodyB>
            <Small color={c.soft}>{ev.text}</Small>
            <TopicChip topic={ev.topic} prefix="Learn:" />
          </View>
        </View>
      )}

      {days.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 4 }} accessibilityRole="tablist" accessibilityLabel="Seven day forecast">
          {days.map((d, i) => {
            const on = i === sel, imp = all[i], flag = imp[0];
            return (
              <Pressable
                key={d.date}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={describeDay(d, dayLong(d.date, i))}
                onPress={() => { tap(); setSel(i); }}
                style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 6, paddingHorizontal: 1, minHeight: 44, borderRadius: radius.s, borderWidth: 1.5, borderColor: on ? c.ink : "transparent", backgroundColor: on ? c.bg : "transparent" }}
              >
                <Text style={{ fontFamily: F.mono, fontSize: 11, color: on ? c.ink : c.soft }} numberOfLines={1}>{dayLabel(d.date, i)}</Text>
                <SkyIcon sky={skyFromCode(d.code, d.gust)} />
                <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: c.ink, fontVariant: ["tabular-nums"] }}>{Math.round(d.max)}°</Text>
                <Text style={{ fontFamily: F.body, fontSize: 12, color: c.soft, fontVariant: ["tabular-nums"] }}>{Math.round(d.min)}°</Text>
                <View style={{ height: 5, width: "70%", borderRadius: 3, backgroundColor: flag ? toneColour(flag.tone, c) : "transparent" }} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ minHeight: 120, alignItems: "center", justifyContent: "center", gap: space.s, backgroundColor: c.sunk, borderRadius: radius.m, padding: space.l }}>
          {loading ? (
            <>
              <ActivityIndicator color={c.soft} accessibilityLabel="Loading forecast" />
              <Small color={c.soft}>Fetching the forecast...</Small>
            </>
          ) : (
            <>
              <Body center>No forecast yet. We need a connection the first time.</Body>
              <Button small label="Try again" onPress={() => refresh(true)} />
            </>
          )}
        </View>
      )}

      {day && (
        <View style={{ gap: space.s }} accessibilityLiveRegion="polite">
          <BodyB>{dayLong(day.date, sel)}: {Math.round(day.max)}° high, {Math.round(day.min)}° low{day.rain >= 0.1 ? `, ${day.rain.toFixed(day.rain < 10 ? 1 : 0)} mm rain` : ""}, gusts {Math.round(day.gust * 0.621)} mph</BodyB>
          {dayImp.length === 0 ? (
            <Small color={c.soft}>Nothing for the track to worry about.</Small>
          ) : (
            dayImp.map((im) => (
              <View key={im.id} style={{ flexDirection: "row", gap: space.s }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: toneColour(im.tone, c) }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <BodyB>{im.title}</BodyB>
                  <Small color={c.soft}>{im.text}</Small>
                  <TopicChip topic={im.topic} prefix="Learn:" />
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {data && (
        <Row wrap style={{ justifyContent: "space-between" }}>
          <Meta color={data.stale ? c.warn : undefined}>
            {data.stale ? `Offline. Forecast from ${ago(data.at, now)}` : `Forecast updated ${ago(data.at, now)}`}
          </Meta>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh forecast" onPress={() => { tap(); refresh(true); }} hitSlop={10} style={{ minHeight: 32, justifyContent: "center" }}>
            <Meta color={c.accent}>{loading ? "Refreshing..." : "Refresh"}</Meta>
          </Pressable>
        </Row>
      )}
      {error && !data && !loading && <Meta color={c.warn}>Could not reach the forecast ({error}).</Meta>}
      <Meta>Weather data by Open-Meteo.com (CC BY 4.0). Track notes are general guidance, not a live railway warning.</Meta>
    </Card>
  );
}
