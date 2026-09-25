import { useRef, useState, type ReactNode } from "react";
import { Download, EyeOff, Plus, Unplug, Upload, X } from "lucide-react";
import { useStore } from "../lib/store";
import { sfx } from "../lib/sfx";
import { toast } from "../lib/toast";
import { disconnect, exportBackup, importBackup, supported, vaultStore } from "../journal/vault";
import { shortDate } from "../journal/dates";
import { VaultChip } from "./ArchiveOverlay";
import type { Parity, Prefs, RedactKind, SchoolRule } from "../prefs";

const WD = ["Mo", "Di", "Mi", "Do", "Fr"];
const NEXT: Record<Parity | "none", Parity | "none"> = { none: "all", all: "odd", odd: "even", even: "none" };
const PARITY_LABEL: Record<Parity, string> = { all: "jede Woche", odd: "ungerade KW", even: "gerade KW" };
const KINDS: RedactKind[] = ["Kunde", "Person", "Projekt", "Firma"];

export function JournalSettings({ prefs, set }: { prefs: Prefs; set: (patch: Partial<Prefs>) => void }) {
  const v = useStore(vaultStore);
  const file = useRef<HTMLInputElement>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState<RedactKind>("Kunde");

  const ruleFor = (wd: number) => prefs.schoolRules.find((r) => r.wd === wd);
  const cycle = (wd: number) => {
    const cur = ruleFor(wd)?.weeks ?? "none";
    const next = NEXT[cur];
    const rest = prefs.schoolRules.filter((r) => r.wd !== wd);
    set({ schoolRules: next === "none" ? rest : ([...rest, { wd, weeks: next }] as SchoolRule[]).sort((a, b) => a.wd - b.wd) });
    sfx.toggle();
  };

  return (
    <div className="journal-settings">
      <h3 className="js-title">Berichtsheft</h3>

      <Row label="Ordner">
        <VaultChip />
        {(v.status === "ready" || v.status === "saving" || v.status === "prompt" || v.status === "error") && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void disconnect()}>
            <Unplug size={14} /> Trennen
          </button>
        )}
        <span className="ml-auto flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportBackup} title="Alles als Datei sichern">
            <Download size={14} /> Sichern
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => file.current?.click()} title="Sicherung einlesen">
            <Upload size={14} /> Einlesen
          </button>
        </span>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importBackup(f).then((ok) => toast(ok ? "Sicherung eingelesen" : "Datei passt nicht", ok ? "done" : "info", 3000));
            e.target.value = "";
          }}
        />
        {!supported && <span className="muted small">Direkt in einen Ordner speichern geht nur in Chrome oder Edge.</span>}
      </Row>

      <div className="settings-grid mt-4">
        <label className="field">
          <span>Ausbildungsberuf</span>
          <input value={prefs.job} maxLength={80} onChange={(e) => set({ job: e.target.value })} />
        </label>
        <label className="field">
          <span>Ausbildungsjahr</span>
          <select value={prefs.trainingYear} onChange={(e) => set({ trainingYear: e.target.value })}>
            <option value="">–</option>
            {["1", "2", "3", "4"].map((y) => (
              <option key={y} value={y}>
                {y}. Jahr
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Schulbeginn</span>
          <input type="time" value={prefs.schoolStart} onChange={(e) => e.target.value && set({ schoolStart: e.target.value })} />
        </label>
        <label className="field">
          <span>Schulschluss</span>
          <input type="time" value={prefs.schoolEnd} onChange={(e) => e.target.value && set({ schoolEnd: e.target.value })} />
        </label>
      </div>

      <Row label="Schultage">
        {WD.map((d, i) => {
          const r = ruleFor(i + 1);
          return (
            <button key={d} type="button" className={`chip ${r ? "is-on" : ""}`} onClick={() => cycle(i + 1)} title="Klicken zum Wechseln">
              <b>{d}</b> {r && <span className="chip-sub">{PARITY_LABEL[r.weeks]}</span>}
            </button>
          );
        })}
      </Row>

      <Row label="Schulferien">
        {prefs.schoolHolidays.map((h, i) => (
          <span key={i} className="chip is-on">
            {shortDate(h.from)} – {shortDate(h.to)}
            <button type="button" className="chip-x" aria-label="Entfernen" onClick={() => set({ schoolHolidays: prefs.schoolHolidays.filter((_, j) => j !== i) })}>
              <X size={12} />
            </button>
          </span>
        ))}
        <span className="date-pair">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Ferien von" />
          <span className="muted">–</span>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="Ferien bis" />
          <button
            type="button"
            className="icon-btn accent"
            aria-label="Ferien hinzufügen"
            disabled={!from || !to || to < from}
            onClick={() => {
              set({ schoolHolidays: [...prefs.schoolHolidays, { from, to }].sort((a, b) => a.from.localeCompare(b.from)) });
              setFrom("");
              setTo("");
              sfx.pop();
            }}
          >
            <Plus size={15} />
          </button>
        </span>
      </Row>

      <Row label="Schwärzen">
        <span className="muted small w-full">
          <EyeOff size={12} className="inline" /> Diese Namen werden vor dem Kopieren zu ChatGPT ersetzt und danach wieder eingesetzt. Die Liste bleibt nur hier.
        </span>
        {prefs.redact.map((r, i) => (
          <span key={i} className="chip is-on">
            {r.term} <span className="chip-sub">→ {r.kind}</span>
            <button type="button" className="chip-x" aria-label="Entfernen" onClick={() => set({ redact: prefs.redact.filter((_, j) => j !== i) })}>
              <X size={12} />
            </button>
          </span>
        ))}
        <form
          className="redact-form"
          onSubmit={(e) => {
            e.preventDefault();
            const t = term.trim();
            if (t.length < 2 || prefs.redact.some((r) => r.term.toLowerCase() === t.toLowerCase())) return;
            set({ redact: [...prefs.redact, { term: t, kind }] });
            setTerm("");
            sfx.pop();
          }}
        >
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name, Kunde, Projekt …" maxLength={60} aria-label="Begriff" />
          <select value={kind} onChange={(e) => setKind(e.target.value as RedactKind)} aria-label="Art">
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <button type="submit" className="icon-btn accent" aria-label="Hinzufügen" disabled={term.trim().length < 2}>
            <Plus size={15} />
          </button>
        </form>
      </Row>

      <Row label="Erinnerung">
        <button type="button" role="switch" aria-checked={prefs.reportReminder} className={`switch ${prefs.reportReminder ? "is-on" : ""}`} onClick={() => set({ reportReminder: !prefs.reportReminder })}>
          <span className="switch-knob" />
        </button>
        <span className="muted small">Letzter Tag der Woche, 30 Minuten vor Schluss</span>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-value">{children}</div>
    </div>
  );
}
