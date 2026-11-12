/**
 * Platform-neutral parts of the 3D viewer: model building, orbit state, gestures and controls.
 * Viewer3D.tsx (web) and Viewer3D.native.tsx (iPhone, expo-gl) supply the react-three-fiber Canvas.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, View, type GestureResponderEvent } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type * as THREE from "three";
import { Body, Button, Row } from "@/ui/kit";
import { PencilLoader } from "@/ui/PencilLoader";
import { useTheme } from "@/ui/theme";
import { radius } from "@/ui/tokens";
import { build3D, type Built } from "./build3d";
import { INK, type DrawSpec, type Livery } from "./model";

export type Orbit = { yaw: number; pitch: number; zoom: number; spin: boolean; invalidate?: () => void };
export type ViewerProps = { spec: DrawSpec; livery: Livery; label: string; height?: number };
export type CanvasRenderer = (args: { orbit: React.RefObject<Orbit>; built: Built; bg: string; onReady: () => void }) => React.ReactNode;

const HOME = { yaw: 0.65, pitch: 0.28, zoom: 1 };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Place the camera from the orbit state. Called every rendered frame. */
export function applyCamera(cam: THREE.Camera, o: Orbit, w: number, h: number, built: Built) {
  const aspect = w / Math.max(1, h);
  const d = (Math.max(built.len * 0.95, 14) / (2 * Math.tan((15 * Math.PI) / 180))) * 0.62 * o.zoom * Math.max(1, 1.6 / aspect);
  const cy = built.h * 0.45;
  cam.position.set(Math.sin(o.yaw) * Math.cos(o.pitch) * d, cy + Math.sin(o.pitch) * d, Math.cos(o.yaw) * Math.cos(o.pitch) * d);
  cam.lookAt(0, cy, 0);
}

/** Advance the spin; returns true while spinning (so the caller asks for another frame). */
export function stepSpin(o: Orbit, dt: number) {
  if (!o.spin) return false;
  o.yaw += Math.min(dt, 0.05) * 0.25;
  return true;
}

class Boundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode; onFail?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { if (__DEV__) console.warn("3D view failed", e); this.props.onFail?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const dist = (e: GestureResponderEvent) => {
  const t = e.nativeEvent.touches;
  if (!t || t.length < 2) return 0;
  return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
};

export function ViewerFrame({ spec, livery, label, height = 300, renderCanvas }: ViewerProps & { renderCanvas: CanvasRenderer }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const orbit = useRef<Orbit>({ ...HOME, spin: !reduced });
  const [spin, setSpinState] = useState(!reduced);
  // The GL context takes a moment to start (longer on older phones): the pencil shows until it does.
  const [ready, setReady] = useState(false);
  const built = useMemo(() => build3D(spec, livery, { ink: INK, labels: Platform.OS === "web" }), [spec, livery]);
  useEffect(() => () => built.dispose(), [built]);
  useEffect(() => { orbit.current.invalidate?.(); }, [built]);

  const kick = () => orbit.current.invalidate?.();
  const setSpin = (v: boolean) => { orbit.current.spin = v; setSpinState(v); kick(); };
  const setView = (v: Partial<Orbit>) => { Object.assign(orbit.current, v); setSpin(false); };

  // drag to orbit, pinch to zoom
  const start = useRef({ yaw: 0, pitch: 0, zoom: 1, d: 0 });
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const o = orbit.current;
      start.current = { yaw: o.yaw, pitch: o.pitch, zoom: o.zoom, d: dist(e) };
      if (o.spin) { o.spin = false; setSpinState(false); }
    },
    onPanResponderMove: (e, g) => {
      const o = orbit.current, d = dist(e);
      if (d > 0) {
        if (!start.current.d) start.current = { yaw: o.yaw, pitch: o.pitch, zoom: o.zoom, d };
        o.zoom = clamp((start.current.zoom * start.current.d) / d, 0.35, 2.2);
      } else {
        o.yaw = start.current.yaw - g.dx * 0.008;
        o.pitch = clamp(start.current.pitch + g.dy * 0.006, 0.02, 1.25);
      }
      o.invalidate?.();
    },
  }), []);

  // mouse wheel zoom on the web build
  const overlay = useRef<React.ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = overlay.current as unknown as HTMLElement | null;
    if (!el || !el.addEventListener) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const o = orbit.current; o.zoom = clamp(o.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.35, 2.2); o.invalidate?.(); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fallback = (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Body center>This device can't show the 3D view. The side view still works.</Body>
    </View>
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={{ height, borderRadius: radius.l, overflow: "hidden", borderWidth: 1, borderColor: c.line, backgroundColor: c.bg }}>
        <Boundary fallback={fallback} onFail={() => setReady(true)}>{renderCanvas({ orbit, built, bg: c.bg, onReady: () => setReady(true) })}</Boundary>
        {!ready && (
          <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
            <PencilLoader label="Drawing the 3D model" />
          </View>
        )}
        <View
          ref={overlay}
          {...pan.panHandlers}
          style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${label}, 3D model. Drag to turn it, pinch to zoom.`}
          accessibilityActions={[{ name: "increment", label: "Turn right" }, { name: "decrement", label: "Turn left" }]}
          onAccessibilityAction={(e) => { const o = orbit.current; o.yaw += e.nativeEvent.actionName === "increment" ? 0.3 : -0.3; setSpin(false); }}
        />
      </View>
      <Row wrap gap={8}>
        <Button small label={spin ? "Pause spin" : "Spin"} accessibilityLabel={spin ? "Pause spinning" : "Spin the model"} onPress={() => setSpin(!spin)} />
        <Button small label="Side on" accessibilityLabel="Show the side view" onPress={() => setView({ yaw: 0, pitch: 0.06 })} />
        <Button small label="Front three-quarter" accessibilityLabel="Show the front three-quarter view" onPress={() => setView({ yaw: -1.25, pitch: 0.2 })} />
        <Button small label="Reset" accessibilityLabel="Reset the view" onPress={() => setView({ ...HOME })} />
        <Button small label="+" accessibilityLabel="Zoom in" onPress={() => { orbit.current.zoom = clamp(orbit.current.zoom * 0.85, 0.35, 2.2); kick(); }} />
        <Button small label="−" accessibilityLabel="Zoom out" onPress={() => { orbit.current.zoom = clamp(orbit.current.zoom / 0.85, 0.35, 2.2); kick(); }} />
      </Row>
    </View>
  );
}
