"use client";

import { motion, AnimatePresence } from "motion/react";
import { Laptop, Smartphone, Speaker } from "lucide-react";
import { useEffect, useState } from "react";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { Artwork } from "@/components/ui/Artwork";
import { artistNames, formatDuration } from "@/lib/client/format";
import { useNowPlaying } from "@/lib/client/queries";

function useInterpolatedProgress(base: number, fetchedAt: number, playing: boolean, duration: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [playing]);
  return Math.min(duration, playing ? base + (now - fetchedAt) : base);
}

function DeviceIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  const Icon = t.includes("phone") ? Smartphone : t.includes("computer") ? Laptop : Speaker;
  return <Icon className="size-3" aria-hidden="true" />;
}

export function Equalizer({ active }: { active: boolean }) {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden="true">
      {[0.6, 1, 0.4, 0.8].map((h, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-[var(--accent)]"
          animate={active ? { height: ["30%", `${h * 100}%`, "45%", "90%", "30%"] } : { height: "30%" }}
          transition={active ? { duration: 1.1 + i * 0.17, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
        />
      ))}
    </span>
  );
}

/** Shows the user's current Spotify playback. Audio is never streamed by this app. */
export function MiniPlayer({ variant = "rail" }: { variant?: "rail" | "bar" }) {
  const { data } = useNowPlaying();
  const pb = data?.playback;
  const track = pb?.track;
  const progress = useInterpolatedProgress(pb?.progressMs ?? 0, pb?.fetchedAt ?? Date.now(), Boolean(pb?.isPlaying), track?.durationMs ?? 1);

  return (
    <AnimatePresence mode="popLayout">
      {track && pb ? (
        <motion.a
          key={track.id}
          href={track.url ?? undefined}
          target="_blank"
          rel="noreferrer noopener"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`group block ${variant === "rail" ? "rounded-md border border-line bg-ink-1/70 p-3 backdrop-blur-xl" : "flex items-center gap-3 px-4 py-2"}`}
          aria-label={`${pb.isPlaying ? "Now playing" : "Paused"}: ${track.name} by ${artistNames(track.artists)}. Open in Spotify`}
        >
          <div className={variant === "rail" ? "flex items-center gap-3" : "flex min-w-0 flex-1 items-center gap-3"}>
            <motion.div
              animate={pb.isPlaying ? { scale: [1, 1.035, 1] } : { scale: 1 }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative shrink-0"
            >
              <Artwork images={track.album.images} alt={track.album.name} size={variant === "rail" ? 44 : 36} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Equalizer active={pb.isPlaying} />
                <span className="eyebrow !text-[9px]">{pb.isPlaying ? "Now playing" : "Paused"}</span>
              </div>
              <p className="mt-1 truncate text-[13px] font-medium">{track.name}</p>
              <p className="truncate text-xs text-muted">{artistNames(track.artists)}</p>
            </div>
            <SpotifyIcon className="size-4 shrink-0 text-spotify opacity-60 transition group-hover:opacity-100" />
          </div>
          {variant === "rail" && (
            <>
              <div className="mt-3 h-[2px] overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-linear" style={{ width: `${(progress / track.durationMs) * 100}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-faint">
                <span>{formatDuration(progress)}</span>
                {pb.device && (
                  <span className="flex items-center gap-1 truncate">
                    <DeviceIcon type={pb.device.type} /> {pb.device.name}
                  </span>
                )}
                <span>{formatDuration(track.durationMs)}</span>
              </div>
            </>
          )}
        </motion.a>
      ) : null}
    </AnimatePresence>
  );
}
