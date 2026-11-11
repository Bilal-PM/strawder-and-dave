/** Hand-drawn crew member and companions (ported from the web prototype). */
import type { Painter } from "@/ui/sketch";
import type { Crew } from "@/state/store";

export const SKINS = ["#F6D7C3", "#EAC09F", "#D29E78", "#A8754F", "#7A5236", "#4E3324"];
export const CREW_OPTIONS = {
  hair: [["Short", false], ["Curly", false], ["Tied back", false], ["Headscarf", false]],
  kit: [["Orange vest", false], ["Orange jacket", false], ["Night shift jacket", true], ["Heritage jacket", true]],
  head: [["White hard hat", false], ["No hat", false], ["Orange bump cap", true], ["Guard's cap", true]],
  hand: [["Nothing", false], ["Hand radio", false], ["Clipboard", false], ["Track gauge", true], ["Hand lamp", true]],
} as const;
export type CrewKey = keyof typeof CREW_OPTIONS;

type Cols = { ink: string; soft: string; line: string; ppe: string; pass: string };

/** Paints the crew member into a 240 x 300 box. */
export function paintAvatar(p: Painter, A: Crew, C: Cols) {
  const o = (f: string, ex: object = {}) => ({ roughness: 1.1, strokeWidth: 2, seed: 21, ...ex, fill: f, fillStyle: "solid" });
  const skin = SKINS[A.skin] ?? SKINS[2];
  const kitCol = [C.ppe, C.ppe, "#E5571A", "#1F3A68"][A.kit] ?? C.ppe;
  const hairCol = ["#2B211C", "#1E1612", "#4A2F1E", "#5B3F8C"][A.hair] ?? "#2B211C";
  p.ellipse(120, 288, 150, 14, C.line, { stroke: "none", roughness: 1 });
  [94, 126].forEach((a) => p.rect(a, 212, 22, 68, "#2B3340", o("#2B3340")));
  [104, 136].forEach((x) => p.ellipse(x, 282, 34, 12, "#151515", o("#151515")));
  const sleeve = A.kit === 0 ? "#3A4A5C" : kitCol;
  p.rect(50, 124, 24, 84, sleeve, o(sleeve)); p.circle(62, 212, 18, skin, o(skin));
  p.rect(166, 124, 24, 84, sleeve, o(sleeve)); p.circle(178, 212, 18, skin, o(skin));
  if (A.kit === 0) p.poly([[78, 120], [162, 120], [166, 214], [74, 214]], "#3A4A5C", o("#3A4A5C"));
  p.poly([[72, 118], [168, 118], [172, 216], [68, 216]], kitCol, o(kitCol));
  if (A.kit === 0) p.poly([[106, 118], [134, 118], [126, 150], [114, 150]], "#3A4A5C", o("#3A4A5C"));
  const stripe = A.kit === 3 ? C.pass : "#D7DBE0";
  [168, 194].forEach((y) => p.rect(70, y, 100, 8, stripe, o(stripe, { strokeWidth: 1 })));
  if (A.kit !== 0) { p.rect(50, 160, 24, 7, stripe, o(stripe, { strokeWidth: 1 })); p.rect(166, 160, 24, 7, stripe, o(stripe, { strokeWidth: 1 })); }
  if (A.kit === 2) [140, 128].forEach((y) => p.rect(70, y, 100, 5, "#F4F6F8", o("#F4F6F8", { strokeWidth: 0.8 })));
  p.rect(110, 104, 20, 18, skin, o(skin));
  if (A.hair === 3) p.ellipse(120, 96, 84, 96, hairCol, o(hairCol));
  p.circle(120, 86, 64, skin, o(skin));
  if (A.hair === 0) p.path("M88 82 Q90 50 120 50 Q150 50 152 82 Q140 66 120 64 Q100 66 88 82 Z", hairCol, o(hairCol));
  if (A.hair === 1) ([[92, 70], [102, 58], [116, 52], [130, 54], [143, 62], [150, 74], [88, 84], [152, 86]] as [number, number][]).forEach(([x, y], i) => p.circle(x, y, 22, hairCol, o(hairCol, { seed: 30 + i })));
  if (A.hair === 2) { p.path("M88 84 Q88 50 120 50 Q152 50 152 84 Q138 64 120 62 Q102 64 88 84 Z", hairCol, o(hairCol)); p.ellipse(154, 96, 18, 34, hairCol, o(hairCol)); }
  if (A.hair === 3) p.path("M84 92 Q84 44 120 44 Q156 44 156 92 Q146 60 120 58 Q94 60 84 92 Z", hairCol, o(hairCol));
  p.circle(108, 86, 5, C.ink, o(C.ink, { strokeWidth: 1 })); p.circle(132, 86, 5, C.ink, o(C.ink, { strokeWidth: 1 }));
  p.arc(120, 100, 24, 14, 0.2, Math.PI - 0.2, false, null, { roughness: 0.8, strokeWidth: 2, seed: 5 });
  if (A.head === 0) { p.path("M84 70 Q86 34 120 32 Q154 34 156 70 Z", "#F4F4F2", o("#F4F4F2")); p.rect(78, 66, 84, 8, "#F4F4F2", o("#F4F4F2")); p.line(120, 34, 120, 66, { roughness: 0.8, stroke: C.soft, strokeWidth: 1.4, seed: 8 }); }
  if (A.head === 2) { p.path("M86 72 Q88 40 120 38 Q152 40 154 72 Z", C.ppe, o(C.ppe)); p.path("M150 66 L176 72 L150 76 Z", C.ppe, o(C.ppe)); }
  if (A.head === 3) { p.rect(86, 46, 68, 22, "#1C2433", o("#1C2433")); p.path("M84 68 L156 68 L146 80 L94 80 Z", "#111", o("#111")); p.rect(112, 52, 16, 9, C.pass, o(C.pass, { strokeWidth: 1 })); }
  const hx = 178, hy = 214;
  if (A.hand === 1) { p.rect(hx - 8, hy - 30, 16, 32, "#202428", o("#202428")); p.line(hx + 4, hy - 30, hx + 4, hy - 48, { roughness: 0.6, strokeWidth: 2.5, seed: 4 }); }
  if (A.hand === 2) { p.rect(hx - 16, hy - 40, 34, 46, "#C89A62", o("#C89A62")); p.rect(hx - 12, hy - 34, 26, 36, "#FFFFFF", o("#FFFFFF", { strokeWidth: 1 })); }
  if (A.hand === 3) { p.rect(hx - 4, hy - 64, 8, 92, "#C9CED4", o("#C9CED4")); p.rect(hx - 10, hy + 26, 20, 6, "#C9CED4", o("#C9CED4")); }
  if (A.hand === 4) { p.rect(hx - 13, hy - 22, 26, 28, "#2A2E33", o("#2A2E33")); p.circle(hx, hy - 8, 14, C.pass, o(C.pass, { strokeWidth: 1 })); p.arc(hx, hy - 22, 20, 20, Math.PI, Math.PI * 2, false, null, { roughness: 0.6, strokeWidth: 2.4, seed: 2 }); }
}

const PET_INDEX: Record<string, number> = { sleeper: 0, semaphore: 1, tampy: 2, pip: 3, gauge: 4, conker: 5 };

/** Paints a companion into an 80 x 80 box. */
export function paintPet(p: Painter, id: string, ink: string, pass: string) {
  const kind = PET_INDEX[id] ?? 0;
  const o = (f: string, s = 1) => ({ roughness: 1, strokeWidth: 1.6, fill: f, fillStyle: "solid", seed: 40 + s });
  if (kind === 0) { p.path("M58 60 Q74 54 70 36", null, { roughness: 1, stroke: "#C77A30", strokeWidth: 5, seed: 1 }); p.ellipse(40, 58, 44, 26, "#D98A3D", o("#D98A3D")); p.circle(26, 40, 26, "#D98A3D", o("#D98A3D", 2)); p.poly([[16, 32], [18, 18], [26, 28]], "#D98A3D", o("#D98A3D", 3)); p.poly([[28, 28], [36, 18], [36, 32]], "#D98A3D", o("#D98A3D", 4)); p.circle(21, 40, 3, ink, o(ink, 5)); p.circle(31, 40, 3, ink, o(ink, 6)); }
  if (kind === 1) { p.circle(40, 44, 40, "#8A6B4E", o("#8A6B4E")); p.circle(40, 50, 24, "#E2662E", o("#E2662E", 2)); p.poly([[58, 40], [70, 43], [58, 46]], pass, o(pass, 3)); p.circle(50, 36, 4, ink, o(ink, 4)); p.line(34, 64, 32, 74, { roughness: 0.5, strokeWidth: 2, seed: 2 }); p.line(46, 64, 48, 74, { roughness: 0.5, strokeWidth: 2, seed: 3 }); p.poly([[22, 40], [6, 34], [18, 50]], "#6E553E", o("#6E553E", 5)); }
  if (kind === 2) { p.rect(10, 30, 56, 26, "#F2B705", o("#F2B705")); p.rect(44, 16, 22, 16, "#F2B705", o("#F2B705", 2)); p.rect(48, 20, 14, 9, "#BFE3F2", o("#BFE3F2", 3)); [20, 56].forEach((x, k) => p.circle(x, 60, 14, "#2A2E33", o("#2A2E33", 6 + k))); [26, 32, 38].forEach((x, k) => p.line(x, 56, x, 68, { roughness: 0.4, strokeWidth: 2, seed: 9 + k })); p.circle(54, 24, 3, ink, o(ink, 12)); }
  if (kind === 3) { p.poly([[18, 46], [4, 40], [8, 58]], "#6F7883", o("#6F7883", 7)); p.ellipse(38, 50, 48, 30, "#9AA3AD", o("#9AA3AD")); p.ellipse(52, 37, 20, 16, "#5E8F7A", o("#5E8F7A", 2)); p.circle(56, 28, 20, "#8C96A1", o("#8C96A1", 3)); p.poly([[64, 27], [73, 30], [64, 32]], "#E2C49B", o("#E2C49B", 4)); p.circle(58, 26, 5, "#E07B2E", o("#E07B2E", 5)); [34, 44].forEach((x, k) => p.line(x, 64, x - 2, 74, { roughness: 0.5, stroke: "#D46A6A", strokeWidth: 2.5, seed: 9 + k })); }
  if (kind === 4) { [18, 56].forEach((x, k) => p.ellipse(x, 60, 16, 12, "#9DA66A", o("#9DA66A", 8 + k))); p.circle(70, 48, 16, "#9DA66A", o("#9DA66A", 3)); p.circle(74, 45, 3, ink, o(ink, 4)); p.path("M10 58 Q12 24 40 22 Q66 24 68 58 Z", "#7A6A3A", o("#7A6A3A")); ([[26, 30, 24, 56], [40, 22, 40, 58], [54, 30, 56, 56], [14, 44, 66, 44]] as number[][]).forEach(([a, b, c, d], k) => p.line(a, b, c, d, { roughness: 0.8, stroke: "#C9B06A", strokeWidth: 1.6, seed: 12 + k })); p.line(8, 58, 70, 58, { roughness: 0.6, strokeWidth: 2, seed: 20 }); }
  if (kind === 5) { p.path("M30 62 Q4 60 8 34 Q12 12 30 20 Q20 34 32 46 Z", "#C27A3E", o("#C27A3E")); p.ellipse(44, 52, 30, 30, "#B5652B", o("#B5652B", 2)); p.circle(54, 32, 22, "#B5652B", o("#B5652B", 3)); p.poly([[50, 22], [52, 12], [58, 22]], "#B5652B", o("#B5652B", 4)); p.circle(60, 30, 4, ink, o(ink, 5)); p.ellipse(50, 64, 12, 8, "#7A4A22", o("#7A4A22", 6)); }
}
