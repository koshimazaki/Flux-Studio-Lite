# Verification — 19 September 2026

## Passed

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
- Browser screenshots were inspected in the task; portable screenshot files still need to be captured for a complete visual evidence pack.
- The operator's first four interaction refinements are applied. Aesthetic approval is pending.

Build output is approximately 82 KB gzip for the app and 123 KB gzip for the lazy Three.js scene. Three reference clips total about 3.3 MB; posters load first and video playback begins on a user gesture.
