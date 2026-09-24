"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import type { Metric, MetricId } from "@/analytics/types";

const SIZE = 560;
const C = SIZE / 2;
const R = 200;

function point(i: number, n: number, r: number) {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;
}

/** Large radial "Music DNA" shape. Axes without enough data are drawn dashed at the centre. */
export function DnaRadar({ metrics, selected, onSelect }: { metrics: Metric[]; selected: MetricId | null; onSelect: (id: MetricId) => void }) {
  const n = metrics.length;
  const path = useMemo(() => {
    const pts = metrics.map((m, i) => point(i, n, (Math.max(m.value ?? 0, 4) / 100) * R));
    return smoothClosedPath(pts);
  }, [metrics, n]);
  const collapsed = useMemo(() => smoothClosedPath(metrics.map((_, i) => point(i, n, 6))), [metrics, n]);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full overflow-visible" role="img" aria-label="Music DNA radar chart">
      <defs>
        <radialGradient id="dna-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.32" />
        </radialGradient>
        <filter id="dna-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="rgba(255,255,255,0.07)" strokeDasharray={f === 1 ? undefined : "2 5"} />
      ))}
      {metrics.map((m, i) => {
        const [x, y] = point(i, n, R);
        return <line key={m.id} x1={C} y1={C} x2={x} y2={y} stroke={selected === m.id ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.06)"} />;
      })}

      <motion.path d={path} fill="var(--accent)" opacity={0.25} filter="url(#dna-glow)" initial={{ d: collapsed }} animate={{ d: path }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
      <motion.path
        d={path}
        fill="url(#dna-fill)"
        stroke="var(--accent)"
        strokeWidth={1.5}
        initial={{ d: collapsed, opacity: 0 }}
        animate={{ d: path, opacity: 1 }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      />
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }} style={{ originX: "50%", originY: "50%" }}>
        <circle cx={C} cy={C} r={R + 26} fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="1 9" />
      </motion.g>

      {metrics.map((m, i) => {
        const v = m.value;
        const [px, py] = point(i, n, ((v ?? 0) / 100) * R);
        const [lx, ly] = point(i, n, R + 48);
        const anchor = Math.abs(lx - C) < 8 ? "middle" : lx > C ? "start" : "end";
        const active = selected === m.id;
        return (
          <g key={m.id} className="cursor-pointer" onClick={() => onSelect(m.id)} onMouseEnter={() => onSelect(m.id)} role="button" tabIndex={0} aria-label={`${m.label}: ${v ?? "not enough data"}`} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(m.id)}>
            <circle cx={lx} cy={ly} r={36} fill="transparent" />
            {v !== null ? (
              <motion.circle cx={px} cy={py} r={active ? 5 : 3} fill={active ? "var(--color-fg)" : "var(--accent)"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 + i * 0.06 }} />
            ) : (
              <circle cx={C} cy={C} r={3} fill="none" stroke="rgba(255,255,255,0.3)" strokeDasharray="2 2" />
            )}
            <text x={lx} y={ly - 6} textAnchor={anchor} className={`font-mono text-[10.5px] tracking-[0.14em] uppercase ${active ? "fill-fg" : "fill-muted"}`}>
              {m.axis}
            </text>
            <text x={lx} y={ly + 12} textAnchor={anchor} className={`font-mono text-[13px] ${active ? "fill-[var(--accent)]" : "fill-fg-2"}`}>
              {v === null ? "—" : v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Catmull-Rom → cubic Bézier closed path, so the shape feels organic rather than polygonal. */
function smoothClosedPath(pts: readonly (readonly [number, number])[]) {
  const n = pts.length;
  if (n < 3) return "";
  const k = 0.18;
  let d = `M ${pts[0]![0].toFixed(2)} ${pts[0]![1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += ` C ${c1[0]!.toFixed(2)} ${c1[1]!.toFixed(2)}, ${c2[0]!.toFixed(2)} ${c2[1]!.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d} Z`;
}
