"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useGardenStore } from "@/app/lib/gardenStore";
import { useHubStore } from "@/app/lib/hubStore";
import { CHARACTERS, type CharacterSlug } from "@/app/lib/characters";
import CatModel from "@/app/components/shared/CatModel";
import { buddyAngle, faceCenterYaw, NEIGHBOR_COUNT, polar, RING_RADIUS } from "./positions";

const WALK_SPEED = 0.65; // radians of ring per second
const FINAL_WALK = 2.2; // seconds to walk to the pond for the party

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function GardenBuddy() {
  const slug = useHubStore((s) => s.selectedCharacter);
  const neighborIndex = useGardenStore((s) => s.neighborIndex);
  const status = useGardenStore((s) => s.status);
  const finishWalk = useGardenStore((s) => s.finishWalk);

  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const walk = useRef({ from: buddyAngle(0), to: buddyAngle(0), t: 1, duration: 1, final: false });
  const lastIndex = useRef(0);
  const clock = useRef(0);

  useLayoutEffect(() => {
    if (!group.current) return;
    group.current.position.set(...polar(buddyAngle(0), RING_RADIUS));
    group.current.rotation.y = faceCenterYaw(buddyAngle(0));
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !body.current) return;
    clock.current += delta;

    if (status === "walking" && lastIndex.current !== neighborIndex) {
      const prev = Math.min(lastIndex.current, NEIGHBOR_COUNT - 1);
      lastIndex.current = neighborIndex;
      const final = neighborIndex >= NEIGHBOR_COUNT;
      const from = buddyAngle(prev);
      const to = final ? from : buddyAngle(neighborIndex);
      walk.current = {
        from,
        to,
        t: 0,
        duration: final ? FINAL_WALK : Math.max(1.2, Math.abs(to - from) / WALK_SPEED),
        final,
      };
    }
    if (status === "idle" && lastIndex.current !== 0) {
      lastIndex.current = 0;
      walk.current = { from: buddyAngle(0), to: buddyAngle(0), t: 1, duration: 1, final: false };
      group.current.position.set(...polar(buddyAngle(0), RING_RADIUS));
      group.current.rotation.y = faceCenterYaw(buddyAngle(0));
    }

    const w = walk.current;
    if (w.t < 1) {
      w.t = Math.min(1, w.t + delta / w.duration);
      const e = easeInOut(w.t);
      if (w.final) {
        const start = new THREE.Vector3(...polar(w.from, RING_RADIUS));
        const end = new THREE.Vector3(...polar(w.from, 2.6));
        group.current.position.lerpVectors(start, end, e);
        group.current.rotation.y = faceCenterYaw(w.from);
      } else {
        const a = w.from + (w.to - w.from) * e;
        group.current.position.set(...polar(a, RING_RADIUS));
        const heading = w.to > w.from ? Math.PI / 2 - a : -Math.PI / 2 - a;
        group.current.rotation.y = heading;
      }
      body.current.position.y = Math.abs(Math.sin(clock.current * 9)) * 0.1;
      if (w.t >= 1) {
        group.current.rotation.y = w.final ? faceCenterYaw(w.from) : faceCenterYaw(w.to);
        finishWalk();
      }
    } else if (status === "won") {
      body.current.position.y = Math.abs(Math.sin(clock.current * 5)) * 0.18;
      group.current.rotation.y += delta * 2.5;
    } else {
      body.current.position.y = Math.sin(clock.current * 2) * 0.03;
    }
  });

  return (
    <group ref={group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.14} />
      </mesh>
      <group ref={body}>
        <group position={[0, 0.55, 0]}>
          <BuddyVisual slug={slug} />
        </group>
      </group>
    </group>
  );
}

function BuddyVisual({ slug }: { slug: CharacterSlug | null }) {
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
  return <primitive object={scene} scale={0.24} position={[0, -0.55, 0]} />;
}

function BearPrimitive() {
  const color = CHARACTERS.bear.color;
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <group position={[0, 0.42, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.26, 20, 20]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.16, 0.18, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`eye${s}`} position={[s * 0.09, 0.03, 0.22]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        ))}
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
