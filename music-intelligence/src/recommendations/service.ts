import type { MusicProfile } from "@/analytics/types";
import type { MusicDataProvider } from "@/domain/provider";
import type { Artist, Track } from "@/domain/types";
import { scoreCandidate, selectDiverse, type Candidate } from "./scoring";
import { buildTasteProfile } from "./taste";
import type { DiscoveryResult } from "./types";

const MAX_GENRE_QUERIES = 5;
const MAX_ADJACENT = 4;
const MAX_NEW_RELEASE_ARTISTS = 3;
const MAX_ARTIST_LOOKUPS = 24;

/**
 * Pipeline: taste profile → candidate generation (provider search) → filtering →
 * scoring → diverse selection. Every result is an app-generated recommendation.
 */
export class RecommendationService {
  constructor(private readonly provider: MusicDataProvider) {}

  async discover(profile: MusicProfile, limit = 24): Promise<DiscoveryResult> {
    const taste = buildTasteProfile(profile);
    const candidates: Candidate[] = [];
    let queries = 0;

    const run = async (fn: () => Promise<void>) => {
      queries++;
      await fn().catch(() => undefined);
    };

    const genreJobs = taste.genres.slice(0, MAX_GENRE_QUERIES).map((g) =>
      run(async () => {
        const tracks = await this.provider.searchTracks(`genre:"${g.name}"`, 10);
        tracks.forEach((track) => candidates.push({ track, lane: "genre", laneDetail: g.name, seedGenre: g.name }));
      }),
    );
    const eraJobs = taste.era
      ? taste.genres.slice(0, 2).map((g) =>
          run(async () => {
            const tracks = await this.provider.searchTracks(`genre:"${g.name}" year:${taste.era!.from}-${taste.era!.to}`, 10);
            tracks.forEach((track) => candidates.push({ track, lane: "genre", laneDetail: g.name, seedGenre: g.name }));
          }),
        )
      : [];
    const adjacentJobs = taste.adjacentArtists.slice(0, MAX_ADJACENT).map((a) =>
      run(async () => {
        const tracks = await this.provider.searchTracks(`artist:"${a.name}"`, 10);
        tracks
          .filter((t) => t.artists.some((x) => x.id === a.id))
          .forEach((track) =>
            candidates.push({ track, lane: "adjacent-artist", laneDetail: `${a.name} ${a.reason}, but isn't one of your top artists yet` }),
          );
      }),
    );
    const releaseJobs = taste.coreArtists.slice(0, MAX_NEW_RELEASE_ARTISTS).map((a) =>
      run(async () => {
        const tracks = await this.provider.getArtistRecentTracks(a.id, 6);
        tracks.forEach((track) =>
          candidates.push({ track, lane: "new-release", laneDetail: `From the latest release by ${a.name}, one of your core artists` }),
        );
      }),
    );
    await Promise.all([...genreJobs, ...eraJobs, ...adjacentJobs, ...releaseJobs]);

    const known = new Set(taste.knownTrackIds);
    const seenKeys = new Set<string>();
    let filteredKnown = 0;
    const fresh = candidates.filter((c) => {
      const key = trackKey(c.track);
      if (known.has(c.track.id) || seenKeys.has(key)) {
        filteredKnown++;
        return false;
      }
      seenKeys.add(key);
      return true;
    });

    const artistInfo = await this.lookupArtists(profile, fresh.map((c) => c.track));
    const scored = fresh.map((c) => scoreCandidate(c, taste, artistInfo));

    return {
      generatedAt: new Date().toISOString(),
      taste,
      recommendations: selectDiverse(scored, limit),
      stats: { candidates: candidates.length, filteredKnown, queries },
    };
  }

  private async lookupArtists(profile: MusicProfile, tracks: Track[]): Promise<Map<string, Artist>> {
    const info = new Map<string, Artist>();
    for (const st of Object.values(profile.artists)) info.set(st.artist.id, st.artist);
    const missing = [...new Set(tracks.map((t) => t.artists[0]?.id).filter((id): id is string => Boolean(id) && !info.has(id!)))];
    await Promise.all(
      missing.slice(0, MAX_ARTIST_LOOKUPS).map(async (id) => {
        const a = await this.provider.getArtist(id).catch(() => null);
        if (a) info.set(id, a);
      }),
    );
    return info;
  }
}

/** Same recording often exists on several releases; dedupe by normalized title + primary artist. */
function trackKey(t: Track) {
  const title = t.name.toLowerCase().replace(/\s*[-(\[].*(remaster|version|edit|mix).*$/i, "").trim();
  return `${t.artists[0]?.id ?? ""}:${title}`;
}
