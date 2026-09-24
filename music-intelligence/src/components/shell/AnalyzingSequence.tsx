"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";

const STEPS = [
  "Connecting Spotify",
  "Analyzing your music",
  "Building your Music DNA",
  "Mapping your listening habits",
  "Your music universe",
];

const SEGMENTS = 28;

/**
 * Branded loading sequence. Progress advances with time but never reaches the
 * final step until the data is actually ready.
 */
export function AnalyzingSequence({ ready, onFinished, minimumMs = 3200 }: { ready: boolean; onFinished: () => void; minimumMs?: number }) {
  const [start] = useState(() => performance.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setElapsed(performance.now() - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start]);

  const timeProgress = Math.min(1, elapsed / minimumMs);
  // Asymptotic while waiting on data so the bar never lies about completion.
  const progress = ready ? timeProgress : Math.min(0.86, 1 - Math.exp(-elapsed / 2600));
  const done = ready && timeProgress >= 1;
  const step = done ? STEPS.length - 1 : Math.min(STEPS.length - 2, Math.floor(progress * (STEPS.length - 1)));

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onFinished, 900);
    return () => clearTimeout(t);
  }, [done, onFinished]);

  const filled = Math.round(progress * SEGMENTS);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-ink/80 px-6 py-8 backdrop-blur-2xl sm:px-12 sm:py-12"
      exit={{ opacity: 0, scale: 1.04, filter: "blur(12px)" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      aria-live="polite"
      aria-label={STEPS[step]}
    >
      <Wordmark className="text-base text-fg-2" />

      <div className="max-w-5xl">
        <div className="relative h-[1.1em] overflow-hidden text-[clamp(2.2rem,6.5vw,5.5rem)] leading-none font-semibold tracking-[-0.045em]">
          <AnimatePresence mode="popLayout">
            <motion.p
              key={step}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={step === STEPS.length - 1 ? "font-serif font-normal italic tracking-[-0.02em]" : ""}
            >
              {STEPS[step]}
              {step < STEPS.length - 1 && <span className="text-[var(--accent)]">…</span>}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex h-3 max-w-2xl gap-[3px]" aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className="flex-1 rounded-[1px] transition-colors duration-500"
              style={{ backgroundColor: i < filled ? "var(--accent)" : "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>

        <ol className="mt-8 grid gap-2 font-mono text-[11px] tracking-[0.14em] uppercase sm:grid-cols-2">
          {STEPS.slice(0, -1).map((s, i) => (
            <li key={s} className={`flex items-center gap-3 transition-colors duration-500 ${i < step || done ? "text-fg-2" : i === step ? "text-fg" : "text-faint"}`}>
              <span className="numeric w-6 text-faint">{String(i + 1).padStart(2, "0")}</span>
              {s}
              {(i < step || done) && <span className="text-[var(--accent)]">✓</span>}
            </li>
          ))}
        </ol>
      </div>

      <p className="max-w-md text-xs leading-relaxed text-faint">
        Reading your top artists and tracks, recent plays and playlists from Spotify. Nothing is stored beyond your session.
      </p>
    </motion.div>
  );
}
