/**
 * A three-car diesel unit, drawn as an illustration: flat colours and ink outlines.
 * Local frame: x forward, y up (0 = rail top), z right. Cars are 20 m long, 2.75 m wide.
 */
import * as THREE from "three";
import { Builder, PRIM } from "./builder";

export type Livery = { body: string; band: string; doors: string; roof: string; front: string };
export const PLAYER_LIVERY: Livery = { body: "#2B59C3", band: "#1E3A6E", doors: "#F2C230", roof: "#9AA1A8", front: "#F2C230" };
export const AI_LIVERY: Livery = { body: "#E4DED2", band: "#5A626C", doors: "#5A626C", roof: "#8A9099", front: "#F2C230" };

export const CAR_LEN = 20;
export const CAR_GAP = 1;
const W = 2.75, FLOOR = 1.15, ROOF = 3.75;

export type CarGeo = { mesh: THREE.BufferGeometry; lines: THREE.BufferGeometry };

function box(b: Builder, x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, edge: number | false = 30) {
  b.add(PRIM.box, c, new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeScale(sx, sy, sz)), edge);
}

export function buildCar(l: Livery, cab: boolean): CarGeo {
  const b = new Builder();
  const h = CAR_LEN / 2;
  // body side profile, extruded across the width
  const sh = new THREE.Shape();
  if (cab) {
    sh.moveTo(-h, FLOOR); sh.lineTo(h, FLOOR); sh.lineTo(h, 2.2); sh.lineTo(h - 1.2, ROOF); sh.lineTo(-h + 0.3, ROOF); sh.lineTo(-h, ROOF - 0.3); sh.lineTo(-h, FLOOR);
  } else {
    sh.moveTo(-h, FLOOR); sh.lineTo(h, FLOOR); sh.lineTo(h, ROOF - 0.3); sh.lineTo(h - 0.3, ROOF); sh.lineTo(-h + 0.3, ROOF); sh.lineTo(-h, ROOF - 0.3); sh.lineTo(-h, FLOOR);
  }
  const body = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: false });
  body.translate(0, 0, -W / 2);
  b.add(body, l.body, new THREE.Matrix4(), 25);
  body.dispose();
  // roof
  box(b, -0.6, ROOF + 0.06, 0, CAR_LEN - 3, 0.12, W - 0.5, l.roof);
  // lower band and window band on both sides
  for (const sd of [-1, 1]) {
    const z = sd * (W / 2 + 0.012);
    box(b, cab ? -0.6 : 0, FLOOR + 0.35, z, CAR_LEN - (cab ? 2.0 : 0.6), 0.3, 0.02, l.band, false);
    const wx0 = cab ? -h + 1.0 : -h + 1.0, wx1 = cab ? h - 2.8 : h - 1.0;
    // windows between the doors
    const doors = [-h + 4.2, h - 5.0];
    let x = wx0;
    for (const dx of [...doors, wx1 + 1.2]) {
      const end = Math.min(dx - 0.9, wx1);
      if (end - x > 0.6) box(b, (x + end) / 2, 2.55, z, end - x, 0.85, 0.025, "#2E3640", false);
      x = dx + 0.9;
    }
    for (const dx of doors) {
      box(b, dx, (FLOOR + 3.3) / 2, z + sd * 0.005, 1.5, 3.3 - FLOOR, 0.03, l.doors, 25);
      box(b, dx, 2.55, z + sd * 0.012, 1.1, 0.75, 0.02, "#2E3640", false);
    }
    if (cab) box(b, h - 1.9, 2.55, z, 0.9, 0.75, 0.025, "#2E3640", false);
  }
  if (cab) {
    // yellow warning panel, windscreen, lights
    const fr = new THREE.Shape();
    fr.moveTo(-W / 2 + 0.05, FLOOR + 0.05); fr.lineTo(W / 2 - 0.05, FLOOR + 0.05); fr.lineTo(W / 2 - 0.05, 2.1); fr.lineTo(-W / 2 + 0.05, 2.1); fr.lineTo(-W / 2 + 0.05, FLOOR + 0.05);
    const panel = new THREE.ShapeGeometry(fr);
    const m = new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(h + 0.005, 0, 0));
    // the front leans back slightly; a flat panel on the lower nose reads well
    b.add(panel, l.front, m, false);
    panel.dispose();
    const ang = Math.atan2(1.2, ROOF - 2.2);
    b.add(PRIM.box, "#2E3640", new THREE.Matrix4().makeTranslation(h - 0.6 + Math.cos(ang) * 0.03, (2.2 + ROOF) / 2 + Math.sin(ang) * 0.03, 0).multiply(new THREE.Matrix4().makeRotationZ(ang)).multiply(new THREE.Matrix4().makeScale(0.04, 1.2, W - 0.6)), false);
    for (const sd of [-0.85, 0.85]) b.add(PRIM.disc, "#FFF6D8", new THREE.Matrix4().makeTranslation(h + 0.03, 1.55, sd).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(0.26, 0.26, 1)), false);
    box(b, h + 0.15, FLOOR - 0.15, 0, 0.3, 0.35, 0.5, "#2A2E33");
  }
  // underframe and bogies
  box(b, 0, FLOOR - 0.2, 0, CAR_LEN - 1.2, 0.35, W - 0.4, "#2A2E33");
  box(b, 0, FLOOR - 0.55, 0, 5, 0.5, 1.8, "#3A3F45", 30);
  for (const bx of [-7, 7]) {
    box(b, bx, 0.62, 0, 3.4, 0.4, 2.0, "#2A2E33");
    for (const ax of [-1.25, 1.25]) for (const sd of [-0.72, 0.72]) {
      b.add(PRIM.cyl, "#1A1C1F", new THREE.Matrix4().makeTranslation(bx + ax, 0.42, sd).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(0.84, 0.13, 0.84)), 40);
    }
  }
  // gangway ends
  if (!cab) for (const sx of [-1, 1]) box(b, sx * (h + 0.25), 2.3, 0, 0.5, 2.2, 1.2, "#3A3F45", false);
  else box(b, -h - 0.25, 2.3, 0, 0.5, 2.2, 1.2, "#3A3F45", false);
  return { mesh: b.meshGeometry(), lines: b.lineGeometry() };
}
