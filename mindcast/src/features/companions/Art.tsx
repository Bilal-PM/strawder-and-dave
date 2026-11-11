/**
 * Companion portraits: hand-drawn PNGs from the Groundwork illustration library (Claude Design canvas).
 * Falls back to the rough.js drawing for any companion without a portrait.
 */
import { Image, View } from "react-native";
import { paintPet } from "@/features/crew/draw";
import { usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";

const ART: Record<string, number> = {
  sleeper: require("../../../assets/illustrations/crew/sleeper.png"),
  pip: require("../../../assets/illustrations/crew/pip.png"),
  gauge: require("../../../assets/illustrations/crew/gauge.png"),
  semaphore: require("../../../assets/illustrations/crew/semaphore.png"),
  tampy: require("../../../assets/illustrations/crew/tampy.png"),
  conker: require("../../../assets/illustrations/crew/conker.png"),
};

/** A companion portrait. Dark ink art sits on a light paper disc in dark mode so it stays readable. */
export function CompanionArt({ id, size }: { id: string; size: number }) {
  const { c, dark } = useTheme();
  const pal = usePal();
  const src = ART[id];
  if (!src) return <View style={{ width: size, height: size }}><Sketch w={80} h={80} pal={pal} deps={[id, c.pass]} paint={(p) => paintPet(p, id, c.ink, c.pass)} /></View>;
  return (
    <View style={{ width: size, height: size, borderRadius: dark ? size / 2 : 0, backgroundColor: dark ? "#F6F5F1" : "transparent", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Image source={src} accessibilityIgnoresInvertColors style={{ width: dark ? size * 0.88 : size, height: dark ? size * 0.88 : size }} resizeMode="contain" />
    </View>
  );
}
