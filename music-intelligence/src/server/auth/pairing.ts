import "server-only";
import { env } from "@/server/env";
import { hasSharedStore, pairingStore } from "./pairing-store";
import { randomToken } from "./session";

export const PAIR_COOKIE = "smi_pair";
export const PAIR_TTL_SECONDS = 300;

export type PairingRecord = {
  code: string;
  status: "pending" | "approved";
  /** Sealed (encrypted) session, set once the phone finished the Spotify login. */
  session?: string;
  createdAt: number;
};

export type PairingAvailability = { available: true } | { available: false; reason: string };

/**
 * QR login needs a redirect URI the phone can reach (HTTPS, not 127.0.0.1) and,
 * on serverless hosts, a shared store so every instance sees the same pairing.
 */
export function pairingAvailability(): PairingAvailability {
  try {
    const e = env();
    if (!e.SPOTIFY_REDIRECT_URI.startsWith("https://")) {
      return { available: false, reason: "QR login needs the app to run on a public HTTPS address." };
    }
    if (process.env.VERCEL && !hasSharedStore()) {
      return { available: false, reason: "QR login on Vercel needs an Upstash Redis store connected to the project." };
    }
    return { available: true };
  } catch {
    return { available: false, reason: "The server is not configured." };
  }
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function humanCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${chars.slice(0, 3)}-${chars.slice(3)}`;
}

const key = (id: string) => `pair:${id}`;

export async function createPairing(): Promise<{ id: string; record: PairingRecord }> {
  const id = randomToken(18);
  const record: PairingRecord = { code: humanCode(), status: "pending", createdAt: Date.now() };
  await pairingStore().set(key(id), JSON.stringify(record), PAIR_TTL_SECONDS);
  return { id, record };
}

export async function getPairing(id: string): Promise<PairingRecord | null> {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(id)) return null;
  const raw = await pairingStore().get(key(id));
  return raw ? (JSON.parse(raw) as PairingRecord) : null;
}

export async function approvePairing(id: string, sealedSession: string): Promise<boolean> {
  const record = await getPairing(id);
  if (!record || record.status !== "pending") return false;
  const remaining = Math.max(30, PAIR_TTL_SECONDS - Math.floor((Date.now() - record.createdAt) / 1000));
  await pairingStore().set(key(id), JSON.stringify({ ...record, status: "approved", session: sealedSession }), remaining);
  return true;
}

export async function deletePairing(id: string): Promise<void> {
  await pairingStore().delete(key(id));
}
