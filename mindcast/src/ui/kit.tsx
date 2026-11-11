/**
 * Groundwork UI kit. Every screen is built from these so the app feels like one hand-made object.
 */
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import Svg, { Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./theme";
import { F, radius, space, type as T } from "./tokens";

export const tap = (kind: "light" | "medium" | "success" | "warn" = "light") => {
  if (Platform.OS === "web") return;
  if (kind === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "warn") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else Haptics.impactAsync(kind === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
};

type Tx = TextProps & { color?: string; style?: StyleProp<TextStyle>; center?: boolean };
const mk = (family: string, size: readonly [number, number], extra: TextStyle = {}) =>
  function Typo({ color, style, center, ...p }: Tx) {
    const { c } = useTheme();
    return <Text {...p} style={[{ fontFamily: family, fontSize: size[0], lineHeight: size[1], color: color ?? c.ink, textAlign: center ? "center" : undefined }, extra, style]} />;
  };
export const Hero = mk(F.display, T.hero, { letterSpacing: -0.8 });
export const H1 = mk(F.display, T.h1, { letterSpacing: -0.4 });
export const H2 = mk(F.display, T.h2, { letterSpacing: -0.2 });
export const H3 = mk(F.displaySemi, T.h3);
export const Body = mk(F.body, T.body);
export const BodyB = mk(F.bodySemi, T.body);
export const Small = mk(F.body, T.small);
export const Hand = mk(F.hand, T.hand);
export const Mono = mk(F.mono, T.tiny, { letterSpacing: 0.6 });

/** Uppercase mono label above headings. */
export function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: color ?? c.soft }}>{children}</Text>;
}

/** Paper grid background, like the website. */
export function PaperGrid() {
  const { c } = useTheme();
  const lines = [];
  for (let i = 0; i < 40; i++) lines.push(<Line key={`v${i}`} x1={i * 28} y1={0} x2={i * 28} y2={3000} stroke={c.grid} strokeWidth={1} />);
  for (let i = 0; i < 110; i++) lines.push(<Line key={`h${i}`} x1={0} y1={i * 28} x2={1200} y2={i * 28} stroke={c.grid} strokeWidth={1} />);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">{lines}</Svg>
    </View>
  );
}

/** Standard scrolling screen: paper background, safe areas, comfortable gutters. */
export function Screen({ children, scroll = true, pad = true, grid = true, style }: { children: React.ReactNode; scroll?: boolean; pad?: boolean; grid?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const inner = <View style={[{ paddingHorizontal: pad ? space.l : 0, paddingTop: ins.top + space.m, paddingBottom: ins.bottom + 96, gap: space.l, maxWidth: 760, width: "100%", alignSelf: "center" }, style]}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {grid && <PaperGrid />}
      {scroll ? <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
    </View>
  );
}

export function Card({ children, style, tone, onPress, accessibilityLabel }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: "pass" | "board" | "sunk"; onPress?: () => void; accessibilityLabel?: string }) {
  const { c } = useTheme();
  const base: ViewStyle = { backgroundColor: tone === "board" ? c.board : tone === "sunk" ? c.sunk : c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: tone === "board" ? c.board : c.line, padding: space.l, gap: space.s, ...(tone === "pass" ? { borderTopWidth: 6, borderTopColor: c.pass } : null) };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => { tap(); onPress(); }} style={({ pressed }) => [base, pressed && { transform: [{ scale: 0.985 }], opacity: 0.94 }, style]}>
      {children}
    </Pressable>
  );
}

type BtnKind = "primary" | "secondary" | "pass" | "ghost";
export function Button({ label, onPress, kind = "secondary", small, icon, disabled, style, accessibilityLabel }: { label: string; onPress: () => void; kind?: BtnKind; small?: boolean; icon?: React.ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const { c } = useTheme();
  const bg = kind === "primary" ? c.ink : kind === "pass" ? c.pass : kind === "ghost" ? "transparent" : c.surface;
  const fg = kind === "primary" ? c.bg : kind === "pass" ? "#1B1F24" : c.ink;
  const border = kind === "ghost" ? "transparent" : kind === "pass" ? c.pass : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => { tap(kind === "primary" ? "medium" : "light"); onPress(); }}
      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: small ? 36 : 48, paddingHorizontal: small ? 12 : 18, borderRadius: radius.m, borderWidth: 1.5, borderColor: border, backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {icon}
      <Text style={{ fontFamily: F.bodySemi, fontSize: small ? 14 : 16, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, color, filled, style }: { label: string; color?: string; filled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const col = color ?? c.accent;
  return (
    <View style={[{ alignSelf: "flex-start", borderRadius: 4, borderWidth: 1, borderColor: col, backgroundColor: filled ? col : "transparent", paddingHorizontal: 7, paddingVertical: 4 }, style]}>
      <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: filled ? "#1B1F24" : col }}>{label}</Text>
    </View>
  );
}

/** Segmented choice, e.g. Explorer / Starter / Leader. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); onChange(o.value); }} style={{ paddingHorizontal: 14, minHeight: 40, justifyContent: "center", borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Speech bubble for companions and the crew member. */
export function Bubble({ who, text, onClose, onMore }: { who: string; text: string; onClose?: () => void; onMore?: () => void }) {
  const { c } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.surface, borderWidth: 2, borderColor: c.ink, borderRadius: 16, padding: 12, paddingRight: 34, gap: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 0, shadowOffset: { width: 4, height: 4 } }}>
      <Text style={{ fontFamily: F.hand, fontSize: 22, color: c.accent }}>{who}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 21, color: c.ink }}>{text}</Text>
      {onMore && <Pressable accessibilityRole="button" onPress={onMore} style={{ alignSelf: "flex-start", marginTop: 4, borderWidth: 1, borderColor: c.line, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ fontFamily: F.mono, fontSize: 12, color: c.soft }}>Another one</Text></Pressable>}
      {onClose && <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={{ position: "absolute", top: 6, right: 8 }}><Text style={{ fontSize: 18, color: c.soft }}>×</Text></Pressable>}
    </View>
  );
}

export function Row({ children, gap = space.s, wrap, style }: { children: React.ReactNode; gap?: number; wrap?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap, flexWrap: wrap ? "wrap" : "nowrap" }, style]}>{children}</View>;
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 70, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.m, padding: 10 }}>
      <Text style={{ fontFamily: F.display, fontSize: 24, color: c.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: c.soft }}>{label}</Text>
    </View>
  );
}

/** Pressable with press feedback, for custom tappable things. */
export function Tappable({ children, onPress, style, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <Pressable {...rest} onPress={(e) => { tap(); onPress?.(e); }} style={({ pressed }) => [style as ViewStyle, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
      {children}
    </Pressable>
  );
}

/** Sketch palette from the current theme. */
export function usePal() {
  const { c, dark } = useTheme();
  return { ink: c.ink, paper: c.surface, glass: dark ? "#3E5566" : "#BFD9EA", soft: c.soft };
}
