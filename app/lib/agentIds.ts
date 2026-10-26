import type { CharacterSlug } from "./characters";

// ElevenLabs agents in the Iris account. Each game has one agent; every buddy
// shares it, and the app sends that buddy's own prompt and greeting at start.
const MAZE_AGENT_ID = "agent_0501m5v1r9h5e71r23n1apw0ycmq";
const FOREST_AGENT_ID = "agent_9501m5v1rj3yfqfvvynzkrj94jhb";

export const MAZE_AGENT_IDS: Record<CharacterSlug, string> = {
  bear: MAZE_AGENT_ID,
  fox: MAZE_AGENT_ID,
  robot: MAZE_AGENT_ID,
  cat: MAZE_AGENT_ID,
};

export const FOREST_AGENT_IDS: Record<CharacterSlug, string> = {
  bear: FOREST_AGENT_ID,
  fox: FOREST_AGENT_ID,
  robot: FOREST_AGENT_ID,
  cat: FOREST_AGENT_ID,
};

export const BOSS_AGENT_ID = "agent_9601m5v1rpf8f6zs0vdh8cxjf72q";

export const GARDEN_AGENT_ID = "agent_8101m5v1s2xpf1r8h8vh9tpa94eh";
