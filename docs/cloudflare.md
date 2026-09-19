# Cloudflare deployment

Live: [FLUX Studio Lite](https://flux-studio-lite.glitchcandies.workers.dev). Initial deployment on 19 September 2026 from `596606083f9fe86e27d13b5a80834cba32f38f89`; Worker version `9e32512e-5353-4dce-9394-07d1abfdc618`. GitHub was not pushed.

The hosted app uses your own BFL key. Connect it in the header: the balance check verifies the connection and shows the remaining account credits as USD. Generation/upscale estimates are separate from that balance. No shared provider key is configured or stored. The key exists temporarily in page/request memory during use; it is not persisted by the app.

## Runtime

- Worker + Static Assets: frontend and same-origin API.
- D1: session-owned jobs, unique submission IDs, copy leases, source metadata and temporary input links.
- R2: private uploaded/generated MP4s, plus the three project-owned library sources.
- MP4Box: bounded range inspection of stored videos for trustworthy upscale dimensions, duration and estimates. No Python or ffprobe in the Worker.

Keep the tab open and visible until a generated clip is saved. Refreshing, navigating away or closing the tab clears its in-memory key; re-enter or autofill it to resume polling. No credential is read from or written to browser storage. An uncaptured provider link may expire after approximately one hour. The adapter does not claim durable unattended completion or cross-device accounts.

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

## Keychain boundary

The local BFL dashboard can read a macOS generic-password Keychain entry through its Node backend. A hosted webpage cannot directly use that local API. Apple Passwords autofill can fill an ordinary password form in a supported browser, which temporarily exposes the credential to the page. Keeping the raw key entirely out of the webpage instead requires a native/local helper that performs provider requests. The implementation choice is awaiting the operator; no native helper or automatic Keychain lookup is claimed. The existing local BFL generic-password item is not automatically an Apple Passwords website login.

The credential-persistence correction was deployed from `81352b19828b85135b3ec0f8dae0813192397b01` as Worker version `10788fe9-a83c-4bc6-8b08-290ca0e35f2b`. The live connection dialog was checked after reload. No GitHub push.
