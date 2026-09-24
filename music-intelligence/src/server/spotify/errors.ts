export type ApiErrorKind = "unauthorized" | "forbidden" | "not_found" | "rate_limited" | "upstream" | "network";

export class SpotifyApiError extends Error {
  override name = "SpotifyApiError";
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export class SessionExpiredError extends Error {
  override name = "SessionExpiredError";
}
