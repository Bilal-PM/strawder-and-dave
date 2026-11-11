/**
 * Small building blocks for the Learn feature: slider, pill choices, bottom sheet, source chips.
 * All controls are 44pt+ and carry accessibility roles and values.
 */
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Linking, Modal, PanResponder, Pressable, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Source } from "@/domain/types";
import { Body, Button, Eyebrow, H2, Small, tap } from "@/ui/kit";
import { stagger, useMotion } from "@/ui/motion";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import type { Fact } from "./content";

export const announce = (msg: string) => { try { AccessibilityInfo.announceForAccessibility(msg); } catch { /* web without a reader */ } };

/** Entering animation from the shared motion tokens (respects reduce motion). `delay` is in ms. */
export function useEnter(delay = 0) {
  return useMotion().rise(0, delay);
}
export { stagger };

/**
 * Moves a number towards `target` in small steps (a cheap tween for hand-drawn redraws).
 * Jumps straight there when reduce motion is on.
 */
export function useTween(target: number, step = 0.08, ms = 40) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(target);
  useEffect(() => {
    if (reduce) { setV(target); return; }
    const id = setInterval(() => setV((cur) => (Math.abs(target - cur) <= step ? target : Math.round((cur + Math.sign(target - cur) * step) * 1000) / 1000)), ms);
    return () => clearInterval(id);
  }, [target, reduce, step, ms]);
  return v;
}

/* ---------- Slider ---------- */

type SliderProps = {
  value: number; // 0..1
  onChange: (v: number) => void;
  label: string;
  /** Text read out for the current value, e.g. "Hot". */
  valueText: string;
  left: string;
  right: string;
  color?: string;
  steps?: number;
};

/** A chunky, thumb-friendly slider (0..1) that works with touch, mouse and VoiceOver. */
export function Slider({ value, onChange, label, valueText, left, right, color, steps = 24 }: SliderProps) {
  const { c } = useTheme();
  const col = color ?? c.accent;
  const width = useRef(1);
  const startV = useRef(0);
  const last = useRef(value);
  last.current = value;
  const q = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * steps) / steps;
  const set = (v: number) => { const n = q(v); if (n !== last.current) { last.current = n; onChange(n); if (n === 0 || n === 1) tap(); } };
  const setRef = useRef(set);
  setRef.current = set;
  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => { const x = e.nativeEvent.locationX; startV.current = x / width.current; setRef.current(startV.current); },
      onPanResponderMove: (_, g) => setRef.current(startV.current + g.dx / width.current),
    })
  ).current;
  const onLayout = (e: LayoutChangeEvent) => { width.current = Math.max(1, e.nativeEvent.layout.width); };
  return (
    <View style={{ gap: 6 }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: valueText }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => set(last.current + (e.nativeEvent.actionName === "increment" ? 1 : -1) / Math.min(steps, 10))}
        onLayout={onLayout}
        {...pr.panHandlers}
        style={{ height: 44, justifyContent: "center", cursor: "pointer" } as ViewStyle}
      >
        <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: c.sunk, borderWidth: 1, borderColor: c.line }}>
          <View style={{ width: `${value * 100}%`, height: "100%", borderRadius: 4, backgroundColor: col }} />
        </View>
        <View pointerEvents="none" style={{ position: "absolute", left: `${value * 100}%`, marginLeft: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: c.surface, borderWidth: 2.5, borderColor: c.ink, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 0, shadowOffset: { width: 2, height: 2 } }} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: c.soft }}>{left}</Text>
        <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: c.soft }}>{right}</Text>
      </View>
    </View>
  );
}

/* ---------- Pills ---------- */

/** Single-choice pills with 44pt targets. */
export function Pills<T extends string>({ value, options, onChange, label, color, silent }: { value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; color?: string; /** The handler gives its own result haptic. */ silent?: boolean }) {
  const { c } = useTheme();
  const col = color ?? c.ink;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityLabel={o.label} accessibilityState={{ selected: on }} onPress={() => { if (!silent) tap(); onChange(o.value); }}
            style={({ pressed }) => ({ paddingHorizontal: 14, minHeight: 44, justifyContent: "center", borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? col : c.line, backgroundColor: on ? col : c.surface, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? (col === c.ink ? c.bg : "#1B1F24") : c.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Back / Next stepper for sequences (weld, renewal). */
export function Stepper({ i, n, onChange, label, names }: { i: number; n: number; onChange: (i: number) => void; label: string; names: string[] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 4 }} accessibilityLabel={`${label}: step ${i + 1} of ${n}, ${names[i]}`} accessible>
        {Array.from({ length: n }, (_, k) => <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: k <= i ? c.ink : c.line }} />)}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label="Back" small kind="secondary" disabled={i === 0} onPress={() => onChange(i - 1)} style={{ minHeight: 44, flex: 1 }} accessibilityLabel={`Previous step`} />
        <Button label={i === n - 1 ? "Start again" : "Next step"} small kind="primary" onPress={() => onChange(i === n - 1 ? 0 : i + 1)} style={{ minHeight: 44, flex: 2 }} />
      </View>
    </View>
  );
}

/* ---------- Bottom sheet ---------- */

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const m = useMotion();
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View entering={m.scrim()} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,12,15,0.38)" }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View entering={m.sheetIn()} accessibilityViewIsModal accessibilityLabel={label}
          style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: ins.bottom + space.xl, gap: space.m, maxWidth: 760, width: "100%", alignSelf: "center" }}>
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.line, marginBottom: space.s }} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ---------- Sources ---------- */

/** A small chip naming a source; tapping opens a sheet with label, where and link. */
export function SourceChips({ sources }: { sources: Source[] }) {
  const { c } = useTheme();
  const [open, setOpen] = useState<Source | null>(null);
  if (!sources.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {sources.map((s, i) => (
        <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Source: ${s.label}`} hitSlop={8} onPress={() => { tap(); setOpen(s); }}
          style={({ pressed }) => ({ minHeight: 32, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: c.line, backgroundColor: pressed ? c.sunk : c.bg, maxWidth: "100%" })}>
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: c.accent }}>SRC</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, color: c.soft, flexShrink: 1 }}>{s.label}</Text>
        </Pressable>
      ))}
      <Sheet open={!!open} onClose={() => setOpen(null)} label="Source">
        {open && (
          <>
            <Eyebrow>Where this comes from</Eyebrow>
            <H2>{open.label}</H2>
            {open.where ? <Body color={c.soft}>{open.where}</Body> : null}
            {open.url ? <Button label="Open the source" kind="secondary" onPress={() => Linking.openURL(open.url!)} /> : <Small color={c.soft}>A printed book. No link.</Small>}
            <Button label="Done" kind="primary" onPress={() => setOpen(null)} />
          </>
        )}
      </Sheet>
    </View>
  );
}

/** A key fact quoted under a diagram (where its real numbers live). */
export function FactNote({ fact, style }: { fact?: Fact; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  if (!fact) return null;
  return (
    <View style={[{ borderLeftWidth: 3, borderLeftColor: c.pass, paddingLeft: 10, gap: 6 }, style]}>
      <Small>{fact.text}</Small>
      <SourceChips sources={fact.sources} />
    </View>
  );
}

/* ---------- Diagram frame ---------- */

/** Card that holds an interactive diagram: drawing, a status line, the control, and an optional fact. */
export function Frame({ title, hint, status, statusColor, children, control, fact }: { title: string; hint: string; status?: string; statusColor?: string; children: React.ReactNode; control?: React.ReactNode; fact?: Fact }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l, gap: space.m }}>
      <View style={{ gap: 2 }}>
        <Eyebrow>Try it</Eyebrow>
        <Text style={{ fontFamily: F.displaySemi, fontSize: 19, lineHeight: 24, color: c.ink }}>{title}</Text>
        <Small color={c.soft}>{hint}</Small>
      </View>
      <View style={{ backgroundColor: c.bg, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}>{children}</View>
      {status ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: statusColor ?? c.accent }} />
          <Text style={{ flex: 1, fontFamily: F.bodySemi, fontSize: 15, lineHeight: 21, color: c.ink }}>{status}</Text>
        </View>
      ) : null}
      {control}
      <FactNote fact={fact} />
    </View>
  );
}
