import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GenerationControls from "../src/components/GenerationControls";
import { generators } from "../src/generators";
import type { Generator } from "../shared/types";

const render = (generator: Generator) =>
  renderToStaticMarkup(
    <GenerationControls
      generator={generator}
      onGeneratorChange={() => {}}
      duration={5}
      onDurationChange={() => {}}
      aspectRatio="16:9"
      onAspectRatioChange={() => {}}
      resolution="hd"
      onResolutionChange={() => {}}
      cameraEnabled
      onCameraEnabledChange={() => {}}
      draft={false}
      onDraftChange={() => {}}
    />,
  );

describe("the two generators are named in one place", () => {
  // The model menu, the mode badge above the prompt and the composer foot all
  // read `src/generators.ts`. Before that, the badge and the foot spelled the
  // upscale tool differently from the menu they were describing.
  it("shows the shared name for whichever generator is selected", () => {
    expect(render("video")).toContain(generators.video.label);
    expect(render("upscale")).toContain(generators.upscale.label);
  });

  it("uses BFL's own names for the two endpoints", () => {
    // /v1/flux-3-video, whose body mode is "t2v", and
    // /v1/flux-tools/video-upscale-v1, documented as FLUX Video Upscale.
    expect(generators.video.label).toBe("FLUX 3 · Text to video");
    expect(generators.upscale.label).toBe("FLUX Video Upscale");
  });
});
