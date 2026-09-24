"use client";

import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** 24-hour activity curve from recent plays (Recharts, lazy-loaded). */
export default function HourlyActivity({ hourly, peakHour }: { hourly: number[]; peakHour: number | null }) {
  const data = hourly.map((plays, hour) => ({ hour, plays }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="activity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            ticks={[0, 3, 6, 9, 12, 15, 18, 21, 23]}
            tickFormatter={(h: number) => String(h).padStart(2, "0")}
            tick={{ fill: "var(--color-faint)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.2)" }}
            contentStyle={{ background: "var(--color-ink-2)", border: "1px solid var(--color-line-strong)", borderRadius: 6, fontSize: 12 }}
            labelFormatter={(h) => `${String(h).padStart(2, "0")}:00–${String((Number(h) + 1) % 24).padStart(2, "0")}:00`}
            formatter={(v) => [`${v} plays`, ""]}
          />
          {peakHour !== null && (
            <ReferenceLine
              x={peakHour}
              stroke="var(--accent)"
              strokeDasharray="3 3"
              label={{ value: "PEAK", position: "top", fill: "var(--accent)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            />
          )}
          <Area type="monotone" dataKey="plays" stroke="var(--accent)" strokeWidth={1.5} fill="url(#activity)" animationDuration={1200} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
