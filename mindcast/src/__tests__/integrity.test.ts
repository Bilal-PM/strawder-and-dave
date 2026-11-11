import { checkIntegrity, type Lexicon } from "@/features/mindcast/integrity";

const lex: Lexicon = {
  strong: ["rail", "railway", "track", "sleeper", "ballast", "fishplate", "train", "signaller", "block section", "possession"],
  weak: ["line", "signal", "station", "brake", "gauge", "switch"],
  idioms: ["full steam ahead", "on track", "derail", "light at the end of the tunnel"],
  slop: ["game-changer", "unlock", "delve", "seamless", "in today's fast-paced world"],
};

// The worked example from docs/MINDCAST_METHOD.md section 4 (expected: strong).
const worked = {
  title: "Give pressure somewhere to go",
  observe: "On jointed track the gap at each rail joint is set by temperature: wide in winter, closed tight on a hot day. A Network Rail booklet gives a target gap that steps down from about 10 mm in cold weather to none in very hot weather.",
  mechanism: "Steel expands as it warms and contracts as it cools. The gap gives the expansion somewhere to go. If the fishplates seize and the rail cannot slide into its gap, the expansion becomes compressive force in the rail, and with weak ballast at the sleeper ends the rail moves sideways instead.",
  mapping: [
    { railway: "The gap gives expansion a planned place to go.", target: "A regular, safe slot for bad news gives pressure in a team a planned place to go." },
    { railway: "A seized joint stops the rail sliding, so the force builds until it moves the track sideways.", target: "When people are blocked from raising problems, pressure builds until it comes out somewhere unplanned, often away from where it started." },
    { railway: "Ballast at the sleeper ends resists sideways movement.", target: "Steady working relationships resist a stressed team pulling apart." },
  ],
  limits: "Steel expands by a fixed, predictable amount for each degree. People do not. Pressure in a team can also fade, change shape or be released by one honest conversation, which has no equivalent in a rail. So use the gap as a reason to make room, not as a way to measure people.",
  principle: "Give pressure a planned place to go, or it will find an unplanned one.",
  action: "Add one standing five-minute \"what's stuck?\" slot to your team meeting this week and leave it in the agenda even when nobody uses it.",
};

describe("checkIntegrity (method section 3)", () => {
  it("rates the worked example strong", () => {
    const r = checkIntegrity(worked, lex);
    expect(r.hardFails).toEqual([]);
    expect(r.verdict).toBe("strong");
    expect(r.score).toBeGreaterThanOrEqual(85);
  });
  it("counts cliché hits with prefix matching and hard-fails at three", () => {
    const r = checkIntegrity({ ...worked, principle: "Stay on track, go full steam ahead and never derail the team." }, lex);
    const c = r.checks.find((x) => x.id === "cliche")!;
    expect(c.hits).toEqual(expect.arrayContaining(["on track", "full steam ahead", "derail"]));
    expect(r.hardFails).toContain("Three or more clichés");
    expect(r.verdict).toBe("needs work");
  });
  it("hard-fails object-only mappings", () => {
    const r = checkIntegrity({ ...worked, mapping: [{ railway: "The rail", target: "The team" }, { railway: "The ballast", target: "The managers" }] }, lex);
    expect(r.checks.find((x) => x.id === "mapping")!.points).toBe(0);
    expect(r.hardFails).toContain("Fewer than two relationships carried across");
  });
  it("hard-fails missing limits and scores vague actions low", () => {
    const r = checkIntegrity({ ...worked, limits: "", action: "Think about leadership more." }, lex);
    expect(r.hardFails).toContain("No limits stated");
    expect(r.checks.find((x) => x.id === "action")!.pass).toBe(false);
  });
  it("flags railway words leaking into the target side", () => {
    const r = checkIntegrity({ ...worked, principle: "Every team needs ballast and a fishplate." }, lex);
    expect(r.checks.find((x) => x.id === "surface")!.points).toBeLessThan(10);
  });
});

import { decodeCast } from "@/features/mindcast/link";
describe("shared Mindcast links", () => {
  it("rejects garbage safely", () => { expect(decodeCast("not-base64!!")).toBeNull(); });
});
