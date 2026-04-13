/** Short Web Audio chimes when scan/cleanup complete (no external assets). */

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  return new AC();
}

function playTone(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  const now = ctx.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

function playChord(freqs: number[], durationMs: number) {
  freqs.forEach((f, i) => {
    window.setTimeout(() => playTone(f, durationMs, "sine", 0.06 - i * 0.01), i * 40);
  });
}

export function playScanComplete(): void {
  playChord([523.25, 659.25, 783.99], 220);
}

export function playCleanDone(): void {
  playChord([392, 493.88, 587.33], 280);
}
