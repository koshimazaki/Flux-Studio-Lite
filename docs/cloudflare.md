# Cloudflare deployment

The hosted app uses your own BFL key. Connect it in the header: the balance check verifies the connection and shows the remaining account credits as USD. Generation/upscale estimates are separate from that balance. No shared provider key is configured or stored.

## Runtime

- Worker + Static Assets: frontend and same-origin API.
- D1: session-owned jobs, unique submission IDs, copy leases, source metadata and temporary input links.
- R2: private uploaded/generated MP4s, plus the three project-owned library sources.
- MP4Box: bounded range inspection of stored videos for trustworthy upscale dimensions, duration and estimates. No Python or ffprobe in the Worker.

Keep the tab open and visible until a generated clip is saved. Polling resumes after refresh with the key in the same browser session. Closing the tab clears its key; re-enter it to resume. An uncaptured provider link may expire after approximately one hour. The adapter does not claim durable unattended completion or cross-device accounts.

Standard, non-fragmented MP4s with one video track are supported. Uploads: 50 MB, 20 seconds, at most 2560 × 1440 pixels and no dimension above 2560. Generated downloads need a known byte length and must be below 250 MB. Unsupported metadata produces an error instead of an invented estimate. The provider controls exact output rounding and final charges.

## Reproduce

Requires Node 22+ and a Cloudflare account with Workers, D1 and R2 enabled.

```sh
npm ci
npm test
npm run check:worker
npm run build
npx wrangler d1 migrations apply flux-studio-lite --local
npx wrangler dev
```

For another account, edit the account ID, database ID and bucket binding in `wrangler.jsonc`. Create the corresponding D1 database and R2 bucket, apply `migrations/` remotely and seed each `public/media/library-0N.mp4` into `library/library-0N.mp4` in the private media bucket. Library posters/videos also ship as static assets.

```sh
npx wrangler d1 migrations apply flux-studio-lite --remote
npx wrangler r2 object put flux-studio-lite-media/library/library-01.mp4 --file public/media/library-01.mp4 --content-type video/mp4 --remote
# Repeat the seed command for library-02 and library-03.
npm run deploy
```

Do not provision a BFL secret: each visitor supplies their own key. Do not log request headers or provider bodies. The Worker only forwards keys to allowed BFL API hosts and refuses redirects. Input-video capability links expire after two hours. Normal clip playback requires the owning browser's HttpOnly cookie.

## Verification boundary

Workerd tests exercise real isolated D1/R2 bindings with fake upstream BFL responses: concurrent idempotency, uncertain-submission protection, account checks, MP4 upload validation, upscale URL/estimate, result copying, byte ranges and session isolation. They spend no provider credits. Live paid generation, real-device playback and load testing are separate checks.
