import type { Job, Source } from "../shared/types";
import catalogue from "../public/media/gallery.json";
import { parseLibrary } from "../shared/library";

/**
 * The catalogue clip the studio opens on: the first entry of
 * `public/media/gallery.json`.
 *
 * The frontend imports the same shipped file the local adapter reads and the
 * Worker bundles, so the opening screen and the first-run composer describe one
 * run instead of two. `initialComposer` in `src/useComposer.ts` is built from
 * this clip's recorded setup.
 */
export const featuredSource: Source | undefined = parseLibrary(catalogue)[0];

/**
 * Presents a catalogue clip's recorded run as a Job.
 *
 * Restore, prompt reuse and the lightbox already speak Job, so a library clip
 * reaches them through the same paths as one of the visitor's own generations
 * instead of a parallel set of props. The synthesised job is never submitted
 * and never enters the polling list: its id names a catalogue entry, not a row
 * in this browser's session.
 */
export function librarySetupJob(source: Source): Job | undefined {
  if (!source.setup) return undefined;
  const { prompt, costUsd, generatedAt, ...input } = source.setup;
  return {
    ...input,
    id: source.id,
    prompt,
    status: "Ready",
    createdAt: generatedAt,
    updatedAt: generatedAt,
    costEstimateUsd: costUsd,
    costActualUsd: costUsd,
    resultUrl: source.url,
    keyMode: "byo",
  };
}
