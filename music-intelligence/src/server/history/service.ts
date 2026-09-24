import "server-only";
import type { MusicSnapshot } from "@/domain/types";
import { getDb } from "@/server/db/client";
import { decryptSecret, encryptSecret } from "@/server/db/secrets";
import { refreshAccessToken } from "@/server/auth/spotify-oauth";
import { SpotifyHttpClient } from "@/server/spotify/client";
import { recordUser, todayUtc, type RecordResult, type RecorderDeps } from "./recorder";
import { ensureRecorderSchedule } from "./schedule";
import {
  getUser,
  hasSnapshot,
  insertPlays,
  listRecordingUsers,
  saveSnapshot,
  updateRefreshToken,
  upsertArtists,
  upsertTracks,
  upsertUser,
} from "./repository";

export const recorderDeps: RecorderDeps = {
  decrypt: decryptSecret,
  encrypt: encryptSecret,
  refresh: refreshAccessToken,
  client: (token) => {
    const http = new SpotifyHttpClient(token);
    return (path, params) => http.get(path, params);
  },
};

/** Called after every successful Spotify login: starts (or resumes) recording for this user. */
export async function enrollUser(user: { id: string; displayName: string; imageUrl: string | null }, refreshToken: string) {
  const db = await getDb();
  if (!db) return;
  await upsertUser(db, { ...user, refreshTokenEnc: await encryptSecret(refreshToken) });
  await ensureRecorderSchedule().catch((err) => console.error("Could not create recorder schedule", err));
}

export async function recordAllUsers(): Promise<RecordResult[]> {
  const db = await getDb();
  if (!db) return [];
  const results: RecordResult[] = [];
  for (const id of await listRecordingUsers(db)) results.push(await recordUser(db, id, recorderDeps));
  return results;
}

/**
 * Free extra coverage: whenever the app loads a profile it already has the latest
 * plays and top lists in memory, so they are stored without extra Spotify calls.
 */
export async function ingestSnapshot(snapshot: MusicSnapshot): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const user = await getUser(db, snapshot.user.id);
  if (!user?.recording_enabled) return;
  await insertPlays(db, user.id, snapshot.recent);
  await upsertArtists(db, [...snapshot.extraArtists, ...snapshot.followedArtists]);
  const day = todayUtc();
  if (await hasSnapshot(db, user.id, day)) return;
  if (snapshot.availability.topArtists.status !== "ok" || snapshot.availability.topTracks.status !== "ok") return;
  for (const range of ["short", "medium", "long"] as const) {
    await upsertArtists(db, snapshot.topArtists[range]);
    await upsertTracks(db, snapshot.topTracks[range]);
    await saveSnapshot(db, user.id, day, "artists", range, snapshot.topArtists[range].map((a) => a.id));
    await saveSnapshot(db, user.id, day, "tracks", range, snapshot.topTracks[range].map((t) => t.id));
  }
}

/** Latest stored refresh token for a user, so browser sessions and the recorder share one token lineage. */
export async function storedRefreshToken(userId: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const user = await getUser(db, userId);
  return user?.refresh_token_enc ? decryptSecret(user.refresh_token_enc) : null;
}

export async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await updateRefreshToken(db, userId, await encryptSecret(refreshToken));
}
