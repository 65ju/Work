import "server-only";
import { NextResponse } from "next/server";
import { ConfigurationError } from "@/server/env";
import { SpotifyApiError, SessionExpiredError } from "@/server/spotify/errors";
import { SpotifyService } from "@/server/spotify/service";
import { clearSession, readSession, writeSession, type SpotifySession } from "./session";
import { historyEnabled } from "@/server/db/client";
import { storedRefreshToken, storeRefreshToken } from "@/server/history/service";
import { refreshSession, TokenError } from "./spotify-oauth";

const REFRESH_MARGIN_MS = 60_000;
const refreshing = new Map<string, Promise<SpotifySession>>();

/** Returns a session with a valid access token, refreshing (once, de-duplicated) when needed. */
export async function requireFreshSession(): Promise<SpotifySession> {
  const session = await readSession();
  if (!session) throw new SessionExpiredError("Not signed in");
  if (session.expiresAt - REFRESH_MARGIN_MS > Date.now()) return session;

  let pending = refreshing.get(session.refreshToken);
  if (!pending) {
    pending = refreshShared(session).finally(() => {
      setTimeout(() => refreshing.delete(session.refreshToken), 10_000);
    });
    refreshing.set(session.refreshToken, pending);
  }
  try {
    const next = await pending;
    await writeSession(next);
    return next;
  } catch (err) {
    if (err instanceof TokenError && err.status >= 400 && err.status < 500) {
      await clearSession();
      throw new SessionExpiredError("Spotify session could not be refreshed");
    }
    throw err;
  }
}

/**
 * With history enabled, the database holds the newest refresh token (the recorder
 * may have rotated it), so browser sessions refresh from there first.
 */
async function refreshShared(session: SpotifySession): Promise<SpotifySession> {
  if (session.userId && historyEnabled()) {
    const stored = await storedRefreshToken(session.userId).catch(() => null);
    if (stored) {
      try {
        const next = await refreshSession(session, stored);
        if (next.refreshToken !== stored) await storeRefreshToken(session.userId, next.refreshToken).catch(() => undefined);
        return next;
      } catch (err) {
        if (!(err instanceof TokenError)) throw err;
      }
    }
  }
  return refreshSession(session);
}

export async function spotifyForRequest(): Promise<SpotifyService> {
  const session = await requireFreshSession();
  // Scope cache by refresh token hash-ish prefix; user id is unknown until /me is fetched.
  const scope = session.userId ?? session.refreshToken.slice(-16);
  return new SpotifyService(session.accessToken, `u:${scope}`);
}

export type ApiErrorBody = {
  error: { code: "session_expired" | "rate_limited" | "forbidden" | "upstream" | "config" | "unknown"; message: string; retryAfter?: number };
};

/** Uniform JSON error mapping for all API routes. */
export async function handleApiError(err: unknown): Promise<NextResponse<ApiErrorBody>> {
  if (err instanceof SessionExpiredError) {
    return NextResponse.json({ error: { code: "session_expired", message: "Your Spotify session has ended." } }, { status: 401 });
  }
  if (err instanceof SpotifyApiError) {
    if (err.kind === "unauthorized") {
      await clearSession();
      return NextResponse.json({ error: { code: "session_expired", message: "Spotify rejected the session." } }, { status: 401 });
    }
    if (err.kind === "rate_limited") {
      return NextResponse.json(
        { error: { code: "rate_limited", message: "Spotify is rate limiting requests.", retryAfter: err.retryAfterSeconds } },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds ?? 5) } },
      );
    }
    if (err.kind === "forbidden") {
      return NextResponse.json(
        { error: { code: "forbidden", message: "Spotify denied access. In Development Mode your account must be added as a user of the app." } },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: { code: "upstream", message: "Spotify is not responding as expected." } }, { status: 502 });
  }
  if (err instanceof ConfigurationError) {
    console.error(err.message);
    return NextResponse.json({ error: { code: "config", message: "The server is not configured correctly." } }, { status: 500 });
  }
  console.error(err);
  return NextResponse.json({ error: { code: "unknown", message: "Something went wrong." } }, { status: 500 });
}
