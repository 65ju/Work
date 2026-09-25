import type { Tier } from "../types";

export const TIER_LABEL: Record<Tier, string> = {
  low: "Sparsam",
  balanced: "Ausgewogen",
  high: "Maximal",
};

/** Partikel-Multiplikator und Canvas-Pixeldichte je Qualitätsstufe (PROMPT.md, Abschnitt 5). */
export const TIER_CONFIG: Record<Tier, { particles: number; dpr: number; parallax: boolean; tilt: boolean }> = {
  low: { particles: 0.35, dpr: 1, parallax: false, tilt: false },
  balanced: { particles: 0.7, dpr: 1.5, parallax: true, tilt: true },
  high: { particles: 1, dpr: 2, parallax: true, tilt: true },
};

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Erste Einschätzung anhand von Hardware-Hinweisen – wird danach per FPS-Messung korrigiert. */
export function detectTier(): Tier {
  if (prefersReducedMotion()) return "low";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (cores <= 2 || memory <= 2) return "low";
  if (cores <= 6 || memory <= 4) return "balanced";
  return "high";
}

/** Misst die tatsächliche Bildrate über eine kurze Zeitspanne. */
export function probeFps(durationMs = 2200): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const step = (t: number) => {
      frames++;
      if (t - start < durationMs) requestAnimationFrame(step);
      else resolve((frames * 1000) / (t - start));
    };
    requestAnimationFrame(step);
  });
}

export function lowerTier(t: Tier): Tier {
  return t === "high" ? "balanced" : "low";
}

/** Aktuelle Stufe für Code außerhalb von React (Partikel, Buddy). */
export const runtime = {
  tier: "balanced" as Tier,
  reduced: false,
};
