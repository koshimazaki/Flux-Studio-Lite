import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  Miniflare,
  convertV4MiniflareOptions,
  Response as MFResponse,
} from "miniflare";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";

let mf: Miniflare;
let submissions = 0;
let failSubmit = false;
let lastSubmission: Record<string, unknown> = {};
let cookie = "";
const input = {
  generator: "video",
  description: "A ceramic vessel.",
  presetId: "orbit_l",
  cameraEnabled: true,
  duration: 5,
  resolution: "hd",
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
    headers: { cookie, ...init.headers },
  });
const post = (id: string, body: object = input) =>
  call("/api/jobs", {
    method: "POST",
    headers: {
      "x-byo-key": "test-only-key",
      "idempotency-key": id,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
beforeAll(async () => {
  const bundle = await build({
    entryPoints: ["worker/index.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
  });
  const clip = await readFile("public/media/library-01.mp4");
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
  for (const statement of (await readFile("migrations/0001_studio.sql", "utf8"))
    .split(";")
    .filter((s) => s.trim()))
    await db.prepare(statement).run();
  const bindings = await mf.getBindings<{
    MEDIA: { put: (key: string, body: Uint8Array) => Promise<unknown> };
  }>();
  await bindings.MEDIA.put("library/library-01.mp4", clip);
  cookie = (await call("/api/health")).headers.get("set-cookie")!.split(";")[0];
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});

describe("Cloudflare adapter in workerd with isolated D1/R2 and fake BFL", () => {
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
    const results = await Promise.all([
      post("worker-test-duplicate"),
      post("worker-test-duplicate"),
    ]);
    const first = (await results[0].json()) as { job: { id: string } };
    const second = (await results[1].json()) as { job: { id: string } };
    expect(first.job.id).toBe(second.job.id);
    expect(submissions - before).toBe(1);
    expect(
      (
        await post("worker-test-duplicate", {
          ...input,
          description: "Different",
        })
      ).status,
    ).toBe(409);
    const result = await call(`/api/jobs/${first.job.id}`, {
      headers: { "x-byo-key": "test-only-key" },
    });
    const data = (await result.json()) as {
      job: { status: string; resultUrl: string };
    };
    expect(data.job.status).toBe("Ready");
    const media = await call(data.job.resultUrl, {
      headers: { range: "bytes=0-99" },
    });
    expect(media.status).toBe(206);
    expect((await media.arrayBuffer()).byteLength).toBe(100);
    expect(
      (await mf.dispatchFetch(`https://studio.test${data.job.resultUrl}`))
        .status,
    ).toBe(404);
    const history = await (await call("/api/history")).text();
    expect(history).not.toContain("test-only-key");
    expect(history).not.toContain("polling_url");
    expect(history).not.toContain("delivery.bfl.ai");
  });
  it("inspects the stored MP4 before submitting upscale and grants only a temporary input link", async () => {
    const response = await post("worker-upscale-test", {
      ...input,
      generator: "upscale",
      sourceId: "library-01",
    });
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      job: { costEstimateUsd: 1.36, status: "Pending" },
    });
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
    const bytes = await readFile("public/media/library-01.mp4");
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
});
