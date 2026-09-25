import { useEffect, useRef } from "react";
import { useNow } from "../lib/clock";
import { dayKey, getDayInfo } from "../lib/time";
import { chime, systemNotify } from "../lib/chime";
import { toast, type ToastTone } from "../lib/toast";
import type { Prefs } from "../prefs";

/** Erinnert sanft an Pausenbeginn, Pausenende und Feierabend. Rendert nichts. */
export function Alerts({ prefs }: { prefs: Prefs }) {
  const now = useNow();
  const fired = useRef(new Set<string>());

  useEffect(() => {
    if (!prefs.alerts) return;
    const d = getDayInfo(now, prefs);
    if (d.phase === "weekend") return;
    const minute = now.getHours() * 60 + now.getMinutes();
    const events: { at: number; text: string; tone: ToastTone; notes: number[] }[] = [
      ...(d.hasBreak
        ? [
            { at: d.bs, text: "Mittagspause! Lass es dir schmecken.", tone: "break" as const, notes: [587, 784] },
            { at: d.be, text: "Pause vorbei – auf in den Nachmittag.", tone: "info" as const, notes: [523, 659] },
          ]
        : []),
      { at: d.end - 15, text: "Noch 15 Minuten bis Feierabend.", tone: "info", notes: [659, 784] },
      { at: d.end, text: `Feierabend, ${prefs.name}! Schönen Abend.`, tone: "done", notes: [523, 659, 784, 1047] },
    ];
    for (const ev of events) {
      const key = `${dayKey(now)}-${ev.at}`;
      if (minute === ev.at && !fired.current.has(key)) {
        fired.current.add(key);
        chime(ev.notes);
        toast(ev.text, ev.tone);
        if (document.hidden) systemNotify(ev.text);
      }
    }
  }, [now, prefs]);

  return null;
}
