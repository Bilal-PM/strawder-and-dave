/** Live departures in a split-flap board. Reasons link to the lessons that explain them. */
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FlipInXUp } from "react-native-reanimated";
import { useStore } from "@/state/store";
import { Card, tap } from "@/ui/kit";
import { PencilLoader } from "@/ui/PencilLoader";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { dur, ease, stagger, useMotion } from "@/ui/motion";
import { F, radius, space } from "@/ui/tokens";
import { useLive, useNow } from "../hooks";
import { ago } from "../services/cache";
import { cachedBoard, loadBoard, type Departure } from "../services/departures";
import { stationByCrs, type Station } from "../services/stations";
import { TopicChip } from "./bits";
import { StationPicker } from "./StationPicker";

/**
 * The board is always dark, in both themes, so it uses its own fixed colours.
 * Status colours are strict and mean one thing each: green is on time, amber is late or delayed, red is cancelled.
 * Nothing else on the card uses them, so a glance down the right-hand column tells you how the trains are running.
 */
const B = { text: "#ECEAE4", soft: "#A3ABB5", good: "#6CC495", late: "#F2C94C", bad: "#F08A74", line: "#2B3139", edge: "#4A525C" };
const BOARD_PAL = { ink: B.late, paper: "#15191E", glass: "#15191E", soft: B.soft };

const QUICK = ["BHM", "EUS", "MAN", "LDS", "GLC", "EDB", "BRI", "CDF"];

function Flaps({ text, size = 15 }: { text: string; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 2 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {text.split("").map((ch, i) => (
        <View key={i} style={{ backgroundColor: c.flapBg, borderRadius: 3, paddingHorizontal: ch === ":" ? 1 : 3, paddingVertical: 3, overflow: "hidden" }}>
          <Text style={{ fontFamily: F.mono, fontSize: size, lineHeight: size + 3, color: B.text, textAlign: "center", minWidth: ch === ":" ? 4 : size * 0.62 }}>{ch}</Text>
          <View style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "#000", opacity: 0.55 }} />
        </View>
      ))}
    </View>
  );
}

function statusText(d: Departure) {
  if (d.status === "cancelled") return { label: "Cancelled", sub: null, col: B.bad };
  // The scribbled arrow stands in for "expected": booked time on the left, arrow, then the new time.
  if (d.status === "late") return { label: `${d.expected}`, sub: `${d.lateMin} min late`, col: B.late };
  if (d.status === "delayed") return { label: "Delayed", sub: "no estimate yet", col: B.late };
  if (d.status === "live") return { label: "Expected", sub: "live estimate", col: B.soft };
  return { label: "On time", sub: null, col: B.good };
}

/** "Late: a fault with the signalling system". One plain line, led by the status word. */
export function reasonLine(d: Pick<Departure, "status" | "reason">) {
  if (!d.reason) return null;
  const lead = d.status === "cancelled" ? "Cancelled" : d.status === "delayed" ? "Delayed" : d.status === "late" ? "Late" : "Note";
  // Lower-case an ordinary first word ("A fault", "Slippery rails"), not a name or acronym ("Network Rail", "BTP").
  const [w1, w2] = d.reason.split(" ");
  const r = /^[A-Z][a-z]*$/.test(w1) && (!w2 || /^[a-z0-9]/.test(w2)) ? d.reason[0].toLowerCase() + d.reason.slice(1) : d.reason;
  return `${lead}: ${r}`;
}

/**
 * A small hand-drawn delay mark, in amber. Late: a short scribbled arrow pointing on to the expected time.
 * Delayed with no estimate: a little clock. Static, so it is calm on a live board.
 */
function DelayMark({ kind }: { kind: "arrow" | "clock" }) {
  return (
    <View style={{ width: kind === "arrow" ? 20 : 14 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Sketch w={kind === "arrow" ? 40 : 28} h={28} pal={BOARD_PAL} deps={[kind]} paint={(p) => {
        const o = { stroke: B.late, strokeWidth: 2.4, roughness: 0.9 };
        if (kind === "arrow") {
          p.curve([[3, 18], [12, 12], [22, 16], [35, 13]], o);
          p.line(35, 13, 27, 7, o);
          p.line(35, 13, 28, 20, o);
        } else {
          p.circle(14, 14, 22, null, o);
          p.line(14, 14, 14, 7, { ...o, strokeWidth: 2 });
          p.line(14, 14, 19, 17, { ...o, strokeWidth: 2 });
        }
      }} />
    </View>
  );
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
          <Text numberOfLines={1} style={{ fontFamily: F.mono, fontSize: 15, color: d.status === "cancelled" ? B.soft : B.text, textDecorationLine: d.status === "cancelled" ? "line-through" : "none" }}>{d.destination}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.mono, fontSize: 11, color: B.soft }}>
            {[d.platform ? `Plat ${d.platform}` : null, d.operator].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {d.status === "late" && <DelayMark kind="arrow" />}
            {d.status === "delayed" && <DelayMark kind="clock" />}
            <Text style={{ fontFamily: F.mono, fontSize: 13, color: s.col }}>{s.label}</Text>
          </View>
          {s.sub && <Text style={{ fontFamily: F.mono, fontSize: 10, color: B.soft }}>{s.sub}</Text>}
        </View>
      </View>
      {d.reason && (
        <View style={{ gap: 6, paddingLeft: 2 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 19, color: B.text }}>{reasonLine(d)}</Text>
          <TopicChip topic={d.topic} prefix="Why?" color={B.soft} />
        </View>
      )}
    </Animated.View>
  );
}

function Btn({ label, onPress, a11y, busy }: { label: string; onPress: () => void; a11y: string; busy?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ busy }} onPress={() => { tap(); onPress(); }} hitSlop={6} style={({ pressed }) => ({ minHeight: 36, justifyContent: "center", paddingHorizontal: 10, borderRadius: radius.s, borderWidth: 1, borderColor: B.edge, opacity: busy ? 0.45 : pressed ? 0.7 : 1 })}>
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
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 22, lineHeight: 26, color: B.text }}>{station ? station.name : "Pick a station"}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {station && <Btn label="Refresh" busy={loading} onPress={() => refresh(true)} a11y="Refresh departures" />}
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
        <View accessibilityLiveRegion="polite" style={{ borderRadius: radius.s, borderWidth: 1, borderColor: B.edge, padding: 8 }}>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: B.text }}>Offline. This board is from {ago(data.at, now)} and may be out of date.</Text>
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
                  <TopicChip topic={n.topic} prefix="Why?" color={B.soft} />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {station && !board && (
        <View style={{ minHeight: 120, alignItems: "center", justifyContent: "center", gap: space.s }}>
          {loading || !error ? (
            <PencilLoader tone="board" label="Fetching the departure board" />
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
