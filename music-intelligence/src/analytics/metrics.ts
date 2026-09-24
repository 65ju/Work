import type { MusicSnapshot, Track } from "@/domain/types";
import { TIME_RANGES } from "@/domain/types";
import { clamp, effectiveCount, normalizedEntropy, rankWeight } from "./math";
import type { ArtistStat, Confidence, ListeningPatterns, Metric, MetricId, PlaylistInsight } from "./types";

type MetricInput = {
  snapshot: MusicSnapshot;
  artists: Record<string, ArtistStat>;
  listening: ListeningPatterns;
  playlists: PlaylistInsight[];
};

const confidenceFor = (n: number, medium: number, high: number): Confidence =>
  n >= high ? "high" : n >= medium ? "medium" : "low";

function metric(
  id: MetricId,
  label: string,
  axis: string,
  value: number | null,
  confidence: Confidence,
  basis: string,
  explanation: string,
  method: string,
): Metric {
  return {
    id,
    label,
    axis,
    value: value === null ? null : Math.round(clamp(value, 0, 100)),
    confidence,
    basis,
    explanation,
    method,
    provenance: "derived",
  };
}

function uniqueTopTracks(s: MusicSnapshot): { track: Track; weight: number }[] {
  const out = new Map<string, { track: Track; weight: number }>();
  for (const r of TIME_RANGES)
    s.topTracks[r].forEach((t, i) => {
      const cur = out.get(t.id) ?? { track: t, weight: 0 };
      cur.weight += rankWeight(i);
      out.set(t.id, cur);
    });
  return [...out.values()];
}

export function computeMetrics({ snapshot: s, artists, listening, playlists }: MetricInput): Metric[] {
  const metrics: Metric[] = [];
  const top = uniqueTopTracks(s);
  const recent = s.recent;

  // Artist diversity — how spread your favourite tracks are across artists.
  {
    const byArtist = new Map<string, number>();
    for (const { track, weight } of top) {
      const id = track.artists[0]?.id;
      if (id) byArtist.set(id, (byArtist.get(id) ?? 0) + weight);
    }
    const value = top.length >= 5 ? 100 * (0.5 * normalizedEntropy([...byArtist.values()]) + 0.5 * (byArtist.size / top.length)) : null;
    metrics.push(
      metric(
        "artistDiversity",
        "Artist diversity",
        "Artist range",
        value,
        confidenceFor(top.length, 25, 70),
        `${top.length} unique top tracks across all three time ranges`,
        "High means your favourite tracks come from many different artists.",
        "Average of the normalized entropy of rank-weighted track counts per primary artist and the ratio of distinct artists to tracks.",
      ),
    );
  }

  // Genre diversity — effective number of genres in your top artists.
  {
    const weights = new Map<string, number>();
    let tagged = 0;
    for (const st of Object.values(artists)) {
      if (!st.ranks.short && !st.ranks.medium && !st.ranks.long) continue;
      if (st.artist.genres.length === 0) continue;
      tagged++;
      for (const g of st.artist.genres) weights.set(g, (weights.get(g) ?? 0) + st.score / st.artist.genres.length);
    }
    const eff = effectiveCount([...weights.values()]);
    metrics.push(
      metric(
        "genreDiversity",
        "Genre diversity",
        "Genre range",
        tagged >= 5 ? (100 * Math.log(Math.max(eff, 1))) / Math.log(40) : null,
        confidenceFor(tagged, 15, 40),
        `${tagged} top artists with Spotify genre tags`,
        tagged >= 5
          ? `Your listening behaves like roughly ${Math.round(eff)} equally-weighted genres.`
          : "Spotify supplies genre tags for too few of your artists to measure this.",
        "exp(Shannon entropy) of rank-weighted genre tags from your top artists, on a log scale where 40 effective genres = 100.",
      ),
    );
  }

  // Discovery — how much of your recent favourites is new.
  {
    const shortIds = s.topArtists.short.map((a) => a.id);
    const longIds = new Set(s.topArtists.long.map((a) => a.id));
    const newShare = shortIds.length ? shortIds.filter((id) => !longIds.has(id)).length / shortIds.length : null;
    const knownIds = new Set(
      [...s.topArtists.short, ...s.topArtists.medium, ...s.topArtists.long, ...s.followedArtists].map((a) => a.id),
    );
    const unknownPlays = recent.length ? recent.filter((p) => !p.track.artists.some((a) => knownIds.has(a.id))).length / recent.length : null;
    const value =
      newShare !== null && unknownPlays !== null
        ? 100 * (0.6 * newShare + 0.4 * unknownPlays)
        : newShare !== null
          ? 100 * newShare
          : unknownPlays !== null
            ? 100 * unknownPlays
            : null;
    metrics.push(
      metric(
        "discovery",
        "Discovery rate",
        "Discovery",
        value,
        confidenceFor(shortIds.length + recent.length, 30, 80),
        "Top artists of the last ~4 weeks vs. all time, plus your last plays",
        "High means a large part of what you play right now is new to your long-term favourites.",
        "60% share of 4-week top artists missing from your long-term top artists + 40% share of recent plays by artists outside every top list you follow.",
      ),
    );
  }

  // Repetition — replays within the recent window.
  {
    const unique = new Set(recent.map((p) => p.track.id)).size;
    metrics.push(
      metric(
        "repetition",
        "Repeat rate",
        "Repetition",
        recent.length >= 10 ? 100 * clamp((1 - unique / recent.length) / 0.7) : null,
        recent.length >= 40 ? "medium" : "low",
        `Your last ${recent.length} plays (Spotify exposes only the 50 most recent)`,
        "High means you replay the same tracks often within a short window.",
        "1 − distinct tracks ÷ plays, scaled so 70% replays = 100.",
      ),
    );
  }

  // Focus — how concentrated your favourites are on a handful of artists.
  {
    const byArtist = new Map<string, number>();
    let total = 0;
    for (const { track, weight } of top)
      for (const a of track.artists) {
        byArtist.set(a.id, (byArtist.get(a.id) ?? 0) + weight);
        total += weight;
      }
    const top5 = [...byArtist.values()].sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0);
    metrics.push(
      metric(
        "focus",
        "Artist concentration",
        "Focus",
        top.length >= 5 && total > 0 ? (100 * clamp((top5 / total - 0.1) / 0.6)) : null,
        confidenceFor(top.length, 25, 70),
        `${top.length} unique top tracks`,
        "High means a few artists account for most of your favourite tracks.",
        "Rank-weighted share of top-track credits held by your 5 most frequent artists (10% → 0, 70% → 100).",
      ),
    );
  }

  // Loyalty — do long-term favourites stay in rotation?
  {
    const overlap = (a: { id: string }[], b: { id: string }[]) => {
      if (a.length === 0 || b.length === 0) return null;
      const bs = new Set(b.map((x) => x.id));
      let hit = 0;
      let tot = 0;
      a.forEach((x, i) => {
        const w = rankWeight(i);
        tot += w;
        if (bs.has(x.id)) hit += w;
      });
      return hit / tot;
    };
    const artistOverlap = overlap(s.topArtists.short, s.topArtists.long);
    const trackOverlap = overlap(s.topTracks.short, s.topTracks.long);
    const value =
      artistOverlap === null ? null : 100 * (trackOverlap === null ? artistOverlap : 0.7 * artistOverlap + 0.3 * trackOverlap);
    metrics.push(
      metric(
        "loyalty",
        "Temporal consistency",
        "Loyalty",
        value,
        confidenceFor(s.topArtists.short.length, 10, 30),
        "Your 4-week top lists compared with your long-term top lists",
        "High means the music you play now is the music you have played for a long time.",
        "Rank-weighted overlap of 4-week and long-term top artists (70%) and top tracks (30%).",
      ),
    );
  }

  // Intensity — plays per active day in the recent window.
  {
    const days = Math.max(listening.spanHours / 24, 1 / 24);
    const perDay = listening.sampleSize / Math.max(days, 1);
    metrics.push(
      metric(
        "intensity",
        "Listening intensity",
        "Intensity",
        listening.sampleSize >= 10 ? (100 * Math.log1p(perDay)) / Math.log1p(80) : null,
        listening.sampleSize >= 40 && listening.spanHours >= 24 ? "medium" : "low",
        `${listening.sampleSize} plays over ${formatSpan(listening.spanHours)}`,
        `About ${Math.round(perDay)} plays per day in your recent window.`,
        "log(1 + plays per day) over the window covered by your recent plays, where 80 plays/day = 100.",
      ),
    );
  }

  // Time spread — do you listen throughout the day or in bursts?
  {
    metrics.push(
      metric(
        "timeSpread",
        "Time-of-day spread",
        "Time spread",
        listening.sampleSize >= 15 ? 100 * normalizedEntropy(listening.hourly) : null,
        listening.sampleSize >= 40 ? "medium" : "low",
        `${listening.sampleSize} recent plays in ${listening.timezone}`,
        "High means you listen across many hours of the day rather than at one fixed time.",
        "Normalized entropy of your recent plays across the 24 hours of the day.",
      ),
    );
  }

  // Playlist diversity — average artist diversity of your own playlists.
  {
    const analyzed = playlists.filter((p) => p.analyzed && p.artistDiversity !== null);
    metrics.push(
      metric(
        "playlistDiversity",
        "Playlist diversity",
        "Playlists",
        analyzed.length ? analyzed.reduce((a, p) => a + (p.artistDiversity ?? 0), 0) / analyzed.length : null,
        confidenceFor(analyzed.length, 3, 8),
        `${analyzed.length} of your own playlists analysed`,
        "High means your playlists mix many artists rather than focusing on a few.",
        "Mean artist diversity across the playlists whose contents Spotify exposes.",
      ),
    );
  }

  return metrics;
}

export function formatSpan(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes`;
  if (hours < 48) return `${Math.round(hours)} hours`;
  return `${Math.round(hours / 24)} days`;
}

export const metricValue = (metrics: Metric[], id: MetricId) => metrics.find((m) => m.id === id)?.value ?? null;
