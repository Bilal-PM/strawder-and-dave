/**
 * iOS: react-three-fiber's native canvas on expo-gl (works in Expo Go).
 * expo-gl always renders at the screen's native pixel ratio, so `dpr` is not configurable here.
 * Touches go to our own gesture layer above, so the canvas itself ignores them.
 */
import { Canvas } from "@react-three/fiber/native";
import React from "react";
import { StyleSheet } from "react-native";

export type GLCanvasProps = { children: React.ReactNode; frameloop: "always" | "never" };

export function GLCanvas({ children, frameloop }: GLCanvasProps) {
  return (
    <Canvas
      frameloop={frameloop}
      flat
      pointerEvents="none"
      camera={{ fov: 50, near: 0.3, far: 2600, position: [0, 60, 120] }}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </Canvas>
  );
}
