# FLUX Studio

[![CI](https://github.com/koshimazaki/Flux-Studio-Lite/actions/workflows/ci.yml/badge.svg)](https://github.com/koshimazaki/Flux-Studio-Lite/actions/workflows/ci.yml)

Describe a scene, combine a shot size, angle and movement, generate a FLUX 3 video, then upscale it 1.5× to 3× in Precise or Creative mode. An independent experiment, not affiliated with Black Forest Labs.

<!-- Add the walkthrough video here after uploading it as a GitHub attachment. -->

## Live demo

**[fluxstudio.pages.dev](https://fluxstudio.pages.dev)** — four library clips ship with the app, so the first screen works before any key is connected. To generate, connect your own BFL key and keep the tab open until the clip is saved.

## Run locally

Requires Node 22+. No system dependencies.

```sh
npm ci
npm run dev     # http://127.0.0.1:4317
```

Enter a BFL key in the connection dialogue, or set `BFL_API_KEY` in the server environment; the local server binds to loopback only. `npm test` and `npm run build` are the other two commands worth knowing.

## What makes it different

**Camera language you can see and edit.** Shot size, angle and movement are three independent sections covering 24 terms. Each contributes a colour-coded clause to the prompt that you can edit in place, and the 3D diagram illustrates the named combination rather than predicting what the model will do. Every term is exploratory: a successful request verifies the plumbing, not camera behaviour across subjects.

**A library that takes itself apart.** Every clip on the first screen is a real run of this studio, shipped with the prompt, camera terms, settings and provider-confirmed cost that produced it. Click a title to reuse its prompt, or Recreate to restore the whole setup and change one thing. Switching to Upscale picks up your newest generation, so improving what you just made takes one click.

**Your key is never stored.** A visitor key lives in page memory and is sent as a header when needed — never to sessionStorage, localStorage, IndexedDB, cookies, caches, job files, media or logs. Reloading disconnects it. Session ownership is a random HttpOnly cookie, not an account.

## Documentation

- [Architecture](docs/architecture.md) — the cloud boundary, how paid requests are made safe, and what this deliberately does not do
- [Verification](docs/verification.md) — what is tested, and what is not
- [Credits](docs/credits.md) — lineage, attributions, and the BFL documentation this follows

Working on the code, as a person or an agent? Start with [AGENTS.md](AGENTS.md).
