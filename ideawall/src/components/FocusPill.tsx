import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Square, Timer } from "lucide-react";
import { useWorld } from "../state/world";
import { sfx } from "../lib/sound";

const DURATIONS = [15, 25, 50];

export function FocusPill() {
  const { focus, pauseFocus, resumeFocus, stopFocus, startFocus } = useWorld();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (focus.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [focus.status]);

  const total = focus.minutes * 60_000;
  const left = focus.status === "running" ? Math.max(0, focus.endsAt - now) : focus.remaining;
  const progress = total ? 1 - left / total : 0;
  const mm = String(Math.floor(left / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");
  const C = 2 * Math.PI * 20;

  return (
    <AnimatePresence>
      {focus.status !== "idle" && (
        <motion.div
          className={`focus-pill ${focus.status === "paused" ? "is-paused" : ""}`}
          role="timer"
          aria-live="off"
          aria-label={`Fokus-Timer: noch ${mm} Minuten ${ss} Sekunden`}
          initial={{ y: -120, scaleX: 0.6, rotate: -4 }}
          animate={{ y: 0, scaleX: 1, rotate: 0 }}
          exit={{ y: -120, opacity: 0, transition: { duration: 0.25 } }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
        >
          <svg className="focus-ring" viewBox="0 0 48 48" aria-hidden>
            <circle cx="24" cy="24" r="20" className="focus-ring-bg" />
            <circle cx="24" cy="24" r="20" className="focus-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <Timer className="focus-icon size-5" strokeWidth={2.6} aria-hidden />
          <div className="focus-info">
            <span className="focus-label">{focus.status === "paused" ? "Pausiert" : "Fokus-Modus"}</span>
            <span className="focus-time">
              {mm}:{ss}
            </span>
          </div>
          <div className="focus-durations" role="group" aria-label="Dauer wählen">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={focus.minutes === d ? "is-active" : ""}
                aria-pressed={focus.minutes === d}
                onClick={() => {
                  sfx.pop();
                  startFocus(d);
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-btn icon-btn-sm"
            aria-label={focus.status === "paused" ? "Fortsetzen" : "Pausieren"}
            onClick={() => {
              sfx.press();
              if (focus.status === "paused") resumeFocus();
              else pauseFocus();
            }}
          >
            {focus.status === "paused" ? <Play className="size-4" strokeWidth={2.8} /> : <Pause className="size-4" strokeWidth={2.8} />}
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-sm icon-btn-danger"
            aria-label="Fokus beenden"
            onClick={() => {
              sfx.release();
              stopFocus();
            }}
          >
            <Square className="size-4" strokeWidth={2.8} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
