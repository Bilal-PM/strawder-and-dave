/**
 * Railway history: today's event, or the next one coming up, with hand-drawn art and a linked lesson.
 * Tertiary on Today, so it sits flat on the paper under a hairline, with no card.
 */
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { pack } from "@/domain";
import { Body, Eyebrow, H3, Mono, Row, Button, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { radius, space } from "@/ui/tokens";
import { paintHistory } from "../art";
import { calendarOrder, eventDate, pickHistory, whenLabel } from "../services/history";
import { topicFromLinkString } from "../services/links";
import { Sources, TopicChip } from "./bits";

export function HistoryCard() {
  const { c } = useTheme();
  const pal = usePal();
  const ordered = useMemo(() => calendarOrder(pack.history ?? []), []);
  const start = useMemo(() => pickHistory(ordered, new Date()), [ordered]);
  const [i, setI] = useState(start?.index ?? 0);
  if (!ordered.length) return null;
  const e = ordered[i % ordered.length];
  const topic = topicFromLinkString(e.link);
  const step = (d: number) => setI((v) => (v + d + ordered.length) % ordered.length);

  return (
    <View style={{ gap: space.s, borderTopWidth: 1, borderTopColor: c.line, paddingTop: space.l, marginTop: space.s }}>
      <Eyebrow color={i === start?.index && start.when === "today" ? c.ppe : undefined}>{whenLabel(e, new Date())}</Eyebrow>
      <View style={{ borderRadius: radius.m, overflow: "hidden", backgroundColor: c.bg }}>
        <Sketch w={320} h={170} pal={pal} deps={[e.id, e.art, c.accent]} paint={(p) => paintHistory(p, e.art, c)} accessibilityLabel={`Drawing: ${e.art}`} />
      </View>
      <Mono color={c.soft}>{eventDate(e)}</Mono>
      <H3 accessibilityRole="header">{e.title}</H3>
      <Body>{e.text}</Body>
      <TopicChip topic={topic} prefix="Linked:" />
      {e.confidence && e.confidence !== "checked" && <Mono color={c.soft}>Draft: details still being checked against the source</Mono>}
      <Sources sources={e.sources} />
      {ordered.length > 1 && (
        <Row style={{ justifyContent: "space-between" }}>
          <Button small kind="ghost" label="‹ Earlier" onPress={() => step(-1)} accessibilityLabel="Previous history event" />
          <Button small kind="ghost" label="Later ›" onPress={() => step(1)} accessibilityLabel="Next history event" />
        </Row>
      )}
    </View>
  );
}
