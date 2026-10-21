import { create } from "zustand";
import {
  type Direction,
  type Facing,
  type Maze,
  findGoalAtDistance,
  generateMaze,
  isOpen,
  resolveDirection,
  step,
} from "./maze";
import { QUESTIONS, type Question } from "./questions";

export type Status = "idle" | "playing" | "moving" | "won";

export type BubbleVariant =
  | "intro"
  | "question"
  | "encouragement"
  | "celebration"
  | "victory";

export type Perception = {
  forward: "open" | "wall";
  left: "open" | "wall";
  right: "open" | "wall";
  back: "open" | "wall";
  atGoal: boolean;
  pos: { x: number; y: number };
  goal: { x: number; y: number };
};

export type Transcript = {
  role: "user" | "ai";
  text: string;
  ts: number;
}[];

export type MoveResult =
  | "moved"
  | "blocked"
  | "goal_reached"
  | "no_credit"
  | "wait_for_user_answer";

type State = {
  maze: Maze;
  pos: { x: number; y: number };
  facing: Facing;
  status: Status;
  transcript: Transcript;
  error: string | null;
  seed: number;
  size: number;

  // bubble state
  lastAgentMessage: string;
  bubbleVariant: BubbleVariant;
  bubbleKey: number; // bumps each time a new message arrives, so animations re-trigger
  bubbleVisible: boolean; // hidden between answer→move→next-question to keep view clean

  // move lock — true after step is granted; cleared when user speaks
  awaitingAnswer: boolean;

  // user just spoke/typed — next agent reply gets keyword-evaluated for grant
  pendingEvaluation: boolean;

  // voice movement — when true, mic stays open during movement for direction keywords
  voiceMovementEnabled: boolean;

  // step credits — earned by answering correctly, spent by player to move
  stepCredits: number;

  // current question — client-driven, deterministic order
  questionIndex: number;

  // video mode — when set, these replace the hardcoded QUESTIONS array
  videoQuestions: Question[] | null;

  // actions
  perception: () => Perception;
  currentQuestion: () => Question;
  setVideoQuestions: (qs: Question[] | null) => void;
  /** Agent grants the player a step token. Returns the new credit count. */
  grantStep: () => number;
  /** Player spends one step credit to move 1 cell. Returns blocked/no-credit/moved/goal. */
  playerMove: (dir: Direction) => MoveResult;
  finishMove: () => void;
  celebrate: () => void;
  reset: (opts?: { seed?: number; size?: number }) => void;
  appendTranscript: (m: Transcript[number]) => void;
  setError: (e: string | null) => void;
  setStatus: (s: Status) => void;
  setAgentMessage: (text: string, variant?: BubbleVariant) => void;
  onUserSpoke: () => void;
  setBubble: (variant: BubbleVariant, text?: string) => void;
  toggleVoiceMovement: () => void;
};

const DEFAULT_SIZE = 5;
const DEFAULT_SEED = 7;
// 1 correct answer = 3 cells of movement. Goal at 8-10 cells → 3-4 correct
// answers wins, with each answer letting the player walk a meaningful stretch.
const STEPS_PER_ANSWER = 3;
const MAX_BANKED_STEPS = 3;
const GOAL_MIN_DISTANCE = 8;
const GOAL_MAX_DISTANCE = 10;

function freshMaze(size: number, seed: number) {
  const maze = generateMaze(size, size, seed);
  // Place goal close to start so 1-2 correct answers (3 steps each) wins.
  maze.goal = findGoalAtDistance(
    maze,
    maze.start,
    GOAL_MIN_DISTANCE,
    GOAL_MAX_DISTANCE,
  );
  // Pick an initial facing that points at an OPEN corridor (never a wall),
  // so the bear starts looking down the path instead of into a wall.
  const startCell = maze.cells[maze.start.y][maze.start.x];
  const facing: Facing = !startCell.walls.e
    ? "e"
    : !startCell.walls.s
      ? "s"
      : !startCell.walls.n
        ? "n"
        : "w";
  return {
    maze,
    pos: { ...maze.start },
    facing,
    status: "idle" as Status,
  };
}

export const useGameStore = create<State>((set, get) => ({
  ...freshMaze(DEFAULT_SIZE, DEFAULT_SEED),
  transcript: [],
  error: null,
  seed: DEFAULT_SEED,
  size: DEFAULT_SIZE,
  lastAgentMessage: "",
  bubbleVariant: "intro",
  bubbleKey: 0,
  bubbleVisible: false,
  awaitingAnswer: false,
  pendingEvaluation: false,
  voiceMovementEnabled: false,
  stepCredits: 0,
  questionIndex: 0,
  videoQuestions: null,

  currentQuestion: () => {
    const qs = get().videoQuestions ?? QUESTIONS;
    return qs[Math.min(get().questionIndex, qs.length - 1)];
  },

  setVideoQuestions: (qs) => set({ videoQuestions: qs }),

  perception: () => {
    const { maze, pos, facing } = get();
    const fwd = resolveDirection(facing, "forward");
    const lft = resolveDirection(facing, "left");
    const rgt = resolveDirection(facing, "right");
    const bck = resolveDirection(facing, "back");
    return {
      forward: isOpen(maze, pos.x, pos.y, fwd) ? "open" : "wall",
      left: isOpen(maze, pos.x, pos.y, lft) ? "open" : "wall",
      right: isOpen(maze, pos.x, pos.y, rgt) ? "open" : "wall",
      back: isOpen(maze, pos.x, pos.y, bck) ? "open" : "wall",
      atGoal: pos.x === maze.goal.x && pos.y === maze.goal.y,
      pos: { ...pos },
      goal: { ...maze.goal },
    };
  },

  grantStep: () => {
    const { status, awaitingAnswer, stepCredits, questionIndex, videoQuestions } = get();
    if (status === "won") return stepCredits;
    if (awaitingAnswer) return stepCredits; // already granted; wait for player
    const qs = videoQuestions ?? QUESTIONS;
    const next = Math.min(MAX_BANKED_STEPS, stepCredits + STEPS_PER_ANSWER);
    set({
      stepCredits: next,
      awaitingAnswer: true,
      bubbleVisible: false,
      questionIndex: Math.min(qs.length - 1, questionIndex + 1),
    });
    return next;
  },

  playerMove: (dir) => {
    const { maze, pos, facing, status, stepCredits, questionIndex, videoQuestions } = get();
    if (status === "won" || status === "moving") return "blocked";
    if (stepCredits <= 0) return "no_credit";
    const newFacing = resolveDirection(facing, dir);
    if (!isOpen(maze, pos.x, pos.y, newFacing)) return "blocked";
    const next = step(pos, newFacing);
    const reachedGoal = next.x === maze.goal.x && next.y === maze.goal.y;
    const nextCredits = stepCredits - 1;
    const qs = videoQuestions ?? QUESTIONS;
    const isLastStep = nextCredits === 0 && !reachedGoal;
    const nextQuestion = qs[Math.min(qs.length - 1, questionIndex)];
    set({
      pos: next,
      facing: newFacing,
      status: reachedGoal ? "won" : "moving",
      stepCredits: nextCredits,
      bubbleVariant: reachedGoal
        ? "victory"
        : isLastStep
          ? "intro"
          : "celebration",
      lastAgentMessage: reachedGoal
        ? "You did it! Hooray!"
        : isLastStep
          ? `Here is the next question! ${nextQuestion.text}`
          : "Nice step!",
      bubbleKey: get().bubbleKey + 1,
      bubbleVisible: reachedGoal || isLastStep,
    });
    return reachedGoal ? "goal_reached" : "moved";
  },

  finishMove: () => {
    const { status } = get();
    if (status === "moving") set({ status: "playing" });
  },

  celebrate: () =>
    set({
      status: "won",
      bubbleVariant: "victory",
      lastAgentMessage: "We did it! Hooray!",
      bubbleKey: get().bubbleKey + 1,
      bubbleVisible: true,
    }),

  reset: (opts) => {
    // Default to DEFAULT_SEED so the maze layout + goal cell are identical
    // every game — judges see the same path you rehearsed.
    const seed = opts?.seed ?? DEFAULT_SEED;
    const size = opts?.size ?? get().size;
    set({
      ...freshMaze(size, seed),
      transcript: [],
      error: null,
      seed,
      size,
      lastAgentMessage: "",
      bubbleVariant: "intro",
      bubbleKey: get().bubbleKey + 1,
      bubbleVisible: false,
      awaitingAnswer: false,
      pendingEvaluation: false,
      voiceMovementEnabled: get().voiceMovementEnabled,
      videoQuestions: get().videoQuestions,
      stepCredits: 0,
      questionIndex: 0,
    });
  },

  appendTranscript: (m) =>
    set((s) => ({ transcript: [...s.transcript, m] })),
  setError: (e) => set({ error: e }),
  setStatus: (s) => set({ status: s }),
  setAgentMessage: (text, variant) => {
    const clean = text
      .replace(/<tool_code>[\s\S]*?<\/tool_code>/gi, "")
      .replace(/<tool_outputs?>[\s\S]*?<\/tool_outputs?>/gi, "")
      .replace(/<\/?tool_[a-z_]+>/gi, "")
      .replace(/<call:[^>]+>/g, "")
      .replace(/\b(moveCharacter|getPerception|celebrateWin)(Tool)?\s*\([^)]*\)/gi, "")
      .replace(/\b(moveCharacter|getPerception|celebrateWin)(Tool)?\b/gi, "")
      .replace(/\b(i will|i'll|let me|going to|gonna)\s+(call|use|invoke|run)\b[^.!?]*/gi, "")
      .replace(/\bSTEP_GRANTED:\d+\b/gi, "")
      .replace(/\[ACCEPT:[^\]]*\]/gi, "")
      .replace(/Speak this verbatim[^"]*"?/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;
    const state = get();
    if (state.awaitingAnswer && state.stepCredits === 0) return;
    const lower = clean.toLowerCase();
    const positive = POSITIVE_PATTERNS.some((re) => re.test(lower));
    const negative = NEGATIVE_PATTERNS.some((re) => re.test(lower));
    set((s) => {
      const base = {
        lastAgentMessage: clean,
        bubbleVariant: variant ?? inferVariant(clean, s),
        bubbleKey: s.bubbleKey + 1,
        bubbleVisible: true,
      };
      const shouldGrant =
        s.pendingEvaluation &&
        positive &&
        !negative &&
        !s.awaitingAnswer &&
        s.status !== "won";
      if (shouldGrant) {
        return {
          ...base,
          stepCredits: Math.min(MAX_BANKED_STEPS, s.stepCredits + STEPS_PER_ANSWER),
          awaitingAnswer: true,
          pendingEvaluation: false,
          // Advance to the next question. Without this, when the keyword
          // matcher grants the step before moveCharacter fires, grantStep
          // short-circuits on awaitingAnswer and the same question repeats.
          questionIndex: Math.min((s.videoQuestions ?? QUESTIONS).length - 1, s.questionIndex + 1),
          bubbleVariant: "celebration",
          bubbleVisible: false, // grant is silent; D-pad lights up, no overlay
        };
      }
      if (s.pendingEvaluation && negative) {
        return { ...base, pendingEvaluation: false };
      }
      return base;
    });
  },
  setBubble: (variant, text) =>
    set((s) => ({
      bubbleVariant: variant,
      lastAgentMessage: text ?? s.lastAgentMessage,
      bubbleKey: s.bubbleKey + 1,
      bubbleVisible: true,
    })),
  onUserSpoke: () => set({ awaitingAnswer: false, pendingEvaluation: true }),
  toggleVoiceMovement: () => set((s) => ({ voiceMovementEnabled: !s.voiceMovementEnabled })),
}));

const POSITIVE_PATTERNS = [
  /\bthat'?s right\b/,
  /\bcorrect\b/,
  /\byes\b/,
  /\bwell done\b/,
  /\bgreat (job|work)\b/,
  /\bgood (job|work)\b/,
  /\bnice (job|work|one)\b/,
  /\bwonderful\b/,
  /\bperfect\b/,
  /\bexcellent\b/,
  /\bamazing\b/,
  /\bawesome\b/,
  /\byou (got it|did it)\b/,
  /\bbravo\b/,
  /\bexactly\b/,
];

const NEGATIVE_PATTERNS = [
  /\bnot quite\b/,
  /\balmost\b/,
  /\btry again\b/,
  /\blet'?s try\b/,
  /\bclose\b/,
  /\boops\b/,
  /\bthat'?s okay\b/,
  /\bnot exactly\b/,
  /\bgood try\b/,
];

function inferVariant(text: string, state: State): BubbleVariant {
  if (state.status === "won") return "victory";
  // After a successful move the next agent line is usually praise or next question.
  if (state.status === "moving") return "celebration";
  // Heuristic: agent encouragement after wrong answer often starts with these.
  const t = text.toLowerCase();
  if (
    t.startsWith("almost") ||
    t.startsWith("not quite") ||
    t.startsWith("close") ||
    t.startsWith("good try") ||
    t.startsWith("that's okay") ||
    t.startsWith("its okay") ||
    t.startsWith("oops") ||
    t.includes("try again") ||
    t.includes("let's try")
  ) {
    return "encouragement";
  }
  if (t.includes("?")) return "question";
  return "question";
}
