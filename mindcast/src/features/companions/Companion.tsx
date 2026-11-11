import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { companionById, pack } from "@/domain";
import { paintPet } from "@/features/crew/draw";
import { useStore } from "@/state/store";
import { Bubble, Tappable, tap, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";

/** Reading time: about 3 words a second plus thinking time. */
export const readMs = (t: string) => 5000 + t.split(/\s+/).length * 380;

/** A companion that can be tapped to speak. Shows its bubble above. */
export function CompanionSpeaker({ id, size = 84, first, onLine }: { id?: string; size?: number; first?: string; onLine?: (n: number) => string | undefined }) {
  const pal = usePal(); const { c } = useTheme();
  const chosen = useStore((s) => s.crew.pet);
  const chatty = useStore((s) => s.settings.chatty);
  const comp = companionById(id ?? chosen) ?? pack.companions[0];
  const [text, setText] = useState<string | null>(first ?? null);
  const n = useRef(0); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = useReducedMotion();
  const y = useSharedValue(0), sx = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scaleX: sx.value }, { scaleY: 2 - sx.value }] }));
  const say = useCallback((t: string) => { setText(t); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setText(null), readMs(t)); }, []);
  useEffect(() => { if (first && chatty) say(first); return () => { if (timer.current) clearTimeout(timer.current); }; }, [first, chatty, say]);
  if (!comp) return null;
  const next = () => {
    tap();
    if (!reduce) {
      if (comp.anim === "hop") y.value = withSequence(withTiming(-14, { duration: 160 }), withSpring(0));
      else if (comp.anim === "stretch") sx.value = withSequence(withTiming(1.15, { duration: 220 }), withSpring(1));
      else sx.value = withSequence(withTiming(1.05, { duration: 60 }), withTiming(0.96, { duration: 60 }), withTiming(1.04, { duration: 60 }), withSpring(1));
    }
    const k = n.current++;
    say(onLine?.(k) ?? comp.lines[k % comp.lines.length]);
  };
  return (
    <View style={{ gap: 8 }}>
      {text && chatty && <Bubble who={comp.name} text={text} onClose={() => setText(null)} onMore={next} />}
      <Tappable accessibilityRole="button" accessibilityLabel={`${comp.name}, tap to talk`} onPress={next} style={{ alignSelf: "flex-start" }}>
        <Animated.View style={[{ width: size, height: size }, style]}>
          <Sketch w={80} h={80} pal={pal} deps={[comp.id, c.pass]} paint={(p) => paintPet(p, comp.id, c.ink, c.pass)} />
        </Animated.View>
      </Tappable>
    </View>
  );
}
