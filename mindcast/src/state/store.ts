import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { pack } from "@/domain";
import type { Audience, Mindcast } from "@/domain/types";
import { applyStamp, dayKey, emptyFieldBook, entryByKey, fieldBookFromV1, review, sanitiseFieldBook, type FieldBook, type PracticeStamp, type StampOutcome } from "@/features/fieldbook/logic";

export type { FieldBook, PracticeStamp, SpotRecord } from "@/features/fieldbook/logic";

/** A "Your week" item: plan, then do, then notice ("learn" is the stored name for noticed, kept from the old Loop). */
export type LoopItem = { id: string; text: string; stage: "plan" | "do" | "learn"; learned?: string; doneAt?: number };
export type Crew = { skin: number; hair: number; kit: number; head: number; hand: number; pet: string };
export type Postcard = { trainId: string; body?: string; stripe?: string; name: string; number: string; logo: string; initials: string; scene: string; message: string; from: string };

export type State = {
  onboarded: boolean;
  profile: { name: string; audience: Audience };
  progress: {
    season: number;
    /** Highest stop reached (1-based). */
    stop: number;
    completed: string[]; // lesson ids
    quizBest: Record<string, number>; // lesson id -> best score (0-3)
    /** Legacy (v1). Kept readable; no longer shown. */
    miles: number;
    /** Legacy (v1). Kept readable; no longer shown. There are no streaks in the app. */
    streak: number;
    lastActive: string | null; // YYYY-MM-DD
  };
  crew: Crew;
  companions: { unlocked: string[]; seen: string[] };
  pass: { preview: boolean; taps: number; founding: boolean };
  /** "Your week" (was the Loop). `want` is the week's aim; `strategy` and `laps` are legacy and kept. */
  loop: { want: string; strategy: string; items: LoopItem[]; laps: number };
  casts: { mine: Mindcast[]; saved: string[] };
  /** Legacy (v1) rail passport. Copied into the Field Book as place stamps on upgrade; kept readable. */
  passport: string[];
  fieldbook: FieldBook;
  postcard: Postcard;
  settings: { theme: "system" | "light" | "dark"; chatty: boolean; sound: boolean; homeStation: string | null; weatherPlace: { name: string; lat: number; lon: number } | null };

  // actions
  set: (fn: (s: State) => Partial<State>) => void;
  /** Credit a stop. `score` is the quiz score (0-3); leave it out when no quiz was taken (an illustrated story's check), so the quiz best is untouched. */
  completeLesson: (id: string, stop: number, score?: number) => void;
  /** Record a spotting. Once per item per day; wrong answers still stamp. Returns what happened. */
  stampSpot: (itemId: string, correct: boolean, opts?: { photo?: string; now?: Date }) => StampOutcome;
  /** Record a practice stamp: where you used a lesson's idea. Returns the stamp, or null for empty text. */
  stampPractice: (lessonId: string | null, text: string, opts?: { from?: PracticeStamp["from"]; now?: Date }) => PracticeStamp | null;
  setSpotPhoto: (itemId: string, uri: string | null) => void;
  /** Remove a stamp (places only offer this, for a visit marked by mistake). */
  unstamp: (itemId: string) => void;
  touchStreak: () => void;
  reset: () => void;
};

const initial = {
  onboarded: false,
  profile: { name: "", audience: "starter" as Audience },
  progress: { season: 1, stop: 1, completed: [] as string[], quizBest: {} as Record<string, number>, miles: 0, streak: 0, lastActive: null as string | null },
  crew: { skin: 2, hair: 1, kit: 0, head: 0, hand: 1, pet: "sleeper" },
  companions: { unlocked: ["sleeper"], seen: ["sleeper"] },
  pass: { preview: false, taps: 0, founding: false },
  loop: { want: "", strategy: "", items: [] as LoopItem[], laps: 0 },
  casts: { mine: [] as Mindcast[], saved: [] as string[] },
  passport: [] as string[],
  fieldbook: emptyFieldBook(),
  postcard: { trainId: "c66", name: "", number: "", logo: "initials", initials: "", scene: "viaduct", message: "Look what I spotted on the railway! Wish you were here.", from: "" },
  settings: { theme: "system" as const, chatty: true, sound: true, homeStation: null as string | null, weatherPlace: null as { name: string; lat: number; lon: number } | null },
};

export const STORE_VERSION = 2;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Upgrade a persisted store. v1 → v2 adds the Field Book: the rail passport becomes place stamps and learned Loop
 * items become practice stamps. Nothing is deleted: v1 fields stay where they were.
 */
export function migrate(persisted: unknown, version: number): Partial<State> {
  const s = (isObj(persisted) ? { ...persisted } : {}) as Record<string, unknown>;
  if (version < 2) s.fieldbook = fieldBookFromV1(s as never);
  s.fieldbook = sanitiseFieldBook(s.fieldbook);
  return s as Partial<State>;
}

/** Merge stored state over defaults one level deep, so a field added later never arrives as undefined. */
export function merge(persisted: unknown, current: State): State {
  if (!isObj(persisted)) return current;
  const out: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(persisted)) {
    const cur = (current as unknown as Record<string, unknown>)[k];
    if (typeof cur === "function") continue;
    if (isObj(cur) && isObj(v)) out[k] = { ...cur, ...v };
    else if (v !== undefined && v !== null) out[k] = v;
  }
  out.fieldbook = sanitiseFieldBook(out.fieldbook);
  return out as unknown as State;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (fn) => set((s) => fn(s)),
      completeLesson: (id, stop, score) =>
        set((s) => {
          const done = s.progress.completed.includes(id);
          const key = `lesson.${id}`;
          return {
            progress: {
              ...s.progress,
              completed: done ? s.progress.completed : [...s.progress.completed, id],
              quizBest: score === undefined ? s.progress.quizBest : { ...s.progress.quizBest, [id]: Math.max(score, s.progress.quizBest[id] ?? 0) },
              stop: Math.max(s.progress.stop, Math.min(stop + 1, 20)),
              miles: s.progress.miles + (done ? 2 : 12),
            },
            // A finished stop comes back for a short revisit when it is due (FSRS).
            fieldbook: { ...s.fieldbook, recall: { ...s.fieldbook.recall, [key]: review(s.fieldbook.recall[key], score === undefined ? 1 : Math.max(0, Math.min(1, score / 3))) } },
          };
        }),
      stampSpot: (itemId, correct, opts) => {
        const now = opts?.now ?? new Date();
        const e = entryByKey(pack, itemId);
        if (!e) return { ok: false, reason: "unknown" };
        const fb = get().fieldbook;
        const out = applyStamp(fb.spots[itemId], dayKey(now), correct, e.maxGrade, now.getTime());
        if (!out.ok) return out;
        const record = opts?.photo ? { ...out.record, photo: opts.photo } : out.record;
        set((s) => ({
          fieldbook: {
            ...s.fieldbook,
            spots: { ...s.fieldbook.spots, [itemId]: record },
            recall: { ...s.fieldbook.recall, [itemId]: review(s.fieldbook.recall[itemId], correct ? 1 : 0, now) },
          },
        }));
        return { ...out, record };
      },
      stampPractice: (lessonId, text, opts) => {
        const t = text.trim();
        if (!t) return null;
        const now = opts?.now ?? new Date();
        const stamp: PracticeStamp = { id: `p${now.getTime()}${Math.floor(Math.random() * 1000)}`, lessonId, text: t.slice(0, 600), day: dayKey(now), at: now.getTime(), from: opts?.from ?? "use-it" };
        set((s) => ({ fieldbook: { ...s.fieldbook, practice: [stamp, ...s.fieldbook.practice] } }));
        return stamp;
      },
      setSpotPhoto: (itemId, uri) =>
        set((s) => {
          const r = s.fieldbook.spots[itemId];
          if (!r) return {};
          const next = { ...r };
          if (uri) next.photo = uri; else delete next.photo;
          return { fieldbook: { ...s.fieldbook, spots: { ...s.fieldbook.spots, [itemId]: next } } };
        }),
      unstamp: (itemId) =>
        set((s) => {
          const spots = { ...s.fieldbook.spots };
          delete spots[itemId];
          const recall = { ...s.fieldbook.recall };
          delete recall[itemId];
          return { fieldbook: { ...s.fieldbook, spots, recall } };
        }),
      touchStreak: () => {
        // Legacy: records the last active day only. Streaks are not shown anywhere.
        const s = get(), t = dayKey();
        if (s.progress.lastActive === t) return;
        set({ progress: { ...s.progress, lastActive: t } });
      },
      reset: () => set({ ...initial, fieldbook: emptyFieldBook() }),
    }),
    { name: "groundwork-v1", storage: createJSONStorage(() => AsyncStorage), version: STORE_VERSION, migrate, merge }
  )
);
