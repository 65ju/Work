import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Eye, Moon, Settings2, Sun } from "lucide-react";
import { DEFAULT_PREFS, normalizePrefs, possessive, WIDGETS, type Prefs, type WidgetId, type WidgetSize } from "./prefs";
import { usePersistent } from "./lib/usePersistent";
import { WidgetCard } from "./components/WidgetCard";
import { SettingsPanel } from "./components/SettingsPanel";
import { EndPill } from "./components/EndPill";
import { Alerts } from "./components/Alerts";
import { Toasts } from "./components/Toasts";
import { ClockWidget } from "./widgets/ClockWidget";
import { WorkdayWidget } from "./widgets/WorkdayWidget";
import { WeekWidget } from "./widgets/WeekWidget";
import { FocusWidget } from "./widgets/FocusWidget";
import { BoardWidget } from "./widgets/BoardWidget";
import { TodoWidget } from "./widgets/TodoWidget";
import { LinksWidget } from "./widgets/LinksWidget";

const NEXT_SIZE: Record<WidgetSize, WidgetSize> = { s: "m", m: "l", l: "s" };

export default function App() {
  const [stored, setStored] = usePersistent<Prefs>("prefs-v3", DEFAULT_PREFS);
  const prefs = useMemo(() => normalizePrefs(stored), [stored]);
  const setPrefs = useCallback((fn: (p: Prefs) => Prefs) => setStored((s) => fn(normalizePrefs(s))), [setStored]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const title = `${possessive(prefs.name)} Dashboard`;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.style.setProperty("--accent", prefs.accent);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", prefs.theme === "dark" ? "#0d0f14" : "#f3f4f7");
  }, [prefs.theme, prefs.accent]);

  useEffect(() => {
    if (!document.title.includes("Fokus")) document.title = title;
  }, [title]);

  const visible = prefs.order.filter((id) => !prefs.hidden.includes(id));
  const hiddenCount = prefs.hidden.length;

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
        return <ClockWidget name={prefs.name} />;
      case "workday":
        return <WorkdayWidget prefs={prefs} />;
      case "week":
        return <WeekWidget prefs={prefs} />;
      case "focus":
        return <FocusWidget title={title} />;
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
      <div className="bg" aria-hidden />
      <div className="shell">
        <header className={`topbar ${scrolled ? "is-scrolled" : ""}`}>
          <div className="brand">
            <span className="brand-mark" aria-hidden>
              {(prefs.name.trim() || "J").slice(0, 1).toUpperCase()}
            </span>
            <span className="brand-name">{title}</span>
          </div>
          <EndPill prefs={prefs} />
          <div className="topbar-tools">
            <button
              type="button"
              className="icon-btn"
              aria-label={prefs.theme === "dark" ? "Helles Design" : "Dunkles Design"}
              title="Design wechseln"
              onClick={() => setPrefs((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))}
            >
              {prefs.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              type="button"
              className={`icon-btn ${settingsOpen ? "is-on" : ""}`}
              aria-label="Einstellungen"
              aria-expanded={settingsOpen}
              title="Einstellungen"
              onClick={() => setSettingsOpen((s) => !s)}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>

        <AnimatePresence>{settingsOpen && <SettingsPanel prefs={prefs} setPrefs={setPrefs} onClose={() => setSettingsOpen(false)} />}</AnimatePresence>

        <main className="grid-main">
          {visible.map((id) => (
            <WidgetCard key={id} id={id} size={prefs.sizes[id]} onSwap={swap} onStep={step} onResize={resize} onHide={hide}>
              {render(id)}
            </WidgetCard>
          ))}
        </main>

        {hiddenCount > 0 && (
          <div className="hidden-bar">
            <span className="muted">Ausgeblendet:</span>
            {prefs.hidden.map((id) => (
              <button key={id} type="button" className="chip" onClick={() => setPrefs((p) => ({ ...p, hidden: p.hidden.filter((h) => h !== id) }))}>
                <Eye size={13} /> {WIDGETS[id].title}
              </button>
            ))}
          </div>
        )}

        <footer className="foot">Widgets am Griff ziehen und auf einem anderen ablegen · Zettel frei herumwerfen · alles bleibt lokal in deinem Browser</footer>
      </div>
      <Alerts prefs={prefs} />
      <Toasts />
    </MotionConfig>
  );
}
