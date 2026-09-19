import { BflClient, providerUrl } from "../server/bfl";
import { AppError } from "../server/errors";
import {
  composePrompt,
  estimateUpscaleUsd,
  estimateVideoUsd,
} from "../shared/presets";
import {
  isTerminal,
  type GenerateInput,
  type Job,
  type JobStatus,
} from "../shared/types";
import {
  inspectObject,
  ownedJob,
  saveJob,
  saveSource,
  sourceObject,
  type JobRow,
} from "./storage";
import { putMedia } from "./media";

const statuses = new Set<JobStatus>([
  "Pending",
  "Reasoning",
  "Generating",
  "Request Moderated",
  "Content Moderated",
  "Error",
]);
const publicJob = (row: JobRow) => JSON.parse(row.data) as Job;
function duplicate(row: JobRow, input: GenerateInput) {
  if (row.input !== JSON.stringify(input))
    throw new AppError(
      409,
      "That request identifier was already used with different settings.",
    );
  return publicJob(row);
}
export async function submit(
  env: Env,
  input: GenerateInput,
  session: string,
  idempotency: string,
  key: string,
  origin: string,
  bfl = new BflClient(),
) {
  const existing = await env.DB.prepare(
    "SELECT * FROM jobs WHERE session=? AND idempotency=?",
  )
    .bind(session, idempotency)
    .first<JobRow>();
  if (existing) return duplicate(existing, input);
  const source =
    input.generator === "upscale"
      ? await sourceObject(env, input.sourceId!, session)
      : undefined;
  const inspected = source
    ? await inspectObject(env, source.key, true)
    : undefined;
  const estimate = inspected
    ? estimateUpscaleUsd(
        inspected.metadata,
        input.upscaleFactor,
        input.upscaleCreativity,
      )
    : estimateVideoUsd(input.draft, input.duration, input.resolution);
  const credits = await bfl.credits(key);
  if (credits / 100 < estimate)
    throw new AppError(402, "Your BFL balance is below this estimate.");
  const now = new Date().toISOString();
  const job: Job = {
    ...input,
    id: crypto.randomUUID(),
    prompt: composePrompt(input),
    status: "submitting",
    createdAt: now,
    updatedAt: now,
    costEstimateUsd: estimate,
    keyMode: "byo",
  };
  // The unique D1 reservation happens before any paid call, across Worker instances.
  const reservation = await env.DB.prepare(
    "INSERT OR IGNORE INTO jobs (id,session,idempotency,input,data,created_at) VALUES (?,?,?,?,?,?)",
  )
    .bind(
      job.id,
      session,
      idempotency,
      JSON.stringify(input),
      JSON.stringify(job),
      Date.now(),
    )
    .run();
  if (!reservation.meta.changes) {
    const prior = await env.DB.prepare(
      "SELECT * FROM jobs WHERE session=? AND idempotency=?",
    )
      .bind(session, idempotency)
      .first<JobRow>();
    if (!prior)
      throw new AppError(
        503,
        "Could not recover this request. Keep the same request identifier.",
      );
    return duplicate(prior, input);
  }
  const row = await ownedJob(env, job.id, session);
  try {
    let inputVideo: string | undefined;
    if (source) {
      const token = crypto.randomUUID() + crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO shares (token,object_key,expires) VALUES (?,?,?)",
      )
        .bind(token, source.key, Date.now() + 2 * 3600_000)
        .run();
      inputVideo = `${origin}/api/input/${token}`;
    }
    const body = inputVideo
      ? {
          input_video: inputVideo,
          upscale_factor: input.upscaleFactor,
          creativity: input.upscaleCreativity,
          ...(job.prompt ? { prompt: job.prompt } : {}),
          safety_tolerance: 2,
          user: session,
        }
      : {
          mode: "t2v",
          prompt: job.prompt,
          duration: input.duration,
          resolution: input.resolution,
          aspect_ratio: input.aspectRatio,
          generate_audio: false,
          draft: input.draft,
          safety_tolerance: 2,
          user: session,
        };
    const result = await bfl.submit(input.generator, body, key);
    row.polling_url = result.polling_url;
    job.status = "Pending";
    if (
      typeof result.cost === "number" &&
      Number.isFinite(result.cost) &&
      result.cost >= 0
    )
      job.costActualUsd = result.cost / 100;
  } catch (error) {
    job.status = "Error";
    job.error =
      error instanceof AppError
        ? error.message
        : "Submission could not be confirmed. Check BFL usage before trying again.";
  }
  await saveJob(env, row, job);
  return job;
}

export async function poll(
  env: Env,
  id: string,
  session: string,
  key?: string,
  bfl = new BflClient(),
) {
  const row = await ownedJob(env, id, session);
  const job = publicJob(row);
  if (isTerminal(job.status)) return { job };
  if (job.status === "submitting") {
    if (Date.now() - row.created_at > 120_000) {
      job.status = "Error";
      job.error =
        "Submission could not be confirmed. Check BFL usage before trying again.";
      await saveJob(env, row, job);
    }
    return { job };
  }
  if (!key) return { job, needsKey: true };
  const now = Date.now();
  const acquired = await env.DB.prepare(
    "UPDATE jobs SET lease_until=? WHERE id=? AND session=? AND lease_until<?",
  )
    .bind(now + 120_000, id, session, now)
    .run();
  if (!acquired.meta.changes) return { job };
  try {
    delete job.error;
    if (!row.remote_url) {
      const result = await bfl.poll(row.polling_url!, key);
      if (
        typeof result.cost === "number" &&
        Number.isFinite(result.cost) &&
        result.cost >= 0
      )
        job.costActualUsd = result.cost / 100;
      if (
        typeof result.progress === "number" &&
        Number.isFinite(result.progress)
      )
        job.progress = result.progress;
      if (result.status === "Ready" && result.result?.sample) {
        providerUrl(result.result.sample, "media");
        row.remote_url = result.result.sample;
        job.status = "copying";
        await saveJob(env, row, job);
      } else if (statuses.has(result.status as JobStatus)) {
        job.status = result.status as JobStatus;
        if (isTerminal(job.status))
          job.error =
            job.status === "Error"
              ? "BFL could not finish this video."
              : "This request was stopped by BFL moderation.";
      } else if (result.status === "Task not found") {
        job.status = "expired";
        job.error =
          "BFL no longer has this job. Check your usage before starting another.";
      }
    }
    if (row.remote_url) {
      const objectKey = `${session}/${job.id}.mp4`;
      if (!(await env.MEDIA.head(objectKey))) {
        const response = await bfl.download(row.remote_url);
        await putMedia(
          env,
          objectKey,
          response.body!,
          Number(response.headers.get("content-length")),
          250_000_000,
        );
      }
      const { metadata, bytes } = await inspectObject(env, objectKey);
      job.resultUrl = `/api/clips/${job.id}`;
      await saveSource(
        env,
        {
          id: job.id,
          label: job.description.slice(0, 100) || "Upscaled video",
          url: job.resultUrl,
          origin: "generated",
          ...metadata,
        },
        session,
        objectKey,
        bytes,
      );
      job.status = "Ready";
      row.remote_url = null;
    }
  } catch (error) {
    job.error =
      error instanceof AppError
        ? error.message
        : "Connection interrupted. This job will be checked again.";
    if (error instanceof AppError && error.code === "delivery_expired")
      job.status = "expired";
  } finally {
    await saveJob(env, row, job);
    await env.DB.prepare(
      "UPDATE jobs SET lease_until=? WHERE id=? AND session=?",
    )
      .bind(Date.now() + 3000, id, session)
      .run();
  }
  return { job };
}
