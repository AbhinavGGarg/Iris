"use client";

import { useConversation, useConversationClientTool } from "@elevenlabs/react";
import { useEffect, useRef } from "react";
import { useBossStore } from "@/app/lib/bossStore";

/**
 * The game decides every hit. This bridge forwards each new narration line to the
 * voice buddy, and keeps a read-only state tool in case the agent asks.
 */
export default function BossAgentBridge() {
  const conv = useConversation();
  const narration = useBossStore((s) => s.narration);
  const lastSent = useRef(0);

  useConversationClientTool("getBattleState", () => useBossStore.getState().getBattleState());

  useEffect(() => {
    if (!narration || narration.key === lastSent.current) return;
    lastSent.current = narration.key;
    if (conv.status !== "connected") return;
    conv.sendUserMessage(`[GAME EVENT] ${narration.text}`);
  }, [narration, conv]);

  return null;
}
