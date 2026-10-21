export type MCQ = {
  id: number;
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  answer: "A" | "B" | "C" | "D";
  hint: string;
};

export function forestAnswerMatches(question: MCQ, raw: string): boolean {
  let s = raw.trim();
  if (!s) return false;
  s = s
    .replace(/^(the answer is|i\s+(think\s+)?(choose|pick|say)|my answer is|option|letter)\s*:?\s*/i, "")
    .trim();
  const compact = s.replace(/\s+/g, " ");
  const upper = compact.toUpperCase();

  if (/^[A-D]$/.test(upper)) return upper === question.answer;

  const letterMatches = compact.match(/\b([A-Da-d])\b/g);
  if (letterMatches) {
    const letters = new Set(letterMatches.map((m) => m.toUpperCase()));
    if (letters.size === 1) {
      const only = [...letters][0]!;
      if (only === question.answer) return true;
    }
  }

  const expected = question.choices[question.answer].toUpperCase().replace(/\s+/g, " ").trim();
  if (upper === expected) return true;

  const parts = expected.split(" ");
  if (parts.length >= 2) {
    const last = parts[parts.length - 1] ?? "";
    if (last.length >= 3 && upper === last) return true;
  }

  return false;
}

export const QUESTIONS: MCQ[] = [
  {
    id: 1,
    question: "Which word is spelled correctly?",
    choices: { A: "frend", B: "freind", C: "friend", D: "freiend" },
    answer: "C",
    hint: "It has the letters I and E next to each other — I before E.",
  },
  {
    id: 2,
    question: "What does the word 'enormous' mean?",
    choices: { A: "Very tiny", B: "Very loud", C: "Very fast", D: "Very big" },
    answer: "D",
    hint: "Think of an elephant — that would be an enormous animal.",
  },
  {
    id: 3,
    question: "Pick the word that rhymes with 'light'.",
    choices: { A: "list", B: "like", C: "night", D: "lift" },
    answer: "C",
    hint: "It ends with the same '-ight' sound.",
  },
];
