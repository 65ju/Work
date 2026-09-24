"use client";

import { cssVar, useCanvasLoop } from "./useCanvasLoop";

/**
 * Abstract, non-audio visual: a ring of 180 bars driven by layered sine noise,
 * with a slow second ring — reads as "music" without pretending to be a spectrum.
 */
export function LandingVisual({ className = "" }: { className?: string }) {
  const ref = useCanvasLoop((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h) * 0.26;
    const accent = cssVar("--accent", "#dcc9a8");
    const bars = 180;
    ctx.lineCap = "round";
    for (let ring = 0; ring < 2; ring++) {
      const r0 = base * (ring === 0 ? 1 : 1.45);
      ctx.strokeStyle = ring === 0 ? accent : "rgba(238,237,233,0.5)";
      for (let i = 0; i < bars; i++) {
        const a = (i / bars) * Math.PI * 2 + t * (ring === 0 ? 0.05 : -0.03);
        const n =
          Math.sin(i * 0.21 + t * 1.3) * 0.5 +
          Math.sin(i * 0.053 - t * 0.7 + ring) * 0.35 +
          Math.sin(i * 0.9 + t * 2.1) * 0.15;
        const len = (ring === 0 ? 26 : 12) * (0.35 + Math.abs(n));
        ctx.globalAlpha = ring === 0 ? 0.25 + Math.abs(n) * 0.6 : 0.12 + Math.abs(n) * 0.2;
        ctx.lineWidth = ring === 0 ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
        ctx.stroke();
      }
    }
    // soft core
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.95);
    g.addColorStop(0, "rgba(220,201,168,0.10)");
    g.addColorStop(1, "rgba(220,201,168,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, base * 0.95, 0, Math.PI * 2);
    ctx.fill();
  });
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
