import { useEffect, type RefObject } from "react";

/**
 * Maus- (und optional Scroll-) Parallax für alle Kinder mit `data-depth`.
 * Setzt Transforms direkt am Element (kein React-Re-Render, keine Style-Kaskade)
 * und stoppt die rAF-Schleife, sobald die Bewegung eingeschwungen ist.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, enabled: boolean, withScroll: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]")).map((el) => ({
      el,
      d: Number(el.dataset.depth) || 0,
    }));
    if (!enabled) {
      layers.forEach((l) => (l.el.style.transform = ""));
      return;
    }
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let lastScroll = -1;
    let raf = 0;
    let visible = true;

    const frame = () => {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      const s = withScroll ? Math.min(window.scrollY, 1200) : 0;
      for (const l of layers) {
        l.el.style.transform = `translate3d(${(-cx * l.d).toFixed(2)}px, ${(-cy * l.d * 0.55 + s * l.d * 0.0045).toFixed(2)}px, 0)`;
      }
      const moving = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 || s !== lastScroll;
      lastScroll = s;
      raf = moving && visible ? requestAnimationFrame(frame) : 0;
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      kick();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    });
    io.observe(root);
    window.addEventListener("pointermove", onMove, { passive: true });
    if (withScroll) window.addEventListener("scroll", kick, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", kick);
      cancelAnimationFrame(raf);
    };
  }, [ref, enabled, withScroll]);
}

/** Pausiert alle CSS-Animationen eines Bereichs, sobald er den Viewport verlässt. */
export function usePauseOffscreen(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        el.dataset.offscreen = entry.isIntersecting ? "false" : "true";
        el.querySelectorAll("svg").forEach((svg) => {
          if (entry.isIntersecting) svg.unpauseAnimations?.();
          else svg.pauseAnimations?.();
        });
      },
      { rootMargin: "80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}
