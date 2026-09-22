import type { Generator } from "../shared/types";

/**
 * The two generators, named once.
 *
 * The model menu, the mode badge above the prompt and the composer foot all
 * read from here, so their wording cannot drift apart. The names follow BFL's
 * own: `FLUX 3` for the `/v1/flux-3-video` endpoint, whose body mode is
 * `"t2v"`, and `FLUX Video Upscale` for `/v1/flux-tools/video-upscale-v1`,
 * which BFL documents under that name. The icon is an `Icon` name so each
 * caller can size it for its own row.
 */
export const generators: Record<
  Generator,
  { model: string; label: string; icon: string }
> = {
  video: {
    model: "FLUX 3",
    label: "FLUX 3 · Text to video",
    icon: "camera",
  },
  upscale: {
    model: "FLUX Video Upscale",
    label: "FLUX Video Upscale",
    icon: "expand",
  },
};

/**
 * The composer foot's line for whichever generator is selected: the same name
 * the menu and the badge show, plus what the run will and will not carry. The
 * foot used to spell the video model itself, so the one place that named the
 * generators did not in fact name all of them.
 */
export function generatorFoot(
  generator: Generator,
  upscaleMode: "Precise" | "Creative",
): string {
  return generator === "video"
    ? `${generators.video.model} · no audio`
    : `${generators.upscale.label} · ${upscaleMode.toLowerCase()}`;
}
