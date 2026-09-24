import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { deleteUser, recordingStatus, setRecordingEnabled } from "@/server/history/repository";
import { ensureRecorderSchedule } from "@/server/history/schedule";

export const dynamic = "force-dynamic";

async function context() {
  const session = await readSession();
  if (!session) return { error: NextResponse.json({ error: { code: "session_expired", message: "Not signed in." } }, { status: 401 }) };
  const db = await getDb().catch(() => null);
  return { session, db };
}

export async function GET() {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  if (!ctx.db) return NextResponse.json({ available: false, status: null });
  const schedule = await ensureRecorderSchedule().catch(() => "missing" as const);
  if (!ctx.session.userId) return NextResponse.json({ available: true, schedule, status: null, needsReconnect: true });
  return NextResponse.json({ available: true, schedule, status: await recordingStatus(ctx.db, ctx.session.userId) });
}

const patch = z.object({ enabled: z.boolean() });

export async function PATCH(req: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const body = patch.safeParse(await req.json().catch(() => null));
  if (!ctx.db || !ctx.session.userId || !body.success) return NextResponse.json({ error: { code: "unknown", message: "Invalid request." } }, { status: 400 });
  await setRecordingEnabled(ctx.db, ctx.session.userId, body.data.enabled);
  return NextResponse.json({ status: await recordingStatus(ctx.db, ctx.session.userId) });
}

/** Deletes the recorded history and the stored Spotify token. */
export async function DELETE() {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  if (!ctx.db || !ctx.session.userId) return NextResponse.json({ error: { code: "unknown", message: "Nothing to delete." } }, { status: 400 });
  await deleteUser(ctx.db, ctx.session.userId);
  return NextResponse.json({ deleted: true });
}
