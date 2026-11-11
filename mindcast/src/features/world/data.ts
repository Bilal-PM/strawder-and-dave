/** Builds everything the scene needs, once per visit. */
import { stationNames } from "./moments";
import type { WorldData } from "./Scene";
import { buildScenery } from "./scenery";
import { buildTerrain } from "./terrain";
import { buildWorld } from "./track";

export function buildWorldData(): WorldData {
  const world = buildWorld(stationNames(5));
  const terrain = buildTerrain(world);
  const scenery = buildScenery(world, terrain);
  return { world, terrain, scenery };
}
