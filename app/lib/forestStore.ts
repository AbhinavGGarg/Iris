import { create } from "zustand";
import { forestAnswerMatches, QUESTIONS, type MCQ } from "./forestQuestions";

export type ForestStatus = "idle" | "answering" | "walking" | "won";

type ForestState = {
  nodeIndex: number;
  keys: number;
  status: ForestStatus;
  currentQuestion: MCQ;
  stepCredits: number;
  lastAgentMessage: string;
  signingMode: boolean;
  error: string | null;

  startGame: () => void;
  checkAnswer: (userText: string) => void;
  grantKey: () => void;
  walkForward: () => boolean;
  finishWalk: () => void;
  celebrateWin: () => void;
  setAgentMessage: (text: string) => void;
  setError: (e: string | null) => void;
  setStatus: (s: ForestStatus) => void;
  setSigningMode: (v: boolean) => void;
  reset: () => void;
};

export const useForestStore = create<ForestState>((set, get) => ({
  nodeIndex: 0,
  keys: 0,
  status: "idle",
  currentQuestion: QUESTIONS[0],
  stepCredits: 0,
  lastAgentMessage: "",
  signingMode: false,
  error: null,

  startGame: () =>
    set({
      nodeIndex: 0,
      keys: 0,
      status: "answering",
      currentQuestion: QUESTIONS[0],
      stepCredits: 0,
      lastAgentMessage: "",
      error: null,
    }),

  checkAnswer: (userText) => {
    const { currentQuestion, status, stepCredits, keys, nodeIndex } = get();
    if (status !== "answering" || stepCredits > 0) return;
    if (!forestAnswerMatches(currentQuestion, userText)) return;
    set({
      keys: keys + 1,
      stepCredits: 0,
      nodeIndex: nodeIndex + 1,
      status: "walking",
    });
  },

  grantKey: () => {
    const { status, stepCredits, keys, nodeIndex } = get();
    if (status !== "answering") return;
    if (stepCredits > 0) return;
    set({
      keys: keys + 1,
      stepCredits: 0,
      nodeIndex: nodeIndex + 1,
      status: "walking",
    });
  },

  walkForward: () => {
    const { stepCredits, status, nodeIndex } = get();
    if (status !== "answering" || stepCredits <= 0) return false;
    const next = nodeIndex + 1;
    set({ nodeIndex: next, status: "walking", stepCredits: 0 });
    return true;
  },

  finishWalk: () => {
    const { nodeIndex, status } = get();
    if (status !== "walking") return;
    if (nodeIndex >= QUESTIONS.length) {
      get().celebrateWin();
    } else {
      set({
        status: "answering",
        currentQuestion: QUESTIONS[nodeIndex],
      });
    }
  },

  celebrateWin: () => {
    const { keys } = get();
    const msg =
      keys === 3
        ? "You found ALL 3 Keys! The treasure is WIDE open!"
        : keys >= 2
          ? "Wonderful! You found most of the keys — the treasure opens!"
          : "You made it to the treasure! Every explorer learns along the way.";
    set({ status: "won", lastAgentMessage: msg });
  },

  setAgentMessage: (text) => {
    const clean = text
      .replace(/<call:[^>]+>/g, "")
      .replace(/\bgrantKey\s*\([^)]*\)/gi, "")
      .replace(/\bgrantKey\b/gi, "")
      .replace(/\bsubmitAnswer\s*\([^)]*\)/gi, "")
      .replace(/\bsubmitAnswer\b/gi, "")
      .replace(/\bcelebrateWin\s*\([^)]*\)/gi, "")
      .replace(/\bcelebrateWin\b/gi, "")
      .replace(/\bgetGameState\s*\([^)]*\)/gi, "")
      .replace(/\bKEY_GRANTED:\d+\b/gi, "")
      .replace(/\b(i will|i'll|let me|going to|gonna)\s+(call|use|invoke|run)\b[^.!?]*/gi, "")
      .replace(/Speak this verbatim[^"]*"?/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;
    const { status, stepCredits } = get();
    if (stepCredits > 0) return;
    if (status === "walking") return;
    set({ lastAgentMessage: clean });
  },

  setError: (e) => set({ error: e }),
  setStatus: (s) => set({ status: s }),
  setSigningMode: (v) => set({ signingMode: v }),

  reset: () =>
    set({
      nodeIndex: 0,
      keys: 0,
      status: "idle",
      currentQuestion: QUESTIONS[0],
      stepCredits: 0,
      lastAgentMessage: "",
      signingMode: false,
      error: null,
    }),
}));
