import "server-only";
import { buildMusicProfile } from "@/analytics/profile";
import type { MusicProfile } from "@/analytics/types";
import type { SpotifyService } from "@/server/spotify/service";

export function sanitizeTimezone(tz: string | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export async function loadProfile(service: SpotifyService, tz: string): Promise<MusicProfile> {
  const snapshot = await service.getSnapshot();
  return buildMusicProfile(snapshot, tz);
}
