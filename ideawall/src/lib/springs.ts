/** Feder-Presets aus dem Motion-System (PROMPT.md, Abschnitt 4.2). */
export const spring = {
  snappy: { type: "spring", stiffness: 600, damping: 32, mass: 1 },
  bouncy: { type: "spring", stiffness: 420, damping: 14, mass: 1 },
  soft: { type: "spring", stiffness: 170, damping: 24, mass: 1 },
  heavy: { type: "spring", stiffness: 220, damping: 22, mass: 1.6 },
  needle: { type: "spring", stiffness: 110, damping: 7, mass: 1 },
} as const;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
