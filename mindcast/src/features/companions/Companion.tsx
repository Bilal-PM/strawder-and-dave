import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { companionById, pack } from "@/domain";
import { CompanionArt } from "./Art";
import { useStore } from "@/state/store";
import { Bubble, Tappable } from "@/ui/kit";
import { dur, ease, spring } from "@/ui/motion";

/** Reading time: about 3 words a second plus thinking time. */
export const readMs = (t: string) => 5000 + t.split(/\s+/).length * 380;

/** A companion that can be tapped to speak. Shows its bubble above. */
export function CompanionSpeaker({ id, size = 84, first, onLine }: { id?: string; size?: number; first?: string; onLine?: (n: number) => string | undefined }) {
  const chosen = useStore((s) => s.crew.pet);
  const chatty = useStore((s) => s.settings.chatty);
  const comp = companionById(id ?? chosen) ?? pack.companions[0];
  const [text, setText] = useState<string | null>(first ?? null);
  const n = useRef(0); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = useReducedMotion();
  const y = useSharedValue(0), sx = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }, { scaleX: sx.get() }, { scaleY: 2 - sx.get() }] }));
  const say = useCallback((t: string) => { setText(t); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setText(null), readMs(t)); }, []);
  useEffect(() => { if (first && chatty) say(first); return () => { if (timer.current) clearTimeout(timer.current); }; }, [first, chatty, say]);
  if (!comp) return null;
  const next = () => {
    // Tappable already gives the light tap haptic. Each companion has its own small move; none with reduce motion on.
    if (!reduce) {
      const tick = dur.instant / 2;
      if (comp.anim === "hop") y.set(withSequence(withTiming(-14, { duration: dur.quick, easing: ease.out }), withSpring(0, spring.lively)));
      else if (comp.anim === "stretch") sx.set(withSequence(withTiming(1.12, { duration: dur.quick, easing: ease.out }), withSpring(1, spring.lively)));
      else sx.set(withSequence(withTiming(1.05, { duration: tick }), withTiming(0.96, { duration: tick }), withTiming(1.03, { duration: tick }), withSpring(1, spring.settle)));
    }
    const k = n.current++;
    say(onLine?.(k) ?? comp.lines[k % comp.lines.length]);
  };
  return (
    <View style={{ gap: 8 }}>
      {text && chatty && <Bubble who={comp.name} text={text} onClose={() => setText(null)} onMore={next} />}
      <Tappable accessibilityRole="button" accessibilityLabel={`${comp.name}, tap to talk`} onPress={next} style={{ alignSelf: "flex-start" }}>
        <Animated.View style={[{ width: size, height: size }, style]}>
          <CompanionArt id={comp.id} size={size} />
        </Animated.View>
      </Tappable>
    </View>
  );
}
