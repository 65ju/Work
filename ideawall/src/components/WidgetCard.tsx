import { useRef, useState, type ReactNode } from "react";
import { motion, useDragControls } from "framer-motion";
import { EyeOff, GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { WIDGETS, type WidgetId, type WidgetSize } from "../prefs";

interface Props {
  id: WidgetId;
  size: WidgetSize;
  onSwap: (a: WidgetId, b: WidgetId) => void;
  onStep: (id: WidgetId, dir: -1 | 1) => void;
  onResize: (id: WidgetId) => void;
  onHide: (id: WidgetId) => void;
  children: ReactNode;
}

/**
 * Karte eines Widgets. Am Griff lässt sie sich frei herumziehen; losgelassen über
 * einem anderen Widget tauschen beide ihre Plätze (mit Layout-Animation).
 */
export function WidgetCard({ id, size, onSwap, onStep, onResize, onHide, children }: Props) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const target = useRef<HTMLElement | null>(null);
  const meta = WIDGETS[id];
  const Icon = meta.icon;

  const markTarget = (el: HTMLElement | null) => {
    if (el === target.current) return;
    target.current?.classList.remove("is-drop-target");
    el?.classList.add("is-drop-target");
    target.current = el;
  };

  const findTarget = (clientX: number, clientY: number): HTMLElement | null => {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const w = (el as HTMLElement).closest?.<HTMLElement>("[data-widget]");
      if (w && w.dataset.widget !== id) return w;
    }
    return null;
  };

  return (
    <motion.section
      layout="position"
      data-widget={id}
      aria-label={meta.title}
      className={`card widget size-${size} ${dragging ? "is-dragging" : ""}`}
      style={{ zIndex: dragging ? 40 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      drag
      dragListener={false}
      dragControls={controls}
      dragSnapToOrigin
      dragElastic={1}
      dragMomentum={false}
      whileDrag={{ scale: 1.025, rotate: -0.8 }}
      onDragStart={() => {
        setDragging(true);
        document.documentElement.classList.add("is-sorting");
      }}
      onDrag={(_, info) => markTarget(findTarget(info.point.x - window.scrollX, info.point.y - window.scrollY))}
      onDragEnd={() => {
        const t = target.current;
        markTarget(null);
        setDragging(false);
        document.documentElement.classList.remove("is-sorting");
        if (t?.dataset.widget) onSwap(id, t.dataset.widget as WidgetId);
      }}
    >
      <header className="widget-head">
        <button
          type="button"
          className="grip"
          aria-label={`${meta.title} verschieben (Pfeiltasten)`}
          title="Ziehen zum Verschieben"
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              onStep(id, -1);
            } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              onStep(id, 1);
            }
          }}
        >
          <GripVertical size={16} />
        </button>
        <Icon size={15} className="widget-icon" aria-hidden />
        <h2 className="widget-title">{meta.title}</h2>
        <div className="widget-tools">
          <button type="button" className="tool" title={size === "l" ? "Schmaler" : "Breiter"} aria-label={size === "l" ? "Schmaler" : "Breiter"} onClick={() => onResize(id)}>
            {size === "l" ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button type="button" className="tool" title="Ausblenden" aria-label={`${meta.title} ausblenden`} onClick={() => onHide(id)}>
            <EyeOff size={14} />
          </button>
        </div>
      </header>
      <div className="widget-body">{children}</div>
    </motion.section>
  );
}
