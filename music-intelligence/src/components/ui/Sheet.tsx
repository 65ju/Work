"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Portal } from "@/components/ui/Portal";

/** Right-hand detail panel (bottom sheet on small screens). */
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <Portal>
<AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label={label}
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-ink-1/95 backdrop-blur-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[min(560px,100vw)] sm:rounded-none sm:border-t-0 sm:border-l"
            initial={{ y: "100%", x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 36 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-black/40 text-fg backdrop-blur transition hover:bg-black/60" aria-label="Close">
              <X className="size-4" />
            </button>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
</Portal>
  );
}
