/** Camera vocabulary adapted from BFL's guide; examples are authored for this studio. */
export const CAMERA_GUIDE_URL =
  "https://docs.bfl.ai/guides/prompting_video_camera_terms";
export const CAMERA_GUIDE_SECTION_COUNT = 14;
export type Motion =
  "orbit" | "arc" | "dolly" | "pan" | "tilt" | "crane" | "truck" | "subject";
export interface PoseSettings {
  distance?: number;
  targetY?: number;
  elevation?: number;
  azimuth?: number;
  roll?: number;
  motion?: Motion;
  amount?: number;
}
interface TermSpec {
  id: string;
  label: string;
  description: string;
  clause: string;
  example: string;
  pose: PoseSettings;
}
const term = <T extends string>(
  id: T,
  label: string,
  description: string,
  clause: string,
  pose: PoseSettings,
) => ({
  id,
  label,
  description,
  clause,
  pose,
  example: `A chrome chair stands on a circular plinth in a quiet gallery. ${clause}`,
});

export const cameraSections = [
  {
    id: "shot-sizes",
    label: "Shot sizes",
    heading: "Shot sizes and framing",
    anchor: "shot-sizes-and-framing",
    color: "--camera-shot",
    glyph: "frame",
    terms: [
      term(
        "macro",
        "Macro",
        "Explore a tiny surface detail.",
        "Macro detail of the subject's surface.",
        { distance: 0.65, targetY: 1.3 },
      ),
      term(
        "extreme-close-up",
        "Extreme close-up",
        "Fill the frame with one detail.",
        "Extreme close-up on a single detail of the subject.",
        { distance: 0.95, targetY: 1.5 },
      ),
      term(
        "close-up",
        "Close-up",
        "Concentrate on the upper part of the subject.",
        "Close-up of the subject.",
        { distance: 1.3, targetY: 1.4 },
      ),
      term(
        "medium",
        "Medium shot",
        "Frame roughly from the waist upward.",
        "Medium shot of the subject.",
        { distance: 1.8, targetY: 1.2 },
      ),
      term(
        "cowboy",
        "Cowboy shot",
        "Frame from mid-thigh upward.",
        "Cowboy shot of the subject.",
        { distance: 2.2, targetY: 1.1 },
      ),
      term(
        "full",
        "Full shot",
        "Keep the entire subject in the frame.",
        "Full shot of the subject.",
        { distance: 2.7, targetY: 0.9 },
      ),
      term(
        "wide",
        "Wide shot",
        "Give the subject room in its surroundings.",
        "Wide shot with space around the subject.",
        { distance: 3.8, targetY: 0.9 },
      ),
      term(
        "establishing",
        "Establishing shot",
        "Introduce the setting around the subject.",
        "Establishing shot of the subject within its surroundings.",
        { distance: 5.2, targetY: 0.9 },
      ),
    ],
  },
  {
    id: "angles",
    label: "Angles",
    heading: "Camera angles",
    anchor: "camera-angles",
    color: "--camera-angle",
    glyph: "angle",
    terms: [
      term(
        "eye-level",
        "Eye level",
        "Look straight toward the subject.",
        "Eye-level view of the subject.",
        { elevation: 0 },
      ),
      term(
        "low-angle",
        "Low angle",
        "Look upward from below.",
        "Low angle looking up at the subject.",
        { elevation: -18 },
      ),
      term(
        "high-angle",
        "High angle",
        "Look down from above.",
        "High angle looking down at the subject.",
        { elevation: 35 },
      ),
      term(
        "birds-eye",
        "Bird's eye",
        "Look almost straight down.",
        "Bird's eye view directly above the subject.",
        { elevation: 88 },
      ),
      term(
        "worms-eye",
        "Worm's eye",
        "Look up from near the ground.",
        "Worm's eye view from ground level.",
        { elevation: -40 },
      ),
      term(
        "aerial",
        "Aerial",
        "Look down from a raised, oblique position.",
        "Aerial view above the subject and its surroundings.",
        { elevation: 55 },
      ),
      term(
        "dutch",
        "Dutch angle",
        "Tilt the horizon within the frame.",
        "Dutch angle with a tilted horizon.",
        { elevation: 0, roll: 22 },
      ),
      term(
        "profile",
        "Profile shot",
        "Look at the subject from the side.",
        "Profile shot from the side of the subject.",
        { elevation: 0, azimuth: 90 },
      ),
    ],
  },
  {
    id: "movements",
    label: "Movements",
    heading: "Camera movements",
    anchor: "camera-movements",
    color: "--camera-movement",
    glyph: "motion",
    terms: [
      term(
        "orbit",
        "Orbit",
        "Circle around the subject.",
        "Slow orbit around the subject.",
        { motion: "orbit", amount: 360 },
      ),
      term(
        "arc",
        "Arc shot",
        "Sweep through part of a circle.",
        "Arc shot around the subject.",
        { motion: "arc", amount: 65 },
      ),
      term(
        "dolly-in",
        "Dolly in",
        "Move the camera toward the subject.",
        "Dolly in toward the subject.",
        { motion: "dolly", amount: -0.35 },
      ),
      term(
        "pan",
        "Pan",
        "Turn horizontally from a fixed position.",
        "Pan slowly across the subject.",
        { motion: "pan", amount: 0.8 },
      ),
      term(
        "tilt",
        "Tilt",
        "Turn vertically from a fixed position.",
        "Tilt slowly upward along the subject.",
        { motion: "tilt", amount: 0.7 },
      ),
      term(
        "crane",
        "Crane / boom",
        "Lift the camera while keeping the subject in view.",
        "Crane / boom shot rising above the subject.",
        { motion: "crane", amount: 1.7 },
      ),
      term(
        "trucking",
        "Trucking",
        "Move the camera sideways across the scene.",
        "Trucking shot moving sideways past the subject.",
        { motion: "truck", amount: 1.8 },
      ),
      term(
        "lazy-susan",
        "Lazy Susan",
        "Rotate the subject while the camera stays still.",
        "Lazy Susan rotation of the subject on a turntable.",
        { motion: "subject", amount: 360 },
      ),
    ],
  },
] as const;

export type CameraSection = (typeof cameraSections)[number];
export type CameraSectionId = CameraSection["id"];
export type CameraTermId = CameraSection["terms"][number]["id"];
export type CameraTerm = TermSpec & { id: CameraTermId };
export type CameraSelection = {
  [S in CameraSection as S["id"]]: S["terms"][number]["id"] | null;
};
export type CameraEdits = Partial<Record<CameraTermId, string>>;
export const emptyCamera: CameraSelection = {
  "shot-sizes": null,
  angles: null,
  movements: null,
};
export const defaultCamera: CameraSelection = {
  ...emptyCamera,
  movements: "orbit",
};
export const cameraTerms: readonly CameraTerm[] = cameraSections.flatMap(
  (section) => [...section.terms],
);
export function cameraClauses(
  selection: CameraSelection,
  edits: CameraEdits = {},
) {
  return cameraSections.flatMap((section) => {
    const selected = section.terms.find(
      (item) => item.id === selection[section.id],
    );
    return selected
      ? [
          {
            section,
            term: selected,
            text: edits[selected.id] ?? selected.clause,
          },
        ]
      : [];
  });
}
export function cameraLabel(selection: CameraSelection) {
  return (
    cameraClauses(selection)
      .map(({ term }) => term.label)
      .join(" · ") || "No camera direction"
  );
}
