import type { Job } from "../shared/types";

/**
 * BFL reports real progress on a polled job. It is optional, and the API has
 * used both a 0–1 fraction and a 0–100 percentage, so accept either and
 * report nothing at all rather than inventing a number: an absent value means
 * the caller should fall back to elapsed time.
 */
export function generationProgress(job: Job): number | undefined {
  const value = job.progress;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    return undefined;
  const fraction = value > 1 ? value / 100 : value;
  // A finished-looking fraction on an unfinished job would read as a stall,
  // so hold just short of complete until the status itself says otherwise.
  return Math.min(fraction, 0.99);
}
