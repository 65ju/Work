import type { Prefs, RedactEntry } from "../prefs";
import type { DayKind, ReportDay } from "./data";
import { hoursLabel, longDate, parseWeekKey, WEEKDAY_LONG, weekday, weekDates } from "./dates";
import { KIND_META } from "./schedule";

/* ---------------- Schwärzen: Namen raus, Platzhalter rein – und zurück ---------------- */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bounded = (s: string) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(s)}(?![\\p{L}\\p{N}])`, "giu");

export interface Redactor {
  pairs: { term: string; alias: string }[];
  redact: (text: string) => string;
  restore: (text: string) => string;
}

export function makeRedactor(entries: RedactEntry[]): Redactor {
  const count: Record<string, number> = {};
  const pairs = entries
    .filter((e) => e.term.trim().length > 1)
    .map((e) => {
      const n = (count[e.kind] = (count[e.kind] ?? 0) + 1);
      return { term: e.term.trim(), alias: `${e.kind} ${String.fromCharCode(64 + Math.min(n, 26))}` };
    });
  // Längere Begriffe zuerst, damit „Müller GmbH“ vor „Müller“ greift
  const byTerm = [...pairs].sort((a, b) => b.term.length - a.term.length);
  const byAlias = [...pairs].sort((a, b) => b.alias.length - a.alias.length);
  return {
    pairs,
    redact: (text) => byTerm.reduce((t, p) => t.replace(bounded(p.term), p.alias), text),
    restore: (text) => byAlias.reduce((t, p) => t.replace(bounded(p.alias), p.term), text),
  };
}

/* ---------------- Auftrag ---------------- */

export interface PromptItem {
  text: string;
  label: string;
  school: boolean;
}

export interface PromptDay {
  date: string;
  kind: DayKind;
  minutes: number;
  items: PromptItem[];
}

export function buildPrompt(week: string, days: PromptDay[], prefs: Pick<Prefs, "job" | "trainingYear">, r: Redactor): string {
  const { week: kw } = parseWeekKey(week);
  const dates = weekDates(week);
  const year = prefs.trainingYear ? `, ${prefs.trainingYear}. Ausbildungsjahr` : "";
  const lines: string[] = [];

  lines.push(
    `Du hilfst mir beim wöchentlichen Ausbildungsnachweis (IHK-Berichtsheft). Ich mache eine Ausbildung zum ${prefs.job || "Fachinformatiker für Systemintegration"}${year}.`,
    "",
    "Formuliere aus meinen Notizen die Einträge für jeden Tag:",
    "- kurze, sachliche Sätze im Berichtsheft-Stil, ohne „ich“, z. B. „Datenbankabfrage für das Kundenportal optimiert und getestet.“",
    "- Fachbegriffe korrekt verwenden, nichts erfinden, was nicht in den Notizen steht; Ähnliches zusammenfassen",
    "- Betrieb: 2–5 Sätze pro Tag. Berufsschule: die Unterrichtsthemen als kurze Sätze",
    "- Tage ohne Notizen, Urlaub, Krank oder Frei: leere Listen",
    "- Platzhalter wie „Kunde A“, „Person B“ oder „Projekt C“ exakt so übernehmen",
    "",
    `Meine Woche: KW ${kw}, ${longDate(dates[0])} – ${longDate(dates[4])}`,
  );

  for (const d of days) {
    lines.push("", `${WEEKDAY_LONG[weekday(d.date)]}, ${longDate(d.date)} (${d.date}) – ${KIND_META[d.kind].label}${d.minutes ? `, ${hoursLabel(d.minutes)}` : ""}`);
    if (!d.items.length) lines.push("  (keine Notizen)");
    for (const it of d.items) lines.push(`  • [${it.school ? "Schule" : "Betrieb"} · ${it.label}] ${r.redact(it.text.replace(/\s+/g, " ").trim())}`);
  }

  const example = days.map((d) => `{"datum":"${d.date}","betrieb":[],"schule":[]}`).join(",");
  lines.push(
    "",
    "Antworte ausschließlich mit einem einzigen JSON-Codeblock in genau diesem Format (ein Eintrag pro Tag, jeder Satz ein eigener String):",
    "```json",
    `{"tage":[${example}]}`,
    "```",
  );
  return lines.join("\n");
}

/* ---------------- Antwort einlesen ---------------- */

interface RawDay {
  datum?: string;
  date?: string;
  betrieb?: unknown;
  schule?: unknown;
}

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : typeof v === "string" && v.trim() ? v.split(/\n+/).map((x) => x.replace(/^[-•*]\s*/, "").trim()).filter(Boolean) : [];

/** Liest die ChatGPT-Antwort (JSON, auch mit Codeblock und schrägen Anführungszeichen). Gibt null zurück, wenn nichts passt. */
export function parseAnswer(raw: string, days: PromptDay[], r: Redactor): ReportDay[] | null {
  let text = raw.replace(/```(?:json)?/gi, "").replace(/[“”„]/g, '"');
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  text = text.slice(a, b + 1);
  let data: { tage?: RawDay[]; days?: RawDay[] };
  try {
    data = JSON.parse(text);
  } catch {
    try {
      data = JSON.parse(text.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
  const tage = data.tage ?? data.days;
  if (!Array.isArray(tage) || !tage.length) return null;

  return days.map((d, i) => {
    const hit = tage.find((t) => (t.datum ?? t.date) === d.date) ?? tage[i] ?? {};
    const betrieb = list(hit.betrieb).map(r.restore);
    const schule = list(hit.schule).map(r.restore);
    return { date: d.date, kind: d.kind, minutes: d.minutes, betrieb: betrieb.join("\n"), schule: schule.join("\n") };
  });
}

/** Leerer Bericht (z. B. zum Selbstausfüllen). */
export function emptyReport(days: PromptDay[]): ReportDay[] {
  return days.map((d) => ({ date: d.date, kind: d.kind, minutes: d.minutes, betrieb: "", schule: "" }));
}

/** Bericht als Text zum Kopieren. */
export function reportText(week: string, days: ReportDay[]): string {
  const { week: kw } = parseWeekKey(week);
  const out = [`Ausbildungsnachweis KW ${kw}`];
  for (const d of days) {
    out.push("", `${WEEKDAY_LONG[weekday(d.date)]}, ${longDate(d.date)} – ${KIND_META[d.kind].label} (${hoursLabel(d.minutes)})`);
    if (d.betrieb.trim()) out.push(...d.betrieb.split("\n").filter(Boolean).map((l) => `- ${l}`));
    if (d.schule.trim()) out.push("Berufsschule:", ...d.schule.split("\n").filter(Boolean).map((l) => `- ${l}`));
  }
  return out.join("\n");
}
