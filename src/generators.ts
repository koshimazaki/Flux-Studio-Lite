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
export const generators: Record<Generator, { label: string; icon: string }> = {
  video: { label: "FLUX 3 · Text to video", icon: "camera" },
  upscale: { label: "FLUX Video Upscale", icon: "expand" },
};
