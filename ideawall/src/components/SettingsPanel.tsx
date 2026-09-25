import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Bell, Check, RotateCcw, X } from "lucide-react";
import { ACCENTS, BREAK_OPTIONS, DEFAULT_PREFS, WIDGET_IDS, WIDGETS, type FxLevel, type Prefs } from "../prefs";
import { toHHMM, toMin } from "../lib/time";
import { chime } from "../lib/chime";
import { sfx } from "../lib/sfx";
import { themeById } from "../themes";
import { JournalSettings } from "./JournalSettings";

interface Props {
  prefs: Prefs;
  setPrefs: (fn: (p: Prefs) => Prefs) => void;
  onClose: () => void;
  fxResolved: string;
}

const FX_LABEL: Record<FxLevel, string> = { auto: "Auto", high: "Maximal", balanced: "Ausgewogen", low: "Sparsam" };

export function SettingsPanel({ prefs, setPrefs, onClose, fxResolved }: Props) {
  const set = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));
  const [perm, setPerm] = useState(() => ("Notification" in window ? Notification.permission : "denied"));
  const themeAccent = themeById(prefs.theme).vars["--accent"];

  return (
    <motion.div
      className="settings-wrap"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
    >
      <div className="card glass settings">
        <div className="settings-head">
          <h2>Einstellungen</h2>
          <button type="button" className="icon-btn" aria-label="Einstellungen schließen" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="settings-grid">
          <label className="field">
            <span>Name</span>
            <input value={prefs.name} maxLength={24} onChange={(e) => set({ name: e.target.value })} onBlur={() => !prefs.name.trim() && set({ name: "Julian" })} />
          </label>
          <label className="field">
            <span>Start</span>
            <input type="time" value={prefs.start} onChange={(e) => e.target.value && set({ start: e.target.value })} />
          </label>
          <label className="field">
            <span>Mittagspause</span>
            <select value={prefs.breakStart} onChange={(e) => set({ breakStart: e.target.value })}>
              {BREAK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b} – {toHHMM(toMin(b) + 60)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Feierabend</span>
            <input type="time" value={prefs.end} onChange={(e) => e.target.value && set({ end: e.target.value })} />
          </label>
        </div>

        <Row label="Akzent">
          <div className="swatches">
            {ACCENTS.map((a) => {
              const on = prefs.accent === a.value;
              const color = a.value === "theme" ? themeAccent : a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  className={`swatch ${on ? "is-on" : ""} ${a.value === "theme" ? "swatch-theme" : ""}`}
                  style={{ ["--sw" as string]: color }}
                  title={a.name}
                  aria-label={`Akzent ${a.name}`}
                  aria-pressed={on}
                  onClick={() => {
                    set({ accent: a.value });
                    sfx.pop();
                  }}
                >
                  {on && <Check size={14} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Effekte">
          <div className="seg seg-inline" role="radiogroup">
            {(Object.keys(FX_LABEL) as FxLevel[]).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={prefs.fx === f} className={prefs.fx === f ? "is-on" : ""} onClick={() => set({ fx: f })}>
                {FX_LABEL[f]}
              </button>
            ))}
          </div>
          {prefs.fx === "auto" && <span className="muted small">→ {FX_LABEL[fxResolved as FxLevel] ?? fxResolved}</span>}
        </Row>

        <Row label="Sound">
          <Switch
            on={prefs.sound}
            onChange={(sound) => {
              set({ sound });
              if (sound) window.setTimeout(sfx.toggle, 20);
            }}
          />
        </Row>

        <Row label="Erinnerungen">
          <Switch
            on={prefs.alerts}
            onChange={(alerts) => {
              set({ alerts });
              if (alerts) chime();
            }}
          />
          <span className="muted small">Pause & Feierabend</span>
          {prefs.alerts && perm === "default" && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void Notification.requestPermission().then(setPerm)}>
              <Bell size={14} /> System
            </button>
          )}
        </Row>

        <Row label="Widgets">
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
          <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => set({ order: DEFAULT_PREFS.order, sizes: DEFAULT_PREFS.sizes, hidden: [] })}>
            <RotateCcw size={14} /> Layout
          </button>
        </Row>

        <JournalSettings prefs={prefs} set={set} />
      </div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-value">{children}</div>
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`switch ${on ? "is-on" : ""}`} onClick={() => onChange(!on)}>
      <span className="switch-knob" />
    </button>
  );
}
