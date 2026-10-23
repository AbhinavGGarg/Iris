"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useGardenStore } from "@/app/lib/gardenStore";
import GardenWorld from "./GardenWorld";
import GardenBuddy from "./GardenBuddy";
import GardenCameraRig from "./GardenCameraRig";

export default function GardenScene() {
  const status = useGardenStore((s) => s.status);

  return (
    <Canvas shadows camera={{ position: [0, 2.5, 0], fov: 55 }} dpr={[1, 2]}>
      <color attach="background" args={["#cdebff"]} />
      <fog attach="fog" args={["#e3f3ff", 16, 38]} />

      <hemisphereLight args={["#fff6e0", "#8cc472", 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 12, 4]}
        intensity={1.6}
        color="#fff3d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-far={40}
      />

      <Suspense fallback={null}>
        <GardenWorld />
        <GardenBuddy />
        <Sparkles count={40} scale={[22, 4, 22]} size={2.5} speed={0.2} color="#fff1a8" opacity={0.6} position={[0, 2, 0]} />
        {status === "won" && (
          <Sparkles count={160} scale={[12, 6, 12]} size={7} speed={0.6} color="#ff9fc4" position={[0, 2.5, 0]} />
        )}
      </Suspense>

      <GardenCameraRig />
    </Canvas>
  );
}
