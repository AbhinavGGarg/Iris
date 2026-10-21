"use client";

import { useEffect } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { useForestStore } from "@/app/lib/forestStore";
import ForestAgentBridge from "./ForestAgentBridge";
import ForestScene from "./ForestScene";
import ForestHUD from "./ForestHUD";
import ASLSigningOverlay from "./ASLSigningOverlay";

export default function ForestGame() {
  const resetForest = useForestStore((s) => s.reset);
  const setError = useForestStore((s) => s.setError);
  const setStatus = useForestStore((s) => s.setStatus);
  const setAgentMessage = useForestStore((s) => s.setAgentMessage);
  const checkAnswer = useForestStore((s) => s.checkAnswer);

  useEffect(() => { resetForest(); }, [resetForest]);

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
        if (reason !== "user") setStatus("idle");
      }}
      onMessage={({ message, source }) => {
        if (source === "user") {
          checkAnswer(message);
        } else {
          setAgentMessage(message);
        }
      }}
    >
      <div className="relative h-screen w-screen overflow-hidden bg-[#0b0907]">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1c1208] via-[#0e0b07] to-[#060404]" />
          <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 translate-y-1/4 rounded-full bg-amber-900/25 blur-[140px]" />
          <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-stone-700/15 blur-[110px]" />
          <div className="absolute left-1/2 top-1/2 h-80 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-800/10 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-40"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 40%, #000 100%)" }}
          />
        </div>
        <ForestScene />
        <ForestAgentBridge />
        <ForestHUD />
        <ASLSigningOverlay />
      </div>
    </ConversationProvider>
  );
}
