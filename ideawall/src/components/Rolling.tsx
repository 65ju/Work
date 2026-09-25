import { AnimatePresence, motion } from "framer-motion";

/** Text, dessen Ziffern beim Wechsel weich herein- und herausrollen. */
export function Rolling({ text, className }: { text: string; className?: string }) {
  const chars = [...text];
  return (
    <span className={`rolling ${className ?? ""}`} aria-label={text}>
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={`${chars.length}-${i}`} className="roll-slot" aria-hidden>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={ch}
                className="roll-digit"
                initial={{ y: "-70%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "70%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <span key={`${chars.length}-${i}`} className="roll-static" aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
