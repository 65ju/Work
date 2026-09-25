/** Datums-Helfer fürs Berichtsheft. Alle Tage als „JJJJ-MM-TT“ in lokaler Zeit. */

const pad = (n: number) => String(n).padStart(2, "0");

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => iso(new Date());

/** Mittag, damit Zeitumstellungen nie den Tag verschieben. */
export function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** ISO-Kalenderwoche samt Wochenjahr (der 29.12. kann schon KW 1 sein). */
export function isoWeekOf(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7);
  return { year: y, week };
}

export const weekKey = (w: { year: number; week: number }) => `${w.year}-W${pad(w.week)}`;

export function parseWeekKey(key: string): { year: number; week: number } {
  const [y, w] = key.split("-W").map(Number);
  return { year: y, week: w };
}

export const weekOfIso = (s: string) => weekKey(isoWeekOf(parseIso(s)));

export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function mondayOf(s: string): string {
  const d = parseIso(s);
  return addDays(s, -((d.getDay() + 6) % 7));
}

/** Montag bis Freitag einer Kalenderwoche. */
export function weekDates(key: string): string[] {
  const { year, week } = parseWeekKey(key);
  // Der 4. Januar liegt immer in KW 1.
  const jan4 = iso(new Date(year, 0, 4, 12));
  const mon = addDays(mondayOf(jan4), (week - 1) * 7);
  return [0, 1, 2, 3, 4].map((i) => addDays(mon, i));
}

export const shiftWeek = (key: string, n: number) => weekOfIso(addDays(weekDates(key)[0], n * 7));

export const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const WEEKDAY_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export const shortDate = (s: string) => {
  const d = parseIso(s);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
};

export const longDate = (s: string) => {
  const d = parseIso(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export const weekday = (s: string) => parseIso(s).getDay();

export function weekRangeLabel(key: string) {
  const days = weekDates(key);
  return `${shortDate(days[0])} – ${shortDate(days[4])}`;
}

export const hoursLabel = (min: number) => {
  const h = Math.round((min / 60) * 100) / 100;
  return `${String(h).replace(".", ",")} h`;
};
