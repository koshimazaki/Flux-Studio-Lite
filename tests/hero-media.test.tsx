import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JobMedia from "../src/components/JobMedia";
import Clip from "../src/components/Clip";
import { heroMedia } from "../src/hero";
import type { Job, Source } from "../shared/types";

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

describe("the main view follows the run the composer holds", () => {
  const clip = (id: string): Source => ({
    id,
    label: id,
    url: `/media/${id}.mp4`,
    width: 960,
    height: 528,
    duration: 5,
    origin: "sample",
  });
  const clips = [clip("library-01"), clip("library-03")];
  const mine = { ...finished, id: "job-mine" } as Job;

  it("opens on the first catalogue clip while the session has nothing of its own", () => {
    expect(heroMedia(undefined, clips, null)).toEqual({ source: clips[0] });
  });

  it("gives a recreated catalogue clip the view over the visitor's own run", () => {
    // The clip Recreate loaded is the one whose prompt is in the composer, so
    // leaving the visitor's newest run here would show a different scene.
    expect(heroMedia(mine, clips, "library-03")).toEqual({ source: clips[1] });
  });

  it("keeps the visitor's own run when they have not recreated anything", () => {
    expect(heroMedia(mine, clips, null)).toEqual({ job: mine });
  });

  it("never presents a catalogue id as a job, even an unknown one", () => {
    // A catalogue id is not a session row: showing it as a job would start a
    // poll and a link for something this browser does not own.
    const gone = heroMedia(mine, clips, "library-09");
    expect(gone).toEqual({ job: mine });
    expect(gone.job?.id).toBe("job-mine");
    expect(heroMedia(undefined, [], "library-01")).toEqual({
      source: undefined,
    });
  });

  it("keeps the catalogue clip out of the job it replaces", () => {
    const hero = heroMedia(mine, clips, "library-03");
    expect(hero.job).toBeUndefined();
  });
});
