/**
 * Live departures for one station, with plain-English delay reasons linked to lessons.
 *
 * Primary source: TransitRadar's keyless board endpoint (https://transitradar.co.uk/api/v1/board/{crs}),
 * which republishes National Rail's Darwin feed with delay and cancellation reasons.
 * Free tier: anonymous and rate limited per IP. An optional key (EXPO_PUBLIC_TRANSITRADAR_KEY) raises the limit.
 * TransitRadar is independent and says it is not an official source, so the board says so too.
 *
 * Fallback for some London stations: TfL Unified API arrivals (Elizabeth line, Overground), keyless,
 * "Powered by TfL Open Data". TfL gives predictions only, so those rows carry no booked time.
 *
 * Responses are cached with timestamps so the board can say "updated 2 min ago" and still show
 * the last good board when the phone is offline.
 */
import { getJson, readCache, writeCache } from "./cache";
import type { Topic } from "./links";
import type { Station } from "./stations";

export type DepStatus = "on-time" | "late" | "delayed" | "cancelled" | "live";

export type Departure = {
  id: string;
  /** Booked departure, HH:MM. TfL rows use the predicted time here. */
  due: string;
  destination: string;
  platform: string | null;
  operator: string | null;
  status: DepStatus;
  /** Expected time when different from `due` (HH:MM). */
  expected: string | null;
  lateMin: number | null;
  /** Short reason, e.g. "A fault with the signalling system". */
  reason: string | null;
  topic: Topic | null;
};

export type BoardSource = "darwin" | "tfl";
export type Board = { crs: string; name: string; rows: Departure[]; notices: { text: string; topic: Topic | null }[]; source: BoardSource };
export type BoardResult = { board: Board; at: number; stale: boolean; error?: string };

const TR_BASE = "https://transitradar.co.uk/api/v1";
const TFL_BASE = "https://api.tfl.gov.uk";
const FRESH_MS = 60 * 1000;
const ROWS = 10;

/* ------------------------------------------------------------------ reasons */

/** "This service has been delayed by a fault with the signalling system" -> "A fault with the signalling system". */
export function shortReason(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text
    .trim()
    .replace(/^this (service|train) (has been|is being|was|is) (delayed|cancelled|terminated|diverted)( (by|because of|due to))?\s*/i, "")
    .replace(/^(delayed|cancelled) (by|because of|due to)\s*/i, "")
    .replace(/\.$/, "");
  return t ? t[0].toUpperCase() + t.slice(1) : null;
}

/** Ordered rules: the first match wins, so more specific causes come first. */
const REASON_RULES: [RegExp, Topic | null][] = [
  [/person (being )?(hit|struck)|fatality|someone being taken ill|passenger being taken ill|unwell/i, null], // people hurt or taken ill: no lesson link, it would be the wrong moment
  [/slippery|\bleaf|\bleaves|railhead|adhesion/i, { season: 2, event: "leaf", label: "Leaf fall" }],
  [/signal|track circuit|axle counter/i, { season: 2, label: "Signals" }],
  [/engineering|possession|overrun/i, { lesson: "s1-17", label: "Possessions" }],
  [/trespass/i, { lesson: "s1-19", label: "Safety" }],
  [/\bheat\b|buckl|high temperature|hot weather/i, { lesson: "s1-08", label: "Buckles" }],
  [/flood|heavy rain|landslip|earthwork/i, { lesson: "s1-09", label: "Drainage" }],
  [/\bpoints\b|\bice\b|\bicy\b|\bsnow|\bfrost/i, { lesson: "s1-14", label: "Points" }],
  [/defective track|broken rail|track (defect|fault|repair)|inspection of the track|speed restriction|track/i, { lesson: "s1-15", label: "Inspection" }],
  [/\btrees?\b|high winds?|strong winds?|debris|object on the line|objects on the line/i, { lesson: "s1-15", label: "Inspection" }],
];

/** Which lesson a delay reason belongs to, or null when there is no fitting (or appropriate) lesson. */
export function reasonTopic(text: string | null | undefined): Topic | null {
  if (!text) return null;
  for (const [re, topic] of REASON_RULES) if (re.test(text)) return topic;
  return null;
}

/* ------------------------------------------------------------------ Darwin via TransitRadar */

type TrRow = {
  planningId?: string; trainId?: string; operator?: string | null; destination?: string | null; isPassenger?: boolean;
  plannedDep?: string | null; estDep?: string | null; actDep?: string | null; platform?: string | null;
  cancelled?: boolean; delayReason?: string | null; cancelReason?: string | null;
};
type TrBoard = { crs?: string; departures?: TrRow[]; messages?: { text?: string; severity?: number }[] };

const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
/** Minutes from a to b on a 24 hour clock, handling midnight (-720..720). */
export function minutesBetween(a: string, b: string): number {
  const d = toMin(b) - toMin(a);
  if (!Number.isFinite(d)) return NaN;
  return ((d + 720 + 1440) % 1440) - 720;
}

export function parseTransitRadar(json: TrBoard, station: Pick<Station, "crs" | "name">): Board {
  const rows: Departure[] = [];
  for (const r of json.departures ?? []) {
    if (!r.plannedDep || r.isPassenger === false) continue;
    const reasonText = r.cancelled ? r.cancelReason ?? r.delayReason : r.delayReason;
    const expected = r.actDep ?? r.estDep ?? null;
    let status: DepStatus = "on-time", lateMin: number | null = null;
    if (r.cancelled) status = "cancelled";
    else if (!expected) status = reasonText ? "delayed" : "on-time";
    else {
      lateMin = minutesBetween(r.plannedDep, expected);
      status = lateMin >= 1 ? "late" : "on-time";
      if (lateMin < 1) lateMin = null;
    }
    rows.push({
      id: `${r.planningId ?? r.trainId ?? rows.length}-${r.plannedDep}`,
      due: r.plannedDep.slice(0, 5),
      destination: r.destination ?? "Unknown",
      platform: r.platform ?? null,
      operator: r.operator ?? null,
      status,
      expected: status === "late" ? expected!.slice(0, 5) : null,
      lateMin,
      reason: shortReason(reasonText),
      topic: reasonTopic(reasonText),
    });
    if (rows.length >= ROWS) break;
  }
  const notices = (json.messages ?? [])
    .map((m) => (m.text ?? "").replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((text) => ({ text, topic: reasonTopic(text) }));
  return { crs: station.crs, name: station.name, rows, notices, source: "darwin" };
}

async function fromTransitRadar(station: Station): Promise<Board> {
  const key = process.env.EXPO_PUBLIC_TRANSITRADAR_KEY;
  const json = await getJson<TrBoard>(`${TR_BASE}/board/${encodeURIComponent(station.crs)}?rows=${ROWS + 4}`, 12000, key ? { "X-Api-Key": key } : {});
  return parseTransitRadar(json, station);
}

/* ------------------------------------------------------------------ TfL fallback */

type TflArrival = { id: string; lineId: string; lineName: string; platformName?: string; destinationName?: string; destinationNaptanId?: string; expectedArrival: string; timeToStation: number };
type TflLineStatus = { id: string; name: string; lineStatuses?: { statusSeverity: number; statusSeverityDescription: string; reason?: string }[] };

const londonTime = (iso: string) => {
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" }).format(d);
  } catch {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
};
const tidyTflName = (s?: string) => (s ?? "Unknown").replace(/ (Rail|Underground) Station$/i, "").replace(/ \(.*\)$/, "");

export function parseTfl(arrivals: TflArrival[], statuses: TflLineStatus[], station: Station): Board {
  const rows: Departure[] = arrivals
    .filter((a) => a.destinationNaptanId !== station.tfl)
    .sort((a, b) => a.timeToStation - b.timeToStation)
    .slice(0, ROWS)
    .map((a) => ({
      id: a.id,
      due: londonTime(a.expectedArrival),
      destination: tidyTflName(a.destinationName),
      platform: a.platformName && a.platformName !== "null" ? a.platformName.replace(/^Platform\s*/i, "") : null,
      operator: a.lineName,
      status: "live" as const,
      expected: null,
      lateMin: null,
      reason: null,
      topic: null,
    }));
  const notices = statuses.flatMap((l) =>
    (l.lineStatuses ?? []).filter((s) => s.statusSeverity !== 10).map((s) => {
      const text = s.reason?.trim() || `${l.name}: ${s.statusSeverityDescription}`;
      return { text, topic: reasonTopic(text) };
    })
  );
  return { crs: station.crs, name: station.name, rows, notices: notices.slice(0, 3), source: "tfl" };
}

async function fromTfl(station: Station): Promise<Board> {
  if (!station.tfl) throw new Error("no TfL data for this station");
  const arrivals = await getJson<TflArrival[]>(`${TFL_BASE}/StopPoint/${station.tfl}/Arrivals`);
  const lines = [...new Set(arrivals.map((a) => a.lineId))];
  const statuses = lines.length ? await getJson<TflLineStatus[]>(`${TFL_BASE}/Line/${lines.join(",")}/Status`).catch(() => []) : [];
  return parseTfl(arrivals, statuses, station);
}

/* ------------------------------------------------------------------ load with cache */

const keyFor = (crs: string) => `board.${crs}`;

export async function cachedBoard(crs: string): Promise<BoardResult | null> {
  const c = await readCache<Board>(keyFor(crs));
  return c ? { board: c.data, at: c.at, stale: Date.now() - c.at > FRESH_MS } : null;
}

/**
 * Live board for a station. Tries Darwin (TransitRadar), then TfL where it covers the station,
 * then the last cached board (marked stale). Throws only when nothing at all is available.
 */
export async function loadBoard(station: Station, opts: { force?: boolean } = {}): Promise<BoardResult> {
  const cached = await cachedBoard(station.crs);
  if (cached && !cached.stale && !opts.force) return cached;
  const errors: string[] = [];
  for (const src of [fromTransitRadar, fromTfl]) {
    if (src === fromTfl && !station.tfl) continue;
    try {
      const board = await src(station);
      const at = Date.now();
      await writeCache(keyFor(station.crs), board, at);
      return { board, at, stale: false };
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  const error = errors.join("; ") || "unavailable";
  if (cached) return { ...cached, stale: true, error };
  throw new Error(error);
}
