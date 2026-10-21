"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "@/app/lib/gameStore";

export const CELL = 2;
export const WALL_HEIGHT = 1.6;
export const WALL_THICKNESS = 0.18;

export function cellToWorld(x: number, y: number) {
  return new THREE.Vector3(x * CELL, 0, y * CELL);
}

export default function Maze() {
  const maze = useGameStore((s) => s.maze);

  const walls = useMemo(() => {
    const segments: { pos: [number, number, number]; rot: number; len: number }[] = [];
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const c = maze.cells[y][x];
        const cx = x * CELL;
        const cz = y * CELL;
        const half = CELL / 2;
        if (c.walls.n) {
          segments.push({
            pos: [cx, WALL_HEIGHT / 2, cz - half],
            rot: 0,
            len: CELL + WALL_THICKNESS,
          });
        }
        if (c.walls.s && y === maze.height - 1) {
          segments.push({
            pos: [cx, WALL_HEIGHT / 2, cz + half],
            rot: 0,
            len: CELL + WALL_THICKNESS,
          });
        }
        if (c.walls.w) {
          segments.push({
            pos: [cx - half, WALL_HEIGHT / 2, cz],
            rot: Math.PI / 2,
            len: CELL + WALL_THICKNESS,
          });
        }
        if (c.walls.e && x === maze.width - 1) {
          segments.push({
            pos: [cx + half, WALL_HEIGHT / 2, cz],
            rot: Math.PI / 2,
            len: CELL + WALL_THICKNESS,
          });
        }
      }
    }
    return segments;
  }, [maze]);

  const floorSize = Math.max(maze.width, maze.height) * CELL;
  const floorCenter: [number, number, number] = [
    ((maze.width - 1) * CELL) / 2,
    -0.01,
    ((maze.height - 1) * CELL) / 2,
  ];

  return (
    <group>
      <mesh
        position={floorCenter}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[floorSize + 4, floorSize + 4]} />
        <meshStandardMaterial color="#1c1230" roughness={0.95} />
      </mesh>
      {walls.map((w, i) => (
        <mesh key={i} position={w.pos} rotation={[0, w.rot, 0]} castShadow receiveShadow>
          <boxGeometry args={[w.len, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial
            color="#6a3aff"
            emissive="#3b1f8a"
            emissiveIntensity={0.35}
            roughness={0.45}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}
