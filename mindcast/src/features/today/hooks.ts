import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/** Current time, ticking every `ms` so "updated 2 min ago" stays true. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Load something (cache first, then live), refresh on focus, on return to the app, and every `everyMs`
 * while the screen is focused. `load(force)` must resolve with the result or throw.
 */
export function useLive<T>(key: string | null, peek: () => Promise<T | null>, load: (force: boolean) => Promise<T>, everyMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const peekRef = useRef(peek), loadRef = useRef(load);
  useEffect(() => {
    peekRef.current = peek;
    loadRef.current = load;
  });

  const refresh = useCallback(
    async (force = false) => {
      if (!key) return;
      const id = ++run.current;
      setLoading(true);
      try {
        const res = await loadRef.current(force);
        if (id === run.current) { setData(res); setError(null); }
      } catch (e) {
        if (id === run.current) setError((e as Error).message || "unavailable");
      } finally {
        if (id === run.current) setLoading(false);
      }
    },
    [key]
  );

  // New key: show the cached copy at once, then go live.
  useEffect(() => {
    setData(null);
    setError(null);
    if (!key) return;
    let alive = true;
    peekRef.current().then((c) => { if (alive && c) setData((d) => d ?? c); }).catch(() => {});
    refresh(false);
    return () => { alive = false; };
  }, [key, refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!key || !everyMs) return;
      const t = setInterval(() => refresh(false), everyMs);
      return () => clearInterval(t);
    }, [key, everyMs, refresh])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") refresh(false); });
    return () => sub.remove();
  }, [refresh]);

  return { data, loading, error, refresh };
}
