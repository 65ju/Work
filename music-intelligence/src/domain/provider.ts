import type { Artist, MusicSnapshot, Playback, Track } from "./types";

/**
 * Contract every music-data source implements. Spotify is the first provider;
 * another (e.g. Last.fm, Apple Music) can be added without touching analytics or UI.
 */
export interface MusicDataProvider {
  readonly id: MusicSnapshot["provider"];
  getSnapshot(): Promise<MusicSnapshot>;
  getPlayback(): Promise<Playback | null>;
  searchTracks(query: string, limit?: number): Promise<Track[]>;
  getArtist(id: string): Promise<Artist | null>;
  /** Recent releases by an artist (tracks of their latest albums/singles). */
  getArtistRecentTracks(artistId: string, maxTracks: number): Promise<Track[]>;
}
