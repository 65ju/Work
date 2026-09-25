/** Typisierter Event-Bus: Buddy, Effekte und Panels reagieren lose gekoppelt aufeinander. */
export interface Point {
  x: number;
  y: number;
}

export interface BusEvents {
  "note:new": { from?: Point; title?: string; body?: string; category?: import("../types").Category };
  "note:created": Point;
  "note:deleted": Point;
  "note:done": Point & { done: boolean };
  "note:landed": Point;
  "board:arrange": void;
  "board:arranged": void;
  "board:search-empty": void;
  "search:focus": void;
  "focus:toggle": void;
  "focus:start": { minutes: number };
  "focus:end": { completed: boolean; minutes: number };
  "idea:open": void;
  "theme:toggle": Point | undefined;
  "theme:changed": { theme: import("../types").Theme };
  "buddy:call": Point | undefined;
  "buddy:say": { text: string; mood?: "happy" | "error" | "thinking" | "success" };
  "ui:hover": Point & { label?: string };
  "ui:error": Point & { message?: string };
  "ui:success": Point & { message?: string };
  "coffee:request": void;
  "coffee:refilled": void;
  "trash:hit": void;
  "duck:squeak": void;
  "shortcuts:open": void;
  "settings:open": void;
}

type Handler<T> = (payload: T) => void;

class Bus {
  private map = new Map<keyof BusEvents, Set<Handler<never>>>();

  on<K extends keyof BusEvents>(type: K, fn: Handler<BusEvents[K]>): () => void {
    let set = this.map.get(type);
    if (!set) {
      set = new Set();
      this.map.set(type, set);
    }
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof BusEvents>(type: K, ...args: BusEvents[K] extends void ? [] : [BusEvents[K]]): void {
    const set = this.map.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        (fn as Handler<BusEvents[K] | undefined>)(args[0]);
      } catch (err) {
        console.error(`[bus] ${String(type)}`, err);
      }
    }
  }
}

export const bus = new Bus();

/** Mittelpunkt eines Elements in Viewport-Koordinaten. */
export function centerOf(el: Element | null | undefined): Point | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
