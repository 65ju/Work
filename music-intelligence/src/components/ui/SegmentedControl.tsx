"use client";

import { motion } from "motion/react";
import { useId } from "react";

type Option<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="relative inline-flex rounded-full border border-line bg-ink-1/60 p-1 backdrop-blur">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative rounded-full font-mono uppercase tracking-[0.14em] transition-colors ${
              size === "sm" ? "px-3 py-1 text-[10px]" : "px-4 py-1.5 text-[11px]"
            } ${active ? "text-ink" : "text-muted hover:text-fg"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-fg"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
