/**
 * "What do you think happens?" chips, drawn in the scene. A reusable scene piece for a playful guess before
 * the drawing acts something out. It is never marked right or wrong: the guess is circled, the other chips
 * fade away, and the drawing shows what happens.
 *
 * Use it in a scene in three parts:
 *   const guess = useGuess(reduced);                                   // state and one shared value per chip
 *   <GuessArt c={c} question=… choices=… at={GEO} guess={guess} />    // inside <StageSvg>
 *   <GuessTouch choices=… at={GEO} guess={guess} onGuess={…} />        // after <StageSvg>: 44pt touch targets
 * Mark the scene `interactive` and give it a `before` caption (see types.ts), and call `api.reveal()` in
 * onGuess so the caption changes from the question to the explanation.
 */
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { tap } from "@/ui/kit";
import { seg, wave } from "./living";
import { Layer, unitRect, useArt, useStage, type Clocks, type Tick } from "./layers";

export type GuessChoice = { id: string; label: string };
/** Where the chips sit, in drawing units: first chip's box, and the step between chips. */
export type GuessGeo = { x: number; y: number; w: number; h: number; step: number };

const FADE_MS = 280;

export type Guess = {
  picked: string | null;
  pick: (id: string, index: number) => void;
  /** Per chip: 1 = shown, 0 = gone. */
  shown: SharedValue<number>[];
  /** Per chip: 1 = circled as the learner's guess. */
  circled: SharedValue<number>[];
  /** 1 while the question is asked, 0 once a guess is in. */
  asking: SharedValue<number>;
};

/** Guess state for up to three chips. */
export function useGuess(reduced: boolean): Guess {
  const [picked, setPicked] = useState<string | null>(null);
  const s0 = useSharedValue(1), s1 = useSharedValue(1), s2 = useSharedValue(1);
  const c0 = useSharedValue(0), c1 = useSharedValue(0), c2 = useSharedValue(0);
  const asking = useSharedValue(1);
  return useMemo(() => {
    const shown = [s0, s1, s2], circled = [c0, c1, c2];
    const to = (v: number) => (reduced ? v : withTiming(v, { duration: FADE_MS }));
    return {
      picked,
      shown,
      circled,
      asking,
      pick: (id: string, index: number) => {
        if (picked) return;
        setPicked(id);
        asking.set(to(0));
        shown.forEach((s, i) => { if (i !== index) s.set(to(0)); });
        circled[index].set(to(1));
      },
    };
  }, [picked, reduced, s0, s1, s2, c0, c1, c2, asking]);
}

const shownPose = (t: Tick) => {
  "worklet";
  return { o: t.x };
};
const circlePose = (t: Tick) => {
  "worklet";
  return { o: t.x, s: 0.94 + 0.06 * t.x };
};
const questionPose = (t: Tick) => {
  "worklet";
  // The question rises in with the scene and bobs a hair while it waits.
  const p = seg(t.shot, 0, 400);
  return { o: t.x, y: 4 * (1 - p) + 0.8 * wave(t.loop, 3000) };
};

/** The question and the chips, drawn in the scene's style. */
export function GuessArt({ c, question, choices, at, guess }: { c: Clocks; question: string; choices: GuessChoice[]; at: GuessGeo; guess: Guess }) {
  const key = `guess/${question}/${choices.map((ch) => ch.label).join("|")}/${at.x},${at.y},${at.w},${at.h},${at.step}`;
  const a = useArt(key, (part, k) => ({
    question: part((p) => p.text(at.x + at.w / 2, at.y - 14, question, 22, k.ink, "hand")),
    chips: choices.map((ch, i) => part((p) => {
      const y = at.y + i * at.step;
      p.rect(at.x, y, at.w, at.h, k.surface, { roughness: 0.9, strokeWidth: 1.8 });
      p.text(at.x + at.w / 2, y + at.h / 2 + 7, ch.label, 22, k.ink, "hand");
    })),
    rings: choices.map((_, i) => part((p) => {
      const y = at.y + i * at.step;
      p.ellipse(at.x + at.w / 2, y + at.h / 2, at.w + 18, at.h + 16, null, { stroke: k.accent, strokeWidth: 2.4, roughness: 1.2 });
      p.text(at.x + at.w + 4, y - 6, "your guess", 15, k.accent, "hand", "end");
    })),
  }));
  return (
    <>
      <Layer c={{ ...c, x: guess.asking }} pose={questionPose} nodes={a.question} />
      {choices.map((ch, i) => (
        <Layer key={ch.id} c={{ ...c, x: guess.shown[i] }} pose={shownPose} nodes={a.chips[i]}>
          <Layer c={{ ...c, x: guess.circled[i] }} pose={circlePose} pivot={[at.x + at.w / 2, at.y + i * at.step + at.h / 2]} nodes={a.rings[i]} />
        </Layer>
      ))}
    </>
  );
}

/** Touch targets over the chips (at least 44pt), labelled for screen readers. */
export function GuessTouch({ choices, at, guess, onGuess, question }: { choices: GuessChoice[]; at: GuessGeo; guess: Guess; onGuess: (id: string) => void; question: string }) {
  const box = useStage();
  if (guess.picked) return null;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={question} style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {choices.map((ch, i) => (
        <Pressable key={ch.id} accessibilityRole="radio" accessibilityLabel={`Guess: ${ch.label}`} accessibilityState={{ selected: false }}
          onPress={() => { tap("light"); guess.pick(ch.id, i); onGuess(ch.id); }}
          style={unitRect(box, at.x, at.y + i * at.step, at.w, at.h)} />
      ))}
    </View>
  );
}
