/** Parse a real Open-Meteo response saved by curl (OM_JSON=<path>) with the app's own parser and rail-impact rules. */
import { parseOpenMeteo } from "@/features/today/services/weather";
import { describeDay, impacts } from "@/features/today/services/railImpacts";
const f = process.env.OM_JSON;
(f ? it : it.skip)("real Open-Meteo forecast parses and maps to rail impacts", () => {
  const days = parseOpenMeteo(JSON.parse((require("fs") as { readFileSync: (p: string, e: string) => string }).readFileSync(f!, "utf8")));
  console.log(days.slice(0, 3));
  console.log(describeDay(days[0], "Today"), impacts(days[0]).map((i) => i.id));
  expect(days).toHaveLength(7);
  for (const d of days) { expect(typeof d.max).toBe("number"); expect(d.max).toBeGreaterThan(d.min - 0.01); }
});
