import { useSyncExternalStore } from "react";

export type ToastTone = "info" | "break" | "done" | "focus" | "trash";
export interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
  action?: { label: string; run: () => void };
}

let items: ToastItem[] = [];
let nextId = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

export function toast(text: string, tone: ToastTone = "info", ms = 8000, action?: ToastItem["action"]) {
  const id = ++nextId;
  items = [...items.slice(-2), { id, text, tone, action }];
  emit();
  window.setTimeout(() => dismiss(id), ms);
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function useToasts() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => items,
    () => items,
  );
}
