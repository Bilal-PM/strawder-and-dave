/**
 * Illustrated stories, keyed by lesson id. A lesson listed here opens as a story by default; its detailed
 * notes stay one tap away ("Full notes"). Lessons not listed here open as before.
 */
import type { Story } from "../types";
import { s1_01 } from "./s1-01";

const STORIES: Record<string, Story> = {
  "s1-01": s1_01,
};

export const storyFor = (lessonId: string): Story | undefined => STORIES[lessonId];
export const hasStory = (lessonId: string) => lessonId in STORIES;
