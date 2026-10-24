/**
 * The Python backend (backend/) powers ASL hand-signing and video-to-questions.
 * Locally it runs on port 8000. On a hosted site, set NEXT_PUBLIC_BACKEND_URL to
 * wherever it's deployed; if it isn't set, those two features hide themselves
 * and everything else keeps working.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export const HAS_BACKEND = BACKEND_URL !== "";
