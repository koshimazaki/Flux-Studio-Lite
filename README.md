# FLUX Studio

[![CI](https://github.com/koshimazaki/Flux-Studio-Lite/actions/workflows/ci.yml/badge.svg)](https://github.com/koshimazaki/Flux-Studio-Lite/actions/workflows/ci.yml)

A compact studio for moving images: describe a scene, combine a shot size, angle and movement, generate a FLUX 3 video, then upscale it 1.5× to 3× in Precise or Creative mode. The result sits above the composer, with the library underneath.

A focused adaptation of the author's [FLUX API Control Surface](https://github.com/koshimazaki/flux-api-control-surface), narrowed to camera-aware text-to-video and upscale, then given a Cloudflare boundary for a public demo. An independent experiment, not affiliated with Black Forest Labs.

## Live demo

[Open the studio](https://fluxstudio.pages.dev). Four library clips ship with the app, so the first screen works before any key is connected. To generate, connect your own BFL key and keep the tab open until the clip is saved.

<!-- Add the walkthrough video here after uploading it as a GitHub attachment. -->

## Try it

1. Keep **FLUX 3 · Text to video** selected and edit the scene description.
2. Open Shot sizes, Angles or Movements and pick at most one term per section, or None. Each section colours its own editable clause, and edits survive switching terms.
3. Open **View composed prompt** to see exactly what the server will send, check the estimate, then generate.
4. Choose **Upscale** on any clip, set the amount and mode, and watch the output dimensions and cost update together.

## Run locally

Requires Node 22+. No system dependencies.

```sh
npm ci
npm run dev     # http://127.0.0.1:4317
```

Enter a BFL key in the connection dialogue, or set `BFL_API_KEY` in the server environment. The local server binds to loopback only.

```sh
npm test        # vitest
npm run build   # tsc --noEmit && vite build
```

## What it does

- **Camera language, made visible.** Shot size, angle and movement are three independent sections covering 24 terms, each contributing an editable, colour-coded clause to the prompt. Nothing is required, and Camera off leaves the scene prompt unmodified. See [camera wording and sources](docs/camera-wording.md).
- **FLUX 3 text-to-video:** 5–20 seconds, seven aspect ratios, HD / Full HD / QHD / UHD or HD draft, without audio.
- **FLUX Video Upscale:** 1.5–3× in Precise or Creative mode, from a library clip or your own MP4, with an optional upscale prompt.
- **Costs before you spend.** Estimates track duration, resolution and upscale factor, and are reserved before submit. Failed or uncertain submissions keep their reservation rather than silently retrying a charge.
- **A reproducible first screen.** Every library clip ships the run that made it — prompt, camera terms, settings and confirmed cost — so its title reuses the prompt and Recreate restores the whole setup.
- **One rule set, two runtimes.** `shared/` holds the contracts, and both adapters validate against them, so a request cannot pass locally and conflict in production.
- **Bounded by design.** Per-route rate limits, storage ceilings per visitor and per deployment, and a lifecycle sweep that ages out abandoned jobs on the session cookie's own schedule.

All 24 camera terms are exploratory. A successful request verifies the plumbing, not camera behaviour across every subject.

## Key handling

A visitor key is held only in temporary page memory and sent as an HTTP header when needed. It is never written to sessionStorage, localStorage, IndexedDB, cookies, caches, job files, media or logs. Reloading or leaving the page disconnects it; re-enter it to resume a pending job. A server key, if configured, stays in the server environment. Session ownership uses a random HttpOnly, SameSite cookie and is not a user account.

## Layout

```text
src/            React composer, themes, the lazy Three.js camera diagram
shared/         Portable contracts: inputs, camera wording, pricing,
                lifecycle, replay rules, MP4 inspection
server/         Local Express adapter — JSON store, files, loopback only
worker/         Cloudflare adapter — D1 job state, R2 media, lifecycle sweep
migrations/     D1 schema, applied in order
observability/  Aggregate counts only: no prompt, key, IP or country
tests/          Vitest, covering both adapters
docs/           Architecture, deployment, verification, decisions
```

## Documentation

| Doc                                          | Covers                                            |
| -------------------------------------------- | ------------------------------------------------- |
| [Architecture](docs/architecture.md)         | The cloud boundary, job lifecycle, scaling limits |
| [Cloudflare](docs/cloudflare.md)             | Deployment, hosted runtime, reproduction          |
| [Read-through](docs/read-through.md)         | A guided tour of the code, in order               |
| [Verification](docs/verification.md)         | What is tested, what is not, and CI               |
| [Design decisions](docs/process.md)          | What was built, what was rejected, and why        |
| [Review checklist](docs/review-checklist.md) | For maintainers and agents                        |
| [Observability](observability/README.md)     | The whole of what this deployment measures        |
| [Credits](docs/credits.md)                   | Visual lineage, attributions and licences         |

## BFL references

The implementation follows Black Forest Labs' documentation for [FLUX 3 video generation](https://docs.bfl.ai/api-reference/utility/generate-a-video-with-flux-3), [video upscale](https://docs.bfl.ai/flux_tools/flux_video_upscale), [camera prompting](https://docs.bfl.ai/guides/prompting_video_camera_terms) and [pricing](https://docs.bfl.ai/quick_start/pricing). The camera guide supplies the public terminology; the editable wording, diagrams and examples here are this studio's own interpretation. See [camera wording and sources](docs/camera-wording.md) for that boundary.
