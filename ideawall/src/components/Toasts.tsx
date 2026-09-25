import { AnimatePresence, motion } from "framer-motion";
import { Bell, Coffee, PartyPopper, Timer, X } from "lucide-react";
import { dismiss, useToasts } from "../lib/toast";

const ICONS = { info: Bell, break: Coffee, done: PartyPopper, focus: Timer };

export function Toasts() {
  const items = useToasts();
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              className={`toast tone-${t.tone}`}
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              <Icon size={18} />
              <span>{t.text}</span>
              <button type="button" aria-label="Schließen" onClick={() => dismiss(t.id)}>
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
