"use client";

import { AnimatePresence, motion } from "motion/react";
import { QrCode, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Start = { code: string; svg: string; expiresAt: number };
type State = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; data: Start } | { kind: "approved" } | { kind: "expired" } | { kind: "error"; message: string };

/** "Log in with your phone": shows a QR code and waits for the phone to finish the Spotify login. */
export function QrLogin() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [now, setNow] = useState(() => Date.now());

  const start = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/auth/pair/start", { method: "POST" });
      const body = (await res.json()) as Start & { error?: { message: string } };
      if (!res.ok) return setState({ kind: "error", message: body.error?.message ?? "QR login is unavailable." });
      setState({ kind: "ready", data: body });
    } catch {
      setState({ kind: "error", message: "You appear to be offline." });
    }
  }, []);

  useEffect(() => {
    if (open && state.kind === "idle") void start();
  }, [open, state.kind, start]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/pair/status", { cache: "no-store" });
        const { status } = (await res.json()) as { status: "pending" | "approved" | "expired" };
        if (status === "approved") {
          setState({ kind: "approved" });
          window.location.href = "/overview?welcome=1";
        } else if (status === "expired") setState({ kind: "expired" });
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [state.kind]);

  const secondsLeft = state.kind === "ready" ? Math.max(0, Math.round((state.data.expiresAt - now) / 1000)) : 0;
  useEffect(() => {
    if (state.kind === "ready" && secondsLeft === 0) setState({ kind: "expired" });
  }, [secondsLeft, state.kind]);

  const close = () => {
    setOpen(false);
    setState({ kind: "idle" });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-3.5 text-[15px] text-fg-2 transition hover:bg-white/5 hover:text-fg">
        <QrCode className="size-4" /> Log in with your phone
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
            <motion.div
              role="dialog"
              aria-label="Log in with your phone"
              className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-ink-1/95 p-8 backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <button onClick={close} aria-label="Close" className="absolute top-4 right-4 rounded-full p-2 text-muted hover:text-fg">
                <X className="size-4" />
              </button>
              <p className="eyebrow">Log in with your phone</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Scan, tap, <span className="font-serif font-normal italic">done.</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-2">Scan with your phone camera. If you are logged in to Spotify there, one tap is enough.</p>

              <div className="mt-6 grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-[#eeede9]">
                {state.kind === "ready" ? (
                  <div className="size-full p-3 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: state.data.svg }} />
                ) : state.kind === "approved" ? (
                  <p className="text-sm font-medium text-ink">Approved — loading your music…</p>
                ) : state.kind === "expired" ? (
                  <button onClick={start} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-fg">
                    <RefreshCw className="size-4" /> New code
                  </button>
                ) : state.kind === "error" ? (
                  <p className="px-8 text-center text-sm text-ink">{state.message}</p>
                ) : (
                  <div className="size-10 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
                )}
              </div>

              {state.kind === "ready" && (
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="eyebrow">Code</p>
                    <p className="numeric mt-1 text-2xl tracking-[0.08em]">{state.data.code}</p>
                  </div>
                  <p className="font-mono text-[11px] text-muted">
                    {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left
                  </p>
                </div>
              )}
              <p className="mt-4 text-xs leading-relaxed text-faint">Your phone will show the same code. Only continue there if they match.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
