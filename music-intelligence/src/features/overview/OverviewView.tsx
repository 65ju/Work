"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState, type ReactNode } from "react";
import type { MusicProfile } from "@/analytics/types";
import { OpenInSpotify } from "@/components/brand/SpotifyIcon";
import { Equalizer } from "@/components/shell/MiniPlayer";
import { Artwork } from "@/components/ui/Artwork";
import { Meter } from "@/components/ui/Meter";
import { SectionLabel } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { EmptyState } from "@/components/ui/States";
import { artistNames, relativeTime, titleCase } from "@/lib/client/format";
import { useHistory, useLoadedProfile, useNowPlaying } from "@/lib/client/queries";
import { Sheet } from "@/components/ui/Sheet";
import { ArtistDetail } from "@/features/artists/ArtistDetail";

const CoverGalaxy = dynamic(() => import("@/components/viz/CoverGalaxy"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_60%)]" />,
});

const ease = [0.16, 1, 0.3, 1] as const;

export function OverviewView() {
  const p = useLoadedProfile();
  const hasTop = p.summary.topArtist || p.summary.topTrack;
  if (!hasTop && p.recent.length === 0) {
    return (
      <EmptyState title="Not enough listening history yet">
        Spotify has no top artists, top tracks or recent plays for this account yet. Listen for a few days and come back — your
        profile builds itself from real listening only.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-24">
      <Universe p={p} />
      <Hero p={p} />
      <Personality p={p} />
      <div className="grid gap-16 lg:grid-cols-[1.4fr_1fr]">
        <RecentStrip p={p} />
        <Genres p={p} />
      </div>
      <Coverage p={p} />
    </div>
  );
}

function Universe({ p }: { p: MusicProfile }) {
  const [selected, setSelected] = useState<string | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Function transforms keep these on the JS path; the accelerated scroll-timeline path
  // mis-measured the sticky stage and left the captions visible.
  const introOpacity = useTransform(scrollYProgress, (v) => 1 - Math.min(1, v / 0.3));
  const introY = useTransform(scrollYProgress, (v) => -40 * Math.min(1, v / 0.3));
  const outroOpacity = useTransform(scrollYProgress, (v) => Math.min(1, Math.max(0, (v - 0.6) / 0.25)));

  return (
    // Tall section with a sticky stage: scrolling through it flies the camera into the galaxy.
    <section ref={ref} className="relative -mx-5 -mt-6 h-[230vh] sm:-mx-8 lg:-mx-14 lg:-mt-14">
      <div className="sticky top-0 h-dvh overflow-hidden border-b border-line">
        <CoverGalaxy profile={p} progress={scrollYProgress} onSelectArtist={setSelected} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />
        <motion.div style={{ opacity: introOpacity, y: introY }} className="pointer-events-none absolute bottom-10 left-5 max-w-xl sm:left-8 lg:left-14">
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 1 }}>
            Your music galaxy
          </motion.p>
          <motion.h2
            className="mt-3 text-[clamp(2.5rem,6vw,5rem)] leading-[0.92] font-semibold tracking-[-0.045em]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 1.1, ease }}
          >
            Every arm, <span className="font-serif font-normal tracking-[-0.02em] italic">a sound.</span>
          </motion.h2>
          <motion.p className="mt-4 text-sm text-fg-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1 }}>
            Each spiral arm is one of your top genres. The artists and albums that matter most sit closest to the core.
          </motion.p>
          <motion.p className="mt-6 font-mono text-[10px] tracking-[0.14em] text-faint uppercase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 1 }}>
            Scroll to fly in · drag to turn · hover a cover
          </motion.p>
        </motion.div>
        <motion.div style={{ opacity: outroOpacity }} className="pointer-events-none absolute right-5 bottom-28 max-w-sm text-right sm:right-8 lg:right-14">
          <p className="eyebrow">Inside the arms</p>
          <p className="mt-3 text-lg leading-snug text-fg-2">Hover any cover to bring it forward. Artists open their story, albums open in Spotify.</p>
        </motion.div>
      </div>
      <Sheet open={selected !== null} onClose={close} label="Artist details">
        {selected && <ArtistDetail profile={p} artistId={selected} onSelectArtist={setSelected} />}
      </Sheet>
    </section>
  );
}

function Hero({ p }: { p: MusicProfile }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const { summary: s } = p;
  const activityLabel =
    s.activity === null ? "Not enough recent plays" : s.activity >= 66 ? "Very active" : s.activity >= 40 ? "Active" : "Light";
  const discoveryMetric = p.metrics.find((m) => m.id === "discovery");

  return (
    <section ref={ref} className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      <div>
        <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          {p.user.displayName} · Last 4 weeks
        </motion.p>
        <h1 className="mt-5 text-display font-semibold">
          <motion.span className="block" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            Your music
          </motion.span>
          <motion.span
            className="block font-serif font-normal tracking-[-0.02em] text-fg-2 italic"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.12 }}
          >
            this month
          </motion.span>
        </h1>
        <NowLine />

        <dl className="mt-12 border-t border-line">
          <Row label="Top artist" provenance="spotify" delay={0.3}>
            {s.topArtist ? <span className="truncate">{s.topArtist.artist.name}</span> : <Muted>No data yet</Muted>}
          </Row>
          <Row label="Top track" provenance="spotify" delay={0.38}>
            {s.topTrack ? (
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate">{s.topTrack.track.name}</span>
                <span className="truncate text-base font-normal text-muted">{artistNames(s.topTrack.track.artists)}</span>
              </span>
            ) : (
              <Muted>No data yet</Muted>
            )}
          </Row>
          <Row label="Most repeated" provenance="derived" note="In your last 50 plays" delay={0.46}>
            {s.mostRepeated ? (
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate">{s.mostRepeated.track.name}</span>
                <span className="numeric text-base font-normal text-[var(--accent)]">×{s.mostRepeated.plays}</span>
              </span>
            ) : (
              <Muted>No repeats in your last 50 plays</Muted>
            )}
          </Row>
          <MinutesRow />
          <Row label="Discovery" provenance="derived" note={discoveryMetric?.basis} delay={0.54}>
            <span className="flex items-center gap-4">
              <span className="uppercase">{s.discoveryLevel ?? "—"}</span>
              <Meter value={discoveryMetric?.value ?? null} segments={16} className="w-32" delay={0.9} />
            </span>
          </Row>
          <Row label="Listening activity" provenance="derived" note="Plays per day in your recent window" delay={0.62}>
            <span className="flex w-full items-center gap-4">
              <Meter value={s.activity} segments={20} className="max-w-56 flex-1" delay={1} />
              <span className="text-base font-normal text-fg-2">{activityLabel}</span>
            </span>
          </Row>
        </dl>
      </div>

      {s.topArtist && (
        <motion.div
          className="relative self-start"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease, delay: 0.2 }}
        >
          <div className="absolute -inset-10 -z-10 rounded-full bg-[var(--ambient-1)] opacity-60 blur-[80px]" />
          <motion.div style={{ y: imgY, scale: imgScale }} className="relative overflow-hidden rounded-[4px]">
            <Artwork images={s.topArtist.artist.images} alt={s.topArtist.artist.name} size={640} kind="artist" priority className="!h-auto aspect-square !w-full" rounded="rounded-[4px]" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/75 to-transparent p-5 pt-24">
              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] text-white/70 uppercase">No. 1 artist · 4 weeks</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{s.topArtist.artist.name}</p>
              </div>
              <OpenInSpotify href={s.topArtist.artist.url} compact />
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}

function MinutesRow() {
  const { data } = useHistory();
  if (!data?.available || data.history.totals["7d"].plays === 0) return null;
  const t = data.history.totals["7d"];
  return (
    <Row label="Last 7 days" provenance="derived" note="Recorded by this app · estimated from track lengths" delay={0.5}>
      <Link href="/numbers" className="group flex items-baseline gap-3">
        <span className="numeric">{Math.round(t.ms / 60_000).toLocaleString()} min</span>
        <span className="text-base font-normal text-muted">{t.plays} plays</span>
        <ArrowRight className="size-4 self-center text-muted transition group-hover:translate-x-1 group-hover:text-fg" />
      </Link>
    </Row>
  );
}

function NowLine() {
  const { data } = useNowPlaying();
  const pb = data?.playback;
  if (!pb?.track || !pb.isPlaying) return null;
  return (
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex items-center gap-3 text-sm text-fg-2">
      <Equalizer active />
      <span className="truncate">
        Playing <span className="text-fg">{pb.track.name}</span> by {artistNames(pb.track.artists)}
        {pb.device ? <span className="text-muted"> · on {pb.device.name}</span> : null}
      </span>
    </motion.p>
  );
}

function Row({ label, children, provenance, note, delay }: { label: string; children: ReactNode; provenance: "spotify" | "derived"; note?: string; delay: number }) {
  return (
    <motion.div
      className="group grid grid-cols-1 gap-2 border-b border-line py-5 sm:grid-cols-[180px_1fr] sm:items-baseline"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease, delay }}
    >
      <dt className="flex flex-col gap-1.5">
        <span className="eyebrow">{label}</span>
        <ProvenanceTag kind={provenance} label={provenance === "spotify" ? "Spotify" : "Derived"} />
      </dt>
      <dd className="min-w-0 text-[clamp(1.25rem,2.4vw,1.75rem)] font-semibold tracking-tight">
        {children}
        {note && <p className="mt-1 text-xs font-normal tracking-normal text-faint">{note}</p>}
      </dd>
    </motion.div>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <span className="text-lg font-normal text-muted">{children}</span>;

function Personality({ p }: { p: MusicProfile }) {
  if (!p.personality) return null;
  const pe = p.personality;
  return (
    <motion.section
      className="relative grid gap-8 border-y border-line py-14 lg:grid-cols-[1fr_1.1fr] lg:items-end"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 1 }}
    >
      <div>
        <p className="eyebrow">Your listening style</p>
        <motion.h2
          className="mt-4 font-serif text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] tracking-[-0.02em] italic"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease }}
        >
          {pe.name}
        </motion.h2>
      </div>
      <div className="flex flex-col gap-5">
        <p className="text-xl leading-snug text-balance text-fg">{pe.description}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted">
          {pe.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ProvenanceTag kind="derived" label={`Analysis by this app · ${pe.confidence} confidence`} />
          <Link href="/dna" className="group inline-flex items-center gap-2 text-sm text-fg-2 transition hover:text-fg">
            See your Music DNA <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function RecentStrip({ p }: { p: MusicProfile }) {
  const items = p.recent.slice(0, 14);
  return (
    <section>
      <SectionLabel
        right={
          <Link href="/listening" className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase hover:text-fg">
            Timeline →
          </Link>
        }
      >
        Recently played
      </SectionLabel>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Spotify returned no recent plays.</p>
      ) : (
        <div className="scrollbar-none mask-fade-x -mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
          {items.map((r, i) => (
            <motion.a
              key={`${r.playedAt}-${r.track.id}`}
              href={r.track.url ?? undefined}
              target="_blank"
              rel="noreferrer noopener"
              className="group w-[132px] shrink-0"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.7, ease }}
            >
              <div className="overflow-hidden rounded-[3px]">
                <Artwork images={r.track.album.images} alt={r.track.album.name} size={132} className="transition duration-700 group-hover:scale-[1.04]" />
              </div>
              <p className="mt-2.5 truncate text-[13px] font-medium">{r.track.name}</p>
              <p className="truncate text-xs text-muted">{artistNames(r.track.artists)}</p>
              <p className="mt-1 font-mono text-[10px] text-faint">{relativeTime(r.playedAt)}</p>
            </motion.a>
          ))}
        </div>
      )}
    </section>
  );
}

function Genres({ p }: { p: MusicProfile }) {
  const nodes = p.genres.nodes.slice(0, 6);
  const max = nodes[0]?.share ?? 1;
  return (
    <section>
      <SectionLabel right={<ProvenanceTag kind="spotify" label="Spotify artist genres" />}>Dominant genres</SectionLabel>
      {nodes.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          Spotify does not supply genre tags for enough of your artists to show dominant genres.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {nodes.map((g, i) => (
            <li key={g.id}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate text-lg font-medium tracking-tight">{titleCase(g.name)}</span>
                <span className="numeric text-xs text-muted">{Math.round(g.share * 100)}%</span>
              </div>
              <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-[var(--accent)]"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(g.share / max) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease, delay: i * 0.08 }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
      <Link href="/genres" className="mt-6 inline-block font-mono text-[10px] tracking-[0.14em] text-muted uppercase hover:text-fg">
        Explore the genre galaxy →
      </Link>
    </section>
  );
}

function Coverage({ p }: { p: MusicProfile }) {
  const c = p.coverage.counts;
  return (
    <footer className="border-t border-line pt-6 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-faint uppercase">
      Based on {c.topArtists.short + c.topArtists.medium + c.topArtists.long} top-artist and{" "}
      {c.topTracks.short + c.topTracks.medium + c.topTracks.long} top-track positions, your last {c.recentPlays} plays,{" "}
      {c.playlistsAnalyzed} analysed playlists and {c.savedSampled} recently saved tracks. Updated {relativeTime(p.generatedAt)}.
    </footer>
  );
}
