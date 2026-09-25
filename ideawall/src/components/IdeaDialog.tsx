import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dices, Lightbulb, Pin } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { IDEA_POOL } from "../data/content";
import { bus, centerOf } from "../lib/bus";
import { sfx } from "../lib/sound";
import { fx } from "../fx/fx";
import { runtime } from "../lib/quality";

/** Ideen-Spielautomat: Die Walze dreht schnell und bremst realistisch ab. */
export function IdeaDialog() {
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState(IDEA_POOL[0]);
  const [rolling, setRolling] = useState(false);
  const [landKey, setLandKey] = useState(0);
  const timer = useRef(0);
  const last = useRef(-1);

  const roll = useCallback(() => {
    window.clearTimeout(timer.current);
    let next = Math.floor(Math.random() * IDEA_POOL.length);
    if (next === last.current) next = (next + 1) % IDEA_POOL.length;
    last.current = next;
    if (runtime.reduced) {
      setIdea(IDEA_POOL[next]);
      setLandKey((k) => k + 1);
      return;
    }
    setRolling(true);
    const steps = 16;
    let i = 0;
    const tick = () => {
      i++;
      if (i >= steps) {
        setIdea(IDEA_POOL[next]);
        setRolling(false);
        setLandKey((k) => k + 1);
        sfx.pop();
        return;
      }
      setIdea(IDEA_POOL[Math.floor(Math.random() * IDEA_POOL.length)]);
      sfx.tick();
      // Abbremsen: die Intervalle werden quadratisch länger.
      timer.current = window.setTimeout(tick, 40 + (i / steps) ** 2 * 190);
    };
    tick();
  }, []);

  useEffect(
    () =>
      bus.on("idea:open", () => {
        setOpen(true);
        window.setTimeout(roll, 180);
      }),
    [roll],
  );
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Ideen-Generator" icon={<Lightbulb className="size-5" strokeWidth={2.6} />} tone="magenta">
      <p className="dialog-text">Keine Ahnung, was als Nächstes? Lass den Automaten entscheiden.</p>
      <div className={`slot-machine ${rolling ? "is-rolling" : ""}`}>
        <span className="slot-light slot-light-l" />
        <span className="slot-light slot-light-r" />
        <div className="slot-window" aria-live="polite">
          <motion.p
            key={rolling ? idea : `land-${landKey}`}
            className="slot-text"
            initial={rolling ? { y: -26, opacity: 0.4 } : { y: -34, scaleY: 1.2 }}
            animate={{ y: 0, opacity: 1, scaleY: 1 }}
            transition={rolling ? { duration: 0.05 } : { type: "spring", stiffness: 520, damping: 13 }}
          >
            {idea}
          </motion.p>
        </div>
      </div>
      <div className="dialog-actions">
        <button type="button" className="cel-btn cel-btn-ghost" onClick={roll} disabled={rolling} data-autofocus>
          <Dices className="size-5" strokeWidth={2.6} />
          Nochmal würfeln
        </button>
        <button
          type="button"
          className="cel-btn cel-btn-primary"
          disabled={rolling}
          onClick={(e) => {
            const from = centerOf(e.currentTarget);
            setOpen(false);
            if (from) fx.burst(from.x, from.y, "sparkle");
            window.setTimeout(() => bus.emit("note:new", { from, title: idea, body: "Aus dem Ideen-Generator – klingt spannend!", category: "ideen" }), 200);
          }}
        >
          <Pin className="size-5" strokeWidth={2.6} />
          Aufs Board pinnen
        </button>
      </div>
    </Dialog>
  );
}
