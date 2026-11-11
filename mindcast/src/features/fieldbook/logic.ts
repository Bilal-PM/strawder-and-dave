/**
 * Field Book rules. Pure functions, no React, no storage, so every rule is unit tested
 * (src/features/fieldbook/__tests__/logic.test.ts).
 *
 *   entries        one list of everything you can stamp: drawn items, trains (underlined) and places
 *   stamping       once per item per day; bronze, silver, gold on separate days; wrong answers still stamp
 *   weeks          noticing days this week (Monday start) against a target the user picks
 *   strength       a forgiving 0..100 noticing strength: rises on noticing days, dents gently, never resets to zero
 *   tiers          bronze, silver and gold per set at about a third, two thirds and all of it
 *   levels         Platform, Lineside, Signal box, Control, Chief Engineer, by stamps
 *   recall         when a stamped item or a finished stop is due for another look (FSRS, via ts-fsrs)
 *   migration      v1 stores (passport, Loop) folded into the Field Book without losing anything
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";
import type { DomainPack, Lesson, Place, SpotItem, SpotRarity, SpotSet, SpotTag, TrainClass } from "@/domain/types";

/* ---------- Store shapes (the store imports these) ---------- */

/** One stamped thing. `grade` is the number of separate days it earned a stamp (capped by its set). */
export type SpotRecord = { grade: number; days: string[]; first: number; correct: number; photo?: string; via?: "passport" };
export type PracticeStamp = { id: string; lessonId: string | null; text: string; day: string; at: number; from: "use-it" | "week" | "loop" };
/** An FSRS card stored as plain JSON (dates as ISO strings). */
export type RecallCard = { due: string; stability: number; difficulty: number; elapsed_days: number; scheduled_days: number; learning_steps: number; reps: number; lapses: number; state: number; last_review?: string };
export type FieldBook = {
  spots: Record<string, SpotRecord>;
  practice: PracticeStamp[];
  /** Noticing days a week the user aims for. The other days are rest days. */
  target: number;
  /** Recall schedule, by entry key ("fishplate", "train.c66") or "lesson.s1-01". */
  recall: Record<string, RecallCard>;
  /** Tier moments already celebrated, e.g. "signals:silver". */
  celebrated: string[];
  /** Explorer profiles: a grown-up has allowed location checks for place stamps. */
  grownUpLocation: boolean;
};

export const emptyFieldBook = (): FieldBook => ({ spots: {}, practice: [], target: 3, recall: {}, celebrated: [], grownUpLocation: false });

/* ---------- Days ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
/** Local calendar day, YYYY-MM-DD (not UTC, so a late-evening stamp lands on the right day). */
export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromDayKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1, 12); };
export const addDays = (k: string, n: number) => { const d = fromDayKey(k); d.setDate(d.getDate() + n); return dayKey(d); };
/** Monday of the week containing `d` (UK weeks start on Monday). */
export function weekStart(d: Date = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dayKey(x);
}
/** The seven day keys of the week containing `d`, Monday first. */
export const weekDays = (d: Date = new Date()) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(d), i));

/* ---------- Entries: one shape for everything you can stamp ---------- */

export const POINTS: Record<SpotRarity, number> = { common: 5, uncommon: 15, rare: 30 };

export type Entry = {
  key: string;
  set: string;
  kind: "item" | "train" | "place";
  name: string;
  rarity: SpotRarity;
  look: string;
  why: string;
  lesson?: string;
  season?: number;
  tags: SpotTag[];
  maxGrade: number;
  item?: SpotItem;
  train?: TrainClass;
  place?: Place;
};

export const trainKey = (id: string) => `train.${id}`;
export const placeKey = (id: string) => `place.${id}`;

type PackLike = Pick<DomainPack, "spots" | "trains" | "places">;
const cache = new WeakMap<object, Entry[]>();

/** Every stampable entry in the pack, in book order. */
export function entries(pack: PackLike): Entry[] {
  const hit = cache.get(pack);
  if (hit) return hit;
  const out: Entry[] = [];
  for (const set of pack.spots.sets) {
    if (set.from === "items") {
      for (const it of pack.spots.items.filter((x) => x.set === set.id))
        out.push({ key: it.id, set: set.id, kind: "item", name: it.name, rarity: it.rarity, look: it.look, why: it.why, lesson: it.lesson, season: it.season, tags: it.tags ?? [], maxGrade: set.grades, item: it });
    } else if (set.from === "trains") {
      for (const t of pack.trains)
        out.push({ key: trainKey(t.id), set: set.id, kind: "train", name: t.name, rarity: pack.spots.rarity.trains[t.group] ?? "common", look: t.spotting, why: t.fact, tags: t.id === "mpv" ? ["leaf"] : [], maxGrade: set.grades, train: t });
    } else {
      for (const p of pack.places)
        out.push({ key: placeKey(p.id), set: set.id, kind: "place", name: p.name, rarity: pack.spots.rarity.places, look: `Get off at ${p.station}.`, why: p.fact, tags: [], maxGrade: set.grades, place: p });
    }
  }
  cache.set(pack, out);
  return out;
}

export const entryByKey = (pack: PackLike, key: string) => entries(pack).find((e) => e.key === key);
export const setEntries = (pack: PackLike, setId: string) => entries(pack).filter((e) => e.set === setId);

/* ---------- Stamping ---------- */

export type StampOutcome =
  | { ok: true; record: SpotRecord; grade: number; first: boolean; upgraded: boolean; review: boolean }
  | { ok: false; reason: "today" | "unknown" };

/**
 * Apply one spotting to a record. Once per item per day. A later day upgrades the grade up to the set's maximum;
 * after that it still counts as a noticing day and a recall review, but the grade stays.
 * Wrong answers still stamp: `correct` only counts how often the recall question was right.
 */
export function applyStamp(prev: SpotRecord | undefined, day: string, correct: boolean, maxGrade: number, at = Date.now()): StampOutcome {
  if (prev && prev.days.includes(day)) return { ok: false, reason: "today" };
  const base: SpotRecord = prev ?? { grade: 0, days: [], first: at, correct: 0 };
  const grade = Math.min(maxGrade, base.grade + 1);
  const record: SpotRecord = { ...base, grade, days: [...base.days, day], correct: base.correct + (correct ? 1 : 0), first: base.first || at };
  return { ok: true, record, grade, first: !prev || prev.grade === 0, upgraded: grade > base.grade && base.grade > 0, review: grade === base.grade };
}

export const canStampToday = (rec: SpotRecord | undefined, day = dayKey()) => !rec || !rec.days.includes(day);
export const GRADE_NAMES = ["", "Bronze", "Silver", "Gold"] as const;
export const gradeName = (g: number, max: number) => (max === 1 ? (g ? "Spotted" : "") : GRADE_NAMES[Math.min(3, g)] ?? "");

/* ---------- Counting ---------- */

/** Total stamps: one per grade earned on each item, plus every practice stamp. */
export function stampsTotal(fb: Pick<FieldBook, "spots" | "practice">) {
  let n = 0;
  for (const r of Object.values(fb.spots ?? {})) n += Math.max(0, r?.grade ?? 0);
  return n + (fb.practice?.length ?? 0);
}

/** Every day something was noticed: a spot or a practice stamp. */
export function noticedDays(fb: Pick<FieldBook, "spots" | "practice">): Set<string> {
  const s = new Set<string>();
  for (const r of Object.values(fb.spots ?? {})) for (const d of r?.days ?? []) s.add(d);
  for (const p of fb.practice ?? []) if (p?.day) s.add(p.day);
  return s;
}

export function noticedThisWeek(fb: Pick<FieldBook, "spots" | "practice">, now = new Date()) {
  const days = noticedDays(fb);
  return weekDays(now).filter((d) => days.has(d)).length;
}

/**
 * Noticing strength, 0..100. An exponential moving average over days, written for Groundwork:
 * each day, strength moves a small step towards 1 (noticed) or 0 (not). Scaled so a week that meets the target
 * sits near 100. A missed day takes a small dent; once you have noticed anything it never drops below a floor.
 */
export const STRENGTH = { alpha: 0.08, floor: 8, window: 180 } as const;
export function noticingStrength(days: Set<string>, target: number, now = new Date()): number {
  if (!days.size) return 0;
  const today = dayKey(now);
  const first = [...days].sort()[0];
  let k = first < addDays(today, -STRENGTH.window) ? addDays(today, -STRENGTH.window) : first;
  let ema = 0;
  for (let guard = 0; k <= today && guard < STRENGTH.window + 2; guard++, k = addDays(k, 1)) ema += STRENGTH.alpha * ((days.has(k) ? 1 : 0) - ema);
  const expected = Math.max(1, Math.min(7, target)) / 7;
  return Math.max(STRENGTH.floor, Math.min(100, Math.round((100 * ema) / expected)));
}

/* ---------- Tiers and levels ---------- */

export type Tier = "bronze" | "silver" | "gold";
export const TIERS: Tier[] = ["bronze", "silver", "gold"];

/** Spotted counts needed for each tier: about a third, two thirds, and every item. */
export function tierThresholds(n: number): Record<Tier, number> {
  if (n <= 0) return { bronze: 1, silver: 1, gold: 1 };
  const bronze = Math.max(1, Math.ceil(n / 3));
  const silver = Math.min(n, Math.max(bronze + 1, Math.ceil((2 * n) / 3)));
  return { bronze, silver, gold: n };
}

export type SetProgress = { set: SpotSet; total: number; spotted: number; tier: Tier | null; next: Tier | null; toNext: number; thresholds: Record<Tier, number> };

export function setProgress(pack: PackLike, set: SpotSet, spots: Record<string, SpotRecord>): SetProgress {
  const list = setEntries(pack, set.id);
  const spotted = list.filter((e) => (spots?.[e.key]?.grade ?? 0) > 0).length;
  const t = tierThresholds(list.length);
  const tier: Tier | null = spotted >= t.gold ? "gold" : spotted >= t.silver ? "silver" : spotted >= t.bronze ? "bronze" : null;
  const next: Tier | null = tier === "gold" ? null : tier === "silver" ? "gold" : tier === "bronze" ? "silver" : "bronze";
  return { set, total: list.length, spotted, tier, next, toNext: next ? t[next] - spotted : 0, thresholds: t };
}

export const allSetProgress = (pack: PackLike, spots: Record<string, SpotRecord>) => pack.spots.sets.map((s) => setProgress(pack, s, spots));

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** What a stamp means, in one line: "2 more and the Signals set is silver". */
export function meaningLine(p: SetProgress): string {
  const name = p.set.title.split(" ")[0];
  if (!p.next) return `The ${name} set is gold. Every one spotted.`;
  return `${p.toNext} more and the ${name} set is ${p.next}.`;
}
export const tierLabel = (t: Tier | null) => (t ? cap(t) : "Not started");

export const LEVELS = [
  { name: "Platform", at: 0 },
  { name: "Lineside", at: 10 },
  { name: "Signal box", at: 30 },
  { name: "Control", at: 60 },
  { name: "Chief Engineer", at: 100 },
] as const;

export function levelFor(stamps: number) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (stamps >= LEVELS[k].at) i = k;
  const next = LEVELS[i + 1];
  return { index: i, name: LEVELS[i].name, next: next?.name ?? null, toNext: next ? next.at - stamps : 0 };
}

/* ---------- Rewards ---------- */

/** Crew kit options earned at a set's silver tier (index into CREW_OPTIONS in features/crew/draw). */
export const SET_KIT: Record<string, { part: "kit" | "head" | "hand"; index: number }> = {
  track: { part: "hand", index: 3 }, // Track gauge
  signals: { part: "hand", index: 4 }, // Hand lamp
  structures: { part: "head", index: 2 }, // Orange bump cap
  trains: { part: "head", index: 3 }, // Guard's cap
  places: { part: "kit", index: 3 }, // Heritage jacket
};

/** Kit options earned so far, as "part:index" strings. */
export function earnedKit(pack: PackLike, spots: Record<string, SpotRecord>): Set<string> {
  const out = new Set<string>();
  for (const p of allSetProgress(pack, spots)) {
    const k = SET_KIT[p.set.id];
    if (k && (p.tier === "silver" || p.tier === "gold")) out.add(`${k.part}:${k.index}`);
  }
  return out;
}

/** Any set at bronze opens a preview of the next season. */
export const seasonPreviewOpen = (pack: PackLike, spots: Record<string, SpotRecord>) => allSetProgress(pack, spots).some((p) => p.tier !== null);

/* ---------- Recall questions ---------- */

export type Option = { key: string; text?: string };
export type Question = { kind: "art" | "why" | "look" | "station"; prompt: string; options: Option[]; answer: number; explain: string };

/** Small deterministic hash so a question is stable for a given item and day. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pickDistractors(pool: Entry[], self: Entry, seed: number, n: number, distinct: (e: Entry) => string) {
  const seen = new Set([distinct(self)]);
  const ranked = pool.filter((e) => e.key !== self.key).sort((a, b) => hash(a.key + seed) - hash(b.key + seed));
  const out: Entry[] = [];
  for (const e of ranked) { const k = distinct(e); if (!seen.has(k)) { seen.add(k); out.push(e); } if (out.length === n) break; }
  return out;
}

/**
 * One recall question for a spotting. The kind changes with each visit so each one is a different retrieval:
 * first "which one did you see?" (the drawing), then "why is it there?", then "which clue gives it away?".
 * Trains always ask for the drawing; places ask where to get off.
 */
export function questionFor(pack: PackLike, e: Entry, visit: number, seedText: string): Question {
  const seed = hash(seedText + e.key);
  const pool = setEntries(pack, e.set);
  const place3 = (correct: Option, wrong: Option[]) => {
    const at = seed % (wrong.length + 1);
    const options = [...wrong];
    options.splice(at, 0, correct);
    return { options, answer: at };
  };
  if (e.kind === "place" && e.place) {
    const others = pickDistractors(pool, e, seed, 2, (x) => x.place?.station ?? x.key);
    const { options, answer } = place3({ key: e.key, text: e.place.station }, others.map((o) => ({ key: o.key, text: o.place?.station })));
    return { kind: "station", prompt: `Where do you get off for ${e.name}?`, options, answer, explain: `Get off at ${e.place.station}.` };
  }
  const kind: Question["kind"] = e.kind === "train" ? "art" : (["art", "why", "look"] as const)[visit % 3];
  if (kind === "art") {
    const others = pickDistractors(pool, e, seed, 2, (x) => x.key);
    const { options, answer } = place3({ key: e.key }, others.map((o) => ({ key: o.key })));
    return { kind, prompt: "Which one did you see?", options, answer, explain: e.kind === "train" ? `That's the ${e.name}. ${e.look}` : `That's the ${e.name.toLowerCase()}. ${e.look}` };
  }
  const field = kind === "why" ? (x: Entry) => x.why : (x: Entry) => x.look;
  const others = pickDistractors(pool, e, seed, 2, field);
  const { options, answer } = place3({ key: e.key, text: field(e) }, others.map((o) => ({ key: o.key, text: field(o) })));
  return kind === "why"
    ? { kind, prompt: `Why is the ${e.name.toLowerCase()} there?`, options, answer, explain: e.why }
    : { kind, prompt: `Which clue gives the ${e.name.toLowerCase()} away?`, options, answer, explain: e.look };
}

/* ---------- Spot of the day ---------- */

export type DayWeather = { max: number; min: number; rain: number; gust: number; code: number } | null;
export type SpotOfDay = { entry: Entry; reason: SpotTag | "rotate" };

/** Which tag today's weather or season points at, if any. */
export function weatherTag(wx: DayWeather, date: Date): SpotTag | null {
  const month = date.getMonth() + 1;
  if (wx && wx.max >= 25) return "heat";
  if (wx && (wx.min <= 0 || [71, 73, 75, 77, 85, 86].includes(wx.code))) return "cold";
  if (month >= 10 && month <= 12) return "leaf";
  if (wx && wx.rain >= 20) return "wet";
  return null;
}

/**
 * One thing to look for today. Weather or season first (hot: rails and joints; frost: points; autumn: the railhead),
 * otherwise a daily rotation. Unspotted things are preferred either way, and never a place (you have to travel).
 */
export function spotOfTheDay(pack: PackLike, spots: Record<string, SpotRecord>, date: Date, wx: DayWeather): SpotOfDay | null {
  const all = entries(pack).filter((e) => e.kind !== "place");
  if (!all.length) return null;
  const day = dayKey(date);
  const unspotted = (e: Entry) => !(spots?.[e.key]?.grade);
  const order = (list: Entry[]) => [...list].sort((a, b) => Number(unspotted(b)) - Number(unspotted(a)) || hash(day + a.key) - hash(day + b.key));
  const tag = weatherTag(wx, date);
  if (tag) {
    const tagged = all.filter((e) => e.tags.includes(tag) && e.kind === "item");
    if (tagged.length) return { entry: order(tagged)[0], reason: tag };
  }
  const items = all.filter((e) => e.kind === "item");
  const pool = items.filter(unspotted).length ? items.filter(unspotted) : items;
  return { entry: pool[hash(day) % pool.length], reason: "rotate" };
}

/* ---------- Recall timing (FSRS) ---------- */

const scheduler = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false }));

export const toCard = (r: RecallCard): Card => ({ ...r, due: new Date(r.due), last_review: r.last_review ? new Date(r.last_review) : undefined }) as Card;
export const fromCard = (c: Card): RecallCard => ({
  due: c.due.toISOString(), stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days,
  learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state, last_review: c.last_review ? c.last_review.toISOString() : undefined,
});

/** Schedule the next look after a review. `quality` 0..1: 1 = recalled well, 0 = got it wrong. */
export function review(prev: RecallCard | undefined, quality: number, now = new Date()): RecallCard {
  const card = prev ? toCard(prev) : createEmptyCard(now);
  const g: Grade = quality >= 0.99 ? Rating.Good : quality >= 0.6 ? Rating.Hard : Rating.Again;
  return fromCard(scheduler.next(card, now, g).card);
}

/** Keys due for another look by the end of `now`'s day. */
export function dueKeys(recall: Record<string, RecallCard>, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return Object.entries(recall ?? {}).filter(([, r]) => r && new Date(r.due) <= end).map(([k]) => k);
}

/* ---------- Practice prompts ---------- */

export function practicePrompt(l: Lesson, explorer: boolean, practice: DomainPack["spots"]["practice"]) {
  if (explorer) return { prompt: practice[l.id]?.explorer ?? "Where did you see this idea today, at home or at school?", hint: "One or two lines is plenty." };
  return { prompt: "Where did you see this today?", hint: l.lens.principle, example: l.action };
}

/* ---------- Migration from the v1 store ---------- */

type V1 = { passport?: unknown; loop?: { items?: unknown } | null; fieldbook?: unknown };

/** Build a Field Book from a v1 store: passport stamps become place stamps; learned Loop items become practice stamps. */
export function fieldBookFromV1(old: V1): FieldBook {
  const fb = emptyFieldBook();
  const passport = Array.isArray(old?.passport) ? old.passport.filter((x): x is string => typeof x === "string") : [];
  for (const id of passport) fb.spots[placeKey(id)] = { grade: 1, days: [], first: 0, correct: 0, via: "passport" };
  const items = Array.isArray(old?.loop?.items) ? (old.loop!.items as unknown[]) : [];
  for (const raw of items) {
    const it = raw as { id?: unknown; stage?: unknown; learned?: unknown; doneAt?: unknown };
    if (it?.stage !== "learn" || typeof it.learned !== "string" || !it.learned.trim()) continue;
    const at = typeof it.doneAt === "number" ? it.doneAt : 0;
    const lesson = typeof it.id === "string" ? /^loop-(s\d+-\d+)-lens/.exec(it.id)?.[1] ?? null : null;
    fb.practice.push({ id: `loop-${String(it.id ?? fb.practice.length)}`, lessonId: lesson, text: it.learned.trim(), day: at ? dayKey(new Date(at)) : "", at, from: "loop" });
  }
  return fb;
}

/** Make any stored Field Book safe to read: missing or broken fields fall back to defaults. */
export function sanitiseFieldBook(raw: unknown): FieldBook {
  const d = emptyFieldBook();
  const f = (raw && typeof raw === "object" ? raw : {}) as Partial<FieldBook>;
  const spots: Record<string, SpotRecord> = {};
  if (f.spots && typeof f.spots === "object") {
    for (const [k, r] of Object.entries(f.spots)) {
      if (!r || typeof r !== "object") continue;
      spots[k] = { grade: Number.isFinite(r.grade) ? Math.max(0, Math.min(3, r.grade)) : 0, days: Array.isArray(r.days) ? r.days.filter((x) => typeof x === "string") : [], first: Number(r.first) || 0, correct: Number(r.correct) || 0, ...(typeof r.photo === "string" ? { photo: r.photo } : {}), ...(r.via === "passport" ? { via: "passport" as const } : {}) };
    }
  }
  return {
    spots,
    practice: Array.isArray(f.practice) ? f.practice.filter((p) => p && typeof p.text === "string") : d.practice,
    target: Number.isFinite(f.target) ? Math.max(1, Math.min(7, Number(f.target))) : d.target,
    recall: f.recall && typeof f.recall === "object" ? f.recall : {},
    celebrated: Array.isArray(f.celebrated) ? f.celebrated : [],
    grownUpLocation: !!f.grownUpLocation,
  };
}
