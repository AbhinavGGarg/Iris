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

const displayFont = { fontFamily: "var(--font-display)" } as const;

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
        <header className="pointer-events-auto flex items-center justify-between gap-3 px-5 py-4">
          <button
            onClick={() => {
              if (connected) conv.endSession();
              router.push("/");
            }}
            className="iris-btn iris-btn-soft px-4 py-2 text-sm"
          >
            ← Home
          </button>

          <div className="flex items-center gap-3">
            <span
              className="iris-pill text-base"
              style={displayFont}
            >
              Boss Battle
            </span>
            {status === "battling" && (
              <>
                <span
                  className="iris-pill"
                >
                  Turn {turn}
                </span>
                <span
                  className="iris-pill !bg-amber-100 !text-amber-700"
                >
                  Tier {tier}
                </span>
              </>
            )}
          </div>

          <div className="w-20" />
        </header>

        {/* HP Bars */}
        {status === "battling" && (
          <div className="iris-panel pointer-events-auto mx-auto mt-1 grid w-[calc(100%-2.5rem)] max-w-3xl grid-cols-2 gap-6 !rounded-3xl px-5 py-4">
            {/* Player HP */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className="text-sm font-semibold text-ink"
                  style={displayFont}
                >
                  {playerName}
                </span>
                <span
                  className={`text-xs font-bold ${playerHPPct <= 25 ? "animate-pulse text-rose-500" : "text-ink-soft"}`}
                >
                  {playerHP}/{MAX_HP}
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-iris-50">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${playerHPColor} transition-all duration-600 ease-out`}
                  style={{ width: `${playerHPPct}%` }}
                />
              </div>
            </div>

            {/* Boss HP */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className="text-sm font-semibold text-ink"
                  style={displayFont}
                >
                  Infernal Titan
                </span>
                <span
                  className={`text-xs font-bold ${bossHPPct <= 25 ? "animate-pulse text-amber-600" : "text-ink-soft"}`}
                >
                  {bossHP}/{MAX_HP}
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-iris-50">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bossHPColor} transition-all duration-600 ease-out`}
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
                  className="iris-pill absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2 !text-rose-600"
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
                className="center-card iris-panel pointer-events-none mx-auto mb-2 w-full max-w-xl p-5"
              >
                <div
                  className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600"
                >
                  Game Master
                </div>
                <div
                  className="mt-2 text-xl font-semibold leading-snug text-ink"
                  style={displayFont}
                >
                  {lastAgentMessage}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom controls */}
        {status === "battling" && (
          <div className="pointer-events-auto mx-auto mb-5 flex w-[calc(100%-2.5rem)] max-w-3xl items-center gap-2 rounded-full bg-white p-2 shadow-[0_2px_0_rgba(30,26,58,0.08),0_18px_40px_-18px_rgba(10,8,30,0.55)]">
            <TypeAnswer
              onSubmit={(text) => conv.sendUserMessage(text)}
              disabled={!connected}
            />
            {connected && (
              <button
                onClick={() => conv.setMuted(!muted)}
                className={`iris-btn shrink-0 px-4 py-2 text-sm ${
                  muted
                    ? "iris-btn-primary"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                }`}
              >
                {muted ? "Listen" : "Mute"}
              </button>
            )}
            <button
              onClick={() => whiteboardOpen ? closeWhiteboard() : openWhiteboard()}
              className={`iris-btn shrink-0 px-4 py-2 text-sm ${
                whiteboardOpen
                  ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Whiteboard
            </button>
            <button
              onClick={stop}
              className="iris-btn shrink-0 bg-iris-50 px-4 py-2 text-sm text-ink-soft hover:bg-iris-100"
            >
              Retreat
            </button>
          </div>
        )}

        {error && status !== "idle" && (
          <div
            className="pointer-events-auto absolute left-1/2 top-20 max-w-sm -translate-x-1/2 rounded-2xl bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-600 shadow-lg"
          >
            {error}
          </div>
        )}
      </div>

      {/* Idle splash */}
      {status === "idle" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card iris-panel pointer-events-auto mx-6 w-full max-w-md p-8 text-center">
            <div
              className="text-3xl font-semibold text-ink"
              style={displayFont}
            >
              Boss Battle
            </div>
            <p className="mt-1 text-sm font-bold text-rose-500">
              The Infernal Titan awaits
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Answer math questions fast to deal damage. One wrong answer — the boss strikes back!
            </p>
            <button
              onClick={start}
              disabled={starting}
              className="iris-btn iris-btn-primary mt-6 px-10 py-3.5 text-lg"
            >
              {starting ? "Connecting..." : "Start Battle"}
            </button>
            {error && (
              <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">{error}</div>
            )}
          </div>
        </div>
      )}

      {/* Victory screen */}
      {status === "victory" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card iris-panel pointer-events-auto mx-6 w-full max-w-lg px-12 py-10 text-center">
            <div
              className="text-4xl font-semibold text-iris-600"
              style={displayFont}
            >
              Victory!
            </div>
            <p className="mt-1 text-base font-bold text-emerald-600">
              The Infernal Titan falls
            </p>
            <p className="mt-3 text-[15px] text-ink-soft">
              You answered{" "}
              <span className="font-bold text-iris-600">{correctAnswers}</span>{" "}
              questions correctly!
            </p>
            <button
              onClick={() => { conv.endSession(); reset(); }}
              className="iris-btn iris-btn-primary mt-6 px-10 py-3.5 text-lg"
            >
              Fight again
            </button>
          </div>
        </div>
      )}

      {/* Defeat screen */}
      {status === "defeat" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card iris-panel pointer-events-auto mx-6 w-full max-w-lg px-12 py-10 text-center">
            <div
              className="text-4xl font-semibold text-ink"
              style={displayFont}
            >
              So close!
            </div>
            <p className="mt-1 text-base font-bold text-rose-500">
              The Titan is still standing
            </p>
            <p className="mt-3 text-[15px] text-ink-soft">
              Math training never ends — you got{" "}
              <span className="font-bold text-iris-600">{correctAnswers}</span>{" "}
              correct.
            </p>
            <button
              onClick={() => { conv.endSession(); reset(); }}
              className="iris-btn iris-btn-primary mt-6 px-10 py-3.5 text-lg"
            >
              Try again
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
      className="flex flex-1 items-center gap-2 rounded-full bg-iris-50 p-1 pl-4"
    >
      <span
        className="shrink-0 text-xs font-bold text-iris-600"
      >
        Answer
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer..."
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="iris-btn iris-btn-primary shrink-0 px-4 py-1.5 text-sm"
      >
        Strike
      </button>
    </form>
  );
}