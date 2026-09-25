import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { MotionSetting, Settings, Theme, Tier } from "../types";
import { load, save, sessionFlag, setSessionFlag } from "../lib/storage";
import { detectTier, lowerTier, prefersReducedMotion, probeFps, runtime } from "../lib/quality";
import { configureSound, sfx } from "../lib/sound";
import { bus, type Point } from "../lib/bus";
import { useMedia } from "../lib/useMedia";

const DEFAULTS: Settings = {
  theme: "night",
  quality: "auto",
  motion: "system",
  sound: true,
  volume: 0.5,
  buddy: true,
  fps: false,
};

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** Tatsächlich aktive Qualitätsstufe. */
  tier: Tier;
  /** Im Auto-Modus erkannte Stufe. */
  autoTier: Tier;
  reduced: boolean;
  /** Startet nach dem Intro die FPS-Messung des Auto-Modus. */
  calibrate: () => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

function resolveReduced(motion: MotionSetting, systemReduced: boolean) {
  return motion === "reduced" || (motion === "system" && systemReduced);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULTS, ...load<Partial<Settings>>("settings", {}) }));
  const [autoTier, setAutoTier] = useState<Tier>(() => {
    const cached = load<Tier | null>("autoTier", null);
    return cached ?? detectTier();
  });
  const systemReduced = useMedia("(prefers-reduced-motion: reduce)");
  const reduced = resolveReduced(settings.motion, systemReduced);
  const tier: Tier = settings.quality === "auto" ? (reduced ? "low" : autoTier) : settings.quality;

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  useEffect(() => save("settings", settings), [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.tier = tier;
    root.dataset.motion = reduced ? "reduced" : "full";
    runtime.tier = tier;
    runtime.reduced = reduced;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.theme === "night" ? "#0c0a26" : "#f6e9ff");
  }, [settings.theme, tier, reduced]);

  useEffect(() => configureSound({ enabled: settings.sound, volume: settings.volume }), [settings.sound, settings.volume]);

  const calibrate = useCallback(() => {
    if (sessionFlag("calibrated") || prefersReducedMotion()) return;
    setSessionFlag("calibrated");
    window.setTimeout(async () => {
      if (document.hidden) return;
      const fps = await probeFps();
      if (fps < 40) {
        setAutoTier((t) => {
          const next = lowerTier(t);
          save("autoTier", next);
          return next;
        });
      } else {
        save("autoTier", autoTier);
      }
    }, 900);
  }, [autoTier]);

  // Stimmungswechsel als kreisförmige Enthüllung vom auslösenden Button aus.
  useEffect(() => {
    return bus.on("theme:toggle", (origin?: Point) => {
      const next: Theme = settings.theme === "night" ? "day" : "night";
      const apply = () => {
        flushSync(() => setSettings((s) => ({ ...s, theme: next })));
        document.documentElement.dataset.theme = next;
      };
      sfx.toggle();
      const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
      if (!doc.startViewTransition || reduced) {
        apply();
      } else {
        const x = origin?.x ?? window.innerWidth / 2;
        const y = origin?.y ?? 80;
        const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        const vt = doc.startViewTransition(apply);
        vt.ready
          .then(() => {
            document.documentElement.animate(
              { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
              { duration: 720, easing: "cubic-bezier(.65,0,.2,1)", pseudoElement: "::view-transition-new(root)" },
            );
          })
          .catch(() => undefined);
      }
      bus.emit("theme:changed", { theme: next });
    });
  }, [settings.theme, reduced]);

  const value = useMemo(() => ({ settings, update, tier, autoTier, reduced, calibrate }), [settings, update, tier, autoTier, reduced, calibrate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings außerhalb des SettingsProvider");
  return ctx;
}
