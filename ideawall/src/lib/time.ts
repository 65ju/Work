import type { Prefs } from "../prefs";

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const toHHMM = (min: number) => {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export function dur(min: number) {
  const m = Math.max(0, Math.ceil(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} h ${String(r).padStart(2, "0")} min` : `${r} min`;
}

export function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 86_400_000 + 1) / 7);
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const dateFmt = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export type Phase = "weekend" | "before" | "morning" | "break" | "afternoon" | "final" | "done";

export interface DayInfo {
  phase: Phase;
  start: number;
  end: number;
  bs: number;
  be: number;
  hasBreak: boolean;
  /** aktuelle Minute des Tages inkl. Sekundenbruchteil */
  cur: number;
  worked: number;
  planned: number;
  /** Anteil der Zeitspanne Start → Feierabend */
  progress: number;
  toEnd: number;
  next: { label: string; at: number } | null;
}

/** Berechnet Phase, Countdown-Ziel und Fortschritt des Arbeitstags inklusive Mittagspause. */
export function getDayInfo(now: Date, p: Pick<Prefs, "start" | "end" | "breakStart">): DayInfo {
  const start = toMin(p.start);
  const end = Math.max(start + 30, toMin(p.end));
  const bs = clamp(toMin(p.breakStart), start, end);
  const be = clamp(bs + 60, start, end);
  const hasBreak = be - bs >= 1;
  const cur = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const planned = end - start - (be - bs);
  const worked = clamp(Math.min(cur, end) - start, 0, end - start) - clamp(Math.min(cur, be) - bs, 0, be - bs);

  let phase: Phase;
  if (weekend) phase = "weekend";
  else if (cur < start) phase = "before";
  else if (hasBreak && cur < bs) phase = "morning";
  else if (hasBreak && cur < be) phase = "break";
  else if (cur < end - 30) phase = hasBreak ? "afternoon" : "morning";
  else if (cur < end) phase = "final";
  else phase = "done";

  const next =
    phase === "before"
      ? { label: "Arbeitsbeginn", at: start }
      : phase === "morning" && hasBreak
        ? { label: "Mittagspause", at: bs }
        : phase === "break"
          ? { label: "Pausenende", at: be }
          : phase === "morning" || phase === "afternoon" || phase === "final"
            ? { label: "Feierabend", at: end }
            : null;

  return {
    phase,
    start,
    end,
    bs,
    be,
    hasBreak,
    cur,
    worked: weekend ? 0 : Math.max(0, worked),
    planned,
    progress: clamp((cur - start) / (end - start), 0, 1),
    toEnd: end - cur,
    next,
  };
}

export const PHASE_META: Record<Phase, { label: string; tone: "muted" | "accent" | "break" | "warn" | "ok" }> = {
  weekend: { label: "Wochenende", tone: "ok" },
  before: { label: "Noch nicht gestartet", tone: "muted" },
  morning: { label: "Vormittag", tone: "accent" },
  break: { label: "Mittagspause", tone: "break" },
  afternoon: { label: "Nachmittag", tone: "accent" },
  final: { label: "Endspurt", tone: "warn" },
  done: { label: "Feierabend", tone: "ok" },
};

/** Begrüßung passend zur Tageszeit – rund um die eigene Mittagspause „Guten Mittag“. */
export function greeting(now: Date, d: DayInfo): string {
  const m = now.getHours() * 60 + now.getMinutes();
  if (m < 5 * 60 || m >= 22 * 60) return "Gute Nacht";
  const lunchStart = d.hasBreak ? d.bs - 45 : 11 * 60 + 30;
  const lunchEnd = d.hasBreak ? d.be : 13 * 60 + 30;
  if (m >= lunchStart && m < lunchEnd) return "Guten Mittag";
  if (m < 11 * 60) return "Guten Morgen";
  if (m < 17 * 60) return "Guten Tag";
  return "Guten Abend";
}

/** Kurze Dauer für enge Stellen: „1:48 h“ bzw. „43 min“. */
export function durShort(min: number) {
  const m = Math.max(0, Math.ceil(min));
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h` : `${m} min`;
}
