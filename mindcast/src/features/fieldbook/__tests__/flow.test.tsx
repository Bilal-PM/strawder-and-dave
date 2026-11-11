/**
 * The stamp flow on React Native's iOS code path: "I spotted it", one question, the stamp lands, hold to stick it in.
 * Also renders the Field Book with stamps in it, for Explorers and Leaders.
 */
import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("expo-router", () => {
  const pass = ({ children }: { children: React.ReactNode }) => children;
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
    useLocalSearchParams: () => ({}),
    useIsFocused: () => true,
    useFocusEffect: () => {},
    Link: Object.assign(pass, { Trigger: pass, Preview: () => null, AppleZoom: pass, AppleZoomTarget: pass, Menu: () => null, MenuAction: () => null }),
  };
});
jest.mock("react-native-worklets", () => ({}));
jest.mock("react-native-reanimated", () => require("../../../__tests__/mocks/reanimated"));
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: { Light: "l", Medium: "m" }, NotificationFeedbackType: { Success: "s", Warning: "w" } }));

import { useStore } from "@/state/store";
import { GroundworkTheme } from "@/ui/theme";
import { FieldBookScreen } from "../FieldBookScreen";
import { dayKey, entryByKey, questionFor } from "../logic";
import { pack } from "@/domain";
import { SetScreen } from "../SetScreen";
import { SpotIt } from "../SpotIt";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}><GroundworkTheme>{el}</GroundworkTheme></SafeAreaProvider>;

beforeAll(() => { globalThis.fetch = jest.fn(() => Promise.reject(new Error("offline"))) as never; });
beforeEach(() => { jest.useFakeTimers(); useStore.getState().reset(); useStore.getState().set(() => ({ onboarded: true })); });
afterEach(() => { jest.useRealTimers(); });

describe("the stamp flow", () => {
  it("spots, asks, stamps and sticks it in the book", async () => {
    const r = await render(wrap(<SpotIt itemId="sleeper" />));
    await fireEvent.press(r.getByLabelText("I spotted it: Sleeper"));
    expect(r.getByText("One quick question")).toBeTruthy();
    // The screen reader check resolves async and may swap the drawing question for a text one; answer whichever shows.
    const visits = 0;
    const q = questionFor(pack, entryByKey(pack, "sleeper")!, visits, dayKey());
    const radios = r.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    await fireEvent.press(radios[q.kind === "art" ? q.answer : 0]);
    await act(async () => { jest.advanceTimersByTime(700); });
    expect(useStore.getState().fieldbook.spots.sleeper?.grade).toBe(1);
    expect(r.getByText("Hold to stick it in the book")).toBeTruthy();
    expect(r.getByText(/more and the Track set is bronze\./)).toBeTruthy();
    await fireEvent(r.getByLabelText("Hold to stick it in the book"), "accessibilityAction", { nativeEvent: { actionName: "activate" } });
    expect(r.queryByText("Hold to stick it in the book")).toBeNull();
    expect(r.getByText("Bronze in your book.")).toBeTruthy();
    // once per day
    expect(r.queryByLabelText(/I spotted it|Spotted it again/)).toBeNull();
    await r.unmount();
  });

  it("stamps a place only after an honest 'I've been here' for Explorers", async () => {
    useStore.getState().set((s) => ({ profile: { ...s.profile, audience: "explorer" } }));
    const r = await render(wrap(<SpotIt itemId="place.glenfinnan-viaduct" />));
    expect(r.queryByText(/check and stamp/)).toBeNull();
    expect(r.getByText(/Location checks are off for Explorers/)).toBeTruthy();
    await fireEvent.press(r.getByLabelText(/I've been to Glenfinnan Viaduct/));
    await fireEvent.press(r.getByText("Yes, I've been"));
    const q = questionFor(pack, entryByKey(pack, "place.glenfinnan-viaduct")!, 0, dayKey());
    await fireEvent.press(r.getAllByRole("radio")[q.answer]);
    await act(async () => { jest.advanceTimersByTime(700); });
    expect(useStore.getState().fieldbook.spots["place.glenfinnan-viaduct"]?.grade).toBe(1);
    await r.unmount();
  });
});

describe("Field Book screens with stamps", () => {
  it.each(["leader", "explorer"] as const)("render for a %s", async (aud) => {
    useStore.getState().set((s) => ({ profile: { ...s.profile, audience: aud } }));
    useStore.getState().stampSpot("fishplate", true);
    useStore.getState().stampSpot("train.c66", true);
    useStore.getState().stampPractice("s1-01", "Kept a spare slot in the rota");
    const errors: unknown[] = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => { errors.push(String(a[0]).slice(0, 300)); });
    for (const el of [<FieldBookScreen key="fb" />, <SetScreen key="t" id="track" />, <SetScreen key="tr" id="trains" />]) {
      const r = await render(wrap(el));
      expect(r.toJSON()).toBeTruthy();
      await r.unmount();
    }
    spy.mockRestore();
    expect(errors.filter((e) => !String(e).includes("act("))).toEqual([]);
  });
});
