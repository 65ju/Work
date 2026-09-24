"use client";

import { motion } from "motion/react";
import type { DayPeriod } from "@/analytics/types";

const SIZE = 420;
const C = SIZE / 2;
const INNER = 92;
const OUTER = 176;

const PERIODS: { id: DayPeriod; label: string; from: number; to: number }[] = [
  { id: "night", label: "Night", from: 22, to: 29 },
  { id: "morning", label: "Morning", from: 5, to: 12 },
  { id: "afternoon", label: "Afternoon", from: 12, to: 17 },
  { id: "evening", label: "Evening", from: 17, to: 22 },
];

// Midnight at the top, like a clock.
const angle = (hour: number) => -Math.PI / 2 + (hour / 24) * Math.PI * 2;
const polar = (a: number, r: number) => [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;

function arc(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = polar(a1, r2);
  const [x2, y2] = polar(a2, r2);
  const [x3, y3] = polar(a2, r1);
  const [x4, y4] = polar(a1, r1);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

/** 24-hour radial clock: each wedge is an hour, its length the share of recent plays. */
export function ListeningClock({ hourly, periods, strongest }: { hourly: number[]; periods: Record<DayPeriod, number>; strongest: DayPeriod | null }) {
  const max = Math.max(1, ...hourly);
  const total = hourly.reduce((a, b) => a + b, 0) || 1;
  return (
    <svg viewBox={`-48 -16 ${SIZE + 96} ${SIZE + 32}`} className="h-auto w-full overflow-visible" role="img" aria-label="Listening by hour of day">
      {PERIODS.map((p) => {
        const active = strongest === p.id;
        return (
          <path
            key={p.id}
            d={arc(OUTER + 10, OUTER + 13, angle(p.from) + 0.02, angle(p.to) - 0.02)}
            fill={active ? "var(--accent)" : "rgba(255,255,255,0.12)"}
          />
        );
      })}
      {PERIODS.map((p) => {
        const mid = angle((p.from + p.to) / 2);
        const [x, y] = polar(mid, OUTER + 44);
        const share = Math.round((periods[p.id] / total) * 100);
        return (
          <g key={`${p.id}-label`}>
            <text x={x} y={y - 4} textAnchor="middle" className={`font-mono text-[10px] tracking-[0.16em] uppercase ${strongest === p.id ? "fill-fg" : "fill-muted"}`}>
              {p.label}
            </text>
            <text x={x} y={y + 11} textAnchor="middle" className="fill-fg-2 font-mono text-[11px]">
              {share}%
            </text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={INNER} fill="none" stroke="rgba(255,255,255,0.08)" />
      <circle cx={C} cy={C} r={OUTER} fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 6" />
      {hourly.map((v, h) => {
        const len = INNER + 4 + (v / max) * (OUTER - INNER - 6);
        return (
          <motion.path
            key={h}
            d={arc(INNER + 2, len, angle(h) + 0.025, angle(h + 1) - 0.025)}
            fill={v === max && v > 0 ? "var(--accent)" : "rgba(255,255,255,0.28)"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: v === 0 ? 0.25 : 1, scale: 1 }}
            style={{ originX: `${C}px`, originY: `${C}px` }}
            transition={{ delay: 0.2 + h * 0.025, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <title>{`${String(h).padStart(2, "0")}:00 — ${v} play${v === 1 ? "" : "s"}`}</title>
          </motion.path>
        );
      })}
      {[0, 6, 12, 18].map((h) => {
        const [x, y] = polar(angle(h), INNER - 16);
        return (
          <text key={h} x={x} y={y + 4} textAnchor="middle" className="fill-faint font-mono text-[10px]">
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
    </svg>
  );
}
