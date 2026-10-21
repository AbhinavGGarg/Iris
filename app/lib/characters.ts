export type CharacterSlug = "bear" | "fox" | "robot" | "cat";

export type Character = {
  slug: CharacterSlug;
  label: string;
  glbPath?: string;
  color: string;
};

export const CHARACTERS: Record<CharacterSlug, Character> = {
  bear: {
    slug: "bear",
    label: "Brave Bear",
    color: "#a06a3a",
  },
  fox: {
    slug: "fox",
    label: "Clever Fox",
    glbPath: "/models/Fox.glb",
    color: "#e07a3a",
  },
  robot: {
    slug: "robot",
    label: "Helper Robot",
    glbPath: "/models/RobotExpressive.glb",
    color: "#7a8fa6",
  },
  cat: {
    slug: "cat",
    label: "Curious Cat",
    color: "#d6c07a",
  },
};

export const CHARACTER_LIST: Character[] = [
  CHARACTERS.bear,
  CHARACTERS.fox,
  CHARACTERS.robot,
  CHARACTERS.cat,
];
