import type { Artist, MusicSnapshot, TimeRange } from "@/domain/types";
import { TIME_RANGES } from "@/domain/types";
import { maxIso, minIso, rankWeight } from "./math";
import type { ArtistStat, ArtistTier, TrackStat } from "./types";

/** Every artist the snapshot knows full metadata for, top lists first. */
export function artistDirectory(s: MusicSnapshot): Map<string, Artist> {
  const dir = new Map<string, Artist>();
  const put = (a: Artist) => {
    const existing = dir.get(a.id);
    if (!existing || (existing.genres.length === 0 && a.genres.length > 0)) dir.set(a.id, a);
  };
  for (const r of TIME_RANGES) s.topArtists[r].forEach(put);
  s.followedArtists.forEach(put);
  s.extraArtists.forEach(put);
  return dir;
}

export function buildArtistStats(s: MusicSnapshot, dir: Map<string, Artist>): Record<string, ArtistStat> {
  const stats = new Map<string, ArtistStat>();
  const ensure = (id: string, fallback: () => Artist): ArtistStat => {
    let st = stats.get(id);
    if (!st) {
      st = {
        artist: dir.get(id) ?? fallback(),
        ranks: {},
        score: 0,
        tier: "occasional",
        topTrackCount: 0,
        recentPlays: 0,
        playlistAppearances: 0,
        lastPlayedAt: null,
      };
      stats.set(id, st);
    }
    return st;
  };

  for (const range of TIME_RANGES) {
    s.topArtists[range].forEach((a, i) => {
      const st = ensure(a.id, () => a);
      st.ranks[range] = i + 1;
      st.score += rankWeight(i) * 2;
    });
  }
  const topTrackIds = new Set<string>();
  for (const range of TIME_RANGES) {
    s.topTracks[range].forEach((t, i) => {
      t.artists.forEach((ref, j) => {
        const st = ensure(ref.id, () => ({ ...ref, images: [], genres: [] }));
        st.score += rankWeight(i) * (j === 0 ? 0.6 : 0.3);
        const key = `${ref.id}:${t.id}`;
        if (!topTrackIds.has(key)) {
          topTrackIds.add(key);
          st.topTrackCount++;
        }
      });
    });
  }
  for (const p of s.recent) {
    p.track.artists.forEach((ref) => {
      const st = ensure(ref.id, () => ({ ...ref, images: [], genres: [] }));
      st.recentPlays++;
      st.score += 0.08;
      st.lastPlayedAt = maxIso(st.lastPlayedAt, p.playedAt);
    });
  }
  for (const pl of s.playlists) {
    const seen = new Set<string>();
    for (const e of pl.entries ?? []) for (const ref of e.track.artists) seen.add(ref.id);
    for (const id of seen) {
      const st = stats.get(id);
      if (st) st.playlistAppearances++;
    }
  }
  for (const st of stats.values()) st.tier = tierOf(st);
  return Object.fromEntries(stats);
}

function tierOf(st: ArtistStat): ArtistTier {
  const { short, medium, long } = st.ranks;
  const inCount = [short, medium, long].filter((r) => r !== undefined).length;
  if (inCount >= 2 && Math.min(short ?? 99, medium ?? 99, long ?? 99) <= 10) return "core";
  if (short !== undefined && long === undefined) return "rising";
  if (long !== undefined && short === undefined) return "longtime";
  if (inCount >= 1) return "steady";
  return "occasional";
}

export function buildTrackStats(s: MusicSnapshot): Record<string, TrackStat> {
  const stats = new Map<string, TrackStat>();
  const ensure = (t: MusicSnapshot["recent"][number]["track"]) => {
    let st = stats.get(t.id);
    if (!st) {
      st = { track: t, ranks: {}, recentPlays: 0, savedAt: null, playlistCount: 0, firstSeen: null, lastSeen: null };
      stats.set(t.id, st);
    }
    return st;
  };
  for (const range of TIME_RANGES) s.topTracks[range].forEach((t, i) => (ensure(t).ranks[range as TimeRange] = i + 1));
  for (const p of s.recent) {
    const st = ensure(p.track);
    st.recentPlays++;
    st.firstSeen = minIso(st.firstSeen, p.playedAt);
    st.lastSeen = maxIso(st.lastSeen, p.playedAt);
  }
  for (const sv of s.saved) {
    const st = stats.get(sv.track.id);
    if (st) {
      st.savedAt = sv.addedAt;
      st.firstSeen = minIso(st.firstSeen, sv.addedAt);
      st.lastSeen = maxIso(st.lastSeen, sv.addedAt);
    }
  }
  for (const pl of s.playlists) {
    for (const e of pl.entries ?? []) {
      const st = stats.get(e.track.id);
      if (!st) continue;
      st.playlistCount++;
      st.firstSeen = minIso(st.firstSeen, e.addedAt);
      st.lastSeen = maxIso(st.lastSeen, e.addedAt);
    }
  }
  return Object.fromEntries(stats);
}
