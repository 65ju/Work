import { clamp, pick, rand } from "../lib/springs";
import { sfx } from "../lib/sound";
import { fx } from "../fx/fx";
import { runtime } from "../lib/quality";
import { BYTE_LINES } from "../data/content";

export type Pose =
  | "idle"
  | "walk"
  | "run"
  | "crouch"
  | "jump"
  | "happy"
  | "think"
  | "sleep"
  | "error"
  | "success"
  | "focus"
  | "drink"
  | "dangle"
  | "dizzy"
  | "wave"
  | "lookup"
  | "sit";

type Face = "normal" | "happy" | "sleepy" | "error" | "surprised" | "think" | "dizzy";

const FACE: Record<Pose, Face> = {
  idle: "normal",
  walk: "normal",
  run: "normal",
  crouch: "normal",
  jump: "happy",
  happy: "happy",
  think: "think",
  sleep: "sleepy",
  error: "error",
  success: "happy",
  focus: "think",
  drink: "happy",
  dangle: "surprised",
  dizzy: "dizzy",
  wave: "happy",
  lookup: "surprised",
  sit: "normal",
};

export interface Stations {
  duck: number;
  server: number | null;
  machine: number;
}

export interface ControllerDeps {
  root: HTMLElement;
  body: HTMLElement;
  flip: HTMLElement;
  shadow: HTMLElement;
  say: (text: string, ms?: number) => void;
  stations: () => Stations;
  refill: () => void;
  coffee: () => number;
  focusing: () => boolean;
}

const GRAVITY = 2300;
const WALK = 105;
const RUN = 300;
const HALF_W = 32;
const SLEEP_AFTER = 40_000;

/**
 * Physik + Verhalten des Buddys. Läuft in einer eigenen rAF-Schleife, schreibt
 * Transforms direkt ins DOM und schläft, sobald alles eingeschwungen ist.
 */
export class ByteController {
  x = -70;
  y = 0;
  vx = 0;
  vy = 0;
  facing = 1;
  grounded = true;
  target: number | null = null;
  running = false;
  private onArrive: (() => void) | null = null;

  pose: Pose = "idle";
  /** Dauerzustand, zu dem temporäre Posen zurückkehren. */
  base: "idle" | "sleep" | "focus" = "idle";
  private poseTimer = 0;
  private busyUntil = 0;

  // Federn: Squash/Stretch, Antenne (Follow-through), Pendeln beim Tragen, Augen.
  private sq = 0;
  private sqv = 0;
  private ant = 0;
  private antv = 0;
  private swing = 0;
  private swingv = 0;
  private eyeX = 0;
  private eyeY = 0;

  private look: { x: number; y: number; until: number } | null = null;
  private pointer = { x: -1, y: -1, t: 0 };

  grabbed = false;
  private grabCandidate: { x: number; y: number; id: number } | null = null;
  private ground = 0;
  private groundCache = -1;
  private history: { x: number; y: number; t: number }[] = [];
  private afterLand: Pose | null = null;

  private raf = 0;
  private last = 0;
  private dustAcc = 0;
  private brainTimer = 0;
  private lastActive = performance.now();
  private destroyed = false;
  private cleanups: (() => void)[] = [];

  constructor(private d: ControllerDeps) {
    this.setPose("idle");
    this.write();
    this.bindInput();
    this.scheduleBrain(4000);
    const idleCheck = window.setInterval(() => this.checkIdle(), 4000);
    this.cleanups.push(() => window.clearInterval(idleCheck));
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.brainTimer);
    window.clearTimeout(this.poseTimer);
    this.cleanups.forEach((c) => c());
  }

  // ------------------------------------------------------------------ Posen
  setPose(p: Pose, ms?: number) {
    window.clearTimeout(this.poseTimer);
    this.pose = p;
    this.d.body.dataset.pose = p;
    this.d.body.dataset.face = FACE[p];
    if (ms) {
      this.busyUntil = performance.now() + ms;
      this.poseTimer = window.setTimeout(() => {
        if (this.grounded && this.target == null && !this.grabbed) this.setPose(this.base);
      }, ms);
    }
  }

  setBase(b: "idle" | "sleep" | "focus") {
    this.base = b;
    if (this.grounded && this.target == null && !this.grabbed) this.setPose(b);
  }

  private busy() {
    return performance.now() < this.busyUntil || this.target != null || !this.grounded || this.grabbed;
  }

  // ------------------------------------------------------------- Bewegung
  bounds() {
    return { min: HALF_W + 6, max: window.innerWidth - HALF_W - 6 };
  }

  walkTo(tx: number, run = false, onArrive?: () => void) {
    const { min, max } = this.bounds();
    this.target = clamp(tx, min, max);
    this.running = run;
    this.onArrive = onArrive ?? null;
    window.clearTimeout(this.poseTimer);
    this.busyUntil = 0;
    if (Math.abs(this.target - this.x) < 6) {
      this.target = null;
      this.onArrive = null;
      onArrive?.();
      return;
    }
    this.setPose(run ? "run" : "walk");
    this.wake();
  }

  jump(power = 1, then?: Pose) {
    if (!this.grounded || this.grabbed) return;
    if (runtime.reduced) {
      if (then) this.setPose(then, 1600);
      return;
    }
    // Antizipation: erst in die Knie, dann abspringen.
    this.setPose("crouch");
    this.sqv -= 5;
    this.wake();
    window.setTimeout(() => {
      if (this.grabbed || !this.grounded) return;
      this.vy = 640 * power;
      this.grounded = false;
      this.afterLand = then ?? null;
      this.setPose("jump");
      this.sqv += 3;
      sfx.boing();
      this.wake();
    }, 120);
  }

  lookAt(x: number, y: number, ms = 1600) {
    this.look = { x, y, until: performance.now() + ms };
    if (this.grounded && this.target == null && !this.grabbed && Math.abs(x - this.x) > 30 && this.base === "idle") {
      this.facing = x > this.x ? 1 : -1;
    }
    this.wake();
  }

  say(text: string, ms?: number) {
    this.d.say(text, ms);
    sfx.babble(Math.min(8, 3 + Math.floor(text.length / 10)));
  }

  // --------------------------------------------------------------- Aktionen
  greet(text: string) {
    this.x = -70;
    this.write();
    this.walkTo(window.innerWidth * (window.innerWidth < 640 ? 0.3 : 0.2), true, () => {
      this.jump(0.8, "wave");
      window.setTimeout(() => this.say(text, 3800), 300);
    });
  }

  call(x?: number) {
    this.activity();
    const tx = x ?? window.innerWidth / 2;
    this.walkTo(tx, true, () => {
      this.jump(1, "wave");
      window.setTimeout(() => this.say(pick(["Hier bin ich! Was gibt's?", "Zu Diensten, Julian!", "Byte meldet sich zum Dienst!"]), 3200), 250);
    });
  }

  celebrate(text: string, at?: { x: number; y: number }) {
    this.activity();
    if (at) this.lookAt(at.x, at.y, 1500);
    this.jump(1.1, "success");
    window.setTimeout(() => {
      const r = this.d.root.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + 10, "confetti", { count: 36, power: 0.8 });
    }, 260);
    this.say(text, 2800);
  }

  confused(text: string, at?: { x: number; y: number }) {
    this.activity();
    if (at) this.lookAt(at.x, at.y, 2000);
    sfx.error();
    this.setPose("error", 2400);
    this.say(text, 2800);
  }

  inspect(x: number, y: number, text: string) {
    this.activity();
    const side = x > this.x ? -46 : 46;
    this.walkTo(x + side, true, () => {
      this.lookAt(x, y, 2600);
      this.setPose("lookup", 700);
      window.setTimeout(() => {
        if (this.target != null || this.grabbed) return;
        this.setPose("happy", 1600);
        const r = this.d.root.getBoundingClientRect();
        fx.burst(r.left + r.width / 2, r.top, "sparkle", { count: 10 });
        this.say(text, 2800);
      }, 700);
    });
  }

  fetchCoffee() {
    this.activity();
    const st = this.d.stations();
    this.say("Kaffee? Bin unterwegs!", 1800);
    this.walkTo(st.machine - 60, true, () => {
      this.facing = 1;
      this.setPose("drink", 2400);
      sfx.pour();
      window.setTimeout(() => {
        this.d.refill();
        this.say("Aaah. Koffein-Level: 100 %!", 2800);
        this.jump(0.7, "happy");
      }, 1700);
    });
  }

  arranged() {
    this.activity();
    const w = window.innerWidth;
    const far = this.x < w / 2 ? w - 90 : 90;
    this.walkTo(far, true, () => {
      this.facing = far > w / 2 ? -1 : 1;
      this.jump(0.8, "happy");
      this.say("Ordnung ist das halbe Deployment.", 3000);
    });
  }

  startFocus() {
    this.activity();
    this.target = null;
    this.say("Kopfhörer auf. Ich bin ganz leise!", 2800);
    this.setBase("focus");
  }

  endFocus(completed: boolean) {
    this.setBase("idle");
    if (completed) this.celebrate("Session geschafft! Pause verdient.");
    else this.say("Okay, Pause. Gut gemacht!", 2600);
  }

  clickPoke() {
    if (this.base === "sleep") {
      this.wakeUp();
      return;
    }
    this.jump(1, "happy");
    this.say(pick(BYTE_LINES), 3200);
  }

  // ------------------------------------------------------------ Aktivität
  activity() {
    this.lastActive = performance.now();
    if (this.base === "sleep") this.wakeUp();
  }

  private wakeUp() {
    this.base = "idle";
    this.setPose("idle");
    this.jump(0.9, "lookup");
    this.say(pick(["Huch! Bin wach!", "Ich hab nicht geschlafen. Nur gecacht.", "Wa…? Ach, du bist's!"]), 2600);
  }

  private checkIdle() {
    if (this.destroyed || this.base !== "idle" || this.busy()) return;
    if (performance.now() - this.lastActive > SLEEP_AFTER) {
      this.setBase("sleep");
      this.say("Zzz… Ich warte hier.", 2200);
    }
  }

  // ---------------------------------------------------------------- Gehirn
  private scheduleBrain(ms = rand(3800, 7500)) {
    window.clearTimeout(this.brainTimer);
    this.brainTimer = window.setTimeout(() => {
      this.think();
      this.scheduleBrain();
    }, ms);
  }

  private think() {
    if (document.hidden || this.busy() || this.base !== "idle") return;
    const st = this.d.stations();
    // Kaffee fast leer? Dann selbst nachfüllen.
    if (this.d.coffee() < 10 && Math.random() < 0.35 && !this.d.focusing()) {
      this.fetchCoffee();
      return;
    }
    const r = Math.random();
    if (r < 0.34) {
      const { min, max } = this.bounds();
      const tx = clamp(this.x + rand(-420, 420), min, max);
      this.walkTo(tx, false);
    } else if (r < 0.5) {
      this.setPose("idle");
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.lookAt(this.x + dir * 400, window.innerHeight - 300, 1400);
      window.setTimeout(() => this.lookAt(this.x - dir * 400, window.innerHeight - 250, 1400), 1400);
    } else if (r < 0.6) {
      this.jump(0.75, "happy");
    } else if (r < 0.74) {
      this.walkTo(st.duck + 54, false, () => {
        this.facing = -1;
        this.setPose("think", 2600);
        if (Math.random() < 0.5) this.say(pick(["Liebe Ente, hör zu: Der Bug ist…", "Quak? Ach so, klar!", "Rubber-Duck-Debugging läuft."]), 2600);
      });
    } else if (r < 0.82 && st.server != null) {
      this.walkTo(st.server - 48, false, () => {
        this.facing = 1;
        this.setPose("lookup", 1600);
        if (Math.random() < 0.4) this.say("Server-Check: alles grün.", 2200);
      });
    } else if (r < 0.9) {
      this.setPose("sit", 3600);
    } else {
      this.setPose("wave", 1600);
    }
  }

  // ----------------------------------------------------------------- Input
  private bindInput() {
    const root = this.d.root;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.grabCandidate = { x: e.clientX, y: e.clientY, id: e.pointerId };
      root.setPointerCapture(e.pointerId);
      this.history = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    };
    const onMove = (e: PointerEvent) => {
      if (!this.grabCandidate || e.pointerId !== this.grabCandidate.id) return;
      this.pointer = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.history.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (this.history.length > 8) this.history.shift();
      if (!this.grabbed && Math.hypot(e.clientX - this.grabCandidate.x, e.clientY - this.grabCandidate.y) > 6 && !runtime.reduced) {
        this.grab();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!this.grabCandidate || e.pointerId !== this.grabCandidate.id) return;
      this.grabCandidate = null;
      if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
      if (this.grabbed) this.release();
      else this.clickPoke();
    };
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);

    // Globale Aktivität + Blick folgt dem Mauszeiger.
    let lastPing = 0;
    const onGlobalMove = (e: PointerEvent) => {
      const now = performance.now();
      this.pointer = { x: e.clientX, y: e.clientY, t: now };
      if (now - lastPing > 250) {
        lastPing = now;
        this.lastActive = now;
        if (this.base === "sleep" && e.pointerType === "mouse") return; // Mausbewegung allein weckt ihn nicht.
        this.wake();
      }
    };
    const onActive = () => this.activity();
    window.addEventListener("pointermove", onGlobalMove, { passive: true });
    window.addEventListener("keydown", onActive);
    window.addEventListener("pointerdown", onActive, { passive: true });
    window.addEventListener("wheel", onActive, { passive: true });
    const onResize = () => {
      const { min, max } = this.bounds();
      this.x = clamp(this.x, min, max);
      this.groundCache = -1;
      this.write();
    };
    window.addEventListener("resize", onResize);
    this.cleanups.push(() => {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointermove", onGlobalMove);
      window.removeEventListener("keydown", onActive);
      window.removeEventListener("pointerdown", onActive);
      window.removeEventListener("wheel", onActive);
      window.removeEventListener("resize", onResize);
    });
  }

  private grab() {
    this.grabbed = true;
    this.target = null;
    this.onArrive = null;
    this.grounded = false;
    const r = this.d.root.getBoundingClientRect();
    this.ground = r.bottom + this.y;
    this.d.body.classList.add("is-grabbed");
    this.setPose("dangle");
    sfx.pick();
    if (Math.random() < 0.5) this.say(pick(["Hey! Wohin geht's?", "Uiii, Höhenangst!", "Vorsicht, zerbrechlich!"]), 1800);
    this.wake();
  }

  private release() {
    this.grabbed = false;
    this.d.body.classList.remove("is-grabbed");
    const h = this.history;
    const a = h[0];
    const b = h[h.length - 1];
    const dt = Math.max(16, b.t - a.t) / 1000;
    let vx = (b.x - a.x) / dt;
    let vy = -(b.y - a.y) / dt;
    const sp = Math.hypot(vx, vy);
    if (sp > 2600) {
      vx *= 2600 / sp;
      vy *= 2600 / sp;
    }
    this.vx = vx;
    this.vy = vy;
    this.setPose("jump");
    if (sp > 1300) this.say("Wuiiiii!", 1200);
    this.wake();
  }

  /** Bildschirm-Y der Standfläche (gecacht, nur bei Resize neu gemessen). */
  private groundY() {
    if (this.groundCache < 0) this.groundCache = this.d.root.getBoundingClientRect().bottom + this.y;
    return this.groundCache;
  }

  // ---------------------------------------------------------------- Physik
  wake() {
    if (this.raf || this.destroyed) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (t: number) => {
    this.raf = 0;
    if (this.destroyed) return;
    const dt = Math.min(0.034, (t - this.last) / 1000);
    this.last = t;
    const { min, max } = this.bounds();

    if (this.grabbed) {
      const topY = Math.max(0, this.ground - this.pointer.y - 70);
      const px = this.x;
      const py = this.y;
      const k = Math.min(1, dt * 16);
      this.x += (clamp(this.pointer.x, min, max) - this.x) * k;
      this.y += (topY - this.y) * k;
      this.vx = (this.x - px) / Math.max(dt, 0.001);
      this.vy = (this.y - py) / Math.max(dt, 0.001);
    } else {
      if (this.grounded && this.target != null) {
        const dir = Math.sign(this.target - this.x);
        const maxSp = this.running ? RUN : WALK;
        this.vx += dir * (this.running ? 1500 : 700) * dt;
        this.vx = clamp(this.vx, -maxSp, maxSp);
        this.facing = dir || this.facing;
        const remaining = (this.target - this.x) * dir;
        // Abbremsen kurz vor dem Ziel.
        if (remaining < 40) this.vx = dir * Math.max(40, Math.min(Math.abs(this.vx), remaining * 5));
        if (remaining <= 2) {
          this.x = this.target;
          this.vx = 0;
          this.target = null;
          const cb = this.onArrive;
          this.onArrive = null;
          this.setPose(this.base === "focus" ? "focus" : "idle");
          cb?.();
        }
        if (this.running && this.target != null) {
          this.dustAcc += dt;
          if (this.dustAcc > 0.16) {
            this.dustAcc = 0;
            fx.burst(this.x - this.facing * 16, this.groundY() - 4, "dust", { count: 2, power: 0.6 });
          }
        }
      } else if (this.grounded) {
        this.vx *= Math.pow(0.001, dt);
        if (Math.abs(this.vx) < 1) this.vx = 0;
      }

      if (!this.grounded) {
        this.vy -= GRAVITY * dt;
        this.vx *= Math.pow(0.9, dt);
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Wände und Decke
      if (this.x < min) {
        this.x = min;
        this.vx = Math.abs(this.vx) * (this.grounded ? 0 : 0.5);
      } else if (this.x > max) {
        this.x = max;
        this.vx = -Math.abs(this.vx) * (this.grounded ? 0 : 0.5);
      }
      const ceiling = window.innerHeight - 150;
      if (this.y > ceiling) {
        this.y = ceiling;
        this.vy = -Math.abs(this.vy) * 0.3;
      }

      // Landung
      if (!this.grounded && this.y <= 0 && this.vy <= 0) {
        const impact = -this.vy;
        this.y = 0;
        const r = { left: this.x - HALF_W, width: HALF_W * 2, bottom: this.groundY() };
        if (impact > 560) {
          this.vy = impact * 0.36;
          this.sqv -= impact * 0.0045;
          fx.burst(r.left + r.width / 2, r.bottom - 2, "puff", { count: 5, power: impact / 900 });
          sfx.land();
          if (impact > 1250) this.afterLand = "dizzy";
        } else {
          this.vy = 0;
          this.grounded = true;
          this.sqv -= impact * 0.005;
          if (impact > 200) {
            fx.burst(r.left + r.width / 2, r.bottom - 2, "dust", { count: 4 });
            sfx.land();
          }
          const next = this.afterLand;
          this.afterLand = null;
          if (next === "dizzy") {
            this.setPose("dizzy", 1800);
            this.say(pick(["Uff… alles dreht sich.", "Wer hat die Schwerkraft angemacht?"]), 2000);
          } else if (next) {
            this.setPose(next, 1700);
          } else if (this.target == null) {
            this.setPose(this.base);
          }
        }
      }
    }

    // Squash & Stretch: in der Luft gestreckt, beim Aufprall gestaucht (volumenerhaltend).
    const sqTarget = this.grounded || this.grabbed ? (this.grabbed ? 0.06 : 0) : clamp(Math.abs(this.vy) / 2800, 0, 0.22);
    this.sqv += (-(this.sq - sqTarget) * 420 - this.sqv * 16) * dt;
    this.sq += this.sqv * dt;
    this.sq = clamp(this.sq, -0.35, 0.35);

    // Antenne schwingt nach (Follow-through).
    const antTarget = clamp(-this.vx * 0.05 * this.facing, -38, 38) + (this.grounded ? 0 : clamp(this.vy * 0.012, -20, 20));
    this.antv += (-(this.ant - antTarget) * 150 - this.antv * 5) * dt;
    this.ant += this.antv * dt;

    // Pendeln, wenn er getragen oder geworfen wird.
    const swingTarget = this.grabbed ? clamp(-this.vx * 0.035, -40, 40) : this.grounded ? 0 : clamp(this.vx * 0.01, -18, 18);
    this.swingv += (-(this.swing - swingTarget) * (this.grabbed ? 60 : 200) - this.swingv * (this.grabbed ? 3 : 18)) * dt;
    this.swing += this.swingv * dt;

    // Augen folgen Ziel oder Mauszeiger.
    const now = performance.now();
    let lx = 0;
    let ly = 0;
    const headX = this.x;
    const headY = this.groundY() - this.y - 60;
    const tgt = this.look && this.look.until > now ? this.look : now - this.pointer.t < 4000 && this.pointer.x >= 0 ? this.pointer : null;
    if (tgt) {
      lx = clamp((tgt.x - headX) / 260, -1, 1) * this.facing;
      ly = clamp((tgt.y - headY) / 260, -1, 1);
    }
    if (this.look && this.look.until <= now) this.look = null;
    this.eyeX += (lx - this.eyeX) * Math.min(1, dt * 10);
    this.eyeY += (ly - this.eyeY) * Math.min(1, dt * 10);

    this.write();

    const settled =
      this.grounded &&
      !this.grabbed &&
      this.target == null &&
      Math.abs(this.vx) < 0.5 &&
      Math.abs(this.sq) < 0.002 &&
      Math.abs(this.sqv) < 0.01 &&
      Math.abs(this.ant) < 0.2 &&
      Math.abs(this.antv) < 0.2 &&
      Math.abs(this.swing) < 0.2 &&
      Math.abs(this.eyeX - lx) < 0.01 &&
      Math.abs(this.eyeY - ly) < 0.01;
    if (!settled) this.raf = requestAnimationFrame(this.frame);
  };

  write() {
    const { root, body, flip, shadow } = this.d;
    const sy = 1 + this.sq;
    const sx = 1 / Math.max(0.6, sy);
    root.style.transform = `translate3d(${(this.x - HALF_W).toFixed(1)}px, ${(-this.y).toFixed(1)}px, 0)`;
    body.style.transform = `rotate(${this.swing.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    flip.style.transform = `scaleX(${this.facing})`;
    body.style.setProperty("--ant", `${this.ant.toFixed(1)}deg`);
    body.style.setProperty("--lx", this.eyeX.toFixed(3));
    body.style.setProperty("--ly", this.eyeY.toFixed(3));
    const h = clamp(this.y / 320, 0, 0.75);
    shadow.style.transform = `translate3d(${(this.x - 26).toFixed(1)}px, 0, 0) scale(${(1 - h).toFixed(3)})`;
    shadow.style.opacity = (0.5 * (1 - h)).toFixed(3);
  }
}
