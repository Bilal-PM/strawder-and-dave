/**
 * Where a piece of live data points in the course: a lesson, or a season when the lesson is not written yet.
 * Pure data here; `resolveLink` turns it into a route and a label using the active domain pack.
 */
import type { DomainPack } from "@/domain/types";

/** `event` is a keyword matched against Season.event (e.g. "leaf"), so the right season is found even if numbering changes. */
export type Topic = { lesson?: string; season?: number; event?: string; label: string };

export type ResolvedLink = { href: string; label: string; kind: "lesson" | "season" };

/** Turn a topic into a tappable destination. Lessons win; a season falls back to the Line tab. */
export function resolveLink(t: Topic, pack: Pick<DomainPack, "lessons" | "seasons">): ResolvedLink | null {
  if (t.lesson) {
    const l = pack.lessons.find((x) => x.id === t.lesson);
    if (l) return { href: `/lesson/${l.id}`, label: `Stop ${l.stop}: ${l.title}`, kind: "lesson" };
  }
  const byEvent = t.event ? pack.seasons.find((x) => new RegExp(t.event!, "i").test(x.event)) : undefined;
  const n = byEvent?.n ?? t.season ?? (t.lesson ? Number(/^s(\d+)-/.exec(t.lesson)?.[1]) : NaN);
  if (Number.isFinite(n)) {
    const s = byEvent ?? pack.seasons.find((x) => x.n === n);
    const label = byEvent ? `${byEvent.event}, Season ${byEvent.n}` : s ? `Season ${s.n}: ${s.title}` : `Season ${n}`;
    return { href: "/line", label, kind: "season" };
  }
  return null;
}

/**
 * History events and places link with a free string: a lesson id ("s1-08") or a season name ("Season 4: Structures").
 */
export function topicFromLinkString(link: string | undefined): Topic | null {
  if (!link) return null;
  if (/^s\d+-\d+$/.test(link)) return { lesson: link, label: link };
  const m = /Season\s+(\d+)/i.exec(link);
  if (m) return { season: Number(m[1]), label: link };
  return null;
}
