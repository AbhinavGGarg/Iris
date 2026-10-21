"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CharacterSlug } from "@/app/lib/characters";
import CatModel from "@/app/components/shared/CatModel";

const CAM_CONFIG: Record<CharacterSlug, { pos: [number, number, number]; fov: number }> = {
  bear: { pos: [0, 0.3, 2.6], fov: 36 },
  fox: { pos: [0, 0.6, 3.8], fov: 32 },
  robot: { pos: [0, 0.5, 4.2], fov: 30 },
  cat: { pos: [0, 0.3, 2.4], fov: 36 },
};

export default function CharacterPreview({
  slug,
  hovered,
}: {
  slug: CharacterSlug;
  hovered: boolean;
}) {
  const cam = CAM_CONFIG[slug];
  return (
    <Canvas
      camera={{ position: cam.pos, fov: cam.fov }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#ffe8d8", "#6a5a8a", 0.55]} />
      <directionalLight position={[3, 4, 5]} intensity={1.15} />
      <directionalLight position={[-2, 3, -3]} intensity={0.35} />
      <Suspense fallback={null}>
        <Turntable hovered={hovered}>
          <CharacterModel slug={slug} />
        </Turntable>
      </Suspense>
    </Canvas>
  );
}

function Turntable({
  hovered,
  children,
}: {
  hovered: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null!);
  const clock = useRef(0);
  const scaleRef = useRef(1);

  useFrame((_, delta) => {
    if (!group.current) return;
    clock.current += delta;

    const targetSpeed = hovered ? 1.2 : 0.3;
    group.current.rotation.y += delta * targetSpeed;

    const bob = Math.sin(clock.current * 2.5) * 0.06;
    group.current.position.y = bob;

    const targetScale = hovered ? 1.1 : 1;
    scaleRef.current += (targetScale - scaleRef.current) * 0.1;
    group.current.scale.setScalar(scaleRef.current);
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      {children}
    </group>
  );
}

function CharacterModel({ slug }: { slug: CharacterSlug }) {
  if (slug === "bear") return <BearPreview />;
  if (slug === "fox") return <FoxPreview />;
  if (slug === "robot") return <RobotPreview />;
  return <CatPreview />;
}

function BearPreview() {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial color="#a86b3d" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.05, 0.18]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#e9caa6" roughness={0.8} />
      </mesh>
      <group position={[0, 0.45, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshStandardMaterial color="#a86b3d" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.05, 0.22]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial color="#e9caa6" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.0, 0.34]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#231a14" roughness={0.5} />
        </mesh>
        <mesh position={[-0.1, 0.07, 0.26]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[0.1, 0.07, 0.26]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[-0.085, 0.085, 0.295]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>
        <mesh position={[0.115, 0.085, 0.295]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-0.21, 0.22, -0.02]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#a86b3d" roughness={0.7} />
        </mesh>
        <mesh position={[0.21, 0.22, -0.02]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#a86b3d" roughness={0.7} />
        </mesh>
        <mesh position={[-0.21, 0.22, 0.0]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#e9caa6" roughness={0.8} />
        </mesh>
        <mesh position={[0.21, 0.22, 0.0]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#e9caa6" roughness={0.8} />
        </mesh>
      </group>
      <mesh castShadow position={[-0.32, 0.05, 0]}>
        <capsuleGeometry args={[0.09, 0.22, 8, 16]} />
        <meshStandardMaterial color="#8a5530" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.32, 0.05, 0]}>
        <capsuleGeometry args={[0.09, 0.22, 8, 16]} />
        <meshStandardMaterial color="#8a5530" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.16, -0.4, 0]}>
        <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
        <meshStandardMaterial color="#8a5530" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.16, -0.4, 0]}>
        <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
        <meshStandardMaterial color="#8a5530" roughness={0.7} />
      </mesh>
    </group>
  );
}

function FoxPreview() {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF("/models/Fox.glb");
  const clone = useRef<THREE.Group>(null!);
  if (!clone.current) clone.current = cloneSkeleton(scene) as THREE.Group;
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
      <primitive object={clone.current} scale={0.011} position={[0, -0.7, 0]} />
    </group>
  );
}

function RobotPreview() {
  const { scene, animations } = useGLTF("/models/RobotExpressive.glb");
  const clone = useRef<THREE.Group>(null!);
  if (!clone.current) clone.current = cloneSkeleton(scene) as THREE.Group;
  const group = useRef<THREE.Group>(null!);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const idle =
      actions[names.find((n) => /idle|wave|dance/i.test(n)) ?? names[0]];
    idle?.reset().fadeIn(0.2).play();
    return () => {
      idle?.fadeOut(0.2);
    };
  }, [actions, names]);

  return (
    <group ref={group}>
      <primitive object={clone.current} scale={0.35} position={[0, -0.7, 0]} />
    </group>
  );
}

function CatPreview() {
  return (
    <group position={[0, -0.15, 0]}>
      <CatModel />
    </group>
  );
}
