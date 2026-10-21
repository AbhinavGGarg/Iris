"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import ForestPath from "./ForestPath";
import ForestCharacter from "./ForestCharacter";
import TreasureChest from "./TreasureChest";
import ForestCameraRig from "./ForestCameraRig";
import PathArrow from "./PathArrow";

export default function ForestScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 7, 12], fov: 55 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0a1a0a"]} />
      <fog attach="fog" args={["#0d1f0d", 18, 45]} />

      <ambientLight intensity={0.35} color="#a8d8a8" />
      <hemisphereLight args={["#5a9a5a", "#1a2a0a", 0.6]} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.5}
        color="#f5f0d8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-far={80}
      />
      {/* Soft fill from opposite side */}
      <directionalLight position={[-6, 8, -10]} intensity={0.4} color="#8ab88a" />

      <Suspense fallback={null}>
        <Environment preset="forest" />
        <ForestPath />
        <ForestCharacter />
        <TreasureChest />
        <PathArrow />

        {/* Fireflies ambient particles */}
        <Sparkles
          count={60}
          scale={[30, 5, 30]}
          size={3}
          speed={0.15}
          color="#aaff88"
          opacity={0.6}
          position={[0, 2, -12]}
        />
        <Sparkles
          count={30}
          scale={[20, 4, 20]}
          size={2}
          speed={0.1}
          color="#ffdd88"
          opacity={0.4}
          position={[0, 1.5, -22]}
        />
      </Suspense>

      <ForestCameraRig />

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.5}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
