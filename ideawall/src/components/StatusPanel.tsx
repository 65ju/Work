import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Activity, ArrowDown, ArrowUp, Coffee, Cpu, MemoryStick, Network, Zap } from "lucide-react";
import { useNotes } from "../state/notes";
import { useWorld } from "../state/world";
import { useSettings } from "../state/settings";
import { CATEGORIES, NOTE_COLORS } from "../data/content";
import { bus, centerOf } from "../lib/bus";
import { clamp, rand } from "../lib/springs";
import { useTilt } from "../lib/useTilt";
import { usePauseOffscreen } from "../lib/useParallax";
import { fx } from "../fx/fx";

const HISTORY = 28;

interface Sys {
  cpu: number;
  hist: number[];
  ram: number;
  down: number;
  up: number;
  noise: number;
}

function useSimulatedSystem(slow: boolean): Sys {
  const [s, set] = useState<Sys>(() => {
    const hist: number[] = [];
    let v = 30;
    for (let i = 0; i < HISTORY; i++) {
      v = clamp(v + rand(-9, 9), 8, 80);
      hist.push(v);
    }
    return { cpu: v, hist, ram: 6.4, down: 84, up: 12, noise: 0 };
  });
  useEffect(() => {
    const id = window.setInterval(
      () => {
        if (document.hidden) return;
        set((p) => {
          const spike = Math.random() < 0.08 ? rand(20, 38) : 0;
          const cpu = clamp(p.cpu * 0.7 + 30 * 0.3 + rand(-12, 12) + spike, 4, 97);
          return {
            cpu,
            hist: [...p.hist.slice(1), cpu],
            ram: clamp(p.ram + rand(-0.35, 0.4), 4.2, 13.8),
            down: clamp(p.down + rand(-18, 18), 12, 240),
            up: clamp(p.up + rand(-4, 4), 2, 48),
            noise: rand(-1, 1),
          };
        });
      },
      slow ? 3000 : 1600,
    );
    return () => window.clearInterval(id);
  }, [slow]);
  return s;
}

export function StatusPanel() {
  const ref = useRef<HTMLElement>(null);
  useTilt(ref, 3);
  usePauseOffscreen(ref);
  const { tier, settings } = useSettings();
  const sys = useSimulatedSystem(tier === "low");
  const { notes } = useNotes();
  const { coffee, focus, refillCoffee, sessionStart } = useWorld();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const open = notes.filter((n) => !n.done);
  const focusing = focus.status === "running";
  const focusLevel = clamp(40 + (focusing ? 46 : 0) + (coffee - 50) * 0.22 + sys.noise * 5, 4, 98);
  const uptimeMin = Math.floor((now - sessionStart) / 60_000);

  return (
    <section id="status" ref={ref} className="crt tilt" aria-labelledby="status-title">
      <div className="crt-bezel">
        <span className="screw screw-tl" />
        <span className="screw screw-tr" />
        <span className="screw screw-bl" />
        <span className="screw screw-br" />
        <div className="crt-screen">
          <header className="crt-head">
            <span className="led led-ok led-pulse" aria-hidden />
            <h2 id="status-title" className="crt-title">
              Systemstatus: <strong>ONLINE</strong>
            </h2>
            <span className="crt-uptime">
              Uptime {Math.floor(uptimeMin / 60)} h {String(uptimeMin % 60).padStart(2, "0")} min
            </span>
          </header>

          <div className="crt-grid">
            <div className="metric metric-cpu">
              <div className="metric-row">
                <Cpu className="size-4" strokeWidth={2.6} aria-hidden />
                <span className="metric-label">CPU</span>
                <span className="metric-value">{Math.round(sys.cpu)} %</span>
              </div>
              <Sparkline values={sys.hist} />
            </div>

            <div className="metric">
              <div className="metric-row">
                <MemoryStick className="size-4" strokeWidth={2.6} aria-hidden />
                <span className="metric-label">Speicher</span>
                <span className="metric-value">{sys.ram.toFixed(1)} / 16 GB</span>
              </div>
              <Bar value={sys.ram / 16} tone="lavender" />
              <div className="metric-row mt-3">
                <Network className="size-4" strokeWidth={2.6} aria-hidden />
                <span className="metric-label">Netzwerk</span>
                <span className="metric-value net-values">
                  <ArrowDown className="size-3.5" strokeWidth={3} aria-label="Download" />
                  {Math.round(sys.down)}
                  <ArrowUp className="size-3.5" strokeWidth={3} aria-label="Upload" />
                  {Math.round(sys.up)} <small>Mbit/s</small>
                </span>
              </div>
              <div className="net-wire" aria-hidden>
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="metric metric-tasks">
              <div className="metric-row">
                <Activity className="size-4" strokeWidth={2.6} aria-hidden />
                <span className="metric-label">Offene Tasks</span>
                <span className="metric-value">{open.length}</span>
              </div>
              <div className="task-bar" role="img" aria-label={`${open.length} offene Aufgaben nach Kategorie`}>
                {CATEGORIES.map((c) => {
                  const count = open.filter((n) => n.category === c.key).length;
                  if (!count) return null;
                  return (
                    <motion.span
                      key={c.key}
                      layout
                      className="task-seg"
                      style={{ flexGrow: count, background: NOTE_COLORS[c.color].base }}
                      title={`${c.label}: ${count}`}
                      transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    />
                  );
                })}
              </div>
              <ul className="task-legend">
                {CATEGORIES.map((c) => {
                  const count = open.filter((n) => n.category === c.key).length;
                  return count ? (
                    <li key={c.key}>
                      <i style={{ background: NOTE_COLORS[c.color].base }} />
                      {c.label} {count}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>

            <div className="metric metric-coffee">
              <div className="metric-row">
                <Coffee className="size-4" strokeWidth={2.6} aria-hidden />
                <span className="metric-label">Kaffee-Level</span>
                <span className={`metric-value ${coffee < 25 ? "is-critical" : ""}`}>{coffee < 25 ? "Kritisch" : `${Math.round(coffee)} %`}</span>
              </div>
              <div className="coffee-row">
                <CoffeeCup level={coffee} />
                <button
                  type="button"
                  className="mini-btn"
                  onClick={(e) => {
                    const c = centerOf(e.currentTarget);
                    if (c) fx.burst(c.x, c.y, "steam", { count: 6 });
                    if (settings.buddy) bus.emit("coffee:request");
                    else refillCoffee();
                  }}
                >
                  Nachfüllen
                </button>
              </div>
            </div>

            <div className="metric metric-focus">
              <div className="metric-row">
                <Zap className="size-4" strokeWidth={2.6} aria-hidden />
                <span className="metric-label">Fokus-Level</span>
                <span className="metric-value">{Math.round(focusLevel)} %</span>
              </div>
              <Gauge value={focusLevel} />
            </div>
          </div>
          <div className="crt-scanlines" aria-hidden />
          <div className="crt-vignette" aria-hidden />
        </div>
        <div className="crt-foot">
          <span className="crt-brand">BYTE-O-TRON 3000</span>
          <span className="crt-sticker">Nicht ausschalten!</span>
          <span className="crt-power" aria-hidden />
        </div>
      </div>
    </section>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 240;
  const h = 56;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 4 - (v / 100) * (h - 10)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} className="spark-area" />
      <path d={line} className="spark-line" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="4" className="spark-dot" />
    </svg>
  );
}

function Bar({ value, tone }: { value: number; tone: string }) {
  const s = useSpring(value, { stiffness: 140, damping: 16 });
  useEffect(() => s.set(value), [s, value]);
  return (
    <div className={`bar bar-${tone}`} aria-hidden>
      <motion.div className="bar-fill" style={{ scaleX: s }} />
    </div>
  );
}

/** Zeiger mit Feder niedriger Dämpfung – schwingt sichtbar über und pendelt sich ein. */
function Gauge({ value }: { value: number }) {
  const s = useSpring(value, { stiffness: 110, damping: 7 });
  useEffect(() => s.set(value), [s, value]);
  const rotate = useTransform(s, (v) => -90 + (clamp(v, 0, 100) / 100) * 180);
  return (
    <div className="gauge" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label="Fokus-Level">
      <svg viewBox="0 0 140 78" aria-hidden>
        <path d="M 14 70 A 56 56 0 0 1 42 21.5" className="gauge-arc gauge-low" />
        <path d="M 42 21.5 A 56 56 0 0 1 98 21.5" className="gauge-arc gauge-mid" />
        <path d="M 98 21.5 A 56 56 0 0 1 126 70" className="gauge-arc gauge-high" />
        {Array.from({ length: 11 }).map((_, i) => {
          const a = Math.PI - (i / 10) * Math.PI;
          return (
            <line
              key={i}
              x1={70 + Math.cos(a) * 44}
              y1={70 - Math.sin(a) * 44}
              x2={70 + Math.cos(a) * (i % 5 === 0 ? 34 : 38)}
              y2={70 - Math.sin(a) * (i % 5 === 0 ? 34 : 38)}
              className="gauge-tick"
            />
          );
        })}
      </svg>
      <motion.div className="gauge-needle" style={{ rotate }} />
      <span className="gauge-hub" />
    </div>
  );
}

function CoffeeCup({ level }: { level: number }) {
  const lvl = useSpring(level, { stiffness: 50, damping: 13 });
  const slosh = useSpring(0, { stiffness: 140, damping: 3.5 });
  useEffect(() => lvl.set(level), [lvl, level]);
  useEffect(
    () =>
      bus.on("coffee:refilled", () => {
        slosh.jump(18);
        slosh.set(0);
      }),
    [slosh],
  );
  const y = useTransform(lvl, (l) => (1 - clamp(l, 0, 100) / 100) * 62 + 6);
  return (
    <div className={`cup ${level < 25 ? "cup-low" : ""}`} aria-hidden>
      <div className="cup-body">
        <motion.div className="cup-liquid" style={{ y, rotate: slosh }}>
          <svg viewBox="0 0 120 12" preserveAspectRatio="none" className="cup-wave">
            <path d="M0 6 Q 7.5 0 15 6 T 30 6 T 45 6 T 60 6 T 75 6 T 90 6 T 105 6 T 120 6 V12 H0 Z" />
          </svg>
        </motion.div>
        <span className="cup-shine" />
      </div>
      <span className="cup-handle" />
    </div>
  );
}
