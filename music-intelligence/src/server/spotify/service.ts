import "server-only";
import type { MusicDataProvider } from "@/domain/provider";
import type {
  Artist,
  DataAvailability,
  DataSource,
  MusicSnapshot,
  Playback,
  Play,
  Playlist,
  PlaylistEntry,
  SavedTrack,
  TimeRange,
  Track,
} from "@/domain/types";
import { serverCache } from "@/server/cache/ttl-cache";
import { SpotifyHttpClient } from "./client";
import { SpotifyApiError } from "./errors";
import { mapArtist, mapPlaylist, mapTrack } from "./mappers";
import type {
  SpAlbum,
  SpArtist,
  SpCurrentlyPlaying,
  SpCursorPaging,
  SpPaging,
  SpPlayHistory,
  SpPlaylistItem,
  SpSavedTrack,
  SpSearchResponse,
  SpSimplifiedPlaylist,
  SpTrack,
  SpUser,
} from "./types";

const RANGE_PARAM: Record<TimeRange, string> = {
  short: "short_term",
  medium: "medium_term",
  long: "long_term",
};

const LIMITS = {
  playlistsWithItems: 14,
  playlistItemsPerPlaylist: 100,
  savedPages: 4,
  extraArtistLookups: 30,
};

const TTL = { snapshot: 5 * 60_000, search: 30 * 60_000, artist: 60 * 60_000 };

/** Spotify implementation of the provider contract (Web API, Development Mode compatible). */
export class SpotifyService implements MusicDataProvider {
  readonly id = "spotify" as const;
  private readonly http: SpotifyHttpClient;

  constructor(
    accessToken: string,
    private readonly cacheScope: string,
  ) {
    this.http = new SpotifyHttpClient(accessToken);
  }

  getSnapshot(): Promise<MusicSnapshot> {
    return serverCache.get(`${this.cacheScope}:snapshot`, TTL.snapshot, () => this.collect());
  }

  invalidate() {
    serverCache.invalidate(`${this.cacheScope}:`);
  }

  private async collect(): Promise<MusicSnapshot> {
    const me = await this.http.get<SpUser>("/me");
    if (!me) throw new SpotifyApiError("upstream", 502, "Spotify returned no profile");
    const availability = {} as Record<DataSource, DataAvailability>;

    const [topArtists, topTracks, recent, playlists, saved, followed] = await Promise.all([
      track(availability, "topArtists", () => this.topArtists(), emptyRanges<Artist>()),
      track(availability, "topTracks", () => this.topTracks(), emptyRanges<Track>()),
      track(availability, "recentlyPlayed", () => this.recentlyPlayed(), [] as Play[]),
      track(availability, "playlists", () => this.playlists(me.id), [] as Playlist[]),
      track(availability, "savedTracks", () => this.savedTracks(), { items: [] as SavedTrack[], total: null }),
      track(availability, "followedArtists", () => this.followedArtists(), [] as Artist[]),
    ]);

    if (availability.topArtists.status === "ok" && Object.values(topArtists).every((l) => l.length === 0)) {
      availability.topArtists = { status: "empty", note: "Spotify has not computed top artists for this account yet." };
    }
    if (availability.topTracks.status === "ok" && Object.values(topTracks).every((l) => l.length === 0)) {
      availability.topTracks = { status: "empty" };
    }
    if (availability.recentlyPlayed.status === "ok" && recent.length === 0) availability.recentlyPlayed = { status: "empty" };
    if (availability.playlists.status === "ok") {
      const hidden = playlists.filter((p) => p.entries === null).length;
      if (playlists.length === 0) availability.playlists = { status: "empty" };
      else if (hidden > 0)
        availability.playlists = {
          status: "partial",
          note: `Contents of ${hidden} playlist(s) are not available: Spotify only exposes items of playlists you own or collaborate on, and the app analyses at most ${LIMITS.playlistsWithItems}.`,
        };
    }

    const known = new Set<string>([
      ...Object.values(topArtists).flat().map((a) => a.id),
      ...followed.map((a) => a.id),
    ]);
    const extraArtists = await track(
      availability,
      "artistGenres",
      () => this.lookupArtists(candidateArtistIds(topTracks, recent, playlists, known)),
      [] as Artist[],
    );

    return {
      provider: "spotify",
      fetchedAt: new Date().toISOString(),
      user: {
        id: me.id,
        displayName: me.display_name ?? me.id,
        images: (me.images ?? []).map((i) => ({ url: i.url, width: i.width ?? null, height: i.height ?? null })),
        url: me.external_urls?.spotify ?? null,
      },
      topArtists,
      topTracks,
      recent,
      playlists,
      saved: saved.items,
      savedTotal: saved.total,
      followedArtists: followed,
      extraArtists,
      availability,
    };
  }

  private async topArtists(): Promise<Record<TimeRange, Artist[]>> {
    const entries = await Promise.all(
      (Object.keys(RANGE_PARAM) as TimeRange[]).map(async (range) => {
        const page = await this.http.get<SpPaging<SpArtist>>("/me/top/artists", { time_range: RANGE_PARAM[range], limit: 50 });
        return [range, (page?.items ?? []).map(mapArtist)] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<TimeRange, Artist[]>;
  }

  private async topTracks(): Promise<Record<TimeRange, Track[]>> {
    const entries = await Promise.all(
      (Object.keys(RANGE_PARAM) as TimeRange[]).map(async (range) => {
        const page = await this.http.get<SpPaging<SpTrack>>("/me/top/tracks", { time_range: RANGE_PARAM[range], limit: 50 });
        return [range, compact((page?.items ?? []).map(mapTrack))] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<TimeRange, Track[]>;
  }

  /** Spotify only exposes the 50 most recent plays. */
  private async recentlyPlayed(): Promise<Play[]> {
    const page = await this.http.get<SpCursorPaging<SpPlayHistory>>("/me/player/recently-played", { limit: 50 });
    return compact(
      (page?.items ?? []).map((p) => {
        const t = mapTrack(p.track);
        return t ? { track: t, playedAt: p.played_at, contextType: p.context?.type ?? null } : null;
      }),
    );
  }

  private async playlists(userId: string): Promise<Playlist[]> {
    const raw: SpSimplifiedPlaylist[] = [];
    let next: string | null = "/me/playlists";
    for (let page = 0; next && page < 2; page++) {
      const res: SpPaging<SpSimplifiedPlaylist | null> | null = await this.http.get(next, page === 0 ? { limit: 50 } : undefined);
      raw.push(...compact(res?.items ?? []));
      next = res?.next ?? null;
    }
    // Items are only readable for playlists the user owns or collaborates on.
    const readable = raw.filter((p) => p.owner.id === userId || p.collaborative).slice(0, LIMITS.playlistsWithItems);
    const readableIds = new Set(readable.map((p) => p.id));
    const itemsById = new Map<string, { entries: PlaylistEntry[] | null; truncated: boolean }>();
    await mapLimit(readable, 4, async (p) => {
      itemsById.set(p.id, await this.playlistEntries(p.id));
    });
    return raw.map((p) => {
      const items = itemsById.get(p.id);
      return mapPlaylist(p, userId, readableIds.has(p.id) ? (items?.entries ?? null) : null, items?.truncated ?? false);
    });
  }

  private async playlistEntries(id: string): Promise<{ entries: PlaylistEntry[] | null; truncated: boolean }> {
    try {
      const page = await this.http.get<SpPaging<SpPlaylistItem>>(`/playlists/${encodeURIComponent(id)}/items`, {
        limit: LIMITS.playlistItemsPerPlaylist,
        additional_types: "track",
      });
      const entries = compact(
        (page?.items ?? []).map((it) => {
          const t = mapTrack(it.item ?? it.track);
          return t ? { track: t, addedAt: it.added_at } : null;
        }),
      );
      return { entries, truncated: Boolean(page?.next) };
    } catch (err) {
      if (err instanceof SpotifyApiError && (err.kind === "forbidden" || err.kind === "not_found")) {
        return { entries: null, truncated: false };
      }
      throw err;
    }
  }

  private async savedTracks(): Promise<{ items: SavedTrack[]; total: number | null }> {
    const items: SavedTrack[] = [];
    let total: number | null = null;
    let next: string | null = "/me/tracks";
    for (let page = 0; next && page < LIMITS.savedPages; page++) {
      const res: SpPaging<SpSavedTrack> | null = await this.http.get(next, page === 0 ? { limit: 50 } : undefined);
      total = res?.total ?? total;
      for (const s of res?.items ?? []) {
        const t = mapTrack(s.track);
        if (t) items.push({ track: t, addedAt: s.added_at });
      }
      next = res?.next ?? null;
    }
    return { items, total };
  }

  private async followedArtists(): Promise<Artist[]> {
    const res = await this.http.get<{ artists: SpCursorPaging<SpArtist> }>("/me/following", { type: "artist", limit: 50 });
    return (res?.artists.items ?? []).map(mapArtist);
  }

  /** Batch artist lookup was removed for Development Mode apps, so artists are fetched one by one (capped, cached). */
  private async lookupArtists(ids: string[]): Promise<Artist[]> {
    const out: Artist[] = [];
    await mapLimit(ids.slice(0, LIMITS.extraArtistLookups), 5, async (id) => {
      const a = await this.getArtist(id).catch(() => null);
      if (a) out.push(a);
    });
    return out;
  }

  getArtist(id: string): Promise<Artist | null> {
    return serverCache.get(`artist:${id}`, TTL.artist, async () => {
      const a = await this.http.get<SpArtist>(`/artists/${encodeURIComponent(id)}`);
      return a ? mapArtist(a) : null;
    });
  }

  async getPlayback(): Promise<Playback | null> {
    const res = await this.http.get<SpCurrentlyPlaying>("/me/player", { additional_types: "track" });
    if (!res) return null;
    return {
      isPlaying: res.is_playing,
      progressMs: res.progress_ms ?? 0,
      track: mapTrack(res.item),
      device: res.device
        ? { name: res.device.name, type: res.device.type, volumePercent: res.device.volume_percent ?? null }
        : null,
      fetchedAt: Date.now(),
    };
  }

  /** Development Mode caps search at 10 results per request. */
  searchTracks(query: string, limit = 10): Promise<Track[]> {
    const capped = Math.min(Math.max(limit, 1), 10);
    return serverCache.get(`search:${capped}:${query}`, TTL.search, async () => {
      const res = await this.http.get<SpSearchResponse>("/search", { q: query, type: "track", limit: capped });
      return compact((res?.tracks?.items ?? []).map(mapTrack));
    });
  }

  getArtistRecentTracks(artistId: string, maxTracks: number): Promise<Track[]> {
    return serverCache.get(`artist-recent:${artistId}:${maxTracks}`, TTL.artist, async () => {
      const albums = await this.http.get<SpPaging<{ id: string; name: string; release_date?: string }>>(
        `/artists/${encodeURIComponent(artistId)}/albums`,
        { include_groups: "album,single", limit: 5 },
      );
      const latest = [...(albums?.items ?? [])]
        .sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""))
        .slice(0, 2);
      const tracks: Track[] = [];
      for (const album of latest) {
        const full = await this.http.get<SpAlbum & { id: string; tracks: SpPaging<SpTrack> }>(
          `/albums/${encodeURIComponent(album.id)}`,
        );
        if (!full) continue;
        const { tracks: albumTracks, ...albumMeta } = full;
        for (const t of albumTracks.items) {
          const mapped = mapTrack({ ...t, album: albumMeta });
          if (mapped) tracks.push(mapped);
          if (tracks.length >= maxTracks) return tracks;
        }
      }
      return tracks;
    });
  }
}

function emptyRanges<T>(): Record<TimeRange, T[]> {
  return { short: [], medium: [], long: [] };
}

async function track<T>(
  availability: Record<DataSource, DataAvailability>,
  source: DataSource,
  load: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const value = await load();
    availability[source] = { status: "ok" };
    return value;
  } catch (err) {
    // Auth failures abort the whole collection; everything else degrades per source.
    if (err instanceof SpotifyApiError && (err.kind === "unauthorized" || err.kind === "rate_limited")) throw err;
    availability[source] = {
      status: "unavailable",
      note: err instanceof SpotifyApiError && err.kind === "forbidden"
        ? "Spotify does not grant this app access to this data."
        : "Spotify did not return this data.",
    };
    return fallback;
  }
}

function candidateArtistIds(
  topTracks: Record<TimeRange, Track[]>,
  recent: Play[],
  playlists: Playlist[],
  known: Set<string>,
): string[] {
  const counts = new Map<string, number>();
  const add = (id: string, w: number) => {
    if (known.has(id) || id.startsWith("name:")) return;
    counts.set(id, (counts.get(id) ?? 0) + w);
  };
  for (const t of Object.values(topTracks).flat()) t.artists.forEach((a) => add(a.id, 2));
  for (const p of recent) p.track.artists.forEach((a) => add(a.id, 1));
  for (const pl of playlists) for (const e of pl.entries ?? []) e.track.artists.slice(0, 1).forEach((a) => add(a.id, 0.5));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

function compact<T>(list: (T | null | undefined)[]): T[] {
  return list.filter((x): x is T => x != null);
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++] as T;
      await fn(item);
    }
  });
  await Promise.all(workers);
}
