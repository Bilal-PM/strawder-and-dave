/**
 * The story player: a full-screen illustrated story for one stop.
 *
 *  - Progress segments at the top; tap the right edge (or the drawing) to go on, the left edge to go back,
 *    or swipe. Scenes the learner works in keep their middle for the drawing.
 *  - Only the scene on screen is mounted, and its clocks run only while the screen is focused and the app is
 *    in the foreground ("nothing runs unseen"). Its one-shot plays each time it becomes active.
 *  - The depth switch (Explorer / Starter / Leader) changes the caption only. Drawings never change with it.
 *  - Reduced motion: scene clocks freeze (loops at frame 0, one-shots at their final frame) and scene
 *    changes become a short fade.
 */
import { router, useIsFocused } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, PanResponder, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Audience, Lesson } from "@/domain/types";
import { useStore } from "@/state/store";
import { PaperGrid, tap } from "@/ui/kit";
import { dur, ease } from "@/ui/motion";
import { useTheme } from "@/ui/theme";
import { F, radius, space, TOUCH } from "@/ui/tokens";
import { Celebration, completeStop, type CelebrationData } from "@/features/learn/Celebration";
import { announce } from "@/features/learn/ui";
import { StageCtx, stageBox, type StageBox } from "./layers";
import { speakCaption, stopSpeaking } from "./speech";
import type { Story, StoryApi } from "./types";

const DEPTHS: { value: Audience; label: string }[] = [
  { value: "explorer", label: "Explorer" },
  { value: "starter", label: "Starter" },
  { value: "leader", label: "Leader" },
];

/** Edge tap zones (points). The drawing keeps everything between them. */
const EDGE = 64;
/** Caption box height: fixed, so the drawing above never moves when the words change. */
const CAPTION_H = 168;

/** True while the app is in the foreground. */
function useAppActive() {
  const [on, setOn] = useState(AppState.currentState !== "background");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setOn(s === "active"));
    return () => sub.remove();
  }, []);
  return on;
}

function close() {
  stopSpeaking();
  if (router.canGoBack()) router.back();
  else router.replace("/line");
}

function Segment({ state }: { state: "done" | "current" | "next" }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const fill = useSharedValue(state === "next" ? 0 : state === "done" || reduce ? 1 : 0);
  useEffect(() => {
    const to = state === "next" ? 0 : 1;
    fill.set(reduce ? to : withTiming(to, { duration: dur.base, easing: ease.out }));
  }, [state, reduce, fill]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.get() }] }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.line, overflow: "hidden" }}>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, right: 0, backgroundColor: state === "current" ? c.accent : c.ink, transformOrigin: "left" }, st]} />
    </View>
  );
}

/** The compact depth switch in the header (44pt targets). */
function DepthSwitch({ value, onChange }: { value: Audience; onChange: (a: Audience) => void }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Depth of the words" style={{ flexDirection: "row", borderWidth: 1.5, borderColor: c.line, borderRadius: radius.m, backgroundColor: c.surface, padding: 2 }}>
      {DEPTHS.map((d) => {
        const on = d.value === value;
        return (
          <Pressable key={d.value} accessibilityRole="radio" accessibilityLabel={d.label} accessibilityState={{ selected: on }} onPress={() => { if (!on) { tap(); onChange(d.value); } }}
            style={({ pressed }) => ({ minHeight: TOUCH - 4, paddingHorizontal: 10, justifyContent: "center", borderRadius: radius.m - 2, backgroundColor: on ? c.ink : pressed ? c.sunk : "transparent" })}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: on ? c.bg : c.ink }}>{d.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SmallButton({ label, onPress, a11y, icon }: { label: string; onPress: () => void; a11y?: string; icon?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y ?? label} onPress={() => { tap(); onPress(); }} hitSlop={4}
      style={({ pressed }) => ({ minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: 12, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: radius.m, borderWidth: 1.5, borderColor: c.line, backgroundColor: pressed ? c.sunk : c.surface })}>
      {icon ? <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: c.ink }}>{icon}</Text> : null}
      <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

export function StoryPlayer({ lesson, story, start = 0 }: { lesson: Lesson; story: Story; start?: number }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const profileAudience = useStore((s) => s.profile.audience);
  const [depth, setDepth] = useState<Audience>(profileAudience ?? "starter");
  const n = story.scenes.length;
  const [i, setI] = useState(Math.max(0, Math.min(n - 1, start)));
  const [dir, setDir] = useState<1 | -1>(1);
  const [cele, setCele] = useState<CelebrationData | null>(null);
  const [box, setBox] = useState<StageBox>(() => stageBox(390, 480));
  const [speaking, setSpeaking] = useState(false);
  /** Scenes that have shown their answer (a guess scene keeps its question caption until then). */
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const scene = story.scenes[i];
  const active = focused && appActive && !cele;

  const go = useCallback((to: number) => {
    if (to < 0 || to >= n || to === i) return;
    tap("light");
    stopSpeaking();
    setSpeaking(false);
    setDir(to > i ? 1 : -1);
    // A scene starts fresh each time it is shown, so its guess is asked again.
    setRevealed((r) => ({ ...r, [story.scenes[to].id]: false }));
    setI(to);
  }, [i, n, story.scenes]);
  const next = useCallback(() => go(i + 1), [go, i]);
  const back = useCallback(() => go(i - 1), [go, i]);

  // Tell screen readers where they are when the scene changes.
  useEffect(() => { announce(`Scene ${i + 1} of ${n}. ${scene.eyebrow}.`); }, [i, n, scene.eyebrow]);
  useEffect(() => () => stopSpeaking(), []);

  const openNotes = useCallback(() => {
    stopSpeaking();
    router.push({ pathname: "/lesson/[id]", params: { id: lesson.id, view: "notes" } });
  }, [lesson.id]);

  const sceneId = scene.id;
  const api: StoryApi = useMemo(() => ({
    next,
    openNotes,
    reveal: () => setRevealed((r) => ({ ...r, [sceneId]: true })),
    finish: (score, total) => {
      stopSpeaking();
      setCele(completeStop(lesson, { score, total, scoreLabel: "quick check" }));
    },
  }), [next, openNotes, lesson, sceneId]);

  // Swipe left/right anywhere (the drawing's own drags claim the touch first).
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -40) next();
      else if (g.dx > 40) back();
    },
  }), [next, back]);

  const onStage = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (Math.abs(b.w - width) < 0.5 && Math.abs(b.h - height) < 0.5 ? b : stageBox(width, height)));
  };

  const caption = scene.before && !revealed[scene.id] ? scene.before[depth] : scene.caption[depth];
  const read = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(true);
    speakCaption(caption, () => setSpeaking(false));
  };

  const enter = reduced ? FadeIn.duration(dur.quick).reduceMotion(ReduceMotion.Never) : (dir > 0 ? FadeInRight : FadeInLeft).duration(dur.base);
  const exit = FadeOut.duration(dur.quick).reduceMotion(ReduceMotion.Never);
  const capSize = depth === "explorer" ? [24, 30] : depth === "leader" ? [19, 25] : [21, 27];
  const Art = scene.Art;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} {...swipe.panHandlers}>
      <PaperGrid />
      <View style={{ paddingTop: ins.top + 6, paddingHorizontal: space.l, gap: 10 }}>
        <View accessibilityRole="progressbar" accessibilityLabel={`Scene ${i + 1} of ${n}`} style={{ flexDirection: "row", gap: 4 }}>
          {story.scenes.map((s, k) => <Segment key={s.id} state={k < i ? "done" : k === i ? "current" : "next"} />)}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close the story" onPress={() => { tap(); close(); }} hitSlop={4}
            style={({ pressed }) => ({ width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, borderWidth: 1.5, borderColor: c.line, backgroundColor: pressed ? c.sunk : c.surface, alignItems: "center", justifyContent: "center" })}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 22, lineHeight: 24, color: c.ink }}>×</Text>
          </Pressable>
          <DepthSwitch value={depth} onChange={(d) => { stopSpeaking(); setSpeaking(false); setDepth(d); }} />
        </View>
      </View>

      {/* The drawing: most of the screen. */}
      <View style={{ flex: 1, overflow: "hidden" }} onLayout={onStage}>
        <StageCtx.Provider value={box}>
          <Animated.View key={scene.id} entering={enter} exiting={exit} style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
            <Art active={active} reduced={reduced} depth={depth} lesson={lesson} api={api} />
          </Animated.View>
        </StageCtx.Provider>
        {!scene.interactive && (
          <Pressable accessible={false} importantForAccessibility="no" onPress={next} style={{ position: "absolute", left: EDGE, right: EDGE, top: 0, bottom: 0 }} />
        )}
        <EdgeZone side="left" onPress={back} disabled={i === 0} />
        <EdgeZone side="right" onPress={next} disabled={i === n - 1} />
      </View>

      {/* The caption: real text, set large, in a box that never changes size. */}
      <Pressable accessible={false} importantForAccessibility="no" onPress={scene.interactive ? undefined : next} style={{ height: CAPTION_H, paddingHorizontal: space.xl, paddingTop: space.s, gap: 6 }}>
        <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: c.soft }}>{i + 1} · {scene.eyebrow}</Text>
        <Animated.Text key={`${scene.id}-${depth}-${caption.length}`} entering={FadeIn.duration(dur.base).reduceMotion(ReduceMotion.Never)} accessibilityLiveRegion="polite"
          style={{ fontFamily: depth === "explorer" ? F.display : F.displaySemi, fontSize: capSize[0], lineHeight: capSize[1], letterSpacing: depth === "explorer" ? -0.3 : -0.2, color: c.ink }}>
          {caption}
        </Animated.Text>
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.l, paddingBottom: ins.bottom + space.s, paddingTop: 4 }}>
        <SmallButton label={speaking ? "Stop" : "Read to me"} a11y={speaking ? "Stop reading" : "Read the words aloud"} onPress={read} />
        <Text style={{ fontFamily: F.mono, fontSize: 12, color: c.soft, fontVariant: ["tabular-nums"] }}>{i + 1} / {n}</Text>
        <SmallButton label="Full notes" a11y="Open the full notes for this stop" onPress={openNotes} />
      </View>

      <Celebration data={cele} onDone={() => { setCele(null); router.navigate("/line"); }} onNext={(nx) => { setCele(null); router.replace({ pathname: "/lesson/[id]", params: { id: nx.id } }); }} />
    </View>
  );
}

/** A tall edge strip that turns the page. Faint chevron so people find it; a real button for screen readers. */
function EdgeZone({ side, onPress, disabled }: { side: "left" | "right"; onPress: () => void; disabled: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={side === "left" ? "Previous scene" : "Next scene"} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={{ position: "absolute", top: 0, bottom: 0, [side]: 0, width: EDGE, alignItems: side === "left" ? "flex-start" : "flex-end", justifyContent: "center", paddingHorizontal: 6 }}>
      {({ pressed }) => (
        <View style={{ width: 30, height: 44, borderRadius: radius.m, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.sunk : "transparent", opacity: disabled ? 0 : 1 }}>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 26, lineHeight: 30, color: c.soft, opacity: 0.55 }}>{side === "left" ? "‹" : "›"}</Text>
        </View>
      )}
    </Pressable>
  );
}
