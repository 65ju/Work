"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { motion } from "motion/react";
import { ArrowDownUp, Search } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TrackStat } from "@/analytics/types";
import type { TimeRange } from "@/domain/types";
import { OpenInSpotify } from "@/components/brand/SpotifyIcon";
import { Artwork } from "@/components/ui/Artwork";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/States";
import { artistNames, formatDate, formatDuration, pad2 } from "@/lib/client/format";
import { useLoadedProfile } from "@/lib/client/queries";
import { useDebounced } from "@/lib/client/useDebounced";

type RangeFilter = TimeRange | "all";
type Sort = "rank" | "title" | "artist" | "release" | "duration" | "recent";

const SORTS: { value: Sort; label: string }[] = [
  { value: "rank", label: "Rank" },
  { value: "recent", label: "Recent plays" },
  { value: "title", label: "Title" },
  { value: "artist", label: "Artist" },
  { value: "release", label: "Release date" },
  { value: "duration", label: "Duration" },
];

export function TracksView() {
  const p = useLoadedProfile();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeFilter>("short");
  const [artist, setArtist] = useState("all");
  const [sort, setSort] = useState<Sort>("rank");
  const q = useDebounced(query.trim().toLowerCase(), 180);

  const rankOf = (t: TrackStat) => (range === "all" ? Math.min(...Object.values(t.ranks).map((v) => v ?? 999), 999) : (t.ranks[range] ?? 999));

  const pool = useMemo(() => {
    const all = Object.values(p.tracks);
    return range === "all" ? all : all.filter((t) => t.ranks[range] !== undefined);
  }, [p.tracks, range]);

  const artistOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of pool) for (const a of t.track.artists) m.set(a.id, a.name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pool]);

  const rows = useMemo(() => {
    let list = pool;
    if (artist !== "all") list = list.filter((t) => t.track.artists.some((a) => a.id === artist));
    if (q) list = list.filter((t) => `${t.track.name} ${artistNames(t.track.artists)} ${t.track.album.name}`.toLowerCase().includes(q));
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "rank":
          return rankOf(a) - rankOf(b) || b.recentPlays - a.recentPlays;
        case "recent":
          return b.recentPlays - a.recentPlays || rankOf(a) - rankOf(b);
        case "title":
          return a.track.name.localeCompare(b.track.name);
        case "artist":
          return artistNames(a.track.artists).localeCompare(artistNames(b.track.artists));
        case "release":
          return (b.track.album.releaseDate ?? "").localeCompare(a.track.album.releaseDate ?? "");
        case "duration":
          return b.track.durationMs - a.track.durationMs;
      }
    });
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, artist, q, sort, range]);

  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setScrollMargin((listRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [rows.length === 0]);
  const virtualizer = useWindowVirtualizer({ count: rows.length, estimateSize: () => 72, overscan: 8, scrollMargin });

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Top tracks"
        title={
          <>
            Every track you <span className="font-serif font-normal italic">keep</span> coming back to
          </>
        }
        aside={<ProvenanceTag kind="spotify" label="Rankings from Spotify" />}
      >
        Rankings are Spotify&apos;s. Play counts only cover your last 50 plays, and &ldquo;first seen&rdquo; is the earliest date this
        app finds in your available data — Spotify does not share full play history.
      </PageHeader>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          label="Time range"
          value={range}
          onChange={setRange}
          options={[
            { value: "short", label: "4 weeks" },
            { value: "medium", label: "6 months" },
            { value: "long", label: "1 year+" },
            { value: "all", label: "All" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex items-center" htmlFor="track-search">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted" />
            <input
              id="track-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks, artists, albums"
              className="w-64 rounded-full border border-line bg-ink-1/60 py-2 pr-4 pl-9 text-sm placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
          </label>
          <select
            aria-label="Filter by artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="max-w-48 rounded-full border border-line bg-ink-1/60 px-4 py-2 text-sm focus:outline-none"
          >
            <option value="all">All artists</option>
            {artistOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-full border border-line bg-ink-1/60 px-4 py-2 text-sm">
            <ArrowDownUp className="size-3.5 text-muted" />
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent focus:outline-none">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div>
        <div className="hidden grid-cols-[3rem_1fr_minmax(0,14rem)_6rem_7rem_4rem_2.5rem] gap-4 border-b border-line pb-3 font-mono text-[10px] tracking-[0.14em] text-faint uppercase lg:grid">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <span className="text-right">Last 50</span>
          <span>First seen</span>
          <span className="text-right">Time</span>
          <span />
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No tracks match">Try a different search, artist or time range.</EmptyState>
        ) : (
          <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((v) => {
              const t = rows[v.index]!;
              const rank = rankOf(t);
              return (
                <motion.div
                  key={t.track.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-x-0 grid grid-cols-[2.25rem_1fr_auto] items-center gap-4 border-b border-line lg:grid-cols-[3rem_1fr_minmax(0,14rem)_6rem_7rem_4rem_2.5rem]"
                  style={{ height: v.size, transform: `translateY(${v.start - virtualizer.options.scrollMargin}px)` }}
                >
                  <span className="numeric text-sm text-muted">{rank < 999 ? pad2(rank) : "—"}</span>
                  <div className="flex min-w-0 items-center gap-3">
                    <Artwork images={t.track.album.images} alt={t.track.album.name} size={44} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">
                        {t.track.name}
                        {t.track.explicit && <span className="ml-2 rounded-[2px] bg-white/15 px-1 align-middle font-mono text-[9px] text-fg-2">E</span>}
                      </p>
                      <p className="truncate text-[13px] text-muted">{artistNames(t.track.artists)}</p>
                    </div>
                  </div>
                  <span className="hidden truncate text-[13px] text-muted lg:block">{t.track.album.name}</span>
                  <span className="numeric hidden text-right text-sm lg:block">{t.recentPlays > 0 ? `${t.recentPlays}×` : "—"}</span>
                  <span className="hidden font-mono text-[11px] text-muted lg:block" title={t.lastSeen ? `Last seen ${formatDate(t.lastSeen)}` : undefined}>
                    {formatDate(t.firstSeen)}
                  </span>
                  <span className="numeric hidden text-right text-xs text-muted lg:block">{formatDuration(t.track.durationMs)}</span>
                  <OpenInSpotify href={t.track.url} compact />
                </motion.div>
              );
            })}
          </div>
        )}
        <p className="mt-4 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{rows.length} tracks</p>
      </div>
    </div>
  );
}
