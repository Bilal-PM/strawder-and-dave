import { pack } from "@/domain";
import { checkIntegrity } from "@/features/mindcast/integrity";

/** docs/MINDCAST_METHOD.md: every seed Mindcast and lesson lens must be strong or sound, with no hard fails. */
const all = [...pack.casts.map((c) => ["cast", c] as const), ...pack.lessons.map((l) => ["lens " + l.id, l.lens] as const)];
describe("seed content passes its own integrity check", () => {
  it.each(all.map(([k, c]) => [`${k}: ${c.title}`, c]))("%s", (_name, c) => {
    const r = checkIntegrity(c as never, pack.lexicon);
    if (r.verdict === "needs work") console.log((c as { title: string }).title, r.score, r.hardFails, r.checks.filter((x) => !x.pass).map((x) => x.id + " " + x.detail));
    expect(r.hardFails).toEqual([]);
    expect(["strong", "sound"]).toContain(r.verdict);
  });
  it("has ids that are unique and lessons that resolve", () => {
    expect(new Set(pack.casts.map((c) => c.id)).size).toBe(pack.casts.length);
    expect(new Set(pack.lessons.map((l) => l.id)).size).toBe(pack.lessons.length);
    for (const c of pack.casts) if (/^s\d+-\d+$/.test(c.railwayTopic)) expect(pack.lessons.some((l) => l.id === c.railwayTopic)).toBe(true);
  });
});
