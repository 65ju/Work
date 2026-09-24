import type { Play } from "@/domain/types";
import type { DayPeriod, ListeningPatterns, ListeningSession } from "./types";

const SESSION_GAP_MS = 30 * 60_000;

export function periodOfHour(h: number): DayPeriod {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

function hourFormatter(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "numeric", hourCycle: "h23" });
  } catch {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "numeric", hourCycle: "h23" });
  }
}

function dayFormatter(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" });
  }
}

export function analyzeListening(recent: Play[], timezone: string): ListeningPatterns {
  const plays = [...recent].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const hourly = Array.from({ length: 24 }, () => 0);
  const periods: Record<DayPeriod, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const hf = hourFormatter(timezone);
  const df = dayFormatter(timezone);
  const days = new Set<string>();

  for (const p of plays) {
    const d = new Date(p.playedAt);
    const h = Number(hf.format(d)) % 24;
    hourly[h] = (hourly[h] ?? 0) + 1;
    periods[periodOfHour(h)]++;
    days.add(df.format(d));
  }

  const sessions: ListeningSession[] = [];
  for (const p of plays) {
    const t = new Date(p.playedAt).getTime();
    const last = sessions.at(-1);
    if (last && t - new Date(last.end).getTime() <= SESSION_GAP_MS + p.track.durationMs) {
      last.end = p.playedAt;
      last.plays++;
      last.trackIds.push(p.track.id);
    } else {
      sessions.push({ start: p.playedAt, end: p.playedAt, plays: 1, trackIds: [p.track.id] });
    }
  }

  const first = plays[0]?.playedAt ?? null;
  const last = plays.at(-1)?.playedAt ?? null;
  const spanHours = first && last ? (new Date(last).getTime() - new Date(first).getTime()) / 3_600_000 : 0;
  const peak = plays.length ? hourly.indexOf(Math.max(...hourly)) : null;
  const strongest = plays.length
    ? (Object.entries(periods).sort((a, b) => b[1] - a[1])[0]?.[0] as DayPeriod)
    : null;

  return {
    timezone,
    sampleSize: plays.length,
    firstPlayAt: first,
    lastPlayAt: last,
    spanHours,
    hourly,
    periods,
    strongestPeriod: strongest,
    peakHour: peak,
    sessions: sessions.reverse(),
    distinctDays: days.size,
  };
}
