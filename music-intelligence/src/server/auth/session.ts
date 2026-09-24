import "server-only";
import { EncryptJWT, jwtDecrypt, base64url } from "jose";
import { cookies } from "next/headers";
import { env } from "@/server/env";

export const SESSION_COOKIE = "smi_session";
export const OAUTH_COOKIE = "smi_oauth";

export type SpotifySession = {
  accessToken: string;
  refreshToken: string;
  /** epoch ms */
  expiresAt: number;
  scope: string;
  userId?: string;
};

export type OAuthState = { state: string; verifier: string; returnTo: string };

let keyPromise: Promise<Uint8Array> | null = null;

/** Derives a 256-bit key from SESSION_SECRET so any sufficiently long secret works. */
function key(): Promise<Uint8Array> {
  keyPromise ??= crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(env().SESSION_SECRET))
    .then((buf) => new Uint8Array(buf));
  return keyPromise;
}

export async function seal<T extends Record<string, unknown>>(payload: T, maxAgeSeconds: number): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .encrypt(await key());
}

export async function unseal<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, await key());
    return payload as T;
  } catch {
    return null;
  }
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

export async function readSession(): Promise<SpotifySession | null> {
  const store = await cookies();
  return unseal<SpotifySession>(store.get(SESSION_COOKIE)?.value);
}

/** Only callable from Route Handlers / Server Functions (cookies are read-only in Server Components). */
export async function writeSession(session: SpotifySession): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await seal(session, SESSION_MAX_AGE), cookieOptions(SESSION_MAX_AGE));
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function randomToken(bytes = 32): string {
  return base64url.encode(crypto.getRandomValues(new Uint8Array(bytes)));
}
