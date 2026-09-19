import type { Job, Source } from "../shared/types";
import library from "../public/media/gallery.json";
import { AppError } from "../server/errors";
import { inspectMp4, checkUpscaleLimits } from "../shared/mp4";

export interface JobRow {
  id: string;
  session: string;
  input: string;
  data: string;
  polling_url: string | null;
  remote_url: string | null;
  lease_until: number;
  created_at: number;
}
export interface SourceRow {
  id: string;
  session: string;
  data: string;
  object_key: string;
  bytes: number;
}
export const samples: Source[] = library.map((s) => ({
  ...s,
  origin: "sample",
}));
export async function ownedJob(env: Env, id: string, session: string) {
  const row = await env.DB.prepare(
    "SELECT * FROM jobs WHERE id=? AND session=?",
  )
    .bind(id, session)
    .first<JobRow>();
  if (!row) throw new AppError(404, "Job not found.");
  return row;
}
export async function saveJob(env: Env, row: JobRow, job: Job) {
  job.updatedAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE jobs SET data=?, polling_url=?, remote_url=? WHERE id=? AND session=?",
  )
    .bind(
      JSON.stringify(job),
      row.polling_url,
      row.remote_url,
      row.id,
      row.session,
    )
    .run();
}
export async function sourceObject(env: Env, id: string, session: string) {
  const sample = samples.find((s) => s.id === id);
  if (sample) return { source: sample, key: `library/${id}.mp4` };
  const row = await env.DB.prepare(
    "SELECT * FROM sources WHERE id=? AND session=?",
  )
    .bind(id, session)
    .first<SourceRow>();
  if (!row)
    throw new AppError(404, "Choose a video from this session or the library.");
  return { source: JSON.parse(row.data) as Source, key: row.object_key };
}
export async function inspectObject(env: Env, key: string, upscale = false) {
  const head = await env.MEDIA.head(key);
  if (!head) throw new AppError(404, "Video not found.");
  try {
    const metadata = await inspectMp4(head.size, async (offset, length) => {
      const chunk = await env.MEDIA.get(key, { range: { offset, length } });
      if (!chunk) throw new Error("Missing video");
      return chunk.arrayBuffer();
    });
    return {
      metadata: upscale ? checkUpscaleLimits(metadata, head.size) : metadata,
      bytes: head.size,
    };
  } catch (error) {
    throw new AppError(
      400,
      error instanceof Error ? error.message : "Cannot read this MP4.",
    );
  }
}
export async function saveSource(
  env: Env,
  source: Source,
  session: string,
  key: string,
  bytes: number,
) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO sources (id,session,data,object_key,bytes) VALUES (?,?,?,?,?)",
  )
    .bind(source.id, session, JSON.stringify(source), key, bytes)
    .run();
}
export async function history(env: Env, session: string) {
  const jobs = await env.DB.prepare(
    "SELECT data FROM jobs WHERE session=? ORDER BY created_at DESC LIMIT 50",
  )
    .bind(session)
    .all<{ data: string }>();
  const sources = await env.DB.prepare(
    "SELECT data FROM sources WHERE session=? LIMIT 200",
  )
    .bind(session)
    .all<{ data: string }>();
  return {
    jobs: jobs.results.map((r) => JSON.parse(r.data)),
    sources: [...samples, ...sources.results.map((r) => JSON.parse(r.data))],
  };
}
export async function rateLimit(env: Env, id: string, limit = 8) {
  const now = Date.now();
  const result = await env.DB.prepare(
    `INSERT INTO rate_limits (id,starts,count) VALUES (?,?,1)
    ON CONFLICT(id) DO UPDATE SET count=CASE WHEN starts<? THEN 1 ELSE count+1 END,
    starts=CASE WHEN starts<? THEN excluded.starts ELSE starts END RETURNING count`,
  )
    .bind(id, now, now - 60000, now - 60000)
    .first<{ count: number }>();
  if (!result || result.count > limit)
    throw new AppError(429, "Please wait a moment before trying again.");
}
