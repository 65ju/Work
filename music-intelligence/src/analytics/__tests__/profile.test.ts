import { describe, expect, it } from "vitest";
import { buildMusicProfile } from "../profile";
import { normalizedEntropy } from "../math";
import { analyzeListening } from "../listening";
import { makeSnapshot } from "./fixture";

describe("buildMusicProfile", () => {
  const profile = buildMusicProfile(makeSnapshot(), "Europe/Berlin");

  it("keeps every metric in range and labelled as derived", () => {
    for (const m of profile.metrics) {
      expect(m.provenance).toBe("derived");
      if (m.value !== null) {
        expect(m.value).toBeGreaterThanOrEqual(0);
        expect(m.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("uses Spotify's own #1 for the summary", () => {
    expect(profile.summary.topArtist?.artist.id).toBe("a1");
    expect(profile.summary.topTrack?.track.id).toBe("t1");
  });

  it("derives the most repeated track from recent plays only", () => {
    expect(profile.summary.mostRepeated?.track.id).toBe("t1");
    const plays = profile.recent.filter((r) => r.track.id === "t1").length;
    expect(profile.summary.mostRepeated?.plays).toBe(plays);
  });

  it("marks discovery from artists new in the short range", () => {
    const discovery = profile.metrics.find((m) => m.id === "discovery");
    expect(discovery?.value).toBeGreaterThan(0);
  });

  it("does not analyse playlists whose contents are unavailable", () => {
    const followed = profile.playlists.find((p) => p.id === "p2");
    expect(followed?.analyzed).toBe(false);
    expect(followed?.artistDiversity).toBeNull();
    const own = profile.playlists.find((p) => p.id === "p1");
    expect(own?.analyzed).toBe(true);
    expect(own?.repetition).toBeGreaterThan(0);
  });

  it("builds a genre graph only from provider tags", () => {
    const names = profile.genres.nodes.map((n) => n.name);
    expect(names).toContain("trap");
    expect(profile.genres.coverage.artistsWithGenres).toBeLessThanOrEqual(profile.genres.coverage.artistsTotal);
    const link = profile.genres.links.find((l) => [l.source, l.target].sort().join() === ["rap", "trap"].join());
    expect(link?.reason).toBe("shared-artists");
  });

  it("assigns a personality with explainable scores", () => {
    expect(profile.personality).not.toBeNull();
    expect(profile.personality!.scores[0]!.id).toBe(profile.personality!.id);
  });

  it("returns null metrics instead of guessing when data is missing", () => {
    const empty = buildMusicProfile(
      makeSnapshot({ recent: [], topTracks: { short: [], medium: [], long: [] }, topArtists: { short: [], medium: [], long: [] }, playlists: [] }),
      "UTC",
    );
    expect(empty.metrics.every((m) => m.value === null)).toBe(true);
    expect(empty.personality).toBeNull();
    expect(empty.summary.topArtist).toBeNull();
  });
});

describe("listening patterns", () => {
  it("buckets plays into the viewer's timezone", () => {
    const snap = makeSnapshot();
    const utc = analyzeListening(snap.recent, "UTC");
    const tokyo = analyzeListening(snap.recent, "Asia/Tokyo");
    expect(utc.hourly.reduce((a, b) => a + b)).toBe(snap.recent.length);
    expect(utc.peakHour).not.toBe(tokyo.peakHour);
  });

  it("splits sessions on long gaps", () => {
    const l = analyzeListening(makeSnapshot().recent, "UTC");
    expect(l.sessions.length).toBe(2);
  });
});

describe("math", () => {
  it("normalized entropy is 0 for one category and 1 for uniform", () => {
    expect(normalizedEntropy([5])).toBe(0);
    expect(normalizedEntropy([1, 1, 1, 1])).toBeCloseTo(1);
  });
});
