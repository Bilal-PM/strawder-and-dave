/**
 * Hand-drawn art for Explore: the map (600 x 900), pins, place scenes (320 x 170) and passport stamps.
 */
import type { Painter } from "@/ui/sketch";
import type { Palette } from "@/ui/tokens";
import { GB_PATHS, project } from "./gbmap";
import { CITY_LABELS, LINES, T, type Cat } from "./places";

const P = (k: string) => project(T[k][0], T[k][1]);

export function paintMap(p: Painter, c: Palette) {
  GB_PATHS.ie.forEach((d) => p.path(d, c.sunk, { roughness: 0.7, stroke: c.soft, strokeWidth: 1.2 }));
  GB_PATHS.uk.forEach((d) => p.path(d, c.surface, { roughness: 0.8, strokeWidth: 1.6 }));
  LINES.forEach((ln) => p.curve(ln.map(P), { roughness: 0.6, stroke: c.soft, strokeWidth: 2.4 }));
  const [px, py] = P("por"), [rx, ry] = P("ryd");
  p.line(px, py, rx, ry, { roughness: 0.5, stroke: c.accent, strokeWidth: 1.6, strokeLineDash: [4, 4] });
  CITY_LABELS.forEach(([name, k, side]) => {
    const [x, y] = P(k);
    const w = name.length * 17 * 0.62 + 8;
    const bx = side > 0 ? x + 6 : side < 0 ? x - 6 - w : x - w / 2, by = side === 0 ? y + 9 : y - 9;
    p.rect(bx, by, w, 20, c.bg, { stroke: "none", roughness: 0.3 });
    p.circle(x, y, 8, c.ink, { roughness: 0.5, strokeWidth: 1.4 });
    if (side === 0) p.text(x, y + 25, name, 17, c.soft, "mono", "middle");
    else p.text(x + side * 10, y + 6, name, 17, c.soft, "mono", side > 0 ? "start" : "end");
  });
  p.text(520, 58, "N", 24, c.ink, "display");
  p.line(520, 66, 520, 106, { roughness: 0.6 });
  p.poly([[520, 66], [513, 82], [527, 82]], c.ink, { roughness: 0.6, strokeWidth: 1.5 });
  p.text(470, 872, "explore by train", 34, c.accent, "hand");
}

export type Pin = { id: string; x: number; y: number; colour: string; selected: boolean; stamped: boolean; name: string };

export function paintPins(p: Painter, pins: Pin[], c: Palette) {
  // selected last so it sits on top
  [...pins].sort((a, b) => Number(a.selected) - Number(b.selected)).forEach((pin) => {
    const { x, y, colour } = pin;
    if (pin.selected) p.circle(x, y, 46, undefined, { stroke: colour, strokeWidth: 3, roughness: 1 });
    p.path(`M${x} ${y} Q${x - 13} ${y - 15} ${x - 11} ${y - 26} Q${x - 7} ${y - 39} ${x} ${y - 39} Q${x + 7} ${y - 39} ${x + 11} ${y - 26} Q${x + 13} ${y - 15} ${x} ${y} Z`, colour, { roughness: 0.8, strokeWidth: 1.8 });
    p.circle(x, y - 26, 10, pin.stamped ? c.ink : c.surface, { roughness: 0.4, strokeWidth: 1.2 });
    if (pin.selected) {
      const right = x < 400;
      p.text(x + (right ? 20 : -20), y - 30, pin.name, 26, c.ink, "hand", right ? "start" : "end");
    }
  });
}

export function paintPlace(p: Painter, cat: Cat, c: Palette, museum: string) {
  const train = (x: number, y: number, w = 110) => {
    p.rect(x, y, w, 26, c.accent);
    p.rect(x + 10, y + 5, 18, 10, c.surface);
    p.rect(x + 34, y + 5, 18, 10, c.surface);
    p.circle(x + 16, y + 28, 12, c.surface);
    p.circle(x + w - 16, y + 28, 12, c.surface);
  };
  if (cat === "bridges") {
    p.line(10, 150, 310, 150, { stroke: c.accent, roughness: 2 });
    for (let x = 24; x < 300; x += 46) p.path(`M${x} 150 L${x} 90 Q${x + 23} 62 ${x + 46} 90 L${x + 46} 150`, undefined, { strokeWidth: 1.8, fill: c.ppe, fillStyle: "hachure", hachureGap: 6 });
    p.rect(18, 54, 286, 12, c.ppe);
    train(110, 26);
  } else if (cat === "coast") {
    p.circle(270, 34, 32, c.pass);
    p.rect(0, 104, 320, 56, undefined, { fill: c.accent, fillStyle: "hachure", hachureGap: 6, strokeWidth: 1 });
    p.rect(0, 84, 320, 22, c.sunk);
    p.line(0, 82, 320, 82, { strokeWidth: 2.5, roughness: 0.8 });
    train(100, 54);
    [[40, 122], [180, 136], [250, 118]].forEach(([x, y]) => p.curve([[x, y], [x + 14, y - 10], [x + 28, y]], { stroke: c.surface, strokeWidth: 3 }));
  } else if (cat === "scenic") {
    p.poly([[0, 130], [70, 40], [140, 130]], undefined, { fill: c.good, fillStyle: "hachure", hachureGap: 6 });
    p.poly([[90, 130], [190, 20], [290, 130]], undefined, { fill: c.good, fillStyle: "hachure", hachureGap: 6 });
    p.poly([[170, 42], [190, 20], [210, 42]], c.surface);
    p.curve([[0, 150], [100, 136], [200, 152], [320, 140]], { strokeWidth: 2.5, roughness: 0.8 });
    train(150, 112, 70);
  } else {
    p.path("M20 140 L20 70 Q160 0 300 70 L300 140", undefined, { strokeWidth: 2.4, fill: c.line, fillStyle: "hachure", hachureGap: 8 });
    for (let x = 60; x < 300; x += 40) p.line(x, 140, x, 50 + Math.abs(160 - x) * 0.25, { stroke: c.soft, strokeWidth: 1.4, roughness: 0.6 });
    p.path("M90 132 L90 100 Q90 90 100 90 L200 90 Q236 92 248 132 Z", museum);
    [120, 160, 200].forEach((x) => p.circle(x, 134, 16, c.surface));
    p.line(10, 142, 310, 142, { strokeWidth: 2.5, roughness: 0.8 });
  }
}

/** A round passport stamp (100 x 100). Inked when stamped, a faint dashed ring when not. */
export function paintStamp(p: Painter, stamped: boolean, colour: string, c: Palette, initials: string) {
  if (!stamped) {
    p.circle(50, 50, 84, undefined, { stroke: c.line, strokeWidth: 2, strokeLineDash: [6, 6], roughness: 0.6 });
    p.text(50, 58, initials, 24, c.line, "display");
    return;
  }
  p.circle(50, 50, 86, undefined, { stroke: colour, strokeWidth: 3, roughness: 1.4 });
  p.circle(50, 50, 70, undefined, { stroke: colour, strokeWidth: 1.5, roughness: 1.2 });
  p.text(50, 59, initials, 26, colour, "display");
  p.line(22, 72, 78, 72, { stroke: colour, strokeWidth: 1.5, roughness: 1.5 });
}
