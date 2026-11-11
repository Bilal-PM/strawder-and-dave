/**
 * Explore: place categories, simplified main lines for the map, and the rail passport rules.
 * Pure functions, no React.
 */
import type { Place } from "@/domain/types";
import { STATIONS } from "@/features/today/services/stations";
import { distanceKm } from "@/features/today/services/weather";
import { dark, type Palette } from "@/ui/tokens";
import { EXTRA_STATIONS } from "./stationCoords";

export type Cat = Place["category"];

const isDark = (c: Palette) => c.bg === dark.bg;

export const CATS: Record<Cat, { label: string; short: string; colour: (c: Palette) => string }> = {
  bridges: { label: "Bridges and viaducts", short: "Bridges", colour: (c) => c.ppe },
  coast: { label: "Coast", short: "Coast", colour: (c) => c.accent },
  scenic: { label: "Scenic lines", short: "Scenic", colour: (c) => c.good },
  museums: { label: "Museums and stations", short: "Museums", colour: (c) => (isDark(c) ? "#B39AF0" : "#7A4BC9") },
};
export const CAT_ORDER: Cat[] = ["bridges", "coast", "scenic", "museums"];

/** Junctions and towns used to draw a simplified main-line network (lat, lon). */
export const T: Record<string, [number, number]> = {
  lon: [51.53, -0.13], edi: [55.95, -3.19], gla: [55.86, -4.25], yrk: [53.96, -1.1], dur: [54.78, -1.58], dar: [54.52, -1.55], ncl: [54.97, -1.62], pet: [52.57, -0.25], rug: [52.37, -1.26], cre: [53.09, -2.43], man: [53.48, -2.24], pre: [53.76, -2.71], car: [54.89, -2.93], rdg: [51.46, -0.97], bat: [51.38, -2.36], bri: [51.45, -2.58], exe: [50.73, -3.53], daw: [50.58, -3.47], ply: [50.38, -4.14], sal: [50.41, -4.2], ste: [50.17, -5.44], pnz: [50.12, -5.53], sti: [50.21, -5.48], lds: [53.8, -1.55], set: [54.07, -2.28], rib: [54.21, -2.37], cri: [56.39, -4.62], ftw: [56.82, -5.11], gle: [56.876, -5.432], mal: [57.0, -5.83], per: [56.39, -3.44], inv: [57.48, -4.22], din: [57.59, -4.43], kyl: [57.28, -5.71], fth: [56.0, -3.39], che: [53.2, -2.88], con: [53.28, -3.83], ban: [53.22, -4.14], hol: [53.31, -4.63], shr: [52.71, -2.75], mac: [52.59, -3.85], bar: [52.72, -4.05], pwl: [52.89, -4.42], mid: [54.58, -1.23], whi: [54.485, -0.615], por: [50.8, -1.11], ryd: [50.734, -1.16], sha: [50.63, -1.18], bel: [54.6, -5.93], col: [55.13, -6.67], cas: [55.163, -6.817], der: [55.0, -7.31], abd: [57.14, -2.1], nrw: [52.63, 1.31], cdf: [51.48, -3.18], swa: [51.63, -3.94], bhm: [52.48, -1.9],
};
/** Simplified main lines, as chains of T keys. Not a full network map. */
export const LINES: string[][] = [
  ["lon", "pet", "yrk", "dar", "dur", "ncl", "edi"],
  ["lon", "rug", "cre", "pre", "car", "gla"],
  ["cre", "man"],
  ["rug", "bhm"],
  ["lon", "rdg", "bat", "bri", "exe", "daw", "ply", "sal", "ste", "pnz"],
  ["bri", "cdf", "swa"],
  ["ste", "sti"],
  ["yrk", "lds", "set", "rib", "car"],
  ["gla", "cri", "ftw", "gle", "mal"],
  ["edi", "fth", "per", "inv"],
  ["per", "abd"],
  ["gla", "per"],
  ["inv", "din", "kyl"],
  ["cre", "che", "con", "ban", "hol"],
  ["cre", "shr", "mac", "bar", "pwl"],
  ["dar", "mid", "whi"],
  ["lon", "nrw"],
  ["lon", "por"],
  ["ryd", "sha"],
  ["bel", "col", "cas", "der"],
];
/** [label, T key, side]: 1 = right, -1 = left, 0 = centred below. */
export const CITY_LABELS: [string, string, 1 | -1 | 0][] = [["London", "lon", 1], ["Edinburgh", "edi", 0], ["Glasgow", "gla", -1], ["York", "yrk", 1], ["Manchester", "man", 1], ["Inverness", "inv", 1], ["Belfast", "bel", 1], ["Plymouth", "ply", 1], ["Cardiff", "cdf", -1]];

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

/** Coordinates of a station by name, or null when we do not have it bundled. */
export function stationCoords(name: string): [number, number] | null {
  const n = norm(name);
  if (!n) return null;
  for (const [k, v] of Object.entries(EXTRA_STATIONS)) if (norm(k) === n) return v;
  const s = STATIONS.find((x) => norm(x.name) === n || norm(x.name.replace(/^London /, "")) === n);
  return s ? [s.lat, s.lon] : null;
}

export const STAMP_RADIUS_KM = 1.5;

/** Points that count as "being there": each named station (a place may list two), else the place itself. */
export function stampPoints(p: Pick<Place, "station" | "lat" | "lon">): { label: string; lat: number; lon: number }[] {
  const names = p.station.split(/\s+or\s+|\s*\/\s*/i).map((s) => s.trim()).filter(Boolean);
  const pts = names.map((n) => ({ n, xy: stationCoords(n) })).filter((x) => x.xy).map((x) => ({ label: `${x.n} station`, lat: x.xy![0], lon: x.xy![1] }));
  return pts.length ? pts : [{ label: "the place", lat: p.lat, lon: p.lon }];
}

/** Can someone at (lat, lon) stamp this place? Returns the nearest point and distance either way. */
export function stampCheck(p: Pick<Place, "station" | "lat" | "lon">, lat: number, lon: number) {
  const ranked = [...stampPoints(p), { label: "the place", lat: p.lat, lon: p.lon }]
    .map((pt) => ({ ...pt, km: distanceKm(lat, lon, pt.lat, pt.lon) }))
    .sort((a, b) => a.km - b.km);
  const best = ranked[0];
  return { ok: best.km <= STAMP_RADIUS_KM, km: best.km, label: best.label };
}

export const kmText = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);
