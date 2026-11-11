/**
 * Domain pack contract.
 *
 * Everything that is specific to "the railway" lives in a DomainPack. The app shell
 * (screens, drawing, 3D, the Mindcast method) only reads from this contract, so a new
 * domain (aviation, construction, healthcare, a single company) is a new pack, not a new app.
 */

/** A citation for a checked fact. Every published fact should carry at least one. */
export type Source = {
  /** Short human label, e.g. "Practical Railway Engineering (2nd ed.), ch. 3" or "Wikipedia: British Rail Class 66". */
  label: string;
  /** Optional link (web sources). Books have no url. */
  url?: string;
  /** Page or section where useful. */
  where?: string;
};

/** How sure we are about a fact. Only "checked" facts are shown without a caveat. */
export type Confidence = "checked" | "approx" | "unverified";

export type Audience = "explorer" | "starter" | "leader";

export type TrainGroup = "loco" | "steam" | "pass" | "metro" | "freight" | "eng";

/** A rolling stock class, drawn to scale from these numbers. */
export type TrainClass = {
  id: string; // stable id, e.g. "c66"
  name: string; // "Class 66"
  type: string; // "Diesel locomotive"
  group: TrainGroup;
  intro: number; // year introduced
  speed: string; // "75 mph"
  power: string; // "Diesel-electric"
  arrangement: string; // "Co-Co" or "9 cars"
  lengthM: number; // per vehicle / per car
  heightM: number;
  cars?: number; // number of cars in a typical formation (units)
  built?: number; // number built, only if checked
  body: string; // default livery colour (unbranded)
  stripe: string;
  fact: string; // one plain-English fact, max ~140 chars
  spotting: string; // "How to recognise it" tip, plain English
  confidence: Confidence;
  sources: Source[];
  /** Drawing model parameters (shell-specific; see features/trains/draw). */
  model: Record<string, unknown>;
};

export type HistoryEvent = {
  id: string;
  month: number; // 1-12
  day: number;
  year: number;
  title: string;
  text: string; // two plain sentences
  art: "loco" | "viaduct" | "tunnel" | "bridge" | "streamline" | "paper" | "station" | "signal";
  link: string; // lesson id or season name
  sources: Source[];
  /** Omitted means checked against the cited source. */
  confidence?: Confidence;
};

export type Place = {
  id: string;
  name: string;
  station: string; // where to get off
  lat: number;
  lon: number;
  category: "bridges" | "coast" | "scenic" | "museums";
  fact: string;
  sources: Source[];
  /** Omitted means checked against the cited source. */
  confidence?: Confidence;
};

export type GlossaryTerm = { term: string; plain: string; sources?: Source[] };

/** A quiz question. Exactly one correct option. */
export type Quiz = { q: string; options: string[]; answer: number; why: string };

/**
 * A lesson ("stop" on a season line), taught at three depths.
 * The `lens` is a Mindcast: the railway principle carried across to leadership by structure, not slogan.
 */
export type Lesson = {
  id: string; // "s1-01"
  season: number;
  stop: number; // 1-based
  title: string;
  hook: string; // one-line question that opens the lesson
  explorer: string; // for children: 2-4 short sentences
  starter: string[]; // 3-5 short paragraphs, plain English, technically correct
  leader: string; // what it means for delivering at scale (2-4 sentences)
  keyFacts: { text: string; sources: Source[] }[];
  diagram: DiagramKind; // which interactive illustration to show
  quiz: Quiz[]; // 3 questions
  lens: Mindcast; // the railway-to-leadership analogy, built with the method
  action: string; // one small thing to try this week
  terms: string[]; // glossary terms used
};

export type DiagramKind =
  | "rail-expansion"
  | "track-layers"
  | "sleeper-spacing"
  | "ballast-lock"
  | "fastening"
  | "thermite-weld"
  | "stressing"
  | "buckle"
  | "drainage"
  | "formation"
  | "geometry"
  | "gauge"
  | "cant"
  | "switch"
  | "inspection"
  | "tamping"
  | "possession"
  | "renewal"
  | "safety"
  | "case";

/**
 * A Mindcast: one piece of experience, carried from a real railway mechanism to a
 * leadership situation through shared causal structure (not shared words).
 */
export type Mindcast = {
  id: string;
  title: string;
  author: string; // "Groundwork editorial" for seed content. Never a made-up person.
  audience: Audience[];
  /** 1. The railway observation: something real, specific, checkable. */
  observe: string;
  /** 2. The mechanism: why it happens, in engineering terms (cause, constraint, effect). */
  mechanism: string;
  /** 3. The relations that carry over. Each pairs a railway relation with its target-side match. */
  mapping: { railway: string; target: string }[];
  /** 4. Where the analogy breaks. Every honest analogy has limits. */
  limits: string;
  /** 5. The principle in one plain sentence. */
  principle: string;
  /** 6. One action someone can take this week. */
  action: string;
  railwayTopic: string; // lesson id or topic
  sources: Source[];
};

export type Companion = {
  id: string;
  name: string;
  kind: string;
  bio: string;
  tag: string; // spoken prefix, e.g. "Quick one: "
  anim: "hop" | "stretch" | "shake";
  hello: string;
  lines: string[];
  unlock: { type: "start" } | { type: "streak"; days: number } | { type: "stop"; season: number; stop: number } | { type: "pass"; stop: number } | { type: "event"; season: number };
};

export type Season = { n: number; title: string; time: string; event: string; colour: string };

export type DomainPack = {
  id: string; // "railway"
  brand: { name: string; tagline: string; mission: string };
  seasons: Season[];
  lessons: Lesson[];
  trains: TrainClass[];
  history: HistoryEvent[];
  places: Place[];
  glossary: GlossaryTerm[];
  casts: Mindcast[];
  companions: Companion[];
  /** Phrases that make an analogy feel cheesy in this domain. Used by the cliché check. */
  cliches: string[];
  /** Word lists for the Mindcast integrity check (docs/MINDCAST_METHOD.md 3.1). */
  lexicon: { strong: string[]; weak: string[]; idioms: string[]; slop: string[] };
};
