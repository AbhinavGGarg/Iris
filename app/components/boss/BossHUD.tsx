"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useBossStore } from "@/app/lib/bossStore";
import { useHubStore } from "@/app/lib/hubStore";
import type { CharacterSlug } from "@/app/lib/characters";

const MAX_HP = 100;

const CHARACTER_NAMES: Record<CharacterSlug, string> = {
  bear: "Bear",
  fox: "Fox",
  robot: "Robot",
  cat: "Cat",
};

type FloatNum = { id: number; text: string; side: "boss" | "player" };

const cinzel = { fontFamily: "var(--font-cinzel), serif" } as const;

export default function BossHUD() {
  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const muted = conv.isMuted;

  const characterSlug = useHubStore((s) => s.selectedCharacter);
  const playerName = CHARACTER_NAMES[characterSlug ?? "bear"];

  const status = useBossStore((s) => s.status);
  const playerHP = useBossStore((s) => s.playerHP);
  const bossHP = useBossStore((s) => s.bossHP);
  const turn = useBossStore((s) => s.turn);
  const correctAnswers = useBossStore((s) => s.correctAnswers);
  const lastAgentMessage = useBossStore((s) => s.lastAgentMessage);
  const bubbleKey = useBossStore((s) => s.bubbleKey);
  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const playerHitKey = useBossStore((s) => s.playerHitKey);
  const error = useBossStore((s) => s.error);

  const setError = useBossStore((s) => s.setError);
  const setStatus = useBossStore((s) => s.setStatus);
  const reset = useBossStore((s) => s.reset);
  const whiteboardOpen = useBossStore((s) => s.whiteboardOpen);
  const openWhiteboard = useBossStore((s) => s.openWhiteboard);
  const closeWhiteboard = useBossStore((s) => s.closeWhiteboard);

  const [starting, setStarting] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);

  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && !wasConnected.current) {
      wasConnected.current = true;
      conv.setMuted(true);
    } else if (!connected) {
      wasConnected.current = false;
    }
  }, [connected, conv]);
  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);

  useEffect(() => {
    if (bossHitKey === 0) return;
    const id = Date.now();
    setFloatNums((prev) => [...prev, { id, text: "−34", side: "boss" }]);
    const remove = setTimeout(
      () => setFloatNums((prev) => prev.filter((n) => n.id !== id)),
      1100,
    );
    return () => clearTimeout(remove);
  }, [bossHitKey]);

  useEffect(() => {
    if (playerHitKey === 0) return;
    setScreenFlash(true);
    const id = Date.now() + 1;
    setFloatNums((prev) => [...prev, { id, text: "−34", side: "player" }]);
    const flash = setTimeout(() => setScreenFlash(false), 650);
    const remove = setTimeout(
      () => setFloatNums((prev) => prev.filter((n) => n.id !== id)),
      1100,
    );
    return () => {
      clearTimeout(flash);
      clearTimeout(remove);
    };
  }, [playerHitKey]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setError(null);
      reset();
      const slug = useHubStore.getState().selectedCharacter ?? "bear";
      const res = await fetch(`/api/signed-url?game=boss&character=${slug}`);
      if (!res.ok) throw new Error(`Signed URL fetch failed: ${res.status}`);
      const { signedUrl, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      setStatus("battling");
      conv.startSession({ signedUrl });
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

  const tier =
    correctAnswers < 2 ? 1 : correctAnswers < 4 ? 2 : correctAnswers < 6 ? 3 : 4;

  const bossHPPct = (bossHP / MAX_HP) * 100;
  const playerHPPct = (playerHP / MAX_HP) * 100;

  const bossHPColor =
    bossHPPct > 50
      ? "from-rose-500 to-red-400"
      : bossHPPct > 25
        ? "from-orange-500 to-amber-400"
        : "from-yellow-400 to-yellow-300";

  const playerHPColor =
    playerHPPct > 50
      ? "from-emerald-500 to-green-400"
      : playerHPPct > 25
        ? "from-yellow-500 to-amber-400"
        : "from-red-500 to-rose-400";

  return (
    <>
      {screenFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-50 screen-flash-red"
          style={{ boxShadow: "inset 0 0 100px 30px rgba(239,68,68,0.55)" }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {/* Header */}
        <header className="pointer-events-auto flex items-center justify-between gap-3 border-b border-white/8 bg-black/70 px-6 py-3 backdrop-blur-sm">
          <button
            onClick={() => {
              if (connected) conv.endSession();
              router.push("/");
            }}
            className="border border-white/20 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white/55 transition hover:border-white/40 hover:text-white/90"
            style={cinzel}
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <span
              className="text-sm font-bold uppercase tracking-[0.2em] text-white"
              style={cinzel}
            >
              Boss Battle
            </span>
            {status === "battling" && (
              <>
                <span
                  className="border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-white/50"
                  style={cinzel}
                >
                  Turn {turn}
                </span>
                <span
                  className="border border-amber-500/40 bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-amber-400/80"
                  style={cinzel}
                >
                  Tier {tier}
                </span>
              </>
            )}
          </div>

          <div className="w-16" />
        </header>

        {/* HP Bars */}
        {status === "battling" && (
          <div className="pointer-events-auto mx-4 mt-3 grid grid-cols-2 gap-4 border border-white/10 bg-black/50 p-3 backdrop-blur-md">
            {/* Player HP */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80"
                  style={cinzel}
                >
                  {playerName}
                </span>
                <span
                  className={`text-[10px] tracking-wide ${playerHPPct <= 25 ? "animate-pulse text-red-300" : "text-white/50"}`}
                  style={cinzel}
                >
                  {playerHP}/{MAX_HP}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden bg-white/10">
                <div
                  className={`h-full bg-gradient-to-r ${playerHPColor} transition-all duration-600 ease-out`}
                  style={{ width: `${playerHPPct}%` }}
                />
              </div>
            </div>

            {/* Boss HP */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80"
                  style={cinzel}
                >
                  Infernal Titan
                </span>
                <span
                  className={`text-[10px] tracking-wide ${bossHPPct <= 25 ? "animate-pulse text-amber-300" : "text-white/50"}`}
                  style={cinzel}
                >
                  {bossHP}/{MAX_HP}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden bg-white/10">
                <div
                  className={`h-full bg-gradient-to-r ${bossHPColor} transition-all duration-600 ease-out`}
                  style={{ width: `${bossHPPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Arena overlay — damage numbers + agent bubble */}
        <div className="relative flex flex-1 flex-col items-stretch justify-between gap-4 px-6 py-2">
          {status === "battling" && (
            <>
              <div className="pointer-events-none relative mx-auto h-12 w-72">
                {floatNums
                  .filter((n) => n.side === "boss")
                  .map((n) => (
                    <div
                      key={n.id}
                      className="damage-float absolute left-1/2 -translate-x-1/2 text-4xl font-black text-rose-200 drop-shadow-lg"
                      style={{ textShadow: "0 0 14px rgba(251,113,133,1)" }}
                    >
                      {n.text}
                    </div>
                  ))}
                <div
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2 border border-rose-500/30 bg-rose-950/60 px-3 py-0.5 text-[9px] font-bold uppercase tracking-[0.3em] text-rose-300/90 backdrop-blur-md"
                  style={cinzel}
                >
                  Infernal Titan
                </div>
              </div>

              <div className="pointer-events-none relative mx-auto h-10 w-60">
                {floatNums
                  .filter((n) => n.side === "player")
                  .map((n) => (
                    <div
                      key={n.id}
                      className="damage-float absolute left-1/2 -translate-x-1/2 text-3xl font-black text-red-300 drop-shadow-lg"
                      style={{ textShadow: "0 0 12px rgba(248,113,113,1)" }}
                    >
                      {n.text}
                    </div>
                  ))}
              </div>

              <div
                key={bubbleKey}
                className="center-card pointer-events-none mx-auto mb-2 w-full max-w-xl border border-amber-500/20 bg-black/70 p-4 shadow-2xl backdrop-blur-md"
              >
                <div
                  className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-400/70"
                  style={cinzel}
                >
                  Game Master
                </div>
                <div
                  className="mt-1 text-lg font-semibold leading-snug text-white"
                  style={cinzel}
                >
                  {lastAgentMessage}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom controls */}
        {status === "battling" && (
          <div className="pointer-events-auto flex items-center gap-3 border-t border-white/8 bg-black/60 p-4 backdrop-blur-sm">
            <TypeAnswer
              onSubmit={(text) => conv.sendUserMessage(text)}
              disabled={!connected}
            />
            {connected && (
              <button
                onClick={() => conv.setMuted(!muted)}
                className={`shrink-0 border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition ${
                  muted
                    ? "border-amber-500/60 text-amber-400 hover:bg-amber-500/10"
                    : "border-rose-500/40 text-rose-400/70 hover:border-rose-400 hover:text-rose-300"
                }`}
                style={cinzel}
              >
                {muted ? "Listen" : "Mute"}
              </button>
            )}
            <button
              onClick={() => whiteboardOpen ? closeWhiteboard() : openWhiteboard()}
              className={`shrink-0 border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition ${
                whiteboardOpen
                  ? "border-amber-500/60 text-amber-400 hover:bg-amber-500/10"
                  : "border-white/20 text-white/55 hover:border-white/40 hover:text-white/90"
              }`}
              style={cinzel}
            >
              Whiteboard
            </button>
            <button
              onClick={stop}
              className="shrink-0 border border-rose-500/40 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-rose-400/70 transition hover:border-rose-400 hover:text-rose-300"
              style={cinzel}
            >
              Retreat
            </button>
          </div>
        )}

        {error && status !== "idle" && (
          <div
            className="pointer-events-auto absolute left-1/2 top-20 max-w-sm -translate-x-1/2 border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-center text-xs text-rose-200 backdrop-blur-md"
            style={cinzel}
          >
            {error}
          </div>
        )}
      </div>

      {/* Idle splash */}
      {status === "idle" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card pointer-events-auto mx-6 w-full max-w-md border border-amber-500/30 bg-black/80 p-8 text-center shadow-2xl backdrop-blur-md">
            <div
              className="text-3xl font-black uppercase tracking-[0.15em] text-white"
              style={{
                ...cinzel,
                textShadow: "0 0 60px rgba(200,164,60,0.2), 0 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              Boss Battle
            </div>
            <p
              className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/40"
              style={cinzel}
            >
              The Infernal Titan Awaits
            </p>
            <p className="mt-4 text-sm leading-relaxed tracking-wide text-white/70" style={cinzel}>
              Answer math questions fast to deal damage. One wrong answer — the boss strikes back!
            </p>
            <button
              onClick={start}
              disabled={starting}
              className="mt-6 border border-amber-500 px-10 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400 transition hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
              style={cinzel}
            >
              {starting ? "Connecting..." : "Start Battle"}
            </button>
            {error && (
              <div className="mt-3 text-xs text-rose-300" style={cinzel}>{error}</div>
            )}
          </div>
        </div>
      )}

      {/* Victory screen */}
      {status === "victory" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card pointer-events-auto mx-6 w-full max-w-lg border border-amber-500/40 bg-black/80 px-12 py-10 text-center shadow-2xl backdrop-blur-md">
            <div
              className="text-4xl font-black uppercase tracking-[0.15em] text-amber-300"
              style={{
                ...cinzel,
                textShadow: "0 0 60px rgba(200,164,60,0.3)",
              }}
            >
              Victory
            </div>
            <p
              className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/40"
              style={cinzel}
            >
              The Infernal Titan Falls
            </p>
            <p className="mt-4 text-sm tracking-wide text-white/80" style={cinzel}>
              You answered{" "}
              <span className="font-bold text-amber-300">{correctAnswers}</span>{" "}
              questions correctly!
            </p>
            <button
              onClick={() => { conv.endSession(); reset(); }}
              className="mt-6 border border-amber-500 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400 transition hover:bg-amber-500/10"
              style={cinzel}
            >
              Fight Again
            </button>
          </div>
        </div>
      )}

      {/* Defeat screen */}
      {status === "defeat" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card pointer-events-auto mx-6 w-full max-w-lg border border-rose-500/30 bg-black/80 px-12 py-10 text-center shadow-2xl backdrop-blur-md">
            <div
              className="text-4xl font-black uppercase tracking-[0.15em] text-rose-300"
              style={cinzel}
            >
              Defeated
            </div>
            <p
              className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/40"
              style={cinzel}
            >
              The Titan Stands Victorious
            </p>
            <p className="mt-4 text-sm text-white/80">
              Math training never ends — you got{" "}
              <span className="font-bold text-rose-300">{correctAnswers}</span>{" "}
              correct.
            </p>
            <button
              onClick={() => { conv.endSession(); reset(); }}
              className="mt-6 border border-rose-500/60 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-rose-400 transition hover:bg-rose-500/10"
              style={cinzel}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function TypeAnswer({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || disabled) return;
        onSubmit(t);
        setText("");
      }}
      className="flex flex-1 items-center gap-2 border border-white/15 bg-black/40 p-1 pl-3 backdrop-blur-md"
    >
      <span
        className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-white/40"
        style={{ fontFamily: "var(--font-cinzel), serif" }}
      >
        Answer
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer..."
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="shrink-0 border border-amber-500/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-40"
        style={{ fontFamily: "var(--font-cinzel), serif" }}
      >
        Strike
      </button>
    </form>
  );
}