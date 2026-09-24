/** Types for analytics over the app's own recorded listening history. */

export type HistoryRow = {
  playedAt: string;
  trackId: string;
  name: string;
  artistIds: string[];
  artistNames: string[];
  albumName: string | null;
  imageUrl: string | null;
  durationMs: number;
  url: string | null;
};

export type HistoryArtistMeta = { id: string; name: string; genres: string[]; imageUrl: string | null; url: string | null };

export type SnapshotRow = { day: string; kind: "artists" | "tracks"; range: "short" | "medium" | "long"; ids: string[] };

export type HistoryTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  albumName: string | null;
  imageUrl: string | null;
  durationMs: number;
  url: string | null;
};

export type HistoryArtist = { id: string; name: string; imageUrl: string | null; genres: string[]; url: string | null };

export type Ranked<T> = { item: T; plays: number; ms: number; share: number };

export type PeriodKey = "7d" | "30d" | "all";

export type PeriodTotals = {
  plays: number;
  /** Sum of track lengths. Spotify does not report how long a track was actually played. */
  ms: number;
  uniqueTracks: number;
  uniqueArtists: number;
  activeDays: number;
  avgMsPerActiveDay: number;
};

export type DayStat = { day: string; plays: number; ms: number };

export type Phase = {
  id: string;
  label: string;
  start: string;
  end: string;
  weeks: number;
  plays: number;
  ms: number;
  topGenres: { name: string; share: number }[];
  /** Artists that define the phase: much more present here than in the rest of your history. */
  definingArtists: { artist: HistoryArtist; plays: number; lift: number }[];
  topTracks: { track: HistoryTrack; plays: number }[];
  current: boolean;
};

export type HistoryProfile = {
  timezone: string;
  generatedAt: string;
  recordingSince: string;
  coverage: { firstPlayAt: string | null; lastPlayAt: string | null; spanDays: number; activeDays: number; totalPlays: number };
  totals: Record<PeriodKey, PeriodTotals>;
  daily: DayStat[];
  /** 7 × 24 plays; row 0 = Monday. */
  weekHour: number[][];
  streaks: { current: number; longest: number; longestStart: string | null; longestEnd: string | null };
  records: {
    biggestDay: DayStat | null;
    mostRepeatedInADay: { track: HistoryTrack; plays: number; day: string } | null;
    longestSession: { start: string; end: string; plays: number; ms: number } | null;
  };
  top: Record<PeriodKey, { tracks: Ranked<HistoryTrack>[]; artists: Ranked<HistoryArtist>[] }>;
  discoveries: { artist: HistoryArtist; firstPlayAt: string; plays: number }[];
  monthly: { month: string; plays: number; ms: number; topArtist: HistoryArtist | null; topTrack: HistoryTrack | null }[];
  phases: Phase[];
  phaseReadiness: { weeksRecorded: number; weeksNeeded: number };
  snapshotDays: number;
};

export type HistoryResponse = { available: false; reason: "no-database" | "not-enrolled" } | { available: true; history: HistoryProfile };
