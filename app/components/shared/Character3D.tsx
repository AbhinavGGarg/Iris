"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/app/lib/gameStore";
import { useHubStore } from "@/app/lib/hubStore";
import { type CharacterSlug } from "@/app/lib/characters";
import type { Facing } from "@/app/lib/maze";
import { cellToWorld } from "../game/Maze";
import Character from "../game/Character";
import CatModel from "./CatModel";

const FACING_YAW: Record<Facing, number> = {
  e: Math.PI / 2,
  s: 0,
  w: -Math.PI / 2,
  n: Math.PI,
};

const MOVE_DURATION = 0.55;
const TURN_DURATION = 0.25;

export default function Character3D() {
  const slug = useHubStore((s) => s.selectedCharacter);
  if (!slug || slug === "bear") return <Character />;
  return <GenericCharacter slug={slug} />;
}

function GenericCharacter({ slug }: { slug: CharacterSlug }) {
  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);

  const pos = useGameStore((s) => s.pos);
  const facing = useGameStore((s) => s.facing);
  const status = useGameStore((s) => s.status);
  const finishMove = useGameStore((s) => s.finishMove);

  const target = useRef({
    pos: cellToWorld(pos.x, pos.y),
    yaw: FACING_YAW[facing],
  });
  const start = useRef({
    pos: cellToWorld(pos.x, pos.y),
    yaw: FACING_YAW[facing],
  });
  const t = useRef(1);
  const duration = useRef(MOVE_DURATION);
  const walkClock = useRef(0);

  const initialized = useRef(false);
  useLayoutEffect(() => {
    if (!group.current || initialized.current) return;
    group.current.position.copy(cellToWorld(pos.x, pos.y));
    group.current.rotation.y = FACING_YAW[facing];
    initialized.current = true;
    t.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!group.current || !initialized.current) return;
    const newWorld = cellToWorld(pos.x, pos.y);
    if (group.current.position.distanceTo(newWorld) > 3) {
      group.current.position.copy(newWorld);
      group.current.rotation.y = FACING_YAW[facing];
      t.current = 1;
      return;
    }
    start.current = {
      pos: group.current.position.clone(),
      yaw: group.current.rotation.y,
    };
    target.current = {
      pos: newWorld,
      yaw: nearestYaw(group.current.rotation.y, FACING_YAW[facing]),
    };
    const isMove = !start.current.pos.equals(target.current.pos);
    duration.current = isMove ? MOVE_DURATION : TURN_DURATION;
    t.current = 0;
  }, [pos.x, pos.y, facing]);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (t.current < 1) {
      t.current = Math.min(1, t.current + delta / duration.current);
      const e = easeInOut(t.current);
      group.current.position.lerpVectors(
        start.current.pos,
        target.current.pos,
        e,
      );
      group.current.rotation.y =
        start.current.yaw + (target.current.yaw - start.current.yaw) * e;
      walkClock.current += delta * 9;
      const bounce = Math.abs(Math.sin(walkClock.current)) * 0.08;
      if (body.current) body.current.position.y = 0.55 + bounce;
      if (t.current >= 1) {
        finishMove();
        if (body.current) body.current.position.y = 0.55;
      }
    } else {
      walkClock.current += delta * 2;
      const idleBob = Math.sin(walkClock.current) * 0.04;
      if (body.current) body.current.position.y = 0.55 + idleBob;
      if (status === "won" && body.current) {
        body.current.rotation.y += delta * 4;
      }
    }
  });

  return (
    <group ref={group}>
      <group ref={body} position={[0, 0.55, 0]}>
        <CharacterVisual slug={slug} />
      </group>
    </group>
  );
}

function CharacterVisual({ slug }: { slug: CharacterSlug }) {
  if (slug === "fox") return <FoxModel />;
  if (slug === "robot") return <RobotModel />;
  return <CatModel />;
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
      <primitive object={scene} scale={0.012} position={[0, -0.55, 0]} />
    </group>
  );
}

function RobotModel() {
  const { scene } = useGLTF("/models/RobotExpressive.glb");
  return <primitive object={scene} scale={0.45} position={[0, -0.55, 0]} />;
}

useGLTF.preload("/models/Fox.glb");
useGLTF.preload("/models/RobotExpressive.glb");

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function nearestYaw(current: number, target: number) {
  const TAU = Math.PI * 2;
  let diff = (((target - current) % TAU) + TAU) % TAU;
  if (diff > Math.PI) diff -= TAU;
  return current + diff;
}
