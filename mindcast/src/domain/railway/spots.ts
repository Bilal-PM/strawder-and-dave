import type { Source, SpotItem, SpotPack, SpotSet } from "../types";
import { glossary } from "./glossary";
import { lessons } from "./lessons";

/**
 * The Field Book: real railway things to spot safely from public places.
 *
 * Rules for this file:
 * - `look` describes what you can see from a platform, a footbridge or a train window. Appearance only, no numbers.
 * - `why` is copied word for word from the pack's glossary, a lesson, or the Open Line's landmark text
 *   (src/features/world/moments.ts). A test checks that every `why` appears in that content, so nothing new is claimed.
 * - Every set shows the fence rule. Nothing here gives a location: no map pins on railway land.
 */

const term = (t: string): Source[] => glossary.find((g) => g.term === t)?.sources ?? [];
const lesson = (id: string): Source[] => {
  const l = lessons.find((x) => x.id === id);
  const seen = new Set<string>();
  return (l?.keyFacts ?? []).flatMap((f) => f.sources).filter((s) => (seen.has(s.label + (s.where ?? "")) ? false : (seen.add(s.label + (s.where ?? "")), true))).slice(0, 2);
};

export const spotSets: SpotSet[] = [
  { id: "track", title: "Track parts", blurb: "The pieces of the permanent way, from a platform end.", from: "items", grades: 3 },
  { id: "signals", title: "Signals and signs", blurb: "What the railway tells drivers, and how it makes sure they listen.", from: "items", grades: 3 },
  { id: "structures", title: "Structures", blurb: "Bridges, tunnels and the buildings that keep the line running.", from: "items", grades: 3 },
  { id: "trains", title: "Trains", blurb: "Underline each class as you spot it, like an ABC book.", from: "trains", grades: 1 },
  { id: "places", title: "Places", blurb: "Great places to reach by train. Stamp each one when you visit.", from: "places", grades: 1 },
];

export const spotItems: SpotItem[] = [
  // ---------- Track parts ----------
  {
    id: "fishplate", set: "track", name: "Rail joint", rarity: "uncommon",
    look: "Two rail ends meeting, with a bolted steel bar on each side. Listen for the clickety-clack.",
    why: "A steel bar bolted across the joint between two rails, one on each side, to hold the ends in line.",
    lesson: "s1-01", art: "fishplate", plate: "joint", tags: ["heat"], sources: term("Fishplate"),
  },
  {
    id: "sleeper", set: "track", name: "Sleeper", rarity: "common",
    look: "The beams lying across the track under both rails, evenly spaced in the stones.",
    why: "It spreads each wheel load into the ballast, holds the rails the right distance apart and at the right tilt, and keeps them electrically insulated from each other.",
    lesson: "s1-03", art: "sleeper", plate: "plan", sources: term("Sleeper"),
  },
  {
    id: "ballast", set: "track", name: "Ballast", rarity: "common",
    look: "The bed of sharp, grey stones the sleepers sit in, heaped up at the ends.",
    why: "It spreads the load, holds the sleepers in place and lets water drain away.",
    lesson: "s1-04", art: "ballast", plate: "side", tags: ["wet"], sources: term("Ballast"),
  },
  {
    id: "clip", set: "track", name: "Rail clip", rarity: "common",
    look: "A curled steel clip pressing down on the foot of the rail, one each side, at every sleeper.",
    why: "A spring steel clip that presses down on the foot of a flat-bottom rail, holding it firmly to the sleeper or baseplate while still allowing a tiny amount of give.",
    lesson: "s1-05", art: "clip", plate: "fastening", sources: term("Rail clip"),
  },
  {
    id: "railhead", set: "track", name: "Railhead", rarity: "common",
    look: "The bright strip along the top of each rail, where the wheels run.",
    why: "The grip between steel wheel and steel rail. It is low compared with a tyre on a road, and leaves, rain or frost on the rail can reduce it further, making braking and starting harder.",
    season: 2, art: "railhead", plate: "rail", tags: ["leaf"], sources: term("Adhesion"),
  },
  {
    id: "points", set: "track", name: "Points", rarity: "common",
    look: "Two tapered rails that can slide sideways where one track splits into two.",
    why: "The tapered rail in a set of points that moves sideways to send a train one way or the other.",
    lesson: "s1-14", art: "points", plate: "points", tags: ["cold"], sources: term("Switch rail"),
  },
  {
    id: "crossing-nose", set: "track", name: "Crossing nose", rarity: "common",
    look: "A V-shaped point of rail further along from the points, with a gap each side for the wheels.",
    why: "The V-shaped part of a turnout where one rail crosses another, so wheels can pass through.",
    lesson: "s1-14", art: "crossing", plate: "points", sources: term("Crossing"),
  },
  {
    id: "check-rail", set: "track", name: "Check rail", rarity: "uncommon",
    look: "An extra rail running just inside a normal one, opposite the crossing nose or on a sharp curve.",
    why: "It guides the wheelset so the other wheel cannot strike the crossing nose or take the wrong path.",
    lesson: "s1-14", art: "check", plate: "points", sources: term("Check rail"),
  },
  {
    id: "adjustment-switch", set: "track", name: "Adjustment switch", rarity: "rare",
    look: "Two rail ends overlapping at a long, shallow angle, where welded rail meets points or older track.",
    why: "It lets the last stretch of welded rail expand and contract without pushing on what is next to it.",
    lesson: "s1-02", art: "adjustment", tags: ["heat"], sources: term("Adjustment switch"),
  },

  // ---------- Signals and signs ----------
  {
    id: "colour-light", set: "signals", name: "Colour-light signal", rarity: "common",
    look: "A black head on a post with two to four lamps, red always lowest. Only one shows at a time.",
    why: "A lineside indication that tells the driver whether it is safe to go on, when to slow down and when to stop.",
    season: 2, art: "colour-light", plate: "signals", world: "signal", sources: term("Signal"),
  },
  {
    id: "semaphore", set: "signals", name: "Semaphore signal", rarity: "rare",
    look: "A post with a moving arm. A red arm with a white stripe is a stop signal; a yellow one with a black chevron is a distant.",
    why: "On a stop signal, a horizontal arm means stop.",
    season: 2, art: "semaphore", sources: term("Semaphore signal"),
  },
  {
    id: "route-indicator", set: "signals", name: "Route indicator", rarity: "uncommon",
    look: "A slanting row of white lights above a signal, lit only when the train is turning off.",
    why: "A row of white lights above a signal, angled to show which way the train will go at a junction.",
    season: 2, art: "feather", sources: term("Route indicator"),
  },
  {
    id: "aws", set: "signals", name: "AWS magnet", rarity: "common",
    look: "A low black hump in the middle of the track, a short way before a signal.",
    why: "A magnet between the rails before a signal sounds a bell in the cab if the signal is clear, or a horn if it is not.",
    season: 2, art: "aws", world: "aws", sources: term("AWS"),
  },
  {
    id: "tpws", set: "signals", name: "TPWS loops", rarity: "uncommon",
    look: "Flat strips lying between the rails, in pairs, near a signal or before a speed limit.",
    why: "Loops on the track apply the train's brakes if it passes a red signal, or approaches one or a speed limit too fast.",
    season: 2, art: "tpws", sources: term("TPWS"),
  },
  {
    id: "speed-board", set: "signals", name: "Speed limit sign", rarity: "common",
    look: "A small sign by the track with a number on it, often near curves and junctions.",
    why: "The normal speed limit for a stretch of line, set by curves, junctions and other fixed features.",
    lesson: "s1-13", art: "speed", sources: term("PSR"),
  },
  {
    id: "clearance-board", set: "signals", name: "Limited clearance board", rarity: "uncommon",
    look: "A red and white chequered board, often at the mouth of a tunnel or the end of a narrow bridge.",
    why: "A stretch where there is no safe space to stand clear of passing trains, such as some bridges and tunnels.",
    lesson: "s1-19", art: "chequer", sources: term("Limited clearance"),
  },

  // ---------- Structures ----------
  {
    id: "viaduct", set: "structures", name: "Viaduct", rarity: "uncommon",
    look: "A long row of arches carrying the railway high across a valley or a town.",
    why: "A viaduct carries the line across a valley on a row of arches, so the track stays level instead of dropping down and climbing out.",
    season: 4, art: "viaduct", world: "viaduct", sources: [],
  },
  {
    id: "tunnel", set: "structures", name: "Tunnel portal", rarity: "uncommon",
    look: "The stone or brick face around the mouth of a tunnel, often with a date or a name on it.",
    why: "Where a hill is too high to cut through, the line goes through it in a tunnel.",
    season: 4, art: "tunnel", world: "tunnel", sources: [],
  },
  {
    id: "footbridge", set: "structures", name: "Footbridge", rarity: "common",
    look: "A bridge for people with stairs at each end, joining platforms or two sides of the line.",
    why: "Trains are heavy and fast, can be surprisingly quiet as they approach, and cannot stop quickly or swerve.",
    lesson: "s1-19", art: "footbridge", sources: lesson("s1-19"),
  },
  {
    id: "level-crossing", set: "structures", name: "Level crossing", rarity: "uncommon",
    look: "A road crossing the railway on the flat, with barriers and flashing red lights.",
    why: "The barriers come down before a train arrives and stay down until it has passed, so road users wait clear of the line.",
    season: 5, art: "level-crossing", world: "crossing", sources: [],
  },
  {
    id: "ole-mast", set: "structures", name: "Overhead line mast", rarity: "common",
    look: "A steel post beside the track with an arm reaching out to hold the wires above the trains.",
    why: "Overhead line equipment: the wires, masts and fittings that carry power above the track.",
    lesson: "s1-19", art: "mast", sources: term("OLE"),
  },
  {
    id: "signal-box", set: "structures", name: "Signal box", rarity: "rare",
    look: "A small building beside the line with a row of big windows upstairs, looking out over the track.",
    why: "Signallers set the routes and clear the signals from here, so only one train is ever given each section of line.",
    season: 2, art: "signal-box", world: "signalbox", sources: term("Block section"),
  },
];

/** Shown on every set and every item. */
export const FENCE_RULE = "Only spot from public places: platforms behind the yellow line, footbridges, or from the train. Never on or near the track.";

export const spotSafety = [
  "No flash photos at stations. A flash can dazzle a driver.",
  "Follow what station staff ask, and leave anywhere they ask you to.",
];

/**
 * "Use it" prompts for Explorers: the lesson's principle at home or school. Practitioners see the lesson's own
 * `lens.principle` and `action` instead.
 */
export const practicePrompts: Record<string, { explorer: string }> = {
  "s1-01": { explorer: "Spot a gap left on purpose, like the space between paving slabs or round a door. What is the gap for?" },
  "s1-02": { explorer: "Find a joint that lets something move, like a door hinge or a zip. What would happen without it?" },
  "s1-03": { explorer: "Notice someone quietly helping to carry a load today, at home or at school. Who was it?" },
  "s1-04": { explorer: "Split one big job into small pieces, like tidying one shelf at a time. Which piece did you finish?" },
  "s1-05": { explorer: "Find something that holds on by being a bit springy, like a hair clip or a peg. Why does the spring help?" },
  "s1-06": { explorer: "Practise something tricky somewhere calm before you do it for real. What did you practise?" },
  "s1-07": { explorer: "Get ready for a busy day before it comes, like packing your bag the night before. What did you get ready?" },
  "s1-08": { explorer: "Look for a weak spot before it causes trouble, like a wobbly chair or a loose shoelace. What did you find?" },
  "s1-09": { explorer: "Watch where rainwater goes on a path, a roof or a playground. Where does it drain away?" },
  "s1-10": { explorer: "Find something everything else rests on, like a table's legs or the bottom shelf. Is it strong enough?" },
  "s1-11": { explorer: "Notice something that changed a lot from yesterday to today. What changed?" },
  "s1-12": { explorer: "Find a rule everyone shares, like how you line up. Ask someone why it is there." },
  "s1-13": { explorer: "Find something set the same for everyone that suits some people more than others, like a desk height. Who does it suit least?" },
  "s1-14": { explorer: "Help someone who is new or stuck today, the way a check rail guides a wheel. Who did you help?" },
  "s1-15": { explorer: "Check something quickly every day and properly once a week, like your bike tyres or your school bag. What did you check?" },
  "s1-16": { explorer: "After you mend something, go easy on it while it settles, like glue drying. What did you leave to settle?" },
  "s1-17": { explorer: "Share a busy space fairly, like the bathroom in the morning. How did everyone fit in?" },
  "s1-18": { explorer: "Find something mended so many times it needs replacing, like a sock with holes. What is it?" },
  "s1-19": { explorer: "Before you cross a road, decide where you will stand to be safe. Where was your safe spot?" },
  "s1-20": { explorer: "When something goes wrong, look for every reason it happened, not just the first one. What did you find?" },
};

export const spots: SpotPack = {
  sets: spotSets,
  items: spotItems,
  fenceRule: FENCE_RULE,
  safety: spotSafety,
  rarity: { trains: { loco: "uncommon", steam: "rare", pass: "common", metro: "common", freight: "common", eng: "rare" }, places: "rare" },
  practice: practicePrompts,
};
