# Read-through

This order follows one user action through the app. Read the tests beside each domain boundary.

1. `shared/types.ts` — the two generators, inputs, public job and source.
2. `shared/camera.ts` — the three-section catalog and pose data; `shared/presets.ts` — prompt composition and USD estimates. No framework imports.
3. `src/useComposer.ts` — composer reducer and job restoration; `src/App.tsx` — the single-screen interaction: mode, scene, camera, key, source and submission. `PromptInput.tsx` edits the scene and coloured camera text; `GenerationControls.tsx` owns model/duration/ratio/resolution/draft; `UpscaleControls.tsx` owns amount and mode. `SelectMenu.tsx`, `TickFader.tsx` and `ThemePicker.tsx` keep shared interactions small. Upscale replaces the camera surface. Keep each component under 500 lines.
4. `src/useJobs.ts` — same-session job-link restoration, initial history load, per-request keys, single polling loop and submission.
5. `server/validation.ts` — the allowlist. Unexpected fields cannot choose a provider URL, model, cost or arbitrary file.
6. `server/app.ts` — loopback/origin checks, anonymous session cookie, request rate limit and route ownership.
7. `server/jobs.ts` — reserve, persist, submit once, poll, copy, inspect, mark Ready. Budget reservations are conservative.
8. `server/bfl.ts` — exactly two endpoints; allowlisted polling/delivery; safe fixed error messages; no blind POST retry.
9. `server/store.ts` — atomic local snapshots and interrupted-submit handling. `publicJob` removes provider/internal data.
10. `server/media.ts` — actual media inspection, byte bounds and atomic download. `ffprobe` is why this adapter is local.
11. `src/components/FeaturedVideo.tsx`, `Gallery.tsx` and `JobMedia.tsx` — library versus new jobs, decoded-frame reveal, user-triggered library playback, hidden-page pause, explicit playback errors.
12. `src/scene/camera-paths.ts` — pure geometry; then `create-camera-scene.ts` and `CameraPreview.tsx` for the isolated Three lifecycle.
13. `src/components/WaitField.tsx` and `src/effects/dither.ts` — bounded decorative canvas, same-field reveal, reduced motion, cleanup.
14. `src/components/KeyDialog.tsx` — transient page custody and Disconnect; `src/usePageKey.ts` deletes legacy persisted keys. No Web Storage credential.
15. `src/styles/` — small groups of plain CSS, including all responsive and reduced-motion overrides.
16. `tests/` — camera maths, validation/pricing, concurrent caps/idempotency, key non-persistence, session ownership, actual MP4 Range delivery and invalid uploads.

## Decisions worth being able to explain

- Why a closed tab should not lose a server-key result, and why BYO has different recovery guarantees.
- Why an uncertain submission keeps its reservation and is not automatically retried.
- Why Ready follows durable copying and media inspection.
- Why camera controls are absent from Upscale, and why its provider payload has no camera prompt.
- Why the same pure composer runs on both sides but only the server is authoritative.
- Why library clips are usable demonstration material but not empirical camera findings.
- Why the local JSON store is appropriate for this pass and must change for a hosted multi-user deployment.
