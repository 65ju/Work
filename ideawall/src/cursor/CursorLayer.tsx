import { useEffect, useRef } from "react";
import { CursorEngine, type Rect } from "./engine";
import type { CursorTraits } from "./traits";
import { registerFx } from "./fx";

const INTERACTIVE = "button, a, [role='button'], [role='switch'], select, label.chip, .pin, .grip, [data-magnet]";
const TEXT = "input:not([type='range']):not([type='checkbox']):not([type='color']), textarea, [contenteditable='true']";

interface Props {
  traits: CursorTraits;
  enabled: boolean;
  /** Ändert sich beim Theme-Wechsel → Farben neu lesen. */
  themeKey: string;
  lowPower: boolean;
}

/**
 * Vollflächige Canvas über allem: zeichnet den eigenen Mauszeiger und dient
 * gleichzeitig als Effekt-Ebene für Partikel-Feedback der Oberfläche.
 */
export function CursorLayer({ traits, enabled, themeKey, lowPower }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CursorEngine | null>(null);
  const hoverEl = useRef<Element | null>(null);
  const dragging = useRef(false);
  const custom = enabled && typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  const customRef = useRef(custom);
  customRef.current = custom;

  useEffect(() => {
    const canvas = ref.current!;
    const engine = new CursorEngine(canvas, traits, {
      hoverRect: () => {
        const el = hoverEl.current;
        if (!el || dragging.current || !el.isConnected) return null;
        const r = el.getBoundingClientRect();
        if (r.width > 340 || r.height > 220) return null;
        return { x: r.left, y: r.top, w: r.width, h: r.height } satisfies Rect;
      },
    });
    engineRef.current = engine;

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      const more = engine.step(dt);
      raf = more ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const resize = () => {
      engine.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.75));
      wake();
    };
    resize();
    registerFx(engine, wake);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      engine.move(e.clientX, e.clientY);
      const target = e.target as Element | null;
      hoverEl.current = target?.closest?.(INTERACTIVE) ?? null;
      engine.textMode = !!target?.closest?.(TEXT);
      // Im Vorschau-Spielfeld zeichnet die Vorschau selbst – dort den echten Zeiger ausblenden.
      engine.showCursor = customRef.current && !target?.closest?.("[data-cursor-hide]");
      if (e.buttons && hoverEl.current?.closest(".pin, .grip")) dragging.current = true;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      engine.move(e.clientX, e.clientY);
      engine.down();
      dragging.current = !!(e.target as Element | null)?.closest?.(".pin, .grip");
      wake();
    };
    const onUp = () => {
      engine.up();
      dragging.current = false;
      wake();
    };
    const onLeave = () => {
      engine.leave();
      wake();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      registerFx(null, null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowPower]);

  // Eigenschaften, Sichtbarkeit und Farben aktualisieren
  useEffect(() => {
    const engine = engineRef.current;
    const canvas = ref.current;
    if (!engine || !canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    engine.setTraits(reduced ? { ...traits, motion: "direct", trail: "none" } : traits);
    engine.showCursor = custom;
    const css = getComputedStyle(document.documentElement);
    engine.accent = css.getPropertyValue("--accent").trim() || "#7c9cff";
    engine.light = document.documentElement.dataset.light === "true";
    canvas.style.mixBlendMode = custom && traits.color === "invert" ? "difference" : "normal";
    document.documentElement.classList.toggle("custom-cursor", custom);
  }, [traits, custom, themeKey]);

  return <canvas ref={ref} className="cursor-canvas" aria-hidden />;
}
