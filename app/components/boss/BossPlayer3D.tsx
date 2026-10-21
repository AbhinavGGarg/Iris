"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useBossStore } from "@/app/lib/bossStore";
import { useHubStore } from "@/app/lib/hubStore";
import { type CharacterSlug } from "@/app/lib/characters";
import CatModel from "@/app/components/shared/CatModel";

export default function BossPlayer3D() {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);

  const slug = useHubStore((s) => s.selectedCharacter) ?? "bear";
  const playerHitKey = useBossStore((s) => s.playerHitKey);
  const status = useBossStore((s) => s.status);

  const hitClock = useRef(-1);
  const cheerClock = useRef(-1);

  useEffect(() => {
    if (playerHitKey === 0) return;
    hitClock.current = 0;
  }, [playerHitKey]);

  useEffect(() => {
    if (status === "victory") cheerClock.current = 0;
  }, [status]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (!body.current) return;

    // Idle bob — always face the boss (which sits to the back).
    const bob = Math.sin(t * 2.6) * 0.06;
    body.current.position.y = bob;

    // Hit recoil — knockback + tilt.
    if (hitClock.current >= 0) {
      hitClock.current += delta;
      const h = hitClock.current;
      if (h < 0.55) {
        const k = 1 - h / 0.55;
        body.current.position.z = -Math.sin(h * 12) * 0.25 * k;
        body.current.rotation.z = Math.sin(h * 18) * 0.2 * k;
      }
      if (hitClock.current > 0.55) {
        hitClock.current = -1;
        body.current.position.z = 0;
        body.current.rotation.z = 0;
      }
    }

    // Victory cheer — spin.
    if (cheerClock.current >= 0) {
      cheerClock.current += delta;
      body.current.rotation.y += delta * 6;
    }
  });

  return (
    <group ref={root} position={[0, 0.0, 2.6]}>
      <group ref={body}>
        <CharacterVisual slug={slug} />
      </group>

      {/* Glow ring on the ground beneath the player */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.55, 0.78, 32]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function CharacterVisual({ slug }: { slug: CharacterSlug }) {
  if (slug === "fox") return <FoxModel />;
  if (slug === "robot") return <RobotModel />;
  if (slug === "cat")
    return (
      <group position={[0, 0.55, 0]} rotation={[0, Math.PI, 0]}>
        <CatModel />
      </group>
    );
  return <BearPrimitive />;
}

function FoxModel() {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF("/models/Fox.glb");
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const idle = actions[names.find((n) => /survey|idle/i.test(n)) ?? names[0]];
    idle?.reset().fadeIn(0.2).play();
    return () => {
      idle?.fadeOut(0.2);
    };
  }, [actions, names]);

  return (
    <group ref={group}>
      <primitive
        object={scene}
        scale={0.014}
        position={[0, 0, 0]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  );
}

function RobotModel() {
  const { scene } = useGLTF("/models/RobotExpressive.glb");
  return (
    <primitive
      object={scene}
      scale={0.55}
      position={[0, 0, 0]}
      rotation={[0, Math.PI, 0]}
    />
  );
}

function BearPrimitive() {
  return (
    <group position={[0, 0.55, 0]} rotation={[0, Math.PI, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshStandardMaterial color="#a86b3d" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.05, 0.2]}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color="#e9caa6" roughness={0.8} />
      </mesh>
      <group position={[0, 0.48, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.32, 24, 24]} />
          <meshStandardMaterial color="#a86b3d" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.05, 0.24]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#e9caa6" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.36]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#231a14" />
        </mesh>
        <mesh position={[-0.11, 0.07, 0.28]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[0.11, 0.07, 0.28]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[-0.22, 0.23, -0.02]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#a86b3d" roughness={0.7} />
        </mesh>
        <mesh position={[0.22, 0.23, -0.02]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#a86b3d" roughness={0.7} />
        </mesh>
      </group>
      <mesh castShadow position={[-0.34, 0.05, 0]}>
        <capsuleGeometry args={[0.09, 0.22, 8, 16]} />
        <meshStandardMaterial color="#8a5530" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.34, 0.05, 0]}>
        <capsuleGeometry args={[0.09, 0.22, 8, 16]} />
        <meshStandardMaterial color="#8a5530" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.17, -0.42, 0]}>
        <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
        <meshStandardMaterial color="#8a5530" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.17, -0.42, 0]}>
        <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
        <meshStandardMaterial color="#8a5530" roughness={0.7} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/models/Fox.glb");
useGLTF.preload("/models/RobotExpressive.glb");
