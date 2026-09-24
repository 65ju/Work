import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, OAUTH_COOKIE, SESSION_COOKIE, seal, unseal, type OAuthState } from "@/server/auth/session";
import { exchangeCode } from "@/server/auth/spotify-oauth";
import { approvePairing } from "@/server/auth/pairing";
import { enrollUser } from "@/server/history/service";
import { SpotifyHttpClient } from "@/server/spotify/client";
import type { SpUser } from "@/server/spotify/types";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const fail = (code: string) => {
    const res = NextResponse.redirect(new URL(`/?error=${code}`, req.url));
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  };

  if (params.get("error")) return fail(params.get("error") === "access_denied" ? "access_denied" : "login_failed");

  const pending = await unseal<OAuthState>(req.cookies.get(OAUTH_COOKIE)?.value);
  const code = params.get("code");
  if (!pending || !code || params.get("state") !== pending.state) return fail("state_mismatch");

  try {
    const session = await exchangeCode(code, pending.verifier);
    // The user id scopes the server cache; failure here is non-fatal.
    const me = await new SpotifyHttpClient(session.accessToken).get<SpUser>("/me").catch(() => null);
    if (me) {
      session.userId = me.id;
      // Starts the listening recorder for this account (no-op without a database).
      await enrollUser({ id: me.id, displayName: me.display_name ?? me.id, imageUrl: me.images?.[0]?.url ?? null }, session.refreshToken).catch(
        (err) => console.error("Could not enroll user for recording", err),
      );
    }
    const maxAge = 60 * 60 * 24 * 30;

    // QR login: the phone only approves; the session is handed to the desktop that showed the code.
    if (pending.pairId) {
      const ok = await approvePairing(pending.pairId, await seal(session, maxAge));
      const res = NextResponse.redirect(new URL(`/pair/${encodeURIComponent(pending.pairId)}${ok ? "?done=1" : ""}`, req.url));
      res.cookies.delete(OAUTH_COOKIE);
      return res;
    }

    const target = new URL(pending.returnTo, req.url);
    target.searchParams.set("welcome", "1");
    const res = NextResponse.redirect(target);
    res.cookies.set(SESSION_COOKIE, await seal(session, maxAge), cookieOptions(maxAge));
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  } catch (err) {
    console.error(err);
    return fail("login_failed");
  }
}
