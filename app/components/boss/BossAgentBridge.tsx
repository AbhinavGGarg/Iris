"use client";

import { useConversationClientTool } from "@elevenlabs/react";
import { useBossStore } from "@/app/lib/bossStore";

export default function BossAgentBridge() {
  useConversationClientTool("dealDamageToBoss", () => {
    return useBossStore.getState().dealDamageToBoss();
  });

  useConversationClientTool("dealDamageToPlayer", () => {
    return useBossStore.getState().dealDamageToPlayer();
  });

  useConversationClientTool("getBattleState", () => {
    return useBossStore.getState().getBattleState();
  });

  useConversationClientTool("triggerVictory", () => {
    const s = useBossStore.getState();
    if (s.bossHP > 0) {
      return `REJECTED. Boss still has ${s.bossHP} HP. You must call dealDamageToBoss again. Do NOT declare victory yet.`;
    }
    s.triggerVictory();
    return "Victory triggered.";
  });

  useConversationClientTool("triggerDefeat", () => {
    const s = useBossStore.getState();
    if (s.playerHP > 0) {
      return `REJECTED. Player still has ${s.playerHP} HP. The fight continues. Do NOT declare defeat yet.`;
    }
    s.triggerDefeat();
    return "Defeat triggered.";
  });

  return null;
}