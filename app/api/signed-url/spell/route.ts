import { NextRequest, NextResponse } from "next/server";
import { FOREST_AGENT_IDS } from "@/app/lib/agentIds";
import type { CharacterSlug } from "@/app/lib/characters";

export async function GET(req: NextRequest) {
  const character = (req.nextUrl.searchParams.get("character") ?? "robot") as CharacterSlug;

  const agentId = FOREST_AGENT_IDS[character] ?? FOREST_AGENT_IDS.robot;

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
