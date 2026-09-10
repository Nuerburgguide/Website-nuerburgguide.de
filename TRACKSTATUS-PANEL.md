# Trackstatus panel refinement — 2026-09-10

## Ticker audit

The checked source still has a localhost-only DEV ticker, not a production
calendar adapter. `assets/ticker/ticker.js` returns before any production request.
No fresh/known/session-window response is consumed in this current repository.
Therefore production remains safely hidden even during TF; a successful
production calendar integration cannot be claimed from this source. No API or
calendar behavior was changed, and no 15:xx test was used to bypass session gates.

24 ticker tests pass: DEV active green/yellow/red, inactive, unknown-calendar
simulation, unreliable/missing status and production DEV-switch rejection.
The unknown test is a simulation, not a production calendar-response test.
DE/ES strings retain their translations; EN has TRACK OPEN / CURRENTLY YELLOW /
TRACK CLOSED. Existing test URLs and console controls remain unchanged.

## Viewport and panel changes

Only fit padding moves the track: normal up to 24px left, display up to 36px
left (previously 0/16px). Shift is capped to a fraction of the inner gap. Left
and right padding sum is unchanged, preserving fit scale for the same grid cell.
No sector coordinates, colors, GET/SSE, timer or ad logic changed.

Display desktop container: 92% width capped at 2080px, grid ratio 2.05:1.
Normal container/grid unchanged. Display panel padding: 28px; mobile 18px.
Approximate display widths:
- 1920x1080: panel 547px, banner area 489px.
- 2560x1440: panel 645px, banner area 587px.
Banner spans available inner width, margin above 24px (mobile 16px), preserving
original artwork ratio through object-fit:contain. Tall artwork is limited to
24dvh (mobile 16dvh) so it cannot displace all list content. Normal banner CSS
and the ad slot/rotation/tracking are unchanged.

## Yellow list

Flex panel keeps all siblings stationary while only the yellow list can shrink
and scroll. Normal max-height 320px. Display preferred max-height is
clamp(160px,36dvh,520px), shrinking further to preserve status and banner space.
At 1920x1080 with the tested 16:9 banner and 32 rows it measured 359px. The panel
stays compact for short lists. The banner remains below the list with consistent
panel bottom padding. Mobile gives the panel up to 60dvh instead of forcing it
into half of the grid; the map keeps its own remaining area.

`yellow-scroll.js` observes row membership and list dimensions, never SSE or ads.
Three-second initial pause, 12 CSS pixels/second downward, three-second bottom
pause, then the same speed upward and repeat. Only scrollTop of the list changes.
Row changes reset to the beginning; countdown text changes do not reset it.
No motion when content fits. Reduced motion disables animation; manual scrollbar
and keyboard access remain. Pointer/focus interaction pauses automation; wheel
interaction delays it. Hidden documents and page exit stop the animation.

## Validation

144 Safari layout fixture checks: DE/EN/ES, normal/display, 1920x1080,
2560x1440, 1440x900, 390x844; 0,1,3,5,10,32 yellow rows and loaded 16:9 artwork.
No horizontal overflow, offscreen display panel, hidden banner or zero-height
nonempty list. Fixtures use real page CSS and simulated content, without API,
Maps requests or ad tracking. They are not proof of live satellite rendering.
13 animation tests cover timing, downward/upward movement, row changes, short
lists, reduced motion, interaction, hidden state and pagehide cleanup.
24 ticker assertions and 25 transport assertions pass. Geometry source check
confirms 32 sectors/291 coordinates; git diff --check passes.
No commit, push or deployment.

## Kalenderzeiten bei Open

`calendar-hours.js` ergänzt ausschließlich bei grünem Badge die reinen Uhrzeiten rechts innerhalb der grünen Statusfläche
mit allen heutigen TF-Perioden (Europe/Berlin, Serverzeit plus monotone Zeit).
Kalenderabruf alle 20 Minuten und nach Tab-Rückkehr. RED, unbekannte, fehlende
oder abgelaufene Kalenderdaten sowie Fetch-Fehler verbergen die Zeile vollständig.
DE/EN/ES: reine Uhrzeiten ohne Sprachzusatz. Keine Produktions-Testdaten.
42 neue Panel-Logiktests plus 138 bestehende Tests bestanden.
