import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { ByteSvg } from "./ByteSvg";
import { ByteController, type Stations } from "./controller";
import { bus } from "../lib/bus";
import { sfx } from "../lib/sound";
import { fx } from "../fx/fx";
import { pick } from "../lib/springs";
import { useWorld } from "../state/world";
import { useSettings } from "../state/settings";
import { dayPhase } from "../lib/time";

interface Bubble {
  id: number;
  text: string;
  align: "left" | "center" | "right";
}

/** Lebensraum am unteren Rand: Serverrack-Regal mit Requisiten + Byte. */
export function BuddyWorld({ active }: { active: boolean }) {
  const { settings } = useSettings();
  if (!settings.buddy) return null;
  return (
    <div className="buddy-world" aria-hidden="true">
      <Track />
      <Byte active={active} />
    </div>
  );
}

function stations(): Stations {
  const w = window.innerWidth;
  // Mittelpunkte der Requisiten – passend zu den CSS-Positionen in <Track />.
  return {
    duck: Math.max(46, w * 0.06) + 22,
    server: w >= 900 ? w * 0.42 + 20 : null,
    machine: w - Math.max(20, w * 0.04) - 29,
  };
}

function Byte({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<ByteController | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const world = useWorld();
  const worldRef = useRef(world);
  worldRef.current = world;

  useEffect(() => {
    if (!rootRef.current || !bodyRef.current || !flipRef.current || !shadowRef.current) return;
    let bubbleTimer = 0;
    let bubbleId = 0;
    const ctl = new ByteController({
      root: rootRef.current,
      body: bodyRef.current,
      flip: flipRef.current,
      shadow: shadowRef.current,
      say: (text, ms = 3200) => {
        window.clearTimeout(bubbleTimer);
        const x = ctl.x;
        const align = x < 150 ? "left" : x > window.innerWidth - 150 ? "right" : "center";
        setBubble({ id: ++bubbleId, text, align });
        bubbleTimer = window.setTimeout(() => setBubble(null), ms);
      },
      stations,
      refill: () => worldRef.current.refillCoffee(),
      coffee: () => worldRef.current.coffee,
      focusing: () => worldRef.current.focus.status !== "idle",
    });
    ctlRef.current = ctl;
    if (worldRef.current.focus.status !== "idle") ctl.setBase("focus");

    let lastHoverTalk = 0;
    const offs = [
      bus.on("note:created", (p) => ctl.inspect(p.x, p.y, pick(["Ooh, eine neue Notiz!", "Was schreibst du da?", "Klingt nach einer guten Idee!", "Ich bin gespannt!"]))),
      bus.on("note:done", (p) => {
        if (!p.done) return;
        fx.burst(p.x, p.y, "confetti", { count: 40 });
        ctl.celebrate(pick(["Erledigt! Stark!", "Ein Ticket weniger!", "Abgehakt. Weiter so!", "Ship it!"]), p);
      }),
      bus.on("note:deleted", (p) => {
        ctl.activity();
        ctl.lookAt(p.x, p.y, 1500);
        if (Math.random() < 0.6) ctl.say(pick(["Tschüss, Notiz!", "Ab in den Müll damit.", "Treffer, versenkt!"]), 2000);
      }),
      bus.on("board:arranged", () => ctl.arranged()),
      bus.on("board:search-empty", () => ctl.confused("Hm? Dazu finde ich nichts…")),
      bus.on("ui:error", (p) => ctl.confused(p.message ? `${p.message} Das war wohl nichts.` : "Hoppla, da stimmt was nicht.", p)),
      bus.on("ui:success", (p) => ctl.celebrate(p.message ?? "Geschafft!", p)),
      bus.on("focus:start", () => ctl.startFocus()),
      bus.on("focus:end", (e) => ctl.endFocus(e.completed)),
      bus.on("buddy:call", (p) => ctl.call(p?.x)),
      bus.on("coffee:request", () => ctl.fetchCoffee()),
      bus.on("idea:open", () => {
        ctl.activity();
        ctl.setPose("think", 1800);
      }),
      bus.on("theme:changed", ({ theme }) => {
        ctl.activity();
        ctl.jump(0.6, "happy");
        ctl.say(theme === "day" ? "Tagschicht! Sonnenbrille auf." : "Nachtschicht! Die Server leuchten schöner.", 2400);
      }),
      bus.on("duck:squeak", () => {
        ctl.activity();
        const st = stations();
        ctl.lookAt(st.duck, window.innerHeight - 60, 1800);
        if (Math.random() < 0.7) ctl.say(pick(["Die Ente weiß alles.", "Quak! Äh, ich meine: Beep.", "Hast du ihr den Bug erklärt?"]), 2200);
      }),
      bus.on("ui:hover", (p) => {
        ctl.lookAt(p.x, p.y, 1400);
        const now = performance.now();
        if (p.label && now - lastHoverTalk > 12_000 && Math.random() < 0.3 && ctl.base === "idle") {
          lastHoverTalk = now;
          ctl.say(`„${p.label}“? Gute Wahl!`, 1800);
        }
      }),
    ];
    return () => {
      offs.forEach((o) => o());
      window.clearTimeout(bubbleTimer);
      ctl.destroy();
      ctlRef.current = null;
    };
  }, []);

  // Einlaufen nach dem Intro.
  useEffect(() => {
    if (!active || !ctlRef.current) return;
    const phase = dayPhase();
    const hello =
      phase === "morning"
        ? "Guten Morgen, Julian! Kaffee steht bereit… fast."
        : phase === "day"
          ? "Hey Julian! Bereit für ein paar Tickets?"
          : phase === "evening"
            ? "Guten Abend, Julian! Noch ein kleiner Commit?"
            : "Nachtschicht, Julian? Ich bin dabei!";
    const t = window.setTimeout(() => ctlRef.current?.greet(hello), 350);
    return () => window.clearTimeout(t);
  }, [active]);

  return (
    <>
      <div ref={shadowRef} className="buddy-shadow" />
      <div ref={rootRef} className="buddy-root" title="Byte – klicken oder packen!">
        <div ref={bodyRef} className="buddy-body" data-pose="idle" data-face="normal">
          <div ref={flipRef} className="buddy-flip">
            <div className="buddy-lean">
              <ByteSvg />
            </div>
          </div>
          <span className="bfx bfx-zzz">
            <i>z</i>
            <i>z</i>
            <i>Z</i>
          </span>
          <span className="bfx bfx-question">?</span>
          <span className="bfx bfx-check">
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5 L10 17 L19 7" />
            </svg>
          </span>
          <span className="bfx bfx-think">
            <i>{"{"}</i>
            <i>•</i>
            <i>{"}"}</i>
          </span>
          <span className="bfx bfx-dizzy">
            <i>✦</i>
            <i>✦</i>
            <i>✦</i>
          </span>
          <span className="bfx bfx-hearts">
            <i>♥</i>
          </span>
        </div>
        <AnimatePresence>
          {bubble && (
            <motion.div
              key={bubble.id}
              className={`speech speech-${bubble.align}`}
              initial={{ opacity: 0, scale: 0.4, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -8, transition: { duration: 0.16 } }}
              transition={{ type: "spring", stiffness: 520, damping: 18 }}
            >
              {bubble.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function Track() {
  return (
    <div className="track">
      <div className="track-top" />
      <div className="track-front">
        <div className="track-cable">
          <span className="track-cable-flow" />
        </div>
        <div className="track-slots">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className={`slot ${i % 5 === 2 ? "slot-led" : ""}`} style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
          ))}
        </div>
      </div>
      <Duck />
      <MiniServer />
      <CoffeeMachine />
    </div>
  );
}

function Duck() {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  return (
    <button
      ref={scope}
      type="button"
      tabIndex={-1}
      className="prop prop-duck"
      style={{ left: "max(46px, 6vw)" }}
      onClick={(e) => {
        sfx.squeak();
        const r = e.currentTarget.getBoundingClientRect();
        fx.burst(r.left + r.width / 2, r.top, "stars", { count: 5, colors: ["#ffd23f", "#ff9a2e"] });
        void animate(scope.current, { scaleY: [1, 0.6, 1.15, 0.95, 1], scaleX: [1, 1.3, 0.9, 1.04, 1] }, { duration: 0.5 });
        bus.emit("duck:squeak");
      }}
    >
      <svg viewBox="0 0 60 52">
        <path d="M8 34 C 6 22 18 20 26 24 C 26 10 44 6 48 18 C 51 26 46 30 44 31 C 52 32 54 46 40 48 L18 48 C 10 48 8 42 8 34 Z" className="duck-body" />
        <path d="M14 44 C 26 48 38 46 48 40 C 50 46 44 48 40 48 L18 48 C 14 48 12 46 14 44 Z" className="duck-shade" />
        <path d="M48 20 C 56 18 60 22 56 25 C 53 27 49 25 47 24 Z" className="duck-beak" />
        <circle cx="40" cy="17" r="2.6" className="duck-eye" />
        <circle cx="39.3" cy="16.2" r="0.9" className="duck-eye-hi" />
        <path d="M16 32 C 20 28 28 30 30 36" className="duck-wing" />
        <path d="M8 34 C 6 22 18 20 26 24 C 26 10 44 6 48 18 C 51 26 46 30 44 31 C 52 32 54 46 40 48 L18 48 C 10 48 8 42 8 34 Z" className="duck-outline" />
      </svg>
    </button>
  );
}

function MiniServer() {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  return (
    <button
      ref={scope}
      type="button"
      tabIndex={-1}
      className="prop prop-server"
      style={{ left: "42vw" }}
      onClick={() => {
        sfx.tick();
        void animate(scope.current, { rotate: [0, -3, 3, -2, 0] }, { duration: 0.35 });
        void animate(".srv-led", { opacity: [1, 0.2, 1, 0.2, 1] }, { duration: 0.5 });
      }}
    >
      <svg viewBox="0 0 50 70">
        <rect x="5" y="4" width="40" height="62" rx="7" className="srv-body" />
        <rect x="33" y="6" width="10" height="58" rx="4" className="srv-shade" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="10" y={12 + i * 17} width="30" height="12" rx="3" className="srv-bay" />
            <circle cx="16" cy={18 + i * 17} r="2.2" className={`srv-led srv-led-${i}`} />
            <rect x="22" y={16.5 + i * 17} width="13" height="3" rx="1.5" className="srv-vent" />
          </g>
        ))}
        <rect x="5" y="4" width="40" height="62" rx="7" className="srv-outline" />
      </svg>
    </button>
  );
}

function CoffeeMachine() {
  return (
    <button
      type="button"
      tabIndex={-1}
      className="prop prop-coffee"
      style={{ right: "max(20px, 4vw)" }}
      onClick={() => bus.emit("coffee:request")}
    >
      <svg viewBox="0 0 64 80">
        <rect x="6" y="6" width="52" height="16" rx="6" className="cm-top" />
        <rect x="8" y="20" width="48" height="54" rx="8" className="cm-body" />
        <rect x="42" y="22" width="12" height="50" rx="5" className="cm-shade" />
        <rect x="16" y="28" width="22" height="10" rx="3" className="cm-display" />
        <text x="27" y="36" textAnchor="middle" className="cm-text">
          JAVA
        </text>
        <rect x="18" y="44" width="28" height="22" rx="4" className="cm-bay" />
        <rect x="28" y="44" width="8" height="5" rx="2" className="cm-nozzle" />
        <path d="M24 56 h14 v9 q0 3 -3 3 h-8 q-3 0 -3 -3 Z" className="cm-cup" />
        <circle cx="48" cy="33" r="3" className="cm-btn" />
        <rect x="6" y="6" width="52" height="16" rx="6" className="cm-outline" />
        <rect x="8" y="20" width="48" height="54" rx="8" className="cm-outline" />
      </svg>
      <span className="cm-steam" />
    </button>
  );
}
