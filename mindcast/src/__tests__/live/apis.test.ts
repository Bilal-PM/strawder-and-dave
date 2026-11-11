/**
 * Live check of the app's own data services against the real APIs (opt-in: npm run test:live, which uses jest.live.config.js).
 * Uses the same functions the Today screen calls, with real network fetch.
 */
import { loadBoard } from "@/features/today/services/departures";
import { STATIONS } from "@/features/today/services/stations";
import { DEFAULT_PLACE, loadForecast } from "@/features/today/services/weather";

const live = process.env.LIVE === "1" ? describe : describe.skip;
jest.setTimeout(60000);
live("live data services", () => {
  it("weather: Open-Meteo forecast parses into days", async () => {
    const r = await loadForecast(DEFAULT_PLACE, { force: true });
    console.log("weather", r.error ?? "ok", r.forecast.days.slice(0, 2));
    expect(r.error).toBeUndefined();
    expect(r.forecast.days.length).toBeGreaterThanOrEqual(3);
  });
  it.each(["KGX", "MAN", "EDB"])("departures: %s board loads", async (crs) => {
    const st = STATIONS.find((s) => s.crs === crs)!;
    const r = await loadBoard(st, { force: true });
    console.log(crs, r.board.source, r.error ?? "ok", r.board.rows.length, "rows", r.board.rows.slice(0, 2).map((d) => `${d.due} ${d.destination} ${d.status}${d.reason ? " (" + d.reason + ")" : ""}`));
    expect(r.error).toBeUndefined();
    expect(r.board.rows.length).toBeGreaterThan(0);
  });
});
