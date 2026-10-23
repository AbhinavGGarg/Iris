export type Feeling = "happy" | "sad" | "angry" | "scared";

export type Species = "bunny" | "hedgehog" | "owl" | "duck";

export type HelpIcon =
  | "share"
  | "hug"
  | "laugh"
  | "breathe"
  | "rebuild"
  | "knock"
  | "sit"
  | "light"
  | "boo"
  | "cheer"
  | "sing"
  | "ignore";

export type HelpChoice = {
  label: string;
  icon: HelpIcon;
  kind: boolean;
  why: string;
  keywords: string[];
};

export type Neighbor = {
  name: string;
  species: Species;
  color: string;
  accent: string;
  story: string;
  feeling: Feeling;
  clue: string;
  helps: [HelpChoice, HelpChoice, HelpChoice];
};

export const FEELING_LABEL: Record<Feeling, string> = {
  happy: "Happy",
  sad: "Sad",
  angry: "Angry",
  scared: "Scared",
};

export const FEELING_ORDER: Feeling[] = ["happy", "sad", "angry", "scared"];

const FEELING_WORDS: Record<Feeling, string[]> = {
  happy: ["happy", "excited", "glad", "joyful", "cheerful", "thrilled", "good", "great", "proud", "delighted", "smiley"],
  sad: ["sad", "upset", "unhappy", "disappointed", "down", "blue", "crying", "cry", "gloomy", "bummed", "heartbroken"],
  angry: ["angry", "mad", "upset", "frustrated", "grumpy", "cross", "annoyed", "furious", "cranky", "irritated"],
  scared: ["scared", "afraid", "frightened", "nervous", "worried", "anxious", "terrified", "fearful", "spooked"],
};

export const NEIGHBORS: Neighbor[] = [
  {
    name: "Pip",
    species: "bunny",
    color: "#f1e6f7",
    accent: "#f4a6c6",
    story: "Pip the bunny was walking home with a strawberry ice cream. Oh no! It slipped and fell on the ground.",
    feeling: "sad",
    clue: "Look at Pip's mouth. It's turned down, and there's a little tear on his cheek.",
    helps: [
      {
        label: "Share your snack",
        icon: "share",
        kind: true,
        why: "Sharing shows Pip that you care, and now he has a treat again.",
        keywords: ["share", "snack", "treat"],
      },
      {
        label: "Laugh at Pip",
        icon: "laugh",
        kind: false,
        why: "Laughing could make Pip feel even worse.",
        keywords: ["laugh", "funny", "ha"],
      },
      {
        label: "Give Pip a hug",
        icon: "hug",
        kind: true,
        why: "A hug helps Pip know he isn't alone when he feels sad.",
        keywords: ["hug", "cuddle", "squeeze"],
      },
    ],
  },
  {
    name: "Rosie",
    species: "hedgehog",
    color: "#d8a273",
    accent: "#7a5236",
    story: "Rosie the hedgehog built the tallest block tower ever. Then a big gust of wind knocked it all down!",
    feeling: "angry",
    clue: "Rosie's eyebrows are pulled down low, and her cheeks are getting red.",
    helps: [
      {
        label: "Take three deep breaths together",
        icon: "breathe",
        kind: true,
        why: "Slow, deep breaths help big angry feelings get smaller.",
        keywords: ["breath", "breaths", "breathe", "breathing", "calm"],
      },
      {
        label: "Help her build it again",
        icon: "rebuild",
        kind: true,
        why: "Building together turns a frustrating moment into teamwork.",
        keywords: ["build", "again", "rebuild", "blocks", "tower"],
      },
      {
        label: "Knock over more blocks",
        icon: "knock",
        kind: false,
        why: "Knocking over more blocks would make Rosie even more upset.",
        keywords: ["knock", "kick", "smash", "push"],
      },
    ],
  },
  {
    name: "Moe",
    species: "owl",
    color: "#a98a6a",
    accent: "#f2c26b",
    story: "Moe the owl is having his very first sleepover. It's dark outside, and BOOM, a loud thunderstorm starts!",
    feeling: "scared",
    clue: "Moe's eyes are wide open and he's shaking a little bit.",
    helps: [
      {
        label: "Jump out and say boo",
        icon: "boo",
        kind: false,
        why: "Saying boo would make Moe feel even more scared.",
        keywords: ["boo", "jump", "scare"],
      },
      {
        label: "Sit close to Moe",
        icon: "sit",
        kind: true,
        why: "Having a friend nearby helps scary things feel smaller.",
        keywords: ["sit", "close", "stay", "next to", "with him"],
      },
      {
        label: "Turn on a night light",
        icon: "light",
        kind: true,
        why: "A cozy light makes the dark feel safer.",
        keywords: ["light", "lamp", "night light", "turn on"],
      },
    ],
  },
  {
    name: "Luna",
    species: "duck",
    color: "#ffd95a",
    accent: "#ff9f43",
    story: "Today is Luna the duckling's birthday! All of her friends just showed up with balloons and cake.",
    feeling: "happy",
    clue: "Luna has a great big smile, and she's bouncing up and down!",
    helps: [
      {
        label: "Cheer and celebrate",
        icon: "cheer",
        kind: true,
        why: "Celebrating with Luna makes her happy day even happier.",
        keywords: ["cheer", "celebrate", "party", "yay", "dance"],
      },
      {
        label: "Walk away and ignore her",
        icon: "ignore",
        kind: false,
        why: "Ignoring Luna on her birthday could hurt her feelings.",
        keywords: ["ignore", "walk away", "leave"],
      },
      {
        label: "Sing happy birthday",
        icon: "sing",
        kind: true,
        why: "Singing to Luna shows her you're glad she's your friend.",
        keywords: ["sing", "song", "birthday"],
      },
    ],
  },
];

export const WIN_LINE =
  "You helped every neighbor! The Feelings Garden is in full bloom. Thank you for being such a kind friend!";

function normalize(raw: string): string {
  return ` ${raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()} `;
}

/** Every feeling the child named. "upset" counts as both sad and angry; "not happy" is skipped. */
export function matchFeelings(raw: string): Feeling[] {
  const text = normalize(raw);
  if (text.trim() === "") return [];
  const found: Feeling[] = [];
  for (const f of FEELING_ORDER) {
    const said = FEELING_WORDS[f].some(
      (w) => text.includes(` ${w} `) && !text.includes(` not ${w} `) && !text.includes(` isn t ${w} `),
    );
    if (said) found.push(f);
  }
  return found;
}

const NUMBER_WORDS: Record<string, number> = {
  "1": 0, one: 0, first: 0,
  "2": 1, two: 1, second: 1,
  "3": 2, three: 2, third: 2,
};

export function matchHelp(raw: string, neighbor: Neighbor): number | null {
  const text = normalize(raw);
  if (text.trim() === "") return null;
  const hits = neighbor.helps
    .map((h, i) => ({ i, hit: h.keywords.some((k) => text.includes(` ${k} `)) }))
    .filter((h) => h.hit);
  if (hits.length === 1) return hits[0]!.i;
  const words = text.trim().split(" ");
  if (words.length <= 4) {
    for (const w of words) {
      if (w in NUMBER_WORDS) return NUMBER_WORDS[w]!;
    }
  }
  return null;
}

export function buildStoryLine(idx: number): string {
  const n = NEIGHBORS[idx]!;
  return `${n.story} How do you think ${n.name} feels?`;
}

export function buildHelpQuestion(idx: number): string {
  const n = NEIGHBORS[idx]!;
  const list = n.helps.map((h, i) => `${i + 1}: ${h.label}`).join(". ");
  return `What could help ${n.name}? ${list}.`;
}
