import type { CharacterSlug } from "./characters";

/**
 * Shared timings (seconds) so the 3D effects, the hit reactions, the damage numbers
 * and the sounds all land on the same frame.
 */
export const FX = {
  /** A normal spell flies from the hero to the boss. */
  spellTravel: 0.45,
  /** The boss swells up before it throws. */
  bossWindup: 0.6,
  /** The boss's fireball flies to the hero. */
  bossTravel: 0.4,
  /** The hero gathers power before the special fires. */
  specialCharge: 0.85,
  /** How long the special beam stays on. */
  specialBeam: 0.75,
} as const;

/** When each hit actually lands, measured from the moment it is triggered. */
export const LANDS = {
  spell: FX.spellTravel,
  boss: FX.bossWindup + FX.bossTravel,
  special: FX.specialCharge + 0.1,
} as const;

export type SpecialMove = { name: string; color: string; glow: string };

/** Every hero has their own special: a name to shout and colors for the beam. */
export const SPECIALS: Record<CharacterSlug, SpecialMove> = {
  bear: { name: "Bear Quake", color: "#ffb020", glow: "#ffe29a" },
  fox: { name: "Fox Fire", color: "#ff6a1a", glow: "#ffd08a" },
  robot: { name: "Laser Blast", color: "#22d3ee", glow: "#c8fbff" },
  cat: { name: "Star Pounce", color: "#e879f9", glow: "#fbe2ff" },
};

export function specialFor(slug: CharacterSlug | null | undefined): SpecialMove {
  return SPECIALS[slug ?? "bear"];
}
