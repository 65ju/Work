import type { Artist, DataAvailability, DataSource, ImageRef, Play, TimeRange, Track, UserProfile } from "@/domain/types";

/**
 * Where a piece of information comes from. The UI renders a label for each so
 * provider data, app-computed metrics, algorithmic picks and AI text never blur.
 */
export type Provenance = "spotify" | "derived" | "algorithm" | "ai";

export type Confidence = "low" | "medium" | "high";

export type MetricId =
  | "discovery"
  | "artistDiversity"
  | "genreDiversity"
  | "repetition"
  | "focus"
  | "loyalty"
  | "intensity"
  | "timeSpread"
  | "playlistDiversity";

export type Metric = {
  id: MetricId;
  label: string;
  /** Axis label for compact visualizations. */
  axis: string;
  /** 0–100, or null when the available data cannot support the metric. */
  value: number | null;
  confidence: Confidence;
  /** What data the value is computed from, e.g. "Your last 50 plays". */
  basis: string;
  /** How to read the number. */
  explanation: string;
  /** Plain-language formula so every insight is explainable. */
  method: string;
  provenance: "derived";
};

export type ArtistTier = "core" | "rising" | "longtime" | "steady" | "occasional";

export type ArtistStat = {
  artist: Artist;
  ranks: Partial<Record<TimeRange, number>>;
  /** Rank-weighted importance across all time ranges (derived). */
  score: number;
  tier: ArtistTier;
  topTrackCount: number;
  recentPlays: number;
  playlistAppearances: number;
  lastPlayedAt: string | null;
};

export type TrackStat = {
  track: Track;
  ranks: Partial<Record<TimeRange, number>>;
  recentPlays: number;
  savedAt: string | null;
  playlistCount: number;
  /** Earliest / latest timestamp for this track anywhere in the available data. */
  firstSeen: string | null;
  lastSeen: string | null;
};

export type GenreNode = {
  id: string;
  name: string;
  /** Share of your rank-weighted artist attention (0–1). */
  share: number;
  artistIds: string[];
  trackIds: string[];
  /** Share of this genre's artists that are new in the last ~4 weeks (not in long-term tops). */
  discoveryShare: number;
  trend: "rising" | "falling" | "stable";
};

export type GenreLink = { source: string; target: string; strength: number; reason: "shared-artists" | "name-similarity" };

export type GenreGraph = {
  nodes: GenreNode[];
  links: GenreLink[];
  coverage: { artistsWithGenres: number; artistsTotal: number };
};

export type NetworkLinkReason = "genre" | "collaboration" | "playlist" | "session";

export type NetworkNode = {
  id: string;
  name: string;
  image: ImageRef | null;
  weight: number;
  tier: ArtistTier;
  genres: string[];
  topTrackCount: number;
  recentPlays: number;
};

export type NetworkLink = {
  source: string;
  target: string;
  weight: number;
  reasons: NetworkLinkReason[];
  detail: string;
};

export type ArtistNetwork = { nodes: NetworkNode[]; links: NetworkLink[] };

export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

export type ListeningSession = { start: string; end: string; plays: number; trackIds: string[] };

export type ListeningPatterns = {
  timezone: string;
  sampleSize: number;
  firstPlayAt: string | null;
  lastPlayAt: string | null;
  spanHours: number;
  hourly: number[];
  periods: Record<DayPeriod, number>;
  strongestPeriod: DayPeriod | null;
  peakHour: number | null;
  sessions: ListeningSession[];
  distinctDays: number;
};

export type PlaylistInsight = {
  id: string;
  name: string;
  description: string;
  images: ImageRef[];
  url: string | null;
  isOwned: boolean;
  collaborative: boolean;
  ownerName: string;
  totalItems: number | null;
  analyzed: boolean;
  analyzedItems: number;
  truncated: boolean;
  uniqueArtists: number;
  artistDiversity: number | null;
  genreDiversity: number | null;
  genreCoverage: number | null;
  repetition: number | null;
  freshness: number | null;
  tasteAlignment: number | null;
  dominantArtists: { id: string; name: string; count: number }[];
  topGenres: { name: string; share: number }[];
  firstAddedAt: string | null;
  lastAddedAt: string | null;
  totalDurationMs: number;
};

export type PersonalityId =
  | "explorer"
  | "repeater"
  | "deepDiver"
  | "genreHopper"
  | "specialist"
  | "nightListener"
  | "loyalist";

export type Personality = {
  id: PersonalityId;
  name: string;
  description: string;
  reasons: string[];
  scores: { id: PersonalityId; name: string; score: number }[];
  secondary: { id: PersonalityId; name: string } | null;
  confidence: Confidence;
  provenance: "derived";
};

export type ProfileSummary = {
  topArtist: ArtistStat | null;
  topTrack: TrackStat | null;
  mostRepeated: { track: Track; plays: number } | null;
  discoveryLevel: "low" | "medium" | "high" | null;
  activity: number | null;
  dominantGenres: string[];
  totalMinutesTopShort: number;
};

export type DataCoverage = {
  availability: Record<DataSource, DataAvailability>;
  counts: {
    topArtists: Record<TimeRange, number>;
    topTracks: Record<TimeRange, number>;
    recentPlays: number;
    playlists: number;
    playlistsAnalyzed: number;
    savedSampled: number;
    savedTotal: number | null;
  };
};

/** The single structured object consumed by the UI, recommendations and the AI assistant. */
export type MusicProfile = {
  version: 1;
  provider: "spotify";
  generatedAt: string;
  user: UserProfile;
  coverage: DataCoverage;
  rankings: { artists: Record<TimeRange, string[]>; tracks: Record<TimeRange, string[]> };
  artists: Record<string, ArtistStat>;
  tracks: Record<string, TrackStat>;
  recent: Play[];
  genres: GenreGraph;
  network: ArtistNetwork;
  listening: ListeningPatterns;
  playlists: PlaylistInsight[];
  metrics: Metric[];
  personality: Personality | null;
  summary: ProfileSummary;
};
