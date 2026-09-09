# Trackstatus: public live integration and display mode

Local routes: `/trackstatus/`, `/en/trackstatus/`, `/es/trackstatus/`.
No homepage/navigation link has been added. No commit, push or deployment.

## Production contract

`assets/trackstatus/config.js` uses `publicApiOrigin: 'https://api.nuerburgguide.de'`.
The separately configured browser Maps key is not sent to the track API.
Only these public read-only endpoints are used:

- Initial GET `https://api.nuerburgguide.de/api/v1/public/track-status`
- Native EventSource `https://api.nuerburgguide.de/api/v1/public/track-status/stream`

GET uses `credentials: 'omit'` and `Accept: application/json`. Cross-origin SSE
uses `withCredentials: false`. No app headers, tokens, client registration,
proxy, no-cors mode, location or mutating endpoint is used.

GET and `snapshot` payload: `overall_status` (GREEN/YELLOW/RED), `sectors`,
`track_red`, `server_time`. UTC timestamps require `Z`, including fractional
seconds. Each active yellow sector includes integer `sector` in 1..32, `name`,
`type: yellow_flag`, `state: active`, `activated_at`, `expires_at`. Names are
rendered verbatim from the API using text nodes, never translated or HTML.
Backend owns public filtering; frontend defensive validation does not create
pending/report workflows.

## Lifecycle and time

One initial GET (10-second timeout), followed by EventSource. A failed GET shows
unavailable, never GREEN; SSE can still recover through its initial snapshot.
Every snapshot replaces the complete state, including on reconnect. No periodic
GET, polling fallback, or GET triggered by heartbeat/snapshot exists.

`heartbeat` validates server_time and updates the monotonic browser/server time
anchor without an immediate render or GET. The existing one-second UI tick
recomputes remaining time from expires_at; it does not call the API.

Native EventSource handles ordinary reconnects. The last known flags remain
visible during an outage, with a reconnect label. Countdown reaches 00:00 but
cannot falsely clear an offline flag to GREEN. After 90 seconds the last state
is labelled possibly outdated. A 90-second silent-stream watchdog reopens SSE;
a terminal CLOSED stream retries SSE with 5/10/20/40/60-second backoff. Neither
path performs GET. A fresh snapshot clears stale flags and replaces all state.
A heartbeat alone cannot resolve missing snapshots after a disconnect.

Hidden tabs keep their connection; resume recalculates time and checks liveness.
`pagehide` closes EventSource and timers; a bfcache `pageshow` reopens SSE. A
request generation guard rejects any old GET completing after navigation.

RED takes global badge priority. Active yellow sectors remain yellow even with
RED; other sectors become red. Connected expired timed states disappear locally.
If the backend supplies overall RED without a timer, show RED without inventing
a countdown. GREEN retains the unchanged operator/opening disclaimer.

## Display mode

`assets/trackstatus/display.js` operates independently from the live connection.
A translated toggle adds `.track-display-mode` to the document and attempts
`document.documentElement.requestFullscreen()` directly from the click handler.
If unsupported/rejected, CSS display mode remains active. No reload or new
EventSource is involved. Exit button, Escape, and native fullscreen exit restore
the normal page. Async fullscreen/exit races are guarded.

Display hides the website header/footer, page title and disclaimer. The minimal
header places the logo left and a subtle pill-shaped exit button right. Display
outer margins scale from 28 to 80 px (about 61 px at 1920), with generous gaps
and the existing website card radii, shadows and inner spacing. Normal mode
retains its title and full disclaimer. Map remains
dominant on the left; status, yellow timers and optional artwork are on the
right. The panel scrolls with many sectors; sponsor artwork follows all status
content and never replaces it. Normal map dimensions, satellite type, 32
sectors, 291 coordinates and read-only options are unchanged. fitBounds uses
12 px padding in normal mode and 8 px in display mode. Display enables
fractional zoom for tighter fitting of the complete bounds; normal mode uses
integer zoom. No bounds or coordinates change. Google attribution is untouched.

## Checks and remaining live verification

JavaScript tests (run in the available V8 runtime):

- `tests/trackstatus-core.test.js`: 20 status assertions.
- `tests/trackstatus-transport.test.js`: 25 transport assertions.
- `tests/trackstatus-display.test.js`: 14 fullscreen/fallback assertions.

Browser fixture checks: 24 language/layout combinations (normal widths 1440,
1024, 768, 430, 390, 360; displays 1920x1080 and 2560x1440) passed without
horizontal/display vertical overflow. 45 simulated integration checks passed,
including RED + Yellow map colors, updates during display, native reconnect
semantics, heartbeat without GET and a scrollable panel with 32 active sectors.
In the actual Safari UI, the Fullscreen request fell back to CSS display mode;
Escape and the exit button both restored the normal layout without reload.
Native fullscreen success/exit was covered by the automated tests, but not
confirmed in this browser environment.

Read-only coordinate comparison:

```sh
python3 tools/export-track-geometry.py /path/to/app/lib/content --check
```

All original coordinate pairs, names, IDs, boundaries and bounds are verified.
No app/backend files or mobile keys are read/changed for this integration.

Live endpoint checks on 2026-09-09 returned HTTP 200 and GREEN for GET, and a
valid initial snapshot for SSE. Production origins receive their correct CORS
headers. At the latest check, responses for `http://localhost:8000` and
`http://127.0.0.1:8000` did NOT include Access-Control-Allow-Origin, despite
being listed as allowed in the handoff. This is an accepted local testing limitation, not a website integration error.
Do not bypass it or change the API logic. The real live acceptance test will
run on the production domain after deployment.

Additional live observation: the CLI SSE connection delivered its initial
snapshot and then EOF after approximately 30 seconds, without an observed
heartbeat. This does not establish whether the cause is the backend/proxy or
the testing environment. Confirm persistent heartbeats on the production domain after deployment. Native reconnect handling remains implemented.

Remaining real end-to-end step: after deployment, observe actual app Yellow
activation/removal and RED in the production website, including timers/colors. Synthetic test scenarios do not substitute for this test.

Google Maps API key restrictions remain a separate provisioning concern. Keep
production/development keys appropriately restricted; do not output key values
in chat, logs or commits. Browser keys are public, not backend secrets.


## Sponsor artwork adapter (no campaign backend assumed)

Each language has a hidden `#track-ad` after the yellow-sector list. `ad.js`
exposes a presentation-only interface, not a proposed backend response schema:

```js
window.renderTrackStatusAd(imageUrl, targetUrl = null, altText = '');
window.renderTrackStatusAd(null); // No active campaign: remove the entire slot.
```

The future integration must map VERIFIED backend fields to these arguments.
No campaign endpoint, automatic fetch, campaign selector, schedule, tracking,
mock campaign or default advertisement is installed. Required handoff:

- Actual existing public campaign endpoint, response example and CORS/access contract.
- Field mapping for image URL, optional destination and alt/partner name.
- Rules for active/no-campaign, expiry, placement, language and campaign changes.
- Existing update mechanism or permitted refresh policy, plus any required metrics.
- Official artwork dimensions/aspect ratio (currently not provided).

The image's intrinsic aspect ratio is preserved with width:100%, height:auto
and object-fit:contain. No guessed ratio/cropping or extra sponsor card.
A campaign becomes visible only after image load. Missing, invalid or failed
artwork hides the whole slot; stale load callbacks cannot restore an old ad.
HTTPS and same-origin HTTP assets are supported; script/data URLs and embedded
credentials are rejected. Optional links use noopener/noreferrer/sponsored.
The alt text or translated accessible fallback names the link without adding
visible copy. Display permits ads and keeps them below all status information.

## Final deployment preparation

Trackstatus asset URLs carry `?v=20260909-02`; the shared stylesheet uses the
existing homepage version. Root-relative assets match the repository's custom
GitHub Pages domain (`CNAME: nuerburgguide.de`). No build step is required.
Production API config is enabled and unchanged. The existing Maps key value
was neither changed nor output. Google Cloud's Website API Key was checked
read-only: Websites restriction, only Maps JavaScript API, and both production
referrers `https://nuerburgguide.de/*` / `https://www.nuerburgguide.de/*` are
present. Actual execution on those origins is verified after deployment.

No mock, local campaign, test artwork or API override is referenced by production
pages. Temporary QA files are removed. `noindex, nofollow` remains intentional
for this separately accessible page; there is still no homepage link. No Git
staging, commit, push, deployment or homepage reset was performed.

Final checks: 70 JavaScript assertions (including 11 artwork cases), 123 browser
fixture assertions, 24 language/layout combinations. Normal widths 1440, 1024,
768, 430, 390, 360; display 1920x1080 and 2560x1440. No horizontal or display
vertical overflow. Hidden display title, aligned logo/exit, wider margins, normal/display disclaimer
visibility, artwork ratio and hidden empty slots verified. API transport/core,
key configuration and existing homepage changes remain unchanged. 32/291
source comparison passes. Browser fixture statuses are test-only, not live proof.

## Immediately after deployment: production acceptance

1. Open https://nuerburgguide.de/trackstatus/ with DevTools Network/Console.
   Confirm updated asset versions, Google Satellite, full track and attribution;
   no Maps/authentication or CORS errors. Repeat on www if served there.
2. Verify one public GET returns the real state, followed by one active public
   EventSource. No credentials/app headers or periodic GETs. Observe a full
   snapshot and heartbeat; heartbeat causes no GET.
3. In the app activate Yellow for Döttinger Höhe. Without reloading, verify sector
   32 turns yellow, exact name appears and its countdown decreases. Remove it
   in the app: row disappears and overall status returns to GREEN if appropriate.
4. Test RED via the app, including RED + Yellow: red badge/timer, yellow sector
   stays yellow, remaining track is red. Clear the test states in the app.
5. Disconnect/reconnect the browser network: last flags remain, reconnect label
   appears, long outage shows stale, fresh snapshot restores the real state.
   Initial offline load must show unavailable, not GREEN.
6. Enter display on 1920x1080 / 2560x1440: hidden title, logo left, exit right, generous margins,
   no disclaimer, no ad without campaign. Repeat a status update in display.
   Exit via Escape/button without reload. Check native fullscreen and fallback.
7. Repeat basic status, language links, empty-yellow text and layout on EN/ES and
   mobile widths. Sector names must not change with language.

The source is prepared for deployment; these production acceptance checks and
real campaign integration remain explicitly separate work.
