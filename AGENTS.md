# Working on FLUX Studio Lite

Read [README.md](README.md), [architecture](docs/architecture.md), and the
[review checklist](docs/review-checklist.md) before changing behavior. For hosted
changes, also read [Cloudflare operations](docs/cloudflare.md).

- Preserve existing worktree changes and keep edits scoped to the request.
- Keep model inputs, pricing, lifecycle and replay rules shared across the local
  and Worker adapters. Verify both adapters when a shared contract changes.
- Treat generation as a paid side effect. Persist its idempotency reservation
  before submission; never retry an uncertain submission automatically.
- Keep visitor keys transient. Public assets and docs must exclude credentials,
  provider job identifiers, private lineage, personal preparation and local paths.
- Update the relevant architecture/operations docs in the same change as behavior.
  Record what was tested and distinguish local evidence from deployed behavior.
- Use the checklist for agent reviews and XReview. Turn confirmed regressions
  into focused tests rather than accumulating review transcripts.
- Run `npm test`, `npm run build:pages`, and the formatting check in the checklist.
  Do not hand-edit generated `worker/env.d.ts`.
- Local verification does not authorize paid calls, remote migrations, deployment,
  or publication; follow the operator's requested scope for those actions.
