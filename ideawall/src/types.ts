export type Category = "ideen" | "heute" | "wichtig" | "coding" | "lernen" | "spaeter";
export type NoteColor = "sun" | "coral" | "mint" | "sky" | "lavender" | "pink" | "orange" | "teal";
export type PinStyle = "pin" | "tape";

export interface Note {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  category: Category;
  done: boolean;
  doneAt?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  pin: PinStyle;
  z: number;
  createdAt: number;
  updatedAt: number;
}

export type Theme = "night" | "day";
export type Tier = "low" | "balanced" | "high";
export type QualitySetting = "auto" | Tier;
export type MotionSetting = "system" | "reduced" | "full";

export interface Settings {
  theme: Theme;
  quality: QualitySetting;
  motion: MotionSetting;
  sound: boolean;
  volume: number;
  buddy: boolean;
  fps: boolean;
}

export type FilterKey = "alle" | Category | "erledigt";
