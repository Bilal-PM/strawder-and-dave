/**
 * Railway history for the Today card: today's event, or the next one coming up (wrapping into next year).
 * Pure functions over the domain pack's `history` list.
 */
import type { HistoryEvent } from "@/domain/types";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const dayKey = (month: number, day: number) => month * 100 + day;

/** Events in calendar order (month, day, then year). */
export function calendarOrder(events: HistoryEvent[]): HistoryEvent[] {
  return [...events].sort((a, b) => dayKey(a.month, a.day) - dayKey(b.month, b.day) || a.year - b.year);
}

export type HistoryPick = { index: number; when: "today" | "upcoming" };

/** Index (into calendarOrder(events)) of today's event, else the next upcoming one. */
export function pickHistory(ordered: HistoryEvent[], now: Date): HistoryPick | null {
  if (!ordered.length) return null;
  const t = dayKey(now.getMonth() + 1, now.getDate());
  const i = ordered.findIndex((e) => dayKey(e.month, e.day) >= t);
  const index = i < 0 ? 0 : i;
  return { index, when: dayKey(ordered[index].month, ordered[index].day) === t ? "today" : "upcoming" };
}

/** Label for the card's eyebrow, relative to now. */
export function whenLabel(e: HistoryEvent, now: Date): string {
  const t = dayKey(now.getMonth() + 1, now.getDate()), k = dayKey(e.month, e.day);
  if (k === t) return "Today in railway history";
  const next = new Date(now.getFullYear() + (k < t ? 1 : 0), e.month - 1, e.day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((next.getTime() - today.getTime()) / 86400000);
  if (days === 1) return "Tomorrow in railway history";
  if (days <= 14) return `In ${days} days: railway history`;
  return `Coming up on ${e.day} ${MONTHS[e.month - 1]}`;
}

export const eventDate = (e: HistoryEvent) => `${e.day} ${MONTHS[e.month - 1]} ${e.year}`;
