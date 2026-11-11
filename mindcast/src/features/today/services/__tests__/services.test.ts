/// <reference types="jest" />
/* Unit tests for the Today services' pure functions. Run: npx jest --preset jest-expo src/features/today */
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-location", () => ({}));

import type { HistoryEvent } from "@/domain/types";
import { minutesBetween, parseTransitRadar, parseTfl, reasonTopic, shortReason } from "../departures";
import { calendarOrder, pickHistory, whenLabel } from "../history";
import { resolveLink, topicFromLinkString } from "../links";
import { describeDay, impacts, skyFromCode, weekEvent, type DayWx } from "../railImpacts";
import { stationByCrs, STATIONS } from "../stations";
import { forecastUrl, nameNear, parseOpenMeteo } from "../weather";
import { ago } from "../cache";

const day = (date: string, max: number, min: number, rain = 0, gust = 10, code = 3): DayWx => ({ date, max, min, rain, gust, code });
const ids = (d: DayWx) => impacts(d).map((i) => i.id);

describe("railImpacts", () => {
  test("heat bands", () => {
    expect(ids(day("2026-07-10", 24, 14))).toEqual([]);
    expect(ids(day("2026-07-10", 25, 14))).toEqual(["hot"]);
    expect(ids(day("2026-07-10", 31, 18))).toEqual(["very-hot"]);
  });
  test("frost, snow, wind and rain", () => {
    expect(ids(day("2026-01-10", 3, -2))).toEqual(["frost"]);
    expect(ids(day("2026-01-10", 1, -4, 3, 20, 73))).toEqual(["frost", "snow"]);
    expect(ids(day("2026-03-10", 9, 4, 25, 75))).toEqual(["wind", "rain"]);
  });
  test("leaf fall only October to December, with wind or rain", () => {
    expect(ids(day("2026-11-12", 10, 4, 0.2, 10))).toEqual(["leaf"]);
    expect(ids(day("2026-11-12", 10, 4, 0, 45))).toEqual(["leaf"]);
    expect(ids(day("2026-11-12", 10, 4, 0, 20))).toEqual([]);
    expect(ids(day("2026-09-30", 15, 8, 5, 50))).toEqual([]);
  });
  test("week event picks the strongest signal", () => {
    expect(weekEvent([day("2026-07-01", 27, 15), day("2026-07-02", 31, 18)]).id).toBe("buckle");
    expect(weekEvent([day("2026-11-11", 9, 6, 9, 27), day("2026-11-12", 6, -1), day("2026-11-13", 6, -2)]).id).toBe("ice");
    expect(weekEvent([day("2026-11-11", 9, 6, 9, 27), day("2026-11-12", 6, 2, 1), day("2026-11-13", 6, -2)]).id).toBe("leaf");
    expect(weekEvent([day("2026-05-11", 18, 9)]).id).toBe("quiet");
    // a frost in May is not the Ice on the line event
    expect(weekEvent([day("2026-05-11", 12, -1)]).id).toBe("quiet");
  });
  test("sky from WMO codes", () => {
    expect(skyFromCode(0)).toBe("sun");
    expect(skyFromCode(2)).toBe("part");
    expect(skyFromCode(3)).toBe("cloud");
    expect(skyFromCode(3, 60)).toBe("wind");
    expect(skyFromCode(45)).toBe("fog");
    expect(skyFromCode(61)).toBe("rain");
    expect(skyFromCode(81)).toBe("rain");
    expect(skyFromCode(75)).toBe("snow");
    expect(skyFromCode(95)).toBe("storm");
  });
  test("description reads well", () => {
    expect(describeDay(day("2026-11-12", 6.4, 2, 0, 31, 3), "Thu")).toBe("Thu: cloudy, high 6, low 2 degrees. Nothing for the track to worry about.");
    expect(describeDay(day("2026-11-11", 7.9, 6.1, 9.3, 27, 61), "Wed")).toBe("Wed: rain, high 8, low 6 degrees. Leaf fall.");
  });
});

describe("departures", () => {
  test("short reasons", () => {
    expect(shortReason("This service has been delayed by a fault with the signalling system")).toBe("A fault with the signalling system");
    expect(shortReason("This service has been cancelled because of trespassers on the railway earlier today")).toBe("Trespassers on the railway earlier today");
    expect(shortReason(null)).toBeNull();
  });
  test("reason topics", () => {
    expect(reasonTopic("This service has been cancelled because of forecasted slippery rails")?.event).toBe("leaf");
    expect(reasonTopic("a fault with the signalling system")?.season).toBe(2);
    expect(reasonTopic("overrunning engineering works")?.lesson).toBe("s1-17");
    expect(reasonTopic("trespassers on the railway")?.lesson).toBe("s1-19");
    expect(reasonTopic("a speed restriction over defective track")?.lesson).toBe("s1-15");
    expect(reasonTopic("a safety inspection of the track")?.lesson).toBe("s1-15");
    expect(reasonTopic("a points failure")?.lesson).toBe("s1-14");
    expect(reasonTopic("speed restrictions due to high temperatures")?.lesson).toBe("s1-08");
    expect(reasonTopic("a track circuit failure")?.season).toBe(2);
    expect(reasonTopic("a person being hit by a train")).toBeNull();
    expect(reasonTopic("police dealing with an incident")).toBeNull(); // "police" must not match "ice"
    expect(reasonTopic("a late running train being in front of this one")).toBeNull();
    expect(reasonTopic("a fault on a train in front of this one")).toBeNull(); // "street"/"in front" must not match trees
  });
  test("minutes across midnight", () => {
    expect(minutesBetween("16:52", "17:09")).toBe(17);
    expect(minutesBetween("23:58", "00:03")).toBe(5);
    expect(minutesBetween("10:00", "09:58")).toBe(-2);
  });
  test("parses a Darwin board", () => {
    const b = parseTransitRadar(
      {
        departures: [
          { planningId: "A", plannedDep: "16:52", estDep: "17:09", destination: "Cambridge", platform: "10A", operator: "CrossCountry", cancelled: false, delayReason: "This service has been delayed by a fault with the signalling system" },
          { planningId: "B", plannedDep: "17:09", estDep: "17:09", destination: "Nottingham", platform: "7A", cancelled: false },
          { planningId: "C", plannedDep: "17:12", estDep: null, destination: "Leicester", cancelled: true, cancelReason: "This service has been cancelled because of trespassers on the railway" },
          { planningId: "D", plannedDep: "17:15", estDep: null, destination: "Crewe", cancelled: false, delayReason: "This service has been delayed by a points failure" },
          { planningId: "E", plannedDep: "17:20", destination: "Depot", isPassenger: false },
          { planningId: "F", plannedDep: null, destination: "Terminates" },
        ],
        messages: [{ text: "<p>Trains through York may be delayed.</p>" }],
      },
      { crs: "BHM", name: "Birmingham New Street" }
    );
    expect(b.rows.map((r) => [r.destination, r.status, r.expected, r.lateMin])).toEqual([
      ["Cambridge", "late", "17:09", 17],
      ["Nottingham", "on-time", null, null],
      ["Leicester", "cancelled", null, null],
      ["Crewe", "delayed", null, null],
    ]);
    expect(b.rows[0].topic?.season).toBe(2);
    expect(b.rows[2].topic?.lesson).toBe("s1-19");
    expect(b.notices[0].text).toBe("Trains through York may be delayed.");
  });
  test("parses TfL arrivals and drops terminating trains", () => {
    const st = stationByCrs("PAD")!;
    const b = parseTfl(
      [
        { id: "1", lineId: "elizabeth", lineName: "Elizabeth line", platformName: "Platform A", destinationName: "Abbey Wood Rail Station", destinationNaptanId: "910GABWD", expectedArrival: "2026-11-11T17:20:00Z", timeToStation: 600 },
        { id: "2", lineId: "elizabeth", lineName: "Elizabeth line", destinationName: "Paddington Rail Station", destinationNaptanId: st.tfl, expectedArrival: "2026-11-11T17:15:00Z", timeToStation: 300 },
      ],
      [{ id: "elizabeth", name: "Elizabeth line", lineStatuses: [{ statusSeverity: 9, statusSeverityDescription: "Minor Delays", reason: "Minor delays due to a signal failure at Ealing." }] }],
      st
    );
    expect(b.rows).toHaveLength(1);
    expect(b.rows[0]).toMatchObject({ due: "17:20", destination: "Abbey Wood", platform: "A", status: "live" });
    expect(b.notices[0].topic?.season).toBe(2);
  });
});

describe("stations and weather", () => {
  test("station list is sane", () => {
    expect(STATIONS.length).toBeGreaterThanOrEqual(110);
    expect(new Set(STATIONS.map((s) => s.crs)).size).toBe(STATIONS.length);
    for (const s of STATIONS) {
      expect(s.crs).toMatch(/^[A-Z]{3}$/);
      expect(s.lat).toBeGreaterThan(49.9);
      expect(s.lat).toBeLessThan(58.7);
      expect(s.lon).toBeGreaterThan(-6.5);
      expect(s.lon).toBeLessThan(1.8);
    }
    expect(stationByCrs("bhm")?.name).toBe("Birmingham New Street");
  });
  test("open-meteo parsing and url", () => {
    const days = parseOpenMeteo({ daily: { time: ["2026-11-11", "2026-11-12"], temperature_2m_max: [7.9, null], temperature_2m_min: [6.1, 2], precipitation_sum: [9.3, 0], wind_gusts_10m_max: [27.4, 31], weather_code: [61, 3] } });
    expect(days).toEqual([{ date: "2026-11-11", max: 7.9, min: 6.1, rain: 9.3, gust: 27.4, code: 61 }]);
    expect(forecastUrl({ name: "Leeds", lat: 53.8008, lon: -1.5491 })).toContain("timezone=Europe%2FLondon");
    expect(nameNear(52.479, -1.9)).toBe("Near Birmingham New Street");
    expect(nameNear(60.2, -1.2)).toBe("Your location");
  });
  test("ago", () => {
    const now = 1_000_000_000_000;
    expect(ago(now - 10_000, now)).toBe("just now");
    expect(ago(now - 120_000, now)).toBe("2 min ago");
    expect(ago(now - 3 * 3600_000, now)).toBe("3 hours ago");
  });
});

describe("history and links", () => {
  const ev = (id: string, month: number, day: number, year: number, link = "s1-08"): HistoryEvent => ({ id, month, day, year, title: id, text: "", art: "loco", link, sources: [] });
  const list = calendarOrder([ev("mallard", 7, 3, 1938), ev("forth", 3, 4, 1890, "Season 4: Structures"), ev("eurostar", 11, 14, 1994), ev("tube", 12, 18, 1890)]);
  test("today, upcoming and wrap", () => {
    expect(list[pickHistory(list, new Date(2026, 10, 11))!.index].id).toBe("eurostar");
    expect(pickHistory(list, new Date(2026, 10, 14))!.when).toBe("today");
    expect(list[pickHistory(list, new Date(2026, 11, 25))!.index].id).toBe("forth");
    expect(whenLabel(list[0], new Date(2026, 11, 25))).toBe("Coming up on 4 March");
    expect(whenLabel(list.find((e) => e.id === "eurostar")!, new Date(2026, 10, 11))).toBe("In 3 days: railway history");
  });
  test("link resolution", () => {
    const pack = { lessons: [{ id: "s1-08", stop: 8, title: "Buckles" }] as never, seasons: [{ n: 2, title: "Signals", time: "", event: "Leaf fall", colour: "" }, { n: 4, title: "Structures", time: "", event: "", colour: "" }] };
    expect(resolveLink({ lesson: "s1-08", label: "" }, pack)).toEqual({ href: "/lesson/s1-08", label: "Stop 8: Buckles", kind: "lesson" });
    expect(resolveLink({ lesson: "s1-17", label: "" }, pack)?.href).toBe("/line");
    expect(resolveLink({ season: 9, event: "leaf", label: "" }, pack)?.label).toBe("Leaf fall, Season 2");
    expect(resolveLink({ season: 2, label: "" }, pack)?.label).toBe("Season 2: Signals");
    expect(resolveLink(topicFromLinkString("Season 4: Structures")!, pack)?.label).toBe("Season 4: Structures");
    expect(topicFromLinkString("nonsense")).toBeNull();
  });
});
