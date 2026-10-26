import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { classify, parseWeights, type AslGuess } from "./aslModel";

/**
 * Reads ASL letters from a camera frame, entirely in the browser: MediaPipe finds the
 * hand, then our small network turns its shape into a letter. No server needed.
 */
export type AslRecognizer = {
  /** Pass the camera frame as-is (not mirrored). Returns letter "" when no hand is seen. */
  read: (frame: HTMLCanvasElement) => AslGuess;
};

let loading: Promise<AslRecognizer> | null = null;

export function loadAslRecognizer(): Promise<AslRecognizer> {
  if (!loading) {
    loading = create().catch((e) => {
      loading = null; // let the next attempt try again
      throw e;
    });
  }
  return loading;
}

/** Our own copy (see scripts/copy-mediapipe-wasm.mjs), then the same version on a CDN as a backup. */
const WASM_SOURCES = ["/mediapipe-wasm", "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm"];

async function makeLandmarker(): Promise<HandLandmarker> {
  let lastError: unknown;
  for (const base of WASM_SOURCES) {
    try {
      const fileset = await FilesetResolver.forVisionTasks(base);
      return await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/asl/hand_landmarker.task" },
        runningMode: "IMAGE",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

async function create(): Promise<AslRecognizer> {
  const [landmarker, weights] = await Promise.all([
    makeLandmarker(),
    fetch("/asl/landmark-mlp.bin").then((r) => {
      if (!r.ok) throw new Error(`Couldn't load the ASL model (${r.status})`);
      return r.arrayBuffer();
    }),
  ]);
  const layers = parseWeights(weights);
  return {
    read(frame) {
      const result = landmarker.detect(frame);
      const hand = result.landmarks[0];
      if (!hand) return { letter: "", confidence: 0 };
      return classify(hand, layers, result.handedness[0]?.[0]?.categoryName);
    },
  };
}
