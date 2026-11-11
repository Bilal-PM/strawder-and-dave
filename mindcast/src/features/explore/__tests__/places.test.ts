/// <reference types="jest" />
/* Run: npx jest --preset jest-expo src/features/explore */
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-location", () => ({}));

import { pack } from "@/domain";
import { project } from "../gbmap";
import { stampCheck, stampPoints, stationCoords } from "../places";

describe("explore", () => {
  test("projection puts London and Inverness in the right places", () => {
    const [lx, ly] = project(51.53, -0.13), [ix, iy] = project(57.48, -4.22);
    expect(lx).toBeGreaterThan(ix);
    expect(ly).toBeGreaterThan(iy);
    expect(lx).toBeLessThan(600);
    expect(ly).toBeLessThan(900);
  });
  test("station lookup handles two-station places and London names", () => {
    expect(stationCoords("Glenfinnan")).not.toBeNull();
    expect(stationCoords("London St Pancras International")).not.toBeNull();
    expect(stampPoints({ station: "Dalmeny or North Queensferry", lat: 56, lon: -3.39 })).toHaveLength(2);
  });
  test("every GB place resolves to a bundled station", () => {
    const inNI = (p: { lat: number; lon: number }) => p.lat > 54 && p.lat < 55.4 && p.lon < -5.4; // NaPTAN is GB only
    const missing = pack.places.filter((p) => !inNI(p) && stampPoints(p)[0].label === "the place").map((p) => `${p.id}: ${p.station}`);
    expect(missing).toEqual([]);
  });
  test("stamp radius", () => {
    const glen = { station: "Glenfinnan", lat: 56.876, lon: -5.432 };
    expect(stampCheck(glen, 56.8724, -5.4384).ok).toBe(true); // at the station
    const far = stampCheck(glen, 56.82, -5.11); // Fort William
    expect(far.ok).toBe(false);
    expect(far.km).toBeGreaterThan(15);
  });
});
