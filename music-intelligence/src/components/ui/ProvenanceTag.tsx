import type { Provenance } from "@/analytics/types";

const LABEL: Record<Provenance, string> = {
  spotify: "Spotify data",
  derived: "Calculated by this app",
  algorithm: "App recommendation",
  ai: "AI generated",
};

const COLOR: Record<Provenance, string> = {
  spotify: "bg-spotify",
  derived: "bg-derived",
  algorithm: "bg-algorithm",
  ai: "bg-ai",
};

/** Small, consistent label that keeps data sources visibly separate across the app. */
export function ProvenanceTag({ kind, label, className = "" }: { kind: Provenance; label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted ${className}`}
      title={LABEL[kind]}
    >
      <span className={`size-1.5 rounded-full ${COLOR[kind]}`} aria-hidden="true" />
      {label ?? LABEL[kind]}
    </span>
  );
}
