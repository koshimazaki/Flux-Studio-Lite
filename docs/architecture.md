# Architecture and the cloud boundary

```text
                                      ┌─ Express → JSON + files + MP4Box
React composer → same-origin /api/* ──┤
                                      └─ Pages Worker → D1 + R2 + MP4Box
                    │                                  │
                    └──────── BFL submit / poll ───────┘
```

`shared/` owns model inputs, camera wording, pricing, lifecycle, replay rules, rate limits and catalogue validation. The browser and both adapters use the same composer and contracts, and each adapter validates every input again rather than trusting the last one. Neither accepts a user-supplied URL or an arbitrary upstream endpoint: an upscale takes a validated library entry or a session-owned clip id, and the live contracts are `fetch` calls to two fixed BFL endpoints.

`npm run check:worker` compiles `shared/` and the portable server modules with `"types": []` and no DOM, so a Node-only import in the layer meant to run on Workers fails there while every other check stays green. That gate is what keeps the boundary honest.

## Paid requests

Everything here exists because a request costs the visitor real money.

A submission is persisted with its idempotency key and budget reservation **before** the API call. An uncertain POST is never automatically repeated — polling and copying may retry, submission may not — and an interrupted `submitting` job becomes an explicit error asking the operator to check their BFL usage rather than quietly trying again.

A replay of an existing idempotency key is answered by one function for both backends (`shared/idempotency.ts`): fields are read in a fixed order, gaps left by older jobs receive the defaults a new request would get, and nested camera selections compare by value rather than key order. Omitting a field the original carried counts as a change, not a match. This mattered: the two backends previously disagreed, so dropping a field passed locally and conflicted in production.

In the Worker, D1's unique `(session, idempotency)` constraint reserves a request before its single paid submission, and an existing request id cannot be reused for different settings. This prevents duplicate submissions; it does not reserve funds in the visitor's BFL account, where BFL remains authoritative for the final charge. Costs returned as credits convert to USD at one credit per cent, and estimates and confirmed charges stay separate fields.

Both adapters measure an uploaded MP4 with the same bounded reader (`shared/mp4.ts`), reading metadata in 128 KiB ranges and skipping the media payload, so an upscale estimate cannot differ between local and hosted. Dimensions come from the stored object, never from a browser query parameter, because the price depends on them.

## Job lifecycle

`submitting → Pending → Reasoning / Generating → copying → Ready`

Errors, moderation, expiry and user-stopped tracking are terminal. `Ready` means the file and its measured metadata exist, not merely that the provider returned a URL. Downloads use a bounded stream, a temporary file and an atomic rename, and only documented BFL hosts are allowed — redirects are rejected, and no key is sent to media delivery.

BFL can return HTTP 500 with a terminal task error. The client recognizes `status: Error` only when the response names the requested task; generic outages remain retryable. This prevents a failed job from keeping its last Planning state.

Clicking the active generation button opens a cancellation confirmation. `POST /api/jobs/:id/stop` ends tracking under the owning session, preserving costs and replay protection against late writes. It does not cancel BFL work or promise a refund. Finished cards can be hidden and restored in this browser without deleting media or changing costs.

No state is open-ended. A job still running 30 minutes after creation becomes `expired` (`shared/lifecycle.ts`), whether a returning tab reads it first or the background sweep does. `expired` rather than `Error`, because the studio stopped watching, which is not a claim that BFL failed.

Quota eviction removes media without deleting the generation row or its idempotency reservation, so the row keeps its outcome and cost while marking playback unavailable. A successful generation is not reclassified as a failure because its file aged out.

The sweep ages out abandoned jobs, deletes closed capability links and drops records with their objects at 30 days. Workers runs it on a five-minute cron trigger; Pages has none, so there the same function runs in the background from `/api/health` and `/api/history` — routes a page load hits once each, deliberately not the four-second poll. A conditional D1 write claims the interval so the two triggers never duplicate work. On Pages this means housekeeping scales with visits rather than with time.

## Keys, and what follows from them

The deployment accepts visitor keys only. No shared BFL key or secret is deployed.

A key is held in live page state, sent as a header when needed, and cleared on navigation and page restoration. Legacy Web Storage credentials are deleted without being read. Browser and server persistence were both rejected, and a native Keychain helper was prototyped and removed before commit: an operator cannot honestly offer operator-blind keys using a secret they themselves control.

That choice has a visible consequence, and the interface states it rather than hiding it. Only a browser holding the key can advance a job, so the runtime genuinely cannot finish one after the tab closes. Keep the tab open until the clip is saved; after a refresh, re-enter the key to resume. A durable background runner would require key custody this deployment deliberately does not have.

Upscaling a private clip mints a random, two-hour, object-specific capability URL; ordinary media routes require the session cookie. Upscaling a library clip lends BFL the public asset URL instead, so no token exists to leak or expire. Neither keys nor signed URLs appear in public job records.

## Decisions

- **A React reducer, not a store.** Composer settings, per-term edits and retry restoration live in `useComposer`; one screen does not need Zustand, and job polling lives in one hook with the shared rules outside React.
- **Raw Three.js.** One isolated, finite procedural scene with no controls, assets or rigging, disposed on teardown. R3F would earn its place as the scene grows.
- **Plain CSS and native controls.** Token groups plus small component styles, native range and select elements kept keyboard-operable, and Three split into a lazy chunk. No utility framework or component kit.
- **Express locally.** Readable same-origin endpoints and established byte-range responses. Node's filesystem and process APIs are the local adapter, not Cloudflare-compatible code.

### Rejected, and why

- **Free camera dragging.** No continuous model control has been demonstrated. Named, optional terms are honest and inspectable.
- **A seed parameter.** Neither FLUX 3 video nor video upscale documents one, so run-to-run variation is the provider's own and there is nothing to record. Sending an unknown field risks a 422 on every generation.
- **A public community feed.** Every platform running one has accounts: an owner who accepted terms, who can be banned, and who can delete their own work. This app is deliberately anonymous, so a published clip would have no one to attribute, ban or honour a takedown from.
- **A CI deployment token.** Cloudflare's Pages and D1 permissions are account-scoped, so the narrowest token would still expose every project in the account to a public repository's CI. Releases stay manual.
- **Presenting a library clip as a camera finding.** Existing media previews the pipeline; it is not a controlled comparison.

## Limits

Generation budget and provider concurrency are the first constraints. Stored state is bounded — 250 MB per session, 3 GB per deployment, with per-route rate limits from `shared/limits.ts` and a sweep capped per run so no single invocation pays for a backlog.

One run per camera combination shows the pipeline working; it is not a reliability measurement. Session cookies provide anonymous isolation, not accounts or cross-device sync. No load-test claim is made, and there is no durable background completion.

See [Cloudflare operations](cloudflare.md) for deployment, migrations and hosted limitations, and [`observability/`](../observability/README.md) for the whole of what this deployment measures about its own use.
