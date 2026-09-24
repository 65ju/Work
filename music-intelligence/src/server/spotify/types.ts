/** Subset of Spotify Web API response shapes the app relies on (post Feb-2026 Development Mode). */

export type SpImage = { url: string; width: number | null; height: number | null };
export type SpExternalUrls = { spotify?: string };

export type SpSimplifiedArtist = { id: string | null; name: string; external_urls?: SpExternalUrls; uri?: string };

export type SpArtist = SpSimplifiedArtist & {
  id: string;
  images?: SpImage[];
  genres?: string[];
};

export type SpAlbum = {
  id: string | null;
  name: string;
  images?: SpImage[];
  release_date?: string | null;
  release_date_precision?: "year" | "month" | "day";
  external_urls?: SpExternalUrls;
};

export type SpTrack = {
  id: string | null;
  name: string;
  type?: "track" | "episode";
  uri: string;
  duration_ms: number;
  explicit?: boolean;
  is_local?: boolean;
  artists: SpSimplifiedArtist[];
  album?: SpAlbum;
  external_urls?: SpExternalUrls;
};

export type SpPaging<T> = { items: T[]; total?: number; next: string | null; limit: number; offset?: number };
export type SpCursorPaging<T> = { items: T[]; next: string | null; cursors?: { after?: string; before?: string } };

export type SpUser = { id: string; display_name: string | null; images?: SpImage[]; external_urls?: SpExternalUrls };

export type SpPlayHistory = { track: SpTrack; played_at: string; context: { type: string; uri: string } | null };

export type SpSimplifiedPlaylist = {
  id: string;
  name: string;
  description: string | null;
  images: SpImage[] | null;
  owner: { id: string; display_name?: string | null };
  collaborative: boolean;
  public: boolean | null;
  external_urls?: SpExternalUrls;
  /** Renamed from `tracks` in the Feb 2026 migration; both handled defensively. */
  items?: { total: number; href?: string } | null;
  tracks?: { total: number; href?: string } | null;
};

/** Item of GET /playlists/{id}/items (`track` was renamed to `item`). */
export type SpPlaylistItem = { added_at: string | null; item?: SpTrack | null; track?: SpTrack | null };

export type SpSavedTrack = { added_at: string; track: SpTrack };

export type SpCurrentlyPlaying = {
  is_playing: boolean;
  progress_ms: number | null;
  currently_playing_type?: string;
  item: SpTrack | null;
  device?: { name: string; type: string; volume_percent: number | null };
};

export type SpSearchResponse = { tracks?: SpPaging<SpTrack>; artists?: SpPaging<SpArtist> };
