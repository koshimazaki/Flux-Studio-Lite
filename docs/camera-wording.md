# Camera wording and examples

The [BFL camera guide](https://docs.bfl.ai/guides/prompting_video_camera_terms) is the terminology source. The studio exposes three of its fourteen sections: **Shot sizes**, **Angles**, and **Movements**, with eight terms per section. Each heading links to the matching guide section. Checked 19 September 2026.

`shared/camera.ts` is the current registry: labels, descriptions, prompt clauses, studio-authored examples and pose parameters. Every section has an optional None choice. The prompt contains the scene followed by shot size, angle and movement. Edits belong to individual terms; switching away and back restores them. Empty edits remain empty. Default clauses use sentence case.

The inline examples are written for this studio and labelled accordingly. BFL's own examples are linked, not copied wholesale, and BFL-hosted videos are not embedded. All playable media loads from this app's origin. No reliability claim follows from a term appearing in the guide.

The diagram composes distance/target, elevation/azimuth/roll, and movement. Lazy Susan turns the subject with a stationary camera. Pan and tilt change aim without translation; trucking changes camera position. Extreme low angles stop above the ground. These are illustrative poses, not measured lens models or a prediction of generated footage. Editing prose does not change the illustration.

`shared/legacy-camera.ts` is a compatibility table for the initial eight IDs. It is not a second active picker. Saved prompts retain their exact historical clause; retry maps the choice to the closest current term and carries the old wording into an edit. Old directional/reverse variants may therefore differ from the current diagram.
