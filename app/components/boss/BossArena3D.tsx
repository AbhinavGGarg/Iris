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
import { COMBO_AT, useBossStore } from "@/app/lib/bossStore";
import Boss3D from "./Boss3D";
import BossPlayer3D from "./BossPlayer3D";

export default function BossArena3D() {
  const status = useBossStore((s) => s.status);
  const calmMode = useBossStore((s) => s.calmMode);
  const visible = status === "battling" || status === "victory";

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ opacity: visible ? 1 : 0.55, transition: "opacity 400ms" }}
    >
      <Canvas
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
          <ProjectileLayer />

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

type ProjectileKind = "player" | "combo" | "boss";
type Pending = { kind: ProjectileKind; delay: number };
type Projectile = { id: number; kind: ProjectileKind; born: number };

/** Seconds a spell takes to cross the arena (matches the boss hit timing). */
const TRAVEL = 0.45;
const BURST = 0.35;
const BOSS_WINDUP = 0.55;
const PLAYER_Z = 2.4;
const BOSS_Z = -2.3;

function ProjectileLayer() {
  const pending = useRef<Pending[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const meshes = useRef<Map<number, THREE.Group>>(new Map());
  const root = useRef<THREE.Group>(null!);
  const nextId = useRef(1);

  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const playerHitKey = useBossStore((s) => s.playerHitKey);

  useEffect(() => {
    if (bossHitKey === 0) return;
    const combo = useBossStore.getState().streak >= COMBO_AT;
    pending.current.push({ kind: combo ? "combo" : "player", delay: 0 });
  }, [bossHitKey]);

  useEffect(() => {
    if (playerHitKey === 0) return;
    pending.current.push({ kind: "boss", delay: BOSS_WINDUP });
  }, [playerHitKey]);

  useFrame((state) => {
    if (!root.current) return;
    const now = state.clock.elapsedTime;

    // Use the canvas clock for everything so spells always line up with the hits.
    for (const p of pending.current) {
      projectiles.current.push({ id: nextId.current++, kind: p.kind, born: now + p.delay });
    }
    pending.current = [];
    projectiles.current = projectiles.current.filter((p) => now - p.born < TRAVEL + BURST);

    const live = new Set(projectiles.current.map((p) => p.id));
    for (const [id, g] of meshes.current) {
      if (!live.has(id)) {
        root.current.remove(g);
        meshes.current.delete(id);
      }
    }

    for (const p of projectiles.current) {
      let g = meshes.current.get(p.id);
      if (!g) {
        g = makeProjectileMesh(p.kind);
        meshes.current.set(p.id, g);
        root.current.add(g);
      }
      const elapsed = now - p.born;
      const orb = g.children[0] as THREE.Mesh;
      const glow = g.children[1] as THREE.Mesh;
      const burst = g.children[2] as THREE.Mesh;
      g.visible = elapsed >= 0;
      if (elapsed < 0) continue;

      const fromZ = p.kind === "boss" ? BOSS_Z : PLAYER_Z;
      const toZ = p.kind === "boss" ? PLAYER_Z : BOSS_Z;
      const big = p.kind === "combo" ? 1.6 : 1;

      if (elapsed < TRAVEL) {
        const t = elapsed / TRAVEL;
        const z = fromZ + (toZ - fromZ) * t;
        const arc = Math.sin(t * Math.PI) * 1.2;
        orb.visible = glow.visible = true;
        burst.visible = false;
        orb.position.set(0, (p.kind === "boss" ? 2.2 : 1.1) + (p.kind === "boss" ? -1.1 * t : 1.1 * t) + arc, z);
        glow.position.copy(orb.position);
        orb.rotation.x += 0.35;
        orb.rotation.y += 0.45;
        orb.scale.setScalar(big * (0.8 + Math.sin(t * Math.PI) * 0.5));
        glow.scale.setScalar(big * (1 + Math.sin(t * Math.PI) * 0.6));
      } else {
        const b = (elapsed - TRAVEL) / BURST;
        orb.visible = glow.visible = false;
        burst.visible = true;
        burst.position.set(0, p.kind === "boss" ? 1.1 : 2.2, toZ);
        burst.scale.setScalar(big * (0.4 + b * 2.4));
        (burst.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - b);
      }
    }
  });

  return <group ref={root} />;
}

function makeProjectileMesh(kind: ProjectileKind): THREE.Group {
  const g = new THREE.Group();
  const color = kind === "boss" ? "#ff4444" : kind === "combo" ? "#ffd23f" : "#7dd3fc";
  const glowColor = kind === "boss" ? "#ffaa55" : kind === "combo" ? "#fff1a8" : "#bae6fd";
  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.3, 1),
    new THREE.MeshStandardMaterial({ color, emissive: glowColor, emissiveIntensity: 3.5, roughness: 0.2 }),
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.35 }),
  );
  const burst = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 20, 20),
    new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.7 }),
  );
  burst.visible = false;
  g.add(orb, glow, burst);
  return g;
}

function CameraShake() {
  const { camera } = useThree();
  const baseY = useRef(camera.position.y);
  const baseX = useRef(camera.position.x);
  const baseZ = useRef(camera.position.z);

  const playerHitKey = useBossStore((s) => s.playerHitKey);
  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const calmMode = useBossStore((s) => s.calmMode);
  const shake = useRef(0);
  const queued = useRef<{ at: number; amount: number }[]>([]);
  const clock = useRef(0);
  const target = useRef(new THREE.Vector3(0, 1.6, 0));

  useEffect(() => {
    baseY.current = camera.position.y;
    baseX.current = camera.position.x;
    baseZ.current = camera.position.z;
  }, [camera]);

  useEffect(() => {
    if (playerHitKey === 0) return;
    queued.current.push({ at: clock.current + BOSS_WINDUP + TRAVEL, amount: 0.55 });
  }, [playerHitKey]);

  useEffect(() => {
    if (bossHitKey === 0) return;
    queued.current.push({ at: clock.current + TRAVEL, amount: 0.3 });
  }, [bossHitKey]);

  useFrame((state, delta) => {
    const cam = state.camera;
    clock.current += delta;
    queued.current = queued.current.filter((q) => {
      if (q.at > clock.current) return true;
      if (!calmMode) shake.current = Math.max(shake.current, q.amount);
      return false;
    });

    // Slow orbit drift for life.
    const dx = Math.sin(clock.current / 4) * 0.4;
    const dy = Math.sin(clock.current / 5.2) * 0.15;

    if (shake.current > 0) {
      const k = shake.current;
      cam.position.x = baseX.current + dx + (Math.random() - 0.5) * 0.25 * k;
      cam.position.y = baseY.current + dy + (Math.random() - 0.5) * 0.25 * k;
      cam.position.z = baseZ.current + (Math.random() - 0.5) * 0.15 * k;
      shake.current = Math.max(0, shake.current - delta * 1.6);
    } else {
      cam.position.x += (baseX.current + dx - cam.position.x) * 0.04;
      cam.position.y += (baseY.current + dy - cam.position.y) * 0.04;
      cam.position.z += (baseZ.current - cam.position.z) * 0.04;
    }
    cam.lookAt(target.current);
  });

  return null;
}
