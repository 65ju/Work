import type { Db } from "@/server/db/client";
import type { Artist, Play, TimeRange, Track } from "@/domain/types";

export type UserRow = {
  id: string;
  display_name: string;
  image_url: string | null;
  refresh_token_enc: string | null;
  recording_enabled: boolean;
  recording_since: string;
  last_recorded_at: string | null;
  last_error: string | null;
};

export type RecordingStatus = {
  enabled: boolean;
  since: string;
  lastRecordedAt: string | null;
  lastError: string | null;
  plays: number;
  listenedMs: number;
  firstPlayAt: string | null;
};

const iso = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

export async function upsertUser(
  db: Db,
  user: { id: string; displayName: string; imageUrl: string | null; refreshTokenEnc: string },
): Promise<void> {
  await db.query(
    `INSERT INTO users (id, display_name, image_url, refresh_token_enc)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, image_url = EXCLUDED.image_url,
       refresh_token_enc = EXCLUDED.refresh_token_enc, last_error = NULL, updated_at = now()`,
    [user.id, user.displayName, user.imageUrl, user.refreshTokenEnc],
  );
}

export async function getUser(db: Db, id: string): Promise<UserRow | null> {
  const rows = await db.query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
  const r = rows[0];
  return r ? { ...r, recording_since: iso(r.recording_since)!, last_recorded_at: iso(r.last_recorded_at) } : null;
}

export async function listRecordingUsers(db: Db): Promise<string[]> {
  const rows = await db.query<{ id: string }>(
    `SELECT id FROM users WHERE recording_enabled AND refresh_token_enc IS NOT NULL ORDER BY last_recorded_at NULLS FIRST`,
  );
  return rows.map((r) => r.id);
}

export async function updateRefreshToken(db: Db, id: string, refreshTokenEnc: string): Promise<void> {
  await db.query(`UPDATE users SET refresh_token_enc = $2, updated_at = now() WHERE id = $1`, [id, refreshTokenEnc]);
}

export async function markRecorded(db: Db, id: string, error: string | null): Promise<void> {
  await db.query(
    error
      ? `UPDATE users SET last_error = $2, updated_at = now() WHERE id = $1`
      : `UPDATE users SET last_recorded_at = now(), last_error = NULL, updated_at = now() WHERE id = $1`,
    error ? [id, error.slice(0, 300)] : [id],
  );
}

export async function setRecordingEnabled(db: Db, id: string, enabled: boolean): Promise<void> {
  await db.query(`UPDATE users SET recording_enabled = $2, updated_at = now() WHERE id = $1`, [id, enabled]);
}

/** Removes the user, their token, plays and snapshots. Shared catalog rows (tracks, artists) stay. */
export async function deleteUser(db: Db, id: string): Promise<void> {
  await db.query(`DELETE FROM users WHERE id = $1`, [id]);
}

export async function upsertTracks(db: Db, tracks: Track[]): Promise<void> {
  const unique = [...new Map(tracks.map((t) => [t.id, t])).values()];
  if (unique.length === 0) return;
  await db.query(
    `INSERT INTO tracks (id, name, artist_ids, artist_names, album_id, album_name, image_url, duration_ms, release_year, url)
     SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text, name text, artist_ids text[], artist_names text[],
       album_id text, album_name text, image_url text, duration_ms integer, release_year integer, url text)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, artist_ids = EXCLUDED.artist_ids, artist_names = EXCLUDED.artist_names,
       album_id = EXCLUDED.album_id, album_name = EXCLUDED.album_name, image_url = COALESCE(EXCLUDED.image_url, tracks.image_url),
       duration_ms = EXCLUDED.duration_ms, release_year = EXCLUDED.release_year, url = EXCLUDED.url, updated_at = now()`,
    [
      JSON.stringify(
        unique.map((t) => ({
          id: t.id,
          name: t.name,
          artist_ids: t.artists.map((a) => a.id),
          artist_names: t.artists.map((a) => a.name),
          album_id: t.album.id,
          album_name: t.album.name,
          image_url: pickMid(t.album.images),
          duration_ms: t.durationMs,
          release_year: t.album.releaseYear,
          url: t.url,
        })),
      ),
    ],
  );
}

export async function upsertArtists(db: Db, artists: Artist[]): Promise<void> {
  const unique = [...new Map(artists.map((a) => [a.id, a])).values()];
  if (unique.length === 0) return;
  await db.query(
    `INSERT INTO artists (id, name, genres, image_url, url)
     SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text, name text, genres text[], image_url text, url text)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
       genres = CASE WHEN cardinality(EXCLUDED.genres) > 0 THEN EXCLUDED.genres ELSE artists.genres END,
       image_url = COALESCE(EXCLUDED.image_url, artists.image_url), url = EXCLUDED.url, updated_at = now()`,
    [JSON.stringify(unique.map((a) => ({ id: a.id, name: a.name, genres: a.genres, image_url: pickMid(a.images), url: a.url })))],
  );
}

/** Stores plays idempotently: the same play (user + timestamp) is only ever kept once. Returns how many were new. */
export async function insertPlays(db: Db, userId: string, plays: Play[]): Promise<number> {
  if (plays.length === 0) return 0;
  await upsertTracks(
    db,
    plays.map((p) => p.track),
  );
  const rows = await db.query<{ played_at: unknown }>(
    `INSERT INTO plays (user_id, played_at, track_id, context_type)
     SELECT $1, x.played_at, x.track_id, x.context_type
     FROM jsonb_to_recordset($2::jsonb) AS x(played_at timestamptz, track_id text, context_type text)
     ON CONFLICT DO NOTHING
     RETURNING played_at`,
    [userId, JSON.stringify(plays.map((p) => ({ played_at: p.playedAt, track_id: p.track.id, context_type: p.contextType })))],
  );
  return rows.length;
}

export async function latestPlayAt(db: Db, userId: string): Promise<string | null> {
  const rows = await db.query<{ max: unknown }>(`SELECT max(played_at) AS max FROM plays WHERE user_id = $1`, [userId]);
  return iso(rows[0]?.max);
}

export async function hasSnapshot(db: Db, userId: string, day: string): Promise<boolean> {
  const rows = await db.query(`SELECT 1 FROM top_snapshots WHERE user_id = $1 AND day = $2 LIMIT 1`, [userId, day]);
  return rows.length > 0;
}

export async function saveSnapshot(
  db: Db,
  userId: string,
  day: string,
  kind: "artists" | "tracks",
  range: TimeRange,
  ids: string[],
): Promise<void> {
  await db.query(
    `INSERT INTO top_snapshots (user_id, day, kind, time_range, ids) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, day, kind, time_range) DO UPDATE SET ids = EXCLUDED.ids`,
    [userId, day, kind, range, ids],
  );
}

export async function recordingStatus(db: Db, userId: string): Promise<RecordingStatus | null> {
  const user = await getUser(db, userId);
  if (!user) return null;
  const rows = await db.query<{ plays: unknown; ms: unknown; first: unknown }>(
    `SELECT count(*) AS plays, coalesce(sum(t.duration_ms), 0) AS ms, min(p.played_at) AS first
     FROM plays p LEFT JOIN tracks t ON t.id = p.track_id WHERE p.user_id = $1`,
    [userId],
  );
  return {
    enabled: user.recording_enabled,
    since: user.recording_since,
    lastRecordedAt: user.last_recorded_at,
    lastError: user.last_error,
    plays: Number(rows[0]?.plays ?? 0),
    listenedMs: Number(rows[0]?.ms ?? 0),
    firstPlayAt: iso(rows[0]?.first),
  };
}

function pickMid(images: { url: string; width: number | null }[]): string | null {
  if (images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((i) => (i.width ?? 0) >= 250) ?? sorted.at(-1))!.url;
}
