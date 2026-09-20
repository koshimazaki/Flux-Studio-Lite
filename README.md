# FLUX Studio

[![CI](https://github.com/koshimazaki/Flux-Studio-Lite/actions/workflows/ci.yml/badge.svg)](https://github.com/koshimazaki/Flux-Studio-Lite/actions/workflows/ci.yml)

A compact studio for moving images: describe a scene, combine a shot size, angle and movement, generate a FLUX 3 video, then upscale the result from 1.5× to 3× in Precise or Creative mode. The main video sits above a compact centred composer, with the gallery underneath.

This repository contains the local prototype and a Cloudflare Worker adapter. Both support text-to-video and video upscale; the hosted app uses your own BFL key, D1 job history and R2 media. It is an independent experiment and is not affiliated with Black Forest Labs.

## Live demo

[Open the Cloudflare studio](https://fluxstudio.pages.dev). See [deployment and hosted behavior](docs/cloudflare.md). Connect your own key to check your balance and generate. Keep the tab open until the result is saved.

<!-- Add the walkthrough video here after uploading it as a GitHub attachment. -->

This hosted studio is a focused adaptation of the author's broader [FLUX API Control Surface](https://github.com/koshimazaki/flux-api-control-surface), a local-first workbench for FLUX image and video workflows. FLUX Studio narrows that system to camera-aware text-to-video, video upscale and a reproducible first-run library, then adds a Cloudflare boundary for a public demo.

## Run locally

Requires Node 22+ and `ffprobe` from FFmpeg. The server uses `ffprobe` to inspect videos and calculate upscale estimates from their actual dimensions.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4317`. Four library clips ship with the app, so the first screen is populated before any key is connected. For live generation, enter a BFL key in the connection dialogue or supply `BFL_API_KEY` in the server environment.

```sh
npm test
npm run build
npm start
```

The local server binds to loopback only. The included Cloudflare adapter provides HTTPS, D1/R2 storage and rate limits for hosted use.

## Try it

1. Keep **FLUX 3 · Text to video** selected and edit the scene description.
2. Open Shot sizes, Angles or Movements and choose at most one term per section, or None. The tabs retain each choice with its icon and name; no section is required. **Compare expanded view** switches to the previous layout without resetting selections. Each section colours its own editable prompt phrase. Edits survive switching terms. The diagram explains the combination and does not predict model output.
3. Open **View composed prompt** to copy the complete text. The server uses the same composer. Camera off removes only the camera clause.
4. Check the estimate, then generate. The main video changes from a waiting field to the decoded result. Selected clips and their settings restore on refresh while the address stays clean.
5. Choose **Upscale** on a gallery clip. Camera controls disappear. Set the amount, choose **Precise** or **Creative**, and optionally add an upscale prompt. Output dimensions and estimated cost update together.
6. Open the key dialogue and choose **Disconnect** to clear the tab's visitor key.

All 24 camera terms are exploratory. No reliability score is implied. A successful request verifies the plumbing, not camera behaviour across every subject.

## Included

- React, Vite and TypeScript with plain CSS and one lazy-loaded Three.js diagram.
- Blackstone/Lime and Cyberpunk themes, opaque custom menus and keyboard-operable ruled faders.
- BFL account balance replaces Local Preview when a key is available. A successful balance check verifies the connection; click the balance to refresh.
- Three independent camera sections with editable wording. Camera off produces an unmodified scene prompt. See [camera wording and sources](docs/camera-wording.md).
- FLUX 3 text-to-video: 5–20 seconds, seven aspect ratios, HD / Full HD / QHD / UHD or HD draft, without audio. Duration and resolution update the cost estimate.
- FLUX Video Upscale: 1.5–3× with Precise or Creative mode from a gallery clip or an MP4 dropped or chosen from disk. An optional auto-growing upscale prompt is supported; video camera clauses are excluded. Output estimates respect the provider's 13.75 MP limit.
- Persist-before-submit jobs, request idempotency, session ownership and bounded API inputs. One canonical replay rule serves both backends, so the same repeated request cannot pass locally and conflict in production.
- Storage cleanup targets 250 MB per visitor and 3 GB per deployment, evicting oldest media first. Generation records and replay protection survive media eviction until 30-day retention.
- Per-minute limits on submissions, credits, polling, history and private media, and a lifecycle sweep that ages out abandoned jobs, drops dead capability links and expires records with their media on the session cookie's own schedule.
- `npm run stats` reports how many sessions and generations the deployment has served, aggregated by the sweep before retention deletes the detail. It records counts only: no prompt, camera term, session id, key, IP or country. See [`observability/`](observability/README.md).
- Background recovery for server-key jobs; visitor-key polling requires the key on each request.
- Local copies of generated videos, byte-range playback and decoded-frame-gated reveal.
- A $5 UTC-day server-key budget and three requests per session per day. Failed or uncertain submissions conservatively retain their reservation.
- Clicking a clip’s prompt switches to the matching generator and loads its subject and camera wording while keeping the current output controls. Recreate restores the full saved setup without submitting it. Enlarged playback shows the full saved prompt with Copy and Download actions.
- Library clips behave the same way: each ships the run that made it, so its title reuses the prompt, Recreate restores the whole setup, its lightbox copies the exact prompt, and its card shows what the original run cost.

## Key handling

The server key stays in the server environment. A visitor key is held only in temporary page memory and sent in an HTTP header when needed. The app never writes it to sessionStorage, localStorage, IndexedDB, cookies or caches. Reloading or leaving the page disconnects the key; any legacy Web Storage entry is removed without reading it. It is never written to the job file, media or logs. The loopback HTTP connection is local; upstream BFL requests use TLS.

Disconnect clears the active key from page state. The installation then returns to its server connection, if configured. Visitor-key jobs cannot continue without the key; re-enter or autofill it after a reload to resume. Anonymous session ownership uses a random HttpOnly, SameSite cookie and is not a user account.

## Read the code

See the [architecture and cloud boundary](docs/architecture.md), [deployment guide](docs/cloudflare.md), and [review checklist](docs/review-checklist.md) for maintainers and agents. [Verification](docs/verification.md) records tested behaviour and remaining checks. [`observability/`](observability/README.md) is the whole of what this deployment measures about its own use.

## BFL references

The implementation follows Black Forest Labs' official documentation for [FLUX 3 video generation](https://docs.bfl.ai/api-reference/utility/generate-a-video-with-flux-3), [video upscale](https://docs.bfl.ai/flux_tools/flux_video_upscale), [camera prompting](https://docs.bfl.ai/guides/prompting_video_camera_terms), and [API pricing](https://docs.bfl.ai/quick_start/pricing). The camera guide supplies the public terminology; this studio's editable wording, diagrams and examples are its own interpretation. See [camera wording and sources](docs/camera-wording.md) for that boundary.

## Scaling boundary

Generation budget and provider concurrency are the first constraints. The local JSON store has one process owner. The Cloudflare adapter uses D1 idempotency reservations, per-route rate limits and R2 Range-aware delivery, and its stored state is bounded: a five-minute sweep ages out abandoned jobs and expires records with their media, capped per run so no single invocation pays for a backlog. On Pages, where there is no cron trigger, that sweep rides on the request path, so housekeeping scales with visits. BYO jobs require the page to remain open until the video is saved; a durable background runner would need key custody this deployment deliberately does not have. No load-test claim is made.

## Next steps

1. Retain a small set of API-confirmed camera findings across varied subjects.
2. Evaluate a durable background runner with an explicit key-custody design, replacing age-out with real completion.
3. Extend the recorded library into a same-subject grid, so the catalogue compares movements rather than illustrating four of them.

Free camera dragging, image input, video editing, extra generators, batch jobs and authentication are outside this prototype.

## Checks

Every push to `main` and every pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

```sh
npm run format:check   # prettier
npm run lint           # eslint, typescript-eslint, react-hooks
npm run typecheck      # tsc --noEmit
npm test               # vitest
npm run build          # tsc --noEmit && vite build
```

A second job guards the cloud boundary and runs only on a tree that carries
Wrangler config, so it is a clean skip until the Cloudflare port lands:

- `npm run check:worker` compiles `shared/` and the portable server modules
  under `"types": []`, so a Node-only import in the layer that is meant to move
  to Workers fails here while every other check stays green.
- `wrangler deploy --dry-run` bundles the Worker and validates its D1, R2 and
  asset bindings without contacting the API, so it needs no credentials.
- The D1 migrations are replayed in order against a scratch SQLite database.

CI does not deploy. As the scaling boundary below explains, a hosted version
needs a dedicated cloud adapter; the build output is uploaded as an artifact
rather than shipped.

## Design notes

The visual system uses graphite surfaces, compact instrument controls, Lime and Cyberpunk signal palettes, and an output-first layout. The included dither field carries its own MIT attribution in [`src/effects/LICENSE`](src/effects/LICENSE). No BFL logo or proprietary font files are included; fonts are self-hosted open-font packages.

## Why

Make camera language visible before spending on video generation, then keep the result prominent. The small scope makes the path from a phrase through validation, cost reservation, generation, playback and upscale readable.

## Findings

The four library clips are real runs of this studio on the hosted deployment, each shipped with the exact prompt, camera terms, settings and provider-confirmed cost that produced it. They cover close-up/macro shot sizes, low, high and worm's-eye angles, and orbit, pan, tilt and dolly-in movements, including one draft-mode run at $0.30 against $1.70 for a full ten seconds. One run per combination demonstrates the pipeline and the wording, not reliability across subjects. A controlled same-subject movement grid remains to be run.

## Lineage

The graphite instrument styling adapts the author's graphite instrument design vocabulary. The waiting/reveal field is adapted from the author's FLUX API Control Surface with its MIT attribution retained. Camera terminology links to BFL's guide. Every library clip was generated by this studio; the public catalogue carries the prompt, camera terms, settings and confirmed cost needed to inspect and recreate its setup.

## Process

See [design decisions](docs/process.md) and [verification](docs/verification.md). They distinguish shipped behavior, limitations and deferred work. The implementation adds no UI or store framework, and its review checks make no paid requests.

## FLUX Studio on Pages

`npm run deploy:pages` builds the compact studio and deploys to the `fluxstudio` Cloudflare Pages project, using the existing D1/R2 resources. Apply D1 migrations first with `npx wrangler d1 migrations apply flux-studio-lite --remote`. The original Workers deployment command is retained.

Camera controls open over the composer and apply with Done. Paste a BFL key for the open page only; refresh or Disconnect clears it. Finished clips remain in the anonymous browser library and can be downloaded. No paid test is part of deployment.
