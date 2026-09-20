# Verification

## Current verified state — 20 September 2026

- The active hosted architecture is Cloudflare Pages with an advanced-mode
  Worker, D1 job state, R2 private media and a four-clip static first-run
  library. The Express adapter remains the local development path.
- 79 automated tests pass across 10 files. Formatting, lint, TypeScript, the
  Vite production build, Worker portability check, Pages bundle, Wrangler dry
  run and an ordered replay of all three D1 migrations pass. Lint reports no
  errors and three existing hook-dependency warnings.
- Browser checks cover the first-run library, title-based prompt reuse,
  full-setting Recreate, lightbox prompt/download actions, explicit unavailable
  media, and responsive desktop/mobile layouts.
- Public media contains recreate inputs and confirmed costs without provider job
  identifiers or private provenance. Visitor keys remain in page/request memory
  and are not persisted.
- No paid provider request, remote migration or deployment was performed by the
  final cleanup and documentation passes. Live paid generation, native-device
  playback and load/concurrency testing remain separate checks.

The sections below are a chronological evidence record. Counts and deferred
items describe the named pass; later sections supersede earlier milestones.

## Initial build — 19 September 2026

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
- The desktop result uses a mock-returned library clip, not a newly generated finding. No console errors were recorded in the isolated result test. Human visual review was completed in later UI passes.

Cloudflare/D1/R2, a paid same-subject findings grid, exact-input cache, real BYO/device tests and a stranger test remain deferred. Architecture notes document HTTPS object input and the trusted-metadata requirement for the future Worker adapter; that adapter is not implemented here. This entry records the earlier local-only milestone; later sections cover the implemented hosted adapter.

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

Hosted smoke checks: HTTP 200 homepage/health/history, Secure HttpOnly session cookie, CSP present and three library entries. R2 `/api/clips/library-01` returns HTTP 206 with the requested 100 bytes. Static library assets return a full HTTP 200 body; browser playback was verified through completion. The public upscale path inspected the stored MP4, then rejected a deliberately invalid key during the credits precheck; no paid submission was made. The live browser lightbox opens, plays a 960 × 528 clip, closes with Escape and restores focus. No browser console errors were recorded.

Cloudflare initially rejected the configured CPU allowance on the Free plan. Removing that setting allowed deployment using existing plan defaults; no upgrade was made. Live paid generation, a valid-key account balance and complex-input CPU performance remain unverified.

## Key custody follow-up

54 tests pass; production build passes. New tests verify legacy session/local key deletion without reads or writes, without clearing unrelated preferences, and with Web Storage disabled. A browser check entered a deliberately invalid fixture key for the read-only balance call and confirmed reload returns to Connect key. No paid request, real key access, password-manager save, or native Keychain access occurred. The keychain integration choice remains pending; the app currently holds credentials in temporary page memory only.

## Compact laptop and Pages pass

- 54 existing tests, TypeScript, Vite production build and Worker typecheck pass. Pages advanced-mode bundle reuses the existing D1/R2 adapter and bounded MP4 metadata reader.
- Browser at measured 1281 × 801 CSS pixels: composer ends at ~655px and gallery starts at ~708px with an edited camera phrase. Removed kicker/header rule; video starts at ~80px. Camera Done applies selection/phrase changes; Cancel preserves the previous result. At 413 × 801 the dialog fits with scrollable content and no horizontal page overflow.
- The optional Keychain prototype passed isolated tests but was removed before commit/deploy following the operator's simplification. No native helper, localhost permissions, ticket endpoints, key database or companion download ships. No actual Keychain secret or paid generation was accessed.

- Pages production `ffebec54-e0d4-4f4b-a3b3-d8516351d687` deployed source `da0c2643cc8942f5c30766f58c8aa6376c74a369`. Canonical URL https://fluxstudio.pages.dev resolves and opens. Live health returns hosted:true/hasServerKey:false; history contains three library sources; MP4 delivery returns 200 and R2 Range returns 206. Published camera dialog opens; lightbox video decodes at 960px width and plays, with a download link. No console errors observed on the deployment tab. Local fixture-key check confirms Your key returns to Connect key after reload. No paid submissions.

## Camera text follow-up

- 54 tests, production build and Worker typecheck pass. Browser verified three borderless phrase lines in one editor, matching section colours; selecting None removes its line and choosing another angle updates the phrase. An edited shot phrase survives Done and appears in the coloured composer summary.
- At a measured 413px viewport there is no page overflow. Longer shot/angle phrases grow to two lines without internal clipping; movement stays one line. No paid calls.

- Published at https://c27c2a68.fluxstudio.pages.dev (canonical fluxstudio.pages.dev), source d7347aed2cd6bd5d268f2d1fc8df1d162ea49018. Live dialog verified shared Camera prompt group, borderless native textarea and theme-derived movement colour.

## Generation feedback and upscale prompt

- 55 tests pass, including separate upscale text, validation, restoration and prompt forwarding in both the Express and workerd adapters. Existing empty-prompt behavior remains covered. Pages build and Worker typecheck pass. No paid provider calls.
- Private browser fixture verified animated cube poses, theme colour changes, the renamed caption, waiting-to-decoded-video reveal and removal of the animation on errors. The animation's reduced-motion and visibility handling were inspected in source; OS reduced-motion was not toggled.
- Browser verified source selection with the optional prompt beside it, typed text appearing in the composed upscale settings, and wrapping below the source at a measured 341px viewport with no horizontal overflow. The temporary viewport override was reset.

## Compact recall and clean navigation

- Isolated browser fixture: Recreate and title selection restore the scene, all three edited camera clauses, 9-second duration, Full HD and 9:16; upscale recreation restores its source, 2.5×, Creative and optional text. These actions did not submit requests.
- The three camera clauses share a flowing coloured line. Enlarged main/gallery playback displays the complete saved video/upscale prompt below the media. Copy was verified by replacing a temporary field and pasting back every submitted camera clause. Escape closes the viewer and restores focus.
- Clean-address selection and reload were checked: the chosen video and setup survive through tab history with no job query in the address. Unit coverage validates legacy links, tab-state IDs and invalid values.
- At a measured 341px viewport, the lightbox stays within the viewport (328px wide); prompt text wraps within 286px and there is no horizontal overflow. Temporary viewport override reset.

- Final checks: 56 tests pass; production frontend build, Worker typecheck and Pages bundle pass. Empty catalog required an explicit library-item type in the Worker. No paid request was made by this verification pass.

- Hosted follow-up smoke: canonical Pages homepage loads the cabin default and an empty public gallery. The final empty-preview badge guard removes the obsolete Library label when no clip exists. Build and Worker typecheck pass after that guard.

## Subtle button feedback and single-row clip actions

- 58 tests pass, including button lifecycle through queued/generating/copying/terminal states and credential resume without a duplicate submission. Pages production build and Worker typecheck pass.
- The operator rejected the initial tiny particles and then the larger voxel cube. The final 20px pixel ring uses eight 3px squares, tracks the label colour through CSS theme transitions, and has the same measured vertical centre as the text. The heavy outer halo is replaced by a faint glow and an animated 1px border highlight. The main video no longer repeats the button status. Static reduced-motion and visibility cleanup remain implemented; OS accessibility settings were not changed.
- Browser fixture with no API calls checked Saving, Ready, missing-key Resume and restored generation states. Desktop metadata fits Ready/cost/Recreate/Download/Upscale on one row; adaptive columns preserve space at narrower widths. At a measured 881px viewport, metadata rows are 18px tall in two columns. Narrow layouts can wrap if a row still exceeds available width. Temporary viewport override reset.
- Public setup links and stale feature descriptions were updated for the current Pages product. No paid provider calls were made.

- Theme QA found a stale canvas colour during the button CSS transition. Resolving colour on painted frames fixes it; both loader and border were checked in Lime and Cyberpunk. Edge rotation is eight seconds.

- Removed the entire scene-suggestion row and its unused styles. Clip actions use one right-aligned group beside status/cost; the default cabin prompt remains.

## Laptop rhythm and prompt reuse

- The initial 341 × 192 preview experiment fitted the first-row actions at approximately 799px, but was rejected after visual review. The final main viewer returns to the composer width with a 380px height cap and a 32px gap before the gallery; the gallery may extend below the viewport. At 1280 × 800 the final main viewer measures 846 × 380 and matches the composer width; the gallery starts at approximately 734px, with 340 × 170 thumbnails beginning near 781px. No horizontal overflow. Prompt text remains 16.2px; the mobile scene editor remains 16px. Long prompts naturally require scrolling.
- At 413 × 800, header controls fit without overlap and there is no horizontal document overflow. Enlarged video playback and full prompt remain available. Temporary viewport override reset after checks.
- Browser checked title click with Draft enabled: subject and all camera clauses changed while Draft, 5s and 16:9 stayed intact. Recreate then restored Draft off, 9s, Full HD and 9:16. No generation request was submitted. Unit coverage checks prompt-only restoration against full restoration, including upscale source/mode preservation.

- Final checks: 60 tests pass; frontend production build, Worker typecheck and Pages bundle pass. No paid provider calls.

## Four-column responsive gallery

- Desktop now uses four equal library columns with 16px gaps across a gallery up to 1280px wide, while compact and phone breakpoints retain two and one columns. A 24px heading gap separates the controls from the images. The main viewer remains aligned to the composer and is capped at 340px high.
- The decorative page footer and its large-screen horizontal rule were removed. Connection and account state remain in the functional header.
- Ready cards omit the redundant status word and show only cost beside Recreate, Download and Upscale. Prompt titles stay clickable for prompt-only reuse.

## Compact Upscale and fluid displays

- 60 tests pass across 10 files. TypeScript, the Vite production build, Worker typecheck, Pages advanced-mode bundle, formatting and whitespace checks pass. No paid provider call was made.
- Upscale removes the decorative header icon and introductory sentence. Source and prompt use equal panels; the upload panel accepts a dropped MP4 or opens a single-file chooser. Existing validation still checks extension, 50MB size, readable metadata, 20-second duration and the supported resolution/pixel bounds before upload.
- The optional prompt auto-grows from about 40px to 88px for longer text and returns after clearing. At the same desktop viewport, the Text-to-video and Upscale composers measured 227.88px and 228.39px respectively; the remaining half-pixel difference is subpixel rounding.
- Stage, preview, type, gallery and gaps interpolate continuously between laptop and wide displays. At 1715 × 966 the stage measured 943.49px and the four gallery cards about 339.67px each; the second row begins below the fold from the top of the page. At 1920 × 1080 the stage measured about 1056px and the cards 381.6px. At 2888 × 1444 the stage reached 1376px, the gallery 2016px and the cards about 492px. No measured viewport had horizontal overflow.
- At 922 × 1080 the Upscale surfaces stack and the gallery uses two columns. At 495 × 960 the source, upload and prompt stack and the gallery uses one column. Actual Finder drag-and-drop, native Safari and a paid upload/upscale remain deferred.
- Public-file review removed a broken documentation link. Old source-input CSS was consolidated into `upscale.css`; production source modules remain focused.

## Limits, lifecycle and first-run library

- 72 tests pass across 10 files, up from 60. TypeScript, the Vite production build, the Worker typecheck and the Pages advanced-mode bundle pass. No paid provider call was made.
- The catalogue was rebuilt from the four hosted runs. Their job rows were read back from remote D1 with a read-only `SELECT`, so every recorded prompt, camera selection, per-term wording, setting and confirmed cost is the stored record rather than a reconstruction. Originals probe as 1280 × 704 H.264 at 24 fps, 5.041667s or 10.041667s; previews are 960 × 528 at the same durations. Declared `bytes` in `gallery.json` equals each preview's real size. Total shipped media is 3.5 MB against 25.8 MB of originals. Both `dist/media` and `.pages/media` carry the clips, posters and catalogue; provider identifiers and internal hashes do not ship.
- First run on the local server with no cookie and no key: `/api/history` returns all four library clips with labels, dimensions, durations and posters and no session jobs; each `/media/library-0N.mp4` and its poster serves 200 at the declared size; `/api/health` still reports `hasServerKey: false`. The catalogue-only `bytes` field does not appear in the response. Equivalent assertions run against workerd with a cookie-less request.
- `wrangler deploy --dry-run` was used to validate the Workers config: an initial `triggers.crontab` key was rejected as an unexpected field and corrected to `triggers.crons`, after which the config validates with no warnings. The retired `library/` objects in R2 still exist and are now unreferenced; `docs/cloudflare.md` records the manual delete rather than removing them from this pass.
- `GET /api/clips/library-01` returns 404 in workerd: library clips are static assets, and a catalogue id is not a route into session storage.
- Workerd: upscaling `library-01` submits `https://studio.test/media/library-01.mp4` as `input_video`, prices it at $1.36 from catalogue metadata (960 × 528 at 2× is 1.93 MP over 10.041667s at $0.07), and creates no `shares` row for a `library/` key.
- Read-route ceilings were exercised on both backends. Against the running local server, `GET /api/history` returned 200 for 60 requests in the window and 429 afterwards with the static limit message; the equivalent workerd case drives `GET /api/jobs/:id` to its own ceiling in an isolated session and observes only 404 then 429, which also shows the limit is applied before the handler.
- Lifecycle: a job left non-terminal past 30 minutes reads back as `expired` with the 30-minute message on both backends. A cron-triggered sweep in workerd, invoked through miniflare's scheduled handler, expired an abandoned job with no request present, deleted an already-expired capability link and a closed rate-limit window, and left its own claim row intact.
- Replay parity was pinned from both sides: reordered settings replay as the original job, and a replay that omits a field the original carried now conflicts on the local server as it already did in the Worker. Unit coverage checks key-order independence inside camera selections, legacy jobs missing `aspectRatio` and `upscaleCreativity`, and an absent `cameraText` resolving to the preset clause rather than blank.
- `parseLibrary` drops externally hosted URLs, zero duration, over-length clips, oversized or missing byte counts, non-integer dimensions and traversal-shaped ids.
- Poster frames for all four clips were inspected directly. Each reads as its recorded camera terms: the chrome chair is a high-angle close-up, the motorbike a low-angle close-up in golden hour, the redwood a macro on wet bark, the cabin a worm's-eye view with the rock filling the foreground. The draft-mode cabin is visibly the softest of the four, consistent with its $0.30 cost.
- Deferred, and unchanged by this pass: the browser extension was unavailable, so the first screen was verified through the API, the served assets and the poster frames rather than a rendered page screenshot. Live paid generation, real-device playback and load testing remain separate checks. A durable background runner that could finish an abandoned job instead of expiring it still requires a key-custody design.

## Recorded runs behind the library

- 74 tests pass across 10 files. TypeScript, the Vite production build, the Worker typecheck and the Pages advanced-mode bundle pass. `wrangler deploy --dry-run` reports no configuration warnings. No paid provider call was made.
- Each catalogue entry now carries its recorded run, read from the originating D1 job rows. The four pasted prompts were compared against the shipped records and match byte for byte, including the original spelling and apostrophes.
- The catalogue test proves reproduction rather than asserting it: every shipped setup passes `validateInput`, `composePrompt` rebuilds its recorded prompt exactly, a full restore returns the same prompt, duration, resolution, aspect and draft. Changing one camera phrase in `gallery.json` fails the test; it was mutated and restored to confirm.
- Served live on the local server: all four clips return their setup with costs of $1.70, $0.85, $1.70 and $0.30 and prompts of 176, 198, 222 and 202 characters. The catalogue-only `bytes` field is still absent from the response.
- Both provider endpoints were re-read for a `seed` parameter. FLUX 3 video documents prompt, aspect ratio, duration, resolution, generate_audio, draft, safety tolerance, user, version and mode inputs; video upscale documents input_video, upscale_factor, creativity, prompt, safety tolerance and webhooks. Neither has one, so no seed is sent or recorded, and the four catalogue clips predate any seed field.
- Not verified here: the browser extension remained unavailable, so Recreate, title reuse and the lightbox Copy were confirmed through the served payload, the build and the restore-path tests rather than by clicking them in a rendered page.
- Known and unchanged: `wrangler.jsonc` carries the `observability` block, but the live deployment is Pages, whose config has none, and its sampling rate is 0.1. Product counts are rolled into `daily_stats` before detailed rows reach retention; Pages still lacks the Workers observability configuration and sampling visibility described here.
- Counts without content: the sweep aggregates each UTC day into `daily_stats` before deleting anything, and a workerd test pins the ordering — a job past retention keeps its count after its row and R2 object are gone, a second sweep over the emptied day does not lower it, and the table's columns are asserted to be exactly day, generations, sessions, ready, failed, drafts, upscales and spend. Moving the rollup after the deletions fails that test; it was mutated and restored to confirm. Nothing about what was generated is stored.

## Hero playback and upscale column alignment

- The main video now takes the same contract as a gallery card: passing `onOpen` to `Clip` is what enables hover preview and makes the play control open the lightbox instead of inline controls, and the existing expand button is unchanged. The hero's lightbox also receives the catalogue clip's recorded prompt, so Copy works there. A Ready job in the hero still renders through `JobMedia`, which owns the waiting and reveal field; that surface was left alone.
- The upscale source row and the toolbar beneath it were separate layouts stopping at unrelated x positions. Both now derive from `--col-model`, `--col-fader` and `--col-mode` declared once on `.composer`, and the row adopts the toolbar's horizontal padding. Resolving the calc chain at one unit: the source select ends at 362 with the fader, and the drop target spans 384–528 exactly as Precise/Creative does. Precise and Creative became equal halves of a fixed pair so the drop target can match them; `--col-mode` is 144 units to keep "Creative" off its padding.
- Fluid behaviour is restored below the breakpoints: the source panel returns to a fluid select at 68rem and a single column at 35rem, where the mode pair also goes back to content width.
- Not verified visually: the browser extension remained unavailable for this pass, so these two changes were confirmed through the resolved column arithmetic, the production build and the styles the dev server actually serves — not by looking at the rendered page. Both are layout-only and need an eye on them.
- Switching Precise and Creative now slides a single selected chip between the two halves, using the same `transform var(--motion-fast) ease` under the same `prefers-reduced-motion: no-preference` guard as the camera and draft switches; the checked label keeps only its colour change. At 144 units the chip and each label are both 68 units wide, so it travels exactly its own width and lands flush on the second segment. Reduced motion falls back to an instant move, and the existing focus outline is unchanged.

## Storage ceilings

- Stored media now has a ceiling as well as an age: 250 MB per session, 3 GB per deployment, enforced in `saveSource` (the only path by which stored media grows) and in the sweep respectively. The initial implementation also removed the job row. The subsequent local review below found that this lost replay protection and counts; quota eviction now removes media while retaining the job record and explicitly marking playback unavailable.
- The clip that just arrived is never evicted. Mutation testing showed the defensive guard for this was unreachable and therefore untested, because a single result is capped at the same 250 MB as a session. That coupling was implicit in two hand-written constants, so `MAX_RESULT_BYTES` was hoisted into `shared/lifecycle.ts` and a test now pins `SESSION_STORAGE_BYTES >= MAX_RESULT_BYTES`; lowering the session ceiling to 100 MB fails it.
- These bound predictability rather than abuse. Generation is charged to the visitor's own key, and measured output averages 6.2 MB for a ten-second clip at $1.70, so filling a session's share costs roughly $70 of that visitor's credits and filling the deployment's roughly $800, against a submission ceiling of eight per minute. The local Express store keeps a developer's own work and has no quota, matching the existing boundary for retention.
- 76 tests pass. TypeScript, the Vite production build, the Worker typecheck and the Pages bundle pass. No paid provider call was made.

## Local cleanup and maintainer review — 20 September 2026

This pass changes the local worktree; it is not a deployment receipt. No remote migration, paid generation or deployment was performed.

- Public media retains the exact Recreate setup in `gallery.json`; private provider lineage is excluded from public files and rebuilt assets. The catalogue regression checks both prompt reproduction and the absence of the private provenance file.
- Browser verification reproduced title reuse leaving Upscale visible, then confirmed the fix switches to Text to video and shows the recorded camera wording while retaining a five-second duration. Recreate independently restored the clip's ten-second duration.
- An isolated Worker with a fake provider reproduced a quota-eviction replay creating a second submission. After the fix, the same replay returns the original job and the provider submission count stays at one. Generated outcome and media availability remain separate so eviction does not reclassify a successful generation as a failure.
- Generated Worker typings are excluded from formatting; the hand-written credit test is formatted.
- Public documentation now links a maintainer/agent review checklist and describes actual rate-limit and cleanup boundaries. Private reference paths and obsolete preparation-document references were removed.
- Live paid generation, native-device playback and load/concurrency testing remain outside this local pass. GitHub Actions configuration and PR-run results are a separate verification gate.

Final local checks: 79 tests pass across 10 files; the Pages production build includes successful frontend and Worker typechecks. Repository-wide formatting and diff whitespace checks pass. The incoming ESLint configuration was run from the separate CI worktree: zero errors and three existing hook-dependency warnings. The unavailable-media browser fixture shows an explicit message in both the hero and gallery, with no playback or download control; Recreate remains available. This is local verification, not a GitHub Actions result.
