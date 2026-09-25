import { Coffee, Flag, PartyPopper, Sunrise, UtensilsCrossed } from "lucide-react";
import { useNow } from "../lib/clock";
import { dur, durShort, getDayInfo, PHASE_META, toHHMM } from "../lib/time";
import { Rolling } from "../components/Rolling";
import type { Prefs } from "../prefs";

export function WorkdayWidget({ prefs }: { prefs: Prefs }) {
  const now = useNow();
  const d = getDayInfo(now, prefs);
  const meta = PHASE_META[d.phase];
  const span = d.end - d.start;
  const pct = (m: number) => Math.min(100, Math.max(0, ((m - d.start) / span) * 100));
  const b1 = pct(d.bs);
  const b2 = pct(d.be);
  const grad = d.hasBreak
    ? `linear-gradient(90deg, var(--accent) 0 ${b1}%, var(--break) ${b1}% ${b2}%, var(--accent) ${b2}% 100%)`
    : "var(--accent)";
  const done = d.phase === "weekend" ? 0 : d.progress * 100;
  const showNow = d.phase !== "weekend" && d.phase !== "before" && d.phase !== "done";

  let big: string;
  let label: string;
  switch (d.phase) {
    case "weekend":
      big = "Wochenende";
      label = "";
      break;
    case "done":
      big = "Feierabend";
      label = `seit ${toHHMM(d.end)}`;
      break;
    case "break":
      big = dur(d.be - d.cur);
      label = `Mittagspause bis ${toHHMM(d.be)}`;
      break;
    case "before":
      big = dur(d.start - d.cur);
      label = `bis Arbeitsbeginn`;
      break;
    default:
      big = dur((d.next?.at ?? d.end) - d.cur);
      label = d.next?.label === "Mittagspause" ? "bis zur Mittagspause" : "bis Feierabend";
  }

  const hours: number[] = [];
  for (let m = Math.ceil(d.start / 60) * 60; m <= d.end; m += 60) hours.push(m);

  return (
    <div className={`workday tone-${meta.tone}`}>
      <div className="wd-top">
        <div className="wd-main">
          <span className="phase">
            <span className="phase-dot" />
            {meta.label}
          </span>
          <p className="wd-count">
            {d.phase === "break" && <UtensilsCrossed size={26} className="wd-icon" />}
            {d.phase === "before" && <Sunrise size={26} className="wd-icon" />}
            <Rolling text={big} />
          </p>
          {label && <p className="muted">{label}</p>}
        </div>
        <div className="wd-end">
          <span className="wd-end-label">{d.phase === "done" ? <PartyPopper size={14} /> : <Flag size={14} />} Feierabend</span>
          <span className="wd-end-time">{toHHMM(d.end)}</span>
          {d.phase !== "done" && d.phase !== "weekend" && <span className="muted">in {durShort(d.toEnd)}</span>}
        </div>
      </div>

      <div className="timeline" aria-hidden>
        <div className="tl-track">
          <div className="tl-base" style={{ background: grad }} />
          <div className="tl-done" style={{ background: grad, clipPath: `inset(0 ${100 - done}% 0 0 round 99px)` }} />
          {d.hasBreak && (
            <div className={`tl-break ${d.phase === "break" ? "is-now" : ""}`} style={{ left: `${b1}%`, width: `${b2 - b1}%` }}>
              <Coffee size={11} />
            </div>
          )}
        </div>
        {showNow && (
          <div className="tl-now" style={{ left: `${pct(d.cur)}%` }}>
            <span>{toHHMM(d.cur)}</span>
          </div>
        )}
        <div className="tl-hours">
          {hours.map((m, i) => (
            <span key={m} className={`${m === d.end ? "is-end" : ""} ${i % 2 ? "odd" : ""} ${m === d.end - 60 ? "pre-end" : ""}`} style={{ left: `${pct(m)}%` }}>
              {m === d.end ? (
                <>
                  <Flag size={11} /> {m / 60}
                </>
              ) : (
                m / 60
              )}
            </span>
          ))}
        </div>
      </div>

      <dl className="wd-stats">
        <div>
          <dt>Gearbeitet</dt>
          <dd>{dur(d.worked)}</dd>
        </div>
        <div className={d.phase === "break" ? "is-break" : ""}>
          <dt>Pause</dt>
          <dd>
            {toHHMM(d.bs)}–{toHHMM(d.be)}
          </dd>
        </div>
        <div>
          <dt>Übrig</dt>
          <dd>{dur(d.planned - d.worked)}</dd>
        </div>
      </dl>
    </div>
  );
}
