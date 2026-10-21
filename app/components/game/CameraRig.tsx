"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/app/lib/gameStore";
import type { Facing } from "@/app/lib/maze";
import { cellToWorld } from "./Maze";

const FACING_VEC: Record<Facing, [number, number]> = {
  e: [1, 0],
  s: [0, 1],
  w: [-1, 0],
  n: [0, -1],
};

const BACK_DISTANCE = 4.5;
const HEIGHT = 3.0;
const LERP = 4;

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const target = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());

  const pos = useGameStore((s) => s.pos);
  const facing = useGameStore((s) => s.facing);

  useFrame((_, delta) => {
    const playerWorld = cellToWorld(pos.x, pos.y);
    const [fx, fz] = FACING_VEC[facing];

    desired.current.set(
      playerWorld.x - fx * BACK_DISTANCE,
      HEIGHT,
      playerWorld.z - fz * BACK_DISTANCE,
    );
    target.current.set(playerWorld.x, 0.7, playerWorld.z);

    const k = 1 - Math.exp(-LERP * delta);
    camera.position.lerp(desired.current, k);
    camera.lookAt(target.current);
  });

  return null;
}
