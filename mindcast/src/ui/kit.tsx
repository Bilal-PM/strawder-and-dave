/**
 * Groundwork UI kit. Every screen is built from these so the app feels like one hand-made object.
 */
import * as Haptics from "expo-haptics";
import { router, type Href } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dur, PRESS_SCALE, spring, useMotion } from "./motion";
import { useTheme } from "./theme";
import { F, ON_FILL, onColour, radius, space, TOUCH, type as T } from "./tokens";

/**
 * Haptics. One rule everywhere: "light" for taps and choices, "success" when something is completed or saved,
 * "warn" for a wrong answer or a stop. "medium" is kept only for physical detents (the Open Line levers' end stops).
 */
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
export function Eyebrow({ children, color, style }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.mono, fontSize: T.eyebrow[0], lineHeight: T.eyebrow[1], letterSpacing: 1, textTransform: "uppercase", color: color ?? c.soft }, style]}>{children}</Text>;
}

/* ---------- Press feedback ---------- */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Shared press feedback: a firm spring to 97% and a slight dim. With reduce motion on, only the dim. */
export function usePress(disabled?: boolean) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1), o = useSharedValue(1);
  const base = disabled ? 0.45 : 1;
  const style = useAnimatedStyle(() => ({ opacity: o.get() * base, transform: [{ scale: s.get() }] }), [base]);
  const onPressIn = () => { if (disabled) return; o.set(withTiming(0.86, { duration: dur.instant })); if (!reduce) s.set(withSpring(PRESS_SCALE, spring.press)); };
  const onPressOut = () => { o.set(withTiming(1, { duration: dur.quick })); s.set(withSpring(1, spring.press)); };
  return { style, onPressIn, onPressOut };
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
  return <PressCard base={[base, style]} onPress={onPress} accessibilityLabel={accessibilityLabel}>{children}</PressCard>;
}

function PressCard({ base, onPress, accessibilityLabel, children }: { base: StyleProp<ViewStyle>; onPress: () => void; accessibilityLabel?: string; children: React.ReactNode }) {
  const press = usePress();
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPressIn={press.onPressIn} onPressOut={press.onPressOut} onPress={() => { tap(); onPress(); }} style={[base, press.style]}>
      {children}
    </AnimatedPressable>
  );
}

type BtnKind = "primary" | "secondary" | "pass" | "ghost";
/**
 * Buttons are always at least 44pt tall. `small` only tightens padding and type.
 * `haptic="success"` is for actions that complete something (finish, publish, save).
 */
export function Button({ label, onPress, kind = "secondary", small, icon, disabled, style, accessibilityLabel, haptic = "light" }: { label: string; onPress: () => void; kind?: BtnKind; small?: boolean; icon?: React.ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; haptic?: "light" | "success" }) {
  const { c } = useTheme();
  const press = usePress(disabled);
  const bg = kind === "primary" ? c.ink : kind === "pass" ? c.pass : kind === "ghost" ? "transparent" : c.surface;
  const fg = kind === "primary" ? c.bg : kind === "pass" ? ON_FILL : c.ink;
  const border = kind === "ghost" ? "transparent" : kind === "pass" ? c.pass : c.ink;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => { tap(haptic); onPress(); }}
      style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: TOUCH, paddingHorizontal: small ? 12 : 18, borderRadius: radius.m, borderWidth: 1.5, borderColor: border, backgroundColor: bg }, !small && { minHeight: 50 }, style, press.style]}>
      {icon}
      <Text style={{ fontFamily: F.bodySemi, fontSize: small ? 14 : 16, color: fg }}>{label}</Text>
    </AnimatedPressable>
  );
}

/** Back control used at the top of every pushed screen: a bordered pill, 44pt, "‹ Label". */
export function BackButton({ label = "Back", onPress, fallback = "/" }: { label?: string; onPress?: () => void; fallback?: string }) {
  const { c } = useTheme();
  const press = usePress();
  const go = () => {
    tap();
    if (onPress) return onPress();
    if (router.canGoBack()) router.back(); else router.replace(fallback as Href);
  };
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={label === "Back" ? "Go back" : `Back to ${label}`} onPressIn={press.onPressIn} onPressOut={press.onPressOut} onPress={go} hitSlop={6}
      style={[{ alignSelf: "flex-start", minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", gap: 6 }, press.style]}>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 18, lineHeight: 20, color: c.ink }}>‹</Text>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: c.ink }}>{label}</Text>
    </AnimatedPressable>
  );
}

export function Chip({ label, color, filled, style }: { label: string; color?: string; filled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const col = color ?? c.accent;
  return (
    <View style={[{ alignSelf: "flex-start", borderRadius: radius.s - 2, borderWidth: 1, borderColor: col, backgroundColor: filled ? col : "transparent", paddingHorizontal: 7, paddingVertical: 4 }, style]}>
      <Text style={{ fontFamily: F.mono, fontSize: T.label[0], lineHeight: T.label[1], letterSpacing: 0.8, textTransform: "uppercase", color: filled ? onColour(col) : col }}>{label}</Text>
    </View>
  );
}

/** Segmented choice, e.g. Explorer / Starter / Leader. `showLabel` prints the label above as an eyebrow. */
export function Segmented<V extends string>({ value, options, onChange, label, showLabel }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; label: string; showLabel?: boolean }) {
  const { c } = useTheme();
  const group = (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityLabel={o.label} accessibilityState={{ selected: on }} onPress={() => { if (!on) tap(); onChange(o.value); }} style={({ pressed }) => ({ paddingHorizontal: 14, minHeight: TOUCH, justifyContent: "center", borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : pressed ? c.sunk : c.surface })}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  if (!showLabel) return group;
  return <View style={{ gap: 6 }}><Eyebrow>{label}</Eyebrow>{group}</View>;
}

/** Speech bubble for companions and the crew member. */
/** Speech bubble for companions and the crew member. Rises in when it first appears; the text cross-fades when it changes. */
export function Bubble({ who, text, onClose, onMore }: { who: string; text: string; onClose?: () => void; onMore?: () => void }) {
  const { c } = useTheme();
  const m = useMotion();
  return (
    <Animated.View entering={m.rise()} accessibilityLiveRegion="polite" style={{ backgroundColor: c.surface, borderWidth: 2, borderColor: c.ink, borderRadius: radius.l + 2, padding: space.m, paddingRight: 40, gap: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 0, shadowOffset: { width: 4, height: 4 } }}>
      <Text style={{ fontFamily: F.hand, fontSize: 22, lineHeight: 24, color: c.accent }}>{who}</Text>
      <Animated.Text key={text} entering={m.fade()} style={{ fontFamily: F.body, fontSize: 15, lineHeight: 21, color: c.ink }}>{text}</Animated.Text>
      {onMore && (
        <Pressable accessibilityRole="button" accessibilityLabel={`${who}: say another`} onPress={() => { tap(); onMore(); }} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          style={({ pressed }) => ({ alignSelf: "flex-start", marginTop: 6, minHeight: 32, justifyContent: "center", borderWidth: 1, borderColor: c.line, borderRadius: radius.s, paddingHorizontal: 10, backgroundColor: pressed ? c.sunk : "transparent" })}>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: c.soft }}>Another one</Text>
        </Pressable>
      )}
      {onClose && (
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ position: "absolute", top: 0, right: 0, width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 20, color: c.soft }}>×</Text>
        </Pressable>
      )}
    </Animated.View>
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
      <Text style={{ fontFamily: F.mono, fontSize: T.label[0] - 1, lineHeight: T.label[1], letterSpacing: 0.8, textTransform: "uppercase", color: c.soft }}>{label}</Text>
    </View>
  );
}

/** Pressable with the shared press feedback, for custom tappable things. */
export function Tappable({ children, onPress, style, disabled, ...rest }: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const press = usePress(!!disabled);
  return (
    <AnimatedPressable {...rest} disabled={disabled} onPressIn={press.onPressIn} onPressOut={press.onPressOut} onPress={(e) => { tap(); onPress?.(e); }} style={[style, press.style]}>
      {children}
    </AnimatedPressable>
  );
}

/** Wraps a block so it rises in on first mount. `i` staggers siblings. */
export function Enter({ i = 0, delay = 0, children, style }: { i?: number; delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const m = useMotion();
  return <Animated.View entering={m.rise(i, delay)} style={style}>{children}</Animated.View>;
}

/** The one text field style. Multi-line fields grow from `lines`. */
export function Input({ lines = 1, style, ...p }: TextInputProps & { lines?: number }) {
  const { c } = useTheme();
  const multi = lines > 1;
  return (
    <TextInput placeholderTextColor={c.soft} multiline={multi} numberOfLines={multi ? lines : undefined} {...p}
      style={[{ fontFamily: F.body, fontSize: 16, lineHeight: 22, color: c.ink, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.line, borderRadius: radius.m, paddingHorizontal: space.m, paddingVertical: 11, minHeight: multi ? lines * 22 + 24 : TOUCH + 4, textAlignVertical: multi ? "top" : "center" }, style]} />
  );
}

/** A field with a mono label above it. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}><Eyebrow>{label}</Eyebrow>{children}</View>;
}

/** Empty, missing or error state: say what happened and what to do next. */
export function EmptyState({ eyebrow, title, body, action, onAction }: { eyebrow?: string; title: string; body: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <Enter style={{ gap: space.m, paddingVertical: space.l }}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <H2 accessibilityRole="header">{title}</H2>
      <Body color={c.soft}>{body}</Body>
      {action && onAction ? <Button label={action} kind="primary" onPress={onAction} /> : null}
    </Enter>
  );
}

/** A calm note: hairline rule above, small soft text. Used for caveats at the foot of a screen. */
export function Note({ children, title }: { children: React.ReactNode; title?: string }) {
  const { c } = useTheme();
  return (
    <View accessible style={{ gap: 4, borderTopWidth: 1, borderTopColor: c.line, paddingTop: space.m }}>
      {title ? <Eyebrow>{title}</Eyebrow> : null}
      <Small color={c.soft}>{children}</Small>
    </View>
  );
}

/** Sketch palette from the current theme. */
export function usePal() {
  const { c, dark } = useTheme();
  return { ink: c.ink, paper: c.surface, glass: dark ? "#3E5566" : "#BFD9EA", soft: c.soft };
}
