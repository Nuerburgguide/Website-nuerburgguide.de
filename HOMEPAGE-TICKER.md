> Aktueller Stand: Homepage-Ticker produktiv deaktiviert (früher Return ohne lokalen DEV-Schalter). Code und lokale DEV-Helfer bleiben erhalten. Die folgende Beschreibung dokumentiert die vorbereitete Anbindung.

# Homepage-Ticker — produktive Kalenderanbindung

Stand: 2026-09-10. Lokal implementiert, nicht deployed.

Der bisherige Ticker war durch einen frühen localhost-/DEV-Check vollständig
für Produktion gesperrt. Ohne lokale Testparameter verwendet er jetzt:
`https://api.nuerburgguide.de/api/v1/public/track-calendar`.

Der Kalender wird beim Start, bei Rückkehr zum Tab/Fenster und alle 20 Minuten
abgerufen. Es gibt kein Browser-Scraping. `fresh=true`, `known=true`, gültige
Perioden und verbleibende Freshness sind erforderlich. Die Zeitbasis ist
`server_time` plus monoton verstrichene `performance.now()`-Zeit.
Session-Beginn ist inklusiv, Session-Ende exklusiv. Eigene Grenztimer schalten
an Beginn, Ende und Freshness-Ablauf ohne zusätzlichen HTTP-Request um.
Fehler, UNKNOWN, abgelaufene Kalenderdaten oder unzuverlässiger Trackstatus
verbergen den Ticker vollständig.

Trackstatus bleibt initial GET plus SSE, ohne Status-Polling. Vollständige
Snapshots ersetzen den Zustand. Priorität: RED, aktive Yellow-Sektoren, Open.
Sektornamen kommen aus dem Status. Bestehende DE-/EN-/ES-Texte bleiben erhalten;
Links führen zur jeweiligen sprachspezifischen Trackstatus-Seite.

## Lokaler Test

Server im Repository: `python3 -m http.server 8000`.
Nur localhost und 127.0.0.1 akzeptieren `tfTest=active|inactive` und
`tickerTest=green|yellow|red|live`. Auf Produktionsdomains werden diese
Parameter ignoriert. DEV-Anzeigen tragen ausdrücklich „DEV / TEST“.
Mit aktivem DEV-Parameter erlaubt `NGTrackTickerDev.set('active', 'yellow')`
Statuswechsel ohne Reload; `'red'`, `'green'` und `'unknown'` entsprechend.
`NGTrackTickerDev.set('inactive')` verbirgt den Ticker.
Ohne DEV-Parameter werden auch lokal echte Backend-Daten genutzt.

- http://localhost:8000/
- http://localhost:8000/?tfTest=active&tickerTest=green
- http://localhost:8000/?tfTest=active&tickerTest=yellow
- http://localhost:8000/?tfTest=active&tickerTest=red
- http://localhost:8000/?tfTest=inactive
- http://localhost:8000/trackstatus/
- http://localhost:8000/en/
- http://localhost:8000/es/

## Prüfung

142 Logik-/Regressionstests bestanden, davon 30 Ticker-/Kalenderprüfungen.
Safari: 30 Ticker-Zustands-/Sprach-/Link-/Overflow-Prüfungen bestanden.
144 Trackstatus-CSS-Layoutfälle bestanden (DE/EN/ES, normal/Display,
0/1/3/5/10/32 Yellow-Sektoren, 1920×1080, 2560×1440, 1440×900, 390×844).
Layoutfixtures verwenden ein Testbanner; keine echten Werbeevents.
Diese Fixtures prüfen Abmessungen/Overflow, nicht Google-Satellitenpixel.
Trackstatus-, Werbe-, Geometrie- und Kalenderbackend-Code unverändert.

CORS-Prüfung: Kalender antwortet HTTP 200 und erlaubt Origin
`https://nuerburgguide.de`. Für `http://localhost:8000` fehlt derzeit
Access-Control-Allow-Origin. Reale Kalenderdaten sind deshalb im lokalen
Browser blockiert; der Ticker bleibt korrekt verborgen. Lokale DEV-URLs
funktionieren unabhängig davon. Für lokale Live-Tests müsste das Backend
diesen Origin ausdrücklich freigeben. Keine Backend-Änderung vorgenommen.
