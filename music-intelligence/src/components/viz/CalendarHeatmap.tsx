"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { DayStat } from "@/analytics/history-types";

const CELL = 13;
const GAP = 3;
const DAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

/** Year-style activity calendar: one square per day, brightness = listening time. */
export function CalendarHeatmap({ daily, maxWeeks = 26 }: { daily: DayStat[]; maxWeeks?: number }) {
  // Show the recorded span plus a little context, without a wall of empty weeks.
  const weeks = Math.min(maxWeeks, Math.max(12, Math.ceil(daily.length / 7) + 3));
  const [hover, setHover] = useState<{ d: DayStat; x: number; y: number } | null>(null);

  const { columns, max, months } = useMemo(() => {
    const last = daily.at(-1)?.day ?? new Date().toISOString().slice(0, 10);
    const lastDate = new Date(`${last}T00:00:00Z`);
    const lastWeekday = (lastDate.getUTCDay() + 6) % 7;
    const startDate = new Date(lastDate);
    startDate.setUTCDate(startDate.getUTCDate() - lastWeekday - (weeks - 1) * 7);
    const byDay = new Map(daily.map((d) => [d.day, d]));
    const cols: (DayStat | null)[][] = [];
    const monthLabels: { col: number; label: string }[] = [];
    for (let w = 0; w < weeks; w++) {
      const col: (DayStat | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setUTCDate(date.getUTCDate() + w * 7 + d);
        const key = date.toISOString().slice(0, 10);
        if (key > last) col.push(null);
        else col.push(byDay.get(key) ?? { day: key, plays: 0, ms: 0 });
        if (d === 0 && date.getUTCDate() <= 7) monthLabels.push({ col: w, label: date.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" }) });
      }
      cols.push(col);
    }
    return { columns: cols, max: Math.max(1, ...daily.map((d) => d.ms)), months: monthLabels };
  }, [daily, weeks]);

  const width = 28 + weeks * (CELL + GAP);
  const height = 18 + 7 * (CELL + GAP);

  return (
    <div className="relative overflow-x-auto">
      <svg width={width} height={height} role="img" aria-label="Listening calendar">
        {months.map((m) => (
          <text key={`${m.col}-${m.label}`} x={28 + m.col * (CELL + GAP)} y={10} className="fill-faint font-mono text-[9px] uppercase">
            {m.label}
          </text>
        ))}
        {DAYS.map((d, i) => (
          <text key={i} x={0} y={18 + i * (CELL + GAP) + 10} className="fill-faint font-mono text-[9px]">
            {d}
          </text>
        ))}
        {columns.map((col, w) =>
          col.map((d, i) =>
            d ? (
              <motion.rect
                key={d.day}
                x={28 + w * (CELL + GAP)}
                y={18 + i * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2.5}
                fill={d.ms > 0 ? "var(--accent)" : "rgba(255,255,255,0.05)"}
                initial={{ opacity: 0 }}
                animate={{ opacity: d.ms > 0 ? 0.18 + 0.82 * Math.sqrt(d.ms / max) : 1 }}
                transition={{ delay: w * 0.015, duration: 0.5 }}
                onPointerEnter={(e) => setHover({ d, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
                onPointerLeave={() => setHover(null)}
              />
            ) : null,
          ),
        )}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-line-strong bg-ink-1/95 px-3 py-2 text-xs whitespace-nowrap backdrop-blur"
          style={{ left: Math.min(hover.x + 12, width - 150), top: hover.y + 12 }}
        >
          <p className="font-medium">{new Date(`${hover.d.day}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</p>
          <p className="font-mono text-muted">
            {hover.d.plays} plays · {Math.round(hover.d.ms / 60_000)} min
          </p>
        </div>
      )}
    </div>
  );
}

/** Weekday × hour grid of plays. */
export function WeekHourHeatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-[3px]">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center font-mono text-[9px] text-faint">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
        {grid.map((row, d) => (
          <div key={d} className="contents">
            <span className="font-mono text-[10px] leading-5 text-faint">{labels[d]}</span>
            {row.map((v, h) => (
              <motion.span
                key={h}
                title={`${labels[d]} ${String(h).padStart(2, "0")}:00 — ${v} plays`}
                className="h-5 rounded-[2px]"
                style={{ backgroundColor: v ? "var(--accent)" : "rgba(255,255,255,0.04)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: v ? 0.15 + 0.85 * (v / max) : 1 }}
                transition={{ delay: (d * 24 + h) * 0.002 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
