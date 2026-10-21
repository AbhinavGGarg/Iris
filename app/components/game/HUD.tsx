"use client";

import dynamic from "next/dynamic";
import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaShoePrints, FaMapMarkerAlt, FaHeadphones } from "react-icons/fa";
import { useGameStore } from "@/app/lib/gameStore";
import { useHubStore } from "@/app/lib/hubStore";
import { buildFirstMessage, buildSystemPrompt, getPersona } from "@/app/lib/agentPersona";
import type { Direction } from "@/app/lib/maze";

const Trophy3D = dynamic(() => import("./Trophy3D"), { ssr: false });

const cinzel = { fontFamily: "var(--font-cinzel), serif" } as const;

export default function HUD() {
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);
  const reset = useGameStore((s) => s.reset);
  const pos = useGameStore((s) => s.pos);
  const goal = useGameStore((s) => s.maze.goal);
  const lastAgentMessage = useGameStore((s) => s.lastAgentMessage);
  const bubbleVariant = useGameStore((s) => s.bubbleVariant);
  const bubbleVisible = useGameStore((s) => s.bubbleVisible);
  const stepCredits = useGameStore((s) => s.stepCredits);
  const perception = useGameStore((s) => s.perception);
  const playerMove = useGameStore((s) => s.playerMove);

  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const isSpeaking = conv.isSpeaking;
  const muted = conv.isMuted;

  const characterSlug = useHubStore((s) => s.selectedCharacter);
  const persona = getPersona(characterSlug);

  const setError = useGameStore((s) => s.setError);
  const setStatus = useGameStore((s) => s.setStatus);

  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const setVideoQuestions = useGameStore((s) => s.setVideoQuestions);
  const videoQuestions = useGameStore((s) => s.videoQuestions);

  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && !wasConnected.current) {
      wasConnected.current = true;
      conv.setMuted(true);
    } else if (!connected) {
      wasConnected.current = false;
    }
  }, [connected, conv]);

  const prevCredits = useRef(stepCredits);
  useEffect(() => {
    if (prevCredits.current === 0 && stepCredits > 0 && connected) {
      conv.setMuted(true);
    }
    prevCredits.current = stepCredits;
  }, [stepCredits, connected, conv]);

  useEffect(() => {
    if (status === "moving" && connected && !muted) {
      conv.setMuted(true);
    }
  }, [status, connected, muted, conv]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setError(null);
      reset();
      const slug = useHubStore.getState().selectedCharacter;
      const res = await fetch(`/api/signed-url?character=${slug ?? "bear"}`);
      if (!res.ok) throw new Error(`Signed URL fetch failed: ${res.status}`);
      const { signedUrl, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      setStatus("playing");
      const videoQs = useGameStore.getState().videoQuestions ?? undefined;
      conv.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: buildSystemPrompt(slug, videoQs) },
            firstMessage: buildFirstMessage(slug, videoQs),
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

  const handleVideoUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    console.log(`[video-upload] starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
    try {
      const form = new FormData();
      form.append("video", file);
      console.log("[video-upload] sending to backend...");
      const t0 = performance.now();
      const res = await fetch("http://localhost:8000/api/generate-maze-questions", {
        method: "POST",
        body: form,
      });
      console.log(`[video-upload] backend responded in ${((performance.now() - t0) / 1000).toFixed(1)}s — status: ${res.status}`);
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        console.error("[video-upload] error response:", detail);
        throw new Error(detail?.detail ?? `Upload failed: ${res.status}`);
      }
      const { questions } = await res.json();
      console.log(`[video-upload] got ${questions.length} questions:`, questions);
      setVideoQuestions(questions);
    } catch (e) {
      console.error("[video-upload] failed:", e);
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      console.log("[video-upload] done");
    }
  };

  const dist = Math.abs(pos.x - goal.x) + Math.abs(pos.y - goal.y);
  const p = perception();
  const canMove = stepCredits > 0 && status !== "moving" && status !== "won";
  const showCard = bubbleVisible && !canMove && status !== "moving";

  const statusLabel =
    status === "won"
      ? "We did it!"
      : status === "idle"
        ? "Tap start"
        : !connected
          ? "Connecting…"
          : status === "moving"
            ? "Walking…"
            : muted
              ? "Mic off"
              : isSpeaking
                ? `${persona.name.split(" ")[0]} talking`
                : canMove
                  ? "Pick a direction!"
                  : "Listening";

  const variantTone: Record<typeof bubbleVariant, string> = {
    intro: "border-indigo-500/30",
    question: "border-amber-500/30",
    encouragement: "border-amber-500/40",
    celebration: "border-amber-400/50",
    victory: "border-amber-400/60",
  };

  return (
    <>
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
            ← Hub
          </button>

          <div className="flex items-center gap-3">
            <span
              className="text-sm font-bold uppercase tracking-[0.2em] text-white"
              style={cinzel}
            >
              {persona.emoji} Maze Quest
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Tag highlight={canMove} pulse={canMove}>
              <span className="inline-flex items-center gap-1.5">
                <FaShoePrints />
                {stepCredits} step{stepCredits === 1 ? "" : "s"}
              </span>
            </Tag>
            <Tag>
              <span className="inline-flex items-center gap-1.5">
                <FaMapMarkerAlt />
                {dist} to go
              </span>
            </Tag>
            <Tag highlight={connected && !muted}>
              <span className="inline-flex items-center gap-1.5">
                <FaHeadphones />
                {statusLabel}
              </span>
            </Tag>
          </div>
        </header>

        <div className="flex-1" />

        {/* Center agent card */}
        {status !== "idle" && status !== "won" && showCard && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-6">
            <div
              key={lastAgentMessage}
              className={`center-card pointer-events-auto border bg-black/70 p-6 shadow-2xl backdrop-blur-md ${variantTone[bubbleVariant]}`}
            >
              <div
                className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-400/70"
                style={cinzel}
              >
                {persona.name}
              </div>
              <div
                className="mt-2 text-2xl font-semibold leading-snug text-white drop-shadow"
                style={cinzel}
              >
                {lastAgentMessage}
              </div>
              {bubbleVariant === "encouragement" && (
                <div className="mt-3 text-sm text-white/60">
                  💛 Take your time — I&apos;m right here with you.
                </div>
              )}
              {connected && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => conv.setMuted(!muted)}
                    className={`border px-7 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition ${
                      muted
                        ? "border-amber-500 text-amber-400 hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                        : "border-rose-500/50 text-rose-400/70 hover:border-rose-400 hover:text-rose-300"
                    }`}
                    style={cinzel}
                  >
                    <span className="inline-flex items-center gap-2">
                      {muted ? <FaMicrophone /> : <FaMicrophoneSlash />}
                      {muted ? "Start Listening" : "Stop Listening"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idle splash */}
        {status === "idle" && (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="center-card border border-amber-500/30 bg-black/80 p-8 shadow-2xl backdrop-blur-md">
              <div className="text-4xl">{persona.emoji}</div>
              <div
                className="mt-4 text-2xl font-black uppercase tracking-[0.15em] text-white"
                style={{
                  ...cinzel,
                  textShadow: "0 0 60px rgba(200,164,60,0.2), 0 2px 4px rgba(0,0,0,0.8)",
                }}
              >
                Maze Quest
              </div>
              <p
                className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/40"
                style={cinzel}
              >
                Science questions unlock your path
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/70" style={cinzel}>
                Answer a science question → earn a step → pick an arrow to guide your buddy toward the glowing portal.
              </p>
              <button
                onClick={() => {
                  setVideoQuestions(null);
                  start();
                }}
                disabled={starting || uploading}
                className="mt-6 border border-amber-500 px-10 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400 transition hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
                style={cinzel}
              >
                {starting ? "Connecting…" : "Start Adventure"}
              </button>

              <div className="mt-5 border-t border-white/10 pt-5">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] text-white/35"
                  style={cinzel}
                >
                  Or upload a video for custom questions
                </p>
                {videoQuestions ? (
                  <div className="mt-3">
                    <p className="text-xs text-emerald-400">
                      {videoQuestions.length} questions ready
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <button
                        onClick={start}
                        disabled={starting}
                        className="border border-emerald-500 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                        style={cinzel}
                      >
                        {starting ? "Connecting…" : "Start with Video"}
                      </button>
                      <button
                        onClick={() => setVideoQuestions(null)}
                        className="border border-white/20 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/40 transition hover:border-white/40 hover:text-white/70"
                        style={cinzel}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`mt-3 inline-block cursor-pointer border border-indigo-500/50 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-indigo-400 transition hover:bg-indigo-500/10 ${uploading ? "pointer-events-none opacity-50" : ""}`}
                    style={cinzel}
                  >
                    {uploading ? "Generating Questions…" : "Upload Video"}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                {uploadError && (
                  <div
                    className="mt-2 border border-rose-400/40 bg-rose-500/10 p-2 text-xs text-rose-200"
                    style={cinzel}
                  >
                    {uploadError}
                  </div>
                )}
              </div>

              {error && (
                <div
                  className="mt-3 border border-rose-400/40 bg-rose-500/10 p-2 text-xs text-rose-200"
                  style={cinzel}
                >
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        {status !== "idle" && status !== "won" && (
          <div className="pointer-events-auto absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-5">
            <div className="flex flex-col gap-2">
              <TypeAnswer
                onSubmit={(text) => conv.sendUserMessage(text)}
                disabled={!connected}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={stop}
                  className="border border-rose-500/40 px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-rose-400/70 transition hover:border-rose-400 hover:text-rose-300"
                  style={cinzel}
                >
                  End
                </button>
                <button
                  onClick={() => reset()}
                  className="border border-white/20 px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-white/55 transition hover:border-white/40 hover:text-white/90"
                  style={cinzel}
                >
                  Restart
                </button>
              </div>
            </div>

            <DPad
              canMove={canMove}
              walls={{
                forward: p.forward === "wall",
                back: p.back === "wall",
                left: p.left === "wall",
                right: p.right === "wall",
              }}
              onMove={(dir) => playerMove(dir)}
            />
          </div>
        )}

        {error && status !== "idle" && status !== "won" && (
          <div
            className="pointer-events-auto absolute left-1/2 top-20 max-w-md -translate-x-1/2 border border-rose-400/40 bg-rose-500/10 p-2 text-center text-xs text-rose-200 backdrop-blur-md"
            style={cinzel}
          >
            {error}
          </div>
        )}
      </div>

      {/* Victory screen */}
      {status === "won" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto center-card border border-amber-500/40 bg-black/80 px-12 py-10 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto flex h-64 w-64 items-center justify-center">
              <Trophy3D />
            </div>
            <div
              className="mt-4 text-4xl font-black uppercase tracking-[0.15em] text-amber-300"
              style={{
                ...cinzel,
                textShadow: "0 0 60px rgba(200,164,60,0.3)",
              }}
            >
              You Did It!
            </div>
            <p
              className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/40"
              style={cinzel}
            >
              Your buddy made it home
            </p>
            <p className="mt-3 text-sm text-white/80">Wonderful work, friend.</p>
            <button
              onClick={() => reset()}
              className="mt-6 border border-amber-500 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400 transition hover:bg-amber-500/10"
              style={cinzel}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Tag({
  children,
  highlight,
  pulse,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className={`border px-3 py-1 text-[10px] uppercase tracking-[0.15em] backdrop-blur-md ${
        highlight
          ? "border-amber-500/50 bg-black/40 text-amber-400"
          : "border-white/15 bg-black/40 text-white/50"
      } ${pulse ? "listening-glow" : ""}`}
      style={{ fontFamily: "var(--font-cinzel), serif" }}
    >
      {children}
    </div>
  );
}

function DPad({
  canMove,
  walls,
  onMove,
}: {
  canMove: boolean;
  walls: { forward: boolean; back: boolean; left: boolean; right: boolean };
  onMove: (dir: Direction) => void;
}) {
  const btnBase =
    "flex h-14 w-14 items-center justify-center border text-2xl font-black shadow-xl transition active:scale-90";
  const enabled =
    "border-amber-500/60 bg-amber-500/10 text-amber-300 hover:border-amber-400 hover:bg-amber-500/20";
  const disabled = "border-white/8 bg-white/3 text-white/20 cursor-not-allowed";
  const cls = (wall: boolean) => `${btnBase} ${canMove && !wall ? enabled : disabled}`;

  return (
    <div className="flex flex-col items-center gap-2 border border-white/10 bg-black/50 p-3 shadow-2xl backdrop-blur-md">
      <div
        className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40"
        style={{ fontFamily: "var(--font-cinzel), serif" }}
      >
        {canMove ? "Pick a direction" : "Answer to unlock"}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div />
        <button
          className={cls(walls.forward)}
          disabled={!canMove || walls.forward}
          onClick={() => onMove("forward")}
          aria-label="Move forward"
        >
          ↑
        </button>
        <div />
        <button
          className={cls(walls.left)}
          disabled={!canMove || walls.left}
          onClick={() => onMove("left")}
          aria-label="Move left"
        >
          ←
        </button>
        <button
          className={cls(walls.back)}
          disabled={!canMove || walls.back}
          onClick={() => onMove("back")}
          aria-label="Move back"
        >
          ↓
        </button>
        <button
          className={cls(walls.right)}
          disabled={!canMove || walls.right}
          onClick={() => onMove("right")}
          aria-label="Move right"
        >
          →
        </button>
      </div>
    </div>
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
      className="flex items-center gap-2 border border-white/15 bg-black/40 p-1 pl-3 backdrop-blur-md"
    >
      <span
        className="text-[10px] uppercase tracking-[0.2em] text-white/40"
        style={{ fontFamily: "var(--font-cinzel), serif" }}
      >
        Type
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer if it's loud…"
        disabled={disabled}
        className="w-56 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="border border-amber-500/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-40"
        style={{ fontFamily: "var(--font-cinzel), serif" }}
      >
        Send
      </button>
    </form>
  );
}