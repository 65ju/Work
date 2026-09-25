import { useNow } from "../lib/clock";
import { dateFmt, dayKey, isoWeek } from "../lib/time";
import { usePersistent } from "../lib/usePersistent";

const LINES = [
  "Schön, dass du da bist.",
  "Eins nach dem anderen.",
  "Heute wird gut.",
  "Kaffee zuerst, dann die Welt.",
  "Kleine Schritte zählen auch.",
  "Du hast das im Griff.",
  "Fokus rein, Lärm raus.",
  "Mach's einfach, nicht perfekt.",
  "Pausen sind Teil der Arbeit.",
];

function greeting(h: number) {
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 17) return "Hallo";
  if (h >= 17 && h < 22) return "Guten Abend";
  return "Gute Nacht";
}

export function ClockWidget({ name }: { name: string }) {
  const now = useNow();
  const [goal, setGoal] = usePersistent<{ day: string; text: string }>("goal-v3", { day: "", text: "" });
  const today = dayKey(now);
  const sec = now.getSeconds();
  const C = 2 * Math.PI * 20;
  const dayIndex = Math.floor(now.getTime() / 86_400_000);

  return (
    <div className="clock-widget">
      <p className="hello">
        {greeting(now.getHours())}, <strong>{name || "Julian"}</strong>
      </p>
      <div className="clock-row">
        <time className="clock" dateTime={now.toISOString()}>
          {String(now.getHours()).padStart(2, "0")}
          <span className="colon">:</span>
          {String(now.getMinutes()).padStart(2, "0")}
        </time>
        <svg className="sec-ring" viewBox="0 0 48 48" aria-label={`${sec} Sekunden`}>
          <circle cx="24" cy="24" r="20" className="ring-bg" />
          <circle cx="24" cy="24" r="20" className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - sec / 60)} />
          <text x="24" y="28.5" textAnchor="middle">
            {String(sec).padStart(2, "0")}
          </text>
        </svg>
      </div>
      <p className="muted">
        {dateFmt.format(now)} · KW {isoWeek(now)}
      </p>
      <p className="day-line">{LINES[dayIndex % LINES.length]}</p>
      <label className="goal">
        <span>Heute im Fokus</span>
        <input
          value={goal.day === today ? goal.text : ""}
          placeholder="Was ist heute das Wichtigste?"
          maxLength={90}
          onChange={(e) => setGoal({ day: today, text: e.target.value })}
        />
      </label>
    </div>
  );
}
