import { memo, useEffect, useRef, useState } from "react";
import { CODE_LINES, TERMINAL_LINES } from "../../data/content";
import { runtime } from "../../lib/quality";

/** Cartoon-Workstation: Monitor mit live tippendem Code, Terminal, Tasse, Pflanze, Tastatur. */
export const Workstation = memo(function Workstation() {
  return (
    <div className="workstation" aria-hidden="true">
      <div className="ws-terminal" data-depth="-10">
        <div className="ws-terminal-inner">
          <div className="ws-terminal-bar">
            <i />
            <i />
            <i />
            <span>julian@ideawall: ~</span>
          </div>
          <div className="ws-terminal-scroll">
            <div className="ws-terminal-lines">
              {[...TERMINAL_LINES, ...TERMINAL_LINES].map((l, i) => (
                <div key={i} className={l.startsWith("✓") ? "ok" : l.startsWith("$") ? "cmd" : ""}>
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ws-monitor" data-depth="-16">
        <div className="ws-monitor-frame">
          <span className="ws-cam" />
          <div className="ws-screen">
            <div className="ws-tabs">
              <span className="active">world.ts</span>
              <span>ideas.ts</span>
            </div>
            <CodeTyper />
            <div className="ws-scanlines" />
            <div className="ws-glare" />
          </div>
          <span className="ws-sticker ws-sticker-a">Strg+S!</span>
          <span className="ws-sticker ws-sticker-b">&lt;/&gt;</span>
          <span className="ws-power" />
        </div>
        <div className="ws-neck" />
        <div className="ws-foot" />
      </div>

      <div className="ws-desk" data-depth="-22">
        <div className="ws-desk-top" />
        <Keyboard />
        <Mug />
        <Plant />
      </div>
    </div>
  );
});

function CodeTyper() {
  const [pos, setPos] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const total = CODE_LINES.reduce((n, l) => n + l.reduce((m, s) => m + s.t.length, 0) + 1, 0);

  useEffect(() => {
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (ref.current) io.observe(ref.current);
    let t: number;
    const step = () => {
      const delay = runtime.tier === "low" ? 110 : 55;
      if (visible && !document.hidden) {
        setPos((p) => (p >= total + 40 ? 0 : p + 1));
      }
      t = window.setTimeout(step, delay + Math.random() * 60);
    };
    t = window.setTimeout(step, 600);
    return () => {
      window.clearTimeout(t);
      io.disconnect();
    };
  }, [total]);

  let remaining = pos;
  return (
    <div className="ws-code" ref={ref}>
      {CODE_LINES.map((line, li) => {
        if (remaining < 0) return null;
        const lineLen = line.reduce((m, s) => m + s.t.length, 0);
        const shown = Math.min(remaining, lineLen);
        const isCurrent = remaining <= lineLen;
        remaining -= lineLen + 1;
        let left = shown;
        return (
          <div key={li} className="ws-line">
            <span className="ws-ln">{li + 1}</span>
            {line.map((seg, si) => {
              if (left <= 0) return null;
              const txt = seg.t.slice(0, left);
              left -= seg.t.length;
              return (
                <span key={si} className={`tok-${seg.c}`}>
                  {txt}
                </span>
              );
            })}
            {isCurrent && <span className="ws-caret" />}
          </div>
        );
      })}
    </div>
  );
}

function Keyboard() {
  return (
    <svg className="ws-keyboard" viewBox="0 0 220 56">
      <rect x="3" y="6" width="214" height="46" rx="12" className="kb-base" />
      <rect x="3" y="6" width="214" height="40" rx="12" className="kb-top" />
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 10 }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            x={14 + c * 19.5 + (r === 1 ? 5 : r === 2 ? 10 : 0)}
            y={12 + r * 10.5}
            width="15"
            height="8"
            rx="2.5"
            className={`kb-key ${(r * 10 + c) % 7 === 3 ? "kb-key-press" : ""}`}
            style={{ animationDelay: `${((r * 10 + c) % 5) * 0.37}s` }}
          />
        )),
      )}
      <rect x="3" y="6" width="214" height="46" rx="12" className="kb-outline" />
    </svg>
  );
}

function Mug() {
  return (
    <svg className="ws-mug" viewBox="0 0 80 96">
      <g className="steam">
        <path d="M28 30 C 20 20 36 14 28 2" />
        <path d="M44 32 C 36 22 52 16 44 4" />
      </g>
      <path d="M58 48 C 78 48 78 74 56 72" className="mug-handle" />
      <path d="M12 38 L64 38 L60 86 Q59 92 52 92 L24 92 Q17 92 16 86 Z" className="mug-body" />
      <path d="M50 40 L64 40 L60 86 Q59 92 52 92 L46 92 Z" className="mug-shade" />
      <rect x="20" y="46" width="6" height="26" rx="3" className="mug-hi" />
      <text x="36" y="72" className="mug-label" textAnchor="middle">
        {"</>"}
      </text>
      <ellipse cx="38" cy="38" rx="26" ry="6" className="mug-coffee" />
      <path d="M12 38 L64 38 L60 86 Q59 92 52 92 L24 92 Q17 92 16 86 Z" className="mug-outline" />
    </svg>
  );
}

function Plant() {
  return (
    <svg className="ws-plant" viewBox="0 0 90 120">
      <g className="plant-leaves">
        <path d="M45 70 C 20 60 10 36 18 20 C 36 28 46 48 45 70 Z" className="leaf leaf-a" />
        <path d="M45 70 C 70 58 82 34 72 14 C 54 26 44 46 45 70 Z" className="leaf leaf-b" />
        <path d="M45 72 C 40 46 44 20 50 6 C 60 26 56 50 45 72 Z" className="leaf leaf-c" />
      </g>
      <path d="M20 70 L70 70 L64 112 Q63 116 58 116 L32 116 Q27 116 26 112 Z" className="pot" />
      <path d="M52 70 L70 70 L64 112 Q63 116 58 116 L50 116 Z" className="pot-shade" />
      <rect x="16" y="64" width="58" height="12" rx="5" className="pot-rim" />
    </svg>
  );
}
