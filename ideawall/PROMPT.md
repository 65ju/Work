# Master-Prompt v2 — „Julian's Digital IdeaWall"

> Überarbeitete, professionelle Fassung des ursprünglichen Briefings. Ziel: maximale visuelle Qualität, spürbar **physikalisch-realistische** Animationen und echte Funktionalität — bei einem **strengen Performance-Budget**, damit alles auch auf einem schwächeren PC flüssig läuft.

---

## 0. Rolle & Auftrag

Du arbeitest in einer Person als **Senior Creative Developer, Motion Designer und Game-UI-Artist**. Du lieferst keine Demo und keinen Prototyp, sondern ein **produktionsreifes, vollständig implementiertes Premium-Produkt**: eine interaktive Startseite namens **„Julian's Digital IdeaWall"**.

Arbeite so, als würde das Ergebnis in einem Award-Showcase (Awwwards, Behance) gezeigt und gleichzeitig jeden Tag produktiv genutzt. Jede Entscheidung — Farbe, Timing, Abstand, Schatten, Sound — ist bewusst getroffen und begründbar.

---

## 1. Produktvision (Nordstern)

**Ein Satz:** Julian öffnet morgens seinen Browser und betritt eine kleine, lebendige Cartoon-Welt, die ihn persönlich begrüßt, ihm beim Denken hilft und sich bei jeder Berührung *physisch echt* anfühlt.

**Der Drei-Sekunden-Test:** Beim ersten Öffnen muss sofort der Gedanke entstehen:
> „Wow, das ist eine komplette kleine Cartoon-Welt für Julian."

**Drei Säulen**

| Säule | Bedeutung |
|---|---|
| **Lebendigkeit** | Die Welt atmet: Wolken ziehen, Server blinken, ein kleiner Roboter lebt am unteren Rand, alles reagiert. |
| **Taktilität** | Jedes Element hat Masse, Trägheit und Material. Klicken, Ziehen, Werfen und Löschen fühlen sich an wie echte Objekte. |
| **Nützlichkeit** | Kein Deko-Spielzeug: Notizen, Fokus-Timer, Tagesübersicht und Ideen-Generator sind echte Werkzeuge für den IT-Alltag. |

---

## 2. Harte Rahmenbedingungen

- **Zielhardware: schwacher PC** (integrierte Grafik, ~4 Kerne, 8 GB RAM). Zielwert 60 fps, Untergrenze 30 fps in jeder Situation.
- **Sprache:** Alle Texte auf Deutsch, persönlich an Julian gerichtet. Julian arbeitet in der IT — die Welt ist subtil mit Code, Netzwerken, Servern, Terminals und Monitoren verwoben.
- **Stack:** React 19 + TypeScript (strict) + Vite, Tailwind CSS v4, Framer Motion, lucide-react, localStorage.
- **Keine externen Bild-Assets:** Alle Illustrationen als handgebautes Inline-SVG und CSS. Keine Video-Hintergründe, kein WebGL, keine schweren Libraries.
- **Keine Platzhalter-Ruinen:** Keine toten Buttons, keine leeren Bereiche, keine „kommt bald"-Features.

---

## 3. Art Direction — „Friendslop Cel-Shading"

### 3.1 Stilprinzipien

Hochwertiges Cartoon-Adventure-Game trifft kreatives Entwickler-Dashboard trifft Comic-Poster. Freundlich, verspielt, charmant, leicht chaotisch, warm — aber **handwerklich präzise**.

- Kein Fotorealismus, keine Business-Optik, keine sterile SaaS-Oberfläche.
- Übertriebene, expressive Formen; alles wirkt handgezeichnet und individuell.
- Charmante Mikrodetails (Schrauben am Monitor, Aufkleber, Tape-Streifen, Gummiente).

### 3.2 Licht-Konsistenz (wichtig für glaubwürdiges Shading)

Es gibt **eine Hauptlichtquelle oben links** (die Sonne im Hero). Daraus folgt für **jedes** Element:

- Randlicht (Rim-Light) oben/links, Kernschatten unten/rechts.
- Harte Schlagschatten fallen nach **unten rechts**.
- Der Mauszeiger wirkt zusätzlich als kleine, bewegliche Lichtquelle auf Karten (Glanzpunkt wandert mit).

### 3.3 Cel-Shading-Rezept (technisch, performance-neutral)

Shading wird **statisch** über Farben und harte Kanten erzeugt — nicht über teure Echtzeit-Filter:

1. **2–3 Tonstufen pro Fläche** mit harten Kanten (Gradient-Stops ohne Übergang).
2. **Outlines:** 3 px in Tinten-Navy (`--ink`), bei großen Elementen 4 px.
3. **Innenschatten ohne Blur:** `inset -8px -10px 0` für den Kernschatten, `inset 4px 4px 0` für das Randlicht.
4. **Harter Schlagschatten:** `box-shadow: 7px 9px 0 var(--ink)` — kein Blur.
5. **Comic-Highlights:** kleine weiße Glanzkerben oben links auf runden Formen.
6. **Halftone-Raster** nur in Schattenzonen, als statisches CSS-Muster.
7. **Glows** ausschließlich über vorgerenderte `radial-gradient`-Flächen (Opacity animierbar), niemals `filter: blur()` auf bewegten Elementen.

### 3.4 Farbpalette (Design-Tokens)

Dunkle, ruhige Basis — Leuchtfarben nur gezielt für Akzente, Aktionen, Licht und Status.

| Token | Hex | Rolle |
|---|---|---|
| `--ink` | `#0b0822` | Outlines, harte Schatten |
| `--night-900` | `#0c0a26` | Tiefster Hintergrund |
| `--night-700` | `#1b1450` | Flächen, Panels |
| `--violet` | `#6b3df5` | Primärakzent, Tiefe |
| `--cyan` | `#2ee6ff` | Interaktion, Fokus, Licht |
| `--neon-blue` | `#3d7bff` | Sekundärakzent |
| `--teal` | `#19e0c2` | Status „OK", Netzwerk |
| `--magenta` | `#ff3ea5` | Highlights, Energie |
| `--coral` | `#ff6b5e` | Warnung, Wichtig |
| `--sun` | `#ffd23f` | Hauptlicht, Name „Julian" |
| `--orange` | `#ff9a2e` | Wärme, Kaffee |
| `--mint` | `#7dffb3` | Erfolg, Erledigt |
| `--lavender` | `#b7a6ff` | Weiche Flächen |
| `--pink` | `#ffa6d1` | Sanfte Akzente |
| `--petrol` | `#0f4c5c` | Schattenfarbe für kühle Flächen |

Jede Kartenfarbe existiert in drei Stufen (**Licht / Basis / Schatten**) für sauberes Cel-Shading. Kontrast für Fließtext mindestens WCAG AA.

**Zwei Stimmungen:**
- **Nachtschicht (Dark):** tiefes Blau-Violett, Neon-Akzente, Sterne/Mond oder Sonnenaufgang.
- **Tagschicht (Light):** Lavendel-, Pfirsich- und Cremetöne, gleiche Tinten-Outlines, gleiche Charakteristik.

Der Himmel im Hero folgt zusätzlich der **echten Tageszeit** (Morgen, Tag, Abend, Nacht).

### 3.5 Typografie

- **Display:** Fredoka (rund, verspielt) — große Überschriften mit dicker Kontur und extrudiertem Comic-Schatten.
- **Text:** Nunito — gut lesbar, freundlich.
- **Daten/Code:** Space Grotesk mit tabellarischen Ziffern für Uhr, Metriken und Terminal-Zeilen.
- Alle Fonts lokal gebündelt (kein Layout-Shift, kein externer Request).

### 3.6 Formensprache

Große runde Ecken (20–32 px), Comic-Sprechblasen, Starburst-Formen, diagonale Linien, Sterne, kleine Blitze, Code-Symbole (`</>`, `{ }`, `=>`, `λ`), Netzwerk- und Server-Details, dezentes Glassmorphism nur auf kleinen Flächen und nur in der höchsten Qualitätsstufe.

### 3.7 No-Gos

Standard-Templates · weiße Standardkarten · Bootstrap-Optik · Icons ohne Persönlichkeit · zufällige Farben · schlechte Abstände · überfüllte UI · lineare 0,3-s-Standard-Transitions · Emojis als Grafik-Ersatz.

---

## 4. Motion-System — „Realismus durch Physik"

Animationen sind der Kern dieses Produkts. Sie sollen sich nicht „animiert" anfühlen, sondern **physikalisch plausibel**: Objekte haben Gewicht, Schwung, Material und reagieren auf Kräfte.

### 4.1 Die acht Prinzipien (verbindlich)

1. **Masse & Trägheit** — Schwere Dinge beschleunigen langsam und schwingen nach; leichte Dinge (Papier) reagieren schnell und flattern.
2. **Federn statt Kurven** — Bewegung basiert auf Spring-Physik (Steifigkeit, Dämpfung, Masse), nicht auf festen Ease-Kurven. Ergebnis: natürliches Überschwingen und Einpendeln.
3. **Antizipation** — Vor großen Aktionen eine kleine Gegenbewegung (Buddy geht vor dem Sprung in die Knie, Button taucht vor dem Auslösen ein).
4. **Follow-through & Overlapping Action** — Anhängsel schwingen nach (Buddy-Antenne, Notiz pendelt am Pin, Flüssigkeit schwappt).
5. **Squash & Stretch mit Volumenerhalt** — `scaleX × scaleY ≈ 1`. Streckung bei Geschwindigkeit, Stauchung beim Aufprall.
6. **Kontakt & Aufprall** — Jeder Aufprall hat Konsequenzen: Staubwolke, Mikro-Stauchung, kurzer Sound, ggf. Bildschirm-Reaktion des Ziels.
7. **Schatten als Höhenindikator** — Angehobene Objekte bekommen größere, weichere, weiter versetzte Schatten; in der Luft schrumpft der Bodenschatten.
8. **Bögen statt Geraden** — Geworfene und fliegende Objekte folgen ballistischen Bahnen.

### 4.2 Feder-Presets

| Preset | stiffness | damping | mass | Einsatz |
|---|---|---|---|---|
| `snappy` | 600 | 32 | 1 | Buttons, Toggles, kleine UI |
| `bouncy` | 420 | 14 | 1 | Pop-ins, Sticker, Erfolg |
| `soft` | 170 | 24 | 1 | Panels, Dialoge, Layout |
| `heavy` | 220 | 22 | 1.6 | Große Objekte, Monitor, Notiz-Landung |
| `needle` | 110 | 7 | 1 | Zeiger & Pendel (sichtbares Nachschwingen) |

### 4.3 Timing-Leitplanken

| Kategorie | Dauer |
|---|---|
| Hover-Reaktion | 80–150 ms |
| Button-Press (Eintauchen) | 60–90 ms, Rückfederung per Spring |
| Pop-in / Toast | Spring, ~350 ms bis zur Ruhe |
| Notiz-Flug beim Erstellen | 600–800 ms |
| Zerknüllen + Wurf in den Papierkorb | ~1,1 s gesamt |
| Intro | ≤ 2,2 s, jederzeit überspringbar |

### 4.4 Signature-Interaktionen (Pflicht)

| Interaktion | Verhalten |
|---|---|
| **Notiz ziehen & werfen** | Beim Greifen hebt sich die Notiz an (Skalierung + größerer Schatten). Während des Ziehens pendelt sie wie Papier an einem Pin — die Neigung folgt der Geschwindigkeit. Loslassen mit Schwung = die Notiz gleitet mit Trägheit weiter und prallt federnd an den Board-Rändern ab. Landung mit Stauchung und dumpfem „Tock". |
| **Notiz erstellen** | Die Notiz fliegt in einem Bogen aus dem auslösenden Button aufs Board, dreht sich dabei ein, landet mit Squash, das Tape „klatscht" drauf. Buddy läuft neugierig darunter. |
| **Notiz löschen** | Die Notiz wird zerknüllt (Papier → Knäuel mit Knitterlinien), fliegt ballistisch in den Papierkorb, der Deckel wippt, Papierschnipsel stieben. Danach Toast mit „Rückgängig". |
| **Erledigt markieren** | Ein „ERLEDIGT"-Stempel knallt mit Überschwingen auf die Notiz, die Notiz zuckt vom Aufprall, Tinten-Spritzer. |
| **Keycap-Buttons** | Große Aktionsbuttons sind physische Tasten: Die Kappe taucht beim Drücken sichtbar in ihren Sockel ein, der Schatten schrumpft; beim Loslassen federt sie mit Überschwingen zurück. |
| **Buddy greifen & werfen** | Der Buddy kann gepackt werden, baumelt wie ein Pendel, und fällt beim Loslassen mit Schwerkraft, Wurfgeschwindigkeit und Abprallen zu Boden. Harter Aufprall → kurz benommen (kreisende Sterne). |
| **Flip-Clock** | Die Uhrzeit wechselt über echte Klappziffern mit Perspektive und leichtem Nachfedern. |
| **Analoge Zeiger** | Fokus-Messgerät mit Zeiger, der beim Wertwechsel sichtbar überschwingt und einpendelt. |
| **Kaffeetasse** | Füllstand als Flüssigkeit mit welliger Oberfläche; beim Nachfüllen schwappt sie. |
| **Stimmungswechsel** | Dark/Light als kreisförmige Enthüllung ausgehend vom Button. |
| **Mauslicht** | Karten neigen sich leicht dem Cursor zu (3D), ein Glanzpunkt folgt dem Zeiger. |

### 4.5 Sound-Design (optional, dezent)

Kleine synthetisierte Sounds per Web Audio API (keine Audiodateien): Pop, Tastenklick, Papier-Rascheln, Knüllen, Wurf-Whoosh, Aufprall im Papierkorb, Stempel, Quietsch-Ente, Erfolg-Arpeggio, Roboter-Gebrabbel. Nur als Reaktion auf Nutzeraktionen, jederzeit stummschaltbar.

### 4.6 Reduzierte Bewegung

`prefers-reduced-motion` und ein eigener Schalter werden respektiert: Intro, Parallax, Partikel und Wurfbahnen entfallen; Zustandswechsel bleiben durch kurze Überblendungen verständlich.

---

## 5. Performance-Budget (schwacher PC!)

Das visuelle Niveau darf **nicht** durch Rechenlast erkauft werden.

**Regeln**
- Animiert werden ausschließlich `transform` und `opacity` (Compositor-only).
- Kein `backdrop-filter` auf großen Flächen, kein `filter: blur()`/`drop-shadow()` auf bewegten Elementen.
- Keine React-Re-Renders pro Frame — Bewegung über MotionValues bzw. direkte Style-Updates in `requestAnimationFrame`.
- Höchstens drei rAF-Schleifen (Parallax, Partikel, Buddy); Partikel-Schleife läuft nur, solange Partikel existieren.
- Alle Schleifen und CSS-Animationen pausieren bei verstecktem Tab bzw. wenn ihr Bereich außerhalb des Viewports ist.
- Partikel-Canvas mit gedeckelter Pixeldichte.
- Fonts lokal, JS-Bundle ≤ 250 KB gzip.

**Qualitätsstufen** (in den Einstellungen wählbar, Standard „Auto")

| Feature | Sparsam | Ausgewogen | Maximal |
|---|---|---|---|
| Parallax (Maus) | aus | an | an + Scroll |
| Partikel-Menge | 35 % | 70 % | 100 % |
| 3D-Karten-Tilt & Mauslicht | aus | an | an |
| Funkelnde Sterne, schwebende Glyphen | reduziert | an | an + mehr |
| Canvas-Pixeldichte | 1× | ≤ 1,5× | ≤ 2× |
| Glassmorphism | aus | aus | dezent |

**Auto-Modus:** Startet anhand von Hardware-Hinweisen (Kerne, RAM, `prefers-reduced-motion`) und misst nach dem Intro die tatsächliche Bildrate. Fällt sie unter ~40 fps, wird automatisch eine Stufe heruntergeschaltet. Optional: FPS-Anzeige in den Einstellungen.

---

## 6. Informationsarchitektur & Layout

Reihenfolge der Seite:

1. **Intro** (einmal pro Sitzung)
2. **Header** — Logo, Navigation (Start, Aktionen, Status, Board), Sound, Stimmung, Einstellungen, Tastenkürzel
3. **Hero** — Begrüßung + illustrierte Welt
4. **Quick Actions** — „Hotbar" aus sechs Keycap-Buttons, ragt in den Hero hinein
5. **Tagesübersicht** und **IT-Status-Panel** nebeneinander
6. **Workspace-Board** in voller Breite
7. **Buddy-Leiste** — fest am unteren Bildschirmrand

**Desktop:** großzügiges Freiform-Board, Hero mit starker Tiefenwirkung, Buddy nutzt die volle Breite.
**Tablet:** zweispaltige Panels, Board bleibt Freiform.
**Mobile:** alles untereinander, Board als Kartenliste, kompaktes Menü, schwebender „+"-Button, Buddy läuft weiter unten mit. Keine horizontalen Scrollbalken.

---

## 7. Features & Akzeptanzkriterien

### 7.1 Intro
- Kurzer Boot-Screen: Mini-Terminal tippt `booting julian.world …`, Fortschrittsbalken, Logo springt mit Squash & Stretch herein, kreisförmige Iris-Blende gibt die Welt frei.
- ≤ 2,2 s, per Klick/Taste überspringbar, nur einmal pro Sitzung, entfällt bei reduzierter Bewegung.

### 7.2 Hero
- Groß: **„Guten Morgen Julian"** — tageszeitabhängig („Guten Tag / Guten Abend / Gute Nacht"), morgens exakt „Guten Morgen Julian". Buchstaben springen einzeln per Feder herein und reagieren auf Hover mit einem Gummi-Wackeln.
- Darunter: **„Bereit für einen produktiven Tag in der IT?"**
- Terminal-Ticker mit wechselnden Statusmeldungen (Schreibmaschinen-Effekt), teils live berechnet: „Dein Workspace ist bereit." · „Heute wird ein guter Coding-Tag." · „3 Ideen warten auf dich." · „Systemstatus: Alles läuft." · „Kaffee-Level: Kritisch" · „Mood: Kreativ und produktiv"
- Illustrierte Welt in Ebenen: Himmel nach Tageszeit, aufgehende Sonne mit rotierendem Strahlenkranz (bzw. Mond + Sterne), Cel-Shading-Wolken, Skyline aus Server-Türmen mit blinkenden Fenstern und Datenpaketen auf Netzwerkleitungen, schwebende Code-Glyphen, Workstation mit Monitor (live tippender Code), Terminal-Monitor mit Log-Zeilen, dampfende Kaffeetasse, Pflanze.
- Maus-Parallax über alle Ebenen.

### 7.3 Quick Actions
Sechs Keycap-Buttons mit eigener Farbe, Icon, Beschriftung und Tastenkürzel:

| Aktion | Kürzel | Verhalten |
|---|---|---|
| Neue Notiz | `N` | Notiz fliegt aufs Board, Bearbeitung startet sofort |
| Fokus starten | `F` | Pomodoro-Timer (15/25/50 min), Buddy setzt Kopfhörer auf |
| Random-Idee | `R` | Ideen-„Spielautomat" mit Walze, Übernahme aufs Board |
| Board aufräumen | `A` | Notizen sortieren sich animiert nach Kategorie in ordentliche Reihen |
| Dark/Light Mood | `M` | Kreisförmige Enthüllung der anderen Stimmung |
| Buddy rufen | `B` | Buddy rennt herbei, springt, winkt, sagt etwas |

Jeder Button: Hover-Glow, Icon-Wackeln, physischer Press, Partikel und Comic-Feedback.

### 7.4 Tagesübersicht
Datum (inkl. Kalenderwoche), Live-Uhr als Flip-Clock, Wetter-Karte (animiertes Cartoon-Wetter, klar als Demo gekennzeichnet), Fokuszeit heute, offene Aufgaben, heute erledigt, Tagesmotivation (pro Tag wechselnd, per Klick weiterblättern).

### 7.5 IT-Status-Panel
Stilisierter Cartoon-Röhrenmonitor mit Schrauben, Aufkleber und Scanlines. Inhalt: „SYSTEMSTATUS: ONLINE" mit pulsierender LED, CPU mit Live-Sparkline, Speicher-Balken, Netzwerk ↓/↑ mit wandernden Paketen, offene Tasks (echt, aus dem Board), Kaffee-Level (Tasse mit Flüssigkeit, sinkt mit der Zeit, „Kritisch" blinkt), Fokus-Level (Zeiger-Messgerät), Uptime. Werte simuliert, aber plausibel und federnd animiert.

### 7.6 Workspace-Board
- Erstellen, verschieben (Freiform mit Wurfphysik), Größe ändern, bearbeiten (inline), löschen (mit Rückgängig), Farbe ändern (8 Farben), Kategorie wählen, als erledigt markieren, suchen, filtern.
- Kategorien: **Ideen · Heute · Wichtig · Coding · Lernen · Später** — plus Status-Filter **Erledigt**. Filter-Chips zeigen Zähler.
- Suche blendet Nicht-Treffer ab; bei null Treffern reagiert der Buddy verwirrt.
- Jede Notiz: dicke Outline, harter Schatten, leichte Drehung, Pin oder Tape, eselsohrartige Schattenecke, Hover-Tilt, Kategorie-Label.
- Leere Notiz beim Verlassen der Bearbeitung → Kopfschütteln-Animation, Buddy verwirrt, Notiz wird entfernt.
- Persistenz in localStorage: Inhalte, Positionen, Größen, Farben, Kategorien, Status, Stapelreihenfolge.
- Papierkorb-Illustration als Wurfziel.
- Export/Import als JSON, Beispielnotizen wiederherstellbar.

### 7.7 Buddy „Byte"
Ein kleiner, freundlicher Cartoon-Roboter mit Röhrenmonitor-Kopf, Pixel-Augen, federnder Antenne und kurzen Beinchen — vollständig aus SVG gebaut, cel-shaded, liebevoll detailliert.

**Lebensraum:** Eine Leiste am unteren Rand im Stil eines Serverrack-Regals mit leuchtendem Datenkabel, darauf Requisiten: Gummiente (Rubber-Duck-Debugging, quietscht bei Klick), Kaffeemaschine, Mini-Server.

**Zustandsmaschine**

| Zustand | Auslöser | Darstellung |
|---|---|---|
| Idle | Standard | Wippen, Blinzeln, Antenne pendelt |
| Walk / Run | Ziel, Ereignis | Beine/Arme im Zyklus, beim Rennen Vorlage + Staubwolken |
| Look | zufällig, Hover | Kopf und Pupillen folgen Cursor bzw. Ereignisort |
| Jump | Klick, Freude | Antizipation (in die Knie) → Streckung → Stauchung bei Landung |
| Happy | neue Notiz | Arme hoch, Sterne |
| Thinking | bei der Ente, neue Notiz | Codezeichen schweben über dem Kopf |
| Sleepy | 40 s Inaktivität | setzt sich hin, „zzz" — wacht bei Aktivität erschrocken auf |
| Error | Fehler, leere Suche | hält rotes Warnschild, Fragezeichen |
| Success | erledigt, Fokus fertig | beide Arme hoch, grünes Häkchen, Konfetti |
| Focus | Fokus-Timer | sitzt mit Kopfhörern am Mini-Laptop und tippt |
| Drink | Kaffee kritisch | läuft zur Maschine, trinkt, Kaffee-Level füllt sich |
| Dangle / Dizzy | gegriffen / harter Aufprall | baumelt / Sterne kreisen |

**Verhalten:** Läuft beim Laden herein und begrüßt Julian. Wandert autonom, besucht Requisiten, läuft zu neuen Notizen, reagiert auf Hover über Aktionen, zeigt Comic-Sprechblasen (bleiben immer im Viewport). Die Physik (Position, Schwerkraft, Squash/Stretch, Antennen-Nachschwingen) läuft in einer rAF-Schleife ohne React-Re-Renders.

### 7.8 Fokus-Modus
Schwebende Timer-Pille mit Fortschrittsring, Pause/Fortsetzen/Stopp, Dauerwahl. Fokus-Level steigt, Buddy ist im Fokus-Zustand. Nach Ablauf: Erfolgs-Feier, Minuten werden der Tagesstatistik gutgeschrieben (auch bei vorzeitigem Stopp anteilig).

### 7.9 Feedback-System
- **Comic-Bursts** („ZACK!", „GESPEICHERT!", „POW!") als Starburst direkt am Ort der Aktion.
- **Toasts** für Bestätigungen mit optionaler Aktion (Rückgängig), `aria-live`.
- **Partikel:** Konfetti, Staub, Funken, Papierschnipsel, Tinte — alle mit Schwerkraft, Luftwiderstand und Outline.

### 7.10 Einstellungen
Grafikqualität (Auto/Sparsam/Ausgewogen/Maximal, inkl. erkannter Stufe), Bewegung (System/Reduziert/Voll), Sound (an/aus, Lautstärke), Buddy (an/aus), FPS-Anzeige, Daten-Export/-Import, Beispielnotizen, Zurücksetzen (mit Bestätigung).

---

## 8. Tastatur & Barrierefreiheit

- Semantisches HTML (`header`, `nav`, `main`, `section` mit Überschriften, `article` für Notizen), Skip-Link.
- Sichtbare, stilisierte Fokusringe. Dialoge mit Fokusfalle, `Esc` schließt, Fokus kehrt zurück.
- Buddy ist dekorativ (`aria-hidden`), alle Informationen sind auch textlich erreichbar.

| Kürzel | Aktion |
|---|---|
| `N` / `F` / `R` / `A` / `M` / `B` | Quick Actions |
| `/` | Suche fokussieren |
| `?` | Tastenkürzel anzeigen |
| Pfeiltasten (+ `Shift`) | Fokussierte Notiz verschieben |
| `Enter` | Notiz bearbeiten |
| `Leertaste` | Erledigt umschalten |
| `Entf` | Notiz löschen |
| `Esc` | Bearbeitung beenden / Dialog schließen |

---

## 9. Technische Architektur

```
src/
  data/content.ts        Texte, Beispielnotizen, Ideenpool, Sprüche
  lib/                   storage, bus (Event-Bus), sound, quality, time, geometry, springs
  state/                 settings, notes, world (Kaffee, Fokus, Statistik)
  fx/                    Partikel-Canvas, Comic-Bursts, Toasts
  components/            Header, Hero, Scene, QuickActions, DayPanel, StatusPanel, Dialoge
  components/board/      Board, NoteCard, Toolbar, Papierkorb
  buddy/                 Byte (SVG), Physik + Verhalten, Leiste mit Requisiten
```

- **State:** React Context + Reducer; Persistenz entprellt in localStorage mit versionierten Schlüsseln (`ideawall:v1:*`) und Fehlerbehandlung (privater Modus, volle Quota).
- **Kommunikation:** typisierter Event-Bus (`note:created`, `note:done`, `ui:error`, `focus:start`, `buddy:call`, …), damit Buddy, Effekte und Panels lose gekoppelt reagieren.
- **Animation:** Framer Motion für UI und Notizen, eigene rAF-Physik für Buddy und Partikel, CSS-Keyframes für dauerhafte Ambient-Loops.

---

## 10. Inhalte

**Beispielnotizen (IT-Alltag):** API-Dokumentation verbessern · Docker-Setup aufräumen · Neue Projektidee testen · Passwortmanager aktualisieren · Monitoring-Dashboard bauen · Kaffee holen · Refactoring für das Auth-Modul · Kubernetes-Grundlagen lernen · Backup-Strategie prüfen · Ticket #4711 (erledigt)

**Buddy-Sprüche:** „Hast du's schon mit Aus- und wieder Einschalten versucht?" · „Es funktioniert auf meinem Rechner!" · „DNS. Es ist immer DNS." · „Kaffee rein, Code raus." · …

**Ideenpool:** ≥ 30 realistische IT-Ideen für den Zufallsgenerator.

---

## 11. Definition of Done

- [ ] Alle Features aus Abschnitt 7 funktionieren vollständig, ohne Konsolenfehler.
- [ ] TypeScript strict ohne Fehler, Produktions-Build erfolgreich.
- [ ] Alle acht Motion-Prinzipien sind in den Signature-Interaktionen sichtbar.
- [ ] Flüssig auf schwacher Hardware (Stufe „Sparsam" ≥ 50 fps, „Ausgewogen" ≥ 45 fps).
- [ ] Desktop, Tablet und Mobile ohne horizontales Scrollen, alle Aktionen erreichbar.
- [ ] Tastaturbedienung und reduzierte Bewegung vollständig unterstützt.
- [ ] Daten überleben Neuladen; Export/Import funktioniert.
- [ ] Drei-Sekunden-Test bestanden.

---

## 12. Vorgehen

1. **Fundament:** Tokens, Typografie, Cel-Shading-Utilities, Qualitätsstufen, Event-Bus, Persistenz.
2. **Welt:** Hero-Szene mit allen Ebenen, Intro, Header.
3. **Werkzeuge:** Board mit allen Notiz-Interaktionen, Quick Actions, Panels, Dialoge.
4. **Leben:** Buddy mit Physik, Zustandsmaschine und Requisiten; Partikel, Comic-Feedback, Sound.
5. **Politur:** Timing-Feinschliff, Responsive, Barrierefreiheit, Performance-Messung auf allen Stufen.
