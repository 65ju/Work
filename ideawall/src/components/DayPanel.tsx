import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, CheckCheck, ListTodo, PartyPopper, Quote, Timer } from "lucide-react";
import { dateFmt, dayKey, dayOfYear, formatMinutes, isoWeek } from "../lib/time";
import { MOTIVATIONS } from "../data/content";
import { useNotes } from "../state/notes";
import { useWorld } from "../state/world";
import { useTilt } from "../lib/useTilt";
import { sfx } from "../lib/sound";
import { bus, centerOf } from "../lib/bus";
import { NOTE_COLORS } from "../data/content";

export function DayPanel() {
  const ref = useRef<HTMLElement>(null);
  useTilt(ref, 3);
  const now = useNow();
  const { notes, update } = useNotes();
  const { focusToday, focus } = useWorld();
  const today = dayKey(now);
  const open = notes.filter((n) => !n.done).length;
  const doneToday = notes.filter((n) => n.done && n.doneAt && dayKey(new Date(n.doneAt)) === today).length;
  const liveFocus =
    focus.status === "running" ? (focus.minutes * 60_000 - Math.max(0, focus.endsAt - now.getTime())) / 60_000 : focus.status === "paused" ? (focus.minutes * 60_000 - focus.remaining) / 60_000 : 0;
  const [mot, setMot] = useState(() => dayOfYear() % MOTIVATIONS.length);
  const priority = notes
    .filter((n) => !n.done && (n.category === "heute" || n.category === "wichtig"))
    .sort((a, b) => (a.category === "wichtig" ? 0 : 1) - (b.category === "wichtig" ? 0 : 1) || a.createdAt - b.createdAt)
    .slice(0, 3);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <section id="tag" ref={ref} className="cel-panel panel-day tilt" aria-labelledby="day-title">
      <header className="panel-head">
        <span className="panel-icon panel-icon-sun">
          <CalendarDays className="size-5" strokeWidth={2.6} />
        </span>
        <div>
          <h2 id="day-title" className="panel-title">
            Tagesübersicht
          </h2>
          <p className="panel-sub">
            {dateFmt.format(now)} · KW {isoWeek(now)}
          </p>
        </div>
      </header>

      <div className="day-grid">
        <div className="clock-card">
          <time className="flip-clock" dateTime={now.toISOString()} aria-label={`Es ist ${hh}:${mm} Uhr`}>
            <FlipDigit value={hh[0]} />
            <FlipDigit value={hh[1]} />
            <span className="flip-colon" aria-hidden>
              <i />
              <i />
            </span>
            <FlipDigit value={mm[0]} />
            <FlipDigit value={mm[1]} />
            <span className="clock-seconds" aria-hidden>
              <motion.span key={ss} initial={{ y: -8, opacity: 0.2 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 700, damping: 18 }}>
                {ss}
              </motion.span>
            </span>
          </time>
        </div>

        <Weather />
      </div>

      <ul className="day-stats">
        <li className="stat stat-cyan">
          <Timer className="size-5" strokeWidth={2.6} aria-hidden />
          <span className="stat-value">{formatMinutes(focusToday + Math.max(0, liveFocus))}</span>
          <span className="stat-label">Fokuszeit heute</span>
        </li>
        <li className="stat stat-coral">
          <ListTodo className="size-5" strokeWidth={2.6} aria-hidden />
          <span className="stat-value">{open}</span>
          <span className="stat-label">Offene Aufgaben</span>
        </li>
        <li className="stat stat-mint">
          <CheckCheck className="size-5" strokeWidth={2.6} aria-hidden />
          <span className="stat-value">{doneToday}</span>
          <span className="stat-label">Heute erledigt</span>
        </li>
      </ul>

      <div className="today-list">
        <h3 className="today-title">Heute wichtig</h3>
        {priority.length ? (
          <ul>
            <AnimatePresence initial={false}>
              {priority.map((n) => (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                >
                  <button
                    type="button"
                    className="today-check"
                    style={{ ["--c" as string]: NOTE_COLORS[n.color].base }}
                    aria-label={`„${n.title}“ als erledigt markieren`}
                    onClick={(e) => {
                      const at = centerOf(e.currentTarget);
                      update(n.id, { done: true, doneAt: Date.now() });
                      if (at) bus.emit("note:done", { ...at, done: true });
                    }}
                  >
                    <Check className="size-4" strokeWidth={3.4} />
                  </button>
                  <span className="today-text">{n.title}</span>
                  <span className="today-cat">{n.category === "wichtig" ? "Wichtig" : "Heute"}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="today-empty">
            <PartyPopper className="size-5" strokeWidth={2.6} aria-hidden /> Alles Wichtige erledigt. Stark!
          </p>
        )}
      </div>

      <button
        type="button"
        className="motivation"
        onClick={() => {
          sfx.flip();
          setMot((m) => (m + 1) % MOTIVATIONS.length);
        }}
        aria-label={`Tagesmotivation: ${MOTIVATIONS[mot]} – klicken für die nächste`}
      >
        <Quote className="motivation-quote size-6" strokeWidth={2.8} aria-hidden />
        <span className="motivation-stage">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={mot}
              className="motivation-text"
              initial={{ rotateX: -90, opacity: 0, y: 10 }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              exit={{ rotateX: 90, opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              {MOTIVATIONS[mot]}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="motivation-hint">Tagesmotivation · klick für mehr</span>
      </button>
    </section>
  );
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t = 0;
    const tick = () => {
      setNow(new Date());
      t = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    t = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => window.clearTimeout(t);
  }, []);
  return now;
}

/** Klappziffer: obere Klappe fällt mit Schwerkraft und federt am Anschlag nach. */
const FlipDigit = memo(function FlipDigit({ value }: { value: string }) {
  const [state, setState] = useState({ cur: value, prev: value, n: 0 });
  if (value !== state.cur) setState((s) => ({ cur: value, prev: s.cur, n: s.n + 1 }));
  const { cur, prev, n } = state;
  return (
    <span className="flip" aria-hidden>
      <span className="flip-half flip-top">
        <span>{cur}</span>
      </span>
      <span className="flip-half flip-bottom">
        <span>{n > 0 ? prev : cur}</span>
      </span>
      {n > 0 && (
        <span key={n} className="flip-flap" onAnimationEnd={() => setState((s) => ({ ...s, prev: s.cur }))}>
          <span className="flip-half flip-top flip-front">
            <span>{prev}</span>
          </span>
          <span className="flip-half flip-bottom flip-back">
            <span>{cur}</span>
          </span>
        </span>
      )}
    </span>
  );
});

const WEATHER = [
  { label: "Heiter bis wolkig", temp: 18, kind: "partly" },
  { label: "Sonnig", temp: 22, kind: "sun" },
  { label: "Leichter Regen", temp: 14, kind: "rain" },
  { label: "Bewölkt", temp: 16, kind: "cloud" },
] as const;

function Weather() {
  const w = WEATHER[dayOfYear() % WEATHER.length];
  return (
    <div className={`weather weather-${w.kind}`}>
      <svg viewBox="0 0 120 90" className="weather-art" aria-hidden>
        {w.kind !== "cloud" && w.kind !== "rain" && (
          <g transform={w.kind === "sun" ? "translate(60 45)" : "translate(40 36)"}>
            <g className="w-sun">
            <g className="w-rays">
              {Array.from({ length: 8 }).map((_, i) => (
                <rect key={i} x="-3" y="-38" width="6" height="12" rx="3" transform={`rotate(${i * 45})`} className="w-ray" />
              ))}
            </g>
            <circle r="22" className="w-sun-body" />
            <path d="M 15 -16 A 22 22 0 0 1 -16 15 A 26 26 0 0 0 15 -16 Z" className="w-sun-shade" />
            <circle r="22" className="w-outline" />
            </g>
          </g>
        )}
        {w.kind !== "sun" && (
          <g className="w-cloud">
            <path d="M28 76 C 12 76 10 56 26 54 C 26 38 48 32 56 44 C 62 30 88 30 90 50 C 106 50 110 74 94 76 Z" className="w-cloud-body" />
            <path d="M14 66 C 40 72 70 64 108 66 L108 80 L14 80 Z" className="w-cloud-shade" clipPath="url(#wclip)" />
            <clipPath id="wclip">
              <path d="M28 76 C 12 76 10 56 26 54 C 26 38 48 32 56 44 C 62 30 88 30 90 50 C 106 50 110 74 94 76 Z" />
            </clipPath>
            <path d="M28 76 C 12 76 10 56 26 54 C 26 38 48 32 56 44 C 62 30 88 30 90 50 C 106 50 110 74 94 76 Z" className="w-outline" />
          </g>
        )}
        {w.kind === "rain" &&
          [36, 56, 76].map((x, i) => <path key={x} d={`M${x} 82 l-4 8`} className="w-drop" style={{ animationDelay: `${i * 0.25}s` }} />)}
      </svg>
      <div className="weather-info">
        <span className="weather-temp">{w.temp}°</span>
        <span className="weather-label">{w.label}</span>
        <span className="weather-demo">Wetter · Demo</span>
      </div>
    </div>
  );
}
