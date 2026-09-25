# Julian's Digital IdeaWall

Eine interaktive Cartoon-Startseite im „Friendslop"-Cel-Shading-Look: persönliche Begrüßung, Workspace-Board mit physikalisch animierten Sticky Notes, IT-Status-Monitor, Tagesübersicht, Fokus-Timer, Ideen-Generator – und **Byte**, ein kleiner Roboter, der am unteren Bildschirmrand lebt.

Die vollständige Spezifikation (überarbeiteter Master-Prompt) steht in [`PROMPT.md`](./PROMPT.md).

## Starten

```bash
npm install
npm run dev        # Entwicklungsserver
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
```

Der Build ist statisch (`base: "./"`) und läuft auf jedem Webspace.

## Was drin ist

| Bereich | Highlights |
|---|---|
| **Intro** | Boot-Terminal → Logo mit Squash & Stretch → Iris-Blende. Einmal pro Sitzung, überspringbar. |
| **Hero** | Tageszeit-Begrüßung mit Cel-Shading-Typo, Himmel nach Uhrzeit, aufgehende Sonne, Server-Skyline mit Datenpaketen, tippender Code-Monitor, Maus-Parallax. |
| **Quick Actions** | Sechs Keycap-Buttons, die physisch eintauchen und zurückfedern. Kürzel `N F R A M B`. |
| **Board** | Notizen werfen (Trägheit, Pendel-Neigung, Abprallen), Größe ändern, bearbeiten, Farben, Kategorien, Suche, Filter, Erledigt-Stempel, Zerknüllen + Wurf in den Papierkorb, Rückgängig, Aufräumen, Export/Import. |
| **Status-Monitor** | Röhrenmonitor mit CPU-Sparkline, Speicher, Netzwerk, offenen Tasks, Kaffeetasse mit Schwapp-Physik und Fokus-Zeiger mit Überschwingen. |
| **Tagesübersicht** | Flip-Clock mit fallenden Klappen, Wetter (Demo), Fokuszeit, „Heute wichtig"-Liste, Tagesmotivation. |
| **Byte** | Eigene Physik (Schwerkraft, Squash & Stretch, nachschwingende Antenne), Zustandsmaschine mit 17 Posen, greifen & werfen, schläft bei Inaktivität, holt Kaffee, reagiert auf alles. |

## Performance (auch für schwächere PCs)

- Animiert werden nur `transform` und `opacity`; keine Blur-Filter auf bewegten Elementen.
- Shading ist statisch (harte Farbstufen, Innenschatten ohne Blur) und kostet zur Laufzeit nichts.
- Partikel-Canvas läuft nur, solange Partikel existieren; Byte schläft, wenn er stillsteht.
- Animationen außerhalb des Viewports und in versteckten Tabs pausieren.
- **Qualitätsstufen** in den Einstellungen: Auto / Sparsam / Ausgewogen / Maximal. „Auto" misst nach dem Intro die Bildrate und schaltet bei Bedarf herunter. Eine FPS-Anzeige lässt sich einblenden.
- `prefers-reduced-motion` wird respektiert (plus eigener Schalter).

## Struktur

```
src/
  data/        Texte, Beispielnotizen, Ideenpool
  lib/         Event-Bus, Sound (Web Audio), Speicher, Qualitätsstufen, Parallax, Geometrie
  state/       Settings, Notizen, Welt (Kaffee, Fokus, Statistik)
  fx/          Partikel, Comic-Bursts, Toasts
  components/  Header, Hero-Szene, Quick Actions, Panels, Board, Dialoge
  buddy/       Byte (SVG), Physik & Verhalten, Leiste mit Requisiten
```

Alle Daten bleiben lokal im Browser (`localStorage`, Schlüssel `ideawall:v1:*`).
