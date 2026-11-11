/** One interactive, hand-drawn diagram per DiagramKind. */
import React from "react";
import type { DiagramKind, Lesson } from "@/domain/types";
import { Cant, Gauge, Geometry, Switch } from "./geometry";
import { BallastLock, Drainage, Fastening, Formation, SleeperSpacing, TrackLayers } from "./structure";
import { Buckle, RailExpansion, Stressing } from "./thermal";
import { Case, Inspection, Possession, Renewal, Safety, Tamping, ThermiteWeld } from "./work";

const MAP: Record<DiagramKind, React.ComponentType<{ lesson: Lesson }>> = {
  "rail-expansion": RailExpansion,
  "track-layers": TrackLayers,
  "sleeper-spacing": SleeperSpacing,
  "ballast-lock": BallastLock,
  fastening: Fastening,
  "thermite-weld": ThermiteWeld,
  stressing: Stressing,
  buckle: Buckle,
  drainage: Drainage,
  formation: Formation,
  geometry: Geometry,
  gauge: Gauge,
  cant: Cant,
  switch: Switch,
  inspection: Inspection,
  tamping: Tamping,
  possession: Possession,
  renewal: Renewal,
  safety: Safety,
  case: Case,
};

export function Diagram({ lesson }: { lesson: Lesson }) {
  const C = MAP[lesson.diagram];
  return C ? <C lesson={lesson} /> : null;
}
