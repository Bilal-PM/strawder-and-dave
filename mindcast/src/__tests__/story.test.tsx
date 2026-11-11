/**
 * Illustrated stories: every scene renders on the iOS code path, captions follow the voice rules, and the
 * story credits the stop the same way the notes do (without touching the quiz best).
 */
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
}));
jest.mock("react-native-worklets", () => ({}));
jest.mock("react-native-reanimated", () => require("./mocks/reanimated"));
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn(() => Promise.resolve()) }));

import { lessonById } from "@/domain";
import { FIELD_NOTE } from "@/features/story/stories/s1-01/field";
import { StoryPlayer } from "@/features/story/StoryPlayer";
import { hasStory, storyFor } from "@/features/story/stories";
import { useStore } from "@/state/store";
import { GroundworkTheme } from "@/ui/theme";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const lesson = lessonById("s1-01")!;
const story = storyFor("s1-01")!;
const wrap = (start: number) => (
  <SafeAreaProvider initialMetrics={metrics}><GroundworkTheme><StoryPlayer lesson={lesson} story={story} start={start} /></GroundworkTheme></SafeAreaProvider>
);
/** Is there an image in the tree with a real description (the drawing's accessibilityLabel)? */
type J = { props?: Record<string, unknown>; children?: unknown[] } | string | null;
const described = (n: unknown): boolean => {
  if (!n || typeof n === "string") return false;
  if (Array.isArray(n)) return n.some(described);
  const j = n as Exclude<J, string | null>;
  const l = j.props?.accessibilityLabel;
  if (j.props?.accessibilityRole === "image" && typeof l === "string" && l.length > 40) return true;
  return (j.children ?? []).some(described);
};
const words = (s: string) => s.trim().split(/\s+/).length;

beforeEach(() => useStore.getState().reset());

describe("s1-01 story", () => {
  it("is registered, and other lessons are not", () => {
    expect(hasStory("s1-01")).toBe(true);
    expect(hasStory("s1-02")).toBe(false);
    expect(story.scenes.length).toBeGreaterThanOrEqual(8);
  });

  it.each(story.scenes.map((s, i) => [i + 1, s.id] as const))("scene %i (%s) renders with a described drawing and real caption text", async (n) => {
    const errors: unknown[] = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => { errors.push(String(a[0]).slice(0, 300)); });
    const r = await render(wrap(n - 1));
    const scene = story.scenes[n - 1];
    expect(r.getByText(scene.before?.starter ?? scene.caption.starter)).toBeTruthy();
    expect(described(r.toJSON())).toBe(true);
    await r.unmount(); spy.mockRestore();
    expect(errors.filter((e) => !String(e).includes("act("))).toEqual([]);
  });

  it("captions: three depths, Starter about 25 words, no em-dashes, steel never grows", () => {
    for (const s of story.scenes) {
      for (const d of ["explorer", "starter", "leader"] as const) {
        const t = s.caption[d];
        expect(t.length).toBeGreaterThan(20);
        expect(t).not.toMatch(/[—–]/);
        expect(t).not.toMatch(/!/);
        expect(t).not.toMatch(/\bgrows?\b/i);
        expect(t).not.toMatch(/\d/); // principle-based: no figures
      }
      expect(words(s.caption.starter)).toBeLessThanOrEqual(26);
    }
  });

  it("the founder's note is flagged as a draft in code only", async () => {
    expect(story.scenes.find((s) => s.id === "field")?.draft).toBe(true);
    expect(FIELD_NOTE.draft).toBe(true);
    const r = await render(wrap(story.scenes.findIndex((s) => s.id === "field")));
    expect(r.queryByText(/draft/i)).toBeNull();
    await r.unmount();
  });

  it("the guess scene asks first, takes any guess without judging it, then explains", async () => {
    const i = story.scenes.findIndex((s) => s.before);
    expect(i).toBeGreaterThanOrEqual(0);
    const scene = story.scenes[i];
    const r = await render(wrap(i));
    expect(r.getByText(scene.before!.starter)).toBeTruthy();
    await fireEvent.press(r.getByLabelText("Guess: get shorter"));
    await waitFor(() => expect(r.getByText(scene.caption.starter)).toBeTruthy());
    expect(r.queryByText(/wrong|correct|right answer/i)).toBeNull();
    await r.unmount();
  });

  it("the depth switch changes the caption", async () => {
    const r = await render(wrap(0));
    await fireEvent.press(r.getByLabelText("Leader"));
    expect(r.getByText(story.scenes[0].caption.leader)).toBeTruthy();
    await r.unmount();
  });

  it("adds the action to the Loop once", async () => {
    const r = await render(wrap(story.scenes.findIndex((s) => s.id === "move")));
    await fireEvent.press(r.getByLabelText("Add this action to Your week"));
    expect(useStore.getState().loop.items.filter((i) => i.text === lesson.lens.action)).toHaveLength(1);
    expect(r.queryByLabelText("Add this action to Your week")).toBeNull();
    await r.unmount();
  });

  it("the check is answered in the drawing and finishing credits the stop", async () => {
    const r = await render(wrap(story.scenes.length - 1));
    await fireEvent.press(r.getByLabelText("The gap where two rails meet"));
    await fireEvent.press(r.getByLabelText("Finish this stop"));
    const p = useStore.getState().progress;
    expect(p.completed).toContain("s1-01");
    expect(p.stop).toBe(2);
    expect(p.miles).toBe(12);
    expect(p.quizBest["s1-01"]).toBeUndefined();
    await r.unmount();
  });
});
