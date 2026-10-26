"use client";

import { useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { useForestStore } from "@/app/lib/forestStore";
import { forestAnswerMatches } from "@/app/lib/forestQuestions";
import { loadAslRecognizer, type AslRecognizer } from "@/app/lib/aslRecognizer";
import { MIN_CONFIDENCE } from "@/app/lib/aslModel";

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
  // Reads letters in the browser (MediaPipe hand tracking + our small letter model).
  const readerRef = useRef<AslRecognizer | null>(null);
  const [readerState, setReaderState] = useState<"loading" | "ready" | "error">("loading");
  const [handSeen, setHandSeen] = useState(false);
  const [cameraError, setCameraError] = useState("");

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
      Promise.all([startWebcam(), prepareReader()]).then(startPolling);
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
      setCameraError("");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera blocked. Allow camera access to sign.");
    }
  }

  async function prepareReader() {
    try {
      readerRef.current = await loadAslRecognizer();
      setReaderState("ready");
    } catch (e) {
      setReaderState("error");
      setDebug((d) => ({ ...d, lastError: e instanceof Error ? e.message : String(e) }));
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
    if (pollingInFlight.current || !readerRef.current) return;
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
      // Read the frame as the camera sees it. The model was trained on un-mirrored
      // frames; only the preview on screen is mirrored, so it feels like a mirror.
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      const guess = readerRef.current.read(canvas);
      const sure = guess.confidence >= MIN_CONFIDENCE;
      setHandSeen(guess.letter !== "");
      setDetectedLetter(sure ? guess.letter : "");
      setConfidence(sure ? guess.confidence : 0);
      setDebug((d) => ({
        raw: `letter="${guess.letter || "(none)"}" conf=${(guess.confidence * 100).toFixed(1)}%`,
        modelUsed: "in browser",
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
      <div className="relative overflow-hidden rounded-3xl bg-white p-1.5 shadow-[0_24px_60px_-20px_rgba(20,16,50,0.5)]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-60 w-80 rounded-[1.25rem] object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {/* Detected letter badge */}
        <div className="iris-pill absolute bottom-3 left-1/2 -translate-x-1/2 justify-center">
          {cameraError ? (
            <span className="text-xs font-bold text-rose-600">{cameraError}</span>
          ) : readerState === "loading" ? (
            <span className="text-xs font-bold text-ink-soft">Loading hand reader…</span>
          ) : readerState === "error" ? (
            <span className="text-xs font-bold text-rose-600">Hand reader didn&apos;t load. Try again.</span>
          ) : detectedLetter ? (
            <>
              <span className="font-display text-2xl font-semibold text-iris-600">{detectedLetter}</span>
              <span className="ml-1 text-xs font-bold text-ink-soft">{Math.round(confidence * 100)}%</span>
            </>
          ) : (
            <span
              className="text-xs font-bold text-ink-soft"
            >
              {handSeen ? "Hold the sign steady…" : "No hand detected"}
            </span>
          )}
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Word buffer — large input-style display */}
      <div
        className="iris-panel min-h-[4.5rem] w-full max-w-md !rounded-3xl px-5 py-4 ring-4 ring-emerald-200"
        aria-label="Your spelled answer"
      >
        <div
          className="text-xs font-bold text-emerald-700"
        >
          Your answer
        </div>
        <div className="font-display mt-1 min-h-[2.75rem] text-3xl font-semibold leading-tight tracking-[0.12em] text-ink sm:text-4xl">
          {wordBuffer ? (
            <span className="break-all">{wordBuffer}</span>
          ) : (
            <span className="text-iris-200">—</span>
          )}
        </div>
      </div>

      {/* Debug toggle + panel */}
      <button
        onClick={() => setShowDebug((v) => !v)}
        className="self-end rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-ink-soft shadow-sm hover:bg-white"
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
          className="iris-btn iris-btn-soft px-4 py-2.5 text-sm"
        >
          Back
        </button>
        <button
          onClick={handleAppendLetter}
          disabled={!detectedLetter}
          className="iris-btn bg-emerald-500 px-5 py-2.5 text-sm text-white hover:bg-emerald-600"
        >
          Add (Space)
        </button>
        <button
          onClick={handleSubmitWord}
          disabled={!wordBuffer && !detectedLetter}
          className="iris-btn iris-btn-primary px-5 py-2.5 text-sm"
        >
          Submit
        </button>
      </div>
    </div>
  );
}