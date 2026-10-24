export type LevelId = 1 | 2 | 3 | 4;

export type BossQuestion = {
  /** What's shown on screen, e.g. "7 + 5" or a word problem. */
  prompt: string;
  /** What the buddy reads out loud. */
  spoken: string;
  answer: number;
  steps: string[];
  hint: string;
};

export type BossLevel = {
  id: LevelId;
  skill: string;
  bossName: string;
  blurb: string;
  /** Boss colors for phases 1, 2 and 3. */
  palette: [string, string, string];
  questions: BossQuestion[];
};

function countSeq(from: number, steps: number, dir: 1 | -1): string {
  const out: number[] = [];
  for (let i = 1; i <= steps; i++) out.push(from + dir * i);
  return out.join(", ");
}

function add(a: number, b: number): BossQuestion {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  return {
    prompt: `${a} + ${b}`,
    spoken: `What is ${a} plus ${b}?`,
    answer: a + b,
    steps: [`Start with the bigger number, ${big}.`, `Count up ${small}: ${countSeq(big, small, 1)}.`, `${a} + ${b} = ${a + b}.`],
    hint: `Start at ${big} and count up ${small} more.`,
  };
}

function sub(a: number, b: number): BossQuestion {
  return {
    prompt: `${a} − ${b}`,
    spoken: `What is ${a} minus ${b}?`,
    answer: a - b,
    steps: [`Start with ${a}.`, `Count back ${b}: ${countSeq(a, b, -1)}.`, `${a} − ${b} = ${a - b}.`],
    hint: `Start at ${a} and count back ${b}.`,
  };
}

function mul(a: number, b: number): BossQuestion {
  const groups = Math.min(a, b);
  const size = Math.max(a, b);
  const seq = Array.from({ length: groups }, (_, i) => size * (i + 1)).join(", ");
  return {
    prompt: `${a} × ${b}`,
    spoken: `What is ${a} times ${b}?`,
    answer: a * b,
    steps: [`${a} × ${b} means ${groups} groups of ${size}.`, `Skip count by ${size}, ${groups} times: ${seq}.`, `${a} × ${b} = ${a * b}.`],
    hint: `Skip count by ${size}, ${groups} ${groups === 1 ? "time" : "times"}.`,
  };
}

function word(prompt: string, answer: number, steps: string[], hint: string): BossQuestion {
  return { prompt, spoken: prompt, answer, steps, hint };
}

export const LEVELS: BossLevel[] = [
  {
    id: 1,
    skill: "Adding to 10",
    bossName: "Spark Sprite",
    blurb: "Little numbers, big zaps.",
    palette: ["#2dd4bf", "#a3e635", "#fde047"],
    questions: [
      add(2, 3), add(4, 1), add(3, 3), add(5, 2), add(6, 3), add(1, 7),
      add(4, 4), add(2, 6), add(5, 5), add(3, 6), add(7, 2), add(8, 1),
    ],
  },
  {
    id: 2,
    skill: "Adding & subtracting to 20",
    bossName: "Storm Orb",
    blurb: "Count up, count back.",
    palette: ["#38bdf8", "#818cf8", "#e0f2fe"],
    questions: [
      add(9, 4), sub(12, 5), add(8, 7), sub(15, 6), add(11, 6), sub(18, 9),
      add(7, 8), sub(14, 7), add(6, 9), sub(20, 8), add(13, 5), sub(16, 4),
    ],
  },
  {
    id: 3,
    skill: "Times tables",
    bossName: "Crystal Core",
    blurb: "Skip counting power-ups.",
    palette: ["#c084fc", "#f472b6", "#fbcfe8"],
    questions: [
      mul(3, 2), mul(5, 4), mul(2, 6), mul(10, 3), mul(4, 4), mul(5, 6),
      mul(3, 3), mul(2, 9), mul(4, 5), mul(10, 7), mul(3, 5), mul(4, 3),
    ],
  },
  {
    id: 4,
    skill: "Word problems",
    bossName: "Infernal Titan",
    blurb: "Read it, picture it, solve it.",
    palette: ["#ff3838", "#ff8a00", "#ffe44d"],
    questions: [
      word("Mia has 6 apples. She gets 5 more. How many apples does she have now?", 11,
        ["Mia starts with 6 apples.", "Getting more means add: 6 + 5.", "6 + 5 = 11 apples."], "Getting more means add."),
      word("There are 14 birds on a fence. 6 fly away. How many birds are left?", 8,
        ["There are 14 birds.", "Flying away means take away: 14 − 6.", "14 − 6 = 8 birds."], "Flying away means take away."),
      word("Leo has 3 bags with 4 marbles in each bag. How many marbles does he have?", 12,
        ["3 bags with 4 marbles each is 3 groups of 4.", "Skip count by 4: 4, 8, 12.", "3 × 4 = 12 marbles."], "3 groups of 4. Skip count by 4."),
      word("A pizza has 8 slices. You eat 3. How many slices are left?", 5,
        ["The pizza starts with 8 slices.", "Eating 3 takes them away: 8 − 3.", "8 − 3 = 5 slices."], "Eating slices takes them away."),
      word("Sam reads 7 pages on Monday and 8 pages on Tuesday. How many pages is that?", 15,
        ["Put both days together: 7 + 8.", "Count up 7 from 8: 9, 10, 11, 12, 13, 14, 15.", "7 + 8 = 15 pages."], "Put both days together."),
      word("There are 5 cars. Each car has 4 wheels. How many wheels are there?", 20,
        ["5 cars with 4 wheels each is 5 groups of 4.", "Skip count by 4: 4, 8, 12, 16, 20.", "5 × 4 = 20 wheels."], "5 groups of 4. Skip count by 4."),
      word("You have 20 stickers. You give 9 to a friend. How many do you have left?", 11,
        ["You start with 20 stickers.", "Giving away means take away: 20 − 9.", "20 − 9 = 11 stickers."], "Giving away means take away."),
      word("A spider has 8 legs. How many legs do 2 spiders have?", 16,
        ["2 spiders with 8 legs each is 2 groups of 8.", "Skip count by 8: 8, 16.", "2 × 8 = 16 legs."], "Add 8 and 8."),
      word("There are 9 red balloons and 6 blue balloons. How many balloons are there?", 15,
        ["Put the red and blue balloons together: 9 + 6.", "Count up 6 from 9: 10, 11, 12, 13, 14, 15.", "9 + 6 = 15 balloons."], "Put both colors together."),
      word("A box has 16 crayons. 7 are broken. How many are not broken?", 9,
        ["The box has 16 crayons.", "Take away the broken ones: 16 − 7.", "16 − 7 = 9 crayons."], "Take away the broken ones."),
      word("Each pack has 10 cards. How many cards are in 3 packs?", 30,
        ["3 packs of 10 is 3 groups of 10.", "Skip count by 10: 10, 20, 30.", "3 × 10 = 30 cards."], "Skip count by 10, three times."),
      word("There are 12 kids playing. 4 go home. How many kids are still playing?", 8,
        ["There are 12 kids.", "Going home takes them away: 12 − 4.", "12 − 4 = 8 kids."], "Going home means take away."),
    ],
  },
];

export function getLevel(id: LevelId): BossLevel {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]!;
}

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
/** Only trusted when the child says a very short answer. */
const SOUNDALIKES: Record<string, number> = { won: 1, to: 2, too: 2, for: 4, ate: 8 };

/** The last number the child said, from digits ("12") or words ("twenty one"); null if none. */
export function parseSpokenNumber(raw: string): number | null {
  const text = raw.toLowerCase().replace(/(\d),(\d)/g, "$1$2").replace(/-/g, " ").replace(/[^a-z0-9\s]/g, " ");
  const words = text.split(/\s+/).filter(Boolean);
  let last: number | null = null;
  // Set right after "hundred", so "a hundred and five" adds up to 105.
  let base: number | null = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (/^\d+$/.test(w)) {
      last = parseInt(w, 10);
      base = null;
    } else if (w in TENS) {
      const next = words[i + 1];
      let v = TENS[w]!;
      if (next && next in ONES && ONES[next]! < 10) {
        v += ONES[next]!;
        i++;
      }
      last = (base ?? 0) + v;
      base = null;
    } else if (w === "hundred") {
      last = (last ?? 1) * 100;
      base = last;
    } else if (w in ONES) {
      last = (base ?? 0) + ONES[w]!;
      base = null;
    } else if (w !== "and") {
      base = null;
    }
  }
  if (last === null && words.length <= 2) {
    for (const w of words) if (w in SOUNDALIKES) last = SOUNDALIKES[w]!;
  }
  return last;
}
