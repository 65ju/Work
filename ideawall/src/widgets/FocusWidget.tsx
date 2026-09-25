import { memo, useEffect } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useNow } from "../lib/clock";
import { usePersistent } from "../lib/usePersistent";
import { chime, systemNotify } from "../lib/chime";
import { toast } from "../lib/toast";

interface FocusState {
  minutes: number;
  endsAt: number | null;
  remaining: number;
}

const PRESETS = [15, 25, 50];

export const FocusWidget = memo(function FocusWidget({ title }: { title: string }) {
  const now = useNow();
  const [f, setF] = usePersistent<FocusState>("focus-v3", { minutes: 25, endsAt: null, remaining: 25 * 60_000 });
  const running = f.endsAt !== null;
  const left = running ? Math.max(0, f.endsAt! - now.getTime()) : f.remaining;
  const total = f.minutes * 60_000;
  const mm = String(Math.floor(left / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");
  const C = 2 * Math.PI * 52;

  // Ablauf erkennen – auch wenn die Seite zwischendurch geschlossen war.
  useEffect(() => {
    if (running && left <= 0) {
      setF((p) => ({ ...p, endsAt: null, remaining: p.minutes * 60_000 }));
      chime([784, 988, 1175]);
      toast(`${f.minutes} Minuten Fokus geschafft – gönn dir eine kurze Pause.`, "focus");
      systemNotify("Fokus-Session beendet", "Zeit für eine kurze Pause.");
    }
  }, [running, left, f.minutes, setF]);

  // Restzeit im Tab-Titel, solange der Timer läuft.
  useEffect(() => {
    document.title = running ? `${mm}:${ss} · Fokus` : title;
  }, [running, mm, ss, title]);

  return (
    <div className={`focus ${running ? "is-running" : ""}`}>
      <div className="focus-dial">
        <svg viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r="52" className="ring-bg" />
          <circle cx="60" cy="60" r="52" className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - left / total)} />
        </svg>
        <div className="focus-center">
          <span className="focus-time">
            {mm}:{ss}
          </span>
          <span className="focus-state">{running ? "läuft" : left < total ? "pausiert" : "bereit"}</span>
        </div>
      </div>
      <div className="focus-side">
        <div className="seg" role="group" aria-label="Dauer">
          {PRESETS.map((m) => (
            <button key={m} type="button" className={f.minutes === m ? "is-on" : ""} aria-pressed={f.minutes === m} onClick={() => setF({ minutes: m, endsAt: null, remaining: m * 60_000 })}>
              {m} min
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary grow"
            onClick={() =>
              running
                ? setF((p) => ({ ...p, endsAt: null, remaining: Math.max(0, (p.endsAt ?? 0) - Date.now()) }))
                : setF((p) => ({ ...p, endsAt: Date.now() + p.remaining }))
            }
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pausieren" : left < total ? "Weiter" : "Starten"}
          </button>
          <button type="button" className="icon-btn" title="Zurücksetzen" aria-label="Zurücksetzen" onClick={() => setF((p) => ({ ...p, endsAt: null, remaining: p.minutes * 60_000 }))}>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});
