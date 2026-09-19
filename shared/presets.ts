import type { GenerateInput, PresetId, Source, VideoResolution } from "./types";

export interface Preset {
  id: PresetId;
  label: string;
  shortLabel: string;
  clause: string;
  wording: "documented" | "variant";
}
export const CAMERA_GUIDE_URL =
  "https://docs.bfl.ai/guides/prompting_video_camera_terms";

export const presets: Preset[] = [
  {
    id: "orbit_l",
    wording: "variant",
    label: "Orbit left",
    shortLabel: "Orbit left",
    clause: "slow orbit around the subject, moving left.",
  },
  {
    id: "orbit_r",
    wording: "variant",
    label: "Orbit right",
    shortLabel: "Orbit right",
    clause: "slow orbit around the subject, moving right.",
  },
  {
    id: "orbit_360",
    wording: "variant",
    label: "Full orbit",
    shortLabel: "Full orbit",
    clause: "slow orbit around the subject, completing a full circle.",
  },
  {
    id: "dolly_in",
    wording: "documented",
    label: "Dolly in",
    shortLabel: "Dolly in",
    clause: "dolly in toward the subject.",
  },
  {
    id: "dolly_out",
    wording: "variant",
    label: "Dolly out",
    shortLabel: "Dolly out",
    clause: "Dolly out from the subject.",
  },
  {
    id: "crane_up",
    wording: "documented",
    label: "Crane up",
    shortLabel: "Crane up",
    clause: "Crane boom shot rising above the subject.",
  },
  {
    id: "low",
    wording: "documented",
    label: "Low angle",
    shortLabel: "Low angle",
    clause: "low angle on the subject.",
  },
  {
    id: "top",
    wording: "documented",
    label: "Top-down",
    shortLabel: "Top-down",
    clause: "Bird's eye top-down view of the subject.",
  },
];

export function composePrompt(
  input: Pick<
    GenerateInput,
    "generator" | "description" | "cameraEnabled" | "presetId" | "cameraText"
  >,
): string {
  const description = input.description.trim();
  if (input.generator === "upscale") return "";
  if (!input.cameraEnabled) return description;
  const preset = presets.find((item) => item.id === input.presetId);
  const cameraText =
    input.cameraText === undefined ? preset?.clause : input.cameraText;
  return [description, cameraText].filter(Boolean).join("\n\n");
}

export function estimateVideoUsd(
  draft = false,
  duration = 5,
  resolution: VideoResolution = "hd",
) {
  const centsPerSecond: Record<VideoResolution, number> = {
    hd: 17,
    fhd: 29,
    qhd: 40,
    uhd: 80,
  };
  return (duration * (draft ? 6 : centsPerSecond[resolution])) / 100;
}

export function estimateUpscaleOutput(
  source: Pick<Source, "width" | "height">,
  factor = 2,
) {
  const sourcePixels = source.width * source.height;
  const requestedPixels = sourcePixels * factor * factor;
  const pixels = Math.min(requestedPixels, 13.75 * 1048576);
  const effectiveFactor =
    pixels < requestedPixels ? Math.sqrt(pixels / sourcePixels) : factor;
  return {
    width: Math.floor(source.width * effectiveFactor),
    height: Math.floor(source.height * effectiveFactor),
    effectiveFactor,
    capped: pixels < requestedPixels,
    megapixels: pixels / 1048576,
  };
}

export function estimateUpscaleUsd(
  source: Pick<Source, "width" | "height" | "duration">,
  factor = 2,
  creativity: 0 | 1 = 0,
): number {
  const { megapixels } = estimateUpscaleOutput(source, factor);
  const rate = creativity === 1 ? 0.1 : 0.07;
  // Reserve a whole cent without promoting floating-point noise to another cent.
  return Math.ceil(megapixels * source.duration * rate * 100 - 1e-9) / 100;
}
