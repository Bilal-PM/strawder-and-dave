/**
 * Mindcast integrity check: implements docs/MINDCAST_METHOD.md section 3 exactly.
 *
 * Analogies that last carry relations (causes, constraints, effects) from source to target, not surface
 * features or shared words, and they say where they stop working. This is spellcheck for structure:
 * it cannot tell whether a fact is true or an action is wise. Pure functions, no UI.
 */
import type { Mindcast } from "@/domain/types";

export type Lexicon = { strong: string[]; weak: string[]; idioms: string[]; slop: string[] };
export type CheckId = "specific" | "mapping" | "surface" | "cliche" | "limits" | "action" | "principle";
export type Check = { id: CheckId; label: string; points: number; max: number; pass: boolean; detail: string; hits?: string[] };
export type Verdict = "strong" | "sound" | "needs work";
export type Integrity = { score: number; checks: Check[]; hardFails: string[]; warnings: string[]; verdict: Verdict };
type Cast = Pick<Mindcast, "title" | "observe" | "mechanism" | "mapping" | "limits" | "principle" | "action">;

// 3.1 shared word lists (domain-neutral ones live here; domain lexicons come in via `lex`)
const RELATION_VERBS = "cause lead result prevent stop allow let enable force push pull hold resist restrain absorb spread transfer carry store release build accumulate grow shrink expand contract reduce increase raise lower limit depend trigger protect hide mask remove add replace drain block clog wear weaken strengthen lock free slow speed delay keep lose fail break buckle settle shift move act react compensate balance offset feed starve warn signal detect measure reveal outrun exceed overload recover restore correct match".split(" ");
const CONNECTIVES = ["leads to", "because", "so that", "so", "which means", "until", "unless", "before", "after", "when", "if", "instead of", "rather than", "more", "less", "faster", "slower", "earlier", "later"];
const CONDITIONS = ["when", "if", "unless", "until", "above", "below", "over", "under", "more than", "less than", "at least", "at most", "during", "after", "before", "every", "per", "each", "between", "within", "once"];
const VAGUE = ["reflect on", "think about", "consider", "be more", "be less", "embrace", "strive", "aim to", "try to", "remember to", "keep in mind", "foster", "cultivate", "explore", "focus on being", "commit to being", "lean into"];
const ARTEFACTS = ["list", "note", "notes", "meeting", "stand-up", "standup", "calendar", "diary", "email", "message", "board", "log", "register", "plan", "programme", "review", "chart", "checklist", "question", "conversation", "one-to-one", "1:1", "agenda", "minutes", "walk", "document", "sheet", "spreadsheet", "timer", "slot", "column", "risk", "action", "decision"];
const TIME_WORDS = ["one", "two", "three", "four", "five", "ten", "twenty", "thirty", "today", "tomorrow", "this week", "by friday", "monday", "tuesday", "wednesday", "thursday", "friday", "next meeting", "next stand-up", "each day", "every day", "daily", "per day"];
const HEDGES = ["you", "we", "i", "it", "this", "try", "maybe", "perhaps", "consider"];
const CONTRAST = ["but", "unlike", "whereas", "except", "however", "does not", "doesn't", "cannot", "can't", "no equivalent", "not the same", "differs", "breaks", "fails", "stops working", "only works"];

// 3.0 normalisation and matching
export const norm = (s: string) => (s || "").toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => norm(s).match(/[a-z0-9]+(?:[-'][a-z0-9]+)*/g) ?? [];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const B0 = "(?<![a-z0-9])", B1 = "(?![a-z0-9])";
const isPhrase = (p: string) => /[^a-z]/.test(p);
function inflections(w: string) {
  const f = new Set([w, w + "s", w + "es", w + "d", w + "ed", w + "ing", w + w.slice(-1) + "ed", w + w.slice(-1) + "ing"]);
  if (w.endsWith("e")) { f.add(w.slice(0, -1) + "ing"); f.add(w.slice(0, -1) + "ed"); }
  if (w.endsWith("y")) { f.add(w.slice(0, -1) + "ies"); f.add(w.slice(0, -1) + "ied"); }
  return [...f];
}
const reCache = new Map<string, RegExp>();
function re(entry: string, mode: "phrase" | "inflect" | "prefix") {
  const key = mode + "|" + entry; let r = reCache.get(key);
  if (!r) {
    const body = mode === "phrase" || isPhrase(entry) ? esc(entry) : mode === "prefix" ? esc(entry) + "[a-z]*" : "(?:" + inflections(entry).map(esc).join("|") + ")";
    r = new RegExp(B0 + body + B1, "g"); reCache.set(key, r);
  }
  r.lastIndex = 0; return r;
}
const count = (text: string, entry: string, mode: "phrase" | "inflect" | "prefix") => (text.match(re(entry, mode)) ?? []).length;
const found = (text: string, list: string[], mode: "phrase" | "inflect" | "prefix") => list.filter((e) => count(text, e, mode) > 0);
const cueCount = (s: string) => { const t = norm(s); return RELATION_VERBS.reduce((n, v) => n + count(t, v, "inflect"), 0) + CONNECTIVES.reduce((n, cnn) => n + count(t, cnn, "phrase"), 0); };
const wordCount = (s: string) => tokens(s).length;

export function checkIntegrity(cast: Cast, lex: Lexicon): Integrity {
  const checks: Check[] = []; const hardFails: string[] = []; const warnings: string[] = [];
  const railLex = [...lex.strong, ...lex.weak];
  const pairs = cast.mapping.filter((p) => p.railway.trim() || p.target.trim());

  // (a) Specificity, 20
  const src = norm(`${cast.observe} ${cast.mechanism}`);
  const nums = new Set(tokens(src).filter((t) => /\d/.test(t)));
  const comps = found(src, lex.strong, "inflect").concat(found(src, lex.weak, "phrase"));
  const conds = found(src, CONDITIONS, "phrase");
  const n = Math.min(2, nums.size), cc = Math.min(3, new Set(comps).size), k = Math.min(2, conds.length);
  const aPts = Math.round((20 * (n + cc + k)) / 7), aPass = cc >= 2 && (n >= 1 || k >= 2);
  checks.push({ id: "specific", label: "Specific railway observation", points: aPts, max: 20, pass: aPass, detail: aPass ? `Names ${[...new Set(comps)].slice(0, 3).join(", ")}${n ? " with numbers" : ""}${k ? " and conditions" : ""}.` : "Name the component, add a number or a condition.", hits: [...new Set(comps)] });

  // (b) Relational mapping, 25
  const rel = pairs.filter((p) => wordCount(p.railway) >= 5 && wordCount(p.target) >= 5 && cueCount(p.railway) >= 1 && cueCount(p.target) >= 1);
  const sys = rel.filter((p) => cueCount(p.railway) >= 2 || cueCount(p.target) >= 2);
  let bPts = rel.length >= 3 ? 20 : rel.length === 2 ? 15 : 0; if (bPts && sys.length >= 1) bPts += 5; if (pairs.length > 4) bPts = Math.max(0, bPts - 5);
  if (rel.length < 2) hardFails.push("Fewer than two relationships carried across");
  const heads = new Map<string, string>(); for (const p of pairs) { const h = tokens(p.target).slice(0, 2).join(" "), r0 = tokens(p.railway)[0] ?? ""; if (h && heads.has(h) && heads.get(h) !== r0) warnings.push(`Two relations map onto "${h}". Check they really are the same thing.`); heads.set(h, r0); }
  checks.push({ id: "mapping", label: "Carries relations, not objects", points: bPts, max: 25, pass: rel.length >= 2, detail: rel.length >= 2 ? `${rel.length} relationships carried across${sys.length ? ", with a chain of cause and effect" : ""}.` : "Map at least two relationships (A causes B, C limits D), each side at least five words, not just things (rail = team)." });

  // (c) Surface-only warning, 10
  const tgt = norm([...pairs.map((p) => p.target), cast.principle, cast.action].join(" \n "));
  const strongHits = lex.strong.reduce((s, w) => s + count(tgt, w, "inflect"), 0), weakHits = lex.weak.reduce((s, w) => s + count(tgt, w, "phrase"), 0);
  const borrowed = pairs.filter((p) => cueCount(p.railway) === 0 && found(norm(p.target), railLex, "inflect").length > 0).length;
  const surface = strongHits + Math.floor(weakHits / 2) + borrowed;
  const cPts = surface === 0 ? 10 : surface === 1 ? 5 : 0;
  const surfaceWords = [...found(tgt, lex.strong, "inflect"), ...found(tgt, lex.weak, "phrase")];
  checks.push({ id: "surface", label: "No surface-only borrowing", points: cPts, max: 10, pass: surface === 0, detail: surface === 0 ? "The target side stands on its own." : `Railway words on the target side: ${surfaceWords.slice(0, 4).join(", ")}. Say what happens instead.`, hits: surfaceWords });

  // (d) Clichés, 15
  const targetFields = norm([cast.title, ...pairs.map((p) => p.target), cast.limits, cast.principle, cast.action].join(" \n "));
  const allFields = norm([cast.title, cast.observe, cast.mechanism, ...pairs.flatMap((p) => [p.railway, p.target]), cast.limits, cast.principle, cast.action].join(" \n "));
  const hitList: string[] = []; let h = 0;
  for (const e of lex.idioms) { const m = count(targetFields, e, isPhrase(e) ? "phrase" : "prefix"); if (m) { h += m; hitList.push(e); } }
  for (const e of lex.slop) { const m = count(allFields, e, isPhrase(e) ? "phrase" : "prefix"); if (m) { h += m; hitList.push(e); } }
  const dPts = Math.max(0, 15 - 5 * h); if (h >= 3) hardFails.push("Three or more clichés");
  checks.push({ id: "cliche", label: "No clichés or filler", points: dPts, max: 15, pass: h === 0, detail: h === 0 ? "Clean." : `Replace: ${hitList.slice(0, 5).map((x) => `"${x}"`).join(", ")}.`, hits: hitList });

  // (e) Limits, 15
  const lim = norm(cast.limits), lw = wordCount(lim), marker = found(lim, CONTRAST, "phrase").length > 0;
  const mapWords = new Set(tokens(pairs.map((p) => `${p.railway} ${p.target}`).join(" ")).filter((t) => t.length >= 4));
  const anchor = found(lim, railLex, "inflect").length > 0 || tokens(lim).some((t) => t.length >= 4 && mapWords.has(t));
  const ePts = lw >= 15 && marker ? (anchor ? 15 : 8) : 0; if (ePts === 0) hardFails.push("No limits stated");
  checks.push({ id: "limits", label: "States its limits", points: ePts, max: 15, pass: ePts === 15, detail: ePts === 15 ? "Says where the analogy stops working." : ePts === 8 ? "Tie the limit to this analogy: name what in the mapping stops holding." : "Every analogy breaks somewhere. Say where, with a 'but' or 'unlike', in at least 15 words." });

  // (f) Action, 15
  const act = norm(cast.action), aw = wordCount(act), first = tokens(act)[0] ?? "";
  const conds6 = [aw >= 8 && aw <= 45, !!first && !HEDGES.includes(first), found(act, ARTEFACTS, "phrase").length > 0, /\d/.test(act) || found(act, TIME_WORDS, "phrase").length > 0, found(act, VAGUE, "phrase").length === 0];
  const fPts = conds6.filter(Boolean).length * 3;
  const fixes = ["8 to 45 words", "start with a verb", "name something concrete (a meeting, list, slot, review)", "add a time or size (this week, one, five minutes)", "avoid vague verbs (think about, consider, embrace)"].filter((_, i) => !conds6[i]);
  checks.push({ id: "action", label: "A real action for this week", points: fPts, max: 15, pass: fPts >= 12, detail: fPts >= 12 ? "Concrete and doable." : `To fix: ${fixes.join("; ")}.` });

  // Principle: soft warnings only
  const pr = cast.principle.trim(), endings = (pr.replace(/\d\.\d/g, "").match(/[.!?]/g) ?? []).length;
  const prOk = wordCount(pr) > 0 && wordCount(pr) <= 25 && endings <= 1 && found(norm(pr), lex.strong, "inflect").length === 0;
  if (!prOk && pr) warnings.push("Keep the principle to one sentence of 25 words or fewer, without railway words.");
  checks.push({ id: "principle", label: "One-sentence principle", points: 0, max: 0, pass: prOk, detail: prOk ? "Short, plain and quotable." : "One sentence, 25 words or fewer, in your own world's words." });

  const score = checks.reduce((s, c) => s + c.points, 0);
  const verdict: Verdict = hardFails.length === 0 && score >= 85 ? "strong" : hardFails.length === 0 && score >= 70 ? "sound" : "needs work";
  return { score, checks, hardFails, warnings, verdict };
}
