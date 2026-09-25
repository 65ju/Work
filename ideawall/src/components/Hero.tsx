import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Sparkles, Timer } from "lucide-react";
import { HeroScene } from "./scene/HeroScene";
import { Workstation } from "./scene/Workstation";
import { dayPhase, greeting, isoWeek, type DayPhase } from "../lib/time";
import { useParallax, usePauseOffscreen } from "../lib/useParallax";
import { useSettings } from "../state/settings";
import { useNotes } from "../state/notes";
import { useWorld } from "../state/world";
import { TIER_CONFIG } from "../lib/quality";
import { sfx } from "../lib/sound";

export function Hero({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { tier, reduced } = useSettings();
  const [phase, setPhase] = useState<DayPhase>(() => dayPhase());
  useEffect(() => {
    const id = window.setInterval(() => setPhase(dayPhase()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useParallax(ref, TIER_CONFIG[tier].parallax && !reduced, tier === "high" && !reduced);
  usePauseOffscreen(ref);

  const { notes } = useNotes();
  const { coffee, focus } = useWorld();
  const openCount = notes.filter((n) => !n.done).length;
  const ideaCount = notes.filter((n) => !n.done && n.category === "ideen").length;

  const messages = useMemo(() => {
    const list = [
      "Dein Workspace ist bereit.",
      ideaCount === 0 ? "Zeit für neue Ideen!" : ideaCount === 1 ? "1 Idee wartet auf dich." : `${ideaCount} Ideen warten auf dich.`,
      "Heute wird ein guter Coding-Tag.",
      "Systemstatus: Alles läuft.",
      coffee < 25 ? "Kaffee-Level: Kritisch" : coffee < 60 ? "Kaffee-Level: Stabil" : "Kaffee-Level: Voll aufgeladen",
      "Mood: Kreativ und produktiv",
      `${openCount} offene Aufgaben – du schaffst das.`,
    ];
    if (focus.status === "running") list.unshift("Fokus-Modus aktiv. Nicht stören!");
    return list;
  }, [ideaCount, openCount, coffee, focus.status]);

  const coffeeTone = coffee < 25 ? "chip-danger" : coffee < 60 ? "chip-warn" : "chip-ok";
  const coffeeLabel = coffee < 25 ? "Kritisch" : coffee < 60 ? "Stabil" : "Voll";

  return (
    <section id="start" ref={ref} className="hero" aria-labelledby="hero-title">
      <HeroScene phase={phase} />
      <div className="hero-inner">
        <div className="hero-copy">
          <motion.p
            className="hero-kicker"
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={ready ? { opacity: 1, y: 0, scale: 1 } : undefined}
            transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.1 }}
          >
            <span className="led led-ok" aria-hidden />
            Workspace online · KW {isoWeek()}
          </motion.p>

          <Greeting hello={greeting(phase)} ready={ready} />

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.75 }}
          >
            Bereit für einen produktiven Tag in der IT?
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={ready ? { opacity: 1, y: 0, scale: 1 } : undefined}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.95 }}
          >
            <Ticker messages={messages} active={ready} />
          </motion.div>

          <motion.ul
            className="hero-chips"
            initial="hidden"
            animate={ready ? "show" : undefined}
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 1.1 } } }}
          >
            {[
              { cls: "chip-mood", icon: <Sparkles className="size-4" strokeWidth={2.6} />, text: "Mood: Kreativ & produktiv" },
              { cls: coffeeTone, icon: <Coffee className="size-4" strokeWidth={2.6} />, text: `Kaffee: ${coffeeLabel}` },
              focus.status !== "idle"
                ? { cls: "chip-focus", icon: <Timer className="size-4" strokeWidth={2.6} />, text: "Fokus läuft" }
                : { cls: "chip-ok", icon: <span className="led led-ok" />, text: "Systeme: Alles läuft" },
            ].map((c) => (
              <motion.li
                key={c.text.split(":")[0]}
                className={`chip ${c.cls}`}
                variants={{ hidden: { opacity: 0, y: 14, scale: 0.7 }, show: { opacity: 1, y: 0, scale: 1 } }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
              >
                {c.icon}
                {c.text}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          className="hero-art"
          initial={{ opacity: 0, y: 60, scale: 0.92, rotate: 2 }}
          animate={ready ? { opacity: 1, y: 0, scale: 1, rotate: 0 } : undefined}
          transition={{ type: "spring", stiffness: 140, damping: 16, mass: 1.4, delay: 0.35 }}
        >
          <Workstation />
        </motion.div>
      </div>
    </section>
  );
}

const Greeting = memo(function Greeting({ hello, ready }: { hello: string; ready: boolean }) {
  const lines = [
    { text: hello, cls: "hero-line" },
    { text: "Julian", cls: "hero-line hero-name" },
  ];
  let idx = 0;
  return (
    <h1 id="hero-title" className="hero-title" aria-label={`${hello} Julian`}>
      {lines.map((line) => (
        <span key={line.text} className={line.cls} aria-hidden="true">
          {line.text.split(" ").map((word, wi) => (
            <span key={wi} className="word">
              {[...word].map((ch) => {
                const i = idx++;
                return (
                  <motion.span
                    key={i}
                    className="letter-wrap"
                    initial={{ y: 90, scaleY: 0.3, scaleX: 1.4, opacity: 0, rotate: -18 }}
                    animate={ready ? { y: 0, scaleY: 1, scaleX: 1, opacity: 1, rotate: 0 } : undefined}
                    transition={{ type: "spring", stiffness: 520, damping: 13, delay: 0.18 + i * 0.045 }}
                  >
                    <span className="letter" data-char={ch} onPointerEnter={sfx.hover}>
                      {ch}
                    </span>
                  </motion.span>
                );
              })}
            </span>
          ))}
          {line.cls.includes("hero-name") && (
            <motion.span
              className="hero-spark"
              initial={{ scale: 0, rotate: -90 }}
              animate={ready ? { scale: 1, rotate: 0 } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.9 }}
            >
              <svg viewBox="-30 -30 60 60">
                <path d="M0 -26 C 3 -8 8 -3 26 0 C 8 3 3 8 0 26 C -3 8 -8 3 -26 0 C -8 -3 -3 -8 0 -26 Z" className="spark-a" />
              </svg>
              <svg viewBox="-30 -30 60 60" className="spark-small">
                <path d="M0 -26 C 3 -8 8 -3 26 0 C 8 3 3 8 0 26 C -3 8 -8 3 -26 0 C -8 -3 -3 -8 0 -26 Z" className="spark-b" />
              </svg>
            </motion.span>
          )}
        </span>
      ))}
    </h1>
  );
});

function Ticker({ messages, active }: { messages: string[]; active: boolean }) {
  const [text, setText] = useState("");
  const msgs = useRef(messages);
  msgs.current = messages;

  useEffect(() => {
    if (!active) return;
    let i = 0;
    let c = 0;
    let mode: "type" | "hold" | "erase" = "type";
    let t = 0;
    const step = () => {
      const msg = msgs.current[i % msgs.current.length];
      if (mode === "type") {
        c++;
        setText(msg.slice(0, c));
        if (c >= msg.length) mode = "hold";
        t = window.setTimeout(step, mode === "hold" ? 2600 : 32 + Math.random() * 40);
      } else if (mode === "hold") {
        mode = "erase";
        t = window.setTimeout(step, 14);
      } else {
        c = Math.max(0, c - 2);
        setText(msg.slice(0, c));
        if (c === 0) {
          mode = "type";
          i++;
        }
        t = window.setTimeout(step, c === 0 ? 280 : 14);
      }
    };
    t = window.setTimeout(step, 400);
    return () => window.clearTimeout(t);
  }, [active]);

  return (
    <div className="ticker" role="status" aria-live="off">
      <span className="ticker-prompt" aria-hidden>
        julian@world:~$
      </span>
      <span className="ticker-text">{text}</span>
      <span className="ticker-caret" aria-hidden />
    </div>
  );
}
