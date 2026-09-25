export type ThemeId = "aurora" | "obsidian" | "ember" | "abyss" | "synth" | "moss" | "frost";

export interface Theme {
  id: ThemeId;
  name: string;
  light?: boolean;
  special?: "grid" | "stars" | "none";
  aurora: [string, string, string];
  vars: Record<string, string>;
}

const dark = (v: Record<string, string>) => ({
  "--text": "#eef1f7",
  "--muted": "#8f97a8",
  "--faint": "#5b6272",
  "--edge": "rgba(255,255,255,0.08)",
  "--edge-hi": "rgba(255,255,255,0.22)",
  "--inset": "rgba(255,255,255,0.035)",
  "--inset-strong": "rgba(255,255,255,0.06)",
  "--shadow": "0 24px 60px rgba(0,0,0,0.45)",
  "--grain": "0.07",
  ...v,
});

export const THEMES: Theme[] = [
  {
    id: "aurora",
    name: "Aurora",
    aurora: ["#2b4bff", "#8b5cf6", "#06b6d4"],
    vars: dark({ "--bg": "#06070b", "--glass": "rgba(20,24,36,0.52)", "--accent": "#7c9cff", "--accent-2": "#c084fc" }),
  },
  {
    id: "obsidian",
    name: "Obsidian",
    special: "none",
    aurora: ["#1a1a1a", "#0f0f0f", "#151515"],
    vars: dark({
      "--bg": "#000000",
      "--glass": "rgba(8,8,8,0.92)",
      "--accent": "#f5f5f5",
      "--accent-2": "#a1a1aa",
      "--text": "#f4f4f5",
      "--muted": "#8a8a90",
      "--faint": "#4f4f55",
      "--edge": "rgba(255,255,255,0.075)",
      "--edge-hi": "rgba(255,255,255,0.18)",
      "--inset": "rgba(255,255,255,0.03)",
      "--grain": "0.035",
    }),
  },
  {
    id: "ember",
    name: "Glut",
    aurora: ["#ff5a1f", "#e11d48", "#7c2d12"],
    vars: dark({ "--bg": "#0a0605", "--glass": "rgba(34,18,14,0.52)", "--accent": "#ff8a4c", "--accent-2": "#ff4d6d", "--text": "#fbefe9", "--muted": "#a8958c" }),
  },
  {
    id: "abyss",
    name: "Tiefsee",
    special: "stars",
    aurora: ["#0891b2", "#0d9488", "#1e3a8a"],
    vars: dark({ "--bg": "#02080b", "--glass": "rgba(8,26,32,0.5)", "--accent": "#2dd4bf", "--accent-2": "#38bdf8", "--text": "#e6f7f8", "--muted": "#86a3a8" }),
  },
  {
    id: "synth",
    name: "Synthwave",
    special: "grid",
    aurora: ["#ff00a8", "#7c3aed", "#00d5ff"],
    vars: dark({ "--bg": "#09030f", "--glass": "rgba(30,10,44,0.5)", "--accent": "#ff4fd8", "--accent-2": "#22d3ee", "--text": "#fbeaff", "--muted": "#a790b6" }),
  },
  {
    id: "moss",
    name: "Moos",
    aurora: ["#16a34a", "#065f46", "#a3e635"],
    vars: dark({ "--bg": "#040806", "--glass": "rgba(14,26,18,0.52)", "--accent": "#86efac", "--accent-2": "#fde68a", "--text": "#eaf5ec", "--muted": "#8ea596" }),
  },
  {
    id: "frost",
    name: "Frost",
    light: true,
    aurora: ["#93c5fd", "#c4b5fd", "#99f6e4"],
    vars: {
      "--bg": "#e6eaf2",
      "--glass": "rgba(255,255,255,0.5)",
      "--accent": "#3b6cff",
      "--accent-2": "#a855f7",
      "--text": "#0f1729",
      "--muted": "#56607a",
      "--faint": "#8e97aa",
      "--edge": "rgba(15,23,41,0.08)",
      "--edge-hi": "rgba(255,255,255,0.95)",
      "--inset": "rgba(15,23,41,0.04)",
      "--inset-strong": "rgba(15,23,41,0.07)",
      "--shadow": "0 24px 50px rgba(30,40,80,0.16)",
      "--grain": "0.05",
    },
  },
];

export const themeById = (id: string): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0];
