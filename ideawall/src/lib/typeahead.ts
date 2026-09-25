/**
 * Fängt Tastenanschläge ab, während eine neue Notiz noch einfliegt: Die Zeichen
 * landen später im Titel, statt verloren zu gehen oder Hotkeys auszulösen.
 */
let buf = "";
let active = false;
let timer = 0;

function onKey(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target as HTMLElement | null;
  if (t?.closest("input, textarea, [contenteditable='true']")) return;
  if (e.key.length === 1) {
    buf += e.key;
  } else if (e.key === "Backspace") {
    buf = buf.slice(0, -1);
  } else {
    return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
}

export const typeahead = {
  start() {
    if (active) return;
    buf = "";
    active = true;
    window.addEventListener("keydown", onKey, true);
    timer = window.setTimeout(() => typeahead.take(), 3000);
  },
  take(): string {
    if (!active) return "";
    active = false;
    window.clearTimeout(timer);
    window.removeEventListener("keydown", onKey, true);
    const b = buf;
    buf = "";
    return b;
  },
};
