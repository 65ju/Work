# Music Intelligence

A personal music analytics companion for Spotify: Music DNA, artist and genre maps, listening timeline, playlist intelligence, app-generated discovery and an AI assistant that can be switched on later.

Built with Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, Motion, Recharts and d3-force.

## Setup

1. Create an app at <https://developer.spotify.com/dashboard> and add the redirect URI
   `http://127.0.0.1:3000/api/auth/callback`. Spotify only accepts HTTPS or loopback addresses, so use `127.0.0.1`, not `localhost`.
2. In Development Mode, add every Spotify account that should sign in under **User Management** (maximum 5, and the app owner needs Premium).
3. `cp .env.example .env.local` and fill in `SPOTIFY_CLIENT_ID`, `SPOTIFY_REDIRECT_URI` and a random `SESSION_SECRET` (`openssl rand -base64 48`). `SPOTIFY_CLIENT_SECRET` is optional, because the flow uses PKCE.
4. `npm install`, then `npm run dev` and open <http://127.0.0.1:3000>.

Optional: set `ANTHROPIC_API_KEY` (and `AI_MODEL`, default `claude-opus-5`) to enable the assistant. Without it the assistant UI shows as "coming soon".

Checks: `npm run typecheck`, `npm test`, `npm run build`.

## Deploy on Vercel (with QR login)

1. Import the GitHub repo in Vercel and set **Root Directory** to `music-intelligence`.
2. Environment variables: `SPOTIFY_CLIENT_ID` and `SESSION_SECRET`. `SPOTIFY_REDIRECT_URI` is optional on Vercel, because it defaults to `https://<production domain>/api/auth/callback`.
3. In the Spotify dashboard, register exactly that redirect URI.
4. For **Log in with your phone** (QR login), add an Upstash Redis store under the project's **Storage** tab. Its `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` variables are picked up automatically. Without it the QR button is hidden, because serverless instances do not share memory.

QR login works like this: the computer shows a QR code and a short code. The phone opens `/pair/<id>`, the user checks that the codes match and approves with Spotify, and the computer picks up the session. The phone never receives the session, and only the browser that created the code can collect it. Codes expire after 5 minutes.

## Listening history (recorder)

Spotify only exposes the 50 most recent plays, so the app keeps its own history:

- **Database**: add a Neon Postgres store under the Vercel project's **Storage** tab (`DATABASE_URL` is set automatically). Tables are created on first use.
- **Recorder**: `/api/recorder/run` stores new plays for every connected account and, once per day, a copy of the top lists. Add Upstash QStash to the Vercel project (Storage tab): with `QSTASH_TOKEN` set, the app creates its own hourly schedule; `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` verify the calls. `vercel.json` adds a daily Vercel Cron fallback, which requires `CRON_SECRET`.
- Every profile load also stores the plays and top lists it already fetched, at no extra API cost.
- Refresh tokens are stored encrypted (A256GCM, key derived from `SESSION_SECRET`). Users can pause recording or delete their history from the sidebar.

## Views built on the history

- **Numbers**: minutes (estimated from track lengths), plays, active days, listening calendar, streaks, records, weekday × hour grid, top artists and tracks by actual plays, month by month, new artists.
- **Phases**: weekly taste vectors (genres 60 %, artists 40 %) are split where cosine similarity drops; each phase lists its defining artists (by lift) and soundtrack. Needs about 4 recorded weeks; until then a rough "then → now" view from Spotify's three top-list windows.
- **Wrapped**: a full-screen story for 4 weeks, 6 months or 1 year+, combining Spotify rankings with recorded minutes and streaks.
- **Overview** opens with a scroll-driven 3D cover galaxy (React Three Fiber): each spiral arm is a top genre, artist portraits and album covers float along the arms, the most important closest to the core.
- **Cursor**: on mouse devices a custom "vinyl pulse" cursor (canvas) replaces the system pointer — spinning equalizer ring reacting to speed, light trail, magnetic hover labels, lens over artwork, shockwave on click. Touch devices and reduced motion keep native/simple behaviour.

## Spotify API constraints (Development Mode, after the Feb/Mar 2026 changes)

The app is built only on endpoints that are still available to new Development Mode apps:

| Used | Endpoint |
|---|---|
| Profile | `GET /me` (no email/country/product, which were removed) |
| Top artists / tracks | `GET /me/top/{artists,tracks}` for `short_term`, `medium_term`, `long_term` |
| Recent plays | `GET /me/player/recently-played` (the 50 most recent plays only) |
| Playback | `GET /me/player` |
| Playlists | `GET /me/playlists`, `GET /playlists/{id}/items` (contents only for playlists the user owns or collaborates on) |
| Library | `GET /me/tracks`, `GET /me/following?type=artist` |
| Catalog | `GET /artists/{id}` (single, since batch lookups were removed), `GET /artists/{id}/albums`, `GET /albums/{id}`, `GET /search` (max 10 results) |

Not used because they are removed or restricted: audio features and analysis, recommendations, related artists, artist top tracks, batch `GET /artists|tracks|albums`, browse and categories, `popularity` and `followers`. Metrics that depended on them (energy, mainstream-ness) are deliberately absent, not estimated.

## Architecture

```
Spotify ─▶ SpotifyService (server/spotify)      Data collector: typed HTTP, 429/5xx retries, per-source degradation
             │  implements MusicDataProvider (domain/provider.ts)
             ▼
        MusicSnapshot (domain/types.ts)          Raw normalized data, no derived values
             ▼
        buildMusicProfile (analytics/)           Music Profile Engine: metrics, personality, genre graph,
             │                                   artist network, listening patterns, playlist insights
             ▼
        MusicProfile ──▶ UI (features/, components/)
             ├──▶ RecommendationService (recommendations/)   taste → candidates (search) → filter → score → select
             └──▶ AIService (ai/)                            profile-grounded chat → track suggestions → validated
                                                             against Spotify search → invented tracks discarded
```

- `src/server/auth`: OAuth 2.0 Authorization Code + PKCE, tokens in an encrypted (A256GCM JWE) httpOnly cookie, de-duplicated refresh with rotation support. Secrets never reach the browser.
- `src/server/spotify`: `SpotifyHttpClient`, mappers and `SpotifyService`, plus an in-process TTL cache (swap for Redis when running more than one instance).
- `src/domain`: provider-agnostic types. A second provider only needs to implement `MusicDataProvider`.
- `src/analytics`: pure, unit-tested functions. Every metric carries its basis, method and confidence.
- `src/recommendations`: transparent linear scoring (genre match, novelty, era match, source). Each component becomes a human-readable reason.
- `src/ai`: `profileForAI` (the only view of the data the model sees), the system prompt, and the streaming `AIService` with catalog validation.
- API routes: `/api/music/profile`, `/api/music/now-playing`, `/api/music/discovery`, `/api/ai/status`, `/api/ai/chat` (SSE).

## Provenance

The UI labels every insight with one of four sources, and they are never mixed:

- **Spotify data**: returned directly by the API (rankings, recent plays, genre tags, artwork).
- **Calculated by this app**: derived metrics (diversity, discovery rate, repeat rate and the others), the listening style, playlist intelligence and inferred relationships.
- **App recommendation**: Discovery results from this app's scoring, not Spotify's.
- **AI generated**: assistant replies. Every track the assistant suggests is verified against Spotify search first.
