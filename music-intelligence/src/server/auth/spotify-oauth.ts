import "server-only";
import { env } from "@/server/env";
import type { SpotifySession } from "./session";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-top-read",
  "user-read-recently-played",
  "user-read-currently-playing",
  "user-read-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-follow-read",
] as const;

const TOKEN_URL = "https://accounts.spotify.com/api/token";

type TokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

export function authorizeUrl(state: string, challenge: string): string {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } = env();
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES.join(" "),
    state,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = env();
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (SPOTIFY_CLIENT_SECRET) {
    headers.Authorization = `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`;
  } else {
    body.set("client_id", SPOTIFY_CLIENT_ID);
  }
  const res = await fetch(TOKEN_URL, { method: "POST", headers, body, cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TokenError(res.status, detail);
  }
  return (await res.json()) as TokenResponse;
}

export class TokenError extends Error {
  override name = "TokenError";
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`Spotify token request failed (${status}): ${detail.slice(0, 200)}`);
  }
}

export async function exchangeCode(code: string, verifier: string): Promise<SpotifySession> {
  const data = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env().SPOTIFY_REDIRECT_URI,
      code_verifier: verifier,
    }),
  );
  if (!data.refresh_token) throw new TokenError(500, "No refresh token returned");
  return toSession(data, data.refresh_token);
}

/** Exchanges a refresh token. Spotify may rotate it; the old one is kept when none is returned. */
export async function refreshAccessToken(refreshToken: string): Promise<SpotifySession> {
  const data = await tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }));
  return toSession(data, data.refresh_token ?? refreshToken);
}

export async function refreshSession(session: SpotifySession, refreshToken = session.refreshToken): Promise<SpotifySession> {
  return { ...(await refreshAccessToken(refreshToken)), userId: session.userId };
}

function toSession(data: TokenResponse, refreshToken: string): SpotifySession {
  return {
    accessToken: data.access_token,
    refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}
