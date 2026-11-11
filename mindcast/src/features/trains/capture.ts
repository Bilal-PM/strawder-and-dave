/**
 * Web build: turn the postcard SVG into a PNG (fonts inlined so the text survives), then download it.
 * react-native-view-shot needs html2canvas on the web, which is not installed, so it is not used here.
 */
import { F } from "@/ui/tokens";
import { POSTCARD_H, POSTCARD_W } from "./postcardArt";

export const canCopyText = typeof navigator !== "undefined" && !!navigator.clipboard;

const toDataUrl = (blob: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob); });

/** @font-face rules for the app fonts, with the font files inlined as data URIs. */
async function fontCss(): Promise<string> {
  const wanted = new Set<string>(Object.values(F));
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const fam = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
      if (!wanted.has(fam)) continue;
      const m = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"));
      if (!m) continue;
      try { const data = await toDataUrl(await (await fetch(m[1])).blob()); out.push(`@font-face{font-family:"${fam}";src:url(${data});}`); wanted.delete(fam); } catch { /* keep going without this font */ }
    }
  }
  return out.join("\n");
}

export async function capturePng(view: unknown): Promise<string> {
  const host = view as HTMLElement | null;
  const svg = host?.querySelector?.("svg");
  if (!svg) throw new Error("Postcard not ready");
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(POSTCARD_W));
  clone.setAttribute("height", String(POSTCARD_H));
  clone.removeAttribute("style");
  const css = await fontCss();
  if (css) { const st = document.createElementNS("http://www.w3.org/2000/svg", "style"); st.textContent = css; clone.insertBefore(st, clone.firstChild); }
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Could not draw the postcard")); img.src = url; });
    const cv = document.createElement("canvas");
    cv.width = POSTCARD_W; cv.height = POSTCARD_H;
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("No canvas");
    ctx.drawImage(img, 0, 0, POSTCARD_W, POSTCARD_H);
    return cv.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

function download(dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = "railway-postcard.png";
  document.body.appendChild(a); a.click(); a.remove();
}

/** On the web, sharing falls back to downloading the PNG. */
export async function sharePostcard(view: unknown): Promise<"shared" | "unavailable"> {
  download(await capturePng(view));
  return "shared";
}

export async function savePostcard(view: unknown): Promise<"saved" | "denied"> {
  download(await capturePng(view));
  return "saved";
}

export async function copyCaption(text: string): Promise<"copied" | "shared"> {
  await navigator.clipboard.writeText(text);
  return "copied";
}
