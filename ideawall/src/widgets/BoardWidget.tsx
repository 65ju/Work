import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { usePersistent } from "../lib/usePersistent";
import { uid } from "../lib/storage";
import { sfx } from "../lib/sfx";
import { toast } from "../lib/toast";
import { fx } from "../cursor/fx";

interface Pin {
  id: string;
  text: string;
  /** horizontale Position als Anteil der freien Breite */
  fx: number;
  y: number;
  color: number;
  rot: number;
  z: number;
}

const PAPERS = ["#ffe98a", "#bdf2d5", "#c6e2ff", "#ffd1df", "#e1d3ff", "#f4f0e6"];
const PIN_W = 196;
const PIN_H = 158;
const BOARD_H = 460;

type Phase = "idle" | "fresh" | "dying";

export const BoardWidget = memo(function BoardWidget() {
  const [pins, setPins] = usePersistent<Pin[]>("pins-v3", []);
  const ref = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overTrash, setOverTrash] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const fresh = useRef(new Set<string>());

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
      outer: for (let y = 22; y <= maxY; y += 34) {
        for (let x = 22; x <= maxX; x += 40) {
          if (!pins.some((p) => Math.abs(p.fx * maxX - x) < PIN_W - 30 && Math.abs(p.y - y) < PIN_H - 30)) {
            spot = { x, y };
            break outer;
          }
        }
      }
    }
    spot ??= { x: 20 + Math.random() * (maxX - 40), y: 20 + Math.random() * (maxY - 40) };
    const x = Math.min(maxX, Math.max(0, spot.x));
    const y = Math.min(maxY, Math.max(0, spot.y));
    const id = uid();
    fresh.current.add(id);
    setPins((ps) => [
      ...ps,
      {
        id,
        text: "",
        fx: maxX ? x / maxX : 0,
        y,
        color: ps.length % PAPERS.length,
        rot: Math.round((Math.random() * 6 - 3) * 10) / 10,
        z: ps.reduce((m, p) => Math.max(m, p.z), 0) + 1,
      },
    ]);
    sfx.whoosh();
  };

  const update = useCallback((id: string, patch: Partial<Pin>) => setPins((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p))), [setPins]);

  const remove = useCallback(
    (pin: Pin, silent = false) => {
      setPins((ps) => ps.filter((p) => p.id !== pin.id));
      setShowTrash(false);
      if (!silent && pin.text) {
        toast("Zettel entsorgt", "trash", 6000, {
          label: "Rückgängig",
          run: () => {
            fresh.current.add(pin.id);
            setPins((ps) => [...ps, { ...pin, z: ps.reduce((m, p) => Math.max(m, p.z), 0) + 1 }]);
            sfx.whoosh();
          },
        });
      }
    },
    [setPins],
  );

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

  /** Mittelpunkt des Papierkorbs in Board-Koordinaten. */
  const trashPoint = useCallback(() => {
    const b = ref.current?.getBoundingClientRect();
    const t = trashRef.current?.getBoundingClientRect();
    if (!b) return { x: 0, y: 0 };
    if (!t) return { x: b.width - 50, y: BOARD_H - 50 };
    return { x: t.left - b.left + t.width / 2, y: t.top - b.top + t.height / 2 };
  }, []);

  const checkTrash = useCallback((clientX: number, clientY: number) => {
    const t = trashRef.current?.getBoundingClientRect();
    const over = !!t && clientX > t.left - 30 && clientX < t.right + 30 && clientY > t.top - 30 && clientY < t.bottom + 30;
    setOverTrash((o) => (o === over ? o : over));
    return over;
  }, []);

  const trashVisible = dragging !== null || showTrash;

  return (
    <div className="board-wrap">
      <div
        ref={ref}
        className={`board ${dragging ? "is-active" : ""}`}
        style={{ height: BOARD_H }}
        onDoubleClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const r = e.currentTarget.getBoundingClientRect();
          add({ x: e.clientX - r.left - PIN_W / 2, y: e.clientY - r.top - 24 });
        }}
      >
        <AnimatePresence>
          {pins.length === 0 && (
            <motion.button
              type="button"
              className="board-empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => add()}
            >
              <Plus size={22} />
              Zettel
            </motion.button>
          )}
        </AnimatePresence>

        {w > 0 &&
          pins.map((p) => (
            <PinNote
              key={p.id}
              pin={p}
              maxX={maxX}
              maxY={maxY}
              fresh={fresh.current.has(p.id)}
              onFreshDone={() => fresh.current.delete(p.id)}
              onUpdate={update}
              onRemove={remove}
              onFront={front}
              onDragState={(d) => {
                setDragging(d ? p.id : null);
                if (!d) setOverTrash(false);
              }}
              onDragMove={checkTrash}
              trashPoint={trashPoint}
              showTrash={() => setShowTrash(true)}
            />
          ))}

        {pins.length > 0 && (
          <button type="button" className="board-add" aria-label="Neuer Zettel" title="Neuer Zettel" onClick={() => add()}>
            <Plus size={18} />
          </button>
        )}

        <AnimatePresence>
          {trashVisible && (
            <motion.div
              ref={trashRef}
              className={`trash ${overTrash ? "is-over" : ""}`}
              initial={{ opacity: 0, scale: 0.4, y: 20 }}
              animate={{ opacity: 1, scale: overTrash ? 1.25 : 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              aria-hidden
            >
              <motion.span animate={{ rotate: overTrash ? -18 : 0, y: overTrash ? -3 : 0 }} transition={{ type: "spring", stiffness: 600, damping: 14 }}>
                <Trash2 size={22} />
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
});

interface PinProps {
  pin: Pin;
  maxX: number;
  maxY: number;
  fresh: boolean;
  onFreshDone: () => void;
  onUpdate: (id: string, patch: Partial<Pin>) => void;
  onRemove: (pin: Pin, silent?: boolean) => void;
  onFront: (id: string) => void;
  onDragState: (dragging: boolean) => void;
  onDragMove: (x: number, y: number) => boolean;
  trashPoint: () => { x: number; y: number };
  showTrash: () => void;
}

const PinNote = memo(function PinNote({ pin, maxX, maxY, fresh, onFreshDone, onUpdate, onRemove, onFront, onDragState, onDragMove, trashPoint, showTrash }: PinProps) {
  const [editing, setEditing] = useState(pin.text === "");
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);
  const [phase, setPhase] = useState<Phase>(fresh ? "fresh" : "idle");
  const el = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const released = useRef(false);
  const overTrash = useRef(false);
  const lastBump = useRef(0);

  const x = useMotionValue(pin.fx * maxX);
  const y = useMotionValue(Math.min(pin.y, maxY));
  const scale = useMotionValue(fresh ? 0.3 : 1);
  /** Eigene Größe fürs Drücken, damit Klick-Feedback nie andere Animationen unterbricht. */
  const press = useMotionValue(1);
  const extraRot = useMotionValue(fresh ? -24 : 0);

  // Höhe über dem Board (0 = liegt auf, 1 = in der Hand). Die Feder schwingt beim Landen leicht durch.
  const lift = useMotionValue(fresh ? 1 : 0);
  const liftS = useSpring(lift, { stiffness: 420, damping: 17, mass: 0.9 });
  const lifted = useTransform(liftS, [-0.25, 0, 1], [0.985, 1, 1.055]);
  const sx = useTransform(liftS, [-0.25, 0], [1.03, 1], { clamp: true });
  const sy = useTransform(liftS, [-0.25, 0], [0.95, 1], { clamp: true });
  const contactOpacity = useTransform(liftS, [0, 0.6], [0.55, 0], { clamp: true });
  const softX = useTransform(liftS, [0, 1], [3, 16]);
  const softY = useTransform(liftS, [0, 1], [6, 30]);
  const softOpacity = useTransform(liftS, [0, 1], [0.35, 0.5]);
  const softScale = useTransform(liftS, [0, 1], [0.97, 1.03]);
  const pinY = useTransform(liftS, [0, 1], [0, -9]);
  const pinScale = useTransform(liftS, [0, 1], [1, 1.14]);
  const pinShadowX = useTransform(liftS, [0, 1], [2, 9]);
  const pinShadowY = useTransform(liftS, [0, 1], [3, 12]);

  // Pendeln um die Pinnadel: Neigung folgt der horizontalen Geschwindigkeit.
  const vx = useVelocity(x);
  const swing = useSpring(useTransform(vx, [-1800, 0, 1800], [-14, 0, 14], { clamp: true }), { stiffness: 240, damping: 13 });
  const rotate = useTransform(() => pin.rot + swing.get() + extraRot.get());
  const scaleAll = useTransform(() => scale.get() * press.get() * lifted.get());

  useEffect(() => {
    if (dragging.current || released.current) return;
    x.set(pin.fx * maxX);
    y.set(Math.min(pin.y, maxY));
  }, [pin.fx, pin.y, maxX, maxY, x, y]);

  const center = () => {
    const r = el.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, bottom: r.bottom, left: r.left, right: r.right } : null;
  };

  const land = (sound = true) => {
    // Kurz „durchfedern“: Die Feder schwingt unter null → Papier staucht sich beim Aufsetzen.
    lift.set(-0.24);
    window.setTimeout(() => lift.set(0), 70);
    if (sound) {
      sfx.drop();
      window.setTimeout(sfx.pin, 110);
    }
    const c = center();
    if (c) {
      fx.dust(c.left + 20, c.bottom - 4, 4);
      fx.dust(c.right - 20, c.bottom - 4, 4);
    }
  };

  // Neuer Zettel: fliegt ein, dreht sich ein und landet.
  useEffect(() => {
    if (!fresh) return;
    onFreshDone();
    void animate(scale, 1, { type: "spring", stiffness: 380, damping: 18 });
    void animate(extraRot, 0, { type: "spring", stiffness: 220, damping: 14 });
    const t = window.setTimeout(() => {
      land();
      setPhase("idle");
    }, 320);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aufprall am Board-Rand nach einem Wurf
  useEffect(() => {
    const check = () => {
      if (!released.current) return;
      const now = performance.now();
      if (now - lastBump.current < 140) return;
      const px = x.get();
      const py = y.get();
      const hitX = px <= 0.5 || px >= maxX - 0.5;
      const hitY = py <= 0.5 || py >= maxY - 0.5;
      if (!hitX && !hitY) return;
      const speed = Math.hypot(x.getVelocity(), y.getVelocity());
      if (speed < 250) return;
      lastBump.current = now;
      sfx.bump();
      void animate(scale, [1, hitX ? 0.94 : 1.03, 1], { duration: 0.28 });
      const c = center();
      if (c) fx.dust(hitX ? (px <= 0.5 ? c.left : c.right) : c.x, hitY ? (py <= 0.5 ? c.y - PIN_H / 2 : c.bottom) : c.y, 5);
    };
    const u1 = x.on("change", check);
    const u2 = y.on("change", check);
    return () => {
      u1();
      u2();
    };
  }, [x, y, maxX, maxY, scale]);

  const settle = () => {
    if (!released.current) return;
    released.current = false;
    onUpdate(pin.id, { fx: maxX ? x.get() / maxX : 0, y: y.get() });
    land();
  };

  /** Zerknüllen und in den Papierkorb werfen. */
  const destroy = async () => {
    if (phase === "dying") return;
    setPhase("dying");
    setEditing(false);
    showTrash();
    sfx.crumple();
    const c = center();
    if (c) fx.paper(c.x, c.y, PAPERS[pin.color], 10);
    lift.set(0.6);
    await animate(scale, 0.42, { duration: 0.28, ease: [0.5, 0, 0.75, 0] });
    await new Promise((r) => window.setTimeout(r, 60));
    const target = trashPoint();
    const syp = y.get();
    const tx = target.x - PIN_W / 2;
    const ty = target.y - PIN_H / 2;
    sfx.whoosh();
    await Promise.all([
      animate(x, tx, { duration: 0.42, ease: "linear" }),
      animate(y, [syp, Math.min(syp, ty) - 90, ty], { duration: 0.42, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] }),
      animate(extraRot, 320, { duration: 0.42 }),
      animate(scale, 0.18, { duration: 0.42 }),
    ]);
    sfx.bin();
    onRemove(pin);
  };

  const paper = PAPERS[pin.color];

  return (
    <motion.div
      ref={el}
      className={`note ${phase === "dying" ? "is-dying" : ""} ${editing ? "is-editing" : ""}`}
      style={{ x, y, rotate, scale: scaleAll, zIndex: phase === "dying" ? 9999 : pin.z, ["--paper" as string]: paper }}
      tabIndex={0}
      aria-label={pin.text || "Leerer Zettel"}
      drag={!editing && phase !== "dying"}
      dragMomentum
      dragElastic={0.14}
      dragConstraints={{ left: 0, top: 0, right: maxX, bottom: maxY }}
      dragTransition={{ power: 0.3, timeConstant: 230, bounceStiffness: 460, bounceDamping: 16 }}
      onPointerEnter={() => {
        setHover(true);
        if (!dragging.current && phase === "idle") lift.set(0.16);
      }}
      onPointerLeave={() => {
        setHover(false);
        if (!dragging.current && !released.current && phase === "idle") lift.set(0);
      }}
      onPointerDown={() => {
        onFront(pin.id);
        if (editing) return;
        sfx.tap();
        void animate(press, 0.975, { duration: 0.08 });
      }}
      onPointerUp={() => void animate(press, 1, { type: "spring", stiffness: 600, damping: 15 })}
      onDragStart={() => {
        dragging.current = true;
        setHeld(true);
        released.current = false;
        onDragState(true);
        lift.set(1);
        void animate(press, 1, { type: "spring", stiffness: 500, damping: 18 });
        sfx.lift();
      }}
      onDrag={(_, info) => {
        const over = onDragMove(info.point.x - window.scrollX, info.point.y - window.scrollY);
        if (over !== overTrash.current) {
          // Vorschau: Über dem Papierkorb schrumpft der Zettel schon ein wenig.
          void animate(scale, over ? 0.8 : 1, { type: "spring", stiffness: 500, damping: 22 });
          if (over) sfx.tap();
        }
        overTrash.current = over;
      }}
      onDragEnd={() => {
        dragging.current = false;
        setHeld(false);
        onDragState(false);
        if (overTrash.current) {
          overTrash.current = false;
          released.current = false;
          void destroy();
          return;
        }
        released.current = true;
        window.setTimeout(settle, 1100);
      }}
      onDragTransitionEnd={settle}
      onDoubleClick={() => phase === "idle" && setEditing(true)}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === "Delete" || e.key === "Backspace") void destroy();
        if (e.key === "Enter") {
          e.preventDefault();
          setEditing(true);
        }
      }}
    >
      <motion.span className="note-shadow soft" style={{ x: softX, y: softY, opacity: softOpacity, scale: softScale }} />
      <motion.span className="note-shadow contact" style={{ opacity: contactOpacity }} />

      <motion.div className="note-paper" style={{ scaleX: sx, scaleY: sy }}>
        {editing ? (
          <textarea
            autoFocus
            className="note-edit"
            defaultValue={pin.text}
            maxLength={220}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              const t = e.target.value.trim();
              setEditing(false);
              if (!t) {
                void destroy();
                return;
              }
              if (t !== pin.text) {
                onUpdate(pin.id, { text: t });
                sfx.pop();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <p className="note-text">{pin.text}</p>
        )}
        <span className="note-crease" />
        <span className="note-curl" />
      </motion.div>

      <motion.span className="pushpin" style={{ y: pinY, scale: pinScale }}>
        <motion.span className="pp-shadow" style={{ x: pinShadowX, y: pinShadowY }} />
        <span className="pp-head" />
      </motion.span>

      <AnimatePresence>
        {hover && !held && !editing && phase === "idle" && (
          <motion.div
            className="note-tools glass-chip"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {PAPERS.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`paper-dot ${i === pin.color ? "is-on" : ""}`}
                style={{ background: c }}
                aria-label="Papierfarbe"
                onClick={() => {
                  onUpdate(pin.id, { color: i });
                  sfx.pop();
                  const cc = center();
                  if (cc) fx.sparks(cc.x, cc.y - PIN_H / 2, c, 8);
                }}
              />
            ))}
            <span className="tools-sep" />
            <button type="button" className="tool-del" aria-label="Zettel entsorgen" onClick={() => void destroy()}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
