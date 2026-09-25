import { createStore } from "../lib/store";
import { hhmm, iso, today } from "./dates";

/*
 * Alle Daten, die Pinnwand, To-dos, Archiv und Berichtsheft gemeinsam nutzen.
 * Browser-Speicher ist der schnelle Puffer, der verbundene Ordner die dauerhafte Ablage (siehe vault.ts).
 */

export type DayKind = "work" | "school" | "vacation" | "sick" | "off" | "weekend";

export interface Pin {
  id: string;
  text: string;
  /** horizontale Position als Anteil der freien Breite */
  fx: number;
  y: number;
  color: number;
  rot: number;
  z: number;
  /** Tag, an dem der Zettel entstanden ist */
  created?: string;
  /** Tag der letzten Textänderung */
  edited?: string;
  /** Schul-Stempel */
  school?: boolean;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  created?: string;
  /** Zeitpunkt des Abhakens (ISO) */
  doneAt?: string;
}

export type SnapPin = Omit<Pin, "z">;

export interface DoneItem {
  key: string;
  text: string;
  at: string;
  source: "pin" | "todo";
  school?: boolean;
}

export interface DayTimes {
  start: string;
  end: string;
  breakStart: string;
  schoolStart: string;
  schoolEnd: string;
}

export interface DayRecord {
  date: string;
  /** Von Hand gesetzte Tagesart (sonst Stundenplan) */
  kind?: DayKind;
  /** Stand der Pinnwand an diesem Tag */
  board?: SnapPin[];
  done: DoneItem[];
  times?: DayTimes;
  updated: number;
}

export type Journal = Record<string, DayRecord>;

export interface ReportDay {
  date: string;
  kind: DayKind;
  betrieb: string;
  schule: string;
  minutes: number;
}

export interface Report {
  week: string;
  days: ReportDay[];
  saved: number;
}

export const PAPERS = ["#ffe98a", "#bdf2d5", "#c6e2ff", "#ffd1df", "#e1d3ff", "#f4f0e6"];

export const pinsStore = createStore<Pin[]>([], "pins-v3");
export const todosStore = createStore<Todo[]>([], "todos-v3");
export const journalStore = createStore<Journal>({}, "journal-v1");
export const reportsStore = createStore<Record<string, Report>>({}, "reports-v1");

// Alte Zettel ohne Datum zählen ab heute.
if (pinsStore.get().some((p) => !p.created)) pinsStore.set((ps) => ps.map((p) => (p.created ? p : { ...p, created: today() })));

let currentTimes: DayTimes | null = null;

/** Die App meldet hier ihre Zeiten, damit jeder Tagesstand weiß, wie der Tag geplant war. */
export function syncTimes(t: DayTimes) {
  currentTimes = t;
}

function updateDay(date: string, fn: (r: DayRecord) => DayRecord) {
  journalStore.set((j) => {
    const prev = j[date] ?? { date, done: [], updated: 0 };
    const withTimes = prev.times || date !== today() || !currentTimes ? prev : { ...prev, times: currentTimes };
    return { ...j, [date]: { ...fn(withTimes), updated: Date.now() } };
  });
}

const snap = (ps: Pin[]): SnapPin[] => ps.map(({ z: _z, ...rest }) => rest);

/** Heutigen Stand der Pinnwand festhalten. */
export function snapshotBoard() {
  const pins = pinsStore.get();
  updateDay(today(), (r) => ({ ...r, board: snap(pins) }));
}

let snapTimer = 0;
pinsStore.subscribe(() => {
  window.clearTimeout(snapTimer);
  snapTimer = window.setTimeout(snapshotBoard, 600);
});

/** Etwas ist erledigt worden (Zettel im Papierkorb oder To-do abgehakt). */
export function recordDone(item: Omit<DoneItem, "at">) {
  if (!item.text.trim()) return;
  updateDay(today(), (r) => ({ ...r, done: [...r.done.filter((d) => d.key !== item.key), { ...item, at: hhmm(new Date()) }] }));
}

/** Rückgängig: Eintrag aus den letzten Tagen wieder entfernen. */
export function unrecordDone(key: string) {
  const j = journalStore.get();
  for (const date of Object.keys(j)) {
    if (j[date].done.some((d) => d.key === key)) updateDay(date, (r) => ({ ...r, done: r.done.filter((d) => d.key !== key) }));
  }
}

export function setDayKind(date: string, kind: DayKind | null) {
  updateDay(date, (r) => {
    const next = { ...r };
    if (kind) next.kind = kind;
    else delete next.kind;
    return next;
  });
}

/** Pinnwand, wie sie an einem Tag aussah (fehlt der Tag, gilt der letzte Stand davor). */
export function boardAt(date: string): { pins: SnapPin[]; exact: boolean } {
  if (date >= today()) return { pins: snap(pinsStore.get()), exact: true };
  const j = journalStore.get();
  if (j[date]?.board) return { pins: j[date].board!, exact: true };
  const earlier = Object.keys(j)
    .filter((d) => d < date && j[d].board)
    .sort();
  const last = earlier[earlier.length - 1];
  return { pins: last ? j[last].board! : [], exact: false };
}

export type ActivityKind = "neu" | "bearbeitet" | "erledigt" | "todo";
export interface Activity {
  key: string;
  text: string;
  kind: ActivityKind;
  school: boolean;
  at?: string;
}

/** Was an einem Tag passiert ist – die Rohdaten fürs Berichtsheft. */
export function activityOn(date: string, schoolDay: boolean): Activity[] {
  const r = journalStore.get()[date];
  const out: Activity[] = [];
  const board = r?.board ?? (date === today() ? snap(pinsStore.get()) : []);
  for (const p of board) {
    if (!p.text.trim()) continue;
    if (p.created === date) out.push({ key: `pin:${p.id}`, text: p.text, kind: "neu", school: !!p.school });
    else if (p.edited === date) out.push({ key: `pin:${p.id}`, text: p.text, kind: "bearbeitet", school: !!p.school });
  }
  for (const d of r?.done ?? []) {
    out.push({ key: d.key + ":done", text: d.text, kind: d.source === "todo" ? "todo" : "erledigt", school: d.source === "todo" ? schoolDay : !!d.school, at: d.at });
  }
  return out;
}

export const nowIso = () => new Date().toISOString();
export { iso };
