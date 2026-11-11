/** Types for illustrated story lessons. */
import type React from "react";
import type { Audience, Lesson } from "@/domain/types";

/** What every scene drawing receives from the player. */
export type ArtProps = {
  /** The scene is on screen, the app is in the foreground and nothing covers it. Clocks run only then. */
  active: boolean;
  /** The system asks for reduced motion: loops freeze at frame 0, one-shots show their last frame. */
  reduced: boolean;
  /** The chosen depth. Drawings never change with it; a scene may only read it for spoken or text labels. */
  depth: Audience;
  lesson: Lesson;
  /** Player actions a scene may call (the last scenes add to the Loop and finish the stop). */
  api: StoryApi;
};

export type StoryApi = {
  next: () => void;
  /** Credit the stop. `score` of `total` is the in-story check; the stop's quiz best is left untouched. */
  finish: (score: number, total: number) => void;
  openNotes: () => void;
  /** The scene has shown its answer: switch from the `before` caption to the caption. */
  reveal: () => void;
};

export type StoryScene = {
  id: string;
  /** Short heading above the caption, e.g. "Listen". */
  eyebrow: string;
  /** Caption at each depth. Starter stays within about 25 words. Real text, so it can be read aloud and scaled. */
  caption: Record<Audience, string>;
  /**
   * For a scene that opens on a playful guess ("what do you think happens?"): the caption shown until the
   * scene calls `api.reveal()`, so the words don't give the answer away before the drawing shows it.
   */
  before?: Record<Audience, string>;
  /** The drawing. It describes itself to screen readers (StageSvg's label). */
  Art: React.ComponentType<ArtProps>;
  /** The learner works inside the drawing, so taps in the middle don't turn the page. */
  interactive?: boolean;
  /**
   * Content still to be replaced by the founder (see the scene's source). Never shown in the UI.
   */
  draft?: boolean;
};

export type Story = { lessonId: string; scenes: StoryScene[] };
