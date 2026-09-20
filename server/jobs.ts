import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalInput } from "../shared/idempotency";
import { expireStaleJob, stopJob } from "../shared/lifecycle";
import {
  composePrompt,
  estimateUpscaleUsd,
  estimateVideoUsd,
} from "../shared/presets";
import {
  isTerminal,
  type GenerateInput,
  type JobStatus,
  type Source,
} from "../shared/types";
import { AppError, requireKey } from "./errors";
import { BflClient, providerUrl } from "./bfl";
import {
  loadSamples,
  probeVideo,
  sampleFile,
  saveDownload,
  validateUpscaleSource,
} from "./media";
import { Store, publicJob, publicSource, type StoredJob } from "./store";

export const BUDGET_USD = 5;
export const SESSION_LIMIT = 3;
const providerStatuses = new Set<JobStatus>([
  "Pending",
  "Reasoning",
  "Generating",
  "Request Moderated",
  "Content Moderated",
  "Error",
]);

function checkDuplicate(existing: StoredJob, input: GenerateInput) {
  // Both backends answer a replay with shared/idempotency.ts, never a local rule.
  if (canonicalInput(existing) !== canonicalInput(input))
    throw new AppError(
      409,
      "That request identifier was already used with different settings.",
    );
  return existing;
}

export class JobService {
  private locks = new Map<string, Promise<StoredJob>>();
  constructor(
    readonly store: Store,
    readonly publicDirectory: string,
    private serverKey?: string,
    private bfl = new BflClient(),
  ) {
    // Fill only fields introduced after the first local jobs were recorded.
    for (const job of store.data.jobs) {
      job.aspectRatio ??= "16:9";
      job.upscaleCreativity ??= 0;
    }
  }
  get hasServerKey() {
    return Boolean(this.serverKey);
  }

  owned(id: string, sessionId: string) {
    const job = this.store.data.jobs.find(
      (item) => item.id === id && item.sessionId === sessionId,
    );
    if (!job) throw new AppError(404, "Job not found.");
    return job;
  }

  async history(sessionId: string) {
    return {
      jobs: this.store.data.jobs
        .filter((job) => job.sessionId === sessionId)
        .slice(-50)
        .reverse()
        .map(publicJob),
      sources: [
        ...(await loadSamples(this.publicDirectory)),
        ...this.store.data.sources
          .filter((source) => source.sessionId === sessionId)
          .map(publicSource),
      ],
    };
  }

  async source(
    id: string,
    sessionId: string,
  ): Promise<{ source: Source; file: string }> {
    const local = this.store.data.sources.find(
      (item) => item.id === id && item.sessionId === sessionId,
    );
    if (local) return { source: publicSource(local), file: local.filePath };
    const sample = (await loadSamples(this.publicDirectory)).find(
      (item) => item.id === id,
    );
    if (!sample)
      throw new AppError(
        404,
        "Choose a video from this session or the library.",
      );
    return {
      source: sample,
      file: await sampleFile(sample, this.publicDirectory),
    };
  }

  async submit(
    input: GenerateInput,
    sessionId: string,
    idempotencyKey: string,
    byoKey?: string,
  ) {
    const existing = this.store.data.jobs.find(
      (job) =>
        job.sessionId === sessionId && job.idempotencyKey === idempotencyKey,
    );
    if (existing) return checkDuplicate(existing, input);
    const key = requireKey(byoKey ?? this.serverKey ?? "");
    const source =
      input.generator === "upscale"
        ? await this.source(input.sourceId!, sessionId)
        : undefined;
    const metadata = source
      ? await validateUpscaleSource(source.file)
      : undefined;
    const estimate = metadata
      ? estimateUpscaleUsd(
          metadata,
          input.upscaleFactor,
          input.upscaleCreativity,
        )
      : estimateVideoUsd(input.draft, input.duration, input.resolution);
    // A duplicate can arrive while an upscale source is being probed.
    const duplicate = this.store.data.jobs.find(
      (job) =>
        job.sessionId === sessionId && job.idempotencyKey === idempotencyKey,
    );
    if (duplicate) return checkDuplicate(duplicate, input);
    // No await between the budget check and insertion: reservations are atomic in this one process.
    const today = new Date().toISOString().slice(0, 10);
    const reservations = this.store.data.jobs.filter(
      (job) => job.keyMode === "server" && job.createdAt.startsWith(today),
    );
    if (
      !byoKey &&
      (reservations.filter((job) => job.sessionId === sessionId).length >=
        SESSION_LIMIT ||
        reservations.reduce(
          (sum, job) =>
            sum + Math.max(job.costActualUsd ?? 0, job.costEstimateUsd),
          0,
        ) +
          estimate >
          BUDGET_USD)
    ) {
      throw new AppError(
        429,
        "The demo budget is used for today. Add your own key or enjoy the library clips.",
        "budget",
      );
    }
    const now = new Date().toISOString();
    const job: StoredJob = {
      ...input,
      id: randomUUID(),
      sessionId,
      idempotencyKey,
      prompt: composePrompt(input),
      status: "submitting",
      createdAt: now,
      updatedAt: now,
      costEstimateUsd: estimate,
      keyMode: byoKey ? "byo" : "server",
    };
    this.store.data.jobs.push(job);
    await this.store.save();
    try {
      const body = source
        ? {
            input_video: (await readFile(source.file)).toString("base64"),
            upscale_factor: input.upscaleFactor,
            creativity: input.upscaleCreativity,
            ...(job.prompt ? { prompt: job.prompt } : {}),
            safety_tolerance: 2,
            user: sessionId,
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
            user: sessionId,
          };
      const response = await this.bfl.submit(input.generator, body, key);
      if (isTerminal(job.status)) return job;
      job.providerId = response.id;
      job.pollingUrl = response.polling_url;
      job.status = "Pending";
      if (typeof response.cost === "number" && Number.isFinite(response.cost))
        job.costActualUsd = response.cost / 100;
    } catch (error) {
      if (isTerminal(job.status)) return job;
      job.status = "Error";
      job.error =
        error instanceof AppError
          ? error.message
          : "The request could not be completed. Check BFL usage before trying again.";
    }
    job.updatedAt = new Date().toISOString();
    await this.store.save();
    return job;
  }

  async poll(id: string, sessionId: string, byoKey?: string) {
    const job = this.owned(id, sessionId);
    if (isTerminal(job.status) || job.status === "submitting") return { job };
    if (job.keyMode === "byo" && !byoKey) return { job, needsKey: true };
    const key = requireKey(job.keyMode === "byo" ? byoKey : this.serverKey);
    const existing = this.locks.get(id);
    if (existing) return { job: await existing };
    if (Date.now() - (job.lastPolledAt ?? 0) < 4_000) return { job };
    const promise = this.pollOnce(job, key).finally(() =>
      this.locks.delete(id),
    );
    this.locks.set(id, promise);
    return { job: await promise };
  }

  async stop(id: string, sessionId: string) {
    const job = this.owned(id, sessionId);
    if (stopJob(job)) {
      delete job.pollingUrl;
      delete job.resultRemoteUrl;
      await this.store.save();
    }
    return job;
  }

  private async pollOnce(job: StoredJob, key: string) {
    job.lastPolledAt = Date.now();
    try {
      if (job.status !== "copying" || !job.resultRemoteUrl) {
        const result = await this.bfl.poll(job.pollingUrl!, key);
        if (isTerminal(job.status)) return job;
        if (typeof result.cost === "number" && Number.isFinite(result.cost))
          job.costActualUsd = result.cost / 100;
        if (
          typeof result.progress === "number" &&
          Number.isFinite(result.progress)
        )
          job.progress = result.progress;
        if (result.status === "Ready" && result.result?.sample) {
          providerUrl(result.result.sample, "media");
          job.resultRemoteUrl = result.result.sample;
          job.status = "copying";
          await this.store.save();
        } else if (providerStatuses.has(result.status as JobStatus)) {
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
      if (job.status === "copying" && job.resultRemoteUrl) {
        const file = path.join(this.store.directory, "media", `${job.id}.mp4`);
        await saveDownload(await this.bfl.download(job.resultRemoteUrl), file);
        const metadata = await probeVideo(file);
        if (isTerminal(job.status)) return job;
        job.resultUrl = `/api/clips/${job.id}`;
        if (!this.store.data.sources.some((source) => source.id === job.id))
          this.store.data.sources.push({
            id: job.id,
            sessionId: job.sessionId,
            filePath: file,
            url: job.resultUrl,
            label: job.description.slice(0, 100) || "Upscaled video",
            origin: "generated",
            ...metadata,
          });
        job.status = "Ready";
        delete job.error;
        delete job.resultRemoteUrl;
      }
    } catch (error) {
      if (isTerminal(job.status)) return job;
      // Poll and copy failures are retryable; never repeat the generation request.
      job.error =
        error instanceof AppError
          ? error.message
          : "Connection interrupted. This job will be checked again.";
      if (error instanceof AppError && error.code === "delivery_expired")
        job.status = "expired";
    }
    job.updatedAt = new Date().toISOString();
    await this.store.save();
    return job;
  }

  /**
   * The local mirror of the Worker sweep: nothing may stay non-terminal
   * forever, whichever backend recorded it. Retention and media deletion stay a
   * cloud concern — the local store is a developer's own work and keeps it.
   */
  async sweep(now = Date.now()) {
    let changed = false;
    for (const job of this.store.data.jobs)
      if (expireStaleJob(job, Date.parse(job.createdAt), now)) changed = true;
    if (changed) await this.store.save();
  }

  async resumeServerJobs() {
    if (!this.serverKey) return;
    const pending = this.store.data.jobs.filter(
      (job) =>
        job.keyMode === "server" &&
        !isTerminal(job.status) &&
        job.status !== "submitting",
    );
    await Promise.allSettled(
      pending.map((job) => this.poll(job.id, job.sessionId)),
    );
  }
}
