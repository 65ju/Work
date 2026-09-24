"use client";

import type { MusicProfile } from "@/analytics/types";
import { TIME_RANGES } from "@/domain/types";
import { OpenInSpotify } from "@/components/brand/SpotifyIcon";
import { Artwork } from "@/components/ui/Artwork";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { TIER_LABEL } from "@/components/viz/ArtistNetworkGraph";
import { RANGE_LABEL, relativeTime, titleCase } from "@/lib/client/format";

export function ArtistDetail({ profile, artistId, onSelectArtist }: { profile: MusicProfile; artistId: string; onSelectArtist: (id: string) => void }) {
  const st = profile.artists[artistId];
  if (!st) return null;
  const a = st.artist;

  const tracks = Object.values(profile.tracks)
    .filter((t) => t.track.artists.some((x) => x.id === artistId))
    .sort((x, y) => bestRank(x.ranks) - bestRank(y.ranks) || y.recentPlays - x.recentPlays)
    .slice(0, 8);

  const connections = profile.network.links
    .filter((l) => l.source === artistId || l.target === artistId)
    .map((l) => ({ id: l.source === artistId ? l.target : l.source, detail: l.detail, weight: l.weight }))
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 6);

  return (
    <div>
      <div className="relative">
        <Artwork images={a.images} alt={a.name} size={560} kind="artist" rounded="rounded-none" className="!h-auto aspect-[5/4] !w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-1 via-ink-1/60 to-transparent px-6 pt-24 pb-5">
          <p className="font-mono text-[10px] tracking-[0.16em] text-[var(--accent)] uppercase">{TIER_LABEL[st.tier]}</p>
          <h2 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.03em]">{a.name}</h2>
        </div>
      </div>

      <div className="flex flex-col gap-8 px-6 pt-4 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProvenanceTag kind="derived" label="Tier derived from your rankings" />
          <OpenInSpotify href={a.url} />
        </div>

        <div className="grid grid-cols-3 border-y border-line">
          {TIME_RANGES.map((r) => (
            <div key={r} className="border-r border-line py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4">
              <p className="eyebrow">{RANGE_LABEL[r]}</p>
              <p className="numeric mt-2 text-3xl">{st.ranks[r] ? `#${st.ranks[r]}` : "—"}</p>
            </div>
          ))}
        </div>

        <dl className="grid grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <dt className="text-faint">In top tracks</dt>
            <dd className="mt-1 text-lg text-fg">{st.topTrackCount}</dd>
          </div>
          <div>
            <dt className="text-faint">Last 50 plays</dt>
            <dd className="mt-1 text-lg text-fg">{st.recentPlays}</dd>
          </div>
          <div>
            <dt className="text-faint">Your playlists</dt>
            <dd className="mt-1 text-lg text-fg">{st.playlistAppearances}</dd>
          </div>
        </dl>
        {st.lastPlayedAt && <p className="-mt-4 text-xs text-muted">Last played {relativeTime(st.lastPlayedAt)}</p>}

        {a.genres.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">Genres</p>
              <ProvenanceTag kind="spotify" label="Spotify tags" />
            </div>
            <div className="flex flex-wrap gap-2">
              {a.genres.map((g) => (
                <span key={g} className="rounded-full border border-line px-3 py-1 text-xs text-fg-2">
                  {titleCase(g)}
                </span>
              ))}
            </div>
          </div>
        )}

        {tracks.length > 0 && (
          <div>
            <p className="eyebrow mb-3">Your tracks by {a.name}</p>
            <ol className="divide-y divide-line border-y border-line">
              {tracks.map((t) => (
                <li key={t.track.id} className="flex items-center gap-3 py-2.5">
                  <Artwork images={t.track.album.images} alt={t.track.album.name} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm">{t.track.name}</span>
                  <span className="font-mono text-[10px] text-muted">
                    {bestRank(t.ranks) < 99 ? `#${bestRank(t.ranks)}` : t.recentPlays ? `${t.recentPlays}× recent` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {connections.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">Connected in your listening</p>
              <ProvenanceTag kind="derived" label="Inferred" />
            </div>
            <ul className="flex flex-col gap-1">
              {connections.map((c) => {
                const other = profile.artists[c.id];
                if (!other) return null;
                return (
                  <li key={c.id}>
                    <button onClick={() => onSelectArtist(c.id)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-white/5">
                      <Artwork images={other.artist.images} alt={other.artist.name} size={32} kind="artist" rounded="rounded-full" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{other.artist.name}</span>
                        <span className="block truncate text-xs text-muted">{c.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export const bestRank = (ranks: Partial<Record<string, number>>) => Math.min(99, ...Object.values(ranks).map((v) => v ?? 99));
