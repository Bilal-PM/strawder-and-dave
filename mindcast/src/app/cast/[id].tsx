import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useMemo, useRef } from "react";
import { Platform, Share, View } from "react-native";
import Animated from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import { pack } from "@/domain";
import { castLink } from "@/features/mindcast/link";
import { ChecksList, INTEGRITY_LINE, integrityOf, MappingView, ScoreBadge, audienceLabel, useAllCasts } from "@/features/mindcast/parts";
import { useStore } from "@/state/store";
import { BackButton, Body, BodyB, Button, Card, Chip, EmptyState, Enter, Eyebrow, H1, H3, Hand, Row, Screen, Small } from "@/ui/kit";
import { useMotion } from "@/ui/motion";
import { useTheme } from "@/ui/theme";

export default function CastScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { c } = useTheme();
  const m = useMotion();
  const cast = useAllCasts().find((x) => x.id === id);
  const shot = useRef<React.ComponentRef<typeof View>>(null);
  const integ = useMemo(() => (cast ? integrityOf(cast) : null), [cast]);
  const saved = useStore((s) => s.casts.saved.includes(String(id)));
  const added = useStore((s) => !!cast && s.loop.items.some((it) => it.text === cast.action));
  if (!cast || !integ) {
    return (
      <Screen>
        <BackButton fallback="/mindcast" />
        <EmptyState eyebrow="Mindcast" title="We couldn't find that Mindcast" body="It may have been removed, or the link was cut short. The feed has everything that's here." action="Go to Mindcast" onAction={() => router.replace("/mindcast")} />
      </Screen>
    );
  }
  const lesson = pack.lessons.find((l) => l.id === cast.railwayTopic);
  const mine = !pack.casts.some((x) => x.id === cast.id);
  const toggleSave = () => useStore.getState().set((s) => ({ casts: { ...s.casts, saved: saved ? s.casts.saved.filter((x) => x !== cast.id) : [...s.casts.saved, cast.id] } }));
  const addAction = () => { if (added) return; useStore.getState().set((s) => ({ loop: { ...s.loop, items: [...s.loop.items, { id: `a${Date.now()}`, text: cast.action, stage: "plan" }] } })); };
  const share = async () => {
    const text = `${cast.title}\n\n${cast.principle}\n\nThis week: ${cast.action}\n\nOpen it in Groundwork: ${castLink(cast)}`;
    try {
      if (Platform.OS !== "web" && shot.current && (await Sharing.isAvailableAsync())) { const uri = await captureRef(shot as never, { format: "png", quality: 1 }); await Sharing.shareAsync(uri, { dialogTitle: cast.title }); }
      else await Share.share({ message: text });
    } catch {}
  };
  return (
    <Screen>
      <Row style={{ justifyContent: "space-between" }}>
        <BackButton fallback="/mindcast" />
        {!mine && <Button label={saved ? "Saved ✓" : "Save"} small haptic={saved ? "light" : "success"} onPress={toggleSave} accessibilityLabel={saved ? "Saved. Tap to remove from saved" : "Save this Mindcast"} />}
      </Row>
      {fresh ? (
        <Animated.View entering={m.rise()}>
          <Card style={{ borderColor: c.good, borderWidth: 1.5 }}>
            <Eyebrow color={c.good}>✓ Published</Eyebrow>
            <Small color={c.soft}>{"It's at the top of your Mindcast feed, on this phone. Share it below when you're ready."}</Small>
          </Card>
        </Animated.View>
      ) : null}
      <View ref={shot} collapsable={false} style={{ gap: 14, backgroundColor: c.bg, paddingVertical: 4 }}>
        <Enter>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Eyebrow>Mindcast · for {cast.audience.map((a) => audienceLabel[a] + "s").join(" and ")}</Eyebrow>
              <H1 accessibilityRole="header">{cast.title}</H1>
              <Small color={c.soft}>{cast.author}{mine ? " · not checked by Groundwork" : " · railway facts checked against sources"}</Small>
            </View>
            <ScoreBadge score={integ.score} animate caption />
          </Row>
        </Enter>
        <Enter i={1} style={{ gap: 4 }}>
          <Eyebrow color={c.accent}>5 · Principle</Eyebrow>
          <Hand style={{ color: c.accent, fontSize: 28, lineHeight: 30 }}>{cast.principle}</Hand>
        </Enter>
        <Enter i={2}><Card><Chip label="1 · Observe" color={c.ppe} /><Body>{cast.observe}</Body></Card></Enter>
        <Enter i={3}><Card><Chip label="2 · Mechanism" color={c.ppe} /><Body>{cast.mechanism}</Body></Card></Enter>
        <Enter i={4}><Card><Chip label="3 · Map" color={c.accent} /><MappingView mapping={cast.mapping} /></Card></Enter>
        <Enter i={5}><Card tone="sunk"><Chip label="4 · Limits" color={c.soft} /><Body>{cast.limits}</Body></Card></Enter>
        <Enter i={6}>
          <Card tone="pass">
            <Chip label="6 · Action this week" color={c.pass} filled />
            <H3>{cast.action}</H3>
            {added ? (
              <Animated.View entering={m.fade()} style={{ gap: 2, minHeight: 44, justifyContent: "center" }}>
                <BodyB color={c.good}>✓ Added to Your week</BodyB>
                <Small color={c.soft}>Do it, then note what you noticed. It earns a practice stamp.</Small>
              </Animated.View>
            ) : (
              <>
                <Button label="Add to Your week" kind="primary" haptic="success" onPress={addAction} />
                <Small color={c.soft}>Do it, then note what you noticed. It earns a practice stamp.</Small>
              </>
            )}
          </Card>
        </Enter>
      </View>
      <Card>
        <H3>Share it</H3>
        <Row wrap>
          <Button label="Share as an image" small onPress={share} />
          <Button label="Send a link" small onPress={() => Share.share({ message: `${cast.title}: ${cast.principle}\n${castLink(cast)}` }).catch(() => {})} />
        </Row>
      </Card>
      {lesson && <Card onPress={() => router.push(`/lesson/${lesson.id}`)} accessibilityLabel={`The railway behind it: stop ${lesson.stop}, ${lesson.title}`}><Eyebrow>The railway behind it</Eyebrow><BodyB>Stop {lesson.stop}: {lesson.title} ›</BodyB><Small color={c.soft}>{lesson.hook}</Small></Card>}
      <Card>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow>Integrity check</Eyebrow>
            <Small color={c.soft}>{INTEGRITY_LINE}</Small>
          </View>
          <ScoreBadge score={integ.score} small />
        </Row>
        <ChecksList integ={integ} />
      </Card>
      {cast.sources.length > 0 && <Card tone="sunk"><Eyebrow>Sources</Eyebrow>{cast.sources.map((s, i) => <Small key={i} color={c.soft}>{s.label}{s.where ? `, ${s.where}` : ""}</Small>)}</Card>}
    </Screen>
  );
}
