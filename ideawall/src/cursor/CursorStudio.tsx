import { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Dices, MousePointer2, X } from "lucide-react";
import { CursorEngine, type Rect } from "./engine";
import { CURSOR_GROUPS, PRESETS, randomTraits, type CursorTraits, type TraitKey } from "./traits";
import { sfx } from "../lib/sfx";

/* ------------------------------------------------------------------ */
/* Gemeinsamer Takt für alle Vorschauen                               */
/* ------------------------------------------------------------------ */

interface Ticking {
  tick: (dt: number) => void;
  full: boolean;
}

const TickerCtx = createContext<Set<Ticking> | null>(null);

function useTicker(lowPower: boolean) {
  const set = useRef(new Set<Ticking>()).current;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = lowPower ? 1 / 12 : 1 / 24;
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      acc += dt;
      const slow = acc >= step;
      for (const p of set) {
        if (p.full) p.tick(dt);
        else if (slow) p.tick(acc);
      }
      if (slow) acc = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [set, lowPower]);
  return set;
}

type Demo = "path" | "zigzag" | "fast" | "click" | "hover" | "still";

interface PreviewProps {
  traits: CursorTraits;
  demo: Demo;
  width: number;
  height: number;
  interactive?: boolean;
  className?: string;
}

/** Eine Canvas mit eigener Engine, die eine Demo-Bewegung abspielt (oder echte Maus im Spielfeld). */
function Preview({ traits, demo, width, height, interactive, className }: PreviewProps) {
  const ticker = useContext(TickerCtx)!;
  const ref = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CursorEngine | null>(null);
  const live = useRef<{ x: number; y: number; inside: boolean }>({ x: 0, y: 0, inside: false });
  const visible = useRef(true);

  useEffect(() => {
    const canvas = ref.current!;
    const button: Rect =
      demo === "hover" || interactive
        ? { x: width / 2 - (interactive ? 58 : 24), y: height / 2 - (interactive ? 20 : 11), w: interactive ? 116 : 48, h: interactive ? 40 : 22 }
        : { x: -999, y: -999, w: 0, h: 0 };
    let hovering = false;
    const engine = new CursorEngine(canvas, traits, {
      hoverRect: () => (hovering ? button : null),
      backdrop: (ctx) => {
        if (button.w === 0) return;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(button.x, button.y, button.w, button.h, 10);
        ctx.fill();
        ctx.stroke();
        if (interactive) {
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "600 13px Inter Variable, system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Hover mich", button.x + button.w / 2, button.y + button.h / 2 + 1);
        }
        ctx.restore();
      },
    });
    engine.accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7c9cff";
    engine.light = document.documentElement.dataset.light === "true";
    engine.resize(width, height, Math.min(window.devicePixelRatio || 1, interactive ? 2 : 1.5));
    // Nur sichtbare Vorschauen animieren
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    io.observe(canvas);
    engineRef.current = engine;

    let time = Math.random() * 10;
    let clickTimer = 0.4 + Math.random() * 0.6;
    let releaseAt = -1;
    const W = width;
    const H = height;

    const synthetic = (t: number) => {
      switch (demo) {
        case "zigzag": {
          // Sprünge zwischen Ecken mit Pausen – zeigt Nachziehen/Überschwingen.
          const pts = [
            [0.22, 0.3],
            [0.78, 0.3],
            [0.78, 0.72],
            [0.22, 0.72],
          ];
          const seg = Math.floor(t / 0.9) % 4;
          const k = Math.min(1, (t % 0.9) / 0.18);
          const a = pts[seg];
          const b = pts[(seg + 1) % 4];
          return { x: W * (a[0] + (b[0] - a[0]) * k), y: H * (a[1] + (b[1] - a[1]) * k) };
        }
        case "fast":
          return { x: W / 2 + W * 0.36 * Math.sin(t * 2.6), y: H / 2 + H * 0.3 * Math.sin(t * 5.2) };
        case "click":
          return { x: W / 2 + W * 0.08 * Math.sin(t * 0.9), y: H / 2 + H * 0.06 * Math.cos(t * 0.7) };
        case "still":
          return { x: W / 2 + 6 * Math.sin(t * 1.4), y: H / 2 + 4 * Math.cos(t * 1.1) };
        case "hover":
          return { x: W / 2 + W * 0.38 * Math.sin(t * 0.9), y: H / 2 + H * 0.1 * Math.sin(t * 1.8) };
        default:
          return { x: W / 2 + W * 0.32 * Math.sin(t * 1.2), y: H / 2 + H * 0.26 * Math.sin(t * 2.4) };
      }
    };

    const handle: Ticking = {
      full: !!interactive,
      tick: (dt) => {
        if (!visible.current) return;
        time += dt;
        let p: { x: number; y: number };
        if (live.current.inside) p = live.current;
        else {
          p = synthetic(time);
          if (demo === "click" || (interactive && !live.current.inside)) {
            clickTimer -= dt;
            if (clickTimer <= 0) {
              engine.move(p.x, p.y);
              engine.down();
              releaseAt = time + 0.14;
              clickTimer = interactive ? 1.8 : 1.1;
            }
            if (releaseAt > 0 && time >= releaseAt) {
              engine.up();
              releaseAt = -1;
            }
          }
        }
        hovering = p.x >= button.x && p.x <= button.x + button.w && p.y >= button.y && p.y <= button.y + button.h;
        engine.move(p.x, p.y);
        engine.step(dt);
      },
    };
    ticker.add(handle);
    return () => {
      ticker.delete(handle);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, width, height, interactive, ticker]);

  useEffect(() => {
    engineRef.current?.setTraits(traits);
  }, [traits]);

  return (
    <canvas
      ref={ref}
      className={className}
      data-cursor-hide={interactive ? "" : undefined}
      style={{ width, height }}
      onPointerMove={
        interactive
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              live.current = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true };
            }
          : undefined
      }
      onPointerLeave={interactive ? () => (live.current.inside = false) : undefined}
      onPointerDown={interactive ? () => engineRef.current?.down() : undefined}
      onPointerUp={interactive ? () => engineRef.current?.up() : undefined}
    />
  );
}

const DEMO_FOR: Record<TraitKey, Demo> = {
  shape: "path",
  motion: "zigzag",
  trail: "fast",
  click: "click",
  hover: "hover",
  color: "path",
  size: "still",
};

/** Für die Kachel-Vorschau störende Eigenschaften ausblenden, damit man die Option klar sieht. */
function tileTraits(base: CursorTraits, key: TraitKey, id: string): CursorTraits {
  const t = { ...base, [key]: id } as CursorTraits;
  if (key === "click" || key === "motion" || key === "hover") t.trail = "none";
  if (key !== "click") t.click = "none";
  return t;
}

interface StudioProps {
  traits: CursorTraits;
  enabled: boolean;
  lowPower: boolean;
  onChange: (t: CursorTraits) => void;
  onToggle: (on: boolean) => void;
  onClose: () => void;
}

export function CursorStudio({ traits, enabled, lowPower, onChange, onToggle, onClose }: StudioProps) {
  const ticker = useTicker(lowPower);
  const [stage, setStage] = useState({ w: 380, h: 250 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const fit = () => setStage({ w: Math.min(380, window.innerWidth - 72), h: 250 });
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", fit);
    };
  }, [onClose]);

  const presetActive = (p: CursorTraits) => (Object.keys(p) as TraitKey[]).every((k) => p[k] === traits[k]);

  return (
    <TickerCtx.Provider value={ticker}>
      <motion.div
        className="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.16 } }}
        onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Mauszeiger"
          className="studio glass"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.16 } }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        >
          <header className="studio-head">
            <MousePointer2 size={18} className="text-[var(--accent)]" />
            <h2>Mauszeiger</h2>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Eigenen Mauszeiger verwenden"
              className={`switch ${enabled ? "is-on" : ""}`}
              onClick={() => {
                onToggle(!enabled);
                sfx.toggle();
              }}
            >
              <span className="switch-knob" />
            </button>
            <button type="button" className="icon-btn ml-auto" aria-label="Schließen" onClick={onClose}>
              <X size={16} />
            </button>
          </header>

          <div className={`studio-body ${enabled ? "" : "is-off"}`}>
            <aside className="studio-stage">
              <div className="stage-frame">
                <Preview traits={traits} demo="path" width={stage.w} height={stage.h} interactive className="stage-canvas" />
              </div>
              <div className="presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className={`chip ${presetActive(p.traits) ? "is-on" : ""}`}
                    onClick={() => {
                      onChange(p.traits);
                      sfx.pop();
                    }}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="chip chip-dice"
                  aria-label="Zufällige Mischung"
                  title="Zufällige Mischung"
                  onClick={(e) => {
                    onChange(randomTraits());
                    sfx.roll();
                    e.currentTarget.animate([{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 500, easing: "cubic-bezier(.3,1.4,.5,1)" });
                  }}
                >
                  <Dices size={15} />
                </button>
              </div>
            </aside>

            <div className="studio-groups">
              {CURSOR_GROUPS.map((g) => (
                <section key={g.key} className="trait-group">
                  <h3>{g.label}</h3>
                  <div className={`tiles ${g.key === "size" ? "tiles-small" : ""}`}>
                    {g.options.map((o) => {
                      const active = traits[g.key] === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={`tile ${active ? "is-on" : ""}`}
                          aria-pressed={active}
                          onClick={() => {
                            onChange({ ...traits, [g.key]: o.id } as CursorTraits);
                            sfx.pop();
                          }}
                        >
                          <Preview traits={tileTraits(traits, g.key, o.id)} demo={DEMO_FOR[g.key]} width={g.key === "size" ? 92 : 112} height={64} />
                          <span className="tile-label">
                            {active && <Check size={12} strokeWidth={3} />}
                            {o.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </TickerCtx.Provider>
  );
}
