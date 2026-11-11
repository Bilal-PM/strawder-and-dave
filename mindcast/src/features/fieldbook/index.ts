/**
 * Field Book public API.
 *
 * For story lessons (the end of a stop):
 *   <SpotIt itemId="fishplate" />   spot the real thing: one recall question, then the stamp lands
 *   <UseIt lessonId="s1-01" />      "Where did you see this today?": a note earns a practice stamp
 *   spotsForLesson("s1-01")         entry keys whose item links to the lesson, to choose what to offer
 *
 * Store actions (src/state/store.ts):
 *   useStore.getState().stampSpot(itemId, correct)       once per item per day; returns the outcome
 *   useStore.getState().stampPractice(lessonId, text)    returns the practice stamp, or null for empty text
 */
import { pack } from "@/domain";
import { entries } from "./logic";

export { SpotIt } from "./SpotIt";
export { UseIt, castFromPractice } from "./UseIt";
export { InkStamp, PracticeMark, StampMoment } from "./Stamp";
export { FieldBookScreen } from "./FieldBookScreen";
export { entries, entryByKey } from "./logic";

/** Entry keys of spot items linked to a lesson, in book order. */
export const spotsForLesson = (lessonId: string) => entries(pack).filter((e) => e.lesson === lessonId).map((e) => e.key);
