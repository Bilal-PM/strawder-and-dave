import { pack, type Companion } from "@/domain";
import { setProgress, stampsTotal } from "@/features/fieldbook/logic";
import type { State } from "@/state/store";

type S = Pick<State, "progress" | "pass"> & { fieldbook?: State["fieldbook"]; companions?: State["companions"] };

/** Is this companion unlocked for the current learner? Anything already earned on this phone stays earned. */
export function isUnlocked(c: Companion, s: S) {
  if (s.companions?.unlocked?.includes(c.id)) return true;
  const u = c.unlock;
  const fb = s.fieldbook;
  if (u.type === "start") return true;
  if (u.type === "stamps") return !!fb && stampsTotal(fb) >= u.count;
  if (u.type === "set") {
    const set = pack.spots.sets.find((x) => x.id === u.set);
    return !!fb && !!set && setProgress(pack, set, fb.spots).tier === "gold";
  }
  if (u.type === "streak") return s.progress.streak >= u.days;
  if (u.type === "stop") return s.progress.season > u.season || s.progress.completed.includes(`s${u.season}-${String(u.stop).padStart(2, "0")}`);
  if (u.type === "pass") return s.pass.preview && s.progress.stop >= u.stop;
  return false;
}

export function unlockText(c: Companion) {
  const u = c.unlock;
  if (u.type === "start") return "With you from day one.";
  if (u.type === "stamps") return `Free: collect ${u.count} stamps in your Field Book.`;
  if (u.type === "set") return `Free: spot everything in the ${pack.spots.sets.find((x) => x.id === u.set)?.title ?? "set"} set.`;
  if (u.type === "streak") return `Free: notice on ${u.days} days.`;
  if (u.type === "stop") return `Free: finish Season ${u.season}.`;
  if (u.type === "pass") return `Season Pass reward at stop ${u.stop}, or £1 on its own.`;
  return `Free during the Season ${u.season} event, then £1 on its own.`;
}

/** Ids that are unlocked now but were not before. */
export function newlyUnlocked(s: S & Pick<State, "companions">) {
  return pack.companions.filter((c) => isUnlocked(c, { ...s, companions: undefined }) && !s.companions.unlocked.includes(c.id)).map((c) => c.id);
}
