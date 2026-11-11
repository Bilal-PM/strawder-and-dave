/**
 * The Open Line: driving HUD, drawn in React Native over the 3D canvas.
 */
import React, { useRef, useState } from "react";
import { PanResponder, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius } from "@/ui/tokens";
import type { Aspect, Snapshot } from "./sim";

const LAMP = { r: "#FF3B30", y: "#FFC02E", g: "#36D27A", off: "#3A3F45" };
const ASPECT_NAME = ["Red", "Single yellow", "Double yellow", "Green"];
// lamps top to bottom: yellow, green, yellow, red
const LAMPS: string[][] = [
  [LAMP.off, LAMP.off, LAMP.off, LAMP.r],
  [LAMP.off, LAMP.off, LAMP.y, LAMP.off],
  [LAMP.y, LAMP.off, LAMP.y, LAMP.off],
  [LAMP.off, LAMP.g, LAMP.off, LAMP.off],
];

export const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(m / 10) * 10)} m`);

/** A panel that reads clearly over the 3D scene in both themes. */
export function Panel({ children, style }: { children: React.ReactNode; style?: object }) {
  const { c, dark } = useTheme();
  return <View style={[{ backgroundColor: dark ? "rgba(26,30,36,0.92)" : "rgba(255,255,255,0.92)", borderRadius: radius.l, borderWidth: 1.5, borderColor: c.ink, padding: 10 }, style]}>{children}</View>;
}

export function MiniSignal({ aspect, size = 12 }: { aspect: Aspect; size?: number }) {
  return (
    <View style={{ backgroundColor: "#1E2125", borderRadius: size * 0.7, padding: size * 0.3, gap: size * 0.25, alignItems: "center" }}>
      {LAMPS[aspect].map((col, i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col }} />
      ))}
    </View>
  );
}

export function SpeedPanel({ s }: { s: Snapshot }) {
  const { c } = useTheme();
  const over = s.mph > s.limitMph + 3;
  return (
    <Panel style={{ minWidth: 118 }}>
      <View accessible accessibilityLabel={`Speed ${Math.round(s.mph)} miles per hour. Limit ${s.limitMph}.`}>
        <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: c.soft }}>SPEED</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text style={{ fontFamily: F.display, fontSize: 40, lineHeight: 44, color: over ? c.warn : c.ink, fontVariant: ["tabular-nums"] }}>{Math.round(s.mph)}</Text>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: c.soft }}>mph</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <View style={{ borderWidth: 2, borderColor: s.limitMph < 50 ? c.ppe : c.ink, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: c.ink }}>{s.limitMph}</Text>
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: c.soft }}>limit</Text>
        </View>
        {s.esrAhead !== null && s.limitMph >= 50 && <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: c.ppe, marginTop: 2 }}>20 in {fmtDist(s.esrAhead)}</Text>}
      </View>
    </Panel>
  );
}

export function SignalPanel({ s }: { s: Snapshot }) {
  const { c } = useTheme();
  return (
    <Panel style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <View accessible accessibilityLabel={`Next signal ${s.sig.label}, ${ASPECT_NAME[s.sig.aspect]}, ${fmtDist(s.sig.d)} ahead.`} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <MiniSignal aspect={s.sig.aspect} />
        <View>
          <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: c.soft }}>NEXT SIGNAL</Text>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: c.ink }}>{s.sig.label}</Text>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: s.sig.aspect === 0 ? c.warn : c.ink }}>{ASPECT_NAME[s.sig.aspect]}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: c.soft }}>{fmtDist(s.sig.d)}</Text>
        </View>
      </View>
    </Panel>
  );
}

export function StopPanel({ s }: { s: Snapshot }) {
  const { c } = useTheme();
  const status = s.dwell > 0 ? `Doors open, ${Math.ceil(s.dwell)} s` : s.station.d < 0 ? "Just past the marker" : fmtDist(s.station.d);
  return (
    <Panel style={{ flex: 1 }}>
      <View accessible accessibilityLabel={`Next stop ${s.station.name}. ${status}.`}>
        <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: c.soft }}>NEXT STOP</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.displaySemi, fontSize: 16, color: c.ink }}>{s.station.name}</Text>
        <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: s.dwell > 0 ? c.good : c.ink }}>{status}</Text>
      </View>
    </Panel>
  );
}

/**
 * The braking-distance bar: the track ahead as a strip. The yellow bar is where the train would
 * stop with a full service brake applied now; the mark is where it must stop.
 */
export function BrakeBar({ s }: { s: Snapshot }) {
  const { c } = useTheme();
  const [w, setW] = useState(300);
  const t = s.target;
  const bd = s.brakeDist;
  const scale = Math.min(1500, Math.max(400, t && t.dist > 0 ? t.dist * 1.2 : 0, bd * 1.2));
  const px = (m: number) => Math.max(0, Math.min(w, (m / scale) * w));
  const late = t !== null && s.mph > 1 && bd > t.dist;
  const stopped = s.mph < 0.5;
  const msg = stopped
    ? t && t.kind === "red" ? `Stopped. Red signal ${t.label} ${fmtDist(t.dist)} ahead.` : "Stopped."
    : late
      ? `Brake now: you would stop ${fmtDist(bd - (t?.dist ?? 0))} past the ${t?.kind === "red" ? "red signal" : "marker"}.`
      : `If you braked now, you would stop in ${fmtDist(bd)}.`;
  const ticks = [];
  for (let m = 100; m < scale; m += scale > 900 ? 200 : 100) ticks.push(m);
  return (
    <Panel style={{ gap: 6 }}>
      <View accessible accessibilityRole="text" accessibilityLabel={`Braking distance. ${msg}${t ? ` ${t.kind === "red" ? "Red signal" : "Stop marker"} in ${fmtDist(t.dist)}.` : ""}`}>
        <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: late ? c.warn : c.ink }}>{msg}</Text>
        <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height: 26, marginTop: 6, justifyContent: "center" }}>
          <View style={{ position: "absolute", left: 0, right: 0, height: 10, borderRadius: 5, backgroundColor: c.sunk, borderWidth: 1, borderColor: c.line }} />
          {ticks.map((m) => <View key={m} style={{ position: "absolute", left: px(m), width: 1, height: 10, backgroundColor: c.line }} />)}
          {!stopped && <View style={{ position: "absolute", left: 0, width: Math.max(4, px(bd)), height: 10, borderRadius: 5, backgroundColor: late ? c.warn : "#F2C230", borderWidth: 1, borderColor: c.ink }} />}
          {t && t.dist >= 0 && (
            <View style={{ position: "absolute", left: px(t.dist) - 2, width: 4, height: 26, borderRadius: 2, backgroundColor: t.kind === "red" ? "#E53935" : c.ink }} />
          )}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: c.soft }}>TRAIN</Text>
          {t && <Text style={{ fontFamily: F.mono, fontSize: 10, color: t.kind === "red" ? c.warn : c.soft }}>{t.kind === "red" ? `RED ${t.label}` : "STOP MARKER"} {fmtDist(t.dist)}</Text>}
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: c.soft }}>{fmtDist(scale)}</Text>
        </View>
      </View>
    </Panel>
  );
}

/**
 * A big notched thumb lever. Slide up for more, or tap a notch. Haptic tick on each notch.
 * Screen readers get an adjustable control with increment and decrement.
 */
export function Lever({ label, value, labels, onChange, tone, height = 176 }: { label: string; value: number; labels: string[]; onChange: (v: number) => void; tone: string; height?: number }) {
  const { c } = useTheme();
  const max = labels.length - 1;
  const y0 = useRef(0);
  const cur = useRef(value);
  const cb = useRef(onChange);
  cur.current = value;
  cb.current = onChange;
  const set = (v: number) => {
    const nv = Math.max(0, Math.min(max, v));
    if (nv !== cur.current) { cur.current = nv; tap(nv === max ? "medium" : "light"); cb.current(nv); }
  };
  const fromY = (y: number) => Math.round((1 - Math.max(0, Math.min(height, y)) / height) * max);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => { y0.current = e.nativeEvent.locationY; set(fromY(y0.current)); },
      onPanResponderMove: (_, g) => set(fromY(y0.current + g.dy)),
    })
  ).current;
  const step = height / max;
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: c.ink }}>{label.toUpperCase()}</Text>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max, now: value, text: labels[value] }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === "increment" ? 1 : -1))}
        {...pan.panHandlers}
        style={{ width: 92, height: height + 28, borderRadius: 22, borderWidth: 2, borderColor: c.ink, backgroundColor: "rgba(255,255,255,0.9)", paddingVertical: 14 }}
      >
        <View pointerEvents="none" style={{ flex: 1 }}>
          <View style={{ position: "absolute", left: 44, width: 4, top: 0, bottom: 0, backgroundColor: "#D8D4CB", borderRadius: 2 }} />
          <View style={{ position: "absolute", left: 44, width: 4, bottom: 0, height: value * step, backgroundColor: tone, borderRadius: 2 }} />
          {labels.map((l, i) => (
            <View key={i} style={{ position: "absolute", top: height - i * step - 8, left: 0, right: 0, flexDirection: "row", alignItems: "center" }}>
              <Text style={{ width: 38, textAlign: "right", fontFamily: F.mono, fontSize: 10, color: i === value ? "#1B1F24" : "#7A828C" }}>{l}</Text>
            </View>
          ))}
          <View style={{ position: "absolute", left: 30, top: height - value * step - 14, width: 32, height: 28, borderRadius: 8, backgroundColor: tone, borderWidth: 2, borderColor: "#1B1F24" }} />
        </View>
      </View>
    </View>
  );
}

export function RoundButton({ label, onPress, children, active }: { label: string; onPress: () => void; children: React.ReactNode; active?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ minWidth: 44, height: 44, paddingHorizontal: 12, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: active ? c.ink : c.surface, borderWidth: 1.5, borderColor: c.ink, opacity: pressed ? 0.8 : 1 })}
    >
      {children}
    </Pressable>
  );
}
