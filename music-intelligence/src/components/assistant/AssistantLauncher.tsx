"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AssistantPanel } from "./AssistantPanel";

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const btn = useRef<HTMLButtonElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 20 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 20 });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname === "/assistant") return null;

  return (
    <>
      <motion.button
        ref={btn}
        style={{ x, y }}
        onPointerMove={(e) => {
          const r = btn.current?.getBoundingClientRect();
          if (!r) return;
          x.set((e.clientX - r.left - r.width / 2) * 0.25);
          y.set((e.clientY - r.top - r.height / 2) * 0.35);
        }}
        onPointerLeave={() => {
          x.set(0);
          y.set(0);
        }}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+132px)] z-30 flex items-center gap-2 rounded-full border border-line-strong bg-ink-1/80 px-4 py-2.5 font-mono text-[11px] tracking-[0.16em] text-fg uppercase shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-colors hover:bg-ink-2 lg:right-8 lg:bottom-8"
      >
        <span className="text-[var(--accent)]">✦</span> Ask your music
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              role="dialog"
              aria-label="Ask your music"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col border-l border-line bg-ink/95 backdrop-blur-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 36 }}
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <span className="font-mono text-[11px] tracking-[0.16em] uppercase">
                  <span className="text-[var(--accent)]">✦</span> Ask your music
                </span>
                <button onClick={() => setOpen(false)} className="rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-fg" aria-label="Close assistant">
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <AssistantPanel />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
