import express, { type ErrorRequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { BflClient } from "./bfl";
import { AppError, requireKey } from "./errors";
import { BUDGET_USD, JobService, SESSION_LIMIT } from "./jobs";
import { MAX_INPUT_BYTES, validateUpscaleSource } from "./media";
import {
  RATE_LIMITS,
  RATE_LIMIT_MESSAGE,
  RATE_WINDOW_MS,
  type RateBucket,
} from "../shared/limits";
import { publicJob, publicSource, Store } from "./store";
import { validateIdempotencyKey, validateInput } from "./validation";

export interface AppOptions {
  directory: string;
  publicDirectory: string;
  serverKey?: string;
  bfl?: BflClient;
}

export async function createApp(options: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  const store = new Store(options.directory);
  await store.load();
  const bfl = options.bfl ?? new BflClient();
  const service = new JobService(
    store,
    options.publicDirectory,
    options.serverKey,
    bfl,
  );
  /**
   * The local mirror of the Worker's D1 limiter: same buckets, same window,
   * one in-memory map instead of a shared table. Every API route has a ceiling
   * so a runaway client cannot loop a route for free on either backend.
   */
  const rateWindows = new Map<string, { starts: number; count: number }>();
  function limit(bucket: RateBucket, id: string) {
    const now = Date.now();
    const key = `${bucket}:${id}`;
    const open = rateWindows.get(key);
    const window =
      open && now - open.starts < RATE_WINDOW_MS
        ? open
        : { starts: now, count: 0 };
    window.count++;
    rateWindows.set(key, window);
    if (rateWindows.size > 1000)
      for (const [existing, value] of rateWindows)
        if (now - value.starts > RATE_WINDOW_MS) rateWindows.delete(existing);
    if (window.count > RATE_LIMITS[bucket])
      throw new AppError(429, RATE_LIMIT_MESSAGE);
  }

  app.use("/api", (request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    const host = request.headers.host ?? "";
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))
      return next(
        new AppError(
          403,
          "This local prototype accepts loopback requests only.",
        ),
      );
    const origin = request.headers.origin;
    if (origin && origin !== `http://${host}`)
      return next(new AppError(403, "Use the local app to make this request."));
    const cookie = request.headers.cookie
      ?.split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("camera_session="))
      ?.slice(15);
    const sessionId =
      cookie && /^[0-9a-f-]{36}$/.test(cookie) ? cookie : randomUUID();
    if (sessionId !== cookie)
      response.cookie("camera_session", sessionId, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 30 * 86400_000,
        path: "/",
      });
    response.locals.sessionId = sessionId;
    // Paid writes are counted once here; each read route counts its own bucket.
    if (request.method === "POST")
      try {
        limit("submit", sessionId);
      } catch (error) {
        return next(error);
      }
    next();
  });

  app.get("/api/health", (_request, response) =>
    response.json({
      ok: true,
      hasServerKey: service.hasServerKey,
      budgetUsd: BUDGET_USD,
      sessionLimit: SESSION_LIMIT,
    }),
  );
  app.get("/api/credits", async (request, response) => {
    limit("credits", response.locals.sessionId);
    const key = requireKey(request.headers["x-byo-key"] ?? options.serverKey);
    const credits = await bfl.credits(key);
    response.json({ credits, checkedAt: new Date().toISOString() });
  });
  app.get("/api/history", async (_request, response) => {
    limit("history", response.locals.sessionId);
    response.json(await service.history(response.locals.sessionId));
  });
  app.post(
    "/api/jobs",
    express.json({ limit: "16kb" }),
    async (request, response) => {
      const input = validateInput(request.body);
      const idempotencyKey = validateIdempotencyKey(
        request.headers["idempotency-key"],
      );
      const byoKey =
        request.headers["x-byo-key"] === undefined
          ? undefined
          : requireKey(request.headers["x-byo-key"]);
      const job = await service.submit(
        input,
        response.locals.sessionId,
        idempotencyKey,
        byoKey,
      );
      response
        .status(job.status === "Error" ? 200 : 202)
        .json({ job: publicJob(job) });
    },
  );
  app.post("/api/jobs/:id/stop", async (request, response) => {
    response.json({
      job: publicJob(
        await service.stop(request.params.id, response.locals.sessionId),
      ),
    });
  });
  app.get("/api/jobs/:id", async (request, response) => {
    limit("poll", response.locals.sessionId);
    const byoKey =
      request.headers["x-byo-key"] === undefined
        ? undefined
        : requireKey(request.headers["x-byo-key"]);
    const result = await service.poll(
      request.params.id,
      response.locals.sessionId,
      byoKey,
    );
    response.json({
      job: publicJob(result.job),
      ...(result.needsKey ? { needsKey: true } : {}),
    });
  });
  app.post(
    "/api/uploads",
    express.raw({ type: "video/mp4", limit: MAX_INPUT_BYTES }),
    async (request, response) => {
      if (!Buffer.isBuffer(request.body) || request.body.length === 0)
        throw new AppError(400, "Upload an MP4 video.");
      const id = randomUUID();
      const filePath = path.join(store.directory, "media", `${id}.mp4`);
      await writeFile(filePath, request.body, { mode: 0o600 });
      try {
        // Read media metadata on the server; browser-supplied dimensions cannot set the price.
        const metadata = await validateUpscaleSource(filePath);
        const source = {
          id,
          filePath,
          sessionId: response.locals.sessionId as string,
          url: `/api/clips/${id}`,
          label:
            typeof request.query.filename === "string"
              ? path
                  .basename(request.query.filename)
                  .replace(/[\x00-\x1f\x7f]/g, " ")
                  .trim()
                  .slice(0, 100)
              : "Uploaded clip",
          origin: "upload" as const,
          ...metadata,
        };
        store.data.sources.push(source);
        await store.save();
        response.status(201).json({ source: publicSource(source) });
      } catch (error) {
        await unlink(filePath).catch(() => {});
        throw error;
      }
    },
  );
  app.get("/api/clips/:id", async (request, response) => {
    limit("media", response.locals.sessionId);
    const source = store.data.sources.find(
      (item) =>
        item.id === request.params.id &&
        item.sessionId === response.locals.sessionId,
    );
    if (!source) throw new AppError(404, "Video not found.");
    response.setHeader("Cache-Control", "private, max-age=3600");
    response.setHeader("Content-Type", "video/mp4");
    // The authenticated source lookup supplies the path; .local is intentionally hidden.
    // Express otherwise rejects its dot-directory before applying byte-range handling.
    response.sendFile(source.filePath, {
      acceptRanges: true,
      dotfiles: "allow",
    });
  });
  app.use("/api", (_request, _response, next) =>
    next(new AppError(404, "API route not found.")),
  );
  const errors: ErrorRequestHandler = (error, _request, response, next) => {
    if (response.headersSent) return next(error);
    if (error instanceof AppError)
      return void response
        .status(error.status)
        .json({ error: error.message, code: error.code });
    if (error?.type === "entity.too.large")
      return void response
        .status(413)
        .json({ error: "The upload is too large." });
    if (error instanceof SyntaxError)
      return void response
        .status(400)
        .json({ error: "The request was not valid JSON." });
    // Do not expose provider bodies, file paths, request headers or API keys.
    response
      .status(500)
      .json({ error: "The local server could not complete this request." });
  };
  app.use(errors);
  return { app, service, store };
}
