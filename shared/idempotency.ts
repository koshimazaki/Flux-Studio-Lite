import { presets } from "./legacy-camera";
import type { GenerateInput } from "./types";

/**
 * One replay rule for both backends.
 *
 * A repeated `Idempotency-Key` must return the original job when the settings
 * match and 409 when they differ. The Worker used to compare the stored JSON
 * string while Express compared a normalised subset of it, so the same replay
 * could pass locally and conflict in production.
 *
 * Fields are read in a fixed order, gaps left by older jobs are filled with the
 * defaults a new request would receive, and absent is treated as undefined.
 */
const FIELDS = [
  "generator",
  "description",
  "presetId",
  "cameraText",
  "camera",
  "cameraEdits",
  "cameraEnabled",
  "duration",
  "resolution",
  "aspectRatio",
  "draft",
  "sourceId",
  "upscalePrompt",
  "upscaleFactor",
  "upscaleCreativity",
] as const satisfies readonly (keyof GenerateInput)[];

export function canonicalInput(input: Partial<GenerateInput>): string {
  const value: Partial<GenerateInput> = { ...input };
  value.aspectRatio ??= "16:9";
  value.upscaleCreativity ??= 0;
  // Jobs recorded before per-term editing stored a preset id and no wording.
  if (!value.camera)
    value.cameraText ??= presets.find((p) => p.id === value.presetId)?.clause;
  return JSON.stringify(FIELDS.map((field) => stable(value[field])));
}

/** Key order inside camera and cameraEdits must not decide whether a replay matches. */
function stable(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, item]) => [key, stable(item)]),
    );
  return value;
}
