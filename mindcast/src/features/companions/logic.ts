import { pack, type Companion } from "@/domain";
import type { State } from "@/state/store";

/** Is this companion unlocked for the current learner? */
export function isUnlocked(c: Companion, s: Pick<State, "progress" | "pass">) {
  const u = c.unlock;
  if (u.type === "start") return true;
  if (u.type === "streak") return s.progress.streak >= u.days;
  // Field Book rewards (not used by the railway pack yet): honour anything already earned on this phone.
  if (u.type === "stamps" || u.type === "set") return false;
  if (u.type === "stop") return s.progress.season > u.season || s.progress.completed.includes(`s${u.season}-${String(u.stop).padStart(2, "0")}`);
  if (u.type === "pass") return s.pass.preview && s.progress.stop >= u.stop;
  return false;
}

export function unlockText(c: Companion) {
  const u = c.unlock;
  if (u.type === "start") return "With you from day one.";
  if (u.type === "streak") return `Free: keep a ${u.days}-day learning streak.`;
  if (u.type === "stamps") return `Free: collect ${u.count} stamps in your Field Book.`;
  if (u.type === "set") return "Free: fill a set in your Field Book.";
  if (u.type === "stop") return `Free: finish Season ${u.season}.`;
  if (u.type === "pass") return `Season Pass reward at stop ${u.stop}, or £1 on its own.`;
  return `Free during the Season ${u.season} event, then £1 on its own.`;
}

/** Ids that are unlocked now but were not before. */
export function newlyUnlocked(s: Pick<State, "progress" | "pass" | "companions">) {
  return pack.companions.filter((c) => isUnlocked(c, s) && !s.companions.unlocked.includes(c.id)).map((c) => c.id);
}
