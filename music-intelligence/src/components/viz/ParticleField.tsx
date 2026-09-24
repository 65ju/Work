"use client";

import { useMemo } from "react";
import { cssVar, useCanvasLoop } from "./useCanvasLoop";

type Particle = { x: number; y: number; r: number; speed: number; phase: number; orbit: number };

/** Slow-moving dust that orbits the centre; used behind the DNA and landing visuals. */
export function ParticleField({ count = 90, className = "", orbit = false }: { count?: number; className?: string; orbit?: boolean }) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = Math.sin(i * 12.9898) * 43758.5453;
        const rnd = (k: number) => {
          const v = Math.sin(seed + k * 78.233) * 43758.5453;
          return v - Math.floor(v);
        };
        return { x: rnd(1), y: rnd(2), r: 0.4 + rnd(3) * 1.3, speed: 0.02 + rnd(4) * 0.06, phase: rnd(5) * Math.PI * 2, orbit: 0.25 + rnd(6) * 0.75 };
      }),
    [count],
  );

  const ref = useCanvasLoop(
    (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const accent = cssVar("--accent", "#dcc9a8");
      ctx.fillStyle = accent;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) / 2;
      for (const p of particles) {
        let x: number;
        let y: number;
        if (orbit) {
          const a = p.phase + t * p.speed * 0.6;
          const rr = R * (0.55 + p.orbit * 0.5) + Math.sin(t * 0.5 + p.phase) * 6;
          x = cx + Math.cos(a) * rr;
          y = cy + Math.sin(a) * rr * 0.92;
        } else {
          x = ((p.x + t * p.speed * 0.05) % 1) * w;
          y = (p.y + Math.sin(t * p.speed + p.phase) * 0.02) * h;
        }
        ctx.globalAlpha = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.8 + p.phase));
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    [particles, orbit],
  );

  return <canvas ref={ref} className={`pointer-events-none ${className}`} aria-hidden="true" />;
}
