"use client";

import { AnimatePresence, motion } from "motion/react";
import { Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Artwork } from "@/components/ui/Artwork";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/States";
import { useHistory, useLoadedProfile } from "@/lib/client/queries";
import { buildWrapped, WRAPPED_RANGES, type WrappedRange } from "./build";
import { WrappedStory } from "./WrappedStory";
import { Portal } from "@/components/ui/Portal";

export function WrappedView() {
  const p = useLoadedProfile();
  const { data: historyResponse } = useHistory();
  const history = historyResponse?.available ? historyResponse.history : null;
  const [range, setRange] = useState<WrappedRange>("short");
  const [playing, setPlaying] = useState(false);
  const slides = useMemo(() => buildWrapped(p, history, range), [p, history, range]);
  const cover = p.rankings.artists[range].slice(0, 7).map((id) => p.artists[id]?.artist).filter(Boolean);
  const title = WRAPPED_RANGES.find((r) => r.value === range)!.title;

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        eyebrow="Wrapped"
        title={
          <>
            Wrapped, <span className="font-serif font-normal italic">whenever</span> you want
          </>
        }
        aside={<SegmentedControl label="Period" value={range} onChange={setRange} options={WRAPPED_RANGES.map(({ value, label }) => ({ value, label }))} />}
      >
        Your story for any period, built from Spotify&apos;s rankings and — where it has them — the plays this app has recorded.
      </PageHeader>

      {slides.length <= 2 ? (
        <EmptyState title="Not enough data for this period">Spotify has no rankings for this window yet.</EmptyState>
      ) : (
        <motion.button
          onClick={() => setPlaying(true)}
          className="group relative flex min-h-[60vh] flex-col justify-end overflow-hidden rounded-xl border border-line p-8 text-left sm:p-12"
          whileHover="hover"
        >
          <div className="absolute inset-0 -z-10 grid grid-cols-4 gap-1 opacity-60 transition duration-1000 group-hover:scale-105 group-hover:opacity-80 sm:grid-cols-7">
            {cover.map((a, i) => (
              <motion.div key={a!.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.9 }} className="relative overflow-hidden">
                <Artwork images={a!.images} alt="" size={400} kind="artist" rounded="rounded-none" className="!h-full !w-full" />
              </motion.div>
            ))}
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
          <p className="eyebrow !text-fg-2">{p.user.displayName}&apos;s Wrapped</p>
          <h2 className="mt-4 text-[clamp(3rem,8vw,7rem)] leading-[0.9] font-semibold tracking-[-0.05em]">
            {title}
            <br />
            <span className="font-serif font-normal tracking-[-0.02em] italic">in music.</span>
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <motion.span variants={{ hover: { scale: 1.05 } }} className="inline-flex items-center gap-3 rounded-full bg-fg px-6 py-3.5 text-[15px] font-medium text-ink">
              <Play className="size-4 fill-current" /> Play your Wrapped
            </motion.span>
            <span className="font-mono text-[11px] text-muted">{slides.length} chapters · about {Math.round((slides.length * 6.5) / 60 + 0.5)} min</span>
          </div>
        </motion.button>
      )}

      <div className="flex flex-wrap gap-6">
        <ProvenanceTag kind="spotify" label="Rankings from Spotify" />
        <ProvenanceTag kind="derived" label={history ? "Minutes & streaks recorded by this app" : "Minutes appear once recording is active"} />
      </div>

      <Portal>
<AnimatePresence>{playing && <WrappedStory slides={slides} onClose={() => setPlaying(false)} />}</AnimatePresence>
</Portal>
    </div>
  );
}
