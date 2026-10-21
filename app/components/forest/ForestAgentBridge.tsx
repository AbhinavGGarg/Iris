"use client";

import { useConversation, useConversationClientTool } from "@elevenlabs/react";
import { useEffect, useRef } from "react";
import { useForestStore } from "@/app/lib/forestStore";
import { QUESTIONS } from "@/app/lib/forestQuestions";

function formatQuestion(idx: number): string {
  const q = QUESTIONS[idx];
  return `${q.question} A: ${q.choices.A}. B: ${q.choices.B}. C: ${q.choices.C}. D: ${q.choices.D}.`;
}

export default function ForestAgentBridge() {
  const conv = useConversation();
  const status = useForestStore((s) => s.status);
  const prevStatus = useRef(status);

  // Stubs — the client evaluates answers directly via checkAnswer.
  // These exist only so ElevenLabs doesn't error if the agent tries to call them.
  useConversationClientTool("grantKey", () => "ok");
  useConversationClientTool("celebrateWin", () => "ok");
  useConversationClientTool("submitAnswer", () => "ok");
  useConversationClientTool("getGameState", () => {
    const { nodeIndex, keys } = useForestStore.getState();
    return `question: ${nodeIndex + 1}/3; keys: ${keys}`;
  });

  // After walking finishes and status transitions to "answering",
  // send the next question text to the agent for TTS.
  useEffect(() => {
    const wasWalking = prevStatus.current === "walking";
    prevStatus.current = status;
    if (!wasWalking || status !== "answering") return;
    if (conv.status !== "connected") return;
    const idx = useForestStore.getState().nodeIndex;
    if (idx >= QUESTIONS.length) return;
    conv.sendUserMessage(
      `Speak this verbatim, with no preamble or additions: "${formatQuestion(idx)}"`,
    );
  }, [status, conv]);

  return null;
}
