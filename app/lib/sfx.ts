/** Tiny synthesized sound effects (no audio files). Safe to call anywhere. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(start: number, dur: number, vol: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  /** Unlocks audio on the first tap (browsers require a user gesture). */
  unlock() {
    audio();
  },
  spell() {
    tone(520, 0, 0.35, "triangle", 0.12, 1250);
  },
  hit(combo: boolean) {
    noise(0.45, 0.25, 0.25);
    tone(combo ? 220 : 180, 0.45, 0.3, "square", 0.08, 70);
    if (combo) [660, 880, 1100].forEach((f, i) => tone(f, 0.55 + i * 0.07, 0.18, "triangle", 0.09));
  },
  bossAttack() {
    tone(110, 0, 0.55, "sawtooth", 0.06, 220);
    noise(0.95, 0.3, 0.22);
    tone(90, 0.95, 0.35, "square", 0.07, 50);
  },
  phase() {
    tone(150, 0, 0.8, "sawtooth", 0.05, 600);
  },
  victory() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.35, "triangle", 0.12));
  },
  defeat() {
    [392, 330, 262].forEach((f, i) => tone(f, i * 0.2, 0.4, "triangle", 0.09));
  },
  tap() {
    tone(880, 0, 0.06, "sine", 0.05);
  },
};
