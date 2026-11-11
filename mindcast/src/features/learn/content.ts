/**
 * Read-only helpers over the domain pack for the Learn feature.
 * Railway facts and numbers always come from the pack (lessons, keyFacts, glossary), never from here.
 */
import { pack } from "@/domain";
import type { Companion, GlossaryTerm, Lesson, Season, Source } from "@/domain/types";

/** Number of stops on a season line. */
export const STOPS = 20;

export const seasonInfo = (n: number): Season | undefined => pack.seasons.find((s) => s.n === n) ?? pack.seasons[0];

/** Lessons of a season, sorted by stop. */
export function seasonLessons(n: number): Lesson[] {
  return pack.lessons.filter((l) => l.season === n).sort((a, b) => a.stop - b.stop);
}

/** One slot per stop (1..STOPS); missing lessons are undefined ("coming soon"). */
export function seasonSlots(n: number): (Lesson | undefined)[] {
  const ls = seasonLessons(n);
  return Array.from({ length: STOPS }, (_, i) => ls.find((l) => l.stop === i + 1));
}

export const lessonAt = (season: number, stop: number) => pack.lessons.find((l) => l.season === season && l.stop === stop);

const norm = (s: string) => s.trim().toLowerCase();

/** Glossary entry for a term (case-insensitive, also tries a simple singular/plural match). */
export function glossaryTerm(term: string): GlossaryTerm | undefined {
  const t = norm(term);
  return pack.glossary.find((g) => { const k = norm(g.term); return k === t || k + "s" === t || k === t + "s"; });
}

/** Glossary entries for a lesson's terms, longest first (so "sub-ballast" wins over "ballast"). */
export function lessonGlossary(l: Lesson): GlossaryTerm[] {
  const seen = new Set<string>();
  const out: GlossaryTerm[] = [];
  for (const t of l.terms) {
    const g = glossaryTerm(t);
    if (g && !seen.has(g.term)) { seen.add(g.term); out.push(g); }
  }
  return out.sort((a, b) => b.term.length - a.term.length);
}

export type Fact = { text: string; sources: Source[] };

/** First key fact whose text matches the pattern. Diagrams use this to show real numbers. */
export function factMatching(l: Lesson | undefined, re: RegExp): Fact | undefined {
  return l?.keyFacts.find((f) => re.test(f.text));
}

/** Pull a number-with-unit string (e.g. "1,435 mm") out of the first fact that matches `topic`. */
export function factQuantity(l: Lesson | undefined, topic: RegExp, unit: RegExp): string | undefined {
  for (const f of l?.keyFacts ?? []) {
    if (!topic.test(f.text)) continue;
    const m = f.text.match(new RegExp(`(\\d[\\d,.]*(?:\\s?(?:-|to|and)\\s?\\d[\\d,.]*)?)\\s?(${unit.source})`, "i"));
    if (m) return `${m[1]} ${m[2]}`.replace(/\s+/g, " ");
  }
  return undefined;
}

/** The companion that greets on the Line: most recently unlocked one that exists in the pack. */
export function lineCompanion(unlocked: string[]): Companion | undefined {
  for (let i = unlocked.length - 1; i >= 0; i--) {
    const c = pack.companions.find((x) => x.id === unlocked[i]);
    if (c) return c;
  }
  return pack.companions[0];
}

/** Small stable pick so a line doesn't flicker between renders. */
export const pick = <T,>(xs: T[], n: number): T | undefined => (xs.length ? xs[((n % xs.length) + xs.length) % xs.length] : undefined);

export const sourceText = (s: Source) => [s.label, s.where].filter(Boolean).join(", ");
