import type {
  DayStat,
  HistoryArtist,
  HistoryArtistMeta,
  HistoryProfile,
  HistoryRow,
  HistoryTrack,
  PeriodKey,
  PeriodTotals,
  Ranked,
  SnapshotRow,
} from "./history-types";
import { addDays, detectPhases, PHASE_MIN_WEEKS, type WeekBucket } from "./phases";

const DAY_MS = 86_400_000;
const SESSION_GAP_MS = 30 * 60_000;
const WEEKDAYS: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

type Local = { day: string; hour: number; weekday: number };

function localizer(timezone: string) {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" });
  } catch {
    fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" });
  }
  return (date: Date): Local => {
    const parts: Record<string, string> = {};
    for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
    return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, weekday: WEEKDAYS[parts.weekday ?? "Mon"] ?? 0 };
  };
}

export type HistoryInput = {
  rows: HistoryRow[];
  artists: HistoryArtistMeta[];
  snapshots: SnapshotRow[];
  recordingSince: string;
  timezone: string;
  now?: Date;
};

/** Builds the history profile from the app's recorded plays. All values are derived by this app. */
export function buildHistoryProfile({ rows, artists, snapshots, recordingSince, timezone, now = new Date() }: HistoryInput): HistoryProfile {
  const local = localizer(timezone);
  const plays = [...rows].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const today = local(now).day;

  const trackMeta = new Map<string, HistoryTrack>();
  const artistMeta = new Map<string, HistoryArtist>();
  for (const a of artists) artistMeta.set(a.id, { id: a.id, name: a.name, imageUrl: a.imageUrl, genres: a.genres, url: a.url });
  for (const r of plays) {
    if (!trackMeta.has(r.trackId)) {
      trackMeta.set(r.trackId, {
        id: r.trackId,
        name: r.name,
        artists: r.artistIds.map((id, i) => ({ id, name: r.artistNames[i] ?? id })),
        albumName: r.albumName,
        imageUrl: r.imageUrl,
        durationMs: r.durationMs,
        url: r.url,
      });
    }
    r.artistIds.forEach((id, i) => {
      if (!artistMeta.has(id)) artistMeta.set(id, { id, name: r.artistNames[i] ?? id, imageUrl: null, genres: [], url: null });
    });
  }

  const locals = plays.map((r) => local(new Date(r.playedAt)));

  // Daily series (continuous, including days without plays).
  const byDay = new Map<string, DayStat>();
  plays.forEach((r, i) => {
    const d = locals[i]!.day;
    const s = byDay.get(d) ?? { day: d, plays: 0, ms: 0 };
    s.plays++;
    s.ms += r.durationMs;
    byDay.set(d, s);
  });
  const firstDay = locals[0]?.day ?? today;
  const daily: DayStat[] = [];
  for (let d = firstDay; d <= today; d = addDays(d, 1)) daily.push(byDay.get(d) ?? { day: d, plays: 0, ms: 0 });

  const weekHour = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  locals.forEach((l) => weekHour[l.weekday]![l.hour]!++);

  // Streaks of consecutive active days.
  let longest = 0;
  let longestStart: string | null = null;
  let longestEnd: string | null = null;
  let run = 0;
  let runStart: string | null = null;
  for (const d of daily) {
    if (d.plays > 0) {
      run++;
      runStart ??= d.day;
      if (run > longest) {
        longest = run;
        longestStart = runStart;
        longestEnd = d.day;
      }
    } else {
      run = 0;
      runStart = null;
    }
  }
  let current = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    const d = daily[i]!;
    if (d.plays > 0) current++;
    else if (d.day === today) continue; // today isn't over yet
    else break;
  }

  const periodStart: Record<PeriodKey, number> = { "7d": now.getTime() - 7 * DAY_MS, "30d": now.getTime() - 30 * DAY_MS, all: 0 };
  const totals = {} as Record<PeriodKey, PeriodTotals>;
  const top = {} as HistoryProfile["top"];
  for (const key of Object.keys(periodStart) as PeriodKey[]) {
    const idx = plays.map((_, i) => i).filter((i) => new Date(plays[i]!.playedAt).getTime() >= periodStart[key]);
    const days = new Set(idx.map((i) => locals[i]!.day));
    const ms = idx.reduce((a, i) => a + plays[i]!.durationMs, 0);
    const trackCount = new Map<string, { plays: number; ms: number }>();
    const artistCount = new Map<string, { plays: number; ms: number }>();
    for (const i of idx) {
      const r = plays[i]!;
      const t = trackCount.get(r.trackId) ?? { plays: 0, ms: 0 };
      t.plays++;
      t.ms += r.durationMs;
      trackCount.set(r.trackId, t);
      for (const a of r.artistIds) {
        const c = artistCount.get(a) ?? { plays: 0, ms: 0 };
        c.plays++;
        c.ms += r.durationMs;
        artistCount.set(a, c);
      }
    }
    totals[key] = {
      plays: idx.length,
      ms,
      uniqueTracks: trackCount.size,
      uniqueArtists: artistCount.size,
      activeDays: days.size,
      avgMsPerActiveDay: days.size ? Math.round(ms / days.size) : 0,
    };
    const rank = <T,>(m: Map<string, { plays: number; ms: number }>, meta: Map<string, T>, limit: number): Ranked<T>[] =>
      [...m]
        .sort((a, b) => b[1].plays - a[1].plays || b[1].ms - a[1].ms)
        .slice(0, limit)
        .flatMap(([id, v]) => {
          const item = meta.get(id);
          return item ? [{ item, plays: v.plays, ms: v.ms, share: idx.length ? v.plays / idx.length : 0 }] : [];
        });
    top[key] = { tracks: rank(trackCount, trackMeta, 25), artists: rank(artistCount, artistMeta, 25) };
  }

  // Records.
  const biggestDay = [...byDay.values()].sort((a, b) => b.ms - a.ms)[0] ?? null;
  const dayTrack = new Map<string, number>();
  plays.forEach((r, i) => {
    const k = `${locals[i]!.day}|${r.trackId}`;
    dayTrack.set(k, (dayTrack.get(k) ?? 0) + 1);
  });
  const [repeatKey, repeatPlays] = [...dayTrack].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const mostRepeatedInADay =
    repeatKey && repeatPlays >= 3
      ? { track: trackMeta.get(repeatKey.split("|")[1]!)!, plays: repeatPlays, day: repeatKey.split("|")[0]! }
      : null;

  let longestSession: HistoryProfile["records"]["longestSession"] = null;
  let sStart = 0;
  for (let i = 1; i <= plays.length; i++) {
    const gap = i < plays.length ? new Date(plays[i]!.playedAt).getTime() - new Date(plays[i - 1]!.playedAt).getTime() : Infinity;
    if (gap > SESSION_GAP_MS + (plays[i]?.durationMs ?? 0)) {
      const slice = plays.slice(sStart, i);
      const ms = slice.reduce((a, r) => a + r.durationMs, 0);
      if (slice.length >= 3 && (!longestSession || ms > longestSession.ms)) {
        longestSession = { start: slice[0]!.playedAt, end: slice.at(-1)!.playedAt, plays: slice.length, ms };
      }
      sStart = i;
    }
  }

  // Discoveries: artists first heard after the first week of recording and not among the initial long-term favourites.
  const firstSnapshotDay = snapshots[0]?.day;
  const knownAtStart = new Set(
    snapshots.filter((s) => s.day === firstSnapshotDay && s.kind === "artists").flatMap((s) => s.ids),
  );
  const graceEnd = new Date(recordingSince).getTime() + 7 * DAY_MS;
  const firstHeard = new Map<string, { at: string; plays: number }>();
  for (const r of plays)
    for (const a of r.artistIds) {
      const cur = firstHeard.get(a);
      if (cur) cur.plays++;
      else firstHeard.set(a, { at: r.playedAt, plays: 1 });
    }
  const discoveries = [...firstHeard]
    .filter(([id, v]) => !knownAtStart.has(id) && new Date(v.at).getTime() > graceEnd && v.plays >= 3)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .slice(0, 12)
    .flatMap(([id, v]) => {
      const artist = artistMeta.get(id);
      return artist ? [{ artist, firstPlayAt: v.at, plays: v.plays }] : [];
    });

  // Monthly summary.
  const months = new Map<string, { plays: number; ms: number; artists: Map<string, number>; tracks: Map<string, number> }>();
  plays.forEach((r, i) => {
    const m = locals[i]!.day.slice(0, 7);
    const e = months.get(m) ?? { plays: 0, ms: 0, artists: new Map(), tracks: new Map() };
    e.plays++;
    e.ms += r.durationMs;
    for (const a of r.artistIds.slice(0, 1)) e.artists.set(a, (e.artists.get(a) ?? 0) + 1);
    e.tracks.set(r.trackId, (e.tracks.get(r.trackId) ?? 0) + 1);
    months.set(m, e);
  });
  const best = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
  const monthly = [...months].map(([month, e]) => ({
    month,
    plays: e.plays,
    ms: e.ms,
    topArtist: artistMeta.get(best(e.artists) ?? "") ?? null,
    topTrack: trackMeta.get(best(e.tracks) ?? "") ?? null,
  }));

  // Weekly buckets for phase detection (weeks start Monday).
  const weekOf = (l: Local) => addDays(l.day, -l.weekday);
  const weeks = new Map<string, WeekBucket>();
  plays.forEach((r, i) => {
    const w = weekOf(locals[i]!);
    const b = weeks.get(w) ?? { weekStart: w, plays: 0, ms: 0, artists: new Map(), genres: new Map(), tracks: new Map() };
    b.plays++;
    b.ms += r.durationMs;
    b.tracks.set(r.trackId, (b.tracks.get(r.trackId) ?? 0) + 1);
    const primary = r.artistIds[0];
    if (primary) {
      b.artists.set(primary, (b.artists.get(primary) ?? 0) + 1);
      const genres = artistMeta.get(primary)?.genres ?? [];
      for (const g of genres) b.genres.set(g, (b.genres.get(g) ?? 0) + 1 / genres.length);
    }
    weeks.set(w, b);
  });
  const weekList = [...weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const phases = detectPhases(weekList, artistMeta, trackMeta, weekOf(local(now)));

  return {
    timezone,
    generatedAt: now.toISOString(),
    recordingSince,
    coverage: {
      firstPlayAt: plays[0]?.playedAt ?? null,
      lastPlayAt: plays.at(-1)?.playedAt ?? null,
      spanDays: daily.length,
      activeDays: byDay.size,
      totalPlays: plays.length,
    },
    totals,
    daily,
    weekHour,
    streaks: { current, longest, longestStart, longestEnd },
    records: { biggestDay, mostRepeatedInADay, longestSession },
    top,
    discoveries,
    monthly,
    phases,
    phaseReadiness: { weeksRecorded: weekList.filter((w) => w.plays >= 8).length, weeksNeeded: PHASE_MIN_WEEKS },
    snapshotDays: new Set(snapshots.map((s) => s.day)).size,
  };
}
