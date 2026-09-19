# Verification — 19 September 2026

## Initial build (before this review pass)

- Production TypeScript/Vite build.
- 24 tests across camera paths, domain validation/pricing, local jobs and media delivery.
- Dependency audit: no known vulnerabilities at install time.
- During development, one real text-to-video request and one precise upscale request completed through the local adapter. Automated provider mocks cover the wider setting matrix without spending credits.
- Actual source MP4: 1280 × 704, 5.042 seconds. Upscale: 2560 × 1408, same duration. Frames inspected: recognisable chair and preserved scene. This is not a camera-following score.
- Ready jobs survive server restart. Both saved clips return **206** for `bytes=0-1023`; a different anonymous session receives **404**.
- Desktop and 390 CSS-pixel mobile UI inspected in the in-app browser; no horizontal overflow at 390px.
- Switching to Upscale removes camera controls; selecting a library source produces its price and dimensions. Camera selection updates the shared prompt. One canvas is present for the diagram.
- Library clip metadata verified with ffprobe; library posters and selected output frames visually inspected.

## Defects caught and repaired

| Evidence                                                              | Repair                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Independent review: tab visibility could start a second polling loop  | One in-flight guard and timer owner                                                          |
| Per-job response could clear another job's missing-key banner         | Derive it from pending BYO jobs and key availability                                         |
| Retry omitted draft mode                                              | Restore the original paid setting                                                            |
| Precise upscale sent a gallery label as prompt                        | Omit provider prompt entirely                                                                |
| Real clip Range returned 500 although temporary-directory mock passed | Permit the authenticated `.local` media path; regress with a `.local` fixture and actual MP4 |
| Diagram and parent both drew a bottom caption                         | One caption owner                                                                            |

## Camera and upscale refinement

- The chosen camera clause is visible inside the composer. Browser checks confirm selecting Dolly in changes both the visible clause and composed prompt; Camera off removes the clause and canvas while preserving the scene text.
- Eight camera silhouettes have distinct direction arrows. The procedural moving camera now has a body, lens, glass, viewfinder, handle and side grip; desktop preview inspected.
- The bottom slider supports 1.5–3× in 0.1 steps. Native Precise/Creative radios work with the keyboard; controls share their actual settings with price and size estimates.
- Browser checks with Bloom study: 1.5× Precise shows approximately 1440 × 792 and $0.77; 3× Creative shows 2880 × 1584 and $4.37. No camera canvas remains in Upscale. The camera composer was also inspected at 390 CSS pixels without horizontal overflow.
- Mock API tests verify both selected upscale values reach BFL, Creative reserves the higher cost, over-budget submissions are stopped, changed settings conflict on an idempotent retry, and invalid factors/modes are rejected. Additional domain tests cover the output-size cap and older requests without a mode.
- The two live requests above belong to the initial pass. Variable-factor/Creative forwarding is verified with mock requests; no additional paid run was made for this refinement.

## Instrument controls and editable prompt

- 24 tests and a production build pass. New tests cover edited/empty camera clauses, camera-off and upscale omission, duration/ratio/resolution validation, draft HD normalisation, legacy jobs, actual provider fields and setting-dependent reservations.
- Clicking the model chevron opens the custom listbox. Arrow-key/Enter resolution selection works; Draft switches Full HD to locked HD ($0.30 for 5 seconds), and switching it off restores Full HD ($1.45).
- A custom camera suffix survives switching away from and back to a preset, and appears exactly once in the composed prompt.
- Duration fader keyboard adjustment changes the estimate; 7-second HD showed $1.19. Upscale source/model/theme custom menus, Creative mode and the 3× setting were exercised in an isolated preview; the cost was $4.37 for Bloom study.
- Desktop Blackstone/Lime and Cyberpunk, the ruled faders and opaque menus were visually inspected. The camera composer was checked at 390 CSS pixels: no horizontal overflow. Automatic textarea sizing avoids idle scrollbars at narrow widths.
- The server was restarted with the updated real request handling. No additional paid operation was needed; this pass verifies the new settings using provider mocks.
- The camera source audit found published example strings in the official guide, but not an exact match for every existing directional preset. [Source mapping](camera-wording.md).

## Limits of this verification

- BYO forwarding, non-persistence and resume checks use an isolated mock key. A separate paid real-BYO run has not been performed.
- The two live calls used the local server connection and a test session. The visible browser has its own anonymous history; their MP4s remain under `.local/media/`.
- No Cloudflare deployment, load test, Safari/iOS device test or independent stranger test yet.
- No scored camera findings, exact-input generation cache or free-camera picker.
- Initial-pass screenshots were only inspected in the task. This review pass adds local desktop and portrait capture files; see the current-pass notes below.
- The operator's first four interaction refinements are applied. Aesthetic approval is pending.

Build output is approximately 82 KB gzip for the app and 123 KB gzip for the lazy Three.js scene. Three reference clips total about 3.3 MB; posters load first and video playback begins on a user gesture.

## Local review pass — 19 September 2026

- 32 automated tests pass, with a clean TypeScript/Vite production build and formatting check. Baseline was 24 tests. `App.tsx` is 369 lines; all source modules remain below 500 lines.
- New geometry coverage checks all 729 combinations (including None) at five points: finite poses, no ground penetration, full orbit closure, pan/tilt versus trucking, and stationary-camera subject rotation. These are illustration tests, not model-following measurements.
- New domain/API coverage verifies section membership, malformed/oversized edits, ordered composition, empty edits, old-job restoration, retained draft resolution, persisted/forwarded camera selections and canonical idempotency with reordered input keys. Session ownership remains enforced.
- Browser checks: all three selections appear as separate colours in the prompt; edited movement text survives switching; None removes that section; Camera off removes camera phrases and canvas; themes update the 3D camera; Upscale hides camera controls. Creative 3× for the library source shows 2880 × 1584 and $4.37. Draft locks to HD then restores Full HD.
- Browser generation check used an isolated mock provider with a real bundled MP4 and the real job API. Observed queued/waiting field, Ready, decoded video (`readyState=4`, width 960), overlay removed, one main job player, successful job-link reload, and a clear fallback for an unavailable job. No paid call was made. A first fixture used relative file paths, causing playback failure; the fixture was corrected to match production's absolute paths, then the flow passed.
- Wide layout measured 1045 CSS pixels of content with no page overflow; composer and main video both measured approximately 846px. Prompt text measured 16.2px, exactly 90% of the previous 18px. Narrow layout measured 500 CSS pixels with no page overflow; textareas retained 16px and the three tile rows scrolled independently. The browser viewport override did not hold the requested 390px, so this pass makes no new 390px-device claim.
- Portable local evidence is kept outside Git in `.dr-morph-review/desktop-main.png`, `desktop-camera.png` and `portrait-camera.png`. The desktop result uses a mock-returned library clip, not a newly generated finding. No console errors were recorded in the isolated result test.
- MORPHKIT lab validation, engine build and registry check pass. Human visual approval remains pending.

Cloudflare/D1/R2, a paid same-subject findings grid, exact-input cache, real BYO/device tests and a stranger test remain deferred. Architecture notes document HTTPS object input and the trusted-metadata requirement for the future Worker adapter; that adapter is not implemented here. Public factual answers live in `docs/questions.md`; the separate private interview coaching document was not edited from this worktree.

## Readability and Camera switch follow-up

- 32 existing tests and the production build pass. Formatting and whitespace checks pass.
- Smallest 6/7-unit text gains 2px; 8-unit text gains 1px at the default root size. Main prompt text and 90% composer geometry remain unchanged.
- Camera now follows Draft in the bottom controls, using the same measured switch dimensions (approximately 56.2 × 24.3px). Camera is enabled on a fresh load; off hides the phrases and camera panel while retaining the scene; on restores the camera controls. Draft remains independent and updates its estimate.
- Enlarged aspect-ratio label fits after widening that field. Desktop (979 CSS pixels) and narrow (352 CSS pixels) views have no horizontal page overflow. The viewport override did not retain requested dimensions; these are measured widths. An initial 268px rendering was below the existing 320px page minimum and overflowed.
- No paid generations. The preset disclosure redesign awaits the operator’s sketch.

## Tabbed camera and balance follow-up

- 40 tests pass, including eight new balance checks: zero credits, malformed balances, safe provider errors, transient network failure, effective-key routing, no persistence and no paid submissions. Production build passes.
- Browser fixture verified shot/angle selections, clearing movement with None, an edited shot phrase retained across expanded/tabbed comparison, and Home-key tab navigation. The combined preview follows the retained selection.
- On a measured 423px viewport, the two-column/two-row preset window scrolls to the remaining four terms via its arrow, disables Next at the end, and has no page overflow. Requested viewport dimensions are not reliable in this browser; actual width is reported. Desktop shows all eight terms without overflow.
- Isolated browser fixture verified balance refresh ($123.45 → $123.35), valid zero ($0.00), rejected key with no verified indicator, and preserved UI state when changing credentials. These are synthetic balances, not a real account check. The fixture cannot submit paid jobs.
- Live local server exposes the new endpoint; without a configured key it returns HTTP 400. No live account balance was verified because the review preview has no key. No paid generation, push or deployment.

## Compact icon follow-up

- Production build and 40 existing tests pass; no new tests were added for this presentation-only change.
- Browser checked that choosing Close-up updates the tab icon and accessible name, switching to Angles retains it, and None restores the dash and removes only the shot phrase.
- At the measured desktop size, tab height changed from approximately 55px to 38px and the initial camera panel from 297px to 256px. At 423 CSS pixels, tab labels fit and the page has no horizontal overflow.

## Cloudflare and media pass — 19 September 2026

This pass supersedes the earlier cloud-deferred notes. The Worker adapter uses D1 and R2; the local Express adapter remains available. Workerd tests use isolated storage and fake BFL responses, with no paid calls.

- 52 tests cover the previous local/domain behavior plus bounded MP4 inspection, end-of-file metadata, high/low glyph orientation, Cloudflare submission deduplication, unknown submission handling, copy-to-R2, session isolation, Range playback, temporary upscale input links and uploaded-byte validation.
- Production frontend build, Worker typecheck and Wrangler deployment dry run pass.
- Desktop and narrow-browser checks confirm named camera choices, corrected angle icons, sideways preset navigation, selection summaries and enlarged-video open/close. Aspect selectors include proportioned rectangle icons. Native touch/Safari testing is still deferred.
- The MP4 parser reads actual 960 × 528 library metadata and gives the same $1.36 estimate for a 2× Precise upscale. A synthetic large-media-box fixture confirms it skips payload bytes to find trailing metadata.
- No real account balance or paid generation has been tested in this hosted pass. A user key is required. Keep the page open until the result is copied; background completion after closing the browser is not guaranteed.
