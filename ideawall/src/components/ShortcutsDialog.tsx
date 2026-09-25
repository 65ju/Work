import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { bus } from "../lib/bus";

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: "Überall",
    items: [
      [["N"], "Neue Notiz"],
      [["F"], "Fokus starten / beenden"],
      [["R"], "Random-Idee"],
      [["A"], "Board aufräumen"],
      [["M"], "Dark / Light Mood"],
      [["B"], "Buddy rufen"],
      [["/"], "Suche fokussieren"],
      [["?"], "Diese Übersicht"],
    ],
  },
  {
    title: "Fokussierte Notiz",
    items: [
      [["←", "↑", "→", "↓"], "Verschieben (mit Shift: weiter)"],
      [["Enter"], "Bearbeiten"],
      [["Leertaste"], "Erledigt umschalten"],
      [["Entf"], "Löschen"],
      [["Esc"], "Bearbeitung beenden"],
      [["Strg", "Enter"], "Speichern"],
    ],
  },
];

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => bus.on("shortcuts:open", () => setOpen(true)), []);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Tastenkürzel" icon={<Keyboard className="size-5" strokeWidth={2.6} />} tone="sun">
      <div className="shortcuts">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="shortcut-title">{g.title}</h3>
            <dl className="shortcut-list">
              {g.items.map(([keys, label]) => (
                <div key={label} className="shortcut-row">
                  <dt>
                    {keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <p className="dialog-text mt-4">Tipp: Byte lässt sich packen und werfen. Er nimmt's nicht übel.</p>
    </Dialog>
  );
}
