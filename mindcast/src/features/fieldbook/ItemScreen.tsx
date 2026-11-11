/** One thing to spot: the drawing, what to look for, why it's there, the lesson, and the stamp flow. */
import { Link, router } from "expo-router";
import React from "react";
import { Image, View } from "react-native";
import { pack } from "@/domain";
import { Sources, TopicChip } from "@/features/today/components/bits";
import { topicFromLinkString } from "@/features/today/services/links";
import { useStore } from "@/state/store";
import { BackButton, Body, BodyB, Button, EmptyState, Eyebrow, H1, Hand, Screen, Small } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { radius, space } from "@/ui/tokens";
import { entryByKey } from "./logic";
import { FenceRule, ItemArt, RarityTag } from "./parts";
import { SpotIt } from "./SpotIt";

const PLATES: Record<string, { src: number; alt: string }> = {
  joint: { src: require("../../../assets/illustrations/plates/joint.png"), alt: "Reference drawing: two rail ends with a small gap, held by fishplates and bolts" },
  rail: { src: require("../../../assets/illustrations/plates/rail.png"), alt: "Reference drawing: rail cross-section, head, web and foot" },
  plan: { src: require("../../../assets/illustrations/plates/plan.png"), alt: "Reference drawing: two parallel rails across evenly spaced sleepers in ballast" },
  side: { src: require("../../../assets/illustrations/plates/side.png"), alt: "Reference drawing: rail running across sleepers bedded in ballast" },
  fastening: { src: require("../../../assets/illustrations/plates/fastening.png"), alt: "Reference drawing: rail seat with a pad under the foot and a spring clip each side" },
  points: { src: require("../../../assets/illustrations/plates/points.png"), alt: "Reference drawing: points set straight and set diverging, with switch rails, crossing and check rails" },
  signals: { src: require("../../../assets/illustrations/plates/signals.png"), alt: "Reference drawing: two, three and four aspect colour-light signals, red always lowest" },
};

/** `sheet`: shown as a form sheet (places from the map): a Done button instead of Back, no paper grid. */
export function ItemScreen({ id, sheet = false }: { id: string; sheet?: boolean }) {
  const { c, dark } = useTheme();
  const entry = entryByKey(pack, id);
  const rec = useStore((s) => s.fieldbook.spots[id]);
  if (!entry) return <Screen><BackButton label="Field Book" fallback="/fieldbook" /><EmptyState title="Not in the book" body="We couldn't find that one. It may have been renamed." action="Field Book" onAction={() => router.replace("/fieldbook")} /></Screen>;
  const set = pack.spots.sets.find((s) => s.id === entry.set);
  const spotted = (rec?.grade ?? 0) > 0;
  const plate = entry.item?.plate ? PLATES[entry.item.plate] : undefined;
  const topic = entry.lesson ? { lesson: entry.lesson, label: entry.lesson } : entry.season ? { season: entry.season, label: `Season ${entry.season}` } : null;
  return (
    <Screen grid={!sheet}>
      {sheet ? (
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Button small kind="ghost" label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace("/explore"))} />
        </View>
      ) : (
        <BackButton label={set?.title ?? "Field Book"} fallback={entry.set === "places" ? "/explore" : `/set/${entry.set}`} />
      )}
      <View style={{ gap: 6 }}>
        <Eyebrow>{set?.title ?? "Field Book"}</Eyebrow>
        <H1 accessibilityRole="header">{entry.name}</H1>
        <RarityTag entry={entry} />
      </View>
      <Link.AppleZoomTarget>
        <View style={{ borderRadius: radius.l, backgroundColor: spotted ? c.surface : "transparent", borderWidth: 1.5, borderStyle: spotted ? "solid" : "dashed", borderColor: spotted ? c.line : c.soft, padding: space.l }}>
          <ItemArt entry={entry} ghost={!spotted} />
        </View>
      </Link.AppleZoomTarget>
      <View style={{ gap: 4 }}>
        <Eyebrow>What to look for</Eyebrow>
        <Body>{entry.look}</Body>
      </View>
      <View style={{ gap: 4 }}>
        <Eyebrow>{entry.kind === "train" ? "One fact" : entry.kind === "place" ? "Why go" : "Why it's there"}</Eyebrow>
        <Hand style={{ fontSize: 23, lineHeight: 26 }}>{entry.why}</Hand>
      </View>
      {topic && <TopicChip topic={topic} prefix="Learn:" />}
      <FenceRule />
      <View style={{ gap: space.s, padding: space.l, borderRadius: radius.l, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
        <SpotIt itemId={entry.key} />
      </View>
      {entry.kind === "train" && entry.train && <Button label="Spec sheet, 3D view and postcard" onPress={() => router.push(`/train/${entry.train!.id}`)} />}
      {plate && (
        <View style={{ gap: 6 }}>
          <View style={{ width: "100%", aspectRatio: 690 / 494, backgroundColor: dark ? c.surface : "#FFFFFF", borderRadius: radius.l, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}>
            <Image source={plate.src} accessibilityLabel={plate.alt} accessibilityIgnoresInvertColors style={{ width: "100%", height: "100%", opacity: dark ? 0.86 : 1 }} resizeMode="contain" />
          </View>
          <Small color={c.soft}>Reference drawing. Illustrative, not to scale.</Small>
        </View>
      )}
      {entry.kind === "place" && entry.place && <BodyB>Get off at: {entry.place.station}</BodyB>}
      {entry.kind === "place" && <TopicChip topic={topicFromLinkString((entry.place as { link?: string } | undefined)?.link)} prefix="Linked:" />}
      <Sources sources={entry.item?.sources ?? entry.train?.sources ?? entry.place?.sources ?? []} />
    </Screen>
  );
}
