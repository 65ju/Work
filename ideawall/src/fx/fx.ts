import { runtime, TIER_CONFIG } from "../lib/quality";
import { rand, pick } from "../lib/springs";

/* ------------------------------------------------------------------ */
/* Partikel: eine Canvas, eine rAF-Schleife – läuft nur, solange es   */
/* Partikel gibt. Jeder Partikel hat Schwerkraft und Luftwiderstand.  */
/* ------------------------------------------------------------------ */

export type BurstKind = "confetti" | "dust" | "sparkle" | "paper" | "ink" | "stars" | "puff" | "steam";

type Shape = "rect" | "circle" | "star" | "poly" | "ring";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  rot: number;
  vr: number;
  color: string;
  shape: Shape;
  gravity: number;
  drag: number;
  outline: boolean;
  spin: number;
}

const INK = "#0b0822";
const PARTY = ["#ffd23f", "#2ee6ff", "#ff3ea5", "#7dffb3", "#ff9a2e", "#b7a6ff", "#ff6b5e", "#3ff0d0"];
const MAX_PARTICLES = 420;

class ParticleEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private list: Particle[] = [];
  private raf = 0;
  private last = 0;
  private dpr = 1;

  attach(canvas: HTMLCanvasElement | null) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext("2d") ?? null;
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, TIER_CONFIG[runtime.tier].dpr);
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
  }

  burst(x: number, y: number, kind: BurstKind, opts: { count?: number; colors?: string[]; power?: number; angle?: number; spread?: number } = {}) {
    if (runtime.reduced || !this.ctx) return;
    const mult = TIER_CONFIG[runtime.tier].particles;
    const base = opts.count ?? DEFAULT_COUNT[kind];
    const count = Math.max(1, Math.round(base * mult));
    const power = opts.power ?? 1;
    const colors = opts.colors ?? PARTY;
    for (let i = 0; i < count && this.list.length < MAX_PARTICLES; i++) {
      this.list.push(make(kind, x, y, colors, power, opts.angle, opts.spread));
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick = (t: number) => {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) {
      this.raf = 0;
      return;
    }
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";

    const alive: Particle[] = [];
    for (const p of this.list) {
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy += p.gravity * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size = Math.max(0.1, p.size + p.grow * dt);
      alive.push(p);
      draw(ctx, p);
    }
    this.list = alive;
    if (alive.length) {
      this.raf = requestAnimationFrame(this.tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.raf = 0;
    }
  };
}

const DEFAULT_COUNT: Record<BurstKind, number> = {
  confetti: 46,
  dust: 7,
  sparkle: 12,
  paper: 16,
  ink: 12,
  stars: 10,
  puff: 5,
  steam: 4,
};

function make(kind: BurstKind, x: number, y: number, colors: string[], power: number, angle?: number, spread?: number): Particle {
  const dir = angle ?? -Math.PI / 2;
  const spr = spread ?? Math.PI * 2;
  const a = dir + (Math.random() - 0.5) * spr;
  const p: Particle = {
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    size: 6,
    grow: 0,
    rot: rand(0, Math.PI * 2),
    vr: rand(-8, 8),
    color: pick(colors),
    shape: "rect",
    gravity: 900,
    drag: 0.97,
    outline: true,
    spin: rand(6, 14),
  };
  switch (kind) {
    case "confetti": {
      const s = rand(280, 620) * power;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - rand(80, 260) * power;
      p.max = rand(1.1, 1.9);
      p.size = rand(5, 9);
      p.gravity = 820;
      p.drag = 0.955;
      p.shape = Math.random() < 0.7 ? "rect" : "circle";
      break;
    }
    case "sparkle":
    case "stars": {
      const s = rand(120, 320) * power;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.max = rand(0.55, 0.95);
      p.size = kind === "stars" ? rand(7, 12) : rand(4, 8);
      p.grow = -6;
      p.gravity = kind === "stars" ? 300 : 120;
      p.drag = 0.92;
      p.shape = "star";
      p.vr = rand(-4, 4);
      break;
    }
    case "dust":
    case "puff": {
      const s = rand(40, 140) * power;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s * 0.4 - rand(10, 40);
      p.max = rand(0.45, 0.8);
      p.size = kind === "puff" ? rand(7, 12) : rand(4, 8);
      p.grow = kind === "puff" ? 18 : 12;
      p.gravity = -40;
      p.drag = 0.9;
      p.shape = "circle";
      p.color = pick(colors === PARTY ? ["#efe8ff", "#d9d0ff", "#ffffff"] : colors);
      break;
    }
    case "steam": {
      p.vx = rand(-12, 12);
      p.vy = rand(-60, -30);
      p.max = rand(0.9, 1.4);
      p.size = rand(4, 7);
      p.grow = 10;
      p.gravity = -20;
      p.drag = 0.98;
      p.shape = "circle";
      p.outline = false;
      p.color = "rgba(255,255,255,0.55)";
      break;
    }
    case "paper": {
      const s = rand(160, 420) * power;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 120;
      p.max = rand(0.8, 1.3);
      p.size = rand(5, 9);
      p.gravity = 1100;
      p.drag = 0.95;
      p.shape = "poly";
      break;
    }
    case "ink": {
      const s = rand(90, 320) * power;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.max = rand(0.35, 0.6);
      p.size = rand(2.5, 6);
      p.grow = -4;
      p.gravity = 600;
      p.drag = 0.9;
      p.shape = "circle";
      p.outline = false;
      break;
    }
  }
  return p;
}

function draw(ctx: CanvasRenderingContext2D, p: Particle) {
  const k = p.life / p.max;
  const alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
  ctx.globalAlpha = alpha;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  const s = p.size;
  ctx.beginPath();
  switch (p.shape) {
    case "rect": {
      // Konfetti dreht sich um die eigene Achse: Breite schwingt.
      const w = s * Math.abs(Math.cos(p.life * p.spin));
      ctx.rect(-w / 2, -s * 0.35, w, s * 0.7);
      break;
    }
    case "circle":
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      break;
    case "star":
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? s : s * 0.36;
        const ang = (i / 8) * Math.PI * 2;
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      break;
    case "poly":
      ctx.moveTo(-s, -s * 0.6);
      ctx.lineTo(s * 0.8, -s * 0.8);
      ctx.lineTo(s, s * 0.5);
      ctx.lineTo(-s * 0.5, s * 0.7);
      ctx.closePath();
      break;
    case "ring":
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      break;
  }
  ctx.fill();
  if (p.outline) ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export const particles = new ParticleEngine();

/* ------------------------------------------------------------------ */
/* Kleine externe Stores für Comic-Bursts und Toasts                  */
/* ------------------------------------------------------------------ */

function createStore<T>() {
  let items: T[] = [];
  const subs = new Set<() => void>();
  return {
    get: () => items,
    set(next: T[]) {
      items = next;
      subs.forEach((s) => s());
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export interface ComicItem {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  rot: number;
}

export interface ToastItem {
  id: number;
  text: string;
  tone: "info" | "success" | "error";
  action?: { label: string; run: () => void };
}

export const comicStore = createStore<ComicItem>();
export const toastStore = createStore<ToastItem>();
let nextId = 1;

export const fx = {
  burst: (x: number, y: number, kind: BurstKind, opts?: Parameters<ParticleEngine["burst"]>[3]) => particles.burst(x, y, kind, opts),
  comic(x: number, y: number, text: string, color = "#ffd23f") {
    const id = nextId++;
    const cx = Math.min(window.innerWidth - 90, Math.max(90, x));
    const cy = Math.max(70, y);
    comicStore.set([...comicStore.get(), { id, x: cx, y: cy, text, color, rot: rand(-10, 10) }]);
    window.setTimeout(() => comicStore.set(comicStore.get().filter((c) => c.id !== id)), 1100);
  },
  toast(text: string, tone: ToastItem["tone"] = "info", action?: ToastItem["action"], ms = 3600) {
    const id = nextId++;
    toastStore.set([...toastStore.get().slice(-3), { id, text, tone, action }]);
    window.setTimeout(() => fx.dismiss(id), ms);
    return id;
  },
  dismiss(id: number) {
    toastStore.set(toastStore.get().filter((t) => t.id !== id));
  },
};
