import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { track } from "@/analytics/__tests__/fixture";
import type { Db } from "@/server/db/client";
import { ensureSchema } from "@/server/db/schema";
import { recordUser, type RecorderDeps } from "./recorder";
import { deleteUser, getUser, insertPlays, listRecordingUsers, recordingStatus, setRecordingEnabled, upsertUser } from "./repository";

let db: Db;

beforeEach(async () => {
  const pg = new PGlite();
  db = { query: async <T,>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows };
  await ensureSchema(db);
  await ensureSchema(db); // idempotent
  await upsertUser(db, { id: "u1", displayName: "U", imageUrl: null, refreshTokenEnc: "enc:rt-1" });
});

const play = (id: string, at: string) => ({ track: track(id, ["a1"]), playedAt: at, contextType: "album" });

describe("repository", () => {
  it("stores each play once, however often it is seen", async () => {
    expect(await insertPlays(db, "u1", [play("t1", "2026-09-24T10:00:00Z"), play("t2", "2026-09-24T10:04:00Z")])).toBe(2);
    expect(await insertPlays(db, "u1", [play("t2", "2026-09-24T10:04:00Z"), play("t3", "2026-09-24T10:08:00Z")])).toBe(1);
    const status = await recordingStatus(db, "u1");
    expect(status?.plays).toBe(3);
    expect(status?.listenedMs).toBe(3 * 180_000);
  });

  it("pauses and deletes users with all their plays", async () => {
    await insertPlays(db, "u1", [play("t1", "2026-09-24T10:00:00Z")]);
    await setRecordingEnabled(db, "u1", false);
    expect(await listRecordingUsers(db)).toEqual([]);
    await deleteUser(db, "u1");
    expect(await getUser(db, "u1")).toBeNull();
    expect((await db.query(`SELECT count(*)::int AS n FROM plays`))[0]).toEqual({ n: 0 });
  });
});

describe("recordUser", () => {
  const calls: string[] = [];
  const deps = (recent: unknown[]): RecorderDeps => ({
    decrypt: async (enc) => enc.replace("enc:", ""),
    encrypt: async (plain) => `enc:${plain}`,
    refresh: async (rt) => ({ accessToken: "at", refreshToken: rt === "rt-1" ? "rt-2" : rt, expiresAt: Date.now() + 3600e3, scope: "" }),
    today: () => "2026-09-24",
    client: () => async <T,>(path: string) => {
      calls.push(path);
      if (path === "/me/player/recently-played") return { items: recent, next: null } as T;
      if (path === "/me/top/artists") return { items: [{ id: "a1", name: "A1", genres: ["trap"], images: [] }], next: null, limit: 50 } as T;
      if (path === "/me/top/tracks") return { items: [{ id: "t9", name: "T9", uri: "spotify:track:t9", duration_ms: 1000, artists: [{ id: "a1", name: "A1" }] }], next: null, limit: 50 } as T;
      return null;
    },
  });
  const spPlay = (id: string, at: string) => ({ played_at: at, context: null, track: { id, name: id, uri: `spotify:track:${id}`, duration_ms: 2000, artists: [{ id: "a1", name: "A1" }] } });

  it("records plays, rotates the stored token and snapshots top lists once per day", async () => {
    const first = await recordUser(db, "u1", deps([spPlay("x1", "2026-09-24T09:00:00Z")]));
    expect(first).toMatchObject({ newPlays: 1, snapshot: true });
    expect((await getUser(db, "u1"))?.refresh_token_enc).toBe("enc:rt-2");

    calls.length = 0;
    const second = await recordUser(db, "u1", deps([spPlay("x1", "2026-09-24T09:00:00Z"), spPlay("x2", "2026-09-24T09:05:00Z")]));
    expect(second).toMatchObject({ newPlays: 1, snapshot: false });
    expect(calls).toEqual(["/me/player/recently-played"]);
    const snaps = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM top_snapshots WHERE user_id = 'u1'`);
    expect(snaps[0]?.n).toBe(6);
  });

  it("records the error instead of throwing when Spotify refuses", async () => {
    const failing: RecorderDeps = { ...deps([]), refresh: async () => Promise.reject(new Error("invalid_grant")) };
    const result = await recordUser(db, "u1", failing);
    expect(result.error).toBe("invalid_grant");
    expect((await getUser(db, "u1"))?.last_error).toBe("invalid_grant");
  });
});

describe("loadHistory", () => {
  it("joins plays with track and artist metadata", async () => {
    const { loadHistory, upsertArtists, missingArtistIds } = await import("./repository");
    await insertPlays(db, "u1", [play("t1", new Date().toISOString())]);
    expect(await missingArtistIds(db, "u1", 10)).toEqual(["a1"]);
    await upsertArtists(db, [{ id: "a1", name: "A1", url: null, images: [], genres: ["trap"] }]);
    const loaded = await loadHistory(db, "u1");
    expect(loaded?.rows).toHaveLength(1);
    expect(loaded?.rows[0]?.artistIds).toEqual(["a1"]);
    expect(loaded?.artists[0]?.genres).toEqual(["trap"]);
    expect(await missingArtistIds(db, "u1", 10)).toEqual([]);
  });
});
