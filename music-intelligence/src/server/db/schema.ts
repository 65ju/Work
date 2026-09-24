import type { Db } from "./client";

/** Idempotent schema. Small enough that a migration tool would be overhead. */
export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    display_name text NOT NULL,
    image_url text,
    refresh_token_enc text,
    recording_enabled boolean NOT NULL DEFAULT true,
    recording_since timestamptz NOT NULL DEFAULT now(),
    last_recorded_at timestamptz,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS tracks (
    id text PRIMARY KEY,
    name text NOT NULL,
    artist_ids text[] NOT NULL,
    artist_names text[] NOT NULL,
    album_id text,
    album_name text,
    image_url text,
    duration_ms integer NOT NULL,
    release_year integer,
    url text,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS artists (
    id text PRIMARY KEY,
    name text NOT NULL,
    genres text[] NOT NULL DEFAULT '{}',
    image_url text,
    url text,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS plays (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    played_at timestamptz NOT NULL,
    track_id text NOT NULL,
    context_type text,
    PRIMARY KEY (user_id, played_at)
  )`,
  `CREATE INDEX IF NOT EXISTS plays_user_track ON plays (user_id, track_id)`,
  `CREATE TABLE IF NOT EXISTS top_snapshots (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day date NOT NULL,
    kind text NOT NULL CHECK (kind IN ('artists', 'tracks')),
    time_range text NOT NULL CHECK (time_range IN ('short', 'medium', 'long')),
    ids text[] NOT NULL,
    PRIMARY KEY (user_id, day, kind, time_range)
  )`,
];

export async function ensureSchema(db: Db): Promise<void> {
  for (const statement of SCHEMA) await db.query(statement);
}
