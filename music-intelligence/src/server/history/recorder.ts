import type { Db } from "@/server/db/client";
import type { TimeRange } from "@/domain/types";
import type { SpotifySession } from "@/server/auth/session";
import { mapArtist, mapTrack } from "@/server/spotify/mappers";
import type { SpArtist, SpCursorPaging, SpPaging, SpPlayHistory, SpTrack } from "@/server/spotify/types";
import {
  getUser,
  hasSnapshot,
  insertPlays,
  markRecorded,
  saveSnapshot,
  updateRefreshToken,
  upsertArtists,
  upsertTracks,
} from "./repository";

const RANGES: Record<TimeRange, string> = { short: "short_term", medium: "medium_term", long: "long_term" };

export type SpotifyGetter = <T>(path: string, params?: Record<string, string | number>) => Promise<T | null>;

export type RecorderDeps = {
  decrypt: (enc: string) => Promise<string>;
  encrypt: (plain: string) => Promise<string>;
  refresh: (refreshToken: string) => Promise<SpotifySession>;
  client: (accessToken: string) => SpotifyGetter;
  today?: () => string;
};

export type RecordResult = { userId: string; newPlays: number; snapshot: boolean; skipped?: string; error?: string };

/**
 * Records one user's listening: the latest plays (Spotify only exposes 50, so this
 * runs often) and, once per day, their top lists so taste changes can be tracked.
 */
export async function recordUser(db: Db, userId: string, deps: RecorderDeps): Promise<RecordResult> {
  const user = await getUser(db, userId);
  if (!user?.refresh_token_enc) return { userId, newPlays: 0, snapshot: false, skipped: "no token" };
  if (!user.recording_enabled) return { userId, newPlays: 0, snapshot: false, skipped: "paused" };

  try {
    const stored = await deps.decrypt(user.refresh_token_enc);
    const session = await deps.refresh(stored);
    if (session.refreshToken !== stored) await updateRefreshToken(db, userId, await deps.encrypt(session.refreshToken));
    const get = deps.client(session.accessToken);

    const recent = await get<SpCursorPaging<SpPlayHistory>>("/me/player/recently-played", { limit: 50 });
    const plays = (recent?.items ?? []).flatMap((p) => {
      const track = mapTrack(p.track);
      return track ? [{ track, playedAt: p.played_at, contextType: p.context?.type ?? null }] : [];
    });
    const newPlays = await insertPlays(db, userId, plays);

    const day = (deps.today ?? todayUtc)();
    let snapshot = false;
    if (!(await hasSnapshot(db, userId, day))) {
      for (const range of Object.keys(RANGES) as TimeRange[]) {
        const [artists, tracks] = await Promise.all([
          get<SpPaging<SpArtist>>("/me/top/artists", { time_range: RANGES[range], limit: 50 }),
          get<SpPaging<SpTrack>>("/me/top/tracks", { time_range: RANGES[range], limit: 50 }),
        ]);
        const a = (artists?.items ?? []).map(mapArtist);
        const t = (tracks?.items ?? []).map(mapTrack).filter((x): x is NonNullable<typeof x> => x !== null);
        await upsertArtists(db, a);
        await upsertTracks(db, t);
        await saveSnapshot(db, userId, day, "artists", range, a.map((x) => x.id));
        await saveSnapshot(db, userId, day, "tracks", range, t.map((x) => x.id));
      }
      snapshot = true;
    }

    await markRecorded(db, userId, null);
    return { userId, newPlays, snapshot };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markRecorded(db, userId, message).catch(() => undefined);
    return { userId, newPlays: 0, snapshot: false, error: message };
  }
}

export const todayUtc = () => new Date().toISOString().slice(0, 10);
