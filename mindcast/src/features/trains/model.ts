/**
 * Adapter between the domain pack (`TrainClass`) and the drawing / 3D code.
 * All numbers come from `pack.trains`; the `model` object is passed through verbatim.
 */
import type { TrainClass, TrainGroup } from "@/domain/types";

export type EndStyle = "aero" | "slope" | "round" | "tram" | "nose" | "flat" | "none";

/** Drawing parameters carried in `TrainClass.model`. Every field is optional; unknown fields are ignored. */
export type Model = {
  kind?: "loco" | "hood" | "steam" | "unit" | "nmt" | "mpv" | "tram7" | "wagon" | "crane" | "legacy" | string;
  ends?: EndStyle[];
  axles?: number;
  roof?: [string, number][];
  /** Steam: which drawing to use. */
  style?: "gwr" | "lms" | "a4";
  copper?: boolean;
  stream?: boolean;
  doors?: number | "ends";
  tilt?: boolean;
  under?: boolean;
  shoes?: boolean;
  exhaust?: boolean;
  tube?: boolean;
  tram?: boolean;
  artic?: boolean;
  /** Wagon type. */
  w?: "box" | "tank" | "cont" | string;
  /** Legacy (simplified) machine drawing. */
  k?: string;
  /** Length shown, in metres (legacy drawings). */
  show?: number;
  /** Vertical correction so a simplified drawing has the right height in the to-scale strip. */
  yf?: number;
};

/** What the drawing code needs, in metres. */
export type DrawSpec = { id: string; name: string; type: string; group: TrainGroup; len: number; h: number; power: string; cars: number; model: Model };

/** Paint job and personal touches. */
export type Livery = {
  body: string;
  stripe: string;
  name?: string;
  number?: string;
  logo?: string;
  initials?: string;
  /** Image href (data URI or file URI) when logo is "image". */
  img?: string | null;
  /** Hide the "+ N more cars" label (to-scale strip). */
  noMore?: boolean;
};

const cache = new WeakMap<TrainClass, DrawSpec>();

export function toDraw(t: TrainClass): DrawSpec {
  const hit = cache.get(t);
  if (hit) return hit;
  const m = { ...(t.model as Model) };
  if (m.kind === "steam" && !m.style) m.style = m.stream ? "a4" : m.copper ? "gwr" : "lms";
  const d: DrawSpec = { id: t.id, name: t.name, type: t.type, group: t.group, len: t.lengthM, h: t.heightM, power: t.power || "", cars: t.cars ?? 1, model: m };
  cache.set(t, d);
  return d;
}

export const classLivery = (t: TrainClass): Livery => ({ body: t.body, stripe: t.stripe, logo: "none" });

/** How much of a vehicle we show (metres). Long trains show the first two cars. */
export const shownLen = (s: DrawSpec) => {
  const k = s.model.kind;
  if (k === "unit" || k === "mpv" || k === "nmt") return s.len * 2 + 0.6;
  if (k === "legacy" && s.model.show) return s.model.show;
  return s.len;
};

/** Relative luminance (0 dark .. 1 light) of a #RRGGBB colour. */
export function lum(hex: string) {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const INK = "#1B1F24";
export const CARD = "#FBF7EE";
/** Text colour that reads on top of `bg`. */
export const onColour = (bg: string) => (lum(bg) > 0.36 ? INK : CARD);

export const GROUPS: { value: "all" | TrainGroup; label: string }[] = [
  { value: "all", label: "All" },
  { value: "loco", label: "Diesel and electric" },
  { value: "steam", label: "Steam" },
  { value: "pass", label: "Passenger" },
  { value: "metro", label: "Metro and tram" },
  { value: "freight", label: "Freight" },
  { value: "eng", label: "Engineering" },
];

export const isTram = (t: { type: string; model?: unknown }) => /tram/i.test(t.type) || (t.model as Model | undefined)?.kind === "tram7" || !!(t.model as Model | undefined)?.tram;
