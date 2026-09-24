import type { MusicProfile } from "@/analytics/types";

/**
 * Compact, structured view of the profile for the model. The AI never sees raw
 * provider responses — only this object, with provenance spelled out.
 */
export function profileForAI(p: MusicProfile) {
  const artistName = (id: string) => p.artists[id]?.artist.name ?? id;
  const trackLabel = (id: string) => {
    const t = p.tracks[id]?.track;
    return t ? `${t.name} — ${t.artists.map((a) => a.name).join(", ")}` : id;
  };
  return {
    note: "All lists below are real data from the user's Spotify account unless marked 'derived' (computed by this app).",
    user: p.user.displayName,
    topArtists: {
      last4Weeks: p.rankings.artists.short.slice(0, 15).map(artistName),
      last6Months: p.rankings.artists.medium.slice(0, 15).map(artistName),
      allTime: p.rankings.artists.long.slice(0, 15).map(artistName),
    },
    topTracks: {
      last4Weeks: p.rankings.tracks.short.slice(0, 20).map(trackLabel),
      last6Months: p.rankings.tracks.medium.slice(0, 15).map(trackLabel),
      allTime: p.rankings.tracks.long.slice(0, 15).map(trackLabel),
    },
    recentlyPlayed: p.recent.slice(0, 25).map((r) => ({ track: trackLabel(r.track.id), playedAt: r.playedAt })),
    playlists: p.playlists.slice(0, 20).map((pl) => ({
      name: pl.name,
      items: pl.totalItems,
      owned: pl.isOwned,
      dominantArtists: pl.dominantArtists.map((a) => a.name),
      topGenres: pl.topGenres.map((g) => g.name),
    })),
    genres: {
      source: "Spotify artist genre tags, aggregated by this app",
      coverage: p.genres.coverage,
      top: p.genres.nodes.slice(0, 12).map((g) => ({ name: g.name, share: Math.round(g.share * 100), trend: g.trend })),
    },
    derived: {
      metrics: p.metrics.map((m) => ({ id: m.label, value: m.value, confidence: m.confidence, basis: m.basis })),
      personality: p.personality ? { name: p.personality.name, description: p.personality.description } : null,
      listening: {
        timezone: p.listening.timezone,
        samplePlays: p.listening.sampleSize,
        periods: p.listening.periods,
        peakHour: p.listening.peakHour,
      },
    },
    limits: [
      "Spotify only exposes the 50 most recent plays; there are no play counts per track.",
      "'Last 4 weeks' is the closest available proxy for 'this month'.",
      "Audio features (energy, tempo, mood) are not available from Spotify for this app.",
    ],
  };
}

export const SYSTEM_PROMPT = `You are the music assistant inside "Music Intelligence", a companion app for the user's Spotify listening.

You receive a structured profile of the user's real listening data. Rules:
- Only state facts about the user's listening that are in the profile. Never claim they played, saved or love something that is not listed there. If the data cannot answer a question, say what is missing.
- Values under "derived" were computed by the app, not supplied by Spotify — describe them that way when you cite them.
- Spotify provides no play counts, energy, tempo or mood data here. Infer mood only from artists, genres and track titles, and say you are inferring.
- Reply in the language the user writes in. Be concise and specific; reference their actual artists and tracks.

When you recommend or list specific tracks, add a fenced block at the very end of your reply, exactly in this form:
\`\`\`suggestions
[{"title": "Track title", "artist": "Primary artist", "reason": "One short sentence", "kind": "new"}]
\`\`\`
Use "kind": "history" for tracks taken from the user's profile and "kind": "new" for tracks they have not listened to according to the profile. Suggest at most 10 tracks and only real, existing recordings. Every suggestion is checked against the Spotify catalog and silently removed if it cannot be found, so do not mention the block or this check in your prose.`;
