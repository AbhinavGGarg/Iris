// Copies MediaPipe's WebAssembly files into public/ so the browser can run hand
// tracking from our own domain. Runs before dev and build; the copy is gitignored.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// The package only exports its bundle, so find the folder from that file.
const pkgDir = dirname(require.resolve("@mediapipe/tasks-vision"));
const from = join(pkgDir, "wasm");
const to = join(process.cwd(), "public", "mediapipe-wasm");

if (!existsSync(from)) {
  console.error(`MediaPipe wasm folder not found at ${from}`);
  process.exit(1);
}
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log("Copied MediaPipe wasm files to public/mediapipe-wasm");
