/** Live departures in a split-flap board. Reasons link to the lessons that explain them. */
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FlipInXUp } from "react-native-reanimated";
import { useStore } from "@/state/store";
import { Card, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { dur, ease, stagger, useMotion } from "@/ui/motion";
import { F, radius, space } from "@/ui/tokens";
import { useLive, useNow } from "../hooks";
import { ago } from "../services/cache";
import { cachedBoard, loadBoard, type Departure } from "../services/departures";
import { stationByCrs, type Station } from "../services/stations";
import { TopicChip } from "./bits";
import { StationPicker } from "./StationPicker";

/** The board is always dark, in both themes, so it uses its own fixed colours. */
const B = { text: "#ECEAE4", soft: "#A3ABB5", flap: "#F5C451", good: "#6CC495", late: "#F59A4A", bad: "#F08A74", line: "#2B3139" };

const QUICK = ["BHM", "EUS", "MAN", "LDS", "GLC", "EDB", "BRI", "CDF"];

function Flaps({ text, size = 15 }: { text: string; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 2 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {text.split("").map((ch, i) => (
        <View key={i} style={{ backgroundColor: c.flapBg, borderRadius: 3, paddingHorizontal: ch === ":" ? 1 : 3, paddingVertical: 3, overflow: "hidden" }}>
          <Text style={{ fontFamily: F.mono, fontSize: size, lineHeight: size + 3, color: B.flap, textAlign: "center", minWidth: ch === ":" ? 4 : size * 0.62 }}>{ch}</Text>
          <View style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "#000", opacity: 0.55 }} />
        </View>
      ))}
    </View>
  );
}

function statusText(d: Departure) {
  if (d.status === "cancelled") return { label: "Cancelled", sub: null, col: B.bad };
  if (d.status === "late") return { label: `Exp ${d.expected}`, sub: `${d.lateMin} min late`, col: B.late };
  if (d.status === "delayed") return { label: "Delayed", sub: "no estimate yet", col: B.late };
  if (d.status === "live") return { label: "Expected", sub: "live estimate", col: B.soft };
  return { label: "On time", sub: null, col: B.good };
}

function rowLabel(d: Departure) {
  const s = statusText(d);
  return [
    `${d.due} to ${d.destination}`,
    d.platform ? `platform ${d.platform}` : null,
    d.operator,
    d.status === "late" ? `expected ${d.expected}, ${d.lateMin} minutes late` : s.label,
    d.reason ? `Reason: ${d.reason}` : null,
  ].filter(Boolean).join(". ");
}

function BoardRow({ d, i }: { d: Departure; i: number }) {
  const m = useMotion();
  const s = statusText(d);
  // Rows flip in like a split-flap board; a plain fade with reduce motion on.
  return (
    <Animated.View entering={m.reduce ? m.fade() : FlipInXUp.delay(stagger(i, 40, 8)).duration(dur.base).easing(ease.out)} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: B.line, gap: 6 }}>
      <View accessible accessibilityLabel={rowLabel(d)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Flaps text={d.due} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.mono, fontSize: 15, color: d.status === "cancelled" ? B.soft : B.flap, textDecorationLine: d.status === "cancelled" ? "line-through" : "none" }}>{d.destination}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.mono, fontSize: 11, color: B.soft }}>
            {[d.platform ? `Plat ${d.platform}` : null, d.operator].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontFamily: F.mono, fontSize: 13, color: s.col }}>{s.label}</Text>
          {s.sub && <Text style={{ fontFamily: F.mono, fontSize: 10, color: B.soft }}>{s.sub}</Text>}
        </View>
      </View>
      {d.reason && (
        <View style={{ gap: 6, paddingLeft: 2 }}>
          <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: B.text }}>{d.reason}</Text>
          <TopicChip topic={d.topic} prefix="Why?" onDark />
        </View>
      )}
    </Animated.View>
  );
}

function Btn({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={() => { tap(); onPress(); }} hitSlop={6} style={({ pressed }) => ({ minHeight: 36, justifyContent: "center", paddingHorizontal: 10, borderRadius: radius.s, borderWidth: 1, borderColor: "#4A525C", opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ fontFamily: F.mono, fontSize: 12, color: B.text }}>{label}</Text>
    </Pressable>
  );
}

export function DeparturesCard() {
  const crs = useStore((s) => s.settings.homeStation);
  const station = stationByCrs(crs);
  const [picking, setPicking] = useState(false);
  const now = useNow();
  // Closures guard on `station` themselves: the React Compiler reads their dependencies during render.
  const { data, loading, error, refresh } = useLive(
    station?.crs ?? null,
    () => (station ? cachedBoard(station.crs) : Promise.resolve(null)),
    (force) => (station ? loadBoard(station, { force }) : Promise.reject(new Error("no station"))),
    60 * 1000
  );

  const pick = (s: Station) => {
    useStore.getState().set((st) => ({ settings: { ...st.settings, homeStation: s.crs } }));
    setPicking(false);
  };

  const board = data?.board;
  return (
    <Card tone="board" style={{ gap: space.m }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.s }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1, color: B.soft, textTransform: "uppercase" }}>Live departures</Text>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 22, lineHeight: 26, color: B.flap }}>{station ? station.name : "Pick a station"}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {station && <Btn label={loading ? "..." : "Refresh"} onPress={() => refresh(true)} a11y="Refresh departures" />}
          <Btn label={station ? "Change" : "Choose"} onPress={() => setPicking(true)} a11y={station ? `Change station. Currently ${station.name}` : "Choose a station"} />
        </View>
      </View>

      {!station && (
        <View style={{ gap: space.s }}>
          <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 21, color: B.text }}>See what is running now, and why trains are late. Every delay reason links to the lesson that explains it.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {QUICK.map((q) => stationByCrs(q)).filter((s): s is Station => !!s).map((s) => (
              <Btn key={s.crs} label={s.name} onPress={() => pick(s)} a11y={`Show departures from ${s.name}`} />
            ))}
          </View>
        </View>
      )}

      {station && data?.stale && (
        <View accessibilityLiveRegion="polite" style={{ borderRadius: radius.s, borderWidth: 1, borderColor: B.late, padding: 8 }}>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: B.late }}>Offline. This board is from {ago(data.at, now)} and may be out of date.</Text>
        </View>
      )}

      {station && board && (
        <View>
          {board.rows.length === 0 ? (
            <Text style={{ fontFamily: F.mono, fontSize: 13, color: B.soft, paddingVertical: space.m }}>No departures listed for the next while.</Text>
          ) : (
            board.rows.map((d, i) => <BoardRow key={d.id} d={d} i={i} />)
          )}
          {board.notices.length > 0 && (
            <View style={{ gap: 8, marginTop: space.s, paddingTop: space.s, borderTopWidth: 1, borderTopColor: B.line }}>
              <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8, color: B.soft, textTransform: "uppercase" }}>Notices</Text>
              {board.notices.map((n, i) => (
                <View key={i} style={{ gap: 6 }}>
                  <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: B.text }}>{n.text}</Text>
                  <TopicChip topic={n.topic} prefix="Why?" onDark />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {station && !board && (
        <View style={{ minHeight: 120, alignItems: "center", justifyContent: "center", gap: space.s }}>
          {loading || !error ? (
            <>
              <ActivityIndicator color={B.flap} accessibilityLabel="Loading departures" />
              <Text style={{ fontFamily: F.mono, fontSize: 12, color: B.soft }}>Fetching the board...</Text>
            </>
          ) : (
            <>
              <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.body, fontSize: 15, lineHeight: 21, color: B.text, textAlign: "center" }}>
                Live departures are not reachable right now. Check your connection and try again.
              </Text>
              <Text style={{ fontFamily: F.mono, fontSize: 11, color: B.soft, textAlign: "center" }}>({error})</Text>
              <Btn label="Try again" onPress={() => refresh(true)} a11y="Try loading departures again" />
            </>
          )}
        </View>
      )}

      {station && (
        <Text style={{ fontFamily: F.mono, fontSize: 10, lineHeight: 14, color: B.soft }}>
          {data && !data.stale ? `Updated ${ago(data.at, now)}. ` : ""}
          {board?.source === "tfl"
            ? "Live predictions for TfL services only. Powered by TfL Open Data."
            : "Live from National Rail Darwin via TransitRadar, an independent service. If the station screens disagree, trust the station."}
        </Text>
      )}
      <StationPicker visible={picking} current={crs} onPick={pick} onClose={() => setPicking(false)} />
    </Card>
  );
}
