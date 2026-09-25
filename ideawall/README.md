# Julians Dashboard

Ein persönliches, aufgeräumtes Arbeits-Dashboard: große Uhr, klarer Countdown bis zum Feierabend inklusive frei wählbarer Mittagspause, eine Pinnwand mit Zetteln zum Herumziehen, To-dos, Fokus-Timer, Schnellzugriff – und ein Archiv, aus dem das wöchentliche IHK-Berichtsheft entsteht. Alles bleibt lokal: im Browser und auf Wunsch in einem eigenen Ordner.

**Live:** https://65ju.github.io/Work/ (sobald GitHub Pages auf den Branch `gh-pages` zeigt)

## Starten

```bash
npm install
npm run dev        # Entwicklungsserver
npm run build      # Typecheck + Produktions-Build nach dist/
```

## Funktionen

| Bereich | Was es kann |
|---|---|
| **Heute** | Uhr mit rollenden Ziffern und Sekundenring, Begrüßung passend zur Tageszeit (rund um die Mittagspause „Guten Mittag“), Feld für den Tagesfokus. |
| **Arbeitstag** | Phase (Vormittag, Mittagspause, Nachmittag, Endspurt, Feierabend), Countdown zum nächsten Meilenstein, Feierabendzeit groß, Zeitleiste mit Pause und „Jetzt“-Marker. |
| **Kopfzeile** | Nächste Pause und Feierabend immer im Blick. |
| **Woche / Fokus / To-dos / Links** | Wochenfortschritt, Fokus-Timer (warnt, wenn die Session in die Pause läuft), sortierbare To-dos, eigene Links. |
| **Pinnwand** | Papierzettel mit Pinnadel und Handschrift: anheben, werfen, abprallen, landen; in den Papierkorb ziehen = erledigt (mit Rückgängig); Farben; Schul-Stempel; Geräusche. Darunter ein Zeitregler, der jeden Tag der Woche zurückholt. |
| **Archiv** | Wochenübersicht Mo–Fr mit Mini-Pinnwänden, Tagesart (Betrieb, Berufsschule, Urlaub, Krank, Frei), Stunden und allem, was an einem Tag notiert oder erledigt wurde. |
| **Berichtsheft** | Karten auswählen → sie fliegen in einen Glas-Kern → Auftrag geht an ChatGPT (Namen werden vorher geschwärzt) → Antwort holen → Blitz, Mappe, Stempel → Bericht bearbeiten → als Word-Datei speichern. Erinnerung am letzten Tag der Woche. |
| **Cursor-Studio** | Eigener Mauszeiger aus kombinierbaren Eigenschaften (Form, Bewegung, Spur, Klick, Hover, Farbe, Größe) mit Live-Vorschau jeder Option, Presets und Zufallsmischung. |
| **Themen (versteckt)** | Doppelklick auf das Logo oder Taste **T**: Aurora, Obsidian (komplett schwarz), Glut, Tiefsee, Synthwave, Moos, Frost. |

- **Atmosphäre:** Liquid-Glass-Karten mit Lichtkanten und Spotlight, Aurora-Hintergrund (im Modus „Maximal“ als GLSL-Shader), Farbschein passend zur Tagesphase – in der Mittagspause warm.
- **Leistung:** Effekt-Stufen Auto / Maximal / Ausgewogen / Sparsam. „Auto“ misst die Bildrate und wählt selbst.
- **Layout:** Widgets am Griff ziehen und tauschen, Breite umschalten, ausblenden.
- **Berufsschule:** Stundenplan (z. B. Di jede Woche, Do in ungeraden KW, 7:40–14:40) und Schulferien in den Einstellungen; an Schultagen zeigt alles „Schulschluss“.
- **Ordner (Chrome/Edge):** Einstellungen → Berichtsheft → „Ordner verbinden“. Danach wird laufend gespeichert: `pinnwand.json`, `todos.json`, `einstellungen.json` und je Kalenderwoche `2026/KW39/2026-09-21.json …`, `bericht-KW39.json`, `Berichtsheft-KW39.docx`. Ohne Ordner: „Sichern“ / „Einlesen“.
- Nichts verlässt den Rechner – außer dem Auftrag, den du selbst in dein ChatGPT einfügst.
