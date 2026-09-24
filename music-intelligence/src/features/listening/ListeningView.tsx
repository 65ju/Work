"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { MusicProfile } from "@/analytics/types";
import type { Play } from "@/domain/types";
import { OpenInSpotify } from "@/components/brand/SpotifyIcon";
import { Artwork } from "@/components/ui/Artwork";
import { PageHeader, SectionLabel } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { ListeningClock } from "@/components/viz/ListeningClock";
import { formatMetricSpan } from "./span";
import { artistNames, formatDay, formatLongDuration, formatTime, pad2 } from "@/lib/client/format";
import { useLoadedProfile } from "@/lib/client/queries";

const HourlyActivity = dynamic(() => import("@/components/viz/HourlyActivity"), { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> });

type Mode = "timeline" | "list" | "activity";
const ease = [0.16, 1, 0.3, 1] as const;
const PERIOD_COPY = { morning: "mornings", afternoon: "afternoons", evening: "evenings", night: "late nights" } as const;

export function ListeningView() {
  const p = useLoadedProfile();
  const [mode, setMode] = useState<Mode>("timeline");
  const l = p.listening;

  if (l.sampleSize === 0) {
    return (
      <div className="flex flex-col gap-10">
        <Header />
        <EmptyState title="No recent plays">Spotify returned no recently played tracks for this account. Play something and check back.</EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16">
      <Header />

      <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div className="mx-auto w-full max-w-[460px]">
          <ListeningClock hourly={l.hourly} periods={l.periods} strongest={l.strongestPeriod} />
        </div>
        <div>
          <p className="eyebrow">Your strongest listening period</p>
          <h2 className="mt-4 text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
            You listen most in the <span className="font-serif font-normal italic">{l.strongestPeriod ? PERIOD_COPY[l.strongestPeriod] : "—"}</span>
          </h2>
          <dl className="mt-8 grid grid-cols-3 border-y border-line">
            <Stat label="Peak hour" value={l.peakHour === null ? "—" : `${pad2(l.peakHour)}:00`} />
            <Stat label="Sessions" value={String(l.sessions.length)} />
            <Stat label="Days covered" value={String(l.distinctDays)} />
          </dl>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted">
            Spotify only shares your last {l.sampleSize} plays, covering {formatMetricSpan(l.spanHours)}. Treat these patterns as a
            snapshot of that window, not your whole listening life. Times are shown in {l.timezone}.
          </p>
          <ProvenanceTag kind="derived" className="mt-4" label="Patterns calculated by this app" />
        </div>
      </section>

      <section>
        <SectionLabel right={<SegmentedControl size="sm" label="View" value={mode} onChange={setMode} options={[{ value: "timeline", label: "Timeline" }, { value: "list", label: "Compact" }, { value: "activity", label: "Activity" }]} />}>
          Listening timeline
        </SectionLabel>
        {mode === "timeline" && <Timeline p={p} />}
        {mode === "list" && <Compact plays={p.recent} />}
        {mode === "activity" && (
          <div className="pt-4">
            <HourlyActivity hourly={l.hourly} peakHour={l.peakHour} />
            <p className="mt-4 text-xs text-muted">Plays per hour of day across your last {l.sampleSize} plays.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Header() {
  return (
    <PageHeader
      eyebrow="Recently played"
      title={
        <>
          When the music <span className="font-serif font-normal italic">happens</span>
        </>
      }
      aside={<ProvenanceTag kind="spotify" label="Recent plays from Spotify" />}
    >
      Your most recent plays laid out in time, grouped into listening sessions.
    </PageHeader>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-line py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="numeric mt-2 text-2xl">{value}</dd>
    </div>
  );
}

function Timeline({ p }: { p: MusicProfile }) {
  const plays = [...p.recent].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  const sessions = p.listening.sessions;
  let day = "";

  return (
    <div className="relative">
      {sessions.map((s, si) => {
        const members = plays.filter((r) => r.playedAt >= s.start && r.playedAt <= s.end);
        const sDay = formatDay(s.end);
        const showDay = sDay !== day;
        day = sDay;
        const minutes = new Date(s.end).getTime() - new Date(s.start).getTime() + (members[0]?.track.durationMs ?? 0);
        return (
          <div key={s.start}>
            {showDay && <p className="mt-10 mb-4 font-serif text-3xl italic first:mt-4">{sDay}</p>}
            <motion.div
              className="relative grid grid-cols-[4.5rem_1fr] gap-x-6 border-l border-line pb-8 pl-6 sm:grid-cols-[5.5rem_1fr]"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{ duration: 0.7, ease, delay: Math.min(si, 4) * 0.04 }}
            >
              <span className="absolute top-1 -left-[5px] size-[9px] rounded-full border border-[var(--accent)] bg-ink" />
              <p className="col-span-2 mb-4 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
                Session · {s.plays} track{s.plays > 1 ? "s" : ""} · {formatLongDuration(minutes)}
              </p>
              {members.map((r) => (
                <TimelineRow key={`${r.track.id}@${r.playedAt}`} play={r} />
              ))}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineRow({ play }: { play: Play }) {
  return (
    <>
      <span className="numeric pt-3 text-sm text-fg-2">{formatTime(play.playedAt)}</span>
      <a href={play.track.url ?? undefined} target="_blank" rel="noreferrer noopener" className="group flex items-center gap-4 rounded-md py-2 transition hover:bg-white/[0.03]">
        <Artwork images={play.track.album.images} alt={play.track.album.name} size={48} className="transition group-hover:scale-105" />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium">{play.track.name}</span>
          <span className="block truncate text-[13px] text-muted">{artistNames(play.track.artists)}</span>
        </span>
      </a>
    </>
  );
}

function Compact({ plays }: { plays: Play[] }) {
  return (
    <ol className="divide-y divide-line">
      {plays.map((r) => (
        <li key={`${r.track.id}@${r.playedAt}`} className="grid grid-cols-[4rem_1fr_auto] items-center gap-4 py-2.5 text-sm">
          <span className="numeric text-muted">{formatTime(r.playedAt)}</span>
          <span className="min-w-0 truncate">
            <span className="text-fg">{r.track.name}</span> <span className="text-muted">— {artistNames(r.track.artists)}</span>
          </span>
          <OpenInSpotify href={r.track.url} compact />
        </li>
      ))}
    </ol>
  );
}
