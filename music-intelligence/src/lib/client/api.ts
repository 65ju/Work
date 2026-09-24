export type ApiErrorCode = "session_expired" | "rate_limited" | "forbidden" | "upstream" | "config" | "unknown" | "network";

export class ClientApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export const timezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { signal, headers: { Accept: "application/json" }, cache: "no-store" });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ClientApiError("network", "You appear to be offline.");
  }
  if (res.ok) return (await res.json()) as T;
  const body = (await res.json().catch(() => null)) as { error?: { code?: ApiErrorCode; message?: string; retryAfter?: number } } | null;
  throw new ClientApiError(body?.error?.code ?? "unknown", body?.error?.message ?? `Request failed (${res.status})`, body?.error?.retryAfter);
}
