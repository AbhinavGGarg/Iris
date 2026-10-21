"use client";

import { useEffect } from "react";
import { useGameStore } from "@/app/lib/gameStore";

/**
 * Always-on keyboard controls. Movement requires a step credit (earned by
 * answering correctly), unless ?dev=1 is set — then keyboard bypasses credits
 * for testing.
 */
export default function KeyboardDevControls() {
  const playerMove = useGameStore((s) => s.playerMove);
  const reset = useGameStore((s) => s.reset);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dev =
      new URLSearchParams(window.location.search).get("dev") === "1";

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          if (dev) {
            useGameStore.setState({
              stepCredits: useGameStore.getState().stepCredits + 1,
            });
          }
          playerMove("forward");
          break;
        case "s":
        case "arrowdown":
          if (dev) {
            useGameStore.setState({
              stepCredits: useGameStore.getState().stepCredits + 1,
            });
          }
          playerMove("back");
          break;
        case "a":
        case "arrowleft":
          if (dev) {
            useGameStore.setState({
              stepCredits: useGameStore.getState().stepCredits + 1,
            });
          }
          playerMove("left");
          break;
        case "d":
        case "arrowright":
          if (dev) {
            useGameStore.setState({
              stepCredits: useGameStore.getState().stepCredits + 1,
            });
          }
          playerMove("right");
          break;
        case "r":
          if (dev) reset({ seed: Math.floor(Math.random() * 1e9) });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playerMove, reset]);

  return null;
}
