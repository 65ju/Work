"use client";

import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { ClientApiError } from "@/lib/client/api";

const COPY: Record<string, { title: string; body: string }> = {
  session_expired: { title: "Your session ended", body: "Spotify signed you out or the session expired. Reconnect to continue." },
  rate_limited: { title: "Spotify needs a moment", body: "Too many requests were made in a short time. Try again in a few seconds." },
  forbidden: {
    title: "Spotify denied access",
    body: "While this app is in Spotify Development Mode, only accounts added in the Spotify developer dashboard can sign in.",
  },
  config: { title: "The app is not configured", body: "The server is missing its Spotify settings. Check the environment variables." },
  network: { title: "You are offline", body: "Check your connection and try again." },
  upstream: { title: "Spotify is not responding", body: "Spotify returned an unexpected response. Try again shortly." },
  unknown: { title: "Something went wrong", body: "An unexpected error occurred. Try again." },
};

export function ErrorState({ error, onRetry, compact = false }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const code = error instanceof ClientApiError ? error.code : "unknown";
  const copy = COPY[code] ?? COPY.unknown!;
  return (
    <div className={`flex flex-col items-start gap-4 ${compact ? "py-6" : "py-24"}`} role="alert">
      <p className="eyebrow text-danger">Error · {code.replace("_", " ")}</p>
      <h2 className={`${compact ? "text-xl" : "text-3xl"} font-semibold tracking-tight`}>{copy.title}</h2>
      <p className="max-w-md text-fg-2">{copy.body}</p>
      <div className="mt-2 flex gap-3">
        {code === "session_expired" || code === "forbidden" ? (
          <a href="/api/auth/login" className="rounded-full bg-fg px-5 py-2.5 text-sm font-medium text-ink transition hover:opacity-90">
            Reconnect Spotify
          </a>
        ) : (
          onRetry && (
            <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 text-sm transition hover:bg-white/5">
              <RefreshCw className="size-4" /> Try again
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border-t border-line py-16">
      {icon && <div className="text-muted">{icon}</div>}
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <div className="max-w-lg text-[15px] leading-relaxed text-fg-2">{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-[3px] ${className}`} aria-hidden="true" />;
}
