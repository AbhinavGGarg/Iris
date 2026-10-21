import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  process.env.HACKDAVIS_GEMINI_URL ?? "https://generativelanguage.googleapis.com";
const API_KEY = process.env.HACKDAVIS_GEMINI_API_KEY ?? "";
const MODEL_NAME =
  process.env.HACKDAVIS_GEMINI_MODEL ?? "gemini-3-pro-image-preview";
const TIMEOUT_MS =
  parseInt(process.env.HACKDAVIS_GEMINI_TIMEOUT ?? "500", 10) * 1000;

const SYSTEM_INSTRUCTION =
  "You are a math teacher grading a student's handwritten work. " +
  "Annotate the image visually with grading marks. Then output a final verdict.";

function buildPrompt(
  problem: string,
  solutionSteps: string[],
  answer: string,
): string {
  const stepsBlock =
    solutionSteps.length > 0
      ? solutionSteps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")
      : "  (no steps provided)";
  return `
You are a math teacher grading a student's handwritten work on a whiteboard.

The problem was: ${problem}
The correct solution steps (your grading key — do NOT reveal these in the image):
${stepsBlock}
The correct final answer: ${answer}

Analyze the student's drawing and annotate it directly like a teacher would.

Draw on the image:
- Green checkmarks next to correct steps or correct final answer
- Red X marks next to incorrect steps
- Circle the exact location of the first mistake (if any)
- Write a short note near the mistake (e.g., "sign error", "incorrect subtraction")
- If needed, write the corrected step near the error
- Optionally write the correct final answer at the bottom

A drawing is "correct" only if the student's final answer matches: ${answer}
A drawing is "incorrect" if the final answer is wrong, missing, unreadable, or absent.

After the annotated image, output a SINGLE trailing text part with this EXACT format on two lines:
VERDICT=correct
NOTE=<short feedback, max 10 words>

(Use VERDICT=incorrect when the answer is wrong.)

IMPORTANT:
- ALWAYS return the annotated image
- ALWAYS return the trailing VERDICT and NOTE text
- All visual feedback must be drawn on the image itself
`.trim();
}

type Verdict = "correct" | "incorrect";

type ExtractResult = {
  annotatedImageBase64: string | null;
  verdict: Verdict;
  note: string;
};

type GeminiPart = {
  text?: string;
  inline_data?: { data?: string; mime_type?: string };
  inlineData?: { data?: string; mimeType?: string };
};

type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
type GeminiResponse = { candidates?: GeminiCandidate[] };

function extract(responseJson: GeminiResponse): ExtractResult {
  let imageB64: string | null = null;
  let verdict: Verdict = "incorrect";
  let note = "";

  const candidates = responseJson?.candidates ?? [];
  for (const cand of candidates) {
    const parts = cand?.content?.parts ?? [];
    for (const part of parts) {
      if (!imageB64 && part?.inline_data?.data) {
        imageB64 = part.inline_data.data;
      } else if (!imageB64 && part?.inlineData?.data) {
        imageB64 = part.inlineData.data;
      }
      if (typeof part?.text === "string") {
        const v = part.text.match(/VERDICT\s*=\s*(correct|incorrect)/i);
        if (v) verdict = v[1].toLowerCase() as Verdict;
        const n = part.text.match(/NOTE\s*=\s*(.+?)(?:\n|$)/i);
        if (n) note = n[1].trim();
      }
    }
  }
  return { annotatedImageBase64: imageB64, verdict, note };
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Missing HACKDAVIS_GEMINI_API_KEY" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { imageBase64, problem, solutionSteps, answer } = body as {
    imageBase64?: string;
    problem?: string;
    solutionSteps?: string[];
    answer?: string;
  };
  if (!imageBase64 || !problem || !answer) {
    return NextResponse.json(
      { error: "Missing imageBase64, problem, or answer" },
      { status: 400 },
    );
  }

  const endpoint = `${GEMINI_URL}/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(API_KEY)}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(problem, solutionSteps ?? [], answer) },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : "Gemini request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  clearTimeout(timer);

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: `Gemini ${resp.status}: ${text.slice(0, 500)}` },
      { status: 502 },
    );
  }

  const json = (await resp.json()) as GeminiResponse;
  const result = extract(json);

  return NextResponse.json({
    verdict: result.verdict,
    note: result.note,
    annotatedImageBase64: result.annotatedImageBase64,
  });
}
