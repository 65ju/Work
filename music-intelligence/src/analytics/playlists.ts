import type { Artist, MusicSnapshot } from "@/domain/types";
import { clamp, effectiveCount, normalizedEntropy } from "./math";
import type { ArtistStat, PlaylistInsight } from "./types";

const DAY = 86_400_000;

export function analyzePlaylists(
  s: MusicSnapshot,
  dir: Map<string, Artist>,
  artists: Record<string, ArtistStat>,
): PlaylistInsight[] {
  const now = new Date(s.fetchedAt).getTime();
  const topArtistIds = new Set(
    Object.values(artists)
      .filter((a) => a.ranks.short || a.ranks.medium || a.ranks.long)
      .map((a) => a.artist.id),
  );

  return s.playlists.map((pl) => {
    const base = {
      id: pl.id,
      name: pl.name,
      description: pl.description,
      images: pl.images,
      url: pl.url,
      isOwned: pl.isOwned,
      collaborative: pl.collaborative,
      ownerName: pl.owner.name,
      totalItems: pl.totalItems,
      truncated: pl.entriesTruncated,
    };
    const entries = pl.entries ?? [];
    if (pl.entries === null || entries.length === 0) {
      return {
        ...base,
        analyzed: false,
        analyzedItems: 0,
        uniqueArtists: 0,
        artistDiversity: null,
        genreDiversity: null,
        genreCoverage: null,
        repetition: null,
        freshness: null,
        tasteAlignment: null,
        dominantArtists: [],
        topGenres: [],
        firstAddedAt: null,
        lastAddedAt: null,
        totalDurationMs: 0,
      } satisfies PlaylistInsight;
    }

    const artistCount = new Map<string, { name: string; count: number }>();
    for (const e of entries) {
      const primary = e.track.artists[0];
      if (!primary) continue;
      const cur = artistCount.get(primary.id) ?? { name: primary.name, count: 0 };
      cur.count++;
      artistCount.set(primary.id, cur);
    }
    const counts = [...artistCount.values()].map((v) => v.count);
    const uniqueRatio = artistCount.size / entries.length;
    const artistDiversity = Math.round(100 * (0.5 * normalizedEntropy(counts) + 0.5 * uniqueRatio));

    const genreWeight = new Map<string, number>();
    let covered = 0;
    for (const e of entries) {
      const genres = e.track.artists.flatMap((a) => dir.get(a.id)?.genres ?? []);
      if (genres.length === 0) continue;
      covered++;
      for (const g of new Set(genres)) genreWeight.set(g, (genreWeight.get(g) ?? 0) + 1 / genres.length);
    }
    const coverage = covered / entries.length;
    const eff = effectiveCount([...genreWeight.values()]);
    const genreDiversity = covered >= 5 ? Math.round(100 * clamp(Math.log(Math.max(eff, 1)) / Math.log(25))) : null;
    const gTotal = [...genreWeight.values()].reduce((a, b) => a + b, 0) || 1;

    const trackIds = entries.map((e) => e.track.id);
    const duplicateShare = 1 - new Set(trackIds).size / trackIds.length;
    const maxArtistShare = Math.max(...counts) / entries.length;
    const repetition = Math.round(100 * clamp(duplicateShare * 2 + (1 - uniqueRatio) * 0.7 + maxArtistShare * 0.3));

    const dates = entries.map((e) => e.addedAt).filter((d): d is string => Boolean(d)).sort();
    const fresh = dates.filter((d) => now - new Date(d).getTime() <= 90 * DAY).length;
    const aligned = entries.filter((e) => e.track.artists.some((a) => topArtistIds.has(a.id))).length;

    return {
      ...base,
      analyzed: true,
      analyzedItems: entries.length,
      uniqueArtists: artistCount.size,
      artistDiversity,
      genreDiversity,
      genreCoverage: coverage,
      repetition,
      freshness: dates.length ? Math.round((100 * fresh) / dates.length) : null,
      tasteAlignment: Math.round((100 * aligned) / entries.length),
      dominantArtists: [...artistCount.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(([id, v]) => ({ id, name: v.name, count: v.count })),
      topGenres: [...genreWeight.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, w]) => ({ name, share: w / gTotal })),
      firstAddedAt: dates[0] ?? null,
      lastAddedAt: dates.at(-1) ?? null,
      totalDurationMs: entries.reduce((a, e) => a + e.track.durationMs, 0),
    } satisfies PlaylistInsight;
  });
}
