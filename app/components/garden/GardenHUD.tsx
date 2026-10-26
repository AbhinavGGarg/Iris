"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  FaCookieBite,
  FaCubes,
  FaGhost,
  FaHandHoldingHeart,
  FaHandRock,
  FaLaughSquint,
  FaLightbulb,
  FaMicrophone,
  FaMicrophoneSlash,
  FaMusic,
  FaSeedling,
  FaStar,
  FaUserFriends,
  FaVolumeUp,
  FaWalking,
  FaWind,
} from "react-icons/fa";
import { useGardenStore } from "@/app/lib/gardenStore";
import { useHubStore } from "@/app/lib/hubStore";
import {
  FEELING_LABEL,
  FEELING_ORDER,
  NEIGHBORS,
  WIN_LINE,
  buildStoryLine,
  type Feeling,
  type HelpIcon,
} from "@/app/lib/gardenStories";
import { buildGardenFirstMessage, buildGardenSystemPrompt } from "@/app/lib/gardenAgentPersona";
import FeelingFace from "./FeelingFace";

const HELP_ICONS: Record<HelpIcon, ComponentType> = {
  share: FaCookieBite,
  hug: FaHandHoldingHeart,
  laugh: FaLaughSquint,
  breathe: FaWind,
  rebuild: FaCubes,
  knock: FaHandRock,
  sit: FaUserFriends,
  light: FaLightbulb,
  boo: FaGhost,
  cheer: FaStar,
  sing: FaMusic,
  ignore: FaWalking,
};

const HELPED_PAUSE_MS = 3600;

const SPECIES_LABEL = { bunny: "bunny", hedgehog: "hedgehog", owl: "owl", duck: "duckling" } as const;

export default function GardenHUD() {
  const status = useGardenStore((s) => s.status);
  const neighborIndex = useGardenStore((s) => s.neighborIndex);
  const flowers = useGardenStore((s) => s.flowers);
  const clueShown = useGardenStore((s) => s.clueShown);
  const unkindPick = useGardenStore((s) => s.unkindPick);
  const chosenHelp = useGardenStore((s) => s.chosenHelp);
  const voiceMode = useGardenStore((s) => s.voiceMode);
  const error = useGardenStore((s) => s.error);
  const startGame = useGardenStore((s) => s.startGame);
  const pickFeeling = useGardenStore((s) => s.pickFeeling);
  const chooseHelp = useGardenStore((s) => s.chooseHelp);
  const goToNextNeighbor = useGardenStore((s) => s.goToNextNeighbor);
  const reset = useGardenStore((s) => s.reset);
  const setError = useGardenStore((s) => s.setError);
  const setStatus = useGardenStore((s) => s.setStatus);

  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const muted = conv.isMuted;
  const [starting, setStarting] = useState(false);

  const neighbor = NEIGHBORS[Math.min(neighborIndex, NEIGHBORS.length - 1)]!;

  // Start muted so background noise isn't heard as an answer; the child taps to talk.
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && !wasConnected.current) {
      wasConnected.current = true;
      conv.setMuted(true);
    } else if (!connected) {
      wasConnected.current = false;
    }
  }, [connected, conv]);

  // After a kind choice, let the flower bloom, then walk on.
  useEffect(() => {
    if (status !== "helped") return;
    const t = setTimeout(goToNextNeighbor, HELPED_PAUSE_MS);
    return () => clearTimeout(t);
  }, [status, goToNextNeighbor]);

  const startVoice = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setError(null);
      startGame(true);
      const slug = useHubStore.getState().selectedCharacter ?? "bear";
      const res = await fetch(`/api/signed-url/garden?character=${slug}`);
      if (!res.ok) throw new Error(`Signed URL fetch failed: ${res.status}`);
      const { signedUrl, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      conv.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: buildGardenSystemPrompt(slug) },
            firstMessage: buildGardenFirstMessage(slug),
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

  const tellAgent = (text: string) => {
    if (connected) conv.sendUserMessage(`[GAME EVENT] ${text}`);
  };

  const onPickFeeling = (f: Feeling) => {
    const result = pickFeeling(f);
    if (result !== "ignored") tellAgent(`The child tapped the feeling card: ${FEELING_LABEL[f]}.`);
  };

  const onChooseHelp = (i: number) => {
    const result = chooseHelp(i);
    if (result !== "ignored") tellAgent(`The child tapped help choice ${i + 1}: ${neighbor.helps[i]!.label}.`);
  };

  const readAloud = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  const leave = () => {
    if (connected) conv.endSession();
    router.push("/");
  };

  const playAgain = () => {
    if (connected) conv.endSession();
    reset();
  };

  const statusLabel =
    status === "idle" ? "Tap start"
    : status === "won" ? "Garden in bloom!"
    : status === "walking" ? "Walking…"
    : voiceMode && !connected ? "Connecting…"
    : voiceMode && muted ? "Mic off"
    : voiceMode ? "Listening"
    : "Tap to answer";

  const nextName = NEIGHBORS[neighborIndex]?.name;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto flex items-start justify-between gap-3 p-5">
          <div className="flex items-start gap-3">
            <button onClick={leave} className="iris-btn iris-btn-soft px-4 py-2 text-sm">
              ← Home
            </button>
            <div className="iris-pill flex-col !items-start !gap-0 !rounded-2xl !px-4 !py-2">
              <div className="font-display text-base font-semibold text-ink">Kindness Village</div>
              <div className="text-xs font-semibold text-ink-soft">Name the feeling → help a friend → grow a flower</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className={`iris-pill ${flowers > 0 ? "!bg-rose-500 !text-white" : ""}`}>
              <FaSeedling /> {flowers}/{NEIGHBORS.length} flowers
            </div>
            <div className="iris-pill">{statusLabel}</div>
          </div>
        </header>

        {status === "feeling" && (
          <BottomCard>
            <NeighborChip index={neighborIndex} />
            <p className="mt-3 text-lg leading-relaxed text-ink">{neighbor.story}</p>
            <h2 className="font-display mt-3 text-2xl font-semibold text-ink">
              How do you think {neighbor.name} feels?
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FEELING_ORDER.map((f) => (
                <button
                  key={f}
                  onClick={() => onPickFeeling(f)}
                  className="iris-card flex flex-col items-center gap-2 px-3 py-3 transition hover:-translate-y-0.5 hover:border-iris-500 focus:outline-none focus-visible:outline-3 focus-visible:outline-sun"
                >
                  <FeelingFace feeling={f} size={52} />
                  <span className="font-display text-lg font-semibold text-ink">{FEELING_LABEL[f]}</span>
                </button>
              ))}
            </div>

            {clueShown && (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-[15px] font-semibold text-amber-900">
                Let&apos;s look closer: {neighbor.clue}
              </div>
            )}

            <CardFooter
              hint={voiceMode ? "Say the feeling out loud, or tap a face." : "Tap the face that matches."}
              onRead={() => readAloud(buildStoryLine(neighborIndex))}
              voiceMode={voiceMode}
              connected={connected}
              muted={muted}
              onToggleMic={() => conv.setMuted(!muted)}
            />
          </BottomCard>
        )}

        {status === "helping" && (
          <BottomCard>
            <NeighborChip index={neighborIndex} />
            <div className="mt-3 flex items-center gap-3">
              <FeelingFace feeling={neighbor.feeling} size={40} />
              <p className="font-display text-xl font-semibold text-emerald-700">
                Yes! {neighbor.name} feels {FEELING_LABEL[neighbor.feeling].toLowerCase()}.
              </p>
            </div>
            <h2 className="font-display mt-3 text-2xl font-semibold text-ink">What could help {neighbor.name}?</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {neighbor.helps.map((h, i) => {
                const Icon = HELP_ICONS[h.icon];
                const dimmed = unkindPick === i;
                return (
                  <button
                    key={h.label}
                    onClick={() => onChooseHelp(i)}
                    disabled={dimmed}
                    className={`iris-card flex items-center gap-3 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-iris-500 focus:outline-none focus-visible:outline-3 focus-visible:outline-sun ${dimmed ? "opacity-40" : ""}`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-iris-50 text-xl text-iris-600">
                      <Icon />
                    </span>
                    <span>
                      <span className="block text-xs font-extrabold text-ink-soft">{i + 1}</span>
                      <span className="font-display block text-[17px] font-semibold leading-tight text-ink">{h.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {unkindPick !== null && (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-[15px] font-semibold text-rose-700">
                {`${neighbor.helps[unkindPick]!.why} Let's pick another way to help.`}
              </div>
            )}

            <CardFooter
              hint={voiceMode ? "Say it out loud, say the number, or tap a card." : "Tap the kindest way to help."}
              onRead={() =>
                readAloud(
                  `What could help ${neighbor.name}? ${neighbor.helps.map((h, i) => `${i + 1}: ${h.label}`).join(". ")}.`,
                )
              }
              voiceMode={voiceMode}
              connected={connected}
              muted={muted}
              onToggleMic={() => conv.setMuted(!muted)}
            />
          </BottomCard>
        )}

        {status === "helped" && chosenHelp !== null && (
          <BottomCard>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-rose-100 text-2xl text-rose-500">
                <FaSeedling />
              </span>
              <div>
                <p className="font-display text-2xl font-semibold text-ink">{neighbor.name} feels better. A flower bloomed!</p>
                <p className="mt-1 text-[15px] text-ink-soft">{neighbor.helps[chosenHelp]!.why}</p>
              </div>
            </div>
          </BottomCard>
        )}

        {status === "walking" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
            <div className="iris-pill !px-5 !py-3 !text-base">
              <FaWalking />
              {nextName ? `Walking to ${nextName}'s house…` : "Heading to the garden party…"}
            </div>
          </div>
        )}

        {error && status !== "idle" && (
          <div className="pointer-events-auto absolute left-1/2 top-24 max-w-md -translate-x-1/2 rounded-2xl bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-600 shadow-lg">
            {error}
          </div>
        )}
      </div>

      {status === "idle" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card iris-panel pointer-events-auto mx-6 w-full max-w-md p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-3xl text-rose-500">
              <FaSeedling />
            </div>
            <div className="font-display mt-4 text-3xl font-semibold text-ink">Kindness Village</div>
            <p className="mt-1 text-sm font-bold text-rose-500">Help your neighbors feel better</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Visit four neighbors. Name how each one feels, then pick a kind way to help. Every kind choice makes a flower bloom.
            </p>
            <button onClick={startVoice} disabled={starting} className="iris-btn iris-btn-primary mt-6 px-10 py-3.5 text-lg">
              {starting ? "Connecting…" : "Start with voice"}
            </button>
            <button onClick={() => startGame(false)} className="mt-3 block w-full text-sm font-bold text-ink-soft underline decoration-sun decoration-2 underline-offset-4 hover:text-ink">
              Play without voice
            </button>
            {error && (
              <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">{error}</div>
            )}
          </div>
        </div>
      )}

      {status === "won" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card iris-panel pointer-events-auto mx-6 max-w-md px-10 py-9 text-center">
            <div className="flex justify-center gap-2 text-3xl text-rose-500">
              {NEIGHBORS.map((n) => (
                <FaSeedling key={n.name} />
              ))}
            </div>
            <div className="font-display mt-4 text-3xl font-semibold text-iris-600">The garden is in full bloom!</div>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{WIN_LINE}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={playAgain} className="iris-btn iris-btn-primary px-7 py-3 text-base">
                Play again
              </button>
              <button onClick={leave} className="iris-btn iris-btn-soft px-7 py-3 text-base">
                ← Back home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BottomCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-5">
      <div className="center-card iris-panel pointer-events-auto w-full max-w-3xl p-6">{children}</div>
    </div>
  );
}

function NeighborChip({ index }: { index: number }) {
  const n = NEIGHBORS[index]!;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 rounded-full bg-iris-50 px-3 py-1 text-sm font-bold text-iris-700">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.accent }} />
        {n.name} the {SPECIES_LABEL[n.species]}
      </span>
      <span className="text-sm font-bold text-ink-soft">
        Neighbor {index + 1} of {NEIGHBORS.length}
      </span>
    </div>
  );
}

function CardFooter({
  hint,
  onRead,
  voiceMode,
  connected,
  muted,
  onToggleMic,
}: {
  hint: string;
  onRead: () => void;
  voiceMode: boolean;
  connected: boolean;
  muted: boolean;
  onToggleMic: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
      <span className="text-sm font-semibold text-ink-soft">{hint}</span>
      <div className="flex gap-2">
        {!voiceMode && (
          <button onClick={onRead} className="iris-btn iris-btn-soft px-4 py-2 text-sm">
            <FaVolumeUp /> Read to me
          </button>
        )}
        {voiceMode && connected && (
          <button
            onClick={onToggleMic}
            className={`iris-btn px-5 py-2 text-sm ${muted ? "iris-btn-primary listening-glow" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
          >
            {muted ? <FaMicrophone /> : <FaMicrophoneSlash />}
            {muted ? "Tap to talk" : "Stop listening"}
          </button>
        )}
      </div>
    </div>
  );
}
