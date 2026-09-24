/**
 * Synthetic snapshot for unit tests only. Never imported by application code.
 */
import type { Artist, MusicSnapshot, Play, Playlist, Track } from "@/domain/types";

const GENRES: Record<string, string[]> = {
  a1: ["rap", "trap", "hip hop"],
  a2: ["r&b", "pop"],
  a3: ["alternative r&b", "r&b"],
  a4: ["trap", "rap"],
  a5: ["indie pop", "pop"],
  a6: ["techno", "minimal techno"],
  a7: ["jazz"],
  a8: [],
};

export const artist = (id: string): Artist => ({ id, name: `Artist ${id.toUpperCase()}`, url: null, images: [], genres: GENRES[id] ?? [] });

export const track = (id: string, artistIds: string[], year = 2020): Track => ({
  id,
  name: `Track ${id}`,
  artists: artistIds.map((a) => ({ id: a, name: `Artist ${a.toUpperCase()}`, url: null })),
  album: { id: `al-${id}`, name: `Album ${id}`, images: [], releaseDate: `${year}-01-01`, releaseYear: year, url: null },
  durationMs: 180_000,
  explicit: false,
  url: null,
  uri: `spotify:track:${id}`,
});

export function makeSnapshot(overrides: Partial<MusicSnapshot> = {}): MusicSnapshot {
  const t = (i: number, a: string, year?: number) => track(`t${i}`, [a], year);
  const shortTracks = [t(1, "a1", 2023), t(2, "a1", 2022), t(3, "a2", 2021), t(4, "a3"), t(5, "a5", 2019), t(6, "a6")];
  const longTracks = [t(1, "a1"), t(7, "a4", 2018), t(8, "a2", 2017), t(9, "a7", 2015), t(3, "a2")];
  const base = Date.parse("2026-09-20T20:00:00Z");
  const recent: Play[] = Array.from({ length: 30 }, (_, i) => ({
    track: i % 3 === 0 ? shortTracks[0]! : shortTracks[i % shortTracks.length]!,
    playedAt: new Date(base - i * 4 * 60_000 - (i > 15 ? 6 * 3_600_000 : 0)).toISOString(),
    contextType: "playlist",
  }));
  const playlist: Playlist = {
    id: "p1",
    name: "Late",
    description: "",
    images: [],
    owner: { id: "me", name: "Me" },
    isOwned: true,
    collaborative: false,
    isPublic: false,
    totalItems: 4,
    url: null,
    entries: [
      { track: t(1, "a1"), addedAt: "2026-09-01T00:00:00Z" },
      { track: t(7, "a4"), addedAt: "2026-01-01T00:00:00Z" },
      { track: t(10, "a8"), addedAt: "2025-01-01T00:00:00Z" },
      { track: t(1, "a1"), addedAt: "2026-09-02T00:00:00Z" },
    ],
    entriesTruncated: false,
  };
  return {
    provider: "spotify",
    fetchedAt: "2026-09-21T00:00:00Z",
    user: { id: "me", displayName: "Me", images: [], url: null },
    topArtists: {
      short: ["a1", "a2", "a3", "a5", "a6"].map(artist),
      medium: ["a1", "a2", "a4", "a3"].map(artist),
      long: ["a1", "a4", "a2", "a7"].map(artist),
    },
    topTracks: { short: shortTracks, medium: shortTracks.slice(0, 4), long: longTracks },
    recent,
    playlists: [playlist, { ...playlist, id: "p2", name: "Followed", isOwned: false, owner: { id: "x", name: "X" }, entries: null }],
    saved: [{ track: t(4, "a3"), addedAt: "2024-05-05T00:00:00Z" }],
    savedTotal: 1,
    followedArtists: [],
    extraArtists: [artist("a8")],
    availability: {
      topArtists: { status: "ok" },
      topTracks: { status: "ok" },
      recentlyPlayed: { status: "ok" },
      playlists: { status: "partial" },
      savedTracks: { status: "ok" },
      followedArtists: { status: "ok" },
      artistGenres: { status: "ok" },
    },
    ...overrides,
  };
}
