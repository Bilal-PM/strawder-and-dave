import { pack } from "@/domain";
import { checkIntegrity } from "@/features/mindcast/integrity";
it("scores", () => {
  const all = [...pack.casts.map((c) => ["cast " + c.id, c] as const), ...pack.lessons.map((l) => ["lens " + l.id, l.lens] as const)];
  const out = all.map(([k, c]) => { const r = checkIntegrity(c as never, pack.lexicon); return `${k} ${r.score} ${r.verdict} ${r.checks.map((x) => x.id[0] + x.points).join(" ")}`; });
  console.log(out.join("\n"));
});
