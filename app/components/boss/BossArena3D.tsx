"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { useBossStore } from "@/app/lib/bossStore";
import { FX, LANDS } from "@/app/lib/bossFx";
import Boss3D from "./Boss3D";
import BossFx3D from "./BossFx3D";
import BossPlayer3D from "./BossPlayer3D";

/** `frameloop="never"` lets a test page step the scene frame by frame. */
export default function BossArena3D({ frameloop = "always" }: { frameloop?: "always" | "never" } = {}) {
  const status = useBossStore((s) => s.status);
  const calmMode = useBossStore((s) => s.calmMode);
  const visible = status === "battling" || status === "victory";

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ opacity: visible ? 1 : 0.55, transition: "opacity 400ms" }}
    >
      <Canvas
        frameloop={frameloop}
        gl={frameloop === "never" ? { preserveDrawingBuffer: true } : undefined}
        shadows
        camera={{ position: [0, 2.4, 6.5], fov: 50 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#15040c"]} />
        <fog attach="fog" args={["#240714", 6, 22]} />

        <ambientLight intensity={0.35} color="#ff8a55" />
        <hemisphereLight args={["#ff5c8a", "#1a0205", 0.55]} />
        <directionalLight
          position={[4, 8, 5]}
          intensity={1.1}
          color="#ffe0b8"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <pointLight position={[0, 4, 4]} intensity={1.4} color="#ffb199" />
        <pointLight
          position={[0, 1.5, -4]}
          intensity={2.2}
          color="#ff3838"
          distance={12}
        />

        <Suspense fallback={null}>
          <Environment preset="night" />
          <ArenaPlatform />
          <Boss3D />
          <BossPlayer3D />
          <BossFx3D />

          <Sparkles
            count={140}
            scale={[14, 6, 14]}
            size={3}
            speed={0.35}
            color="#ff7a2a"
            opacity={0.7}
            position={[0, 2, 0]}
          />
          <Sparkles
            count={60}
            scale={[10, 4, 10]}
            size={1.6}
            speed={0.15}
            color="#ffd76a"
            opacity={0.5}
            position={[0, 1, 0]}
          />
        </Suspense>

        <CameraShake />

        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <ChromaticAberration
            offset={calmMode ? new THREE.Vector2(0, 0) : new THREE.Vector2(0.0008, 0.0008)}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette eskil={false} offset={0.18} darkness={0.92} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

function ArenaPlatform() {
  const ringMat = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame((state) => {
    if (ringMat.current) {
      ringMat.current.emissiveIntensity =
        0.6 + Math.sin(state.clock.elapsedTime * 1.6) * 0.25;
    }
  });

  return (
    <group>
      {/* Main platform — dark stone with glowing rim */}
      <mesh
        receiveShadow
        position={[0, -0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[5.5, 64]} />
        <meshStandardMaterial
          color="#2a0a14"
          roughness={0.85}
          metalness={0.3}
        />
      </mesh>

      {/* Inner runic ring */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.6, 4.85, 64]} />
        <meshStandardMaterial
          ref={ringMat}
          color="#ff3838"
          emissive="#ff5050"
          emissiveIntensity={0.8}
          side={THREE.DoubleSide}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Outer thin ring */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.2, 5.3, 64]} />
        <meshBasicMaterial
          color="#ffae5c"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Pillars around the arena edge */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 5.7;
        return (
          <mesh
            key={i}
            castShadow
            position={[Math.cos(a) * r, 0.6, Math.sin(a) * r]}
          >
            <cylinderGeometry args={[0.18, 0.28, 1.2, 8]} />
            <meshStandardMaterial
              color="#1a0508"
              roughness={0.7}
              metalness={0.5}
              emissive="#ff5c2a"
              emissiveIntensity={0.15}
            />
          </mesh>
        );
      })}

      {/* Distant ground plane below arena (lava look) */}
      <mesh
        receiveShadow
        position={[0, -2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#3a0508"
          emissive="#ff2a0a"
          emissiveIntensity={0.4}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

function CameraShake() {
  const { camera } = useThree();
  const base = useRef(camera.position.clone());

  const playerHitKey = useBossStore((s) => s.playerHitKey);
  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const specialKey = useBossStore((s) => s.specialKey);
  const calmMode = useBossStore((s) => s.calmMode);
  const shake = useRef(0);
  const queued = useRef<{ at: number; amount: number }[]>([]);
  const clock = useRef(0);
  // During the special the camera leans in toward the hero, then snaps back on impact.
  const zoomUntil = useRef(-1);
  const zoom = useRef(0);
  const target = useRef(new THREE.Vector3(0, 1.6, 0));

  useEffect(() => {
    base.current.copy(camera.position);
  }, [camera]);

  useEffect(() => {
    if (playerHitKey === 0) return;
    queued.current.push({ at: clock.current + LANDS.boss, amount: 0.55 });
  }, [playerHitKey]);

  useEffect(() => {
    if (bossHitKey === 0) return;
    queued.current.push({ at: clock.current + LANDS.spell, amount: 0.3 });
  }, [bossHitKey]);

  useEffect(() => {
    if (specialKey === 0) return;
    zoomUntil.current = clock.current + FX.specialCharge;
    queued.current.push({ at: clock.current + LANDS.special, amount: 1.1 });
  }, [specialKey]);

  useFrame((state, delta) => {
    const cam = state.camera;
    clock.current += delta;
    queued.current = queued.current.filter((q) => {
      if (q.at > clock.current) return true;
      if (!calmMode) shake.current = Math.max(shake.current, q.amount);
      return false;
    });

    const zoomTarget = clock.current < zoomUntil.current ? 1 : 0;
    zoom.current += (zoomTarget - zoom.current) * Math.min(1, delta * (zoomTarget ? 3 : 6));

    // Slow drift for life, plus the special's lean-in.
    const dx = Math.sin(clock.current / 4) * 0.4;
    const dy = Math.sin(clock.current / 5.2) * 0.15 - zoom.current * 0.5;
    const dz = -zoom.current * 1.2;

    if (shake.current > 0) {
      const k = shake.current;
      cam.position.x = base.current.x + dx + (Math.random() - 0.5) * 0.25 * k;
      cam.position.y = base.current.y + dy + (Math.random() - 0.5) * 0.25 * k;
      cam.position.z = base.current.z + dz + (Math.random() - 0.5) * 0.15 * k;
      shake.current = Math.max(0, shake.current - delta * 1.6);
    } else {
      cam.position.x += (base.current.x + dx - cam.position.x) * 0.06;
      cam.position.y += (base.current.y + dy - cam.position.y) * 0.06;
      cam.position.z += (base.current.z + dz - cam.position.z) * 0.06;
    }
    target.current.set(0, 1.6 - zoom.current * 0.2, -zoom.current * 0.6);
    cam.lookAt(target.current);
  });

  return null;
}
