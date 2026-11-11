/**
 * Railway weather: a 7 day forecast from Open-Meteo, cached on the phone.
 *
 * TODO(licence): Open-Meteo's free API is for non-commercial use only. Before Groundwork is sold or
 * carries paid features, switch to Open-Meteo's commercial plan (customer-api.open-meteo.com with an
 * API key) or to the Met Office Weather DataHub. See docs/DATA_SOURCES.md.
 */
import * as Location from "expo-location";
import { getJson, readCache, writeCache } from "./cache";
import type { DayWx } from "./railImpacts";
import { STATIONS } from "./stations";

export type Place = { name: string; lat: number; lon: number };

/** Cities offered when the user does not share their location. */
export const CITIES: Place[] = [
  { name: "London", lat: 51.5072, lon: -0.1276 },
  { name: "Birmingham", lat: 52.4862, lon: -1.8904 },
  { name: "Manchester", lat: 53.4808, lon: -2.2426 },
  { name: "Leeds", lat: 53.8008, lon: -1.5491 },
  { name: "Glasgow", lat: 55.8642, lon: -4.2518 },
  { name: "Edinburgh", lat: 55.9533, lon: -3.1883 },
  { name: "Cardiff", lat: 51.4816, lon: -3.1791 },
  { name: "Bristol", lat: 51.4545, lon: -2.5879 },
  { name: "Newcastle", lat: 54.9783, lon: -1.6178 },
  { name: "Belfast", lat: 54.5973, lon: -5.9301 },
  { name: "Norwich", lat: 52.6309, lon: 1.2974 },
  { name: "Plymouth", lat: 50.3755, lon: -4.1427 },
  { name: "Inverness", lat: 57.4778, lon: -4.2247 },
];
export const DEFAULT_PLACE = CITIES[0];

export type Forecast = { place: Place; days: DayWx[]; source: "open-meteo" };
export type ForecastResult = { forecast: Forecast; at: number; stale: boolean; error?: string };

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const FRESH_MS = 30 * 60 * 1000;
const keyFor = (p: Place) => `wx.${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

type OpenMeteoDaily = {
  daily?: { time: string[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_sum: (number | null)[]; wind_gusts_10m_max: (number | null)[]; weather_code: (number | null)[] };
};

export function forecastUrl(p: Place): string {
  const q = new URLSearchParams({
    latitude: p.lat.toFixed(3),
    longitude: p.lon.toFixed(3),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,weather_code",
    timezone: "Europe/London",
    forecast_days: "7",
  });
  return `${ENDPOINT}?${q.toString()}`;
}

/** Parse Open-Meteo's column arrays into days, dropping any day with missing numbers. */
export function parseOpenMeteo(json: OpenMeteoDaily): DayWx[] {
  const d = json.daily;
  if (!d?.time?.length) return [];
  const out: DayWx[] = [];
  d.time.forEach((date, i) => {
    const max = d.temperature_2m_max[i], min = d.temperature_2m_min[i], rain = d.precipitation_sum[i], gust = d.wind_gusts_10m_max[i], code = d.weather_code[i];
    if ([max, min, rain, gust, code].some((v) => typeof v !== "number")) return;
    out.push({ date, max: max!, min: min!, rain: rain!, gust: gust!, code: code! });
  });
  return out;
}

/** The cached forecast for a place, if any (shown straight away while the network catches up). */
export async function cachedForecast(p: Place): Promise<ForecastResult | null> {
  const c = await readCache<Forecast>(keyFor(p));
  return c ? { forecast: c.data, at: c.at, stale: Date.now() - c.at > FRESH_MS } : null;
}

/**
 * Fetch the forecast. On failure, falls back to the cached copy (marked stale, with the error);
 * throws only when there is nothing cached at all.
 */
export async function loadForecast(p: Place, opts: { force?: boolean } = {}): Promise<ForecastResult> {
  const cached = await cachedForecast(p);
  if (cached && !cached.stale && !opts.force) return cached;
  try {
    const days = parseOpenMeteo(await getJson<OpenMeteoDaily>(forecastUrl(p)));
    if (!days.length) throw new Error("no forecast in reply");
    const forecast: Forecast = { place: p, days, source: "open-meteo" };
    const at = Date.now();
    await writeCache(keyFor(p), forecast, at);
    return { forecast, at, stale: false };
  } catch (e) {
    if (cached) return { ...cached, stale: true, error: (e as Error).message };
    throw e;
  }
}

const toRad = (d: number) => (d * Math.PI) / 180;
/** Great-circle distance in km. */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A friendly name for a coordinate without reverse geocoding: the nearest big station or city. */
export function nameNear(lat: number, lon: number): string {
  let best = { name: "you", d: Infinity };
  for (const s of STATIONS) {
    const d = distanceKm(lat, lon, s.lat, s.lon);
    if (d < best.d) best = { name: s.name, d };
  }
  for (const c of CITIES) {
    const d = distanceKm(lat, lon, c.lat, c.lon);
    if (d < best.d) best = { name: c.name, d };
  }
  return best.d < 60 ? `Near ${best.name}` : "Your location";
}

export type LocateResult = { ok: true; lat: number; lon: number } | { ok: false; reason: "denied" | "unavailable"; message: string };

/**
 * Ask for foreground location once, only when the user taps a location button.
 * Coordinates are used on the phone and never stored beyond a rounded weather place.
 */
export async function locateOnce(): Promise<LocateResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return { ok: false, reason: "denied", message: "Location is off for Groundwork. You can turn it on in Settings, or pick a place instead." };
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 2000 }).catch(() => null);
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { ok: true, lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return { ok: false, reason: "unavailable", message: "Could not get your location just now. Try again outside, or pick a place instead." };
  }
}

/** Rounded to about 1 km so the stored place is not a precise address. */
export const roundedPlace = (lat: number, lon: number): Place => ({ name: nameNear(lat, lon), lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });
