# Process and design decisions

This is a public-safe summary of product direction, implementation decisions and visual corrections. Private reference paths, credentials and provider identifiers are omitted.

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
| Less headline and footer text                  | A compact product label; the later responsive pass removes the decorative footer entirely              |
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
| Align claims with code                       | README, architecture, camera wording and verification describe the implemented contracts                                     |

## Rejected approaches and why

- **Free camera dragging:** no continuous model control has been demonstrated. Named, optional terms are honest and inspectable.
- **A global store or component kit:** the screen does not need one, and importing a new visual system would add work without fixing the actual token gaps.
- **Scaling via CSS zoom or transforms:** normal document sizing keeps layout, hit targets and text flow aligned.
- **A library clip presented as a camera finding:** existing media is usable as a preview, but is not a controlled camera comparison.
- **A worker port that trusts upload metadata or sends a large base64 payload by default:** the hosted design needs trusted inspection and an owned HTTPS object URL; see [architecture](architecture.md).
- **Blindly retrying paid submissions:** an uncertain network response may still represent a charged job. Polling and copying may retry; submission does not.

Cloud deployment is implemented. An exact-input demo cache, paid camera comparisons and a stranger test remain next steps. The dither waiting/reveal effect shipped; it is not a cut feature. No additional paid generation was made in this pass.

## Readability and toolbar follow-up

The operator asked for a small text increase after the 90% scale reduction and for Camera beside Draft. The two smallest text tokens gain 2px and the next gains 1px at the default root size; spacing and main prompt text retain their scale. Camera uses the same dimensions and switch treatment as Draft and remains enabled initially. The aspect-ratio field is slightly wider to fit its enlarged label.

## Optional camera tabs, version two

The operator’s annotated screenshot placed three tabs directly below the composer. This supersedes the pending-sketch item above. Shot sizes opens first; each tab shows its selected value or None. One two-row grid is visible, with all eight existing presets on desktop and sideways scrolling plus arrows on narrow screens. None is a separate compact choice. Tabs animate with CSS and respect reduced motion. Sections are optional, with no forced advance or separate enable checkbox. The operator explicitly kept the existing eight terms per section.

The expanded version remains available through **Compare expanded view**; both share the same selections and edited phrases. This is a local comparison, not a design promotion.

The operator also requested an account-budget check in place of Local Preview once a key is supplied. The top bar now reads the BFL credit balance, shows its USD equivalent and supports refresh. The key indicator confirms a successful check, rather than key presence. Account credit balance, per-run estimate and the local demo cap remain distinct. No account name is inferred from the balance endpoint.

## Compact selected-preset icons

The operator asked to retain selected presets without spending another row on labels. Each camera tab now places the selected preset’s coloured glyph beside its section name, or a dash for None. The full selection name stays in the native tooltip and accessible label. None, paging arrows and the guide link share one footer below the unchanged eight-tile grid. This supersedes the two-line text summaries above.

## Hosted BYO-key and playback pass

The operator authorized a working Cloudflare app with their own key and requested more legible preset identification, corrected angle symbols and faster library playback. This pass restores selected names beside icons, uses a human marker beside each camera glyph, fixes high/low vertical placement, distinguishes Macro from Extreme close-up, and adds ratio-shaped icons. Gallery hover previews are muted; explicit play opens a lightbox. The featured result can also be enlarged and does not autoplay when it arrives.

The hosted adapter uses D1 job reservations and R2 media. A bounded MP4Box reader replaces ffprobe in the Worker; browser-supplied dimensions never determine the server estimate. Python and a separate paid inspection service were unnecessary. Workerd tests exposed unsupported `redirect: error`; manual redirect handling now rejects redirects without forwarding keys.

A durable background runner remains deferred because keys are held only in the browser session. The UI asks visitors to keep the tab open until the clip is saved. Paid comparison clips, an exact-input cache, real-device and stranger testing remain deferred.

## Key custody correction

The operator explicitly rejected browser/server credential persistence and first explored Keychain access on demand. Removed sessionStorage reads/writes, added legacy-key deletion without loading the secret, cleared page credentials on navigation/restoration, and removed the raw key from account-balance identity state. The key form accepts autofill via its submitted value; the app does not request browser credential storage. The later temporary-key decision supersedes the native helper idea.

## Laptop layout and temporary keys

Removed the moving-images kicker and header rule, set the header to 80 units, reduced the featured-video/composer and gallery gaps, and moved camera presets into a modal opened from the composer header. Selected camera phrases remain compact sentences; their text is editable in the modal. Done applies both presets and edits; Cancel/Escape discard the draft. The existing reducer handles these changes without adding a state-management package.

The operator chose FLUX Studio / fluxstudio.pages.dev. The Pages deployment uses the same Worker implementation and existing D1/R2 resources. Browser library cookies are origin-specific, so the new hostname has its own anonymous browser library; this is not an automatic migration of the old domain's cookie.

After exploring a Keychain helper, the operator chose temporary API-key paste. The helper prototype was removed before commit or deployment. Keychain integration is superseded, not an unfinished requirement. No profiles, key database, Wrangler BFL secret or local installation is added. Keys remain in page/request memory and disappear on refresh/disconnect. The server receives each key transiently and never stores it. Website operators cannot honestly offer operator-blind keys using a secret/decryption system they control.

Finished clips and job records remain in the cloud library, retrieved using the anonymous browser cookie. They are not dependent on the API key or a browser media cache. Download links make user-owned copies explicit. Clearing cookies loses this browser's access; pending jobs need the key re-entered after refresh. Paid generations and stranger/native-device tests remain deferred.

## Colour-coded camera text

The operator asked to make the camera phrases feel like one prompt rather than separate form inputs. The dialog now uses one shared editor surface with tightly stacked, auto-growing text lines. Shot sizes, Angles and Movements retain labels and inherit their respective tab colours. The applied scene prompt displays the same coloured lines. Native labelled textareas preserve accessible editing, selection-specific phrase state, None, and Done/Cancel semantics.

## Generation feedback and upscale prompt

The operator renamed the featured caption to “Your latest generation” and explored a geometric waiting animation. The final treatment moves activity into the Generate button as a small theme-aware pixel ring and keeps the existing dither/reveal field in the main video slot.

The operator also requested an optional text prompt beside the upscale source clip. It grows vertically and wraps below the source on narrow screens. Upscale text stays separate from the video scene, is restored with a saved job, and reaches BFL in both local and hosted adapters. An empty prompt retains neutral upscaling.

## Compact recall and clean navigation follow-up

The operator kept the camera editor but requested an inline coloured sentence in the applied composer and a cabin starting example. Recreate was added before Download/Upscale. The later recall pass gives clip titles and Recreate distinct behavior; neither action submits a generation.

The old three public clips were image-to-video examples with no bundled original inputs. After this was explained, the operator asked to remove them and curate new reproducible examples later. Their public assets and catalog entries are removed; a single MP4 is retained as a test-only fixture. Existing private R2 objects were not deleted.

The enlarged viewer now places the complete saved prompt below the video and offers Copy prompt and Download MP4. Job identifiers remain internal: selected clip state lives in tab history, old links migrate to a clean address, and reload restores the selected setup without overwriting ongoing edits during polling.

## Subtle feedback and compact clip actions

The operator asked to keep status, cost, Recreate, Download and Upscale on one row. The gallery uses one flexible metadata row, retaining readable text and wrapping only when space requires it. The later four-column pass removes redundant Ready text from completed clips.

The large foreground cube was too prominent. Activity moved into the Generate button, alongside a gentle outline, while the existing main shader remains. The first nine-particle version was rejected by the operator because its marks were too small and unclear. A larger voxel cube with nine blocks per face was also rejected as heavy and too low beside the text. The final version uses a centred 20px pixel-ring loader with eight crisp squares; the outer halo is removed. This keeps the familiar spinner silhouette without a dense solid object. The operator then requested a moving edge glow, so a restrained CSS highlight travels around the border with a faint diffuse glow. After visual review, the operator kept this treatment and requested a slower eight-second rotation. The video area no longer repeats Generating; it keeps descriptive text while the button owns the status. Sending, queued, generating/upscaling and saving states follow the actual job; missing visitor keys offer Resume. No fabricated progress percentage is shown.

The public documentation now uses the current Pages address and describes the implemented storage and prompt contracts. Temporary local credentials and hosted D1/R2 behavior remain explicit.

The operator caught a yellow loader persisting after switching themes. The canvas had cached the colour at the start of a CSS transition. It now resolves the displayed colour on every painted frame, keeping the loader and edge aligned with the active theme.

The scene-suggestion row was removed to shorten the composer. Clip actions now form one right-aligned group beside cost, with consistent spacing.

## Laptop spacing and distinct prompt reuse

The operator asked for less top whitespace, a slightly smaller logo/preview, a tighter right-aligned action group, and a visible first gallery row without crowded controls. A three-section layout uses 16px gaps, a shorter header, proportional preview sizing and shallower desktop thumbnails. Prompt padding is restored to 16px. The redundant gallery eyebrow and footer connection link are removed.

Prompt selection and Recreate now have separate contracts: a title click copies only subject/camera text or upscale guidance; Recreate restores all saved settings. The title path marks its selection as handled so the full restore effect cannot immediately undo this distinction. Existing session ownership and clean-address selection remain.

The narrow preview experiment was rejected: its small width above the composer and wider gallery created a stepped silhouette. The main viewer returns to the composer width and a larger 380px height cap. A 32px gap gives the gallery more breathing room. The gallery is allowed below the fold; matching the main working surfaces takes precedence over fitting the whole first row on screen.

Large-screen review exposed an oversized empty footer band and only three library cards across a much wider canvas. The final responsive pass keeps the viewer aligned with the composer but lowers its height cap to 340px, lays out four clips across on desktop, and removes the decorative footer entirely. Two-column and one-column gallery fallbacks remain for smaller screens.

The four-card review then showed that the card metadata was too dense. The gallery grows to 1280px on large displays and leaves 24px below its heading, making each thumbnail larger while preserving the four-card row. Ready is redundant for completed clips, so their compact row now shows cost plus Recreate, Download and Upscale. Prompt titles remain available below the images to preserve prompt-only reuse.

## Compact Upscale and fluid display scaling

The Upscale source and optional prompt now share two equal surfaces inside a composer that matches the resting Text-to-video height. The amount ruler keeps its native range behavior but hides decorative tick labels in this compact toolbar. The prompt expands when its text wraps. Upload is one labelled drop target that also opens the native MP4 chooser; the existing size, duration and metadata validation remains authoritative.

The main stage and four-card gallery use bounded `clamp()` widths instead of one fixed desktop maximum. The 1715 × 966 review size keeps the second gallery row below the fold while giving the first four clips more space. At a 3005 × 1492 review size, the preview, composer controls, gallery type and thumbnails increase within explicit caps instead of sitting in a narrow island. The two- and one-column breakpoints remain unchanged, so widths between the reviewed endpoints interpolate without JavaScript sizing.

## Limits, lifecycle and a populated first screen

This pass handles state that nobody is watching and closes one product gap: a stranger opening the URL cold met an empty hero and an empty gallery, which contradicted the scope rule that zero setup should still show the studio working.

The catalogue is four clips this studio generated on the hosted deployment. Each public entry carries the exact description, camera selection and its per-term wording, the composed prompt, duration/resolution/aspect/draft and provider-confirmed cost needed to recreate its setup. That closes a standing next-step — a seeded set of exact-input runs — and makes the gallery the app's own output rather than borrowed illustration. The honest limit is stated with it: one run per combination demonstrates the pipeline and the wording, not reliability across subjects.

They ship as 960px previews rather than the 25.8 MB of originals, following the documented conversion, which brings the first screen down to 3.5 MB. Private lineage records remain local rather than shipping with the site. Four rather than three also fills the desktop gallery's four-column row exactly. Keeping them out of R2 follows from what they are: a public clip needs no private object and no two-hour capability token, so upscaling one lends BFL the deployed asset URL directly. That also removes a seeding step from deployment. Their declared metadata is checked once at load against an upload's own limits, which keeps the rule that a price never comes from the browser — the catalogue is server-side data, and a malformed entry is dropped rather than trusted.

Nothing may stay unfinished. Only a browser holding the visitor's key can advance a job, so the runtime genuinely cannot complete one after the tab closes; pretending otherwise would need key custody this deployment deliberately refuses. The honest close is `expired` after 30 minutes, applied by the same function whether a returning tab reads the job or the background sweep reaches it first. That also ends the loop where a stored result whose metadata could not be read was re-inspected on every future poll. Retention is set to the session cookie's own 30 days, because after that the rows are unreachable anyway — the expiry policy falls out of the access model instead of being a second, arbitrary number.

The sweep needed a trigger that works on both deployments. Workers gets a five-minute cron trigger; Pages has none, so there the same function runs in the background from `/api/health` and `/api/history` — the two routes a page load hits once each, deliberately not the four-second poll. A conditional D1 write claims the interval, so the two triggers never duplicate work. The nice property on Pages is that housekeeping cost scales with visits rather than with time.

Rate limits now cover reads. The previous limiter protected paid writes only, which left `GET /api/jobs/:id` able to drive a real provider poll on a public URL with no ceiling. The spend was already the visitor's own, but the Worker, D1 and R2 usage was this deployment's. One table in `shared/limits.ts` holds every number so the D1-backed and in-memory limiters cannot drift.

The replay rule was the clearest case of the two backends disagreeing: the Worker compared stored JSON text while Express compared only the keys the new request happened to include, so dropping a field passed locally and conflicted in production. Both now call one function that reads fields in a fixed order, fills the defaults an older job predates, and compares nested camera selections by value. The unused `edit-camera` reducer action, which only its own test ever dispatched, is gone; the test now goes through the patch the camera dialogue actually sends.

## A library you can actually take apart

The restored gallery exposed a promise the interface did not keep: the footnote under it said Recreate loads a clip's saved prompt and settings, while library cards offered only Download and Upscale, plain titles, and a lightbox with no prompt to copy. The catalogue had the metadata to show a clip and nothing to reproduce it.

The job rows behind the four clips were still in D1, so each catalogue entry now ships the run that made it: description, camera selection, per-term wording, composed prompt, duration, resolution, aspect, draft and the provider-confirmed cost. `src/library.ts` presents that record as a `Job`, which is the shape restore, prompt reuse and the lightbox already speak, so the feature is a small adapter rather than a parallel set of props. Library cards gained a clickable title, Recreate, the prompt in their lightbox and the original cost beside the dimensions.

One boundary is deliberate: a library clip restores into the composer but is never selected as the featured job. Its id names a catalogue entry, so selecting it would send the poller after a session job that does not exist and raise an error banner on the first screen.

A test keeps the catalogue honest rather than trusting the file: every shipped setup must still be a request `validateInput` accepts, `composePrompt` must rebuild its recorded prompt exactly, and a full restore must return the same prompt and settings. A separate invariant rejects a public provenance file, provider identifiers and internal hashes. Corrupting a single camera phrase fails the reproduction test.

A seed was considered and is not possible. Neither FLUX 3 video nor video upscale documents a `seed` parameter, so the variation between runs with identical settings is the provider's own and there is nothing to send or record; `draft` into `draft_enhance` is the only determinism the API exposes. Sending an unknown field would risk a 422 on every generation.

Community publication was considered and declined. The pattern works elsewhere, but every platform that runs a public feed has accounts: an owner who accepted terms, who can be banned, and who can delete their own work. This app is deliberately anonymous, so a published clip would have no one to attribute, ban or honour a takedown from, and the provider's safety tolerance governs what the model renders, not what is appropriate to host. Visitors keep a private session library, which already survives refresh and return, and the public catalogue stays curated. Adding even lightweight identity would change that calculation; until then, promotion stays a human act.
