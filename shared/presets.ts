import { cameraClauses } from "./camera";
import { presets } from "./legacy-camera";
export { presets } from "./legacy-camera";
import type { GenerateInput, Source, VideoResolution } from "./types";

export function composePrompt(
  input: Pick<
    GenerateInput,
    | "generator"
    | "description"
    | "cameraEnabled"
    | "presetId"
    | "cameraText"
    | "camera"
    | "cameraEdits"
    | "upscalePrompt"
  >,
): string {
  const description = input.description.trim();
  if (input.generator === "upscale") return input.upscalePrompt?.trim() ?? "";
  if (!input.cameraEnabled) return description;
  if (input.camera)
    return [
      description,
      ...cameraClauses(input.camera, input.cameraEdits).map(({ text }) =>
        text.trim(),
      ),
    ]
      .filter(Boolean)
      .join("\n\n");
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
