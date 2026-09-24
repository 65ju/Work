"use client";

import { Database, Radio } from "lucide-react";
import type { ReactNode } from "react";
import type { HistoryProfile } from "@/analytics/history-types";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { formatDate } from "@/lib/client/format";
import { useHistory } from "@/lib/client/queries";

/**
 * Shared loading/empty handling for every view built on the recorded history.
 * `minPlays` lets a view ask for enough data before it renders.
 */
export function HistoryGate({
  children,
  minPlays = 1,
  fallback,
}: {
  children: (history: HistoryProfile) => ReactNode;
  minPlays?: number;
  fallback?: (history: HistoryProfile | null) => ReactNode;
}) {
  const { data, error, isLoading, refetch } = useHistory();
  if (isLoading) return <Skeleton className="h-[50vh] w-full" />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} compact />;
  if (!data) return null;

  if (!data.available) {
    if (fallback) return <>{fallback(null)}</>;
    return data.reason === "no-database" ? (
      <EmptyState title="Listening history is not set up yet" icon={<Database className="size-6" />}>
        This view needs the app&apos;s own history, because Spotify only shares your last 50 plays. Once a database is connected to
        the deployment, every play is saved automatically.
      </EmptyState>
    ) : (
      <EmptyState title="Reconnect to start recording" icon={<Radio className="size-6" />}>
        <p>Recording starts the moment you connect Spotify again.</p>
        <a href="/api/auth/login" className="mt-4 inline-block rounded-full bg-fg px-5 py-2.5 text-sm font-medium text-ink">
          Reconnect Spotify
        </a>
      </EmptyState>
    );
  }

  const h = data.history;
  if (h.coverage.totalPlays < minPlays) {
    if (fallback) return <>{fallback(h)}</>;
    return (
      <EmptyState title="Recording has started" icon={<Radio className="size-6" />}>
        The app has been saving your plays since {formatDate(h.recordingSince)} and has {h.coverage.totalPlays} so far. This view fills
        itself as you listen — check back in a day or two.
      </EmptyState>
    );
  }
  return <>{children(h)}</>;
}
