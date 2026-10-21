import { NextRequest, NextResponse } from "next/server";
import { MAZE_AGENT_IDS, BOSS_AGENT_ID } from "@/app/lib/agentIds";
import type { CharacterSlug } from "@/app/lib/characters";

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game");
  const character = (req.nextUrl.searchParams.get("character") ?? "bear") as CharacterSlug;

  const agentId = game === "boss"
    ? BOSS_AGENT_ID
    : MAZE_AGENT_IDS[character] ?? MAZE_AGENT_IDS.bear;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! } },
  );

  if (!res.ok) {
    return NextResponse.json({ error: `ElevenLabs error ${res.status}` }, { status: 502 });
  }

  const { signed_url } = await res.json();
  return NextResponse.json({ signedUrl: signed_url });
}
