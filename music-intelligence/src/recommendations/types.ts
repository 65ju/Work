import type { Track } from "@/domain/types";

export type TasteProfile = {
  genres: { name: string; weight: number }[];
  coreArtists: { id: string; name: string }[];
  adjacentArtists: { id: string; name: string; reason: string }[];
  era: { from: number; to: number; median: number } | null;
  medianDurationMs: number | null;
  knownTrackIds: string[];
  knownArtistIds: string[];
};

export type CandidateLane = "genre" | "adjacent-artist" | "new-release";

export type ScoreComponents = {
  genreMatch: number;
  novelty: number;
  eraMatch: number;
  laneConfidence: number;
};

export type Recommendation = {
  track: Track;
  score: number;
  components: ScoreComponents;
  lane: CandidateLane;
  matchedGenres: string[];
  reasons: string[];
  provenance: "algorithm";
};

export type DiscoveryResult = {
  generatedAt: string;
  taste: TasteProfile;
  recommendations: Recommendation[];
  stats: { candidates: number; filteredKnown: number; queries: number };
};
