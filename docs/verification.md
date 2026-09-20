# Verification

What has been tested, and what has not. Current as of 20 September 2026.

The architecture under test is Cloudflare Pages with an advanced-mode Worker,
D1 job state, R2 private media and a four-clip static first-run library. The
Express adapter remains the local development path.

## Automated checks

| Check                       | Result                                                      |
| --------------------------- | ----------------------------------------------------------- |
| `npm test`                  | 84 tests across 11 files                                    |
| `npm run typecheck`         | clean                                                       |
| `npm run lint`              | 0 errors, 3 hook-dependency warnings                        |
| `npm run format:check`      | clean                                                       |
| `npm run build`             | clean production build                                      |
| `npm run check:worker`      | portable layer compiles with no Node and no DOM types       |
| `wrangler deploy --dry-run` | bundle, bindings and asset config valid                     |
| D1 migrations               | all three replay in order against a scratch SQLite database |

Coverage includes camera geometry across all 729 selection combinations,
prompt composition and restore, idempotent replay across both adapters,
session ownership, rate limits, storage ceilings and lifecycle expiry.

## Browser checks

First-run library, title-based prompt reuse, full-setting Recreate, lightbox
prompt and download actions, explicit unavailable-media messaging, and
responsive desktop and mobile layouts.

Generation was exercised against an isolated mock provider with a real bundled
MP4 and the real job API: queued and waiting states, Ready, decoded playback,
job-link reload, and a clear fallback for an unavailable job.

## Privacy boundary

Public media carries recreate inputs and confirmed costs, with no provider job
identifiers and no private provenance file — a regression test rejects both.
Visitor keys stay in page and request memory and are never persisted.

## Paid provider calls

Two, both during local development: one text-to-video and one precise upscale
through the local adapter. The source was 1280 × 704 at 5.042 s; the upscale
returned 2560 × 1408 at the same duration. Every other provider interaction in
the suite is mocked, so the checks above spend nothing.

## Not verified

- Live paid generation beyond those two runs.
- Native-device playback on Safari and iOS.
- Load and concurrency testing.
- An independent stranger test.
- **Camera fidelity.** The geometry tests check that poses are finite,
  grounded and closed. They are illustration tests, not measurements of how
  closely the model follows a camera term. One run per combination
  demonstrates the pipeline and the wording, not reliability across subjects.

## Size

About 90 KB gzip of JavaScript and 10 KB gzip of CSS for the app, plus 124 KB
gzip for the lazily loaded Three.js scene. The four library clips ship as
960px previews totalling roughly 3.5 MB rather than the 25.8 MB of originals.

## Continuous integration

Every push to `main` and every pull request runs
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): the checks above,
plus a second job guarding the cloud boundary.

- `npm run check:worker` compiles `shared/` and the portable server modules
  under `"types": []`, so a Node-only import in the layer meant to move to
  Workers fails there while every other check stays green.
- `wrangler deploy --dry-run` bundles the Worker and validates its D1, R2 and
  asset bindings without contacting the API, so it needs no credentials.
- The D1 migrations replay in order against a scratch SQLite database.

Pull-request CI cannot deploy and is never given production credentials; it
uploads the frontend build as a short-lived review artifact. After both jobs
pass on a push to `main`, a separate production job builds the Pages bundle,
applies pending D1 migrations, deploys to Pages and checks `/api/health`,
reading its credentials from GitHub's `production` environment. See
[Cloudflare](cloudflare.md) for that configuration.

## Library clips as evidence

The four library clips are real runs of this studio on the hosted deployment,
each shipped with the prompt, camera terms, settings and provider-confirmed
cost that produced it. They cover close-up and macro shot sizes, low, high and
worm's-eye angles, and orbit, pan, tilt and dolly-in movements, including one
draft-mode run at $0.30 against $1.70 for a full ten seconds. A controlled
same-subject movement grid remains to be run.
