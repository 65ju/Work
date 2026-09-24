/**
 * Provider-agnostic music domain model. Everything above the provider layer
 * (analytics, recommendations, AI, UI) depends only on these types.
 */

export type TimeRange = "short" | "medium" | "long";
export const TIME_RANGES: readonly TimeRange[] = ["short", "medium", "long"];

export type ImageRef = { url: string; width: number | null; height: number | null };

export type ArtistRef = { id: string; name: string; url: string | null };

export type Artist = ArtistRef & {
  images: ImageRef[];
  /** Provider-supplied genre tags. Often empty — never assume coverage. */
  genres: string[];
};

export type Album = {
  id: string;
  name: string;
  images: ImageRef[];
  releaseDate: string | null;
  releaseYear: number | null;
  url: string | null;
};

export type Track = {
  id: string;
  name: string;
  artists: ArtistRef[];
  album: Album;
  durationMs: number;
  explicit: boolean;
  url: string | null;
  uri: string;
};

export type Play = { track: Track; playedAt: string; contextType: string | null };

export type PlaylistEntry = { track: Track; addedAt: string | null };

export type Playlist = {
  id: string;
  name: string;
  description: string;
  images: ImageRef[];
  owner: { id: string; name: string };
  isOwned: boolean;
  collaborative: boolean;
  isPublic: boolean | null;
  totalItems: number | null;
  url: string | null;
  /** null = the provider does not expose this playlist's contents to the app. */
  entries: PlaylistEntry[] | null;
  entriesTruncated: boolean;
};

export type SavedTrack = { track: Track; addedAt: string };

export type UserProfile = { id: string; displayName: string; images: ImageRef[]; url: string | null };

export type Playback = {
  isPlaying: boolean;
  progressMs: number;
  track: Track | null;
  device: { name: string; type: string; volumePercent: number | null } | null;
  fetchedAt: number;
};

export type AvailabilityStatus = "ok" | "empty" | "partial" | "unavailable";
export type DataAvailability = { status: AvailabilityStatus; note?: string };

export type DataSource =
  | "topArtists"
  | "topTracks"
  | "recentlyPlayed"
  | "playlists"
  | "savedTracks"
  | "followedArtists"
  | "artistGenres";

/** Raw, normalized data as returned by the provider — no derived values. */
export type MusicSnapshot = {
  provider: "spotify";
  fetchedAt: string;
  user: UserProfile;
  topArtists: Record<TimeRange, Artist[]>;
  topTracks: Record<TimeRange, Track[]>;
  recent: Play[];
  playlists: Playlist[];
  saved: SavedTrack[];
  savedTotal: number | null;
  followedArtists: Artist[];
  /** Genre tags for artists that only appear on tracks (fetched individually, capped). */
  extraArtists: Artist[];
  availability: Record<DataSource, DataAvailability>;
};
