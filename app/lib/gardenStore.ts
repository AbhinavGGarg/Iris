import { create } from "zustand";
import { matchFeelings, matchHelp, NEIGHBORS, type Feeling } from "./gardenStories";

/**
 * idle     → splash screen
 * feeling  → at a neighbor, child names how they feel
 * helping  → child picks a way to help
 * helped   → neighbor cheers up, flower blooms (short pause)
 * walking  → buddy walks to the next neighbor
 * won      → every flower bloomed
 */
export type GardenStatus = "idle" | "feeling" | "helping" | "helped" | "walking" | "won";

export type FeelingResult = "correct" | "clue" | "ignored";
export type HelpResult = "kind" | "unkind" | "ignored";

type GardenState = {
  status: GardenStatus;
  neighborIndex: number;
  flowers: number;
  clueShown: boolean;
  unkindPick: number | null;
  chosenHelp: number | null;
  voiceMode: boolean;
  lastAgentMessage: string;
  error: string | null;

  startGame: (voice: boolean) => void;
  answerFeeling: (text: string) => FeelingResult;
  pickFeeling: (f: Feeling) => FeelingResult;
  chooseHelp: (index: number) => HelpResult;
  answerHelp: (text: string) => HelpResult;
  handleSpeech: (text: string) => void;
  goToNextNeighbor: () => void;
  finishWalk: () => void;
  setAgentMessage: (text: string) => void;
  setError: (e: string | null) => void;
  setStatus: (s: GardenStatus) => void;
  reset: () => void;
};

const initial = {
  status: "idle" as GardenStatus,
  neighborIndex: 0,
  flowers: 0,
  clueShown: false,
  unkindPick: null,
  chosenHelp: null,
  voiceMode: false,
  lastAgentMessage: "",
  error: null,
};

export const useGardenStore = create<GardenState>((set, get) => ({
  ...initial,

  startGame: (voice) =>
    set({ ...initial, status: "feeling", voiceMode: voice }),

  pickFeeling: (f) => {
    const { status, neighborIndex } = get();
    if (status !== "feeling") return "ignored";
    if (NEIGHBORS[neighborIndex]!.feeling === f) {
      set({ status: "helping", clueShown: false, unkindPick: null });
      return "correct";
    }
    set({ clueShown: true });
    return "clue";
  },

  answerFeeling: (text) => {
    const { status, neighborIndex } = get();
    if (status !== "feeling") return "ignored";
    const named = matchFeelings(text);
    if (named.length === 0) return "ignored";
    const target = NEIGHBORS[neighborIndex]!.feeling;
    return get().pickFeeling(named.includes(target) ? target : named[0]!);
  },

  chooseHelp: (index) => {
    const { status, neighborIndex, flowers } = get();
    if (status !== "helping") return "ignored";
    const choice = NEIGHBORS[neighborIndex]!.helps[index];
    if (!choice) return "ignored";
    if (!choice.kind) {
      set({ unkindPick: index });
      return "unkind";
    }
    set({ status: "helped", chosenHelp: index, unkindPick: null, flowers: flowers + 1 });
    return "kind";
  },

  answerHelp: (text) => {
    const { status, neighborIndex } = get();
    if (status !== "helping") return "ignored";
    const idx = matchHelp(text, NEIGHBORS[neighborIndex]!);
    if (idx === null) return "ignored";
    return get().chooseHelp(idx);
  },

  handleSpeech: (text) => {
    const { status } = get();
    if (status === "feeling") get().answerFeeling(text);
    else if (status === "helping") get().answerHelp(text);
  },

  goToNextNeighbor: () => {
    const { status, neighborIndex } = get();
    if (status !== "helped") return;
    set({
      status: "walking",
      neighborIndex: neighborIndex + 1,
      clueShown: false,
      unkindPick: null,
      chosenHelp: null,
    });
  },

  finishWalk: () => {
    const { status, neighborIndex } = get();
    if (status !== "walking") return;
    set({ status: neighborIndex >= NEIGHBORS.length ? "won" : "feeling" });
  },

  setAgentMessage: (text) => {
    const clean = text
      .replace(/<call:[^>]+>/g, "")
      .replace(/\b(feelingNamed|helpChosen|getGardenState)\s*(\([^)]*\))?/gi, "")
      .replace(/\[GAME EVENT\][^.]*\.?/gi, "")
      .replace(/Speak this verbatim[^"]*"?/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (clean) set({ lastAgentMessage: clean });
  },

  setError: (e) => set({ error: e }),
  setStatus: (s) => set({ status: s }),
  reset: () => set({ ...initial }),
}));
