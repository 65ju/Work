import type { Artist, TimeRange } from "@/domain/types";
import { rankWeight } from "./math";
import type { MusicProfile } from "./types";

export type CoarsePhase = {
  range: TimeRange;
  label: string;
  period: string;
  topGenres: { name: string; share: number }[];
  topArtists: Artist[];
  /** Artists in this window's top 20 that are absent from the previous window's top 50. */
  newArtists: Artist[];
};

const META: Record<TimeRange, { label: string; period: string }> = {
  long: { label: "Then", period: "About the last year and beyond" },
  medium: { label: "Recently", period: "About the last 6 months" },
  short: { label: "Now", period: "About the last 4 weeks" },
};

/**
 * A rough "then → now" view from Spotify's three top-list windows. Available
 * immediately, before the app has recorded enough history for real phases.
 */
export function coarsePhases(p: MusicProfile): CoarsePhase[] {
  const order: TimeRange[] = ["long", "medium", "short"];
  return order
    .map((range, i) => {
      const ids = p.rankings.artists[range];
      const artists = ids.map((id) => p.artists[id]?.artist).filter((a): a is Artist => Boolean(a));
      const genres = new Map<string, number>();
      artists.forEach((a, rank) => {
        for (const g of a.genres) genres.set(g, (genres.get(g) ?? 0) + rankWeight(rank) / a.genres.length);
      });
      const total = [...genres.values()].reduce((x, y) => x + y, 0) || 1;
      const prev = i > 0 ? new Set(p.rankings.artists[order[i - 1]!]) : null;
      return {
        range,
        ...META[range],
        topGenres: [...genres].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, w]) => ({ name, share: w / total })),
        topArtists: artists.slice(0, 5),
        newArtists: prev ? artists.slice(0, 20).filter((a) => !prev.has(a.id)).slice(0, 5) : [],
      };
    })
    .filter((phase) => phase.topArtists.length > 0);
}
