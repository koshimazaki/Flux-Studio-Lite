# Working on FLUX Studio Lite

Read [README.md](README.md) for what the app does,
[the code read-through](docs/read-through.md) for where each responsibility
lives, [the architecture](docs/architecture.md) for the cloud boundary, and the
[review checklist](docs/review-checklist.md) before changing behaviour. For
hosted changes, also read [Cloudflare operations](docs/cloudflare.md).

## Where things are

| Path             | Holds                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `shared/`        | Model inputs, camera wording, pricing, lifecycle, replay rules, rate limits and library validation. No framework, Node or DOM APIs. |
| `src/`           | The single-screen React interaction, polling, composer reducer, catalogue adapter, components, Three.js scene and styles.           |
| `server/`        | The local Express adapter: validation, ownership, local lifecycle, provider calls and MP4 inspection.                               |
| `worker/`        | The hosted adapter: the same API over D1/R2, bounded MP4 parsing, polling leases, rate limits and lifecycle sweep.                  |
| `migrations/`    | Ordered D1 schema changes. Apply them to an isolated database before any remote migration.                                          |
| `observability/` | Count-only daily generation statistics and their reader. It must not grow into prompt or visitor tracking.                          |
| `tests/`         | Camera maths, validation, pricing, replay safety, lifecycle, session ownership, real MP4 delivery and isolated D1/R2 behaviour.     |
| `docs/`          | Architecture, Cloudflare operations, camera wording, verification evidence, read-through and review questions.                      |

`docs/read-through.md` follows one user action through these layers. Start there
rather than opening files at random.

## Provider documentation

The live contracts and camera wording come from BFL's own documentation,
checked 19 September 2026:

- [Generate a video with FLUX 3](https://docs.bfl.ai/api-reference/utility/generate-a-video-with-flux-3)
- [Video upscale, constraints and pricing](https://docs.bfl.ai/flux_tools/flux_video_upscale)
- [Camera prompting guide](https://docs.bfl.ai/guides/prompting_video_camera_terms) — see
  [camera wording](docs/camera-wording.md) for what the demo does and does not claim.
- [Pricing](https://docs.bfl.ai/quick_start/pricing)

Cite documented behaviour. Do not infer an exact prompt or reliability claim
from an example video.

## Checking your work

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:pages
```

[CI](.github/workflows/ci.yml) runs the formatting, lint, type, test, build and
Cloudflare boundary checks on every pull request and push to `main`. Run the
relevant checks locally before proposing a change; a red CI is not a review
comment. Use the review checklist for agent and XReview passes, and turn a
confirmed regression into a focused test rather than storing a review transcript.

Two environment facts are easy to miss:

- **`shared/` must stay portable.** `npm run check:worker` compiles it under
  `"types": []`, so a Node or DOM import fails the hosted boundary.
- **`worker/env.d.ts` is generated.** Regenerate it with Wrangler; do not hand-edit it.

## Rules that matter

- Generation is a paid side effect. Persist the idempotency reservation before
  submission and never automatically retry an uncertain submission. Quota
  eviction must preserve replay protection until normal retention.
- Keep visitor keys transient. Never persist or log one. Public assets and docs
  must exclude credentials, provider job identifiers, private lineage, personal
  preparation and machine-specific paths.
- Keep shared model inputs, pricing, lifecycle and replay rules in `shared/` so
  the local and hosted adapters cannot disagree. Verify every adapter that reads
  a changed contract.
- Control-character classes in sanitizers are deliberate. Filenames, catalogue
  labels and BFL keys strip `\x00-\x1f\x7f` before use.
- Keep production modules focused and update the relevant documentation in the
  same change as behaviour. Say what was actually run and distinguish local
  evidence from deployed behaviour.
- Preserve existing worktree changes and keep edits scoped to the request.
- Nothing in CI deploys, including a merge to `main`. The production job
  exists but this deployment holds no credential for it, so it skips; releases
  are run by hand with `npm run deploy:pages`. Never assume a merged change is
  live. Keep migrations additive anyway, so the previous deployment can run
  against the updated schema while Pages switches versions.
- Local verification does not authorize a paid call, manual remote migration,
  deployment or publication. Follow the operator's requested scope.
