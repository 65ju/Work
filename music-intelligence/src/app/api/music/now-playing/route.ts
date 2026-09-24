import { NextResponse } from "next/server";
import { handleApiError, spotifyForRequest } from "@/server/auth/spotify-session";
import { SpotifyApiError } from "@/server/spotify/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const service = await spotifyForRequest();
    const playback = await service.getPlayback();
    return NextResponse.json({ playback }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    // Playback is optional; a missing permission should not surface as an app error.
    if (err instanceof SpotifyApiError && (err.kind === "forbidden" || err.kind === "not_found")) {
      return NextResponse.json({ playback: null, unavailable: true });
    }
    return handleApiError(err);
  }
}
