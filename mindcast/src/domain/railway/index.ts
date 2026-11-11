import type { DomainPack } from "../types";
import { casts } from "./casts";
import { cliches } from "./cliches";
import { companions } from "./companions";
import { glossary } from "./glossary";
import { history } from "./history";
import { lexicon } from "./lexicon";
import { lessons } from "./lessons";
import { places } from "./places";
import { seasons } from "./seasons";
import { spots } from "./spots";
import { trains } from "./trains";

/** The railway domain pack: everything Groundwork knows about the railway. */
export const railway: DomainPack = {
  id: "railway",
  brand: {
    name: "Groundwork",
    tagline: "What the railway teaches, from the ground up",
    mission: "One Railway: make railway knowledge and careers open to the next generation.",
  },
  seasons,
  lessons,
  trains,
  history,
  places,
  glossary,
  casts,
  companions,
  spots,
  cliches,
  lexicon,
};
