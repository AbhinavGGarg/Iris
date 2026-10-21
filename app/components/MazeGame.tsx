"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { Canvas } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect } from "react";
import type { Direction } from "@/app/lib/maze";
import { useGameStore } from "@/app/lib/gameStore";
import AgentBridge from "./game/AgentBridge";
import CameraRig from "./game/CameraRig";
import Character3D from "./shared/Character3D";
import Goal from "./game/Goal";
import HUD from "./game/HUD";
import KeyboardDevControls from "./game/KeyboardDevControls";
import Maze from "./game/Maze";

const DIRECTION_KEYWORDS: [RegExp, Direction][] = [
  [/\bforward\b/, "forward"],
  [/\bstraight\b/, "forward"],
  [/\bahead\b/, "forward"],
  [/\bback\b/, "back"],
  [/\bbackward\b/, "back"],
  [/\bbehind\b/, "back"],
  [/\bleft\b/, "left"],
  [/\bright\b/, "right"],
];

function extractDirection(transcript: string): Direction | null {
  const lower = transcript.toLowerCase();
  for (const [re, dir] of DIRECTION_KEYWORDS) {
    if (re.test(lower)) return dir;
  }
  return null;
}

export default function MazeGame() {
  const reset = useGameStore((s) => s.reset);
  const appendTranscript = useGameStore((s) => s.appendTranscript);
  const setError = useGameStore((s) => s.setError);
  const setStatus = useGameStore((s) => s.setStatus);
  const setAgentMessage = useGameStore((s) => s.setAgentMessage);
  const onUserSpoke = useGameStore((s) => s.onUserSpoke);

  useEffect(() => { reset(); }, [reset]);

  return (
    <ConversationProvider
      onConnect={() => setError(null)}
      onError={(e) => {
        setError(typeof e === "string" ? e : "Connection error");
        setStatus("idle");
      }}
      onDisconnect={(details) => {
        const reason = details?.reason;
        if (reason === "error") {
          setError(details?.message ?? "Connection lost");
        }
        if (reason !== "user") setStatus("idle");
      }}
      onMessage={({ message, source }) => {
        const role = source === "user" ? "user" : "ai";
        appendTranscript({ role, text: message, ts: Date.now() });
        if (role === "ai") {
          setAgentMessage(message);
        } else {
          if (message.startsWith("Speak this verbatim")) return;
          const state = useGameStore.getState();
          const hasCredits = state.stepCredits > 0;
          const dir = state.voiceMovementEnabled ? extractDirection(message) : null;
          if (hasCredits && dir) {
            state.playerMove(dir);
          } else if (!hasCredits) {
            onUserSpoke();
          }
        }
      }}
    >
      <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-[#1a0b3a] via-[#10052a] to-[#06021a]">
        <Canvas
          shadows
          camera={{ position: [-4, 4, -4], fov: 55 }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#0a0420"]} />
          <fog attach="fog" args={["#160a35", 8, 22]} />

          <ambientLight intensity={0.4} />
          <hemisphereLight args={["#a78bff", "#241160", 0.7]} />
          <directionalLight
            position={[6, 10, 4]}
            intensity={1.6}
            color="#fff1d6"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight position={[0, 3, 0]} intensity={1.2} color="#ffb199" />

          <Suspense fallback={null}>
            <Environment preset="night" />
            <Maze />
            <Character3D />
            <Goal />
            <Sparkles
              count={120}
              scale={[20, 6, 20]}
              size={2.5}
              speed={0.2}
              color="#a78bff"
              opacity={0.5}
              position={[4, 3, 4]}
            />
          </Suspense>

          <CameraRig />

          <EffectComposer>
            <Bloom
              intensity={0.9}
              luminanceThreshold={0.4}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.2} darkness={0.85} />
          </EffectComposer>
        </Canvas>

        <AgentBridge />
        <KeyboardDevControls />
        <HUD />
      </div>
    </ConversationProvider>
  );
}
