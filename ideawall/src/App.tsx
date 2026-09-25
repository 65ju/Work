import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { SettingsProvider, useSettings } from "./state/settings";
import { NotesProvider } from "./state/notes";
import { WorldProvider } from "./state/world";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { QuickActions } from "./components/QuickActions";
import { DayPanel } from "./components/DayPanel";
import { StatusPanel } from "./components/StatusPanel";
import { Board } from "./components/board/Board";
import { FocusPill } from "./components/FocusPill";
import { IdeaDialog } from "./components/IdeaDialog";
import { SettingsDialog } from "./components/SettingsDialog";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { Intro } from "./components/Intro";
import { BuddyWorld } from "./buddy/Buddy";
import { ComicLayer, FxCanvas, Toasts } from "./fx/FxLayer";
import { bus, centerOf } from "./lib/bus";

export default function App() {
  return (
    <SettingsProvider>
      <NotesProvider>
        <WorldProvider>
          <Shell />
        </WorldProvider>
      </NotesProvider>
    </SettingsProvider>
  );
}

function Shell() {
  const { reduced, settings, calibrate } = useSettings();
  const [ready, setReady] = useState(false);
  const onIntroDone = useCallback(() => {
    setReady(true);
    calibrate();
  }, [calibrate]);
  useHotkeys();

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      <div className="page-bg" aria-hidden="true" />
      <a href="#board" className="skip-link">
        Zum Board springen
      </a>
      <Header />
      <main id="main" className={settings.buddy ? "with-buddy" : ""}>
        <Hero ready={ready} />
        <QuickActions />
        <div className="dash-grid">
          <DayPanel />
          <StatusPanel />
        </div>
        <Board />
        <footer className="site-footer">
          <p>
            Gebaut für Julian · Alle Daten bleiben lokal in deinem Browser · Drück <kbd>?</kbd> für Tastenkürzel
          </p>
        </footer>
      </main>

      <FocusPill />
      <MobileFab />
      <IdeaDialog />
      <SettingsDialog />
      <ShortcutsDialog />
      <FxCanvas />
      <ComicLayer />
      <Toasts />
      <BuddyWorld active={ready} />
      {settings.fps && <FpsMeter />}
      <Intro onDone={onIntroDone} />
    </MotionConfig>
  );
}

const HOTKEY_ACTIONS: Record<string, string> = { n: "note", f: "focus", r: "idea", a: "arrange", m: "theme", b: "buddy" };

function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable='true']") || t.closest("[role='dialog']"))) return;
      if (document.querySelector("[role='dialog']")) return;
      if (t?.closest(".note") && [" ", "Enter", "Delete", "Backspace"].includes(e.key)) return;
      const key = e.key.toLowerCase();
      if (HOTKEY_ACTIONS[key]) {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>(`[data-action="${HOTKEY_ACTIONS[key]}"]`)?.click();
      } else if (e.key === "/") {
        e.preventDefault();
        bus.emit("search:focus");
      } else if (e.key === "?") {
        e.preventDefault();
        bus.emit("shortcuts:open");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function MobileFab() {
  return (
    <motion.button
      type="button"
      className="mobile-fab"
      aria-label="Neue Notiz"
      whileTap={{ scale: 0.86, rotate: -10 }}
      transition={{ type: "spring", stiffness: 600, damping: 14 }}
      onClick={(e) => bus.emit("note:new", { from: centerOf(e.currentTarget) })}
    >
      <Plus className="size-7" strokeWidth={3.2} />
    </motion.button>
  );
}

function FpsMeter() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      frames++;
      if (t - last >= 500) {
        const fps = Math.round((frames * 1000) / (t - last));
        if (ref.current) {
          ref.current.textContent = `${fps} FPS`;
          ref.current.dataset.level = fps >= 50 ? "good" : fps >= 30 ? "ok" : "bad";
        }
        frames = 0;
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span ref={ref} className="fps-meter" aria-hidden="true" />;
}
