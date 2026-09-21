import type { Job, Source } from "../shared/types";

export interface HeroMedia {
  job?: Job;
  source?: Source;
}

/**
 * What the main view shows: the catalogue clip a Recreate just loaded,
 * otherwise the visitor's own selected or newest run, otherwise the first
 * catalogue clip.
 *
 * The three are mutually exclusive on purpose. A catalogue clip is presented
 * through `source` and never as a job: its id names an entry in a shipped file,
 * not a row in this browser's session, so putting it here must not start a poll
 * or a link. Recreate is what moves one here, which is how the run being edited
 * in the composer and the clip above it stay the same run.
 */
export function heroMedia(
  featuredJob: Job | undefined,
  samples: Source[],
  recreatedSourceId: string | null,
): HeroMedia {
  const recreated = recreatedSourceId
    ? samples.find((clip) => clip.id === recreatedSourceId)
    : undefined;
  if (recreated) return { source: recreated };
  return featuredJob ? { job: featuredJob } : { source: samples[0] };
}
