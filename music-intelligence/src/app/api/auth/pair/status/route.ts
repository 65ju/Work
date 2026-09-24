import { NextResponse, type NextRequest } from "next/server";
import { deletePairing, getPairing, PAIR_COOKIE } from "@/server/auth/pairing";
import { cookieOptions, SESSION_COOKIE, SESSION_MAX_AGE, unseal } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** Polled by the desktop. Hands over the session once the phone approved the login. */
export async function GET(req: NextRequest) {
  const pending = await unseal<{ id: string }>(req.cookies.get(PAIR_COOKIE)?.value);
  if (!pending) return NextResponse.json({ status: "expired" });
  const record = await getPairing(pending.id).catch(() => null);
  if (!record) return NextResponse.json({ status: "expired" });
  if (record.status !== "approved" || !record.session) return NextResponse.json({ status: "pending" });

  await deletePairing(pending.id);
  const res = NextResponse.json({ status: "approved" });
  res.cookies.set(SESSION_COOKIE, record.session, cookieOptions(SESSION_MAX_AGE));
  res.cookies.delete(PAIR_COOKIE);
  return res;
}
