import { NextRequest } from "next/server";
import { FOREST_AGENT_IDS } from "@/app/lib/agentIds";
import type { CharacterSlug } from "@/app/lib/characters";
import { signedUrlResponse } from "@/app/lib/signedUrl";

export async function GET(req: NextRequest) {
  const character = (req.nextUrl.searchParams.get("character") ?? "robot") as CharacterSlug;
  return signedUrlResponse(FOREST_AGENT_IDS[character] ?? FOREST_AGENT_IDS.robot);
}
