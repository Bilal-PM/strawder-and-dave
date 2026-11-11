/**
 * The Open Line: three.js scene (react-three-fiber). Everything heavy is built once, outside
 * React, then handed to r3f as primitives. Per-frame work is a fixed-step sim plus a handful of
 * matrix updates.
 */
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Builder, PRIM } from "./builder";
import { COL, INK, type Label, type Scenery } from "./scenery";
import { brakingDistance, step, TRAIN_LEN, type Cond, type Sim, type Tod } from "./sim";
import type { Terrain } from "./terrain";
import { frame, newFrame, RAIL_TOP, type World } from "./track";
import { AI_LIVERY, buildCar, CAR_GAP, CAR_LEN, PLAYER_LIVERY } from "./trainModel";

export type CamMode = "chase" | "cab" | "drone";
export type CamCtl = { mode: CamMode; yaw: number; pitch: number; dist: number };
export type WorldData = { world: World; terrain: Terrain; scenery: Scenery };

export const TOD: Record<Tod, { sky: string; fogNear: number; fogFar: number; sun: string; sunI: number; sunDir: [number, number, number]; hemiSky: string; hemiGround: string; hemiI: number; disc?: string }> = {
  morning: { sky: "#ECEFEA", fogNear: 40, fogFar: 560, sun: "#FFE6C4", sunI: 1.9, sunDir: [0.6, 0.35, 0.5], hemiSky: "#E8EEF3", hemiGround: "#B9C49C", hemiI: 1.5, disc: "#FBE7C6" },
  day: { sky: "#F6F5F1", fogNear: 260, fogFar: 1250, sun: "#FFFFFF", sunI: 2.1, sunDir: [0.4, 0.85, 0.3], hemiSky: "#F2F4F6", hemiGround: "#B9C49C", hemiI: 1.5 },
  dusk: { sky: "#F0D2B6", fogNear: 160, fogFar: 900, sun: "#FFB070", sunI: 1.7, sunDir: [-0.7, 0.22, -0.4], hemiSky: "#CDB8C6", hemiGround: "#8E8D6A", hemiI: 1.25, disc: "#F7A86A" },
};

const LIT = { r: new THREE.Color("#FF3B30"), y: new THREE.Color("#FFC02E"), g: new THREE.Color("#36D27A"), off: new THREE.Color("#3A3F45") };
// lamps top to bottom: yellow, green, yellow, red
const ASPECT_LAMPS: THREE.Color[][] = [
  [LIT.off, LIT.off, LIT.off, LIT.r],
  [LIT.off, LIT.off, LIT.y, LIT.off],
  [LIT.y, LIT.off, LIT.y, LIT.off],
  [LIT.off, LIT.g, LIT.off, LIT.off],
];

function labelTexture(l: Label): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  const W = 512, Hh = Math.max(32, Math.round((W * l.h) / l.w));
  cv.width = W; cv.height = Hh;
  const c = cv.getContext("2d");
  if (!c) return null;
  const bg = l.kind === "name" ? "#1E3A6E" : l.kind === "num" ? "#F2C230" : "#F4F1EA";
  const fg = l.kind === "name" ? "#FFFFFF" : "#1B1F24";
  c.fillStyle = bg; c.fillRect(0, 0, W, Hh);
  if (l.kind === "watch") { c.strokeStyle = "#E8611A"; c.lineWidth = Hh * 0.12; c.strokeRect(0, 0, W, Hh); }
  if (l.kind === "name") { c.strokeStyle = "#FFFFFF"; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, Hh - 20); }
  c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle";
  const family = "BricolageGrotesque_800ExtraBold, system-ui, sans-serif";
  let size = Hh * 0.62;
  const words = l.text.split(" ");
  c.font = `800 ${size}px ${family}`;
  let lines = [l.text];
  if (c.measureText(l.text).width > W * 0.88 && words.length > 1 && l.kind === "name") {
    const mid = Math.ceil(words.length / 2);
    lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    size = Hh * 0.36;
  }
  c.font = `800 ${size}px ${family}`;
  const widest = Math.max(...lines.map((t) => c.measureText(t).width));
  if (widest > W * 0.88) { size *= (W * 0.88) / widest; c.font = `800 ${size}px ${family}`; }
  lines.forEach((t, i) => c.fillText(t, W / 2, Hh / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function labelMeshes(labels: Label[]) {
  const g = new THREE.Group();
  for (const l of labels) {
    const tex = labelTexture(l);
    if (!tex) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(l.w, l.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.matrixAutoUpdate = false;
    m.matrix.copy(l.m);
    g.add(m);
  }
  return g;
}

function boomGeometry(dir: 1 | -1) {
  const b = new Builder();
  for (let i = 0; i < 6; i++) {
    const x = dir * (0.3 + i * 0.6);
    b.add(PRIM.box, i % 2 ? "#F4F1EA" : "#B4442E", new THREE.Matrix4().makeTranslation(x, 0, 0).multiply(new THREE.Matrix4().makeScale(0.6, 0.12, 0.1)), false);
  }
  const g = b.meshGeometry();
  const lines = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(dir * 3.6, 0.06, 0), new THREE.Vector3(0, -0.06, 0), new THREE.Vector3(dir * 3.6, -0.06, 0)]);
  return { g, lines };
}

type Props = {
  data: WorldData;
  simRef: React.MutableRefObject<Sim | null>;
  running: boolean;
  tod: Tod;
  cond: Cond;
  cam: React.MutableRefObject<CamCtl>;
  reduceMotion: boolean;
  orbit: boolean; // slow automatic orbit (intro)
};

export function Scene({ data, simRef, running, tod, cond, cam, reduceMotion, orbit }: Props) {
  const { world, terrain, scenery } = data;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  // ---- materials (shared) ----
  const mats = useMemo(() => ({
    toon: new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    // MeshToonMaterial has no typed flatShading, but the shader honours it: faceted hills.
    terrain: Object.assign(new THREE.MeshToonMaterial({ vertexColors: true }), { flatShading: true }),
    ink: new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.78 }),
    sleeper: new THREE.MeshToonMaterial({ color: COL.sleeper }),
    lamp: new THREE.MeshBasicMaterial({ toneMapped: false }),
    leaf: new THREE.MeshToonMaterial({ side: THREE.DoubleSide }),
    river: new THREE.MeshToonMaterial({ color: "#93BBD9", side: THREE.DoubleSide }),
    marker: new THREE.MeshBasicMaterial({ color: "#F2C230", toneMapped: false }),
    xl: [new THREE.MeshBasicMaterial({ color: LIT.off, toneMapped: false }), new THREE.MeshBasicMaterial({ color: LIT.off, toneMapped: false })],
    sun: new THREE.MeshBasicMaterial({ color: "#FBE7C6", fog: false, toneMapped: false }),
  }), []);

  // ---- static world ----
  const statics = useMemo(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(terrain.grid, mats.terrain));
    g.add(new THREE.Mesh(terrain.strip, mats.terrain));
    g.add(new THREE.Mesh(terrain.river, mats.river));
    const m = new THREE.Mesh(scenery.geo, mats.toon);
    g.add(m);
    g.add(new THREE.LineSegments(scenery.lines, mats.ink));
    const sl = new THREE.InstancedMesh(PRIM.box, mats.sleeper, scenery.sleepers.length);
    scenery.sleepers.forEach((mm, i) => sl.setMatrixAt(i, mm));
    sl.instanceMatrix.needsUpdate = true;
    sl.computeBoundingSphere();
    g.add(sl);
    g.add(labelMeshes(scenery.labels));
    g.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); });
    return g;
  }, [terrain, scenery, mats]);

  const lamps = useMemo(() => {
    const im = new THREE.InstancedMesh(PRIM.disc, mats.lamp, scenery.lamps.length);
    scenery.lamps.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, LIT.off); });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    return im;
  }, [scenery, mats]);

  const leaves = useMemo(() => {
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.24, 0.18), mats.leaf, scenery.leaves.m.length);
    scenery.leaves.m.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, scenery.leaves.c[i]); });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    return im;
  }, [scenery, mats]);

  const esr = useMemo(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(scenery.esr.geo, mats.toon));
    g.add(new THREE.LineSegments(scenery.esr.lines, mats.ink));
    g.add(labelMeshes(scenery.esr.labels));
    return g;
  }, [scenery, mats]);

  const crossing = useMemo(() => {
    const g = new THREE.Group();
    const booms = scenery.crossing.booms.map((p) => {
      const { g: bg, lines } = boomGeometry(p.dir);
      const o = new THREE.Group();
      o.add(new THREE.Mesh(bg, mats.toon));
      o.add(new THREE.LineSegments(lines, mats.ink));
      o.matrixAutoUpdate = false;
      g.add(o);
      return { o, p, angle: p.dir * (Math.PI / 2) };
    });
    scenery.crossing.lights.forEach((m, i) => {
      const l = new THREE.Mesh(PRIM.disc, mats.xl[i % 2]);
      l.matrixAutoUpdate = false;
      l.matrix.copy(m);
      g.add(l);
    });
    return { g, booms };
  }, [scenery, mats]);

  const trains = useMemo(() => {
    const mk = (liv: typeof PLAYER_LIVERY) => {
      const cab = buildCar(liv, true), mid = buildCar(liv, false);
      const mat = new THREE.MeshToonMaterial({ vertexColors: true });
      const car = (geo: typeof cab) => {
        const o = new THREE.Group();
        o.add(new THREE.Mesh(geo.mesh, mat));
        o.add(new THREE.LineSegments(geo.lines, mats.ink));
        o.matrixAutoUpdate = false;
        return o;
      };
      const g = new THREE.Group();
      const cars = [car(cab), car(mid), car(cab)];
      cars.forEach((c) => g.add(c));
      return { g, cars };
    };
    return { player: mk(PLAYER_LIVERY), ai: mk(AI_LIVERY) };
  }, [mats]);

  const marker = useMemo(() => {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(PRIM.box, mats.marker);
    bar.scale.set(0.35, 0.05, 3.4);
    bar.position.y = RAIL_TOP + 0.06;
    g.add(bar);
    for (const z of [-1.9, 1.9]) {
      const post = new THREE.Mesh(PRIM.box, mats.marker);
      post.scale.set(0.12, 1.3, 0.12);
      post.position.set(0, RAIL_TOP + 0.65, z);
      g.add(post);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(PRIM.box), mats.ink);
      edges.scale.copy(post.scale);
      edges.position.copy(post.position);
      g.add(edges);
    }
    g.matrixAutoUpdate = false;
    return g;
  }, [mats]);

  const sun = useMemo(() => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(60, 32), mats.sun);
    m.renderOrder = -1;
    return m;
  }, [mats]);

  // ---- time of day and conditions ----
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const p = TOD[tod];
    scene.background = new THREE.Color(p.sky);
    scene.fog = new THREE.Fog(p.sky, p.fogNear, p.fogFar);
    if (hemi.current) { hemi.current.color.set(p.hemiSky); hemi.current.groundColor.set(p.hemiGround); hemi.current.intensity = p.hemiI; }
    if (dir.current) { dir.current.color.set(p.sun); dir.current.intensity = p.sunI; dir.current.position.set(...p.sunDir).multiplyScalar(100); }
    sun.visible = !!p.disc;
    if (p.disc) mats.sun.color.set(p.disc);
  }, [tod, scene, sun, mats]);
  useEffect(() => {
    leaves.visible = cond === "leaves";
    esr.visible = cond === "hot";
  }, [cond, leaves, esr]);

  useEffect(() => () => {
    // free GPU memory when leaving the screen
    statics.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && m.geometry !== PRIM.box) m.geometry.dispose(); });
    Object.values(mats).flat().forEach((m) => (m as THREE.Material).dispose());
  }, [statics, mats]);

  // ---- per frame ----
  const acc = useRef(0);
  const lastAspects = useRef<number[]>([]);
  const fr = useMemo(newFrame, []);
  const fr2 = useMemo(newFrame, []);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), r: new THREE.Vector3(), m: new THREE.Matrix4(), look: new THREE.Vector3(), want: new THREE.Vector3(), lookWant: new THREE.Vector3(), init: false }), []);

  const railPoint = (s: number, out: THREE.Vector3) => {
    frame(world, s, fr, false);
    return out.set(fr.px + fr.ux * RAIL_TOP, fr.py + fr.uy * RAIL_TOP, fr.pz + fr.uz * RAIL_TOP);
  };
  const placeCar = (o: THREE.Object3D, sc: number, reversed: boolean) => {
    railPoint(sc + 7, tmp.a);
    railPoint(sc - 7, tmp.b);
    frame(world, sc, fr2, false);
    tmp.f.subVectors(tmp.a, tmp.b).normalize();
    tmp.u.set(fr2.ux, fr2.uy, fr2.uz);
    tmp.r.crossVectors(tmp.f, tmp.u).normalize();
    tmp.u.crossVectors(tmp.r, tmp.f).normalize();
    if (reversed) { tmp.f.negate(); tmp.r.negate(); }
    o.matrix.makeBasis(tmp.f, tmp.u, tmp.r).setPosition(tmp.a.add(tmp.b).multiplyScalar(0.5));
    o.matrixWorldNeedsUpdate = true;
  };
  const placeTrain = (t: typeof trains.player, head: number) => {
    t.cars.forEach((c, i) => placeCar(c, head - CAR_LEN / 2 - i * (CAR_LEN + CAR_GAP), i === 2));
  };

  useFrame((state, dtRaw) => {
    const sim = simRef.current;
    if (!sim) return;
    const dt = Math.min(0.1, dtRaw);
    if (running) {
      acc.current += dt;
      let n = 0;
      while (acc.current >= 1 / 60 && n < 8) { step(sim, 1 / 60); acc.current -= 1 / 60; n++; }
    }
    placeTrain(trains.player, sim.player.s);
    placeTrain(trains.ai, sim.ai.s);
    trains.player.cars[0].visible = cam.current.mode !== "cab";

    // signal lamps
    const la = lastAspects.current;
    let changed = false;
    sim.aspects.forEach((a, i) => {
      if (la[i] === a) return;
      la[i] = a;
      changed = true;
      ASPECT_LAMPS[a].forEach((c, k) => lamps.setColorAt(i * 4 + k, c));
    });
    if (changed && lamps.instanceColor) lamps.instanceColor.needsUpdate = true;

    // level crossing
    const target = sim.crossingDown ? 0 : 1;
    crossing.booms.forEach((bm) => {
      const want = target * bm.p.dir * (Math.PI / 2);
      const d = want - bm.angle;
      bm.angle += Math.sign(d) * Math.min(Math.abs(d), dt * 0.35);
      bm.o.matrix.copy(bm.p.m).multiply(tmp.m.makeRotationZ(bm.angle));
      bm.o.matrixWorldNeedsUpdate = true;
    });
    const moving = sim.crossingDown || crossing.booms.some((bm) => Math.abs(bm.angle) < Math.PI / 2 - 0.01);
    const ph = Math.floor(state.clock.elapsedTime * 1.6) % 2;
    mats.xl[0].color.copy(moving && ph === 0 ? LIT.r : LIT.off);
    mats.xl[1].color.copy(moving && ph === 1 ? LIT.r : LIT.off);

    // braking marker: where the train would stop with a full service brake
    const bd = brakingDistance(sim);
    marker.visible = sim.player.v > 0.4 && cam.current.mode !== "drone";
    if (marker.visible) {
      const s = sim.player.s + bd;
      frame(world, s, fr, false);
      marker.matrix.makeBasis(tmp.f.set(fr.fx, fr.fy, fr.fz), tmp.u.set(fr.ux, fr.uy, fr.uz), tmp.r.set(fr.rx, fr.ry, fr.rz)).setPosition(fr.px, fr.py, fr.pz);
      marker.matrixWorldNeedsUpdate = true;
    }

    // ---- camera ----
    const c = cam.current;
    const head = sim.player.s;
    const k = 1 - Math.exp(-dt * (c.mode === "cab" ? 12 : 3.2));
    if (c.mode === "cab") {
      frame(world, head - 1.8, fr, false);
      const bob = reduceMotion ? 0 : Math.sin(state.clock.elapsedTime * 8.5) * 0.018 * Math.min(1, sim.player.v / 12);
      const ey = RAIL_TOP + 2.45 + bob;
      tmp.want.set(fr.px + fr.ux * ey - fr.rx * 0.5, fr.py + fr.uy * ey - fr.ry * 0.5, fr.pz + fr.uz * ey - fr.rz * 0.5);
      frame(world, head + 70, fr2, false);
      tmp.lookWant.set(fr2.px + fr2.ux * 2.2, fr2.py + fr2.uy * 2.2, fr2.pz + fr2.uz * 2.2);
      camera.position.copy(tmp.want);
      if (!tmp.init) tmp.look.copy(tmp.lookWant);
      tmp.look.lerp(tmp.lookWant, k);
      camera.up.set(fr.ux, fr.uy, fr.uz);
    } else if (c.mode === "chase") {
      frame(world, head - TRAIN_LEN - 22, fr, true);
      tmp.want.set(fr.px - fr.rx * 4, fr.py + 9, fr.pz - fr.rz * 4);
      frame(world, head + 30, fr2, true);
      tmp.lookWant.set(fr2.px, fr2.py + 1.5, fr2.pz);
      if (!tmp.init) { camera.position.copy(tmp.want); tmp.look.copy(tmp.lookWant); }
      camera.position.lerp(tmp.want, k);
      tmp.look.lerp(tmp.lookWant, k);
      camera.up.set(0, 1, 0);
    } else {
      if (orbit && !reduceMotion) c.yaw += dt * 0.06;
      frame(world, head - TRAIN_LEN / 2, fr, true);
      const cp = Math.cos(c.pitch);
      tmp.lookWant.set(fr.px, fr.py + 2, fr.pz);
      tmp.want.set(fr.px + Math.sin(c.yaw) * cp * c.dist, fr.py + 2 + Math.sin(c.pitch) * c.dist, fr.pz + Math.cos(c.yaw) * cp * c.dist);
      camera.position.copy(tmp.want);
      tmp.look.copy(tmp.lookWant);
      camera.up.set(0, 1, 0);
    }
    tmp.init = true;
    camera.lookAt(tmp.look);
    const fov = c.mode === "cab" ? 58 : 50;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (sun.visible) {
      const p = TOD[tod].sunDir;
      sun.position.set(camera.position.x + p[0] * 1500, camera.position.y + Math.max(40, p[1] * 1500) * 0.35 + 30, camera.position.z + p[2] * 1500);
      sun.lookAt(camera.position);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={[TOD.day.hemiSky, TOD.day.hemiGround, TOD.day.hemiI]} />
      <directionalLight ref={dir} position={[40, 85, 30]} intensity={TOD.day.sunI} />
      <primitive object={statics} />
      <primitive object={lamps} />
      <primitive object={leaves} />
      <primitive object={esr} />
      <primitive object={crossing.g} />
      <primitive object={trains.player.g} />
      <primitive object={trains.ai.g} />
      <primitive object={marker} />
      <primitive object={sun} />
    </>
  );
}
