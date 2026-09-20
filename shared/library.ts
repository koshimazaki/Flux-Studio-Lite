import { checkUpscaleLimits } from "./mp4";
import type { LibrarySetup, Source } from "./types";

/**
 * The bundled clip catalogue, `public/media/gallery.json`.
 *
 * These clips ship with the app, so their declared metadata is trusted
 * server-side data rather than browser input — it may price an upscale. Every
 * entry is checked once here, and anything malformed or outside the upscale
 * limits is dropped instead of reaching the studio with an invented estimate.
 *
 * `bytes` exists only for that check and is not part of the public `Source`.
 * `setup` travels with the clip so the studio can restore the run that made it;
 * a test checks that every shipped setup still composes its recorded prompt.
 */
export function parseLibrary(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const clip = readClip(entry);
    return clip ? [clip] : [];
  });
}

const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

function readClip(entry: unknown): Source | null {
  if (!entry || typeof entry !== "object") return null;
  const { id, label, url, poster, width, height, duration, bytes, setup } =
    entry as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(id) ||
    typeof url !== "string" ||
    !url.startsWith("/media/") ||
    !positive(width) ||
    !Number.isInteger(width) ||
    !positive(height) ||
    !Number.isInteger(height) ||
    !positive(duration) ||
    !positive(bytes) ||
    !Number.isSafeInteger(bytes)
  )
    return null;
  try {
    // A catalogue clip is offered as an upscale source, so it faces an upload's limits.
    checkUpscaleLimits({ width, height, duration }, bytes);
  } catch {
    return null;
  }
  return {
    id,
    label: String(label ?? id)
      .replace(/[\x00-\x1f\x7f]/g, " ")
      .trim()
      .slice(0, 160),
    url,
    width,
    height,
    duration,
    origin: "sample",
    ...(typeof poster === "string" && poster.startsWith("/media/")
      ? { poster }
      : {}),
    ...(setup && typeof setup === "object" && !Array.isArray(setup)
      ? { setup: setup as LibrarySetup }
      : {}),
  };
}
