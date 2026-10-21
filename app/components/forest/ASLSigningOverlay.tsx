"use client";

import { useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { useForestStore } from "@/app/lib/forestStore";
import { forestAnswerMatches } from "@/app/lib/forestQuestions";

export default function ASLSigningOverlay() {
  const signingMode = useForestStore((s) => s.signingMode);
  const setSigningMode = useForestStore((s) => s.setSigningMode);
  const status = useForestStore((s) => s.status);
  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const conv = useConversation();


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingInFlight = useRef(false);

  const [detectedLetter, setDetectedLetter] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [wordBuffer, setWordBuffer] = useState("");
  const [debug, setDebug] = useState<{ raw: string; modelUsed: string; pollCount: number; lastError: string }>({
    raw: "-", modelUsed: "-", pollCount: 0, lastError: "",
  });
  const [showDebug, setShowDebug] = useState(false);

  // Start/stop webcam + polling when signing mode toggles
  useEffect(() => {
    if (signingMode) {
      startWebcam().then(startPolling);
    } else {
      stopPolling();
      stopWebcam();
      setDetectedLetter("");
      setWordBuffer("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signingMode]);

  useEffect(() => {
    setWordBuffer("");
  }, [nodeIndex]);

  // Keyboard: Space = append letter, Enter = submit word
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!signingMode) return;
      if (e.code === "Space") { e.preventDefault(); handleAppendLetter(); }
      if (e.code === "Enter") { e.preventDefault(); handleSubmitWord(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedLetter, wordBuffer, signingMode]);

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Permission denied or no camera - signing mode will show no feed
    }
  }

  function stopWebcam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function startPolling() {
    intervalRef.current = setInterval(pollASL, 200);
  }

  function stopPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    pollingInFlight.current = false;
  }

  async function pollASL() {
    if (pollingInFlight.current) return;
    if (!videoRef.current || videoRef.current.readyState < 2) {
      setDebug((d) => ({ ...d, lastError: `video not ready (readyState=${videoRef.current?.readyState ?? "null"})` }));
      return;
    }
    pollingInFlight.current = true;
    try {
      const canvas = canvasRef.current!;
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d")!;
      // Mirror horizontally to match what the model was trained on
      ctx.save();
      ctx.translate(320, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      ctx.restore();
      const b64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 }),
        signal: AbortSignal.timeout(500),
      });
      const data: { letter: string; confidence: number; model_used: string } = await res.json();
      setDetectedLetter(data.letter ?? "");
      setConfidence(data.confidence ?? 0);
      setDebug((d) => ({
        raw: `letter="${data.letter || "(none)"}" conf=${((data.confidence ?? 0) * 100).toFixed(1)}%`,
        modelUsed: data.model_used ?? "?",
        pollCount: d.pollCount + 1,
        lastError: "",
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDetectedLetter("");
      setDebug((d) => ({ ...d, lastError: msg, pollCount: d.pollCount + 1 }));
    } finally {
      pollingInFlight.current = false;
    }
  }

  function handleAppendLetter() {
    if (!detectedLetter) return;
    setWordBuffer((prev) => prev + detectedLetter);
    setDetectedLetter("");
    setConfidence(0);
  }

  function handleSubmitWord() {
    const answer = wordBuffer || detectedLetter;
    if (!answer) return;
    const store = useForestStore.getState();
    const q = store.currentQuestion;
    const matches = forestAnswerMatches(q, answer);
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[Forest ASL] submit", {
        raw: answer,
        normalized: answer.trim().toUpperCase().replace(/\s+/g, " ").trim(),
        expectedLetter: q.answer,
        expectedChoice: q.choices[q.answer],
        matches,
        status: store.status,
        stepCredits: store.stepCredits,
      });
    }
    if (
      store.status === "answering" &&
      store.stepCredits === 0 &&
      matches
    ) {
      store.grantKey();
      setSigningMode(false);
    } else {
      store.checkAnswer(answer);
    }
    conv.sendUserMessage(`The answer is ${answer}`);
    setWordBuffer("");
    setDetectedLetter("");
    setConfidence(0);
  }

  function handleBackspace() {
    setWordBuffer((prev) => prev.slice(0, -1));
  }

  if (!signingMode || status !== "answering") return null;

  return (
    <div className="pointer-events-auto absolute bottom-32 right-5 flex flex-col items-end gap-2">
      {/* Webcam preview */}
      <div className="relative overflow-hidden border border-amber-500/30 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-60 w-80 object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {/* Detected letter badge */}
        <div className="absolute bottom-0 inset-x-0 bg-black/70 py-1 text-center">
          {detectedLetter ? (
            <>
              <span className="text-2xl font-black text-white">{detectedLetter}</span>
              <span className="ml-1 text-xs text-white/70">{Math.round(confidence * 100)}%</span>
            </>
          ) : (
            <span
              className="text-xs text-white/50"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              No hand detected
            </span>
          )}
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Word buffer — large input-style display */}
      <div
        className="min-h-[4.5rem] w-full max-w-md rounded-2xl border-2 border-emerald-400/40 bg-black/70 px-5 py-4 shadow-inner backdrop-blur-sm"
        aria-label="Your spelled answer"
      >
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Your answer
        </div>
        <div className="mt-2 min-h-[2.75rem] font-mono text-3xl font-bold leading-tight tracking-[0.08em] text-emerald-200 sm:text-4xl">
          {wordBuffer ? (
            <span className="break-all">{wordBuffer}</span>
          ) : (
            <span className="text-white/25">—</span>
          )}
        </div>
      </div>

      {/* Debug toggle + panel */}
      <button
        onClick={() => setShowDebug((v) => !v)}
        className="self-end rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50 ring-1 ring-white/20 hover:bg-white/20"
      >
        {showDebug ? "hide debug" : "debug"}
      </button>
      {showDebug && (
        <div className="w-56 rounded-xl border border-white/10 bg-black/80 p-2 font-mono text-[10px] text-white/70 backdrop-blur-sm space-y-0.5">
          <div><span className="text-white/40">polls:</span> {debug.pollCount}</div>
          <div><span className="text-white/40">model:</span> {debug.modelUsed}</div>
          <div><span className="text-white/40">last:</span> {debug.raw}</div>
          {/* Confidence bar */}
          <div className="mt-1">
            <div className="h-1.5 w-full rounded-full bg-white/10">
              <div
                className="h-1.5 rounded-full bg-emerald-400 transition-all"
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
            <div className="mt-0.5 text-right text-[9px] text-white/40">{Math.round(confidence * 100)}% conf - threshold 50%</div>
          </div>
          {debug.lastError && (
            <div className="mt-1 text-rose-400 break-all">{debug.lastError}</div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleBackspace}
          disabled={!wordBuffer}
          className="border border-white/20 bg-black/50 px-3 py-2 text-xs font-semibold text-white/75 backdrop-blur-md transition hover:bg-white/5 disabled:opacity-30"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Back
        </button>
        <button
          onClick={handleAppendLetter}
          disabled={!detectedLetter}
          className="border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 backdrop-blur-md transition hover:bg-amber-500/20 disabled:opacity-30"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Add (Space)
        </button>
        <button
          onClick={handleSubmitWord}
          disabled={!wordBuffer && !detectedLetter}
          className="border border-amber-500 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 transition hover:bg-amber-500/20 hover:shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-30"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}