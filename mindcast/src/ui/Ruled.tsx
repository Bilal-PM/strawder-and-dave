/**
 * Exercise-book paper for writing surfaces: faint blue rules at the text line height and a thin red margin.
 * Plain Views, not rough.js, so a long note stays cheap. Text sits on the rules because the writing uses the same
 * line height (`RULE`) and starts at a rule boundary.
 */
import React, { useState } from "react";
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { useTheme } from "./theme";
import { F, radius, TOUCH } from "./tokens";

/** Line pitch for ruled writing, in points. */
export const RULE = 28;
/** Where the rule sits inside each line: just under the baseline of 16pt body text (and 22pt Caveat). */
const BASELINE = 21;
/** The margin line's distance from the left edge, and where writing starts. */
export const MARGIN = 30;
export const WRITE_LEFT = MARGIN + 10;
/** Height of a single-line ruled field (over the 44pt minimum). */
const SINGLE_H = TOUCH + 4;

/** Rules and a margin line behind `children`. `top` is where the first line of writing starts. */
export function RuledLines({ top = 0, margin = true, marginX = MARGIN, minLines = 1 }: { top?: number; margin?: boolean; marginX?: number; minLines?: number }) {
  const { c } = useTheme();
  const [h, setH] = useState(0);
  const n = Math.max(minLines, Math.floor((h - top - BASELINE) / RULE) + 1);
  return (
    <View pointerEvents="none" onLayout={(e) => setH(e.nativeEvent.layout.height)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: h ? n : 0 }, (_, i) => (
        <View key={i} style={{ position: "absolute", left: 0, right: 0, top: top + BASELINE + i * RULE, height: 1, backgroundColor: c.rule }} />
      ))}
      {margin && <View style={{ position: "absolute", top: 0, bottom: 0, left: marginX, width: 1, backgroundColor: c.margin }} />}
    </View>
  );
}

/** A sheet of ruled paper to write on: a ruled block for a note list or a journal. */
export function RuledPage({ children, style, top = 8, marginX = MARGIN }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; top?: number; marginX?: number }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, overflow: "hidden", paddingTop: top, paddingBottom: RULE - BASELINE }, style]}>
      <RuledLines top={top} marginX={marginX} />
      {children}
    </View>
  );
}

/** The text field on ruled paper. Multi-line fields grow from `lines`. */
export function RuledInput({ lines = 1, style, ...p }: TextInputProps & { lines?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const multi = lines > 1;
  const pad = 8;
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.m, borderWidth: 1.5, borderColor: focused ? c.ink : c.line, overflow: "hidden" }, style]}>
      {/* A single-line field centres its text in the box, so its one rule sits just under that centre line. */}
      <RuledLines top={multi ? pad : SINGLE_H / 2 + 8 - BASELINE} minLines={lines} />
      <TextInput
        placeholderTextColor={c.soft}
        multiline={multi}
        numberOfLines={multi ? lines : undefined}
        {...p}
        onFocus={(e) => { setFocused(true); p.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); p.onBlur?.(e); }}
        style={{ fontFamily: F.body, fontSize: 16, lineHeight: RULE, color: c.ink, backgroundColor: "transparent", paddingLeft: WRITE_LEFT, paddingRight: 12, paddingTop: multi ? pad : 0, paddingBottom: multi ? pad : 0, ...(multi ? { minHeight: lines * RULE + pad * 2, textAlignVertical: "top" as const } : { height: SINGLE_H }) }}
      />
    </View>
  );
}
