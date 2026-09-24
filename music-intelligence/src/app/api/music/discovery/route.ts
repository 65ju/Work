import { NextResponse, type NextRequest } from "next/server";
import { RecommendationService } from "@/recommendations/service";
import type { DiscoveryResult } from "@/recommendations/types";
import { handleApiError, spotifyForRequest } from "@/server/auth/spotify-session";
import { serverCache } from "@/server/cache/ttl-cache";
import { loadProfile, sanitizeTimezone } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const service = await spotifyForRequest();
    const tz = sanitizeTimezone(req.nextUrl.searchParams.get("tz"));
    const profile = await loadProfile(service, tz);
    const result = await serverCache.get<DiscoveryResult>(`u:${profile.user.id}:discovery`, 15 * 60_000, () =>
      new RecommendationService(service).discover(profile),
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return handleApiError(err);
  }
}
