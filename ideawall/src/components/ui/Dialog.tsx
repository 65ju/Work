import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  tone?: string;
  children: ReactNode;
  wide?: boolean;
}

/** Barrierearmer Dialog: Fokusfalle, Esc schließt, Fokus kehrt zum Auslöser zurück. */
export function Dialog({ open, onClose, title, icon, tone = "cyan", children, wide }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>("button, input, select, textarea");
      first?.focus();
    }, 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
          (el) => !el.hasAttribute("disabled"),
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      returnTo.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className={`dialog cel-panel dialog-${tone} ${wide ? "dialog-wide" : ""}`}
            initial={{ opacity: 0, scale: 0.7, y: 60, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30, rotate: 2, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
          >
            <header className="dialog-head">
              {icon && <span className={`panel-icon panel-icon-${tone}`}>{icon}</span>}
              <h2 id="dialog-title" className="panel-title">
                {title}
              </h2>
              <button type="button" className="icon-btn ml-auto" aria-label="Schließen" onClick={onClose}>
                <X className="size-5" strokeWidth={3} />
              </button>
            </header>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
