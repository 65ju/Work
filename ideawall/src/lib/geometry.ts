import type { Note } from "../types";
import { CATEGORIES } from "../data/content";
import { rand } from "./springs";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BOARD_PAD = 18;

function overlaps(a: Box, b: Box, pad: number) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

/**
 * Sucht einen freien Platz für eine neue Notiz: zuerst im sichtbaren Bereich,
 * dann darunter (das Board wächst mit), dann darüber.
 */
export function findFreeSpot(notes: Note[], boardW: number, size: { w: number; h: number }, regionTop: number, regionBottom: number) {
  const maxX = Math.max(BOARD_PAD, boardW - size.w - BOARD_PAD);
  const step = 24;
  const lowest = notes.reduce((m, n) => Math.max(m, n.y + n.h), 0);
  const scan = (from: number, to: number) => {
    for (let y = Math.max(BOARD_PAD, from); y <= to; y += step) {
      for (let x = BOARD_PAD; x <= maxX; x += step) {
        const box = { x, y, ...size };
        if (!notes.some((n) => overlaps(box, n, 12))) return { x, y };
      }
    }
    return null;
  };
  const top = Math.max(BOARD_PAD, regionTop);
  return (
    scan(top, Math.max(top, regionBottom - size.h)) ??
    scan(top, lowest + 40) ??
    scan(BOARD_PAD, top) ?? { x: Math.min(maxX, BOARD_PAD + rand(0, 120)), y: lowest + 30 }
  );
}

/** Regal-Packing: nach Status, Kategorie und Alter sortiert, Größen bleiben erhalten. */
export function arrangeShelves(notes: Note[], boardW: number): Record<string, Partial<Note>> {
  const order = new Map(CATEGORIES.map((c, i) => [c.key, i]));
  const sorted = [...notes].sort(
    (a, b) => Number(a.done) - Number(b.done) || (order.get(a.category) ?? 0) - (order.get(b.category) ?? 0) || a.createdAt - b.createdAt,
  );
  const gap = 22;
  const patches: Record<string, Partial<Note>> = {};
  let x = BOARD_PAD + 6;
  let y = BOARD_PAD + 10;
  let rowH = 0;
  for (const n of sorted) {
    if (x + n.w > boardW - BOARD_PAD && x > BOARD_PAD + 6) {
      x = BOARD_PAD + 6;
      y += rowH + gap;
      rowH = 0;
    }
    patches[n.id] = { x, y, rot: Number(rand(-1.6, 1.6).toFixed(2)) };
    x += n.w + gap;
    rowH = Math.max(rowH, n.h);
  }
  return patches;
}
