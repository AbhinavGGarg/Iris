import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildDeck, DEFAULT_LEVEL, getLevel, isLevelId, newSeed, parseSpokenNumber, type BossQuestion, type LevelId } from "./bossLevels";

export type BattleStatus = "idle" | "battling" | "victory" | "defeat";
export type AnswerSource = "voice" | "pad" | "whiteboard";

export type DamageEvent = {
  id: number;
  target: "boss" | "player";
  amount: number;
  combo: boolean;
};

export type LastResult = {
  correct: boolean;
  given: number;
  question: BossQuestion;
};

export const MAX_HP = 100;
export const HIT_DAMAGE = 10;
export const COMBO_DAMAGE = 15;
export const COMBO_AT = 3;
export const BOSS_DAMAGE = 25;

export function phaseFor(bossHP: number): 1 | 2 | 3 {
  return bossHP > 66 ? 1 : bossHP > 33 ? 2 : 3;
}

export function starsFor(wrong: number): 1 | 2 | 3 {
  return wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
}

/** One line of narration for the voice buddy, keyed so each is sent once. */
export type Narration = { key: number; text: string };

type State = {
  level: LevelId;
  voiceMode: boolean;
  calmMode: boolean;
  soundOn: boolean;

  status: BattleStatus;
  /** This fight's questions, made fresh from `seed` when the battle starts. */
  deck: BossQuestion[];
  seed: number;
  playerHP: number;
  bossHP: number;
  questionIndex: number;
  streak: number;
  bestStreak: number;
  correctAnswers: number;
  wrongAnswers: number;
  hintShown: boolean;
  lastResult: LastResult | null;
  nudge: boolean;

  bossHitKey: number;
  playerHitKey: number;
  comboKey: number;
  phaseKey: number;
  damageEvents: DamageEvent[];

  narration: Narration | null;
  banner: { key: number; text: string; tone: "combo" | "phase" } | null;
  lastAgentMessage: string;
  error: string | null;

  whiteboardOpen: boolean;
  submitting: boolean;
  verdict: "correct" | "incorrect" | null;
  verdictNote: string;
  annotatedImage: string | null;

  currentQuestion: () => BossQuestion;
  setLevel: (l: LevelId) => void;
  setCalmMode: (v: boolean) => void;
  setSoundOn: (v: boolean) => void;
  /** Pass a seed to replay an exact set of questions (used by tests). */
  startBattle: (voice: boolean, seed?: number) => void;
  submitAnswer: (raw: string | number, source: AnswerSource) => "hit" | "miss" | "ignored";
  useHint: () => void;
  getBattleState: () => string;
  dismissDamageEvent: (id: number) => void;
  clearBanner: (key: number) => void;
  setAgentMessage: (text: string) => void;
  setError: (e: string | null) => void;
  setStatus: (s: BattleStatus) => void;
  reset: () => void;

  openWhiteboard: () => void;
  closeWhiteboard: () => void;
  setSubmitting: (b: boolean) => void;
  setVerdict: (verdict: "correct" | "incorrect", note: string, image: string | null) => void;
};

const battleInitial = {
  status: "idle" as BattleStatus,
  deck: [] as BossQuestion[],
  seed: 0,
  playerHP: MAX_HP,
  bossHP: MAX_HP,
  questionIndex: 0,
  streak: 0,
  bestStreak: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  hintShown: false,
  lastResult: null,
  nudge: false,
  bossHitKey: 0,
  playerHitKey: 0,
  comboKey: 0,
  phaseKey: 0,
  damageEvents: [] as DamageEvent[],
  narration: null,
  banner: null,
  lastAgentMessage: "",
  error: null,
  whiteboardOpen: false,
  submitting: false,
  verdict: null,
  verdictNote: "",
  annotatedImage: null,
};

let eventId = 0;

export const useBossStore = create<State>((set, get) => ({
  level: DEFAULT_LEVEL,
  voiceMode: false,
  calmMode: false,
  soundOn: true,
  ...battleInitial,

  currentQuestion: () => {
    const { level, questionIndex, deck } = get();
    // Before a fight starts there is no deck yet; show a stand-in so the screen has something.
    if (deck.length === 0) return buildDeck(getLevel(level), 0, 1)[0]!;
    return deck[questionIndex % deck.length]!;
  },

  setLevel: (l) => {
    set({ level: l });
    useBossProgress.getState().setLastLevel(l);
  },
  setCalmMode: (v) => set({ calmMode: v }),
  setSoundOn: (v) => set({ soundOn: v }),

  startBattle: (voice, seed) => {
    const sd = seed ?? newSeed();
    set({ ...battleInitial, status: "battling", voiceMode: voice, seed: sd, deck: buildDeck(getLevel(get().level), sd) });
  },

  submitAnswer: (raw, source) => {
    const s = get();
    if (s.status !== "battling") return "ignored";
    const given = typeof raw === "number" ? raw : parseSpokenNumber(raw);
    const question = s.currentQuestion();

    if (given === null) {
      if (source === "voice") {
        set({
          nudge: true,
          narration: {
            key: ++eventId,
            text: `The player said something without a number. Kindly ask them to say a number, then read this question verbatim: "${question.spoken}"`,
          },
        });
      }
      return "ignored";
    }

    const level = getLevel(s.level);
    const nextIndex = s.questionIndex + 1;
    const next = s.deck[nextIndex % s.deck.length]!;
    const oldPhase = phaseFor(s.bossHP);

    if (given === question.answer) {
      const streak = s.streak + 1;
      const combo = streak >= COMBO_AT;
      const dealt = Math.min(combo ? COMBO_DAMAGE : HIT_DAMAGE, s.bossHP);
      const bossHP = s.bossHP - dealt;
      const won = bossHP <= 0;
      const newPhase = phaseFor(bossHP);
      const phaseUp = !won && newPhase !== oldPhase;

      let line: string;
      if (won) {
        line = `The player answered ${given}. CORRECT, and that was the final blow! The ${level.bossName} is defeated. Say a big, happy victory cheer in one or two short sentences.`;
      } else {
        line =
          `The player answered ${given}. CORRECT.` +
          (combo ? ` That is a ${streak} in a row COMBO, a super hit!` : "") +
          (phaseUp ? ` The ${level.bossName} is powering up into a new form!` : "") +
          ` Say one short, excited attack line (max 8 words), then read this next question verbatim: "${next.spoken}"`;
      }

      set({
        bossHP,
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        correctAnswers: s.correctAnswers + 1,
        questionIndex: won ? s.questionIndex : nextIndex,
        hintShown: false,
        nudge: false,
        lastResult: { correct: true, given, question },
        bossHitKey: s.bossHitKey + 1,
        comboKey: combo ? s.comboKey + 1 : s.comboKey,
        phaseKey: phaseUp ? s.phaseKey + 1 : s.phaseKey,
        damageEvents: [...s.damageEvents, { id: ++eventId, target: "boss", amount: dealt, combo }],
        narration: { key: ++eventId, text: line },
        banner: phaseUp
          ? { key: ++eventId, text: `The ${level.bossName} is powering up!`, tone: "phase" }
          : combo && !won
            ? { key: ++eventId, text: `${streak} in a row! Super hit!`, tone: "combo" }
            : s.banner,
        status: won ? "victory" : "battling",
      });
      if (won) useBossProgress.getState().recordStars(s.level, starsFor(s.wrongAnswers));
      return "hit";
    }

    const dealt = Math.min(BOSS_DAMAGE, s.playerHP);
    const playerHP = s.playerHP - dealt;
    const lost = playerHP <= 0;
    const line = lost
      ? `The player answered ${given}, but the answer was ${question.answer}. The ${level.bossName} wins this time. Gently say the answer was ${question.answer}, then say something warm and encouraging about trying again (max 2 short sentences).`
      : `The player answered ${given}. Not quite: the answer was ${question.answer}. The ${level.bossName} strikes back. Say one short line that gently tells them the answer (max 12 words), then read this next question verbatim: "${next.spoken}"`;

    set({
      playerHP,
      streak: 0,
      wrongAnswers: s.wrongAnswers + 1,
      questionIndex: lost ? s.questionIndex : nextIndex,
      hintShown: false,
      nudge: false,
      lastResult: { correct: false, given, question },
      playerHitKey: s.playerHitKey + 1,
      damageEvents: [...s.damageEvents, { id: ++eventId, target: "player", amount: dealt, combo: false }],
      narration: { key: ++eventId, text: line },
      status: lost ? "defeat" : "battling",
    });
    return "miss";
  },

  useHint: () => {
    const s = get();
    if (s.status !== "battling" || s.hintShown) return;
    const q = s.currentQuestion();
    set({ hintShown: true, narration: { key: ++eventId, text: `The player asked for a hint. Say this verbatim: "${q.hint}"` } });
  },

  getBattleState: () => {
    const s = get();
    const q = s.currentQuestion();
    return `Player HP: ${s.playerHP}/${MAX_HP}. Boss HP: ${s.bossHP}/${MAX_HP}. Streak: ${s.streak}. Current question: ${q.spoken}`;
  },

  dismissDamageEvent: (id) => set((s) => ({ damageEvents: s.damageEvents.filter((e) => e.id !== id) })),
  clearBanner: (key) => set((s) => (s.banner?.key === key ? { banner: null } : {})),

  setAgentMessage: (text) => {
    const clean = text
      .replace(/&times;/gi, "×")
      .replace(/&divide;/gi, "÷")
      .replace(/&minus;/gi, "−")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[GAME EVENT\][^"]*"?/gi, "")
      .replace(/\b(getBattleState|dealDamageTo\w+|trigger\w+)\b\s*(\([^)]*\))?/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (clean) set({ lastAgentMessage: clean });
  },

  setError: (e) => set({ error: e }),
  setStatus: (st) => set({ status: st }),
  reset: () => set({ ...battleInitial }),

  openWhiteboard: () => set({ whiteboardOpen: true, verdict: null, verdictNote: "", annotatedImage: null }),
  closeWhiteboard: () => set({ whiteboardOpen: false, submitting: false, verdict: null, verdictNote: "", annotatedImage: null }),
  setSubmitting: (b) => set({ submitting: b }),
  setVerdict: (verdict, note, image) => set({ verdict, verdictNote: note, annotatedImage: image, submitting: false }),
}));

type Progress = {
  stars: Partial<Record<LevelId, number>>;
  /** The level picked last time, so the start screen opens on the child's grade. */
  lastLevel: LevelId;
  recordStars: (level: LevelId, stars: number) => void;
  setLastLevel: (level: LevelId) => void;
};

/** Best stars per level and the last level picked, remembered in this browser. */
export const useBossProgress = create<Progress>()(
  persist(
    (set) => ({
      stars: {},
      lastLevel: DEFAULT_LEVEL,
      recordStars: (level, stars) =>
        set((p) => ({ stars: { ...p.stars, [level]: Math.max(p.stars[level] ?? 0, stars) } })),
      setLastLevel: (level) => set({ lastLevel: level }),
    }),
    {
      name: "iris-boss-progress-v2",
      storage: createJSONStorage(() => localStorage),
      merge: (saved, current) => {
        const p = (saved ?? {}) as Partial<Progress>;
        return {
          ...current,
          stars: p.stars ?? {},
          lastLevel: isLevelId(p.lastLevel) ? p.lastLevel : DEFAULT_LEVEL,
        };
      },
    },
  ),
);
