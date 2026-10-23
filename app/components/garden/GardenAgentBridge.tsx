"use client";

import { useConversation, useConversationClientTool } from "@elevenlabs/react";
import { useEffect, useRef } from "react";
import { useGardenStore } from "@/app/lib/gardenStore";
import { buildStoryLine, NEIGHBORS, WIN_LINE } from "@/app/lib/gardenStories";

/**
 * The game judges answers itself (from the child's speech or taps). These tools let
 * the agent confirm what it heard, and every call is safe to repeat.
 */
export default function GardenAgentBridge() {
  const conv = useConversation();
  const status = useGardenStore((s) => s.status);
  const prevStatus = useRef(status);

  useConversationClientTool("feelingNamed", () => {
    const { status: st, neighborIndex } = useGardenStore.getState();
    if (st !== "feeling") return "ok";
    useGardenStore.getState().pickFeeling(NEIGHBORS[neighborIndex]!.feeling);
    return "ok";
  });

  useConversationClientTool("helpChosen", (params: { choice?: number | string }) => {
    const n = Number(params?.choice);
    if (!Number.isFinite(n)) return "ignored";
    return useGardenStore.getState().chooseHelp(n - 1);
  });

  useConversationClientTool("getGardenState", () => {
    const { status: st, neighborIndex, flowers } = useGardenStore.getState();
    const name = NEIGHBORS[Math.min(neighborIndex, NEIGHBORS.length - 1)]!.name;
    return `step: ${st}; neighbor: ${name}; flowers: ${flowers}/${NEIGHBORS.length}`;
  });

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;
    if (conv.status !== "connected" || prev !== "walking") return;
    const { neighborIndex } = useGardenStore.getState();
    if (status === "feeling") {
      conv.sendUserMessage(`[GAME EVENT] Speak this verbatim: "${buildStoryLine(neighborIndex)}"`);
    } else if (status === "won") {
      conv.sendUserMessage(`[GAME EVENT] Speak this verbatim: "${WIN_LINE}"`);
    }
  }, [status, conv]);

  return null;
}
