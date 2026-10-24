"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { phaseFor, useBossStore } from "@/app/lib/bossStore";
import { getLevel } from "@/app/lib/bossLevels";

/** The spell takes this long to fly from the hero to the boss. */
const SPELL_TRAVEL = 0.45;
const WINDUP = 0.6;

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
  const playerHitKey = useBossStore((s) => s.playerHitKey);
  const status = useBossStore((s) => s.status);
  const level = useBossStore((s) => s.level);
  const calmMode = useBossStore((s) => s.calmMode);

  const hitClock = useRef<number | null>(null);
  const windClock = useRef<number | null>(null);
  const deathClock = useRef(-1);
  const phaseScale = useRef(1);

  useEffect(() => {
    if (bossHitKey === 0) return;
    hitClock.current = -SPELL_TRAVEL;
  }, [bossHitKey]);

  useEffect(() => {
    if (playerHitKey === 0) return;
    windClock.current = 0;
  }, [playerHitKey]);

  useEffect(() => {
    if (status === "victory") deathClock.current = -SPELL_TRAVEL;
    if (status === "idle" || status === "battling") {
      deathClock.current = -1;
      if (root.current) {
        root.current.scale.setScalar(1);
        root.current.rotation.z = 0;
      }
    }
  }, [status]);

  const phase = phaseFor(bossHP);

  // Each level has its own colors, and the boss changes form as its HP drops.
  const phaseColor = useMemo(
    () => new THREE.Color(getLevel(level).palette[phase - 1]),
    [level, phase],
  );

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

    const speed = phase === 1 ? 1 : phase === 2 ? 1.6 : 2.3;
    phaseScale.current += ((phase === 1 ? 1 : phase === 2 ? 1.08 : 1.16) - phaseScale.current) * Math.min(1, delta * 2);

    if (body.current) {
      body.current.rotation.y += delta * 0.35 * speed;
    }

    if (orbiters.current) {
      orbiters.current.rotation.y -= delta * 0.7 * speed;
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

    // Wind-up before the boss attacks: it swells and glows, then lunges.
    let windScale = 1;
    if (windClock.current !== null) {
      windClock.current += delta;
      const w = windClock.current;
      if (w < WINDUP) windScale = 1 + 0.2 * (w / WINDUP);
      else if (w < WINDUP + 0.25) windScale = 1.2 - 0.2 * ((w - WINDUP) / 0.25);
      if (body.current) body.current.position.z = w >= WINDUP && w < WINDUP + 0.25 ? Math.sin(((w - WINDUP) / 0.25) * Math.PI) * 0.6 : 0;
      if (coreMat.current && w < WINDUP) coreMat.current.emissiveIntensity = 1.6 + (w / WINDUP) * 3;
      if (w > WINDUP + 0.3) windClock.current = null;
    }
    if (deathClock.current < 0 && root.current) root.current.scale.setScalar(phaseScale.current * windScale);

    // Hit flash + shake, timed to the moment the spell arrives.
    if (hitClock.current !== null) {
      hitClock.current += delta;
    }
    if (hitClock.current !== null && hitClock.current >= 0) {
      const h = hitClock.current;
      if (h < 0.6 && body.current) {
        const shake = Math.sin(h * 80) * (calmMode ? 0.05 : 0.18) * (1 - h / 0.6);
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
        hitClock.current = null;
        if (body.current) {
          body.current.position.x = 0;
          body.current.position.z = 0;
        }
      }
    } else if (coreMat.current && windClock.current === null) {
      const pulse = 1.6 + Math.sin(t * 3.2 * speed) * 0.4;
      coreMat.current.emissiveIntensity = pulse;
      coreMat.current.color.copy(phaseColor);
    }

    // Death animation (starts when the final spell lands, then stays gone).
    if (status === "victory" && root.current) {
      deathClock.current += delta;
      const d = Math.max(0, deathClock.current);
      root.current.rotation.z = Math.sin(d * 12) * 0.15 * Math.max(0, 1 - d / 1.6);
      root.current.scale.setScalar(Math.max(0, phaseScale.current * (1 - d * 0.6)));
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
