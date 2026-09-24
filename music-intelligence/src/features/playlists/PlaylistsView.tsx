"use client";

import { AnimatePresence, motion } from "motion/react";
import { Lock, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { PlaylistInsight } from "@/analytics/types";
import { OpenInSpotify } from "@/components/brand/SpotifyIcon";
import { Artwork } from "@/components/ui/Artwork";
import { Meter } from "@/components/ui/Meter";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/States";
import { formatDate, formatLongDuration, titleCase } from "@/lib/client/format";
import { useLoadedProfile } from "@/lib/client/queries";

export function PlaylistsView() {
  const p = useLoadedProfile();
  const [scope, setScope] = useState<"analyzed" | "all">("analyzed");
  const list = useMemo(() => (scope === "all" ? p.playlists : p.playlists.filter((pl) => pl.analyzed)), [p.playlists, scope]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((pl) => pl.id === selectedId) ?? list[0] ?? null;
  const availability = p.coverage.availability.playlists;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Playlist intelligence"
        title={
          <>
            What your playlists <span className="font-serif font-normal italic">say</span>
          </>
        }
        aside={<SegmentedControl label="Show" value={scope} onChange={setScope} options={[{ value: "analyzed", label: "Analysed" }, { value: "all", label: "All" }]} />}
      >
        Metrics are calculated by this app from each playlist&apos;s tracks. Spotify only exposes the contents of playlists you own or
        collaborate on, so followed playlists show metadata only.
      </PageHeader>

      {availability.note && <p className="-mt-4 border-l-2 border-line-strong pl-3 text-xs text-muted">{availability.note}</p>}

      {list.length === 0 ? (
        <EmptyState title={scope === "analyzed" ? "No playlists could be analysed" : "No playlists"}>
          {scope === "analyzed"
            ? "Create a playlist on Spotify (or become a collaborator on one) and its contents can be analysed here."
            : "This account has no playlists."}
        </EmptyState>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr]">
          <ul className="flex max-h-[70vh] flex-col overflow-y-auto border-y border-line pr-1 lg:sticky lg:top-8">
            {list.map((pl) => (
              <li key={pl.id}>
                <button
                  onClick={() => setSelectedId(pl.id)}
                  className={`flex w-full items-center gap-3 border-b border-line px-2 py-3 text-left transition last:border-b-0 ${selected?.id === pl.id ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"}`}
                  aria-pressed={selected?.id === pl.id}
                >
                  <Artwork images={pl.images} alt={pl.name} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{pl.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {pl.totalItems ?? "?"} tracks · {pl.isOwned ? "yours" : `by ${pl.ownerName}`}
                    </span>
                  </span>
                  {!pl.analyzed && <Lock className="size-3.5 shrink-0 text-faint" aria-label="Contents not available" />}
                  {pl.collaborative && <Users className="size-3.5 shrink-0 text-faint" aria-label="Collaborative" />}
                </button>
              </li>
            ))}
          </ul>
          <AnimatePresence mode="wait">{selected && <Insight key={selected.id} pl={selected} />}</AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Insight({ pl }: { pl: PlaylistInsight }) {
  const metrics: { label: string; value: number | null; note: string }[] = [
    { label: "Artist diversity", value: pl.artistDiversity, note: `${pl.uniqueArtists} artists across ${pl.analyzedItems} tracks` },
    {
      label: "Genre diversity",
      value: pl.genreDiversity,
      note: pl.genreCoverage === null ? "No genre data" : `Genre tags known for ${Math.round(pl.genreCoverage * 100)}% of tracks`,
    },
    { label: "Repetition", value: pl.repetition, note: "Duplicate tracks and artists that recur often" },
    { label: "Freshness", value: pl.freshness, note: "Share of tracks added in the last 90 days" },
    { label: "Taste alignment", value: pl.tasteAlignment, note: "Share of tracks by artists in your top lists" },
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="min-w-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork images={pl.images} alt={pl.name} size={168} priority />
        <div className="min-w-0">
          <p className="eyebrow">{pl.isOwned ? "Your playlist" : pl.collaborative ? "Collaborative" : `By ${pl.ownerName}`}</p>
          <h2 className="mt-2 text-[clamp(2rem,4vw,3.5rem)] leading-none font-semibold tracking-[-0.04em] uppercase">{pl.name}</h2>
          {pl.description && <p className="mt-3 line-clamp-2 max-w-xl text-sm text-muted">{pl.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <OpenInSpotify href={pl.url} />
            <span className="font-mono text-[11px] text-muted">
              {pl.totalItems ?? "?"} tracks{pl.analyzed ? ` · ${formatLongDuration(pl.totalDurationMs)} analysed` : ""}
            </span>
          </div>
        </div>
      </div>

      {!pl.analyzed ? (
        <EmptyState title="Contents not available">
          Spotify does not let this app read the tracks of playlists you neither own nor collaborate on, so no metrics can be calculated.
        </EmptyState>
      ) : (
        <>
          <div className="mt-10 flex items-center justify-between border-b border-line pb-3">
            <h3 className="eyebrow">Intelligence</h3>
            <ProvenanceTag kind="derived" />
          </div>
          <ul className="divide-y divide-line">
            {metrics.map((m, i) => (
              <li key={m.label} className="grid gap-3 py-5 sm:grid-cols-[180px_1fr_48px] sm:items-center">
                <div>
                  <p className="font-mono text-[11px] tracking-[0.14em] uppercase">{m.label}</p>
                  <p className="mt-1 text-xs text-faint">{m.note}</p>
                </div>
                <Meter value={m.value} segments={28} delay={i * 0.06} />
                <span className="numeric text-right text-sm">{m.value ?? "—"}</span>
              </li>
            ))}
          </ul>
          {pl.truncated && <p className="mt-2 text-xs text-faint">Based on the first {pl.analyzedItems} tracks.</p>}

          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-3">Dominant artists</p>
              <ol className="flex flex-col gap-2">
                {pl.dominantArtists.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between text-sm">
                    <span className="truncate">{a.name}</span>
                    <span className="numeric text-xs text-muted">{a.count} tracks</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="eyebrow mb-3">Top genres</p>
              {pl.topGenres.length === 0 ? (
                <p className="text-sm text-muted">No genre tags available for these artists.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {pl.topGenres.map((g) => (
                    <li key={g.name} className="flex items-baseline justify-between text-sm">
                      <span className="truncate">{titleCase(g.name)}</span>
                      <span className="numeric text-xs text-muted">{Math.round(g.share * 100)}%</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <p className="mt-8 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
            First track added {formatDate(pl.firstAddedAt)} · last added {formatDate(pl.lastAddedAt)}
          </p>
        </>
      )}
    </motion.section>
  );
}
