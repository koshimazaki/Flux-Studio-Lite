# Architecture and the cloud boundary

```text
React composer → same-origin local API → BFL submit / poll
                       ↓                       ↓
                atomic JSON jobs ← copied MP4 + inspected metadata
                       ↓
                session-owned history / byte-range playback
```

`shared/` owns model inputs, camera wording and pricing. The browser and server use the same composer. The server validates every input again and never accepts a user URL or arbitrary upstream endpoint. Upscale uses a session-owned clip id; the server inspects its real MP4 metadata and sends its base64 bytes to BFL.

The live contracts are native `fetch` calls to `/v1/flux-3-video` and `/v1/flux-tools/video-upscale-v1`. Return `cost` values are credits, converted to USD by dividing by 100. Estimates and confirmed charges have separate fields. BFL's optional progress is not replaced with a fabricated percentage.

The prompt is a single visual editing surface with a scene textarea and up to three section-coloured camera textareas. Keeping the fields separate preserves colouring, native editing, paste and selection without a rich-text dependency. Per-term edits stay in a small React reducer; disabling the camera omits only that field. `composePrompt` uses the ordered edited camera text, including an intentionally empty value, identically in preview and submission. The diagram still illustrates the named combination; it does not parse custom text.

Upscale accepts a finite factor from 1.5 to 3 and `upscaleCreativity` of 0 (Precise) or 1 (Creative). The provider receives both settings. Precise costs $0.07 per output MP-second; Creative costs $0.10. Shared estimates cap output at 13.75 MP and preserve aspect ratio; displayed dimensions are approximate because the provider controls final rounding. The server reserves the selected mode's cost using inspected source metadata. Earlier requests without the mode default to Precise; retry restores both controls.

Video generation validates whole-second durations from 5 to 20, seven explicit ratios and four resolution classes. Prices are per second: HD $0.17, Full HD $0.29, QHD $0.40, UHD $0.80; draft is HD at $0.06. Draft disables the resolution menu and preserves the preferred selection in the browser, while both client and server submit HD. Missing aspect ratios on earlier jobs default to 16:9.

`SelectMenu` is a small shared listbox for model, ratio, resolution, source and theme. Whole triggers and chevrons share the same button; arrow keys, Home/End, Enter, Escape and focus restoration work without a UI library. Native range inputs retain keyboard behaviour beneath an instrument-style ruler. Theme tokens switch using `data-theme`; only the theme choice is persisted in localStorage.

## Job lifecycle

`submitting → Pending → Reasoning / Generating → copying → Ready`

Errors, moderation and expiration are terminal. A submission is persisted with its idempotency key and budget reservation before the API call. An uncertain POST is never automatically repeated. On process restart, an interrupted `submitting` job becomes an explicit error asking the operator to check BFL usage.

Poll and copy are retryable and protected by a per-job in-flight lock. `Ready` means the local file and measured metadata exist, not merely that the provider returned a URL. Downloads use a bounded stream, temporary file and atomic rename. Only documented HTTPS BFL poll/delivery hosts are allowed; redirects are rejected and no key is sent to media delivery.

The server sweeps its own-key jobs every five seconds, even after the browser closes. BYO jobs are polled by the page every four seconds with a fresh key header. Browser polling pauses when hidden and never creates overlapping timer loops. New-tab restoration needs a key again.

## Deliberate library choices

- **React reducer:** composer settings, per-term edits and retry restoration live in `useComposer`; one screen does not need a global store. Job polling lives in one hook, shared business rules outside React.
- **Raw Three.js:** one isolated, finite procedural scene. No controls, assets, rigging, shadows or React renderer dependency. Geometry/materials, animation and listeners are disposed. R3F would become useful as the scene grows.
- **CSS / native animation:** short panel transitions and a 1.6-second camera path do not need Anime.js. The decorative canvas uses 30 fps, pauses offscreen/hidden and respects reduced motion.
- **Plain CSS:** token groups plus small component styles, no utility framework or component kit. Vite splits Three into a lazy chunk. Fonts have no runtime third-party requests.
- **Express locally:** readable same-origin endpoints, secure ownership boundary, established byte-range responses. Node and ffprobe are local adapters, not Cloudflare-compatible code.

`shared/camera.ts` defines the section order, term IDs, clauses and pose parameters. Validation checks section membership and bounded edits; glyphs and the Three preview read the same data. Old job IDs have a separate compatibility adapter. Finished states come from one shared predicate. The selected job URL is read on load and remains protected by the existing session boundary.

`tokens.css` owns colours, spacing, radii, animation timing and scene materials. The composer uses a 90% unit scale while mobile textareas remain at least 1rem; CSS zoom is not used. `FeaturedVideo` owns the selected job's waiting/reveal/video state, so the gallery avoids creating a second player for it.

## Cloudflare phase — planned, not implemented

| Local responsibility           | Hosted replacement                                              |
| ------------------------------ | --------------------------------------------------------------- |
| Vite middleware / built assets | Pages static frontend                                           |
| Express HTTP handlers          | Pages Functions                                                 |
| Single-process JSON job store  | D1 transactions and unique idempotency constraints              |
| Local MP4 directory            | R2 streaming writes and Range-aware reads                       |
| Five-second server sweep       | Durable scheduled runner with recoverable leases                |
| ffprobe process                | Trusted generation metadata or bounded media inspection service |
| Loopback origin check          | Exact deployment origin, HTTPS, CSP and rate limiting           |

A durable runner is a conscious revision to the old poll-on-read plan: relying on an open tab cannot guarantee retrieval of expiring output URLs. A short `waitUntil` is not an unbounded job worker. BYO still requires an explicit foreground-resume contract unless its custody model changes.

The upscale API accepts an HTTPS URL as well as base64. In the cloud adapter, upload/stream to owned R2 storage and pass a short-lived provider-readable HTTPS URL in `input_video`; do not relay a 50 MB base64 payload through a Worker. Retain source ownership checks and constrain the generated URL to the configured storage origin. A local loopback URL cannot be fetched by BFL, so the current Node adapter still sends local bytes.

Workers cannot execute ffprobe. The cloud adapter must obtain trusted dimensions/duration from supported metadata or a bounded inspection service before reserving upscale spend. Browser-supplied metadata alone is not a safe billing authority. R2 egress is free; storage and operations are separate charges.

Before publishing: atomic spend reservations, deployment secrets, cached demo fingerprints, stored-media authorisation, retryable copy leases, output size limits, Range/HEAD/conditional requests, real mobile playback, build and secret/history audits. Generate no additional paid findings batch implicitly.

## Primary references checked 19 September 2026

- [Generate FLUX 3 video](https://docs.bfl.ai/api-reference/utility/generate-a-video-with-flux-3)
- [Video upscale, constraints and pricing](https://docs.bfl.ai/flux_tools/flux_video_upscale)
- [BFL pricing](https://docs.bfl.ai/quick_start/pricing)
- [Cloudflare context lifetime](https://developers.cloudflare.com/workers/runtime-apis/context/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)

## Account balance and camera disclosure

`CameraPanel` keeps disclosure state separate from the composer selection; `CameraPresetGrid` uses native scrolling, responsive columns, keyboard focus and small navigation arrows. `CameraPanelExpanded` retains the previous layout for local comparison via `?camera-layout=expanded`.

`GET /api/credits` resolves the same BYO/server key precedence as generation and calls [BFL’s credits endpoint](https://docs.bfl.ml/api-reference/get-the-users-credits). It validates the numeric response, disables caching and never stores the key or forwards raw provider errors. `AccountBalance` cancels stale requests when the key changes and refreshes on key availability, job-status changes, returning to the page or explicit refresh. USD display uses [100 credits per dollar](https://docs.bfl.ml/quick_start/get_started); the original credit count and check time are available in the tooltip. A checked balance is not a spending reservation or a replacement for the server’s demo cap.
