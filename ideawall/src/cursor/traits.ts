export type ShapeId = "ring" | "dot" | "cross" | "diamond" | "brackets" | "blob" | "arrow";
export type MotionId = "direct" | "smooth" | "spring" | "heavy";
export type TrailId = "none" | "ribbon" | "comet" | "sparks" | "glow" | "pixel";
export type ClickId = "ripple" | "pulse" | "impact" | "burst" | "confetti" | "none";
export type HoverId = "magnet" | "grow" | "none";
export type ColorId = "accent" | "contrast" | "rainbow" | "invert";
export type SizeId = "s" | "m" | "l";

export interface CursorTraits {
  shape: ShapeId;
  motion: MotionId;
  trail: TrailId;
  click: ClickId;
  hover: HoverId;
  color: ColorId;
  size: SizeId;
}

export type TraitKey = keyof CursorTraits;

export const CURSOR_GROUPS: { key: TraitKey; label: string; options: { id: string; label: string }[] }[] = [
  {
    key: "shape",
    label: "Form",
    options: [
      { id: "ring", label: "Ring" },
      { id: "dot", label: "Punkt" },
      { id: "cross", label: "Fadenkreuz" },
      { id: "diamond", label: "Raute" },
      { id: "brackets", label: "Klammern" },
      { id: "blob", label: "Flüssig" },
      { id: "arrow", label: "Pfeil" },
    ],
  },
  {
    key: "motion",
    label: "Bewegung",
    options: [
      { id: "direct", label: "Direkt" },
      { id: "smooth", label: "Weich" },
      { id: "spring", label: "Federnd" },
      { id: "heavy", label: "Träge" },
    ],
  },
  {
    key: "trail",
    label: "Spur",
    options: [
      { id: "none", label: "Keine" },
      { id: "ribbon", label: "Schweif" },
      { id: "comet", label: "Komet" },
      { id: "sparks", label: "Funken" },
      { id: "glow", label: "Glühen" },
      { id: "pixel", label: "Pixel" },
    ],
  },
  {
    key: "click",
    label: "Klick",
    options: [
      { id: "ripple", label: "Welle" },
      { id: "pulse", label: "Puls" },
      { id: "impact", label: "Einschlag" },
      { id: "burst", label: "Funkenregen" },
      { id: "confetti", label: "Konfetti" },
      { id: "none", label: "Kein" },
    ],
  },
  {
    key: "hover",
    label: "Hover",
    options: [
      { id: "magnet", label: "Magnetisch" },
      { id: "grow", label: "Wachsen" },
      { id: "none", label: "Keiner" },
    ],
  },
  {
    key: "color",
    label: "Farbe",
    options: [
      { id: "accent", label: "Akzent" },
      { id: "contrast", label: "Kontrast" },
      { id: "rainbow", label: "Regenbogen" },
      { id: "invert", label: "Invertiert" },
    ],
  },
  {
    key: "size",
    label: "Größe",
    options: [
      { id: "s", label: "S" },
      { id: "m", label: "M" },
      { id: "l", label: "L" },
    ],
  },
];

export const DEFAULT_CURSOR: CursorTraits = {
  shape: "ring",
  motion: "spring",
  trail: "ribbon",
  click: "ripple",
  hover: "magnet",
  color: "accent",
  size: "m",
};

export const PRESETS: { name: string; traits: CursorTraits }[] = [
  { name: "Signature", traits: DEFAULT_CURSOR },
  { name: "Präzise", traits: { shape: "cross", motion: "direct", trail: "none", click: "pulse", hover: "grow", color: "contrast", size: "s" } },
  { name: "Neon", traits: { shape: "blob", motion: "smooth", trail: "glow", click: "burst", hover: "magnet", color: "rainbow", size: "m" } },
  { name: "Fokus", traits: { shape: "brackets", motion: "smooth", trail: "none", click: "impact", hover: "magnet", color: "contrast", size: "m" } },
  { name: "Komet", traits: { shape: "dot", motion: "spring", trail: "comet", click: "burst", hover: "grow", color: "accent", size: "m" } },
  { name: "Retro", traits: { shape: "diamond", motion: "heavy", trail: "pixel", click: "confetti", hover: "grow", color: "accent", size: "l" } },
];

export function randomTraits(): CursorTraits {
  const pick = (key: TraitKey) => {
    const opts = CURSOR_GROUPS.find((g) => g.key === key)!.options;
    return opts[Math.floor(Math.random() * opts.length)].id;
  };
  return {
    shape: pick("shape"),
    motion: pick("motion"),
    trail: pick("trail"),
    click: pick("click"),
    hover: pick("hover"),
    color: pick("color"),
    size: pick("size"),
  } as CursorTraits;
}

export function normalizeTraits(t: Partial<CursorTraits> | undefined): CursorTraits {
  const out = { ...DEFAULT_CURSOR, ...(t ?? {}) };
  for (const g of CURSOR_GROUPS) {
    if (!g.options.some((o) => o.id === out[g.key])) (out as Record<string, string>)[g.key] = DEFAULT_CURSOR[g.key];
  }
  return out;
}
