import { GARDEN_AGENT_ID } from "@/app/lib/agentIds";
import { signedUrlResponse } from "@/app/lib/signedUrl";

export async function GET() {
  return signedUrlResponse(GARDEN_AGENT_ID);
}
