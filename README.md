# FLUX Studio Lite

[![CI](https://github.com/koshimazaki/Flux-Studio-Lite/actions/workflows/ci.yml/badge.svg)](https://github.com/koshimazaki/Flux-Studio-Lite/actions/workflows/ci.yml)

A compact studio for FLUX 3 video, focused on camera control. Adapted from the larger [FLUX API Control Surface](https://github.com/koshimazaki/flux-api-control-surface), it brings scene prompting, editable camera directions, generation and upscaling into one workspace.

An independent experiment, not affiliated with Black Forest Labs.

## Live demo

Try the live version at **[fluxstudio.pages.dev](https://fluxstudio.pages.dev)**. Explore four library clips without a key, or connect your own BFL key to generate. Keep the tab open until your clip is saved.

Hide any of your cards with × and restore it later. Hiding a run does not stop it; the studio keeps checking for its result.

<div align="center">
  <video src="https://github.com/user-attachments/assets/e50be815-ec5b-441d-959f-c85aac24f37d" width="640" autoplay loop muted></video>
  <em>FLUX 3 Studio Lite Camera Control </em>
</div>

## Run locally

Requires Node 22+. No system dependencies.

```sh
npm ci
npm run dev     # http://127.0.0.1:4317
```

Enter a BFL key in the connection dialogue, or set `BFL_API_KEY` in the server environment; the local server binds to loopback only. `npm test` and `npm run build` are the other two commands worth knowing.

## What makes it different

**Camera guidance you can explore.** An interactive panel pairs editable camera directions with an educational Three.js diagram of shot size, angle and movement. Its terminology follows [BFL’s camera prompting guide](https://docs.bfl.ai/guides/prompting_video_camera_terms); the studio turns each selection into a colour-coded prompt clause you can refine before generating. The diagram illustrates camera concepts, not a prediction of the result.

**A library that takes itself apart.** Every clip on the first screen is a real run of this studio, shipped with the prompt, camera terms, settings and provider-confirmed cost that produced it. Click a title to reuse its prompt, or Recreate to restore the whole setup and change one thing; either way that clip moves to the main view, so the scene you are editing is the scene you are looking at. Switching to Upscale picks up your newest generation — or whichever clip you choose to improve — and shows it above the composer, so improving what you just made takes one click.

**Your key is never stored.** A visitor key lives in page memory and is sent as a header when needed — never to sessionStorage, localStorage, IndexedDB, cookies, caches, job files, media or logs. Reloading disconnects it. Session ownership is a random HttpOnly cookie, not an account.

## Documentation

- [Architecture](docs/architecture.md) — the cloud boundary, how paid requests are made safe, and what this deliberately does not do
- [Verification](docs/verification.md) — what is tested, and what is not
- [Credits](docs/credits.md) — lineage, attributions, and the BFL documentation this follows

Working on the code, as a person or an agent? Start with [AGENTS.md](AGENTS.md).
