import { NextResponse, type NextRequest } from "next/server";
import { buildHistoryProfile } from "@/analytics/history";
import type { HistoryResponse } from "@/analytics/history-types";
import { readSession } from "@/server/auth/session";
import { serverCache } from "@/server/cache/ttl-cache";
import { getDb } from "@/server/db/client";
import { loadHistory } from "@/server/history/repository";
import { sanitizeTimezone } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: { code: "session_expired", message: "Not signed in." } }, { status: 401 });
  const db = await getDb().catch(() => null);
  if (!db) return NextResponse.json({ available: false, reason: "no-database" } satisfies HistoryResponse);
  if (!session.userId) return NextResponse.json({ available: false, reason: "not-enrolled" } satisfies HistoryResponse);

  const tz = sanitizeTimezone(req.nextUrl.searchParams.get("tz"));
  const userId = session.userId;
  const history = await serverCache.get(`u:${userId}:history:${tz}`, 2 * 60_000, async () => {
    const loaded = await loadHistory(db, userId);
    return loaded ? buildHistoryProfile({ ...loaded, timezone: tz }) : null;
  });
  if (!history) return NextResponse.json({ available: false, reason: "not-enrolled" } satisfies HistoryResponse);
  return NextResponse.json({ available: true, history } satisfies HistoryResponse, { headers: { "Cache-Control": "private, no-store" } });
}
