import type { CharacterSlug } from "./characters";

// ElevenLabs agents in the Iris account. Each game has one agent; every buddy
// shares it, and the app sends that buddy's own prompt and greeting at start.
const MAZE_AGENT_ID = "agent_5301m5kjjbaee1rrc2e2fh3g2r3d";
const FOREST_AGENT_ID = "agent_7901m5kjjks0ecrtcdgwf4ak6q4j";

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

export const BOSS_AGENT_ID = "agent_4301m5kjjyn4fnqbv5y6f5ewepvh";
