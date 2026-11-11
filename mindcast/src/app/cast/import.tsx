import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { decodeCast } from "@/features/mindcast/link";
import { ChecksList, INTEGRITY_LINE, integrityOf, MappingView, ScoreBadge } from "@/features/mindcast/parts";
import { useStore } from "@/state/store";
import { Body, Button, Card, Chip, EmptyState, Enter, Eyebrow, H1, Hand, Row, Screen, Small } from "@/ui/kit";
import { useTheme } from "@/ui/theme";

/** Opens a Mindcast someone shared as a link, shows its integrity, and saves it to your feed. */
export default function ImportCast() {
  const { c } = useTheme();
  const { d, by } = useLocalSearchParams<{ d?: string; by?: string }>();
  const cast = useMemo(() => (d ? decodeCast(String(d), by ? String(by) : undefined) : null), [d, by]);
  if (!cast) return <Screen><EmptyState eyebrow="Shared Mindcast" title="That link didn't open" body="It may have been cut short when it was copied. Ask the sender to share it again." action="Go to Mindcast" onAction={() => router.replace("/mindcast")} /></Screen>;
  const integ = integrityOf(cast);
  const save = () => { useStore.getState().set((s) => ({ casts: { ...s.casts, mine: [cast, ...s.casts.mine] } })); router.replace(`/cast/${cast.id}`); };
  return (
    <Screen>
      <Enter style={{ gap: 8 }}>
        <Eyebrow>Shared with you · from {cast.author}</Eyebrow>
        <Row style={{ alignItems: "flex-start" }}><H1 style={{ flex: 1 }}>{cast.title}</H1><ScoreBadge score={integ.score} animate caption /></Row>
      </Enter>
      <Chip label="Not checked by Groundwork" color={c.soft} />
      <Hand style={{ color: c.accent }}>{cast.principle}</Hand>
      <Card><Chip label="Observe" color={c.ppe} /><Body>{cast.observe}</Body></Card>
      <Card><Chip label="Map" color={c.accent} /><MappingView mapping={cast.mapping} /></Card>
      <Card><Eyebrow>Integrity check</Eyebrow><Small color={c.soft}>{INTEGRITY_LINE}</Small><ChecksList integ={integ} /></Card>
      <Small color={c.soft}>Facts in shared Mindcasts come from the sender. Check anything important against a trusted source.</Small>
      <Button label="Save to my Mindcasts" kind="primary" haptic="success" onPress={save} />
      <Button label="Not now" kind="ghost" onPress={() => router.replace("/mindcast")} />
    </Screen>
  );
}
