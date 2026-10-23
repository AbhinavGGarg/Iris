"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { NEIGHBORS } from "@/app/lib/gardenStories";
import { useGardenStore } from "@/app/lib/gardenStore";
import NeighborCharacter from "./NeighborCharacter";
import {
  faceCenterYaw,
  flowerPatchPos,
  HOUSE_RADIUS,
  housePos,
  NEIGHBOR_ANGLES,
  neighborAngle,
  neighborPos,
  polar,
  RING_RADIUS,
} from "./positions";

export default function GardenWorld() {
  const flowers = useGardenStore((s) => s.flowers);
  const status = useGardenStore((s) => s.status);
  const neighborIndex = useGardenStore((s) => s.neighborIndex);

  return (
    <>
      <Ground />
      <Pond />
      <Trees />
      {NEIGHBORS.map((n, i) => {
        const helped = i < flowers;
        return (
          <group key={n.name}>
            <House index={i} />
            <NeighborCharacter
              neighbor={n}
              feeling={helped ? "happy" : n.feeling}
              position={neighborPos(i)}
              yaw={faceCenterYaw(neighborAngle(i))}
              celebrating={status === "won" || (status === "helped" && i === neighborIndex)}
              phase={i * 1.7}
            />
            <FlowerPatch index={i} bloomed={helped} />
          </group>
        );
      })}
    </>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#a8d98a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[RING_RADIUS - 0.75, RING_RADIUS + 0.75, 72]} />
        <meshStandardMaterial color="#f0dfb8" roughness={1} />
      </mesh>
      {NEIGHBOR_ANGLES.map((a) => {
        const [x, , z] = polar(a, (RING_RADIUS + HOUSE_RADIUS) / 2 + 0.3);
        return (
          <mesh key={a} rotation={[-Math.PI / 2, 0, -a]} position={[x, 0.012, z]} receiveShadow>
            <planeGeometry args={[0.9, HOUSE_RADIUS - RING_RADIUS - 0.6]} />
            <meshStandardMaterial color="#f0dfb8" roughness={1} />
          </mesh>
        );
      })}
    </>
  );
}

function Pond() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[2.1, 48]} />
        <meshStandardMaterial color="#d9cfc0" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[1.7, 48]} />
        <meshStandardMaterial color="#7cc7ec" roughness={0.2} metalness={0.1} />
      </mesh>
      {[0.4, 2.1, 3.9, 5.2].map((a, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[Math.cos(a) * 0.9, 0.05, Math.sin(a) * 0.8]}>
          <circleGeometry args={[0.22, 16]} />
          <meshStandardMaterial color="#6fbf6a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function House({ index }: { index: number }) {
  const n = NEIGHBORS[index]!;
  const angle = NEIGHBOR_ANGLES[index]!;
  return (
    <group position={housePos(index)} rotation={[0, faceCenterYaw(angle), 0]}>
      <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[2.4, 1.7, 1.9]} />
        <meshStandardMaterial color="#fff6e8" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 2.25, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.9, 1.2, 4]} />
        <meshStandardMaterial color={n.accent} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0.96]}>
        <boxGeometry args={[0.55, 1, 0.04]} />
        <meshStandardMaterial color="#8a5a3c" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.75, 1.05, 0.96]}>
          <boxGeometry args={[0.45, 0.45, 0.04]} />
          <meshStandardMaterial color="#bfe6ff" emissive="#ffe9a8" emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function FlowerPatch({ index, bloomed }: { index: number; bloomed: boolean }) {
  const n = NEIGHBORS[index]!;
  const group = useRef<THREE.Group>(null!);
  const grow = useRef(bloomed ? 1 : 0);
  const spots = useMemo(
    () => [
      [0, 0],
      [0.3, 0.18],
      [-0.28, 0.2],
      [0.18, -0.26],
      [-0.2, -0.22],
    ],
    [],
  );

  useFrame((_, delta) => {
    const target = bloomed ? 1 : 0;
    grow.current += (target - grow.current) * Math.min(1, delta * 2.5);
    if (group.current) {
      const g = grow.current;
      const overshoot = g < 0.98 ? g * (1 + 0.25 * Math.sin(g * Math.PI)) : g;
      group.current.scale.setScalar(Math.max(0.0001, overshoot));
    }
  });

  return (
    <group position={flowerPatchPos(index)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.6, 24]} />
        <meshStandardMaterial color="#8b6446" roughness={1} />
      </mesh>
      {spots.map(([x, z], i) => (
        <mesh key={`sprout${i}`} position={[x!, 0.08, z!]}>
          <coneGeometry args={[0.04, 0.14, 5]} />
          <meshStandardMaterial color="#5fae55" />
        </mesh>
      ))}
      <group ref={group}>
        {spots.map(([x, z], i) => {
          const h = 0.45 + (i % 3) * 0.12;
          return (
            <group key={i} position={[x!, 0, z!]}>
              <mesh position={[0, h / 2, 0]}>
                <cylinderGeometry args={[0.02, 0.025, h, 6]} />
                <meshStandardMaterial color="#4c9a46" />
              </mesh>
              <group position={[0, h, 0]}>
                {[0, 1, 2, 3, 4].map((p) => {
                  const a = (p / 5) * Math.PI * 2;
                  return (
                    <mesh key={p} position={[Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09]} scale={[1, 0.45, 1]}>
                      <sphereGeometry args={[0.075, 10, 10]} />
                      <meshStandardMaterial color={i % 2 ? n.accent : "#ff8fb1"} roughness={0.7} />
                    </mesh>
                  );
                })}
                <mesh>
                  <sphereGeometry args={[0.06, 10, 10]} />
                  <meshStandardMaterial color="#ffd23f" emissive="#ffb300" emissiveIntensity={0.25} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

const TREE_SPOTS: [number, number, number][] = [
  [-0.05, 11.5, 1.1], [0.35, 13, 0.9], [1.2, 12, 1.2], [1.55, 14, 1], [2.0, 11.2, 0.9],
  [2.75, 12.5, 1.15], [3.3, 13.5, 1], [-1.2, 12.2, 1], [-1.55, 14.2, 1.2], [-2.0, 11.4, 0.95],
  [-2.75, 13, 1.1], [-3.3, 12, 0.9], [0.8, 16, 1.3], [-0.6, 17, 1.2], [2.4, 16.5, 1.3], [-2.3, 16, 1.25],
];

function Trees() {
  return (
    <>
      {TREE_SPOTS.map(([a, r, s], i) => {
        const [x, , z] = polar(a, r);
        return (
          <group key={i} position={[x, 0, z]} scale={s}>
            <mesh castShadow position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
              <meshStandardMaterial color="#8a6040" roughness={1} />
            </mesh>
            <mesh castShadow position={[0, 1.5, 0]}>
              <sphereGeometry args={[0.9, 14, 14]} />
              <meshStandardMaterial color={i % 3 === 0 ? "#6fbf5f" : i % 3 === 1 ? "#5aae55" : "#7fcc6a"} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
