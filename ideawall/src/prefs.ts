import type { LucideIcon } from "lucide-react";
import { Briefcase, CalendarRange, Clock3, Link2, ListTodo, StickyNote, Timer } from "lucide-react";
import { THEMES, type ThemeId } from "./themes";
import { DEFAULT_CURSOR, normalizeTraits, type CursorTraits } from "./cursor/traits";

export type WidgetId = "clock" | "workday" | "week" | "focus" | "todo" | "board" | "links";
/** s = eine Spalte, m = zwei Spalten, l = volle Breite */
export type WidgetSize = "s" | "m" | "l";

export type FxLevel = "auto" | "high" | "balanced" | "low";

/** Berufsschul-Regel: Wochentag (1 = Mo … 5 = Fr) und in welchen Kalenderwochen. */
export type Parity = "all" | "odd" | "even";
export interface SchoolRule {
  wd: number;
  weeks: Parity;
}
export interface DateRange {
  from: string;
  to: string;
}
export type RedactKind = "Kunde" | "Person" | "Projekt" | "Firma";
export interface RedactEntry {
  term: string;
  kind: RedactKind;
}

export interface Prefs {
  name: string;
  theme: ThemeId;
  /** "theme" = Akzentfarbe des Themes */
  accent: string;
  cursorOn: boolean;
  cursor: CursorTraits;
  sound: boolean;
  fx: FxLevel;
  start: string;
  end: string;
  breakStart: string;
  alerts: boolean;
  order: WidgetId[];
  hidden: WidgetId[];
  sizes: Record<WidgetId, WidgetSize>;
  /** Berichtsheft */
  job: string;
  trainingYear: string;
  schoolRules: SchoolRule[];
  schoolStart: string;
  schoolEnd: string;
  schoolHolidays: DateRange[];
  redact: RedactEntry[];
  reportReminder: boolean;
}

export const WIDGETS: Record<WidgetId, { title: string; icon: LucideIcon; size: WidgetSize }> = {
  clock: { title: "Heute", icon: Clock3, size: "s" },
  workday: { title: "Arbeitstag", icon: Briefcase, size: "m" },
  week: { title: "Woche", icon: CalendarRange, size: "s" },
  focus: { title: "Fokus", icon: Timer, size: "s" },
  todo: { title: "To-dos", icon: ListTodo, size: "s" },
  board: { title: "Pinnwand", icon: StickyNote, size: "l" },
  links: { title: "Schnellzugriff", icon: Link2, size: "l" },
};

export const WIDGET_IDS = Object.keys(WIDGETS) as WidgetId[];

export const ACCENTS = [
  { name: "Theme", value: "theme" },
  { name: "Blau", value: "#4f8cff" },
  { name: "Violett", value: "#8b5cf6" },
  { name: "Türkis", value: "#14b8a6" },
  { name: "Grün", value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
  { name: "Rosa", value: "#ec4899" },
];

/** Die Mittagspause dauert immer eine Stunde und beginnt zwischen 12 und 13 Uhr. */
export const BREAK_OPTIONS = ["12:00", "12:15", "12:30", "12:45", "13:00"];

export const DEFAULT_PREFS: Prefs = {
  name: "Julian",
  theme: "aurora",
  accent: "theme",
  cursorOn: true,
  cursor: DEFAULT_CURSOR,
  sound: true,
  fx: "auto",
  start: "08:00",
  end: "17:00",
  breakStart: "12:00",
  alerts: true,
  order: WIDGET_IDS,
  hidden: [],
  sizes: Object.fromEntries(WIDGET_IDS.map((id) => [id, WIDGETS[id].size])) as Record<WidgetId, WidgetSize>,
  job: "Fachinformatiker für Systemintegration",
  trainingYear: "",
  schoolRules: [
    { wd: 2, weeks: "all" },
    { wd: 4, weeks: "odd" },
  ],
  schoolStart: "07:40",
  schoolEnd: "14:40",
  schoolHolidays: [],
  redact: [],
  reportReminder: true,
};

/** Führt gespeicherte Einstellungen mit den Standards zusammen (auch nach Updates mit neuen Widgets). */
export function normalizePrefs(raw: Partial<Prefs> | null | undefined): Prefs {
  const p = { ...DEFAULT_PREFS, ...(raw ?? {}) };
  // Alte Werte (hell/dunkel) auf Themes abbilden
  const legacy = p.theme as string;
  p.theme = legacy === "light" ? "frost" : THEMES.some((t) => t.id === legacy) ? p.theme : "aurora";
  if (legacy === "dark" || legacy === "light" || !ACCENTS.some((a) => a.value === p.accent)) p.accent = "theme";
  p.cursor = normalizeTraits(p.cursor);
  if (!["auto", "high", "balanced", "low"].includes(p.fx)) p.fx = "auto";
  const order = (p.order ?? []).filter((id): id is WidgetId => WIDGET_IDS.includes(id));
  for (const id of WIDGET_IDS) if (!order.includes(id)) order.push(id);
  return {
    ...p,
    order,
    hidden: (p.hidden ?? []).filter((id) => WIDGET_IDS.includes(id)),
    sizes: { ...DEFAULT_PREFS.sizes, ...(p.sizes ?? {}) },
    breakStart: BREAK_OPTIONS.includes(p.breakStart) ? p.breakStart : DEFAULT_PREFS.breakStart,
    schoolRules: Array.isArray(p.schoolRules) ? p.schoolRules.filter((r) => r && r.wd >= 1 && r.wd <= 5) : DEFAULT_PREFS.schoolRules,
    schoolHolidays: Array.isArray(p.schoolHolidays) ? p.schoolHolidays.filter((r) => r?.from && r?.to) : [],
    redact: Array.isArray(p.redact) ? p.redact.filter((r) => r && typeof r.term === "string") : [],
  };
}

export function possessive(name: string) {
  const n = name.trim() || "Julian";
  return /[sßxz]$/i.test(n) ? `${n}’` : `${n}s`;
}
