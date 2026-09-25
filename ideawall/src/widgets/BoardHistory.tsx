import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck, ChevronLeft, ChevronRight, History, Undo2 } from "lucide-react";
import { useStore } from "../lib/store";
import { sfx } from "../lib/sfx";
import { boardAt, journalStore, PAPERS, type Pin } from "../journal/data";
import { shiftWeek, shortDate, today, WEEKDAY_LONG, WEEKDAY_SHORT, weekday, weekDates, weekOfIso, parseWeekKey } from "../journal/dates";
import { KIND_META, kindOf } from "../journal/schedule";
import type { Prefs } from "../prefs";

interface Stop {
  key: string;
  date: string;
  label: string;
  sub: string;
  kind: string;
}

/** Zeitregler unter der Pinnwand: zurück zu jedem Tag der Woche. */
export function BoardTimeline({ prefs, view, onView }: { prefs: Prefs; view: string | null; onView: (d: string | null) => void }) {
  useStore(journalStore);
  const t = today();
  const current = weekOfIso(t);
  const [week, setWeek] = useState(current);
  const isCurrent = week === current;
  useEffect(() => {
    if (view === null) setWeek(current);
  }, [view, current]);

  const stops: Stop[] = useMemo(() => {
    const out: Stop[] = weekDates(week)
      .filter((d) => d < t)
      .map((d) => ({ key: d, date: d, label: WEEKDAY_SHORT[weekday(d)], sub: shortDate(d), kind: kindOf(d, prefs) }));
    if (isCurrent) out.push({ key: "live", date: t, label: "Heute", sub: shortDate(t), kind: kindOf(t, prefs) });
    return out;
  }, [week, t, isCurrent, prefs]);

  const idx = Math.max(0, view === null ? stops.length - 1 : stops.findIndex((s) => s.date === view));
  const pick = (i: number) => {
    const s = stops[i];
    if (!s) return;
    const next = s.key === "live" ? null : s.date;
    if (next !== view) {
      sfx.tap();
      onView(next);
    }
  };

  const go = (dir: -1 | 1) => {
    const w = shiftWeek(week, dir);
    if (w > current) return;
    setWeek(w);
    sfx.roll();
    if (w === current) onView(null);
    else {
      const days = weekDates(w).filter((d) => d < t);
      onView(days[days.length - 1] ?? null);
    }
  };

  const { week: kw } = parseWeekKey(week);
  const pct = stops.length > 1 ? (idx / (stops.length - 1)) * 100 : 100;

  return (
    <div className="timeline-bar">
      <div className="tlb-week">
        <button type="button" className="tool" aria-label="Vorige Woche" onClick={() => go(-1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="tlb-kw">
          <History size={13} /> KW {kw}
        </span>
        <button type="button" className="tool" aria-label="Nächste Woche" disabled={isCurrent} onClick={() => go(1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      {stops.length > 1 ? (
        <div className="tlb-track" style={{ ["--p" as string]: `${pct}%` }}>
          <div className="tlb-rail">
            <span className="tlb-fill" />
          </div>
          <input
            type="range"
            min={0}
            max={stops.length - 1}
            step={1}
            value={idx}
            aria-label="Tag auswählen"
            aria-valuetext={stops[idx]?.label}
            onChange={(e) => pick(Number(e.target.value))}
          />
          <div className="tlb-stops">
            {stops.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={`tlb-stop kind-${s.kind} ${i === idx ? "is-on" : ""} ${s.key === "live" ? "is-live" : ""}`}
                style={{ left: `${stops.length > 1 ? (i / (stops.length - 1)) * 100 : 100}%` }}
                onClick={() => pick(i)}
                title={KIND_META[s.kind as keyof typeof KIND_META]?.label}
              >
                <b>{s.label}</b>
                <span>{s.sub}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="tlb-empty muted small">Ab morgen kannst du hier zurückblättern.</p>
      )}
    </div>
  );
}

/** Vergangener Stand der Pinnwand – vergilbt und nur zum Ansehen. */
export function HistoryBoard({ date, live, maxX, onToday }: { date: string; live: Pin[]; maxX: number; onToday: () => void }) {
  const j = useStore(journalStore);
  const { pins, exact } = boardAt(date);
  const done = j[date]?.done ?? [];
  const liveById = useMemo(() => new Map(live.map((p) => [p.id, p])), [live]);

  return (
    <motion.div className="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      <AnimatePresence>
        {pins.map((p, i) => {
          const from = liveById.get(p.id);
          const fresh = p.created === date || p.edited === date;
          return (
            <motion.div
              key={p.id}
              className={`note ghost ${fresh ? "is-fresh" : ""}`}
              style={{ zIndex: i + 1, ["--paper" as string]: PAPERS[p.color] }}
              initial={from ? { x: from.fx * maxX, y: from.y, rotate: from.rot, opacity: 1, scale: 1 } : { x: p.fx * maxX, y: p.y - 30, rotate: p.rot - 8, opacity: 0, scale: 0.8 }}
              animate={{ x: p.fx * maxX, y: p.y, rotate: p.rot, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, y: p.y + 20, transition: { duration: 0.22 } }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: Math.min(i * 0.02, 0.2) }}
            >
              <div className="note-paper">
                <p className="note-text">{p.text}</p>
                <span className="note-crease" />
                {p.school && <span className="note-stamp">Schule</span>}
              </div>
              <span className="pushpin">
                <span className="pp-shadow" />
                <span className="pp-head" />
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <motion.div className="history-badge glass-chip" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}>
        <span className="hb-date">
          {WEEKDAY_LONG[weekday(date)]}, {shortDate(date)}
        </span>
        {!exact && <span className="hb-note">unverändert</span>}
        {done.length > 0 && (
          <span className="hb-done" title={done.map((d) => d.text).join("\n")}>
            <CheckCheck size={13} /> {done.length}
          </span>
        )}
        <button type="button" className="hb-back" onClick={onToday}>
          <Undo2 size={13} /> Heute
        </button>
      </motion.div>

      {pins.length === 0 && <p className="history-empty">Leere Pinnwand</p>}
    </motion.div>
  );
}
