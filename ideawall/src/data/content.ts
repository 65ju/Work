import type { Category, Note, NoteColor, PinStyle } from "../types";

export const CATEGORIES: { key: Category; label: string; color: NoteColor }[] = [
  { key: "ideen", label: "Ideen", color: "sun" },
  { key: "heute", label: "Heute", color: "teal" },
  { key: "wichtig", label: "Wichtig", color: "coral" },
  { key: "coding", label: "Coding", color: "sky" },
  { key: "lernen", label: "Lernen", color: "mint" },
  { key: "spaeter", label: "Später", color: "lavender" },
];

export const CATEGORY_LABEL: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label]),
) as Record<Category, string>;

/** Drei Tonstufen je Farbe: Licht / Basis / Schatten – für sauberes Cel-Shading. */
export const NOTE_COLORS: Record<NoteColor, { label: string; hi: string; base: string; shade: string; deep: string }> = {
  sun: { label: "Sonnengelb", hi: "#fff3a8", base: "#ffd23f", shade: "#f0a92a", deep: "#c47a12" },
  coral: { label: "Koralle", hi: "#ffc2b8", base: "#ff7a6b", shade: "#e84f4f", deep: "#b3303f" },
  mint: { label: "Mint", hi: "#d4ffe6", base: "#7dffb3", shade: "#3fd98c", deep: "#1f9e69" },
  sky: { label: "Cyan", hi: "#c9fbff", base: "#62ecff", shade: "#23bfe6", deep: "#1487b3" },
  lavender: { label: "Lavendel", hi: "#e6deff", base: "#b7a6ff", shade: "#8d78f0", deep: "#5f4bc4" },
  pink: { label: "Rosa", hi: "#ffe0ef", base: "#ffa6d1", shade: "#f173b0", deep: "#c24585" },
  orange: { label: "Orange", hi: "#ffd9ad", base: "#ffab4a", shade: "#f5821f", deep: "#c25a10" },
  teal: { label: "Türkis", hi: "#c4fff4", base: "#3ff0d0", shade: "#16c4a8", deep: "#0c8a7a" },
};

export const COLOR_ORDER: NoteColor[] = ["sun", "coral", "orange", "pink", "lavender", "sky", "teal", "mint"];

const now = Date.now();
let seedZ = 1;

function seed(
  title: string,
  body: string,
  category: Category,
  color: NoteColor,
  x: number,
  y: number,
  rot: number,
  pin: PinStyle,
  extra: Partial<Note> = {},
): Note {
  const z = seedZ++;
  return {
    id: `seed-${z}`,
    title,
    body,
    category,
    color,
    done: false,
    x,
    y,
    w: 236,
    h: 188,
    rot,
    pin,
    z,
    createdAt: now - (20 - z) * 3_600_000,
    updatedAt: now - (20 - z) * 3_600_000,
    ...extra,
  };
}

export function createSeedNotes(): Note[] {
  seedZ = 1;
  return [
    seed("API-Dokumentation verbessern", "Endpoints für /users und /auth fehlen noch. Beispiele + Fehlercodes ergänzen.", "coding", "sky", 24, 28, -2.5, "pin"),
    seed("Docker-Setup aufräumen", "Alte Images löschen, compose.yml in dev/prod splitten, Healthchecks rein.", "heute", "teal", 290, 54, 1.8, "tape"),
    seed("Neue Projektidee testen", "CLI-Tool, das Git-Branches nach Ticketnummer sortiert und alte aufräumt.", "ideen", "sun", 556, 20, -1.2, "pin"),
    seed("Passwortmanager aktualisieren", "Alte Zugänge rotieren, 2FA für alle Admin-Accounts prüfen.", "wichtig", "coral", 822, 60, 2.6, "tape", { h: 176 }),
    seed("Monitoring-Dashboard bauen", "Prometheus + Grafana: CPU, RAM, Response-Times und Alerts ins Team-Chat.", "coding", "lavender", 60, 262, 1.4, "tape", { w: 256, h: 200 }),
    seed("Kaffee holen", "Kritisch. Sehr kritisch. Danach: alles andere.", "heute", "orange", 352, 284, -3.2, "pin", { w: 212, h: 150 }),
    seed("Refactoring für das Auth-Modul", "Token-Refresh entkoppeln. Erst Tests schreiben, dann umbauen!", "wichtig", "pink", 604, 250, -0.8, "pin"),
    seed("Kubernetes-Grundlagen lernen", "Pods, Services, Ingress – jeden Tag 30 Minuten. Minikube lokal aufsetzen.", "lernen", "mint", 872, 296, 2.1, "tape"),
    seed("Backup-Strategie prüfen", "3-2-1-Regel. Und den Restore auch wirklich mal testen.", "spaeter", "lavender", 1110, 40, -2.2, "pin", { w: 220, h: 170 }),
    seed("Ticket #4711 schließen", "VPN-Problem bei der Kollegin gelöst: Es war die MTU.", "heute", "mint", 1128, 270, 3, "tape", {
      done: true,
      doneAt: now - 3_000_000,
      w: 220,
      h: 160,
    }),
  ];
}

export const IDEA_POOL: string[] = [
  "Slack-Bot, der Deploys mit Konfetti ankündigt",
  "Home-Lab mit Proxmox und drei alten Thin-Clients",
  "Eigene Status-Page für private Projekte",
  "Git-Hook, der vergessene TODOs zählt",
  "Pi-hole fürs Heimnetz aufsetzen",
  "Tastenkürzel-Cheatsheet fürs ganze Team",
  "Mini-CLI für Zeiterfassung im Terminal",
  "Logfiles automatisch zusammenfassen lassen",
  "Dotfiles-Repo endlich aufräumen",
  "Onboarding-Skript: neuer Laptop in 15 Minuten",
  "Netzwerkplan vom Büro als Diagramm zeichnen",
  "SSH-Key-Rotation automatisieren",
  "Terminal-Theme im IdeaWall-Look bauen",
  "Uptime-Monitor mit Push-Benachrichtigung",
  "Wiki-Seite: Häufige Fehler & ihre Fixes",
  "Raspberry Pi als Kaffeemaschinen-Monitor",
  "Code-Kata jeden Freitag um 15 Uhr",
  "Alle Cron-Jobs dokumentieren und prüfen",
  "Dependency-Update-Tag einmal im Monat",
  "Eigenen Link-Shortener selbst hosten",
  "Postmortem-Vorlage für Störungen erstellen",
  "Health-Check-Endpoint für jeden Service",
  "Ein Wochenende lang Rust lernen",
  "Automatische Screenshots für die Doku",
  "WLAN-QR-Code für Gäste ausdrucken",
  "Skript, das verwaiste Docker-Volumes findet",
  "Tech-Talk über Observability vorbereiten",
  "Makro-Taste für den Deploy-Befehl",
  "Firewall-Regeln einmal komplett reviewen",
  "Kleines Grafana-Dashboard nur für den Kaffee",
  "Browser-Extension für schnelle Notizen",
  "Rubber-Duck-Debugging als Team-Ritual",
];

export const BYTE_LINES: string[] = [
  "Hast du's schon mit Aus- und wieder Einschalten versucht?",
  "Es funktioniert auf meinem Rechner!",
  "DNS. Es ist immer DNS.",
  "Kaffee rein, Code raus.",
  "Pssst: Strg+S nicht vergessen.",
  "Beep boop. Ich meine: Hallo!",
  "Der Server ist nicht down. Er meditiert.",
  "Heute schon was deployt?",
  "Ich bewache deine Ideen. Mit meinem Leben.",
  "Ich bin zu 100 % bugfrei. Glaube ich.",
  "99 Probleme, aber ein Semikolon ist keins.",
  "Commit früh, commit oft.",
  "Die Ente hört dir zu. Ich auch.",
  "Mein Lieblingsessen? Cookies. Die aus dem Browser.",
];

export const MOTIVATIONS: string[] = [
  "Kleine Commits, große Wirkung.",
  "Heute ist ein guter Tag, um einen Bug zu fangen.",
  "Erst verstehen, dann fixen.",
  "Dokumentation ist ein Geschenk an dein zukünftiges Ich.",
  "Jeder Senior war mal ein Junior mit zu vielen Tabs.",
  "Fokus schlägt Multitasking.",
  "Beim dritten Mal: automatisieren.",
  "Pausen sind auch produktiv.",
  "Einfach ist schwer. Mach es trotzdem.",
  "Lesbarer Code ist freundlicher Code.",
  "Du musst nicht alles heute schaffen – nur das Richtige.",
  "Ein gelöstes Ticket ist ein kleiner Sieg.",
];

export const CODE_LINES: { t: string; c: string }[][] = [
  [{ t: "const ", c: "kw" }, { t: "julian", c: "var" }, { t: " = ", c: "op" }, { t: "await ", c: "kw" }, { t: "wakeUp", c: "fn" }, { t: "();", c: "op" }],
  [{ t: "if ", c: "kw" }, { t: "(coffee ", c: "var" }, { t: "< ", c: "op" }, { t: "20", c: "num" }, { t: ") ", c: "var" }, { t: "refill", c: "fn" }, { t: "();", c: "op" }],
  [{ t: "ideas", c: "var" }, { t: ".", c: "op" }, { t: "push", c: "fn" }, { t: "(", c: "op" }, { t: "'build cool stuff'", c: "str" }, { t: ");", c: "op" }],
  [{ t: "// TODO: die Welt verbessern", c: "cm" }],
  [{ t: "deploy", c: "fn" }, { t: "({ ", c: "op" }, { t: "env", c: "var" }, { t: ": ", c: "op" }, { t: "'prod'", c: "str" }, { t: ", ", c: "op" }, { t: "fear", c: "var" }, { t: ": ", c: "op" }, { t: "0", c: "num" }, { t: " });", c: "op" }],
  [{ t: "return ", c: "kw" }, { t: "'guter Tag'", c: "str" }, { t: ";", c: "op" }],
];

export const TERMINAL_LINES = [
  "$ npm run build",
  "✓ 142 modules transformed",
  "$ docker compose up -d",
  "✓ api    healthy",
  "✓ db     healthy",
  "$ ping kaffee.local",
  "64 bytes: time=0.4ms",
  "$ git push origin main",
  "✓ deployed in 12.4s",
];
