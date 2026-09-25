import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { THEMES, type ThemeId } from "../themes";

interface Props {
  current: ThemeId;
  onPick: (id: ThemeId, origin: { x: number; y: number }) => void;
  onClose: () => void;
}

/** Versteckte Themen-Schublade (Doppelklick aufs Logo oder Taste T). */
export function ThemeDrawer({ current, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div className="overlay overlay-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.aside
        className="drawer glass"
        role="dialog"
        aria-label="Themen"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -30, opacity: 0, transition: { duration: 0.16 } }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
      >
        <header className="drawer-head">
          <h2>Themen</h2>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="theme-list">
          {THEMES.map((t, i) => (
            <motion.button
              key={t.id}
              type="button"
              className={`theme-card ${current === t.id ? "is-on" : ""}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => onPick(t.id, { x: e.clientX, y: e.clientY })}
              style={{
                background: `radial-gradient(120% 140% at 0% 0%, ${t.aurora[0]}55, transparent 60%), radial-gradient(120% 140% at 100% 100%, ${t.aurora[1]}55, transparent 60%), ${t.vars["--bg"]}`,
                color: t.vars["--text"],
              }}
            >
              <span className="theme-mini" style={{ background: t.vars["--glass"], borderColor: t.vars["--edge"] }}>
                <i style={{ background: t.vars["--accent"] }} />
                <i style={{ background: t.vars["--accent-2"] }} />
              </span>
              <span className="theme-name">{t.name}</span>
              {current === t.id && <Check size={16} className="theme-check" />}
            </motion.button>
          ))}
        </div>
      </motion.aside>
    </motion.div>
  );
}
