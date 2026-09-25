import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Eye, MousePointer2, Settings2 } from "lucide-react";
import { DEFAULT_PREFS, normalizePrefs, possessive, WIDGETS, type Prefs, type WidgetId, type WidgetSize } from "./prefs";
import { themeById, type ThemeId } from "./themes";
import { usePersistent } from "./lib/usePersistent";
import { useFxLevel } from "./lib/fxLevel";
import { useNow } from "./lib/clock";
import { getDayInfo } from "./lib/time";
import { setSound, sfx } from "./lib/sfx";
import { WidgetCard } from "./components/WidgetCard";
import { SettingsPanel } from "./components/SettingsPanel";
import { EndPill } from "./components/EndPill";
import { Alerts } from "./components/Alerts";
import { Toasts } from "./components/Toasts";
import { ThemeDrawer } from "./components/ThemeDrawer";
import { Ambient } from "./ambient/Ambient";
import { CursorLayer } from "./cursor/CursorLayer";
import { CursorStudio } from "./cursor/CursorStudio";
import { ClockWidget } from "./widgets/ClockWidget";
import { WorkdayWidget } from "./widgets/WorkdayWidget";
import { WeekWidget } from "./widgets/WeekWidget";
import { FocusWidget } from "./widgets/FocusWidget";
import { BoardWidget } from "./widgets/BoardWidget";
import { TodoWidget } from "./widgets/TodoWidget";
import { LinksWidget } from "./widgets/LinksWidget";
import type { ResolvedFx } from "./lib/fxLevel";
import type { Theme } from "./themes";

const NEXT_SIZE: Record<WidgetSize, WidgetSize> = { s: "m", m: "l", l: "s" };

export default function App() {
  const [stored, setStored] = usePersistent<Prefs>("prefs-v3", DEFAULT_PREFS);
  const prefs = useMemo(() => normalizePrefs(stored), [stored]);
  const setPrefs = useCallback((fn: (p: Prefs) => Prefs) => setStored((s) => fn(normalizePrefs(s))), [setStored]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const fx = useFxLevel(prefs.fx);
  const theme = themeById(prefs.theme);
  const accent = prefs.accent === "theme" ? theme.vars["--accent"] : prefs.accent;
  const title = `${possessive(prefs.name)} Dashboard`;

  // Theme, Akzent und Effektstufe aufs Dokument anwenden
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
    root.style.setProperty("--accent", accent);
    root.dataset.theme = theme.id;
    root.dataset.light = theme.light ? "true" : "false";
    root.dataset.fx = fx;
    root.style.colorScheme = theme.light ? "light" : "dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.vars["--bg"]);
  }, [theme, accent, fx]);

  useEffect(() => setSound(prefs.sound), [prefs.sound]);

  useEffect(() => {
    if (!document.title.includes("Fokus")) document.title = title;
  }, [title]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Versteckt: Taste T öffnet die Themen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || t?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "t" || e.key === "T") setThemesOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pickTheme = useCallback(
    (id: ThemeId, origin: { x: number; y: number }) => {
      if (id === prefs.theme) return;
      sfx.toggle();
      const apply = () => flushSync(() => setPrefs((p) => ({ ...p, theme: id })));
      const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
      if (!doc.startViewTransition || fx === "low") {
        apply();
        return;
      }
      const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
      doc
        .startViewTransition(apply)
        .ready.then(() =>
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
            { duration: 750, easing: "cubic-bezier(.65,0,.2,1)", pseudoElement: "::view-transition-new(root)" },
          ),
        )
        .catch(() => undefined);
    },
    [prefs.theme, setPrefs, fx],
  );

  const visible = prefs.order.filter((id) => !prefs.hidden.includes(id));

  const swap = useCallback(
    (a: WidgetId, b: WidgetId) =>
      setPrefs((p) => {
        const order = [...p.order];
        const i = order.indexOf(a);
        const j = order.indexOf(b);
        if (i < 0 || j < 0) return p;
        [order[i], order[j]] = [order[j], order[i]];
        return { ...p, order };
      }),
    [setPrefs],
  );

  const step = useCallback(
    (id: WidgetId, dir: -1 | 1) =>
      setPrefs((p) => {
        const vis = p.order.filter((w) => !p.hidden.includes(w));
        const other = vis[vis.indexOf(id) + dir];
        if (!other) return p;
        const order = [...p.order];
        const i = order.indexOf(id);
        const j = order.indexOf(other);
        [order[i], order[j]] = [order[j], order[i]];
        return { ...p, order };
      }),
    [setPrefs],
  );

  const resize = useCallback((id: WidgetId) => setPrefs((p) => ({ ...p, sizes: { ...p.sizes, [id]: NEXT_SIZE[p.sizes[id]] } })), [setPrefs]);
  const hide = useCallback((id: WidgetId) => setPrefs((p) => ({ ...p, hidden: [...p.hidden, id] })), [setPrefs]);

  const render = (id: WidgetId) => {
    switch (id) {
      case "clock":
        return <ClockWidget prefs={prefs} />;
      case "workday":
        return <WorkdayWidget prefs={prefs} />;
      case "week":
        return <WeekWidget prefs={prefs} />;
      case "focus":
        return <FocusWidget title={title} prefs={prefs} />;
      case "todo":
        return <TodoWidget />;
      case "board":
        return <BoardWidget />;
      case "links":
        return <LinksWidget />;
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <AmbientHost theme={theme} prefs={prefs} fx={fx} accent={accent} />
      <div className="shell">
        <header className={`topbar ${scrolled ? "is-scrolled" : ""}`}>
          <div className="brand">
            <button
              type="button"
              className="brand-mark"
              aria-label="Themen (Doppelklick)"
              onDoubleClick={() => {
                setThemesOpen(true);
                sfx.pop();
              }}
            >
              {(prefs.name.trim() || "J").slice(0, 1).toUpperCase()}
            </button>
            <span className="brand-name">{title}</span>
          </div>
          <EndPill prefs={prefs} />
          <div className="topbar-tools">
            <button
              type="button"
              className={`icon-btn ${studioOpen ? "is-on" : ""}`}
              aria-label="Mauszeiger"
              title="Mauszeiger"
              onClick={() => {
                setStudioOpen(true);
                sfx.pop();
              }}
            >
              <MousePointer2 size={17} />
            </button>
            <button
              type="button"
              className={`icon-btn ${settingsOpen ? "is-on" : ""}`}
              aria-label="Einstellungen"
              aria-expanded={settingsOpen}
              title="Einstellungen"
              onClick={() => {
                setSettingsOpen((s) => !s);
                sfx.pop();
              }}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {settingsOpen && <SettingsPanel prefs={prefs} setPrefs={setPrefs} onClose={() => setSettingsOpen(false)} fxResolved={fx} />}
        </AnimatePresence>

        <main className="grid-main">
          {visible.map((id, i) => (
            <WidgetCard key={id} id={id} index={i} size={prefs.sizes[id]} onSwap={swap} onStep={step} onResize={resize} onHide={hide}>
              {render(id)}
            </WidgetCard>
          ))}
        </main>

        {prefs.hidden.length > 0 && (
          <div className="hidden-bar">
            {prefs.hidden.map((id) => (
              <button key={id} type="button" className="chip" onClick={() => setPrefs((p) => ({ ...p, hidden: p.hidden.filter((h) => h !== id) }))}>
                <Eye size={13} /> {WIDGETS[id].title}
              </button>
            ))}
          </div>
        )}
      </div>

      <Alerts prefs={prefs} />
      <Toasts />
      <AnimatePresence>
        {studioOpen && (
          <CursorStudio
            traits={prefs.cursor}
            enabled={prefs.cursorOn}
            lowPower={fx === "low"}
            onChange={(cursor) => setPrefs((p) => ({ ...p, cursor }))}
            onToggle={(cursorOn) => setPrefs((p) => ({ ...p, cursorOn }))}
            onClose={() => setStudioOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{themesOpen && <ThemeDrawer current={prefs.theme} onPick={pickTheme} onClose={() => setThemesOpen(false)} />}</AnimatePresence>
      <CursorLayer traits={prefs.cursor} enabled={prefs.cursorOn} themeKey={`${theme.id}-${accent}`} lowPower={fx === "low"} />
    </MotionConfig>
  );
}

/** Eigene Komponente, damit der Sekundentakt nicht die ganze App neu rendert. */
function AmbientHost({ theme, prefs, fx, accent }: { theme: Theme; prefs: Prefs; fx: ResolvedFx; accent: string }) {
  const now = useNow();
  const phase = getDayInfo(now, prefs).phase;
  return <Ambient theme={theme} phase={phase} fx={fx} accent={accent} />;
}
