import type { Artist, Track } from "@/domain/types";
import type { CandidateLane, Recommendation, ScoreComponents, TasteProfile } from "./types";

export type Candidate = { track: Track; lane: CandidateLane; laneDetail: string; seedGenre?: string };

const WEIGHTS: ScoreComponents = { genreMatch: 0.45, novelty: 0.3, eraMatch: 0.15, laneConfidence: 0.1 };
const LANE_CONFIDENCE: Record<CandidateLane, number> = { "adjacent-artist": 0.9, genre: 0.7, "new-release": 0.8 };

/**
 * Transparent linear scoring. Each component is 0–1 and turns into a
 * human-readable reason, so every recommendation can be explained.
 */
export function scoreCandidate(c: Candidate, taste: TasteProfile, artistInfo: Map<string, Artist>): Recommendation {
  const tasteWeight = new Map(taste.genres.map((g) => [g.name, g.weight]));
  const genres = [...new Set(c.track.artists.flatMap((a) => artistInfo.get(a.id)?.genres ?? []))];
  const matched = genres.filter((g) => tasteWeight.has(g)).sort((a, b) => (tasteWeight.get(b) ?? 0) - (tasteWeight.get(a) ?? 0));

  let genreMatch = Math.min(1, matched.reduce((acc, g) => acc + (tasteWeight.get(g) ?? 0), 0));
  if (genres.length === 0 && c.seedGenre) genreMatch = 0.5 * (tasteWeight.get(c.seedGenre) ?? 0.5);
  if (c.seedGenre && !matched.includes(c.seedGenre) && genres.length === 0) matched.push(c.seedGenre);

  const known = new Set(taste.knownArtistIds);
  const core = new Set(taste.coreArtists.map((a) => a.id));
  const artistKnown = c.track.artists.some((a) => known.has(a.id));
  const artistCore = c.track.artists.some((a) => core.has(a.id));
  const novelty = artistCore ? 0.35 : artistKnown ? 0.6 : 1;

  const year = c.track.album.releaseYear;
  let eraMatch = 0.5;
  if (taste.era && year) {
    const { from, to } = taste.era;
    const dist = year < from ? from - year : year > to ? year - to : 0;
    eraMatch = Math.max(0, 1 - dist / 8);
  }

  const components: ScoreComponents = { genreMatch, novelty, eraMatch, laneConfidence: LANE_CONFIDENCE[c.lane] };
  const score =
    components.genreMatch * WEIGHTS.genreMatch +
    components.novelty * WEIGHTS.novelty +
    components.eraMatch * WEIGHTS.eraMatch +
    components.laneConfidence * WEIGHTS.laneConfidence;

  const reasons: string[] = [];
  if (matched.length > 0) {
    const tagged = genres.length > 0 ? "Tagged" : "Found by searching";
    reasons.push(`${tagged} ${formatList(matched.slice(0, 3))} — ${matched.length > 1 ? "genres" : "a genre"} you listen to a lot`);
  }
  if (c.lane === "adjacent-artist") reasons.push(c.laneDetail);
  if (c.lane === "new-release") reasons.push(c.laneDetail);
  if (novelty === 1) reasons.push("An artist that is new to your listening data");
  else if (!artistCore && artistKnown) reasons.push("An artist on the edge of your rotation, not yet a favourite");
  if (taste.era && year && eraMatch >= 0.99) reasons.push(`Released ${year}, inside the ${taste.era.from}–${taste.era.to} window most of your favourites come from`);

  return {
    track: c.track,
    score: Math.round(score * 100),
    components,
    lane: c.lane,
    matchedGenres: matched,
    reasons,
    provenance: "algorithm",
  };
}

/** Picks the best candidates while limiting how often one artist can appear. */
export function selectDiverse(recs: Recommendation[], limit: number, perArtist = 2): Recommendation[] {
  const count = new Map<string, number>();
  const out: Recommendation[] = [];
  for (const r of [...recs].sort((a, b) => b.score - a.score)) {
    const id = r.track.artists[0]?.id ?? r.track.id;
    if ((count.get(id) ?? 0) >= perArtist) continue;
    count.set(id, (count.get(id) ?? 0) + 1);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

function formatList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
