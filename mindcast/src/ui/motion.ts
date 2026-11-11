/**
 * Groundwork motion tokens.
 *
 * Motion is for meaning and feedback only: something arrived, something changed, you did it. Keep it calm and quick.
 * With reduce motion on, nothing moves: entrances become short fades and imperative animations jump to their end.
 *
 *   dur      durations in ms (quick for feedback, base for entrances, slow for moments, glide for travel)
 *   ease     timing curves (out for arrivals, inOut for travel, in for departures)
 *   spring   spring configs (press for touch feedback, settle for things landing, lively for companions)
 *   stagger  delay for the i-th item in a list, capped so long lists don't keep you waiting
 *   useMotion()  layout-animation builders that already respect reduce motion
 *
 * Diagrams (`src/features/learn/diagrams`) should use these tokens too.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Easing, FadeIn, FadeInDown, FadeInRight, FadeOut, ReduceMotion, SlideInDown, SlideOutDown, ZoomIn, useReducedMotion } from "react-native-reanimated";

export const dur = {
  /** Press feedback, tiny state flips. */
  instant: 100,
  /** Feedback: a chip appears, a check lands. */
  quick: 180,
  /** Entrances: cards, sheets, text swaps. */
  base: 280,
  /** Moments: a celebration beat, a confirmation. */
  slow: 420,
  /** Travel: the train moving along the line. */
  glide: 900,
  /** One breath of a looping pulse. */
  pulse: 1600,
} as const;

export const ease = {
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  in: Easing.in(Easing.cubic),
} as const;

export const spring = {
  /** Touch feedback on cards and buttons: firm, no wobble. */
  press: { damping: 26, stiffness: 520, mass: 0.6 },
  /** Something landing in place: one small settle. */
  settle: { damping: 16, stiffness: 220, mass: 0.8 },
  /** Companions and the crew member: a little character. */
  lively: { damping: 10, stiffness: 260, mass: 0.7 },
} as const;

/** Scale a pressed card or button shrinks to. */
export const PRESS_SCALE = 0.97;
/** Default gap between staggered items. */
export const STAGGER = 55;

/** Delay for the i-th item of a list. Caps at `max` items so long lists never feel slow. */
export const stagger = (i: number, step: number = STAGGER, max = 6) => Math.min(Math.max(0, i), max) * step;

/** A fade that still plays when the system asks for reduced motion (fades are not movement). */
const fadeOnly = (delay = 0) => FadeIn.duration(dur.quick).delay(Math.min(delay, 120)).reduceMotion(ReduceMotion.Never);

/**
 * Layout-animation builders for `entering` / `exiting`, already respecting reduce motion.
 * Only plain presets with duration and delay: `withInitialValues` and custom easings break or fall back to linear
 * in reanimated's web build, which we use for previews and QA.
 */
export function motionFor(reduce: boolean) {
  return {
    reduce,
    /** Cards and blocks arriving: a short rise and fade. Pass the item index for a stagger. */
    rise: (i = 0, extraDelay = 0) =>
      reduce ? fadeOnly(stagger(i) + extraDelay) : FadeInDown.duration(dur.base).delay(stagger(i) + extraDelay),
    /** Content swapping in place (a new depth of text, an answer's explanation). */
    fade: (delay = 0) => (reduce ? fadeOnly(delay) : FadeIn.duration(dur.base).delay(delay)),
    /** Next item in a sequence (quiz question). */
    next: () => (reduce ? fadeOnly() : FadeInRight.duration(dur.base)),
    /** A small confirmation landing (a stamp, a tick, a score). Keep it for small things: it scales up from nothing. */
    pop: (delay = 0) => (reduce ? fadeOnly(delay) : ZoomIn.duration(dur.base).delay(delay)),
    /** A bottom sheet arriving and leaving. */
    sheetIn: () => (reduce ? fadeOnly() : SlideInDown.duration(dur.base)),
    sheetOut: () => (reduce ? FadeOut.duration(dur.instant).reduceMotion(ReduceMotion.Never) : SlideOutDown.duration(dur.quick)),
    /** A scrim behind a sheet or modal. */
    scrim: () => FadeIn.duration(dur.quick).reduceMotion(ReduceMotion.Never),
    exit: () => FadeOut.duration(dur.quick).reduceMotion(ReduceMotion.Never),
  };
}

export type Motion = ReturnType<typeof motionFor>;

/** Motion builders for the current reduce-motion setting. */
export function useMotion(): Motion {
  const reduce = useReducedMotion();
  return useMemo(() => motionFor(reduce), [reduce]);
}

/**
 * A number that counts towards `target` over `ms` (for scores and rings drawn with rough.js, which redraw per value).
 * Starts at `from` on first render; jumps straight to the target with reduce motion on.
 */
export function useCountTo(target: number, { from = target, ms = dur.slow + 200, steps = 12 }: { from?: number; ms?: number; steps?: number } = {}) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(from);
  const cur = useRef(from);
  useEffect(() => {
    if (reduce) { cur.current = target; return; }
    const start = cur.current;
    if (start === target) return;
    let k = 0;
    const id = setInterval(() => {
      k++;
      const t = Math.min(1, k / steps);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(start + (target - start) * eased);
      cur.current = next;
      setV(next);
      if (t >= 1) clearInterval(id);
    }, ms / steps);
    return () => clearInterval(id);
  }, [target, reduce, ms, steps]);
  return reduce ? target : v;
}
