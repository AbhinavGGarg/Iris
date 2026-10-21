"use client";

import { useEffect } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { useBossStore } from "@/app/lib/bossStore";
import BossAgentBridge from "./BossAgentBridge";
import BossArena3D from "./BossArena3D";
import BossDrawingPad from "./BossDrawingPad";
import BossHUD from "./BossHUD";

export default function BossGame() {
  const resetBoss = useBossStore((s) => s.reset);
  const appendTranscript = useBossStore((s) => s.appendTranscript);
  const setError = useBossStore((s) => s.setError);
  const setStatus = useBossStore((s) => s.setStatus);
  const setAgentMessage = useBossStore((s) => s.setAgentMessage);

  useEffect(() => { resetBoss(); }, [resetBoss]);

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
        }
      }}
    >
      <div
        className="relative h-screen w-screen overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, #1a0512, #2a0822 40%, #0a0318)",
        }}
      >
        <BossArena3D />

        <BossAgentBridge />
        <BossHUD />
        <BossDrawingPad />
      </div>
    </ConversationProvider>
  );
}