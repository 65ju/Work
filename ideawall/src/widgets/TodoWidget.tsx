import { memo, useState } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { usePersistent } from "../lib/usePersistent";
import { uid } from "../lib/storage";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export const TodoWidget = memo(function TodoWidget() {
  const [todos, setTodos] = usePersistent<Todo[]>("todos-v3", []);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const open = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - open;

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTodos((a) => [{ id: uid(), text, done: false }, ...a]);
    setDraft("");
  };

  return (
    <div className="todo-widget">
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Neues To-do" aria-label="Neues To-do" maxLength={140} />
        <button type="submit" className="icon-btn accent" disabled={!draft.trim()} aria-label="Hinzufügen">
          <Plus size={16} />
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="empty">Alles erledigt.</p>
      ) : (
        <Reorder.Group axis="y" values={todos} onReorder={setTodos} className="todo-list">
          <AnimatePresence initial={false}>
            {todos.map((t) => (
              <Reorder.Item
                key={t.id}
                value={t}
                className={`todo ${t.done ? "is-done" : ""}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                whileDrag={{ scale: 1.03, boxShadow: "0 12px 28px rgba(0,0,0,0.28)" }}
              >
                <GripVertical size={14} className="todo-grip" aria-hidden />
                <button
                  type="button"
                  className="check"
                  aria-label={t.done ? "Als offen markieren" : "Als erledigt markieren"}
                  onClick={() => setTodos((a) => a.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                >
                  <AnimatePresence>
                    {t.done && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                        <Check size={13} strokeWidth={3.2} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                {editing === t.id ? (
                  <input
                    className="todo-edit"
                    autoFocus
                    defaultValue={t.text}
                    onBlur={(e) => {
                      const text = e.target.value.trim();
                      setTodos((a) => (text ? a.map((x) => (x.id === t.id ? { ...x, text } : x)) : a.filter((x) => x.id !== t.id)));
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                    }}
                  />
                ) : (
                  <span className="todo-text" onDoubleClick={() => setEditing(t.id)}>
                    {t.text}
                  </span>
                )}
                <button type="button" className="tool" aria-label="Löschen" onClick={() => setTodos((a) => a.filter((x) => x.id !== t.id))}>
                  <Trash2 size={14} />
                </button>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {todos.length > 0 && (
        <div className="todo-foot">
          <span className="muted">{open ? `${open} offen` : "Alles erledigt"}</span>
          {doneCount > 0 && (
            <button type="button" className="link-btn" onClick={() => setTodos((a) => a.filter((t) => !t.done))}>
              Erledigte löschen
            </button>
          )}
        </div>
      )}
    </div>
  );
});
