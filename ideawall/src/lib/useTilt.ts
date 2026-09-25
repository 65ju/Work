import { useEffect, type RefObject } from "react";
import { runtime, TIER_CONFIG } from "./quality";

/**
 * Karten neigen sich dem Cursor zu, ein Glanzpunkt folgt dem Zeiger.
 * Schreibt nur CSS-Variablen auf das eine Element (kein React-Re-Render).
 */
export function useTilt(ref: RefObject<HTMLElement | null>, max = 5) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let px = 0.5;
    let py = 0.5;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--rx", `${((0.5 - py) * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((px - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty("--lx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--ly", `${(py * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !TIER_CONFIG[runtime.tier].tilt || runtime.reduced) return;
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      el.dataset.tilting = "true";
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      px = 0.5;
      py = 0.5;
      el.dataset.tilting = "false";
      if (!raf) raf = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [ref, max]);
}
