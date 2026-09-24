import { metricValue } from "./metrics";
import type { Confidence, ListeningPatterns, Metric, Personality, PersonalityId } from "./types";

const NAMES: Record<PersonalityId, string> = {
  explorer: "The Explorer",
  repeater: "The Repeater",
  deepDiver: "The Deep Diver",
  genreHopper: "The Genre Hopper",
  specialist: "The Specialist",
  nightListener: "The Night Listener",
  loyalist: "The Loyalist",
};

type Candidate = { id: PersonalityId; score: number; reasons: string[] };

/**
 * Deterministic archetype scoring from the derived metrics. Every archetype has an
 * explicit formula; the winner is simply the highest score.
 */
export function derivePersonality(metrics: Metric[], listening: ListeningPatterns): Personality | null {
  const v = (id: Parameters<typeof metricValue>[1]) => metricValue(metrics, id);
  const discovery = v("discovery");
  const artistDiv = v("artistDiversity");
  const genreDiv = v("genreDiversity");
  const repetition = v("repetition");
  const focus = v("focus");
  const loyalty = v("loyalty");

  const known = [discovery, artistDiv, repetition, focus, loyalty].filter((x) => x !== null).length;
  if (known < 2) return null;
  const n = (x: number | null) => x ?? 50;

  const nightShare = listening.sampleSize ? listening.periods.night / listening.sampleSize : 0;

  const candidates: Candidate[] = [
    {
      id: "explorer",
      score: 0.55 * n(discovery) + 0.3 * n(artistDiv) + 0.15 * n(genreDiv),
      reasons: [`Discovery rate ${fmt(discovery)}`, `Artist diversity ${fmt(artistDiv)}`],
    },
    {
      id: "repeater",
      score: repetition === null ? 0 : 0.75 * repetition + 0.25 * n(focus),
      reasons: [`Repeat rate ${fmt(repetition)}`, `Artist concentration ${fmt(focus)}`],
    },
    {
      id: "deepDiver",
      score: 0.5 * n(focus) + 0.5 * n(loyalty) - 0.1 * n(discovery) + 5,
      reasons: [`Artist concentration ${fmt(focus)}`, `Temporal consistency ${fmt(loyalty)}`],
    },
    {
      id: "genreHopper",
      score: genreDiv === null ? 0 : 0.7 * genreDiv + 0.3 * n(artistDiv),
      reasons: [`Genre diversity ${fmt(genreDiv)}`, `Artist diversity ${fmt(artistDiv)}`],
    },
    {
      id: "specialist",
      score: genreDiv === null ? 0 : 0.45 * n(focus) + 0.55 * (100 - genreDiv),
      reasons: [`Genre diversity ${fmt(genreDiv)}`, `Artist concentration ${fmt(focus)}`],
    },
    {
      id: "nightListener",
      score: listening.sampleSize >= 20 ? Math.min(100, nightShare * 160) : 0,
      reasons: [`${Math.round(nightShare * 100)}% of your recent plays happened between 22:00 and 05:00`],
    },
    {
      id: "loyalist",
      score: 0.7 * n(loyalty) + 0.3 * (100 - n(discovery)),
      reasons: [`Temporal consistency ${fmt(loyalty)}`, `Discovery rate ${fmt(discovery)}`],
    },
  ];

  candidates.sort((a, b) => b.score - a.score);
  const [first, second] = candidates as [Candidate, Candidate];
  const margin = first.score - second.score;
  const confidence: Confidence = known >= 5 && margin > 8 ? "high" : known >= 3 && margin > 3 ? "medium" : "low";

  return {
    id: first.id,
    name: NAMES[first.id],
    description: describe(first.id, { discovery, repetition, loyalty, focus, genreDiv, nightShare }),
    reasons: first.reasons,
    scores: candidates.map((c) => ({ id: c.id, name: NAMES[c.id], score: Math.round(Math.max(0, c.score)) })),
    secondary: second.score > 40 ? { id: second.id, name: NAMES[second.id] } : null,
    confidence,
    provenance: "derived",
  };
}

const fmt = (x: number | null) => (x === null ? "n/a" : `${x}/100`);

function describe(
  id: PersonalityId,
  m: { discovery: number | null; repetition: number | null; loyalty: number | null; focus: number | null; genreDiv: number | null; nightShare: number },
): string {
  const coreClause =
    (m.loyalty ?? 0) >= 45
      ? "while still returning to a small core of familiar music"
      : "and your favourites keep changing";
  switch (id) {
    case "explorer":
      return `You regularly discover new artists ${coreClause}.`;
    case "repeater":
      return "When a track lands, you play it again and again — your recent history is full of deliberate replays.";
    case "deepDiver":
      return "You go deep rather than wide: a focused set of artists carries most of your listening, and they stay with you over time.";
    case "genreHopper":
      return "Your taste refuses to sit still — your favourite artists spread across an unusually wide set of genres.";
    case "specialist":
      return "You know exactly what you like. Your favourites cluster tightly around a few closely related genres.";
    case "nightListener":
      return `A large share of your listening — ${Math.round(m.nightShare * 100)}% of recent plays — happens late at night.`;
    case "loyalist":
      return "The artists you love now are the artists you have loved for a long time. New names rarely break into your rotation.";
  }
}
