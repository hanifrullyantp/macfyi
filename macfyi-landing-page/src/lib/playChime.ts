/** Short high “ting” notification (Web Audio) — two-tone ping, safe gain. */
export function playNotificationChime(): void {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, ctx.currentTime);
    master.connect(ctx.destination);

    const playTone = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(master);
      o.frequency.value = freq;
      o.type = "sine";
      g.gain.setValueAtTime(0.14, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      o.start(start);
      o.stop(start + dur + 0.02);
    };

    const t0 = ctx.currentTime;
    playTone(1320, t0, 0.08);
    playTone(1760, t0 + 0.07, 0.12);

    ctx.resume().then(() => {
      window.setTimeout(() => {
        try {
          ctx.close();
        } catch {
          /* ignore */
        }
      }, 320);
    });
  } catch {
    /* ignore */
  }
}
