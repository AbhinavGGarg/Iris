"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useForestStore } from "@/app/lib/forestStore";
import { NODE_POSITIONS } from "./ForestPath";

export default function PathArrow() {
  const stepCredits = useForestStore((s) => s.stepCredits);
  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const status = useForestStore((s) => s.status);
  const arrowRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);

  // Place arrow halfway between current node and next node
  const current = NODE_POSITIONS[Math.min(nodeIndex, NODE_POSITIONS.length - 1)];
  const nextIdx = Math.min(nodeIndex + 1, NODE_POSITIONS.length - 1);
  const next = NODE_POSITIONS[nextIdx];
  const mx = (current[0] + next[0]) / 2;
  const mz = (current[2] + next[2]) / 2;

  // Face direction of travel
  const dx = next[0] - current[0];
  const dz = next[2] - current[2];
  const yaw = Math.atan2(dx, dz);

  useFrame(({ clock }) => {
    if (!arrowRef.current) return;
    const t = clock.getElapsedTime();
    // Bob up and down
    arrowRef.current.position.y = 0.5 + Math.sin(t * 2.5) * 0.12;
    // Pulse glow
    if (glowRef.current) {
      glowRef.current.intensity = 2 + Math.sin(t * 3) * 0.6;
    }
    arrowRef.current.rotation.y = yaw;
  });

  if (stepCredits <= 0 || status === "walking" || status === "won") return null;

  return (
    <group position={[mx, 0, mz]}>
      <pointLight ref={glowRef} color="#00ff88" intensity={2} distance={5} decay={2} />

      <group ref={arrowRef} rotation={[0, yaw, 0]}>
        {/* Arrow shaft */}
        <mesh castShadow position={[0, 0, 0.1]}>
          <boxGeometry args={[0.18, 0.18, 0.7]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00cc66"
            emissiveIntensity={1.5}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>

        {/* Arrow head (cone pointing forward = -z in local space) */}
        <mesh castShadow position={[0, 0, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.28, 0.5, 8]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00cc66"
            emissiveIntensity={1.5}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>

        {/* Outer glow ring at base */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
          <ringGeometry args={[0.35, 0.55, 32]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={2}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

    </group>
  );
}
