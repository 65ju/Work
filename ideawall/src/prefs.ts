import type { LucideIcon } from "lucide-react";
import { Briefcase, CalendarRange, Clock3, Link2, ListTodo, StickyNote, Timer } from "lucide-react";

export type WidgetId = "clock" | "workday" | "week" | "focus" | "todo" | "board" | "links";
/** s = eine Spalte, m = zwei Spalten, l = volle Breite */
export type WidgetSize = "s" | "m" | "l";

export interface Prefs {
  name: string;
  theme: "dark" | "light";
  accent: string;
  start: string;
  end: string;
  breakStart: string;
  alerts: boolean;
  order: WidgetId[];
  hidden: WidgetId[];
  sizes: Record<WidgetId, WidgetSize>;
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
  theme: "dark",
  accent: ACCENTS[0].value,
  start: "08:00",
  end: "17:00",
  breakStart: "12:00",
  alerts: true,
  order: WIDGET_IDS,
  hidden: [],
  sizes: Object.fromEntries(WIDGET_IDS.map((id) => [id, WIDGETS[id].size])) as Record<WidgetId, WidgetSize>,
};

/** Führt gespeicherte Einstellungen mit den Standards zusammen (auch nach Updates mit neuen Widgets). */
export function normalizePrefs(raw: Partial<Prefs> | null | undefined): Prefs {
  const p = { ...DEFAULT_PREFS, ...(raw ?? {}) };
  const order = (p.order ?? []).filter((id): id is WidgetId => WIDGET_IDS.includes(id));
  for (const id of WIDGET_IDS) if (!order.includes(id)) order.push(id);
  return {
    ...p,
    order,
    hidden: (p.hidden ?? []).filter((id) => WIDGET_IDS.includes(id)),
    sizes: { ...DEFAULT_PREFS.sizes, ...(p.sizes ?? {}) },
    breakStart: BREAK_OPTIONS.includes(p.breakStart) ? p.breakStart : DEFAULT_PREFS.breakStart,
  };
}

export function possessive(name: string) {
  const n = name.trim() || "Julian";
  return /[sßxz]$/i.test(n) ? `${n}’` : `${n}s`;
}
