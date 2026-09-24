import "server-only";
import { SpotifyApiError } from "./errors";

const API = "https://api.spotify.com/v1";
const MAX_RATE_LIMIT_WAIT_S = 4;

/** Thin typed HTTP client. Knows nothing about sessions — it receives a valid token. */
export class SpotifyHttpClient {
  constructor(private readonly accessToken: string) {}

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T | null> {
    const url = new URL(path.startsWith("http") ? path : `${API}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
    }
    return this.request<T>(url, 0);
  }

  private async request<T>(url: URL, attempt: number): Promise<T | null> {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
    } catch (err) {
      if (attempt < 1) return this.request<T>(url, attempt + 1);
      throw new SpotifyApiError("network", 0, `Network error calling Spotify: ${(err as Error).message}`);
    }

    if (res.status === 204) return null;
    if (res.ok) return (await res.json()) as T;

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "1") || 1;
      if (attempt < 2 && retryAfter <= MAX_RATE_LIMIT_WAIT_S) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        return this.request<T>(url, attempt + 1);
      }
      throw new SpotifyApiError("rate_limited", 429, "Spotify rate limit reached", retryAfter);
    }
    if (res.status >= 500 && attempt < 1) {
      await new Promise((r) => setTimeout(r, 400));
      return this.request<T>(url, attempt + 1);
    }

    const body = await res.text().catch(() => "");
    const kind =
      res.status === 401 ? "unauthorized" : res.status === 403 ? "forbidden" : res.status === 404 ? "not_found" : "upstream";
    throw new SpotifyApiError(kind, res.status, `Spotify ${res.status} on ${url.pathname}: ${body.slice(0, 160)}`);
  }
}
