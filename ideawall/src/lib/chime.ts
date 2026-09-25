/* Sanfter, synthetisierter Hinweiston – spielt erst nach der ersten Nutzeraktion (Autoplay-Regeln). */
let ctx: AudioContext | null = null;
let unlocked = false;

if (typeof window !== "undefined") {
  const unlock = () => {
    unlocked = true;
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

export function chime(notes: number[] = [660, 880]) {
  if (!unlocked) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = t0 + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 1.4);
    });
  } catch {
    /* Audio nicht verfügbar */
  }
}

/** Systembenachrichtigung, falls erlaubt. */
export function systemNotify(title: string, body?: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, silent: true });
  } catch {
    /* ignorieren */
  }
}
