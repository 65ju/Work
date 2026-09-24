import type { Album, Artist, ArtistRef, ImageRef, Playlist, PlaylistEntry, Track } from "@/domain/types";
import type { SpAlbum, SpArtist, SpImage, SpSimplifiedArtist, SpSimplifiedPlaylist, SpTrack } from "./types";

const images = (list: SpImage[] | null | undefined): ImageRef[] =>
  (list ?? []).map((i) => ({ url: i.url, width: i.width ?? null, height: i.height ?? null }));

export const mapArtistRef = (a: SpSimplifiedArtist): ArtistRef => ({
  id: a.id ?? `name:${a.name}`,
  name: a.name,
  url: a.external_urls?.spotify ?? null,
});

export const mapArtist = (a: SpArtist): Artist => ({
  ...mapArtistRef(a),
  images: images(a.images),
  genres: a.genres ?? [],
});

export const mapAlbum = (a: SpAlbum | undefined): Album => {
  const releaseDate = a?.release_date ?? null;
  const year = releaseDate ? Number.parseInt(releaseDate.slice(0, 4), 10) : Number.NaN;
  return {
    id: a?.id ?? "unknown",
    name: a?.name ?? "",
    images: images(a?.images),
    releaseDate,
    releaseYear: Number.isFinite(year) ? year : null,
    url: a?.external_urls?.spotify ?? null,
  };
};

/** Returns null for local files, episodes and unavailable items — they carry no reliable metadata. */
export const mapTrack = (t: SpTrack | null | undefined): Track | null => {
  if (!t || !t.id || t.is_local || (t.type && t.type !== "track")) return null;
  return {
    id: t.id,
    name: t.name,
    artists: t.artists.map(mapArtistRef),
    album: mapAlbum(t.album),
    durationMs: t.duration_ms,
    explicit: Boolean(t.explicit),
    url: t.external_urls?.spotify ?? null,
    uri: t.uri,
  };
};

export const mapPlaylist = (
  p: SpSimplifiedPlaylist,
  currentUserId: string,
  entries: PlaylistEntry[] | null,
  entriesTruncated: boolean,
): Playlist => ({
  id: p.id,
  name: p.name,
  description: stripHtml(p.description ?? ""),
  images: images(p.images),
  owner: { id: p.owner.id, name: p.owner.display_name ?? p.owner.id },
  isOwned: p.owner.id === currentUserId,
  collaborative: p.collaborative,
  isPublic: p.public,
  totalItems: p.items?.total ?? p.tracks?.total ?? null,
  url: p.external_urls?.spotify ?? null,
  entries,
  entriesTruncated,
});

function stripHtml(s: string) {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}
