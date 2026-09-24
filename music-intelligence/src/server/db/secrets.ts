import "server-only";
import { compactDecrypt, CompactEncrypt } from "jose";
import { env } from "@/server/env";

let keyPromise: Promise<Uint8Array> | null = null;

/** Separate key derivation from the session cookie key, from the same SESSION_SECRET. */
function key(): Promise<Uint8Array> {
  keyPromise ??= crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(`token-store:${env().SESSION_SECRET}`))
    .then((b) => new Uint8Array(b));
  return keyPromise;
}

/** Refresh tokens are stored encrypted (A256GCM); a database leak alone does not expose them. */
export async function encryptSecret(plain: string): Promise<string> {
  return new CompactEncrypt(new TextEncoder().encode(plain)).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).encrypt(await key());
}

export async function decryptSecret(token: string): Promise<string> {
  const { plaintext } = await compactDecrypt(token, await key());
  return new TextDecoder().decode(plaintext);
}
