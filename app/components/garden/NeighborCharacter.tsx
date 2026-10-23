"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Feeling, Neighbor } from "@/app/lib/gardenStories";

type Props = {
  neighbor: Neighbor;
  feeling: Feeling;
  position: [number, number, number];
  yaw: number;
  celebrating: boolean;
  phase: number;
};

export default function NeighborCharacter({ neighbor, feeling, position, yaw, celebrating, phase }: Props) {
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const tear = useRef<THREE.Mesh>(null!);
  const clock = useRef(phase);

  useFrame((_, delta) => {
    clock.current += delta;
    const t = clock.current;
    if (!body.current || !head.current) return;
    body.current.position.set(0, 0, 0);
    body.current.scale.setScalar(1);
    head.current.rotation.set(0, 0, 0);

    if (feeling === "happy") {
      const speed = celebrating ? 7 : 4;
      body.current.position.y = Math.abs(Math.sin(t * speed)) * (celebrating ? 0.22 : 0.1);
      head.current.rotation.z = Math.sin(t * 2) * 0.08;
    } else if (feeling === "sad") {
      head.current.rotation.x = 0.22;
      body.current.position.y = Math.sin(t * 1.2) * 0.015;
    } else if (feeling === "angry") {
      body.current.scale.setScalar(1 + Math.sin(t * 6) * 0.025);
      head.current.rotation.z = Math.sin(t * 9) * 0.03;
    } else if (feeling === "scared") {
      body.current.position.x = Math.sin(t * 45) * 0.018;
      head.current.rotation.x = -0.08;
    }

    if (tear.current) {
      const p = (t * 0.5) % 1;
      tear.current.position.y = -0.02 - p * 0.22;
      tear.current.scale.setScalar(p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15);
    }
  });

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.45, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.12} />
      </mesh>
      <group ref={body}>
        <mesh castShadow position={[0, 0.5, 0]} scale={[0.42, 0.5, 0.38]}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color={neighbor.color} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.45, 0.26]} scale={[0.26, 0.3, 0.12]}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial color="#fffaf0" roughness={0.9} />
        </mesh>
        <SpeciesBody neighbor={neighbor} />
        <group ref={head} position={[0, 1.18, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.38, 28, 28]} />
            <meshStandardMaterial color={neighbor.color} roughness={0.85} />
          </mesh>
          <SpeciesHead neighbor={neighbor} />
          <Face feeling={feeling} species={neighbor.species} />
          {feeling === "sad" && (
            <mesh ref={tear} position={[0.17, -0.02, 0.35]}>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshStandardMaterial color="#6ec6ff" emissive="#3aa0e6" emissiveIntensity={0.4} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

function Face({ feeling, species }: { feeling: Feeling; species: Neighbor["species"] }) {
  const scared = feeling === "scared";
  const eyeR = scared ? 0.1 : 0.075;
  const pupilR = scared ? 0.035 : 0.045;
  const brow = BROWS[feeling];
  const mouthY = species === "duck" || species === "owl" ? -0.19 : -0.13;

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.13, 0.06, 0.31]}>
          <mesh>
            <sphereGeometry args={[eyeR, 16, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          <mesh position={[0, feeling === "sad" ? -0.015 : 0, eyeR * 0.75]}>
            <sphereGeometry args={[pupilR, 14, 14]} />
            <meshStandardMaterial color="#1e1a3a" roughness={0.3} />
          </mesh>
          <mesh position={[0.012, 0.018, eyeR * 0.75 + pupilR * 0.7]}>
            <sphereGeometry args={[pupilR * 0.3, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, brow.y, 0.06]} rotation={[0, 0, side * brow.tilt]}>
            <boxGeometry args={[0.15, 0.032, 0.03]} />
            <meshStandardMaterial color="#3b2a20" />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((side) => (
        <mesh key={`cheek${side}`} position={[side * 0.23, -0.08, 0.27]} scale={[1, 0.6, 0.4]}>
          <sphereGeometry args={[feeling === "angry" ? 0.07 : 0.05, 12, 12]} />
          <meshStandardMaterial
            color={feeling === "angry" ? "#ff5a4f" : "#ffb3c1"}
            transparent
            opacity={feeling === "angry" ? 0.9 : 0.7}
          />
        </mesh>
      ))}

      <Mouth feeling={feeling} y={mouthY} />
    </group>
  );
}

const BROWS: Record<Feeling, { y: number; tilt: number }> = {
  happy: { y: 0.15, tilt: 0 },
  sad: { y: 0.14, tilt: -0.4 },
  angry: { y: 0.1, tilt: 0.45 },
  scared: { y: 0.2, tilt: -0.15 },
};

function Mouth({ feeling, y }: { feeling: Feeling; y: number }) {
  const mat = <meshStandardMaterial color="#3b1d1d" roughness={0.6} />;
  if (feeling === "happy") {
    return (
      <mesh position={[0, y + 0.06, 0.34]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.1, 0.022, 8, 24, Math.PI]} />
        {mat}
      </mesh>
    );
  }
  if (feeling === "sad") {
    return (
      <mesh position={[0, y - 0.06, 0.34]}>
        <torusGeometry args={[0.08, 0.02, 8, 24, Math.PI]} />
        {mat}
      </mesh>
    );
  }
  if (feeling === "angry") {
    return (
      <mesh position={[0, y - 0.02, 0.35]}>
        <torusGeometry args={[0.07, 0.022, 8, 24, Math.PI]} />
        {mat}
      </mesh>
    );
  }
  return (
    <group position={[0, y - 0.01, 0.35]}>
      <mesh>
        <torusGeometry args={[0.055, 0.018, 8, 24]} />
        {mat}
      </mesh>
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.05, 20]} />
        <meshBasicMaterial color="#5a2626" />
      </mesh>
    </group>
  );
}

function SpeciesHead({ neighbor }: { neighbor: Neighbor }) {
  const { species, color, accent } = neighbor;
  if (species === "bunny") {
    return (
      <>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.14, 0.42, -0.04]} rotation={[0, 0, -s * 0.18]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.08, 0.36, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0, 0.05]} scale={[0.6, 0.85, 0.4]}>
              <capsuleGeometry args={[0.08, 0.36, 8, 16]} />
              <meshStandardMaterial color={accent} roughness={0.85} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.04, 0.37]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      </>
    );
  }
  if (species === "hedgehog") {
    const spikes = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 1.6 - Math.PI * 0.8;
      const tilt = 0.5 + (i % 2) * 0.25;
      spikes.push(
        <mesh
          key={i}
          position={[Math.sin(a) * 0.3, 0.12 + Math.cos(a) * 0.18 * tilt, -0.2]}
          rotation={[-0.9, 0, -a * 0.7]}
          castShadow
        >
          <coneGeometry args={[0.07, 0.3, 6]} />
          <meshStandardMaterial color={accent} roughness={0.9} />
        </mesh>,
      );
    }
    return (
      <>
        {spikes}
        <mesh position={[0, -0.03, 0.38]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#2a1a12" />
        </mesh>
      </>
    );
  }
  if (species === "owl") {
    return (
      <>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.24, 0.33, 0]} rotation={[0, 0, -s * 0.5]} castShadow>
            <coneGeometry args={[0.08, 0.22, 8]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`ring${s}`} position={[s * 0.13, 0.06, 0.29]}>
            <circleGeometry args={[0.13, 24]} />
            <meshStandardMaterial color="#f3e3c8" />
          </mesh>
        ))}
        <mesh position={[0, -0.07, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.045, 0.12, 8]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      </>
    );
  }
  return (
    <>
      <mesh position={[0, -0.07, 0.36]} scale={[0.17, 0.06, 0.14]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.38, -0.02]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.05, 0.16, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

function SpeciesBody({ neighbor }: { neighbor: Neighbor }) {
  const { species, color, accent } = neighbor;
  if (species === "bunny") {
    return (
      <mesh position={[0, 0.3, -0.4]}>
        <sphereGeometry args={[0.12, 14, 14]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
    );
  }
  if (species === "owl" || species === "duck") {
    return (
      <>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.4, 0.55, 0]} rotation={[0, 0, s * 0.3]} scale={[0.1, 0.32, 0.22]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color={species === "duck" ? color : accent} roughness={0.85} />
          </mesh>
        ))}
      </>
    );
  }
  return null;
}
