"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useBossStore } from "@/app/lib/bossStore";
import { useHubStore } from "@/app/lib/hubStore";
import { FX, LANDS, specialFor } from "@/app/lib/bossFx";

/**
 * All the battle effects: spell bolts with trails, the boss's fireball, the special
 * attack (charge-up, beam, explosion) and the victory burst.
 *
 * Every glowing bit is a particle in one additive point cloud (one draw call), so a big
 * explosion stays cheap. Rings, the beam and two flash lights are pooled meshes that
 * never get added or removed, which keeps three.js from recompiling shaders mid-fight.
 */

// Where things happen in the arena.
const HAND = new THREE.Vector3(0, 1.05, 2.2);
const HERO_CENTER = new THREE.Vector3(0, 0.8, 2.6);
const HERO_FEET = new THREE.Vector3(0, 0.04, 2.6);
const BOSS_CENTER = new THREE.Vector3(0, 2.25, -2.3);

const BOSS_RED = new THREE.Color("#ff3b2f");
const BOSS_ORANGE = new THREE.Color("#ff9a3c");
const WHITE = new THREE.Color("#ffffff");

// ---------- Particles ----------
const MAX = 2400;

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uHeight;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * projectionMatrix[1][1] * uHeight * 0.5 / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = pow(1.0 - d, 2.2);
    vec3 hot = mix(vColor, vec3(1.0), pow(1.0 - d, 10.0) * 0.6);
    gl_FragColor = vec4(hot, a * vAlpha * 0.85);
  }
`;

type Spawn = {
  p: THREE.Vector3;
  v?: THREE.Vector3;
  life: number;
  size: number;
  sizeEnd?: number;
  color: THREE.Color;
  gravity?: number;
  drag?: number;
};

class ParticlePool {
  readonly geometry = new THREE.BufferGeometry();
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private s0 = new Float32Array(MAX);
  private s1 = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private drag = new Float32Array(MAX);
  private cursor = 0;

  constructor() {
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute("aColor", new THREE.BufferAttribute(this.col, 3));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    this.geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1));
  }

  spawn(o: Spawn) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    this.pos.set([o.p.x, o.p.y, o.p.z], i * 3);
    this.vel.set(o.v ? [o.v.x, o.v.y, o.v.z] : [0, 0, 0], i * 3);
    this.col.set([o.color.r, o.color.g, o.color.b], i * 3);
    this.life[i] = this.maxLife[i] = o.life;
    this.s0[i] = o.size;
    this.s1[i] = o.sizeEnd ?? 0;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.size[i] = o.size;
    this.alpha[i] = 1;
  }

  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i]! <= 0) continue;
      this.life[i]! -= dt;
      if (this.life[i]! <= 0) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      const k = i * 3;
      const damp = Math.max(0, 1 - this.drag[i]! * dt);
      this.vel[k]! *= damp;
      this.vel[k + 1] = this.vel[k + 1]! * damp - this.grav[i]! * dt;
      this.vel[k + 2]! *= damp;
      this.pos[k]! += this.vel[k]! * dt;
      this.pos[k + 1]! += this.vel[k + 1]! * dt;
      this.pos[k + 2]! += this.vel[k + 2]! * dt;
      const t = 1 - this.life[i]! / this.maxLife[i]!;
      this.size[i] = this.s0[i]! + (this.s1[i]! - this.s0[i]!) * t;
      this.alpha[i] = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9;
    }
    for (const name of ["position", "aColor", "aSize", "aAlpha"]) this.geometry.getAttribute(name).needsUpdate = true;
  }
}

// ---------- Small helpers ----------
const tmp = new THREE.Vector3();
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
function randDir(out = new THREE.Vector3()) {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return out.set(r * Math.cos(a), u, r * Math.sin(a));
}
function mixColor(a: THREE.Color, b: THREE.Color, t: number) {
  return a.clone().lerp(b, t);
}
/** A gentle arc between two points, so bolts swoop instead of flying in a straight line. */
function arcPoint(from: THREE.Vector3, to: THREE.Vector3, u: number, height: number, wobble: number, out: THREE.Vector3) {
  out.lerpVectors(from, to, u);
  out.y += Math.sin(u * Math.PI) * height;
  out.x += Math.sin(u * Math.PI * 2) * wobble;
  return out;
}

type Ring = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; start: number; dur: number; from: number; to: number; flat: boolean };

/** Owns everything the effects mutate each frame: particles, their material and the ring pool. */
class FxEngine {
  readonly pool = new ParticlePool();
  readonly material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uHeight: { value: 800 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  readonly ringGroup = new THREE.Group();
  private rings: Ring[] = [];

  constructor() {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), mat);
      mesh.visible = false;
      mesh.renderOrder = 9;
      this.ringGroup.add(mesh);
      this.rings.push({ mesh, mat, start: -1, dur: 0, from: 0, to: 0, flat: false });
    }
  }

  setHeight(h: number) {
    this.material.uniforms.uHeight!.value = h;
  }

  ring(now: number, at: THREE.Vector3, color: THREE.Color, from: number, to: number, dur: number, flat: boolean) {
    const r = this.rings.find((x) => x.start < 0) ?? this.rings[0]!;
    r.start = now;
    r.dur = dur;
    r.from = from;
    r.to = to;
    r.flat = flat;
    r.mat.color.copy(color);
    r.mesh.position.copy(at);
    r.mesh.visible = true;
  }

  updateRings(now: number, cameraQuat: THREE.Quaternion) {
    for (const r of this.rings) {
      if (r.start < 0) continue;
      const k = (now - r.start) / r.dur;
      if (k >= 1) {
        r.start = -1;
        r.mesh.visible = false;
        continue;
      }
      const ease = 1 - Math.pow(1 - k, 3);
      r.mesh.scale.setScalar(r.from + (r.to - r.from) * ease);
      r.mat.opacity = Math.pow(1 - k, 1.5) * 0.9;
      if (r.flat) r.mesh.rotation.set(-Math.PI / 2, 0, 0);
      else r.mesh.quaternion.copy(cameraQuat);
    }
  }

  dispose() {
    this.pool.geometry.dispose();
    this.material.dispose();
    for (const r of this.rings) {
      r.mesh.geometry.dispose();
      r.mat.dispose();
    }
  }
}
type Effect = { start: number; end: number; tick: (t: number, dt: number) => void };
type Queued = "spell" | "boss" | "special" | "victory";

export default function BossFx3D() {
  const { camera, gl } = useThree();
  const slug = useHubStore((s) => s.selectedCharacter);
  const calmMode = useBossStore((s) => s.calmMode);
  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const playerHitKey = useBossStore((s) => s.playerHitKey);
  const specialKey = useBossStore((s) => s.specialKey);
  const status = useBossStore((s) => s.status);

  const [engine] = useState(() => new FxEngine());
  const pool = engine.pool;

  const beamGroup = useRef<THREE.Group>(null!);
  const beamOuter = useRef<THREE.Mesh>(null!);
  const beamInner = useRef<THREE.Mesh>(null!);
  const beamHaze = useRef<THREE.Mesh>(null!);
  const lightHero = useRef<THREE.PointLight>(null!);
  const lightBoss = useRef<THREE.PointLight>(null!);

  const queue = useRef<Queued[]>([]);
  const effects = useRef<Effect[]>([]);
  const now = useRef(0);
  // Light flashes decay on their own; effects just bump them.
  const heroFlash = useRef({ v: 0, color: new THREE.Color() });
  const bossFlash = useRef({ v: 0, color: new THREE.Color() });

  useEffect(() => () => engine.dispose(), [engine]);

  useEffect(() => { if (bossHitKey > 0) queue.current.push("spell"); }, [bossHitKey]);
  useEffect(() => { if (playerHitKey > 0) queue.current.push("boss"); }, [playerHitKey]);
  useEffect(() => { if (specialKey > 0) queue.current.push("special"); }, [specialKey]);
  useEffect(() => { if (status === "victory") queue.current.push("victory"); }, [status]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    now.current += dt;
    const t0 = now.current;
    engine.setHeight(gl.domElement.height);

    const move = specialFor(slug);
    const heroColor = new THREE.Color(move.color);
    const heroGlow = new THREE.Color(move.glow);
    const calm = calmMode;

    const ring = (at: THREE.Vector3, color: THREE.Color, from: number, to: number, dur: number, flat: boolean) =>
      engine.ring(now.current, at, color, from, to, dur, flat);

    const burst = (at: THREE.Vector3, color: THREE.Color, glow: THREE.Color, power: number) => {
      const n = Math.round(30 * power);
      for (let i = 0; i < n; i++) {
        const v = randDir().multiplyScalar(rand(2, 6) * Math.sqrt(power));
        pool.spawn({ p: at, v, life: rand(0.4, 0.8), size: rand(0.18, 0.34) * Math.sqrt(power), color: Math.random() < 0.4 ? WHITE : mixColor(color, glow, Math.random()), gravity: 4, drag: 2.2 });
      }
      pool.spawn({ p: at, life: 0.12, size: 1.3 * power, sizeEnd: 2.2 * power, color: WHITE });
      pool.spawn({ p: at, life: 0.28, size: 1.0 * power, sizeEnd: 2.4 * power, color: glow });
      for (let i = 0; i < 6 * power; i++) {
        pool.spawn({ p: at, v: randDir().multiplyScalar(rand(0.6, 1.4)), life: rand(0.5, 0.9), size: rand(0.6, 1.0) * power, sizeEnd: 0.2, color: mixColor(color, BOSS_RED, 0.25), drag: 1.5 });
      }
      ring(at, color, 0.2, 1.6 + power, 0.35 + 0.1 * power, false);
    };

    // Turn queued triggers into timed effects.
    for (const kind of queue.current) {
      const start = now.current;
      if (kind === "spell") {
        let landed = false;
        let last: THREE.Vector3 | null = null;
        effects.current.push({
          start,
          end: start + FX.spellTravel + 0.1,
          tick: (t) => {
            if (t < 0.05) {
              for (let i = 0; i < 4; i++) pool.spawn({ p: HAND, v: randDir().multiplyScalar(rand(1.5, 3)), life: 0.25, size: 0.2, color: heroGlow, drag: 3 });
              heroFlash.current.v = Math.max(heroFlash.current.v, calm ? 2 : 4);
              heroFlash.current.color.copy(heroColor);
            }
            if (t < FX.spellTravel) {
              const u = Math.pow(t / FX.spellTravel, 1.25);
              const head = arcPoint(HAND, BOSS_CENTER, u, 0.7, 0.25, tmp.clone());
              pool.spawn({ p: head, life: 0.05, size: 0.95, color: heroColor });
              pool.spawn({ p: head, life: 0.04, size: 0.38, color: WHITE });
              // Fill the gap since last frame so the trail is a smooth streak, not beads.
              const from = last ?? head;
              const steps = Math.max(2, Math.ceil(from.distanceTo(head) / 0.06));
              for (let i = 0; i < steps; i++) {
                const p = new THREE.Vector3().lerpVectors(from, head, i / steps);
                pool.spawn({ p, v: randDir().multiplyScalar(0.25), life: rand(0.22, 0.36), size: 0.46, sizeEnd: 0.02, color: i % 4 === 0 ? heroGlow : heroColor });
              }
              last = head;
              if (Math.random() < 0.7) pool.spawn({ p: head, v: randDir().multiplyScalar(1.2), life: 0.6, size: 0.1, color: WHITE, gravity: 2 });
            } else if (!landed) {
              landed = true;
              burst(BOSS_CENTER, heroColor, heroGlow, 1);
              bossFlash.current.v = calm ? 5 : 12;
              bossFlash.current.color.copy(heroGlow);
            }
          },
        });
      } else if (kind === "boss") {
        let landed = false;
        let last: THREE.Vector3 | null = null;
        const from = BOSS_CENTER.clone().add(new THREE.Vector3(0, -0.2, 0.5));
        const to = HERO_CENTER.clone().add(new THREE.Vector3(0, 0.2, -0.2));
        effects.current.push({
          start,
          end: start + LANDS.boss + 0.1,
          tick: (t) => {
            if (t < FX.bossWindup) {
              // Red energy gets sucked into the boss.
              const k = t / FX.bossWindup;
              for (let i = 0; i < 4; i++) {
                const dir = randDir();
                const r = rand(1.4, 2.2);
                const p = BOSS_CENTER.clone().addScaledVector(dir, r);
                pool.spawn({ p, v: dir.clone().multiplyScalar(-r / 0.32), life: 0.32, size: 0.22, sizeEnd: 0.05, color: Math.random() < 0.5 ? BOSS_RED : BOSS_ORANGE });
              }
              bossFlash.current.v = Math.max(bossFlash.current.v, (calm ? 1.5 : 4) * k);
              bossFlash.current.color.copy(BOSS_RED);
            } else if (t < LANDS.boss) {
              const u = (t - FX.bossWindup) / FX.bossTravel;
              const head = arcPoint(from, to, u, 0.4, -0.2, tmp.clone());
              pool.spawn({ p: head, life: 0.05, size: 1.35, color: BOSS_RED });
              pool.spawn({ p: head, life: 0.04, size: 0.6, color: BOSS_ORANGE });
              pool.spawn({ p: head, life: 0.03, size: 0.25, color: WHITE });
              const prev = last ?? head;
              const steps = Math.max(2, Math.ceil(prev.distanceTo(head) / 0.07));
              for (let i = 0; i < steps; i++) {
                const p = new THREE.Vector3().lerpVectors(prev, head, i / steps);
                pool.spawn({ p, v: randDir().multiplyScalar(0.5).add(new THREE.Vector3(0, 0.4, 0)), life: rand(0.25, 0.45), size: 0.6, sizeEnd: 0.08, color: mixColor(BOSS_RED, BOSS_ORANGE, Math.random() * 0.5) });
              }
              last = head;
              if (Math.random() < 0.8) pool.spawn({ p: head, v: randDir().multiplyScalar(1.5), life: 0.7, size: 0.11, color: BOSS_ORANGE, gravity: 3 });
            } else if (!landed) {
              landed = true;
              burst(to, BOSS_RED, BOSS_ORANGE, 0.9);
              ring(HERO_FEET, BOSS_ORANGE, 0.3, 2.2, 0.45, true);
              heroFlash.current.v = calm ? 5 : 12;
              heroFlash.current.color.copy(BOSS_RED);
            }
          },
        });
      } else if (kind === "special") {
        let fired = false;
        let landed = false;
        let ringed = false;
        const ballAt = HAND.clone().add(new THREE.Vector3(0, 0.25, -0.35));
        effects.current.push({
          start,
          end: start + FX.specialCharge + FX.specialBeam + 0.2,
          tick: (t) => {
            const beamStart = FX.specialCharge;
            const beamEnd = FX.specialCharge + FX.specialBeam;
            if (t < beamStart) {
              const k = t / beamStart;
              // Energy spirals into the hero from all around.
              for (let i = 0; i < 7; i++) {
                const dir = randDir();
                const r = rand(1.4, 2.4);
                const p = HERO_CENTER.clone().addScaledVector(dir, r);
                const inward = dir.clone().multiplyScalar(-r / 0.35);
                const swirl = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(2.2);
                pool.spawn({ p, v: inward.add(swirl), life: 0.35, size: 0.2, sizeEnd: 0.05, color: Math.random() < 0.3 ? WHITE : heroGlow });
              }
              // Sparks rise from the ground around the hero.
              for (let i = 0; i < 3; i++) {
                const a = Math.random() * Math.PI * 2;
                const p = HERO_FEET.clone().add(new THREE.Vector3(Math.cos(a) * 0.9, 0.05, Math.sin(a) * 0.9));
                pool.spawn({ p, v: new THREE.Vector3(0, rand(1.5, 3), 0), life: 0.6, size: 0.14, color: heroColor });
              }
              // A ball of power grows in front of the hero.
              pool.spawn({ p: ballAt, life: 0.06, size: 0.4 + 1.5 * k, color: heroColor });
              pool.spawn({ p: ballAt, life: 0.05, size: 0.2 + 0.7 * k, color: WHITE });
              if (!ringed) {
                ringed = true;
                ring(HERO_FEET, heroColor, 0.6, 1.8, beamStart, true);
              }
              heroFlash.current.v = Math.max(heroFlash.current.v, (calm ? 3 : 8) * k);
              heroFlash.current.color.copy(heroColor);
            } else if (t < beamEnd) {
              if (!fired) {
                fired = true;
                burst(ballAt, heroColor, heroGlow, 0.8);
              }
              const k = (t - beamStart) / FX.specialBeam;
              const ramp = Math.min(1, (t - beamStart) / 0.08) * Math.min(1, (beamEnd - t) / 0.15);
              const flicker = calm ? 1 : 0.85 + Math.random() * 0.3;
              const beam = beamGroup.current;
              beam.visible = true;
              const len = ballAt.distanceTo(BOSS_CENTER);
              beam.position.lerpVectors(ballAt, BOSS_CENTER, 0.5);
              beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.subVectors(BOSS_CENTER, ballAt).normalize());
              beamOuter.current.scale.set(ramp * flicker, len, ramp * flicker);
              beamInner.current.scale.set(ramp, len, ramp);
              beamHaze.current.scale.set(ramp * (1 + Math.sin(t * 40) * 0.08), len, ramp * (1 + Math.sin(t * 40) * 0.08));
              (beamOuter.current.material as THREE.MeshBasicMaterial).color.copy(heroColor);
              (beamHaze.current.material as THREE.MeshBasicMaterial).color.copy(heroColor);
              // Sparks spin off the beam, and the boss gets showered.
              for (let i = 0; i < 6; i++) {
                const p = new THREE.Vector3().lerpVectors(ballAt, BOSS_CENTER, Math.random());
                const out = randDir().multiplyScalar(rand(1, 2.5));
                pool.spawn({ p, v: out, life: 0.3, size: 0.22, sizeEnd: 0.02, color: Math.random() < 0.4 ? WHITE : heroGlow, drag: 2 });
              }
              for (let i = 0; i < 5; i++) {
                pool.spawn({ p: BOSS_CENTER, v: randDir().multiplyScalar(rand(3, 7)), life: rand(0.3, 0.6), size: 0.18, color: Math.random() < 0.5 ? WHITE : heroGlow, gravity: 4, drag: 2 });
              }
              pool.spawn({ p: ballAt, life: 0.05, size: 1.6 * ramp, color: heroColor });
              heroFlash.current.v = Math.max(heroFlash.current.v, (calm ? 3 : 7) * ramp);
              bossFlash.current.v = Math.max(bossFlash.current.v, (calm ? 4 : 10) * ramp);
              bossFlash.current.color.copy(heroGlow);
              if (!landed && t >= LANDS.special) {
                landed = true;
                burst(BOSS_CENTER, heroColor, heroGlow, 2.4);
                ring(BOSS_CENTER, WHITE, 0.3, 5, 0.55, false);
              }
              if (k > 0.5 && Math.random() < 0.08) burst(BOSS_CENTER.clone().add(randDir().multiplyScalar(0.6)), heroColor, heroGlow, 0.7);
            } else {
              beamGroup.current.visible = false;
            }
          },
        });
      } else if (kind === "victory") {
        const finisher = useBossStore.getState().finisher;
        const delay = finisher === "special" ? LANDS.special + 0.4 : LANDS.spell + 0.25;
        const pops = [0, 0.25, 0.5, 0.8, 1.1];
        const done = new Set<number>();
        const confetti = ["#ffd23f", "#ff5c8a", "#7dd3fc", "#a3e635", "#c084fc"].map((c) => new THREE.Color(c));
        effects.current.push({
          start: start + delay,
          end: start + delay + 2.2,
          tick: (t) => {
            pops.forEach((at, i) => {
              if (t >= at && !done.has(i)) {
                done.add(i);
                const p = BOSS_CENTER.clone().add(randDir().multiplyScalar(i === 4 ? 0 : 0.7));
                burst(p, heroColor, i === 4 ? WHITE : heroGlow, i === 4 ? 2.6 : 1.1);
                bossFlash.current.v = calm ? 5 : 12;
              }
            });
            // Confetti fountain around the hero.
            if (t > 0.9 && t < 2.0) {
              for (let i = 0; i < 6; i++) {
                const a = Math.random() * Math.PI * 2;
                const p = HERO_FEET.clone().add(new THREE.Vector3(Math.cos(a) * 1.2, 0.1, Math.sin(a) * 1.2 - 0.6));
                pool.spawn({ p, v: new THREE.Vector3(rand(-1, 1), rand(4, 7), rand(-1, 1)), life: 1.4, size: 0.16, color: confetti[i % confetti.length]!, gravity: 7, drag: 0.4 });
              }
            }
          },
        });
      }
    }
    queue.current = [];

    // Run effects on the canvas clock.
    effects.current = effects.current.filter((e) => {
      if (t0 >= e.start) e.tick(t0 - e.start, dt);
      if (t0 > e.end) {
        if (beamGroup.current) beamGroup.current.visible = false;
        return false;
      }
      return true;
    });

    pool.update(dt);

    // Rings expand and fade.
    engine.updateRings(now.current, camera.quaternion);

    // Flash lights decay quickly.
    heroFlash.current.v *= Math.pow(0.0002, dt);
    bossFlash.current.v *= Math.pow(0.0002, dt);
    if (lightHero.current) {
      lightHero.current.intensity = heroFlash.current.v;
      lightHero.current.color.copy(heroFlash.current.color);
    }
    if (lightBoss.current) {
      lightBoss.current.intensity = bossFlash.current.v;
      lightBoss.current.color.copy(bossFlash.current.color);
    }
  });

  return (
    <group>
      <points geometry={pool.geometry} material={engine.material} frustumCulled={false} renderOrder={10} />
      <primitive object={engine.ringGroup} />
      <group ref={beamGroup} visible={false}>
        <mesh ref={beamHaze} renderOrder={7}>
          <cylinderGeometry args={[0.65, 0.65, 1, 24, 1, true]} />
          <meshBasicMaterial transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={beamOuter} renderOrder={8}>
          <cylinderGeometry args={[0.42, 0.42, 1, 24, 1, true]} />
          <meshBasicMaterial transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={beamInner} renderOrder={8}>
          <cylinderGeometry args={[0.15, 0.15, 1, 16, 1, true]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <pointLight ref={lightHero} position={[HERO_CENTER.x, HERO_CENTER.y + 0.6, HERO_CENTER.z - 0.4]} intensity={0} distance={7} decay={1.6} />
      <pointLight ref={lightBoss} position={[BOSS_CENTER.x, BOSS_CENTER.y, BOSS_CENTER.z + 0.8]} intensity={0} distance={9} decay={1.6} />
    </group>
  );
}
