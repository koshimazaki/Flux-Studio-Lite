# Camera wording and UI references

The [BFL camera prompting guide](https://docs.bfl.ai/guides/prompting_video_camera_terms) publishes example prompt strings alongside video URLs. These are available examples, not complete API request records or a reliability benchmark. Checked 19 September 2026.

The demo reuses the short camera terms in the guide, then attaches them to the user's subject. It does not transplant the example's entire scene into a different scene description.

| Preset             | Relationship to the guide                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Orbit left / right | Uses the published generic orbit wording; direction is our editable addition.                                                             |
| Full orbit         | Uses the same generic term; completing a revolution is our editable addition. The guide's lens-axis roll example is a different movement. |
| Dolly in           | Uses the documented movement term.                                                                                                        |
| Dolly out          | Our reverse-direction variant; no exact published match was found.                                                                        |
| Crane up           | Uses the guide's rising-crane phrase.                                                                                                     |
| Low angle          | Uses the documented angle phrase.                                                                                                         |
| Top-down           | Uses the documented overhead-view phrase.                                                                                                 |

The selected preset identifies its wording as documented or a direction variant. Everything in the camera text field is editable and sent as shown. The 3D scene previews the named preset, not the meaning of rewritten text. The text-to-video guide and related overview/reference pages were also checked; unlisted exact prompts were not inferred from videos.

## Interface system

The interface uses compact instrument controls: graphite surfaces, ruled native-range inputs, small machined borders and restrained colour signals. Blackstone/Lime keeps one accent family across controls and readouts. Cyberpunk uses coral controls with cyan readouts. Layout, application state, menu keyboard handling and the range treatment are implemented in this repository.
