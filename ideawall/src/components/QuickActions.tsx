import { useRef, type ComponentType, type MouseEvent } from "react";
import { motion, useAnimate } from "framer-motion";
import { Bot, BrushCleaning, Dices, StickyNote, SunMoon, Timer, TimerOff } from "lucide-react";
import { bus, centerOf } from "../lib/bus";
import { sfx } from "../lib/sound";
import { fx } from "../fx/fx";
import { useSettings } from "../state/settings";
import { useWorld } from "../state/world";

type ActionId = "note" | "focus" | "idea" | "arrange" | "theme" | "buddy";

interface ActionDef {
  id: ActionId;
  label: string;
  sub: string;
  hotkey: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
  comic: string;
  comicColor: string;
}

export function QuickActions() {
  const { settings } = useSettings();
  const { focus } = useWorld();
  const focusing = focus.status !== "idle";

  const actions: ActionDef[] = [
    { id: "note", label: "Neue Notiz", sub: "Gedanken festhalten", hotkey: "N", icon: StickyNote, tone: "sun", comic: "ZACK!", comicColor: "#ffd23f" },
    {
      id: "focus",
      label: focusing ? "Fokus beenden" : "Fokus starten",
      sub: focusing ? "Session stoppen" : "25 Minuten Deep Work",
      hotkey: "F",
      icon: focusing ? TimerOff : Timer,
      tone: "cyan",
      comic: focusing ? "PAUSE!" : "FOKUS!",
      comicColor: "#2ee6ff",
    },
    { id: "idea", label: "Random-Idee", sub: "Lass dich inspirieren", hotkey: "R", icon: Dices, tone: "magenta", comic: "WÜRFEL!", comicColor: "#ff3ea5" },
    { id: "arrange", label: "Board aufräumen", sub: "Ordnung per Klick", hotkey: "A", icon: BrushCleaning, tone: "mint", comic: "SAUBER!", comicColor: "#7dffb3" },
    {
      id: "theme",
      label: settings.theme === "night" ? "Tagschicht" : "Nachtschicht",
      sub: "Dark / Light Mood",
      hotkey: "M",
      icon: SunMoon,
      tone: "orange",
      comic: settings.theme === "night" ? "HELL!" : "NACHT!",
      comicColor: "#ff9a2e",
    },
    { id: "buddy", label: "Buddy rufen", sub: "Byte kommt angerannt", hotkey: "B", icon: Bot, tone: "lavender", comic: "HEY BYTE!", comicColor: "#b7a6ff" },
  ];

  return (
    <section id="aktionen" className="actions-wrap" aria-label="Quick Actions">
      <div className="hotbar">
        {actions.map((a, i) => (
          <Keycap key={a.id} action={a} index={i} />
        ))}
      </div>
    </section>
  );
}

function run(id: ActionId, el: HTMLElement) {
  const at = centerOf(el);
  switch (id) {
    case "note":
      bus.emit("note:new", { from: at });
      break;
    case "focus":
      bus.emit("focus:toggle");
      break;
    case "idea":
      bus.emit("idea:open");
      break;
    case "arrange":
      bus.emit("board:arrange");
      break;
    case "theme":
      bus.emit("theme:toggle", at);
      break;
    case "buddy":
      bus.emit("buddy:call", at);
      break;
  }
}

function Keycap({ action, index }: { action: ActionDef; index: number }) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const down = useRef(false);
  const Icon = action.icon;

  const pressIn = () => {
    down.current = true;
    sfx.press();
    void animate(".keycap-face", { y: 8, scaleX: 1.015, scaleY: 0.97 }, { duration: 0.07, ease: "easeOut" });
    void animate(".keycap-icon", { rotate: -8, scale: 0.92 }, { duration: 0.07 });
  };
  const pressOut = () => {
    if (!down.current) return;
    down.current = false;
    sfx.release();
    // Rückfederung mit Überschwingen – die Kappe schnappt nach oben.
    void animate(".keycap-face", { y: 0, scaleX: 1, scaleY: 1 }, { type: "spring", stiffness: 900, damping: 12 });
    void animate(".keycap-icon", { rotate: [null, 14, 0], scale: [null, 1.18, 1] }, { duration: 0.45, ease: "easeOut" });
  };

  const trigger = (e: MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    if (e.detail === 0) {
      // Per Tastatur ausgelöst: Druck vollständig nachspielen.
      pressIn();
      window.setTimeout(pressOut, 90);
    }
    const c = centerOf(el);
    if (c) {
      fx.burst(c.x, c.y - 20, "sparkle", { colors: [action.comicColor, "#ffffff", "#ffd23f"] });
      fx.comic(c.x, c.y - 70, action.comic, action.comicColor);
    }
    run(action.id, el);
  };

  return (
    <motion.button
      ref={scope}
      type="button"
      className={`keycap keycap-${action.tone}`}
      data-action={action.id}
      aria-keyshortcuts={action.hotkey}
      initial={{ opacity: 0, y: 40, rotate: index % 2 ? 4 : -4, scale: 0.8 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.05 * index }}
      onPointerDown={pressIn}
      onPointerUp={pressOut}
      onPointerLeave={pressOut}
      onPointerEnter={(e) => {
        const c = centerOf(e.currentTarget);
        if (c) bus.emit("ui:hover", { ...c, label: action.label });
      }}
      onClick={trigger}
    >
      <span className="keycap-base" aria-hidden />
      <span className="keycap-lift">
        <span className="keycap-face">
          <span className="keycap-icon">
            <Icon className="size-7" strokeWidth={2.6} />
          </span>
          <span className="keycap-text">
            <span className="keycap-label">{action.label}</span>
            <span className="keycap-sub">{action.sub}</span>
          </span>
          <kbd className="keycap-kbd">{action.hotkey}</kbd>
          <span className="keycap-shine" aria-hidden />
        </span>
      </span>
    </motion.button>
  );
}
