# Julians Dashboard

Ein persönliches, aufgeräumtes Arbeits-Dashboard: große Uhr, klarer Countdown bis zum Feierabend inklusive frei wählbarer Mittagspause, eine Pinnwand mit Zetteln zum Herumziehen, To-dos, Fokus-Timer und Schnellzugriff. Alles bleibt lokal im Browser.

**Live:** https://65ju.github.io/Work/ (sobald GitHub Pages auf den Branch `gh-pages` zeigt)

## Starten

```bash
npm install
npm run dev        # Entwicklungsserver
npm run build      # Typecheck + Produktions-Build nach dist/
```

## Funktionen

| Widget | Was es kann |
|---|---|
| **Heute** | Uhrzeit mit Sekundenring, Datum, KW, Tagesgedanke und ein Feld „Heute im Fokus“ (setzt sich täglich zurück). |
| **Arbeitstag** | Phase (Vormittag, Mittagspause, Nachmittag, Endspurt, Feierabend), Countdown zum nächsten Meilenstein, Feierabendzeit immer groß sichtbar, Zeitleiste mit Pause und „Jetzt“-Marker, gearbeitete und verbleibende Zeit. |
| **Woche** | Fortschritt Mo–Fr und wie viele Tage bis zum Wochenende. |
| **Fokus** | Timer mit 15/25/50 Minuten, Restzeit im Tab-Titel, Hinweis am Ende. |
| **To-dos** | Hinzufügen, abhaken, per Doppelklick bearbeiten, per Ziehen umsortieren. |
| **Pinnwand** | Zettel frei herumziehen und werfen, Farben, per Doppelklick beschriften. |
| **Schnellzugriff** | Eigene Links als Kacheln. |

- **Layout anpassen:** Widgets am Griff ziehen und auf einem anderen ablegen (tauscht die Plätze), Breite umschalten, ausblenden. Per Tastatur: Griff fokussieren und Pfeiltasten.
- **Einstellungen:** Name, Arbeitsbeginn, Mittagspause (1 Stunde, Beginn 12:00–13:00), Feierabend, Akzentfarbe, helles/dunkles Design, Erinnerungen.
- **Erinnerungen:** sanfter Ton und Hinweis bei Pausenbeginn, Pausenende, 15 Minuten vor und zum Feierabend (optional als Systembenachrichtigung).
