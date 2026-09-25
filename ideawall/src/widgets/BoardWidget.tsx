import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";
import { Plus, StickyNote, X } from "lucide-react";
import { usePersistent } from "../lib/usePersistent";
import { uid } from "../lib/storage";

interface Pin {
  id: string;
  text: string;
  /** horizontale Position als Anteil der freien Breite (bleibt bei Fenstergrößen stabil) */
  fx: number;
  y: number;
  color: number;
  rot: number;
  z: number;
}

const COLORS = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#ede9fe"];
const PIN_W = 188;
const PIN_H = 148;
const BOARD_H = 400;

export const BoardWidget = memo(function BoardWidget() {
  const [pins, setPins] = usePersistent<Pin[]>("pins-v3", []);
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const maxX = Math.max(0, w - PIN_W);
  const maxY = BOARD_H - PIN_H;

  const add = (at?: { x: number; y: number }) => {
    let spot = at;
    if (!spot) {
      for (let y = 16; y <= maxY && !spot; y += 36) {
        for (let x = 16; x <= maxX; x += 44) {
          if (!pins.some((p) => Math.abs(p.fx * maxX - x) < PIN_W - 24 && Math.abs(p.y - y) < PIN_H - 24)) {
            spot = { x, y };
            break;
          }
        }
      }
    }
    spot ??= { x: Math.random() * maxX, y: Math.random() * maxY };
    const x = Math.min(maxX, Math.max(0, spot.x));
    const y = Math.min(maxY, Math.max(0, spot.y));
    setPins((ps) => [
      ...ps,
      {
        id: uid(),
        text: "",
        fx: maxX ? x / maxX : 0,
        y,
        color: ps.length % COLORS.length,
        rot: Math.round((Math.random() * 5 - 2.5) * 10) / 10,
        z: ps.reduce((m, p) => Math.max(m, p.z), 0) + 1,
      },
    ]);
  };

  const update = useCallback((id: string, patch: Partial<Pin>) => setPins((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p))), [setPins]);
  const remove = useCallback((id: string) => setPins((ps) => ps.filter((p) => p.id !== id)), [setPins]);
  const front = useCallback(
    (id: string) =>
      setPins((ps) => {
        const top = ps.reduce((m, p) => Math.max(m, p.z), 0);
        const pin = ps.find((p) => p.id === id);
        if (!pin || pin.z === top) return ps;
        return ps.map((p) => (p.id === id ? { ...p, z: top + 1 } : p));
      }),
    [setPins],
  );

  return (
    <div>
      <div className="board-bar">
        <span className="muted">{pins.length ? `${pins.length} Zettel · ziehen, werfen, anordnen` : "Leer – pinn dir hin, was du brauchst."}</span>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => add()}>
          <Plus size={15} /> Zettel
        </button>
      </div>
      <div
        ref={ref}
        className="board"
        style={{ height: BOARD_H }}
        onDoubleClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const r = e.currentTarget.getBoundingClientRect();
          add({ x: e.clientX - r.left - PIN_W / 2, y: e.clientY - r.top - 20 });
        }}
      >
        {pins.length === 0 && (
          <div className="board-empty">
            <StickyNote size={26} />
            <span>Doppelklick irgendwo hier oder „Zettel“ – und los.</span>
          </div>
        )}
        <AnimatePresence>
          {w > 0 && pins.map((p) => <PinNote key={p.id} pin={p} maxX={maxX} maxY={maxY} onUpdate={update} onRemove={remove} onFront={front} />)}
        </AnimatePresence>
      </div>
    </div>
  );
});

interface PinProps {
  pin: Pin;
  maxX: number;
  maxY: number;
  onUpdate: (id: string, patch: Partial<Pin>) => void;
  onRemove: (id: string) => void;
  onFront: (id: string) => void;
}

const PinNote = memo(function PinNote({ pin, maxX, maxY, onUpdate, onRemove, onFront }: PinProps) {
  const [editing, setEditing] = useState(pin.text === "");
  const [lifted, setLifted] = useState(false);
  const dragging = useRef(false);
  const x = useMotionValue(pin.fx * maxX);
  const y = useMotionValue(Math.min(pin.y, maxY));

  useEffect(() => {
    if (dragging.current) return;
    x.set(pin.fx * maxX);
    y.set(Math.min(pin.y, maxY));
  }, [pin.fx, pin.y, maxX, maxY, x, y]);

  // Der Zettel pendelt beim Ziehen wie Papier – die Neigung folgt der Geschwindigkeit.
  const vx = useVelocity(x);
  const swing = useSpring(useTransform(vx, [-1600, 0, 1600], [-12, 0, 12], { clamp: true }), { stiffness: 260, damping: 15 });
  const rotate = useTransform(swing, (s) => pin.rot + s);

  const settle = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setLifted(false);
    onUpdate(pin.id, { fx: maxX ? x.get() / maxX : 0, y: y.get() });
  };

  return (
    <motion.div
      className={`pin ${lifted ? "is-lifted" : ""} ${editing ? "is-editing" : ""}`}
      style={{ x, y, rotate, zIndex: lifted ? 999 : pin.z, background: COLORS[pin.color] }}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.16 } }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      drag={!editing}
      dragMomentum
      dragElastic={0.12}
      dragConstraints={{ left: 0, top: 0, right: maxX, bottom: maxY }}
      dragTransition={{ power: 0.28, timeConstant: 220, bounceStiffness: 420, bounceDamping: 20 }}
      whileDrag={{ scale: 1.05 }}
      onPointerDown={() => onFront(pin.id)}
      onDragStart={() => {
        dragging.current = true;
        setLifted(true);
      }}
      onDragEnd={() => window.setTimeout(settle, 1000)}
      onDragTransitionEnd={settle}
      onDoubleClick={() => setEditing(true)}
    >
      <div className="pin-tools">
        {COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            className={`pin-dot ${i === pin.color ? "is-on" : ""}`}
            style={{ background: c }}
            aria-label="Farbe wählen"
            onClick={() => onUpdate(pin.id, { color: i })}
          />
        ))}
        <button type="button" className="pin-del" aria-label="Zettel entfernen" onClick={() => onRemove(pin.id)}>
          <X size={13} />
        </button>
      </div>
      {editing ? (
        <textarea
          autoFocus
          className="pin-edit"
          defaultValue={pin.text}
          placeholder="Schreib was drauf …"
          maxLength={280}
          onBlur={(e) => {
            const t = e.target.value.trim();
            if (!t) onRemove(pin.id);
            else {
              onUpdate(pin.id, { text: t });
              setEditing(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) e.currentTarget.blur();
          }}
        />
      ) : (
        <p className="pin-text" title="Doppelklick zum Bearbeiten">
          {pin.text}
        </p>
      )}
    </motion.div>
  );
});
