/**
 * The ASL letter classifier, ported from backend/main.py so it runs in the browser.
 *
 * Input: the 21 hand landmarks MediaPipe finds. They're centered on the wrist and
 * scaled to fit in [-1, 1] (same as `normalize_landmarks` in the backend), then fed
 * through a small network: 63 → 256 → 256 → 128 → 24 letters. The batch-norm layers
 * from training are folded into the weights in public/asl/landmark-mlp.bin.
 *
 * Orientation matters: the model was trained on un-mirrored camera frames of a right
 * hand. So the camera frame must NOT be mirrored before reading it, and a left hand is
 * flipped to look like a right hand first. (The original app mirrored the frame, which
 * is why it got most letters wrong.)
 */

export const ASL_LABELS = "ABCDEFGHIKLMNOPQRSTUVWXY".split("");

/** [out, in] for each layer, in the order they're stored in the .bin file. */
const SHAPES: [number, number][] = [
  [256, 63],
  [256, 256],
  [128, 256],
  [24, 128],
];

export type Layer = { w: Float32Array; b: Float32Array; out: number; inp: number };
export type Landmark = { x: number; y: number; z: number };
export type AslGuess = { letter: string; confidence: number };

/** Below this, the shape isn't clear enough to call a letter. */
export const MIN_CONFIDENCE = 0.5;

export function parseWeights(buf: ArrayBuffer): Layer[] {
  const all = new Float32Array(buf);
  const layers: Layer[] = [];
  let at = 0;
  for (const [out, inp] of SHAPES) {
    const w = all.subarray(at, at + out * inp);
    at += out * inp;
    const b = all.subarray(at, at + out);
    at += out;
    layers.push({ w, b, out, inp });
  }
  if (at !== all.length) throw new Error(`ASL weights have ${all.length} numbers, expected ${at}`);
  return layers;
}

/** Wrist-centered and scaled so the biggest coordinate is 1. */
export function normalizeLandmarks(lms: Landmark[]): Float32Array {
  const out = new Float32Array(63);
  const w = lms[0]!;
  let max = 0;
  lms.forEach((l, i) => {
    out[i * 3] = l.x - w.x;
    out[i * 3 + 1] = l.y - w.y;
    out[i * 3 + 2] = l.z - w.z;
  });
  for (const v of out) max = Math.max(max, Math.abs(v));
  const s = max + 1e-6;
  for (let i = 0; i < out.length; i++) out[i]! /= s;
  return out;
}

/** Raw scores (logits) for each letter. */
export function runMlp(input: Float32Array, layers: Layer[]): Float32Array {
  let h = input;
  layers.forEach((L, li) => {
    const next = new Float32Array(L.out);
    for (let o = 0; o < L.out; o++) {
      let sum = L.b[o]!;
      const row = o * L.inp;
      for (let i = 0; i < L.inp; i++) sum += L.w[row + i]! * h[i]!;
      next[o] = li < layers.length - 1 && sum < 0 ? 0 : sum;
    }
    h = next;
  });
  return h;
}

/**
 * `side` is MediaPipe's handedness label for an un-mirrored frame. "Left" hands are
 * flipped so every hand matches the right-hand training data.
 */
export function classify(lms: Landmark[], layers: Layer[], side: string = "Right"): AslGuess {
  const hand = side === "Left" ? lms.map((l) => ({ x: 1 - l.x, y: l.y, z: l.z })) : lms;
  const logits = runMlp(normalizeLandmarks(hand), layers);
  let best = 0;
  let max = -Infinity;
  logits.forEach((v, i) => {
    if (v > max) {
      max = v;
      best = i;
    }
  });
  let total = 0;
  for (const v of logits) total += Math.exp(v - max);
  return { letter: ASL_LABELS[best]!, confidence: 1 / total };
}
