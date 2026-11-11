import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Audience, Mindcast } from "@/domain/types";

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
    miles: number;
    streak: number;
    lastActive: string | null; // YYYY-MM-DD
  };
  crew: Crew;
  companions: { unlocked: string[]; seen: string[] };
  pass: { preview: boolean; taps: number; founding: boolean };
  loop: { want: string; strategy: string; items: LoopItem[]; laps: number };
  casts: { mine: Mindcast[]; saved: string[] };
  passport: string[]; // place ids stamped
  postcard: Postcard;
  settings: { theme: "system" | "light" | "dark"; chatty: boolean; sound: boolean; homeStation: string | null; weatherPlace: { name: string; lat: number; lon: number } | null };

  // actions
  set: (fn: (s: State) => Partial<State>) => void;
  completeLesson: (id: string, stop: number, score: number) => void;
  touchStreak: () => void;
  reset: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

const initial = {
  onboarded: false,
  profile: { name: "", audience: "starter" as Audience },
  progress: { season: 1, stop: 1, completed: [], quizBest: {}, miles: 0, streak: 0, lastActive: null },
  crew: { skin: 2, hair: 1, kit: 0, head: 0, hand: 1, pet: "sleeper" },
  companions: { unlocked: ["sleeper"], seen: ["sleeper"] },
  pass: { preview: false, taps: 0, founding: false },
  loop: { want: "", strategy: "", items: [], laps: 0 },
  casts: { mine: [], saved: [] },
  passport: [],
  postcard: { trainId: "c66", name: "", number: "", logo: "initials", initials: "", scene: "viaduct", message: "Look what I spotted on the railway! Wish you were here.", from: "" },
  settings: { theme: "system" as const, chatty: true, sound: true, homeStation: null, weatherPlace: null },
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (fn) => set((s) => fn(s)),
      completeLesson: (id, stop, score) =>
        set((s) => {
          const done = s.progress.completed.includes(id);
          return {
            progress: {
              ...s.progress,
              completed: done ? s.progress.completed : [...s.progress.completed, id],
              quizBest: { ...s.progress.quizBest, [id]: Math.max(score, s.progress.quizBest[id] ?? 0) },
              stop: Math.max(s.progress.stop, Math.min(stop + 1, 20)),
              miles: s.progress.miles + (done ? 2 : 12),
            },
          };
        }),
      touchStreak: () => {
        const s = get(), t = today();
        if (s.progress.lastActive === t) return;
        const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        set({ progress: { ...s.progress, streak: s.progress.lastActive === y ? s.progress.streak + 1 : 1, lastActive: t } });
      },
      reset: () => set({ ...initial }),
    }),
    { name: "groundwork-v1", storage: createJSONStorage(() => AsyncStorage), version: 1 }
  )
);
