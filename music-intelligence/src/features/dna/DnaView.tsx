"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { MetricId } from "@/analytics/types";
import { Meter } from "@/components/ui/Meter";
import { PageHeader, SectionLabel } from "@/components/ui/PageHeader";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { DnaRadar } from "@/components/viz/DnaRadar";
import { ParticleField } from "@/components/viz/ParticleField";
import { useLoadedProfile } from "@/lib/client/queries";

const ease = [0.16, 1, 0.3, 1] as const;

export function DnaView() {
  const p = useLoadedProfile();
  const [selected, setSelected] = useState<MetricId>(p.metrics.find((m) => m.value !== null)?.id ?? "discovery");
  const metric = p.metrics.find((m) => m.id === selected)!;

  return (
    <div className="flex flex-col gap-20">
      <PageHeader eyebrow="Your music intelligence metrics" title={<>Music <span className="font-serif font-normal italic">DNA</span></>} aside={<ProvenanceTag kind="derived" />}>
        Nine measurements calculated by this app from your real Spotify data. Spotify does not supply any of these values — every
        one shows exactly how it is computed and how much data it rests on.
      </PageHeader>

      <section className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative mx-auto w-full max-w-[640px]">
          <ParticleField className="absolute inset-[-8%] size-[116%]" count={140} orbit />
          <DnaRadar metrics={p.metrics} selected={selected} onSelect={setSelected} />
        </div>

        <div>
          <AnimatePresence mode="wait">
            <motion.div key={metric.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease }}>
              <p className="eyebrow">{metric.axis}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">{metric.label}</h2>
              <div className="mt-6 flex items-end gap-4">
                <span className="numeric text-[clamp(4rem,9vw,7rem)] leading-none font-medium tracking-[-0.05em]">{metric.value ?? "—"}</span>
                <span className="mb-3 font-mono text-sm text-muted">/ 100</span>
              </div>
              <Meter value={metric.value} segments={32} className="mt-5" />
              <p className="mt-6 text-[17px] leading-relaxed text-fg">{metric.value === null ? "Not enough data to calculate this yet." : metric.explanation}</p>
              <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm">
                <div>
                  <dt className="eyebrow">Based on</dt>
                  <dd className="mt-1 text-fg-2">{metric.basis}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Method</dt>
                  <dd className="mt-1 leading-relaxed text-fg-2">{metric.method}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Confidence</dt>
                  <dd className="mt-1 flex items-center gap-2 text-fg-2">
                    <span className="flex gap-1">
                      {["low", "medium", "high"].map((c, i) => (
                        <span key={c} className={`h-1.5 w-5 rounded-full ${i <= ["low", "medium", "high"].indexOf(metric.confidence) ? "bg-[var(--accent)]" : "bg-white/10"}`} />
                      ))}
                    </span>
                    {metric.confidence}
                  </dd>
                </div>
              </dl>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section>
        <SectionLabel>All metrics</SectionLabel>
        <ul className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
          {p.metrics.map((m, i) => (
            <li key={m.id}>
              <button
                onClick={() => {
                  setSelected(m.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`group w-full border-b border-line py-4 text-left transition ${selected === m.id ? "text-fg" : "text-fg-2 hover:text-fg"}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-medium">{m.label}</span>
                  <span className="numeric text-sm">{m.value ?? "—"}</span>
                </div>
                <Meter value={m.value} segments={24} className="mt-3 h-1.5" delay={i * 0.04} />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-faint">
          There is intentionally no &ldquo;mainstream vs. niche&rdquo; score: Spotify no longer exposes artist or track popularity to
          apps like this one, and estimating it would mean inventing data.
        </p>
      </section>

      {p.personality && (
        <section className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">Your listening style</p>
            <h2 className="mt-4 font-serif text-6xl leading-none tracking-[-0.02em] italic">{p.personality.name}</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-fg-2">{p.personality.description}</p>
            {p.personality.secondary && (
              <p className="mt-4 text-sm text-muted">
                With a strong streak of <span className="text-fg">{p.personality.secondary.name}</span>.
              </p>
            )}
            <ProvenanceTag kind="derived" label="Generated by this app's scoring" className="mt-6" />
          </div>
          <div>
            <SectionLabel>How your style was chosen</SectionLabel>
            <ul className="flex flex-col gap-3">
              {p.personality.scores.map((s, i) => (
                <li key={s.id} className="grid grid-cols-[150px_1fr_36px] items-center gap-4">
                  <span className={`text-sm ${i === 0 ? "text-fg" : "text-muted"}`}>{s.name}</span>
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className={`h-full rounded-full ${i === 0 ? "bg-[var(--accent)]" : "bg-white/35"}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, ease, delay: i * 0.06 }}
                    />
                  </div>
                  <span className="numeric text-right text-xs text-muted">{s.score}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-faint">
              Each style is a fixed weighted formula over the metrics above; the highest score wins. Confidence: {p.personality.confidence}.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
