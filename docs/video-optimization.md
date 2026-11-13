# Hintergrundvideo-Optimierung, 13.11.2026

Website-Sicherung: `dec0374`, lokaler Branch `redesign/video-optimization`.
Originale: H.264, 1080 × 1920, 25 fps, AAC-Tonspur.
Sicherung außerhalb des Repositorys: `../video-original-backup-2026-11-13/`, mit `SHA256-manifest.json`.
Alle Sicherungsdateien vor dem Entfernen der ignorierten Arbeitskopien erneut per SHA-256 geprüft. Externe Originale und Prototyp unverändert.

## Ergebnis

Größen in dezimalen MB. Alle Ergebnisse: H.264, yuv420p, 25 fps, ohne Audio, MP4 faststart, vollständige ursprüngliche Laufzeit.

| Clip | Original | Desktop 1080×1920 | Ersparnis | Mobil 720×1280 | Ersparnis |
|---|---:|---:|---:|---:|---:|
| VideoTouristenfahrten.mp4 | 76.78 | 24.53 | 68.1 % | 10.92 | 85.8 % |
| VideoNLS.mp4 | 69.26 | 19.39 | 72.0 % | 8.04 | 88.4 % |
| C3714_3_prob3.mp4 | 33.07 | 14.52 | 56.1 % | 6.09 | 81.6 % |
| C3714_5_prob3.mp4 | 28.79 | 13.18 | 54.2 % | 5.70 | 80.2 % |

## Qualitätsentscheidung und Reproduktion

FFmpeg 9.0.2 / libx264, CRF 23, preset slow. Testclip VideoTouristenfahrten.
Original und Ergebnis bei 4, 15 und 28 Sekunden als nebeneinanderliegende Bildausschnitte betrachtet: Helm/Auto, schnelle Fahrszene mit Bäumen und Leitplanken, Nahaufnahme über Asphalt. Keine auffälligen Blockartefakte; feinste Details etwas weicher. CRF 23 beibehalten. Dies ist eine Stichprobenprüfung, keine vollständige bewegte A/B-Sichtung aller Szenen.

Desktop bleibt 1080×1920: `object-fit:cover` nutzt bei z.B. 1920×560 nur ca. 1080×315 Quellpixel. Eine Verkleinerung des Hochkantmaterials würde diesen Ausschnitt zusätzlich weichzeichnen. Mobile verwendet unverändertes `object-fit:contain` und 720×1280; Testbild bei 390 CSS-Pixeln geprüft. Die kleinere Variante spart zusätzlich rund 55–58 % gegenüber Desktop. Keine CSS-, Bildausschnitt- oder Layoutänderungen.

Je Original, von der externen Sicherung aus, Desktop:

```sh
ffmpeg -i "$source" -map 0:v:0 -c:v libx264 -threads 4 -preset slow -crf 23 -pix_fmt yuv420p -an -sn -dn -map_metadata -1 -movflags +faststart "$output"
```

Mobile zusätzlich `-vf scale=720:1280`. Alle vier Quellen sind 25 fps; keine Framerate-Konvertierung und kein Upscaling. Keine zusätzlichen Codecs nötig.

## Einbindung und Tests

- Nur die optimierten Pfade werden geladen. Auswahl Desktop/Mobil einmal beim Initialisieren, passend zum bestehenden 760-px-Breakpoint; kein Variantenwechsel und kein zweiter Download beim Resize.
- Bestehende zufällige Clipauswahl, zufälliger Start mit mindestens fünf Sekunden Restzeit, zufälliger anderer Folgeclip, IntersectionObserver (150 px Vorlauf) und Sichtbarkeitslogik unverändert.
- Stumm, inline, ohne Steuerelemente. Bei reduzierter Bewegung kein Videoabruf; vorhandenes Hintergrundfoto bleibt sichtbar.
- `tests/background-video.test.cjs`: Desktop/Mobil, vier Zufallswerte, Lazy Loading, Zufallsstart, nicht wiederholender Folgeclip, Tab-/Abschnittssichtbarkeit und reduzierte Bewegung erfolgreich im Node-VM getestet.
- Alle acht Dateien vollständig mit FFmpeg fehlerfrei dekodiert. ffprobe bestätigt Codec, Pixeltyp, 25 fps und genau eine Videospur ohne Audio. MP4-Atomprüfung bestätigt moov vor mdat.
- Lokale HTTP-206-Teilabrufe am Anfang und in der Dateimitte für alle acht Dateien bytegenau gegen Dateien verglichen.
- Alle sechs betroffenen DE/EN/ES-Seiten und ihre lokalen Script-, Bild- und Stylesheet-Verweise geprüft.
- Safari-Testseite hat bei allen acht Dateien ein `playing`-Ereignis nach zufälligem Seek mit korrekter Auflösung bestätigt. Temporäre Testseiten anschließend entfernt.
- Desktop-GetSpeed-Layout in Safari gesichtet. Verborgener Safari-Tab bestätigte `src=null`, pausiert: keine unnötigen Videoabrufe. Das externe Booking-Widget meldete lokal einen Ladefehler; Integration unverändert.
- Einschränkung: Browser-Automationshost/Smartphone-Emulator nicht verfügbar. Kein vollständiger Smartphone-Layoutvergleich, keine umfassende Browser-Konsolenprüfung und kein vollständiger bewegter A/B-Vergleich. JavaScript-Syntax und gezielte Verhaltensprüfungen erfolgreich; keine Fehler im Videowiedergabe-Test gemeldet.

## Vor echtem Hosting noch offen

HTTP-Teilabrufe, Content-Type video/mp4, Cache-Header und Start-/Seek-Geschwindigkeit müssen auf dem echten Hosting separat geprüft werden. Die lokale Range-Unterstützung beweist nicht die Hosting-Konfiguration. Keine Hosting-, API-Key-, Push- oder Deployment-Änderungen.
