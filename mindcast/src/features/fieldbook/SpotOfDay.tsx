/** Today's Field Book pieces: one spot of the day (picked by weather or season), and what is due for another look. */
import type { Href } from "expo-router";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { pack } from "@/domain";
import { useLive } from "@/features/today/hooks";
import { impacts } from "@/features/today/services/railImpacts";
import { cachedForecast, DEFAULT_PLACE, loadForecast } from "@/features/today/services/weather";
import { useStore } from "@/state/store";
import { BodyB, Eyebrow, H3, Small } from "@/ui/kit";
import { PeekLink } from "@/ui/peek";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { useDue } from "./hooks";
import { dayKey, spotOfTheDay, type DayWeather, type SpotOfDay as Pick } from "./logic";
import { FenceRule, ItemArt } from "./parts";

function reasonText(pick: Pick, wx: (DayWeather & { date: string }) | null) {
  if (pick.reason === "rotate") return null;
  const imp = wx ? impacts(wx) : [];
  const hit = (ids: string[]) => imp.find((i) => ids.includes(i.id));
  if (pick.reason === "heat") return hit(["very-hot", "hot"])?.text ?? null;
  if (pick.reason === "cold") return hit(["frost", "snow"])?.text ?? null;
  if (pick.reason === "wet") return hit(["rain"])?.text ?? null;
  return hit(["leaf"])?.text ?? "Autumn is leaf fall season on the railway.";
}

export function SpotOfDayCard() {
  const { c } = useTheme();
  const spots = useStore((s) => s.fieldbook.spots);
  const place = useStore((s) => s.settings.weatherPlace) ?? DEFAULT_PLACE;
  const key = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
  const { data } = useLive(key, () => cachedForecast(place), (force) => loadForecast(place, { force }));
  const today = dayKey();
  const wx = data?.forecast.days.find((d) => d.date === today) ?? data?.forecast.days[0] ?? null;
  // Keep the pick steady for the day: it only changes with the date or the weather, not with each stamp.
  const pick = useMemo(() => spotOfTheDay(pack, useStore.getState().fieldbook.spots, new Date(), wx), [today, wx?.max, wx?.min, wx?.code, wx?.rain]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pick) return null;
  const e = pick.entry;
  const rec = spots[e.key];
  const spotted = (rec?.grade ?? 0) > 0;
  const stampedToday = !!rec?.days.includes(today);
  const reason = reasonText(pick, wx);
  return (
    <PeekLink href={`/spot/${e.key}` as Href} accessibilityLabel={`Spot of the day: ${e.name}. ${reason ? `${reason} ` : ""}Look for: ${e.look}`}
      style={{ backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l, gap: space.m }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>Spot of the day</Eyebrow>
        <Text style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, color: stampedToday ? c.good : c.soft }}>{stampedToday ? "STAMPED TODAY" : spotted ? "IN YOUR BOOK" : "NOT IN YOUR BOOK YET"}</Text>
      </View>
      {reason && <Text style={{ fontFamily: F.hand, fontSize: 22, lineHeight: 24, color: c.ppe }}>{reason}</Text>}
      <View style={{ flexDirection: "row", gap: space.m, alignItems: "center" }}>
        <View style={{ width: "42%", borderRadius: radius.m, backgroundColor: c.bg, padding: 6 }}>
          <ItemArt entry={e} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <H3>{e.name}</H3>
          <Small color={c.soft}>{e.look}</Small>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s }}>
        <View style={{ flex: 1 }}><FenceRule /></View>
      </View>
      <BodyB>{stampedToday ? "See your stamp ›" : "Spotted it? Stamp it ›"}</BodyB>
    </PeekLink>
  );
}

/** "Due today: 2 to look for again · 1 stop to revisit". Hidden when nothing is due. */
export function DueTodayCard() {
  const { c } = useTheme();
  const due = useDue();
  const n = due.look.length + due.revisit.length;
  if (!n) return null;
  const parts = [due.look.length ? `${due.look.length} to look for again` : "", due.revisit.length ? `${due.revisit.length} ${due.revisit.length === 1 ? "stop" : "stops"} to revisit` : ""].filter(Boolean);
  return (
    <PeekLink href={"/due" as Href} preview={false} accessibilityLabel={`Due today: ${parts.join(", ")}`}
      style={{ flexDirection: "row", alignItems: "center", gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Eyebrow>Due today</Eyebrow>
        <BodyB>{parts.join(" · ")}</BodyB>
        <Small color={c.soft} numberOfLines={1}>{[...due.look.map((e) => e.name), ...due.revisit.map((l) => l.title)].slice(0, 3).join(", ")}</Small>
      </View>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 22, color: c.soft }}>›</Text>
    </PeekLink>
  );
}
