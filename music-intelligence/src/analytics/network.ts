import type { ImageRef, MusicSnapshot, Track } from "@/domain/types";
import { TIME_RANGES } from "@/domain/types";
import { jaccard } from "./math";
import type { ArtistNetwork, ArtistStat, NetworkLink, NetworkLinkReason, NetworkNode } from "./types";

const MAX_NODES = 36;
const MAX_LINKS_PER_NODE = 6;

/** Relationships are inferred from the user's own data, never from a provider "related artists" feature. */
export function buildArtistNetwork(s: MusicSnapshot, artists: Record<string, ArtistStat>): ArtistNetwork {
  const top = Object.values(artists)
    .filter((a) => !a.artist.id.startsWith("name:"))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_NODES);
  const ids = new Set(top.map((a) => a.artist.id));
  const maxScore = top[0]?.score ?? 1;

  const nodes: NetworkNode[] = top.map((st) => ({
    id: st.artist.id,
    name: st.artist.name,
    image: smallest(st.artist.images),
    weight: st.score / maxScore,
    tier: st.tier,
    genres: st.artist.genres,
    topTrackCount: st.topTrackCount,
    recentPlays: st.recentPlays,
  }));

  type Acc = { genre: number; collab: number; playlist: number; session: number };
  const acc = new Map<string, Acc>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const bump = (a: string, b: string, field: keyof Acc, v = 1) => {
    if (a === b || !ids.has(a) || !ids.has(b)) return;
    const k = key(a, b);
    const cur = acc.get(k) ?? { genre: 0, collab: 0, playlist: 0, session: 0 };
    cur[field] += v;
    acc.set(k, cur);
  };

  for (let i = 0; i < top.length; i++)
    for (let j = i + 1; j < top.length; j++) {
      const sim = jaccard(new Set(top[i]!.artist.genres), new Set(top[j]!.artist.genres));
      if (sim >= 0.15) bump(top[i]!.artist.id, top[j]!.artist.id, "genre", sim);
    }

  const tracks = new Map<string, Track>();
  for (const r of TIME_RANGES) for (const t of s.topTracks[r]) tracks.set(t.id, t);
  for (const p of s.recent) tracks.set(p.track.id, p.track);
  for (const sv of s.saved) tracks.set(sv.track.id, sv.track);
  for (const pl of s.playlists) for (const e of pl.entries ?? []) tracks.set(e.track.id, e.track);
  for (const t of tracks.values()) {
    const a = t.artists.map((x) => x.id);
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) bump(a[i]!, a[j]!, "collab");
  }

  for (const pl of s.playlists) {
    const present = [...new Set((pl.entries ?? []).flatMap((e) => e.track.artists.map((x) => x.id)))].filter((id) => ids.has(id));
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) bump(present[i]!, present[j]!, "playlist");
  }

  const plays = [...s.recent].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  for (let i = 1; i < plays.length; i++) {
    const gap = new Date(plays[i]!.playedAt).getTime() - new Date(plays[i - 1]!.playedAt).getTime();
    if (gap > 45 * 60_000) continue;
    for (const a of plays[i - 1]!.track.artists) for (const b of plays[i]!.track.artists) bump(a.id, b.id, "session");
  }

  const maxPlaylist = Math.max(1, ...[...acc.values()].map((v) => v.playlist));
  const all: NetworkLink[] = [];
  for (const [k, v] of acc) {
    const [source, target] = k.split("|") as [string, string];
    const weight = v.genre * 1.2 + Math.min(v.collab, 3) * 0.6 + (v.playlist / maxPlaylist) * 0.8 + Math.min(v.session, 4) * 0.2;
    if (weight < 0.25) continue;
    const reasons: NetworkLinkReason[] = [];
    const detail: string[] = [];
    if (v.genre > 0) {
      reasons.push("genre");
      detail.push("shared genres");
    }
    if (v.collab > 0) {
      reasons.push("collaboration");
      detail.push(`${v.collab} shared track${v.collab > 1 ? "s" : ""}`);
    }
    if (v.playlist > 0) {
      reasons.push("playlist");
      detail.push(`together in ${v.playlist} playlist${v.playlist > 1 ? "s" : ""}`);
    }
    if (v.session > 0) {
      reasons.push("session");
      detail.push("played back to back");
    }
    all.push({ source, target, weight, reasons, detail: detail.join(" · ") });
  }

  // Keep each node's strongest relationships so the graph stays readable.
  all.sort((a, b) => b.weight - a.weight);
  const degree = new Map<string, number>();
  const links = all.filter((l) => {
    const da = degree.get(l.source) ?? 0;
    const db = degree.get(l.target) ?? 0;
    if (da >= MAX_LINKS_PER_NODE && db >= MAX_LINKS_PER_NODE) return false;
    degree.set(l.source, da + 1);
    degree.set(l.target, db + 1);
    return true;
  });

  return { nodes, links };
}

function smallest(list: ImageRef[]): ImageRef | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => (a.width ?? 999) - (b.width ?? 999)).find((i) => (i.width ?? 0) >= 120) ?? list[0]!;
}
