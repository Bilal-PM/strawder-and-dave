/**
 * Hand-drawn art for the Today tab: history scenes (320 x 170) and weather skies (60 x 60).
 * Each function paints into a Sketch Painter using the current theme palette.
 */
import type { HistoryEvent } from "@/domain/types";
import type { Painter } from "@/ui/sketch";
import type { Palette } from "@/ui/tokens";
import type { Sky } from "./services/railImpacts";

export const LEAF = "#B7791F";

function ground(p: Painter, c: Palette, y = 140) {
  p.line(10, y, 310, y, { strokeWidth: 2.5 });
  for (let x = 16; x < 310; x += 18) p.line(x, y + 3, x + 8, y + 9, { stroke: c.soft, strokeWidth: 1.5, roughness: 0.8 });
}

function smallTrain(p: Painter, c: Palette, x: number, y: number) {
  p.rect(x, y, 76, 26, c.accent);
  p.rect(x + 8, y + 5, 16, 10, c.surface);
  p.rect(x + 30, y + 5, 16, 10, c.surface);
  p.rect(x, y + 20, 76, 4, c.pass, { stroke: c.pass, strokeWidth: 1 });
  p.circle(x + 14, y + 28, 10, c.surface);
  p.circle(x + 62, y + 28, 10, c.surface);
}

export function paintHistory(p: Painter, kind: HistoryEvent["art"], c: Palette) {
  if (kind === "loco") {
    ground(p, c);
    p.rect(90, 80, 120, 46, c.accent);
    p.rect(190, 56, 44, 70, c.accent);
    p.rect(200, 64, 24, 18, c.surface);
    p.rect(110, 50, 16, 30, c.ink);
    [[110, 132, 30], [150, 132, 30], [210, 128, 38]].forEach(([x, y, r]) => p.circle(x, y, r, c.surface));
    [[118, 40, 18], [132, 26, 24], [152, 14, 28]].forEach(([x, y, r]) => p.circle(x, y, r, undefined, { stroke: c.soft, strokeWidth: 1.5, roughness: 1.4, fill: c.line, fillStyle: "hachure", hachureGap: 5 }));
  } else if (kind === "viaduct") {
    p.line(10, 60, 310, 60, { strokeWidth: 3 });
    for (let x = 20; x < 300; x += 56) p.path(`M${x} 160 L${x} 100 Q${x + 28} 66 ${x + 56} 100 L${x + 56} 160`, undefined, { fill: c.ppe, fillStyle: "hachure", hachureGap: 6 });
    p.rect(10, 60, 300, 12, c.ppe);
    smallTrain(p, c, 120, 30);
  } else if (kind === "tunnel") {
    p.rect(10, 20, 300, 130, undefined, { fill: c.line, fillStyle: "cross-hatch", hachureGap: 9, strokeWidth: 1.2 });
    p.path("M70 150 L70 80 Q160 10 250 80 L250 150 Z", c.ink);
    p.path("M96 150 L96 88 Q160 36 224 88 L224 150 Z", c.bg);
    p.rect(122, 92, 76, 48, c.accent);
    p.rect(134, 100, 52, 16, c.pass);
    [138, 182].forEach((x) => p.circle(x, 142, 12, c.surface));
    p.line(10, 150, 310, 150, { strokeWidth: 2.5 });
  } else if (kind === "bridge") {
    p.line(0, 150, 320, 150, { stroke: c.accent, roughness: 2 });
    [[20, 110], [110, 200], [200, 290]].forEach(([a, b]) => {
      p.poly([[a, 110], [(a + b) / 2, 40], [b, 110], [(a + b) / 2, 150]], undefined, { stroke: c.ppe, strokeWidth: 3 });
      p.line((a + b) / 2, 40, (a + b) / 2, 150, { stroke: c.ppe, strokeWidth: 2.5 });
    });
    p.line(10, 106, 310, 106, { strokeWidth: 4, roughness: 0.8 });
    p.rect(220, 88, 60, 16, c.accent);
  } else if (kind === "streamline") {
    ground(p, c);
    p.path("M60 128 L60 84 Q60 70 76 70 L220 70 Q270 72 290 128 Z", c.accent);
    p.line(60, 104, 286, 104, { stroke: c.pass, strokeWidth: 5, roughness: 0.8 });
    [90, 130, 170, 210].forEach((x) => p.circle(x, 132, 18, c.surface));
    [[16, 80], [10, 96], [22, 112]].forEach(([x, y]) => p.line(x, y, x + 34, y, { stroke: c.soft }));
  } else if (kind === "paper") {
    p.rect(90, 18, 140, 136, c.surface);
    [44, 60, 76, 92, 108].forEach((y, k) => p.line(106, y, k === 4 ? 170 : 214, y, { stroke: c.soft }));
    p.circle(196, 128, 34, undefined, { fill: c.ppe, fillStyle: "hachure", hachureGap: 4 });
    p.line(30, 150, 290, 150);
  } else if (kind === "station") {
    // Train shed: arched roof on columns, platform, clock
    p.path("M20 150 L20 70 Q160 0 300 70 L300 150", undefined, { fill: c.line, fillStyle: "hachure", hachureGap: 8, strokeWidth: 2.4 });
    for (let x = 60; x < 300; x += 40) p.line(x, 150, x, 50 + Math.abs(160 - x) * 0.25, { stroke: c.soft, strokeWidth: 1.4, roughness: 0.6 });
    p.rect(20, 132, 120, 10, c.sunk);
    smallTrain(p, c, 170, 112);
    p.circle(160, 58, 26, c.surface);
    p.line(160, 58, 160, 49, { strokeWidth: 1.6 });
    p.line(160, 58, 167, 61, { strokeWidth: 1.6 });
    p.line(10, 150, 310, 150, { strokeWidth: 2.5 });
  } else {
    // signal: a colour light signal beside the track
    ground(p, c);
    p.line(110, 140, 110, 52, { strokeWidth: 4 });
    p.rect(92, 20, 36, 80, c.ink);
    p.circle(110, 34, 16, c.warn);
    p.circle(110, 58, 16, c.surface);
    p.circle(110, 82, 16, c.surface);
    p.arc(110, 34, 30, 30, Math.PI * 1.1, Math.PI * 1.9, false, undefined, { stroke: c.warn, strokeWidth: 1.5 });
    smallTrain(p, c, 190, 106);
  }
}

export function paintSky(p: Painter, sky: Sky, c: Palette) {
  const o = { strokeWidth: 1.6, roughness: 1.1 };
  const cloud = (fill: string, dy = 0) => p.path(`M14 ${38 + dy} Q8 ${38 + dy} 8 ${31 + dy} Q8 ${24 + dy} 16 ${24 + dy} Q18 ${14 + dy} 28 ${14 + dy} Q38 ${14 + dy} 40 ${23 + dy} Q50 ${22 + dy} 51 ${31 + dy} Q51 ${38 + dy} 44 ${38 + dy} Z`, fill, o);
  const sun = (x: number, y: number, d: number) => {
    p.circle(x, y, d, c.pass, o);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, r1 = d / 2 + 4, r2 = d / 2 + 10;
      p.line(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * r2, y + Math.sin(a) * r2, { stroke: c.ppe, strokeWidth: 2, roughness: 1 });
    }
  };
  if (sky === "sun") return sun(30, 30, 22);
  if (sky === "part") {
    sun(38, 22, 16);
    return cloud(c.surface, 8);
  }
  if (sky === "fog") {
    cloud(c.line, -4);
    [42, 49, 56].forEach((y, k) => p.line(8 + k * 3, y, 52 - k * 3, y, { stroke: c.soft, strokeWidth: 2 }));
    return;
  }
  cloud(sky === "storm" ? c.soft : c.line);
  if (sky === "rain" || sky === "storm") [18, 28, 38].forEach((x) => p.line(x, 42, x - 3, 52, { stroke: c.accent, strokeWidth: 2, roughness: 0.6 }));
  if (sky === "storm") p.poly([[30, 38], [24, 50], [30, 50], [26, 58], [36, 46], [30, 46]], c.pass, o);
  if (sky === "wind") [[10, 46, 40], [16, 53, 34]].forEach(([x, y, w]) => p.curve([[x, y], [x + w / 2, y - 3], [x + w, y]], { stroke: c.soft, strokeWidth: 2 }));
  if (sky === "snow")
    [[18, 48], [30, 53], [42, 48]].forEach(([x, y]) => {
      for (let j = 0; j < 3; j++) {
        const a = (j * Math.PI) / 3;
        p.line(x - Math.cos(a) * 4, y - Math.sin(a) * 4, x + Math.cos(a) * 4, y + Math.sin(a) * 4, { stroke: c.accent, strokeWidth: 1.6, roughness: 0.4 });
      }
    });
}
