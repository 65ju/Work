export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const round = (v: number) => Math.round(v);

/** Weight for a 0-based rank: #1 counts most, long tail still contributes. */
export const rankWeight = (rank: number) => 1 / Math.sqrt(rank + 1);

/** Normalized Shannon entropy (0 = one category, 1 = perfectly even). */
export function normalizedEntropy(weights: number[]): number {
  const positive = weights.filter((w) => w > 0);
  if (positive.length <= 1) return 0;
  const total = positive.reduce((a, b) => a + b, 0);
  const h = -positive.reduce((acc, w) => {
    const p = w / total;
    return acc + p * Math.log(p);
  }, 0);
  return h / Math.log(positive.length);
}

/** Effective number of categories, exp(H). */
export function effectiveCount(weights: number[]): number {
  const positive = weights.filter((w) => w > 0);
  if (positive.length === 0) return 0;
  const total = positive.reduce((a, b) => a + b, 0);
  const h = -positive.reduce((acc, w) => acc + (w / total) * Math.log(w / total), 0);
  return Math.exp(h);
}

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1);
  return m;
}

export const minIso = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b);
export const maxIso = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);
