import type { ImageRef, TimeRange } from "@/domain/types";

export const RANGE_LABEL: Record<TimeRange, string> = { short: "4 weeks", medium: "6 months", long: "1 year+" };

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function pickImage(images: ImageRef[] | undefined, target = 300): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((i) => (i.width ?? 0) >= target) ?? sorted.at(-1))?.url ?? null;
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

export function formatLongDuration(ms: number) {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export const artistNames = (artists: { name: string }[]) => artists.map((a) => a.name).join(", ");

export const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
