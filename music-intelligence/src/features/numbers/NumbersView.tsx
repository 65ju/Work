"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { HistoryProfile, PeriodKey, Ranked } from "@/analytics/history-types";
import { Artwork } from "@/components/ui/Artwork";
import { CountUp } from "@/components/ui/CountUp";
import { PageHeader, SectionLabel } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CalendarHeatmap, WeekHourHeatmap } from "@/components/viz/CalendarHeatmap";
import { HistoryGate } from "@/features/history/HistoryGate";
import { formatDate, formatLongDuration, formatTime, pad2 } from "@/lib/client/format";

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All recorded" },
];
const ease = [0.16, 1, 0.3, 1] as const;
const img = (url: string | null) => (url ? [{ url, width: 300, height: 300 }] : []);

export function NumbersView() {
  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        eyebrow="Real numbers"
        title={
          <>
            Every play, <span className="font-serif font-normal italic">counted</span>
          </>
        }
        aside={<ProvenanceTag kind="derived" label="Recorded by this app" />}
      >
        Built from every play this app has saved. Listening time is estimated from track lengths, because Spotify does not report how
        long a track actually played.
      </PageHeader>
      <HistoryGate>{(h) => <Numbers h={h} />}</HistoryGate>
    </div>
  );
}

function Numbers({ h }: { h: HistoryProfile }) {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const t = h.totals[period];
  const minutes = Math.round(t.ms / 60_000);

  return (
    <div className="flex flex-col gap-20">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl label="Period" value={period} onChange={setPeriod} options={PERIODS} />
          <p className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">Recording since {formatDate(h.recordingSince)}</p>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">Minutes listened</p>
            <p className="numeric mt-3 text-[clamp(4.5rem,13vw,10rem)] leading-[0.85] font-medium tracking-[-0.06em]">
              <CountUp key={period} value={minutes} duration={1.6} />
            </p>
            <p className="mt-4 text-sm text-muted">
              That is {formatLongDuration(t.ms)}
              {t.activeDays ? `, about ${Math.round(t.avgMsPerActiveDay / 60_000)} minutes on an average listening day` : ""}.
            </p>
          </div>
          <dl className="grid grid-cols-2 border-t border-line">
            {[
              ["Plays", t.plays],
              ["Active days", t.activeDays],
              ["Artists", t.uniqueArtists],
              ["Tracks", t.uniqueTracks],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-line py-5 odd:border-r odd:pr-4 even:pl-5">
                <dt className="eyebrow">{label}</dt>
                <dd className="numeric mt-2 text-3xl">
                  <CountUp key={`${period}-${label}`} value={value as number} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section>
        <SectionLabel right={<span className="font-mono text-[10px] text-faint">Brighter = more minutes</span>}>Listening calendar</SectionLabel>
        <CalendarHeatmap daily={h.daily} />
      </section>

      <section className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionLabel>Streaks & records</SectionLabel>
          <dl className="flex flex-col">
            <Record label="Current streak" value={`${h.streaks.current} day${h.streaks.current === 1 ? "" : "s"}`} note="Consecutive days with at least one play" />
            <Record
              label="Longest streak"
              value={`${h.streaks.longest} day${h.streaks.longest === 1 ? "" : "s"}`}
              note={h.streaks.longestStart ? `${formatDate(h.streaks.longestStart)} – ${formatDate(h.streaks.longestEnd)}` : undefined}
            />
            {h.records.biggestDay && (
              <Record label="Biggest day" value={`${Math.round(h.records.biggestDay.ms / 60_000)} min`} note={`${formatDate(h.records.biggestDay.day)} · ${h.records.biggestDay.plays} plays`} />
            )}
            {h.records.mostRepeatedInADay && (
              <Record
                label="On repeat"
                value={`${h.records.mostRepeatedInADay.plays}×`}
                note={`${h.records.mostRepeatedInADay.track.name} on ${formatDate(h.records.mostRepeatedInADay.day)}`}
              />
            )}
            {h.records.longestSession && (
              <Record
                label="Longest session"
                value={formatLongDuration(h.records.longestSession.ms)}
                note={`${formatDate(h.records.longestSession.start)}, ${formatTime(h.records.longestSession.start)}–${formatTime(h.records.longestSession.end)} · ${h.records.longestSession.plays} tracks`}
              />
            )}
          </dl>
        </div>
        <div>
          <SectionLabel>When you listen</SectionLabel>
          <WeekHourHeatmap grid={h.weekHour} />
          <p className="mt-3 text-xs text-faint">Plays by weekday and hour, {h.timezone}.</p>
        </div>
      </section>

      <section className="grid gap-12 lg:grid-cols-2">
        <TopList title="Top artists by plays" items={h.top[period].artists} render={(a) => ({ name: a.name, sub: a.genres.slice(0, 2).join(" · "), image: img(a.imageUrl), round: true })} />
        <TopList
          title="Top tracks by plays"
          items={h.top[period].tracks}
          render={(t) => ({ name: t.name, sub: t.artists.map((a) => a.name).join(", "), image: img(t.imageUrl), round: false })}
        />
      </section>

      {h.monthly.length > 1 && (
        <section>
          <SectionLabel>Month by month</SectionLabel>
          <MonthBars h={h} />
        </section>
      )}

      {h.discoveries.length > 0 && (
        <section>
          <SectionLabel>New artists since you started recording</SectionLabel>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {h.discoveries.map((d) => (
              <li key={d.artist.id} className="flex items-center gap-3">
                <Artwork images={img(d.artist.imageUrl)} alt={d.artist.name} size={44} kind="artist" rounded="rounded-full" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{d.artist.name}</span>
                  <span className="block font-mono text-[10px] text-muted">
                    first heard {formatDate(d.firstPlayAt)} · {d.plays} plays
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Record({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-4 border-b border-line py-4">
      <dt className="eyebrow">{label}</dt>
      <dd>
        <span className="numeric text-2xl">{value}</span>
        {note && <span className="mt-1 block truncate text-xs text-muted">{note}</span>}
      </dd>
    </div>
  );
}

function TopList<T>({ title, items, render }: { title: string; items: Ranked<T>[]; render: (item: T) => { name: string; sub: string; image: { url: string; width: number; height: number }[]; round: boolean } }) {
  const max = items[0]?.plays ?? 1;
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No plays in this period yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.slice(0, 10).map((entry, i) => {
            const r = render(entry.item);
            return (
              <motion.li key={r.name + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.5, ease }} className="grid grid-cols-[1.5rem_40px_1fr_auto] items-center gap-3">
                <span className="numeric text-xs text-faint">{pad2(i + 1)}</span>
                <Artwork images={r.image} alt={r.name} size={40} kind={r.round ? "artist" : "album"} rounded={r.round ? "rounded-full" : "rounded-[3px]"} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.span className="block h-full rounded-full bg-[var(--accent)]" initial={{ width: 0 }} animate={{ width: `${(entry.plays / max) * 100}%` }} transition={{ duration: 1, ease, delay: 0.2 + i * 0.04 }} />
                  </span>
                </span>
                <span className="numeric text-right text-xs text-muted">
                  {entry.plays}× · {Math.round(entry.ms / 60_000)}m
                </span>
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function MonthBars({ h }: { h: HistoryProfile }) {
  const max = Math.max(...h.monthly.map((m) => m.ms), 1);
  return (
    <div className="scrollbar-none flex items-end gap-4 overflow-x-auto pb-2">
      {h.monthly.map((m, i) => (
        <div key={m.month} className="flex w-24 shrink-0 flex-col gap-2">
          <div className="flex h-40 items-end">
            <motion.div className="w-full rounded-t-[3px] bg-[var(--accent)]" initial={{ height: 0 }} animate={{ height: `${(m.ms / max) * 100}%` }} transition={{ duration: 1, ease, delay: i * 0.05 }} />
          </div>
          <p className="font-mono text-[10px] tracking-wider text-muted uppercase">
            {new Date(`${m.month}-15T00:00:00Z`).toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" })}
          </p>
          <p className="numeric text-sm">{Math.round(m.ms / 60_000)} min</p>
          <p className="truncate text-xs text-fg-2">{m.topArtist?.name ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}
