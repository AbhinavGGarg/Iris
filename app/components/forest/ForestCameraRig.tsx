"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useForestStore } from "@/app/lib/forestStore";
import { NODE_POSITIONS } from "./ForestPath";

const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

export default function ForestCameraRig() {
  const { camera } = useThree();
  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const initialized = useRef(false);

  useFrame((_, delta) => {
    const [nx, ny, nz] = NODE_POSITIONS[Math.min(nodeIndex, NODE_POSITIONS.length - 1)];
    _target.set(nx, ny, nz);

    // Camera sits behind and above the current node, looking forward along path
    _desired.set(nx, ny + 7, nz + 10);
    _lookAt.set(nx, ny + 1, nz - 6);

    const k = Math.min(1, delta * (initialized.current ? 3 : 12));
    camera.position.lerp(_desired, k);

    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    const targetDir = _lookAt.clone().sub(camera.position).normalize();
    const blended = currentLookAt.lerp(targetDir, k);
    camera.lookAt(camera.position.clone().add(blended));

    initialized.current = true;
  });

  return null;
}
