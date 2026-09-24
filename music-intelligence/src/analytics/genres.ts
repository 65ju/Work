import type { MusicSnapshot } from "@/domain/types";
import { TIME_RANGES } from "@/domain/types";
import type { ArtistStat, GenreGraph, GenreLink, GenreNode } from "./types";

const MAX_GENRES = 42;

export const genreId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * Genres come from Spotify's artist-level tags. Tracks inherit genres through
 * their artists — that association is derived by this app, not supplied per track.
 */
export function buildGenreGraph(s: MusicSnapshot, artists: Record<string, ArtistStat>): GenreGraph {
  const weight = new Map<string, number>();
  const artistIds = new Map<string, Set<string>>();
  const pair = new Map<string, number>();
  let withGenres = 0;
  const all = Object.values(artists).filter((a) => a.score > 0);

  for (const st of all) {
    const genres = st.artist.genres;
    if (genres.length === 0) continue;
    withGenres++;
    const w = st.score / Math.sqrt(genres.length);
    for (const g of genres) {
      weight.set(g, (weight.get(g) ?? 0) + w);
      if (!artistIds.has(g)) artistIds.set(g, new Set());
      artistIds.get(g)!.add(st.artist.id);
    }
    for (let i = 0; i < genres.length; i++)
      for (let j = i + 1; j < genres.length; j++) {
        const key = [genres[i], genres[j]].sort().join("\u0000");
        pair.set(key, (pair.get(key) ?? 0) + w);
      }
  }

  const total = [...weight.values()].reduce((a, b) => a + b, 0) || 1;
  const top = [...weight.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_GENRES);
  const keep = new Set(top.map(([g]) => g));

  const trackIdsFor = (ids: Set<string>) => {
    const out = new Set<string>();
    for (const r of TIME_RANGES)
      for (const t of s.topTracks[r]) if (t.artists.some((a) => ids.has(a.id))) out.add(t.id);
    for (const p of s.recent) if (p.track.artists.some((a) => ids.has(a.id))) out.add(p.track.id);
    return [...out];
  };

  const longIds = new Set(s.topArtists.long.map((a) => a.id));
  const shortIds = new Set(s.topArtists.short.map((a) => a.id));
  const rangeShare = (ids: Set<string>, rangeIds: Set<string>) => [...ids].filter((id) => rangeIds.has(id)).length;

  const nodes: GenreNode[] = top.map(([name, w]) => {
    const ids = artistIds.get(name) ?? new Set<string>();
    const sorted = [...ids].sort((a, b) => (artists[b]?.score ?? 0) - (artists[a]?.score ?? 0));
    const inShort = rangeShare(ids, shortIds);
    const inLong = rangeShare(ids, longIds);
    const newInShort = [...ids].filter((id) => shortIds.has(id) && !longIds.has(id)).length;
    return {
      id: genreId(name),
      name,
      share: w / total,
      artistIds: sorted,
      trackIds: trackIdsFor(ids),
      discoveryShare: ids.size ? newInShort / ids.size : 0,
      trend: inShort > inLong ? "rising" : inShort < inLong ? "falling" : "stable",
    };
  });

  const links: GenreLink[] = [];
  for (const [key, w] of pair) {
    const [a, b] = key.split("\u0000") as [string, string];
    if (!keep.has(a) || !keep.has(b)) continue;
    const strength = w / Math.sqrt((weight.get(a) ?? 1) * (weight.get(b) ?? 1));
    if (strength > 0.05) links.push({ source: genreId(a), target: genreId(b), strength: Math.min(1, strength), reason: "shared-artists" });
  }
  // Weak structural hint: "dark trap" and "trap" share a word. Labeled as such in the UI.
  const linked = new Set(links.map((l) => [l.source, l.target].sort().join("|")));
  for (let i = 0; i < top.length; i++)
    for (let j = i + 1; j < top.length; j++) {
      const a = top[i]![0];
      const b = top[j]![0];
      const key = [genreId(a), genreId(b)].sort().join("|");
      if (linked.has(key)) continue;
      const wa = new Set(a.split(/[\s-]+/));
      if (b.split(/[\s-]+/).some((word) => word.length > 2 && wa.has(word)))
        links.push({ source: genreId(a), target: genreId(b), strength: 0.18, reason: "name-similarity" });
    }

  return { nodes, links, coverage: { artistsWithGenres: withGenres, artistsTotal: all.length } };
}
