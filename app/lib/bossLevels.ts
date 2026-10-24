export type GradeId = "K" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
/** A level is a grade plus 1, 2 or 3, like "3-2". */
export type LevelId = `${GradeId}-${1 | 2 | 3}`;

export type BossQuestion = {
  /** Exactly what's shown on screen, e.g. "7 + 5 = ?" or a word problem. */
  prompt: string;
  /** What the buddy reads out loud. */
  spoken: string;
  answer: number;
  steps: string[];
  hint: string;
  /** Sentences (word problems) get a smaller font than equations. */
  text?: boolean;
};

export type BossLevel = {
  id: LevelId;
  grade: GradeId;
  n: 1 | 2 | 3;
  skill: string;
  bossName: string;
  blurb: string;
  /** Boss colors for phases 1, 2 and 3. */
  palette: [string, string, string];
  questions: BossQuestion[];
};

/** Shows negatives with a real minus sign. */
export function fmt(n: number): string {
  return n < 0 ? `−${-n}` : `${n}`;
}
function say(n: number): string {
  return n < 0 ? `negative ${-n}` : `${n}`;
}
function seq(from: number, to: number, step = 1): string {
  const out: number[] = [];
  for (let v = from; step > 0 ? v <= to : v >= to; v += step) out.push(v);
  return out.join(", ");
}
function q(prompt: string, spoken: string, answer: number, steps: string[], hint: string, text = false): BossQuestion {
  return { prompt, spoken, answer, steps, hint, ...(text ? { text } : {}) };
}
function word(prompt: string, answer: number, steps: string[], hint: string): BossQuestion {
  return q(prompt, prompt, answer, steps, hint, true);
}

// ---------- Kindergarten ----------
function count(emoji: string, noun: string, n: number): BossQuestion {
  return q(`${emoji.repeat(n)}\nHow many ${noun}?`, `How many ${noun} do you see?`, n,
    ["Point at each one as you count.", `Count: ${seq(1, n)}.`, `There are ${n} ${noun}.`],
    "Point at each one and count out loud.", true);
}
function after(n: number): BossQuestion {
  return q(`What comes after ${n}?`, `What number comes after ${n}?`, n + 1,
    [`Count up to ${n}: ${seq(Math.max(1, n - 3), n)}.`, `Say the next number: ${n + 1}.`, `${n + 1} comes after ${n}.`],
    `Say ${n}, then say the next number.`, true);
}

// ---------- Adding and taking away ----------
function add(a: number, b: number): BossQuestion {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  return q(`${a} + ${b} = ?`, `What is ${a} plus ${b}?`, a + b,
    [`Start with the bigger number, ${big}.`, `Count up ${small}: ${seq(big + 1, big + small)}.`, `${a} + ${b} = ${a + b}.`],
    `Start at ${big} and count up ${small} more.`);
}
function sub(a: number, b: number): BossQuestion {
  return q(`${a} − ${b} = ?`, `What is ${a} minus ${b}?`, a - b,
    [`Start with ${a}.`, `Count back ${b}: ${seq(a - 1, a - b, -1)}.`, `${a} − ${b} = ${a - b}.`],
    `Start at ${a} and count back ${b}.`);
}
function tensOnes(t: number, o: number): BossQuestion {
  const n = t * 10 + o;
  return q(`${t} tens and ${o} ones = ?`, `What number is ${t} tens and ${o} ones?`, n,
    [`${t} tens is ${t * 10}.`, `${o} ones is ${o}.`, `${t * 10} + ${o} = ${n}.`],
    "Each ten is 10. Count by tens, then add the ones.", true);
}
function add2(a: number, b: number): BossQuestion {
  const at = a - (a % 10), bt = b - (b % 10), ao = a % 10, bo = b % 10;
  return q(`${a} + ${b} = ?`, `What is ${a} plus ${b}?`, a + b,
    [`Add the tens: ${at} + ${bt} = ${at + bt}.`, `Add the ones: ${ao} + ${bo} = ${ao + bo}.`, `${at + bt} + ${ao + bo} = ${a + b}.`],
    "Add the tens first, then the ones.");
}
function sub2(a: number, b: number): BossQuestion {
  const bt = b - (b % 10), bo = b % 10;
  return q(`${a} − ${b} = ?`, `What is ${a} minus ${b}?`, a - b,
    [`Take away the tens: ${a} − ${bt} = ${a - bt}.`, `Take away the ones: ${a - bt} − ${bo} = ${a - b}.`, `${a} − ${b} = ${a - b}.`],
    "Take away the tens first, then the ones.");
}

// ---------- Multiplying and dividing ----------
function mul(a: number, b: number): BossQuestion {
  const groups = Math.min(a, b);
  const size = Math.max(a, b);
  return q(`${a} × ${b} = ?`, `What is ${a} times ${b}?`, a * b,
    [`${a} × ${b} means ${groups} groups of ${size}.`, `Skip count by ${size}, ${groups} times: ${seq(size, size * groups, size)}.`, `${a} × ${b} = ${a * b}.`],
    `Skip count by ${size}, ${groups} ${groups === 1 ? "time" : "times"}.`);
}
function div(a: number, b: number): BossQuestion {
  const n = a / b;
  return q(`${a} ÷ ${b} = ?`, `What is ${a} divided by ${b}?`, n,
    [`${a} ÷ ${b} asks: ${b} times what makes ${a}?`, `Skip count by ${b}: ${seq(b, a, b)}.`, `That's ${n} jumps, so ${a} ÷ ${b} = ${n}.`],
    `Think: ${b} × ? = ${a}.`);
}
function mulBig(a: number, b: number): BossQuestion {
  const ones = a % 10, rest = a - ones;
  return q(`${a} × ${b} = ?`, `What is ${a} times ${b}?`, a * b,
    [`Break ${a} into ${rest} + ${ones}.`, `${rest} × ${b} = ${rest * b} and ${ones} × ${b} = ${ones * b}.`, `${rest * b} + ${ones * b} = ${a * b}.`],
    `Break ${a} into ${rest} and ${ones}, then multiply each part by ${b}.`);
}
function divBig(a: number, b: number): BossQuestion {
  const big = Math.floor(a / (10 * b)) * 10 * b, rest = a - big;
  return q(`${a} ÷ ${b} = ?`, `What is ${a} divided by ${b}?`, a / b,
    [`Break ${a} into ${big} + ${rest}.`, `${big} ÷ ${b} = ${big / b} and ${rest} ÷ ${b} = ${rest / b}.`, `${big / b} + ${rest / b} = ${a / b}.`],
    `Split ${a} into ${big} and ${rest}. Divide each part by ${b}.`);
}
const FRACTION_WORDS: Record<string, string> = {
  "1/2": "one half", "1/3": "one third", "2/3": "two thirds", "1/4": "one quarter", "3/4": "three quarters",
  "1/5": "one fifth", "2/5": "two fifths", "1/10": "one tenth",
};
function fracOf(num: number, den: number, x: number): BossQuestion {
  const part = x / den, ans = part * num;
  return q(`${num}/${den} of ${x} = ?`, `What is ${FRACTION_WORDS[`${num}/${den}`]} of ${x}?`, ans,
    [`Split ${x} into ${den} equal parts: ${x} ÷ ${den} = ${part}.`, `Take ${num} of those parts: ${num} × ${part} = ${ans}.`, `${num}/${den} of ${x} = ${ans}.`],
    `First find 1/${den} of ${x} by dividing by ${den}.`);
}
function mul22(a: number, b: number): BossQuestion {
  const bo = b % 10, bt = b - bo;
  return q(`${a} × ${b} = ?`, `What is ${a} times ${b}?`, a * b,
    [`Break ${b} into ${bt} + ${bo}.`, `${a} × ${bt} = ${a * bt} and ${a} × ${bo} = ${a * bo}.`, `${a * bt} + ${a * bo} = ${a * b}.`],
    `Break ${b} into ${bt} and ${bo}.`);
}
function volume(l: number, w: number, h: number): BossQuestion {
  return word(`A box is ${l} cm long, ${w} cm wide and ${h} cm tall. What is its volume in cubic cm?`, l * w * h,
    ["Volume = length × width × height.", `${l} × ${w} = ${l * w}.`, `${l * w} × ${h} = ${l * w * h} cubic cm.`],
    "Multiply all three sides together.");
}

// ---------- Middle school ----------
function pct(p: number, x: number): BossQuestion {
  const ans = (p * x) / 100;
  const steps: Record<number, string[]> = {
    10: [`10% means one tenth.`, `${x} ÷ 10 = ${ans}.`],
    20: [`10% of ${x} is ${x / 10}.`, `20% is double that: ${x / 10} × 2 = ${ans}.`],
    25: [`25% means one quarter.`, `${x} ÷ 4 = ${ans}.`],
    50: [`50% means one half.`, `${x} ÷ 2 = ${ans}.`],
    75: [`25% of ${x} is ${x} ÷ 4 = ${x / 4}.`, `75% is three of those: ${x / 4} × 3 = ${ans}.`],
  };
  const hints: Record<number, string> = {
    10: "10% means divide by 10.", 20: "Find 10%, then double it.", 25: "25% is one quarter: divide by 4.",
    50: "50% is half.", 75: "Find 25% first, then times 3.",
  };
  return q(`${p}% of ${x} = ?`, `What is ${p} percent of ${x}?`, ans, [...steps[p]!, `${p}% of ${x} = ${ans}.`], hints[p]!);
}
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
function sup(n: number): string {
  return String(n).split("").map((d) => SUP[d]).join("");
}
function pow(b: number, e: number): BossQuestion {
  const ans = b ** e;
  let run = b;
  const parts = [`${b} × ${b} = ${(run *= b)}`];
  for (let i = 2; i < e; i++) parts.push(`× ${b} = ${(run *= b)}`);
  const spoken = e === 2 ? `What is ${b} squared?` : e === 3 ? `What is ${b} cubed?` : `What is ${b} to the power of ${e}?`;
  return q(`${b}${sup(e)} = ?`, spoken, ans,
    [`${b}${sup(e)} means ${b} multiplied by itself ${e} times.`, `${parts.join(", ")}.`, `${b}${sup(e)} = ${ans}.`],
    `Multiply ${b} by itself ${e} times.`);
}
function eq1(form: "+" | "−" | "×" | "÷", a: number, b: number): BossQuestion {
  const x = form === "+" ? b - a : form === "−" ? b + a : form === "×" ? b / a : b * a;
  const shown = form === "+" ? `x + ${a} = ${b}` : form === "−" ? `x − ${a} = ${b}` : form === "×" ? `${a}x = ${b}` : `x ÷ ${a} = ${b}`;
  const spokenEq = form === "+" ? `x plus ${a} equals ${b}` : form === "−" ? `x minus ${a} equals ${b}` : form === "×" ? `${a} times x equals ${b}` : `x divided by ${a} equals ${b}`;
  const undo = form === "+" ? [`Undo the + ${a} by taking ${a} away from both sides.`, `x = ${b} − ${a}.`]
    : form === "−" ? [`Undo the − ${a} by adding ${a} to both sides.`, `x = ${b} + ${a}.`]
    : form === "×" ? [`${a}x means ${a} × x. Undo it by dividing both sides by ${a}.`, `x = ${b} ÷ ${a}.`]
    : [`Undo the ÷ ${a} by multiplying both sides by ${a}.`, `x = ${b} × ${a}.`];
  return q(`${shown}\nx = ?`, `Solve: ${spokenEq}. What is x?`, x, [...undo, `x = ${x}.`], "Do the opposite operation to get x by itself.");
}
function eq2(a: number, op: "+" | "−", b: number, c: number): BossQuestion {
  const mid = op === "+" ? c - b : c + b, x = mid / a;
  return q(`${a}x ${op} ${b} = ${c}\nx = ?`, `Solve: ${a} x ${op === "+" ? "plus" : "minus"} ${b} equals ${c}. What is x?`, x,
    [op === "+" ? `Undo the + ${b}: ${a}x = ${c} − ${b} = ${mid}.` : `Undo the − ${b}: ${a}x = ${c} + ${b} = ${mid}.`,
      `Undo the × ${a}: x = ${mid} ÷ ${a}.`, `x = ${x}.`],
    `Undo the ${op === "+" ? "adding" : "subtracting"} first, then the multiplying.`);
}
function root(n: number): BossQuestion {
  const r = Math.round(Math.sqrt(n));
  return q(`√${n} = ?`, `What is the square root of ${n}?`, r,
    [`Find the number that times itself makes ${n}.`, `${r} × ${r} = ${n}.`, `So √${n} = ${r}.`],
    `Which number times itself makes ${n}?`);
}
function cubeRoot(n: number): BossQuestion {
  const r = Math.round(Math.cbrt(n));
  return q(`∛${n} = ?`, `What is the cube root of ${n}?`, r,
    [`Find the number that, used 3 times, multiplies to ${n}.`, `${r} × ${r} × ${r} = ${n}.`, `So ∛${n} = ${r}.`],
    `Which number times itself, times itself again, makes ${n}?`);
}
function hyp(a: number, b: number): BossQuestion {
  const s = a * a + b * b, c = Math.round(Math.sqrt(s));
  return word(`A right triangle has legs ${a} and ${b}. How long is the longest side?`, c,
    ["Use a² + b² = c².", `${a}² + ${b}² = ${a * a} + ${b * b} = ${s}.`, `c = √${s} = ${c}.`],
    "Square both legs, add them, then take the square root.");
}
function leg(c: number, a: number): BossQuestion {
  const d = c * c - a * a, b = Math.round(Math.sqrt(d));
  return word(`A right triangle has a longest side of ${c} and one leg of ${a}. How long is the other leg?`, b,
    ["a² + b² = c², so b² = c² − a².", `${c}² − ${a}² = ${c * c} − ${a * a} = ${d}.`, `b = √${d} = ${b}.`],
    "Square the longest side, subtract the leg squared, then take the square root.");
}
function line(m: number, b: number, x: number): BossQuestion {
  const y = m * x + b;
  const mx = m === 1 ? "x" : m === -1 ? "−x" : `${fmt(m)}x`;
  const shown = `y = ${mx}${b === 0 ? "" : b > 0 ? ` + ${b}` : ` − ${-b}`}`;
  return q(`${shown}\nIf x = ${x}, y = ?`, `In ${shown.replace(/−\s?/g, "minus ").replace("= ", "equals ")}, what is y when x is ${x}?`, y,
    [`Put ${x} in for x: y = ${fmt(m)} × ${x} ${b >= 0 ? "+" : "−"} ${Math.abs(b)}.`, `${fmt(m)} × ${x} = ${fmt(m * x)}.`, `${fmt(m * x)} ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${fmt(y)}.`],
    `Swap x for ${x}, multiply, then add.`);
}
function slope(x1: number, y1: number, x2: number, y2: number): BossQuestion {
  const dy = y2 - y1, dx = x2 - x1, m = dy / dx;
  const pt = (x: number, y: number) => `(${fmt(x)}, ${fmt(y)})`;
  return q(`Slope of the line through\n${pt(x1, y1)} and ${pt(x2, y2)}?`,
    `What is the slope of the line through ${say(x1)} comma ${say(y1)} and ${say(x2)} comma ${say(y2)}?`, m,
    ["Slope = change in y ÷ change in x.", `Change in y: ${fmt(y2)} − ${fmt(y1)} = ${fmt(dy)}. Change in x: ${fmt(x2)} − ${fmt(x1)} = ${fmt(dx)}.`, `${fmt(dy)} ÷ ${fmt(dx)} = ${fmt(m)}.`],
    "Rise over run: how much y changes divided by how much x changes.", true);
}

type LevelSeed = Omit<BossLevel, "id" | "grade" | "n">;

const GRADE_SEEDS: Record<GradeId, [LevelSeed, LevelSeed, LevelSeed]> = {
  K: [
    { skill: "Counting", bossName: "Bubble Blob", blurb: "Count it to pop it.", palette: ["#7dd3fc", "#a5f3fc", "#fef9c3"],
      questions: [count("🍎", "apples", 3), after(4), count("⭐", "stars", 5), count("🐟", "fish", 2), after(7), count("🎈", "balloons", 6),
        count("🐞", "ladybugs", 4), after(9), count("🍪", "cookies", 7), after(2), count("🌸", "flowers", 8), after(5)] },
    { skill: "Adding small numbers", bossName: "Puff Cloud", blurb: "Put them together.", palette: ["#f9a8d4", "#fbcfe8", "#fde68a"],
      questions: [add(1, 1), add(2, 1), add(1, 3), add(2, 2), add(3, 2), add(4, 1), add(1, 2), add(2, 3), add(1, 4), add(3, 3), add(5, 1), add(2, 4)] },
    { skill: "Taking away", bossName: "Sleepy Moon", blurb: "How many are left?", palette: ["#c4b5fd", "#ddd6fe", "#fef3c7"],
      questions: [sub(3, 1), sub(5, 2), sub(4, 1), sub(6, 3), sub(2, 1), sub(5, 4), sub(6, 2), sub(4, 2), sub(5, 1), sub(3, 2), sub(6, 4), sub(4, 3)] },
  ],
  "1": [
    { skill: "Adding to 10", bossName: "Spark Sprite", blurb: "Little numbers, big zaps.", palette: ["#2dd4bf", "#a3e635", "#fde047"],
      questions: [add(2, 3), add(4, 1), add(3, 3), add(5, 2), add(6, 3), add(1, 7), add(4, 4), add(2, 6), add(5, 5), add(3, 6), add(7, 2), add(8, 1)] },
    { skill: "Subtracting from 10", bossName: "Pebble Golem", blurb: "Chip away at it.", palette: ["#a8a29e", "#fbbf24", "#fde68a"],
      questions: [sub(10, 3), sub(9, 4), sub(8, 5), sub(7, 2), sub(10, 6), sub(9, 7), sub(6, 4), sub(8, 3), sub(10, 8), sub(7, 5), sub(9, 2), sub(8, 6)] },
    { skill: "Tens and ones", bossName: "Ten Tower", blurb: "Stack the tens.", palette: ["#60a5fa", "#34d399", "#fde047"],
      questions: [tensOnes(3, 4), tensOnes(5, 2), tensOnes(2, 7), tensOnes(6, 1), tensOnes(4, 5), tensOnes(7, 3), tensOnes(1, 8), tensOnes(8, 2), tensOnes(9, 6), tensOnes(2, 2), tensOnes(5, 9), tensOnes(6, 6)] },
  ],
  "2": [
    { skill: "Adding & subtracting to 20", bossName: "Storm Orb", blurb: "Count up, count back.", palette: ["#38bdf8", "#818cf8", "#e0f2fe"],
      questions: [add(9, 4), sub(12, 5), add(8, 7), sub(15, 6), add(11, 6), sub(18, 9), add(7, 8), sub(14, 7), add(6, 9), sub(20, 8), add(13, 5), sub(16, 4)] },
    { skill: "Two-digit adding", bossName: "Thunder Beetle", blurb: "Tens first, then ones.", palette: ["#22d3ee", "#a78bfa", "#f0abfc"],
      questions: [add2(23, 14), add2(35, 22), add2(41, 36), add2(27, 15), add2(38, 24), add2(19, 13), add2(46, 32), add2(54, 25), add2(28, 17), add2(33, 48), add2(62, 19), add2(45, 45)] },
    { skill: "Two-digit subtracting", bossName: "Frost Wisp", blurb: "Take away the tens.", palette: ["#93c5fd", "#e0f2fe", "#ffffff"],
      questions: [sub2(48, 23), sub2(57, 34), sub2(65, 21), sub2(52, 17), sub2(73, 45), sub2(41, 18), sub2(86, 52), sub2(91, 36), sub2(64, 29), sub2(77, 33), sub2(55, 28), sub2(83, 47)] },
  ],
  "3": [
    { skill: "Times tables", bossName: "Crystal Core", blurb: "Skip counting power-ups.", palette: ["#c084fc", "#f472b6", "#fbcfe8"],
      questions: [mul(3, 2), mul(5, 4), mul(2, 6), mul(10, 3), mul(4, 4), mul(5, 6), mul(3, 3), mul(2, 9), mul(4, 5), mul(10, 7), mul(3, 5), mul(4, 3)] },
    { skill: "Division facts", bossName: "Split Serpent", blurb: "Share it out evenly.", palette: ["#4ade80", "#22d3ee", "#f0fdf4"],
      questions: [div(12, 3), div(20, 4), div(18, 6), div(35, 5), div(24, 8), div(16, 2), div(27, 9), div(42, 7), div(30, 10), div(28, 4), div(36, 6), div(45, 5)] },
    { skill: "Word problems", bossName: "Infernal Titan", blurb: "Read it, picture it, solve it.", palette: ["#ff3838", "#ff8a00", "#ffe44d"],
      questions: [
        word("Mia has 6 apples. She gets 5 more. How many apples does she have now?", 11,
          ["Mia starts with 6 apples.", "Getting more means add: 6 + 5.", "6 + 5 = 11 apples."], "Getting more means add."),
        word("There are 14 birds on a fence. 6 fly away. How many birds are left?", 8,
          ["There are 14 birds.", "Flying away means take away: 14 − 6.", "14 − 6 = 8 birds."], "Flying away means take away."),
        word("Leo has 3 bags with 4 marbles in each bag. How many marbles does he have?", 12,
          ["3 bags with 4 marbles each is 3 groups of 4.", "Skip count by 4: 4, 8, 12.", "3 × 4 = 12 marbles."], "3 groups of 4. Skip count by 4."),
        word("24 kids split into 4 equal teams. How many kids are on each team?", 6,
          ["Splitting into equal teams means divide: 24 ÷ 4.", "4 × 6 = 24.", "24 ÷ 4 = 6 kids."], "Think: 4 times what makes 24?"),
        word("Sam reads 7 pages on Monday and 8 pages on Tuesday. How many pages is that?", 15,
          ["Put both days together: 7 + 8.", "Count up 7 from 8: 9, 10, 11, 12, 13, 14, 15.", "7 + 8 = 15 pages."], "Put both days together."),
        word("There are 5 cars. Each car has 4 wheels. How many wheels are there?", 20,
          ["5 cars with 4 wheels each is 5 groups of 4.", "Skip count by 4: 4, 8, 12, 16, 20.", "5 × 4 = 20 wheels."], "5 groups of 4. Skip count by 4."),
        word("You have 20 stickers. You give 9 to a friend. How many do you have left?", 11,
          ["You start with 20 stickers.", "Giving away means take away: 20 − 9.", "20 − 9 = 11 stickers."], "Giving away means take away."),
        word("A spider has 8 legs. How many legs do 3 spiders have?", 24,
          ["3 spiders with 8 legs each is 3 groups of 8.", "Skip count by 8: 8, 16, 24.", "3 × 8 = 24 legs."], "Skip count by 8, three times."),
        word("There are 18 cookies shared equally on 3 plates. How many cookies are on each plate?", 6,
          ["Sharing equally means divide: 18 ÷ 3.", "3 × 6 = 18.", "18 ÷ 3 = 6 cookies."], "Think: 3 times what makes 18?"),
        word("A box has 16 crayons. 7 are broken. How many are not broken?", 9,
          ["The box has 16 crayons.", "Take away the broken ones: 16 − 7.", "16 − 7 = 9 crayons."], "Take away the broken ones."),
        word("Each pack has 10 cards. How many cards are in 6 packs?", 60,
          ["6 packs of 10 is 6 groups of 10.", "Skip count by 10: 10, 20, 30, 40, 50, 60.", "6 × 10 = 60 cards."], "Skip count by 10, six times."),
        word("There are 12 kids playing. 4 go home. How many kids are still playing?", 8,
          ["There are 12 kids.", "Going home takes them away: 12 − 4.", "12 − 4 = 8 kids."], "Going home means take away."),
      ] },
  ],
  "4": [
    { skill: "Multiplying bigger numbers", bossName: "Gear Giant", blurb: "Break it apart.", palette: ["#f59e0b", "#ef4444", "#fde68a"],
      questions: [mulBig(23, 4), mulBig(31, 5), mulBig(42, 3), mulBig(17, 6), mulBig(25, 4), mulBig(53, 2), mulBig(36, 3), mulBig(48, 2), mulBig(14, 7), mulBig(62, 4), mulBig(121, 3), mulBig(29, 5)] },
    { skill: "Long division", bossName: "Divide Drake", blurb: "Split the big number.", palette: ["#10b981", "#06b6d4", "#a7f3d0"],
      questions: [divBig(84, 4), divBig(96, 3), divBig(72, 6), divBig(65, 5), divBig(78, 3), divBig(92, 4), divBig(84, 7), divBig(91, 7), divBig(75, 5), divBig(96, 8), divBig(68, 4), divBig(87, 3)] },
    { skill: "Fractions of a number", bossName: "Pie Phantom", blurb: "Slice it up.", palette: ["#fb923c", "#f472b6", "#fed7aa"],
      questions: [fracOf(1, 2, 18), fracOf(1, 4, 20), fracOf(1, 3, 15), fracOf(3, 4, 16), fracOf(2, 3, 12), fracOf(1, 5, 25), fracOf(2, 5, 20), fracOf(1, 10, 50), fracOf(3, 4, 40), fracOf(1, 2, 30), fracOf(2, 3, 27), fracOf(1, 4, 36)] },
  ],
  "5": [
    { skill: "Order of operations", bossName: "Order Oracle", blurb: "Parentheses, then × ÷, then + −.", palette: ["#8b5cf6", "#ec4899", "#fde68a"],
      questions: [
        q("3 + 4 × 2 = ?", "What is 3 plus 4 times 2?", 11, ["Multiply first: 4 × 2 = 8.", "Then add: 3 + 8 = 11."], "Multiply before you add."),
        q("20 − 3 × 5 = ?", "What is 20 minus 3 times 5?", 5, ["Multiply first: 3 × 5 = 15.", "Then subtract: 20 − 15 = 5."], "Multiply before you subtract."),
        q("(6 + 4) × 3 = ?", "What is the group 6 plus 4, times 3?", 30, ["Parentheses first: 6 + 4 = 10.", "Then multiply: 10 × 3 = 30."], "Do the parentheses first."),
        q("18 ÷ 3 + 7 = ?", "What is 18 divided by 3, plus 7?", 13, ["Divide first: 18 ÷ 3 = 6.", "Then add: 6 + 7 = 13."], "Divide before you add."),
        q("2 × (9 − 4) = ?", "What is 2 times the group 9 minus 4?", 10, ["Parentheses first: 9 − 4 = 5.", "Then multiply: 2 × 5 = 10."], "Do the parentheses first."),
        q("5 + 6 × 3 = ?", "What is 5 plus 6 times 3?", 23, ["Multiply first: 6 × 3 = 18.", "Then add: 5 + 18 = 23."], "Multiply before you add."),
        q("40 ÷ (2 + 3) = ?", "What is 40 divided by the group 2 plus 3?", 8, ["Parentheses first: 2 + 3 = 5.", "Then divide: 40 ÷ 5 = 8."], "Do the parentheses first."),
        q("7 × 4 − 10 = ?", "What is 7 times 4, minus 10?", 18, ["Multiply first: 7 × 4 = 28.", "Then subtract: 28 − 10 = 18."], "Multiply before you subtract."),
        q("(12 − 8) × 6 = ?", "What is the group 12 minus 8, times 6?", 24, ["Parentheses first: 12 − 8 = 4.", "Then multiply: 4 × 6 = 24."], "Do the parentheses first."),
        q("9 + 16 ÷ 4 = ?", "What is 9 plus 16 divided by 4?", 13, ["Divide first: 16 ÷ 4 = 4.", "Then add: 9 + 4 = 13."], "Divide before you add."),
        q("3 × 3 + 4 × 2 = ?", "What is 3 times 3, plus 4 times 2?", 17, ["Multiply first: 3 × 3 = 9 and 4 × 2 = 8.", "Then add: 9 + 8 = 17."], "Do both multiplications first."),
        q("50 − (5 × 6) = ?", "What is 50 minus the group 5 times 6?", 20, ["Parentheses first: 5 × 6 = 30.", "Then subtract: 50 − 30 = 20."], "Do the parentheses first."),
      ] },
    { skill: "Two-digit multiplying", bossName: "Grid Guardian", blurb: "Tens times, ones times.", palette: ["#0ea5e9", "#6366f1", "#c7d2fe"],
      questions: [mul22(12, 15), mul22(14, 12), mul22(21, 13), mul22(11, 24), mul22(15, 15), mul22(13, 13), mul22(22, 14), mul22(25, 12), mul22(16, 11), mul22(32, 13), mul22(18, 12), mul22(24, 21)] },
    { skill: "Volume & decimals", bossName: "Cube Colossus", blurb: "Fill the box, find the point.", palette: ["#14b8a6", "#84cc16", "#ecfccb"],
      questions: [
        volume(3, 4, 5),
        q("2.5 × 4 = ?", "What is 2 point 5 times 4?", 10, ["2 × 4 = 8.", "0.5 × 4 = 2.", "8 + 2 = 10."], "Do 2 × 4, then half of 4, and add them."),
        volume(2, 6, 3),
        q("1.5 + 3.5 = ?", "What is 1 point 5 plus 3 point 5?", 5, ["Add the wholes: 1 + 3 = 4.", "Add the halves: 0.5 + 0.5 = 1.", "4 + 1 = 5."], "Two halves make a whole."),
        volume(5, 5, 2),
        q("0.5 × 18 = ?", "What is 0 point 5 times 18?", 9, ["0.5 is one half.", "Half of 18 is 9.", "0.5 × 18 = 9."], "Times 0.5 is the same as taking half."),
        volume(4, 3, 3),
        q("7.25 + 2.75 = ?", "What is 7 point 2 5 plus 2 point 7 5?", 10, ["Add the wholes: 7 + 2 = 9.", "Add the parts: 0.25 + 0.75 = 1.", "9 + 1 = 10."], "0.25 and 0.75 make a whole."),
        volume(6, 2, 4),
        q("4.5 × 2 = ?", "What is 4 point 5 times 2?", 9, ["4 × 2 = 8.", "0.5 × 2 = 1.", "8 + 1 = 9."], "Double 4, double one half, then add."),
        volume(10, 3, 2),
        q("10 − 2.5 − 2.5 = ?", "What is 10 minus 2 point 5, minus 2 point 5?", 5, ["2.5 + 2.5 = 5, so you take away 5 in total.", "10 − 5 = 5."], "Two 2.5s make 5."),
      ] },
  ],
  "6": [
    { skill: "Percents", bossName: "Percent Phoenix", blurb: "Out of 100.", palette: ["#f97316", "#ef4444", "#fde047"],
      questions: [pct(50, 40), pct(25, 80), pct(10, 70), pct(20, 45), pct(75, 40), pct(10, 250), pct(50, 96), pct(25, 64), pct(20, 150), pct(75, 12), pct(10, 90), pct(25, 200)] },
    { skill: "Exponents", bossName: "Power Hydra", blurb: "Multiply it by itself.", palette: ["#a855f7", "#6366f1", "#e9d5ff"],
      questions: [pow(2, 3), pow(3, 2), pow(5, 2), pow(2, 5), pow(4, 3), pow(10, 3), pow(6, 2), pow(3, 3), pow(2, 4), pow(9, 2), pow(7, 2), pow(3, 4)] },
    { skill: "One-step equations", bossName: "Balance Sphinx", blurb: "Get x by itself.", palette: ["#eab308", "#f59e0b", "#fef3c7"],
      questions: [eq1("+", 7, 15), eq1("×", 4, 28), eq1("−", 5, 9), eq1("÷", 3, 6), eq1("+", 12, 30), eq1("×", 6, 54), eq1("−", 8, 12), eq1("÷", 5, 4), eq1("+", 25, 40), eq1("×", 9, 72), eq1("−", 20, 15), eq1("÷", 2, 13)] },
  ],
  "7": [
    { skill: "Negative numbers", bossName: "Shadow Twin", blurb: "Below zero.", palette: ["#64748b", "#8b5cf6", "#e2e8f0"],
      questions: [
        q("−5 + 12 = ?", "What is negative 5 plus 12?", 7, ["Start at −5 on the number line.", "Move 12 to the right: 5 steps gets to 0, 7 more gets to 7.", "−5 + 12 = 7."], "Start below zero and move up 12."),
        q("−3 − 4 = ?", "What is negative 3 minus 4?", -7, ["Start at −3.", "Subtracting moves left, 4 more steps.", "−3 − 4 = −7."], "Going down from below zero goes further below."),
        q("−6 × 3 = ?", "What is negative 6 times 3?", -18, ["6 × 3 = 18.", "Negative times positive is negative.", "−6 × 3 = −18."], "Do 6 × 3, then think about the sign."),
        q("8 − 15 = ?", "What is 8 minus 15?", -7, ["8 − 8 = 0, and there are 7 more to take away.", "0 − 7 = −7.", "8 − 15 = −7."], "Take away 8 to reach zero, then keep going."),
        q("−24 ÷ (−6) = ?", "What is negative 24 divided by negative 6?", 4, ["24 ÷ 6 = 4.", "Negative divided by negative is positive.", "−24 ÷ (−6) = 4."], "Two negatives make a positive."),
        q("−7 + (−5) = ?", "What is negative 7 plus negative 5?", -12, ["Adding a negative is like subtracting.", "−7 − 5 = −12.", "−7 + (−5) = −12."], "Adding a negative moves you further below zero."),
        q("10 + (−14) = ?", "What is 10 plus negative 14?", -4, ["Adding −14 is the same as subtracting 14.", "10 − 14 = −4.", "10 + (−14) = −4."], "Adding a negative is subtracting."),
        q("−4 × (−5) = ?", "What is negative 4 times negative 5?", 20, ["4 × 5 = 20.", "Negative times negative is positive.", "−4 × (−5) = 20."], "Two negatives make a positive."),
        q("3 − (−6) = ?", "What is 3 minus negative 6?", 9, ["Subtracting a negative is the same as adding.", "3 + 6 = 9.", "3 − (−6) = 9."], "Minus a negative means add."),
        q("−30 ÷ 5 = ?", "What is negative 30 divided by 5?", -6, ["30 ÷ 5 = 6.", "Negative divided by positive is negative.", "−30 ÷ 5 = −6."], "Do 30 ÷ 5, then think about the sign."),
        q("−9 + 9 = ?", "What is negative 9 plus 9?", 0, ["−9 and 9 are opposites.", "Opposites add up to zero.", "−9 + 9 = 0."], "A number plus its opposite is zero."),
        q("−2 × 8 + 20 = ?", "What is negative 2 times 8, plus 20?", 4, ["Multiply first: −2 × 8 = −16.", "Then add: −16 + 20 = 4.", "−2 × 8 + 20 = 4."], "Multiply first, then add."),
      ] },
    { skill: "Two-step equations", bossName: "Riddle Knight", blurb: "Undo it in two moves.", palette: ["#dc2626", "#7c3aed", "#fecaca"],
      questions: [eq2(3, "+", 5, 20), eq2(2, "+", 7, 19), eq2(3, "−", 4, 14), eq2(4, "+", 3, 31), eq2(2, "−", 9, 11), eq2(5, "+", 10, 45), eq2(5, "−", 6, 29), eq2(6, "+", 4, 40), eq2(4, "−", 8, 28), eq2(7, "+", 2, 51), eq2(8, "−", 5, 59), eq2(9, "−", 3, 60)] },
    { skill: "Ratios & proportions", bossName: "Ratio Wyrm", blurb: "Scale it up or down.", palette: ["#059669", "#0891b2", "#a7f3d0"],
      questions: [
        word("3 pencils cost $6. How many dollars do 7 pencils cost?", 14, ["Find one pencil: $6 ÷ 3 = $2.", "7 pencils: 7 × $2 = $14.", "7 pencils cost $14."], "Find the cost of 1 pencil first."),
        word("A car goes 60 miles in 1 hour. How many miles does it go in 4 hours?", 240, ["Each hour is 60 miles.", "4 × 60 = 240.", "It goes 240 miles."], "Multiply the miles per hour by the hours."),
        word("The ratio of cats to dogs is 2 to 3. There are 8 cats. How many dogs are there?", 12, ["8 cats is 4 groups of 2.", "So there are 4 groups of 3 dogs: 4 × 3 = 12.", "There are 12 dogs."], "How many groups of 2 cats are there?"),
        word("A recipe uses 2 cups of flour for 12 cookies. How many cups do you need for 36 cookies?", 6, ["36 cookies is 3 times 12 cookies.", "3 × 2 cups = 6 cups.", "You need 6 cups."], "How many batches of 12 is 36?"),
        word("5 notebooks cost $15. How many dollars do 2 notebooks cost?", 6, ["One notebook: $15 ÷ 5 = $3.", "2 notebooks: 2 × $3 = $6.", "2 notebooks cost $6."], "Find the cost of 1 notebook first."),
        word("On a map, 1 inch is 50 miles. How many miles is 3 inches?", 150, ["Each inch is 50 miles.", "3 × 50 = 150.", "3 inches is 150 miles."], "Multiply 50 by the inches."),
        word("Lemonade uses 1 cup of syrup for every 4 cups of water. How many cups of water go with 3 cups of syrup?", 12, ["Each cup of syrup needs 4 cups of water.", "3 × 4 = 12.", "You need 12 cups of water."], "Each cup of syrup needs 4 of water."),
        word("Jo runs 3 laps in 12 minutes. At that pace, how many minutes do 5 laps take?", 20, ["One lap: 12 ÷ 3 = 4 minutes.", "5 laps: 5 × 4 = 20 minutes.", "5 laps take 20 minutes."], "Find the time for 1 lap first."),
        word("The ratio of boys to girls is 4 to 5. There are 20 girls. How many boys are there?", 16, ["20 girls is 4 groups of 5.", "So there are 4 groups of 4 boys: 4 × 4 = 16.", "There are 16 boys."], "How many groups of 5 girls are there?"),
        word("A printer prints 30 pages in 2 minutes. How many pages does it print in 5 minutes?", 75, ["One minute: 30 ÷ 2 = 15 pages.", "5 minutes: 5 × 15 = 75 pages.", "It prints 75 pages."], "Find the pages for 1 minute first."),
        word("8 apples cost $4. How many apples can you buy with $10?", 20, ["$1 buys 8 ÷ 4 = 2 apples.", "$10 buys 10 × 2 = 20 apples.", "You can buy 20 apples."], "How many apples does $1 buy?"),
        word("A plant grows 3 cm every 2 weeks. How many cm does it grow in 10 weeks?", 15, ["10 weeks is 5 groups of 2 weeks.", "5 × 3 cm = 15 cm.", "It grows 15 cm."], "How many 2-week groups fit in 10 weeks?"),
      ] },
  ],
  "8": [
    { skill: "Roots & powers", bossName: "Root Leviathan", blurb: "Undo the square.", palette: ["#0284c7", "#7c3aed", "#bae6fd"],
      questions: [root(49), root(81), pow(4, 3), root(144), cubeRoot(27), root(169), pow(5, 3), root(225), cubeRoot(64), pow(11, 2), root(400), cubeRoot(125)] },
    { skill: "Pythagorean theorem", bossName: "Triangle Titan", blurb: "a² + b² = c².", palette: ["#e11d48", "#f97316", "#ffe4e6"],
      questions: [hyp(3, 4), hyp(6, 8), leg(13, 5), hyp(5, 12), leg(10, 6), hyp(8, 15), leg(17, 8), hyp(9, 12), leg(25, 7), hyp(12, 16), leg(15, 9), hyp(7, 24)] },
    { skill: "Linear functions", bossName: "Slope Dragon", blurb: "Rise over run.", palette: ["#ff3838", "#ff8a00", "#ffe44d"],
      questions: [line(3, 2, 4), slope(1, 2, 3, 8), line(2, 5, 6), slope(0, 1, 2, 9), line(4, -3, 5), slope(2, 3, 6, 11), line(5, 1, 3), slope(0, 10, 2, 4), line(-2, 10, 3), slope(1, 5, 4, 5), line(6, -4, 2), slope(-1, -2, 1, 6)] },
  ],
};

export const GRADES: { id: GradeId; label: string; short: string; levels: BossLevel[] }[] = (
  ["K", "1", "2", "3", "4", "5", "6", "7", "8"] as GradeId[]
).map((g) => ({
  id: g,
  label: g === "K" ? "Kindergarten" : `Grade ${g}`,
  short: g,
  levels: GRADE_SEEDS[g].map((seed, i) => ({ ...seed, id: `${g}-${(i + 1) as 1 | 2 | 3}` as LevelId, grade: g, n: (i + 1) as 1 | 2 | 3 })),
}));

export const LEVELS: BossLevel[] = GRADES.flatMap((g) => g.levels);
export const DEFAULT_LEVEL: LevelId = "1-1";

export function getLevel(id: LevelId): BossLevel {
  return LEVELS.find((l) => l.id === id) ?? LEVELS.find((l) => l.id === DEFAULT_LEVEL)!;
}
export function getGrade(id: GradeId) {
  return GRADES.find((g) => g.id === id) ?? GRADES[1]!;
}
export function isLevelId(v: unknown): v is LevelId {
  return typeof v === "string" && LEVELS.some((l) => l.id === v);
}
/** The level after this one, moving into the next grade after level 3. Null at the very end. */
export function nextLevelId(id: LevelId): LevelId | null {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1]!.id : null;
}
/** True when some answer in the level is negative, so the number pad needs a minus key. */
export function hasNegatives(level: BossLevel): boolean {
  return level.questions.some((q) => q.answer < 0);
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
  const text = raw
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/(^|[^a-z0-9])[-−](?=\d)/g, "$1 negative ")
    .replace(/[-−]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");
  const words = text.split(/\s+/).filter(Boolean);
  let last: number | null = null;
  // Builds number words into one value: "two hundred and five", "one thousand", "twenty one".
  let active = false;
  let total = 0;
  let cur = 0;
  // "negative five" or "minus five": the sign belongs to the number that starts next.
  let pendingNeg = false;
  let sign = 1;
  const begin = () => {
    if (active) return;
    sign = pendingNeg ? -1 : 1;
    pendingNeg = false;
    active = true;
    total = 0;
    cur = 0;
  };
  const finish = () => {
    if (!active) return;
    last = sign * (total + cur);
    active = false;
  };
  for (const w of words) {
    if (w === "negative" || w === "minus") {
      finish();
      pendingNeg = true;
    } else if (/^\d+$/.test(w)) {
      finish();
      begin();
      cur = parseInt(w, 10);
      finish();
    } else if (w in TENS) {
      if (active && cur % 100 !== 0) finish();
      begin();
      cur += TENS[w]!;
    } else if (w in ONES) {
      const v = ONES[w]!;
      if (active && (cur % 10 !== 0 || (v >= 10 && cur % 100 !== 0))) finish();
      begin();
      cur += v;
    } else if (w === "hundred") {
      begin();
      cur = (cur || 1) * 100;
    } else if (w === "thousand") {
      begin();
      total += (cur || 1) * 1000;
      cur = 0;
    } else if (w !== "and") {
      finish();
      pendingNeg = false;
    }
  }
  finish();
  if (last === null && words.length <= 2) {
    for (const w of words) if (w in SOUNDALIKES) last = SOUNDALIKES[w]!;
  }
  return last;
}
