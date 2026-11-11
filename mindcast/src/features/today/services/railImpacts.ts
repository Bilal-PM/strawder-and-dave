/**
 * Railway weather rules: turn a day's forecast into what it means for the track.
 * Pure functions, no React and no network, so they are easy to test (see __tests__/railImpacts.test.ts).
 *
 * Thresholds are deliberately simple and conservative. They describe what engineers watch for,
 * not what will happen on a given line. Wording is plain British English.
 */
import type { Topic } from "./links";

/** One day of forecast, in the units Open-Meteo returns (deg C, mm, km/h, WMO weather code). */
export type DayWx = { date: string; max: number; min: number; rain: number; gust: number; code: number };

export type Sky = "sun" | "part" | "cloud" | "fog" | "rain" | "storm" | "snow" | "wind";

export type ImpactId = "very-hot" | "hot" | "frost" | "snow" | "leaf" | "wind" | "rain";
/** Colour role: ppe = heat, accent = cold and water, leaf = autumn, soft = wind. */
export type Tone = "ppe" | "accent" | "leaf" | "soft";
export type Impact = { id: ImpactId; title: string; text: string; tone: Tone; topic: Topic };

export type EventId = "buckle" | "ice" | "leaf" | "quiet";
export type RailEvent = { id: EventId; title: string; text: string; sky: Sky; days: number; topic?: Topic };

export const RULES = {
  veryHot: 30, // max air temperature, deg C
  hot: 25,
  frost: 0, // min air temperature, deg C
  leafGust: 40, // km/h, with any rain also counting
  highWind: 70, // km/h gusts (about 43 mph)
  heavyRain: 20, // mm in the day
  windySky: 50, // km/h gusts to draw a windy sky on a dry day
} as const;

const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const isSnow = (code: number) => SNOW_CODES.has(code);

/** Month 1-12 from an ISO date, read without time zone surprises. */
export const monthOf = (isoDate: string) => Number(isoDate.slice(5, 7));

/** WMO weather code (Open-Meteo) to a drawable sky. */
export function skyFromCode(code: number, gust = 0): Sky {
  if (code >= 95) return "storm";
  if (isSnow(code)) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (gust >= RULES.windySky) return "wind";
  if (code === 0 || code === 1) return "sun";
  if (code === 2) return "part";
  return "cloud";
}

const SKY_WORDS: Record<Sky, string> = { sun: "sunny", part: "sunny spells", cloud: "cloudy", fog: "foggy", rain: "rain", storm: "thunderstorms", snow: "snow", wind: "windy" };
export const skyWords = (s: Sky) => SKY_WORDS[s];

/** Leaf fall season on the railway: October to December. */
export const isLeafSeason = (month: number) => month >= 10 && month <= 12;
/** The cold half of the year, when frost turns into an event rather than a one-off. */
export const isIceSeason = (month: number) => month >= 11 || month <= 3;

/** What a day's weather means for the track, most important first. */
export function impacts(d: DayWx): Impact[] {
  const out: Impact[] = [];
  const month = monthOf(d.date);
  if (d.max >= RULES.veryHot) out.push({ id: "very-hot", title: "Very hot rails", text: "Rails in full sun get far hotter than the air. Engineers watch for buckles and may slow trains.", tone: "ppe", topic: { lesson: "s1-08", label: "Buckles" } });
  else if (d.max >= RULES.hot) out.push({ id: "hot", title: "Hot rails", text: "A warm day for steel. This is when the stretching done at installation pays off.", tone: "ppe", topic: { lesson: "s1-07", label: "Stressing" } });
  if (d.min <= RULES.frost) out.push({ id: "frost", title: "Frost", text: "Points can freeze and rails can ice. Heaters on the points help keep trains moving.", tone: "accent", topic: { lesson: "s1-14", label: "Points" } });
  if (isSnow(d.code)) out.push({ id: "snow", title: "Snow", text: "Snow can pack into points and stop them moving. Heaters and snow ploughs help.", tone: "accent", topic: { lesson: "s1-14", label: "Points" } });
  if (isLeafSeason(month) && (d.gust >= RULES.leafGust || d.rain > 0)) out.push({ id: "leaf", title: "Leaf fall", text: "Wind and rain bring leaves down. Wheels crush them into a slippery layer on the rail.", tone: "leaf", topic: { season: 2, event: "leaf", label: "Leaf fall" } });
  if (d.gust >= RULES.highWind) out.push({ id: "wind", title: "High winds", text: "Trees and debris can end up on the line. Patrols check the worst spots.", tone: "soft", topic: { lesson: "s1-15", label: "Inspection" } });
  if (d.rain >= RULES.heavyRain) out.push({ id: "rain", title: "Heavy rain", text: "Drainage works hard today. Water is the track's oldest enemy.", tone: "accent", topic: { lesson: "s1-09", label: "Drainage" } });
  return out;
}

/** One line summary of a day for screen readers and the detail line. */
export function describeDay(d: DayWx, label: string): string {
  const imp = impacts(d);
  const wx = `${label}: ${skyWords(skyFromCode(d.code, d.gust))}, high ${Math.round(d.max)}, low ${Math.round(d.min)} degrees`;
  return imp.length ? `${wx}. ${imp.map((i) => i.title).join(", ")}.` : `${wx}. Nothing for the track to worry about.`;
}

/**
 * Which seasonal event the week switches on. The event with the most qualifying days wins;
 * ties go to heat, then ice, then leaf fall, because those have the sharpest effect on the track.
 */
export function weekEvent(days: DayWx[]): RailEvent {
  let hot = 0, ice = 0, leaf = 0;
  for (const d of days) {
    const ids = new Set(impacts(d).map((i) => i.id));
    const m = monthOf(d.date);
    if (ids.has("hot") || ids.has("very-hot")) hot++;
    if ((ids.has("frost") || ids.has("snow")) && isIceSeason(m)) ice++;
    if (ids.has("leaf")) leaf++;
  }
  const best = Math.max(hot, ice, leaf);
  if (best === 0) return { id: "quiet", title: "A quiet week for the track", text: "No weather events this week. A good week to catch up on stops.", sky: "cloud", days: 0 };
  if (hot === best) return { id: "buckle", title: "Buckle Watch is on", text: "Hot days ahead. Steel grows in the heat, so this is the week to learn how track is kept from buckling.", sky: "sun", days: hot, topic: { lesson: "s1-08", label: "Buckles" } };
  if (ice === best) return { id: "ice", title: "Ice on the line", text: "A cold snap. Points heaters and icy rails are the story this week.", sky: "snow", days: ice, topic: { lesson: "s1-14", label: "Points" } };
  return { id: "leaf", title: "Leaf fall is on", text: "Windy, wet autumn days. Slippery rails and the trains that clean them are the story this week.", sky: "wind", days: leaf, topic: { season: 2, event: "leaf", label: "Leaf fall" } };
}
