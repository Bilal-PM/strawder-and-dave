/**
 * Scene 6 · From the field. A hand-written note card from the founder, pinned to the page: practitioner
 * advice in his voice, with a small sketch and his initial. The card arrives (rises and settles about its pin),
 * the lines write on one by one, the sketch draws itself, the initial goes on last.
 * Idle: the card sways a fraction about its pin; the sketch's sun turns.
 */
import React from "react";
import { seg, wave } from "../../living";
import { railSide, sunDisc, sunRays } from "../../art";
import { DrawOn, Layer, StageSvg, Still, useArt, useSceneClocks, type Tick } from "../../layers";
import type { ArtProps } from "../../types";

/**
 * DRAFT, for the founder to replace with his own words or a real story from his work.
 * Written as practitioner advice in his voice, not as something that happened to him: no anecdote is invented.
 * The UI never shows that this is a draft; `draft: true` on the scene (see ./index.ts) flags it in code.
 */
export const FIELD_NOTE = {
  draft: true,
  lines: [
    "Hot day? Walk the joints.",
    "Closed gaps are fine:",
    "the rail has used its room.",
    "A wide gap in the heat",
    "is a question. Ask why.",
    "Respect what the steel",
    "is doing. It won't wait.",
  ],
  /** His initial for the signature. Replace with his own initials. */
  initials: "B.",
} as const;

const T = {
  LOOP: 36000,
  SHOT: 5600,
  ARRIVE: [0, 650],
  LINES: 650,
  LINE_STEP: 420,
  LINE_FADE: 380,
  SKETCH: [3600, 4700],
  SIGN: [4700, 5300],
} as const;
const PIN = [180, 40] as const;
const CARD = { x: 30, y: 30, w: 300, h: 352 };

const cardPose = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.ARRIVE[0], T.ARRIVE[1]);
  return { o: p, y: 18 * (1 - p), r: -1.6 - 3 * (1 - p) + 0.5 * wave(t.loop, 6000) * p, s: 0.97 + 0.03 * p };
};
function makeLine(i: number) {
  const a = T.LINES + i * T.LINE_STEP;
  return (t: Tick) => {
    "worklet";
    const p = seg(t.shot, a, a + T.LINE_FADE);
    return { o: p, x: -4 * (1 - p) };
  };
}
const LINE_POSES = FIELD_NOTE.lines.map((_, i) => makeLine(i));
const signPose = (t: Tick) => {
  "worklet";
  const p = seg(t.shot, T.SIGN[0], T.SIGN[1]);
  return { o: p, s: 0.94 + 0.06 * p };
};
const raysPose = (t: Tick) => {
  "worklet";
  return { r: (t.loop / T.LOOP) * 360 };
};

export function FieldScene({ active, reduced }: ArtProps) {
  const c = useSceneClocks(T.LOOP, T.SHOT, active, reduced);
  const a = useArt("s1-01/field", (part, k) => ({
    card: part((p) => {
      p.rect(CARD.x + 5, CARD.y + 6, CARD.w, CARD.h, k.line, { stroke: "none", strokeWidth: 0, roughness: 0.4 });
      p.rect(CARD.x, CARD.y, CARD.w, CARD.h, k.surface, { roughness: 0.9, strokeWidth: 2 });
      for (let y = 102; y < 330; y += 31) p.line(CARD.x + 16, y + 8, CARD.x + CARD.w - 16, y + 8, { stroke: k.grid, strokeWidth: 1, roughness: 0.3 });
      p.text(CARD.x + 24, CARD.y + 40, "FROM THE FIELD", 11, k.soft, "mono", "start");
      p.circle(PIN[0], PIN[1], 13, k.accent, { roughness: 0.4, strokeWidth: 1.4 });
    }),
    lines: FIELD_NOTE.lines.map((s, i) => part((p) => p.text(CARD.x + 24, 104 + i * 31, s, 22, k.ink, "hand", "start"))),
    sketch: part((p) => {
      railSide(p, 200, 254, 334, 12, k);
      railSide(p, 258, 314, 334, 12, k);
      p.line(256, 322, 256, 330, { stroke: k.accent, strokeWidth: 1.4, roughness: 0.3 });
      p.line(196, 350, 318, 350, { stroke: k.soft, strokeWidth: 1.2, roughness: 0.8 });
    }),
    sun: part((p) => sunDisc(p, 296, 308, 8, k)),
    rays: part((p) => sunRays(p, 296, 308, 6, k, 8)),
    sign: part((p) => {
      p.ellipse(84, 340, 62, 44, null, { stroke: k.accent, strokeWidth: 1.6, roughness: 1.2 });
      p.text(84, 352, FIELD_NOTE.initials, 34, k.accent, "hand");
    }),
  }));
  return (
    <StageSvg label={`A hand-written note card pinned to the page, from the founder. It reads: ${FIELD_NOTE.lines.join(" ")} It has a small sketch of a rail joint under a hot sun and is signed with his initial.`}>
      <Layer c={c} pose={cardPose} pivot={PIN}>
        <Still nodes={a.card} />
        {a.lines.map((n, i) => <Layer key={i} c={c} pose={LINE_POSES[i]} nodes={n} />)}
        <DrawOn c={c} nodes={a.sketch} from={T.SKETCH[0]} to={T.SKETCH[1]} />
        <Layer c={c} pose={signPose} pivot={[296, 308]}>
          <Layer c={c} pose={raysPose} pivot={[296, 308]} nodes={a.rays} />
          <Still nodes={a.sun} />
        </Layer>
        <Layer c={c} pose={signPose} pivot={[84, 340]} nodes={a.sign} />
      </Layer>
    </StageSvg>
  );
}
