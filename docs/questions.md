# Implementation questions

These answers describe the local build. Planned cloud behaviour is identified explicitly.

## Why named camera choices instead of dragging?

The app exposes camera language that can be read, edited and sent to FLUX. One optional choice each for shot size, angle and movement keeps the selection understandable. The diagram illustrates the combination; it does not claim continuous control over the generated camera.

## Are the terms proven to work?

They are drawn from BFL's vocabulary, not ranked by measured reliability. The current smoke results prove generation and upscale plumbing. A same-subject comparison grid is still needed before calling a move reliable or disabling it based on evidence.

## Why is the camera prompt editable?

The clauses are useful starting points, and the operator explicitly asked to edit them. Edits survive changing terms, empty text is respected, and the server composes the same ordered phrases shown in the UI. The 3D preview continues to explain the named terms; it does not interpret rewritten prose.

## Why this small app alongside a larger workbench?

This is a focused, readable generation-to-result flow. The bigger workbench serves a broader daily workflow; this prototype makes the camera vocabulary, job lifecycle and upscale path easy to inspect. The current version runs locally; a zero-setup hosted version is still a separate delivery step.

## Does the 3D stage earn its place?

It explains camera vocabulary before a paid request. Shot size sets distance and framing, angle sets elevation/orientation, and movement sets a path or subject rotation. It is an illustration, not a prediction of a FLUX result.

## What happens after Generate?

The local server validates inputs, reserves cost and saves the job before submitting once. The browser polls every four seconds while visible; the server independently resumes server-key jobs. A result becomes Ready only after its video has been copied locally and inspected. Visitor-key jobs require the key again to resume.

## How does playback work?

Owned clips are served by the local API with byte-range support and session checks. A cloud port must preserve Range/HEAD behaviour and durable capture. R2 streaming and a durable runner are planned; a short background callback alone is not a recovery guarantee.

## How much did agents write, and what was rejected?

Agents implemented substantial code under operator direction. The [process record](process.md) shows specific requests and resulting changes. Examples of rejected approaches include free dragging, extra UI/store frameworks, blind paid retries, and claiming library clips as controlled findings.

## What breaks at ten times the traffic?

Provider concurrency, rate limits and generation cost constrain throughput. The current JSON store has one process owner, so a hosted multi-instance version needs atomic database reservations, durable job leases and request rate limits. R2 egress is free; storage and operations still have costs. Server-sent events would need a measured reason, not an assumed scaling win. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## What was cut or deferred?

Free dragging, image input, additional generators, batch generation and accounts are outside this prototype. Cloud deployment, an exact-input cache, scored camera findings and a stranger test are not yet done. The dither waiting state and reveal shipped and remain in the main video slot.

## Why no Zustand, shadcn or Tailwind?

A reducer handles composer state and one hook handles jobs. The isolated Three.js loop evaluates a pure path from a captured selection and does not need to read a global store. Native elements plus small custom controls already implement the interface; complete CSS tokens provide its visual system.
