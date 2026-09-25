import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { Note } from "../types";
import { load, save } from "../lib/storage";
import { createSeedNotes } from "../data/content";

type Action =
  | { type: "add"; note: Note }
  | { type: "update"; id: string; patch: Partial<Note> }
  | { type: "remove"; id: string }
  | { type: "restore"; note: Note }
  | { type: "front"; id: string }
  | { type: "bulk"; patches: Record<string, Partial<Note>> }
  | { type: "replace"; notes: Note[] };

function maxZ(notes: Note[]) {
  return notes.reduce((m, n) => Math.max(m, n.z), 0);
}

function reducer(state: Note[], action: Action): Note[] {
  switch (action.type) {
    case "add":
      return [...state, { ...action.note, z: maxZ(state) + 1 }];
    case "update":
      return state.map((n) => (n.id === action.id ? { ...n, ...action.patch, updatedAt: Date.now() } : n));
    case "remove":
      return state.filter((n) => n.id !== action.id);
    case "restore":
      return state.some((n) => n.id === action.note.id) ? state : [...state, action.note];
    case "front": {
      const top = maxZ(state);
      const target = state.find((n) => n.id === action.id);
      if (!target || target.z === top) return state;
      return state.map((n) => (n.id === action.id ? { ...n, z: top + 1 } : n));
    }
    case "bulk":
      return state.map((n) => (action.patches[n.id] ? { ...n, ...action.patches[n.id] } : n));
    case "replace":
      return action.notes;
  }
}

function isNote(v: unknown): v is Note {
  if (!v || typeof v !== "object") return false;
  const n = v as Record<string, unknown>;
  return typeof n.id === "string" && typeof n.title === "string" && typeof n.x === "number" && typeof n.y === "number";
}

export function sanitizeNotes(input: unknown): Note[] | null {
  if (!Array.isArray(input)) return null;
  const valid = input.filter(isNote);
  if (valid.length !== input.length) return null;
  return valid.map((n, i) => ({
    ...n,
    body: typeof n.body === "string" ? n.body : "",
    w: typeof n.w === "number" ? n.w : 236,
    h: typeof n.h === "number" ? n.h : 188,
    rot: typeof n.rot === "number" ? n.rot : 0,
    z: typeof n.z === "number" ? n.z : i + 1,
    done: Boolean(n.done),
  }));
}

interface NotesCtx {
  notes: Note[];
  add: (note: Note) => void;
  update: (id: string, patch: Partial<Note>) => void;
  remove: (id: string) => void;
  restore: (note: Note) => void;
  bringToFront: (id: string) => void;
  bulk: (patches: Record<string, Partial<Note>>) => void;
  replaceAll: (notes: Note[]) => void;
}

const Ctx = createContext<NotesCtx | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, dispatch] = useReducer(reducer, undefined, () => sanitizeNotes(load<unknown>("notes", null)) ?? createSeedNotes());

  // Entprelltes Speichern – Drag & Resize erzeugen viele kleine Änderungen.
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save("notes", notes), 180);
  }, [notes]);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  useEffect(() => {
    const flush = () => save("notes", notesRef.current);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const add = useCallback((note: Note) => dispatch({ type: "add", note }), []);
  const update = useCallback((id: string, patch: Partial<Note>) => dispatch({ type: "update", id, patch }), []);
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const restore = useCallback((note: Note) => dispatch({ type: "restore", note }), []);
  const bringToFront = useCallback((id: string) => dispatch({ type: "front", id }), []);
  const bulk = useCallback((patches: Record<string, Partial<Note>>) => dispatch({ type: "bulk", patches }), []);
  const replaceAll = useCallback((next: Note[]) => dispatch({ type: "replace", notes: next }), []);

  const value = useMemo(
    () => ({ notes, add, update, remove, restore, bringToFront, bulk, replaceAll }),
    [notes, add, update, remove, restore, bringToFront, bulk, replaceAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotes(): NotesCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotes außerhalb des NotesProvider");
  return ctx;
}
