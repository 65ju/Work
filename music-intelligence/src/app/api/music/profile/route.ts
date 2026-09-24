import { after, NextResponse, type NextRequest } from "next/server";
import { ingestSnapshot } from "@/server/history/service";
import { handleApiError, spotifyForRequest } from "@/server/auth/spotify-session";
import { loadProfile, sanitizeTimezone } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const service = await spotifyForRequest();
    if (req.nextUrl.searchParams.get("refresh") === "1") service.invalidate();
    const profile = await loadProfile(service, sanitizeTimezone(req.nextUrl.searchParams.get("tz")));
    // Store the plays and top lists this request already fetched (after the response is sent).
    after(async () => {
      await ingestSnapshot(await service.getSnapshot()).catch((err) => console.error("History ingest failed", err));
    });
    return NextResponse.json(profile, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return handleApiError(err);
  }
}
