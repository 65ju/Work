"use client";

import { useEffect } from "react";
import { extractPalette } from "@/lib/client/palette";
import { pickImage } from "@/lib/client/format";
import { useNowPlaying, useProfile } from "@/lib/client/queries";

/** Drives the global ambient colours from the artwork that best represents "now". */
export function AmbientController() {
  const { data: profile } = useProfile();
  const { data: now } = useNowPlaying();

  const playing = now?.playback?.isPlaying ? now.playback.track : null;
  const topArtist = profile?.summary.topArtist?.artist;
  const topTrack = profile?.summary.topTrack?.track;
  const source =
    pickImage(playing?.album.images, 64) ?? pickImage(topTrack?.album.images, 64) ?? pickImage(topArtist?.images, 64);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    extractPalette(source).then((p) => {
      if (cancelled || !p) return;
      const root = document.documentElement.style;
      root.setProperty("--ambient-1", p.primary);
      root.setProperty("--ambient-2", p.secondary);
      root.setProperty("--ambient-3", p.tertiary);
      root.setProperty("--accent", p.accent);
      root.setProperty("--ambient-strength", String(0.35 + p.saturation * 0.6));
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  return null;
}

export function AmbientBackground({ intensity = 1 }: { intensity?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <div
        className="absolute -top-1/4 -left-1/4 h-[80vmax] w-[80vmax] rounded-full blur-[120px] will-change-transform"
        style={{
          background: "radial-gradient(circle at center, var(--ambient-1), transparent 62%)",
          opacity: `calc(var(--ambient-strength) * ${intensity})`,
          animation: "drift-a 38s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-1/4 -bottom-1/3 h-[70vmax] w-[70vmax] rounded-full blur-[140px] will-change-transform"
        style={{
          background: "radial-gradient(circle at center, var(--ambient-2), transparent 60%)",
          opacity: `calc(var(--ambient-strength) * ${intensity * 0.9})`,
          animation: "drift-b 46s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 h-[45vmax] w-[45vmax] rounded-full blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--ambient-3), transparent 65%)", opacity: 0.35 * intensity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(9,9,10,0.85)_100%)]" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
