/**
 * The shared hand-drawn pieces: the scribbled tick, the pencil loader, ruled paper and the delay reason line.
 * Rendered through the iOS code path with reduce motion on (the reanimated mock reports it), so nothing animates.
 */
import { render } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock("react-native-worklets", () => ({}));
jest.mock("react-native-reanimated", () => require("./mocks/reanimated"));
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import { reasonLine } from "@/features/today/components/DeparturesCard";
import { PencilLoader } from "@/ui/PencilLoader";
import { RuledInput } from "@/ui/Ruled";
import { longestSubpath, ScribbleTick } from "@/ui/ScribbleTick";

const paths = (r: { toJSON: () => unknown }) => (JSON.stringify(r.toJSON()).match(/"RNSVGPath"/g) ?? []).length;

describe("ScribbleTick", () => {
  it("shows its children and no mark when unchecked", async () => {
    const r = await render(<ScribbleTick checked={false}><Text>A</Text></ScribbleTick>);
    // The mark is decoration (hidden from screen readers); the parent carries the role and state.
    expect(r.getByText("A", { includeHiddenElements: true })).toBeTruthy();
  });

  it("draws hatching and a tick when checked, and hides the children", async () => {
    const off = await render(<ScribbleTick checked={false} />);
    const on = await render(<ScribbleTick checked><Text>A</Text></ScribbleTick>);
    expect(on.queryByText("A", { includeHiddenElements: true })).toBeNull();
    // Checked adds the hatch strokes and the tick on top of the outline.
    expect(paths(on)).toBeGreaterThan(paths(off));
  });

  it("can draw only the mark (no shading) for the right answer you did not pick", async () => {
    const shaded = await render(<ScribbleTick checked shape="circle" />);
    const plain = await render(<ScribbleTick checked shape="circle" shade={false} />);
    expect(paths(plain)).toBeLessThan(paths(shaded));
  });

  it("measures the longest subpath of a rough path for the draw-on dash", () => {
    expect(longestSubpath("M0 0 L10 0 M0 0 L0 30")).toBeGreaterThanOrEqual(30);
    expect(longestSubpath("M0 0 C10 0, 20 0, 30 0")).toBeGreaterThanOrEqual(30);
  });
});

describe("PencilLoader", () => {
  it("renders the label and is announced as progress", async () => {
    const r = await render(<PencilLoader label="Fetching the departure board" />);
    expect(r.getByText("Fetching the departure board")).toBeTruthy();
    expect(r.getByLabelText("Fetching the departure board").props.accessibilityRole).toBe("progressbar");
  });

  it("renders on the dark board too", async () => {
    const r = await render(<PencilLoader tone="board" label="Building the line" />);
    expect(r.getByText("Building the line")).toBeTruthy();
  });
});

describe("RuledInput", () => {
  it("is a text field with its accessibility label", async () => {
    const r = await render(<RuledInput accessibilityLabel="What did you notice?" lines={2} value="" onChangeText={() => {}} />);
    expect(r.getByLabelText("What did you notice?")).toBeTruthy();
  });
});

describe("delay reason line", () => {
  it("leads with the status and reads as one plain line", () => {
    expect(reasonLine({ status: "late", reason: "A fault with the signalling system" })).toBe("Late: a fault with the signalling system");
    expect(reasonLine({ status: "delayed", reason: "Slippery rails" })).toBe("Delayed: slippery rails");
    expect(reasonLine({ status: "cancelled", reason: "A broken rail" })).toBe("Cancelled: a broken rail");
  });
  it("keeps names and acronyms as written", () => {
    expect(reasonLine({ status: "late", reason: "Network Rail engineering works" })).toBe("Late: Network Rail engineering works");
    expect(reasonLine({ status: "late", reason: "BTP dealing with an incident" })).toBe("Late: BTP dealing with an incident");
  });
  it("says nothing without a reason", () => {
    expect(reasonLine({ status: "on-time", reason: null })).toBeNull();
  });
});
