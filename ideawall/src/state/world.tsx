import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { load, save } from "../lib/storage";
import { dayKey } from "../lib/time";
import { bus } from "../lib/bus";
import { sfx } from "../lib/sound";

/** Kaffee sinkt in 70 Minuten von 100 % auf 0 %. */
const COFFEE_DRAIN_MS = 70 * 60_000;

interface CoffeeStore {
  level: number;
  at: number;
}

export type FocusStatus = "idle" | "running" | "paused";

interface FocusStore {
  status: FocusStatus;
  minutes: number;
  /** Zeitpunkt, an dem die Session endet (nur „running“). */
  endsAt: number;
  /** Verbleibende Zeit in ms (nur „paused“). */
  remaining: number;
}

interface WorldCtx {
  coffee: number;
  refillCoffee: () => void;
  focus: FocusStore;
  startFocus: (minutes?: number) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => void;
  focusToday: number;
  sessionStart: number;
}

const Ctx = createContext<WorldCtx | null>(null);

function coffeeNow(c: CoffeeStore) {
  return Math.max(0, Math.min(100, c.level - ((Date.now() - c.at) / COFFEE_DRAIN_MS) * 100));
}

const IDLE_FOCUS: FocusStore = { status: "idle", minutes: 25, endsAt: 0, remaining: 0 };

export function WorldProvider({ children }: { children: ReactNode }) {
  const [coffeeStore, setCoffeeStore] = useState<CoffeeStore>(() => load("coffee", { level: 23, at: Date.now() }));
  const [coffee, setCoffee] = useState(() => coffeeNow(coffeeStore));
  const [focus, setFocus] = useState<FocusStore>(() => load("focus", IDLE_FOCUS));
  const [focusByDay, setFocusByDay] = useState<Record<string, number>>(() => load("focusByDay", {}));
  const [sessionStart] = useState(() => Date.now());

  useEffect(() => save("coffee", coffeeStore), [coffeeStore]);
  useEffect(() => save("focus", focus), [focus]);
  useEffect(() => save("focusByDay", focusByDay), [focusByDay]);

  // Kaffee langsam leeren.
  useEffect(() => {
    setCoffee(coffeeNow(coffeeStore));
    const id = window.setInterval(() => setCoffee(coffeeNow(coffeeStore)), 4000);
    return () => window.clearInterval(id);
  }, [coffeeStore]);

  const refillCoffee = useCallback(() => {
    setCoffeeStore({ level: 100, at: Date.now() });
    sfx.pour();
    bus.emit("coffee:refilled");
  }, []);

  const credit = useCallback((minutes: number) => {
    if (minutes <= 0) return;
    const key = dayKey();
    setFocusByDay((m) => ({ ...m, [key]: (m[key] ?? 0) + minutes }));
  }, []);

  const startFocus = useCallback((minutes?: number) => {
    setFocus((f) => {
      const m = minutes ?? f.minutes ?? 25;
      return { status: "running", minutes: m, endsAt: Date.now() + m * 60_000, remaining: m * 60_000 };
    });
    bus.emit("focus:start", { minutes: minutes ?? 25 });
  }, []);

  const pauseFocus = useCallback(() => {
    setFocus((f) => (f.status === "running" ? { ...f, status: "paused", remaining: Math.max(0, f.endsAt - Date.now()) } : f));
  }, []);

  const resumeFocus = useCallback(() => {
    setFocus((f) => (f.status === "paused" ? { ...f, status: "running", endsAt: Date.now() + f.remaining } : f));
  }, []);

  const focusRef = useRef(focus);
  focusRef.current = focus;

  const stopFocus = useCallback(() => {
    const f = focusRef.current;
    if (f.status === "idle") return;
    const left = f.status === "running" ? Math.max(0, f.endsAt - Date.now()) : f.remaining;
    const spent = Math.round((f.minutes * 60_000 - left) / 60_000);
    credit(spent);
    setFocus({ ...IDLE_FOCUS, minutes: f.minutes });
    bus.emit("focus:end", { completed: false, minutes: spent });
  }, [credit]);

  // Abschluss erkennen.
  useEffect(() => {
    if (focus.status !== "running") return;
    const check = () => {
      const f = focusRef.current;
      if (f.status === "running" && Date.now() >= f.endsAt) {
        credit(f.minutes);
        setFocus({ ...IDLE_FOCUS, minutes: f.minutes });
        sfx.success();
        bus.emit("focus:end", { completed: true, minutes: f.minutes });
      }
    };
    check();
    const id = window.setInterval(check, 1000);
    return () => window.clearInterval(id);
  }, [focus.status, credit]);

  useEffect(() => bus.on("focus:toggle", () => (focusRef.current.status === "idle" ? startFocus() : stopFocus())), [startFocus, stopFocus]);

  const focusToday = focusByDay[dayKey()] ?? 0;

  const value = useMemo(
    () => ({ coffee, refillCoffee, focus, startFocus, pauseFocus, resumeFocus, stopFocus, focusToday, sessionStart }),
    [coffee, refillCoffee, focus, startFocus, pauseFocus, resumeFocus, stopFocus, focusToday, sessionStart],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorld(): WorldCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorld außerhalb des WorldProvider");
  return ctx;
}
