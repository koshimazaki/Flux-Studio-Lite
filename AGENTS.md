# Working on FLUX Studio Lite

Read [README.md](README.md) for what the app does, [docs/read-through.md](docs/read-through.md)
for where each responsibility lives, and [docs/architecture.md](docs/architecture.md) for the
cloud boundary, before changing behaviour.

## Where things are

| Path      | Holds                                                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/` | Model inputs, camera wording, pricing and the prompt composer. No framework, no Node, no DOM — this is the layer that ports to Cloudflare unchanged.                                                                   |
| `src/`    | One screen. `App.tsx` is the interaction, `useJobs.ts` the polling loop, `components/` the small shared controls, `scene/` the isolated Three.js diagram.                                                              |
| `server/` | The local adapter: `validation.ts` is the allowlist, `app.ts` the origin and ownership boundary, `jobs.ts` the lifecycle, `bfl.ts` exactly two provider endpoints, `media.ts` the MP4 inspection that needs `ffprobe`. |
| `tests/`  | Camera maths, validation and pricing, idempotency and concurrency, session ownership, real MP4 range delivery.                                                                                                         |
| `docs/`   | Architecture and the cloud boundary, camera wording and its sources, the read-through, and what has actually been verified.                                                                                            |

`docs/read-through.md` walks these in the order one user action travels through them. Start there
rather than opening files at random.

## Provider documentation

The two live contracts and the camera wording come from BFL's own docs, checked 19 September 2026:

- [Generate a video with FLUX 3](https://docs.bfl.ai/api-reference/utility/generate-a-video-with-flux-3)
- [Video upscale, constraints and pricing](https://docs.bfl.ai/flux_tools/flux_video_upscale)
- [Camera prompting guide](https://docs.bfl.ai/guides/prompting_video_camera_terms) — see
  [docs/camera-wording.md](docs/camera-wording.md) for what the demo does and does not claim from it.
- [Pricing](https://docs.bfl.ai/quick_start/pricing)

Cite the documented behaviour. Do not infer an exact prompt or a reliability claim from an example video.

## Checking your work

```sh
npm run format:check   # prettier
npm run lint           # eslint, typescript-eslint, react-hooks
npm run typecheck      # tsc --noEmit
npm test               # vitest
npm run build          # tsc --noEmit && vite build
```

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs all five on every push to `main` and
every pull request. Run them locally before proposing a change; a red CI is not a review comment.

Two environment facts that are not obvious from the source:

- **`ffprobe` is required.** `server/media.ts` shells out to it to read an MP4's real dimensions.
  Without it, uploads return 400 and a job never leaves `copying`. It is a documented dependency,
  not a bug — install FFmpeg.
- **`shared/` must stay free of Node and DOM APIs.** When the Cloudflare port is present,
  `npm run check:worker` compiles that layer under `"types": []`, so a single `node:fs` import
  there fails the build while every other check stays green.

## Rules that matter

- Generation is a paid side effect. Persist the idempotency reservation before submitting, and
  never automatically retry a submission whose outcome is uncertain.
- Keep visitor keys transient. Never persist one, never log one, and never claim storage is
  operator-blind when the operator controls the secret.
- Keep model inputs, pricing and lifecycle rules in `shared/`, so the local and hosted adapters
  cannot disagree. When a shared contract changes, verify every adapter that reads it.
- Control-character classes in the sanitisers are deliberate. Filenames, provenance labels and the
  API key are stripped of `\x00-\x1f\x7f` before use.
- Keep components small; `docs/read-through.md` asks for under 500 lines each.
- Update the relevant doc in the same change as the behaviour, and say what you actually ran.
  Distinguish local evidence from deployed behaviour.
- Local verification does not authorise a paid call, a migration, a deployment or a publication.
  Follow the operator's requested scope for those.
