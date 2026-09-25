import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon, Plus, Settings2, Sun, Trash2, X } from "lucide-react";
import { load, save, uid } from "./lib/storage";

interface Note {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

interface Prefs {
  theme: "dark" | "light";
  start: string; // "08:00"
  end: string; // "17:00"
}

const DEFAULT_PREFS: Prefs = { theme: "dark", start: "08:00", end: "17:00" };

const dateFmt = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function greeting(h: number) {
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 17) return "Guten Tag";
  if (h >= 17 && h < 22) return "Guten Abend";
  return "Gute Nacht";
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t = 0;
    const tick = () => {
      setNow(new Date());
      t = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    t = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => window.clearTimeout(t);
  }, []);
  return now;
}

export default function App() {
  const now = useNow();
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...DEFAULT_PREFS, ...load<Partial<Prefs>>("prefs", {}) }));
  const [notes, setNotes] = useState<Note[]>(() => load<Note[]>("v2-notes", []));
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => save("prefs", prefs), [prefs]);
  useEffect(() => save("v2-notes", notes), [notes]);
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Julian · Dashboard</span>
        <div className="flex gap-2">
          <button
            className="icon-btn"
            aria-label={prefs.theme === "dark" ? "Helles Design" : "Dunkles Design"}
            onClick={() => setPrefs((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))}
          >
            {prefs.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn" aria-label="Arbeitszeit einstellen" onClick={() => setShowSettings((s) => !s)}>
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="card settings"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <label>
              Arbeitsbeginn
              <input type="time" value={prefs.start} onChange={(e) => setPrefs((p) => ({ ...p, start: e.target.value || p.start }))} />
            </label>
            <label>
              Feierabend
              <input type="time" value={prefs.end} onChange={(e) => setPrefs((p) => ({ ...p, end: e.target.value || p.end }))} />
            </label>
            <button className="icon-btn ml-auto" aria-label="Schließen" onClick={() => setShowSettings(false)}>
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="grid-main">
        <section className="card clock-card" aria-label="Uhrzeit">
          <p className="muted">{greeting(now.getHours())}, Julian</p>
          <time className="clock" dateTime={now.toISOString()}>
            {hh}:{mm}
            <span className="clock-sec">{ss}</span>
          </time>
          <p className="date">{dateFmt.format(now)}</p>
        </section>

        <Workday now={now} start={prefs.start} end={prefs.end} />

        <Notes notes={notes} setNotes={setNotes} />
      </main>
    </div>
  );
}

function Workday({ now, start, end }: { now: Date; start: string; end: string }) {
  const s = toMinutes(start);
  const e = toMinutes(end);
  const cur = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const total = Math.max(1, e - s);
  const progress = Math.min(1, Math.max(0, (cur - s) / total));
  const left = e - cur;
  const weekend = now.getDay() === 0 || now.getDay() === 6;

  let headline: string;
  let sub: string;
  let state: "before" | "work" | "soon" | "done";
  if (weekend) {
    headline = "Wochenende";
    sub = "Kein Countdown heute.";
    state = "done";
  } else if (cur < s) {
    headline = `Start um ${start}`;
    sub = `in ${fmtDuration(s - cur)}`;
    state = "before";
  } else if (left > 0) {
    headline = fmtDuration(left);
    sub = `bis Feierabend um ${end} Uhr`;
    state = left <= 30 ? "soon" : "work";
  } else {
    headline = "Feierabend";
    sub = `seit ${end} Uhr`;
    state = "done";
  }

  const ticks = [];
  for (let m = Math.ceil(s / 60) * 60; m <= e; m += 60) ticks.push(m);

  return (
    <section className={`card workday state-${state}`} aria-label="Arbeitstag">
      <p className="muted">Arbeitstag {start} – {end}</p>
      <p className="countdown">{headline}</p>
      <p className="muted">{sub}</p>
      <div className="track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="fill" initial={{ scaleX: 0 }} animate={{ scaleX: progress }} transition={{ type: "spring", stiffness: 60, damping: 20 }} />
      </div>
      <div className="ticks">
        {ticks.map((m) => (
          <span key={m} style={{ left: `${((m - s) / total) * 100}%` }} className={m === e ? "tick-end" : ""}>
            {String(m / 60).padStart(2, "0")}
          </span>
        ))}
      </div>
    </section>
  );
}

function fmtDuration(min: number) {
  const m = Math.ceil(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} h ${String(r).padStart(2, "0")} min` : `${r} min`;
}

function Notes({ notes, setNotes }: { notes: Note[]; setNotes: Dispatch<SetStateAction<Note[]>> }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sorted = useMemo(() => [...notes].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt), [notes]);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setNotes((n) => [{ id: uid(), text, done: false, createdAt: Date.now() }, ...n]);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <section className="card notes" aria-label="Notizen">
      <div className="notes-head">
        <h2>Notizen</h2>
        {notes.length > 0 && <span className="muted">{notes.filter((n) => !n.done).length} offen</span>}
      </div>
      <div className="composer">
        <textarea
          ref={inputRef}
          value={draft}
          rows={1}
          placeholder="Neue Notiz … (Enter zum Speichern)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="add-btn" onClick={add} disabled={!draft.trim()} aria-label="Notiz hinzufügen">
          <Plus size={18} />
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="empty">Noch keine Notizen.</p>
      ) : (
        <ul className="note-list">
          <AnimatePresence initial={false}>
            {sorted.map((n) => (
              <motion.li
                key={n.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.18 }}
                className={`note ${n.done ? "is-done" : ""}`}
              >
                <button
                  className="check"
                  aria-label={n.done ? "Als offen markieren" : "Als erledigt markieren"}
                  onClick={() => setNotes((all) => all.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)))}
                >
                  {n.done && <Check size={14} strokeWidth={3} />}
                </button>
                <EditableText text={n.text} onChange={(text) => setNotes((all) => all.map((x) => (x.id === n.id ? { ...x, text } : x)))} />
                <button className="icon-btn ghost" aria-label="Löschen" onClick={() => setNotes((all) => all.filter((x) => x.id !== n.id))}>
                  <Trash2 size={16} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function EditableText({ text, onChange }: { text: string; onChange: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  useEffect(() => setValue(text), [text]);
  if (!editing)
    return (
      <p className="note-text" onClick={() => setEditing(true)} title="Klicken zum Bearbeiten">
        {text}
      </p>
    );
  const commit = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== text) onChange(value.trim());
    else setValue(text);
  };
  return (
    <textarea
      className="note-edit"
      autoFocus
      value={value}
      rows={Math.min(6, value.split("\n").length)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          setValue(text);
          setEditing(false);
        }
      }}
    />
  );
}
