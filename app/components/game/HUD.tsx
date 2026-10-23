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

const displayFont = { fontFamily: "var(--font-display)" } as const;

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
    intro: "ring-iris-200",
    question: "ring-sky-200",
    encouragement: "ring-amber-200",
    celebration: "ring-emerald-200",
    victory: "ring-emerald-300",
  };

  return (
    <>
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
              className={`center-card iris-panel pointer-events-auto p-7 ring-4 ${variantTone[bubbleVariant]}`}
            >
              <div
                className="inline-flex items-center rounded-full bg-iris-100 px-3 py-1 text-xs font-bold text-iris-700"
              >
                {persona.name}
              </div>
              <div
                className="mt-3 text-2xl font-semibold leading-snug text-ink"
                style={displayFont}
              >
                {lastAgentMessage}
              </div>
              {bubbleVariant === "encouragement" && (
                <div className="mt-3 text-sm font-semibold text-ink-soft">
                  💛 Take your time — I&apos;m right here with you.
                </div>
              )}
              {connected && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => conv.setMuted(!muted)}
                    className={`iris-btn px-7 py-3 text-base ${
                      muted
                        ? "iris-btn-primary"
                        : "border-2 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                    }`}
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
            <div className="center-card iris-panel p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-4xl">{persona.emoji}</div>
              <div
                className="mt-4 text-3xl font-semibold text-ink"
                style={displayFont}
              >
                Maze Quest
              </div>
              <p
                className="mt-1 text-sm font-bold text-sky-600"
              >
                Science questions unlock your path
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                Answer a science question → earn a step → pick an arrow to guide your buddy toward the glowing portal.
              </p>
              <button
                onClick={() => {
                  setVideoQuestions(null);
                  start();
                }}
                disabled={starting || uploading}
                className="iris-btn iris-btn-primary mt-6 px-10 py-3.5 text-lg"
              >
                {starting ? "Connecting…" : "Start Adventure"}
              </button>

              <div className="mt-6 border-t border-iris-100 pt-5">
                <p
                  className="text-sm font-semibold text-ink-soft"
                >
                  Or upload a video for custom questions
                </p>
                {videoQuestions ? (
                  <div className="mt-3">
                    <p className="text-sm font-bold text-emerald-600">
                      {videoQuestions.length} questions ready
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <button
                        onClick={start}
                        disabled={starting}
                        className="iris-btn bg-emerald-500 px-7 py-3 text-base text-white shadow-[0_10px_24px_-10px_rgba(16,185,129,0.8)] hover:bg-emerald-600"
                      >
                        {starting ? "Connecting…" : "Start with Video"}
                      </button>
                      <button
                        onClick={() => setVideoQuestions(null)}
                        className="iris-btn iris-btn-soft px-5 py-3 text-base"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`iris-btn iris-btn-soft mt-3 cursor-pointer px-7 py-3 text-base ${uploading ? "pointer-events-none opacity-50" : ""}`}
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
                    className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600"
                  >
                    {uploadError}
                  </div>
                )}
              </div>

              {error && (
                <div
                  className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600"
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
                  className="iris-btn border-2 border-rose-200 bg-white px-5 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  End
                </button>
                <button
                  onClick={() => reset()}
                  className="iris-btn iris-btn-soft px-5 py-2 text-sm"
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
            className="pointer-events-auto absolute left-1/2 top-20 max-w-md -translate-x-1/2 rounded-2xl bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-600 shadow-lg"
          >
            {error}
          </div>
        )}
      </div>

      {/* Victory screen */}
      {status === "won" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto center-card iris-panel px-12 py-10 text-center">
            <div className="mx-auto flex h-64 w-64 items-center justify-center">
              <Trophy3D />
            </div>
            <div
              className="mt-4 text-4xl font-semibold text-iris-600"
              style={displayFont}
            >
              You did it!
            </div>
            <p className="mt-2 text-base font-bold text-emerald-600">
              Your buddy made it home
            </p>
            <p className="mt-2 text-[15px] text-ink-soft">Wonderful work, friend.</p>
            <button
              onClick={() => reset()}
              className="iris-btn iris-btn-primary mt-6 px-10 py-3.5 text-lg"
            >
              Play again
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
      className={`iris-pill ${
        highlight ? "!bg-iris-500 !text-white" : ""
      } ${pulse ? "listening-glow" : ""}`}
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
    "flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black transition active:scale-90";
  const enabled =
    "bg-iris-500 text-white shadow-[0_8px_18px_-8px_rgba(101,81,212,0.9)] hover:bg-iris-600";
  const disabled = "bg-iris-50 text-iris-200 cursor-not-allowed";
  const cls = (wall: boolean) => `${btnBase} ${canMove && !wall ? enabled : disabled}`;

  return (
    <div className="iris-panel flex flex-col items-center gap-2 !rounded-3xl p-3">
      <div
        className="text-xs font-bold text-ink-soft"
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
      className="iris-panel flex items-center gap-2 !rounded-full p-1.5 pl-4"
    >
      <span
        className="text-xs font-bold text-iris-600"
      >
        Type
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer if it's loud…"
        disabled={disabled}
        className="w-56 bg-transparent text-sm font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="iris-btn iris-btn-primary px-4 py-1.5 text-sm"
      >
        Send
      </button>
    </form>
  );
}