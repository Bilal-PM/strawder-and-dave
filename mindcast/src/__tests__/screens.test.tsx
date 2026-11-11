/**
 * Smoke test: every screen renders through React Native's iOS code path (jest-expo, Platform.OS = "ios"),
 * not the web build. Catches crashes on first draw in native-only files. GL is stubbed because there is no GPU in CI.
 */
import { render } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => {
  const R = require("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => mockParams,
    useIsFocused: () => true,
    useFocusEffect: (fn: () => void) => R.useEffect(fn, []),
    Redirect: () => null,
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: Object.assign(() => null, { Screen: () => null }),
  };
});
jest.mock("react-native-worklets", () => ({}));
jest.mock("react-native-reanimated", () => require("./mocks/reanimated"));
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@react-three/fiber/native", () => { const { View } = require("react-native"); return { Canvas: () => <View testID="gl-canvas" />, useFrame: () => {}, useThree: () => ({}) }; });
jest.mock("expo-gl", () => ({ GLView: () => null }));

import { GroundworkTheme } from "@/ui/theme";
import { useStore } from "@/state/store";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const screens: [string, () => { default: React.ComponentType }, Record<string, string>][] = [
  ["Today", () => require("@/app/(tabs)/index"), {}],
  ["Line", () => require("@/app/(tabs)/line"), {}],
  ["Mindcast", () => require("@/app/(tabs)/mindcast"), {}],
  ["Trains", () => require("@/app/(tabs)/trains"), {}],
  ["You", () => require("@/app/(tabs)/you"), {}],
  ["Lesson s1-01", () => require("@/app/lesson/[id]"), { id: "s1-01" }],
  ["Lesson s1-08", () => require("@/app/lesson/[id]"), { id: "s1-08" }],
  ["Lesson s1-20", () => require("@/app/lesson/[id]"), { id: "s1-20" }],
  ["Cast", () => require("@/app/cast/[id]"), { id: "s1-08-lens" }],
  ["Cast composer", () => require("@/app/cast/new"), {}],
  ["Train Class 66", () => require("@/app/train/[id]"), { id: "c66" }],
  ["Train A4", () => require("@/app/train/[id]"), { id: "a4" }],
  ["Explore", () => require("@/app/explore"), {}],
  ["Open Line", () => require("@/app/world"), {}],
  ["Pass", () => require("@/app/pass"), {}],
  ["Postcard", () => require("@/app/postcard"), {}],
  ["Onboarding", () => require("@/app/onboarding"), {}],
];

beforeAll(() => {
  globalThis.fetch = jest.fn(() => Promise.reject(new Error("offline in tests"))) as never;
  useStore.getState().set(() => ({ onboarded: true }));
});

jest.setTimeout(30000);
describe("every screen renders on the iOS code path", () => {
  it.each(screens)("%s", async (_name, load, p) => {
    mockParams = p;
    const Screen = load().default;
    const errors: unknown[] = [];
    const spy = jest.spyOn(console, "error").mockImplementation((...a) => { errors.push(String(a[0]).slice(0, 400)); });
    const r = await render(<SafeAreaProvider initialMetrics={metrics}><GroundworkTheme><Screen /></GroundworkTheme></SafeAreaProvider>);
    expect(r.toJSON()).toBeTruthy();
    await r.unmount(); spy.mockRestore();
    expect(errors.filter((e) => !String(e).includes("act("))).toEqual([]);
  });
});
