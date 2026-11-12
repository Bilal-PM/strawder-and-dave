/**
 * Groundwork design tokens.
 * Paper and ink, hand-drawn lines, one hero colour per moment.
 * Colour meanings are fixed across the app: orange = heat and pressure, hi-vis yellow = look here / Season Pass,
 * blue = structure and calm, green = done / safe, red = stop / warning.
 */
export type Palette = {
  bg: string; // paper
  surface: string; // card
  sunk: string; // inset areas
  ink: string; // primary text and lines
  soft: string; // secondary text
  line: string; // hairlines, grid
  grid: string; // paper grid
  accent: string; // calm blue
  ppe: string; // railway orange
  pass: string; // hi-vis yellow
  good: string;
  warn: string;
  board: string; // departure board
  flap: string;
  flapBg: string;
  onAccent: string;
  rule: string; // exercise-book rules on writing surfaces
  margin: string; // exercise-book margin line
};

export const light: Palette = {
  bg: "#F6F5F1",
  surface: "#FFFFFF",
  sunk: "#EFEDE7",
  ink: "#1B1F24",
  soft: "#5A626C",
  line: "#E1DED6",
  grid: "#ECE9E2",
  accent: "#2B59C3",
  ppe: "#E8611A",
  pass: "#F2C230",
  good: "#2E7D4F",
  warn: "#B4442E",
  board: "#15191E",
  flap: "#F5C451",
  flapBg: "#22282F",
  onAccent: "#FFFFFF",
  rule: "#CFDBF0",
  margin: "#E9B4A8",
};

export const dark: Palette = {
  bg: "#121519",
  surface: "#1A1E24",
  sunk: "#161A1F",
  ink: "#ECEAE4",
  soft: "#A3ABB5",
  line: "#2B3139",
  grid: "#1C2127",
  accent: "#86A8F2",
  ppe: "#F27A3A",
  pass: "#F2C94C",
  good: "#6CC495",
  warn: "#E8846F",
  board: "#0B0D10",
  flap: "#F5C451",
  flapBg: "#1B2027",
  onAccent: "#121519",
  rule: "#27324A",
  margin: "#5A3631",
};

/** Font family names, as registered with expo-font in the root layout. */
export const F = {
  display: "BricolageGrotesque_800ExtraBold",
  displaySemi: "BricolageGrotesque_600SemiBold",
  body: "FamiljenGrotesk_400Regular",
  bodySemi: "FamiljenGrotesk_600SemiBold",
  hand: "Caveat_600SemiBold",
  mono: "IBMPlexMono_500Medium",
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
/** s = chips and tags, m = buttons and inputs, l = cards, xl = sheets, pill = round badges. */
export const radius = { s: 6, m: 10, l: 14, xl: 20, pill: 999 } as const;

/** Minimum touch target (pt) for anything tappable. */
export const TOUCH = 44;

/** Ink used on top of the hi-vis yellow and other light fills, in both themes. */
export const ON_FILL = "#1B1F24";

/** Pick readable text for a solid fill: dark ink on light fills, white on dark ones. */
export function onColour(hex: string) {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return ON_FILL;
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? ON_FILL : "#FFFFFF";
}

/** Type scale (size / line height). */
export const type = {
  hero: [40, 42],
  h1: [30, 34],
  h2: [24, 28],
  h3: [19, 24],
  body: [16, 23],
  small: [14, 20],
  tiny: [12, 16],
  hand: [24, 26],
  /** Mono labels: eyebrows (12) and chips/stat labels (11). */
  eyebrow: [12, 16],
  label: [11, 14],
} as const;
