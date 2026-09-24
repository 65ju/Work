import type { HistoryProfile, PeriodKey } from "@/analytics/history-types";
import type { MusicProfile } from "@/analytics/types";
import type { Artist, ImageRef, TimeRange, Track } from "@/domain/types";
import { coarsePhases } from "@/analytics/coarse-phases";

export type WrappedRange = TimeRange;

export const WRAPPED_RANGES: { value: WrappedRange; label: string; title: string }[] = [
  { value: "short", label: "4 weeks", title: "Your last 4 weeks" },
  { value: "medium", label: "6 months", title: "Your last 6 months" },
  { value: "long", label: "1 year+", title: "Your year and beyond" },
];

const HISTORY_PERIOD: Record<WrappedRange, PeriodKey> = { short: "30d", medium: "all", long: "all" };

export type Slide =
  | { kind: "intro"; title: string; name: string; image: ImageRef[] }
  | { kind: "minutes"; minutes: number; plays: number; days: number; note: string | null }
  | { kind: "genre"; top: string; share: number; others: string[] }
  | { kind: "artist"; artist: Artist; plays: number | null }
  | { kind: "artists"; artists: Artist[] }
  | { kind: "track"; track: Track; plays: number | null }
  | { kind: "tracks"; tracks: Track[] }
  | { kind: "time"; period: string; peakHour: number | null }
  | { kind: "streak"; longest: number; biggestDayMinutes: number | null; biggestDay: string | null }
  | { kind: "personality"; name: string; description: string }
  | { kind: "phase"; label: string; detail: string; artists: string[] }
  | { kind: "outro"; title: string; artist: Artist | null; track: Track | null; genre: string | null; minutes: number | null; personality: string | null };

const PERIOD_NAME = { morning: "the morning", afternoon: "the afternoon", evening: "the evening", night: "late at night" } as const;

/** Composes the story from Spotify rankings plus the app's recorded history where available. */
export function buildWrapped(p: MusicProfile, h: HistoryProfile | null, range: WrappedRange): Slide[] {
  const title = WRAPPED_RANGES.find((r) => r.value === range)!.title;
  const artists = p.rankings.artists[range].map((id) => p.artists[id]?.artist).filter((a): a is Artist => Boolean(a));
  const tracks = p.rankings.tracks[range].map((id) => p.tracks[id]?.track).filter((t): t is Track => Boolean(t));
  const period = HISTORY_PERIOD[range];
  const totals = h?.totals[period];
  const playsOf = (kind: "artists" | "tracks", id: string) =>
    (h?.top[period][kind] as { item: { id: string }; plays: number }[] | undefined)?.find((e) => e.item.id === id)?.plays ?? null;

  const genres = new Map<string, number>();
  artists.forEach((a, i) => a.genres.forEach((g) => genres.set(g, (genres.get(g) ?? 0) + 1 / Math.sqrt(i + 1) / a.genres.length)));
  const genreTotal = [...genres.values()].reduce((a, b) => a + b, 0) || 1;
  const genreList = [...genres].sort((a, b) => b[1] - a[1]);

  const slides: Slide[] = [{ kind: "intro", title, name: p.user.displayName, image: artists[0]?.images ?? [] }];

  if (totals && totals.plays > 0) {
    const recordedDays = h!.coverage.spanDays;
    const windowDays = range === "short" ? 28 : range === "medium" ? 182 : 365;
    slides.push({
      kind: "minutes",
      minutes: Math.round(totals.ms / 60_000),
      plays: totals.plays,
      days: totals.activeDays,
      note: recordedDays < windowDays ? `Counted since recording started ${recordedDays} day${recordedDays === 1 ? "" : "s"} ago.` : null,
    });
  }
  if (genreList[0]) {
    slides.push({ kind: "genre", top: genreList[0][0], share: genreList[0][1] / genreTotal, others: genreList.slice(1, 4).map(([g]) => g) });
  }
  if (artists[0]) slides.push({ kind: "artist", artist: artists[0], plays: playsOf("artists", artists[0].id) });
  if (artists.length >= 3) slides.push({ kind: "artists", artists: artists.slice(0, 5) });
  if (tracks[0]) slides.push({ kind: "track", track: tracks[0], plays: playsOf("tracks", tracks[0].id) });
  if (tracks.length >= 3) slides.push({ kind: "tracks", tracks: tracks.slice(0, 5) });
  if (p.listening.strongestPeriod) {
    slides.push({ kind: "time", period: PERIOD_NAME[p.listening.strongestPeriod], peakHour: p.listening.peakHour });
  }
  if (h && h.streaks.longest >= 2) {
    slides.push({
      kind: "streak",
      longest: h.streaks.longest,
      biggestDayMinutes: h.records.biggestDay ? Math.round(h.records.biggestDay.ms / 60_000) : null,
      biggestDay: h.records.biggestDay?.day ?? null,
    });
  }
  if (p.personality) slides.push({ kind: "personality", name: p.personality.name, description: p.personality.description });

  const currentPhase = h?.phases.find((ph) => ph.current);
  if (currentPhase) {
    slides.push({
      kind: "phase",
      label: currentPhase.label,
      detail: `${currentPhase.weeks} weeks and counting`,
      artists: currentPhase.definingArtists.map((d) => d.artist.name).slice(0, 3),
    });
  } else {
    const now = coarsePhases(p).find((ph) => ph.range === "short");
    if (now && now.newArtists.length > 0) {
      slides.push({ kind: "phase", label: "Something new", detail: "Artists that just broke into your rotation", artists: now.newArtists.map((a) => a.name).slice(0, 3) });
    }
  }

  slides.push({
    kind: "outro",
    title,
    artist: artists[0] ?? null,
    track: tracks[0] ?? null,
    genre: genreList[0]?.[0] ?? null,
    minutes: totals && totals.plays > 0 ? Math.round(totals.ms / 60_000) : null,
    personality: p.personality?.name ?? null,
  });
  return slides;
}
