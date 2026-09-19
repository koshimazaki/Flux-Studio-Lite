# FLUX Studio

A compact studio for moving images: describe a scene, combine a shot size, angle and movement, generate a FLUX 3 video, then upscale the result from 1.5× to 3× in Precise or Creative mode. The main video sits above a compact centred composer, with the gallery underneath.

This repository contains the local prototype and a Cloudflare Worker adapter. Both support text-to-video and video upscale; the hosted app uses your own BFL key, D1 job history and R2 media. It is an independent experiment and is not affiliated with Black Forest Labs.

## Cloudflare

[Open the Cloudflare studio](https://fluxstudio.pages.dev). See [deployment and hosted behavior](docs/cloudflare.md). Connect your own key to check your balance and generate. Keep the tab open until the result is saved.

## Run locally

Requires Node 22+ and `ffprobe` from FFmpeg. The server uses `ffprobe` to inspect videos and calculate upscale estimates from their actual dimensions.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4317`. The public gallery starts empty while a new set of reproducible examples is curated. For live generation, enter a BFL key in the connection dialogue or supply `BFL_API_KEY` in the server environment.

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
- FLUX Video Upscale: 1.5–3× with Precise or Creative mode from a gallery clip or MP4 upload. An optional upscale prompt is supported; video camera clauses are excluded. Output estimates respect the provider's 13.75 MP limit.
- Persist-before-submit jobs, request idempotency, session ownership and bounded API inputs.
- Background recovery for server-key jobs; visitor-key polling requires the key on each request.
- Local copies of generated videos, byte-range playback and decoded-frame-gated reveal.
- A $5 UTC-day server-key budget and three requests per session per day. Failed or uncertain submissions conservatively retain their reservation.
- Clicking a clip’s prompt loads its subject and camera wording while keeping the current generation settings. Recreate restores the full saved setup without submitting it. Enlarged playback shows the full saved prompt with Copy and Download actions.

## Key handling

The server key stays in the server environment. A visitor key is held only in temporary page memory and sent in an HTTP header when needed. The app never writes it to sessionStorage, localStorage, IndexedDB, cookies or caches. Reloading or leaving the page disconnects the key; any legacy Web Storage entry is removed without reading it. It is never written to the job file, media or logs. The loopback HTTP connection is local; upstream BFL requests use TLS.

Disconnect clears the active key from page state. The installation then returns to its server connection, if configured. Visitor-key jobs cannot continue without the key; re-enter or autofill it after a reload to resume. Anonymous session ownership uses a random HttpOnly, SameSite cookie and is not a user account.

## Read the code

See the [architecture and cloud boundary](docs/architecture.md) and [deployment guide](docs/cloudflare.md). [Verification](docs/verification.md) records tested behaviour and remaining checks.

## Scaling boundary

Generation budget and provider concurrency are the first constraints. The local JSON store has one process owner. The Cloudflare adapter uses D1 idempotency reservations, rate limits and R2 Range-aware delivery. BYO jobs require the page to remain open until the video is saved; no durable background runner or load-test claim is made.

## Next steps

1. Retain a small set of API-confirmed camera findings across varied subjects.
2. Evaluate a durable background runner with an explicit key-custody design.
3. Seed exact-input cached demo runs, including a versioned full-prompt fingerprint.

Free camera dragging, image input, video editing, extra generators, batch jobs and authentication are outside this prototype.

## Design notes

The visual system uses graphite surfaces, compact instrument controls, Lime and Cyberpunk signal palettes, and an output-first layout. The included dither field carries its own MIT attribution in [`src/effects/LICENSE`](src/effects/LICENSE). No BFL logo or proprietary font files are included; fonts are self-hosted open-font packages.

## Why

Make camera language visible before spending on video generation, then keep the result prominent. The small scope makes the path from a phrase through validation, cost reservation, generation, playback and upscale readable.

## Findings

One real text-to-video run and one precise upscale completed during the initial local build. They verified integration and preserved the recognisable subject; they do not establish reliability for the camera catalog. The previous illustrative library clips have been retired. A controlled same-subject movement grid remains to be run.

## Lineage

The graphite instrument styling adapts the author's graphite instrument design vocabulary. The waiting/reveal field is adapted from the author's FLUX API Control Surface with its MIT attribution retained. Camera terminology links to BFL's guide. The public catalog is empty pending new curated examples with recorded inputs and attribution.

## Process

See [design decisions](docs/process.md) and [verification](docs/verification.md). Agents implemented code under operator direction; the record distinguishes applied changes, limitations and deferred work. This local review pass adds no UI or store framework and makes no additional paid requests.

## FLUX Studio on Pages

`npm run deploy:pages` builds the compact studio and deploys to the `fluxstudio` Cloudflare Pages project, using the existing D1/R2 resources. Apply D1 migrations first with `npx wrangler d1 migrations apply flux-studio-lite --remote`. The original Workers deployment command is retained.

Camera controls open over the composer and apply with Done. Paste a BFL key for the open page only; refresh or Disconnect clears it. Finished clips remain in the anonymous browser library and can be downloaded. No paid test is part of deployment.
