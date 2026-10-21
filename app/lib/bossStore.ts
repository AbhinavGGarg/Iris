import { create } from "zustand";
import { MATH_QUESTIONS, type MathQuestion } from "./mathQuestions";

export type BattleStatus = "idle" | "battling" | "victory" | "defeat";

export type BossTranscript = {
  role: "user" | "ai";
  text: string;
  ts: number;
}[];

export type DamageEvent = {
  id: number;
  target: "boss" | "player";
  amount: number;
};

const MAX_HP = 100;
const DEFAULT_DAMAGE = 33;

const BOSS_CORRECT_PATTERNS = [
  /\bcorrect!/i,
  /\bdirect hit\b/i,
  /\bnailed it\b/i,
  /\bbulls?-?eye\b/i,
  /\bwell done\b/i,
  /\bexcellent\b/i,
  /\bperfect\b/i,
  /\byou slash\b/i,
  /\byou strike\b/i,
  /\byou deal\b/i,
  /\bexact\b/i,
  /\byes!\b/i,
];

const BOSS_WRONG_PATTERNS = [
  /\bwrong!/i,
  /\bincorrect\b/i,
  /\bthe correct answer\b/i,
  /\bmiss!/i,
];

// Phrases the agent uses when the player said nothing / unclear.
// If any match, we MUST NOT treat the message as a wrong answer.
const BOSS_SILENCE_PATTERNS = [
  /\bspeak,?\s*mortal\b/i,
  /\bi (?:cannot|can'?t|cant) hear\b/i,
  /\bsay (?:a|the) (?:number|answer)\b/i,
  /\bspeak up\b/i,
  /\blouder\b/i,
  /\brepeat (?:that|the question)\b/i,
  /\bwhat did you say\b/i,
  /\bdid you say something\b/i,
  /\banswer me\b/i,
];

type State = {
  playerHP: number;
  bossHP: number;
  turn: number;
  correctAnswers: number;
  status: BattleStatus;
  transcript: BossTranscript;
  error: string | null;
  lastAgentMessage: string;
  bubbleKey: number;
  bossHitKey: number;
  playerHitKey: number;
  damageEvents: DamageEvent[];

  // whiteboard / Gemini grading
  whiteboardOpen: boolean;
  submitting: boolean;
  verdict: "correct" | "incorrect" | null;
  verdictNote: string;
  annotatedImage: string | null;
  questionIndex: number;

  // actions
  currentQuestion: () => MathQuestion;
  dealDamageToBoss: (amount?: number) => string;
  dealDamageToPlayer: (amount?: number) => string;
  getBattleState: () => string;
  triggerVictory: () => void;
  triggerDefeat: () => void;
  reset: () => void;
  appendTranscript: (m: BossTranscript[number]) => void;
  setError: (e: string | null) => void;
  setStatus: (s: BattleStatus) => void;
  setAgentMessage: (text: string) => void;
  dismissDamageEvent: (id: number) => void;

  // whiteboard actions
  openWhiteboard: () => void;
  closeWhiteboard: () => void;
  setSubmitting: (b: boolean) => void;
  setVerdict: (
    verdict: "correct" | "incorrect",
    note: string,
    annotatedImage: string | null,
  ) => void;
  clearVerdict: () => void;
  advanceQuestion: () => void;
};

export const useBossStore = create<State>((set, get) => ({
  playerHP: MAX_HP,
  bossHP: MAX_HP,
  turn: 0,
  correctAnswers: 0,
  status: "idle",
  transcript: [],
  error: null,
  lastAgentMessage: "Prepare yourself for battle!",
  bubbleKey: 0,
  bossHitKey: 0,
  playerHitKey: 0,
  damageEvents: [],
  whiteboardOpen: false,
  submitting: false,
  verdict: null,
  verdictNote: "",
  annotatedImage: null,
  questionIndex: 0,

  currentQuestion: () =>
    MATH_QUESTIONS[get().questionIndex % MATH_QUESTIONS.length],

  dealDamageToBoss: (amount = DEFAULT_DAMAGE) => {
    const s = get();
    // Cap damage to remaining HP so the killing blow lands the boss at exactly 0
    // and the third hit in a 3-turn fight always finishes (34 → 33 → 33).
    const dealt = Math.min(amount, s.bossHP);
    const newBossHP = s.bossHP - dealt;
    const evt: DamageEvent = { id: Date.now(), target: "boss", amount: dealt };
    set({
      bossHP: newBossHP,
      correctAnswers: s.correctAnswers + 1,
      turn: s.turn + 1,
      bossHitKey: s.bossHitKey + 1,
      damageEvents: [...s.damageEvents, evt],
      bubbleKey: s.bubbleKey + 1,
      questionIndex: s.questionIndex + 1,
      ...(newBossHP <= 0 ? { status: "victory" as BattleStatus } : {}),
    });
    const after = get();
    return `Boss HP: ${newBossHP}/${MAX_HP}. Player HP: ${after.playerHP}/${MAX_HP}. Correct: ${after.correctAnswers}. ${newBossHP <= 0 ? "BOSS_DEFEATED" : "Boss still standing!"}`;
  },

  dealDamageToPlayer: (amount = DEFAULT_DAMAGE) => {
    const s = get();
    const dealt = Math.min(amount, s.playerHP);
    const newPlayerHP = s.playerHP - dealt;
    const evt: DamageEvent = { id: Date.now(), target: "player", amount: dealt };
    set({
      playerHP: newPlayerHP,
      turn: s.turn + 1,
      playerHitKey: s.playerHitKey + 1,
      damageEvents: [...s.damageEvents, evt],
      bubbleKey: s.bubbleKey + 1,
      questionIndex: s.questionIndex + 1,
      ...(newPlayerHP <= 0 ? { status: "defeat" as BattleStatus } : {}),
    });
    const after = get();
    return `Player HP: ${newPlayerHP}/${MAX_HP}. Boss HP: ${after.bossHP}/${MAX_HP}. ${newPlayerHP <= 0 ? "PLAYER_DEFEATED" : "Keep fighting!"}`;
  },

  getBattleState: () => {
    const { playerHP, bossHP, turn, correctAnswers } = get();
    const tier =
      correctAnswers < 2 ? 1 : correctAnswers < 4 ? 2 : correctAnswers < 6 ? 3 : 4;
    return `Player HP: ${playerHP}/${MAX_HP}. Boss HP: ${bossHP}/${MAX_HP}. Turn: ${turn}. Correct: ${correctAnswers}. Difficulty tier: ${tier}.`;
  },

  triggerVictory: () => {
    // Guard: only declare victory if the boss is actually dead. Prevents the
    // agent from celebrating a turn early while bossHP is still > 0.
    if (get().bossHP <= 0) set({ status: "victory" });
  },
  triggerDefeat: () => {
    if (get().playerHP <= 0) set({ status: "defeat" });
  },

  reset: () =>
    set({
      playerHP: MAX_HP,
      bossHP: MAX_HP,
      turn: 0,
      correctAnswers: 0,
      status: "idle",
      transcript: [],
      error: null,
      lastAgentMessage: "Prepare yourself for battle!",
      bubbleKey: 0,
      bossHitKey: 0,
      playerHitKey: 0,
      damageEvents: [],
      whiteboardOpen: false,
      submitting: false,
      verdict: null,
      verdictNote: "",
      annotatedImage: null,
      questionIndex: 0,
    }),

  appendTranscript: (m) => set((s) => ({ transcript: [...s.transcript, m] })),
  setError: (e) => set({ error: e }),
  setStatus: (s) => set({ status: s }),
  setAgentMessage: (text) => {
    const decoded = text
      .replace(/&times;/gi, "×")
      .replace(/&divide;/gi, "÷")
      .replace(/&minus;/gi, "−")
      .replace(/&plus;/gi, "+")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");

    const noTags = decoded
      .replace(/<([+\-×÷=±√²³¼½¾])\/>/g, "$1")
      .replace(/<\/?[a-zA-Z][^>]*>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Primary: parse HP from agent text. Tries two patterns per combatant:
    //   1. "Boss HP …<anything>… 75"  (label before number)
    //   2. "boss …<anything>… 75 HP"  (label after number)
    const bossMatch =
      noTags.match(/\bboss\s*:\s*(\d+)/i) ||
      noTags.match(/boss[\s_]hp\b[^.!?\n]*?(\d+)/i) ||
      noTags.match(/\bboss\b[^.!?\n]*?\b(\d+)\s*(?:\/\s*\d+\s*)?hp\b/i);
    const playerMatch =
      noTags.match(/\buser\s*:\s*(\d+)/i) ||
      noTags.match(/(?:player|your)[\s_]hp\b[^.!?\n]*?(\d+)/i) ||
      noTags.match(/\bplayer\b[^.!?\n]*?\b(\d+)\s*(?:\/\s*\d+\s*)?hp\b/i);
    const newBossHP = bossMatch ? parseInt(bossMatch[1], 10) : null;
    const newPlayerHP = playerMatch ? parseInt(playerMatch[1], 10) : null;

    // Keyword fallback — computed independently so it can fire even when HP data
    // was present but showed no change (e.g. agent announced stale HP value).
    // Wrong takes priority: "Incorrect! The correct answer was X" would otherwise
    // false-trigger the correct pattern since "correct" appears in the text.
    const lower = noTags.toLowerCase();
    // Only inspect the first sentence — narration after the verdict often contains
    // dramatic words like "no!" or "miss" that aren't actual verdicts.
    const firstSentence = lower.split(/[.!?]/)[0] ?? lower;
    const isSilencePrompt = BOSS_SILENCE_PATTERNS.some((re) => re.test(lower));
    const detectedWrong =
      !isSilencePrompt && BOSS_WRONG_PATTERNS.some((re) => re.test(firstSentence));
    const detectedCorrect =
      !isSilencePrompt &&
      !detectedWrong &&
      BOSS_CORRECT_PATTERNS.some((re) => re.test(firstSentence));

    // Strip any structured labels from the displayed bubble
    const display = noTags
      .replace(/\b(?:boss|user)\s*:\s*\S+\s*/gi, "")
      .replace(/\b(?:boss|player)[\s_]hp[:\s]+(?:is\s+(?:now\s+)?)?\d+(?:\s*\/\s*\d+)?\s*\.?/gi, "")
      .replace(/\bresult:\s*(?:correct|wrong)\s*\.?/gi, "")
      .replace(/\bdamage:\s*-?\d+\s*\.?/gi, "")
      .replace(/\bquestion:\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    set((s) => {
      const newEvents = [...s.damageEvents];
      const updates: Partial<State> = {
        lastAgentMessage: display || s.lastAgentMessage,
        bubbleKey: s.bubbleKey + 1,
      };

      // Track whether HP parsing produced an actual change this turn.
      let hpChanged = false;

      if (newBossHP !== null && newBossHP < s.bossHP) {
        updates.bossHP = newBossHP;
        updates.bossHitKey = s.bossHitKey + 1;
        updates.correctAnswers = s.correctAnswers + 1;
        updates.turn = s.turn + 1;
        updates.questionIndex = s.questionIndex + 1;
        newEvents.push({ id: Date.now(), target: "boss", amount: s.bossHP - newBossHP });
        hpChanged = true;
        if (newBossHP <= 0) updates.status = "victory";
      }
      if (newPlayerHP !== null && newPlayerHP < s.playerHP) {
        updates.playerHP = newPlayerHP;
        updates.playerHitKey = s.playerHitKey + 1;
        updates.turn = (updates.turn ?? s.turn) + 1;
        updates.questionIndex = (updates.questionIndex ?? s.questionIndex) + 1;
        newEvents.push({ id: Date.now() + 1, target: "player", amount: s.playerHP - newPlayerHP });
        hpChanged = true;
        if (newPlayerHP <= 0) updates.status = "defeat";
      }

      // Keyword fallback: only when HP parsing found no actual damage change AND
      // the player has spoken at least once (prevents welcome-message false positives).
      const playerHasSpoken = s.transcript.some((m) => m.role === "user");
      if (!hpChanged && s.status === "battling" && playerHasSpoken) {
        if (detectedWrong) {
          const newPHP = Math.max(0, s.playerHP - DEFAULT_DAMAGE);
          updates.playerHP = newPHP;
          updates.playerHitKey = s.playerHitKey + 1;
          updates.turn = s.turn + 1;
          updates.questionIndex = s.questionIndex + 1;
          newEvents.push({ id: Date.now(), target: "player", amount: DEFAULT_DAMAGE });
          if (newPHP <= 0) updates.status = "defeat";
        } else if (detectedCorrect) {
          const newBHP = Math.max(0, s.bossHP - DEFAULT_DAMAGE);
          updates.bossHP = newBHP;
          updates.bossHitKey = s.bossHitKey + 1;
          updates.correctAnswers = s.correctAnswers + 1;
          updates.turn = s.turn + 1;
          updates.questionIndex = s.questionIndex + 1;
          newEvents.push({ id: Date.now(), target: "boss", amount: DEFAULT_DAMAGE });
          if (newBHP <= 0) updates.status = "victory";
        }
      }

      if (newEvents.length > s.damageEvents.length) updates.damageEvents = newEvents;
      return updates;
    });
  },
  dismissDamageEvent: (id) =>
    set((s) => ({ damageEvents: s.damageEvents.filter((e) => e.id !== id) })),

  openWhiteboard: () =>
    set({
      whiteboardOpen: true,
      verdict: null,
      verdictNote: "",
      annotatedImage: null,
    }),
  closeWhiteboard: () =>
    set({
      whiteboardOpen: false,
      submitting: false,
      verdict: null,
      verdictNote: "",
      annotatedImage: null,
    }),
  setSubmitting: (b) => set({ submitting: b }),
  setVerdict: (verdict, note, annotatedImage) =>
    set({ verdict, verdictNote: note, annotatedImage, submitting: false }),
  clearVerdict: () =>
    set({ verdict: null, verdictNote: "", annotatedImage: null }),
  advanceQuestion: () =>
    set((s) => ({ questionIndex: s.questionIndex + 1 })),
}));