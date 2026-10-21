import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CharacterSlug } from "./characters";

export type Topic = "science" | "math" | "spelling_asl";

type HubState = {
  selectedTopic: Topic | null;
  selectedCharacter: CharacterSlug | null;
  setSelectedTopic: (t: Topic | null) => void;
  setSelectedCharacter: (c: CharacterSlug | null) => void;
  reset: () => void;
};

export const useHubStore = create<HubState>()(
  persist(
    (set) => ({
      selectedTopic: null,
      selectedCharacter: null,
      setSelectedTopic: (t) => set({ selectedTopic: t }),
      setSelectedCharacter: (c) => set({ selectedCharacter: c }),
      reset: () => set({ selectedTopic: null, selectedCharacter: null }),
    }),
    {
      name: "hub-store",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<HubState> | undefined;
        return {
          ...current,
          ...p,
          selectedTopic: migrateTopic(p?.selectedTopic ?? current.selectedTopic),
        };
      },
    },
  ),
);

export const TOPIC_TO_ROUTE: Record<Topic, string> = {
  science: "/play/maze",
  math: "/play/boss",
  spelling_asl: "/play/adventure",
};

function migrateTopic(raw: unknown): Topic | null {
  if (raw === null || raw === undefined) return null;
  if (raw === "science" || raw === "math" || raw === "spelling_asl") return raw;
  if (raw === "reading" || raw === "asl") return "spelling_asl";
  return null;
}
