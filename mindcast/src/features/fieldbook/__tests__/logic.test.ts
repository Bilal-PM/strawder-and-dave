/** Field Book rules: grades, once per day, weeks, noticing strength, tiers, unlocks, questions, recall, migration. */
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import { pack } from "@/domain";
import { isUnlocked } from "@/features/companions/logic";
import { momentFor } from "@/features/world/moments";
import { merge, migrate, useStore } from "@/state/store";
import { hasArt } from "../art";
import {
  addDays, applyStamp, dayKey, dueKeys, earnedKit, emptyFieldBook, entries, entryByKey, fieldBookFromV1, levelFor, meaningLine, noticedThisWeek,
  noticingStrength, placeKey, questionFor, review, sanitiseFieldBook, setProgress, spotOfTheDay, stampsTotal, tierThresholds, trainKey, weekDays, weekStart,
  type SpotRecord,
} from "../logic";

const D = (s: string) => new Date(`${s}T12:00:00`);
const set = (id: string) => pack.spots.sets.find((s) => s.id === id)!;
const spotAll = (setId: string, n?: number) => Object.fromEntries(entries(pack).filter((e) => e.set === setId).slice(0, n).map((e) => [e.key, { grade: 1, days: ["2026-11-10"], first: 1, correct: 1 } as SpotRecord]));

describe("stamping", () => {
  it("bronze, silver, gold on separate days, once per day", () => {
    const a = applyStamp(undefined, "2026-11-09", true, 3);
    expect(a.ok && a.grade).toBe(1);
    expect(a.ok && a.first).toBe(true);
    const again = applyStamp(a.ok ? a.record : undefined, "2026-11-09", true, 3);
    expect(again).toEqual({ ok: false, reason: "today" });
    const b = applyStamp(a.ok ? a.record : undefined, "2026-11-10", true, 3);
    expect(b.ok && b.grade).toBe(2);
    expect(b.ok && b.upgraded).toBe(true);
    const c = applyStamp(b.ok ? b.record : undefined, "2026-11-12", false, 3);
    expect(c.ok && c.grade).toBe(3);
    const d = applyStamp(c.ok ? c.record : undefined, "2026-11-14", true, 3);
    expect(d.ok && d.grade).toBe(3);
    expect(d.ok && d.review).toBe(true);
    expect(d.ok && d.record.days).toHaveLength(4);
    expect(d.ok && d.record.correct).toBe(3);
  });
  it("wrong answers still stamp", () => {
    const a = applyStamp(undefined, "2026-11-09", false, 3);
    expect(a.ok && a.grade).toBe(1);
    expect(a.ok && a.record.correct).toBe(0);
  });
  it("trains and places take a single stamp (an underline)", () => {
    const a = applyStamp(undefined, "2026-11-09", true, 1);
    const b = applyStamp(a.ok ? a.record : undefined, "2026-11-10", true, 1);
    expect(b.ok && b.grade).toBe(1);
    expect(entryByKey(pack, trainKey("c66"))?.maxGrade).toBe(1);
    expect(entryByKey(pack, placeKey("glenfinnan-viaduct"))?.maxGrade).toBe(1);
  });
  it("counts stamps as grades plus practice stamps", () => {
    const fb = { ...emptyFieldBook(), spots: { a: { grade: 3, days: [], first: 0, correct: 0 }, b: { grade: 1, days: [], first: 0, correct: 0 } }, practice: [{ id: "p", lessonId: null, text: "x", day: "2026-11-11", at: 0, from: "use-it" as const }] };
    expect(stampsTotal(fb)).toBe(5);
  });
});

describe("weeks and noticing strength", () => {
  it("weeks start on Monday", () => {
    expect(weekStart(D("2026-11-11"))).toBe("2026-11-09"); // a Wednesday
    expect(weekStart(D("2026-11-15"))).toBe("2026-11-09"); // Sunday belongs to the same week
    expect(weekDays(D("2026-11-11"))).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
  });
  it("counts distinct noticing days this week from spots and practice", () => {
    const fb = { ...emptyFieldBook(), spots: { a: { grade: 2, days: ["2026-11-02", "2026-11-09"], first: 0, correct: 0 }, b: { grade: 1, days: ["2026-11-09"], first: 0, correct: 0 } }, practice: [{ id: "p", lessonId: null, text: "x", day: "2026-11-11", at: 0, from: "week" as const }] };
    expect(noticedThisWeek(fb, D("2026-11-11"))).toBe(2);
  });
  it("is 0 with nothing noticed, rises with noticing, and sits near 100 on target", () => {
    expect(noticingStrength(new Set(), 3, D("2026-11-11"))).toBe(0);
    const days = new Set<string>();
    let k = "2026-08-03";
    for (let w = 0; w < 14; w++) { days.add(k); days.add(addDays(k, 2)); days.add(addDays(k, 4)); k = addDays(k, 7); }
    const s = noticingStrength(days, 3, D("2026-11-08"));
    expect(s).toBeGreaterThan(80);
    expect(s).toBeLessThanOrEqual(100);
    expect(noticingStrength(new Set(["2026-11-11"]), 3, D("2026-11-11"))).toBeGreaterThan(10);
  });
  it("dents gently on a missed day and never resets to zero", () => {
    const days = new Set(["2026-11-01", "2026-11-03", "2026-11-05"]);
    const a = noticingStrength(days, 3, D("2026-11-05"));
    const b = noticingStrength(days, 3, D("2026-11-06"));
    expect(b).toBeLessThan(a);
    expect(a - b).toBeLessThanOrEqual(Math.ceil(a * 0.1));
    expect(noticingStrength(days, 3, D("2027-06-01"))).toBeGreaterThan(0);
  });
});

describe("tiers, levels and unlocks", () => {
  it("sets thresholds at about a third, two thirds and all", () => {
    expect(tierThresholds(9)).toEqual({ bronze: 3, silver: 6, gold: 9 });
    expect(tierThresholds(7)).toEqual({ bronze: 3, silver: 5, gold: 7 });
    expect(tierThresholds(6)).toEqual({ bronze: 2, silver: 4, gold: 6 });
    expect(tierThresholds(35)).toEqual({ bronze: 12, silver: 24, gold: 35 });
    expect(tierThresholds(1)).toEqual({ bronze: 1, silver: 1, gold: 1 });
  });
  it("says what a stamp means", () => {
    const n = entries(pack).filter((e) => e.set === "signals").length;
    const p = setProgress(pack, set("signals"), spotAll("signals", tierThresholds(n).silver - 2));
    expect(meaningLine(p)).toBe("2 more and the Signals set is silver.");
    expect(meaningLine(setProgress(pack, set("signals"), spotAll("signals")))).toMatch(/gold/);
  });
  it("climbs the level ladder by stamps", () => {
    expect(levelFor(0).name).toBe("Platform");
    expect(levelFor(10).name).toBe("Lineside");
    expect(levelFor(29)).toMatchObject({ name: "Lineside", next: "Signal box", toNext: 1 });
    expect(levelFor(500).name).toBe("Chief Engineer");
  });
  it("unlocks companions from stamps and full sets, and kit at silver", () => {
    const base = { progress: useStore.getState().progress, pass: useStore.getState().pass };
    const pip = pack.companions.find((c) => c.id === "pip")!;
    const tampy = pack.companions.find((c) => c.id === "tampy")!;
    expect(isUnlocked(pip, { ...base, fieldbook: emptyFieldBook() })).toBe(false);
    expect(isUnlocked(pip, { ...base, fieldbook: { ...emptyFieldBook(), spots: spotAll("track") } })).toBe(false); // 9 stamps
    expect(isUnlocked(pip, { ...base, fieldbook: { ...emptyFieldBook(), spots: { ...spotAll("track"), ...spotAll("signals", 1) } } })).toBe(true);
    expect(isUnlocked(tampy, { ...base, fieldbook: { ...emptyFieldBook(), spots: spotAll("track", 8) } })).toBe(false);
    expect(isUnlocked(tampy, { ...base, fieldbook: { ...emptyFieldBook(), spots: spotAll("track") } })).toBe(true);
    // something already earned on this phone stays earned
    expect(isUnlocked(tampy, { ...base, fieldbook: emptyFieldBook(), companions: { unlocked: ["tampy"], seen: [] } })).toBe(true);
    expect(earnedKit(pack, spotAll("track", 5)).size).toBe(0);
    expect([...earnedKit(pack, spotAll("track", 6))]).toEqual(["hand:3"]);
  });
});

describe("recall questions", () => {
  const e = entryByKey(pack, "fishplate")!;
  it("changes kind with each visit and always has one right answer among three", () => {
    const kinds = [0, 1, 2].map((v) => questionFor(pack, e, v, "2026-11-11"));
    expect(kinds.map((q) => q.kind)).toEqual(["art", "why", "look"]);
    for (const q of kinds) {
      expect(q.options).toHaveLength(3);
      expect(q.options[q.answer].key).toBe("fishplate");
      expect(new Set(q.options.map((o) => o.key)).size).toBe(3);
    }
    expect(kinds[1].options[kinds[1].answer].text).toBe(e.why);
  });
  it("asks trains for the drawing and places for the station", () => {
    expect(questionFor(pack, entryByKey(pack, trainKey("c66"))!, 0, "x").kind).toBe("art");
    const q = questionFor(pack, entryByKey(pack, placeKey("glenfinnan-viaduct"))!, 0, "x");
    expect(q.kind).toBe("station");
    expect(q.options[q.answer].text).toBe("Glenfinnan");
  });
});

describe("spot of the day", () => {
  it("follows the weather and the season, and prefers what you haven't spotted", () => {
    const hot = spotOfTheDay(pack, {}, D("2026-07-20"), { max: 31, min: 18, rain: 0, gust: 10, code: 0 });
    expect(hot?.reason).toBe("heat");
    expect(hot?.entry.tags).toContain("heat");
    const autumn = spotOfTheDay(pack, {}, D("2026-11-11"), null);
    expect(autumn).toMatchObject({ reason: "leaf", entry: { key: "railhead" } });
    const frost = spotOfTheDay(pack, {}, D("2026-02-03"), { max: 4, min: -3, rain: 0, gust: 10, code: 0 });
    expect(frost?.entry.key).toBe("points");
    const mild = spotOfTheDay(pack, spotAll("track", 8), D("2026-05-12"), { max: 16, min: 8, rain: 0, gust: 10, code: 2 });
    expect(mild?.reason).toBe("rotate");
    expect(mild?.entry.kind).toBe("item");
    expect(spotAll("track", 8)[mild!.entry.key]).toBeUndefined();
  });
});

describe("recall timing (FSRS)", () => {
  it("schedules a good recall later than a wrong one, and lists what is due", () => {
    const now = D("2026-11-11");
    const good = review(undefined, 1, now), bad = review(undefined, 0, now);
    expect(new Date(good.due).getTime()).toBeGreaterThan(now.getTime());
    expect(new Date(good.due).getTime()).toBeGreaterThanOrEqual(new Date(bad.due).getTime());
    const again = review(good, 1, new Date(good.due));
    expect(again.reps).toBe(2);
    expect(new Date(again.due).getTime() - new Date(good.due).getTime()).toBeGreaterThan(new Date(good.due).getTime() - now.getTime());
    expect(dueKeys({ a: good, b: bad }, now)).not.toContain("a");
    expect(dueKeys({ a: good }, new Date(good.due))).toEqual(["a"]);
  });
});

describe("migration from the v1 store", () => {
  const v1 = {
    onboarded: true,
    profile: { name: "Sam", audience: "leader" },
    progress: { season: 1, stop: 4, completed: ["s1-01", "s1-02", "s1-03"], quizBest: { "s1-01": 3 }, miles: 36, streak: 4, lastActive: "2026-11-10" },
    passport: ["glenfinnan-viaduct", "ribblehead-viaduct"],
    loop: { want: "A railway job", strategy: "Apply", laps: 1, items: [
      { id: "loop-s1-01-lens-1700000000000", text: "Add a what's stuck slot", stage: "learn", learned: "People raised two blockers", doneAt: new Date("2026-11-05T10:00:00").getTime() },
      { id: "a1", text: "Read a manual", stage: "plan" },
    ] },
  };
  it("turns passport stamps into place stamps and learned Loop items into practice stamps", () => {
    const fb = fieldBookFromV1(v1);
    expect(fb.spots["place.glenfinnan-viaduct"]).toMatchObject({ grade: 1, via: "passport" });
    expect(fb.practice).toHaveLength(1);
    expect(fb.practice[0]).toMatchObject({ lessonId: "s1-01", text: "People raised two blockers", day: "2026-11-05", from: "loop" });
  });
  it("keeps every v1 field and fills in defaults through migrate and merge", () => {
    const up = migrate(v1, 1);
    const state = merge(up, useStore.getState());
    expect(state.passport).toEqual(v1.passport);
    expect(state.progress.miles).toBe(36);
    expect(state.loop.items).toHaveLength(2);
    expect(state.loop.want).toBe("A railway job");
    expect(state.fieldbook.target).toBe(3);
    expect(stampsTotal(state.fieldbook)).toBe(3);
    expect(typeof state.stampSpot).toBe("function");
    expect(state.settings.theme).toBe("system");
  });
  it("never crashes on missing or broken stored data", () => {
    for (const bad of [null, undefined, 42, "x", [], {}, { passport: "nope", loop: null }, { loop: { items: [null, 3, { stage: "learn" }] } }]) {
      const s = merge(migrate(bad, 1), useStore.getState());
      expect(s.fieldbook.spots).toEqual({});
      expect(Array.isArray(s.fieldbook.practice)).toBe(true);
    }
    const broken = sanitiseFieldBook({ spots: { a: null, b: { grade: 9, days: "x" } }, practice: "x", target: 99 });
    expect(broken.spots.b).toEqual({ grade: 3, days: [], first: 0, correct: 0 });
    expect(broken.target).toBe(7);
  });
});

describe("store actions", () => {
  beforeEach(() => useStore.getState().reset());
  it("stampSpot: once per item per day, upgrades on a later day, schedules recall", () => {
    const st = useStore.getState();
    expect(st.stampSpot("fishplate", true, { now: D("2026-11-09") })).toMatchObject({ ok: true, grade: 1 });
    expect(useStore.getState().stampSpot("fishplate", true, { now: D("2026-11-09") })).toEqual({ ok: false, reason: "today" });
    expect(useStore.getState().stampSpot("fishplate", false, { now: D("2026-11-10") })).toMatchObject({ ok: true, grade: 2 });
    expect(useStore.getState().stampSpot("no-such-thing", true)).toEqual({ ok: false, reason: "unknown" });
    expect(useStore.getState().fieldbook.recall.fishplate).toBeDefined();
  });
  it("stampPractice: needs text, and counts as a noticing day", () => {
    expect(useStore.getState().stampPractice("s1-01", "   ")).toBeNull();
    const p = useStore.getState().stampPractice("s1-01", "Left room in the plan for a late supplier", { now: D("2026-11-11") });
    expect(p).toMatchObject({ lessonId: "s1-01", day: "2026-11-11" });
    expect(noticedThisWeek(useStore.getState().fieldbook, D("2026-11-11"))).toBe(1);
  });
  it("completeLesson schedules the stop for a revisit", () => {
    useStore.getState().completeLesson("s1-01", 1, 3);
    expect(useStore.getState().fieldbook.recall["lesson.s1-01"]).toBeDefined();
    expect(dayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("Field Book content", () => {
  const sources = [
    ...pack.glossary.map((g) => g.plain),
    ...pack.lessons.flatMap((l) => [l.explorer, l.leader, ...l.starter, ...l.keyFacts.map((f) => f.text)]),
    ...(["viaduct", "tunnel", "crossing", "signalbox"] as const).map((k) => momentFor(k).text),
  ].join("\n");
  it("takes every 'why it's there' word for word from existing content", () => {
    for (const it of pack.spots.items) expect([it.id, sources.includes(it.why)]).toEqual([it.id, true]);
  });
  it("has a drawing, a known set and a real lesson for every item", () => {
    for (const it of pack.spots.items) {
      expect([it.id, hasArt(it.art)]).toEqual([it.id, true]);
      expect(pack.spots.sets.some((s) => s.id === it.set)).toBe(true);
      if (it.lesson) expect(pack.lessons.some((l) => l.id === it.lesson)).toBe(true);
    }
    expect(new Set(pack.spots.items.map((i) => i.id)).size).toBe(pack.spots.items.length);
    expect(entries(pack)).toHaveLength(pack.spots.items.length + pack.trains.length + pack.places.length);
  });
  it("has an Explorer prompt for every lesson, and no exclamation marks", () => {
    for (const l of pack.lessons) expect(pack.spots.practice[l.id]?.explorer).toBeTruthy();
    const text = [...pack.spots.items.flatMap((i) => [i.name, i.look]), ...Object.values(pack.spots.practice).map((p) => p.explorer), pack.spots.fenceRule, ...pack.spots.safety].join(" ");
    expect(text).not.toMatch(/!/);
    expect(pack.spots.fenceRule).toMatch(/Never on or near the track/);
  });
});
