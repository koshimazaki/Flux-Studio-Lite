# Design decisions

Why the app is shaped the way it is. Public-safe summary: provider
identifiers, credentials and private reference paths are omitted.

## What was asked for, and what was built

| Asked for                                   | Built                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A centred prompt with the gallery below     | One central composer above an output grid                                                         |
| Text in, video out                          | Text-to-video as the primary flow, upscale as the second model                                    |
| Camera selection visible in the prompt      | Editable, colour-coded camera clauses; Camera off preserves the scene                             |
| Shot size, angle and movement kept separate | One registry of 24 terms in three optional sections, feeding validation, prompt order and glyphs  |
| Simple code and bounded components          | React, plain CSS, native controls, one raw Three.js preview — no store, animation or UI framework |
| Local refinement before Cloudflare          | A loopback Express server with persisted jobs and an explicit cloud-port boundary                 |
| A first screen that works with zero setup   | A four-clip library this studio generated, each shipping the exact inputs to recreate it          |

## Rejected, and why

- **Free camera dragging.** No continuous model control has been
  demonstrated. Named, optional terms are honest and inspectable.
- **A global store or component kit.** The screen does not need one, and
  importing a new visual system would add work without fixing the real token
  gaps.
- **Scaling via CSS zoom or transforms.** Normal document sizing keeps layout,
  hit targets and text flow aligned.
- **Presenting a library clip as a camera finding.** Existing media previews
  the pipeline; it is not a controlled comparison.
- **Trusting upload metadata, or sending a large base64 payload by default.**
  The hosted path needs trusted inspection and an owned HTTPS object URL.
- **Blindly retrying paid submissions.** An uncertain network response may
  still represent a charged job. Polling and copying may retry; submission
  does not.
- **A seed parameter.** Neither FLUX 3 video nor video upscale documents one,
  so run-to-run variation is the provider's own and there is nothing to record.
  Sending an unknown field risks a 422 on every generation. `draft` into
  `draft_enhance` is the only determinism the API exposes.
- **A public community feed.** Every platform that runs one has accounts: an
  owner who accepted terms, who can be banned, and who can delete their own
  work. This app is deliberately anonymous, so a published clip would have
  no one to attribute, ban or honour a takedown from.

## Decisions worth the detail

**Key custody.** Browser and server credential persistence were both rejected.
A Keychain helper was prototyped and removed before commit. Keys live in page
and request memory, reach the server transiently, are never stored, and
disappear on refresh. An operator cannot honestly offer operator-blind keys
using a secret they themselves control.

**Nothing stays unfinished.** Only a browser holding the visitor's key can
advance a job, so the runtime genuinely cannot complete one after the tab
closes. The honest close is `expired` after 30 minutes, applied by the same
function whether a returning tab or the background sweep reaches it first.
Retention matches the session cookie's own 30 days, because after that the
rows are unreachable anyway.

**One sweep, two runtimes.** Workers gets a five-minute cron trigger. Pages
has none, so there the same function runs in the background from
`/api/health` and `/api/history` — routes a page load hits once each,
deliberately not the four-second poll. A conditional D1 write claims the
interval, so the two triggers never duplicate work.

**One replay rule.** The Worker compared stored JSON text while Express
compared only the keys a request happened to include, so dropping a field
passed locally and conflicted in production. Both now call one function that
reads fields in a fixed order, fills the defaults an older job predates, and
compares nested camera selections by value.

**Ceilings, not just ages.** Stored media is capped at 250 MB per session and
3 GB per deployment. Quota eviction removes media but keeps the job record and
marks playback unavailable, which preserves replay protection and counts. The
clip that just arrived is never evicted.

## Next steps

1. Retain a small set of API-confirmed camera findings across varied subjects.
2. Evaluate a durable background runner with an explicit key-custody design,
   replacing age-out with real completion.
3. Extend the recorded library into a same-subject grid, so the catalogue
   compares movements rather than illustrating four of them.

Free camera dragging, image input, video editing, extra generators, batch jobs
and authentication are outside this prototype.
