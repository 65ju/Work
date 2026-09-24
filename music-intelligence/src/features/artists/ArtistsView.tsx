"use client";

import { AnimatePresence, LayoutGroup, motion, useMotionValue, useSpring } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { MusicProfile } from "@/analytics/types";
import type { TimeRange } from "@/domain/types";
import { Artwork } from "@/components/ui/Artwork";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { pad2, pickImage, RANGE_LABEL, titleCase } from "@/lib/client/format";
import { useLoadedProfile } from "@/lib/client/queries";
import { ArtistDetail } from "./ArtistDetail";

const ArtistNetworkGraph = dynamic(() => import("@/components/viz/ArtistNetworkGraph"), {
  ssr: false,
  loading: () => <Skeleton className="h-[70vh] w-full" />,
});

const RANGES = [
  { value: "short" as const, label: "4 weeks" },
  { value: "medium" as const, label: "6 months" },
  { value: "long" as const, label: "1 year+" },
];
const ease = [0.16, 1, 0.3, 1] as const;

export function ArtistsView() {
  const p = useLoadedProfile();
  const [mode, setMode] = useState<"ranking" | "network">("ranking");
  const [range, setRange] = useState<TimeRange>("short");
  const [compare, setCompare] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const close = useCallback(() => setSelected(null), []);

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        eyebrow="Top artists"
        title={
          <>
            The artists that <span className="font-serif font-normal italic">define</span> you
          </>
        }
        aside={<SegmentedControl label="View" value={mode} onChange={setMode} options={[{ value: "ranking", label: "Ranking" }, { value: "network", label: "Network" }]} />}
      >
        {mode === "ranking"
          ? "Rankings come straight from Spotify for three time windows. Switch windows to watch your favourites move."
          : "Your most important artists, connected by shared genres, collaborations, playlists and back-to-back listening. Relationships are inferred by this app from your own data."}
      </PageHeader>

      {mode === "ranking" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SegmentedControl label="Time range" value={range} onChange={setRange} options={RANGES} />
            <label className="flex cursor-pointer items-center gap-3 text-sm text-fg-2">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="peer sr-only" id="compare-toggle" />
              <span className="relative h-5 w-9 rounded-full bg-white/10 transition peer-checked:bg-[var(--accent)] peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-[var(--accent)]">
                <span className={`absolute top-0.5 size-4 rounded-full bg-fg transition-all ${compare ? "left-[18px]" : "left-0.5"}`} />
              </span>
              Compare with {range === "long" ? "6 months" : "1 year+"}
            </label>
          </div>
          <Ranking p={p} range={range} compare={compare} onSelect={setSelected} />
        </>
      ) : p.network.nodes.length < 3 ? (
        <EmptyState title="Not enough artists to map">Listen to a few more artists and your network will appear here.</EmptyState>
      ) : (
        <div className="relative -mx-5 border-y border-line sm:mx-0 sm:rounded-md sm:border">
          <ArtistNetworkGraph network={p.network} selectedId={selected} onSelect={setSelected} />
          <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-2">
            <ProvenanceTag kind="derived" label="Relationships inferred by this app" />
            <span className="font-mono text-[10px] text-faint">Scroll to zoom · drag to pan · click an artist</span>
          </div>
        </div>
      )}

      <Sheet open={selected !== null} onClose={close} label="Artist details">
        {selected && <ArtistDetail profile={p} artistId={selected} onSelectArtist={setSelected} />}
      </Sheet>
    </div>
  );
}

function Ranking({ p, range, compare, onSelect }: { p: MusicProfile; range: TimeRange; compare: boolean; onSelect: (id: string) => void }) {
  const ids = p.rankings.artists[range];
  const compareRange: TimeRange = range === "long" ? "medium" : "long";
  const [hover, setHover] = useState<string | null>(null);
  const mx = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });
  const my = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });

  const artists = useMemo(() => ids.map((id) => p.artists[id]).filter((a): a is NonNullable<typeof a> => Boolean(a)), [ids, p.artists]);
  if (artists.length === 0) {
    return <EmptyState title={`No top artists for ${RANGE_LABEL[range]}`}>Spotify has not computed a ranking for this window yet.</EmptyState>;
  }
  const [first, ...rest] = artists;
  const hovered = hover ? p.artists[hover] : null;

  return (
    <LayoutGroup>
      <motion.button
        key={`hero-${first!.artist.id}`}
        onClick={() => onSelect(first!.artist.id)}
        className="group grid gap-8 text-left md:grid-cols-[minmax(0,420px)_1fr] md:items-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="overflow-hidden rounded-[4px]">
          <Artwork images={first!.artist.images} alt={first!.artist.name} size={420} kind="artist" priority className="!h-auto aspect-square !w-full transition duration-1000 group-hover:scale-[1.03]" />
        </div>
        <div>
          <p className="numeric text-[clamp(5rem,12vw,10rem)] leading-none font-medium tracking-[-0.06em] text-[var(--accent)]">01</p>
          <h2 className="mt-2 text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] font-semibold tracking-[-0.04em]">{first!.artist.name}</h2>
          {first!.artist.genres.length > 0 && <p className="mt-4 text-sm text-muted">{first!.artist.genres.slice(0, 3).map(titleCase).join(" · ")}</p>}
          {compare && <Delta current={1} previous={first!.ranks[compareRange]} />}
        </div>
      </motion.button>

      <ol
        className="mt-6 border-t border-line"
        onPointerMove={(e) => {
          mx.set(e.clientX + 24);
          my.set(e.clientY - 90);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <AnimatePresence initial={false}>
          {rest.map((a, i) => (
            <motion.li
              layout
              key={a.artist.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ layout: { duration: 0.7, ease }, delay: Math.min(i, 12) * 0.025, duration: 0.5 }}
              className="border-b border-line"
            >
              <button
                onClick={() => onSelect(a.artist.id)}
                onPointerEnter={() => setHover(a.artist.id)}
                className="group grid w-full grid-cols-[3rem_1fr_auto] items-center gap-4 py-4 text-left sm:grid-cols-[4.5rem_1fr_auto_auto]"
              >
                <span className="numeric text-sm text-muted transition group-hover:text-[var(--accent)]">{pad2(i + 2)}</span>
                <span className="flex min-w-0 items-center gap-4">
                  <span className="sm:hidden">
                    <Artwork images={a.artist.images} alt="" size={40} kind="artist" rounded="rounded-full" />
                  </span>
                  <span className="truncate text-[clamp(1.25rem,2.6vw,2.25rem)] leading-tight font-semibold tracking-[-0.03em] uppercase transition-transform duration-500 group-hover:translate-x-2">
                    {a.artist.name}
                  </span>
                </span>
                <span className="hidden truncate text-xs text-muted sm:block sm:max-w-56">{a.artist.genres.slice(0, 2).map(titleCase).join(" · ")}</span>
                {compare ? <Delta current={i + 2} previous={a.ranks[compareRange]} /> : <span />}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {/* Cursor-following artwork preview (desktop pointer only) */}
      <AnimatePresence>
        {hovered && pickImage(hovered.artist.images) && (
          <motion.div
            className="pointer-events-none fixed top-0 left-0 z-30 hidden overflow-hidden rounded-[4px] shadow-2xl [@media(hover:hover)]:block"
            style={{ x: mx, y: my }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
          >
            <Artwork images={hovered.artist.images} alt="" size={180} kind="artist" rounded="rounded-[4px]" />
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

function Delta({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined)
    return <span className="rounded-full border border-[var(--accent)] px-2 py-0.5 font-mono text-[10px] tracking-wider text-[var(--accent)] uppercase">New</span>;
  const d = previous - current;
  if (d === 0) return <span className="font-mono text-xs text-faint">=</span>;
  return <span className={`numeric text-xs ${d > 0 ? "text-[var(--accent)]" : "text-muted"}`}>{d > 0 ? `↑${d}` : `↓${-d}`}</span>;
}
