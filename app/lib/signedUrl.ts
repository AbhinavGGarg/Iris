import { NextResponse } from "next/server";

/**
 * Asks ElevenLabs for a one-time voice session URL for an agent. The API key stays on
 * the server. If ElevenLabs says no, the error explains why in plain words (it never
 * includes the key), so a bad deploy is easy to fix from the game screen.
 */
export async function signedUrlResponse(agentId: string) {
  // Keys pasted into a dashboard often pick up a stray space or line break.
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Voice isn't set up: ELEVENLABS_API_KEY is missing on the server. Add it in Vercel and redeploy." },
      { status: 500 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
      headers: { "xi-api-key": key },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach ElevenLabs. Try again in a moment." }, { status: 502 });
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
    const d = body?.detail;
    const detail =
      typeof d === "string"
        ? d
        : d && typeof d === "object"
          ? String((d as { message?: unknown; status?: unknown }).message ?? (d as { status?: unknown }).status ?? "")
          : "";
    const why = detail ? ` (${detail.slice(0, 160)})` : "";
    const hint =
      res.status === 401
        ? "ElevenLabs rejected the API key. Check ELEVENLABS_API_KEY in Vercel, then redeploy."
        : res.status === 403
          ? "The API key isn't allowed to start agent conversations. Give it ElevenAgents access."
          : res.status === 404
            ? "ElevenLabs couldn't find this agent. The key may belong to a different ElevenLabs account than the agents."
            : res.status === 429
              ? "ElevenLabs is busy or out of credits. Try again later or check your plan."
              : "ElevenLabs couldn't start the voice session.";
    return NextResponse.json({ error: `${hint} [${res.status}]${why}` }, { status: 502 });
  }

  const { signed_url } = (await res.json()) as { signed_url: string };
  return NextResponse.json({ signedUrl: signed_url });
}
