"use client";

import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { MusicProfile } from "@/analytics/types";
import { Artwork } from "@/components/ui/Artwork";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { artistNames, titleCase } from "@/lib/client/format";
import { useLoadedProfile } from "@/lib/client/queries";
import { useDebounced } from "@/lib/client/useDebounced";

const GenreGalaxy = dynamic(() => import("@/components/viz/GenreGalaxy"), { ssr: false, loading: () => <Skeleton className="h-[68vh] w-full" /> });

type Filter = "all" | "rising" | "falling";

export function GenresView() {
  const p = useLoadedProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim().toLowerCase(), 150);
  const { nodes } = p.genres;

  const visible = useMemo(
    () => new Set(nodes.filter((n) => (filter === "all" || n.trend === filter) && (!q || n.name.includes(q))).map((n) => n.id)),
    [nodes, filter, q],
  );
  const cov = p.genres.coverage;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Genre galaxy"
        title={
          <>
            The shape of your <span className="font-serif font-normal italic">taste</span>
          </>
        }
      >
        Each star is a genre; size is its share of your listening, and genres that share artists pull together. Spotify tags
        genres on artists, not tracks — this app links tracks to genres through their artists.
      </PageHeader>

      {nodes.length < 3 ? (
        <EmptyState title="Not enough genre data">
          Spotify supplies genre tags for only {cov.artistsWithGenres} of your {cov.artistsTotal} artists, which is too few to draw a
          meaningful map. Many artists simply have no genre tags.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl label="Filter" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "rising", label: "Rising" }, { value: "falling", label: "Fading" }]} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a genre"
                aria-label="Find a genre"
                className="w-48 rounded-full border border-line bg-ink-1/60 px-4 py-2 text-sm placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[var(--accent)]" /> Rising</span>
              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-white/75" /> Stable</span>
              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-white/35" /> Fading</span>
              <span className="flex items-center gap-2"><span className="w-4 border-t border-dashed border-white/40" /> Name similarity</span>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
            <div className="relative -mx-5 border-y border-line sm:mx-0 sm:rounded-md sm:border">
              <GenreGalaxy graph={p.genres} selectedId={selected} onSelect={setSelected} visible={visible} />
              <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-2">
                <ProvenanceTag kind="spotify" label={`Spotify tags · ${cov.artistsWithGenres}/${cov.artistsTotal} artists tagged`} />
                <ProvenanceTag kind="derived" label="Layout & links by this app" />
              </div>
            </div>
            <GenreDetail p={p} id={selected} />
          </div>
        </>
      )}
    </div>
  );
}

function GenreDetail({ p, id }: { p: MusicProfile; id: string | null }) {
  const g = id ? p.genres.nodes.find((n) => n.id === id) : null;
  return (
    <AnimatePresence mode="wait">
      {!g ? (
        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-t border-line pt-6 xl:border-t-0 xl:pt-0">
          <p className="eyebrow">Top genres</p>
          <ol className="mt-4 flex flex-col">
            {p.genres.nodes.slice(0, 10).map((n, i) => (
              <li key={n.id} className="flex items-baseline justify-between border-b border-line py-2.5 text-sm">
                <span className="flex gap-3">
                  <span className="numeric w-5 text-faint">{i + 1}</span>
                  {titleCase(n.name)}
                </span>
                <span className="numeric text-xs text-muted">{Math.round(n.share * 100)}%</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-faint">Select a genre to see the artists and tracks behind it.</p>
        </motion.div>
      ) : (
        <motion.div key={g.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-6">
          <div>
            <p className="eyebrow">{g.trend === "rising" ? "Rising" : g.trend === "falling" ? "Fading" : "Stable"} genre</p>
            <h2 className="mt-2 text-3xl leading-tight font-semibold tracking-tight">{titleCase(g.name)}</h2>
          </div>
          <dl className="grid grid-cols-2 border-y border-line">
            <div className="border-r border-line py-4 pr-3">
              <dt className="eyebrow">Listening share</dt>
              <dd className="numeric mt-2 text-2xl">{Math.round(g.share * 100)}%</dd>
            </div>
            <div className="py-4 pl-4">
              <dt className="eyebrow">New in 4 weeks</dt>
              <dd className="numeric mt-2 text-2xl">{Math.round(g.discoveryShare * 100)}%</dd>
            </div>
          </dl>
          <p className="-mt-3 text-xs leading-relaxed text-faint">
            Share is rank-weighted across your top artists. &ldquo;New&rdquo; is the share of this genre&apos;s artists in your 4-week tops
            but not your long-term tops.
          </p>
          <div>
            <p className="eyebrow mb-3">Your artists in this genre</p>
            <ul className="flex flex-col gap-1">
              {g.artistIds.slice(0, 8).map((aid) => {
                const a = p.artists[aid];
                if (!a) return null;
                return (
                  <li key={aid} className="flex items-center gap-3 py-1">
                    <Artwork images={a.artist.images} alt="" size={32} kind="artist" rounded="rounded-full" />
                    <span className="truncate text-sm">{a.artist.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          {g.trackIds.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">Tracks via these artists</p>
                <ProvenanceTag kind="derived" label="Via artist" />
              </div>
              <ul className="flex flex-col gap-2">
                {g.trackIds.slice(0, 6).map((tid) => {
                  const t = p.tracks[tid];
                  if (!t) return null;
                  return (
                    <li key={tid} className="flex items-center gap-3">
                      <Artwork images={t.track.album.images} alt="" size={32} />
                      <span className="min-w-0 truncate text-sm">
                        {t.track.name} <span className="text-muted">— {artistNames(t.track.artists)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
