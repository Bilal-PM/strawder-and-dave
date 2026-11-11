/**
 * Field Book drawings: one small rough.js sketch per spot item, in a 120 x 90 box, no labels (they double as the
 * "which one did you see?" answers). Each has two looks:
 *   inked  ink lines with one accent colour, for things you have spotted
 *   ghost  a dotted outline in a soft colour, no fills, so the shape of the collection shows before you start
 */
import type { Opt, Painter } from "@/ui/sketch";
import type { Palette } from "@/ui/tokens";

export const ART_W = 120;
export const ART_H = 90;

type Look = { ink: string; soft: string; accent: string; warm: string; paper: string; sunk: string; ghost: boolean };

export function lookFor(c: Palette, ghost: boolean): Look {
  return ghost
    ? { ink: c.soft, soft: c.soft, accent: c.soft, warm: c.soft, paper: "none", sunk: "none", ghost }
    : { ink: c.ink, soft: c.soft, accent: c.accent, warm: c.ppe, paper: c.surface, sunk: c.sunk, ghost };
}

/** Options for a stroke: dotted and lighter in ghost mode. */
const so = (L: Look, ex: Opt = {}): Opt => (L.ghost ? { ...ex, stroke: L.soft, strokeLineDash: [2.5, 4.5], strokeWidth: Math.min(1.6, Number(ex.strokeWidth ?? 1.6)), roughness: 0.7 } : { roughness: 0.9, strokeWidth: 1.8, ...ex });
/** Fill: none in ghost mode. */
const fl = (L: Look, col: string | null) => (L.ghost ? null : col);

function rails(p: Painter, L: Look, y1: number, y2: number, x0 = 6, x1 = 114) {
  p.line(x0, y1, x1, y1, so(L, { strokeWidth: 2.4 }));
  p.line(x0, y2, x1, y2, so(L, { strokeWidth: 2.4 }));
}
function sleepersPlan(p: Painter, L: Look, y1: number, y2: number, step = 16, x0 = 10, x1 = 112) {
  for (let x = x0; x < x1; x += step) p.rect(x, y1 - 7, 8, y2 - y1 + 14, fl(L, L.sunk), so(L, { strokeWidth: 1.2, stroke: L.soft }));
}
function stones(p: Painter, L: Look, x0: number, x1: number, y0: number, y1: number, n: number) {
  for (let i = 0; i < n; i++) {
    const t = (i * 0.618) % 1, u = (i * 0.383 + 0.2) % 1;
    const x = x0 + t * (x1 - x0), y = y0 + u * (y1 - y0);
    p.poly([[x - 3, y], [x - 1, y - 3], [x + 3, y - 1.5], [x + 2, y + 2.5], [x - 2, y + 2.5]], null, so(L, { strokeWidth: 0.9, stroke: L.soft }));
  }
}
function post(p: Painter, L: Look, x: number, top: number, bottom = 86) {
  p.line(x, top, x, bottom, so(L, { strokeWidth: 3 }));
  p.line(x - 9, bottom, x + 9, bottom, so(L, { strokeWidth: 1.6, stroke: L.soft }));
}

const ARTS: Record<string, (p: Painter, L: Look) => void> = {
  fishplate: (p, L) => {
    p.rect(6, 34, 50, 16, fl(L, L.paper), so(L));
    p.rect(60, 34, 54, 16, fl(L, L.paper), so(L));
    p.rect(32, 38, 56, 10, fl(L, L.accent), so(L, { strokeWidth: 1.6 }));
    [40, 52, 68, 80].forEach((x) => p.circle(x, 43, 4.5, fl(L, L.ink), so(L, { strokeWidth: 1 })));
    p.poly([[14, 52], [36, 52], [40, 72], [10, 72]], fl(L, L.sunk), so(L, { strokeWidth: 1.2, stroke: L.soft }));
    p.poly([[82, 52], [104, 52], [108, 72], [78, 72]], fl(L, L.sunk), so(L, { strokeWidth: 1.2, stroke: L.soft }));
    stones(p, L, 6, 114, 76, 86, 12);
  },
  sleeper: (p, L) => {
    for (let x = 12; x < 112; x += 22) p.rect(x, 10, 12, 70, x === 56 ? fl(L, L.accent) : fl(L, L.sunk), so(L, { strokeWidth: x === 56 ? 2 : 1.2, stroke: x === 56 ? L.ink : L.soft }));
    rails(p, L, 26, 64, 4, 116);
  },
  ballast: (p, L) => {
    p.poly([[4, 84], [26, 46], [94, 46], [116, 84]], null, so(L, { strokeWidth: 1.4, stroke: L.soft }));
    stones(p, L, 10, 110, 52, 82, 34);
    p.rect(22, 38, 76, 10, fl(L, L.sunk), so(L));
    p.rect(34, 30, 8, 8, fl(L, L.ink), so(L, { strokeWidth: 1.2 }));
    p.rect(78, 30, 8, 8, fl(L, L.ink), so(L, { strokeWidth: 1.2 }));
  },
  clip: (p, L) => {
    p.rect(8, 64, 104, 18, fl(L, L.sunk), so(L, { strokeWidth: 1.4 }));
    const pts: [number, number][] = [[-14, 0], [14, 0], [14, -3], [4, -7], [3.2, -26], [8, -29], [8, -38], [-8, -38], [-8, -29], [-3.2, -26], [-4, -7], [-14, -3]];
    p.poly(pts.map(([x, y]) => [60 + x * 1.2, 64 + y * 1.2] as [number, number]), fl(L, L.paper), so(L));
    p.path("M30 62 C26 46 44 44 42 56 C41 62 36 62 38 58", null, so(L, { stroke: L.ghost ? L.soft : L.accent, strokeWidth: 3 }));
    p.path("M90 62 C94 46 76 44 78 56 C79 62 84 62 82 58", null, so(L, { stroke: L.ghost ? L.soft : L.accent, strokeWidth: 3 }));
  },
  railhead: (p, L) => {
    // side view: a wheel on the rail, the bright running band on top, leaves crushed ahead of it
    p.rect(2, 58, 116, 12, fl(L, L.paper), so(L));
    p.line(2, 59.5, 116, 59.5, so(L, { stroke: L.ghost ? L.soft : L.accent, strokeWidth: 3.2 }));
    p.rect(2, 70, 116, 6, fl(L, L.sunk), so(L, { strokeWidth: 1.2, stroke: L.soft }));
    p.circle(38, 34, 46, fl(L, L.paper), so(L, { strokeWidth: 2.2 }));
    p.circle(38, 34, 12, fl(L, L.ink), so(L, { strokeWidth: 1 }));
    p.arc(38, 34, 52, 52, Math.PI * 0.62, Math.PI * 0.95, false, null, so(L, { strokeWidth: 2 }));
    [[72, 56, 14], [88, 56, 12], [104, 56, 13]].forEach(([x, y, w]) => p.ellipse(x, y, w, 4, fl(L, L.warm), so(L, { strokeWidth: 1, stroke: L.ghost ? L.soft : L.warm })));
    p.path("M96 26 q6 -8 12 0 q-6 8 -12 0", fl(L, L.warm), so(L, { strokeWidth: 1, stroke: L.ghost ? L.soft : L.warm }));
    p.line(102, 30, 98, 42, so(L, { strokeWidth: 0.8, stroke: L.soft, strokeLineDash: [2, 3] }));
  },
  points: (p, L) => {
    p.line(4, 26, 116, 26, so(L, { strokeWidth: 2.2 }));
    p.line(4, 64, 116, 64, so(L, { strokeWidth: 2.2 }));
    p.curve([[4, 64], [60, 60], [116, 40]], so(L, { strokeWidth: 2.2 }));
    p.line(30, 60, 88, 30, so(L, { stroke: L.ghost ? L.soft : L.accent, strokeWidth: 3 }));
    p.line(30, 30, 86, 58, so(L, { stroke: L.ghost ? L.soft : L.accent, strokeWidth: 3, strokeLineDash: L.ghost ? [2.5, 4.5] : [5, 5] }));
    p.rect(8, 72, 18, 10, fl(L, L.sunk), so(L, { strokeWidth: 1.2 }));
  },
  crossing: (p, L) => {
    p.line(4, 22, 116, 52, so(L, { strokeWidth: 2.2 }));
    p.line(4, 68, 116, 38, so(L, { strokeWidth: 2.2 }));
    p.poly([[52, 45], [116, 41], [116, 49]], fl(L, L.accent), so(L, { strokeWidth: 1.8 }));
    p.line(10, 41, 50, 44, so(L, { strokeWidth: 1.4, stroke: L.soft }));
    p.line(10, 49, 50, 46, so(L, { strokeWidth: 1.4, stroke: L.soft }));
  },
  check: (p, L) => {
    rails(p, L, 24, 66);
    p.line(30, 58, 92, 58, so(L, { stroke: L.ghost ? L.soft : L.accent, strokeWidth: 3 }));
    p.line(24, 54, 30, 58, so(L, { stroke: L.ghost ? L.soft : L.accent, strokeWidth: 2 }));
    p.line(92, 58, 98, 54, so(L, { stroke: L.ghost ? L.soft : L.accent, strokeWidth: 2 }));
    sleepersPlan(p, L, 24, 66, 18, 12, 110);
  },
  adjustment: (p, L) => {
    p.line(4, 34, 116, 34, so(L, { strokeWidth: 1.2, stroke: L.soft }));
    p.poly([[4, 38], [86, 38], [86, 44], [4, 48]], fl(L, L.paper), so(L));
    p.poly([[34, 50], [116, 46], [116, 56], [34, 56]], fl(L, L.accent), so(L));
    sleepersPlan(p, L, 42, 52, 18, 10, 112);
    p.line(40, 70, 80, 70, so(L, { stroke: L.soft, strokeWidth: 1.2 }));
    p.line(40, 70, 46, 66, so(L, { stroke: L.soft, strokeWidth: 1.2 }));
    p.line(80, 70, 74, 74, so(L, { stroke: L.soft, strokeWidth: 1.2 }));
  },
  "colour-light": (p, L) => {
    post(p, L, 60, 48);
    p.rect(48, 6, 24, 46, fl(L, L.ink), so(L));
    p.circle(60, 16, 10, fl(L, "#5AB27A"), so(L, { strokeWidth: 1.2 }));
    p.circle(60, 29, 10, fl(L, L.sunk), so(L, { strokeWidth: 1.2 }));
    p.circle(60, 42, 10, fl(L, L.sunk), so(L, { strokeWidth: 1.2 }));
  },
  semaphore: (p, L) => {
    post(p, L, 46, 8);
    p.poly([[48, 20], [104, 14], [104, 26], [48, 30]], fl(L, "#C0392B"), so(L));
    p.line(92, 15, 92, 26, so(L, { stroke: L.ghost ? L.soft : "#FFFFFF", strokeWidth: 3.2 }));
    p.circle(46, 8, 6, fl(L, L.ink), so(L, { strokeWidth: 1 }));
  },
  feather: (p, L) => {
    post(p, L, 42, 50);
    p.rect(30, 34, 24, 32, fl(L, L.ink), so(L));
    p.circle(42, 44, 9, fl(L, "#5AB27A"), so(L, { strokeWidth: 1 }));
    p.circle(42, 56, 9, fl(L, L.sunk), so(L, { strokeWidth: 1 }));
    [[58, 30], [68, 22], [78, 14], [88, 6]].forEach(([x, y]) => p.circle(x, y, 7, fl(L, L.paper), so(L, { strokeWidth: 1.2 })));
    p.line(52, 36, 92, 4, so(L, { stroke: L.soft, strokeWidth: 1, strokeLineDash: [2, 3] }));
  },
  aws: (p, L) => {
    p.line(4, 28, 116, 22, so(L, { strokeWidth: 2.2 }));
    p.line(4, 72, 116, 66, so(L, { strokeWidth: 2.2 }));
    for (let x = 8; x < 116; x += 16) p.line(x, 22 - x * 0.05, x + 2, 76 - x * 0.05, so(L, { stroke: L.soft, strokeWidth: 4, roughness: 0.4 }));
    p.ellipse(60, 47, 30, 14, fl(L, L.ink), so(L));
    p.ellipse(60, 45, 18, 6, fl(L, L.soft), so(L, { strokeWidth: 0.8 }));
  },
  tpws: (p, L) => {
    p.line(4, 26, 116, 26, so(L, { strokeWidth: 2.2 }));
    p.line(4, 66, 116, 66, so(L, { strokeWidth: 2.2 }));
    [30, 74].forEach((x) => { p.rect(x, 38, 18, 16, fl(L, L.warm), so(L, { strokeWidth: 1.4 })); p.line(x + 3, 46, x + 15, 46, so(L, { strokeWidth: 1, stroke: L.ink })); });
    p.line(48, 46, 74, 46, so(L, { stroke: L.soft, strokeWidth: 1, strokeLineDash: [2, 3] }));
  },
  speed: (p, L) => {
    post(p, L, 60, 40);
    p.rect(40, 8, 40, 34, fl(L, L.paper), so(L, { strokeWidth: 2 }));
    p.text(60, 34, "40", 22, L.ghost ? L.soft : L.ink, "display", "middle");
  },
  chequer: (p, L) => {
    post(p, L, 60, 44);
    p.rect(38, 8, 44, 38, fl(L, L.paper), so(L, { strokeWidth: 2 }));
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) if ((r + k) % 2 === 0) p.rect(38 + k * 11, 8 + r * 12.6, 11, 12.6, fl(L, "#C0392B"), so(L, { strokeWidth: 0.6, stroke: L.ghost ? L.soft : "#C0392B" }));
  },
  viaduct: (p, L) => {
    p.rect(4, 30, 112, 8, fl(L, L.warm), so(L));
    for (let x = 6; x < 112; x += 22) p.path(`M${x} 88 L${x} 56 Q${x + 11} 40 ${x + 22} 56 L${x + 22} 88`, null, so(L, { strokeWidth: 1.6 }));
    p.rect(30, 18, 52, 12, fl(L, L.accent), so(L, { strokeWidth: 1.4 }));
  },
  tunnel: (p, L) => {
    p.path("M2 88 L2 40 Q30 10 60 12 Q92 12 118 40 L118 88", null, so(L, { stroke: L.soft, strokeWidth: 1.2 }));
    p.path("M24 88 L24 52 Q60 14 96 52 L96 88", fl(L, L.sunk), so(L, { strokeWidth: 2.4 }));
    p.path("M36 88 L36 56 Q60 30 84 56 L84 88", fl(L, L.ink), so(L, { strokeWidth: 1.4 }));
    p.line(2, 88, 118, 88, so(L, { strokeWidth: 1.6 }));
  },
  footbridge: (p, L) => {
    p.rect(14, 20, 92, 10, fl(L, L.accent), so(L));
    for (let x = 18; x < 104; x += 10) p.line(x, 20, x + 5, 10, so(L, { strokeWidth: 1, stroke: L.soft }));
    p.line(14, 10, 106, 10, so(L, { strokeWidth: 1.4 }));
    p.linear([[14, 30], [14, 40], [6, 40], [6, 50], [2, 50]], so(L, { strokeWidth: 1.6 }));
    p.linear([[106, 30], [106, 40], [114, 40], [114, 50], [118, 50]], so(L, { strokeWidth: 1.6 }));
    p.line(22, 30, 22, 84, so(L, { strokeWidth: 2 }));
    p.line(98, 30, 98, 84, so(L, { strokeWidth: 2 }));
    p.line(30, 78, 90, 78, so(L, { strokeWidth: 1.8 }));
    p.line(30, 84, 90, 84, so(L, { strokeWidth: 1.8 }));
  },
  "level-crossing": (p, L) => {
    p.poly([[30, 88], [52, 40], [68, 40], [90, 88]], fl(L, L.sunk), so(L, { strokeWidth: 1.2, stroke: L.soft }));
    p.line(2, 62, 118, 62, so(L, { strokeWidth: 2.2 }));
    p.line(2, 72, 118, 72, so(L, { strokeWidth: 2.2 }));
    p.line(18, 54, 18, 22, so(L, { strokeWidth: 2.4 }));
    p.line(18, 30, 70, 30, so(L, { strokeWidth: 4, stroke: L.ghost ? L.soft : "#C0392B" }));
    [30, 46, 62].forEach((x) => p.line(x, 28, x + 4, 32, so(L, { stroke: L.ghost ? L.soft : "#FFFFFF", strokeWidth: 2.4 })));
    p.rect(92, 12, 20, 12, fl(L, L.ink), so(L, { strokeWidth: 1.2 }));
    p.circle(97, 18, 6, fl(L, "#E74C3C"), so(L, { strokeWidth: 0.8 }));
    p.circle(107, 18, 6, fl(L, "#E74C3C"), so(L, { strokeWidth: 0.8 }));
    p.line(102, 24, 102, 56, so(L, { strokeWidth: 2.2 }));
  },
  mast: (p, L) => {
    p.line(30, 86, 30, 8, so(L, { strokeWidth: 3.2 }));
    p.line(30, 22, 100, 26, so(L, { strokeWidth: 2 }));
    p.line(30, 40, 92, 32, so(L, { strokeWidth: 1.6 }));
    p.curve([[2, 18], [60, 30], [118, 18]], so(L, { strokeWidth: 1.4, stroke: L.soft }));
    p.line(2, 36, 118, 36, so(L, { strokeWidth: 1.6, stroke: L.ghost ? L.soft : L.accent }));
    [50, 70, 90].forEach((x) => p.line(x, 24 + Math.abs(60 - x) * 0.08, x, 36, so(L, { strokeWidth: 0.8, stroke: L.soft })));
    p.line(50, 84, 118, 84, so(L, { strokeWidth: 1.8 }));
  },
  "signal-box": (p, L) => {
    p.rect(20, 50, 80, 36, fl(L, L.warm), so(L));
    p.rect(16, 26, 88, 24, fl(L, L.paper), so(L));
    for (let x = 22; x < 98; x += 16) p.rect(x, 30, 12, 16, fl(L, L.accent), so(L, { strokeWidth: 1 }));
    p.poly([[10, 26], [60, 6], [110, 26]], fl(L, L.sunk), so(L));
    p.linear([[100, 86], [112, 86], [112, 60], [100, 60]], so(L, { strokeWidth: 1.4 }));
  },
};

/** Paint an item's drawing. Unknown keys get a neutral placeholder rather than throwing. */
export function paintItem(p: Painter, art: string, c: Palette, ghost: boolean) {
  const L = lookFor(c, ghost);
  const f = ARTS[art];
  if (f) f(p, L);
  else p.circle(60, 45, 50, null, so(L));
}

export const hasArt = (art: string) => !!ARTS[art];
