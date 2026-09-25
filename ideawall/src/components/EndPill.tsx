import { Coffee, Flag, PartyPopper } from "lucide-react";
import { useNow } from "../lib/clock";
import { dur, getDayInfo, PHASE_META, toHHMM } from "../lib/time";
import type { Prefs } from "../prefs";

/** Immer sichtbar in der Kopfzeile: wann ist Feierabend und wie lange noch. */
export function EndPill({ prefs }: { prefs: Prefs }) {
  const now = useNow();
  const d = getDayInfo(now, prefs);
  const tone = PHASE_META[d.phase].tone;
  let text: string;
  let short: string;
  let icon = <Flag size={14} />;
  if (d.phase === "weekend") {
    text = short = "Wochenende";
    icon = <PartyPopper size={14} />;
  } else if (d.phase === "done") {
    text = `Feierabend seit ${toHHMM(d.end)}`;
    short = "Feierabend";
    icon = <PartyPopper size={14} />;
  } else if (d.phase === "break") {
    text = `Pause bis ${toHHMM(d.be)} · Feierabend ${toHHMM(d.end)}`;
    short = `Pause bis ${toHHMM(d.be)}`;
    icon = <Coffee size={14} />;
  } else {
    text = `Feierabend ${toHHMM(d.end)} · noch ${dur(d.toEnd)}`;
    short = `${toHHMM(d.end)} · ${dur(d.toEnd)}`;
  }
  return (
    <div className={`end-pill tone-${tone}`} role="status">
      {icon}
      <span className="pill-long">{text}</span>
      <span className="pill-short">{short}</span>
    </div>
  );
}
