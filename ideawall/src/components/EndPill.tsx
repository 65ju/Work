import { Coffee, Flag, PartyPopper } from "lucide-react";
import { useNow } from "../lib/clock";
import { durShort, getDayInfo, PHASE_META, toHHMM } from "../lib/time";
import type { Prefs } from "../prefs";

/** Kopfzeile: nächste Pause und Feierabend – immer im Blick. */
export function EndPill({ prefs }: { prefs: Prefs }) {
  const now = useNow();
  const d = getDayInfo(now, prefs);
  const tone = PHASE_META[d.phase].tone;

  if (d.phase === "weekend" || d.phase === "done") {
    return (
      <div className="end-pill tone-ok" role="status">
        <span className="seg">
          <PartyPopper size={14} />
          {d.phase === "weekend" ? "Wochenende" : "Feierabend"}
        </span>
      </div>
    );
  }

  const showBreak = d.hasBreak && (d.phase === "before" || d.phase === "morning" || d.phase === "break");
  return (
    <div className={`end-pill tone-${tone}`} role="status">
      {showBreak && (
        <span className={`seg seg-break ${d.phase === "break" ? "is-now" : ""}`}>
          <Coffee size={14} />
          {d.phase === "break" ? (
            <>
              <b>{durShort(d.be - d.cur)}</b>
              <span className="pill-extra">Pause</span>
            </>
          ) : (
            <>
              <b>{toHHMM(d.bs)}</b>
              <span className="pill-extra">{durShort(d.bs - d.cur)}</span>
            </>
          )}
        </span>
      )}
      <span className={`seg ${showBreak ? "pill-extra" : ""}`}>
        <Flag size={14} />
        <b>{toHHMM(d.end)}</b>
        <span className="pill-extra">{durShort(d.toEnd)}</span>
      </span>
    </div>
  );
}
