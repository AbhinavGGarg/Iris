import { NEIGHBORS } from "@/app/lib/gardenStories";

/** Neighbors sit on a ring around the village pond. Angle 0 points down -z. */
export const NEIGHBOR_ANGLES = [-2.36, -0.79, 0.79, 2.36];

export const RING_RADIUS = 4.4;
export const HOUSE_RADIUS = 7.4;
const SIDE_OFFSET = 0.14;

export function polar(angle: number, radius: number, y = 0): [number, number, number] {
  return [Math.sin(angle) * radius, y, -Math.cos(angle) * radius];
}

/** Rotation that turns a model's +z face toward the village center. */
export function faceCenterYaw(angle: number): number {
  return -angle;
}

export const buddyAngle = (i: number) => NEIGHBOR_ANGLES[i]! - SIDE_OFFSET;
export const neighborAngle = (i: number) => NEIGHBOR_ANGLES[i]! + SIDE_OFFSET;
export const neighborPos = (i: number) => polar(neighborAngle(i), RING_RADIUS + 0.2);
export const housePos = (i: number) => polar(NEIGHBOR_ANGLES[i]!, HOUSE_RADIUS);
export const flowerPatchPos = (i: number) => polar(NEIGHBOR_ANGLES[i]! + 0.42, RING_RADIUS + 0.1);

export const NEIGHBOR_COUNT = NEIGHBORS.length;
