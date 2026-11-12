/** Field Book building blocks: drawings, tiles, rings, set cards, the fence rule, tiers, the level ladder. */
import type { Href } from "expo-router";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { pack } from "@/domain";
import { paintPlace } from "@/features/explore/art";
import { CATS } from "@/features/explore/places";
import { Thumb } from "@/features/trains/art";
import { BodyB, Eyebrow, H3, Small, usePal } from "@/ui/kit";
import { PeekLink } from "@/ui/peek";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { ART_H, ART_W, paintItem } from "./art";
import { LEVELS, meaningLine, POINTS, TIERS, type Entry, type SetProgress, type SpotRecord, type Tier } from "./logic";
import { InkStamp } from "./Stamp";

/* ---------- Drawings ---------- */

/** The drawing for any entry. `ghost` draws the dotted outline used before it is spotted. */
export const ItemArt = memo(function ItemArt({ entry, ghost = false, label }: { entry: Entry; ghost?: boolean; label?: string }) {
  const { c } = useTheme();
  const pal = usePal();
  const a11y = label ?? `Drawing of ${entry.kind === "train" ? "the " : "a "}${entry.name}${ghost ? ", not spotted yet" : ""}`;
  if (entry.kind === "train" && entry.train) {
    return (
      <View accessible accessibilityLabel={a11y} style={{ opacity: ghost ? 0.38 : 1, paddingVertical: 4 }}>
        <Thumb train={entry.train} />
      </View>
    );
  }
  if (entry.kind === "place" && entry.place) {
    const colour = CATS[entry.place.category]?.colour(c) ?? c.accent;
    return (
      <View accessible accessibilityLabel={a11y} style={{ opacity: ghost ? 0.4 : 1 }}>
        <Sketch w={320} h={170} pal={pal} deps={[entry.place.category, c.surface, ghost]} paint={(p) => paintPlace(p, entry.place!.category, c, colour)} />
      </View>
    );
  }
  // Ghosts are faint: the sketch renderer draws solid strokes, so the dotted look comes from the tile's dashed border.
  return (
    <View style={{ opacity: ghost ? 0.42 : 1 }}>
      <Sketch w={ART_W} h={ART_H} pal={pal} deps={[entry.item?.art, ghost, c.ink, c.accent]} paint={(p) => paintItem(p, entry.item?.art ?? "", c, ghost)} accessibilityLabel={a11y} />
    </View>
  );
});

export function RarityTag({ entry }: { entry: Entry }) {
  const { c } = useTheme();
  const col = entry.rarity === "rare" ? c.ppe : entry.rarity === "uncommon" ? c.ink : c.soft;
  return <Text accessibilityLabel={`${entry.rarity}, ${POINTS[entry.rarity]} points`} style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: col }}>{entry.rarity} · {POINTS[entry.rarity]}</Text>;
}

/** One item in a set grid. Spotted: inked drawing and its stamp. Not yet: a dotted outline and what to look for. */
export const ItemTile = memo(function ItemTile({ entry, rec }: { entry: Entry; rec?: SpotRecord }) {
  const { c } = useTheme();
  const spotted = (rec?.grade ?? 0) > 0;
  const last = rec?.days[rec.days.length - 1] ?? "";
  return (
    <PeekLink
      href={`/spot/${entry.key}` as Href}
      accessibilityLabel={`${entry.name}. ${spotted ? `Spotted${entry.maxGrade > 1 ? `, ${["", "bronze", "silver", "gold"][rec!.grade]}` : ""}.` : `Not spotted yet. Look for: ${entry.look}`}`}
      style={{ width: "48.5%", minHeight: 44, borderRadius: radius.l, borderWidth: spotted ? 1 : 1.5, borderStyle: spotted ? "solid" : "dashed", borderColor: spotted ? c.line : c.soft, backgroundColor: spotted ? c.surface : "transparent", padding: space.s + 2, gap: 6 }}>
      <View>
        <ItemArt entry={entry} ghost={!spotted} />
        {spotted && (
          <View style={{ position: "absolute", right: -4, top: -6 }}>
            <InkStamp k={entry.key} grade={rec!.grade} single={entry.maxGrade === 1} day={last} size={50} />
          </View>
        )}
      </View>
      <BodyB style={{ fontSize: 15, lineHeight: 19 }} numberOfLines={2}>{entry.name}</BodyB>
      {!spotted && <Small color={c.soft} numberOfLines={4} style={{ fontSize: 13, lineHeight: 17 }}>{entry.look}</Small>}
      <RarityTag entry={entry} />
    </PeekLink>
  );
});

/* ---------- Rings ---------- */

/** A hand-drawn progress ring. `value` 0..1. Children sit in the middle. */
export function Ring({ value, size = 64, color, children, label }: { value: number; size?: number; color?: string; children?: React.ReactNode; label: string }) {
  const { c } = useTheme();
  const pal = usePal();
  const v = Math.max(0, Math.min(1, value));
  const col = color ?? c.good;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", left: 0, top: 0, width: size, height: size }}>
        <Sketch w={100} h={100} pal={pal} deps={[Math.round(v * 60), col, c.line]} paint={(p) => {
          p.circle(50, 50, 84, null, { stroke: c.line, strokeWidth: 7, roughness: 0.5 });
          if (v >= 0.999) p.circle(50, 50, 84, null, { stroke: col, strokeWidth: 8, roughness: 0.9 });
          else if (v > 0) p.arc(50, 50, 84, 84, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2, false, null, { stroke: col, strokeWidth: 8, roughness: 0.9 });
        }} />
      </View>
      {children}
    </View>
  );
}

/* ---------- Fence rule ---------- */

export function FenceRule({ full = false }: { full?: boolean }) {
  const { c } = useTheme();
  const pal = usePal();
  const fence = (
    <View style={{ width: full ? 64 : 40 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Sketch w={80} h={50} pal={pal} deps={[c.ink, c.pass]} paint={(p) => {
        for (const x of [8, 30, 52, 74]) p.line(x, 6, x, 46, { strokeWidth: 2.4, roughness: 0.7 });
        p.line(2, 16, 78, 16, { strokeWidth: 1.6, roughness: 0.9 });
        p.line(2, 32, 78, 32, { strokeWidth: 1.6, roughness: 0.9 });
        p.line(0, 47, 80, 47, { stroke: c.pass, strokeWidth: 4, roughness: 0.5 });
      }} />
    </View>
  );
  if (!full) {
    return (
      <View accessible accessibilityLabel={`Fence rule. ${pack.spots.fenceRule}`} style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
        {fence}
        <Small color={c.soft} style={{ flex: 1, fontSize: 13, lineHeight: 17 }}>{pack.spots.fenceRule}</Small>
      </View>
    );
  }
  return (
    <View accessible accessibilityLabel={`The fence rule. ${pack.spots.fenceRule} ${pack.spots.safety.join(" ")}`} style={{ flexDirection: "row", gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: c.sunk, borderLeftWidth: 5, borderLeftColor: c.pass }}>
      {fence}
      <View style={{ flex: 1, gap: 4 }}>
        <Eyebrow>The fence rule</Eyebrow>
        <BodyB style={{ fontSize: 15, lineHeight: 21 }}>{pack.spots.fenceRule}</BodyB>
        {pack.spots.safety.map((l) => <Small key={l} color={c.soft}>{l}</Small>)}
      </View>
    </View>
  );
}

/* ---------- Tiers ---------- */

const TIER_COL = (t: Tier, dark: boolean) => (t === "gold" ? (dark ? "#E5C25A" : "#9A7400") : t === "silver" ? (dark ? "#B9C2CC" : "#5F6B78") : dark ? "#D49B69" : "#9A5B2A");
export const tierColour = TIER_COL;

/** Bronze, silver and gold markers along a bar, with the spotted count. */
export function TierBar({ p }: { p: SetProgress }) {
  const { c, dark } = useTheme();
  const frac = p.total ? p.spotted / p.total : 0;
  return (
    <View accessible accessibilityLabel={`${p.spotted} of ${p.total} spotted. Bronze at ${p.thresholds.bronze}, silver at ${p.thresholds.silver}, gold at ${p.thresholds.gold}.`} style={{ gap: 6, paddingTop: 14 }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "visible" }}>
        <View style={{ width: `${frac * 100}%`, height: 8, borderRadius: 4, backgroundColor: c.good }} />
        {TIERS.map((t) => {
          const at = p.total ? p.thresholds[t] / p.total : 1;
          const got = p.spotted >= p.thresholds[t];
          return (
            <View key={t} style={{ position: "absolute", left: `${at * 100}%`, top: -14, marginLeft: -10, alignItems: "center" }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: TIER_COL(t, dark), backgroundColor: got ? TIER_COL(t, dark) : c.surface, marginTop: 8 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        {TIERS.map((t) => <Text key={t} style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, color: p.spotted >= p.thresholds[t] ? TIER_COL(t, dark) : c.soft }}>{t.toUpperCase()} {p.thresholds[t]}</Text>)}
      </View>
    </View>
  );
}

/* ---------- Set cards ---------- */

/** Small dots, one per entry: inked when spotted, dotted when not. Used for the big sets. */
function StampDots({ keys, spots }: { keys: string[]; spots: Record<string, SpotRecord> }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {keys.map((k) => {
        const on = (spots[k]?.grade ?? 0) > 0;
        return <View key={k} style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderStyle: on ? "solid" : "dotted", borderColor: on ? c.accent : c.soft, backgroundColor: on ? c.accent : "transparent" }} />;
      })}
    </View>
  );
}

/** The first few drawings of a set: inked if spotted, dotted outlines if not. Shows the shape of the collection. */
function ArtStrip({ list, spots }: { list: Entry[]; spots: Record<string, SpotRecord> }) {
  const shown = list.slice(0, 5);
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shown.map((e) => <View key={e.key} style={{ flex: 1 }}><ItemArt entry={e} ghost={!((spots[e.key]?.grade ?? 0) > 0)} /></View>)}
    </View>
  );
}

/** The ABC strip: class numbers, underlined once spotted. */
function AbcStrip({ list, spots }: { list: Entry[]; spots: Record<string, SpotRecord> }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {list.slice(0, 14).map((e) => {
        const on = (spots[e.key]?.grade ?? 0) > 0;
        return <Text key={e.key} style={{ fontFamily: F.mono, fontSize: 13, color: on ? c.ink : c.soft, textDecorationLine: on ? "underline" : "none", textDecorationColor: c.accent }}>{e.name.replace(/^Class\s+/, "").replace(/ class$| Tube Stock$/, "")}</Text>;
      })}
      <Text style={{ fontFamily: F.mono, fontSize: 13, color: c.soft }}>…</Text>
    </View>
  );
}

/** One set. `row` draws it as a row inside the Field Book's set grid (no card of its own, a hairline above). */
export function SetCard({ p, list, spots, href, row, first }: { p: SetProgress; list: Entry[]; spots: Record<string, SpotRecord>; href: Href; row?: boolean; first?: boolean }) {
  const { c, dark } = useTheme();
  return (
    <PeekLink href={href} preview={false} accessibilityLabel={`${p.set.title}. ${p.spotted} of ${p.total} spotted. ${p.tier ? `${p.tier} tier.` : ""} ${meaningLine(p)}`}
      style={row
        ? { paddingHorizontal: space.l, paddingVertical: space.l - 2, gap: space.m, borderTopWidth: first ? 0 : 1, borderTopColor: c.line }
        : { backgroundColor: c.surface, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, padding: space.l, gap: space.m }}>
      <View style={{ flexDirection: "row", gap: space.m, alignItems: "center" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <H3 style={{ flexShrink: 1 }}>{p.set.title}</H3>
            {p.tier && <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: tierColour(p.tier, dark) }}><Text style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, color: dark ? "#121519" : "#FFFFFF" }}>{p.tier.toUpperCase()}</Text></View>}
          </View>
          <Text style={{ fontFamily: F.hand, fontSize: 21, lineHeight: 23, color: c.soft }}>{meaningLine(p)}</Text>
        </View>
        <Ring value={p.total ? p.spotted / p.total : 0} size={54} label={`${p.spotted} of ${p.total}`}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: c.ink, fontVariant: ["tabular-nums"] }}>{p.spotted}</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 9, color: c.soft }}>/{p.total}</Text>
        </Ring>
      </View>
      {p.set.from === "items" ? <ArtStrip list={list} spots={spots} /> : p.set.from === "trains" ? <AbcStrip list={list} spots={spots} /> : <StampDots keys={list.map((e) => e.key)} spots={spots} />}
    </PeekLink>
  );
}

/* ---------- Level ladder ---------- */

export function LevelLadder({ stamps }: { stamps: number }) {
  const { c } = useTheme();
  let at = 0;
  LEVELS.forEach((l, i) => { if (stamps >= l.at) at = i; });
  const next = LEVELS[at + 1];
  return (
    <View accessible accessibilityLabel={`Level: ${LEVELS[at].name}. ${next ? `${next.at - stamps} stamps to ${next.name}.` : "Top level."}`} style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {LEVELS.map((l, i) => (
          <React.Fragment key={l.name}>
            {i > 0 && <View style={{ flex: 1, height: 3, backgroundColor: i <= at ? c.ink : c.line }} />}
            <View style={{ width: i === at ? 18 : 12, height: i === at ? 18 : 12, borderRadius: 9, borderWidth: 2, borderColor: i <= at ? c.ink : c.soft, backgroundColor: i < at ? c.ink : i === at ? c.pass : c.bg }} />
          </React.Fragment>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: c.ink }}>{LEVELS[at].name}</Text>
        <Text style={{ fontFamily: F.mono, fontSize: 11, color: c.soft }}>{next ? `${next.at - stamps} TO ${next.name.toUpperCase()}` : "TOP OF THE LADDER"}</Text>
      </View>
    </View>
  );
}

/* ---------- Week ---------- */

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Seven dots, Monday first: filled on noticing days. No crosses, nothing for a missed day. */
export function WeekDots({ week }: { week: { day: string; noticed: boolean; today: boolean; future: boolean }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {week.map((d, i) => (
        <View key={d.day} style={{ alignItems: "center", gap: 3 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: d.today ? 2 : 1.5, borderStyle: d.noticed ? "solid" : "dotted", borderColor: d.noticed ? c.good : d.today ? c.ink : c.soft, backgroundColor: d.noticed ? c.good : "transparent" }} />
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: d.today ? c.ink : c.soft }}>{DAY_LETTERS[i]}</Text>
        </View>
      ))}
    </View>
  );
}

/** Noticing strength ring with "Noticed on N days this week" beneath. */
export function NoticingRing({ strength, noticed, target, week, size = 76 }: { strength: number; noticed: number; target: number; week: { day: string; noticed: boolean; today: boolean; future: boolean }[]; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: space.m, alignItems: "center" }}>
      <Ring value={strength / 100} size={size} label={`Noticing strength ${strength} out of 100`}>
        <Text style={{ fontFamily: F.display, fontSize: size > 70 ? 22 : 17, color: c.ink, fontVariant: ["tabular-nums"] }}>{strength}</Text>
      </Ring>
      <View style={{ flex: 1, gap: 6 }}>
        <Eyebrow>Noticing strength</Eyebrow>
        <Text accessibilityLabel={`Noticed on ${noticed} ${noticed === 1 ? "day" : "days"} this week. Aim: ${target}.`} style={{ fontFamily: F.bodySemi, fontSize: 15, color: c.ink }}>
          Noticed on {noticed} {noticed === 1 ? "day" : "days"} this week<Text style={{ fontFamily: F.body, color: c.soft }}>{` · aim ${target}`}</Text>
        </Text>
        <WeekDots week={week} />
      </View>
    </View>
  );
}
