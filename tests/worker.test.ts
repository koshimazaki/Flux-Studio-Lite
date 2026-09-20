import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  Miniflare,
  convertV4MiniflareOptions,
  Response as MFResponse,
} from "miniflare";
import { build } from "esbuild";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  JOB_MAX_AGE_MS,
  RETENTION_MS,
  SESSION_STORAGE_BYTES,
} from "../shared/lifecycle";
import { RATE_LIMITS } from "../shared/limits";
import type { Job, Source } from "../shared/types";
import {
  applyPersistedMediaState,
  MEDIA_UNAVAILABLE_MESSAGE,
  SAVE_JOB_SQL,
} from "../shared/job-storage";

let mf: Miniflare;
let submissions = 0;
let failSubmit = false;
let failPoll = false;
let lastSubmission: Record<string, unknown> = {};
let cookie = "";
let testIp = 0;
beforeEach(() => {
  testIp++;
});
const input = {
  generator: "video" as const,
  description: "A ceramic vessel.",
  presetId: "orbit_l" as const,
  cameraEnabled: true,
  duration: 5,
  resolution: "hd" as const,
  draft: false,
  upscaleFactor: 2,
};
const call = (
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Uint8Array;
  } = {},
) =>
  mf.dispatchFetch(`https://studio.test${path}`, {
    ...init,
    headers: {
      cookie,
      "cf-connecting-ip": `192.0.2.${testIp}`,
      ...init.headers,
    },
  });
/** Writes are rate limited per session, so cases that can stand alone get their own. */
const newSession = () => `camera_session=${randomUUID()}`;
const post = (id: string, body: object = input, session = cookie) =>
  call("/api/jobs", {
    method: "POST",
    headers: {
      cookie: session,
      "x-byo-key": "test-only-key",
      "idempotency-key": id,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
type TestDatabase = Awaited<ReturnType<Miniflare["getD1Database"]>>;
/** miniflare's binding types do not survive this tsconfig; these are their shapes. */
type TestBucket = {
  put: (key: string, body: Uint8Array) => Promise<unknown>;
  head: (key: string) => Promise<unknown | null>;
};
type CronTrigger = {
  scheduled: (options: {
    scheduledTime: Date;
    cron: string;
  }) => Promise<{ outcome: string }>;
};

/** A paid job left non-terminal past the age limit, as a closed tab leaves one. */
async function insertStaleJob(
  db: TestDatabase,
  session: string,
  id: string,
  age = JOB_MAX_AGE_MS + 1000,
  status = "Generating",
) {
  const job = { ...input, id, status, keyMode: "byo" };
  await db
    .prepare(
      "INSERT INTO jobs (id,session,idempotency,input,data,created_at) VALUES (?,?,?,?,?,?)",
    )
    .bind(
      id,
      session,
      `${id}-key`,
      JSON.stringify(input),
      JSON.stringify(job),
      Date.now() - age,
    )
    .run();
}

beforeAll(async () => {
  const bundle = await build({
    entryPoints: ["worker/index.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
  });
  const clip = await readFile("tests/fixtures/metadata.mp4");
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: "2026-09-19",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["DB"],
      r2Buckets: ["MEDIA"],
      serviceBindings: { ASSETS: () => new MFResponse("asset") },
      outboundService: async (request) => {
        const url = new URL(request.url);
        if (url.hostname === "api.bfl.ai" && url.pathname === "/v1/credits")
          return MFResponse.json({ credits: 10000 });
        if (url.hostname === "api.bfl.ai" && request.method === "POST") {
          submissions++;
          lastSubmission = (await request.json()) as Record<string, unknown>;
          if (failSubmit) return new MFResponse("unknown", { status: 503 });
          return MFResponse.json({
            id: "provider-test",
            polling_url: "https://api.bfl.ai/v1/get_result?id=provider-test",
            cost: 85,
          });
        }
        if (
          url.hostname === "api.bfl.ai" &&
          url.pathname === "/v1/get_result" &&
          failPoll
        )
          return MFResponse.json(
            { id: "provider-test", status: "Error", result: null },
            { status: 500 },
          );
        if (url.hostname === "api.bfl.ai" && url.pathname === "/v1/get_result")
          return MFResponse.json({
            id: "provider-test",
            status: "Ready",
            result: { sample: "https://delivery.bfl.ai/clip.mp4" },
          });
        if (url.hostname === "delivery.bfl.ai")
          return new MFResponse(clip, {
            headers: { "content-length": String(clip.length) },
          });
        throw new Error(`Unexpected outbound request: ${url.hostname}`);
      },
    }),
  );
  const db = await mf.getD1Database("DB");
  // Apply every migration in order, as `wrangler d1 migrations apply` would.
  for (const file of (await readdir("migrations")).sort())
    for (const statement of (await readFile(`migrations/${file}`, "utf8"))
      .split(";")
      .filter((s) => s.replace(/--[^\n]*/g, "").trim()))
      await db.prepare(statement).run();
  const bindings = await mf.getBindings<{ MEDIA: TestBucket }>();
  await bindings.MEDIA.put("test/metadata.mp4", clip);
  cookie = (await call("/api/health")).headers.get("set-cookie")!.split(";")[0];
  const session = cookie.slice("camera_session=".length);
  await db
    .prepare(
      "INSERT INTO sources (id,session,data,object_key,bytes) VALUES (?,?,?,?,?)",
    )
    .bind(
      "fixture-source",
      session,
      JSON.stringify({
        id: "fixture-source",
        label: "Metadata fixture",
        url: "/api/clips/fixture-source",
        width: 960,
        height: 528,
        duration: 10.041667,
        origin: "upload",
      }),
      "test/metadata.mp4",
      clip.length,
    )
    .run();
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});

describe("Cloudflare adapter in workerd with isolated D1/R2 and fake BFL", () => {
  it("persists a task-specific provider HTTP 500 as terminal instead of Planning", async () => {
    const session = newSession();
    const { job } = (await (
      await post("terminal-error-fixture", input, session)
    ).json()) as { job: Job };
    failPoll = true;
    try {
      const result = (await (
        await call(`/api/jobs/${job.id}`, {
          headers: { cookie: session, "x-byo-key": "test-only-key" },
        })
      ).json()) as { job: Job };
      expect(result.job.status).toBe("Error");
      const history = (await (
        await call("/api/history", { headers: { cookie: session } })
      ).json()) as { jobs: Job[] };
      expect(history.jobs.find((item) => item.id === job.id)?.status).toBe(
        "Error",
      );
    } finally {
      failPoll = false;
    }
  });
  it("stops without a key and preserves cancellation against late poll writes and replays", async () => {
    const session = newSession();
    const before = submissions;
    const { job } = (await (
      await post("stop-worker-fixture", input, session)
    ).json()) as { job: Job };
    expect(
      (
        await call(`/api/jobs/${job.id}/stop`, {
          method: "POST",
          headers: { cookie: newSession() },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call(`/api/jobs/${job.id}/stop`, {
          method: "POST",
          headers: { cookie: session, origin: "https://other.test" },
        })
      ).status,
    ).toBe(403);
    const stopped = (await (
      await call(`/api/jobs/${job.id}/stop`, {
        method: "POST",
        headers: { cookie: session },
      })
    ).json()) as { job: Job };
    expect(stopped.job.status).toBe("stopped");
    const db = await mf.getD1Database("DB");
    const stale = JSON.stringify({
      ...job,
      status: "Ready",
      resultUrl: `/api/clips/${job.id}`,
    });
    const saved = await db
      .prepare(SAVE_JOB_SQL)
      .bind(
        stale,
        MEDIA_UNAVAILABLE_MESSAGE,
        stale,
        "https://api.bfl.ai/v1/get_result?id=provider-test",
        "https://delivery.bfl.ai/clip.mp4",
        job.id,
        session.slice(15),
      )
      .first<{ data: string }>();
    expect(JSON.parse(saved!.data).status).toBe("stopped");
    const row = await db
      .prepare("SELECT polling_url, remote_url FROM jobs WHERE id=?")
      .bind(job.id)
      .first();
    expect(row).toMatchObject({ polling_url: null, remote_url: null });
    expect(
      (
        (await (
          await call(`/api/jobs/${job.id}`, { headers: { cookie: session } })
        ).json()) as { job: Job }
      ).job.status,
    ).toBe("stopped");
    expect(
      (
        (await (await post("stop-worker-fixture", input, session)).json()) as {
          job: Job;
        }
      ).job.status,
    ).toBe("stopped");
    expect(submissions).toBe(before + 1);
  });
  it("leaves completed clips intact when a stop request arrives late", async () => {
    const session = newSession();
    const { job } = (await (
      await post("stop-complete-fixture", input, session)
    ).json()) as { job: Job };
    await call(`/api/jobs/${job.id}`, {
      headers: { cookie: session, "x-byo-key": "test-only-key" },
    });
    const result = (await (
      await call(`/api/jobs/${job.id}/stop`, {
        method: "POST",
        headers: { cookie: session },
      })
    ).json()) as { job: Job };
    expect(result.job.status).toBe("Ready");
    expect(result.job.resultUrl).toBeTruthy();
  });

  it("requires a key and rejects cross-origin writes", async () => {
    expect(
      (await call("/api/jobs", { method: "POST", body: "{}" })).status,
    ).toBe(400);
    expect(
      (
        await call("/api/jobs", {
          method: "POST",
          headers: { origin: "https://other.test" },
          body: "{}",
        })
      ).status,
    ).toBe(403);
    expect((await call("/api/credits")).status).toBe(400);
  });
  it("checks a supplied key without persisting it", async () => {
    const response = await call("/api/credits", {
      headers: { "x-byo-key": "test-only-key" },
    });
    expect(await response.json()).toMatchObject({ credits: 10000 });
  });
  it("atomically deduplicates concurrent submissions, copies results and isolates media", async () => {
    const before = submissions;
    const session = newSession();
    const results = await Promise.all([
      post("worker-test-duplicate", input, session),
      post("worker-test-duplicate", input, session),
    ]);
    const first = (await results[0].json()) as { job: { id: string } };
    const second = (await results[1].json()) as { job: { id: string } };
    expect(first.job.id).toBe(second.job.id);
    expect(submissions - before).toBe(1);
    expect(
      (
        await post(
          "worker-test-duplicate",
          { ...input, description: "Different" },
          session,
        )
      ).status,
    ).toBe(409);
    const result = await call(`/api/jobs/${first.job.id}`, {
      headers: { cookie: session, "x-byo-key": "test-only-key" },
    });
    const data = (await result.json()) as {
      job: { status: string; resultUrl: string };
    };
    expect(data.job.status).toBe("Ready");
    const media = await call(data.job.resultUrl, {
      headers: { cookie: session, range: "bytes=0-99" },
    });
    expect(media.status).toBe(206);
    expect((await media.arrayBuffer()).byteLength).toBe(100);
    expect(
      (await mf.dispatchFetch(`https://studio.test${data.job.resultUrl}`))
        .status,
    ).toBe(404);
    const history = await (
      await call("/api/history", { headers: { cookie: session } })
    ).text();
    expect(history).not.toContain("test-only-key");
    expect(history).not.toContain("polling_url");
    expect(history).not.toContain("delivery.bfl.ai");
  });
  it("inspects the stored MP4 before submitting upscale and grants only a temporary input link", async () => {
    const response = await post("worker-upscale-test", {
      ...input,
      generator: "upscale",
      sourceId: "fixture-source",
      upscalePrompt: "  Fine linen texture.  ",
    });
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      job: { costEstimateUsd: 1.36, status: "Pending" },
    });
    expect(lastSubmission.prompt).toBe("Fine linen texture.");
    const url = String(lastSubmission.input_video);
    expect(url).toMatch(/^https:\/\/studio.test\/api\/input\//);
    const media = await mf.dispatchFetch(url, {
      headers: { range: "bytes=0-9" },
    });
    expect(media.status).toBe(206);
    const db = await mf.getD1Database("DB");
    await db.prepare("UPDATE shares SET expires=0").run();
    expect((await mf.dispatchFetch(url)).status).toBe(404);
  });
  it("never repeats an uncertain paid submission", async () => {
    failSubmit = true;
    const before = submissions;
    const first = await post("worker-uncertain-test");
    expect(await first.json()).toMatchObject({ job: { status: "Error" } });
    await post("worker-uncertain-test");
    expect(submissions - before).toBe(1);
    failSubmit = false;
  });
  it("checks uploaded bytes rather than browser-supplied metadata", async () => {
    const bytes = await readFile("tests/fixtures/metadata.mp4");
    const response = await call(
      "/api/uploads?filename=test.mp4&width=1&height=1&duration=1",
      {
        method: "POST",
        headers: {
          "x-byo-key": "test-only-key",
          "content-type": "video/mp4",
          "content-length": String(bytes.length),
        },
        body: bytes,
      },
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      source: { width: 960, height: 528, origin: "upload" },
    });
  });
  it("gives a first-time visitor the bundled library rather than an empty studio", async () => {
    // No cookie: exactly what a stranger opening the URL cold receives.
    const response = await mf.dispatchFetch("https://studio.test/api/history");
    const data = (await response.json()) as { jobs: Job[]; sources: Source[] };
    expect(data.jobs).toEqual([]);
    expect(data.sources.map((source) => source.id)).toEqual([
      "library-01",
      "library-02",
      "library-03",
      "library-04",
    ]);
    expect(
      data.sources.every(
        (source) => source.origin === "sample" && source.poster,
      ),
    ).toBe(true);
    // `bytes` exists only to limit-check the catalogue; it is never published.
    expect(JSON.stringify(data.sources)).not.toContain("bytes");
    // Library clips are served as static assets. The API media route stays
    // private, so a catalogue id is not a way into someone else's storage.
    expect((await call("/api/clips/library-01")).status).toBe(404);
  });
  it("upscales a bundled library clip without minting a capability link", async () => {
    const response = await post(
      "worker-library-upscale",
      { ...input, generator: "upscale", sourceId: "library-01" },
      newSession(),
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      job: { costEstimateUsd: 1.36, status: "Pending" },
    });
    // A public asset is lent to BFL directly: no private token to leak or expire.
    expect(lastSubmission.input_video).toBe(
      "https://studio.test/media/library-01.mp4",
    );
    const db = await mf.getD1Database("DB");
    expect(
      await db
        .prepare(
          "SELECT COUNT(*) AS n FROM shares WHERE object_key LIKE 'library/%'",
        )
        .first<{ n: number }>(),
    ).toMatchObject({ n: 0 });
  });
  it("matches replays by canonical settings rather than stored JSON text", async () => {
    const session = newSession();
    const before = submissions;
    const settings = { ...input, cameraText: "A slow clockwise arc." };
    expect((await post("canonical-replay", settings, session)).status).toBe(
      202,
    );
    // Same settings in a different key order are still the original request.
    const reordered = Object.fromEntries(Object.entries(settings).reverse());
    expect((await post("canonical-replay", reordered, session)).status).toBe(
      202,
    );
    // A field the original carried cannot silently vanish from a replay: the
    // default wording it falls back to is not what was submitted.
    const { cameraText: _dropped, ...without } = settings;
    expect((await post("canonical-replay", without, session)).status).toBe(409);
    expect(submissions - before).toBe(1);
  });
  it("ages out a job no browser came back for", async () => {
    const db = await mf.getD1Database("DB");
    const session = cookie.slice("camera_session=".length);
    await insertStaleJob(db, session, "read-stale");
    const response = await call("/api/jobs/read-stale", {
      headers: { "x-byo-key": "test-only-key" },
    });
    const { job } = (await response.json()) as { job: Job };
    // A returning tab reaches the same verdict the background sweep would.
    expect(job.status).toBe("expired");
    expect(job.error).toContain("30-minute");
  });
  it("sweeps abandoned jobs and dead rows with no visitor present", async () => {
    const db = await mf.getD1Database("DB");
    const session = cookie.slice("camera_session=".length);
    await insertStaleJob(db, session, "swept-job");
    // Past retention, and interrupted after its copy but before its source row.
    await insertStaleJob(
      db,
      session,
      "retired-job",
      RETENTION_MS + 1000,
      "copying",
    );
    const media = (await mf.getBindings<{ MEDIA: TestBucket }>()).MEDIA;
    await media.put(`${session}/retired-job.mp4`, new Uint8Array([0, 1, 2]));
    await db.batch([
      db.prepare(
        "INSERT INTO shares (token,object_key,expires) VALUES ('dead-token','x/y.mp4',1)",
      ),
      db.prepare(
        "INSERT INTO rate_limits (id,starts,count) VALUES ('closed:window',1,5)",
      ),
      // Release any claim an earlier request already took for this interval.
      db.prepare("DELETE FROM rate_limits WHERE id='sweep'"),
    ]);
    const worker = (await mf.getWorker()) as unknown as CronTrigger;
    expect(
      await worker.scheduled({
        scheduledTime: new Date(),
        cron: "*/5 * * * *",
      }),
    ).toMatchObject({ outcome: "ok" });
    const swept = await db
      .prepare("SELECT data FROM jobs WHERE id='swept-job'")
      .first<{ data: string }>();
    expect((JSON.parse(swept!.data) as Job).status).toBe("expired");
    const counts = async (sql: string) =>
      (await db.prepare(sql).first<{ n: number }>())!.n;
    expect(
      await counts("SELECT COUNT(*) AS n FROM shares WHERE token='dead-token'"),
    ).toBe(0);
    expect(
      await counts(
        "SELECT COUNT(*) AS n FROM rate_limits WHERE id='closed:window'",
      ),
    ).toBe(0);
    // The claim row is a schedule, not a counter, so cleanup must spare it.
    expect(
      await counts("SELECT COUNT(*) AS n FROM rate_limits WHERE id='sweep'"),
    ).toBe(1);
    // Retention removes the record and the object nothing else points at.
    expect(
      await counts("SELECT COUNT(*) AS n FROM jobs WHERE id='retired-job'"),
    ).toBe(0);
    expect(await media.head(`${session}/retired-job.mp4`)).toBe(null);
    // Its count survives the row: the rollup runs before anything is deleted.
    const retiredDay = new Date(Date.now() - RETENTION_MS - 1000)
      .toISOString()
      .slice(0, 10);
    const frozen = await db
      .prepare("SELECT generations FROM daily_stats WHERE day=?")
      .bind(retiredDay)
      .first<{ generations: number }>();
    expect(frozen?.generations).toBeGreaterThanOrEqual(1);
    // A second pass over a day with no detail left must not lower it.
    await db.prepare("DELETE FROM rate_limits WHERE id='sweep'").run();
    await worker.scheduled({ scheduledTime: new Date(), cron: "*/5 * * * *" });
    expect(
      (
        await db
          .prepare("SELECT generations FROM daily_stats WHERE day=?")
          .bind(retiredDay)
          .first<{ generations: number }>()
      )?.generations,
    ).toBe(frozen?.generations);
    // Counts only: the rollup stores nothing about what was generated.
    const columns = await db.prepare("SELECT * FROM daily_stats LIMIT 1").all();
    expect(Object.keys(columns.results[0] ?? {})).toEqual([
      "day",
      "generations",
      "sessions",
      "ready",
      "failed",
      "drafts",
      "upscales",
      "spend_usd",
    ]);
  });
  it("evicts a visitor's oldest clips once they pass the storage ceiling", async () => {
    const db = await mf.getD1Database("DB");
    const media = (await mf.getBindings<{ MEDIA: TestBucket }>()).MEDIA;
    const session = randomUUID();
    // Three stored clips that already fill the ceiling, oldest first.
    const clips = ["oldest", "middle", "newest"];
    for (const [index, id] of clips.entries()) {
      await media.put(`${session}/${id}.mp4`, new Uint8Array([index]));
      await db.batch([
        db
          .prepare(
            "INSERT INTO sources (id,session,data,object_key,bytes,created_at) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            id,
            session,
            JSON.stringify({
              id,
              url: `/api/clips/${id}`,
              origin: "generated",
            }),
            `${session}/${id}.mp4`,
            SESSION_STORAGE_BYTES * 0.4,
            Date.now() - (clips.length - index) * 1000,
          ),
        // Each generated clip has a job row sharing its id.
        db
          .prepare(
            "INSERT INTO jobs (id,session,idempotency,input,data,created_at) VALUES (?,?,?,?,?,?)",
          )
          .bind(id, session, `${id}-key`, "{}", "{}", Date.now()),
      ]);
    }
    // Uploading one more grows storage, which is what enforces the ceiling.
    const bytes = await readFile("tests/fixtures/metadata.mp4");
    const cookie = `camera_session=${session}`;
    const upload = await call("/api/uploads?filename=quota.mp4", {
      method: "POST",
      headers: {
        cookie,
        "x-byo-key": "test-only-key",
        "content-type": "video/mp4",
        "content-length": String(bytes.length),
      },
      body: bytes,
    });
    expect(upload.status).toBe(201);
    const remaining = await db
      .prepare("SELECT id FROM sources WHERE session=? ORDER BY created_at")
      .bind(session)
      .all<{ id: string }>();
    // The oldest went; the newest and the arrival stayed.
    expect(remaining.results.map((row: { id: string }) => row.id)).toEqual([
      "middle",
      "newest",
      expect.any(String),
    ]);
    const arrival = remaining.results.at(-1)!.id;
    expect(await media.head(`${session}/oldest.mp4`)).toBe(null);
    // The run and idempotency reservation remain for replay safety and stats,
    // while its public record says the media is no longer available.
    const evictedJob = await db
      .prepare("SELECT data FROM jobs WHERE id='oldest'")
      .first<{ data: string }>();
    expect(evictedJob).not.toBeNull();
    expect(JSON.parse(evictedJob!.data)).toMatchObject({
      mediaAvailable: false,
    });
    const stored = async () =>
      (await db
        .prepare(
          "SELECT COALESCE(SUM(bytes),0) AS bytes FROM sources WHERE session=?",
        )
        .bind(session)
        .first<{ bytes: number }>())!.bytes;
    expect(await stored()).toBeLessThanOrEqual(SESSION_STORAGE_BYTES);

    // A clip larger than the whole ceiling still cannot cost a visitor the one
    // that just arrived: eviction always leaves the newest in place.
    await db
      .prepare("UPDATE sources SET bytes=? WHERE id=?")
      .bind(SESSION_STORAGE_BYTES * 2, "middle")
      .run();
    const second = await call("/api/uploads?filename=quota-again.mp4", {
      method: "POST",
      headers: {
        cookie,
        "x-byo-key": "test-only-key",
        "content-type": "video/mp4",
        "content-length": String(bytes.length),
      },
      body: bytes,
    });
    expect(second.status).toBe(201);
    const after = await db
      .prepare("SELECT id FROM sources WHERE session=? ORDER BY created_at")
      .bind(session)
      .all<{ id: string }>();
    const kept = after.results.map((row: { id: string }) => row.id);
    expect(kept).not.toContain("middle");
    expect(kept).toContain(arrival);
    expect(kept.at(-1)).toBe(
      ((await second.json()) as { source: { id: string } }).source.id,
    );
    expect(await stored()).toBeLessThanOrEqual(SESSION_STORAGE_BYTES);
  });

  it("keeps an evicted generation deduplicated and counted after later same-day work", async () => {
    const db = await mf.getD1Database("DB");
    const media = (await mf.getBindings<{ MEDIA: TestBucket }>()).MEDIA;
    const sessionCookie = newSession();
    const session = sessionCookie.slice("camera_session=".length);
    const key = `eviction-replay-${randomUUID()}`;
    const before = submissions;
    const submitted = await post(key, input, sessionCookie);
    const original = (await submitted.json()) as { job: Job };
    await call(`/api/jobs/${original.job.id}`, {
      headers: {
        cookie: sessionCookie,
        "x-byo-key": "test-only-key",
      },
    });
    await db
      .prepare("UPDATE sources SET bytes=? WHERE id=?")
      .bind(SESSION_STORAGE_BYTES, original.job.id)
      .run();

    const bytes = await readFile("tests/fixtures/metadata.mp4");
    expect(
      (
        await call("/api/uploads?filename=quota-replay.mp4", {
          method: "POST",
          headers: {
            cookie: sessionCookie,
            "x-byo-key": "test-only-key",
            "content-type": "video/mp4",
            "content-length": String(bytes.length),
          },
          body: bytes,
        })
      ).status,
    ).toBe(201);
    expect(await media.head(`${session}/${original.job.id}.mp4`)).toBe(null);

    const replay = (await (await post(key, input, sessionCookie)).json()) as {
      job: Job;
    };
    expect(replay.job.id).toBe(original.job.id);
    expect(replay.job).toMatchObject({
      status: "Ready",
      mediaAvailable: false,
    });
    expect(replay.job.resultUrl).toBeUndefined();
    expect(submissions - before).toBe(1);

    const later = (await (
      await post(`later-${randomUUID()}`, input, sessionCookie)
    ).json()) as { job: Job };
    await call(`/api/jobs/${later.job.id}`, {
      headers: {
        cookie: sessionCookie,
        "x-byo-key": "test-only-key",
      },
    });
    const day = new Date().toISOString().slice(0, 10);
    const expected = await db
      .prepare(
        `SELECT COUNT(*) AS generations,
        SUM(json_extract(data,'$.status')='Ready') AS ready,
        ROUND(SUM(COALESCE(json_extract(data,'$.costActualUsd'),json_extract(data,'$.costEstimateUsd'),0)),4) AS spend_usd
        FROM jobs WHERE date(created_at/1000,'unixepoch')=?`,
      )
      .bind(day)
      .first<{ generations: number; ready: number; spend_usd: number }>();
    await db.prepare("DELETE FROM rate_limits WHERE id='sweep'").run();
    const worker = (await mf.getWorker()) as unknown as CronTrigger;
    await worker.scheduled({ scheduledTime: new Date(), cron: "*/5 * * * *" });
    expect(
      await db
        .prepare(
          "SELECT generations,ready,spend_usd FROM daily_stats WHERE day=?",
        )
        .bind(day)
        .first(),
    ).toEqual(expected);
  });

  it("keeps an eviction marker when a stale Ready save finishes afterward", async () => {
    const bindings = await mf.getBindings<{ DB: TestDatabase }>();
    const id = randomUUID();
    const session = randomUUID();
    const stored = {
      ...input,
      aspectRatio: "16:9" as const,
      upscaleCreativity: 0 as const,
      id,
      prompt: "A ceramic vessel.",
      status: "copying",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      costEstimateUsd: 0.85,
      costActualUsd: 0.85,
      keyMode: "byo",
      mediaAvailable: false,
      error: MEDIA_UNAVAILABLE_MESSAGE,
    } satisfies Job;
    await bindings.DB.prepare(
      "INSERT INTO jobs (id,session,idempotency,input,data,created_at) VALUES (?,?,?,?,?,?)",
    )
      .bind(
        id,
        session,
        randomUUID(),
        JSON.stringify(input),
        JSON.stringify(stored),
        Date.now(),
      )
      .run();
    const stale = {
      ...stored,
      status: "Ready" as const,
      resultUrl: `/api/clips/${id}`,
      mediaAvailable: undefined,
      error: undefined,
    };
    const incoming = JSON.stringify(stale);
    const saved = await bindings.DB.prepare(SAVE_JOB_SQL)
      .bind(
        incoming,
        MEDIA_UNAVAILABLE_MESSAGE,
        incoming,
        null,
        null,
        id,
        session,
      )
      .first<{ data: string }>();
    applyPersistedMediaState(stale, JSON.parse(saved!.data) as Job);
    expect(stale).toMatchObject({
      status: "Ready",
      mediaAvailable: false,
      error: MEDIA_UNAVAILABLE_MESSAGE,
    });
    expect(stale.resultUrl).toBeUndefined();
    const persisted = await bindings.DB.prepare(
      "SELECT data FROM jobs WHERE id=?",
    )
      .bind(id)
      .first<{ data: string }>();
    expect(JSON.parse(persisted!.data)).toMatchObject(stale);
  });
  it("gives read routes a ceiling, not just the paid writes", async () => {
    // Its own session, so the limit under test cannot leak into other cases.
    const isolated = `camera_session=${randomUUID()}`;
    const seen = new Set<number>();
    for (let attempt = 0; attempt <= RATE_LIMITS.poll; attempt++)
      seen.add(
        (await call("/api/jobs/no-such-job", { headers: { cookie: isolated } }))
          .status,
      );
    // Every allowed request reached the handler; the last one never did.
    expect(seen).toEqual(new Set([404, 429]));
  });
});
