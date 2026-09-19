import { validateCamera } from "./validate-camera";
import { presets } from "../shared/presets";
import type {
  AspectRatio,
  GenerateInput,
  VideoResolution,
} from "../shared/types";
import { AppError } from "./errors";

const aspectRatios = new Set<AspectRatio>([
  "21:9",
  "2:1",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
]);
const resolutions = new Set<VideoResolution>(["hd", "fhd", "qhd", "uhd"]);

export function validateInput(value: unknown): GenerateInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AppError(400, "Expected a generation request.");
  const body = value as Record<string, unknown>;
  if (body.generator !== "video" && body.generator !== "upscale")
    throw new AppError(400, "Choose a supported generator.");
  if (typeof body.description !== "string" || body.description.length > 1200)
    throw new AppError(400, "Keep the description under 1,200 characters.");
  if (body.generator === "video" && !body.description.trim())
    throw new AppError(400, "Describe the scene first.");
  if (
    body.cameraText !== undefined &&
    (typeof body.cameraText !== "string" || body.cameraText.length > 600)
  )
    throw new AppError(400, "Keep camera text under 600 characters.");
  const camera =
    body.camera === undefined
      ? undefined
      : validateCamera(body.camera, body.cameraEdits);
  if (!camera && !presets.some((item) => item.id === body.presetId))
    throw new AppError(400, "Choose a supported camera view.");
  if (
    typeof body.cameraEnabled !== "boolean" ||
    typeof body.draft !== "boolean"
  )
    throw new AppError(400, "Invalid camera or draft setting.");
  if (
    typeof body.duration !== "number" ||
    !Number.isInteger(body.duration) ||
    body.duration < 5 ||
    body.duration > 20
  )
    throw new AppError(
      400,
      "Choose a whole number of seconds between 5 and 20.",
    );
  if (
    typeof body.resolution !== "string" ||
    !resolutions.has(body.resolution as VideoResolution)
  )
    throw new AppError(400, "Choose HD, Full HD, QHD, or UHD resolution.");
  const aspectRatio =
    body.aspectRatio === undefined ? "16:9" : body.aspectRatio;
  if (
    typeof aspectRatio !== "string" ||
    !aspectRatios.has(aspectRatio as AspectRatio)
  )
    throw new AppError(400, "Choose a supported aspect ratio.");
  const draft = body.generator === "video" && body.draft;
  if (
    typeof body.upscaleFactor !== "number" ||
    !Number.isFinite(body.upscaleFactor) ||
    body.upscaleFactor < 1.5 ||
    body.upscaleFactor > 3
  )
    throw new AppError(400, "Choose an upscale amount between 1.5× and 3×.");
  const upscaleCreativity =
    body.upscaleCreativity === undefined ? 0 : body.upscaleCreativity;
  if (upscaleCreativity !== 0 && upscaleCreativity !== 1)
    throw new AppError(400, "Choose Precise or Creative upscaling.");
  if (
    body.generator === "upscale" &&
    (typeof body.sourceId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(body.sourceId))
  ) {
    throw new AppError(400, "Choose a video to upscale.");
  }
  return {
    generator: body.generator,
    description: body.description.trim(),
    ...(camera ?? {
      presetId: body.presetId as GenerateInput["presetId"],
      cameraText: body.cameraText as string | undefined,
    }),
    cameraEnabled: body.generator === "video" && body.cameraEnabled,
    duration: body.duration,
    resolution: draft ? "hd" : (body.resolution as VideoResolution),
    aspectRatio: aspectRatio as AspectRatio,
    draft,
    sourceId:
      body.generator === "upscale" ? (body.sourceId as string) : undefined,
    upscaleFactor: body.upscaleFactor,
    upscaleCreativity,
  };
}

export function validateIdempotencyKey(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(value))
    throw new AppError(400, "A unique request identifier is required.");
  return value;
}
