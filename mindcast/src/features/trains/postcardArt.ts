/**
 * The shareable postcard, drawn in a 1500 x 1000 box. Always on light card stock,
 * so it looks the same wherever it is shared.
 */
import type { Painter } from "@/ui/sketch";
import { measure, type Font, type Pal } from "@/ui/sketch";
import { drawClass } from "./draw";
import { INK, type DrawSpec, type Livery } from "./model";

export const POSTCARD_W = 1500;
export const POSTCARD_H = 1000;
export const POSTCARD_PAL: Pal = { ink: INK, paper: "#FBF7EE", glass: "#BFD9EA", soft: "#7A869A" };

export type Scene = "viaduct" | "coast" | "highlands" | "city";
export const SCENES: { value: Scene; label: string }[] = [
  { value: "viaduct", label: "Viaduct" },
  { value: "coast", label: "Coast" },
  { value: "highlands", label: "Highlands" },
  { value: "city", label: "City" },
];

export type PostcardArt = { spec: DrawSpec; className: string; fact: string; livery: Livery; scene: Scene; message: string; from: string; tram: boolean; date: Date };

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Greedy word wrap using the approximate text measure. */
export function wrapLines(text: string, maxW: number, size: number, font: Font) {
  const words = String(text || "").split(/\s+/).filter(Boolean), out: string[] = [];
  let cur = "";
  words.forEach((w) => { const t = cur ? `${cur} ${w}` : w; if (measure(t, size, font) > maxW && cur) { out.push(cur); cur = w; } else cur = t; });
  if (cur) out.push(cur);
  return out;
}

const clip = (lines: string[], n: number) => (lines.length > n ? [...lines.slice(0, n - 1), `${lines[n - 1].replace(/[\s.,;:!?]+$/, "")}...`] : lines);

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

/** A flat, unstroked fill (no wobble), for skies, sea and ground. */
const flat = (D: Painter, x: number, y: number, w: number, h: number, fill: string) => D.rect(x, y, w, h, fill, { stroke: "none", roughness: 0, strokeWidth: 0 });

export function paintPostcard(D: Painter, a: PostcardArt) {
  const W = POSTCARD_W, H = POSTCARD_H;
  const px = 40, py = 40, pw = 900, ph = 920, sc = a.scene, groundY = 700, right = px + pw, bottom = py + ph;

  // card stock with faint ruled lines
  const ruled = (x0: number, x1: number, y0: number, y1: number) => { for (let x = 40; x < W; x += 40) if (x > x0 && x < x1) D.line(x, y0, x, y1, { stroke: "#EEE6D4", strokeWidth: 1.5, roughness: 0.3 }); };
  flat(D, 0, 0, W, H, "#FBF7EE");
  ruled(0, W, 0, H);

  // picture panel: sky gradient in bands
  const top = sc === "city" ? "#DCE6F2" : "#BFD9EA", n = 18;
  for (let i = 0; i < n; i++) { const y0 = py + ((groundY - py) * i) / n; flat(D, px, y0, pw, (groundY - py) / n + 1, mix(top, "#F4E9D2", i / (n - 1))); }
  flat(D, px, groundY, pw, bottom - groundY, "#F4E9D2");
  D.circle(760, 190, 110, "#F2C230", { strokeWidth: 2 });

  if (sc === "highlands") {
    D.poly([[px, 640], [220, 300], [420, 640]], "#7FA37A", { fillStyle: "hachure", hachureGap: 10 });
    D.poly([[300, 640], [560, 230], [820, 640]], "#6E9370", { fillStyle: "hachure", hachureGap: 10 });
    D.poly([[520, 300], [560, 230], [600, 300]], "#FFFFFF");
    D.poly([[640, 640], [860, 360], [right, 547], [right, 640]], "#86AA82", { fillStyle: "hachure", hachureGap: 10 });
  }
  if (sc === "coast") {
    flat(D, px, 560, pw, bottom - 560, "#7FB0D6");
    for (let i = 0; i < 8; i++) D.curve([[px + 40 + i * 110, 820 + (i % 2) * 40], [px + 80 + i * 110, 805 + (i % 2) * 40], [px + 120 + i * 110, 820 + (i % 2) * 40]], { stroke: "#FFFFFF", strokeWidth: 3 });
    D.rect(px, 712, pw, 70, "#CFC6B4");
    for (let x = px + 60; x < right; x += 60) D.line(x, 712, x, 782, { strokeWidth: 1, stroke: "#9A9284" });
  }
  if (sc === "viaduct") D.poly([[px, groundY], [px, 560], [260, 520], [right, 600], [right, groundY]], "#9DBE8E", { fillStyle: "hachure", hachureGap: 12 });
  if (sc === "city") {
    ([[60, 330, 120], [190, 260, 110], [310, 380, 90], [410, 220, 130], [550, 330, 100], [660, 280, 120], [770, 360, 110]] as const).forEach(([x, y, w], k) => {
      D.rect(px + x, y, w, groundY - y, ["#C9D2DC", "#B7C2CE", "#D5DCE3"][k % 3]);
      for (let yy = y + 20; yy < groundY - 40; yy += 44) for (let xx = px + x + 14; xx < px + x + w - 20; xx += 34) D.rect(xx, yy, 16, 22, "#F7E7A6", { strokeWidth: 1 });
    });
  }

  // ground and track bed
  if (sc === "viaduct") {
    // brick viaduct: a solid wall from the deck down, with arched openings onto the valley
    flat(D, px, groundY + 20, pw, bottom - groundY - 20, "#9DBE8E");
    D.rect(px, groundY + 20, pw, bottom - groundY - 20, "#D27A4B", { fillStyle: "hachure", hachureGap: 8, strokeWidth: 1.6 });
    for (let i = 0; i < 6; i++) { const x = px + i * 150; D.path(`M${x + 22} ${bottom} L${x + 22} 850 Q${x + 75} 770 ${x + 128} 850 L${x + 128} ${bottom} Z`, "#9DBE8E", { strokeWidth: 2 }); }
    D.rect(px, groundY + 6, pw, 26, "#C5683A");
  } else if (sc === "city" && a.tram) {
    flat(D, px, groundY + 8, pw, bottom - groundY - 8, "#B9B4AA");
    for (let x = px; x < right - 30; x += 60) D.line(x, groundY + 8, x + 30, bottom, { strokeWidth: 1, stroke: "#9A958C" });
  } else if (sc !== "coast") {
    flat(D, px, groundY + 8, pw, bottom - groundY - 8, sc === "city" ? "#B9B4AA" : "#A9C79A");
    D.rect(px, groundY + 8, pw, 50, "#8E8A83", { fillStyle: "hachure", hachureGap: 6 });
  }

  // the train, at 1.28 x the library drawing. Long trains run off the right edge of the picture.
  const k = 1.28, ox = px + 40, l0 = (px - ox) / k, l1 = (right - ox) / k, kind = a.spec.model.kind;
  const fitLen = kind === "unit" || kind === "mpv" ? a.spec.len + 9 : kind === "nmt" ? a.spec.len + 11 : kind === "tram7" ? 30 : undefined;
  D.group(`translate(${ox} ${groundY - 184 * k}) scale(${k})`, () => {
    if (!(sc === "city" && a.tram)) for (let x = l0 + 6; x < l1 - 10; x += 22) D.line(x, 188, x + 10, 196, { stroke: "#5A564F", strokeWidth: 3 });
    D.line(l0 + 2, 184, l1 - 2, 184, { strokeWidth: 3 });
    drawClass(D, a.spec, { ...a.livery, noMore: true }, 640, 184, 172, false, fitLen);
  });
  if (fitLen) { flat(D, right + 2, py - 10, W - right - 2, ph + 20, "#FBF7EE"); ruled(right + 2, W, py - 10, bottom + 10); }
  if (sc === "city" && !a.tram) {
    D.rect(px, groundY - 330, pw, 16, "#5A6069");
    for (let x = px + 60; x < right; x += 200) D.line(x, groundY - 314, x, groundY + 10, { strokeWidth: 4, stroke: "#5A6069" });
  }

  D.rect(px, py, pw, ph, null, { strokeWidth: 4, roughness: 1.2 });
  D.text(px + 40, py + 96, "Greetings", 92, INK, "display", "start");
  D.text(px + 44, py + 160, "from the railway", 64, "#2B59C3", "hand", "start");
  if (a.livery.name) D.text(right - 24, bottom - 24, `"${a.livery.name}"`, 34, sc === "coast" ? INK : "#FBF7EE", "hand", "end");

  // stamp with perforated edge and a tiny train
  D.rect(1300, 60, 160, 190, "#FFFFFF", { strokeWidth: 2 });
  for (let x = 1300; x <= 1460; x += 14) { D.circle(x, 60, 10, "#FBF7EE", { stroke: "none", roughness: 0 }); D.circle(x, 250, 10, "#FBF7EE", { stroke: "none", roughness: 0 }); }
  for (let y = 60; y <= 250; y += 14) { D.circle(1300, y, 10, "#FBF7EE", { stroke: "none", roughness: 0 }); D.circle(1460, y, 10, "#FBF7EE", { stroke: "none", roughness: 0 }); }
  D.group("translate(1312 120) scale(0.21)", () => { D.line(-10, 184, 650, 184, { strokeWidth: 6 }); drawClass(D, a.spec, { ...a.livery, name: "", number: "", logo: "none", noMore: true }); });
  D.text(1380, 230, "1ST STOP", 18, "#B23A3A", "mono");

  // postmark
  const pm = "#7A869A";
  D.circle(1210, 190, 196, null, { stroke: pm, strokeWidth: 3 });
  D.circle(1210, 190, 150, null, { stroke: pm, strokeWidth: 2 });
  D.text(1210, 170, "GROUNDWORK", 16, pm, "mono");
  D.text(1210, 196, `${a.date.getDate()} ${MONTHS[a.date.getMonth()]} ${a.date.getFullYear()}`, 16, pm, "mono");
  D.text(1210, 222, "ONE RAILWAY", 15, pm, "mono");
  for (let i = 0; i < 5; i++) D.curve([[1330, 140 + i * 18], [1400, 128 + i * 18], [1470, 140 + i * 18]], { stroke: pm, strokeWidth: 2 });

  // message side
  const rx = 990;
  D.line(rx, 300, rx, 940, { stroke: "#C9BFA8", strokeWidth: 2 });
  const lines = clip(wrapLines(a.message || "Write your message", 440, 46, "hand"), 6);
  lines.forEach((l, i) => D.text(rx + 30, 350 + i * 56, l, 46, INK, "hand", "start"));
  if (a.from) D.text(rx + 30, 350 + lines.length * 56 + 20, `From ${a.from}`.slice(0, 32), 44, "#2B59C3", "hand", "start");

  // spotter's note, from the domain pack
  D.rect(rx + 24, 780, 450, 150, "#F2EAD6", { strokeWidth: 1.6 });
  D.text(rx + 44, 814, `SPOTTER'S NOTE: ${a.className.toUpperCase()}`.slice(0, 40), 16, "#6B5D45", "mono", "start");
  clip(wrapLines(a.fact, 405, 21, "body"), 4).forEach((l, i) => D.text(rx + 44, 848 + i * 25, l, 21, "#3A3328", "body", "start"));
  D.text(W - 40, H - 16, "made with groundwork · one railway", 18, "#9A8F78", "mono", "end");
}
