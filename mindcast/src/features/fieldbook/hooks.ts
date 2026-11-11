/** Derived Field Book numbers for screens. Each hook selects only what it needs from the store. */
import { useMemo } from "react";
import { pack } from "@/domain";
import { useStore } from "@/state/store";
import { allSetProgress, dayKey, dueKeys, entryByKey, levelFor, noticedDays, noticedThisWeek, noticingStrength, stampsTotal, weekDays } from "./logic";

export function useFieldBook() {
  const fb = useStore((s) => s.fieldbook);
  return useMemo(() => {
    const now = new Date();
    const stamps = stampsTotal(fb);
    const sets = allSetProgress(pack, fb.spots);
    const days = noticedDays(fb);
    return {
      fb,
      stamps,
      sets,
      setsDone: sets.filter((p) => p.tier === "gold").length,
      level: levelFor(stamps),
      week: weekDays(now).map((d) => ({ day: d, noticed: days.has(d), today: d === dayKey(now), future: d > dayKey(now) })),
      noticedWeek: noticedThisWeek(fb, now),
      strength: noticingStrength(days, fb.target, now),
      target: fb.target,
    };
  }, [fb]);
}

/** What is due for another look today: stamped items to look for again, and stops to revisit. */
export function useDue() {
  const recall = useStore((s) => s.fieldbook.recall);
  return useMemo(() => {
    const keys = dueKeys(recall);
    const look = keys.filter((k) => !k.startsWith("lesson.")).map((k) => entryByKey(pack, k)).filter((e) => !!e && e.kind !== "place");
    const revisit = keys.filter((k) => k.startsWith("lesson.")).map((k) => pack.lessons.find((l) => `lesson.${l.id}` === k)).filter((l) => !!l);
    return { look: look as NonNullable<(typeof look)[number]>[], revisit: revisit as NonNullable<(typeof revisit)[number]>[] };
  }, [recall]);
}

export const useKid = () => useStore((s) => s.profile.audience === "explorer");
