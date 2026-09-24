"use client";

import { motion } from "motion/react";

/** Segmented meter, the app's signature way of showing a 0–100 value. */
export function Meter({
  value,
  segments = 24,
  className = "",
  delay = 0,
  tone = "accent",
}: {
  value: number | null;
  segments?: number;
  className?: string;
  delay?: number;
  tone?: "accent" | "fg" | "algorithm";
}) {
  const filled = value === null ? 0 : Math.round((value / 100) * segments);
  const color = tone === "accent" ? "var(--accent)" : tone === "algorithm" ? "var(--color-algorithm)" : "var(--color-fg)";
  return (
    <div
      className={`flex h-2.5 items-stretch gap-[3px] ${className}`}
      role="meter"
      aria-valuenow={value ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={value === null ? "Not enough data" : `${value} of 100`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <motion.span
          key={i}
          className="flex-1 rounded-[1px]"
          initial={{ opacity: 0, scaleY: 0.3 }}
          animate={{ opacity: 1, scaleY: 1, backgroundColor: i < filled ? color : "rgba(255,255,255,0.08)" }}
          transition={{ delay: delay + i * 0.018, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={value === null ? { backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 4px)" } : undefined}
        />
      ))}
    </div>
  );
}
