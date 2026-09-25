import type { ClickId, CursorTraits } from "./traits";

/* ------------------------------------------------------------------ */
/* Cursor-Engine: zeichnet Zeiger, Spuren, Klick- und Partikeleffekte */
/* auf eine Canvas. Wird für den echten Cursor und für alle Vorschauen */
/* im Cursor-Studio benutzt.                                          */
/* ------------------------------------------------------------------ */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type ParticleKind = "spark" | "dust" | "paper" | "confetti";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: ParticleKind;
  rot: number;
  vr: number;
  g: number;
  drag: number;
}

interface ClickFx {
  x: number;
  y: number;
  age: number;
  kind: ClickId;
  color: string;
  seed: number;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

const SIZE = { s: 10, m: 14, l: 19 } as const;
const CONFETTI = ["#ff5d8f", "#ffd166", "#06d6a0", "#4cc9f0", "#b388ff", "#ff9f1c"];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export interface EngineOptions {
  /** Zeichnet vor dem Cursor (Vorschau: z. B. ein Beispiel-Button). */
  backdrop?: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
  /** Liefert pro Frame das Rechteck des gehoverten Elements (oder null). */
  hoverRect?: () => Rect | null;
}

export class CursorEngine {
  traits: CursorTraits;
  accent = "#7c9cff";
  light = false;
  showCursor = true;
  textMode = false;

  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  w = 0;
  h = 0;

  private core = { x: -300, y: -300 };
  private pos = { x: -300, y: -300 };
  private vel = { x: 0, y: 0 };
  private sv = { x: 0, y: 0 };
  private visible = false;
  private alpha = 0;
  private pressed = false;
  private press = 0;
  private pressV = 0;
  private morph = 0;
  private morphV = 0;
  private grow = 0;
  private growV = 0;
  private mr: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private spin = 0;
  private tilt = 0;
  private tiltV = 0;
  private time = 0;
  private hue = 200;
  private moved = false;
  private sparkAcc = 0;
  private lastCore = { x: -300, y: -300 };

  private trail: TrailPoint[] = [];
  private comet: { x: number; y: number }[] = [];
  private pixels: TrailPoint[] = [];
  private parts: Particle[] = [];
  private clicks: ClickFx[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    traits: CursorTraits,
    private opts: EngineOptions = {},
  ) {
    this.traits = traits;
    this.ctx = canvas.getContext("2d")!;
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  setTraits(t: CursorTraits) {
    if (t.trail !== this.traits.trail) {
      this.trail = [];
      this.pixels = [];
      this.comet = [];
    }
    this.traits = t;
  }

  move(x: number, y: number) {
    if (!this.visible) {
      this.visible = true;
      this.pos = { x, y };
      this.vel = { x: 0, y: 0 };
      this.lastCore = { x, y };
      this.comet = [];
    }
    this.core = { x, y };
    this.moved = true;
    const now = this.time;
    if (this.traits.trail === "ribbon" || this.traits.trail === "glow") this.trail.push({ x, y, t: now });
    if (this.traits.trail === "pixel") {
      const gx = Math.round(x / 7) * 7;
      const gy = Math.round(y / 7) * 7;
      const last = this.pixels[this.pixels.length - 1];
      if (!last || last.x !== gx || last.y !== gy) this.pixels.push({ x: gx, y: gy, t: now });
    }
  }

  leave() {
    this.visible = false;
  }

  down() {
    this.pressed = true;
    this.click(this.core.x, this.core.y);
  }

  up() {
    this.pressed = false;
  }

  /** Klickeffekt an beliebiger Stelle (auch für Vorschauen). */
  click(x: number, y: number) {
    const kind = this.traits.click;
    if (kind === "none") return;
    const color = this.color();
    if (kind === "burst") {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        const s = 180 + Math.random() * 260;
        this.parts.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0,
          max: 0.45 + Math.random() * 0.3,
          size: 1.6 + Math.random() * 1.8,
          color: this.traits.color === "rainbow" ? `hsl(${(this.hue + i * 22) % 360} 95% 65%)` : color,
          kind: "spark",
          rot: 0,
          vr: 0,
          g: 220,
          drag: 0.9,
        });
      }
    } else if (kind === "confetti") {
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const s = 220 + Math.random() * 280;
        this.parts.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0,
          max: 0.9 + Math.random() * 0.6,
          size: 4 + Math.random() * 3,
          color: CONFETTI[i % CONFETTI.length],
          kind: "confetti",
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 16,
          g: 900,
          drag: 0.94,
        });
      }
    } else {
      this.clicks.push({ x, y, age: 0, kind, color, seed: Math.random() * 10 });
    }
  }

  /** Partikel-Feedback für die Oberfläche (Zettel ablegen, löschen …). */
  burst(x: number, y: number, kind: ParticleKind, color = "#ffffff", count = 10, power = 1) {
    for (let i = 0; i < count; i++) {
      const a = kind === "dust" ? Math.PI + Math.random() * Math.PI : Math.random() * Math.PI * 2;
      const s = (kind === "dust" ? 40 + Math.random() * 90 : 120 + Math.random() * 260) * power;
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * (kind === "dust" ? 0.35 : 1) - (kind === "paper" ? 120 : 0),
        life: 0,
        max: kind === "dust" ? 0.5 + Math.random() * 0.3 : 0.7 + Math.random() * 0.5,
        size: kind === "dust" ? 3 + Math.random() * 4 : kind === "paper" ? 3 + Math.random() * 3 : 1.5 + Math.random() * 2,
        color,
        kind,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 10,
        g: kind === "dust" ? -30 : kind === "paper" ? 800 : 200,
        drag: kind === "dust" ? 0.88 : 0.93,
      });
    }
  }

  get busy() {
    return this.parts.length > 0 || this.clicks.length > 0;
  }

  private color(): string {
    switch (this.traits.color) {
      case "contrast":
      case "invert":
        return this.light && this.traits.color === "contrast" ? "#0b0d12" : "#ffffff";
      case "rainbow":
        return `hsl(${this.hue} 95% 66%)`;
      default:
        return this.accent;
    }
  }

  /** Ein Frame: Physik aktualisieren und zeichnen. Liefert true, solange noch Bewegung ist. */
  step(dt: number): boolean {
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    this.hue = (this.hue + dt * 80) % 360;
    const t = this.traits;
    const R = SIZE[t.size];

    // Sichtbarkeit weich ein-/ausblenden
    this.alpha = lerp(this.alpha, this.visible && this.showCursor ? 1 : 0, 1 - Math.exp(-dt * 14));

    // Hover-Ziel
    const hr = this.opts.hoverRect?.() ?? null;
    const magnet = t.hover === "magnet" && !!hr && !this.textMode;
    const growOn = t.hover === "grow" && !!hr && !this.textMode;

    // Federn: Morph, Wachsen, Druck
    this.morphV += ((magnet ? 1 : 0) - this.morph) * 320 * dt - this.morphV * 26 * dt;
    this.morph = clamp(this.morph + this.morphV * dt, -0.2, 1.2);
    this.growV += ((growOn ? 1 : 0) - this.grow) * 300 * dt - this.growV * 22 * dt;
    this.grow += this.growV * dt;
    this.pressV += ((this.pressed ? 1 : 0) - this.press) * 900 * dt - this.pressV * 22 * dt;
    this.press += this.pressV * dt;

    // Ziel der Hülle
    let tx = this.core.x;
    let ty = this.core.y;
    if (magnet && hr) {
      const cx = hr.x + hr.w / 2;
      const cy = hr.y + hr.h / 2;
      tx = cx + (this.core.x - cx) * 0.14;
      ty = cy + (this.core.y - cy) * 0.14;
    }

    const px = this.pos.x;
    const py = this.pos.y;
    const motion = magnet ? "smooth" : t.motion;
    if (motion === "direct") {
      this.pos = { x: tx, y: ty };
    } else if (motion === "spring") {
      this.vel.x += ((tx - this.pos.x) * 420 - this.vel.x * 22) * dt;
      this.vel.y += ((ty - this.pos.y) * 420 - this.vel.y * 22) * dt;
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
    } else {
      const k = 1 - Math.exp(-dt * (motion === "heavy" ? 6.5 : 20));
      this.pos.x += (tx - this.pos.x) * k;
      this.pos.y += (ty - this.pos.y) * k;
    }
    const ivx = (this.pos.x - px) / dt;
    const ivy = (this.pos.y - py) / dt;
    this.sv.x = lerp(this.sv.x, ivx, 0.35);
    this.sv.y = lerp(this.sv.y, ivy, 0.35);

    // Rechteck für den Magnet-Morph nachführen
    const target: Rect = hr ? { x: hr.x - 6, y: hr.y - 6, w: hr.w + 12, h: hr.h + 12 } : { x: this.pos.x - R, y: this.pos.y - R, w: 2 * R, h: 2 * R };
    const km = 1 - Math.exp(-dt * 22);
    this.mr = {
      x: lerp(this.mr.x, target.x, km),
      y: lerp(this.mr.y, target.y, km),
      w: lerp(this.mr.w, target.w, km),
      h: lerp(this.mr.h, target.h, km),
    };

    // Pfeil kippt mit der Geschwindigkeit
    const coreVx = (this.core.x - this.lastCore.x) / dt;
    const tiltTarget = t.motion === "direct" ? 0 : clamp(coreVx * (t.motion === "heavy" ? 0.03 : 0.015), -28, 28);
    this.tiltV += (tiltTarget - this.tilt) * 260 * dt - this.tiltV * (t.motion === "spring" ? 9 : 20) * dt;
    this.tilt += this.tiltV * dt;
    const speed = Math.hypot(this.sv.x, this.sv.y);
    this.spin += dt * (0.6 + speed * 0.004);

    // Spuren
    const now = this.time;
    this.trail = this.trail.filter((p) => now - p.t < (t.trail === "glow" ? 0.34 : 0.16));
    this.pixels = this.pixels.filter((p) => now - p.t < 0.45);
    if (t.trail === "comet") {
      if (!this.comet.length) this.comet = Array.from({ length: 14 }, () => ({ ...this.core }));
      for (let i = 0; i < this.comet.length; i++) {
        const lead = i === 0 ? this.core : this.comet[i - 1];
        const k = 1 - Math.exp(-dt * (i === 0 ? 40 : 26));
        this.comet[i].x += (lead.x - this.comet[i].x) * k;
        this.comet[i].y += (lead.y - this.comet[i].y) * k;
      }
    }
    if (t.trail === "sparks" && this.visible) {
      const dist = Math.hypot(this.core.x - this.lastCore.x, this.core.y - this.lastCore.y);
      this.sparkAcc += dist / 9;
      while (this.sparkAcc >= 1) {
        this.sparkAcc -= 1;
        const a = Math.random() * Math.PI * 2;
        this.parts.push({
          x: this.core.x,
          y: this.core.y,
          vx: Math.cos(a) * 40 - coreVx * 0.05,
          vy: Math.sin(a) * 40,
          life: 0,
          max: 0.35 + Math.random() * 0.35,
          size: 1 + Math.random() * 1.6,
          color: this.traits.color === "rainbow" ? `hsl(${(this.hue + Math.random() * 60) % 360} 95% 65%)` : this.color(),
          kind: "spark",
          rot: 0,
          vr: 0,
          g: 160,
          drag: 0.92,
        });
      }
    }
    this.lastCore = { ...this.core };

    // Partikel & Klicks
    const alive: Particle[] = [];
    for (const p of this.parts) {
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy += p.g * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      alive.push(p);
    }
    this.parts = alive.length > 400 ? alive.slice(-400) : alive;
    this.clicks = this.clicks.filter((c) => (c.age += dt) < 0.7);

    this.draw();

    const moving =
      this.moved ||
      Math.abs(this.core.x - this.pos.x) + Math.abs(this.core.y - this.pos.y) > 0.3 ||
      Math.abs(this.morphV) + Math.abs(this.growV) + Math.abs(this.pressV) + Math.abs(this.tiltV) > 0.01 ||
      Math.abs(this.alpha - (this.visible && this.showCursor ? 1 : 0)) > 0.01 ||
      speed > 1;
    this.moved = false;
    return (
      moving ||
      this.parts.length > 0 ||
      this.clicks.length > 0 ||
      this.trail.length > 0 ||
      this.pixels.length > 0 ||
      (t.trail === "comet" && this.comet.some((c) => Math.abs(c.x - this.core.x) + Math.abs(c.y - this.core.y) > 0.5)) ||
      (this.visible && this.showCursor && (t.color === "rainbow" || t.shape === "brackets" || t.shape === "diamond"))
    );
  }

  private draw() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.opts.backdrop?.(ctx, this.w, this.h, this.time);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const glowMode = !this.light && this.traits.color !== "invert" ? "lighter" : "source-over";
    this.drawParticles(glowMode);
    this.drawClicks();
    if (this.alpha > 0.01) {
      ctx.globalAlpha = this.alpha;
      this.drawTrail(glowMode);
      if (this.textMode) this.drawBeam();
      else this.drawShell();
      ctx.globalAlpha = 1;
    }
  }

  private drawTrail(mode: GlobalCompositeOperation) {
    const { ctx } = this;
    const t = this.traits;
    const R = SIZE[t.size];
    const color = this.color();
    const now = this.time;
    if (t.trail === "ribbon" && this.trail.length > 1) {
      const n = this.trail.length;
      ctx.strokeStyle = color;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        ctx.globalAlpha = this.alpha * k * 0.75;
        ctx.lineWidth = Math.max(0.5, R * 0.42 * k);
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.stroke();
      }
      ctx.globalAlpha = this.alpha;
    } else if (t.trail === "glow") {
      ctx.save();
      ctx.globalCompositeOperation = mode;
      for (const p of this.trail) {
        const k = 1 - (now - p.t) / 0.34;
        const r = R * (1.1 + (1 - k) * 0.9);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = this.alpha * 0.1 * k;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (t.trail === "pixel") {
      ctx.fillStyle = color;
      for (const p of this.pixels) {
        const k = 1 - (now - p.t) / 0.45;
        ctx.globalAlpha = this.alpha * k * 0.85;
        const s = 5 * k + 1;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = this.alpha;
    } else if (t.trail === "comet" && this.comet.length) {
      ctx.fillStyle = color;
      const n = this.comet.length;
      for (let i = n - 1; i >= 0; i--) {
        const k = 1 - i / n;
        ctx.globalAlpha = this.alpha * k * 0.7;
        ctx.beginPath();
        ctx.arc(this.comet[i].x, this.comet[i].y, Math.max(0.6, R * 0.34 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = this.alpha;
    }
  }

  private drawParticles(mode: GlobalCompositeOperation) {
    const { ctx } = this;
    for (const p of this.parts) {
      const k = p.life / p.max;
      ctx.save();
      if (p.kind === "spark") {
        ctx.globalCompositeOperation = mode;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "dust") {
        ctx.globalAlpha = 0.35 * (1 - k);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + k * 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        const w = p.size;
        const h = p.kind === "confetti" ? p.size * 0.55 * Math.abs(Math.cos(p.rot * 1.7)) + 0.6 : p.size * 0.8;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      ctx.restore();
    }
  }

  private drawClicks() {
    const { ctx } = this;
    const R = SIZE[this.traits.size];
    for (const c of this.clicks) {
      const e = easeOut(c.age / 0.55);
      ctx.save();
      ctx.strokeStyle = c.color;
      ctx.fillStyle = c.color;
      if (c.kind === "ripple") {
        for (const delay of [0, 0.09]) {
          const ee = easeOut((c.age - delay) / 0.55);
          if (ee <= 0) continue;
          ctx.globalAlpha = (1 - ee) * 0.9;
          ctx.lineWidth = 2 * (1 - ee) + 0.3;
          ctx.beginPath();
          ctx.arc(c.x, c.y, R * (0.5 + 3 * ee), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (c.kind === "pulse") {
        ctx.globalAlpha = 0.28 * (1 - e);
        ctx.beginPath();
        ctx.arc(c.x, c.y, R * 2.3 * e, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8 * (1 - e);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(c.x, c.y, R * 2.3 * e, 0, Math.PI * 2);
        ctx.stroke();
      } else if (c.kind === "impact") {
        ctx.globalAlpha = 1 - e;
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + c.seed;
          const r1 = R * (0.9 + 1.3 * e);
          const r2 = r1 + R * 0.9 * (1 - e) + 2;
          ctx.beginPath();
          ctx.moveTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1);
          ctx.lineTo(c.x + Math.cos(a) * r2, c.y + Math.sin(a) * r2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  private drawBeam() {
    const { ctx } = this;
    const { x, y } = this.core;
    ctx.strokeStyle = this.color();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.moveTo(x - 4, y - 11);
    ctx.quadraticCurveTo(x, y - 10, x, y - 8);
    ctx.quadraticCurveTo(x, y - 10, x + 4, y - 11);
    ctx.moveTo(x - 4, y + 11);
    ctx.quadraticCurveTo(x, y + 10, x, y + 8);
    ctx.quadraticCurveTo(x, y + 10, x + 4, y + 11);
    ctx.stroke();
  }

  private drawShell() {
    const { ctx } = this;
    const t = this.traits;
    const R = SIZE[t.size];
    const color = this.color();
    const m = clamp(this.morph, 0, 1);
    const g = clamp(this.grow, -0.2, 1.3);
    const p = clamp(this.press, -0.3, 1.2);
    const scale = (1 - 0.3 * p) * (1 + 0.65 * g);
    const speed = Math.hypot(this.sv.x, this.sv.y);
    const ang = Math.atan2(this.sv.y, this.sv.x);
    const stretch = Math.min(0.5, speed / 2400) * (1 - m);

    // Zwischenform Kreis → Rechteck (Magnet)
    const r0 = R * scale;
    const cx = lerp(this.pos.x, this.mr.x + this.mr.w / 2, m);
    const cy = lerp(this.pos.y, this.mr.y + this.mr.h / 2, m);
    const bw = lerp(2 * r0, this.mr.w, m);
    const bh = lerp(2 * r0, this.mr.h, m);
    const br = lerp(r0, Math.min(14, this.mr.h / 2), m);

    const shapePath = () => {
      if (m < 0.02) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r0 * (1 + stretch), r0 * (1 - stretch * 0.55), ang, 0, Math.PI * 2);
      } else {
        roundRectPath(ctx, cx - bw / 2, cy - bh / 2, bw, bh, br);
      }
    };

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.6;

    switch (t.shape) {
      case "ring": {
        shapePath();
        if (g > 0.02 || m > 0.02) {
          ctx.save();
          ctx.globalAlpha *= 0.1 * Math.max(g, m);
          ctx.fill();
          ctx.restore();
        }
        ctx.stroke();
        break;
      }
      case "dot": {
        if (m > 0.02) {
          shapePath();
          ctx.save();
          ctx.globalAlpha *= 0.14 * m;
          ctx.fill();
          ctx.globalAlpha = this.alpha * 0.45 * m;
          ctx.stroke();
          ctx.restore();
        }
        const rd = R * 0.42 * scale * (1 - m * 0.6);
        ctx.save();
        ctx.globalAlpha *= 1 - Math.min(0.75, g * 0.6);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rd * (1 + stretch), rd * (1 - stretch * 0.5), ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case "cross": {
        if (m > 0.02) {
          ctx.save();
          ctx.globalAlpha *= m;
          roundRectPath(ctx, cx - bw / 2, cy - bh / 2, bw, bh, br);
          ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate((Math.PI / 4) * clamp(g, 0, 1));
        const gap = R * 0.35 * scale;
        const len = R * 0.75 * scale;
        ctx.globalAlpha *= 1 - m * 0.6;
        ctx.beginPath();
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          ctx.moveTo(dx * gap, dy * gap);
          ctx.lineTo(dx * (gap + len), dy * (gap + len));
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "diamond": {
        if (m > 0.3) {
          roundRectPath(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 4);
          ctx.save();
          ctx.globalAlpha *= 0.08;
          ctx.fill();
          ctx.restore();
          ctx.stroke();
        } else {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(Math.PI / 4 + this.spin * (1 - clamp(g, 0, 1)));
          const s = r0 * 1.25;
          ctx.strokeRect(-s / 2, -s / 2, s, s);
          ctx.restore();
        }
        break;
      }
      case "brackets": {
        const breathe = 1 + 0.06 * Math.sin(this.time * 3) * (1 - m);
        const hw = m > 0.02 ? bw / 2 : r0 * 1.05 * breathe;
        const hh = m > 0.02 ? bh / 2 : r0 * 1.05 * breathe;
        const L = Math.min(10, hw * 0.55, hh * 0.55) + 2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          const x = cx + sx * hw;
          const y = cy + sy * hh;
          ctx.moveTo(x, y - sy * L);
          ctx.lineTo(x, y);
          ctx.lineTo(x - sx * L, y);
        }
        ctx.stroke();
        break;
      }
      case "blob": {
        // Flüssige Hülle mit „Faden“ zum exakten Zeigerpunkt.
        const d = Math.hypot(this.core.x - cx, this.core.y - cy);
        if (m < 0.5 && d > r0 * 0.6) {
          const a = Math.atan2(this.core.y - cy, this.core.x - cx);
          const nx = Math.cos(a + Math.PI / 2);
          const ny = Math.sin(a + Math.PI / 2);
          const w0 = r0 * 0.55;
          ctx.save();
          ctx.globalAlpha *= 0.55;
          ctx.beginPath();
          ctx.moveTo(cx + nx * w0, cy + ny * w0);
          ctx.quadraticCurveTo((cx + this.core.x) / 2, (cy + this.core.y) / 2, this.core.x, this.core.y);
          ctx.quadraticCurveTo((cx + this.core.x) / 2, (cy + this.core.y) / 2, cx - nx * w0, cy - ny * w0);
          ctx.fill();
          ctx.restore();
        }
        const grad = ctx.createRadialGradient(cx - r0 * 0.3, cy - r0 * 0.35, 0, cx, cy, Math.max(bw, bh) / 2 + 2);
        grad.addColorStop(0, "rgba(255,255,255,0.95)");
        grad.addColorStop(0.35, color);
        grad.addColorStop(1, color);
        ctx.save();
        ctx.globalAlpha *= m > 0.02 ? 0.22 : 0.85;
        ctx.fillStyle = grad;
        if (m < 0.02) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, r0 * 0.75 * (1 + stretch * 1.6), r0 * 0.75 * (1 - stretch * 0.7), ang, 0, Math.PI * 2);
        } else shapePath();
        ctx.fill();
        ctx.restore();
        if (m > 0.02) {
          ctx.save();
          ctx.globalAlpha *= 0.5 * m;
          shapePath();
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case "arrow": {
        if (m > 0.02) {
          ctx.save();
          ctx.globalAlpha *= 0.4 * m;
          shapePath();
          ctx.stroke();
          ctx.globalAlpha = this.alpha * 0.06 * m;
          ctx.fill();
          ctx.restore();
        }
        const s = (R / 14) * (1 - 0.15 * p) * (1 + 0.25 * g);
        ctx.save();
        ctx.translate(this.core.x, this.core.y);
        ctx.rotate((this.tilt * Math.PI) / 180);
        ctx.scale(s, s);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 17);
        ctx.lineTo(4.4, 12.9);
        ctx.lineTo(7.4, 19.6);
        ctx.lineTo(10.2, 18.4);
        ctx.lineTo(7.3, 11.8);
        ctx.lineTo(12.8, 11.8);
        ctx.closePath();
        ctx.fill();
        if (this.traits.color !== "invert") {
          ctx.lineWidth = 1.3 / s;
          ctx.strokeStyle = this.light ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.65)";
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
    }

    // Exakter Zeigerpunkt – damit Klicks immer präzise sind.
    const lag = Math.hypot(this.core.x - this.pos.x, this.core.y - this.pos.y);
    if (t.shape !== "dot" || lag > 2 || m > 0.05) {
      ctx.beginPath();
      ctx.arc(this.core.x, this.core.y, 2.2 * (1 - 0.3 * p), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
