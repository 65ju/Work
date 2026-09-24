import "server-only";
import { env } from "@/server/env";

/** Minimal key/value store with expiry, used for short-lived QR login pairings. */
export interface PairingStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Works for a single long-running server (`next start`, a VPS, Docker). */
class MemoryStore implements PairingStore {
  private map = new Map<string, { value: string; expires: number }>();

  async get(key: string) {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return hit.value;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    for (const [k, v] of this.map) if (v.expires < Date.now()) this.map.delete(k);
    this.map.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string) {
    this.map.delete(key);
  }
}

/** Upstash Redis over its REST API — required on serverless hosts such as Vercel. */
class RedisRestStore implements PairingStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis REST ${res.status}`);
    return ((await res.json()) as { result: unknown }).result;
  }

  async get(key: string) {
    const r = await this.command(["GET", key]);
    return typeof r === "string" ? r : null;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.command(["SET", key, value, "EX", ttlSeconds]);
  }

  async delete(key: string) {
    await this.command(["DEL", key]);
  }
}

const globalStore = globalThis as unknown as { __smiPairing?: PairingStore };

export function pairingStore(): PairingStore {
  if (globalStore.__smiPairing) return globalStore.__smiPairing;
  const { REDIS_REST_URL, REDIS_REST_TOKEN } = env();
  globalStore.__smiPairing = REDIS_REST_URL && REDIS_REST_TOKEN ? new RedisRestStore(REDIS_REST_URL, REDIS_REST_TOKEN) : new MemoryStore();
  return globalStore.__smiPairing;
}

export function hasSharedStore(): boolean {
  const { REDIS_REST_URL, REDIS_REST_TOKEN } = env();
  return Boolean(REDIS_REST_URL && REDIS_REST_TOKEN);
}
