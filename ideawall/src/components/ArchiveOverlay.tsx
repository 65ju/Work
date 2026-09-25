import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookCheck, CheckCheck, ChevronLeft, ChevronRight, FolderCheck, FolderOpen, FolderSync, LoaderCircle, Pencil, Sparkles, X } from "lucide-react";
import { useStore } from "../lib/store";
import { sfx } from "../lib/sfx";
import { activityOn, boardAt, journalStore, PAPERS, reportsStore, setDayKind, type Activity, type DayKind, type SnapPin } from "../journal/data";
import { hoursLabel, parseWeekKey, shiftWeek, shortDate, today, WEEKDAY_LONG, WEEKDAY_SHORT, weekday, weekOfIso, weekRangeLabel } from "../journal/dates";
import { KIND_META, plannedKind, weekPlan } from "../journal/schedule";
import { connect, resume, supported, vaultStore } from "../journal/vault";
import { openReport } from "../journal/ui";
import type { Prefs } from "../prefs";

const KINDS: DayKind[] = ["work", "school", "vacation", "sick", "off"];
const ACT_LABEL: Record<Activity["kind"], string> = { neu: "Neu", bearbeitet: "Geändert", erledigt: "Erledigt", todo: "To-do" };

export function ArchiveOverlay({ week: initial, prefs, onClose }: { week: string; prefs: Prefs; onClose: () => void }) {
  const [week, setWeek] = useState(initial);
  const [dir, setDir] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  useStore(journalStore);
  const reports = useStore(reportsStore);
  const current = weekOfIso(today());
  const plan = weekPlan(week, prefs);
  const total = plan.reduce((m, d) => m + d.minutes, 0);
  const report = reports[week];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && !(e.target as HTMLElement).closest("input, textarea, select")) go(-1);
      if (e.key === "ArrowRight" && !(e.target as HTMLElement).closest("input, textarea, select")) go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const go = (d: -1 | 1) => {
    const w = shiftWeek(week, d);
    if (w > current) return;
    setDir(d);
    setWeek(w);
    setOpen(null);
    sfx.roll();
  };

  const { week: kw, year } = parseWeekKey(week);

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.section
        className="archive glass"
        role="dialog"
        aria-label="Archiv"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.16 } }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <header className="archive-head">
          <div className="arch-nav">
            <button type="button" className="icon-btn" aria-label="Vorige Woche" onClick={() => go(-1)}>
              <ChevronLeft size={18} />
            </button>
            <div className="arch-title">
              <h2>
                KW {kw} <span>{year}</span>
              </h2>
              <p className="muted small">{weekRangeLabel(week)}</p>
            </div>
            <button type="button" className="icon-btn" aria-label="Nächste Woche" disabled={week >= current} onClick={() => go(1)}>
              <ChevronRight size={18} />
            </button>
            {report && (
              <span className="arch-done" title="Bericht gespeichert">
                <BookCheck size={14} /> fertig
              </span>
            )}
          </div>
          <VaultChip />
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={week}
            className="arch-days"
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {plan.map((d, i) => (
              <DayCard
                key={d.date}
                index={i}
                date={d.date}
                kind={d.kind}
                minutes={d.minutes}
                manual={d.manual}
                planned={plannedKind(d.date, prefs)}
                open={open === d.date}
                onOpen={() => {
                  setOpen((o) => (o === d.date ? null : d.date));
                  sfx.pop();
                }}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>{open && <DayDetail key={open} date={open} school={plan.find((p) => p.date === open)?.kind === "school"} />}</AnimatePresence>

        <footer className="arch-foot">
          <span className="arch-total">
            <b>{hoursLabel(total)}</b> <span className="muted">diese Woche</span>
          </span>
          {report ? (
            <div className="arch-actions">
              <button type="button" className="btn btn-ghost" onClick={() => openReport(week)}>
                <Pencil size={15} /> Bericht öffnen
              </button>
              <button
                type="button"
                className="btn btn-primary btn-glow"
                onClick={() => {
                  reportsStore.set((r) => {
                    const { [week]: _old, ...rest } = r;
                    return rest;
                  });
                  openReport(week);
                }}
              >
                <Sparkles size={15} /> Neu erstellen
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-glow" onClick={() => openReport(week)}>
              <Sparkles size={16} /> Berichtsheft erstellen
            </button>
          )}
        </footer>
      </motion.section>
    </motion.div>
  );
}

function DayCard({
  date,
  kind,
  minutes,
  manual,
  planned,
  open,
  index,
  onOpen,
}: {
  date: string;
  kind: DayKind;
  minutes: number;
  manual: boolean;
  planned: DayKind;
  open: boolean;
  index: number;
  onOpen: () => void;
}) {
  const t = today();
  const future = date > t;
  const { pins, exact } = boardAt(date);
  const acts = future ? [] : activityOn(date, kind === "school");
  const done = acts.filter((a) => a.kind === "erledigt" || a.kind === "todo").length;
  const fresh = acts.length - done;
  const free = kind === "vacation" || kind === "sick" || kind === "off";

  return (
    <motion.article
      className={`arch-day kind-${kind} ${open ? "is-open" : ""} ${date === t ? "is-today" : ""} ${future ? "is-future" : ""}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 380, damping: 30 }}
    >
      <div className="ad-head">
        <div>
          <b>{WEEKDAY_SHORT[weekday(date)]}</b> <span className="muted">{shortDate(date)}</span>
        </div>
        <label className={`kind-pill kind-${kind}`} title="Tagesart ändern">
          <span>{KIND_META[kind].label}</span>
          <select
            value={manual ? kind : "auto"}
            aria-label="Tagesart"
            onChange={(e) => {
              const v = e.target.value;
              setDayKind(date, v === "auto" ? null : (v as DayKind));
              sfx.toggle();
            }}
          >
            <option value="auto">Automatisch ({KIND_META[planned].label})</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" className="ad-board" onClick={onOpen} aria-expanded={open} aria-label={`${WEEKDAY_LONG[weekday(date)]} ansehen`} disabled={future}>
        {free ? <span className="ad-free">{KIND_META[kind].label}</span> : <MiniBoard pins={future ? [] : pins} faded={!exact} date={date} />}
      </button>

      <div className="ad-foot">
        {future ? (
          <span className="muted small">kommt noch</span>
        ) : (
          <>
            {fresh > 0 && <span className="ad-stat">+{fresh}</span>}
            {done > 0 && (
              <span className="ad-stat is-done">
                <CheckCheck size={12} /> {done}
              </span>
            )}
            {!fresh && !done && !free && <span className="muted small">keine Einträge</span>}
          </>
        )}
        <span className="ad-hours">{minutes ? hoursLabel(minutes) : "–"}</span>
      </div>
    </motion.article>
  );
}

export function MiniBoard({ pins, faded, date }: { pins: SnapPin[]; faded?: boolean; date?: string }) {
  return (
    <span className={`mini-board ${faded ? "is-faded" : ""}`}>
      {pins.map((p) => (
        <span
          key={p.id}
          className={`mini-note ${date && (p.created === date || p.edited === date) ? "is-fresh" : ""}`}
          style={{
            left: `${p.fx * 70}%`,
            top: `${(p.y / 460) * 100 * 0.66}%`,
            background: PAPERS[p.color],
            transform: `rotate(${p.rot}deg)`,
          }}
        >
          <i>{p.text}</i>
          {p.school && <em className="mini-stamp" />}
        </span>
      ))}
      {pins.length === 0 && <span className="mini-empty">leer</span>}
    </span>
  );
}

function DayDetail({ date, school }: { date: string; school: boolean }) {
  const acts = useMemo(() => activityOn(date, school), [date, school]);
  const { pins } = boardAt(date);
  return (
    <motion.div className="arch-detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
      <div className="ad-detail-inner">
        <div className="ad-detail-board">
          <MiniBoard pins={pins} date={date} />
        </div>
        <div className="ad-detail-list">
          <h3>
            {WEEKDAY_LONG[weekday(date)]}, {shortDate(date)}
          </h3>
          {acts.length === 0 ? (
            <p className="muted small">An diesem Tag wurde nichts notiert oder erledigt.</p>
          ) : (
            <ul>
              {acts.map((a) => (
                <li key={a.key} className={`act act-${a.kind}`}>
                  <span className="act-tag">{ACT_LABEL[a.kind]}</span>
                  <span className="act-text">{a.text}</span>
                  {a.school && <span className="act-school">Schule</span>}
                  {a.at && <span className="act-at">{a.at}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Zustand des Berichtsheft-Ordners mit passender Aktion. */
export function VaultChip() {
  const v = useStore(vaultStore);
  if (!supported) return <span className="vault-chip is-off">Ordner nur in Chrome/Edge</span>;
  if (v.status === "none")
    return (
      <button type="button" className="vault-chip is-action" onClick={() => void connect()}>
        <FolderOpen size={14} /> Ordner verbinden
      </button>
    );
  if (v.status === "prompt")
    return (
      <button type="button" className="vault-chip is-warn" onClick={() => void resume()}>
        <FolderSync size={14} /> Zugriff erlauben
      </button>
    );
  return (
    <span className={`vault-chip ${v.status === "error" ? "is-warn" : "is-ok"}`} title={v.error ?? (v.lastSaved ? `Gespeichert ${new Date(v.lastSaved).toLocaleTimeString("de-DE")}` : undefined)}>
      {v.status === "saving" ? <LoaderCircle size={14} className="spin" /> : <FolderCheck size={14} />} {v.name}
    </span>
  );
}
