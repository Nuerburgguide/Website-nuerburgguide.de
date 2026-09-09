> Updated 2026-09-10: see [TF-CALENDAR-RESEARCH.md](TF-CALENDAR-RESEARCH.md) for the official embedded JSON discovery and the implemented localhost-only ticker. The original preparation notes below describe the earlier state.

# Homepage ticker: calendar dependency

## Findings (2026-09-09)

The app uses `lib/core/data/track_calendar_2026.dart` via
`lib/features/track_calendar/widgets/track_calendar_widget.dart`.
`TrackCalendar2026` contains manually embedded 2026 dates and `openFrom` /
`openTo` strings, documented as Europe/Berlin local time. Its source comment
says Nürburgring official schedule, but only gives `Last updated: 2026`.
`lib/core/models/track_day.dart` models one time window per listed day.

The inspected backend `app/api/v1/router.py` and Python application sources
contain no TF calendar endpoint or ingestion service. The public track status
API reports community flags, not official TF opening times. It cannot substitute
for a calendar. No app/backend source, secret or key was changed.

## Required backend work

Expose an anonymous, read-only, CORS-enabled calendar resource for both website
origins, backed by maintained official Nordschleife TF times. Reuse the existing
calendar data pipeline where possible; first establish an update/verification
process for the currently embedded schedule. A static export alone does not
provide freshness or cancellation handling.

The agreed contract needs:
- Nordschleife / tourist-driving identification (exclude GP/other events).
- Session start/end instants with UTC offsets, Europe/Berlin timezone semantics,
  and support for multiple windows per day and DST.
- Cancellations/revisions, official source provenance, last verified timestamp,
  server time, validity expiry and coverage bounds (missing is not known closed).
- A bounded refresh or event mechanism for calendar amendments, with documented
  freshness guarantees. No browser scraping or app identity.

No endpoint URL/schema is assumed or called before agreement. No homepage ticker
is enabled or injected while this dependency is missing; homepage files remain
unchanged. No schedule copied from the app is treated as current official truth.

## Ticker behavior once the calendar contract exists

Show only inside a confirmed, fresh official session, start inclusive/end
exclusive. Hide at session end or when calendar/status data is missing, invalid,
stale or disconnected. Check boundaries against trusted server time anchored to
a monotonic clock, not just the visitor's local timezone.

During the session use the existing public track-status GET followed by one SSE
stream (snapshot replacement + heartbeat), sharing the existing transport when
present. No additional status polling. Reconnect conservatively and hide until
fresh data is available.

Priority: active RED -> red TRACK CLOSED; otherwise active yellow sectors ->
yellow CURRENTLY YELLOW SECTORS with exactly the API-provided sector names;
otherwise -> green TRACK OPEN. Global YELLOW with no valid sector information
must not produce an unsupported TRACK OPEN assertion; hide until reconciled.
Keep this separate from the track page's binary Open/Closed label mapping.

Provide DE/EN/ES UI translations, preserving API sector names. Use a slim
horizontal band with repeated, aria-hidden visual copies and one accessible
status text. Stop animation for prefers-reduced-motion. Render names as text,
not HTML. Hidden state must have no layout footprint.

Required acceptance cases: session boundaries, DST, cancellations, stale calendar,
unknown coverage, RED > yellow > green transitions via SSE without reload,
missing/invalid snapshots, reconnect, reduced motion and all three languages.

## Track-only layout delivered

Track content containers now use 88% viewport width, capped at 1920px;
<=1100px keeps full available width with existing responsive inner padding.
At 1920px content edges are about 143px (previously 348px); at 2560px about
348px (previously 668px). Existing grid ratios expand both map target and status
panel. Map bounds still fit the existing left grid cell automatically.
Shared website/header/footer container rules are unchanged.
The display image uses the existing `nuerburg-guide-logo-mark-white.svg`.

Validation: 24 browser layout checks passed across DE/EN/ES, normal/display,
1920x1080, 2560x1440, 1440x900 and 390x844. No horizontal overflow or display
page overflow. These fixtures tested CSS layout without live Maps/API requests.
Geometry source comparison passed (32 sectors / 291 coordinates); diff whitespace
check passed. Homepage, shared CSS, API transport and app sources unchanged.
