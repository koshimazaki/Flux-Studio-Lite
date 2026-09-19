# Cloudflare deployment

Live: [FLUX Studio](https://fluxstudio.pages.dev). Pages production deployment `ffebec54-e0d4-4f4b-a3b3-d8516351d687` on 19 September 2026, source `da0c2643cc8942f5c30766f58c8aa6376c74a369`. [Pinned deployment](https://ffebec54.fluxstudio.pages.dev). GitHub was not pushed.

The hosted app uses your own BFL key. Connect it in the header: the balance check verifies the connection and shows the remaining account credits as USD. Generation/upscale estimates are separate from that balance. No shared provider key is configured or stored. The key exists temporarily in page/request memory during use; it is not persisted by the app.

## Runtime

- Pages static frontend + advanced-mode Worker: same-origin API with the existing D1/R2 bindings.
- D1: session-owned jobs, unique submission IDs, copy leases, source metadata and temporary input links.
- R2: private uploaded/generated MP4s, plus the three project-owned library sources.
- MP4Box: bounded range inspection of stored videos for trustworthy upscale dimensions, duration and estimates. No Python or ffprobe in the Worker.

Keep the tab open and visible until a generated clip is saved. Refreshing, navigating away or closing the tab clears its in-memory key; re-enter it to resume polling. No credential is read from or written to browser storage. An uncaptured provider link may expire after approximately one hour. The adapter does not claim durable unattended completion or cross-device accounts.

Standard, non-fragmented MP4s with one video track are supported. Uploads: 50 MB, 20 seconds, at most 2560 × 1440 pixels and no dimension above 2560. Generated downloads need a known byte length and must be below 250 MB. Unsupported metadata produces an error instead of an invented estimate. The provider controls exact output rounding and final charges.

## Reproduce

Requires Node 22+ and a Cloudflare account with Workers, D1 and R2 enabled. The initial deployment uses the account’s Free plan defaults; no custom CPU allowance or plan upgrade is configured. Complex metadata can hit runtime limits even below the input byte ceiling.

```sh
npm ci
npm test
npm run check:worker
npm run build
npx wrangler d1 migrations apply flux-studio-lite --local
npx wrangler dev
```

For another account, edit the account ID in `scripts/deploy-pages.mjs` and database/bucket bindings in `wrangler.pages.json`. The original Workers target still uses `wrangler.jsonc`. Create the corresponding D1 database and R2 bucket, apply `migrations/` remotely and seed each `public/media/library-0N.mp4` into `library/library-0N.mp4` in the private media bucket. Library posters/videos also ship as static assets.

```sh
npx wrangler d1 migrations apply flux-studio-lite --remote
npx wrangler r2 object put flux-studio-lite-media/library/library-01.mp4 --file public/media/library-01.mp4 --content-type video/mp4 --remote
# Repeat the seed command for library-02 and library-03.
npm run deploy
```

Do not provision a BFL secret: each visitor supplies their own key. Do not log request headers or provider bodies. The Worker only forwards keys to allowed BFL API hosts and refuses redirects. Input-video capability links expire after two hours. Normal clip playback requires the owning browser's HttpOnly cookie.

## Verification boundary

Workerd tests exercise real isolated D1/R2 bindings with fake upstream BFL responses: concurrent idempotency, uncertain-submission protection, account checks, MP4 upload validation, upscale URL/estimate, result copying, byte ranges and session isolation. They spend no provider credits. Live paid generation, real-device playback and load testing are separate checks.

## Temporary-key decision

The operator explicitly chose paste for this interview demo. Keychain integration is superseded: no native helper, local installation, key database, or shared Wrangler BFL secret is included. The app retains the key only in page/request memory. Refresh and Disconnect clear it. The backend receives it transiently and must not be described as unable to access it.

Finished videos and job records remain in D1/R2 under the anonymous browser cookie, independent of the key. Download links create user-owned copies. Clearing the cookie loses access; a new hostname has a separate browser library. Pending jobs need the key again after refresh.

## Pages deployment details

Run `npm run deploy:pages`. `scripts/build-pages.mjs` builds `.pages/_worker.js` and writes the standard configuration into ignored `.pages-project/`; Pages rejects custom configuration paths and `account_id` in its config. The deployment script supplies the account through the CLI environment. Local Pages smoke check: `npx wrangler pages dev ../.pages --cwd .pages-project --port 4322` after `npm run build:pages`.

Wrangler 4.135.0 initially redirected `pages project create` to Workers in this agent session, producing `https://fluxstudio.glitchcandies.workers.dev` (version `6fae0e73-fb65-4171-a702-ef3384e12674`, source `3ca04b2`). The requested Pages project was then explicitly created with `--force`, which opts out of that delegation; established Pages projects deploy normally. The extra Worker remains as a fallback. The original `flux-studio-lite.glitchcandies.workers.dev` deployment is unchanged.

Canonical Pages DNS initially lagged in the local resolver, then resolved normally. HTTPS, API health/history, three library sources, video delivery and R2 range responses were checked. No account key or paid generation was used.
