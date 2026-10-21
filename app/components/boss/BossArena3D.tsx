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
import Boss3D from "./Boss3D";
import BossPlayer3D from "./BossPlayer3D";

export default function BossArena3D() {
  const status = useBossStore((s) => s.status);
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
            offset={new THREE.Vector2(0.0008, 0.0008)}
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

type Projectile = {
  id: number;
  kind: "boss" | "player";
  born: number;
};

function ProjectileLayer() {
  const projectiles = useRef<Projectile[]>([]);
  const meshes = useRef<Map<number, THREE.Group>>(new Map());
  const group = useRef<THREE.Group>(null!);

  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const playerHitKey = useBossStore((s) => s.playerHitKey);

  useEffect(() => {
    if (bossHitKey === 0) return;
    projectiles.current.push({
      id: Date.now() + Math.random(),
      kind: "player",
      born: performance.now() / 1000,
    });
  }, [bossHitKey]);

  useEffect(() => {
    if (playerHitKey === 0) return;
    projectiles.current.push({
      id: Date.now() + Math.random(),
      kind: "boss",
      born: performance.now() / 1000,
    });
  }, [playerHitKey]);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    projectiles.current = projectiles.current.filter((p) => {
      const elapsed = now - p.born;
      return elapsed < 0.7;
    });
  });

  return (
    <group ref={group}>
      {/* render via React for simplicity — list re-renders on each frame is fine for ≤4 items */}
      <ProjectileRenderer projectilesRef={projectiles} meshesRef={meshes} />
    </group>
  );
}

function ProjectileRenderer({
  projectilesRef,
  meshesRef,
}: {
  projectilesRef: React.MutableRefObject<Projectile[]>;
  meshesRef: React.MutableRefObject<Map<number, THREE.Group>>;
}) {
  const root = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!root.current) return;
    const now = state.clock.elapsedTime;

    // Sync children to projectile list.
    const liveIds = new Set(projectilesRef.current.map((p) => p.id));

    // Remove dead.
    for (const [id, g] of meshesRef.current) {
      if (!liveIds.has(id)) {
        root.current.remove(g);
        meshesRef.current.delete(id);
      }
    }

    // Add new + animate.
    for (const p of projectilesRef.current) {
      let g = meshesRef.current.get(p.id);
      if (!g) {
        g = makeProjectileMesh(p.kind);
        meshesRef.current.set(p.id, g);
        root.current.add(g);
      }
      const t = Math.min(1, (now - p.born) / 0.55);
      // player → boss travels from z=2.6 to z=-2.5, y rises in arc
      const fromZ = p.kind === "player" ? 2.4 : -2.3;
      const toZ = p.kind === "player" ? -2.3 : 2.4;
      const z = fromZ + (toZ - fromZ) * t;
      const arc = Math.sin(t * Math.PI) * 1.4;
      g.position.set(0, 1.3 + arc, z);
      g.rotation.x += 0.3;
      g.rotation.y += 0.4;
      const fade = t < 0.85 ? 1 : Math.max(0, 1 - (t - 0.85) / 0.15);
      g.scale.setScalar(0.6 + Math.sin(t * Math.PI) * 0.4);
      g.children.forEach((child) => {
        const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (m && "opacity" in m) {
          m.transparent = true;
          m.opacity = fade;
        }
      });
    }
  });

  return <group ref={root} />;
}

function makeProjectileMesh(kind: "boss" | "player"): THREE.Group {
  const g = new THREE.Group();
  const color = kind === "player" ? "#7dd3fc" : "#ff4444";
  const emissive = kind === "player" ? "#bae6fd" : "#ffaa55";
  const sphere = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28, 1),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 3,
      roughness: 0.2,
    }),
  );
  g.add(sphere);
  const trail = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 16),
    new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: 0.35,
    }),
  );
  g.add(trail);
  return g;
}

function CameraShake() {
  const { camera } = useThree();
  const baseY = useRef(camera.position.y);
  const baseX = useRef(camera.position.x);
  const baseZ = useRef(camera.position.z);

  const playerHitKey = useBossStore((s) => s.playerHitKey);
  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const shake = useRef(0);
  const target = useRef(new THREE.Vector3(0, 1.6, 0));

  useEffect(() => {
    baseY.current = camera.position.y;
    baseX.current = camera.position.x;
    baseZ.current = camera.position.z;
  }, [camera]);

  useEffect(() => {
    if (playerHitKey === 0) return;
    shake.current = Math.max(shake.current, 0.55);
  }, [playerHitKey]);

  useEffect(() => {
    if (bossHitKey === 0) return;
    shake.current = Math.max(shake.current, 0.3);
  }, [bossHitKey]);

  useFrame((_, delta) => {
    // Slow orbit drift for life.
    const drift = Math.sin(performance.now() / 4000) * 0.4;
    const dx = drift;
    const dy = Math.sin(performance.now() / 5200) * 0.15;

    if (shake.current > 0) {
      const k = shake.current;
      camera.position.x = baseX.current + dx + (Math.random() - 0.5) * 0.25 * k;
      camera.position.y = baseY.current + dy + (Math.random() - 0.5) * 0.25 * k;
      camera.position.z = baseZ.current + (Math.random() - 0.5) * 0.15 * k;
      shake.current = Math.max(0, shake.current - delta * 1.6);
    } else {
      camera.position.x += (baseX.current + dx - camera.position.x) * 0.04;
      camera.position.y += (baseY.current + dy - camera.position.y) * 0.04;
      camera.position.z += (baseZ.current - camera.position.z) * 0.04;
    }
    camera.lookAt(target.current);
  });

  return null;
}
