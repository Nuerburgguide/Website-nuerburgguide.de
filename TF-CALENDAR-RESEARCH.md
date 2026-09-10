> Aktueller Stand: [Produktive Homepage-Ticker-Anbindung](HOMEPAGE-TICKER.md). Die folgenden Recherche-/Vorbereitungsnotizen beschreiben den früheren Stand.

# Calendar investigation and local ticker — 2026-09-10

## Verified app source

The file really exists at:
`/Users/karlreudenbach/Nurburgguide_App/lib/core/data/track_calendar_2026.dart`.
It is not inside the website repository. `TrackCalendar2026` is imported by
`lib/features/track_calendar/widgets/track_calendar_widget.dart`; lines 58 and
132 call `getDayInfo` and `getDaysForMonth`. This is embedded Dart data, not a
network calendar. Its provenance comment says official Nürburgring schedule,
last updated only “2026”; that is not a verifiable freshness guarantee.
No app or backend files were modified, and no environment/mobile keys were read.

## Official public source found

Retrieved without authentication on 2026-09-10:
https://nuerburgring.de/open-hours?locale=en#event-inline-12
(The fragment identifies the section; HTTP retrieves `/open-hours?locale=en`.)

The returned HTML includes `.js-datepicker-div--oh[data-location-id="12"]`
inside `#event-inline-12`, the Nordschleife TF section. Its `data-schedule`
attribute contains HTML-escaped JSON. Decode the attribute with an HTML parser,
then parse JSON. No browser rendering is needed. Other location IDs must not
be mixed in (notably GP track 6).

Observed shape: date-keyed object `YYYY-MM-DD -> day`, 747 entries in the
retrieved sample. Day fields: `periods: [{start: "HH:mm", end: "HH:mm"}]`,
`opened: boolean`, `status`, `message: {de, en}`, optional `exclusion` with the
same fields. **When present, exclusion replaces the base day.** Example:
2026-09-10 had an exclusion with opened=true and 17:30–19:30. This is a captured
schedule example, not a permanent claim about track availability.

The page loads this public script:
https://s3nbrg01prod.s3.eu-central-1.amazonaws.com/assets/footer_application_oh-ad7b9dfd57df2b2134dad5cb95aa25bf6da1222c99b80c9370f7779d01a9d809.js
Its datepicker reads `n.data("schedule")`, looks up date keys, and prioritizes
`d.exclusion`. It also supports an array of date-keyed objects. No separate
calendar API request is needed by this observed calendar implementation.
No documented standalone JSON API/ICS feed was established in this analysis;
script filenames are versioned and must not become production dependencies.

## Assessment

This embedded JSON is a promising backend ingestion source, substantially less
fragile than interpreting rendered calendar cells. It remains an undocumented
website contract, with no stability SLA, authoritative timezone field, coverage
contract or revision/freshness field. Do not treat earliest/latest keys as complete
coverage, missing dates as confirmed closed, or scheduled hours as real-time
opening assurance. No production scraper was installed.

Recommended next step: a small server-side read-only adapter with strict schema
validation, override handling, Europe/Berlin/DST normalization, multiple periods,
explicit unknown states, caching and monitored ingestion. Confirm source usage,
refresh interval, timezone and cancellation semantics before enabling production.
Publish normalized sessions plus serverTime, source, verifiedAt, validUntil and
coverage. Fail closed on HTTP/parse/schema/staleness errors; never extend stale
opening permission. Reuse this source for app and web rather than maintaining
another copied calendar. No backend endpoint URL is invented here.

## Homepage ticker implementation

Added independent `assets/ticker/{state.js,ticker.js,ticker.css}` and a hidden
link after the homepage header in DE/EN/ES. Existing trackstatus files, geometry,
GET/SSE implementation and app logic are untouched. Shared `TrackStatusCore`
parses snapshots; no Maps config/key is loaded by the homepage ticker.

Production has no approved calendar adapter, therefore the ticker stays hidden
and starts no GET/SSE. Query switches cannot enable it on production or preview
hosts. DEV mode requires exactly localhost, 127.0.0.1 or IPv6 loopback. All visible
DEV text carries `DEV / TEST`. Sector names are inserted as text, never HTML.

Local URLs (server on port 8000):
- `/?tfTest=active&tickerTest=green`
- `/?tfTest=active&tickerTest=yellow`
- `/?tfTest=active&tickerTest=red`
- `/?tfTest=inactive&tickerTest=green` (entirely hidden)
- `/?tfTest=active&tickerTest=live` (real public GET then SSE, only if local CORS
  permits; otherwise hidden, no proxy or CORS workaround).
Use the same query on `/en/` or `/es/` for translated copies.

Without reload, local console:
`NGTrackTickerDev.set('active', 'yellow')`
`NGTrackTickerDev.set('active', 'red')`
`NGTrackTickerDev.set('active', 'green')`
`NGTrackTickerDev.set('inactive')`
Synthetic yellow is clearly test data; live mode uses API-provided names only.

Priority: RED, then active yellow sectors, then GREEN. Missing/unreliable data,
unknown state or inactive TF hides the band. Live disconnection hides it until a
fresh snapshot; heartbeat alone cannot restore it. Stale after 90 seconds.
There is no status polling: only a local rendering timer, one initial GET and SSE.
Click goes to `/trackstatus/`. Reduced motion disables the marquee; hover/focus
pauses it. Calendar integration, session-boundary scheduling and production
acceptance are still required before enabling this on the public homepage.
