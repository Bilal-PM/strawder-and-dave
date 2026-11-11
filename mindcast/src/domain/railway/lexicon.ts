/**
 * Railway word lists for the Mindcast integrity check (docs/MINDCAST_METHOD.md, section 3.1).
 * "Strong" words only make sense on a railway; "weak" ones are ordinary English words that are also railway terms.
 */
import { railwayIdioms, slopPhrases } from "./cliches";

export const lexicon = {
  strong: "rail railway railhead track trackbed sleeper ballast fishplate cess cant tamp tamping tamper stoneblower stoneblowing cwr thermit alumino pandrol baseplate catenary pantograph dropper ohle locomotive train wagon bogie wheelset flange signaller interlocking possession handback lookout formation sub-grade subgrade catchpit stressing tensor"
    .split(" ")
    .concat(["flash butt", "chair screw", "check rail", "stock rail", "switch blade", "switch rail", "crossing nose", "turnout", "s&c", "contact wire", "signal box", "block section", "track circuit", "permanent way", "adjustment switch", "gauge corner"]),
  weak: ["line", "points", "signal", "station", "platform", "junction", "siding", "buffer", "gauge", "brake", "switch", "crossing", "weld", "tension", "sleeper"],
  idioms: railwayIdioms,
  slop: slopPhrases,
};
