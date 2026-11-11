/** 3D viewer. iPhone: react-three-fiber on expo-gl (works in Expo Go). Nameplate textures are skipped here (no 2D canvas); colours still apply. */
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import React, { useEffect } from "react";
import type { Built } from "./build3d";
import { applyCamera, stepSpin, ViewerFrame, type Orbit, type ViewerProps } from "./ViewerFrame";

function Scene({ orbit, built, bg }: { orbit: React.RefObject<Orbit>; built: Built; bg: string }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    orbit.current.invalidate = () => invalidate();
    invalidate();
    return () => { orbit.current.invalidate = undefined; };
  }, [invalidate, orbit]);
  useFrame((state, dt) => {
    if (stepSpin(orbit.current, dt)) state.invalidate();
    applyCamera(state.camera, orbit.current, state.size.width, state.size.height, built);
  });
  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[8, 14, 10]} intensity={1.6} />
      <primitive object={built.group} />
    </>
  );
}

export default function Viewer3D(props: ViewerProps) {
  return (
    <ViewerFrame
      {...props}
      renderCanvas={(a) => (
        <Canvas flat frameloop="demand" camera={{ fov: 30, near: 0.1, far: 400, position: [12, 6, 20] }} style={{ flex: 1 }}>
          <Scene {...a} />
        </Canvas>
      )}
    />
  );
}
