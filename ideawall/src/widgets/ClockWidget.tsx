import { useNow } from "../lib/clock";
import { dateFmt, dayKey, getDayInfo, greeting, isoWeek } from "../lib/time";
import { usePersistent } from "../lib/usePersistent";
import { Rolling } from "../components/Rolling";
import type { Prefs } from "../prefs";

export function ClockWidget({ prefs }: { prefs: Prefs }) {
  const now = useNow();
  const d = getDayInfo(now, prefs);
  const [goal, setGoal] = usePersistent<{ day: string; text: string }>("goal-v3", { day: "", text: "" });
  const today = dayKey(now);
  const sec = now.getSeconds();
  const C = 2 * Math.PI * 20;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return (
    <div className="clock-widget">
      <p className="hello">
        {greeting(now, d)}, <em>{prefs.name.trim() || "Julian"}</em>
      </p>
      <div className="clock-row">
        <time className="clock" dateTime={now.toISOString()}>
          <Rolling text={hh} />
          <span className="colon">:</span>
          <Rolling text={mm} />
        </time>
        <svg className="sec-ring" viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="24" r="20" className="ring-bg" />
          <circle cx="24" cy="24" r="20" className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - sec / 60)} />
          <text x="24" y="28.5" textAnchor="middle">
            {String(sec).padStart(2, "0")}
          </text>
        </svg>
      </div>
      <p className="date">
        {dateFmt.format(now)} <span>KW {isoWeek(now)}</span>
      </p>
      <input
        className="goal"
        aria-label="Fokus heute"
        value={goal.day === today ? goal.text : ""}
        placeholder="Fokus heute …"
        maxLength={90}
        onChange={(e) => setGoal({ day: today, text: e.target.value })}
      />
    </div>
  );
}
