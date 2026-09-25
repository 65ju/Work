/**
 * Winzige Sound-Engine: alle Klänge werden per Web Audio API synthetisiert –
 * keine Audiodateien, kein Netzwerk, fast keine CPU.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = true;
let volume = 0.5;
/** Browser erlauben Audio erst nach einer Nutzergeste – vorher bleibt alles stumm. */
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

export function configureSound(opts: { enabled: boolean; volume: number }) {
  enabled = opts.enabled;
  volume = opts.volume;
  if (master) master.gain.value = volume * 0.6;
}

function audio(): AudioContext | null {
  if (!enabled || !unlocked) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume * 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function getNoise(ac: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const len = ac.sampleRate * 0.6;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  delay?: number;
  attack?: number;
  vibrato?: number;
}

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + (o.delay ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t0 + dur);
  if (o.vibrato) {
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    lfo.frequency.value = 18;
    lg.gain.value = o.vibrato;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.02);
  }
  const peak = o.gain ?? 0.25;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack ?? 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

interface NoiseOpts {
  gain?: number;
  freq?: number;
  sweepTo?: number;
  q?: number;
  filter?: BiquadFilterType;
  delay?: number;
}

function noise(dur: number, o: NoiseOpts = {}) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + (o.delay ?? 0);
  const src = ac.createBufferSource();
  src.buffer = getNoise(ac);
  const f = ac.createBiquadFilter();
  f.type = o.filter ?? "bandpass";
  f.frequency.setValueAtTime(o.freq ?? 1800, t0);
  if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, t0 + dur);
  f.Q.value = o.q ?? 1;
  const g = ac.createGain();
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random() * 0.3);
  src.stop(t0 + dur + 0.02);
}

let lastBabble = 0;

export const sfx = {
  hover: () => tone(1250, 0.045, { type: "sine", gain: 0.04 }),
  press: () => {
    noise(0.03, { freq: 2600, q: 0.7, gain: 0.14 });
    tone(170, 0.06, { type: "triangle", gain: 0.16, slideTo: 120 });
  },
  release: () => tone(430, 0.08, { type: "triangle", gain: 0.1, slideTo: 700 }),
  pop: () => tone(480, 0.1, { type: "sine", gain: 0.2, slideTo: 980 }),
  pick: () => noise(0.09, { freq: 2500, sweepTo: 5200, q: 0.8, gain: 0.1 }),
  drop: () => {
    tone(150, 0.12, { type: "sine", gain: 0.28, slideTo: 70 });
    noise(0.05, { freq: 900, gain: 0.1 });
  },
  crumple: () => {
    for (let i = 0; i < 7; i++) noise(0.05 + Math.random() * 0.05, { freq: 1500 + Math.random() * 3000, q: 1.4, gain: 0.12, delay: i * 0.035 + Math.random() * 0.02 });
  },
  whoosh: () => noise(0.38, { freq: 380, sweepTo: 2600, q: 0.9, gain: 0.12 }),
  trash: () => {
    tone(105, 0.2, { type: "sine", gain: 0.32, slideTo: 58 });
    tone(880, 0.14, { type: "square", gain: 0.025, slideTo: 760 });
    noise(0.08, { freq: 1200, gain: 0.08 });
  },
  stamp: () => {
    noise(0.07, { freq: 520, q: 0.6, gain: 0.32 });
    tone(85, 0.14, { type: "sine", gain: 0.42 });
  },
  squeak: () => {
    tone(1300, 0.09, { type: "square", gain: 0.05, slideTo: 1750, vibrato: 60 });
    tone(1650, 0.16, { type: "square", gain: 0.05, slideTo: 900, vibrato: 80, delay: 0.08 });
  },
  boing: () => tone(210, 0.28, { type: "sine", gain: 0.2, slideTo: 560, vibrato: 25 }),
  land: () => tone(120, 0.09, { type: "sine", gain: 0.22, slideTo: 60 }),
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: "triangle", gain: 0.13, delay: i * 0.075 })),
  error: () => {
    tone(330, 0.14, { type: "square", gain: 0.05 });
    tone(247, 0.22, { type: "square", gain: 0.05, delay: 0.13 });
  },
  tick: () => noise(0.018, { freq: 5200, filter: "highpass", gain: 0.07 }),
  flip: () => noise(0.03, { freq: 3400, q: 0.5, gain: 0.05 }),
  toggle: () => {
    tone(660, 0.07, { type: "triangle", gain: 0.12 });
    tone(990, 0.1, { type: "triangle", gain: 0.1, delay: 0.06 });
  },
  pour: () => noise(0.9, { freq: 700, sweepTo: 1400, q: 2.5, gain: 0.08 }),
  babble: (len = 5) => {
    const t = performance.now();
    if (t - lastBabble < 900) return;
    lastBabble = t;
    for (let i = 0; i < len; i++) {
      tone(520 + Math.random() * 520, 0.06, { type: "square", gain: 0.022, delay: i * 0.075, slideTo: 400 + Math.random() * 700 });
    }
  },
};
