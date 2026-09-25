import { memo, useId, useMemo } from "react";
import { Database, GitBranch, Server, Wifi, Cpu, Shield } from "lucide-react";
import type { DayPhase } from "../../lib/time";
import { mulberry32 } from "../../lib/rng";

/* Ebenen (hinten → vorne): Himmel · Sterne · Sonne/Mond · Wolken · Skyline · Glyphen · Boden.
   Jede Ebene mit data-depth bewegt sich per Parallax; Animationen sitzen auf inneren Elementen. */

export const HeroScene = memo(function HeroScene({ phase }: { phase: DayPhase }) {
  const showStars = phase === "night" || phase === "evening" || phase === "morning";
  return (
    <div className="scene" aria-hidden="true">
      <div className={`sky sky-${phase}`} />
      <div className="sky-halftone" />
      {showStars && (
        <div className="scene-layer" data-depth="4">
          <Stars dim={phase !== "night"} />
        </div>
      )}
      <div className={`scene-layer celestial celestial-${phase}`} data-depth="8">
        {phase === "night" ? <Moon /> : <Sun phase={phase} />}
      </div>
      <div className="scene-layer" data-depth="12">
        <Cloud className="cloud cloud-a" />
        <Cloud className="cloud cloud-c" />
      </div>
      <div className="scene-layer skyline-wrap" data-depth="6">
        <Skyline />
      </div>
      <div className="scene-layer" data-depth="22">
        <Cloud className="cloud cloud-b" />
      </div>
      <Glyphs />
      <svg className="scene-ground" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path className="ground-back" d="M0 70 C 180 30 340 96 560 64 C 760 34 900 90 1100 60 C 1260 38 1360 58 1440 50 L1440 120 L0 120 Z" />
        <path className="ground-front" d="M0 96 C 220 64 420 116 700 90 C 940 68 1140 112 1440 84 L1440 120 L0 120 Z" />
      </svg>
    </div>
  );
});

function Sun({ phase }: { phase: DayPhase }) {
  const rays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const r1 = 96;
        const r2 = i % 2 === 0 ? 150 : 128;
        const w = 0.09;
        const p = (ang: number, r: number) => `${(Math.cos(ang) * r).toFixed(1)},${(Math.sin(ang) * r).toFixed(1)}`;
        return `M${p(a - w, r1)} L${p(a, r2)} L${p(a + w, r1)} Z`;
      }),
    [],
  );
  return (
    <div className={`sun sun-${phase}`}>
      <div className="sun-glow" />
      <svg viewBox="-160 -160 320 320" className="sun-svg">
        <g className="sun-rays">
          {rays.map((d, i) => (
            <path key={i} d={d} className="sun-ray" />
          ))}
        </g>
        <circle r="84" className="sun-body" />
        <path d="M 60 -58 A 84 84 0 0 1 -58 60 A 96 96 0 0 0 60 -58 Z" className="sun-shade" />
        <ellipse cx="-36" cy="-40" rx="20" ry="11" transform="rotate(-38 -36 -40)" className="sun-hi" />
        <circle cx="-8" cy="-58" r="5" className="sun-hi" />
        <circle r="84" className="sun-outline" />
      </svg>
    </div>
  );
}

function Moon() {
  return (
    <div className="moon">
      <div className="sun-glow moon-glow" />
      <svg viewBox="-70 -70 140 140" className="moon-svg">
        <circle r="54" className="moon-body" />
        <path d="M 30 -45 A 54 54 0 0 1 -30 45 A 60 60 0 0 0 30 -45 Z" className="moon-shade" />
        <circle cx="-14" cy="-12" r="9" className="moon-crater" />
        <circle cx="12" cy="18" r="6" className="moon-crater" />
        <circle cx="-22" cy="22" r="4" className="moon-crater" />
        <circle r="54" className="sun-outline" />
      </svg>
    </div>
  );
}

function Stars({ dim }: { dim: boolean }) {
  const stars = useMemo(() => {
    const r = mulberry32(42);
    return Array.from({ length: 34 }, (_, i) => ({
      x: r() * 100,
      y: r() * 55,
      s: 3 + r() * 6,
      tw: i % 4 === 0,
      delay: r() * 4,
    }));
  }, []);
  return (
    <div className={`stars ${dim ? "stars-dim" : ""}`}>
      {stars.map((s, i) => (
        <svg
          key={i}
          viewBox="-10 -10 20 20"
          className={s.tw ? "star twinkle" : "star"}
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s * 2, height: s.s * 2, animationDelay: `${s.delay}s` }}
        >
          <path d="M0 -10 L2.4 -2.4 L10 0 L2.4 2.4 L0 10 L-2.4 2.4 L-10 0 L-2.4 -2.4 Z" />
        </svg>
      ))}
    </div>
  );
}

const CLOUD_PATH =
  "M34 86 C 10 86 4 60 26 54 C 20 30 50 18 68 34 C 76 10 116 4 130 30 C 144 16 176 22 176 48 C 200 48 210 82 184 86 Z";
const CLOUD_SHADE = "M0 64 C 30 74 60 66 90 72 C 120 78 150 68 176 70 C 196 70 206 66 220 64 L220 110 L0 110 Z";

function Cloud({ className }: { className: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={className}>
      <svg viewBox="0 0 214 96" className="cloud-svg">
        <defs>
          <clipPath id={`c${id}`}>
            <path d={CLOUD_PATH} />
          </clipPath>
        </defs>
        <path d={CLOUD_PATH} className="cloud-base" />
        <g clipPath={`url(#c${id})`}>
          <path d={CLOUD_SHADE} className="cloud-shade" />
        </g>
        <ellipse cx="62" cy="44" rx="12" ry="6" className="cloud-hi" transform="rotate(-24 62 44)" />
        <ellipse cx="112" cy="26" rx="10" ry="5" className="cloud-hi" transform="rotate(-18 112 26)" />
        <path d={CLOUD_PATH} className="cloud-outline" />
      </svg>
    </div>
  );
}

interface Tower {
  x: number;
  w: number;
  h: number;
  tone: number;
  antenna: boolean;
  dish: boolean;
}

const TOWERS: Tower[] = [
  { x: 0, w: 96, h: 120, tone: 1, antenna: false, dish: false },
  { x: 80, w: 70, h: 176, tone: 0, antenna: true, dish: false },
  { x: 160, w: 120, h: 132, tone: 2, antenna: false, dish: true },
  { x: 296, w: 82, h: 206, tone: 1, antenna: true, dish: false },
  { x: 390, w: 110, h: 150, tone: 0, antenna: false, dish: false },
  { x: 520, w: 76, h: 118, tone: 2, antenna: false, dish: false },
  { x: 880, w: 92, h: 128, tone: 2, antenna: false, dish: true },
  { x: 986, w: 72, h: 196, tone: 0, antenna: true, dish: false },
  { x: 1070, w: 128, h: 148, tone: 1, antenna: false, dish: false },
  { x: 1210, w: 84, h: 216, tone: 0, antenna: true, dish: false },
  { x: 1306, w: 134, h: 136, tone: 2, antenna: false, dish: true },
];

const Skyline = memo(function Skyline() {
  const base = 260;
  const windows = useMemo(() => {
    const r = mulberry32(7);
    const out: { x: number; y: number; on: boolean; blink: boolean; delay: number; warm: boolean }[] = [];
    for (const t of TOWERS) {
      const cols = Math.max(2, Math.floor((t.w - 20) / 18));
      const rows = Math.floor((t.h - 34) / 22);
      const gx = (t.w - cols * 18) / 2 + 4;
      for (let c = 0; c < cols; c++) {
        for (let rr = 0; rr < rows; rr++) {
          const on = r() > 0.42;
          out.push({ x: t.x + gx + c * 18, y: base - t.h + 22 + rr * 22, on, blink: on && r() > 0.9, delay: r() * 6, warm: r() > 0.7 });
        }
      }
    }
    return out;
  }, []);

  return (
    <svg className="skyline" viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice">
      {/* Netzwerkleitungen mit wandernden Datenpaketen */}
      <g className="net-lines">
        <path id="net-a" d="M 334 60 Q 660 -30 1022 70" />
        <path id="net-b" d="M 115 90 Q 220 40 346 54" />
        <path id="net-c" d="M 1022 70 Q 1130 10 1252 50" />
      </g>
      <g className="net-packets">
        {[
          ["net-a", "4.2s", "0s"],
          ["net-a", "4.2s", "2.1s"],
          ["net-b", "2.6s", "0.6s"],
          ["net-c", "3s", "1.2s"],
        ].map(([p, dur, begin], i) => (
          <circle key={i} r="5" className={i % 2 ? "packet packet-alt" : "packet"}>
            <animateMotion dur={dur} begin={begin} repeatCount="indefinite" rotate="auto">
              <mpath href={`#${p}`} />
            </animateMotion>
          </circle>
        ))}
      </g>
      {TOWERS.map((t, i) => (
        <g key={i} className={`tower tower-${t.tone}`}>
          {t.antenna && (
            <>
              <line x1={t.x + t.w / 2} y1={base - t.h} x2={t.x + t.w / 2} y2={base - t.h - 34} className="tower-antenna" />
              <circle cx={t.x + t.w / 2} cy={base - t.h - 36} r="5" className="antenna-light" style={{ animationDelay: `${i * 0.37}s` }} />
            </>
          )}
          {t.dish && (
            <path
              d={`M ${t.x + 22} ${base - t.h} q 4 -22 22 -26 q -2 16 -22 26 z`}
              className="tower-dish"
            />
          )}
          <rect x={t.x} y={base - t.h} width={t.w} height={t.h + 10} rx="10" className="tower-body" />
          <rect x={t.x + t.w - 16} y={base - t.h + 6} width="10" height={t.h} rx="4" className="tower-shade" />
          <rect x={t.x + 6} y={base - t.h + 5} width={t.w * 0.4} height="5" rx="2.5" className="tower-hi" />
          <rect x={t.x} y={base - t.h} width={t.w} height={t.h + 10} rx="10" className="tower-outline" />
        </g>
      ))}
      <g>
        {windows.map((w, i) => (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width="10"
            height="12"
            rx="2.5"
            className={`win ${w.on ? (w.warm ? "win-warm" : "win-on") : "win-off"} ${w.blink ? "win-blink" : ""}`}
            style={w.blink ? { animationDelay: `${w.delay}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
});

const GLYPHS: { t?: string; icon?: typeof Wifi; x: number; y: number; d: number; c: string; s: number; r: number }[] = [
  { t: "{ }", x: 26, y: 14, d: 18, c: "magenta", s: 0.9, r: 6 },
  { t: "</>", x: 49, y: 20, d: 30, c: "cyan", s: 1.1, r: -8 },
  { icon: GitBranch, x: 70, y: 13, d: 16, c: "mint", s: 0.85, r: -6 },
  { icon: Wifi, x: 96.5, y: 34, d: 26, c: "teal", s: 0.9, r: 8 },
  { t: "λ", x: 53, y: 40, d: 14, c: "orange", s: 0.8, r: 12 },
  { t: "=>", x: 51, y: 62, d: 40, c: "sun", s: 0.85, r: -4 },
  { t: "01", x: 97, y: 64, d: 34, c: "pink", s: 0.8, r: 10 },
  { icon: Database, x: 88, y: 12, d: 44, c: "lavender", s: 0.8, r: -10 },
  { icon: Server, x: 38, y: 79, d: 20, c: "neon", s: 0.75, r: 5 },
  { t: "#", x: 58, y: 80, d: 50, c: "coral", s: 0.8, r: -12 },
  { icon: Cpu, x: 3, y: 12, d: 56, c: "cyan", s: 0.75, r: 14 },
  { icon: Shield, x: 75, y: 82, d: 48, c: "sun", s: 0.8, r: -9 },
];

function Glyphs() {
  return (
    <>
      {GLYPHS.map((g, i) => {
        const Icon = g.icon;
        return (
          <div
            key={i}
            className={`scene-layer glyph-anchor ${i > 7 ? "glyph-extra" : ""}`}
            data-depth={g.d}
            style={{ left: `${g.x}%`, top: `${g.y}%` }}
          >
            <div
              className={`glyph glyph-${g.c}`}
              style={{ ["--s" as string]: g.s, ["--r" as string]: `${g.r}deg`, animationDelay: `${-i * 0.9}s`, animationDuration: `${5 + (i % 5)}s` }}
            >
              {Icon ? <Icon strokeWidth={2.8} /> : <span>{g.t}</span>}
            </div>
          </div>
        );
      })}
    </>
  );
}
