/**
 * Learn moments: one plain sentence per landmark or event, plus a link to the lesson when the
 * domain pack has one. Where the pack's glossary defines the term, its wording is used, so the
 * pack stays the source of truth. The fallback sentences are deliberately conservative.
 */
import { pack, type DiagramKind } from "@/domain";
import type { MomentKey } from "./sim";

type Def = { title: string; text: string; terms?: string[]; diagrams?: DiagramKind[] };

const DEFS: Record<MomentKey, Def> = {
  track: { title: "Sleepers and ballast", text: "Concrete sleepers hold the two rails 1,435 mm apart, and the stone ballast around them locks the track in place.", diagrams: ["track-layers", "sleeper-spacing", "ballast-lock", "gauge"] },
  signalbox: { title: "Signal box", text: "Signallers set the routes and clear the signals from here, so only one train is ever given each section of line.", diagrams: [] },
  tamper: { title: "Tamper", text: "A tamper lifts the track and packs ballast under each sleeper to put the rails back to the right line and level.", terms: ["Tamping"], diagrams: ["tamping"] },
  cutting: { title: "Cutting and gradient", text: "The line climbs through a cutting. Steel wheels have little grip on steel rails, so railway gradients are kept gentle.", diagrams: ["formation", "drainage"] },
  crossing: { title: "Level crossing", text: "The barriers come down before a train arrives and stay down until it has passed, so road users wait clear of the line.", diagrams: [] },
  cant: { title: "Cant", text: "On this curve the outer rail is raised. This tilt, called cant, helps the train round the bend and keeps passengers comfortable.", terms: ["Cant"], diagrams: ["cant", "geometry"] },
  leaves: { title: "Leaves on the line", text: "Wet leaves are crushed into a slippery layer on the rail head. Grip drops, so you need far more distance to stop.", terms: ["Adhesion"], diagrams: [] },
  viaduct: { title: "Viaduct", text: "A viaduct carries the line across a valley on a row of arches, so the track stays level instead of dropping down and climbing out.", diagrams: [] },
  tunnel: { title: "Tunnel", text: "Where a hill is too high to cut through, the line goes through it in a tunnel.", diagrams: [] },
  hot: { title: "Hot weather", text: "Steel rails expand in the heat. At sites watched for buckling, a temporary speed limit reduces the forces on the track.", diagrams: ["buckle", "rail-expansion", "stressing"] },
  platform: { title: "Stop marker", text: "The stop marker shows where the front of the train should stop, so every door lines up with the platform.", diagrams: [] },
  doubleYellow: { title: "Double yellow", text: "Two yellow lights mean the next signal is showing one yellow. Be ready to slow down.", terms: ["Four-aspect signalling"], diagrams: [] },
  yellow: { title: "Single yellow", text: "One yellow light means the next signal is at red. Brake now so you can stop before it.", diagrams: [] },
  red: { title: "Red signal", text: "Red means stop. The section beyond it has a train in it, so wait until the signal clears.", terms: ["Block section"], diagrams: [] },
  aws: { title: "Warning horn", text: "A caution signal sounds a horn in the cab. The driver must acknowledge it within seconds, or the brakes apply.", terms: ["AWS"], diagrams: [] },
  wheelslip: { title: "Wheelslip", text: "The wheels spun because there was not enough grip. Use less power and the train will pull away.", diagrams: [] },
  braking: { title: "Braking distance", text: "Stopping distance grows with the square of speed: twice as fast needs about four times as far. Watch the yellow marker.", diagrams: [] },
  spad: { title: "Signal passed at danger", text: "Passing a red signal is called a SPAD. Train protection would stop the train and the driver would speak to the signaller.", terms: ["SPAD"], diagrams: [] },
  esr: { title: "Speed restriction", text: "A temporary speed limit protects track that needs care. It applies until the whole train has passed the end board.", terms: ["ESR"], diagrams: [] },
};

export type Moment = { key: MomentKey; title: string; text: string; lessonId?: string };

export function momentFor(key: MomentKey): Moment {
  const d = DEFS[key];
  const terms = (d.terms ?? []).map((t) => t.toLowerCase());
  const g = pack.glossary.find((x) => terms.includes(x.term.toLowerCase()));
  const lesson = d.diagrams?.length ? pack.lessons.find((l) => d.diagrams!.includes(l.diagram)) : undefined;
  return { key, title: d.title, text: g?.plain ?? d.text, lessonId: lesson?.id };
}

/** A glossary definition from the pack, if it has one. */
export const glossaryText = (term: string) => pack.glossary.find((g) => g.term.toLowerCase() === term.toLowerCase())?.plain;

/** Station names: lesson titles where the pack has them, in order. */
export function stationNames(count: number) {
  const fallback = ["Ashcombe", "Millbrook", "Hartwell", "Long Lane", "Fernside", "Kingsmead"];
  const ls = [...pack.lessons].sort((a, b) => a.season - b.season || a.stop - b.stop);
  return Array.from({ length: count }, (_, i) => ls[i]?.title ?? fallback[i]);
}
