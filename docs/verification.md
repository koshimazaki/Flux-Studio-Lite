# Verification

What has been tested, and what has not. Current as of 20 September 2026.

The architecture under test is Cloudflare Pages with an advanced-mode Worker,
D1 job state, R2 private media and a four-clip static first-run library. The
Express adapter remains the local development path.

## Automated checks

Counts go stale; what each command guarantees does not.

| Command                     | What a pass means                                                |
| --------------------------- | ---------------------------------------------------------------- |
| `npm test`                  | Every rule below still holds on both adapters                    |
| `npm run typecheck`         | No type errors                                                   |
| `npm run lint`              | No errors (three known hook-dependency warnings remain)          |
| `npm run format:check`      | Formatting is unchanged                                          |
| `npm run build`             | The production bundle builds                                     |
| `npm run check:worker`      | The portable layer compiles with no Node and no DOM types        |
| `wrangler deploy --dry-run` | Bundle, bindings and asset config are valid, without an API call |
| D1 migration replay         | Every migration applies in order to a scratch SQLite database    |

The suite covers camera geometry across all 729 selection combinations, prompt
composition and restore, idempotent replay across both adapters, session
ownership, rate limits, storage ceilings, lifecycle expiry, and that the two
MP4 readers agree so an upscale cannot be priced differently on each adapter.

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
uploads the frontend build as a short-lived review artifact. The production job
runs only on a push to `main`, and this deployment holds no credential for it,
so it skips: releases are run by hand. See [Cloudflare](cloudflare.md) for why,
and for the two secrets that would enable it.

## Library clips as evidence

The four library clips are real runs of this studio on the hosted deployment,
each shipped with the prompt, camera terms, settings and provider-confirmed
cost that produced it. They cover close-up and macro shot sizes, low, high and
worm's-eye angles, and orbit, pan, tilt and dolly-in movements, including one
draft-mode run at $0.30 against $1.70 for a full ten seconds. A controlled
same-subject movement grid remains to be run.
