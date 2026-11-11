/**
 * The Open Line: simulation. Pure TypeScript, no rendering.
 *
 * Physics is simple but honest:
 *  - tractive effort is limited by engine power (F = P / v) and by adhesion (wheel-rail grip);
 *  - braking builds up over a second, and is limited by adhesion too (wet leaves stretch it);
 *  - stopping distance is v^2 / 2a, so it grows with the square of speed;
 *  - gradients add or remove g x gradient.
 * Signalling is four-aspect block working: a signal is red if the block beyond it is occupied,
 * yellow if the next is red, double yellow if the one after that is red, otherwise green.
 */
import { ahead, inRange, wrap, type LandmarkKey, type World } from "./track";

export const MPH = 0.44704;
export const LINE_SPEED = 50 * MPH;
export const ESR_SPEED = 20 * MPH;
export const AI_MAX = 45 * MPH;
export const TRAIN_LEN = 62;
const G = 9.81;
const MASS = 135000; // kg, three-car diesel unit
const POWER = 950e3; // W at the rail
const F_MAX = 90e3; // N, starting tractive effort
const ADHESIVE = 0.5; // share of weight on powered axles
const BRAKE_STEPS = [0, 0.3, 0.6, 0.9, 1.2]; // m/s^2 demanded; 4 is emergency
const BRAKE_LAG = 0.7; // s, time constant for brake build-up
const AWS_TIME = 2.7; // s to acknowledge
const DWELL = 8; // s doors open
const AI_DWELL = 16;

export type Cond = "dry" | "leaves" | "hot";
export type Tod = "morning" | "day" | "dusk";
/** 0 red, 1 single yellow, 2 double yellow, 3 green */
export type Aspect = 0 | 1 | 2 | 3;
export type MomentKey = LandmarkKey | "doubleYellow" | "yellow" | "red" | "aws" | "wheelslip" | "braking" | "spad" | "esr";
export type Tone = "good" | "warn" | "info";
export type SimEvent =
  | { kind: "toast"; text: string; tone: Tone; points?: number }
  | { kind: "moment"; key: MomentKey }
  | { kind: "haptic"; type: "light" | "medium" | "success" | "warn" };

type Train = { s: number; v: number; ab: number };

export type Sim = {
  w: World;
  cond: Cond;
  t: number;
  player: Train & { power: number; brake: number; slip: boolean; slide: boolean; odo: number; awsBrake: boolean };
  ai: Train & { dwell: number; next: number };
  aspects: Aspect[];
  crossingDown: boolean;
  score: number;
  next: number; // index of the next station to call at
  dwell: number; // seconds of door time left, or 0
  laps: number;
  aws: { active: boolean; left: number; sig: number };
  redAward: number; // signal index already scored for stopping at red
  overspeedCool: number;
  shown: Set<string>;
  events: SimEvent[];
  status: "running" | "spad";
  spad: { label: string; speedMph: number } | null;
  stats: { stops: number; perfect: number; reds: number; missed: number; overspeed: number; awsMissed: number; best: number | null };
};

export function createSim(w: World, cond: Cond): Sim {
  const st0 = w.stations[0];
  const sim: Sim = {
    w,
    cond,
    t: 0,
    player: { s: st0.stopS, v: 0, ab: 0, power: 0, brake: 2, slip: false, slide: false, odo: 0, awsBrake: false },
    ai: { s: wrap(w, st0.stopS + 540), v: 13, ab: 0, dwell: 0, next: 1 },
    aspects: w.signals.map(() => 3 as Aspect),
    crossingDown: false,
    score: 0,
    next: 1,
    dwell: 0,
    laps: 0,
    aws: { active: false, left: 0, sig: -1 },
    redAward: -1,
    overspeedCool: 0,
    shown: new Set(),
    events: [],
    status: "running",
    spad: null,
    stats: { stops: 0, perfect: 0, reds: 0, missed: 0, overspeed: 0, awsMissed: 0, best: null },
  };
  computeAspects(sim);
  return sim;
}

/** Rail adhesion (coefficient of friction) at s. */
export function adhesion(sim: Sim, s: number) {
  if (sim.cond !== "leaves") return 0.25;
  for (const z of sim.w.leafZones) if (inRange(sim.w, s, z)) return 0.045;
  return 0.12;
}
export const lowAdhesion = (sim: Sim, s: number) => adhesion(sim, s) < 0.1;

/** Speed limit in force at the train (the restriction applies until the rear has cleared it). */
export function limitAt(sim: Sim, head: number) {
  if (sim.cond === "hot") {
    const r = sim.w.hotSpot;
    const span = ahead(sim.w, r.from, r.to) + TRAIN_LEN;
    if (ahead(sim.w, r.from, head) <= span) return ESR_SPEED;
  }
  return LINE_SPEED;
}

function resistance(v: number) {
  return v <= 0 ? 0 : 0.012 + 0.0004 * v + 0.00008 * v * v;
}

/** Signals ahead of s, nearest first. */
function signalsAhead(sim: Sim, s: number, count: number) {
  const sig = sim.w.signals;
  let best = 0, bd = Infinity;
  for (let i = 0; i < sig.length; i++) { const d = ahead(sim.w, s, sig[i].s); if (d > 0.01 && d < bd) { bd = d; best = i; } }
  const out: { i: number; d: number }[] = [];
  for (let k = 0; k < count; k++) { const i = (best + k) % sig.length; out.push({ i, d: ahead(sim.w, s, sig[i].s) }); }
  return out;
}

function computeAspects(sim: Sim) {
  const { w } = sim, sig = w.signals, n = sig.length;
  const red = new Array<boolean>(n).fill(false);
  for (const tr of [sim.player, sim.ai]) {
    const head = tr.s, rear = wrap(w, tr.s - TRAIN_LEN);
    for (let j = 0; j < n; j++) {
      const len = ahead(w, sig[j].s, sig[(j + 1) % n].s);
      const dh = ahead(w, sig[j].s, head), dr = ahead(w, sig[j].s, rear);
      if ((dh > 0 && dh <= len) || (dr > 0 && dr <= len)) red[j] = true;
    }
  }
  for (let j = 0; j < n; j++) {
    let k = 0;
    while (k < 3 && !red[(j + k) % n]) k++;
    sim.aspects[j] = (k === 0 ? 0 : k === 1 ? 1 : k === 2 ? 2 : 3) as Aspect;
  }
}

const emit = (sim: Sim, e: SimEvent) => sim.events.push(e);
const toast = (sim: Sim, text: string, tone: Tone, points?: number) => {
  if (points) sim.score = Math.max(0, sim.score + points);
  emit(sim, { kind: "toast", text, tone, points });
};
const moment = (sim: Sim, key: MomentKey) => {
  if (sim.shown.has(key)) return;
  sim.shown.add(key);
  emit(sim, { kind: "moment", key });
};

/** Where the train would stop with a full service brake applied now (metres ahead). */
export function brakingDistance(sim: Sim) {
  const p = sim.player;
  const v = p.v;
  if (v < 0.05) return 0;
  const grade = sim.w.grade[Math.floor(wrap(sim.w, p.s - TRAIN_LEN / 2)) % sim.w.n];
  const calc = (mu: number) => {
    const a = Math.max(0.08, Math.min(BRAKE_STEPS[3], mu * G * 0.9) + G * grade);
    return v * BRAKE_LAG + (v * v) / (2 * a);
  };
  let d = calc(adhesion(sim, p.s));
  // if low-adhesion rail lies inside that distance, plan with it
  if (sim.cond === "leaves") {
    for (let x = 0; x < d; x += 20) if (lowAdhesion(sim, p.s + x)) { d = calc(0.045); break; }
  }
  return d;
}

export type Target = { kind: "red" | "platform"; dist: number; label: string } | null;
/** The next place the driver must stop: a red signal or the next platform's stop marker. */
export function nextTarget(sim: Sim): Target {
  const p = sim.player;
  let best: Target = null;
  for (const { i, d } of signalsAhead(sim, p.s, 3)) {
    if (sim.aspects[i] === 0) { best = { kind: "red", dist: d, label: sim.w.signals[i].label }; break; }
  }
  const st = sim.w.stations[sim.next];
  const ds = ahead(sim.w, p.s, st.stopS);
  const dsSigned = ds > sim.w.L - 60 ? ds - sim.w.L : ds; // just past the marker
  if (sim.dwell <= 0 && dsSigned < 1500 && (!best || dsSigned < best.dist)) best = { kind: "platform", dist: dsSigned, label: st.name };
  return best;
}

export function nextSignal(sim: Sim) {
  const [{ i, d }] = signalsAhead(sim, sim.player.s, 1);
  return { i, d, aspect: sim.aspects[i], label: sim.w.signals[i].label };
}

export function ackAws(sim: Sim) {
  if (!sim.aws.active) return;
  sim.aws.active = false;
  sim.score += 10;
  if (!sim.shown.has("ack")) { sim.shown.add("ack"); toast(sim, "Warning acknowledged. Watch the next signal.", "good"); }
}

/** Advance the world by dt seconds. */
export function step(sim: Sim, dt: number) {
  if (sim.status !== "running") return;
  const { w } = sim;
  sim.t += dt;
  computeAspects(sim);

  // ---- player ----
  const p = sim.player;
  const s0 = p.s;
  const mu = adhesion(sim, p.s);
  const mid = Math.floor(wrap(w, p.s - TRAIN_LEN / 2)) % w.n;
  const aGrade = -G * w.grade[mid];
  const doorsOpen = sim.dwell > 0;
  const brakeStep = p.awsBrake ? 4 : p.brake;
  // traction (cut off while braking or with doors open)
  let aT = 0;
  if (p.power > 0 && brakeStep === 0 && !doorsOpen) {
    const frac = p.power / 4;
    const F = frac * Math.min(F_MAX, POWER / Math.max(p.v, 0.5));
    aT = F / MASS;
    const lim = mu * G * ADHESIVE;
    p.slip = aT > lim;
    if (p.slip) { aT = lim * 0.85; moment(sim, "wheelslip"); }
  } else p.slip = false;
  // brakes build up and release over about a second
  const demand = doorsOpen ? Math.max(BRAKE_STEPS[brakeStep], 0.3) : BRAKE_STEPS[brakeStep];
  p.ab += (demand - p.ab) * Math.min(1, dt / BRAKE_LAG);
  const bLim = mu * G * 0.9;
  p.slide = p.ab > bLim + 0.02 && p.v > 0.3;
  const aB = Math.min(p.ab, bLim);
  if (brakeStep > 0 && p.v > 2) moment(sim, "braking");
  let a = aT + aGrade - resistance(p.v);
  if (p.v > 0.01) a -= aB;
  else if (a < 0 || brakeStep > 0) a = Math.max(0, a - aB); // held by the brakes on a stand
  p.v = Math.max(0, p.v + a * dt);
  if (p.v < 0.02 && (brakeStep > 0 || aT === 0)) p.v = 0;
  p.s = wrap(w, p.s + p.v * dt);
  const moved = ahead(w, s0, p.s);
  p.odo += moved;
  if (p.awsBrake && p.v === 0) { p.awsBrake = false; toast(sim, "Brakes released. Remember to acknowledge warnings.", "info"); }

  // SPAD and AWS: did the head cross a signal or an AWS magnet this step?
  w.signals.forEach((sg, i) => {
    const ds = ahead(w, s0, sg.s);
    if (ds > 0 && ds <= moved + 1e-6) {
      if (sim.aspects[i] === 0) {
        sim.status = "spad";
        sim.spad = { label: sg.label, speedMph: Math.round(p.v / MPH) };
        p.v = 0;
        emit(sim, { kind: "haptic", type: "warn" });
        moment(sim, "spad");
      } else if (sim.redAward === i) sim.redAward = -1;
    }
    const da = ahead(w, s0, sg.aws);
    if (da > 0 && da <= moved + 1e-6 && sim.aspects[i] !== 3) {
      sim.aws = { active: true, left: AWS_TIME, sig: i };
      emit(sim, { kind: "haptic", type: "warn" });
      moment(sim, "aws");
    }
  });
  if (sim.status !== "running") return;
  if (sim.aws.active) {
    sim.aws.left -= dt;
    if (sim.aws.left <= 0) {
      sim.aws.active = false;
      p.awsBrake = true;
      sim.stats.awsMissed++;
      toast(sim, "Warning not acknowledged in time, so the brakes applied.", "warn", -30);
    }
  }

  // Aspect learn moments when a signal comes into view
  const ns = nextSignal(sim);
  if (ns.d < 450) {
    if (ns.aspect === 2) moment(sim, "doubleYellow");
    if (ns.aspect === 1) moment(sim, "yellow");
    if (ns.aspect === 0) moment(sim, "red");
  }
  // Stopped at a red
  if (p.v === 0 && ns.aspect === 0 && ns.d < 90 && sim.redAward !== ns.i) {
    sim.redAward = ns.i;
    sim.stats.reds++;
    toast(sim, `Stopped at red signal ${ns.label}. Wait for it to clear.`, "good", 50);
    emit(sim, { kind: "haptic", type: "success" });
  }

  // Stations
  const st = w.stations[sim.next];
  let err = ahead(w, st.stopS, p.s);
  if (err > w.L / 2) err -= w.L; // negative = short of the marker
  if (sim.dwell > 0) {
    sim.dwell -= dt;
    if (sim.dwell <= 0) {
      sim.dwell = 0;
      toast(sim, "Doors closed. Ready to go.", "info");
      advanceStation(sim);
    }
  } else if (p.v === 0 && err > -40 && err <= 40) {
    const rear = p.s - TRAIN_LEN;
    const rearOn = ahead(w, st.platFrom - 3, wrap(w, rear)) < ahead(w, st.platFrom - 3, st.platTo + 50);
    if (err > 15) {
      sim.stats.missed++;
      toast(sim, `You stopped ${Math.round(err)} m past the marker. Some doors would be off the platform.`, "warn");
      advanceStation(sim);
    } else if (!rearOn) {
      if (!sim.shown.has(`short-${sim.next}-${sim.laps}`)) { sim.shown.add(`short-${sim.next}-${sim.laps}`); toast(sim, "The rear of the train is off the platform. Move up to the marker.", "info"); }
    } else {
      const e = Math.abs(err);
      const pts = e <= 2 ? 100 : e <= 6 ? 70 : 40;
      const word = e <= 2 ? "Right on the marker" : e <= 6 ? "Good stop" : "Stopped";
      sim.stats.stops++;
      if (e <= 2) sim.stats.perfect++;
      sim.stats.best = sim.stats.best === null ? e : Math.min(sim.stats.best, e);
      toast(sim, `${word} at ${st.name} (${e < 1 ? "under 1" : Math.round(e)} m).`, "good", pts);
      emit(sim, { kind: "haptic", type: "success" });
      sim.dwell = DWELL;
    }
  } else if (err > 40 && err < 300) {
    sim.stats.missed++;
    toast(sim, `You ran through ${st.name} without stopping.`, "warn");
    advanceStation(sim);
  }
  if (sim.dwell <= 0 && err > -320 && err < 0) moment(sim, "platform");

  // Speed limits
  const lim = limitAt(sim, p.s);
  sim.overspeedCool -= dt;
  if (p.v > lim + 3 * MPH) {
    sim.score = Math.max(0, sim.score - 3 * dt);
    if (sim.overspeedCool <= 0) {
      sim.overspeedCool = 15;
      sim.stats.overspeed++;
      toast(sim, `Over the ${Math.round(lim / MPH)} mph limit. Ease off.`, "warn");
    }
  }

  // Landmarks
  for (const lm of w.landmarks) {
    if (lm.key === "leaves" && sim.cond !== "leaves") continue;
    if (lm.key === "hot" && sim.cond !== "hot") continue;
    const d = ahead(w, p.s, lm.s);
    if (d < 170 || d > w.L - 10) moment(sim, lm.key);
  }

  stepAi(sim, dt);

  // Level crossing: barriers down while a train approaches or is on the crossing
  let down = false;
  for (const tr of [p, sim.ai]) {
    if (ahead(w, tr.s, w.crossing) < 420 || ahead(w, w.crossing, tr.s) < TRAIN_LEN + 12) down = true;
  }
  sim.crossingDown = down;
}

function advanceStation(sim: Sim) {
  sim.next = (sim.next + 1) % sim.w.stations.length;
  if (sim.next === 1) {
    sim.laps++;
    toast(sim, "Lap complete. Well driven.", "good", 100);
  }
}

function stepAi(sim: Sim, dt: number) {
  const { w } = sim, ai = sim.ai;
  if (ai.dwell > 0) {
    ai.dwell -= dt;
    if (ai.dwell <= 0) ai.next = (ai.next + 1) % w.stations.length;
    return;
  }
  const mu = adhesion(sim, ai.s);
  const plan = Math.min(0.55, mu * G * 0.8);
  let target = Math.min(AI_MAX, limitAt(sim, ai.s));
  let stopD = Infinity;
  for (const { i, d } of signalsAhead(sim, ai.s, 3)) if (sim.aspects[i] === 0) { stopD = Math.min(stopD, d - 12); break; }
  const st = w.stations[ai.next];
  const dst = ahead(w, ai.s, st.stopS);
  if (dst < w.L - 50) stopD = Math.min(stopD, dst);
  // look ahead for the restriction too
  if (sim.cond === "hot") {
    const de = ahead(w, ai.s, w.hotSpot.from);
    if (de < 600) target = Math.min(target, Math.sqrt(ESR_SPEED * ESR_SPEED + 2 * plan * de));
  }
  if (stopD < Infinity) target = Math.min(target, Math.sqrt(2 * plan * Math.max(0, stopD)));
  if (ai.v < target) ai.v = Math.min(target, ai.v + Math.min(0.45, (mu * G * ADHESIVE) * 0.85) * dt);
  else ai.v = Math.max(target, ai.v - Math.min(1.0, mu * G * 0.9) * dt);
  let mv = ai.v * dt;
  if (stopD < Infinity) mv = Math.min(mv, Math.max(0, stopD));
  ai.s = wrap(w, ai.s + mv);
  if (ai.v < 0.3 && dst < 1.5 && dst < stopD + 0.01) { ai.v = 0; ai.dwell = AI_DWELL; }
  else if (ai.v < 0.05 && stopD < 1) ai.v = 0;
}

export type Snapshot = {
  mph: number;
  limitMph: number;
  esrAhead: number | null; // metres to the restriction start, when hot
  power: number;
  brake: number;
  slip: boolean;
  slide: boolean;
  lowGrip: boolean;
  sig: { label: string; aspect: Aspect; d: number };
  station: { name: string; d: number };
  brakeDist: number;
  target: Target;
  score: number;
  aws: { active: boolean; left: number };
  awsBrake: boolean;
  dwell: number;
  status: Sim["status"];
  odo: number;
};

export function snapshot(sim: Sim): Snapshot {
  const p = sim.player, w = sim.w;
  const ns = nextSignal(sim);
  const st = w.stations[sim.next];
  let ds = ahead(w, p.s, st.stopS);
  if (ds > w.L - 60) ds -= w.L;
  let esrAhead: number | null = null;
  if (sim.cond === "hot") { const d = ahead(w, p.s, w.hotSpot.from); if (d < 800) esrAhead = d; }
  return {
    mph: p.v / MPH,
    limitMph: Math.round(limitAt(sim, p.s) / MPH),
    esrAhead,
    power: p.power,
    brake: p.brake,
    slip: p.slip,
    slide: p.slide,
    lowGrip: lowAdhesion(sim, p.s),
    sig: { label: ns.label, aspect: ns.aspect, d: ns.d },
    station: { name: st.name, d: ds },
    brakeDist: brakingDistance(sim),
    target: nextTarget(sim),
    score: Math.round(sim.score),
    aws: { active: sim.aws.active, left: sim.aws.left },
    awsBrake: p.awsBrake,
    dwell: sim.dwell,
    status: sim.status,
    odo: p.odo,
  };
}
