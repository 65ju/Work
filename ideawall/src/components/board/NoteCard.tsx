import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { flushSync } from "react-dom";
import {
  animate,
  motion,
  useAnimate,
  useDragControls,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { Check, Clock, CodeXml, Flame, GraduationCap, Lightbulb, Palette, Pencil, Sun, Tag, Trash2, Undo2 } from "lucide-react";
import type { Category, Note } from "../../types";
import { CATEGORIES, CATEGORY_LABEL, COLOR_ORDER, NOTE_COLORS } from "../../data/content";
import { bus, type Point } from "../../lib/bus";
import { sfx } from "../../lib/sound";
import { fx } from "../../fx/fx";
import { runtime } from "../../lib/quality";
import { clamp, spring } from "../../lib/springs";
import { typeahead } from "../../lib/typeahead";

export const CATEGORY_ICON: Record<Category, typeof Lightbulb> = {
  ideen: Lightbulb,
  heute: Sun,
  wichtig: Flame,
  coding: CodeXml,
  lernen: GraduationCap,
  spaeter: Clock,
};

const MIN_W = 180;
const MIN_H = 140;
const MAX_W = 440;
const MAX_H = 400;

export interface NoteCardProps {
  note: Note;
  free: boolean;
  boardRef: RefObject<HTMLDivElement | null>;
  /** Innenmaße des Boards – numerische Grenzen statt Ref, damit Framer beim Wachsen des Boards nichts umskaliert. */
  bounds: { w: number; h: number };
  dimmed: boolean;
  selected: boolean;
  editing: boolean;
  spawn?: Point;
  moveDelay?: number;
  getTrashTarget: () => Point | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onFront: (id: string) => void;
  onDeleted: (note: Note) => void;
  onEmpty: (note: Note) => void;
}

export const NoteCard = memo(function NoteCard(props: NoteCardProps) {
  const { note, free, boardRef, bounds, dimmed, selected, editing, spawn, moveDelay = 0, getTrashTarget, onSelect, onEdit, onUpdate, onFront, onDeleted, onEmpty } = props;
  const reduced = runtime.reduced;
  const articleRef = useRef<HTMLElement>(null);
  const [squashScope, animateSquash] = useAnimate<HTMLDivElement>();
  const dragControls = useDragControls();

  // --- Physik-Zustand -------------------------------------------------
  const x = useMotionValue(spawn && free ? spawn.x : note.x);
  const y = useMotionValue(spawn && free ? spawn.y : note.y);
  const baseRot = useMotionValue(spawn && !reduced ? note.rot - 38 : note.rot);
  const scale = useMotionValue(spawn && !reduced ? 0.35 : 1);
  const vx = useVelocity(x);
  // Papier pendelt am Pin: Neigung folgt der horizontalen Geschwindigkeit, per Feder nachschwingend.
  const swingTarget = useTransform(vx, [-2200, 0, 2200], [-15, 0, 15], { clamp: true });
  const swing = useSpring(swingTarget, { stiffness: 260, damping: 11 });
  const rotate = useTransform(() => baseRot.get() + (free ? swing.get() : 0));

  const [lifted, setLifted] = useState(false);
  const [dying, setDying] = useState(false);
  const [shake, setShake] = useState(0);
  const [size, setSize] = useState({ w: note.w, h: note.h });
  const [menu, setMenu] = useState<null | "color" | "category">(null);
  const dragging = useRef(false);
  const busy = useRef(Boolean(spawn));
  const settled = useRef(true);

  useEffect(() => setSize({ w: note.w, h: note.h }), [note.w, note.h]);

  const land = (strength = 1) => {
    if (reduced) return;
    void animateSquash(
      squashScope.current,
      { scaleX: [1, 1 + 0.06 * strength, 0.98, 1], scaleY: [1, 1 - 0.08 * strength, 1.02, 1] },
      { duration: 0.42, times: [0, 0.25, 0.6, 1], ease: "easeOut" },
    );
  };

  // --- Erscheinen: Flug im Bogen aus dem auslösenden Button ------------
  useEffect(() => {
    if (!spawn) return;
    if (reduced || !free) {
      x.set(note.x);
      y.set(note.y);
      baseRot.set(note.rot);
      scale.set(1);
      busy.current = false;
      if (!free && !reduced) {
        void animateSquash(squashScope.current, { scale: [0.6, 1.06, 1], rotate: [-8, 2, 0] }, { duration: 0.5 });
      }
      return;
    }
    const dur = 0.72;
    const peak = Math.min(spawn.y, note.y) - 150;
    void animate(x, note.x, { duration: dur, ease: [0.25, 0.1, 0.35, 1] });
    void animate(y, [spawn.y, peak, note.y], { duration: dur, times: [0, 0.42, 1], ease: ["easeOut", "easeIn"] });
    void animate(baseRot, note.rot, { duration: dur, ease: "easeOut" });
    void animate(scale, [0.35, 1.1, 1], { duration: dur, times: [0, 0.8, 1] }).then(() => {
      busy.current = false;
      sfx.drop();
      land(1.4);
      const b = boardRef.current?.getBoundingClientRect();
      if (b) fx.burst(b.left + note.x + size.w / 2, b.top + note.y + size.h, "dust", { count: 6 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Externe Positionsänderungen (Aufräumen, Tastatur) federnd übernehmen
  useEffect(() => {
    if (!free || dragging.current || busy.current || !settled.current) return;
    if (Math.abs(x.get() - note.x) < 0.5 && Math.abs(y.get() - note.y) < 0.5) return;
    const t = { type: "spring" as const, stiffness: 170, damping: 19, delay: moveDelay };
    void animate(x, note.x, t);
    void animate(y, note.y, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.x, note.y, free]);

  useEffect(() => {
    if (busy.current) return;
    void animate(baseRot, note.rot, spring.soft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.rot]);

  // --- Erledigt-Stempel -------------------------------------------------
  const prevDone = useRef(note.done);
  const [stampKey, setStampKey] = useState(0);
  useEffect(() => {
    if (note.done && !prevDone.current) {
      setStampKey((k) => k + 1);
      window.setTimeout(() => {
        sfx.stamp();
        land(1.6);
        setShake((s) => s + 1);
        const r = articleRef.current?.getBoundingClientRect();
        if (r) fx.burst(r.left + r.width / 2, r.top + r.height / 2, "ink", { colors: ["#1f9e69", "#0b0822"] });
      }, 170);
    }
    prevDone.current = note.done;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.done]);

  // --- Kopfschütteln bei Fehlern ---------------------------------------
  useEffect(() => {
    if (!shake || reduced) return;
    void animateSquash(squashScope.current, { x: [0, -9, 8, -6, 4, 0] }, { duration: 0.42 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shake]);

  // --- Zerknüllen & in den Papierkorb werfen ---------------------------
  const destroy = async () => {
    if (dying) return;
    busy.current = true;
    setDying(true);
    setMenu(null);
    onEdit(null);
    const r = articleRef.current?.getBoundingClientRect();
    if (r) fx.burst(r.left + r.width / 2, r.top + r.height / 2, "paper", { colors: [NOTE_COLORS[note.color].base, NOTE_COLORS[note.color].hi] });
    if (reduced) {
      onDeleted(note);
      return;
    }
    sfx.crumple();
    await animateSquash(
      squashScope.current,
      { scaleX: [1, 0.78, 0.6, 0.4], scaleY: [1, 0.68, 0.52, 0.4], rotate: [0, 9, -12, 6] },
      { duration: 0.42, ease: "easeInOut" },
    );
    const target = free ? getTrashTarget() : null;
    if (!target) {
      await animateSquash(squashScope.current, { scale: 0, opacity: 0 }, { duration: 0.22 });
      onDeleted(note);
      return;
    }
    sfx.whoosh();
    const sx = x.get();
    const sy = y.get();
    const tx = target.x - size.w / 2;
    const ty = target.y - size.h / 2;
    const peak = Math.min(sy, ty) - 170 - Math.abs(tx - sx) * 0.08;
    const dur = clamp(0.4 + Math.hypot(tx - sx, ty - sy) / 2600, 0.45, 0.75);
    await Promise.all([
      animate(x, tx, { duration: dur, ease: "linear" }),
      animate(y, [sy, peak, ty], { duration: dur, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] }),
      animate(baseRot, baseRot.get() + 560, { duration: dur, ease: "linear" }),
      animate(scale, 0.72, { duration: dur }),
    ]);
    bus.emit("trash:hit");
    onDeleted(note);
  };

  // --- Bearbeiten -------------------------------------------------------
  const [draft, setDraft] = useState({ title: note.title, body: note.body });
  const titleRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (editing) {
      setDraft({ title: note.title, body: note.body });
      // Sofort fokussieren – auch während des Einflugs. Vorher Getipptes übernehmen.
      window.setTimeout(() => {
        const pre = typeahead.take();
        // flushSync: Das Input muss den Puffer enthalten, bevor der nächste Tastendruck ankommt.
        if (pre) flushSync(() => setDraft((d) => ({ ...d, title: d.title + pre })));
        const el = titleRef.current;
        el?.focus({ preventScroll: true });
        requestAnimationFrame(() => el?.setSelectionRange(el.value.length, el.value.length));
      }, 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = () => {
    if (!editing) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    onEdit(null);
    if (!title && !body) {
      setShake((s) => s + 1);
      sfx.error();
      window.setTimeout(() => onEmpty(note), 420);
      return;
    }
    if (title !== note.title || body !== note.body) {
      onUpdate(note.id, { title, body });
      const r = articleRef.current?.getBoundingClientRect();
      if (r) fx.comic(r.left + r.width / 2, r.top - 10, "GESPEICHERT!", NOTE_COLORS[note.color].base);
      sfx.pop();
    }
  };

  const toggleDone = () => {
    const done = !note.done;
    onUpdate(note.id, { done, doneAt: done ? Date.now() : undefined });
    const r = articleRef.current?.getBoundingClientRect();
    if (r) bus.emit("note:done", { x: r.left + r.width / 2, y: r.top + r.height / 2, done });
    if (!done) sfx.release();
  };

  // --- Menüs schließen bei Klick außerhalb ------------------------------
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!articleRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  // --- Tastatur ---------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (editing) {
      if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        commit();
        articleRef.current?.focus();
      }
      return;
    }
    if (e.target !== e.currentTarget) return;
    const stepSize = e.shiftKey ? 48 : 12;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-stepSize, 0], ArrowRight: [stepSize, 0], ArrowUp: [0, -stepSize], ArrowDown: [0, stepSize] };
    if (moves[e.key] && free) {
      e.preventDefault();
      const b = boardRef.current;
      const maxX = (b?.clientWidth ?? 1200) - size.w;
      const maxY = (b?.clientHeight ?? 800) - size.h;
      onUpdate(note.id, { x: clamp(note.x + moves[e.key][0], 0, maxX), y: clamp(note.y + moves[e.key][1], 0, maxY) });
    } else if (e.key === "Enter") {
      e.preventDefault();
      onEdit(note.id);
    } else if (e.key === " ") {
      e.preventDefault();
      toggleDone();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      void destroy();
    } else if (e.key === "Escape") {
      onSelect(null);
      articleRef.current?.blur();
    }
  };

  // --- Größe ändern -----------------------------------------------------
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const start = { px: e.clientX, py: e.clientY, w: size.w, h: size.h };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let latest = { w: size.w, h: size.h };
    const move = (ev: PointerEvent) => {
      latest = { w: clamp(start.w + ev.clientX - start.px, MIN_W, MAX_W), h: clamp(start.h + ev.clientY - start.py, MIN_H, MAX_H) };
      setSize(latest);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      onUpdate(note.id, latest);
      land(0.6);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const c = NOTE_COLORS[note.color];
  const Icon = CATEGORY_ICON[note.category];
  const tools = selected || editing || menu !== null;

  return (
    <motion.article
      ref={articleRef}
      className={[
        "note",
        free ? "note-free" : "note-list",
        lifted ? "is-lifted" : "",
        dying ? "is-dying" : "",
        dimmed ? "is-dimmed" : "",
        note.done ? "is-done" : "",
        tools ? "show-tools" : "",
        editing ? "is-editing" : "",
      ].join(" ")}
      style={{
        x: free ? x : undefined,
        y: free ? y : undefined,
        rotate,
        scale,
        width: free ? size.w : undefined,
        height: free ? size.h : undefined,
        minHeight: free ? undefined : 150,
        zIndex: free ? (lifted || editing || dying ? 5000 : note.z + (selected ? 2000 : 0)) : undefined,
        ["--n-hi" as string]: c.hi,
        ["--n-base" as string]: c.base,
        ["--n-shade" as string]: c.shade,
        ["--n-deep" as string]: c.deep,
      }}
      layout={free ? false : "position"}
      initial={free ? false : { opacity: 0, y: -20, scale: 0.9 }}
      animate={free ? undefined : { opacity: 1, y: 0, scale: 1 }}
      exit={free ? undefined : { opacity: 0, scale: 0.5, rotate: -12, transition: { duration: 0.22 } }}
      transition={spring.soft}
      tabIndex={0}
      aria-label={`Notiz: ${note.title || "Ohne Titel"}. Kategorie ${CATEGORY_LABEL[note.category]}${note.done ? ", erledigt" : ""}`}
      aria-roledescription="Notiz"
      drag={free && !editing && !dying}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum
      dragConstraints={{ left: 0, top: 0, right: Math.max(0, bounds.w - size.w), bottom: Math.max(0, bounds.h - size.h) }}
      dragElastic={0.18}
      dragTransition={{ power: 0.32, timeConstant: 260, bounceStiffness: 420, bounceDamping: 15 }}
      onPointerDown={(e) => {
        onFront(note.id);
        if (!selected) onSelect(note.id);
        if (!free || editing || dying) return;
        if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
        dragControls.start(e);
      }}
      onDragStart={() => {
        dragging.current = true;
        settled.current = false;
        setLifted(true);
        setMenu(null);
        sfx.pick();
      }}
      onDragEnd={() => {
        dragging.current = false;
        window.setTimeout(() => settle(), 1400);
      }}
      onDragTransitionEnd={() => settle()}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
        onEdit(note.id);
      }}
      onKeyDown={onKeyDown}
      onFocus={() => onSelect(note.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          if (editing) commit();
        }
      }}
    >
      <div className="note-shadow" aria-hidden />
      <div ref={squashScope} className="note-squash">
        <div className="note-paper">
          {note.pin === "pin" ? <Pin /> : <span className="note-tape" aria-hidden />}
          <div className="note-head">
            <span className="note-cat">
              <Icon className="size-3.5" strokeWidth={2.8} aria-hidden />
              {CATEGORY_LABEL[note.category]}
            </span>
            {note.done && <Check className="size-4 note-done-tick" strokeWidth={3.4} aria-hidden />}
          </div>

          {editing ? (
            <div className="note-edit" data-nodrag>
              <input
                ref={titleRef}
                className="note-input"
                value={draft.title}
                placeholder="Titel …"
                maxLength={80}
                aria-label="Titel der Notiz"
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    (e.currentTarget.nextElementSibling as HTMLTextAreaElement | null)?.focus();
                  }
                }}
              />
              <textarea
                className="note-textarea"
                value={draft.body}
                placeholder="Was geht dir durch den Kopf? (Esc speichert)"
                maxLength={600}
                aria-label="Text der Notiz"
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              />
            </div>
          ) : (
            <div className="note-content">
              <h3 className="note-title">{note.title || <em>Ohne Titel</em>}</h3>
              {note.body && <p className="note-body">{note.body}</p>}
            </div>
          )}

          {stampKey > 0 && note.done && (
            <motion.span
              key={stampKey}
              className="note-stamp"
              initial={reduced ? false : { scale: 2.6, opacity: 0, rotate: -34 }}
              animate={{ scale: 1, opacity: 1, rotate: -14 }}
              transition={{ type: "spring", stiffness: 700, damping: 17 }}
              aria-hidden
            >
              Erledigt
            </motion.span>
          )}
          {stampKey === 0 && note.done && (
            <span className="note-stamp" aria-hidden>
              Erledigt
            </span>
          )}
          <span className="note-curl" aria-hidden />
          <span className="note-crease" aria-hidden />
        </div>
      </div>

      <div className="note-tools" data-nodrag>
        <ToolButton label={editing ? "Speichern" : "Bearbeiten"} onClick={() => (editing ? commit() : onEdit(note.id))}>
          {editing ? <Check className="size-4" strokeWidth={3} /> : <Pencil className="size-4" strokeWidth={2.6} />}
        </ToolButton>
        <ToolButton label="Farbe ändern" active={menu === "color"} onClick={() => setMenu((m) => (m === "color" ? null : "color"))}>
          <Palette className="size-4" strokeWidth={2.6} />
        </ToolButton>
        <ToolButton label="Kategorie wählen" active={menu === "category"} onClick={() => setMenu((m) => (m === "category" ? null : "category"))}>
          <Tag className="size-4" strokeWidth={2.6} />
        </ToolButton>
        <ToolButton label={note.done ? "Als offen markieren" : "Als erledigt markieren"} tone="done" onClick={toggleDone}>
          {note.done ? <Undo2 className="size-4" strokeWidth={2.6} /> : <Check className="size-4" strokeWidth={3} />}
        </ToolButton>
        <ToolButton label="Notiz löschen" tone="danger" onClick={() => void destroy()}>
          <Trash2 className="size-4" strokeWidth={2.6} />
        </ToolButton>
      </div>

      {menu === "color" && (
        <motion.div
          className="note-menu"
          data-nodrag
          role="menu"
          aria-label="Farbe wählen"
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring.bouncy}
        >
          {COLOR_ORDER.map((col) => (
            <button
              key={col}
              type="button"
              role="menuitemradio"
              aria-checked={note.color === col}
              aria-label={NOTE_COLORS[col].label}
              className={`swatch ${note.color === col ? "is-active" : ""}`}
              style={{ ["--sw" as string]: NOTE_COLORS[col].base, ["--sw-shade" as string]: NOTE_COLORS[col].shade }}
              onClick={() => {
                onUpdate(note.id, { color: col });
                sfx.pop();
                land(0.7);
                setMenu(null);
              }}
            />
          ))}
        </motion.div>
      )}
      {menu === "category" && (
        <motion.div
          className="note-menu note-menu-cats"
          data-nodrag
          role="menu"
          aria-label="Kategorie wählen"
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring.bouncy}
        >
          {CATEGORIES.map((cat) => {
            const CatIcon = CATEGORY_ICON[cat.key];
            return (
              <button
                key={cat.key}
                type="button"
                role="menuitemradio"
                aria-checked={note.category === cat.key}
                className={`cat-option ${note.category === cat.key ? "is-active" : ""}`}
                onClick={() => {
                  onUpdate(note.id, { category: cat.key });
                  sfx.pop();
                  setMenu(null);
                }}
              >
                <CatIcon className="size-3.5" strokeWidth={2.8} />
                {cat.label}
              </button>
            );
          })}
        </motion.div>
      )}

      {free && !editing && <div className="note-resize" data-nodrag onPointerDown={startResize} aria-hidden />}
    </motion.article>
  );

  function settle() {
    if (settled.current || dying) return;
    settled.current = true;
    setLifted(false);
    const nx = x.get();
    const ny = y.get();
    sfx.drop();
    land(1);
    const b = boardRef.current?.getBoundingClientRect();
    if (b) {
      fx.burst(b.left + nx + size.w / 2, b.top + ny + size.h, "dust", { count: 4, power: 0.8 });
      bus.emit("note:landed", { x: b.left + nx + size.w / 2, y: b.top + ny });
    }
    onUpdate(note.id, { x: Math.round(nx), y: Math.round(ny) });
  }
});

function ToolButton({ label, onClick, children, active, tone }: { label: string; onClick: () => void; children: ReactNode; active?: boolean; tone?: string }) {
  return (
    <button
      type="button"
      className={`tool-btn ${tone ? `tool-${tone}` : ""} ${active ? "is-active" : ""}`}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function Pin() {
  return (
    <svg className="note-pin" viewBox="0 0 40 44" aria-hidden>
      <path d="M20 26 L20 42" className="pin-needle" />
      <ellipse cx="20" cy="30" rx="9" ry="3" className="pin-shadow" />
      <circle cx="20" cy="17" r="13" className="pin-head" />
      <path d="M 29 8 A 13 13 0 0 1 11 27 A 15 15 0 0 0 29 8 Z" className="pin-shade" />
      <ellipse cx="15" cy="11.5" rx="4.5" ry="2.6" transform="rotate(-35 15 11.5)" className="pin-hi" />
      <circle cx="20" cy="17" r="13" className="pin-outline" />
    </svg>
  );
}
