import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JobMedia from "../src/components/JobMedia";
import Clip from "../src/components/Clip";
import type { Job } from "../shared/types";

const finished = {
  id: "job-1",
  status: "Ready",
  resultUrl: "/api/clips/job-1",
  description: "A chair in a cabin",
  generator: "video",
  createdAt: new Date().toISOString(),
} as unknown as Job;

const library = renderToStaticMarkup(
  <Clip url="/media/library-01.mp4" label="Library clip" onOpen={() => {}} />,
);

describe("the hero treats a finished job like a library clip", () => {
  // The two used to diverge: a library clip offered a play button that opened
  // the lightbox, while a freshly generated one fell back to native controls
  // and offered no play button at all.
  it("gives a finished job the same play button", () => {
    const generated = renderToStaticMarkup(
      <JobMedia job={finished} onOpen={() => {}} />,
    );
    expect(generated).toContain('class="clip-play"');
    expect(library).toContain('class="clip-play"');
  });

  it("offers no native controls in either, so play opens the lightbox", () => {
    const generated = renderToStaticMarkup(
      <JobMedia job={finished} onOpen={() => {}} />,
    );
    expect(generated).not.toContain("controls");
    expect(library).not.toContain("controls");
  });

  it("still waits on the first frame, not just metadata, so the reveal ends", () => {
    const generated = renderToStaticMarkup(
      <JobMedia job={finished} onOpen={() => {}} />,
    );
    expect(generated).toContain('preload="auto"');
  });

  it("shows no player while the job is still running", () => {
    const running = renderToStaticMarkup(
      <JobMedia
        job={{ ...finished, status: "Generating" }}
        onOpen={() => {}}
      />,
    );
    expect(running).not.toContain("clip-play");
    expect(running).toContain("Your scene is taking shape");
  });

  it("shows no player when the media is gone", () => {
    const gone = renderToStaticMarkup(
      <JobMedia
        job={{ ...finished, mediaAvailable: false }}
        onOpen={() => {}}
      />,
    );
    expect(gone).not.toContain("clip-play");
    expect(gone).toContain("Video no longer stored");
  });
});
