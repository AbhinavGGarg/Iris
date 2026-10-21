"use client";

const FUR = "#d6c07a";
const CREAM = "#f0dfa0";
const PINK = "#e8a0b0";
const NOSE_PINK = "#de7a90";
const DARK_FUR = "#b5a060";
const EYE_GREEN = "#5a9a4a";
const WHISKER = "#c8b870";

export default function CatModel() {
  return (
    <group>
      {/* ---- Body ---- */}
      <mesh castShadow>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color={FUR} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.02, 0.18]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={CREAM} roughness={0.8} />
      </mesh>

      {/* ---- Head ---- */}
      <group position={[0, 0.42, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.27, 24, 24]} />
          <meshStandardMaterial color={FUR} roughness={0.7} />
        </mesh>

        {/* Cheek puffs */}
        <mesh position={[-0.12, -0.06, 0.19]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color={CREAM} roughness={0.8} />
        </mesh>
        <mesh position={[0.12, -0.06, 0.19]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color={CREAM} roughness={0.8} />
        </mesh>

        {/* Left ear outer + inner pink */}
        <mesh position={[-0.17, 0.24, -0.02]} rotation={[0, 0, 0.15]}>
          <coneGeometry args={[0.09, 0.22, 4]} />
          <meshStandardMaterial color={FUR} roughness={0.7} />
        </mesh>
        <mesh position={[-0.165, 0.24, 0.0]} rotation={[0, 0, 0.15]}>
          <coneGeometry args={[0.055, 0.14, 4]} />
          <meshStandardMaterial color={PINK} roughness={0.6} />
        </mesh>

        {/* Right ear outer + inner pink */}
        <mesh position={[0.17, 0.24, -0.02]} rotation={[0, 0, -0.15]}>
          <coneGeometry args={[0.09, 0.22, 4]} />
          <meshStandardMaterial color={FUR} roughness={0.7} />
        </mesh>
        <mesh position={[0.165, 0.24, 0.0]} rotation={[0, 0, -0.15]}>
          <coneGeometry args={[0.055, 0.14, 4]} />
          <meshStandardMaterial color={PINK} roughness={0.6} />
        </mesh>

        {/* Left eye: sclera → iris → pupil → highlight */}
        <mesh position={[-0.1, 0.06, 0.225]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[-0.1, 0.06, 0.265]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={EYE_GREEN} roughness={0.4} />
        </mesh>
        <mesh position={[-0.1, 0.06, 0.288]}>
          <sphereGeometry args={[0.017, 8, 8]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[-0.088, 0.073, 0.293]}>
          <sphereGeometry args={[0.007, 6, 6]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1}
          />
        </mesh>

        {/* Right eye */}
        <mesh position={[0.1, 0.06, 0.225]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 0.06, 0.265]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={EYE_GREEN} roughness={0.4} />
        </mesh>
        <mesh position={[0.1, 0.06, 0.288]}>
          <sphereGeometry args={[0.017, 8, 8]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[0.112, 0.073, 0.293]}>
          <sphereGeometry args={[0.007, 6, 6]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1}
          />
        </mesh>

        {/* Nose */}
        <mesh position={[0, -0.035, 0.27]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color={NOSE_PINK} roughness={0.5} />
        </mesh>

        {/* Whiskers — left */}
        <mesh
          position={[-0.25, -0.02, 0.2]}
          rotation={[0, 0, Math.PI / 2 + 0.15]}
        >
          <cylinderGeometry args={[0.003, 0.002, 0.2, 4]} />
          <meshStandardMaterial color={WHISKER} />
        </mesh>
        <mesh position={[-0.25, -0.04, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.003, 0.002, 0.2, 4]} />
          <meshStandardMaterial color={WHISKER} />
        </mesh>
        <mesh
          position={[-0.24, -0.06, 0.2]}
          rotation={[0, 0, Math.PI / 2 - 0.15]}
        >
          <cylinderGeometry args={[0.003, 0.002, 0.18, 4]} />
          <meshStandardMaterial color={WHISKER} />
        </mesh>

        {/* Whiskers — right */}
        <mesh
          position={[0.25, -0.02, 0.2]}
          rotation={[0, 0, Math.PI / 2 + 0.15]}
        >
          <cylinderGeometry args={[0.003, 0.002, 0.2, 4]} />
          <meshStandardMaterial color={WHISKER} />
        </mesh>
        <mesh position={[0.25, -0.04, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.003, 0.002, 0.2, 4]} />
          <meshStandardMaterial color={WHISKER} />
        </mesh>
        <mesh
          position={[0.24, -0.06, 0.2]}
          rotation={[0, 0, Math.PI / 2 - 0.15]}
        >
          <cylinderGeometry args={[0.003, 0.002, 0.18, 4]} />
          <meshStandardMaterial color={WHISKER} />
        </mesh>
      </group>

      {/* ---- Paws ---- */}
      <mesh castShadow position={[-0.18, -0.3, 0.1]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={CREAM} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.18, -0.3, 0.1]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={CREAM} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.15, -0.3, -0.1]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={CREAM} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.15, -0.3, -0.1]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={CREAM} roughness={0.7} />
      </mesh>

      {/* ---- Tail (3-segment curve) ---- */}
      <mesh castShadow position={[0, 0.08, -0.34]}>
        <capsuleGeometry args={[0.04, 0.22, 6, 12]} />
        <meshStandardMaterial color={FUR} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.28, -0.38]} rotation={[0.6, 0, 0]}>
        <capsuleGeometry args={[0.035, 0.15, 6, 12]} />
        <meshStandardMaterial color={FUR} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.4, -0.32]} rotation={[1.2, 0, 0]}>
        <capsuleGeometry args={[0.028, 0.1, 6, 12]} />
        <meshStandardMaterial color={DARK_FUR} roughness={0.7} />
      </mesh>
    </group>
  );
}
