/**
 * The ink stamp and the moment it lands.
 *
 * InkStamp      a rough round stamp with the grade and the date, turned slightly, in grade-coloured ink
 * PracticeMark  the rectangular "used it" stamp for practice stamps
 * StampMoment   the landing: a quick drop, a squash and settle, an ink spread, a haptic that scales with rarity,
 *               one line on what it means, the companion's reaction, then "Hold to stick it in the book".
 *               With reduce motion on it fades in instead, and the haptics still play.
 */
import React, { memo, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Modal, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { companionById, pack } from "@/domain";
import type { SpotRarity } from "@/domain/types";
import { CompanionArt } from "@/features/companions/Art";
import { useStore } from "@/state/store";
import { Body, Bubble, Eyebrow, H2, tap, usePal } from "@/ui/kit";
import { dur, spring } from "@/ui/motion";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { hash } from "./logic";

/* ---------- Ink ---------- */

const INK = {
  light: ["#2B59C3", "#9A5B2A", "#5F6B78", "#9A7400"],
  dark: ["#86A8F2", "#D49B69", "#B9C2CC", "#E5C25A"],
} as const;
/** Stamp ink by grade: 1 bronze, 2 silver, 3 gold. Single-grade sets (trains, places) use grade 0: blue ink. */
export const inkFor = (grade: number, dark: boolean, single = false) => (dark ? INK.dark : INK.light)[single ? 0 : Math.max(1, Math.min(3, grade))];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const stampDate = (day: string) => { const [y, m, d] = day.split("-"); return y && m && d ? `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` : ""; };
/** A slight, stable turn for each stamp so a page of them looks hand-stamped. */
export const tilt = (key: string) => (hash(key) % 13) - 6;

/** The round ink stamp (100 x 100 drawing). */
export const InkStamp = memo(function InkStamp({ k, grade, single, day, label, size = 72 }: { k: string; grade: number; single?: boolean; day: string; label?: string; size?: number }) {
  const { dark } = useTheme();
  const pal = usePal();
  const ink = inkFor(grade, dark, single);
  const word = label ?? (single ? "SPOTTED" : ["", "BRONZE", "SILVER", "GOLD"][Math.min(3, grade)]);
  return (
    <View style={{ width: size, height: size, transform: [{ rotate: `${tilt(k)}deg` }] }} accessible accessibilityLabel={`${single ? "Spotted" : `${word.toLowerCase()} stamp`}${day ? `, ${stampDate(day)}` : ""}`}>
      <Sketch w={100} h={100} pal={pal} seed={hash(k) % 97} deps={[ink, word, day]} paint={(p) => {
        // a rough double ring, struck twice slightly off for an inked look
        p.circle(50, 50, 92, null, { stroke: ink, strokeWidth: 3.4, roughness: 1.6 });
        p.circle(50.6, 49.4, 91, null, { stroke: ink, strokeWidth: 1, roughness: 2.2 });
        p.circle(50, 50, 72, null, { stroke: ink, strokeWidth: 1.3, roughness: 1.2 });
        // a few ink flecks in the band between the rings, never over the words
        for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + (hash(k) % 10) / 10, r = 41.5; p.circle(50 + Math.cos(a) * r, 50 + Math.sin(a) * r, 1.6 + (i % 3) * 0.6, ink, { stroke: "none", roughness: 0.4 }); }
        p.text(50, 55, word, word.length > 6 ? 14 : 17, ink, "display", "middle");
        if (day) p.text(50, 71, stampDate(day), 9.5, ink, "mono", "middle");
        if (!single) for (let i = 0; i < 3; i++) p.circle(38 + i * 12, 31, 7, i < grade ? ink : null, { stroke: ink, strokeWidth: 1.3, roughness: 0.6 });
      }} />
    </View>
  );
});

/** A faint dotted ring where a stamp will go. */
export function EmptyStamp({ size = 72 }: { size?: number }) {
  const { c } = useTheme();
  const pal = usePal();
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Sketch w={100} h={100} pal={pal} deps={[c.line]} paint={(p) => p.circle(50, 50, 88, null, { stroke: c.soft, strokeWidth: 1.6, strokeLineDash: [3, 6], roughness: 0.6 })} />
    </View>
  );
}

/** The rectangular practice stamp: "USED IT" and the date. */
export const PracticeMark = memo(function PracticeMark({ k, day, size = 64 }: { k: string; day: string; size?: number }) {
  const { c } = useTheme();
  const pal = usePal();
  return (
    <View style={{ width: size, height: size * 0.62, transform: [{ rotate: `${tilt(k) / 2}deg` }] }} accessible accessibilityLabel={`Practice stamp, ${stampDate(day)}`}>
      <Sketch w={100} h={62} pal={pal} deps={[c.good, day]} paint={(p) => {
        p.rect(4, 4, 92, 54, null, { stroke: c.good, strokeWidth: 3, roughness: 1.6 });
        p.rect(10, 10, 80, 42, null, { stroke: c.good, strokeWidth: 1, roughness: 1.2 });
        p.text(50, 32, "USED IT", 15, c.good, "display", "middle");
        p.text(50, 46, stampDate(day), 9, c.good, "mono", "middle");
      }} />
    </View>
  );
});

/* ---------- The moment ---------- */

/** Haptic weight scales with rarity. */
export const hapticFor = (r: SpotRarity) => (r === "rare" ? "success" : r === "uncommon" ? "medium" : "light");

export type MomentData = {
  key: string;
  name: string;
  rarity: SpotRarity;
  grade: number;
  single: boolean;
  day: string;
  /** "Well spotted." or the gentle correction. */
  feedback: string;
  correct: boolean;
  /** What it means: "2 more and Signals is silver." */
  meaning: string;
  /** Extra line for a review (already gold) or an upgrade. */
  note?: string;
};

const REACT = {
  first: ["That one goes in the book.", "Noted. You'll see it everywhere now.", "First one. They get easier to find."],
  upgrade: ["Another day, another stamp. That's how it sticks.", "Seen again on a different day. Upgraded."],
  gold: ["Gold. Three separate days. You know this one.", "Gold. That one is yours now."],
  review: ["Seen again. Keeps it fresh.", "Still sharp. Good."],
  wrong: ["Close. Look again next time and it'll stick.", "No harm done. Now you know what to look for."],
};

function reaction(d: MomentData, n: number) {
  const pool = !d.correct ? REACT.wrong : d.note === "review" ? REACT.review : d.grade >= 3 && !d.single ? REACT.gold : d.grade > 1 ? REACT.upgrade : REACT.first;
  return pool[n % pool.length];
}

const HOLD_MS = 650;

/** Press and hold to finish. VoiceOver users activate it directly. */
function HoldToStick({ onDone, label }: { onDone: () => void; label: string }) {
  const { c } = useTheme();
  const fill = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; tap("light"); onDone(); };
  const start = () => {
    fill.set(withTiming(1, { duration: HOLD_MS, easing: Easing.linear }));
    timer.current = setTimeout(finish, HOLD_MS);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    if (!done.current) fill.set(withTiming(0, { duration: dur.quick }));
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const bar = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold"
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={finish}
      onPressIn={start}
      onPressOut={stop}
      style={{ minHeight: 54, borderRadius: radius.m, borderWidth: 1.5, borderColor: c.ink, backgroundColor: c.surface, overflow: "hidden", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: c.pass, opacity: 0.5 }, bar]} />
      <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: c.ink, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

/** Full-screen landing for a new stamp. Rare, first-time-per-day moment, so it gets the one big animation. */
export function StampMoment({ data, onDone }: { data: MomentData | null; onDone: () => void }) {
  const { c, dark } = useTheme();
  const ins = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const pet = useStore((s) => s.crew.pet);
  const chatty = useStore((s) => s.settings.chatty);
  const comp = companionById(pet) ?? pack.companions[0];
  const [n] = useState(() => Math.floor(Math.random() * 6));

  const scale = useSharedValue(1), sx = useSharedValue(1), sy = useSharedValue(1), op = useSharedValue(0), spread = useSharedValue(0), spreadOp = useSharedValue(0), after = useSharedValue(0);
  useEffect(() => {
    if (!data) return;
    const DROP = 170;
    if (reduce) {
      scale.set(1); sx.set(1); sy.set(1); spread.set(1); spreadOp.set(0);
      op.set(0); op.set(withTiming(1, { duration: dur.quick }));
      after.set(0); after.set(withTiming(1, { duration: dur.quick }));
    } else {
      op.set(0); scale.set(1.9); sx.set(1); sy.set(1); spread.set(0.55); spreadOp.set(0); after.set(0);
      op.set(withTiming(1, { duration: DROP * 0.6 }));
      scale.set(withSequence(withTiming(1, { duration: DROP, easing: Easing.in(Easing.quad) }), withSpring(1, spring.settle)));
      // squash on impact, then settle
      sx.set(withDelay(DROP, withSequence(withTiming(1.08, { duration: 70 }), withSpring(1, spring.settle))));
      sy.set(withDelay(DROP, withSequence(withTiming(0.88, { duration: 70 }), withSpring(1, spring.settle))));
      // ink spreads out from under the stamp and fades
      spreadOp.set(withDelay(DROP, withSequence(withTiming(0.32, { duration: 40 }), withTiming(0, { duration: dur.slow + 160 }))));
      spread.set(withDelay(DROP, withTiming(1.35, { duration: dur.slow + 160, easing: Easing.out(Easing.cubic) })));
      after.set(withDelay(DROP + dur.base, withTiming(1, { duration: dur.base })));
    }
    // The haptic lands with the stamp, and plays with reduce motion on too.
    const id = setTimeout(() => tap(hapticFor(data.rarity)), reduce ? 0 : DROP);
    try { AccessibilityInfo.announceForAccessibility(`${data.name} stamped. ${data.feedback} ${data.meaning}`); } catch { /* web */ }
    return () => clearTimeout(id);
  }, [data, reduce, scale, sx, sy, op, spread, spreadOp, after]);

  const stampStyle = useAnimatedStyle(() => ({ opacity: op.get(), transform: [{ scale: scale.get() }, { scaleX: sx.get() }, { scaleY: sy.get() }] }));
  const spreadStyle = useAnimatedStyle(() => ({ opacity: spreadOp.get(), transform: [{ scale: spread.get() }] }));
  const afterStyle = useAnimatedStyle(() => ({ opacity: after.get() }));
  if (!data) return null;
  const ink = inkFor(data.grade, dark, data.single);
  const eyebrow = data.single ? (data.key.startsWith("place.") ? "Stamped" : "Underlined in your book") : data.note === "review" ? "Seen again" : `${["", "Bronze", "Silver", "Gold"][Math.min(3, data.grade)]} stamp`;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDone} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top + space.xl, paddingBottom: ins.bottom + space.l, paddingHorizontal: space.xl, justifyContent: "center" }}>
        <View accessibilityViewIsModal style={{ maxWidth: 480, width: "100%", alignSelf: "center", gap: space.l }}>
          <View style={{ alignItems: "center", justifyContent: "center", height: 220 }}>
            <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: ink }, spreadStyle]} />
            <Animated.View style={stampStyle}>
              <InkStamp k={data.key + data.day} grade={data.grade} single={data.single} day={data.day} size={190} />
            </Animated.View>
          </View>
          <Animated.View style={[{ gap: space.s }, afterStyle]}>
            <Eyebrow color={ink} style={{ textAlign: "center" }}>{eyebrow}</Eyebrow>
            <H2 center accessibilityRole="header">{data.name}</H2>
            <Body center color={data.correct ? c.ink : c.soft}>{data.feedback}</Body>
            <Text style={{ fontFamily: F.hand, fontSize: 26, lineHeight: 28, color: c.accent, textAlign: "center" }}>{data.meaning}</Text>
          </Animated.View>
          {chatty && comp && (
            <Animated.View style={[{ flexDirection: "row", gap: space.s, alignItems: "flex-end" }, afterStyle]}>
              <CompanionArt id={comp.id} size={56} />
              <View style={{ flex: 1 }}><Bubble who={comp.name} text={`${comp.tag}${reaction(data, n)}`} /></View>
            </Animated.View>
          )}
          <Animated.View style={[{ gap: 6 }, afterStyle]}>
            <HoldToStick label="Hold to stick it in the book" onDone={onDone} />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
