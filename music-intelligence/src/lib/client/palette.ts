export type Palette = { primary: string; secondary: string; tertiary: string; accent: string; luminance: number; saturation: number };

const cache = new Map<string, Promise<Palette | null>>();

/**
 * Samples a downscaled copy of the artwork to derive ambient colours. The artwork
 * itself is never altered; only the colours around it change.
 */
export function extractPalette(url: string): Promise<Palette | null> {
  let p = cache.get(url);
  if (!p) {
    p = load(url).catch(() => null);
    cache.set(url, p);
  }
  return p;
}

async function load(url: string): Promise<Palette | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = url;
  await img.decode();
  const size = 24;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size); // throws if the image is not CORS-enabled

  type Bucket = { r: number; g: number; b: number; n: number; sat: number };
  const buckets = new Map<number, Bucket>();
  let lumSum = 0;
  let satSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const [h, s, l] = rgbToHsl(r, g, b);
    lumSum += l;
    satSum += s;
    const key = Math.round(h * 12) * 100 + Math.round(l * 4) * 10 + Math.round(s * 3);
    const bk = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, sat: 0 };
    bk.r += r;
    bk.g += g;
    bk.b += b;
    bk.n++;
    bk.sat += s;
    buckets.set(key, bk);
  }
  const px = data.length / 4;
  const ranked = [...buckets.values()]
    .map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, weight: b.n * (0.35 + b.sat / b.n) }))
    .sort((a, b) => b.weight - a.weight);
  const pick = (i: number) => ranked[Math.min(i, ranked.length - 1)]!;
  const tone = (c: { r: number; g: number; b: number }, lightness: number, satBoost = 1) => {
    const [h, s] = rgbToHsl(c.r, c.g, c.b);
    return `hsl(${Math.round(h * 360)} ${Math.round(Math.min(1, s * satBoost) * 100)}% ${Math.round(lightness * 100)}%)`;
  };
  const vivid = [...ranked].sort((a, b) => rgbToHsl(b.r, b.g, b.b)[1] - rgbToHsl(a.r, a.g, a.b)[1])[0] ?? pick(0);
  const luminance = lumSum / px;
  const saturation = satSum / px;
  // Dark artwork → darker atmosphere; colourful artwork → richer accent light.
  const base = 0.14 + luminance * 0.12;
  return {
    primary: tone(pick(0), base, 0.9 + saturation),
    secondary: tone(pick(1), base * 0.85, 0.8 + saturation),
    tertiary: tone(pick(2), base * 0.7, 0.8),
    accent: tone(vivid, 0.74, saturation > 0.25 ? 0.9 : 0.35),
    luminance,
    saturation,
  };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}
