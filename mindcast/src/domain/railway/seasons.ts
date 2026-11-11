import type { Season } from "../types";

/** The six season lines. Each season has a time of year and a seasonal railway event. */
export const seasons: Season[] = [
  { n: 1, title: "The Permanent Way", time: "Summer", event: "Buckle watch", colour: "#E8611A" },
  { n: 2, title: "Signals and Control", time: "Autumn", event: "Leaf fall", colour: "#B7791F" },
  { n: 3, title: "Power", time: "Winter", event: "Ice on the wires", colour: "#2B59C3" },
  { n: 4, title: "Structures", time: "Spring", event: "Flood and scour", colour: "#2E7D4F" },
  { n: 5, title: "Running the Railway", time: "Summer", event: "Timetable change", colour: "#E8611A" },
  { n: 6, title: "Delivering at Scale", time: "Autumn", event: "Big weekend", colour: "#1B1F24" },
];
