"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBackspace,
  FaBolt,
  FaLightbulb,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPen,
  FaRegStar,
  FaStar,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";
import {
  COMBO_AT,
  MAX_HP,
  phaseFor,
  starsFor,
  useBossProgress,
  useBossStore,
  type DamageEvent,
} from "@/app/lib/bossStore";
import { getLevel, LEVELS, type LevelId } from "@/app/lib/bossLevels";
import { useHubStore } from "@/app/lib/hubStore";
import { CHARACTERS } from "@/app/lib/characters";
import { buildBossFirstMessage, buildBossSystemPrompt } from "@/app/lib/bossAgentPersona";
import { sfx } from "@/app/lib/sfx";

/** Boss attacks wind up first, so the hit on the player lands a moment later. */
const PLAYER_HIT_DELAY_MS = 1000;
const BOSS_HIT_DELAY_MS = 450;

export default function BossHUD() {
  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const muted = conv.isMuted;

  const slug = useHubStore((s) => s.selectedCharacter) ?? "bear";
  const heroName = CHARACTERS[slug].label;

  const s = useBossStore();
  const level = getLevel(s.level);
  const question = s.currentQuestion();
  const stars = useBossProgress((p) => p.stars);

  const [starting, setStarting] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const banner = s.banner;

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

  // Sounds and screen effects follow the store's hit counters.
  useEffect(() => {
    if (s.bossHitKey === 0) return;
    if (useBossStore.getState().soundOn) {
      sfx.spell();
      sfx.hit(useBossStore.getState().streak >= COMBO_AT);
    }
  }, [s.bossHitKey]);

  useEffect(() => {
    if (s.playerHitKey === 0) return;
    if (useBossStore.getState().soundOn) sfx.bossAttack();
    if (useBossStore.getState().calmMode) return;
    const on = setTimeout(() => setScreenFlash(true), PLAYER_HIT_DELAY_MS);
    const off = setTimeout(() => setScreenFlash(false), PLAYER_HIT_DELAY_MS + 500);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [s.playerHitKey]);

  useEffect(() => {
    if (s.phaseKey === 0) return;
    if (useBossStore.getState().soundOn) sfx.phase();
  }, [s.phaseKey]);

  useEffect(() => {
    if (!banner) return;
    const key = banner.key;
    const t = setTimeout(() => useBossStore.getState().clearBanner(key), 1600);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (!useBossStore.getState().soundOn) return;
    if (s.status === "victory") setTimeout(() => sfx.victory(), 700);
    if (s.status === "defeat") setTimeout(() => sfx.defeat(), PLAYER_HIT_DELAY_MS + 200);
  }, [s.status]);

  const strike = useCallback((n: number) => {
    useBossStore.getState().submitAnswer(n, "pad");
  }, []);

  const startVoice = async () => {
    if (starting) return;
    sfx.unlock();
    setStarting(true);
    try {
      s.setError(null);
      s.startBattle(true);
      const res = await fetch(`/api/signed-url?game=boss&character=${slug}`);
      if (!res.ok) throw new Error(`Signed URL fetch failed: ${res.status}`);
      const { signedUrl, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      const lvl = useBossStore.getState().level;
      conv.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: buildBossSystemPrompt(slug, lvl) },
            firstMessage: buildBossFirstMessage(slug, lvl),
          },
        },
      });
    } catch (e) {
      s.setError(e instanceof Error ? e.message : "Failed to start");
      s.setStatus("idle");
    } finally {
      setStarting(false);
    }
  };

  const startQuiet = () => {
    sfx.unlock();
    s.setError(null);
    s.startBattle(false);
  };

  const endVoice = () => {
    if (connected) conv.endSession();
  };

  const backToLevels = () => {
    endVoice();
    s.reset();
  };

  const nextLevel = () => {
    endVoice();
    s.reset();
    s.setLevel(Math.min(4, s.level + 1) as LevelId);
  };

  const readAloud = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  const phase = phaseFor(s.bossHP);
  const bossPct = (s.bossHP / MAX_HP) * 100;
  const playerPct = (s.playerHP / MAX_HP) * 100;
  const isWord = question.prompt.length > 14;
  const miss = s.lastResult && !s.lastResult.correct ? s.lastResult : null;
  const earned = starsFor(s.wrongAnswers);

  return (
    <>
      {screenFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-50 screen-flash-red"
          style={{ boxShadow: "inset 0 0 90px 24px rgba(239,68,68,0.45)" }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto flex items-center justify-between gap-3 px-5 py-4">
          <button
            onClick={() => {
              endVoice();
              router.push("/");
            }}
            className="iris-btn iris-btn-soft px-4 py-2 text-sm"
          >
            ← Home
          </button>
          <div className="flex items-center gap-2">
            <span className="iris-pill font-display text-base">Boss Battle</span>
            {s.status !== "idle" && <span className="iris-pill">{level.skill}</span>}
            {s.status === "battling" && s.streak > 0 && (
              <span className={`iris-pill ${s.streak >= COMBO_AT ? "!bg-amber-400 !text-amber-950" : ""}`}>
                <FaBolt /> {s.streak} in a row
              </span>
            )}
          </div>
          <button
            onClick={() => s.setSoundOn(!s.soundOn)}
            className="iris-btn iris-btn-soft h-10 w-10 text-base"
            aria-label={s.soundOn ? "Turn sound off" : "Turn sound on"}
          >
            {s.soundOn ? <FaVolumeUp /> : <FaVolumeMute />}
          </button>
        </header>

        {s.status === "battling" && (
          <div className="iris-panel pointer-events-auto mx-auto mt-1 grid w-[calc(100%-2.5rem)] max-w-3xl grid-cols-2 gap-6 !rounded-3xl px-5 py-4">
            <HPBar label={heroName} hp={s.playerHP} pct={playerPct} tone="player" />
            <HPBar label={level.bossName} hp={s.bossHP} pct={bossPct} tone="boss" sub={`Form ${phase} of 3`} />
          </div>
        )}

        <div className="relative flex-1">
          <FloatingNumbers events={s.damageEvents} onDone={s.dismissDamageEvent} />
          {banner && (
            <div key={banner.key} className="pointer-events-none absolute inset-x-0 top-[22%] flex justify-center">
              <div
                className={`center-card font-display rounded-full px-8 py-3 text-3xl font-semibold shadow-2xl ${
                  banner.tone === "combo" ? "bg-amber-400 text-amber-950" : "bg-white text-rose-600"
                }`}
              >
                {banner.tone === "combo" && <FaBolt className="mr-2 inline" />}
                {banner.text}
              </div>
            </div>
          )}
        </div>

        {s.status === "battling" && (
          <div className="pointer-events-none mx-auto mb-4 flex w-[calc(100%-2rem)] max-w-6xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div key={`card-${s.questionIndex}`} className="center-card iris-panel pointer-events-auto w-full p-5 md:w-[28rem]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600">
                  Game Master
                </span>
                <span className="text-xs font-bold text-ink-soft">Question {s.correctAnswers + s.wrongAnswers + 1}</span>
              </div>

              {miss && (
                <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900">
                  <p className="text-sm font-bold">
                    Not quite! You said {miss.given}. The answer was {miss.question.answer}. Here&apos;s how:
                  </p>
                  <ol className="mt-1 list-decimal pl-5 text-sm">
                    {miss.question.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              <p className={`font-display mt-3 font-semibold leading-tight text-ink ${isWord ? "text-2xl" : "text-5xl"}`}>
                {isWord ? question.prompt : `${question.prompt} = ?`}
              </p>

              {s.hintShown && (
                <p className="mt-3 rounded-2xl bg-sky-50 px-4 py-2.5 text-[15px] font-semibold text-sky-800">
                  Hint: {question.hint}
                </p>
              )}
              {s.nudge && (
                <p className="mt-3 text-sm font-semibold text-ink-soft">Say a number, like &ldquo;twelve&rdquo;, or use the number pad.</p>
              )}
              {s.voiceMode && s.lastAgentMessage && (
                <p className="mt-3 text-sm italic text-ink-soft">&ldquo;{s.lastAgentMessage}&rdquo;</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={s.useHint} disabled={s.hintShown} className="iris-btn bg-sky-50 px-4 py-2 text-sm text-sky-700 hover:bg-sky-100">
                  <FaLightbulb /> Hint
                </button>
                <button
                  onClick={() => (s.whiteboardOpen ? s.closeWhiteboard() : s.openWhiteboard())}
                  className="iris-btn bg-amber-50 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100"
                >
                  <FaPen /> Whiteboard
                </button>
                {s.voiceMode && connected ? (
                  <button
                    onClick={() => conv.setMuted(!muted)}
                    className={`iris-btn px-4 py-2 text-sm ${muted ? "iris-btn-primary listening-glow" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
                  >
                    {muted ? <FaMicrophone /> : <FaMicrophoneSlash />}
                    {muted ? "Tap to talk" : "Stop listening"}
                  </button>
                ) : (
                  <button onClick={() => readAloud(question.spoken)} className="iris-btn iris-btn-soft px-4 py-2 text-sm">
                    <FaVolumeUp /> Read to me
                  </button>
                )}
                <button onClick={backToLevels} className="iris-btn bg-iris-50 px-4 py-2 text-sm text-ink-soft hover:bg-iris-100">
                  Retreat
                </button>
              </div>
            </div>

            {/* Keyed by question so the typed digits clear for each new question. */}
            <NumberPad key={`pad-${s.questionIndex}`} onStrike={strike} keyboard={!s.whiteboardOpen} sound={s.soundOn} />
          </div>
        )}

        {s.error && s.status !== "idle" && (
          <div className="pointer-events-auto absolute left-1/2 top-40 max-w-sm -translate-x-1/2 rounded-2xl bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-600 shadow-lg">
            {s.error}
          </div>
        )}
      </div>

      {s.status === "idle" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-y-auto py-20">
          <div className="center-card iris-panel pointer-events-auto mx-4 w-full max-w-2xl p-7">
            <div className="text-center">
              <div className="font-display text-3xl font-semibold text-ink">Boss Battle</div>
              <p className="mt-1 text-[15px] text-ink-soft">Answer math questions to power up your attacks. Pick a level:</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {LEVELS.map((l) => {
                const selected = l.id === s.level;
                const best = stars[l.id] ?? 0;
                return (
                  <button
                    key={l.id}
                    onClick={() => s.setLevel(l.id)}
                    className={`iris-card flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 ${selected ? "!border-iris-500 ring-4 ring-iris-100" : ""}`}
                  >
                    <span
                      className="font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-white"
                      style={{ background: l.palette[0] }}
                    >
                      {l.id}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-display block text-lg font-semibold leading-tight text-ink">{l.skill}</span>
                      <span className="block text-xs font-semibold text-ink-soft">Boss: {l.bossName}</span>
                      <StarRow count={best} small />
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-ink-soft">
              <input
                type="checkbox"
                checked={s.calmMode}
                onChange={(e) => s.setCalmMode(e.target.checked)}
                className="h-4 w-4 accent-[#5a3fd9]"
              />
              Calm mode (no screen shake or flashing)
            </label>

            <div className="mt-5 flex flex-col items-center gap-3">
              <button onClick={startVoice} disabled={starting} className="iris-btn iris-btn-primary px-10 py-3.5 text-lg">
                {starting ? "Connecting…" : `Start level ${s.level} with voice`}
              </button>
              <button onClick={startQuiet} className="text-sm font-bold text-ink-soft underline decoration-sun decoration-2 underline-offset-4 hover:text-ink">
                Play without voice
              </button>
            </div>
            {s.error && <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-center text-sm font-semibold text-rose-600">{s.error}</div>}
          </div>
        </div>
      )}

      {s.status === "victory" && (
        <EndCard>
          <StarRow count={earned} />
          <div className="font-display mt-3 text-4xl font-semibold text-iris-600">Victory!</div>
          <p className="mt-1 text-base font-bold text-emerald-600">You beat the {level.bossName}!</p>
          <Stats correct={s.correctAnswers} wrong={s.wrongAnswers} streak={s.bestStreak} />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {s.level < 4 && (
              <button onClick={nextLevel} className="iris-btn iris-btn-primary px-7 py-3 text-base">
                Next level →
              </button>
            )}
            <button onClick={backToLevels} className={`iris-btn px-7 py-3 text-base ${s.level < 4 ? "iris-btn-soft" : "iris-btn-primary"}`}>
              {s.level < 4 ? "Choose level" : "Play again"}
            </button>
          </div>
        </EndCard>
      )}

      {s.status === "defeat" && (
        <EndCard delayMs={PLAYER_HIT_DELAY_MS}>
          <div className="font-display text-4xl font-semibold text-ink">So close!</div>
          <p className="mt-1 text-base font-bold text-rose-500">The {level.bossName} is still standing</p>
          <p className="mt-3 text-[15px] text-ink-soft">Every try makes your math stronger. Use a hint or the whiteboard next time!</p>
          <Stats correct={s.correctAnswers} wrong={s.wrongAnswers} streak={s.bestStreak} />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={backToLevels} className="iris-btn iris-btn-primary px-7 py-3 text-base">
              Try again
            </button>
          </div>
        </EndCard>
      )}
    </>
  );
}

function HPBar({ label, hp, pct, tone, sub }: { label: string; hp: number; pct: number; tone: "player" | "boss"; sub?: string }) {
  const color =
    tone === "player"
      ? pct > 50 ? "from-emerald-500 to-green-400" : pct > 25 ? "from-yellow-500 to-amber-400" : "from-red-500 to-rose-400"
      : pct > 66 ? "from-rose-500 to-red-400" : pct > 33 ? "from-orange-500 to-amber-400" : "from-yellow-400 to-yellow-300";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-semibold text-ink">
          {label}
          {sub && <span className="ml-2 text-xs font-bold text-ink-soft">{sub}</span>}
        </span>
        <span className={`text-xs font-bold ${pct <= 25 ? "animate-pulse text-rose-500" : "text-ink-soft"}`}>
          {hp}/{MAX_HP}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-iris-50">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FloatingNumbers({ events, onDone }: { events: DamageEvent[]; onDone: (id: number) => void }) {
  return (
    <>
      {events.map((e) => (
        <FloatNumber key={e.id} event={e} onDone={onDone} />
      ))}
    </>
  );
}

function FloatNumber({ event, onDone }: { event: DamageEvent; onDone: (id: number) => void }) {
  const delay = event.target === "player" ? PLAYER_HIT_DELAY_MS : BOSS_HIT_DELAY_MS;
  useEffect(() => {
    const t = setTimeout(() => onDone(event.id), delay + 1100);
    return () => clearTimeout(t);
  }, [event.id, delay, onDone]);
  const isBoss = event.target === "boss";
  return (
    <div
      className={`damage-float font-display pointer-events-none absolute left-1/2 -translate-x-1/2 font-semibold ${
        isBoss ? "top-[8%] text-5xl" : "bottom-[8%] text-4xl"
      } ${isBoss ? (event.combo ? "text-amber-300" : "text-white") : "text-rose-300"}`}
      style={{ animationDelay: `${delay}ms`, opacity: 0, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}
    >
      −{event.amount}
      {event.combo && <span className="ml-2 text-2xl">COMBO!</span>}
    </div>
  );
}

function NumberPad({ onStrike, keyboard, sound }: { onStrike: (n: number) => void; keyboard: boolean; sound: boolean }) {
  const [entry, setEntry] = useState("");
  const onDigit = useCallback(
    (d: string) => {
      if (sound) sfx.tap();
      setEntry((v) => (v.length < 3 ? v + d : v));
    },
    [sound],
  );
  const onBack = () => setEntry((v) => v.slice(0, -1));
  const submit = useCallback(() => {
    if (!entry) return;
    onStrike(Number(entry));
    setEntry("");
  }, [entry, onStrike]);

  // Keyboard: digits, Backspace, Enter.
  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) onDigit(e.key);
      else if (e.key === "Backspace") setEntry((v) => v.slice(0, -1));
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboard, onDigit, submit]);

  const key = "iris-btn h-14 rounded-2xl bg-iris-50 text-2xl text-ink hover:bg-iris-100";
  return (
    <div className="iris-panel pointer-events-auto w-full p-4 md:w-72">
      <div className="font-display mb-3 flex h-14 items-center justify-center rounded-2xl bg-ink/5 text-4xl font-semibold text-ink">
        {entry || <span className="text-ink/25">?</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => onDigit(d)} className={key}>
            {d}
          </button>
        ))}
        <button onClick={onBack} className={key} aria-label="Delete">
          <FaBackspace />
        </button>
        <button onClick={() => onDigit("0")} className={key}>
          0
        </button>
        <button onClick={submit} disabled={!entry} className="iris-btn iris-btn-primary h-14 rounded-2xl text-lg">
          <FaBolt /> Strike
        </button>
      </div>
    </div>
  );
}

function StarRow({ count, small }: { count: number; small?: boolean }) {
  return (
    <span className={`flex gap-1 ${small ? "mt-1 text-sm" : "justify-center text-4xl"} text-amber-400`}>
      {[1, 2, 3].map((i) => (i <= count ? <FaStar key={i} /> : <FaRegStar key={i} className="text-amber-300/70" />))}
    </span>
  );
}

function Stats({ correct, wrong, streak }: { correct: number; wrong: number; streak: number }) {
  return (
    <div className="mt-4 flex justify-center gap-6 text-center">
      <div>
        <div className="font-display text-2xl font-semibold text-ink">{correct}</div>
        <div className="text-xs font-bold text-ink-soft">correct</div>
      </div>
      <div>
        <div className="font-display text-2xl font-semibold text-ink">{wrong}</div>
        <div className="text-xs font-bold text-ink-soft">missed</div>
      </div>
      <div>
        <div className="font-display text-2xl font-semibold text-ink">{streak}</div>
        <div className="text-xs font-bold text-ink-soft">best streak</div>
      </div>
    </div>
  );
}

function EndCard({ children, delayMs = 600 }: { children: React.ReactNode; delayMs?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="center-card iris-panel pointer-events-auto mx-6 w-full max-w-md px-10 py-9 text-center">{children}</div>
    </div>
  );
}
