/**
 * Reference drawings from the Groundwork illustration library (Claude Design canvas), shown under a lesson's
 * interactive diagram. They show how the parts relate, not exact sizes, so the caption says they are illustrative
 * and not to scale.
 */
import { Image, View } from "react-native";
import { Small } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { radius } from "@/ui/tokens";

type Plate = { src: number; title: string; alt: string };
const P = {
  joint: { src: require("../../../assets/illustrations/plates/joint.png"), title: "Rail joint", alt: "Two rail ends with a small gap, held by fishplates and bolts" },
  rail: { src: require("../../../assets/illustrations/plates/rail.png"), title: "Flat-bottom rail in cross-section", alt: "Rail cross-section: head, web and foot" },
  plan: { src: require("../../../assets/illustrations/plates/plan.png"), title: "Plain track from above", alt: "Two parallel rails across evenly spaced sleepers in ballast" },
  side: { src: require("../../../assets/illustrations/plates/side.png"), title: "Plain track from the side", alt: "Rail running across sleepers bedded in ballast" },
  fastening: { src: require("../../../assets/illustrations/plates/fastening.png"), title: "Rail on a concrete sleeper", alt: "Rail seat: pad under the foot, a spring clip each side, rail leaning in 1 in 20" },
  layers: { src: require("../../../assets/illustrations/plates/layers.png"), title: "Track from the ground up", alt: "Formation falling to the sides, ballast with shoulders, sleeper and rails 1,435 mm apart" },
  points: { src: require("../../../assets/illustrations/plates/points.png"), title: "A set of points", alt: "Points set straight and set diverging: stock rails, switch rails, crossing and check rails" },
  signals: { src: require("../../../assets/illustrations/plates/signals.png"), title: "Colour-light signals", alt: "Two, three and four aspect signals, red always lowest, with a person for scale" },
} satisfies Record<string, Plate>;

const BY_LESSON: Record<string, Plate> = {
  "s1-01": P.joint, "s1-02": P.rail, "s1-03": P.plan, "s1-04": P.side, "s1-05": P.fastening,
  "s1-09": P.layers, "s1-10": P.layers, "s1-14": P.points, "s1-19": P.signals,
};

export function LessonPlate({ lessonId }: { lessonId: string }) {
  const { c } = useTheme();
  const plate = BY_LESSON[lessonId];
  if (!plate) return null;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ width: "100%", aspectRatio: 690 / 494, backgroundColor: "#FFFFFF", borderRadius: radius.l, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}>
        <Image source={plate.src} accessibilityLabel={plate.alt} accessibilityIgnoresInvertColors style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} resizeMode="contain" />
      </View>
      <Small color={c.soft}>{plate.title}. Illustrative drawing, not to scale.</Small>
    </View>
  );
}
