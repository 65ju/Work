import type { CursorEngine } from "./engine";

/** Globale Partikel-Effekte über die Cursor-Canvas (auch wenn der eigene Zeiger aus ist). */
let engine: CursorEngine | null = null;
let wake: (() => void) | null = null;

export function registerFx(e: CursorEngine | null, w: (() => void) | null) {
  engine = e;
  wake = w;
}

export const fx = {
  dust(x: number, y: number, count = 8) {
    engine?.burst(x, y, "dust", "rgba(210,214,225,0.9)", count, 1);
    wake?.();
  },
  paper(x: number, y: number, color: string, count = 12) {
    engine?.burst(x, y, "paper", color, count, 1);
    wake?.();
  },
  sparks(x: number, y: number, color: string, count = 14) {
    engine?.burst(x, y, "spark", color, count, 1);
    wake?.();
  },
  confetti(x: number, y: number) {
    engine?.burst(x, y, "confetti", "#ffd166", 0, 1);
    for (const c of ["#ff5d8f", "#ffd166", "#06d6a0", "#4cc9f0", "#b388ff"]) engine?.burst(x, y, "confetti", c, 5, 1.2);
    wake?.();
  },
};
