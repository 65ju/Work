import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Check, RotateCcw, X } from "lucide-react";
import { ACCENTS, BREAK_OPTIONS, DEFAULT_PREFS, WIDGET_IDS, WIDGETS, type Prefs } from "../prefs";
import { toHHMM, toMin } from "../lib/time";
import { chime } from "../lib/chime";

interface Props {
  prefs: Prefs;
  setPrefs: (fn: (p: Prefs) => Prefs) => void;
  onClose: () => void;
}

export function SettingsPanel({ prefs, setPrefs, onClose }: Props) {
  const set = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));
  const [perm, setPerm] = useState(() => ("Notification" in window ? Notification.permission : "denied"));

  return (
    <motion.div
      className="settings-wrap"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
    >
      <div className="card settings">
        <div className="settings-head">
          <h2>Einstellungen</h2>
          <button type="button" className="icon-btn" aria-label="Einstellungen schließen" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="settings-grid">
          <label className="field">
            <span>Dein Name</span>
            <input value={prefs.name} maxLength={24} onChange={(e) => set({ name: e.target.value })} onBlur={() => !prefs.name.trim() && set({ name: "Julian" })} />
          </label>
          <label className="field">
            <span>Arbeitsbeginn</span>
            <input type="time" value={prefs.start} onChange={(e) => e.target.value && set({ start: e.target.value })} />
          </label>
          <label className="field">
            <span>Mittagspause (1 Stunde)</span>
            <select value={prefs.breakStart} onChange={(e) => set({ breakStart: e.target.value })}>
              {BREAK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b} – {toHHMM(toMin(b) + 60)} Uhr
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Feierabend</span>
            <input type="time" value={prefs.end} onChange={(e) => e.target.value && set({ end: e.target.value })} />
          </label>
        </div>

        <div className="settings-row">
          <span className="settings-label">Akzentfarbe</span>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                className={`swatch ${prefs.accent === a.value ? "is-on" : ""}`}
                style={{ background: a.value }}
                title={a.name}
                aria-label={`Akzentfarbe ${a.name}`}
                aria-pressed={prefs.accent === a.value}
                onClick={() => set({ accent: a.value })}
              >
                {prefs.accent === a.value && <Check size={14} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Erinnerungen</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={prefs.alerts}
              className={`switch ${prefs.alerts ? "is-on" : ""}`}
              onClick={() => {
                set({ alerts: !prefs.alerts });
                if (!prefs.alerts) chime();
              }}
            >
              <span className="switch-knob" />
            </button>
            <span className="muted">Sanfter Ton bei Pausenbeginn, Pausenende, 15 Minuten vor und zum Feierabend</span>
            {prefs.alerts && perm === "default" && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void Notification.requestPermission().then(setPerm)}>
                <Bell size={14} /> Auch als Systembenachrichtigung
              </button>
            )}
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Widgets</span>
          <div className="flex flex-wrap gap-2">
            {WIDGET_IDS.map((id) => {
              const on = !prefs.hidden.includes(id);
              const Icon = WIDGETS[id].icon;
              return (
                <button
                  key={id}
                  type="button"
                  className={`chip ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => set({ hidden: on ? [...prefs.hidden, id] : prefs.hidden.filter((h) => h !== id) })}
                >
                  <Icon size={13} /> {WIDGETS[id].title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="settings-foot">
          <span className="muted">Tipp: Widgets am Griff ziehen und auf einem anderen ablegen, um die Plätze zu tauschen.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ order: DEFAULT_PREFS.order, sizes: DEFAULT_PREFS.sizes, hidden: [] })}>
            <RotateCcw size={14} /> Layout zurücksetzen
          </button>
        </div>
      </div>
    </motion.div>
  );
}
