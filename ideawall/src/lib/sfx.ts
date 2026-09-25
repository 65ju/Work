/*
 * Kleine, synthetisierte Geräusche für haptisches Feedback (Web Audio, keine Dateien).
 * Spielen erst nach der ersten Nutzeraktion und lassen sich abschalten.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = true;
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

export function setSound(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled || !unlocked) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function tone(freq: number, dur: number, { type = "sine" as OscillatorType, gain = 0.2, to = 0, delay = 0 } = {}) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(dur: number, { freq = 2000, q = 1, gain = 0.15, to = 0, delay = 0, type = "bandpass" as BiquadFilterType } = {}) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.3);
  s.stop(t + dur + 0.02);
}

export const sfx = {
  tap: () => hiss(0.025, { freq: 3200, q: 0.7, gain: 0.08 }),
  pop: () => tone(520, 0.09, { gain: 0.12, to: 880 }),
  toggle: () => {
    tone(660, 0.06, { type: "triangle", gain: 0.09 });
    tone(990, 0.09, { type: "triangle", gain: 0.07, delay: 0.05 });
  },
  roll: () => {
    for (let i = 0; i < 5; i++) hiss(0.02, { freq: 4000, gain: 0.07, delay: i * 0.05, type: "highpass" });
  },
  /** Papier wird angehoben */
  lift: () => hiss(0.12, { freq: 2600, to: 5200, q: 0.8, gain: 0.09 }),
  /** Papier landet auf dem Board */
  drop: () => {
    tone(140, 0.1, { gain: 0.22, to: 70 });
    hiss(0.05, { freq: 900, gain: 0.08 });
  },
  /** Pinnadel sitzt */
  pin: () => {
    tone(1800, 0.04, { type: "triangle", gain: 0.05, to: 1200 });
    hiss(0.02, { freq: 5000, gain: 0.05, delay: 0.01, type: "highpass" });
  },
  /** Zettel prallt an den Rand */
  bump: () => tone(200, 0.06, { gain: 0.1, to: 120 }),
  crumple: () => {
    for (let i = 0; i < 7; i++) hiss(0.05 + Math.random() * 0.05, { freq: 1500 + Math.random() * 3000, q: 1.4, gain: 0.1, delay: i * 0.035 });
  },
  bin: () => {
    tone(110, 0.18, { gain: 0.25, to: 60 });
    tone(760, 0.12, { type: "square", gain: 0.02, to: 640 });
  },
  whoosh: () => hiss(0.3, { freq: 400, to: 2400, q: 0.9, gain: 0.08 }),
  /** Stempel knallt aufs Papier */
  stamp: () => {
    tone(90, 0.22, { gain: 0.32, to: 45 });
    hiss(0.08, { freq: 700, q: 0.8, gain: 0.16, type: "lowpass" });
    hiss(0.04, { freq: 3500, gain: 0.06, delay: 0.02 });
  },
  /** Karte wird vom Kern verschluckt – mit jeder Karte etwas höher */
  absorb: (i = 0) => {
    const f = 380 * Math.pow(2, Math.min(i, 24) / 14);
    tone(f, 0.12, { type: "triangle", gain: 0.06, to: f * 1.5 });
    hiss(0.05, { freq: 5000, gain: 0.025, type: "highpass" });
  },
  /** Kern lädt sich auf */
  charge: () => {
    tone(160, 1.1, { type: "sawtooth", gain: 0.025, to: 640 });
    tone(320, 1.1, { gain: 0.05, to: 1280 });
    hiss(1.0, { freq: 300, to: 4000, q: 2, gain: 0.05 });
  },
  /** Kern fällt zusammen und blitzt */
  implode: () => {
    tone(900, 0.25, { gain: 0.08, to: 80 });
    hiss(0.25, { freq: 4000, to: 200, q: 1, gain: 0.08, delay: 0.02 });
    tone(55, 0.5, { gain: 0.3, to: 35, delay: 0.24 });
    hiss(0.5, { freq: 1200, q: 0.5, gain: 0.12, delay: 0.24, type: "lowpass" });
  },
  /** Mappe klappt auf */
  unfold: () => {
    hiss(0.18, { freq: 1800, to: 900, q: 0.9, gain: 0.08 });
    tone(220, 0.1, { gain: 0.08, to: 160, delay: 0.14 });
  },
  /** Sanfter Erfolgsklang */
  done: () => {
    tone(523, 0.18, { type: "triangle", gain: 0.08 });
    tone(784, 0.26, { type: "triangle", gain: 0.07, delay: 0.09 });
    tone(1047, 0.36, { gain: 0.05, delay: 0.18 });
  },
};
