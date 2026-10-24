"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaKey, FaLeaf, FaHandPaper, FaArrowUp, FaTrophy, FaTree } from "react-icons/fa";
import { useForestStore } from "@/app/lib/forestStore";
import { useHubStore } from "@/app/lib/hubStore";
import { buildForestFirstMessage, FOREST_SYSTEM_PROMPT } from "@/app/lib/forestAgentPersona";
import { HAS_BACKEND } from "@/app/lib/backend";

const CHOICE_COLORS = {
  A: "bg-iris-50 text-iris-800 ring-2 ring-iris-100",
  B: "bg-sky-50 text-sky-800 ring-2 ring-sky-100",
  C: "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100",
  D: "bg-amber-50 text-amber-800 ring-2 ring-amber-100",
};

export default function ForestHUD() {
  const status = useForestStore((s) => s.status);
  const keys = useForestStore((s) => s.keys);
  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const stepCredits = useForestStore((s) => s.stepCredits);
  const lastAgentMessage = useForestStore((s) => s.lastAgentMessage);
  const currentQuestion = useForestStore((s) => s.currentQuestion);
  const error = useForestStore((s) => s.error);
  const reset = useForestStore((s) => s.reset);
  const setError = useForestStore((s) => s.setError);
  const setStatus = useForestStore((s) => s.setStatus);
  const startGame = useForestStore((s) => s.startGame);
  const walkForward = useForestStore((s) => s.walkForward);
  const signingMode = useForestStore((s) => s.signingMode);
  const setSigningMode = useForestStore((s) => s.setSigningMode);

  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const isSpeaking = conv.isSpeaking;
  const muted = conv.isMuted;

  const [starting, setStarting] = useState(false);

  // Auto-mute on connect so background noise doesn't interfere
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && !wasConnected.current) {
      wasConnected.current = true;
      conv.setMuted(true);
    } else if (!connected) {
      wasConnected.current = false;
    }
  }, [connected, conv]);

  // Auto-mute when step is granted so walking animation noise isn't picked up
  const prevCredits = useRef(stepCredits);
  useEffect(() => {
    if (prevCredits.current === 0 && stepCredits > 0 && connected) {
      conv.setMuted(true);
    }
    prevCredits.current = stepCredits;
  }, [stepCredits, connected, conv]);

  // Up Arrow = walk forward
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        walkForward();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [walkForward]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setError(null);
      startGame();
      const character = useHubStore.getState().selectedCharacter ?? "robot";
      const res = await fetch(`/api/signed-url/spell?character=${character}`);
      if (!res.ok) throw new Error(`Signed URL fetch failed: ${res.status}`);
      const { signedUrl, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      conv.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: FOREST_SYSTEM_PROMPT },
            firstMessage: buildForestFirstMessage(),
          },
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
      setStatus("idle");
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    conv.endSession();
    setStatus("idle");
  };

  const hasCredit = stepCredits > 0;

  const statusLabel =
    status === "won"     ? "Treasure found!" :
    status === "idle"    ? "Tap start" :
    !connected           ? "Connecting…" :
    status === "walking" ? "Walking…" :
    hasCredit            ? "Press up to walk!" :
    muted                ? "Mic off" :
    isSpeaking           ? "Finn is talking" :
    "Listening";

  // Show center card when question is active (not during walk, not when credit pending)
  const showCard = status === "answering" && !hasCredit;
  // Show "key earned" card when credit is ready
  const showKeyEarned = status === "answering" && hasCredit;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {/* Header */}
        <header className="pointer-events-auto flex items-start justify-between gap-3 p-5">
          <div className="flex items-start gap-3">
            <button
              onClick={() => { if (connected) conv.endSession(); router.push("/"); }}
              className="iris-btn iris-btn-soft px-4 py-2 text-sm"
            >
              ← Home
            </button>
            <div className="iris-pill flex-col !items-start !gap-0 !rounded-2xl !px-4 !py-2">
              <div
                className="text-base font-semibold text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Forest Path Adventure
              </div>
              <div className="text-xs font-semibold text-ink-soft">Answer questions → collect keys → find treasure</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Pill highlight={keys > 0}>
              <span className="inline-flex items-center gap-1.5"><FaKey /> {keys}/3 keys</span>
            </Pill>
            <Pill>
              <span className="inline-flex items-center gap-1.5"><FaLeaf /> Step {Math.min(nodeIndex + 1, 3)}/3</span>
            </Pill>
            <Pill highlight={hasCredit} pulse={hasCredit}>
              {connected && (
                <span className={`mr-1 inline-block h-2 w-2 rounded-full ${muted ? "bg-rose-400" : isSpeaking ? "bg-emerald-400 listening-glow" : "bg-emerald-300"}`} />
              )}
              {statusLabel}
            </Pill>
          </div>
        </header>

        <div className="flex-1" />

        {/* Center card — question + choices + mic (mirrors maze HUD) */}
        {showCard && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-6">
            <div
              key={currentQuestion.id}
              className="center-card iris-panel pointer-events-auto p-7 ring-4 ring-emerald-200"
            >
              <div
                className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
              >
                Forest Guide Finn — Question {nodeIndex + 1}/3
              </div>
              <div
                className="mt-3 text-2xl font-semibold leading-snug text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {currentQuestion.question}
              </div>

              {/* ABCD — display-only reference (voice-first; not interactive) */}
              <div
                className="mt-4 text-xs font-bold text-ink-soft"
              >
                Choices — listen and say a letter
              </div>
              <div
                className="mt-2 grid grid-cols-2 gap-2"
                role="group"
                aria-label="Answer choices for reference. Answer using your voice."
              >
                {(["A", "B", "C", "D"] as const).map((letter) => (
                  <div
                    key={letter}
                    tabIndex={-1}
                    className={`pointer-events-none flex cursor-default items-center gap-2 rounded-2xl px-3 py-2.5 select-none ${CHOICE_COLORS[letter]}`}
                  >
                    <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-base font-semibold leading-none shadow-sm">{letter}</span>
                    <span className="text-sm font-bold leading-tight">{currentQuestion.choices[letter]}</span>
                  </div>
                ))}
              </div>

              {/* Agent response if any */}
              {lastAgentMessage && (
                <div className="mt-3 rounded-2xl bg-iris-50 px-3 py-2 text-sm font-semibold text-iris-800">
                  {lastAgentMessage}
                </div>
              )}

              {/* Mic + controls */}
              {connected && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => conv.setMuted(!muted)}
                    className={`iris-btn px-6 py-2.5 text-sm ${
                      muted
                        ? "iris-btn-primary listening-glow"
                        : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {muted ? <FaMicrophone /> : <FaMicrophoneSlash />}
                      {muted ? "Start Listening" : "Stop Listening"}
                    </span>
                  </button>
                  {HAS_BACKEND && (
                  <button
                    onClick={() => {
                      setSigningMode(!signingMode);
                    }}
                    className={`iris-btn px-5 py-2.5 text-sm ${
                      signingMode
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaHandPaper />
                      {signingMode ? "Signing" : "Sign"}
                    </span>
                  </button>
                  )}
                  <button
                    onClick={stop}
                    className="iris-btn iris-btn-soft px-5 py-2.5 text-sm"
                  >
                    End
                  </button>
                </div>
              )}

              <div className="mt-3 text-center text-xs font-semibold text-ink-soft">
                {signingMode ? "Space = add letter · Enter = submit word" : 'Say "A", "B", "C", or "D" — on-screen choices are display-only'}
              </div>
            </div>
          </div>
        )}

        {/* Key earned — press ↑ to walk */}
        {showKeyEarned && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="center-card iris-panel px-6 py-7">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-3xl text-amber-500"><FaKey /></div>
              <div
                className="mt-3 text-2xl font-semibold text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Key earned!
              </div>
              <div className="mt-2 text-base font-semibold text-ink-soft">Press up to walk forward</div>
              <div className="mt-3 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-iris-500 text-2xl text-white shadow-xl listening-glow">
                  <FaArrowUp />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Walking indicator */}
        {status === "walking" && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="iris-pill justify-center !px-6 !py-3 !text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Walking down the path…
            </div>
          </div>
        )}

        {/* Start splash */}
        {status === "idle" && (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="center-card iris-panel p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-4xl text-emerald-500"><FaTree /></div>
              <div
                className="mt-4 text-3xl font-semibold text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Forest Path Adventure
              </div>
              <div className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                Answer 3 spelling & reading questions. Collect Knowledge Keys. Open the treasure!
              </div>
              <button
                onClick={start}
                disabled={starting}
                className="iris-btn iris-btn-primary mt-6 px-10 py-3.5 text-lg"
              >
                {starting ? "Connecting…" : "Enter the Forest"}
              </button>
              {error && (
                <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">{error}</div>
              )}
            </div>
          </div>
        )}

        {error && status !== "idle" && status !== "won" && (
          <div className="pointer-events-auto absolute left-1/2 top-24 max-w-md -translate-x-1/2 rounded-2xl bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-600 shadow-lg">
            {error}
          </div>
        )}
      </div>

      {/* Victory screen */}
      {status === "won" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
          <div className="center-card iris-panel max-w-md px-10 py-9 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-5xl text-amber-500">
              {keys >= 3 ? <FaTrophy /> : keys >= 2 ? <FaKey /> : <FaTree />}
            </div>
            <div
              className="mt-4 text-3xl font-semibold text-iris-600"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {keys >= 3 ? "Treasure Found!" : keys >= 2 ? "Great Exploring!" : "You Made It!"}
            </div>
            <div className="mt-2 text-base text-ink-soft">{lastAgentMessage}</div>
            <div className="mt-4 flex justify-center gap-1">
              {Array.from({ length: 3 }, (_, i) => (
                <FaKey key={i} className={`text-xl text-amber-500 ${i < keys ? "opacity-100" : "opacity-20"}`} />
              ))}
            </div>
            <div className="mt-2 text-sm font-semibold text-ink-soft">{keys}/3 Knowledge Keys collected</div>
            <div className="mt-6 flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => { if (connected) conv.endSession(); reset(); }}
                className="iris-btn iris-btn-primary px-7 py-3 text-base"
              >
                Try again
              </button>
              <button
                onClick={() => { if (connected) conv.endSession(); router.push("/"); }}
                className="iris-btn iris-btn-soft px-7 py-3 text-base"
              >
                ← Back home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Pill({ children, highlight, pulse }: { children: React.ReactNode; highlight?: boolean; pulse?: boolean }) {
  return (
    <div
      className={`iris-pill ${highlight ? "!bg-iris-500 !text-white" : ""} ${pulse ? "listening-glow" : ""}`}
    >
      {children}
    </div>
  );
}
