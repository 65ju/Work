import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck, LayoutGrid, Plus, Search, StickyNote, X } from "lucide-react";
import type { Category, FilterKey, Note } from "../../types";
import { CATEGORIES, CATEGORY_LABEL, COLOR_ORDER } from "../../data/content";
import { useNotes } from "../../state/notes";
import { useSettings } from "../../state/settings";
import { bus, centerOf, type Point } from "../../lib/bus";
import { arrangeShelves, BOARD_PAD, findFreeSpot } from "../../lib/geometry";
import { uid } from "../../lib/storage";
import { pick, rand } from "../../lib/springs";
import { sfx } from "../../lib/sound";
import { fx } from "../../fx/fx";
import { useIsDesktopBoard } from "../../lib/useMedia";
import { typeahead } from "../../lib/typeahead";
import { CATEGORY_ICON, NoteCard } from "./NoteCard";
import { TrashCan } from "./TrashCan";

const NEW_SIZE = { w: 236, h: 188 };
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export function Board() {
  const { notes, add, update, remove, restore, bringToFront, bulk } = useNotes();
  const { reduced } = useSettings();
  const free = useIsDesktopBoard();
  const boardRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [boardW, setBoardW] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("alle");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [listSort, setListSort] = useState<"recent" | "category">("recent");
  // Startpunkte für den Einflug neuer Notizen – nur kurz gültig, damit Re-Mounts nicht erneut fliegen.
  const spawns = useRef(new Map<string, { p: Point; t: number }>());
  const delays = useRef<Record<string, number>>({});

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoardW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [free]);

  // --- Notizen, die über den rechten Rand ragen (kleineres Fenster), einpassen
  const notesRef = useRef(notes);
  notesRef.current = notes;
  useEffect(() => {
    if (!free || boardW < 300) return;
    const all = notesRef.current;
    const limit = boardW - 10;
    if (!all.some((n) => n.x + n.w > limit)) return;
    delays.current = {};
    if (boardW < 1000) {
      bulk(arrangeShelves(all, boardW));
      return;
    }
    const maxX = Math.max(...all.map((n) => n.x));
    const widest = Math.max(...all.map((n) => n.w));
    const f = Math.min(1, (limit - widest) / Math.max(1, maxX));
    bulk(Object.fromEntries(all.map((n) => [n.id, { x: Math.round(Math.max(BOARD_PAD, Math.min(n.x * f, limit - n.w))) }])));
  }, [boardW, free, bulk]);

  // --- Filter & Suche ---------------------------------------------------
  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (n: Note) => {
      const inFilter = filter === "alle" ? true : filter === "erledigt" ? n.done : n.category === filter;
      const inQuery = !q || `${n.title} ${n.body} ${CATEGORY_LABEL[n.category]}`.toLowerCase().includes(q);
      return inFilter && inQuery;
    },
    [filter, q],
  );
  const matchCount = notes.filter(matches).length;

  useEffect(() => {
    if (!q || matchCount > 0) return;
    const t = window.setTimeout(() => bus.emit("board:search-empty"), 650);
    return () => window.clearTimeout(t);
  }, [q, matchCount]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { alle: notes.length, erledigt: notes.filter((n) => n.done).length };
    for (const cat of CATEGORIES) c[cat.key] = notes.filter((n) => n.category === cat.key).length;
    return c;
  }, [notes]);

  const boardHeight = useMemo(() => Math.max(620, ...notes.map((n) => n.y + n.h + 170)), [notes]);
  const bounds = useMemo(() => ({ w: boardW, h: boardHeight - 6 }), [boardW, boardHeight]);

  // --- Neue Notiz -------------------------------------------------------
  const createNote = useCallback(
    async (opts: { from?: Point; title?: string; body?: string; category?: Category }) => {
      const board = boardRef.current;
      if (!board) return;
      if (!opts.title) typeahead.start();
      let from = opts.from;
      let rect = board.getBoundingClientRect();
      const visible = rect.top < window.innerHeight * 0.55 && rect.bottom > 260;
      if (!visible) {
        board.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        await wait(reduced ? 30 : 620);
        rect = board.getBoundingClientRect();
        from = { x: window.innerWidth / 2, y: -80 };
      }
      const category: Category = opts.category ?? (filter !== "alle" && filter !== "erledigt" ? filter : "ideen");
      const regionTop = Math.max(0, -rect.top + 70);
      const pos = free
        ? findFreeSpot(notes, rect.width, NEW_SIZE, regionTop, regionTop + window.innerHeight * 0.5)
        : { x: 0, y: 0 };
      const catColor = CATEGORIES.find((c) => c.key === category)?.color;
      const note: Note = {
        id: uid(),
        title: opts.title ?? "",
        body: opts.body ?? "",
        color: opts.title ? (catColor ?? pick(COLOR_ORDER)) : pick(COLOR_ORDER),
        category,
        done: false,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        w: NEW_SIZE.w,
        h: NEW_SIZE.h,
        rot: Number(rand(-3.5, 3.5).toFixed(2)),
        pin: Math.random() < 0.5 ? "pin" : "tape",
        z: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const now = performance.now();
      spawns.current.forEach((v, k) => now - v.t > 2000 && spawns.current.delete(k));
      spawns.current.set(note.id, {
        p: from ? { x: from.x - rect.left - NEW_SIZE.w / 2, y: from.y - rect.top - NEW_SIZE.h / 2 } : { x: pos.x, y: pos.y - 60 },
        t: now,
      });
      if (query) setQuery("");
      if (filter !== "alle" && filter !== category) setFilter("alle");
      if (!free) setListSort("recent");
      add(note);
      setSelected(note.id);
      if (!opts.title) setEditing(note.id);
      sfx.whoosh();
      bus.emit("note:created", free ? { x: rect.left + pos.x + NEW_SIZE.w / 2, y: rect.top + pos.y + NEW_SIZE.h / 2 } : { x: window.innerWidth / 2, y: rect.top + 80 });
    },
    [add, filter, free, notes, query, reduced],
  );

  useEffect(() => bus.on("note:new", (o) => void createNote(o ?? {})), [createNote]);

  // --- Aufräumen --------------------------------------------------------
  useEffect(
    () =>
      bus.on("board:arrange", () => {
        if (!notes.length) {
          fx.toast("Das Board ist schon blitzblank.", "info");
          return;
        }
        if (free) {
          const patches = arrangeShelves(notes, boardRef.current?.clientWidth ?? boardW);
          const ids = Object.keys(patches);
          delays.current = Object.fromEntries(ids.map((id, i) => [id, reduced ? 0 : i * 0.04]));
          bulk(patches);
        } else {
          setListSort("category");
        }
        setQuery("");
        setFilter("alle");
        setEditing(null);
        const board = boardRef.current;
        if (board) {
          const r = board.getBoundingClientRect();
          if (r.top > window.innerHeight * 0.6 || r.bottom < 200) board.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        }
        fx.toast(`Board aufgeräumt – ${notes.length} Notizen nach Kategorie sortiert.`, "success");
        bus.emit("board:arranged");
      }),
    [notes, free, boardW, bulk, reduced],
  );

  useEffect(() => bus.on("search:focus", () => {
    searchRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    searchRef.current?.focus({ preventScroll: true });
  }), [reduced]);

  // --- Löschen mit Rückgängig -------------------------------------------
  const getTrashTarget = useCallback((): Point | null => {
    const t = trashRef.current?.getBoundingClientRect();
    const b = boardRef.current?.getBoundingClientRect();
    if (!t || !b) return null;
    return { x: t.left - b.left + t.width / 2, y: t.top - b.top + t.height * 0.45 };
  }, []);

  const onDeleted = useCallback(
    (note: Note) => {
      remove(note.id);
      setSelected((s) => (s === note.id ? null : s));
      const b = boardRef.current?.getBoundingClientRect();
      const t = trashRef.current?.getBoundingClientRect();
      bus.emit("note:deleted", t ? { x: t.left + t.width / 2, y: t.top } : { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      fx.toast(`„${note.title || "Ohne Titel"}“ gelöscht.`, "info", {
        label: "Rückgängig",
        run: () => {
          const target = getTrashTarget();
          if (target && b) spawns.current.set(note.id, { p: { x: target.x - note.w / 2, y: target.y - note.h / 2 }, t: performance.now() });
          restore(note);
          sfx.pop();
        },
      }, 6000);
    },
    [remove, restore, getTrashTarget],
  );

  const onEmpty = useCallback(
    (note: Note) => {
      remove(note.id);
      const b = boardRef.current?.getBoundingClientRect();
      bus.emit("ui:error", { x: b ? b.left + note.x + note.w / 2 : window.innerWidth / 2, y: b ? b.top + note.y : 300, message: "Leere Notiz?" });
      fx.toast("Leere Notiz entfernt – schreib einfach etwas hinein.", "error");
    },
    [remove],
  );

  const onEdit = useCallback((id: string | null) => setEditing(id), []);
  const onSelect = useCallback((id: string | null) => setSelected(id), []);

  const listNotes = useMemo(() => {
    const order = new Map(CATEGORIES.map((c, i) => [c.key, i]));
    return notes
      .filter(matches)
      .sort((a, b) =>
        listSort === "category"
          ? Number(a.done) - Number(b.done) || (order.get(a.category) ?? 0) - (order.get(b.category) ?? 0)
          : Number(a.done) - Number(b.done) || b.createdAt - a.createdAt,
      );
  }, [notes, matches, listSort]);

  const filters: { key: FilterKey; label: string }[] = [{ key: "alle", label: "Alle" }, ...CATEGORIES.map((c) => ({ key: c.key as FilterKey, label: c.label })), { key: "erledigt", label: "Erledigt" }];

  const renderCard = (n: Note, isFree: boolean) => {
    const s = spawns.current.get(n.id);
    const spawn = s && performance.now() - s.t < 1500 ? s.p : undefined;
    return (
      <NoteCard
        key={n.id}
        note={n}
        free={isFree}
        boardRef={boardRef}
        bounds={bounds}
        dimmed={isFree && !matches(n)}
        selected={selected === n.id}
        editing={editing === n.id}
        spawn={spawn}
        moveDelay={delays.current[n.id]}
        getTrashTarget={getTrashTarget}
        onSelect={onSelect}
        onEdit={onEdit}
        onUpdate={update}
        onFront={bringToFront}
        onDeleted={onDeleted}
        onEmpty={onEmpty}
      />
    );
  };

  return (
    <section id="board" className="board-section" aria-labelledby="board-title">
      <header className="board-head">
        <div className="flex items-center gap-3">
          <span className="panel-icon panel-icon-magenta">
            <StickyNote className="size-5" strokeWidth={2.6} />
          </span>
          <div>
            <h2 id="board-title" className="panel-title text-2xl md:text-3xl">
              Workspace-Board
            </h2>
            <p className="panel-sub">
              {free ? "Ziehen, werfen, stapeln – alles wird automatisch gespeichert." : "Tippe auf eine Notiz, um sie zu bearbeiten."}
            </p>
          </div>
        </div>
        <div className="board-head-actions">
          <button
            type="button"
            className="cel-btn cel-btn-ghost"
            onClick={() => bus.emit("board:arrange")}
            title="Board aufräumen (A)"
          >
            <LayoutGrid className="size-4" strokeWidth={2.6} />
            <span className="hidden sm:inline">Aufräumen</span>
          </button>
          <button
            type="button"
            className="cel-btn cel-btn-primary"
            onClick={(e) => void createNote({ from: centerOf(e.currentTarget) })}
            title="Neue Notiz (N)"
          >
            <Plus className="size-5" strokeWidth={3} />
            Neue Notiz
          </button>
        </div>
      </header>

      <div className="board-toolbar">
        <label className="search">
          <Search className="size-4 shrink-0" strokeWidth={2.8} aria-hidden />
          <span className="sr-only">Notizen durchsuchen</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Notizen durchsuchen …"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
          />
          {query && (
            <button type="button" className="search-clear" aria-label="Suche leeren" onClick={() => setQuery("")}>
              <X className="size-4" strokeWidth={3} />
            </button>
          )}
          <kbd className="search-kbd" aria-hidden>
            /
          </kbd>
        </label>
        <div className="filter-row" role="group" aria-label="Nach Kategorie filtern">
          {filters.map((f) => {
            const Icon = f.key === "alle" ? LayoutGrid : f.key === "erledigt" ? CheckCheck : CATEGORY_ICON[f.key as Category];
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                className={`filter-chip filter-${f.key} ${active ? "is-active" : ""}`}
                aria-pressed={active}
                onClick={() => {
                  setFilter(f.key);
                  sfx.pop();
                }}
              >
                {active && <motion.span layoutId="filter-pill" className="filter-pill" transition={{ type: "spring", stiffness: 500, damping: 32 }} />}
                <Icon className="size-3.5 relative" strokeWidth={2.8} aria-hidden />
                <span className="relative">{f.label}</span>
                <span className="filter-count relative">{counts[f.key] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <p className="board-result" aria-live="polite">
          {q || filter !== "alle" ? `${matchCount} von ${notes.length} Notizen` : `${notes.length} Notizen`}
        </p>
      </div>

      {free ? (
        <div className="board-frame">
          <span className="screw screw-tl" />
          <span className="screw screw-tr" />
          <span className="screw screw-bl" />
          <span className="screw screw-br" />
          <div
            ref={boardRef}
            className="board-surface"
            style={{ height: boardHeight }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelected(null);
              }
            }}
            onDoubleClick={(e) => {
              if (e.target === e.currentTarget) void createNote({ from: { x: e.clientX, y: e.clientY } });
            }}
          >
            {notes.map((n) => renderCard(n, true))}
            {notes.length === 0 && <EmptyBoard />}
            {q && matchCount === 0 && (
              <div className="board-noresult">
                Nichts gefunden für „{query}“. <button type="button" onClick={() => setQuery("")}>Suche leeren</button>
              </div>
            )}
            <TrashCan ref={trashRef} />
          </div>
        </div>
      ) : (
        <div className="board-list-wrap" ref={boardRef}>
          <ul className="note-grid">
            <AnimatePresence mode="popLayout" initial={false}>
              {listNotes.map((n) => (
                <li key={n.id} className="note-grid-item">
                  {renderCard(n, false)}
                </li>
              ))}
            </AnimatePresence>
          </ul>
          {listNotes.length === 0 && (notes.length === 0 ? <EmptyBoard /> : <div className="board-noresult static">Keine Notizen für diese Auswahl.</div>)}
        </div>
      )}
    </section>
  );
}

function EmptyBoard() {
  return (
    <div className="board-empty">
      <StickyNote className="size-10" strokeWidth={2.2} aria-hidden />
      <p className="font-display text-xl">Noch ganz leer hier.</p>
      <p>
        Drück <kbd>N</kbd> oder den Button „Neue Notiz“ – Byte ist schon neugierig.
      </p>
    </div>
  );
}
