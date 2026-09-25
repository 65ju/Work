import type { Prefs } from "../prefs";
import { journalStore, type DayKind } from "./data";
import { isoWeekOf, parseIso, toMin, weekDates } from "./dates";

type SchedulePrefs = Pick<Prefs, "start" | "end" | "breakStart" | "schoolRules" | "schoolStart" | "schoolEnd" | "schoolHolidays">;

export const KIND_META: Record<DayKind, { label: string; short: string }> = {
  work: { label: "Betrieb", short: "B" },
  school: { label: "Berufsschule", short: "S" },
  vacation: { label: "Urlaub", short: "U" },
  sick: { label: "Krank", short: "K" },
  off: { label: "Frei", short: "F" },
  weekend: { label: "Wochenende", short: "–" },
};

/** Tagesart laut Stundenplan (ohne Handeintrag). */
export function plannedKind(date: string, p: SchedulePrefs): DayKind {
  const d = parseIso(date);
  const wd = d.getDay();
  if (wd === 0 || wd === 6) return "weekend";
  if (p.schoolHolidays.some((h) => date >= h.from && date <= h.to)) return "work";
  const odd = isoWeekOf(d).week % 2 === 1;
  const school = p.schoolRules.some((r) => r.wd === wd && (r.weeks === "all" || (r.weeks === "odd") === odd));
  return school ? "school" : "work";
}

export function kindOf(date: string, p: SchedulePrefs): DayKind {
  return journalStore.get()[date]?.kind ?? plannedKind(date, p);
}

export const isManual = (date: string) => !!journalStore.get()[date]?.kind;

/** Anrechenbare Minuten eines Tages (Betrieb ohne Mittagspause, Schule komplett). */
export function dayMinutes(date: string, kind: DayKind, p: SchedulePrefs): number {
  const t = journalStore.get()[date]?.times ?? p;
  if (kind === "school") return Math.max(0, toMin(t.schoolEnd) - toMin(t.schoolStart));
  if (kind === "work") return Math.max(0, toMin(t.end) - toMin(t.start) - 60);
  return 0;
}

export function weekPlan(week: string, p: SchedulePrefs) {
  return weekDates(week).map((date) => {
    const kind = kindOf(date, p);
    return { date, kind, minutes: dayMinutes(date, kind, p), manual: isManual(date) };
  });
}

/** Letzter Tag der Woche, an dem gearbeitet wird oder Schule ist. */
export function lastActiveDay(week: string, p: SchedulePrefs): string | null {
  const days = weekPlan(week, p).filter((d) => d.kind === "work" || d.kind === "school");
  return days.length ? days[days.length - 1].date : null;
}
