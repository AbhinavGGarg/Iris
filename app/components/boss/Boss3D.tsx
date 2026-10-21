"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBossStore } from "@/app/lib/bossStore";

const MAX_HP = 100;

export default function Boss3D() {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const core = useRef<THREE.Mesh>(null!);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null!);
  const leftWing = useRef<THREE.Mesh>(null!);
  const rightWing = useRef<THREE.Mesh>(null!);
  const orbiters = useRef<THREE.Group>(null!);
  const horns = useRef<THREE.Group>(null!);

  const bossHP = useBossStore((s) => s.bossHP);
  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const status = useBossStore((s) => s.status);

  const hitClock = useRef(-1);
  const deathClock = useRef(-1);

  useEffect(() => {
    if (bossHitKey === 0) return;
    hitClock.current = 0;
  }, [bossHitKey]);

  useEffect(() => {
    if (status === "victory") deathClock.current = 0;
  }, [status]);

  // Phase-based colors as HP drops.
  const phaseColor = useMemo(() => {
    const pct = bossHP / MAX_HP;
    if (pct > 0.6) return new THREE.Color("#ff3838");
    if (pct > 0.25) return new THREE.Color("#ff8a00");
    return new THREE.Color("#ffe44d");
  }, [bossHP]);

  // Build orbiting spike data once.
  const orbiterData = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        angle: (i / 6) * Math.PI * 2,
        radius: 1.4,
        ySpeed: 0.6 + (i % 3) * 0.2,
      })),
    [],
  );

  const hornData = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return {
          x: Math.cos(a) * 0.55,
          z: Math.sin(a) * 0.55,
          rotY: a,
          tilt: 0.35 + (i % 2) * 0.15,
        };
      }),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (root.current) {
      const float = Math.sin(t * 1.2) * 0.25;
      root.current.position.y = 2.2 + float;
    }

    if (body.current) {
      body.current.rotation.y += delta * 0.35;
    }

    if (orbiters.current) {
      orbiters.current.rotation.y -= delta * 0.7;
      orbiters.current.children.forEach((child, i) => {
        const d = orbiterData[i];
        if (!d) return;
        child.position.y = Math.sin(t * d.ySpeed + d.angle) * 0.4;
        child.rotation.x += delta * 1.4;
        child.rotation.z += delta * 0.9;
      });
    }

    // Wing flap.
    if (leftWing.current && rightWing.current) {
      const flap = Math.sin(t * 2.4) * 0.5 + 0.2;
      leftWing.current.rotation.z = 0.4 + flap;
      rightWing.current.rotation.z = -(0.4 + flap);
    }

    // Hit flash + shake.
    if (hitClock.current >= 0) {
      hitClock.current += delta;
      const h = hitClock.current;
      if (h < 0.6 && body.current) {
        const shake = Math.sin(h * 80) * 0.18 * (1 - h / 0.6);
        body.current.position.x = shake;
        body.current.position.z = shake * 0.5;
      }
      if (coreMat.current) {
        const flash = h < 0.18 ? 1 - h / 0.18 : 0;
        coreMat.current.emissiveIntensity = 1.6 + flash * 4.5;
        coreMat.current.color.lerpColors(
          phaseColor,
          new THREE.Color("#ffffff"),
          flash,
        );
      }
      if (hitClock.current > 0.65) {
        hitClock.current = -1;
        if (body.current) {
          body.current.position.x = 0;
          body.current.position.z = 0;
        }
      }
    } else if (coreMat.current) {
      const pulse = 1.6 + Math.sin(t * 3.2) * 0.4;
      coreMat.current.emissiveIntensity = pulse;
      coreMat.current.color.copy(phaseColor);
    }

    // Death animation.
    if (deathClock.current >= 0 && root.current) {
      deathClock.current += delta;
      const d = deathClock.current;
      root.current.rotation.z = Math.sin(d * 12) * 0.15;
      root.current.scale.setScalar(Math.max(0, 1 - d * 0.6));
      if (d > 1.6) deathClock.current = -1;
    }
  });

  return (
    <group ref={root} position={[0, 2.2, -2.5]}>
      <group ref={body}>
        {/* Core — glowing icosahedron */}
        <mesh ref={core} castShadow>
          <icosahedronGeometry args={[0.85, 1]} />
          <meshStandardMaterial
            ref={coreMat}
            color={phaseColor}
            emissive={phaseColor}
            emissiveIntensity={1.6}
            roughness={0.35}
            metalness={0.4}
          />
        </mesh>

        {/* Inner darker shell with cracks (lower poly) */}
        <mesh scale={1.05}>
          <icosahedronGeometry args={[0.85, 0]} />
          <meshStandardMaterial
            color="#1a0306"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>

        {/* Crown of horns around the equator */}
        <group ref={horns}>
          {hornData.map((h, i) => (
            <mesh
              key={i}
              position={[h.x, 0.1, h.z]}
              rotation={[h.tilt, h.rotY, 0]}
              castShadow
            >
              <coneGeometry args={[0.13, 0.55, 8]} />
              <meshStandardMaterial
                color="#3a0a10"
                roughness={0.4}
                metalness={0.6}
                emissive={phaseColor}
                emissiveIntensity={0.25}
              />
            </mesh>
          ))}
        </group>

        {/* Eyes */}
        <mesh position={[-0.28, 0.1, 0.78]}>
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshStandardMaterial
            color="#fff8d6"
            emissive="#ffeaa0"
            emissiveIntensity={4}
          />
        </mesh>
        <mesh position={[0.28, 0.1, 0.78]}>
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshStandardMaterial
            color="#fff8d6"
            emissive="#ffeaa0"
            emissiveIntensity={4}
          />
        </mesh>

        {/* Wings — flat triangular planes */}
        <mesh
          ref={leftWing}
          position={[-0.6, 0.05, -0.1]}
          rotation={[0, 0.3, 0.5]}
        >
          <coneGeometry args={[0.7, 1.6, 3]} />
          <meshStandardMaterial
            color="#1a0308"
            emissive={phaseColor}
            emissiveIntensity={0.35}
            roughness={0.6}
            metalness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          ref={rightWing}
          position={[0.6, 0.05, -0.1]}
          rotation={[0, -0.3, -0.5]}
        >
          <coneGeometry args={[0.7, 1.6, 3]} />
          <meshStandardMaterial
            color="#1a0308"
            emissive={phaseColor}
            emissiveIntensity={0.35}
            roughness={0.6}
            metalness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Orbiting damage shards */}
      <group ref={orbiters}>
        {orbiterData.map((d, i) => (
          <mesh
            key={i}
            position={[
              Math.cos(d.angle) * d.radius,
              0,
              Math.sin(d.angle) * d.radius,
            ]}
            castShadow
          >
            <octahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial
              color="#2a0508"
              emissive={phaseColor}
              emissiveIntensity={1.2}
              metalness={0.7}
              roughness={0.25}
            />
          </mesh>
        ))}
      </group>

      {/* Boss point-light (drives bloom) */}
      <pointLight
        position={[0, 0, 0]}
        color={phaseColor}
        intensity={3}
        distance={8}
        decay={1.6}
      />
    </group>
  );
}
