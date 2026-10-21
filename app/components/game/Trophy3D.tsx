"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type * as THREE from "three";

const GOLD = {
  color: "#FFD700" as const,
  metalness: 0.92,
  roughness: 0.08,
  emissive: "#7a4e00" as const,
  emissiveIntensity: 0.18,
};

const BRIGHT_GOLD = {
  color: "#FFE566" as const,
  metalness: 0.97,
  roughness: 0.04,
  emissive: "#aa7700" as const,
  emissiveIntensity: 0.25,
};

function TrophyModel() {
  const group = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    group.current.rotation.y += delta * 0.9;
  });

  return (
    <group ref={group} position={[0, -0.54, 0]}>
      {/* Cup bowl — wider at top */}
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.58, 0.28, 0.82, 40]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Rim ring */}
      <mesh position={[0, 1.19, 0]}>
        <torusGeometry args={[0.58, 0.045, 18, 52]} />
        <meshStandardMaterial {...BRIGHT_GOLD} />
      </mesh>

      {/* Left handle — half-torus curving out */}
      <mesh position={[-0.44, 0.84, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.19, 0.042, 14, 36, Math.PI]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Right handle */}
      <mesh position={[0.44, 0.84, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.19, 0.042, 14, 36, Math.PI]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Stem — tapered column */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.075, 0.115, 0.56, 20]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Base upper tier */}
      <mesh position={[0, -0.11, 0]}>
        <cylinderGeometry args={[0.37, 0.37, 0.15, 36]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Base lower tier */}
      <mesh position={[0, -0.23, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 36]} />
        <meshStandardMaterial {...BRIGHT_GOLD} />
      </mesh>

      {/* Star orb on top */}
      <mesh position={[0, 1.36, 0]}>
        <sphereGeometry args={[0.095, 20, 20]} />
        <meshStandardMaterial {...BRIGHT_GOLD} />
      </mesh>
    </group>
  );
}

export default function Trophy3D() {
  return (
    <Canvas
      camera={{ position: [0, 0.15, 3.6], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 7, 4]} intensity={2.2} color="#fff8e0" />
      <pointLight position={[-3, 3, 2]} intensity={1.4} color="#ffd700" />
      <pointLight position={[3, -1, 2]} intensity={0.6} color="#ff9900" />

      <TrophyModel />

      <Environment preset="studio" />

      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.65}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}