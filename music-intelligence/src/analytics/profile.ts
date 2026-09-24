import type { MusicSnapshot } from "@/domain/types";
import { TIME_RANGES } from "@/domain/types";
import { artistDirectory, buildArtistStats, buildTrackStats } from "./entities";
import { buildGenreGraph } from "./genres";
import { analyzeListening } from "./listening";
import { computeMetrics, metricValue } from "./metrics";
import { buildArtistNetwork } from "./network";
import { derivePersonality } from "./personality";
import { analyzePlaylists } from "./playlists";
import type { MusicProfile, ProfileSummary } from "./types";

/** Music Profile Engine: turns a raw provider snapshot into the app's structured profile. */
export function buildMusicProfile(snapshot: MusicSnapshot, timezone: string): MusicProfile {
  const dir = artistDirectory(snapshot);
  const artists = buildArtistStats(snapshot, dir);
  const tracks = buildTrackStats(snapshot);
  const listening = analyzeListening(snapshot.recent, timezone);
  const playlists = analyzePlaylists(snapshot, dir, artists);
  const genres = buildGenreGraph(snapshot, artists);
  const network = buildArtistNetwork(snapshot, artists);
  const metrics = computeMetrics({ snapshot, artists, listening, playlists });
  const personality = derivePersonality(metrics, listening);

  const rankings = {
    artists: Object.fromEntries(TIME_RANGES.map((r) => [r, snapshot.topArtists[r].map((a) => a.id)])) as MusicProfile["rankings"]["artists"],
    tracks: Object.fromEntries(TIME_RANGES.map((r) => [r, snapshot.topTracks[r].map((t) => t.id)])) as MusicProfile["rankings"]["tracks"],
  };

  return {
    version: 1,
    provider: snapshot.provider,
    generatedAt: new Date().toISOString(),
    user: snapshot.user,
    coverage: {
      availability: snapshot.availability,
      counts: {
        topArtists: { short: snapshot.topArtists.short.length, medium: snapshot.topArtists.medium.length, long: snapshot.topArtists.long.length },
        topTracks: { short: snapshot.topTracks.short.length, medium: snapshot.topTracks.medium.length, long: snapshot.topTracks.long.length },
        recentPlays: snapshot.recent.length,
        playlists: snapshot.playlists.length,
        playlistsAnalyzed: playlists.filter((p) => p.analyzed).length,
        savedSampled: snapshot.saved.length,
        savedTotal: snapshot.savedTotal,
      },
    },
    rankings,
    artists,
    tracks,
    recent: snapshot.recent,
    genres,
    network,
    listening,
    playlists,
    metrics,
    personality,
    summary: summarize(snapshot, artists, tracks, genres.nodes.map((g) => g.name), metrics),
  };
}

function summarize(
  s: MusicSnapshot,
  artists: MusicProfile["artists"],
  tracks: MusicProfile["tracks"],
  genreNames: string[],
  metrics: MusicProfile["metrics"],
): ProfileSummary {
  const topArtistId = s.topArtists.short[0]?.id ?? s.topArtists.medium[0]?.id ?? s.topArtists.long[0]?.id;
  const topTrackId = s.topTracks.short[0]?.id ?? s.topTracks.medium[0]?.id ?? s.topTracks.long[0]?.id;

  const plays = new Map<string, number>();
  for (const p of s.recent) plays.set(p.track.id, (plays.get(p.track.id) ?? 0) + 1);
  const [repeatId, repeatCount] = [...plays.entries()].sort((a, b) => b[1] - a[1])[0] ?? [undefined, 0];
  const repeatTrack = repeatId ? s.recent.find((p) => p.track.id === repeatId)?.track : undefined;

  const discovery = metricValue(metrics, "discovery");
  return {
    topArtist: topArtistId ? (artists[topArtistId] ?? null) : null,
    topTrack: topTrackId ? (tracks[topTrackId] ?? null) : null,
    mostRepeated: repeatTrack && repeatCount >= 2 ? { track: repeatTrack, plays: repeatCount } : null,
    discoveryLevel: discovery === null ? null : discovery >= 55 ? "high" : discovery >= 28 ? "medium" : "low",
    activity: metricValue(metrics, "intensity"),
    dominantGenres: genreNames.slice(0, 5),
    totalMinutesTopShort: Math.round(s.topTracks.short.reduce((a, t) => a + t.durationMs, 0) / 60_000),
  };
}
