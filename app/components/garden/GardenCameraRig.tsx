"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGardenStore } from "@/app/lib/gardenStore";
import { NEIGHBOR_ANGLES, NEIGHBOR_COUNT, polar, RING_RADIUS } from "./positions";

const desired = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

/** Stands near the pond and looks out at the current neighbor; pulls up high for the party. */
export default function GardenCameraRig() {
  const { camera } = useThree();
  const neighborIndex = useGardenStore((s) => s.neighborIndex);
  const status = useGardenStore((s) => s.status);
  const look = useRef(new THREE.Vector3());
  const ready = useRef(false);

  useFrame((_, delta) => {
    if (status === "won" || neighborIndex >= NEIGHBOR_COUNT) {
      desired.set(0, 11, 10.5);
      lookTarget.set(0, 0, 0);
    } else {
      const a = NEIGHBOR_ANGLES[neighborIndex]!;
      desired.set(...polar(a, -0.8, 2.3));
      lookTarget.set(...polar(a, RING_RADIUS, -0.55));
    }
    const k = ready.current ? Math.min(1, delta * 1.8) : 1;
    camera.position.lerp(desired, k);
    look.current.lerp(lookTarget, k);
    camera.lookAt(look.current);
    ready.current = true;
  });

  return null;
}
