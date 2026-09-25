import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Gauge, Keyboard, RotateCcw, Settings2, Trash2, Upload } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { useSettings } from "../state/settings";
import { sanitizeNotes, useNotes } from "../state/notes";
import { bus } from "../lib/bus";
import { TIER_LABEL } from "../lib/quality";
import { createSeedNotes } from "../data/content";
import { fx } from "../fx/fx";
import { sfx } from "../lib/sound";
import type { MotionSetting, QualitySetting } from "../types";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const { settings, update, autoTier, tier } = useSettings();
  const { notes, replaceAll } = useNotes();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => bus.on("settings:open", () => setOpen(true)), []);
  useEffect(() => {
    if (!open) setConfirmReset(false);
  }, [open]);

  const exportNotes = () => {
    const blob = new Blob([JSON.stringify({ app: "ideawall", version: 1, exportedAt: new Date().toISOString(), notes }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ideawall-notizen-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    fx.toast(`${notes.length} Notizen exportiert.`, "success");
  };

  const importNotes = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as unknown;
      const list = sanitizeNotes(Array.isArray(data) ? data : (data as { notes?: unknown })?.notes);
      if (!list) throw new Error("invalid");
      replaceAll(list);
      fx.toast(`${list.length} Notizen importiert.`, "success");
      sfx.success();
      setOpen(false);
    } catch {
      fx.toast("Die Datei konnte nicht gelesen werden – ist das ein IdeaWall-Export?", "error");
      bus.emit("ui:error", { x: window.innerWidth / 2, y: window.innerHeight / 2, message: "Kaputte Datei?" });
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Einstellungen" icon={<Settings2 className="size-5" strokeWidth={2.6} />} tone="cyan" wide>
      <div className="settings">
        <Field label="Grafikqualität" hint={settings.quality === "auto" ? `Auto hat „${TIER_LABEL[autoTier]}“ gewählt.` : `Aktiv: ${TIER_LABEL[tier]}`}>
          <Segmented<QualitySetting>
            value={settings.quality}
            onChange={(quality) => update({ quality })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "low", label: "Sparsam" },
              { value: "balanced", label: "Ausgewogen" },
              { value: "high", label: "Maximal" },
            ]}
          />
        </Field>
        <Field label="Bewegung" hint="„Reduziert“ schaltet Intro, Parallax, Partikel und Wurfbahnen ab.">
          <Segmented<MotionSetting>
            value={settings.motion}
            onChange={(motion) => update({ motion })}
            options={[
              { value: "system", label: "System" },
              { value: "reduced", label: "Reduziert" },
              { value: "full", label: "Voll" },
            ]}
          />
        </Field>
        <Field label="Sound" hint="Kleine, synthetisierte Geräusche – nur bei deinen Aktionen.">
          <div className="flex flex-wrap items-center gap-4">
            <Toggle checked={settings.sound} onChange={(sound) => update({ sound })} label="Sound" />
            <label className="range">
              <span className="sr-only">Lautstärke</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                disabled={!settings.sound}
                onChange={(e) => update({ volume: Number(e.target.value) })}
                onPointerUp={() => sfx.pop()}
              />
            </label>
          </div>
        </Field>
        <Field label="Buddy „Byte“" hint="Der kleine Roboter am unteren Rand.">
          <Toggle checked={settings.buddy} onChange={(buddy) => update({ buddy })} label="Buddy anzeigen" />
        </Field>
        <Field label="FPS-Anzeige" hint="Praktisch, um die Leistung deines PCs zu prüfen.">
          <Toggle checked={settings.fps} onChange={(fps) => update({ fps })} label="FPS anzeigen" />
        </Field>

        <Field label="Daten" hint="Alles bleibt lokal in deinem Browser gespeichert.">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="cel-btn cel-btn-ghost cel-btn-sm" onClick={exportNotes}>
              <Download className="size-4" strokeWidth={2.6} /> Exportieren
            </button>
            <button type="button" className="cel-btn cel-btn-ghost cel-btn-sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" strokeWidth={2.6} /> Importieren
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importNotes(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="cel-btn cel-btn-ghost cel-btn-sm"
              onClick={() => {
                replaceAll([...notes, ...createSeedNotes().map((n) => ({ ...n, id: `${n.id}-${Date.now().toString(36)}` }))]);
                fx.toast("Beispielnotizen hinzugefügt.", "success");
              }}
            >
              <RotateCcw className="size-4" strokeWidth={2.6} /> Beispielnotizen
            </button>
            <button
              type="button"
              className={`cel-btn cel-btn-sm ${confirmReset ? "cel-btn-danger" : "cel-btn-ghost"}`}
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                replaceAll([]);
                setConfirmReset(false);
                fx.toast("Board geleert.", "info");
              }}
            >
              <Trash2 className="size-4" strokeWidth={2.6} /> {confirmReset ? "Wirklich alles löschen?" : "Board leeren"}
            </button>
          </div>
        </Field>

        <div className="settings-foot">
          <button
            type="button"
            className="cel-btn cel-btn-ghost cel-btn-sm"
            onClick={() => {
              setOpen(false);
              window.setTimeout(() => bus.emit("shortcuts:open"), 150);
            }}
          >
            <Keyboard className="size-4" strokeWidth={2.6} /> Tastenkürzel
          </button>
          <span className="settings-tier">
            <Gauge className="size-4" strokeWidth={2.6} /> Stufe: {TIER_LABEL[tier]}
          </span>
        </div>
      </div>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? "is-active" : ""}
          onClick={() => {
            onChange(o.value);
            sfx.pop();
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle ${checked ? "is-on" : ""}`}
      onClick={() => {
        onChange(!checked);
        sfx.toggle();
      }}
    >
      <span className="toggle-track">
        <span className="toggle-knob" />
      </span>
      <span className="toggle-label">{label}</span>
    </button>
  );
}
