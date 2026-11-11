/**
 * Tiny timestamped cache on AsyncStorage for live data (weather, departures).
 * Reads never throw: a broken or missing entry is treated as "nothing cached".
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Cached<T> = { at: number; data: T };

const PREFIX = "gw.cache.";

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Cached<T>;
    return typeof v?.at === "number" && v.data !== undefined ? v : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T, at = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ at, data } satisfies Cached<T>));
  } catch {
    // Storage full or unavailable: live data still shows, it just will not survive a restart.
  }
}

/** "just now", "2 min ago", "3 hours ago", "yesterday", "4 days ago". */
export function ago(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** fetch with a timeout, returning parsed JSON or throwing a short, readable error. */
export async function getJson<T>(url: string, ms = 10000, headers: Record<string, string> = {}): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json", ...headers } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error("timed out");
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    clearTimeout(timer);
  }
}
