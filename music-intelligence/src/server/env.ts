import "server-only";
import { z } from "zod";

const schema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
  SPOTIFY_CLIENT_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),
  SPOTIFY_REDIRECT_URI: z
    .string()
    .url()
    .refine((v) => v.startsWith("https://") || /^http:\/\/(127\.0\.0\.1|\[::1\])/.test(v), {
      message: "Spotify requires an HTTPS redirect URI or a loopback address (http://127.0.0.1)",
    }),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ANTHROPIC_API_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  AI_MODEL: z.string().optional().transform((v) => v || "claude-opus-5"),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

/** Validated lazily so `next build` works without secrets; any request fails loudly if misconfigured. */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new ConfigurationError(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export class ConfigurationError extends Error {
  override name = "ConfigurationError";
}
