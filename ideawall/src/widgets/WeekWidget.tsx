import { motion } from "framer-motion";
import { useNow } from "../lib/clock";
import { getDayInfo } from "../lib/time";
import type { Prefs } from "../prefs";

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr"];

export function WeekWidget({ prefs }: { prefs: Prefs }) {
  const now = useNow();
  const d = getDayInfo(now, prefs);
  const idx = (now.getDay() + 6) % 7; // 0 = Montag … 6 = Sonntag
  const fills = DAYS.map((_, i) => (idx > 4 || i < idx ? 1 : i === idx ? (d.planned ? d.worked / d.planned : 0) : 0));
  const total = Math.round((fills.reduce((a, b) => a + b, 0) / 5) * 100);
  const left = 4 - idx;
  const text = idx > 4 ? "Wochenende" : idx === 4 ? "Freitag" : `${left} ${left === 1 ? "Tag" : "Tage"} bis Wochenende`;

  return (
    <div className="week-widget">
      <div className="week">
        {DAYS.map((day, i) => (
          <div key={day} className={`day ${i === idx ? "today" : ""} ${i < idx || idx > 4 ? "past" : ""}`}>
            <div className="day-bar">
              <motion.span
                className="day-fill"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: fills[i] }}
                transition={{ type: "spring", stiffness: 120, damping: 20, delay: i * 0.05 }}
              />
            </div>
            <span className="day-label">{day}</span>
          </div>
        ))}
      </div>
      <div className="week-foot">
        <span className="week-pct">{total} %</span>
        <span className="muted">{text}</span>
      </div>
    </div>
  );
}
