import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useMemo, useRef } from "react";
import { Platform, Share, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { pack } from "@/domain";
import { castLink } from "@/features/mindcast/link";
import { ChecksList, integrityOf, MappingView, ScoreBadge, audienceLabel, useAllCasts } from "@/features/mindcast/parts";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Card, Chip, Eyebrow, H1, H3, Hand, Row, Screen, Small, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";

export default function CastScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const cast = useAllCasts().find((m) => m.id === id);
  const shot = useRef<React.ComponentRef<typeof View>>(null);
  const integ = useMemo(() => (cast ? integrityOf(cast) : null), [cast]);
  const saved = useStore((s) => s.casts.saved.includes(String(id)));
  if (!cast || !integ) return <Screen><H1>Not found</H1><Button label="Back" onPress={() => router.back()} /></Screen>;
  const lesson = pack.lessons.find((l) => l.id === cast.railwayTopic);
  const toggleSave = () => useStore.getState().set((s) => ({ casts: { ...s.casts, saved: saved ? s.casts.saved.filter((x) => x !== cast.id) : [...s.casts.saved, cast.id] } }));
  const addAction = () => { tap("success"); useStore.getState().set((s) => ({ loop: { ...s.loop, items: [...s.loop.items, { id: `a${Date.now()}`, text: cast.action, stage: "plan" }] } })); };
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
        <Button label="Back" kind="ghost" small onPress={() => router.back()} />
        <Row><Button label={saved ? "Saved" : "Save"} small onPress={toggleSave} /><Button label="Share image" small onPress={share} /><Button label="Send link" small onPress={() => Share.share({ message: `${cast.title}: ${cast.principle}\n${castLink(cast)}` }).catch(() => {})} /></Row>
      </Row>
      <View ref={shot} collapsable={false} style={{ gap: 14, backgroundColor: c.bg, paddingVertical: 4 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Eyebrow>Mindcast · {cast.audience.map((a) => audienceLabel[a]).join(", ")}</Eyebrow>
            <H1>{cast.title}</H1>
            <Small color={c.soft}>{cast.author}{pack.casts.some((x) => x.id === cast.id) ? " · checked against sources" : " · not checked by Groundwork"}</Small>
          </View>
          <ScoreBadge score={integ.score} />
        </Row>
        <Hand style={{ color: c.accent, fontSize: 28, lineHeight: 30 }}>{cast.principle}</Hand>
        <Card><Chip label="1 · Observe" color={c.ppe} /><Body>{cast.observe}</Body></Card>
        <Card><Chip label="2 · Mechanism" color={c.ppe} /><Body>{cast.mechanism}</Body></Card>
        <Card><Chip label="3 · Map" color={c.accent} /><MappingView mapping={cast.mapping} /></Card>
        <Card tone="sunk"><Chip label="4 · Limits" color={c.soft} /><Body>{cast.limits}</Body></Card>
        <Card tone="pass"><Chip label="6 · This week" color="#1B1F24" filled /><H3>{cast.action}</H3><Button label="Add to my Loop" kind="primary" small onPress={addAction} /></Card>
      </View>
      {lesson && <Card onPress={() => router.push(`/lesson/${lesson.id}`)}><Eyebrow>The railway behind it</Eyebrow><BodyB>Stop {lesson.stop}: {lesson.title}</BodyB><Small color={c.soft}>{lesson.hook}</Small></Card>}
      <Card><Eyebrow>Integrity check</Eyebrow><ChecksList integ={integ} /></Card>
      {cast.sources.length > 0 && <Card tone="sunk"><Eyebrow>Sources</Eyebrow>{cast.sources.map((s, i) => <Small key={i} color={c.soft}>{s.label}{s.where ? `, ${s.where}` : ""}</Small>)}</Card>}
    </Screen>
  );
}
