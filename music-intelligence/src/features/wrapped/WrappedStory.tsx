"use client";

import { AnimatePresence, motion } from "motion/react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ImageRef } from "@/domain/types";
import { Artwork } from "@/components/ui/Artwork";
import { CountUp } from "@/components/ui/CountUp";
import { artistNames, formatDate, pickImage, titleCase } from "@/lib/client/format";
import type { Slide } from "./build";

const DURATION = 6500;
const ease = [0.16, 1, 0.3, 1] as const;

/** Full-screen story player: tap right/left, arrow keys, hold to pause, Esc to close. */
export function WrappedStory({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const last = useRef(performance.now());

  const go = useCallback(
    (delta: number) => {
      setElapsed(0);
      setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + delta)));
    },
    [slides.length],
  );

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const dt = now - last.current;
      last.current = now;
      if (!paused && index < slides.length - 1) {
        setElapsed((e) => {
          if (e + dt >= DURATION) {
            setIndex((i) => Math.min(slides.length - 1, i + 1));
            return 0;
          }
          return e + dt;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, index, slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  const slide = slides[index]!;
  const bg = backdropOf(slide);

  return (
    <motion.div
      className="fixed inset-0 z-[60] overflow-hidden bg-ink text-fg select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Wrapped"
    >
      <AnimatePresence mode="sync">
        <motion.div key={`bg-${index}`} className="absolute inset-0" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease }}>
          {bg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bg} alt="" className="size-full scale-125 object-cover opacity-45 blur-[70px] saturate-150" />
          ) : (
            <div className="size-full bg-[radial-gradient(circle_at_30%_20%,var(--ambient-1),transparent_60%),radial-gradient(circle_at_80%_80%,var(--ambient-2),transparent_55%)]" />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
      <div className="grain absolute inset-0" />

      <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 px-4 pt-[calc(env(safe-area-inset-top)+14px)] sm:px-8">
        {slides.map((_, i) => (
          <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-white" style={{ width: i < index ? "100%" : i === index ? `${index === slides.length - 1 ? 100 : (elapsed / DURATION) * 100}%` : "0%" }} />
          </div>
        ))}
      </div>
      <div className="absolute top-[calc(env(safe-area-inset-top)+28px)] right-4 z-30 flex gap-2 sm:right-8">
        <button onClick={() => setPaused((p) => !p)} className="grid size-9 place-items-center rounded-full bg-black/30 backdrop-blur" aria-label={paused ? "Play" : "Pause"}>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-black/30 backdrop-blur" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <button className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize" aria-label="Previous" onClick={() => go(-1)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} />
      <button className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize" aria-label="Next" onClick={() => go(1)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} />

      <div className="pointer-events-none relative z-[15] mx-auto flex h-full max-w-5xl flex-col justify-center px-6 sm:px-12">
        <AnimatePresence mode="wait">
          <motion.div key={index} initial="hidden" animate="show" exit="exit" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } }, exit: { opacity: 0, transition: { duration: 0.25 } } }}>
            <SlideView slide={slide} onReplay={() => { setIndex(0); setElapsed(0); }} onClose={onClose} />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function backdropOf(s: Slide): string | null {
  const pick = (images: ImageRef[] | undefined) => pickImage(images, 300);
  switch (s.kind) {
    case "intro":
      return pick(s.image);
    case "artist":
      return pick(s.artist.images);
    case "artists":
      return pick(s.artists[0]?.images);
    case "track":
      return pick(s.track.album.images);
    case "tracks":
      return pick(s.tracks[0]?.album.images);
    case "outro":
      return pick(s.artist?.images);
    default:
      return null;
  }
}

const item = {
  hidden: { opacity: 0, y: 36, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease } },
};

function Line({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}

const Eyebrow = ({ children }: { children: ReactNode }) => <Line className="font-mono text-[11px] tracking-[0.2em] text-white/70 uppercase">{children}</Line>;
const Big = ({ children, serif = false }: { children: ReactNode; serif?: boolean }) => (
  <Line className={`mt-4 text-[clamp(3rem,10vw,8.5rem)] leading-[0.9] ${serif ? "font-serif tracking-[-0.02em] italic" : "font-semibold tracking-[-0.05em]"}`}>{children}</Line>
);

function SlideView({ slide: s, onReplay, onClose }: { slide: Slide; onReplay: () => void; onClose: () => void }) {
  switch (s.kind) {
    case "intro":
      return (
        <>
          <Eyebrow>{s.name}&apos;s Wrapped</Eyebrow>
          <Big>{s.title.replace("Your ", "Your ")}</Big>
          <Big serif>in music.</Big>
          <Line className="mt-8 text-sm text-white/70">Tap to continue</Line>
        </>
      );
    case "minutes":
      return (
        <>
          <Eyebrow>You listened for</Eyebrow>
          <Line className="numeric mt-4 text-[clamp(4.5rem,16vw,13rem)] leading-[0.85] font-medium tracking-[-0.06em]">
            <CountUp value={s.minutes} duration={2.2} />
          </Line>
          <Big serif>minutes.</Big>
          <Line className="mt-6 max-w-md text-lg text-white/80">
            {s.plays.toLocaleString()} plays across {s.days} days.
          </Line>
          {s.note && <Line className="mt-2 text-xs text-white/60">{s.note} Minutes are estimated from track lengths.</Line>}
        </>
      );
    case "genre":
      return (
        <>
          <Eyebrow>Your sound was</Eyebrow>
          <Big serif>{titleCase(s.top)}</Big>
          <Line className="mt-6 text-lg text-white/80">{Math.round(s.share * 100)}% of your top artists&apos; genres</Line>
          {s.others.length > 0 && <Line className="mt-3 text-sm text-white/60">followed by {s.others.map(titleCase).join(", ")}</Line>}
        </>
      );
    case "artist":
      return (
        <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <Line>
            <Artwork images={s.artist.images} alt={s.artist.name} size={300} kind="artist" rounded="rounded-[6px]" className="!size-[min(64vw,300px)] shadow-2xl" priority />
          </Line>
          <div>
            <Eyebrow>Your top artist</Eyebrow>
            <Big>{s.artist.name}</Big>
            {s.plays !== null && <Line className="mt-6 text-lg text-white/80">You played them {s.plays} times.</Line>}
          </div>
        </div>
      );
    case "artists":
      return (
        <>
          <Eyebrow>Your top artists</Eyebrow>
          <ol className="mt-8 flex flex-col gap-4">
            {s.artists.map((a, i) => (
              <Line key={a.id} className="flex items-center gap-5">
                <span className="numeric w-10 text-2xl text-white/60">{i + 1}</span>
                <Artwork images={a.images} alt={a.name} size={64} kind="artist" rounded="rounded-full" />
                <span className="truncate text-[clamp(1.5rem,4vw,3rem)] font-semibold tracking-tight">{a.name}</span>
              </Line>
            ))}
          </ol>
        </>
      );
    case "track":
      return (
        <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <Line>
            <Artwork images={s.track.album.images} alt={s.track.album.name} size={300} className="!size-[min(64vw,300px)] shadow-2xl" priority />
          </Line>
          <div>
            <Eyebrow>Your top song</Eyebrow>
            <Big>{s.track.name}</Big>
            <Line className="mt-4 text-xl text-white/80">{artistNames(s.track.artists)}</Line>
            {s.plays !== null && <Line className="mt-3 text-sm text-white/60">{s.plays} plays</Line>}
          </div>
        </div>
      );
    case "tracks":
      return (
        <>
          <Eyebrow>Your top songs</Eyebrow>
          <ol className="mt-8 flex flex-col gap-4">
            {s.tracks.map((t, i) => (
              <Line key={t.id} className="flex items-center gap-5">
                <span className="numeric w-10 text-2xl text-white/60">{i + 1}</span>
                <Artwork images={t.album.images} alt={t.album.name} size={60} />
                <span className="min-w-0">
                  <span className="block truncate text-[clamp(1.25rem,3vw,2.25rem)] font-semibold tracking-tight">{t.name}</span>
                  <span className="block truncate text-white/70">{artistNames(t.artists)}</span>
                </span>
              </Line>
            ))}
          </ol>
        </>
      );
    case "time":
      return (
        <>
          <Eyebrow>Your music comes alive</Eyebrow>
          <Big serif>{s.period}</Big>
          {s.peakHour !== null && <Line className="mt-6 text-lg text-white/80">Peak hour: {String(s.peakHour).padStart(2, "0")}:00</Line>}
          <Line className="mt-2 text-xs text-white/60">Based on your most recent plays.</Line>
        </>
      );
    case "streak":
      return (
        <>
          <Eyebrow>Your longest streak</Eyebrow>
          <Line className="numeric mt-4 text-[clamp(4.5rem,16vw,13rem)] leading-[0.85] font-medium tracking-[-0.06em]">
            <CountUp value={s.longest} />
          </Line>
          <Big serif>days in a row.</Big>
          {s.biggestDayMinutes !== null && s.biggestDay && (
            <Line className="mt-6 text-lg text-white/80">
              Biggest day: {s.biggestDayMinutes} minutes on {formatDate(s.biggestDay)}.
            </Line>
          )}
        </>
      );
    case "personality":
      return (
        <>
          <Eyebrow>Your listening style</Eyebrow>
          <Big serif>{s.name}</Big>
          <Line className="mt-6 max-w-xl text-xl leading-snug text-white/85">{s.description}</Line>
        </>
      );
    case "phase":
      return (
        <>
          <Eyebrow>Right now you&apos;re in</Eyebrow>
          <Big serif>{s.label}</Big>
          <Line className="mt-6 text-lg text-white/80">{s.detail}</Line>
          {s.artists.length > 0 && <Line className="mt-2 text-sm text-white/65">{s.artists.join(" · ")}</Line>}
        </>
      );
    case "outro":
      return (
        <div className="pointer-events-auto">
          <Eyebrow>{s.title}</Eyebrow>
          <Line className="mt-6 grid max-w-3xl grid-cols-2 gap-x-10 gap-y-8 border-t border-white/20 pt-8">
            <Summary label="Top artist" value={s.artist?.name} />
            <Summary label="Top song" value={s.track?.name} />
            <Summary label="Sound" value={s.genre ? titleCase(s.genre) : null} />
            <Summary label="Minutes" value={s.minutes !== null ? s.minutes.toLocaleString() : null} />
            <Summary label="Style" value={s.personality} />
          </Line>
          <Line className="relative z-20 mt-10 flex gap-3">
            <button onClick={onReplay} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-ink">
              <RotateCcw className="size-4" /> Replay
            </button>
            <button onClick={onClose} className="rounded-full border border-white/40 px-5 py-3 text-sm">
              Close
            </button>
          </Line>
        </div>
      );
  }
}

function Summary({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.18em] text-white/60 uppercase">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
