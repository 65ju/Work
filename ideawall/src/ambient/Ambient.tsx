import { memo, useEffect, useRef, useState } from "react";
import type { Theme } from "../themes";
import type { Phase } from "../lib/time";
import type { ResolvedFx } from "../lib/fxLevel";
import { ShaderAurora } from "./ShaderAurora";

function glowFor(phase: Phase, accent: string, accent2: string) {
  switch (phase) {
    case "break":
      return "#f5a524";
    case "final":
      return "#fb7a3c";
    case "done":
      return "#34d399";
    case "morning":
    case "afternoon":
      return accent;
    default:
      return accent2;
  }
}

interface Props {
  theme: Theme;
  phase: Phase;
  fx: ResolvedFx;
  accent: string;
}

/** Hintergrund-Atmosphäre: Aurora (Shader oder CSS), Tageszeit-Schein, Lichtkegel, Körnung, Vignette. */
export const Ambient = memo(function Ambient({ theme, phase, fx, accent }: Props) {
  const spot = useRef<HTMLDivElement>(null);
  const [shaderFailed, setShaderFailed] = useState(false);
  const useShader = fx === "high" && !shaderFailed && theme.id !== "obsidian" && !theme.light;
  const glow = glowFor(phase, accent, theme.vars["--accent-2"] ?? accent);

  useEffect(() => {
    if (fx === "low" || useShader) return;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let cx = x;
    let cy = y;
    const loop = () => {
      cx += (x - cx) * 0.08;
      cy += (y - cy) * 0.08;
      if (spot.current) spot.current.style.transform = `translate3d(${cx - 400}px, ${cy - 400}px, 0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    loop();
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [fx, useShader]);

  const special = theme.special ?? "none";
  return (
    <div className="ambient" aria-hidden data-special={special}>
      {useShader ? (
        <ShaderAurora colors={theme.aurora} glow={glow} light={!!theme.light} onFail={() => setShaderFailed(true)} />
      ) : (
        theme.id !== "obsidian" && (
          <>
            <div className="aurora a1" style={{ background: `radial-gradient(closest-side, ${theme.aurora[0]}, transparent)` }} />
            <div className="aurora a2" style={{ background: `radial-gradient(closest-side, ${theme.aurora[1]}, transparent)` }} />
            <div className="aurora a3" style={{ background: `radial-gradient(closest-side, ${theme.aurora[2]}, transparent)` }} />
            <div className="phase-glow" style={{ ["--glow" as string]: glow }} />
          </>
        )
      )}
      {theme.id === "obsidian" && <div className="phase-glow obsidian" style={{ ["--glow" as string]: glow }} />}
      {special === "grid" && (
        <div className="synth">
          <div className="synth-sun" />
          <div className="synth-grid" />
        </div>
      )}
      {special === "stars" && <div className="stars" />}
      {fx !== "low" && !useShader && <div ref={spot} className="spot" />}
      <div className="grain" />
      <div className="vignette" />
    </div>
  );
});
