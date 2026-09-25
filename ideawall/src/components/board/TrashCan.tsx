import { forwardRef, useEffect } from "react";
import { useAnimate } from "framer-motion";
import { bus } from "../../lib/bus";
import { sfx } from "../../lib/sound";
import { fx } from "../../fx/fx";

/** Papierkorb: wackelt beim Treffer, der Deckel springt auf und federt zurück. */
export const TrashCan = forwardRef<HTMLDivElement>(function TrashCan(_, ref) {
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(
    () =>
      bus.on("trash:hit", () => {
        sfx.trash();
        const r = scope.current?.getBoundingClientRect();
        if (r) {
          fx.burst(r.left + r.width / 2, r.top + 10, "paper", { count: 8, colors: ["#fff3a8", "#ffa6d1", "#c9fbff"], power: 0.7 });
          fx.burst(r.left + r.width / 2, r.top + r.height, "dust", { count: 5 });
        }
        void animate(scope.current, { rotate: [0, -9, 7, -4, 2, 0], scaleY: [1, 0.9, 1.05, 1] }, { duration: 0.6 });
        void animate(".trash-lid", { rotate: [0, -38, 12, -6, 0], y: [0, -16, 0, -3, 0] }, { duration: 0.7, ease: "easeOut" });
      }),
    [animate, scope],
  );

  return (
    <div ref={ref} className="trash" aria-hidden>
      <div ref={scope} className="trash-inner">
        <svg viewBox="0 0 90 110" className="trash-svg">
          <g className="trash-body-g">
            <path d="M12 34 L78 34 L70 104 Q69 108 64 108 L26 108 Q21 108 20 104 Z" className="trash-body" />
            <path d="M58 34 L78 34 L70 104 Q69 108 64 108 L52 108 Z" className="trash-shade" />
            <path d="M32 46 L35 96 M45 46 L45 96 M58 46 L55 96" className="trash-ribs" />
            <rect x="22" y="40" width="5" height="40" rx="2.5" className="trash-hi" />
            <path d="M12 34 L78 34 L70 104 Q69 108 64 108 L26 108 Q21 108 20 104 Z" className="trash-outline" />
          </g>
        </svg>
        <svg viewBox="0 0 90 40" className="trash-lid">
          <rect x="6" y="18" width="78" height="14" rx="7" className="trash-lid-body" />
          <rect x="34" y="8" width="22" height="12" rx="5" className="trash-lid-handle" />
          <rect x="12" y="21" width="30" height="4" rx="2" className="trash-hi" />
        </svg>
      </div>
      <span className="trash-label">Papierkorb</span>
    </div>
  );
});
