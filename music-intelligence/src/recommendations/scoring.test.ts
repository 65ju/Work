import { describe, expect, it } from "vitest";
import { artist, track } from "@/analytics/__tests__/fixture";
import { scoreCandidate, selectDiverse } from "./scoring";
import type { TasteProfile } from "./types";

const taste: TasteProfile = {
  genres: [
    { name: "trap", weight: 1 },
    { name: "r&b", weight: 0.6 },
  ],
  coreArtists: [{ id: "a1", name: "A1" }],
  adjacentArtists: [],
  era: { from: 2018, to: 2024, median: 2021 },
  medianDurationMs: 180_000,
  knownTrackIds: [],
  knownArtistIds: ["a1"],
};

describe("scoreCandidate", () => {
  it("rewards genre match and novelty and explains why", () => {
    const info = new Map([["a4", artist("a4")]]);
    const rec = scoreCandidate({ track: track("x", ["a4"], 2021), lane: "genre", laneDetail: "trap", seedGenre: "trap" }, taste, info);
    expect(rec.provenance).toBe("algorithm");
    expect(rec.matchedGenres).toContain("trap");
    expect(rec.components.novelty).toBe(1);
    expect(rec.reasons.length).toBeGreaterThan(1);
  });

  it("scores a core artist's track as less novel", () => {
    const info = new Map([["a1", artist("a1")]]);
    const rec = scoreCandidate({ track: track("y", ["a1"]), lane: "new-release", laneDetail: "latest" }, taste, info);
    expect(rec.components.novelty).toBeLessThan(0.5);
  });
});

describe("selectDiverse", () => {
  it("limits tracks per artist", () => {
    const info = new Map([["a4", artist("a4")]]);
    const recs = ["1", "2", "3"].map((id) => scoreCandidate({ track: track(id, ["a4"]), lane: "genre", laneDetail: "trap", seedGenre: "trap" }, taste, info));
    expect(selectDiverse(recs, 10)).toHaveLength(2);
  });
});
