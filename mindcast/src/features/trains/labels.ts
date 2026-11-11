/** Nameplate and logo artwork for 3D textures (2D canvas, web only). */
import { F } from "@/ui/tokens";
import { onColour, type Livery } from "./model";

export function drawPlateCanvas(c: CanvasRenderingContext2D, w: number, h: number, name: string) {
  c.fillStyle = "#22262B"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "#E8C66A"; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10);
  c.fillStyle = "#E8C66A";
  let size = Math.round(h * 0.55);
  c.font = `800 ${size}px ${F.display}, system-ui, sans-serif`;
  while (size > 10 && c.measureText(name).width > w - 30) { size -= 2; c.font = `800 ${size}px ${F.display}, system-ui, sans-serif`; }
  c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText(name, w / 2, h / 2 + 2);
}

export function drawLogoCanvas(c: CanvasRenderingContext2D, w: number, h: number, L: Livery) {
  const x = w / 2, y = h / 2, s = w * 0.62, ink = onColour(L.stripe);
  c.clearRect(0, 0, w, h);
  c.beginPath(); c.arc(x, y, (s + 8) / 2, 0, Math.PI * 2); c.fillStyle = L.stripe; c.fill();
  c.lineWidth = 8; c.strokeStyle = "#1B1F24"; c.stroke();
  c.fillStyle = ink; c.strokeStyle = ink;
  const t = L.logo;
  if (t === "initials") {
    c.font = `800 ${Math.round(s * 0.55)}px ${F.display}, system-ui, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText((L.initials || "").slice(0, 3).toUpperCase(), x, y + 4);
  }
  if (t === "star") {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.22 : s * 0.48; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.closePath(); c.fill();
  }
  if (t === "wheel") {
    c.lineWidth = 14; c.beginPath(); c.arc(x, y, s * 0.4, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 9;
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.4); c.stroke(); }
  }
  if (t === "leaf") { c.beginPath(); c.moveTo(x, y + s * 0.42); c.quadraticCurveTo(x - s * 0.5, y, x, y - s * 0.45); c.quadraticCurveTo(x + s * 0.5, y, x, y + s * 0.42); c.fill(); }
  if (t === "chevron") { c.lineWidth = 20; c.lineCap = "round"; c.lineJoin = "round"; [-0.18, 0.14].forEach((dx) => { c.beginPath(); c.moveTo(x + dx * s - s * 0.16, y - s * 0.3); c.lineTo(x + dx * s + s * 0.14, y); c.lineTo(x + dx * s - s * 0.16, y + s * 0.3); c.stroke(); }); }
  if (t === "shield") { c.beginPath(); c.moveTo(x - s * 0.34, y - s * 0.36); c.lineTo(x + s * 0.34, y - s * 0.36); c.lineTo(x + s * 0.3, y + s * 0.06); c.quadraticCurveTo(x, y + s * 0.42, x, y + s * 0.44); c.quadraticCurveTo(x, y + s * 0.42, x - s * 0.3, y + s * 0.06); c.closePath(); c.fill(); }
}
