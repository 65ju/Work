import { Receiver } from "@upstash/qstash";
import { NextResponse, type NextRequest } from "next/server";
import { historyEnabled } from "@/server/db/client";
import { env } from "@/server/env";
import { recordAllUsers } from "@/server/history/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Hourly trigger from Upstash QStash (signed POST). */
export async function POST(req: NextRequest) {
  const { QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } = env();
  const signature = req.headers.get("upstash-signature");
  if (!QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY || !signature) return unauthorized();
  const body = await req.text();
  const valid = await new Receiver({ currentSigningKey: QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: QSTASH_NEXT_SIGNING_KEY })
    .verify({ signature, body, clockTolerance: 30 })
    .catch(() => false);
  if (!valid) return unauthorized();
  return run();
}

/** Daily fallback trigger from Vercel Cron (sends `Authorization: Bearer $CRON_SECRET`). */
export async function GET(req: NextRequest) {
  const secret = env().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();
  return run();
}

async function run() {
  if (!historyEnabled()) return NextResponse.json({ ok: false, reason: "No database configured" }, { status: 503 });
  const results = await recordAllUsers();
  return NextResponse.json({
    ok: results.every((r) => !r.error),
    users: results.length,
    newPlays: results.reduce((a, r) => a + r.newPlays, 0),
    errors: results.filter((r) => r.error).length,
  });
}

const unauthorized = () => NextResponse.json({ ok: false }, { status: 401 });
