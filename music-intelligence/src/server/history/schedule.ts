import "server-only";
import { Client } from "@upstash/qstash";
import { env, publicOrigin } from "@/server/env";

const SCHEDULE_ID = "music-intelligence-recorder";
const RECHECK_MS = 6 * 60 * 60_000;
const state = globalThis as unknown as { __smiScheduleCheckedAt?: number };

export type ScheduleState = "managed" | "manual" | "missing";

/**
 * Creates (or overwrites) the hourly QStash schedule that triggers the recorder.
 * Idempotent thanks to the fixed schedule id; runs at most every few hours per instance.
 */
export async function ensureRecorderSchedule(): Promise<ScheduleState> {
  const e = env();
  if (!e.QSTASH_TOKEN) return e.QSTASH_CURRENT_SIGNING_KEY ? "manual" : "missing";
  if (!e.SPOTIFY_REDIRECT_URI.startsWith("https://")) return "missing";
  const last = state.__smiScheduleCheckedAt ?? 0;
  if (Date.now() - last < RECHECK_MS) return "managed";
  const client = new Client({ token: e.QSTASH_TOKEN, ...(e.QSTASH_URL ? { baseUrl: e.QSTASH_URL } : {}) });
  await client.schedules.create({
    scheduleId: SCHEDULE_ID,
    destination: `${publicOrigin()}/api/recorder/run`,
    cron: "0 * * * *",
    method: "POST",
    retries: 2,
  });
  state.__smiScheduleCheckedAt = Date.now();
  return "managed";
}
