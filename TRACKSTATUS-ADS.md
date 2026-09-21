# Trackstatus advertising integration

`assets/trackstatus/ad-backend.js` fetches the production public banner endpoint
with placement `website_trackstatus` and locale `de`, `en` or `es`. It delegates
to the existing `renderTrackStatusAd` in `ad.js`; no second banner UI was added.
The three trackstatus pages load the integration after that renderer.

Campaign selection is refreshed after 300,000 ms (5 minutes), or earlier at
cache_valid_until. The initial request omits `previous_campaign_id`; every later
request includes the URL-encoded ID of the currently committed, unexpired image.
Pending or failed successors never advance this cursor. After null/expiry/page exit,
the next request has no previous ID. Initial selection and the subsequent cyclic
order (GetSpeed → Rent4Ring → further active partners → wrap) are backend-owned.
The website contains no partner list, artwork paths or target addresses.
Null replies retry after 5 minutes; HTTP/invalid-response errors after 60 seconds.
Requests have a 10-second timeout. Hidden tabs cancel rotation and pending work;
on return an overdue/expired selection refreshes immediately, otherwise the
remaining interval resumes. Expired images are removed even while hidden.

A valid old image stays visible while fetching/loading a successor. Only a
successfully loaded, still-valid successor replaces it. Failed successors leave
the previous image until its own expiry. Null explicitly removes the slot.
An already expired ad is never retained just to avoid a temporary blank slot.

If campaign_id, image_url, target_url and alt_text are unchanged, only its cache
deadline is renewed: no rerender, image reload or extra impression. Different
campaign/artwork creates a new presentation with its own once-only impression.
Page exit clears rotation/expiry timers, aborts requests and cancels pending
image commits. Normal/display mode switches do not trigger an ad selection.

After a successful image load, IntersectionObserver watches that actual image,
including clipping by the scrolling status panel. An impression requires a
positive intersection, a visible/focused document, a connected loaded image and
an unexpired campaign. Each rendered display can attempt one impression only.
Scroll-out/in, focus changes and switching display mode do not reset that flag.
A newly rendered response after expiry is a new display.

Events use UUIDs, campaign_id, kind, placement, platform=web, app_version=null.
POSTs omit credentials and use keepalive. They are best effort without retry.
Native target=_blank links open immediately with noopener/noreferrer/sponsored;
no click handler prevents navigation or waits for tracking. Unsupported or failed
tracking never prevents the link action. With no IntersectionObserver, the ad
can render but no unverifiable impression is sent.

## Verified during implementation

Production DE GET returned HTTP 200, campaign=null and the expected production
CORS origin on 2026-09-10. No real impression/click POST was sent during tests.
15 renderer tests and 25 backend-integration assertions passed with
mocked responses, images, observers and event requests. These cover locales,
null, loading, visibility, one-time impressions, event payloads, keepalive clicks,
cache deadline scheduling, invalid expiry and stale observer cleanup.

Existing `renderTrackStatusAd(imageUrl, targetUrl, altText)` remains available for
local artwork/layout checks. Calls through this presentation-only test hook do
not fabricate backend campaigns or emit tracking. Backend integration tests live
in `tests/trackstatus-ad-backend.test.js`; no production fake switch was added.

## Acceptance after a real backend campaign is activated

Use an approved test campaign and the production website origin (localhost may
be rejected by CORS). Keep Network open with Preserve log. Test analytics will
be real; distinguish the test campaign in backend reporting.

1. **Banner:** Open `/trackstatus/`. Verify GET `/api/v1/public/ads/banner?placement=website_trackstatus&locale=de`
   returns the active campaign. The slot stays absent until image_url loads, then
   shows the original image ratio below status content. A failed image must leave
   no placeholder. Confirm target URL and alt text match the response.
2. **Impression:** Load with the banner outside the visible panel/viewport, or
   with the tab hidden: no impression. Scroll it into view in the active tab:
   exactly one POST `/api/v1/public/ads/events` with kind=impression and the
   expected campaign ID/placement/platform/null app_version and UUID event_id.
   Scroll out/in, blur/focus, and switch normal/display: no duplicate for that
   rendering. Verify the event was accepted in Network and backend reporting.
3. **Click:** Click the banner. The destination must open immediately in a new
   tab; one best-effort click POST should appear with a new UUID. Blocking/failing
   the tracking request must not prevent navigation. Test only approved targets.
4. **Null/cache/errors:** Deactivate the campaign. At cache_valid_until the
   current display is removed and re-fetched; campaign=null leaves no gap.
   Reload can test null immediately. Also test HTTP failure, invalid/expired
   cache_valid_until and failed image. Existing status/SSE must continue normally.
5. **Normal mode:** Verify responsive ratio, narrow mobile widths and status
   panel scrolling with many yellow sectors. Only actually visible ads count.
6. **Display mode:** Enter before and after image loading. Confirm the existing
   slot stays below status content, no clipping breaks layout, and a single
   rendering does not gain a second impression. Exit and Escape still work.
7. **Languages:** Repeat `/en/trackstatus/` and `/es/trackstatus/`; confirm locale=en/es,
   localized artwork/alt text when supplied, and null if backend has no campaign.
   A fresh page load creates a new presentation and may count a new impression.

The production event endpoint must allow JSON POST preflights from the website
origins. This cannot be confirmed by mocked event tests or by a null banner GET.
No changes were made to track GET/SSE, ticker, calendar, sector geometry or layout.
No commit, push or deployment was performed.

## Rotation acceptance

Keep the visible page open beyond five minutes with a campaign whose validity
extends beyond that interval. Network must show another banner GET (no SSE
trigger). With one campaign, the same image remains and no duplicate impression
is emitted. With multiple campaigns each subsequent GET must carry `previous_campaign_id`
matching the actual displayed image and the server must return the next active
partner in its configured cyclic order. Verify GetSpeed → Rent4Ring → additional
partners → GetSpeed. Initial selection may still be weighted. An older backend
that ignores the parameter remains compatible but cannot guarantee rotation.
Throttle image loading to verify the old valid banner stays until the new image
loads. Test a failed successor, null response and short cache expiry. On cache
expiry a blank state is permitted and required if no valid successor is ready.
Hide the tab across the rotation deadline: no repeated GETs while hidden, one
refresh when returning. Leave the page and confirm no later ad rotation occurs.
Mock timer tests exercise this without a real five-minute wait or production
tracking events. `git diff --check` passes.


## Local verification, 2026-09-21

The available contract is the task's description of the optional query parameter;
no separate API attachment or backend source was present in this workspace.
Only the frontend request construction changed; production CSS, renderer, timers,
status, calendar and map code are unchanged.

Reproduce from the website directory with `python3 -m http.server 8876 --bind 127.0.0.1`:

- Open `http://127.0.0.1:8876/tests/trackstatus-ad-rotation.html`:
  15 renderer + 25 existing backend + 93 new integration assertions passed in
  WKWebView. The new suite executes the real renderer and backend adapter with a
  virtual clock, local fetch/image/observer doubles and captured tracking events.
  It covers exact 300000 ms timing, encoded displayed IDs, two/three partners and
  wrap, one/none, atomic load, HTTP/network/invalid-response/timeout/image errors,
  remaining/overdue tab return, cancellation, expiry, late responses and bfcache.
- Open `http://127.0.0.1:8876/tests/trackstatus-ad-layout.html`:
  324 cases across normal/display, nine desktop/iPhone-sized viewports, simulated
  safe areas, three track states and 0/2/12 yellow sectors. Uses production markup,
  CSS and mobile layout logic with a local 600×300 SVG. API scripts are removed;
  CSP prevents external connections. Offscreen WebKit uses a timer for rAF only.
  Checks include intrinsic 2:1 ratio, contain scaling, full artwork inside the
  display panel and existing display-layout invariants. Normal mode keeps 2:1
  intrinsic dimensions; ordinary page/panel scrolling remains allowed.

No production banner/event request is used by either fixture. These are synthetic
layout checks, not verification of the actual Rent4Ring asset or physical Safari
browser chrome. After deployment, verify the backend honors the parameter and
configured order (including inactive partners), correct CORS/cache behavior for
all locales, actual Rent4Ring artwork/destination, and normal/display on a real
iPhone in both orientations. Check production event acceptance only with an
approved test campaign and distinguish those events in backend analytics.
The backend extension has since been confirmed in production by the maintainer:
`previous_campaign_id=getspeed-racetaxi-2026` returns `rent4ring-2026`, and the
reverse returns GetSpeed. Rent4Ring artwork and destination are supplied by the
API. This confirmation does not add partner configuration to the frontend.

## Publication

GitHub Pages publishes the repository root from `main` (legacy branch build).
Publish the tested `feature/trackstatus-live` changes through a pull request to
`main`, respecting required checks and branch protection. Verify the Pages build
and compare the delivered `/assets/trackstatus/ad-backend.js` with the merged
file using a plain HTTP GET, without executing the page or emitting ad events.
