"use client";

import { useConversation, useConversationClientTool } from "@elevenlabs/react";
import { useEffect, useRef } from "react";
import { useGameStore } from "@/app/lib/gameStore";

function perceptionString(p: ReturnType<typeof useGameStore.getState>["perception"] extends () => infer R ? R : never) {
  return [
    `position: (${p.pos.x}, ${p.pos.y})`,
    `goal: (${p.goal.x}, ${p.goal.y})`,
    `forward: ${p.forward}`,
    `left: ${p.left}`,
    `right: ${p.right}`,
    `back: ${p.back}`,
    p.atGoal ? "AT_GOAL" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export default function AgentBridge() {
  const conv = useConversation();
  const stepCredits = useGameStore((s) => s.stepCredits);
  const prevCredits = useRef(stepCredits);

  useConversationClientTool("getPerception", () => {
    const p = useGameStore.getState().perception();
    const credits = useGameStore.getState().stepCredits;
    return `${perceptionString(p)}; step_credits: ${credits}`;
  });

  useConversationClientTool("moveCharacter", () => {
    const credits = useGameStore.getState().grantStep();
    if (credits === 0) {
      return "step_already_pending";
    }
    return `STEP_GRANTED:${credits}`;
  });

  useConversationClientTool("celebrateWin", () => {
    useGameStore.getState().celebrate();
    return "celebrated";
  });

  // The moment the last step is spent, hand the agent the EXACT next question
  // text and tell it to speak verbatim. Question selection is deterministic
  // (client-driven via questionIndex); the agent is just TTS here.
  //
  // Use sendUserMessage (not sendContextualUpdate): contextual updates are
  // silent context that the agent only flushes on the next user-turn
  // boundary, which is why the next question lagged for seconds. A user
  // message forces an immediate agent turn. Verified in
  // node_modules/@elevenlabs/client/dist/BaseConversation.js: only real STT
  // transcripts reach onMessage as role="user", so this won't echo back
  // into our judging path.
  useEffect(() => {
    const justSpentLast = prevCredits.current > 0 && stepCredits === 0;
    prevCredits.current = stepCredits;
    if (!justSpentLast) return;
    if (conv.status !== "connected") return;
    const p = useGameStore.getState().perception();
    if (p.atGoal) return; // celebrateWin will fire from the agent side
    const q = useGameStore.getState().currentQuestion();
    const isVideo = useGameStore.getState().videoQuestions !== null;
    const msg = isVideo
      ? `Speak this verbatim, with no preamble or additions: "${q.text}" [ACCEPT: ${q.accept.join(", ")}]`
      : `Speak this verbatim, with no preamble or additions: "${q.text}"`;
    conv.sendUserMessage(msg);
  }, [stepCredits, conv]);

  return null;
}
