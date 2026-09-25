import { useEffect, useState } from "react";
import { load, save } from "./storage";
import type { FxLevel } from "../prefs";

export type ResolvedFx = "high" | "balanced" | "low";

function probe(ms: number): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const step = (t: number) => {
      frames++;
      if (t - start < ms) requestAnimationFrame(step);
      else resolve((frames * 1000) / (t - start));
    };
    requestAnimationFrame(step);
  });
}

/**
 * Effekt-Stufe. „Auto“ startet ausgewogen, misst die Bildrate, probiert bei
 * Luft nach oben „Maximal“ (Shader) und fällt zurück, falls es ruckelt.
 */
export function useFxLevel(pref: FxLevel): ResolvedFx {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [auto, setAuto] = useState<ResolvedFx>(() => load<ResolvedFx | null>("fx-auto", null) ?? "balanced");

  useEffect(() => {
    if (pref !== "auto" || reduced || load<ResolvedFx | null>("fx-auto", null)) return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => window.setTimeout(r, 1500));
      const base = await probe(1500);
      if (cancelled) return;
      if (base < 40) {
        setAuto("low");
        save("fx-auto", "low");
        return;
      }
      if (base < 55 || (navigator.hardwareConcurrency ?? 4) < 4) {
        save("fx-auto", "balanced");
        return;
      }
      setAuto("high");
      await new Promise((r) => window.setTimeout(r, 1200));
      const withShader = await probe(1500);
      if (cancelled) return;
      const next = withShader < 48 ? "balanced" : "high";
      setAuto(next);
      save("fx-auto", next);
    })();
    return () => {
      cancelled = true;
    };
  }, [pref, reduced]);

  if (reduced) return "low";
  return pref === "auto" ? auto : pref;
}
