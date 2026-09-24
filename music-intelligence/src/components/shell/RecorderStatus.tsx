"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { Sheet } from "@/components/ui/Sheet";
import { formatDate, formatLongDuration, relativeTime } from "@/lib/client/format";
import { useRecorderStatus, type RecorderStatusResponse } from "@/lib/client/queries";

/** Compact recorder indicator for the navigation, with a detail sheet to pause or delete history. */
export function RecorderStatus() {
  const { data } = useRecorderStatus();
  const [open, setOpen] = useState(false);
  if (!data?.available) return null;
  const s = data.status;
  const active = Boolean(s?.enabled && !s.lastError);

  return (
    <>
      <button onClick={() => setOpen(true)} className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-white/[0.04]">
        <span className="relative grid size-2 place-items-center">
          {active && <motion.span className="absolute size-2 rounded-full bg-[var(--accent)]" animate={{ scale: [1, 2.4], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity }} />}
          <span className={`size-2 rounded-full ${active ? "bg-[var(--accent)]" : s?.lastError ? "bg-danger" : "bg-white/25"}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-fg-2">
            {data.needsReconnect ? "Reconnect to record" : !s ? "Not recording" : s.enabled ? "Recording" : "Recording paused"}
          </span>
          {s && <span className="block font-mono text-[10px] text-faint">{s.plays.toLocaleString()} plays saved</span>}
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Listening history">
        <RecorderDetail data={data} />
      </Sheet>
    </>
  );
}

function RecorderDetail({ data }: { data: RecorderStatusResponse }) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const s = data.status;

  const call = async (method: "PATCH" | "DELETE", body?: unknown) => {
    setBusy(true);
    try {
      await fetch("/api/recorder/status", { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      await qc.invalidateQueries({ queryKey: ["recorder-status"] });
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 px-6 pt-16 pb-10">
      <div>
        <p className="eyebrow">Listening history</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          Your music, <span className="font-serif font-normal italic">remembered</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-2">
          Spotify only shares your last 50 plays. To build real numbers, phases and your Wrapped, this app saves every play it sees —
          checking hourly, even when the app is closed — plus a daily copy of your top lists.
        </p>
      </div>

      {data.needsReconnect || !s ? (
        <div className="flex flex-col items-start gap-3 border-t border-line pt-6">
          <p className="text-sm text-fg-2">Recording starts the next time you connect Spotify.</p>
          <a href="/api/auth/login" className="rounded-full bg-fg px-5 py-2.5 text-sm font-medium text-ink">
            Reconnect Spotify
          </a>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 border-y border-line">
            <Stat label="Plays saved" value={s.plays.toLocaleString()} />
            <Stat label="Listening time" value={s.listenedMs ? formatLongDuration(s.listenedMs) : "—"} note="Estimated from track lengths" />
            <Stat label="Recording since" value={formatDate(s.since)} />
            <Stat label="Last update" value={s.lastRecordedAt ? relativeTime(s.lastRecordedAt) : "Waiting for first run"} />
          </dl>
          {s.lastError && (
            <p className="border-l-2 border-danger pl-3 text-xs leading-relaxed text-fg-2">
              The last recording attempt failed: {s.lastError}. Reconnecting Spotify usually fixes this.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              disabled={busy}
              onClick={() => call("PATCH", { enabled: !s.enabled })}
              className="self-start rounded-full border border-line-strong px-5 py-2.5 text-sm transition hover:bg-white/5 disabled:opacity-50"
            >
              {s.enabled ? "Pause recording" : "Resume recording"}
            </button>
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-danger/40 p-4">
                <p className="w-full text-sm text-fg-2">Delete all saved plays and your stored Spotify access? This cannot be undone.</p>
                <button disabled={busy} onClick={() => call("DELETE")} className="rounded-full bg-danger px-5 py-2 text-sm font-medium text-ink disabled:opacity-50">
                  Delete history
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm text-muted hover:text-fg">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="self-start text-sm text-muted underline-offset-4 hover:text-danger hover:underline">
                Delete history
              </button>
            )}
            <p className="text-xs text-faint">After deleting, recording starts again the next time you connect Spotify.</p>
          </div>
        </>
      )}
      <ProvenanceTag kind="spotify" label="Plays as reported by Spotify" />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-b border-line py-4 odd:border-r odd:pr-3 even:pl-4 [&:nth-last-child(-n+2)]:border-b-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="numeric mt-2 text-xl">{value}</dd>
      {note && <p className="mt-1 text-[10px] text-faint">{note}</p>}
    </div>
  );
}
