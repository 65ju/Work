"use client";

import { motion } from "motion/react";
import type { HistoryProfile, Phase } from "@/analytics/history-types";
import { coarsePhases } from "@/analytics/coarse-phases";
import { Artwork } from "@/components/ui/Artwork";
import { PageHeader, SectionLabel } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { EmptyState } from "@/components/ui/States";
import { HistoryGate } from "@/features/history/HistoryGate";
import { formatDate, formatLongDuration, titleCase } from "@/lib/client/format";
import { useLoadedProfile } from "@/lib/client/queries";

const ease = [0.16, 1, 0.3, 1] as const;
const img = (url: string | null) => (url ? [{ url, width: 300, height: 300 }] : []);
const TONES = ["var(--accent)", "var(--color-algorithm)", "#e8a5c4", "#9fd6b4", "#f0c27b", "#c2b5ff"];

export function PhasesView() {
  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        eyebrow="Phases"
        title={
          <>
            The eras of your <span className="font-serif font-normal italic">listening</span>
          </>
        }
        aside={<ProvenanceTag kind="derived" label="Detected by this app" />}
      >
        The app splits your recorded weeks into phases. A new phase starts when the genres and artists you play clearly shift.
      </PageHeader>
      <HistoryGate fallback={(h) => <Fallback h={h} />} minPlays={1}>
        {(h) => (h.phases.length === 0 ? <Fallback h={h} /> : <Timeline phases={h.phases} />)}
      </HistoryGate>
    </div>
  );
}

function Timeline({ phases }: { phases: Phase[] }) {
  const totalWeeks = phases.reduce((a, p) => a + p.weeks, 0) || 1;
  const ordered = [...phases].reverse();
  return (
    <div className="flex flex-col gap-16">
      <div>
        <div className="flex h-3 overflow-hidden rounded-full">
          {phases.map((p, i) => (
            <motion.div
              key={p.id}
              className="h-full"
              style={{ backgroundColor: TONES[i % TONES.length], width: `${(p.weeks / totalWeeks) * 100}%` }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: i * 0.12, duration: 0.8, ease }}
              title={`${p.label}: ${formatDate(p.start)} – ${formatDate(p.end)}`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
          <span>{formatDate(phases[0]!.start)}</span>
          <span>Today</span>
        </div>
      </div>

      <ol className="flex flex-col">
        {ordered.map((p, i) => {
          const tone = TONES[(phases.length - 1 - i) % TONES.length];
          return (
            <motion.li
              key={p.id}
              className="grid gap-8 border-t border-line py-12 lg:grid-cols-[1fr_1.1fr]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.9, ease }}
            >
              <div>
                <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
                  <span className="size-2 rounded-full" style={{ backgroundColor: tone }} />
                  {formatDate(p.start)} – {p.current ? "now" : formatDate(p.end)}
                  {p.current && <span className="rounded-full border border-[var(--accent)] px-2 py-0.5 text-[var(--accent)]">Current</span>}
                </p>
                <h2 className="mt-4 font-serif text-[clamp(2.75rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em] italic">{p.label}</h2>
                <p className="mt-4 font-mono text-xs text-muted">
                  {p.weeks} weeks · {p.plays} plays · {formatLongDuration(p.ms)}
                </p>
                {p.topGenres.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.topGenres.map((g) => (
                      <span key={g.name} className="rounded-full border border-line px-3 py-1 text-xs text-fg-2">
                        {titleCase(g.name)} <span className="text-faint">{Math.round(g.share * 100)}%</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-3">Defined by</p>
                  <ul className="flex flex-col gap-3">
                    {p.definingArtists.map((d) => (
                      <li key={d.artist.id} className="flex items-center gap-3">
                        <Artwork images={img(d.artist.imageUrl)} alt={d.artist.name} size={40} kind="artist" rounded="rounded-full" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{d.artist.name}</span>
                          <span className="block font-mono text-[10px] text-muted">
                            {d.plays} plays{d.lift >= 1.5 ? ` · ${d.lift}× your usual` : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="eyebrow mb-3">Soundtrack</p>
                  <ol className="flex flex-col gap-2">
                    {p.topTracks.map((t) => (
                      <li key={t.track.id} className="flex items-center gap-3">
                        <Artwork images={img(t.track.imageUrl)} alt={t.track.name} size={32} />
                        <span className="min-w-0 flex-1 truncate text-sm">{t.track.name}</span>
                        <span className="numeric text-[10px] text-faint">{t.plays}×</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function Fallback({ h }: { h: HistoryProfile | null }) {
  const p = useLoadedProfile();
  const phases = coarsePhases(p);
  const weeks = h?.phaseReadiness.weeksRecorded ?? 0;
  const needed = h?.phaseReadiness.weeksNeeded ?? 4;
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4 border-y border-line py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-fg">Real phases appear after about {needed} weeks of recorded listening.</p>
          <p className="mt-1 text-xs text-muted">
            {h ? `${weeks} of ${needed} weeks recorded so far.` : "Recording is not active yet."} Until then, here is the rough picture from
            Spotify&apos;s own top lists.
          </p>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: needed }, (_, i) => (
            <span key={i} className={`h-2 w-8 rounded-full ${i < weeks ? "bg-[var(--accent)]" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
      {phases.length === 0 ? (
        <EmptyState title="Not enough data yet">Spotify has not built top lists for this account yet.</EmptyState>
      ) : (
        <div>
          <SectionLabel right={<ProvenanceTag kind="spotify" label="Spotify top lists" />}>Then → now</SectionLabel>
          <div className="grid gap-10 lg:grid-cols-3">
            {phases.map((ph, i) => (
              <motion.div key={ph.range} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, duration: 0.8, ease }} className="flex flex-col gap-5">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">{ph.period}</p>
                  <h3 className="mt-2 font-serif text-5xl italic">{ph.label}</h3>
                </div>
                <div className="flex -space-x-3">
                  {ph.topArtists.map((a) => (
                    <Artwork key={a.id} images={a.images} alt={a.name} size={56} kind="artist" rounded="rounded-full ring-2 ring-ink" />
                  ))}
                </div>
                <p className="text-sm text-fg-2">{ph.topArtists.map((a) => a.name).join(" · ")}</p>
                {ph.topGenres.length > 0 && <p className="text-xs text-muted">{ph.topGenres.map((g) => titleCase(g.name)).join(" · ")}</p>}
                {ph.newArtists.length > 0 && (
                  <p className="text-xs text-[var(--accent)]">New in this window: {ph.newArtists.map((a) => a.name).join(", ")}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
