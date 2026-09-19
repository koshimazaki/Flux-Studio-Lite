# Process: operator direction and agent implementation

Agents wrote substantial implementation code; the operator set the scope, supplied visual references, reviewed results, and sent changes back. There is no reliable line-by-line authorship percentage. This is a public-safe summary of the local correction record, with private reference paths, credentials and provider identifiers omitted.

## Initial build and refinements

| Operator asked for                             | What was built                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A centred prompt with the gallery below        | One central composer and an output grid                                                                |
| Text input instead of an initial image         | Text-to-video as the primary generation flow                                                           |
| Upscale as the second model                    | Gallery/upload source selection; camera controls disappear in Upscale                                  |
| Local refinement before Cloudflare             | A loopback server with persisted jobs and explicit cloud-port boundaries                               |
| Simple code and bounded components             | React, plain CSS, native controls, one raw Three.js preview; no added store, animation or UI framework |
| Camera selection visible in the prompt         | Editable, coloured camera clauses; Camera off preserves the scene                                      |
| Better camera icons                            | A consistent camera silhouette, later replaced by three data-driven glyph families                     |
| Upscale amount and mode controls at the bottom | A ruled 1.5–3× fader, Precise/Creative modes, matching prices and payloads                             |
| A recognisable moving camera                   | Procedural body, lens, glass, handle, grip and viewfinder                                              |
| Editable camera wording                        | Native textareas with per-term edits, including intentionally empty text                               |
| Ruler-style faders                             | Shared native ranges with a dark thumb and major/minor ticks                                           |
| Duration, ratio, resolution and draft controls | Validated API settings and live cost estimates; draft retains the prior resolution                     |
| Model selection at the bottom                  | Model-first toolbar and a changing mode badge above the prompt                                         |
| Two graphite instrument themes                 | Blackstone/Lime and Cyberpunk palettes with a theme menu                                               |
| Less headline and footer text                  | A small studio label and an independent-experiment footer                                              |
| Camera wording grounded in BFL's guide         | Linked source sections, documented terminology, and clearly labelled studio examples                   |
| Whole dropdown triggers that work              | Shared keyboard-operable menus, clickable chevrons and model icons                                     |

## This local review pass

| Review correction                            | Implementation / evidence                                                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Main video above the composer; gallery below | `FeaturedVideo` owns the selected job's waiting field, reveal and video; a library clip appears before the first job         |
| Make the composer 90% of its previous size   | A shared CSS unit sets desktop width to 846px from 940px and prompt type to 16.2px from 18px; mobile input text retains 16px |
| Separate shot size, angle and movement       | One registry defines 24 terms in three optional sections; validation, prompt order, glyphs and 3D poses consume it           |
| Keep state simple                            | `useComposer` owns a small reducer; `SourceInput` owns upload handling; no Zustand, shadcn or Tailwind added                 |
| Complete the theme system                    | Spacing, radii, timings, error/media surfaces and scene colours live in `tokens.css`                                         |
| Restore a job from its URL                   | The same-session job is selected on reload; invalid or unavailable links fall back with a message                            |
| Remove duplicated finished-state lists       | Browser and server share `isTerminal`                                                                                        |
| Align claims with code                       | README, architecture, camera wording and [questions](questions.md) now describe the local implementation                     |

## Rejected approaches and why

- **Free camera dragging:** no continuous model control has been demonstrated. Named, optional terms are honest and inspectable.
- **A global store or component kit:** the screen does not need one, and importing a new visual system would add work without fixing the actual token gaps.
- **Scaling via CSS zoom or transforms:** normal document sizing keeps layout, hit targets and text flow aligned.
- **A library clip presented as a camera finding:** existing media is usable as a preview, but is not a controlled camera comparison.
- **A worker port that trusts upload metadata or sends a large base64 payload by default:** the hosted design needs trusted inspection and an owned HTTPS object URL; see [architecture](architecture.md).
- **Blindly retrying paid submissions:** an uncertain network response may still represent a charged job. Polling and copying may retry; submission does not.

Cloud deployment, an exact-input demo cache, paid camera comparisons and a stranger test remain next steps. Human visual approval is pending. The dither waiting/reveal effect shipped; it is not a cut feature. No additional paid generation was made in this pass.

## Readability and toolbar follow-up

The operator asked for a small text increase after the 90% scale reduction and for Camera beside Draft. The two smallest text tokens gain 2px and the next gains 1px at the default root size; spacing and main prompt text retain their scale. Camera uses the same dimensions and switch treatment as Draft and remains enabled initially. The aspect-ratio field is slightly wider to fit its enlarged label.

Progressive disclosure for Shot sizes, Angles and Movements is deferred pending the operator’s sketch. The intended direction is one open preset section with visible selection summaries; no layout choice has been implemented yet.

## Optional camera tabs, version two

The operator’s annotated screenshot placed three tabs directly below the composer. This supersedes the pending-sketch item above. Shot sizes opens first; each tab shows its selected value or None. One two-row grid is visible, with all eight existing presets on desktop and sideways scrolling plus arrows on narrow screens. None is a separate compact choice. Tabs animate with CSS and respect reduced motion. Sections are optional, with no forced advance or separate enable checkbox. The operator explicitly kept the existing eight terms per section.

The expanded version remains available through **Compare expanded view**; both share the same selections and edited phrases. This is a local comparison, not a design promotion.

The operator also requested an account-budget check in place of Local Preview once a key is supplied. The top bar now reads the BFL credit balance, shows its USD equivalent and supports refresh. The key indicator confirms a successful check, rather than key presence. Account credit balance, per-run estimate and the local demo cap remain distinct. No account name is inferred from the balance endpoint.

## Compact selected-preset icons

The operator asked to retain selected presets without spending another row on labels. Each camera tab now places the selected preset’s coloured glyph beside its section name, or a dash for None. The full selection name stays in the native tooltip and accessible label. None, paging arrows and the guide link share one footer below the unchanged eight-tile grid. This supersedes the two-line text summaries above.

## Hosted BYO-key and playback pass

The operator authorized a working Cloudflare app with their own key and requested more legible preset identification, corrected angle symbols and faster library playback. This pass restores selected names beside icons, uses a human marker beside each camera glyph, fixes high/low vertical placement, distinguishes Macro from Extreme close-up, and adds ratio-shaped icons. Gallery hover previews are muted; explicit play opens a lightbox. The featured result can also be enlarged and does not autoplay when it arrives.

The hosted adapter uses D1 job reservations and R2 media. A bounded MP4Box reader replaces ffprobe in the Worker; browser-supplied dimensions never determine the server estimate. Python and a separate paid inspection service were unnecessary. Workerd tests exposed unsupported `redirect: error`; manual redirect handling now rejects redirects without forwarding keys.

A durable background runner remains deferred because keys are held only in the browser session. The UI asks visitors to keep the tab open until the clip is saved. Paid comparison clips, an exact-input cache, real-device and stranger testing remain deferred. Human visual approval is still separate from implementation checks.

## Key custody correction

The operator explicitly rejected browser/server credential persistence and requested Keychain access on demand. Removed sessionStorage reads/writes, added legacy-key deletion without loading the secret, cleared page credentials on navigation/restoration, and removed the raw key from account-balance identity state. The key form accepts autofill via its submitted value; the app does not request browser credential storage. Native/local Keychain access versus Apple Passwords autofill is awaiting the operator's choice. Temporary page memory is disclosed and is not presented as meeting the stronger requirement that the key never enter the page.
