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
  /** True when answers can be negative, so the number pad shows a minus key. */
  negatives?: boolean;
  /** Makes one fresh question. Every fight builds a new deck from a seed. */
  make: (r: Rng) => BossQuestion;
};

/** Small seeded random number generator (mulberry32): the same seed always gives the same questions. */
export type Rng = { int: (lo: number, hi: number) => number; pick: <T>(items: readonly T[]) => T; chance: (p: number) => boolean };
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return { int, pick: (items) => items[int(0, items.length - 1)]!, chance: (p) => next() < p };
}

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
  return q(`${shown}\nIf x = ${x}, y = ?`, `If y equals ${m < 0 ? "negative " : ""}${Math.abs(m) === 1 ? "" : `${Math.abs(m)} `}x${b === 0 ? "" : ` ${b > 0 ? "plus" : "minus"} ${Math.abs(b)}`}, what is y when x is ${x}?`, y,
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

// ---------- Templates with random numbers ----------
const COUNT_THINGS: [string, string][] = [
  ["🍎", "apples"], ["⭐", "stars"], ["🐟", "fish"], ["🎈", "balloons"], ["🐞", "ladybugs"],
  ["🍪", "cookies"], ["🌸", "flowers"], ["🚗", "cars"], ["🐶", "puppies"], ["🍓", "strawberries"],
];
const KIDS: [string, string][] = [
  ["Mia", "she"], ["Leo", "he"], ["Ava", "she"], ["Sam", "he"], ["Zoe", "she"], ["Max", "he"],
  ["Lily", "she"], ["Omar", "he"], ["Nina", "she"], ["Kai", "he"], ["Rosa", "she"], ["Ben", "he"],
];
const cap = (t: string) => t[0]!.toUpperCase() + t.slice(1);

function wordProblem(r: Rng): BossQuestion {
  const [name, he] = r.pick(KIDS);
  const kind = r.int(0, 4);
  if (kind === 0) {
    const thing = r.pick(["apples", "stickers", "marbles", "shells", "cards"]);
    const a = r.int(5, 40), b = r.int(3, 30);
    return word(`${name} has ${a} ${thing}. ${cap(he)} gets ${b} more. How many ${thing} does ${he} have now?`, a + b,
      [`${name} starts with ${a} ${thing}.`, `Getting more means add: ${a} + ${b}.`, `${a} + ${b} = ${a + b} ${thing}.`], "Getting more means add.");
  }
  if (kind === 1) {
    const [thing, leave] = r.pick([["birds", "fly away"], ["kids", "go home"], ["frogs", "hop away"], ["cars", "drive off"], ["ducks", "swim away"]] as const);
    const a = r.int(12, 60), b = r.int(3, a - 2);
    return word(`There are ${a} ${thing} at the park. ${b} ${leave}. How many ${thing} are left?`, a - b,
      [`There are ${a} ${thing}.`, `Leaving means take away: ${a} − ${b}.`, `${a} − ${b} = ${a - b} ${thing}.`], "Leaving means take away.");
  }
  if (kind === 2) {
    const [box, thing] = r.pick([["bags", "marbles"], ["boxes", "crayons"], ["packs", "cards"], ["plates", "cookies"], ["jars", "buttons"]] as const);
    const g = r.int(2, 9), n = r.int(2, 10);
    return word(`${name} has ${g} ${box} with ${n} ${thing} in each. How many ${thing} is that in all?`, g * n,
      [`${g} ${box} with ${n} each is ${g} groups of ${n}.`, `Skip count by ${n}: ${seq(n, g * n, n)}.`, `${g} × ${n} = ${g * n} ${thing}.`], `${g} groups of ${n}. Skip count by ${n}.`);
  }
  if (kind === 3) {
    const [thing, who] = r.pick([["cookies", "plates"], ["stickers", "friends"], ["pencils", "cups"], ["kids", "teams"], ["apples", "baskets"]] as const);
    const g = r.int(2, 9), each = r.int(2, 10), total = g * each;
    return word(`${total} ${thing} are shared equally among ${g} ${who}. How many ${thing} does each get?`, each,
      [`Sharing equally means divide: ${total} ÷ ${g}.`, `${g} × ${each} = ${total}.`, `${total} ÷ ${g} = ${each} ${thing}.`], `Think: ${g} times what makes ${total}?`);
  }
  const a = r.int(8, 45), b = r.int(8, 45);
  return word(`${name} reads ${a} pages on Monday and ${b} pages on Tuesday. How many pages is that in all?`, a + b,
    [`Put both days together: ${a} + ${b}.`, `Add the tens, then the ones.`, `${a} + ${b} = ${a + b} pages.`], "Put both days together.");
}

function orderOfOps(r: Rng): BossQuestion {
  const kind = r.int(0, 9);
  const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 9), d = r.int(2, 9);
  const mk = (shown: string, spoken: string, ans: number, steps: string[], hint: string) => q(`${shown} = ?`, `What is ${spoken}?`, ans, [...steps, `${shown} = ${ans}.`], hint);
  switch (kind) {
    case 0: return mk(`${a} + ${b} × ${c}`, `${a} plus ${b} times ${c}`, a + b * c, [`Multiply first: ${b} × ${c} = ${b * c}.`, `Then add: ${a} + ${b * c} = ${a + b * c}.`], "Multiply before you add.");
    case 1: { const big = b * c + r.int(1, 15); return mk(`${big} − ${b} × ${c}`, `${big} minus ${b} times ${c}`, big - b * c, [`Multiply first: ${b} × ${c} = ${b * c}.`, `Then subtract: ${big} − ${b * c} = ${big - b * c}.`], "Multiply before you subtract."); }
    case 2: return mk(`(${a} + ${b}) × ${c}`, `the group ${a} plus ${b}, times ${c}`, (a + b) * c, [`Parentheses first: ${a} + ${b} = ${a + b}.`, `Then multiply: ${a + b} × ${c} = ${(a + b) * c}.`], "Do the parentheses first.");
    case 3: { const x = b * c; return mk(`${x} ÷ ${b} + ${d}`, `${x} divided by ${b}, plus ${d}`, c + d, [`Divide first: ${x} ÷ ${b} = ${c}.`, `Then add: ${c} + ${d} = ${c + d}.`], "Divide before you add."); }
    case 4: { const hi = b + c; return mk(`${a} × (${hi} − ${c})`, `${a} times the group ${hi} minus ${c}`, a * b, [`Parentheses first: ${hi} − ${c} = ${b}.`, `Then multiply: ${a} × ${b} = ${a * b}.`], "Do the parentheses first."); }
    case 5: { const sub_ = r.int(1, a * b - 1); return mk(`${a} × ${b} − ${sub_}`, `${a} times ${b}, minus ${sub_}`, a * b - sub_, [`Multiply first: ${a} × ${b} = ${a * b}.`, `Then subtract: ${a * b} − ${sub_} = ${a * b - sub_}.`], "Multiply before you subtract."); }
    case 6: { const hi = a + b; return mk(`(${hi} − ${b}) × ${c}`, `the group ${hi} minus ${b}, times ${c}`, a * c, [`Parentheses first: ${hi} − ${b} = ${a}.`, `Then multiply: ${a} × ${c} = ${a * c}.`], "Do the parentheses first."); }
    case 7: { const x = b * c; return mk(`${d} + ${x} ÷ ${c}`, `${d} plus ${x} divided by ${c}`, d + b, [`Divide first: ${x} ÷ ${c} = ${b}.`, `Then add: ${d} + ${b} = ${d + b}.`], "Divide before you add."); }
    case 8: return mk(`${a} × ${b} + ${c} × ${d}`, `${a} times ${b}, plus ${c} times ${d}`, a * b + c * d, [`Multiply first: ${a} × ${b} = ${a * b} and ${c} × ${d} = ${c * d}.`, `Then add: ${a * b} + ${c * d} = ${a * b + c * d}.`], "Do both multiplications first.");
    default: { const sum = b + c, x = sum * a; return mk(`${x} ÷ (${b} + ${c})`, `${x} divided by the group ${b} plus ${c}`, a, [`Parentheses first: ${b} + ${c} = ${sum}.`, `Then divide: ${x} ÷ ${sum} = ${a}.`], "Do the parentheses first."); }
  }
}

function decimals(r: Rng): BossQuestion {
  const kind = r.int(0, 5);
  const a = r.int(1, 9), b = r.int(1, 9);
  if (kind === 0) return q(`${a}.5 × 2 = ?`, `What is ${a} point 5 times 2?`, 2 * a + 1, [`${a} × 2 = ${2 * a}.`, "0.5 × 2 = 1.", `${2 * a} + 1 = ${2 * a + 1}.`], `Double ${a}, double one half, then add.`);
  if (kind === 1) return q(`${a}.5 + ${b}.5 = ?`, `What is ${a} point 5 plus ${b} point 5?`, a + b + 1, [`Add the wholes: ${a} + ${b} = ${a + b}.`, "Add the halves: 0.5 + 0.5 = 1.", `${a + b} + 1 = ${a + b + 1}.`], "Two halves make a whole.");
  if (kind === 2) { const n = 2 * r.int(3, 25); return q(`0.5 × ${n} = ?`, `What is 0 point 5 times ${n}?`, n / 2, ["0.5 is one half.", `Half of ${n} is ${n / 2}.`, `0.5 × ${n} = ${n / 2}.`], "Times 0.5 is the same as taking half."); }
  if (kind === 3) return q(`${a}.25 + ${b}.75 = ?`, `What is ${a} point 2 5 plus ${b} point 7 5?`, a + b + 1, [`Add the wholes: ${a} + ${b} = ${a + b}.`, "Add the parts: 0.25 + 0.75 = 1.", `${a + b} + 1 = ${a + b + 1}.`], "0.25 and 0.75 make a whole.");
  if (kind === 4) return q(`${a}.5 × 4 = ?`, `What is ${a} point 5 times 4?`, 4 * a + 2, [`${a} × 4 = ${4 * a}.`, "0.5 × 4 = 2.", `${4 * a} + 2 = ${4 * a + 2}.`], `Do ${a} × 4, then half of 4, and add them.`);
  const n = r.int(2 * a + 2, 30);
  return q(`${n} − ${a}.5 − ${a}.5 = ?`, `What is ${n} minus ${a} point 5, minus ${a} point 5?`, n - 2 * a - 1,
    [`${a}.5 + ${a}.5 = ${2 * a + 1}, so you take away ${2 * a + 1} in total.`, `${n} − ${2 * a + 1} = ${n - 2 * a - 1}.`], `Two ${a}.5s make ${2 * a + 1}.`);
}

function negativeNumbers(r: Rng): BossQuestion {
  const a = r.int(2, 12), b = r.int(2, 12);
  const mk = (shown: string, spoken: string, ans: number, steps: string[], hint: string) => q(`${shown} = ?`, `What is ${spoken}?`, ans, [...steps, `${shown} = ${fmt(ans)}.`], hint);
  switch (r.int(0, 9)) {
    case 0: return mk(`−${a} + ${b}`, `negative ${a} plus ${b}`, b - a, [`Start at −${a} on the number line.`, `Move ${b} to the right.`], `Start at −${a} and move up ${b}.`);
    case 1: return mk(`−${a} − ${b}`, `negative ${a} minus ${b}`, -a - b, [`Start at −${a}.`, `Subtracting moves left, ${b} more steps.`], "Going down from below zero goes further below.");
    case 2: return mk(`−${a} × ${b}`, `negative ${a} times ${b}`, -a * b, [`${a} × ${b} = ${a * b}.`, "Negative times positive is negative."], `Do ${a} × ${b}, then think about the sign.`);
    case 3: { const big = a + b; return mk(`${a} − ${big}`, `${a} minus ${big}`, -b, [`${a} − ${a} = 0, and there are ${b} more to take away.`, `0 − ${b} = −${b}.`], `Take away ${a} to reach zero, then keep going.`); }
    case 4: return mk(`−${a * b} ÷ (−${b})`, `negative ${a * b} divided by negative ${b}`, a, [`${a * b} ÷ ${b} = ${a}.`, "Negative divided by negative is positive."], "Two negatives make a positive.");
    case 5: return mk(`−${a} + (−${b})`, `negative ${a} plus negative ${b}`, -a - b, ["Adding a negative is like subtracting.", `−${a} − ${b} = −${a + b}.`], "Adding a negative moves you further below zero.");
    case 6: return mk(`${a} + (−${b})`, `${a} plus negative ${b}`, a - b, [`Adding −${b} is the same as subtracting ${b}.`, `${a} − ${b} = ${fmt(a - b)}.`], "Adding a negative is subtracting.");
    case 7: return mk(`−${a} × (−${b})`, `negative ${a} times negative ${b}`, a * b, [`${a} × ${b} = ${a * b}.`, "Negative times negative is positive."], "Two negatives make a positive.");
    case 8: return mk(`${a} − (−${b})`, `${a} minus negative ${b}`, a + b, ["Subtracting a negative is the same as adding.", `${a} + ${b} = ${a + b}.`], "Minus a negative means add.");
    default: return mk(`−${a * b} ÷ ${b}`, `negative ${a * b} divided by ${b}`, -a, [`${a * b} ÷ ${b} = ${a}.`, "Negative divided by positive is negative."], `Do ${a * b} ÷ ${b}, then think about the sign.`);
  }
}

function ratioProblem(r: Rng): BossQuestion {
  const kind = r.int(0, 5);
  if (kind === 0) {
    const item = r.pick(["pencils", "notebooks", "stickers", "pens", "erasers"]);
    const n = r.int(2, 6), price = r.int(2, 9), m = r.int(2, 12);
    return word(`${n} ${item} cost $${n * price}. How many dollars do ${m} ${item} cost?`, m * price,
      [`Find one: $${n * price} ÷ ${n} = $${price}.`, `${m} of them: ${m} × $${price} = $${m * price}.`, `${m} ${item} cost $${m * price}.`], "Find the cost of 1 first.");
  }
  if (kind === 1) {
    const v = r.pick(["car", "train", "bus", "boat"]);
    const sp = r.pick([20, 25, 30, 40, 45, 50, 60, 70]), h = r.int(2, 6);
    return word(`A ${v} goes ${sp} miles in 1 hour. How many miles does it go in ${h} hours?`, sp * h,
      [`Each hour is ${sp} miles.`, `${h} × ${sp} = ${sp * h}.`, `It goes ${sp * h} miles.`], "Multiply the miles per hour by the hours.");
  }
  if (kind === 2) {
    const [x, y] = r.pick([["cats", "dogs"], ["boys", "girls"], ["red marbles", "blue marbles"], ["apples", "oranges"]] as const);
    const r1 = r.int(2, 5), r2 = r.int(2, 7), k = r.int(2, 8);
    return word(`The ratio of ${x} to ${y} is ${r1} to ${r2}. There are ${r1 * k} ${x}. How many ${y} are there?`, r2 * k,
      [`${r1 * k} ${x} is ${k} groups of ${r1}.`, `So there are ${k} groups of ${r2} ${y}: ${k} × ${r2} = ${r2 * k}.`, `There are ${r2 * k} ${y}.`], `How many groups of ${r1} are there?`);
  }
  if (kind === 3) {
    const c = r.int(2, 4), n = r.pick([6, 8, 10, 12]), k = r.int(2, 5);
    return word(`A recipe uses ${c} cups of flour for ${n} cookies. How many cups do you need for ${n * k} cookies?`, c * k,
      [`${n * k} cookies is ${k} times ${n} cookies.`, `${k} × ${c} cups = ${c * k} cups.`, `You need ${c * k} cups.`], `How many batches of ${n} is ${n * k}?`);
  }
  if (kind === 4) {
    const per = r.int(5, 20), t = r.int(2, 4), u = r.int(2, 9);
    return word(`A printer prints ${per * t} pages in ${t} minutes. How many pages does it print in ${u} minutes?`, per * u,
      [`One minute: ${per * t} ÷ ${t} = ${per} pages.`, `${u} minutes: ${u} × ${per} = ${per * u} pages.`, `It prints ${per * u} pages.`], "Find the pages for 1 minute first.");
  }
  const scale = r.pick([10, 20, 25, 50, 100]), inches = r.int(2, 9);
  return word(`On a map, 1 inch is ${scale} miles. How many miles is ${inches} inches?`, scale * inches,
    [`Each inch is ${scale} miles.`, `${inches} × ${scale} = ${scale * inches}.`, `${inches} inches is ${scale * inches} miles.`], `Multiply ${scale} by the inches.`);
}

const TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
function pythagoras(r: Rng): BossQuestion {
  let t = r.pick(TRIPLES);
  const maxK = Math.floor(50 / t[2]);
  const k = r.int(1, Math.max(1, Math.min(maxK, 6)));
  t = [t[0] * k, t[1] * k, t[2] * k];
  const [a, b, c] = r.chance(0.5) ? t : [t[1], t[0], t[2]];
  return r.chance(0.55) ? hyp(a, b) : leg(c, a);
}

const POWERS: [number, number][] = [];
for (let b = 2; b <= 12; b++) for (let e = 2; e <= 6; e++) if (b ** e <= 1000 && (e === 2 || b <= 10)) POWERS.push([b, e]);

type LevelSeed = Omit<BossLevel, "id" | "grade" | "n">;

const GRADE_SEEDS: Record<GradeId, [LevelSeed, LevelSeed, LevelSeed]> = {
  K: [
    { skill: "Counting", bossName: "Bubble Blob", blurb: "Count it to pop it.", palette: ["#7dd3fc", "#a5f3fc", "#fef9c3"],
      make: (r) => { if (r.chance(0.6)) { const [e, n] = r.pick(COUNT_THINGS); return count(e, n, r.int(2, 10)); } return after(r.int(1, 19)); } },
    { skill: "Adding small numbers", bossName: "Puff Cloud", blurb: "Put them together.", palette: ["#f9a8d4", "#fbcfe8", "#fde68a"],
      make: (r) => { const a = r.int(1, 5); return add(a, r.int(1, Math.min(5, 8 - a))); } },
    { skill: "Taking away", bossName: "Sleepy Moon", blurb: "How many are left?", palette: ["#c4b5fd", "#ddd6fe", "#fef3c7"],
      make: (r) => { const a = r.int(2, 8); return sub(a, r.int(1, a - 1)); } },
  ],
  "1": [
    { skill: "Adding to 10", bossName: "Spark Sprite", blurb: "Little numbers, big zaps.", palette: ["#2dd4bf", "#a3e635", "#fde047"],
      make: (r) => { const a = r.int(1, 9); return add(a, r.int(1, 10 - a)); } },
    { skill: "Subtracting from 10", bossName: "Pebble Golem", blurb: "Chip away at it.", palette: ["#a8a29e", "#fbbf24", "#fde68a"],
      make: (r) => { const a = r.int(5, 10); return sub(a, r.int(1, a - 1)); } },
    { skill: "Tens and ones", bossName: "Ten Tower", blurb: "Stack the tens.", palette: ["#60a5fa", "#34d399", "#fde047"],
      make: (r) => tensOnes(r.int(1, 9), r.int(0, 9)) },
  ],
  "2": [
    { skill: "Adding & subtracting to 20", bossName: "Storm Orb", blurb: "Count up, count back.", palette: ["#38bdf8", "#818cf8", "#e0f2fe"],
      make: (r) => { if (r.chance(0.5)) { const a = r.int(5, 15); return add(a, r.int(Math.max(2, 11 - a), 20 - a)); } const a = r.int(11, 20); return sub(a, r.int(2, 9)); } },
    { skill: "Two-digit adding", bossName: "Thunder Beetle", blurb: "Tens first, then ones.", palette: ["#22d3ee", "#a78bfa", "#f0abfc"],
      make: (r) => { const a = r.int(1, 6) * 10 + r.int(1, 9); const bt = r.int(1, Math.floor((99 - a) / 10)); return add2(a, Math.min(bt * 10 + r.int(1, 9), 99 - a)); } },
    { skill: "Two-digit subtracting", bossName: "Frost Wisp", blurb: "Take away the tens.", palette: ["#93c5fd", "#e0f2fe", "#ffffff"],
      make: (r) => { const a = r.int(3, 9) * 10 + r.int(0, 9); const bt = r.int(1, Math.floor(a / 10) - 1); return sub2(a, bt * 10 + r.int(1, 9)); } },
  ],
  "3": [
    { skill: "Times tables", bossName: "Crystal Core", blurb: "Skip counting power-ups.", palette: ["#c084fc", "#f472b6", "#fbcfe8"],
      make: (r) => mul(r.int(2, 10), r.int(2, 10)) },
    { skill: "Division facts", bossName: "Split Serpent", blurb: "Share it out evenly.", palette: ["#4ade80", "#22d3ee", "#f0fdf4"],
      make: (r) => { const b = r.int(2, 10); return div(b * r.int(2, 10), b); } },
    { skill: "Word problems", bossName: "Infernal Titan", blurb: "Read it, picture it, solve it.", palette: ["#ff3838", "#ff8a00", "#ffe44d"],
      make: wordProblem },
  ],
  "4": [
    { skill: "Multiplying bigger numbers", bossName: "Gear Giant", blurb: "Break it apart.", palette: ["#f59e0b", "#ef4444", "#fde68a"],
      make: (r) => { const a = r.chance(0.2) ? r.int(10, 19) * 10 + r.int(1, 9) : r.int(1, 9) * 10 + r.int(1, 9); return mulBig(a, r.int(2, 9)); } },
    { skill: "Long division", bossName: "Divide Drake", blurb: "Split the big number.", palette: ["#10b981", "#06b6d4", "#a7f3d0"],
      make: (r) => { const b = r.int(2, 9); let qn = r.int(11, Math.max(11, Math.floor(99 / b))); if (qn % 10 === 0) qn += 1; return divBig(b * qn, b); } },
    { skill: "Fractions of a number", bossName: "Pie Phantom", blurb: "Slice it up.", palette: ["#fb923c", "#f472b6", "#fed7aa"],
      make: (r) => { const [n, d] = r.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [1, 10]] as const); return fracOf(n, d, d * r.int(2, Math.floor(60 / d))); } },
  ],
  "5": [
    { skill: "Order of operations", bossName: "Order Oracle", blurb: "Parentheses, then × ÷, then + −.", palette: ["#8b5cf6", "#ec4899", "#fde68a"],
      make: orderOfOps },
    { skill: "Two-digit multiplying", bossName: "Grid Guardian", blurb: "Tens times, ones times.", palette: ["#0ea5e9", "#6366f1", "#c7d2fe"],
      make: (r) => mul22(r.int(11, 35), r.int(1, 2) * 10 + r.int(1, 9)) },
    { skill: "Volume & decimals", bossName: "Cube Colossus", blurb: "Fill the box, find the point.", palette: ["#14b8a6", "#84cc16", "#ecfccb"],
      make: (r) => (r.chance(0.5) ? volume(r.int(2, 10), r.int(2, 8), r.int(2, 5)) : decimals(r)) },
  ],
  "6": [
    { skill: "Percents", bossName: "Percent Phoenix", blurb: "Out of 100.", palette: ["#f97316", "#ef4444", "#fde047"],
      make: (r) => {
        const p = r.pick([10, 20, 25, 50, 75]);
        const x = p === 10 || p === 20 ? 10 * r.int(2, 30) : p === 50 ? 2 * r.int(5, 100) : 4 * r.int(2, p === 75 ? 30 : 50);
        return pct(p, x);
      } },
    { skill: "Exponents", bossName: "Power Hydra", blurb: "Multiply it by itself.", palette: ["#a855f7", "#6366f1", "#e9d5ff"],
      make: (r) => { const [b, e] = r.pick(POWERS); return pow(b, e); } },
    { skill: "One-step equations", bossName: "Balance Sphinx", blurb: "Get x by itself.", palette: ["#eab308", "#f59e0b", "#fef3c7"],
      make: (r) => {
        const form = r.pick(["+", "−", "×", "÷"] as const);
        if (form === "+") { const a = r.int(2, 25); return eq1("+", a, a + r.int(1, 30)); }
        if (form === "−") return eq1("−", r.int(2, 20), r.int(1, 30));
        if (form === "×") { const a = r.int(2, 12); return eq1("×", a, a * r.int(2, 12)); }
        return eq1("÷", r.int(2, 10), r.int(2, 12));
      } },
  ],
  "7": [
    { skill: "Negative numbers", bossName: "Shadow Twin", blurb: "Below zero.", palette: ["#64748b", "#8b5cf6", "#e2e8f0"], negatives: true,
      make: negativeNumbers },
    { skill: "Two-step equations", bossName: "Riddle Knight", blurb: "Undo it in two moves.", palette: ["#dc2626", "#7c3aed", "#fecaca"],
      make: (r) => {
        const a = r.int(2, 9), x = r.int(1, 12), b = r.int(1, 15);
        return r.chance(0.5) || a * x <= b ? eq2(a, "+", b, a * x + b) : eq2(a, "−", b, a * x - b);
      } },
    { skill: "Ratios & proportions", bossName: "Ratio Wyrm", blurb: "Scale it up or down.", palette: ["#059669", "#0891b2", "#a7f3d0"],
      make: ratioProblem },
  ],
  "8": [
    { skill: "Roots & powers", bossName: "Root Leviathan", blurb: "Undo the square.", palette: ["#0284c7", "#7c3aed", "#bae6fd"],
      make: (r) => {
        const k = r.int(0, 2);
        if (k === 0) { const v = r.int(4, 20); return root(v * v); }
        if (k === 1) { const v = r.int(2, 6); return cubeRoot(v ** 3); }
        return r.chance(0.5) ? pow(r.int(2, 6), 3) : pow(r.int(11, 15), 2);
      } },
    { skill: "Pythagorean theorem", bossName: "Triangle Titan", blurb: "a² + b² = c².", palette: ["#e11d48", "#f97316", "#ffe4e6"],
      make: pythagoras },
    { skill: "Linear functions", bossName: "Slope Dragon", blurb: "Rise over run.", palette: ["#ff3838", "#ff8a00", "#ffe44d"], negatives: true,
      make: (r) => {
        if (r.chance(0.5)) {
          let m = r.int(-5, 6);
          if (m === 0) m = 2;
          return line(m, r.int(-10, 10), r.int(1, 8));
        }
        const x1 = r.int(-3, 5), dx = r.int(1, 4), y1 = r.int(-5, 10), m = r.int(-5, 5);
        return slope(x1, y1, x1 + dx, y1 + m * dx);
      } },
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
  return !!level.negatives;
}

/** Questions per fight. A fight ends within 11 answers (8 hits to win, 4 misses to lose), so 16 never runs out. */
export const DECK_SIZE = 16;

/** A fresh set of questions for one fight, with no repeats. Same level + seed gives the same deck. */
export function buildDeck(level: BossLevel, seed: number, size = DECK_SIZE): BossQuestion[] {
  const r = makeRng(seed);
  const deck: BossQuestion[] = [];
  const seen = new Set<string>();
  for (let tries = 0; deck.length < size && tries < size * 30; tries++) {
    const q = level.make(r);
    if (seen.has(q.prompt)) continue;
    seen.add(q.prompt);
    deck.push(q);
  }
  // Tiny pools (like kindergarten adding) can run short: repeat rather than come up empty.
  for (let i = 0; deck.length < size; i++) deck.push(deck[i % deck.length]!);
  return deck;
}

/** A new seed for each fight. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
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
