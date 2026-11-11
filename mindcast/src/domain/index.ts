/**
 * The active domain pack. To build the same app for another domain or business,
 * create a new folder next to `railway/` that exports a DomainPack and switch it here
 * (see docs/DOMAIN_PACKS.md).
 */
import { railway } from "./railway";
import type { DomainPack } from "./types";

export const pack: DomainPack = railway;
export * from "./types";

export const lessonById = (id: string) => pack.lessons.find((l) => l.id === id);
export const trainById = (id: string) => pack.trains.find((t) => t.id === id);
export const castById = (id: string) => pack.casts.find((m) => m.id === id);
export const companionById = (id: string) => pack.companions.find((c) => c.id === id);
