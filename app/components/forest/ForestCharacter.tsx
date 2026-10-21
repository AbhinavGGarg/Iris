"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useForestStore } from "@/app/lib/forestStore";
import { useHubStore } from "@/app/lib/hubStore";
import { CHARACTERS, type CharacterSlug } from "@/app/lib/characters";
import CatModel from "@/app/components/shared/CatModel";
import { NODE_POSITIONS } from "./ForestPath";

const MOVE_DURATION = 0.8;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function ForestCharacter() {
  const slug = useHubStore((s) => s.selectedCharacter);
  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);

  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const status = useForestStore((s) => s.status);
  const finishWalk = useForestStore((s) => s.finishWalk);

  const getTargetPos = (idx: number) => {
    const [x, y, z] = NODE_POSITIONS[Math.min(idx, NODE_POSITIONS.length - 1)];
    return new THREE.Vector3(x, y, z);
  };

  const startPos = useRef(getTargetPos(0));
  const targetPos = useRef(getTargetPos(0));
  const t = useRef(1);
  const walkClock = useRef(0);
  const initialized = useRef(false);

  useLayoutEffect(() => {
    if (!group.current || initialized.current) return;
    const p = getTargetPos(0);
    group.current.position.copy(p);
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!group.current || !initialized.current) return;
    startPos.current = group.current.position.clone();
    targetPos.current = getTargetPos(nodeIndex);
    t.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIndex]);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (t.current < 1) {
      t.current = Math.min(1, t.current + delta / MOVE_DURATION);
      const e = easeInOut(t.current);
      group.current.position.lerpVectors(startPos.current, targetPos.current, e);
      walkClock.current += delta * 8;
      const bounce = Math.abs(Math.sin(walkClock.current)) * 0.1;
      if (body.current) body.current.position.y = 0.55 + bounce;
      if (t.current >= 1) {
        finishWalk();
        if (body.current) body.current.position.y = 0.55;
      }
      const dir = targetPos.current.clone().sub(startPos.current);
      if (dir.lengthSq() > 0.001) {
        const angle = Math.atan2(dir.x, dir.z);
        group.current.rotation.y += (angle - group.current.rotation.y) * Math.min(1, delta * 6);
      }
    } else {
      walkClock.current += delta * 2;
      const idleBob = Math.sin(walkClock.current) * 0.04;
      if (body.current) body.current.position.y = 0.55 + idleBob;
      if (status === "won" && body.current) {
        body.current.rotation.y += delta * 4;
      }
    }
  });

  return (
    <group ref={group}>
      <group ref={body} position={[0, 0.55, 0]}>
        <CharacterVisual slug={slug} />
      </group>
    </group>
  );
}

function CharacterVisual({ slug }: { slug: CharacterSlug | null }) {
  if (slug === "fox") return <FoxModel />;
  if (slug === "robot") return <RobotModel />;
  if (slug === "cat") return <CatModel />;
  return <BearPrimitive />;
}

function FoxModel() {
  const { scene } = useGLTF("/models/Fox.glb");
  return <primitive object={scene} scale={0.012} position={[0, -0.55, 0]} />;
}

function RobotModel() {
  const { scene } = useGLTF("/models/RobotExpressive.glb");
  return <primitive object={scene} scale={0.45} position={[0, -0.55, 0]} />;
}

function BearPrimitive() {
  const color = CHARACTERS.bear.color;
  return (
    <group>
      <mesh castShadow position={[0, 0, 0]}>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <group position={[0, 0.42, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.26, 20, 20]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[-0.16, 0.18, 0]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0.16, 0.18, 0]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[-0.09, 0.03, 0.22]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[0.09, 0.03, 0.22]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[0, -0.06, 0.25]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#3a1a0a" />
        </mesh>
      </group>
    </group>
  );
}

useGLTF.preload("/models/Fox.glb");
useGLTF.preload("/models/RobotExpressive.glb");
