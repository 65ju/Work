import { useSyncExternalStore } from "react";

/* Ein gemeinsamer Sekundentakt für alle Widgets – genau auf den Sekundenwechsel ausgerichtet. */
let current = new Date();
const subs = new Set<() => void>();
let timer = 0;

function schedule() {
  timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}
function tick() {
  current = new Date();
  subs.forEach((fn) => fn());
  schedule();
}
function subscribe(fn: () => void) {
  subs.add(fn);
  if (subs.size === 1) {
    current = new Date();
    schedule();
  }
  return () => {
    subs.delete(fn);
    if (!subs.size) window.clearTimeout(timer);
  };
}

export function useNow(): Date {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
