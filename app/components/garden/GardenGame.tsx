"use client";

import { useEffect } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { useGardenStore } from "@/app/lib/gardenStore";
import GardenAgentBridge from "./GardenAgentBridge";
import GardenScene from "./GardenScene";
import GardenHUD from "./GardenHUD";

export default function GardenGame() {
  const reset = useGardenStore((s) => s.reset);
  const setError = useGardenStore((s) => s.setError);
  const setStatus = useGardenStore((s) => s.setStatus);
  const handleSpeech = useGardenStore((s) => s.handleSpeech);
  const setAgentMessage = useGardenStore((s) => s.setAgentMessage);

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <ConversationProvider
      onConnect={() => setError(null)}
      onError={(e) => {
        setError(typeof e === "string" ? e : "Connection error");
        setStatus("idle");
      }}
      onDisconnect={(details) => {
        const reason = (details as { reason?: string })?.reason;
        if (reason === "error") {
          setError((details as { message?: string })?.message ?? "Connection lost");
        }
        if (reason !== "user" && useGardenStore.getState().voiceMode) setStatus("idle");
      }}
      onMessage={({ message, source }) => {
        if (source === "user") handleSpeech(message);
        else setAgentMessage(message);
      }}
    >
      <div className="relative h-screen w-screen overflow-hidden bg-[#cdebff]">
        <GardenScene />
        <GardenAgentBridge />
        <GardenHUD />
      </div>
    </ConversationProvider>
  );
}
