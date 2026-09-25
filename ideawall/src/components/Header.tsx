import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Menu, Moon, Settings, Sun, Volume2, VolumeX, X } from "lucide-react";
import { useSettings } from "../state/settings";
import { bus, centerOf } from "../lib/bus";
import { sfx } from "../lib/sound";

const NAV = [
  { id: "start", label: "Start" },
  { id: "aktionen", label: "Aktionen" },
  { id: "status", label: "Status" },
  { id: "board", label: "Board" },
];

export function Header() {
  const { settings, update } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("start");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy: aktiver Bereich = der, dessen Oberkante zuletzt die Viewport-Mitte passiert hat.
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id === "tag" ? "status" : visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const tag = document.getElementById("tag");
    if (tag) io.observe(tag);
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: document.documentElement.dataset.motion === "reduced" ? "auto" : "smooth", block: "start" });
  };

  const iconButtons = (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label={settings.sound ? "Sound ausschalten" : "Sound einschalten"}
        aria-pressed={settings.sound}
        title="Sound"
        onClick={() => {
          update({ sound: !settings.sound });
          if (!settings.sound) window.setTimeout(sfx.toggle, 30);
        }}
      >
        {settings.sound ? <Volume2 className="size-5" strokeWidth={2.6} /> : <VolumeX className="size-5" strokeWidth={2.6} />}
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-theme hidden sm:grid"
        aria-label={settings.theme === "night" ? "Zur Tagschicht wechseln" : "Zur Nachtschicht wechseln"}
        title="Dark / Light Mood (M)"
        onClick={(e) => bus.emit("theme:toggle", centerOf(e.currentTarget))}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={settings.theme}
            initial={{ rotate: -120, scale: 0.3, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 120, scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
            className="grid place-items-center"
          >
            {settings.theme === "night" ? <Moon className="size-5" strokeWidth={2.6} /> : <Sun className="size-5" strokeWidth={2.6} />}
          </motion.span>
        </AnimatePresence>
      </button>
      <button type="button" className="icon-btn hidden sm:grid" aria-label="Tastenkürzel anzeigen" title="Tastenkürzel (?)" onClick={() => bus.emit("shortcuts:open")}>
        <Keyboard className="size-5" strokeWidth={2.6} />
      </button>
      <button type="button" className="icon-btn icon-btn-gear hidden sm:grid" aria-label="Einstellungen öffnen" title="Einstellungen" onClick={() => bus.emit("settings:open")}>
        <Settings className="size-5" strokeWidth={2.6} />
      </button>
    </>
  );

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="header-inner">
        <a href="#start" className="logo" onClick={(e) => (e.preventDefault(), go("start"))} aria-label="Julian's IdeaWall – nach oben">
          <span className="logo-mark" aria-hidden>
            <svg viewBox="0 0 64 64">
              <rect x="6" y="12" width="52" height="42" rx="12" className="lm-head" />
              <rect x="13" y="19" width="38" height="28" rx="7" className="lm-screen" />
              <rect x="20" y="25" width="7" height="11" rx="3" className="lm-eye" />
              <rect x="37" y="25" width="7" height="11" rx="3" className="lm-eye" />
              <path d="M26 40q6 4 12 0" className="lm-mouth" />
              <line x1="32" y1="12" x2="32" y2="5" className="lm-ant" />
              <circle cx="32" cy="5" r="4" className="lm-ball" />
            </svg>
          </span>
          <span className="logo-text">
            <small>Julian's</small>
            <span>IdeaWall</span>
          </span>
        </a>

        <nav className="main-nav" aria-label="Hauptnavigation">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={active === n.id ? "is-active" : ""}
              aria-current={active === n.id ? "location" : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(n.id);
              }}
            >
              {active === n.id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 480, damping: 34 }} />}
              <span className="relative">{n.label}</span>
            </a>
          ))}
        </nav>

        <div className="header-tools">
          {iconButtons}
          <button
            type="button"
            className="icon-btn md:hidden"
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-5" strokeWidth={3} /> : <Menu className="size-5" strokeWidth={2.8} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-menu"
            className="mobile-menu cel-panel"
            aria-label="Mobile Navigation"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            {NAV.map((n, i) => (
              <motion.a
                key={n.id}
                href={`#${n.id}`}
                className={active === n.id ? "is-active" : ""}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i }}
                onClick={(e) => {
                  e.preventDefault();
                  go(n.id);
                }}
              >
                {n.label}
              </motion.a>
            ))}
            <button
              type="button"
              onClick={(e) => {
                setMenuOpen(false);
                bus.emit("theme:toggle", centerOf(e.currentTarget));
              }}
            >
              {settings.theme === "night" ? "Zur Tagschicht wechseln" : "Zur Nachtschicht wechseln"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                bus.emit("settings:open");
              }}
            >
              Einstellungen
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                bus.emit("shortcuts:open");
              }}
            >
              Tastenkürzel
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
