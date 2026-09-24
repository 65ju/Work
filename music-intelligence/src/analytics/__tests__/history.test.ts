import { describe, expect, it } from "vitest";
import { buildHistoryProfile } from "../history";
import type { HistoryArtistMeta, HistoryRow } from "../history-types";

const artists: HistoryArtistMeta[] = [
  { id: "trap1", name: "Trap One", genres: ["trap", "rap"], imageUrl: null, url: null },
  { id: "trap2", name: "Trap Two", genres: ["trap"], imageUrl: null, url: null },
  { id: "indie1", name: "Indie One", genres: ["indie pop", "bedroom pop"], imageUrl: null, url: null },
  { id: "indie2", name: "Indie Two", genres: ["indie pop"], imageUrl: null, url: null },
];

function row(at: Date, artist: string, track: string): HistoryRow {
  return { playedAt: at.toISOString(), trackId: track, name: track, artistIds: [artist], artistNames: [artist], albumName: null, imageUrl: null, durationMs: 200_000, url: null };
}

// 8 weeks: 4 weeks of trap, then 4 weeks of indie; ~3 plays per day at 20:00 UTC.
const start = new Date("2026-07-06T20:00:00Z"); // a Monday
const rows: HistoryRow[] = [];
for (let d = 0; d < 56; d++) {
  const trap = d < 28;
  for (let k = 0; k < 3; k++) {
    const at = new Date(start.getTime() + d * 86_400_000 + k * 240_000);
    const artist = trap ? (k === 2 ? "trap2" : "trap1") : k === 2 ? "indie2" : "indie1";
    rows.push(row(at, artist, `${artist}-t${(d + k) % 4}`));
  }
}
const now = new Date("2026-08-31T21:00:00Z");

describe("buildHistoryProfile", () => {
  const h = buildHistoryProfile({ rows, artists, snapshots: [], recordingSince: start.toISOString(), timezone: "Europe/Berlin", now });

  it("counts totals, active days and estimated time", () => {
    expect(h.totals.all.plays).toBe(168);
    expect(h.totals.all.ms).toBe(168 * 200_000);
    expect(h.totals.all.activeDays).toBe(56);
    expect(h.totals["7d"].plays).toBe(18); // last plays were on the 6 days before "now"
  });

  it("tracks streaks in the viewer's timezone", () => {
    expect(h.streaks.longest).toBe(56);
    expect(h.streaks.current).toBe(56);
    expect(h.weekHour.flat().reduce((a, b) => a + b)).toBe(168);
    expect(h.weekHour[0]![22]).toBeGreaterThan(0); // 20:00 UTC = 22:00 Berlin (summer)
  });

  it("detects the shift from a trap phase to an indie phase", () => {
    expect(h.phases.length).toBe(2);
    expect(h.phases[0]!.label).toBe("Trap phase");
    expect(h.phases[1]!.label).toBe("Indie Pop phase");
    expect(h.phases[1]!.current).toBe(true);
    expect(h.phases[0]!.definingArtists[0]!.artist.id).toBe("trap1");
  });

  it("ranks top artists by actual plays per period", () => {
    expect(h.top["7d"].artists[0]!.item.id).toBe("indie1");
    expect(h.top.all.artists[0]!.plays).toBe(56);
  });

  it("needs a few weeks before it reports phases", () => {
    const short = buildHistoryProfile({ rows: rows.slice(0, 30), artists, snapshots: [], recordingSince: start.toISOString(), timezone: "UTC", now });
    expect(short.phases).toEqual([]);
    expect(short.phaseReadiness.weeksNeeded).toBe(4);
  });

  it("handles an empty history", () => {
    const empty = buildHistoryProfile({ rows: [], artists: [], snapshots: [], recordingSince: now.toISOString(), timezone: "UTC", now });
    expect(empty.totals.all.plays).toBe(0);
    expect(empty.streaks.current).toBe(0);
    expect(empty.records.biggestDay).toBeNull();
  });
});
