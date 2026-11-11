import type { Companion } from "../types";

/**
 * The companions who travel with the learner. Ported from the Season Ticket prototype.
 * Railway facts in their lines were checked against the sources noted beside them.
 */
export const companions: Companion[] = [
  {
    id: "sleeper",
    name: "Sleeper",
    kind: "Station cat",
    bio: "Station cat. Dry wit, naps between trains, notices everything.",
    tag: "Mm. ",
    anim: "stretch",
    hello: "Sleeper reporting. I'll be over here, supervising.",
    lines: [
      "They named me Sleeper. Fair enough. I support things and I'm mostly horizontal.",
      // Steel wheels on steel rails have little grip, so stopping distances are long.
      "I've watched thousands of trains. Not one stopped quickly. Steel on steel, you see.",
      // Crushed leaves form a slippery layer on the rail head (Wikipedia: Slippery rail).
      "Leaves on the line aren't an excuse. Crushed leaves make a slippery layer on the rail. Physics.",
      "Two minutes a day beats an hour once a month. I nap on the same principle.",
      // Angular ballast interlocks (Practical Railway Engineering, s. 5.4).
      "Ballast likes to be sharp. I relate.",
    ],
    unlock: { type: "start" },
  },
  {
    id: "semaphore",
    name: "Semaphore",
    kind: "Signal-box robin",
    bio: "Signal-box robin. Chirpy, quick facts, always looking ahead.",
    tag: "Quick one: ",
    anim: "hop",
    hello: "Semaphore here! I'll flag up anything useful.",
    lines: [
      // Corrected from "arm up or down": on a stop signal a horizontal arm means danger (Wikipedia: Railway semaphore signal).
      "I'm named after the old arm signals. On a stop signal, a level arm means stop and a raised or lowered arm means go. Very expressive. Like me.",
      // Four-aspect sequence (Practical Railway Engineering, s. 10.11).
      "Favourite aspect? Double yellow. It means the next signal is at single yellow, so start slowing down.",
      "Try this: explain today's stop to someone in one sentence. If you can't yet, watch it again.",
      "Why don't signals gossip? They only tell you what's ahead.",
      "A green signal means the line ahead is clear. In learning, that's your cue for the next step.",
    ],
    unlock: { type: "pass", stop: 2 },
  },
  {
    id: "tampy",
    name: "Tampy",
    kind: "Little tamper",
    bio: "Little tamper. Keen on night shifts and well-packed sleepers.",
    tag: "Ooh! ",
    anim: "shake",
    hello: "Tampy online! Point me at some ballast.",
    lines: [
      // A tamper lifts, lines and packs (Wikipedia: Tamping machine).
      "Lift, line, pack, repeat! I keep the track where the engineers designed it.",
      // Tamping is usually done in possessions or non-traffic hours (Practical Railway Engineering, s. 5.27).
      "I mostly work nights. Trains by day, tamping by night.",
      "I pack ballast under the sleepers. Think of me as a very loud tidy-up.",
      "Pick one action you can finish this week. Small actions lap the Loop fastest.",
      "Every lift I make is measured. Guesswork isn't my style.",
    ],
    unlock: { type: "pass", stop: 8 },
  },
  {
    id: "pip",
    name: "Pip",
    kind: "Platform pigeon",
    bio: "Platform pigeon. Here every day, knows every platform.",
    tag: "Coo, ",
    anim: "hop",
    hello: "Pip here. I'm at this station every day, so I'll keep you company.",
    lines: [
      "I'm at the station every day. Turning up is half of learning.",
      "Platform tip: stand behind the yellow line. It's there for a reason.",
      "I know every platform number. Two minutes a day, that's the secret.",
      "Delays happen. What matters is what you do while you wait.",
      "Why did the pigeon buy a season pass? It's cheaper if you come back every day.",
    ],
    unlock: { type: "streak", days: 5 },
  },
  {
    id: "gauge",
    name: "Gauge",
    kind: "Tortoise",
    bio: "Tortoise. Slow, steady, exactly 1,435 mm of patience.",
    tag: "Steady now: ",
    anim: "stretch",
    hello: "Gauge. Slow, steady, and exactly 1,435 mm of patience.",
    lines: [
      "Slow and steady finishes the season.",
      "Speed isn't the goal. Getting it right every time is.",
      // Line, level and twist are track geometry measures (Network Rail, Introduction to the Permanent Way, s. 4).
      "Good track has good line and level, and no twist. So does a good walk.",
      "Pick one action you can finish this week. Then finish it.",
      "I measure twice and move once. Mostly I just measure.",
    ],
    unlock: { type: "stop", season: 1, stop: 20 },
  },
  {
    id: "conker",
    name: "Conker",
    kind: "Autumn squirrel",
    bio: "Autumn squirrel. Visits for the leaf-fall event.",
    tag: "Psst: ",
    anim: "hop",
    hello: "Conker! I'm only visiting. Come back for the autumn event.",
    lines: [
      "Leaf fall is the railway's toughest autumn job. Crushed leaves make the rails slippery.",
      // Railhead treatment trains use high-pressure water jets (Wikipedia: Slippery rail).
      "Special trains blast the rails clean with water jets in autumn. I just collect conkers.",
      "Autumn tip: revise before you need it, like gritting before the frost.",
      "Why don't squirrels drive trains? They'd stop for every conker.",
      "I join properly in Season 2. Save me a seat.",
    ],
    unlock: { type: "event", season: 2 },
  },
];
