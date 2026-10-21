"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useForestStore } from "@/app/lib/forestStore";
import { NODE_POSITIONS } from "./ForestPath";

export default function TreasureChest() {
  const status = useForestStore((s) => s.status);
  const keys = useForestStore((s) => s.keys);
  const won = status === "won";
  const [x, y, z] = NODE_POSITIONS[NODE_POSITIONS.length - 1];

  const lidRef = useRef<THREE.Group>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const lidAngle = useRef(0);

  useFrame((_, delta) => {
    const targetAngle = won ? -Math.PI * 0.7 : 0;
    lidAngle.current += (targetAngle - lidAngle.current) * Math.min(1, delta * 3);
    if (lidRef.current) lidRef.current.rotation.x = lidAngle.current;
    if (lightRef.current) {
      const targetIntensity = won ? 6 : 0.8;
      lightRef.current.intensity += (targetIntensity - lightRef.current.intensity) * Math.min(1, delta * 3);
    }
  });

  return (
    <group position={[x, y, z - 1]}>
      <pointLight ref={lightRef} color="#ffd700" intensity={0.8} distance={8} decay={2} />

      {/* Chest base */}
      <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[0.9, 0.5, 0.6]} />
        <meshStandardMaterial color="#5a3a18" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Gold trim band around base */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.92, 0.08, 0.62]} />
        <meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.2} emissive="#7a5000" emissiveIntensity={0.4} />
      </mesh>

      {/* Chest lid — pivots from back edge */}
      <group ref={lidRef} position={[0, 0.5, -0.3]}>
        <mesh castShadow position={[0, 0.15, 0.3]}>
          <boxGeometry args={[0.9, 0.28, 0.6]} />
          <meshStandardMaterial color="#6a4520" roughness={0.85} metalness={0.05} />
        </mesh>
        {/* Lid gold trim */}
        <mesh position={[0, 0.02, 0.3]}>
          <boxGeometry args={[0.92, 0.06, 0.62]} />
          <meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.2} emissive="#7a5000" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Latch */}
      <mesh position={[0, 0.42, 0.3]} castShadow>
        <boxGeometry args={[0.12, 0.14, 0.06]} />
        <meshStandardMaterial color="#d4a017" metalness={0.9} roughness={0.1} emissive="#7a5000" emissiveIntensity={0.5} />
      </mesh>

      {/* Gold coins spilling out when won */}
      {won && (
        <>
          {[[-0.15, 0.52, 0.1], [0.1, 0.54, 0.15], [-0.05, 0.56, 0.05], [0.2, 0.51, 0.08], [-0.22, 0.53, 0.18]].map(([cx, cy, cz], i) => (
            <mesh key={i} position={[cx, cy, cz]} rotation={[Math.PI / 2, 0, i * 0.8]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
              <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} emissive="#b8860b" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </>
      )}

      {/* Key counter display — floating above chest */}
      <group position={[0, 1.2, 0]}>
        <mesh>
          <planeGeometry args={[0.8, 0.35]} />
          <meshStandardMaterial color="#000000" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Sparkles — more when won */}
      <Sparkles
        count={won ? 80 : keys > 0 ? 20 : 8}
        scale={[1.5, 1.5, 1.5]}
        size={won ? 4 : 2}
        speed={won ? 0.6 : 0.2}
        color={won ? "#ffd700" : "#d4a017"}
        opacity={0.9}
        position={[0, 0.6, 0]}
      />
    </group>
  );
}
