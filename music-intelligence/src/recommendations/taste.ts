import type { MusicProfile } from "@/analytics/types";
import type { TasteProfile } from "./types";

/** Condenses the music profile into the signals the candidate generator and scorer need. */
export function buildTasteProfile(profile: MusicProfile): TasteProfile {
  const genres = profile.genres.nodes.slice(0, 10).map((g) => ({ name: g.name, weight: g.share }));
  const maxW = genres[0]?.weight ?? 1;
  const artists = Object.values(profile.artists).sort((a, b) => b.score - a.score);
  const inTop = (a: (typeof artists)[number]) => Boolean(a.ranks.short || a.ranks.medium || a.ranks.long);

  const years = Object.values(profile.tracks)
    .filter((t) => Object.keys(t.ranks).length > 0)
    .map((t) => t.track.album.releaseYear)
    .filter((y): y is number => y !== null)
    .sort((a, b) => a - b);
  const q = (p: number) => years[Math.min(years.length - 1, Math.floor(p * (years.length - 1)))]!;

  const durations = Object.values(profile.tracks)
    .map((t) => t.track.durationMs)
    .sort((a, b) => a - b);

  return {
    genres: genres.map((g) => ({ name: g.name, weight: g.weight / maxW })),
    coreArtists: artists.filter(inTop).slice(0, 8).map((a) => ({ id: a.artist.id, name: a.artist.name })),
    adjacentArtists: artists
      .filter((a) => !inTop(a) && !a.artist.id.startsWith("name:") && (a.playlistAppearances > 0 || a.recentPlays > 0))
      .slice(0, 6)
      .map((a) => ({
        id: a.artist.id,
        name: a.artist.name,
        reason: a.playlistAppearances > 0 ? "appears in your playlists" : "shows up in your recent plays",
      })),
    era: years.length >= 8 ? { from: q(0.2), to: q(0.8), median: q(0.5) } : null,
    medianDurationMs: durations.length ? durations[Math.floor(durations.length / 2)]! : null,
    knownTrackIds: Object.keys(profile.tracks),
    knownArtistIds: artists.filter((a) => inTop(a) || a.recentPlays > 0).map((a) => a.artist.id),
  };
}
