"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useForestStore } from "@/app/lib/forestStore";

export const NODE_POSITIONS: [number, number, number][] = [
  [0, 0, 2],       // start — player starts here
  [0, 0, -8],      // node 1
  [3.5, 0, -17],   // node 2 — curves right
  [0, 0, -26],     // node 3 — treasure
];

// Seeded RNG for deterministic tree placement
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPathCurve() {
  const pts = NODE_POSITIONS.map(([x, , z]) => new THREE.Vector3(x, 0.01, z));
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -12]} receiveShadow>
      <planeGeometry args={[80, 60]} />
      <meshStandardMaterial color="#1e3a1e" roughness={1} metalness={0} />
    </mesh>
  );
}

function PathSegments() {
  const ref = useRef<THREE.Mesh>(null!);

  const geometry = useMemo(() => {
    const curve = buildPathCurve();
    const points = curve.getPoints(120);
    const geo = new THREE.BufferGeometry();
    const arr: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dir = b.clone().sub(a).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x);
      const w = 1.6;
      const tl = a.clone().add(perp.clone().multiplyScalar(w));
      const tr = a.clone().add(perp.clone().multiplyScalar(-w));
      const bl = b.clone().add(perp.clone().multiplyScalar(w));
      const br = b.clone().add(perp.clone().multiplyScalar(-w));
      arr.push(tl.x, tl.y, tl.z, tr.x, tr.y, tr.z, bl.x, bl.y, bl.z);
      arr.push(tr.x, tr.y, tr.z, br.x, br.y, br.z, bl.x, bl.y, bl.z);
    }
    const positions = new Float32Array(arr);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={ref} geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#8a7a5a" roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Trees() {
  const treeCount = 120;

  const matrices = useMemo(() => {
    const mats: THREE.Matrix4[] = [];
    const r = mulberry32(42);
    for (let i = 0; i < treeCount; i++) {
      const side = r() > 0.5 ? 1 : -1;
      const spread = 6 + r() * 22;
      const x = side * spread + (r() - 0.5) * 4;
      const z = -28 * r();
      const scale = 0.7 + r() * 1.3;
      const mat = new THREE.Matrix4();
      mat.compose(
        new THREE.Vector3(x, 0, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2),
        new THREE.Vector3(scale, scale, scale),
      );
      mats.push(mat);
    }
    return mats;
  }, [treeCount]);

  const trunkRef = useRef<THREE.InstancedMesh>(null!);
  const canopyRef = useRef<THREE.InstancedMesh>(null!);
  const canopy2Ref = useRef<THREE.InstancedMesh>(null!);

  const seededR = useMemo(() => mulberry32(99), []);

  useEffect(() => {
    matrices.forEach((mat, i) => {
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      mat.decompose(pos, quat, scl);

      const trunkMat = new THREE.Matrix4().compose(
        pos,
        quat,
        new THREE.Vector3(scl.x * 0.18, scl.y * 1.8, scl.z * 0.18),
      );
      const canopyMat = new THREE.Matrix4().compose(
        new THREE.Vector3(pos.x, pos.y + scl.y * 2.2, pos.z),
        quat,
        new THREE.Vector3(scl.x * 1.1, scl.y * 1.3, scl.z * 1.1),
      );
      const canopy2Mat = new THREE.Matrix4().compose(
        new THREE.Vector3(pos.x + (seededR() - 0.5) * 0.3, pos.y + scl.y * 3.2, pos.z + (seededR() - 0.5) * 0.3),
        quat,
        new THREE.Vector3(scl.x * 0.7, scl.y * 0.9, scl.z * 0.7),
      );

      if (trunkRef.current) trunkRef.current.setMatrixAt(i, trunkMat);
      if (canopyRef.current) canopyRef.current.setMatrixAt(i, canopyMat);
      if (canopy2Ref.current) canopy2Ref.current.setMatrixAt(i, canopy2Mat);
    });
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (canopyRef.current) canopyRef.current.instanceMatrix.needsUpdate = true;
    if (canopy2Ref.current) canopy2Ref.current.instanceMatrix.needsUpdate = true;
  }, [matrices, seededR]);

  return (
    <>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1.2, 1, 7]} />
        <meshStandardMaterial color="#3d2210" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, treeCount]} castShadow>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#1a4a1a" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={canopy2Ref} args={[undefined, undefined, treeCount]} castShadow>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#1f5a22" roughness={0.8} />
      </instancedMesh>
    </>
  );
}

function NodeMarkers() {
  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const markerRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (markerRef.current) {
      markerRef.current.rotation.y = clock.getElapsedTime() * 1.5;
      markerRef.current.position.y = 0.6 + Math.sin(clock.getElapsedTime() * 2) * 0.08;
    }
  });

  return (
    <>
      {NODE_POSITIONS.map(([x, y, z], i) => {
        const unlocked = i <= nodeIndex;
        const isCurrent = i === nodeIndex;
        return (
          <group key={i} position={[x, y, z]}>
            {/* Ground ring marker */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <ringGeometry args={[1.1, 1.5, 32]} />
              <meshStandardMaterial
                color={unlocked ? "#d4a017" : "#2a3a2a"}
                emissive={isCurrent ? "#a07010" : "#000000"}
                emissiveIntensity={isCurrent ? 0.6 : 0}
                transparent
                opacity={unlocked ? 0.9 : 0.4}
              />
            </mesh>
            {/* Floating diamond on current node */}
            {isCurrent && (
              <mesh ref={markerRef} position={[0, 0.6, 0]} castShadow>
                <octahedronGeometry args={[0.22, 0]} />
                <meshStandardMaterial
                  color="#ffd700"
                  emissive="#b8860b"
                  emissiveIntensity={1.2}
                  metalness={0.8}
                  roughness={0.2}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function ForkSigns() {
  // Fork sign at each node except the last
  return (
    <>
      {NODE_POSITIONS.slice(0, -1).map(([x, y, z], i) => (
        <group key={i} position={[x - 1.8, y, z + 1]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
            <meshStandardMaterial color="#5a3010" roughness={1} />
          </mesh>
          <mesh position={[0.22, 0.65, 0]} castShadow>
            <boxGeometry args={[0.55, 0.22, 0.06]} />
            <meshStandardMaterial color="#d4a017" roughness={0.5} emissive="#6a5000" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function ForestPath() {
  return (
    <>
      <Ground />
      <PathSegments />
      <Trees />
      <NodeMarkers />
      <ForkSigns />
    </>
  );
}
