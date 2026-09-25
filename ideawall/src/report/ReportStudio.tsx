import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { ArrowLeft, Check, ClipboardCopy, ClipboardPaste, ExternalLink, EyeOff, FileDown, GraduationCap, PenLine, RotateCcw, Sparkles, X } from "lucide-react";
import { useStore } from "../lib/store";
import { sfx } from "../lib/sfx";
import { toast } from "../lib/toast";
import { fx } from "../cursor/fx";
import { activityOn, journalStore, PAPERS, reportsStore, type Activity, type DayKind, type ReportDay } from "../journal/data";
import { hoursLabel, longDate, parseWeekKey, shortDate, today, WEEKDAY_LONG, WEEKDAY_SHORT, weekday, weekDates } from "../journal/dates";
import { KIND_META, weekPlan } from "../journal/schedule";
import { buildPrompt, emptyReport, makeRedactor, parseAnswer, reportText, type PromptDay } from "../journal/prompt";
import { download, reportBase, writeNow } from "../journal/vault";
import type { Prefs } from "../prefs";
import type { ResolvedFx } from "../lib/fxLevel";

type Stage = "select" | "fly" | "charged" | "wait" | "reveal" | "edit" | "closing";
type RevealPhase = "spin" | "implode" | "drop" | "stamp" | "open";

interface Sel {
  on: boolean;
  school: boolean;
}

interface FlyCard {
  key: string;
  text: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const ACT_LABEL: Record<Activity["kind"], string> = { neu: "notiert", bearbeitet: "bearbeitet", erledigt: "erledigt", todo: "To-do erledigt" };
const ACT_SHORT: Record<Activity["kind"], string> = { neu: "Neu", bearbeitet: "Geändert", erledigt: "Erledigt", todo: "To-do" };
/** Papierfarbe je Eintrag – gleich in Auswahl und Flug. */
const ACT_PAPER: Record<Activity["kind"], string> = { neu: PAPERS[0], bearbeitet: PAPERS[2], erledigt: PAPERS[1], todo: PAPERS[4] };
const isFree = (k: DayKind) => k === "vacation" || k === "sick" || k === "off" || k === "weekend";
const MAX_CARDS = 36;

interface Props {
  week: string;
  prefs: Prefs;
  fxLevel: ResolvedFx;
  onClose: () => void;
}

export function ReportStudio({ week, prefs, fxLevel, onClose }: Props) {
  useStore(journalStore);
  const existing = reportsStore.get()[week];
  const [stage, setStage] = useState<Stage>(existing ? "edit" : "select");
  const [draft, setDraft] = useState<ReportDay[]>(existing?.days ?? []);
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState<Record<string, Sel>>({});
  const [cards, setCards] = useState<FlyCard[]>([]);
  const [count, setCount] = useState(0);
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [core, setCore] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [returned, setReturned] = useState(false);
  const [manual, setManual] = useState(false);
  const [rp, setRp] = useState<RevealPhase>("spin");
  const [savedTo, setSavedTo] = useState<"folder" | "download" | null>(null);
  const [closeFly, setCloseFly] = useState(false);
  const shake = useMotionValue(0);
  const kick = useMotionValue(1);
  const chipRefs = useRef(new Map<string, HTMLElement>());
  const low = fxLevel === "low";
  const t = today();
  const { week: kw } = parseWeekKey(week);
  const dates = weekDates(week);

  const plan = weekPlan(week, prefs);
  const dayActs = plan.map((d) => ({ ...d, acts: d.date <= t ? activityOn(d.date, d.kind === "school") : [] }));
  const redactor = useMemo(() => makeRedactor(prefs.redact), [prefs.redact]);
  const pick = (date: string, kind: DayKind, a: Activity): Sel => sel[`${date}|${a.key}`] ?? { on: !isFree(kind), school: a.school };

  const promptDays: PromptDay[] = dayActs.map((d) => ({
    date: d.date,
    kind: d.kind,
    minutes: d.minutes,
    items: d.acts.filter((a) => pick(d.date, d.kind, a).on).map((a) => ({ text: a.text, label: ACT_LABEL[a.kind], school: pick(d.date, d.kind, a).school })),
  }));
  const selected = promptDays.reduce((m, d) => m + d.items.length, 0);
  const prompt = buildPrompt(week, promptDays, prefs, redactor);
  const redactHits = redactor.pairs.filter((p) => promptDays.some((d) => d.items.some((i) => i.text.toLowerCase().includes(p.term.toLowerCase())))).length;

  const doShake = (power = 1) => {
    if (low) return;
    void animate(shake, [0, -10 * power, 9 * power, -6 * power, 4 * power, -2 * power, 0], { duration: 0.42 });
  };

  /* ---------- Esc ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stage === "reveal" || stage === "closing" || stage === "fly") return;
      tryClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const tryClose = () => {
    if (stage === "edit" && dirty && !window.confirm("Änderungen am Bericht verwerfen?")) return;
    onClose();
  };

  /* ---------- 1 · Karten einsammeln ---------- */
  const launch = () => {
    if (!selected) return;
    const cx = window.innerWidth / 2;
    const cy = Math.min(window.innerHeight * 0.4, 340);
    setCore({ x: cx, y: cy });
    const list: FlyCard[] = [];
    for (const d of dayActs) {
      for (const a of d.acts) {
        if (!pick(d.date, d.kind, a).on) continue;
        const el = chipRefs.current.get(`${d.date}|${a.key}`);
        const r = el?.getBoundingClientRect();
        if (!r || list.length >= MAX_CARDS) continue;
        list.push({ key: `${d.date}|${a.key}`, text: a.text, color: ACT_PAPER[a.kind], x: r.left, y: r.top, w: r.width, h: r.height });
      }
    }
    setCount(0);
    setError("");
    sfx.whoosh();
    if (low || !list.length) {
      setCards([]);
      setCount(selected);
      setStage("charged");
      return;
    }
    setGone(new Set());
    setCards(list);
    setStage("fly");
  };

  useEffect(() => {
    if (stage !== "fly" || !cards.length || count < cards.length) return;
    const id = window.setTimeout(() => {
      setStage("charged");
      sfx.charge();
    }, 380);
    return () => window.clearTimeout(id);
  }, [stage, count, cards.length]);

  const arrive = (i: number, color: string) => {
    setCount((c) => c + 1);
    kick.set(1.22);
    void animate(kick, 1, { type: "spring", stiffness: 500, damping: 12 });
    sfx.absorb(i);
    fx.sparks(core.x, core.y, color, 5);
  };

  /* ---------- 2 · An ChatGPT ---------- */
  const send = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      /* ohne Zwischenablage bleibt der Link */
    }
    const q = encodeURIComponent(prompt);
    window.open(q.length < 6000 ? `https://chatgpt.com/?q=${q}` : "https://chatgpt.com/", "_blank", "noopener");
    setReturned(false);
    setStage("wait");
  };

  useEffect(() => {
    if (stage !== "wait") return;
    let away = false;
    const onVis = () => {
      if (document.hidden) away = true;
      else if (away) {
        setReturned(true);
        sfx.pop();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") ?? "";
      if ((e.target as HTMLElement)?.closest?.("textarea")) return;
      if (text) {
        e.preventDefault();
        accept(text);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("paste", onPaste);
    };
  });

  const fetchAnswer = async () => {
    try {
      const text = await navigator.clipboard.readText();
      accept(text);
    } catch {
      setManual(true);
      setError("Zwischenablage gesperrt – füge die Antwort unten ein (Strg + V).");
    }
  };

  const accept = (text: string) => {
    if (text.trim() === prompt.trim()) {
      fail("In der Zwischenablage liegt noch der Auftrag. Kopiere zuerst die Antwort in ChatGPT.");
      return;
    }
    const parsed = parseAnswer(text, promptDays, redactor);
    if (!parsed) {
      fail("Das sieht nicht nach der Antwort aus. Kopiere den ganzen JSON-Block mit dem Kopieren-Knopf.");
      return;
    }
    setError("");
    setDraft(parsed);
    setDirty(true);
    startReveal();
  };

  const fail = (msg: string) => {
    setError(msg);
    sfx.bump();
    void animate(shake, [0, -8, 7, -5, 3, 0], { duration: 0.35 });
  };

  /* ---------- 3 · Enthüllung ---------- */
  const startReveal = () => {
    setStage("reveal");
    if (!core.x) setCore({ x: window.innerWidth / 2, y: Math.min(window.innerHeight * 0.4, 340) });
    if (low) {
      setRp("open");
      window.setTimeout(() => setStage("edit"), 350);
      return;
    }
    setRp("spin");
    sfx.charge();
    const at = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
    at(750, () => {
      setRp("implode");
      sfx.implode();
      doShake(1.2);
    });
    at(1050, () => setRp("drop"));
    at(1650, () => setRp("stamp"));
    at(1830, () => {
      sfx.stamp();
      doShake(0.9);
      const el = document.querySelector(".stamp");
      const r = el?.getBoundingClientRect();
      if (r) {
        fx.dust(r.left, r.bottom, 6);
        fx.dust(r.right, r.bottom, 6);
      }
    });
    at(2550, () => {
      setRp("open");
      sfx.unfold();
    });
    at(3250, () => setStage("edit"));
  };

  const writeYourself = () => {
    setDraft(emptyReport(promptDays));
    startReveal();
  };

  /* ---------- 4 · Speichern ---------- */
  const save = async () => {
    const report = { week, days: draft, saved: Date.now() };
    reportsStore.set((r) => ({ ...r, [week]: report }));
    const { buildDocx } = await import("../journal/docx");
    const blob = buildDocx(week, draft, { name: prefs.name.trim() || "Julian", job: prefs.job, trainingYear: prefs.trainingYear });
    const { dir, kw: k } = reportBase(week);
    const name = `Berichtsheft-KW${k}.docx`;
    const ok = await writeNow(`${dir}/${name}`, blob);
    if (!ok) download(name, blob);
    setSavedTo(ok ? "folder" : "download");
    setDirty(false);
    if (!core.x) setCore({ x: window.innerWidth / 2, y: Math.min(window.innerHeight * 0.4, 340) });
    setCloseFly(false);
    setStage("closing");
    sfx.unfold();
    window.setTimeout(() => {
      setCloseFly(true);
      sfx.whoosh();
    }, 650);
    const target = document.querySelector("[data-archive-btn]")?.getBoundingClientRect();
    window.setTimeout(
      () => {
        sfx.done();
        if (target) fx.confetti(target.left + target.width / 2, target.top + target.height / 2);
        toast(ok ? `Berichtsheft KW ${kw} liegt im Ordner` : `Berichtsheft KW ${kw} heruntergeladen`, "done", 6000);
        onClose();
      },
      low ? 200 : 1300,
    );
  };

  const setDay = (i: number, patch: Partial<ReportDay>) => {
    setDraft((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  const total = draft.reduce((m, d) => m + d.minutes, 0);
  const showCore = stage === "fly" || stage === "charged" || stage === "wait" || (stage === "reveal" && (rp === "spin" || rp === "implode"));
  const coreEnergy = stage === "fly" ? Math.min(1, count / Math.max(1, cards.length)) : 1;

  return (
    <motion.div
      className={`overlay report-overlay stage-${stage}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <motion.div className="report-stage" style={{ x: shake }} onPointerDown={(e) => e.target === e.currentTarget && (stage === "select" || stage === "edit") && tryClose()}>
        {/* ---------- Auswahl ---------- */}
        <AnimatePresence>
          {(stage === "select" || stage === "fly") && (
            <motion.section
              key="select"
              className={`report-select glass ${stage === "fly" ? "is-leaving" : ""}`}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={stage === "fly" ? { opacity: 0, scale: 0.96, transition: { duration: 0.35 } } : { opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <header className="rs-head">
                <div>
                  <h2>Berichtsheft KW {kw}</h2>
                  <p className="muted small">
                    {longDate(dates[0])} – {longDate(dates[4])}
                  </p>
                </div>
                <button type="button" className="icon-btn" aria-label="Schließen" onClick={tryClose}>
                  <X size={16} />
                </button>
              </header>

              <div className="rs-days">
                {dayActs.map((d) => (
                  <div key={d.date} className={`rs-day kind-${d.kind}`}>
                    <div className="rs-day-head">
                      <b>{WEEKDAY_SHORT[weekday(d.date)]}</b>
                      <span className="muted">{shortDate(d.date)}</span>
                      <span className={`kind-pill kind-${d.kind}`}>{KIND_META[d.kind].label}</span>
                      <span className="rs-hours">{d.minutes ? hoursLabel(d.minutes) : ""}</span>
                    </div>
                    {d.acts.length === 0 ? (
                      <p className="rs-none">{d.date > t ? "kommt noch" : isFree(d.kind) ? KIND_META[d.kind].label : "keine Einträge"}</p>
                    ) : (
                      <div className="rs-items">
                        {d.acts.map((a) => {
                          const s = pick(d.date, d.kind, a);
                          const k = `${d.date}|${a.key}`;
                          return (
                            <div
                              key={k}
                              ref={(el) => {
                                if (el) chipRefs.current.set(k, el);
                                else chipRefs.current.delete(k);
                              }}
                              className={`rs-item ${s.on ? "is-on" : ""} act-${a.kind}`}
                              style={{ ["--paper" as string]: ACT_PAPER[a.kind] }}
                            >
                              <button
                                type="button"
                                className="rs-check"
                                aria-pressed={s.on}
                                aria-label={s.on ? "Abwählen" : "Auswählen"}
                                onClick={() => {
                                  setSel((m) => ({ ...m, [k]: { ...s, on: !s.on } }));
                                  sfx.tap();
                                }}
                              >
                                {s.on && <Check size={12} strokeWidth={3} />}
                              </button>
                              <span className="rs-text">{a.text}</span>
                              <span className="rs-tag">{ACT_SHORT[a.kind]}</span>
                              <button
                                type="button"
                                className={`rs-school ${s.school ? "is-on" : ""}`}
                                title={s.school ? "Zählt als Berufsschule" : "Zählt als Betrieb"}
                                aria-label="Schule oder Betrieb"
                                onClick={() => {
                                  setSel((m) => ({ ...m, [k]: { ...s, school: !s.school } }));
                                  sfx.toggle();
                                }}
                              >
                                <GraduationCap size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <footer className="rs-foot">
                <span className="muted small">
                  {selected} {selected === 1 ? "Karte" : "Karten"}
                  {redactHits > 0 && (
                    <>
                      {" · "}
                      <EyeOff size={12} className="inline" /> {redactHits} {redactHits === 1 ? "Name" : "Namen"} geschwärzt
                    </>
                  )}
                </span>
                <button type="button" className="link-btn" onClick={writeYourself}>
                  <PenLine size={13} className="inline" /> Selbst schreiben
                </button>
                <button type="button" className="btn btn-primary btn-glow" disabled={!selected || stage !== "select"} onClick={launch}>
                  <Sparkles size={16} /> Karten einsammeln
                </button>
              </footer>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ---------- Flug ---------- */}
        {stage === "fly" &&
          cards.map((c, i) => {
            if (gone.has(c.key)) return null;
            const dx = core.x - (c.x + c.w / 2);
            const dy = core.y - (c.y + c.h / 2);
            const side = c.x + c.w / 2 < core.x ? -1 : 1;
            const stagger = Math.min(0.09, 1.6 / cards.length);
            const r0 = (i % 2 ? 1 : -1) * (4 + (i % 3) * 2);
            return (
              <motion.div
                key={c.key}
                className="fly-card"
                style={{ left: c.x, top: c.y, width: c.w, height: c.h, ["--paper" as string]: c.color }}
                initial={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
                animate={{
                  x: [0, 0, dx * 0.35 + side * 60, dx],
                  y: [0, -16, dy * 0.35 - 110, dy],
                  rotate: [0, r0, r0 * 4, r0 * 14],
                  scale: [1, 1.06, 0.95, 0.06],
                }}
                transition={{ duration: 1.05, delay: 0.25 + i * stagger, times: [0, 0.14, 0.5, 1], ease: ["easeOut", "easeOut", "easeIn"] }}
                onAnimationComplete={() => {
                  setGone((g) => new Set(g).add(c.key));
                  arrive(i, c.color);
                }}
              >
                <span>{c.text}</span>
              </motion.div>
            );
          })}

        {/* ---------- Kern ---------- */}
        <AnimatePresence>
          {showCore && (
            <motion.div
              key="core"
              className={`core ${stage === "charged" ? "is-charged" : ""} ${stage === "wait" ? "is-wait" : ""} ${stage === "reveal" && rp === "spin" ? "is-work" : ""} ${rp === "implode" && stage === "reveal" ? "is-implode" : ""}`}
              style={{ left: core.x || "50%", top: core.y || "40%", ["--energy" as string]: coreEnergy, scale: kick }}
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <span className="core-glow" />
              <span className="core-ring r1" />
              <span className="core-ring r2" />
              <span className="core-ring r3" />
              <span className="core-orb" />
              <span className="core-orbit">
                <i />
                <i />
                <i />
              </span>
              <span className="core-count">{stage === "fly" ? count : selected}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Geladen: Auftrag senden ---------- */}
        <AnimatePresence>
          {stage === "charged" && (
            <motion.div key="charged" className="core-panel" style={{ top: core.y + 150 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="cp-title">{selected} Karten geladen</p>
              {redactHits > 0 && (
                <p className="muted small">
                  <EyeOff size={12} className="inline" /> {redactHits} {redactHits === 1 ? "Name wird" : "Namen werden"} vor dem Senden ersetzt
                </p>
              )}
              <div className="cp-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStage("select")}>
                  <ArrowLeft size={15} /> Zurück
                </button>
                <button type="button" className="btn btn-primary btn-glow" onClick={() => void send()}>
                  <ExternalLink size={15} /> An ChatGPT senden
                </button>
              </div>
              <button type="button" className="link-btn" onClick={() => setShowPrompt((s) => !s)}>
                {showPrompt ? "Auftrag ausblenden" : "Auftrag ansehen"}
              </button>
              <AnimatePresence>
                {showPrompt && (
                  <motion.pre className="cp-prompt" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    {prompt}
                  </motion.pre>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Warten auf die Antwort ---------- */}
        <AnimatePresence>
          {stage === "wait" && (
            <motion.div key="wait" className="core-panel" style={{ top: core.y + 150 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="cp-title">Warte auf ChatGPT …</p>
              <ol className="cp-steps">
                <li>Auftrag abschicken – steht er nicht schon drin: Strg + V</li>
                <li>Die Antwort mit dem Kopieren-Knopf kopieren</li>
                <li>Hier „Antwort holen“ – oder einfach Strg + V</li>
              </ol>
              <div className="cp-actions">
                <button type="button" className="btn btn-ghost" onClick={() => void send()}>
                  <RotateCcw size={15} /> Nochmal öffnen
                </button>
                <button type="button" className={`btn btn-primary btn-glow ${returned ? "is-pulsing" : ""}`} onClick={() => void fetchAnswer()}>
                  <ClipboardPaste size={15} /> Antwort holen
                </button>
              </div>
              {error && (
                <motion.p key={error} className="cp-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  {error}
                </motion.p>
              )}
              {manual ? (
                <textarea
                  className="cp-paste"
                  placeholder="Antwort hier einfügen …"
                  autoFocus
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text) {
                      e.preventDefault();
                      accept(text);
                    }
                  }}
                  onChange={(e) => e.target.value.includes("}") && accept(e.target.value)}
                />
              ) : (
                <button type="button" className="link-btn" onClick={() => setManual(true)}>
                  Von Hand einfügen
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Enthüllung: Blitz, Mappe, Stempel ---------- */}
        <AnimatePresence>{stage === "reveal" && rp === "implode" && <div key="flash" className="flash" />}</AnimatePresence>

        <AnimatePresence>
          {((stage === "reveal" && (rp === "drop" || rp === "stamp" || rp === "open")) || stage === "closing") && (
            <motion.div
              key="folder"
              className={`folder ${rp === "open" && stage !== "closing" ? "is-open" : ""}`}
              style={{ left: core.x || "50%", top: core.y || "40%" }}
              initial={{ opacity: 0, y: -40, scale: 0.3, rotateX: 55 }}
              animate={
                stage === "closing" && closeFly
                  ? { opacity: 0, x: flyTarget(core).x, y: flyTarget(core).y, scale: 0.1, rotateX: 0, rotate: 12, transition: { duration: 0.6, ease: [0.5, 0, 0.9, 0.4] } }
                  : { opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0, rotate: 0 }
              }
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 210, damping: 16 }}
            >
              <span className="folder-shadow" />
              <span className="folder-back" />
              <span className="folder-sheet">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="folder-cover">
                <span className="fc-title">Berichtsheft</span>
                <span className="fc-name">{prefs.name.trim() || "Julian"}</span>
                <span className="fc-tab" />
              </span>
              <AnimatePresence>
                {(rp === "stamp" || rp === "open" || stage === "closing") && (
                  <motion.span
                    key="stamp"
                    className="stamp"
                    initial={{ opacity: 0, scale: 3.2, rotate: -32 }}
                    animate={{ opacity: 1, scale: 1, rotate: -12 }}
                    transition={{ duration: 0.18, ease: [0.6, 0, 1, 0.6] }}
                  >
                    KW {kw}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Bericht bearbeiten ---------- */}
        <AnimatePresence>
          {stage === "edit" && (
            <motion.section
              key="edit"
              className="report-editor glass"
              initial={low ? { opacity: 0 } : { opacity: 0, scale: 0.45, y: 60, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 40, transition: { duration: 0.35, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
            >
              <header className="re-head">
                <div>
                  <h2>
                    Ausbildungsnachweis <span className="re-kw">KW {kw}</span>
                  </h2>
                  <p className="muted small">
                    {longDate(dates[0])} – {longDate(dates[4])} · {prefs.job}
                  </p>
                </div>
                <span className="stamp stamp-mini" aria-hidden>
                  KW {kw}
                </span>
                <button type="button" className="icon-btn" aria-label="Schließen" onClick={tryClose}>
                  <X size={16} />
                </button>
              </header>

              <div className="re-days">
                {draft.map((d, i) => {
                  const free = isFree(d.kind);
                  return (
                    <motion.div
                      key={d.date}
                      className={`re-day kind-${d.kind}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: low ? 0 : 0.15 + i * 0.06, type: "spring", stiffness: 380, damping: 30 }}
                    >
                      <div className="re-day-head">
                        <b>{WEEKDAY_LONG[weekday(d.date)]}</b>
                        <span className="muted">{shortDate(d.date)}</span>
                        <span className={`kind-pill kind-${d.kind}`}>{KIND_META[d.kind].label}</span>
                        <label className="re-hours">
                          <input
                            type="number"
                            min={0}
                            max={12}
                            step={0.25}
                            value={Math.round((d.minutes / 60) * 100) / 100}
                            onChange={(e) => setDay(i, { minutes: Math.max(0, Math.round(Number(e.target.value) * 60)) })}
                            aria-label="Stunden"
                          />
                          h
                        </label>
                      </div>
                      {free && !d.betrieb && !d.schule ? (
                        <p className="re-free">{KIND_META[d.kind].label}</p>
                      ) : (
                        <>
                          {(d.kind !== "school" || d.betrieb) && <AutoArea label="Betrieb" value={d.betrieb} onChange={(v) => setDay(i, { betrieb: v })} />}
                          {(d.kind === "school" || d.schule) && <AutoArea label="Berufsschule" value={d.schule} onChange={(v) => setDay(i, { schule: v })} />}
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <footer className="re-foot">
                <span className="arch-total">
                  <b>{hoursLabel(total)}</b> <span className="muted">gesamt</span>
                </span>
                <div className="arch-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(reportText(week, draft)).then(() => toast("Bericht kopiert", "info", 2500));
                      sfx.pop();
                    }}
                  >
                    <ClipboardCopy size={14} /> Kopieren
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (dirty && !window.confirm("Bericht neu erstellen? Deine Änderungen gehen verloren.")) return;
                      setStage("select");
                      setDirty(false);
                    }}
                  >
                    <RotateCcw size={14} /> Neu erstellen
                  </button>
                  <button type="button" className="btn btn-primary btn-glow" onClick={() => void save()}>
                    <FileDown size={16} /> Als Word speichern
                  </button>
                </div>
              </footer>
            </motion.section>
          )}
        </AnimatePresence>

        {stage === "closing" && savedTo && (
          <motion.p className="closing-note" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Check size={16} /> {savedTo === "folder" ? "Im Ordner gespeichert" : "Heruntergeladen"}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Zielpunkt für die zugeklappte Mappe: der Archiv-Knopf oben rechts (relativ zur Mappe). */
function flyTarget(core: { x: number; y: number }) {
  const r = document.querySelector("[data-archive-btn]")?.getBoundingClientRect();
  if (!r) return { x: 0, y: -core.y };
  return { x: r.left + r.width / 2 - core.x, y: r.top + r.height / 2 - core.y };
}

function AutoArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <label className="re-field">
      <span>{label}</span>
      <textarea ref={ref} value={value} rows={2} placeholder="Ein Satz pro Zeile" onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
