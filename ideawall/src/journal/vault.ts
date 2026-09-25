import { createStore } from "../lib/store";
import { journalStore, pinsStore, reportsStore, todosStore, type DayRecord, type Journal, type Pin, type Report, type Todo } from "./data";
import { isoWeekOf, parseIso, parseWeekKey } from "./dates";

/*
 * Ablage im lokalen Ordner (File System Access API, Chrome & Edge).
 * Der Ordner-Zugriff wird in IndexedDB gemerkt; mit „Bei jedem Besuch erlauben“ läuft alles ohne Klick.
 *
 * Aufbau:
 *   pinnwand.json · todos.json · einstellungen.json
 *   2026/KW39/2026-09-21.json …  bericht-KW39.json · Berichtsheft-KW39.docx
 */

export type VaultStatus = "unsupported" | "none" | "prompt" | "ready" | "saving" | "error";
export interface VaultState {
  status: VaultStatus;
  name?: string;
  lastSaved?: number;
  error?: string;
}

type PermHandle = FileSystemDirectoryHandle & {
  queryPermission(o: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(o: { mode: "readwrite" }): Promise<PermissionState>;
  values(): AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};
type PickerWindow = Window & {
  showDirectoryPicker?: (o?: { id?: string; mode?: "readwrite"; startIn?: string }) => Promise<PermHandle>;
};

export const supported = typeof window !== "undefined" && "showDirectoryPicker" in window;

export const vaultStore = createStore<VaultState>({ status: supported ? "none" : "unsupported" });
const setState = (patch: Partial<VaultState>) => vaultStore.set((s) => ({ ...s, ...patch }));

let root: PermHandle | null = null;

/* ---------------- IndexedDB: nur für den Ordner-Handle ---------------- */

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open("ideawall", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("kv");
      open.onerror = () => resolve(undefined);
      open.onsuccess = () => {
        const req = fn(open.result.transaction("kv", mode).objectStore("kv"));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => resolve(undefined);
      };
    } catch {
      resolve(undefined);
    }
  });
}

/* ---------------- Pfade ---------------- */

const pad = (n: number) => String(n).padStart(2, "0");

function weekDir(year: number, week: number) {
  return `${year}/KW${pad(week)}`;
}

export const dayPath = (date: string) => {
  const w = isoWeekOf(parseIso(date));
  return `${weekDir(w.year, w.week)}/${date}.json`;
};

export const reportBase = (weekKey: string) => {
  const w = parseWeekKey(weekKey);
  return { dir: weekDir(w.year, w.week), kw: pad(w.week) };
};

/* ---------------- Schreiben ---------------- */

async function fileIn(path: string, create: boolean) {
  if (!root) throw new Error("Kein Ordner");
  const parts = path.split("/");
  const name = parts.pop()!;
  let dir: FileSystemDirectoryHandle = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create });
  return dir.getFileHandle(name, { create });
}

async function writePath(path: string, data: string | Blob) {
  const fh = await fileIn(path, true);
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const f = await (await fileIn(path, false)).getFile();
    return JSON.parse(await f.text()) as T;
  } catch {
    return null;
  }
}

const pending = new Map<string, () => string | Blob>();
let timer = 0;
let flushing = false;

function queue(path: string, produce: () => string | Blob) {
  pending.set(path, produce);
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void flush(), 1000);
}

async function flush() {
  if (!root || flushing) return;
  const st = vaultStore.get().status;
  if (st !== "ready" && st !== "error") return;
  flushing = true;
  setState({ status: "saving" });
  try {
    while (pending.size) {
      const [path, produce] = pending.entries().next().value as [string, () => string | Blob];
      pending.delete(path);
      await writePath(path, produce());
    }
    setState({ status: "ready", lastSaved: Date.now(), error: undefined });
  } catch (e) {
    const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
    setState({ status: denied ? "prompt" : "error", error: e instanceof Error ? e.message : String(e) });
  } finally {
    flushing = false;
    if (pending.size && vaultStore.get().status === "ready") timer = window.setTimeout(() => void flush(), 1000);
  }
}

/** Sofort schreiben (z. B. die fertige .docx). Gibt false zurück, wenn kein Ordner bereitsteht. */
export async function writeNow(path: string, data: string | Blob): Promise<boolean> {
  if (!root || (vaultStore.get().status !== "ready" && vaultStore.get().status !== "saving")) return false;
  try {
    await writePath(path, data);
    setState({ lastSaved: Date.now() });
    return true;
  } catch {
    return false;
  }
}

const json = (v: unknown) => JSON.stringify(v, null, 2);

let settings: unknown = null;
let describe: (r: DayRecord) => Record<string, unknown> = () => ({});

/** Die App meldet Einstellungen und wie ein Tag beschrieben wird (Tagesart, Stunden). */
export function setSettings(s: unknown, describeDay: (r: DayRecord) => Record<string, unknown>) {
  settings = s;
  describe = describeDay;
  queue("einstellungen.json", () => json(settings));
}

const dayFile = (date: string) => () => {
  const r = journalStore.get()[date];
  return json({ ...describe(r), ...r });
};

function queueAll() {
  queue("pinnwand.json", () => json(pinsStore.get()));
  queue("todos.json", () => json(todosStore.get()));
  if (settings) queue("einstellungen.json", () => json(settings));
  for (const date of Object.keys(journalStore.get())) queue(dayPath(date), dayFile(date));
  for (const week of Object.keys(reportsStore.get())) queueReport(week);
}

function queueReport(week: string) {
  const { dir, kw } = reportBase(week);
  queue(`${dir}/bericht-KW${kw}.json`, () => json(reportsStore.get()[week]));
}

// Änderungen beobachten und nur Betroffenes schreiben
let prevJournal = journalStore.get();
journalStore.subscribe(() => {
  const j = journalStore.get();
  for (const date of Object.keys(j)) if (j[date] !== prevJournal[date]) queue(dayPath(date), dayFile(date));
  prevJournal = j;
});
pinsStore.subscribe(() => queue("pinnwand.json", () => json(pinsStore.get())));
todosStore.subscribe(() => queue("todos.json", () => json(todosStore.get())));
let prevReports = reportsStore.get();
reportsStore.subscribe(() => {
  const r = reportsStore.get();
  for (const w of Object.keys(r)) if (r[w] !== prevReports[w]) queueReport(w);
  prevReports = r;
});

/* ---------------- Einlesen (neuer Browser, gleicher Ordner) ---------------- */

async function importFromFolder() {
  if (!root) return;
  const pins = await readJson<Pin[]>("pinnwand.json");
  if (pins?.length && !pinsStore.get().length) pinsStore.set(pins);
  const todos = await readJson<Todo[]>("todos.json");
  if (todos?.length && !todosStore.get().length) todosStore.set(todos);

  const days: Journal = {};
  const reports: Record<string, Report> = {};
  try {
    for await (const y of root.values()) {
      if (y.kind !== "directory" || !/^\d{4}$/.test(y.name)) continue;
      for await (const w of (y as PermHandle).values()) {
        if (w.kind !== "directory" || !/^KW\d{2}$/.test(w.name)) continue;
        for await (const f of (w as PermHandle).values()) {
          if (f.kind !== "file") continue;
          try {
            if (/^\d{4}-\d{2}-\d{2}\.json$/.test(f.name)) {
              const r = JSON.parse(await (await (f as FileSystemFileHandle).getFile()).text()) as DayRecord;
              if (r?.date) days[r.date] = { date: r.date, kind: r.kind, board: r.board, done: r.done ?? [], times: r.times, updated: r.updated ?? 0 };
            } else if (/^bericht-KW\d{2}\.json$/.test(f.name)) {
              const r = JSON.parse(await (await (f as FileSystemFileHandle).getFile()).text()) as Report;
              if (r?.week) reports[r.week] = r;
            }
          } catch {
            /* kaputte Datei überspringen */
          }
        }
      }
    }
  } catch {
    /* Ordner nicht lesbar */
  }
  const local = journalStore.get();
  const merged = { ...local };
  let changed = false;
  for (const [date, r] of Object.entries(days)) {
    if (!local[date] || (r.updated ?? 0) > (local[date].updated ?? 0)) {
      merged[date] = r;
      changed = true;
    }
  }
  if (changed) journalStore.set(merged);
  const localReports = reportsStore.get();
  const newReports = Object.entries(reports).filter(([w, r]) => !localReports[w] || r.saved > localReports[w].saved);
  if (newReports.length) reportsStore.set({ ...localReports, ...Object.fromEntries(newReports) });
}

/* ---------------- Verbinden ---------------- */

async function activate(handle: PermHandle) {
  root = handle;
  setState({ status: "ready", name: handle.name, error: undefined });
  await importFromFolder();
  queueAll();
}

/** Ordner auswählen (braucht einen Klick). */
export async function connect(): Promise<boolean> {
  const w = window as PickerWindow;
  if (!w.showDirectoryPicker) return false;
  try {
    const handle = await w.showDirectoryPicker({ id: "berichtsheft", mode: "readwrite", startIn: "documents" });
    await idb("readwrite", (s) => s.put(handle, "dir"));
    await activate(handle);
    return true;
  } catch {
    return false;
  }
}

/** Nach einem Neustart: Zugriff erneut bestätigen (braucht einen Klick). */
export async function resume(): Promise<boolean> {
  const handle = root ?? (await idb<PermHandle>("readonly", (s) => s.get("dir")));
  if (!handle) return connect();
  try {
    if ((await handle.requestPermission({ mode: "readwrite" })) === "granted") {
      await activate(handle);
      return true;
    }
  } catch {
    /* abgelehnt */
  }
  return false;
}

export async function disconnect() {
  root = null;
  pending.clear();
  await idb("readwrite", (s) => s.delete("dir"));
  setState({ status: "none", name: undefined, lastSaved: undefined });
}

async function init() {
  if (!supported) return;
  const handle = await idb<PermHandle>("readonly", (s) => s.get("dir"));
  if (!handle) return;
  try {
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") await activate(handle);
    else {
      root = handle;
      setState({ status: "prompt", name: handle.name });
    }
  } catch {
    setState({ status: "none" });
  }
}
void init();

/* ---------------- Sicherung ohne Ordner ---------------- */

export function download(name: string, data: Blob | string, type = "application/json") {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportBackup() {
  download(
    `berichtsheft-sicherung-${new Date().toISOString().slice(0, 10)}.json`,
    json({ version: 1, pins: pinsStore.get(), todos: todosStore.get(), journal: journalStore.get(), reports: reportsStore.get(), settings }),
  );
}

export async function importBackup(file: File): Promise<boolean> {
  try {
    const data = JSON.parse(await file.text()) as { pins?: Pin[]; todos?: Todo[]; journal?: Journal; reports?: Record<string, Report> };
    if (data.journal) journalStore.set((j) => ({ ...data.journal, ...j }));
    if (data.reports) reportsStore.set((r) => ({ ...data.reports, ...r }));
    if (data.pins && !pinsStore.get().length) pinsStore.set(data.pins);
    if (data.todos && !todosStore.get().length) todosStore.set(data.todos);
    return true;
  } catch {
    return false;
  }
}
