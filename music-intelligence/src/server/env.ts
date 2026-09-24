import "server-only";
import { z } from "zod";

const schema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
  SPOTIFY_CLIENT_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),
  SPOTIFY_REDIRECT_URI: z
    .string()
    .url({ message: "SPOTIFY_REDIRECT_URI is required (or deploy on Vercel, where it is derived automatically)" })
    .refine((v) => v.startsWith("https://") || /^http:\/\/(127\.0\.0\.1|\[::1\])/.test(v), {
      message: "Spotify requires an HTTPS redirect URI or a loopback address (http://127.0.0.1)",
    }),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ANTHROPIC_API_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  AI_MODEL: z.string().optional().transform((v) => v || "claude-opus-5"),
  /** Shared store for QR login pairing. Vercel's Upstash integration sets the KV_* names. */
  REDIS_REST_URL: z.string().url().optional(),
  REDIS_REST_TOKEN: z.string().optional(),
  /** Recorder triggers: Upstash QStash signing keys and/or a Vercel Cron secret. */
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

/** Validated lazily so `next build` works without secrets; any request fails loudly if misconfigured. */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(withDefaults(process.env));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new ConfigurationError(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * On Vercel the production URL is known, so the Spotify redirect URI does not
 * have to be configured by hand. It must still be registered in the Spotify dashboard.
 */
function withDefaults(e: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const productionHost = e.VERCEL_PROJECT_PRODUCTION_URL;
  return {
    ...e,
    SPOTIFY_REDIRECT_URI: e.SPOTIFY_REDIRECT_URI || (productionHost ? `https://${productionHost}/api/auth/callback` : undefined),
    REDIS_REST_URL: e.UPSTASH_REDIS_REST_URL || e.KV_REST_API_URL || undefined,
    REDIS_REST_TOKEN: e.UPSTASH_REDIS_REST_TOKEN || e.KV_REST_API_TOKEN || undefined,
  };
}

/** Public origin of the app, used for links that must work from another device (QR login). */
export function publicOrigin(): string {
  return new URL(env().SPOTIFY_REDIRECT_URI).origin;
}

export class ConfigurationError extends Error {
  override name = "ConfigurationError";
}
