# Mobile Display-Layoutprüfung

Vom Website-Verzeichnis aus einen lokalen Server starten, beispielsweise mit
`python3 -m http.server 8765`, dann
`http://localhost:8765/tests/trackstatus-mobile-layout.html` öffnen.
Die Prüfung einmal ohne und einmal mit zusätzlichen Safe Areas ausführen.
Es werden keine Live-Status-, Werbe- oder Google-Maps-APIs aufgerufen.

Die Fixture verwendet das echte Seiten-Markup, Produktions-CSS und
`mobile-layout.js`. Ein eindeutig gekennzeichneter 2:1-Banner ersetzt die Kampagne.
Die Prüfungen erwarten zusammenhängenden Empty-State, sichtbaren Banner,
erreichbares Exit-X, Platz für Attribution und eine lesbare Yellow-Scrollfläche.

## Geprüft am 11.09.2026

- WKWebView: 402×654, 393×540, 874×292, 844×390, 844×300, 667×250,
  1920×1080 und 2560×1440.
- Jeweils Open ohne TF, Open mit zwei TF-Zeitfenstern und RED;
  jeweils 0, 2 und 12 Yellow-Sektoren.
- Zusätzlich 874×390 mit wechselnder sichtbarer Höhe 390 → 292 → 250 → 390 px.
- Alle Fälle auch mit simulierten Safe Areas: oben 20, unten 21, seitlich 47 px.
- 216/216 Layoutfälle bestanden. In der unsichtbaren WKWebView-Testinstanz wurde
  nur der pausierte Frame-Scheduler durch einen Timer ersetzt.
- Desktop: Panel, Banner, Liste, Track-Slot und Exit-X in allen 18 Fällen
  geometrisch identisch zum Ausgangsstand dieses Änderungsauftrags.

Beispiele mit Open, ohne TF und ohne Yellow, ohne zusätzliche Safe Areas:

| Viewport | Panelhöhe vorher → nachher | Sichtbare Bannerbreite vorher → nachher |
| --- | --- | --- |
| 402×654 | 365 → 272 px | 183 → 240 px |
| 874×292 | 250 → 250 px | 58 → 289 px |
| 844×390 | 348 → 261 px | 187 → 289 px |

Die lokalen Portrait-/Landscape-Renderings wurden visuell mit den vom Nutzer
gelieferten Negativreferenzen verglichen. Sie ersetzen keinen erneuten Test der
Live-Karte auf einem echten iPhone. Geprüft ist der freigehaltene Attributionsbereich,
nicht die Darstellung live geladener Google-Labels oder echter Safari-Browserleisten.
