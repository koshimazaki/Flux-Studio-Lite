import type { Job } from "./types";

export const MEDIA_UNAVAILABLE_MESSAGE =
  "This saved video was removed to keep storage within its limit.";

export const SAVE_JOB_SQL = `UPDATE jobs SET data=CASE
  WHEN json_extract(data,'$.mediaAvailable')=0 THEN json_set(
    json_remove(?,'$.resultUrl'),
    '$.mediaAvailable',json('false'),
    '$.error',COALESCE(json_extract(data,'$.error'),?)
  ) ELSE ? END,
  polling_url=?, remote_url=? WHERE id=? AND session=? RETURNING data`;

export function applyPersistedMediaState(job: Job, persisted: Job) {
  if (persisted.mediaAvailable !== false) return;
  delete job.resultUrl;
  job.mediaAvailable = false;
  job.error = persisted.error;
}
