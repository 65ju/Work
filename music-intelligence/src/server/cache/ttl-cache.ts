import "server-only";

type Entry = { value: unknown; expires: number };

/**
 * Small in-process TTL cache with in-flight de-duplication. Good enough for a
 * single Node instance; swap for Redis/KV when deploying multiple instances.
 */
export class TtlCache {
  private store = new Map<string, Entry>();
  private inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly maxEntries = 500) {}

  async get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;
    const promise = load()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  set(key: string, value: unknown, ttlMs: number) {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }

  invalidate(prefix: string) {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }
}

const globalForCache = globalThis as unknown as { __smiCache?: TtlCache };
export const serverCache = (globalForCache.__smiCache ??= new TtlCache());
