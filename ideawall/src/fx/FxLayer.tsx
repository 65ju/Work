import { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { comicStore, fx, particles, toastStore } from "./fx";
import { useSettings } from "../state/settings";
import { spring } from "../lib/springs";

export function FxCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { tier } = useSettings();
  useEffect(() => {
    particles.attach(ref.current);
    const onResize = () => particles.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      particles.attach(null);
    };
  }, []);
  useEffect(() => particles.resize(), [tier]);
  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />;
}

/** Comic-Starburst mit Text – springt am Ort der Aktion auf. */
export function ComicLayer() {
  const items = useSyncExternalStore(comicStore.subscribe, comicStore.get, comicStore.get);
  return (
    <div className="comic-layer" aria-hidden="true">
      <AnimatePresence>
        {items.map((c) => (
          <motion.div
            key={c.id}
            className="comic-burst"
            style={{ left: c.x, top: c.y, ["--burst" as string]: c.color }}
            initial={{ scale: 0, rotate: c.rot - 30, opacity: 1, y: 0 }}
            animate={{ scale: 1, rotate: c.rot, opacity: 1, y: -18 }}
            exit={{ scale: 0.6, opacity: 0, y: -46, transition: { duration: 0.25 } }}
            transition={spring.bouncy}
          >
            <svg viewBox="0 0 200 120" className="comic-burst-shape">
              <path d={BURST_PATH} />
            </svg>
            <span>{c.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const BURST_PATH = (() => {
  const pts: string[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.72 + (i % 4 === 1 ? 0.06 : 0);
    pts.push(`${(100 + Math.cos(a) * 96 * r).toFixed(1)},${(60 + Math.sin(a) * 56 * r).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
})();

const TONE_ICON = { info: Info, success: CheckCircle2, error: TriangleAlert };

export function Toasts() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.get, toastStore.get);
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              className={`toast toast-${t.tone}`}
              initial={{ opacity: 0, y: -24, scale: 0.8, rotate: -3 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
              transition={spring.bouncy}
            >
              <Icon className="size-5 shrink-0" strokeWidth={2.6} aria-hidden />
              <span className="flex-1">{t.text}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    t.action!.run();
                    fx.dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" className="toast-close" aria-label="Meldung schließen" onClick={() => fx.dismiss(t.id)}>
                <X className="size-4" strokeWidth={3} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
