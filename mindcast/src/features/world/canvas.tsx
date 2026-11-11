/** Web: react-three-fiber's DOM canvas. The native twin is canvas.native.tsx (expo-gl). */
import { Canvas } from "@react-three/fiber";
import React from "react";
import { StyleSheet, View } from "react-native";

export type GLCanvasProps = { children: React.ReactNode; frameloop: "always" | "never" };

export function GLCanvas({ children, frameloop }: GLCanvasProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas
        frameloop={frameloop}
        dpr={[1, 2]}
        flat
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 50, near: 0.3, far: 2600, position: [0, 60, 120] }}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Canvas>
    </View>
  );
}
