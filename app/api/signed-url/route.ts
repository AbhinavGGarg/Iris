import { NextRequest } from "next/server";
import { MAZE_AGENT_IDS, BOSS_AGENT_ID } from "@/app/lib/agentIds";
import type { CharacterSlug } from "@/app/lib/characters";
import { signedUrlResponse } from "@/app/lib/signedUrl";

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game");
  const character = (req.nextUrl.searchParams.get("character") ?? "bear") as CharacterSlug;
  const agentId = game === "boss" ? BOSS_AGENT_ID : MAZE_AGENT_IDS[character] ?? MAZE_AGENT_IDS.bear;
  return signedUrlResponse(agentId);
}
