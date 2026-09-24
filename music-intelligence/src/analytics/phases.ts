import type { HistoryArtist, HistoryTrack, Phase } from "./history-types";

export type WeekBucket = {
  weekStart: string;
  plays: number;
  ms: number;
  artists: Map<string, number>;
  genres: Map<string, number>;
  tracks: Map<string, number>;
};

export const PHASE_MIN_WEEKS = 4;
const MIN_WEEK_PLAYS = 8;
const SPLIT_SIMILARITY = 0.32;

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, v] of a) {
    na += v * v;
    const w = b.get(k);
    if (w) dot += v * w;
  }
  for (const v of b.values()) nb += v * v;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function normalize(m: Map<string, number>): Map<string, number> {
  const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
  return new Map([...m].map(([k, v]) => [k, v / total]));
}

function add(into: Map<string, number>, from: Map<string, number>) {
  for (const [k, v] of from) into.set(k, (into.get(k) ?? 0) + v);
}

/** Combined taste vector: genres carry the "sound", artists the specifics. */
function vector(w: { artists: Map<string, number>; genres: Map<string, number> }): Map<string, number> {
  const v = new Map<string, number>();
  for (const [k, x] of normalize(w.genres)) v.set(`g:${k}`, x * 0.6);
  for (const [k, x] of normalize(w.artists)) v.set(`a:${k}`, x * 0.4);
  return v;
}

/**
 * Splits the recorded weeks into phases: consecutive weeks whose taste stays
 * similar belong together; a clear shift in genres/artists starts a new phase.
 */
export function detectPhases(
  weeks: WeekBucket[],
  artistMeta: Map<string, HistoryArtist>,
  trackMeta: Map<string, HistoryTrack>,
  currentWeek: string,
): Phase[] {
  const usable = weeks.filter((w) => w.plays >= MIN_WEEK_PLAYS);
  if (usable.length < PHASE_MIN_WEEKS) return [];

  type Group = { weeks: WeekBucket[]; artists: Map<string, number>; genres: Map<string, number>; tracks: Map<string, number> };
  const groups: Group[] = [];
  for (const w of usable) {
    const g = groups.at(-1);
    if (g && (g.weeks.length < 2 || cosine(vector(g), vector(w)) >= SPLIT_SIMILARITY)) {
      g.weeks.push(w);
      add(g.artists, w.artists);
      add(g.genres, w.genres);
      add(g.tracks, w.tracks);
    } else {
      groups.push({ weeks: [w], artists: new Map(w.artists), genres: new Map(w.genres), tracks: new Map(w.tracks) });
    }
  }
  // A single stray week is merged into its predecessor instead of becoming its own phase.
  for (let i = groups.length - 1; i > 0; i--) {
    if (groups[i]!.weeks.length < 2) {
      const prev = groups[i - 1]!;
      const cur = groups[i]!;
      prev.weeks.push(...cur.weeks);
      add(prev.artists, cur.artists);
      add(prev.genres, cur.genres);
      add(prev.tracks, cur.tracks);
      groups.splice(i, 1);
    }
  }

  const overall = new Map<string, number>();
  for (const g of groups) add(overall, g.artists);
  const overallShare = normalize(overall);

  return groups.map((g, i) => {
    const plays = g.weeks.reduce((a, w) => a + w.plays, 0);
    const artistShare = normalize(g.artists);
    const genreShare = normalize(g.genres);
    const topGenres = [...genreShare].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, share]) => ({ name, share }));
    const defining = [...artistShare]
      .map(([id, share]) => ({ id, share, lift: share / Math.max(overallShare.get(id) ?? share, 0.0001) }))
      .filter((x) => (g.artists.get(x.id) ?? 0) >= 3)
      .sort((a, b) => b.share * Math.min(b.lift, 4) - a.share * Math.min(a.lift, 4))
      .slice(0, 4)
      .flatMap((x) => {
        const artist = artistMeta.get(x.id);
        return artist ? [{ artist, plays: g.artists.get(x.id) ?? 0, lift: Math.round(x.lift * 10) / 10 }] : [];
      });
    const topTracks = [...g.tracks]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .flatMap(([id, n]) => {
        const track = trackMeta.get(id);
        return track ? [{ track, plays: n }] : [];
      });
    const genre = topGenres[0]?.name;
    const lead = defining[0]?.artist.name;
    const label = genre ? `${titleCase(genre)} phase` : lead ? `The ${lead} phase` : "Mixed phase";
    const start = g.weeks[0]!.weekStart;
    const end = addDays(g.weeks.at(-1)!.weekStart, 6);
    return {
      id: `${start}-${i}`,
      label,
      start,
      end,
      weeks: g.weeks.length,
      plays,
      ms: g.weeks.reduce((a, w) => a + w.ms, 0),
      topGenres,
      definingArtists: defining,
      topTracks,
      // The latest phase counts as ongoing unless listening stopped for more than two weeks.
      current: i === groups.length - 1 && addDays(g.weeks.at(-1)!.weekStart, 14) >= currentWeek,
    };
  });
}

export const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
