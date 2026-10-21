"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "@/app/lib/gameStore";
import { cellToWorld } from "./Maze";

export default function Goal() {
  const ring = useRef<THREE.Mesh>(null!);
  const goal = useGameStore((s) => s.maze.goal);
  const status = useGameStore((s) => s.status);
  const world = cellToWorld(goal.x, goal.y);

  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 1.5;
  });

  return (
    <group position={[world.x, 0.05, world.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.7, 48]} />
        <meshStandardMaterial
          color="#ffd66b"
          emissive="#ffb347"
          emissiveIntensity={2.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.72, 0.78, 48, 1, 0, Math.PI * 1.4]} />
        <meshStandardMaterial
          color="#ffe6a8"
          emissive="#ffd66b"
          emissiveIntensity={3.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight color="#ffcc66" intensity={3} distance={4} position={[0, 0.6, 0]} />
      <Sparkles
        count={status === "won" ? 80 : 24}
        size={status === "won" ? 8 : 4}
        scale={[1.4, 1.6, 1.4]}
        position={[0, 0.6, 0]}
        speed={status === "won" ? 1.4 : 0.5}
        color="#ffd66b"
      />
    </group>
  );
}
