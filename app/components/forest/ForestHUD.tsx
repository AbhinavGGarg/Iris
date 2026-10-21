"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaKey, FaLeaf, FaHandPaper, FaArrowUp, FaTrophy, FaTree } from "react-icons/fa";
import { useForestStore } from "@/app/lib/forestStore";
import { useHubStore } from "@/app/lib/hubStore";
import { buildForestFirstMessage, FOREST_SYSTEM_PROMPT } from "@/app/lib/forestAgentPersona";

const CHOICE_COLORS = {
  A: "border border-amber-400/30 bg-amber-950/30 text-amber-100/90",
  B: "border border-yellow-400/25 bg-yellow-950/25 text-yellow-100/90",
  C: "border border-orange-400/25 bg-orange-950/25 text-orange-100/90",
  D: "border border-stone-400/25 bg-stone-900/30 text-stone-100/90",
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
              className="border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white/75 backdrop-blur-md transition hover:text-white/90"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              ← Hub
            </button>
            <div>
              <div
                className="text-lg font-bold tracking-[0.15em] uppercase text-white drop-shadow-lg"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                Forest Path Adventure
              </div>
              <div className="text-xs tracking-[0.1em] text-white/55">Answer questions → collect keys → find treasure</div>
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
              className="center-card pointer-events-auto border border-amber-500/30 bg-black/70 p-6 shadow-2xl backdrop-blur-md"
            >
              <div
                className="text-xs font-semibold uppercase tracking-widest text-amber-400/80"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                Forest Guide Finn — Question {nodeIndex + 1}/3
              </div>
              <div
                className="mt-2 text-2xl font-semibold leading-snug text-white drop-shadow"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                {currentQuestion.question}
              </div>

              {/* ABCD — display-only reference (voice-first; not interactive) */}
              <div
                className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/45"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
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
                    className={`pointer-events-none flex cursor-default items-center gap-2 rounded-xl px-3 py-2.5 select-none ${CHOICE_COLORS[letter]}`}
                    style={{ fontFamily: "var(--font-cinzel), serif" }}
                  >
                    <span className="text-lg font-extrabold leading-none tabular-nums">{letter}</span>
                    <span className="text-sm font-medium leading-tight opacity-95">{currentQuestion.choices[letter]}</span>
                  </div>
                ))}
              </div>

              {/* Agent response if any */}
              {lastAgentMessage && (
                <div className="mt-3 text-sm text-white/80 italic">
                  {lastAgentMessage}
                </div>
              )}

              {/* Mic + controls */}
              {connected && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => conv.setMuted(!muted)}
                    className={`border px-6 py-2.5 text-sm font-bold transition ${
                      muted
                        ? "border-amber-500 text-amber-400 hover:bg-amber-500/10 listening-glow"
                        : "border-rose-500/60 text-rose-300 hover:bg-rose-500/10"
                    }`}
                    style={{ fontFamily: "var(--font-cinzel), serif" }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {muted ? <FaMicrophone /> : <FaMicrophoneSlash />}
                      {muted ? "Start Listening" : "Stop Listening"}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setSigningMode(!signingMode);
                    }}
                    className={`border px-4 py-2.5 text-sm font-semibold transition ${
                      signingMode
                        ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                        : "border-white/20 bg-black/40 text-white/75 hover:bg-white/5"
                    }`}
                    style={{ fontFamily: "var(--font-cinzel), serif" }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaHandPaper />
                      {signingMode ? "Signing" : "Sign"}
                    </span>
                  </button>
                  <button
                    onClick={stop}
                    className="border border-rose-500/60 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
                    style={{ fontFamily: "var(--font-cinzel), serif" }}
                  >
                    End
                  </button>
                </div>
              )}

              <div className="mt-2 text-center text-xs text-white/50 font-medium" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                {signingMode ? "Space = add letter · Enter = submit word" : 'Say "A", "B", "C", or "D" — on-screen choices are display-only'}
              </div>
            </div>
          </div>
        )}

        {/* Key earned — press ↑ to walk */}
        {showKeyEarned && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="center-card border border-amber-500/40 bg-black/70 px-6 py-6 shadow-2xl backdrop-blur-md">
              <div className="flex justify-center text-4xl text-amber-300"><FaKey /></div>
              <div
                className="mt-2 text-2xl font-bold uppercase tracking-[0.15em] text-amber-300"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                Key earned!
              </div>
              <div className="mt-3 text-base font-semibold text-white/75">Press up to walk forward</div>
              <div className="mt-3 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center border border-amber-500 bg-amber-500/10 text-2xl text-amber-300 shadow-xl listening-glow">
                  <FaArrowUp />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Walking indicator */}
        {status === "walking" && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="border border-white/8 bg-black/60 px-6 py-3 text-white/70 backdrop-blur-md text-sm font-semibold tracking-[0.15em] uppercase"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              Walking down the path…
            </div>
          </div>
        )}

        {/* Start splash */}
        {status === "idle" && (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="center-card border border-amber-500/30 bg-black/75 p-7 shadow-2xl backdrop-blur-md">
              <div className="flex justify-center text-5xl text-emerald-400"><FaTree /></div>
              <div
                className="mt-4 text-2xl font-black uppercase tracking-[0.2em] text-white"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  textShadow: "0 0 40px rgba(200,164,60,0.3), 0 2px 4px rgba(0,0,0,0.8)",
                }}
              >
                Forest Path Adventure
              </div>
              <div className="mt-3 text-sm uppercase tracking-[0.12em] leading-relaxed text-white/55"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                Answer 3 spelling & reading questions. Collect Knowledge Keys. Open the treasure!
              </div>
              <button
                onClick={start}
                disabled={starting}
                className="mt-6 border border-amber-500 px-10 py-3 text-sm font-bold uppercase tracking-[0.3em] text-amber-400 transition hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                {starting ? "Connecting…" : "Enter the Forest"}
              </button>
              {error && (
                <div className="mt-3 border border-rose-400/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>
              )}
            </div>
          </div>
        )}

        {error && status !== "idle" && status !== "won" && (
          <div className="pointer-events-auto absolute left-1/2 top-20 max-w-md -translate-x-1/2 border border-rose-400/40 bg-rose-500/10 p-2 text-center text-xs text-rose-200">
            {error}
          </div>
        )}
      </div>

      {/* Victory screen */}
      {status === "won" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
          <div className="center-card border border-amber-400/40 bg-black/80 px-10 py-8 text-center shadow-2xl backdrop-blur-md max-w-md">
            <div className="flex justify-center text-6xl text-amber-300">
              {keys >= 3 ? <FaTrophy /> : keys >= 2 ? <FaKey /> : <FaTree />}
            </div>
            <div
              className="mt-4 text-3xl font-extrabold uppercase tracking-[0.15em] text-amber-300"
              style={{
                fontFamily: "var(--font-cinzel), serif",
                textShadow: "0 0 40px rgba(200,164,60,0.4), 0 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {keys >= 3 ? "Treasure Found!" : keys >= 2 ? "Great Exploring!" : "You Made It!"}
            </div>
            <div className="mt-2 text-base text-white/80">{lastAgentMessage}</div>
            <div className="mt-4 flex justify-center gap-1">
              {Array.from({ length: 3 }, (_, i) => (
                <FaKey key={i} className={`text-xl text-amber-300 ${i < keys ? "opacity-100" : "opacity-20"}`} />
              ))}
            </div>
            <div className="mt-2 text-sm tracking-[0.1em] text-white/55">{keys}/3 Knowledge Keys collected</div>
            <div className="mt-6 flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => { if (connected) conv.endSession(); reset(); }}
                className="border border-amber-500 px-6 py-2.5 text-sm font-bold uppercase tracking-[0.25em] text-amber-400 transition hover:bg-amber-500/10"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                Try Again
              </button>
              <button
                onClick={() => { if (connected) conv.endSession(); router.push("/"); }}
                className="border border-white/35 px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-white/75 transition hover:bg-white/5"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                ← Back to Hub
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
      className={`border px-3 py-1 text-xs font-semibold backdrop-blur-md tracking-[0.1em] uppercase ${highlight ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/20 bg-black/40 text-white/70"} ${pulse ? "listening-glow" : ""}`}
      style={{ fontFamily: "var(--font-cinzel), serif" }}
    >
      {children}
    </div>
  );
}
