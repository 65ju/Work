import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sessionFlag, setSessionFlag } from "../lib/storage";
import { useSettings } from "../state/settings";

const LINES = ["booting julian.world …", "lade Ideen … ok", "wecke Byte … ok", "brühe Kaffee … 23 %"];

/** Boot-Intro: Mini-Terminal, Logo mit Squash & Stretch, Iris-Blende. ≤ 2,2 s, überspringbar. */
export function Intro({ onDone }: { onDone: () => void }) {
  const { reduced } = useSettings();
  const [show, setShow] = useState(() => !sessionFlag("intro") && !reduced);
  const [step, setStep] = useState(0);
  const [logo, setLogo] = useState(false);
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setSessionFlag("intro");
    onDoneRef.current();
    setShow(false);
  };

  useEffect(() => {
    if (!show) {
      if (!done.current) {
        done.current = true;
        const t = window.setTimeout(() => onDoneRef.current(), 60);
        return () => window.clearTimeout(t);
      }
      return;
    }
    const timers = [
      ...LINES.map((_, i) => window.setTimeout(() => setStep(i + 1), 160 + i * 230)),
      window.setTimeout(() => setLogo(true), 1080),
      window.setTimeout(finish, 1700),
    ];
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="intro"
          role="presentation"
          initial={{ clipPath: "circle(150% at 50% 50%)" }}
          exit={{ clipPath: "circle(0% at 50% 55%)", transition: { duration: 0.55, ease: [0.7, 0, 0.3, 1] } }}
        >
          <div className="intro-halftone" />
          <div className="intro-stage">
            <AnimatePresence mode="wait">
              {!logo ? (
                <motion.div key="term" className="intro-term" exit={{ scale: 0.6, opacity: 0, rotate: -6, transition: { duration: 0.18 } }}>
                  <div className="intro-term-bar">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="intro-term-body">
                    {LINES.slice(0, step).map((l) => (
                      <motion.p key={l} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                        <span className="text-mint">$</span> {l}
                      </motion.p>
                    ))}
                    <span className="ticker-caret" />
                  </div>
                  <div className="intro-bar">
                    <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, ease: [0.3, 0.1, 0.2, 1] }} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="logo"
                  className="intro-logo"
                  initial={{ scaleY: 0.2, scaleX: 1.6, y: 60, opacity: 0 }}
                  animate={{ scaleY: [0.2, 1.25, 0.9, 1], scaleX: [1.6, 0.85, 1.06, 1], y: [60, -18, 4, 0], opacity: 1 }}
                  transition={{ duration: 0.55, times: [0, 0.45, 0.75, 1] }}
                >
                  <small>Julian's</small>
                  <span>IdeaWall</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="intro-skip">Klick oder Taste zum Überspringen</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
