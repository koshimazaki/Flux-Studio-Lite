import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { request as httpRequest, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { BflClient, type ProviderSubmission } from "../server/bfl";
import { AppError } from "../server/errors";
import { presets } from "../shared/presets";

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
class FakeBfl extends BflClient {
  creditKeys: string[] = [];
  override async credits(key: string) {
    this.creditKeys.push(key);
    return key === "test-server-key" ? 1250 : 0;
  }
  submissions = 0;
  polls = 0;
  failSubmit = false;
  ready = false;
  media = new Uint8Array();
  requests: {
    generator: "video" | "upscale";
    body: Record<string, unknown>;
  }[] = [];
  override async submit(
    generator: "video" | "upscale",
    body: object,
  ): Promise<ProviderSubmission> {
    this.submissions++;
    this.requests.push({ generator, body: body as Record<string, unknown> });
    if (this.failSubmit)
      throw new AppError(502, "Submission uncertain.", "submission_unknown");
    return {
      id: "provider-1",
      polling_url: "https://api.bfl.ai/v1/get_result?id=provider-1",
      cost: 85,
    };
  }
  override async poll() {
    this.polls++;
    return this.ready
      ? {
          id: "provider-1",
          status: "Ready",
          result: { sample: "https://delivery.bfl.ai/fixture.mp4" },
        }
      : { id: "provider-1", status: "Generating" };
  }
  override async download() {
    return new Response(this.media);
  }
}
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function setup() {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "flux-studio-lite-test-"),
  );
  const directory = path.join(temporary, ".local");
  cleanups.push(() => rm(temporary, { recursive: true, force: true }));
  const bfl = new FakeBfl();
  const created = await createApp({
    directory,
    publicDirectory: directory,
    serverKey: "test-server-key",
    bfl,
  });
  const server = await new Promise<Server>((resolve) => {
    const listener = created.app.listen(0, "127.0.0.1", () =>
      resolve(listener),
    );
  });
  cleanups.push(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test listener");
  const base = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${base}/api/health`);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  const post = (
    id: string,
    body: object = input,
    extra: Record<string, string> = {},
  ) =>
    fetch(`${base}/api/jobs`, {
      method: "POST",
      headers: {
        cookie,
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...extra,
      },
      body: JSON.stringify(body),
    });
  return { ...created, bfl, directory, base, cookie, post };
}

describe("local job API", () => {
  it("checks the effective account key without persisting it or creating paid jobs", async () => {
    const { base, bfl, directory, store } = await setup();
    const server = await fetch(`${base}/api/credits`);
    expect(server.headers.get("cache-control")).toBe("no-store");
    expect(await server.json()).toEqual({
      credits: 1250,
      checkedAt: expect.any(String),
    });
    const byo = await fetch(`${base}/api/credits`, {
      headers: { "x-byo-key": "visitor-balance-key" },
    });
    expect(await byo.json()).toEqual({
      credits: 0,
      checkedAt: expect.any(String),
    });
    const invalid = await fetch(`${base}/api/credits`, {
      headers: { "x-byo-key": "bad" },
    });
    expect(invalid.status).toBe(400);
    expect(bfl.creditKeys).toEqual(["test-server-key", "visitor-balance-key"]);
    expect(bfl.submissions).toBe(0);
    expect(store.data.jobs).toHaveLength(0);
    await store.save();
    expect(
      await readFile(path.join(directory, "jobs.json"), "utf8"),
    ).not.toContain("visitor-balance-key");
  });
  it("persists and forwards a composed camera, with canonical idempotency and session ownership", async () => {
    const { post, bfl, base, cookie, store } = await setup();
    const body = {
      ...input,
      presetId: undefined,
      camera: { "shot-sizes": "close-up", angles: "dutch", movements: "pan" },
      cameraEdits: { pan: "Pan gently.", dutch: "" },
    };
    const response = await post("section-request", body);
    expect(response.status).toBe(202);
    const { job } = await response.json();
    expect(job.camera).toEqual(body.camera);
    expect(job.prompt).toBe(
      "A ceramic vessel.\n\nClose-up of the subject.\n\nPan gently.",
    );
    expect(bfl.requests[0].body.prompt).toBe(job.prompt);
    expect(store.data.jobs[0].cameraEdits).toEqual({
      dutch: "",
      pan: "Pan gently.",
    });
    const repeated = await post("section-request", {
      ...body,
      camera: { movements: "pan", angles: "dutch", "shot-sizes": "close-up" },
      cameraEdits: { dutch: "", pan: "Pan gently." },
    });
    expect(repeated.status).toBe(202);
    expect(bfl.submissions).toBe(1);
    expect(
      (
        await post("section-request", {
          ...body,
          cameraEdits: { pan: "Changed" },
        })
      ).status,
    ).toBe(409);
    expect(
      (await fetch(`${base}/api/jobs/${job.id}`, { headers: { cookie } }))
        .status,
    ).toBe(200);
    expect((await fetch(`${base}/api/jobs/${job.id}`)).status).toBe(404);
  });

  it("deduplicates submits, converts credits, strips private provider fields, and reserves concurrent costs", async () => {
    const { post, bfl, store, base, cookie } = await setup();
    const [first, repeat] = await Promise.all([
      post("same-request"),
      post("same-request"),
    ]);
    const firstJob = (await first.json()).job;
    expect((await repeat.json()).job.id).toBe(firstJob.id);
    expect(bfl.submissions).toBe(1);
    expect(firstJob.costActualUsd).toBe(0.85);
    expect(firstJob.pollingUrl).toBeUndefined();
    expect(firstJob.sessionId).toBeUndefined();
    const results = await Promise.all(
      ["request-two", "request-three", "request-four"].map((id) => post(id)),
    );
    expect(results.filter((result) => result.status === 429)).toHaveLength(1);
    expect(bfl.submissions).toBe(3);
    expect(store.data.jobs).toHaveLength(3);
    const history = await (
      await fetch(`${base}/api/history`, { headers: { cookie } })
    ).text();
    expect(history).not.toContain("test-server-key");
    expect(history).not.toContain("api.bfl.ai");
  });

  it("never retries an uncertain paid submit and never persists BYO credentials", async () => {
    const { post, bfl, directory } = await setup();
    bfl.failSubmit = true;
    const key = "private-visitor-key";
    const first = await (
      await post("byo-request", input, { "x-byo-key": key })
    ).json();
    expect(first.job.status).toBe("Error");
    await post("byo-request", input, { "x-byo-key": key });
    expect(bfl.submissions).toBe(1);
    expect(
      await readFile(path.join(directory, "jobs.json"), "utf8"),
    ).not.toContain(key);
  });

  it("requires session ownership and the BYO key for resume, and serves byte ranges from .local", async () => {
    const { post, base, cookie, bfl, store, directory } = await setup();
    const { job } = await (
      await post("byo-running", input, { "x-byo-key": "private-visitor-key" })
    ).json();
    const noKey = await (
      await fetch(`${base}/api/jobs/${job.id}`, { headers: { cookie } })
    ).json();
    expect(noKey.needsKey).toBe(true);
    expect(bfl.polls).toBe(0);
    expect((await fetch(`${base}/api/jobs/${job.id}`)).status).toBe(404);
    const file = path.join(directory, "media", "range.mp4");
    await writeFile(file, "0123456789");
    store.data.sources.push({
      id: "range",
      filePath: file,
      sessionId: store.data.jobs[0].sessionId,
      label: "Range fixture",
      url: "/api/clips/range",
      width: 1280,
      height: 720,
      duration: 5,
      origin: "upload",
    });
    const response = await fetch(`${base}/api/clips/range`, {
      headers: { cookie, Range: "bytes=2-5" },
    });
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(await response.text()).toBe("2345");
    expect(response.headers.get("content-type")).toBe("video/mp4");
  });

  it("requires MP4 upload MIME and verifies the file rather than trusting the header", async () => {
    const { base, cookie, store } = await setup();
    for (const type of [
      "application/octet-stream",
      "video/quicktime",
      "video/mp4",
    ]) {
      const response = await fetch(`${base}/api/uploads?filename=fake.mp4`, {
        method: "POST",
        headers: { cookie, "Content-Type": type },
        body: "This is not an MP4 file",
      });
      expect(response.status).toBe(400);
    }
    expect(store.data.sources).toHaveLength(0);
  });

  it("rejects cross-origin requests and conflicting idempotency replays", async () => {
    const { post, base } = await setup();
    expect(
      (
        await post("origin-request", input, {
          origin: "https://untrusted.example",
        })
      ).status,
    ).toBe(403);
    await post("replay-request");
    expect(
      (
        await post("replay-request", {
          ...input,
          description: "Different scene",
        })
      ).status,
    ).toBe(409);
    const blockedHost = await new Promise<number | undefined>((resolve) => {
      const request = httpRequest(
        `${base}/api/health`,
        { headers: { host: "untrusted.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      request.end();
    });
    expect(blockedHost).toBe(403);
  });

  it("copies completed media before Ready and exposes a usable source for upscaling", async () => {
    const { post, bfl, base, cookie, store } = await setup();
    bfl.media = new Uint8Array(
      await readFile(path.resolve("tests/fixtures/metadata.mp4")),
    );
    bfl.ready = true;
    const { job } = await (await post("copy-request")).json();
    const result = await (
      await fetch(`${base}/api/jobs/${job.id}`, { headers: { cookie } })
    ).json();
    expect(result.job.status).toBe("Ready");
    expect(result.job.resultUrl).toBe(`/api/clips/${job.id}`);
    expect(result.job.resultRemoteUrl).toBeUndefined();
    expect(store.data.sources[0].width).toBe(960);
    expect(
      (
        await fetch(`${base}${result.job.resultUrl}`, {
          headers: { cookie, Range: "bytes=0-31" },
        })
      ).status,
    ).toBe(206);
    const upscale = await post("upscale-request", {
      ...input,
      generator: "upscale",
      sourceId: job.id,
    } as typeof input);
    const upscaleJob = (await upscale.json()).job;
    expect(upscaleJob.cameraEnabled).toBe(false);
    expect(upscaleJob.prompt).toBe("");
    expect(upscaleJob.costEstimateUsd).toBeGreaterThan(1);
  });

  it("forwards the selected upscale controls and reserves their full cost", async () => {
    const { post, bfl, store, base, cookie } = await setup();
    const uploaded = await fetch(`${base}/api/uploads?filename=library.mp4`, {
      method: "POST",
      headers: { cookie, "Content-Type": "video/mp4" },
      body: new Uint8Array(
        await readFile(path.resolve("tests/fixtures/metadata.mp4")),
      ),
    });
    expect(uploaded.status).toBe(201);
    const { source } = await uploaded.json();
    const request = {
      ...input,
      generator: "upscale",
      sourceId: source.id,
      upscaleFactor: 3,
      upscaleCreativity: 1,
      upscalePrompt: "  Fine ceramic texture.  ",
    };
    const response = await post("creative-upscale", request);
    expect(response.status).toBe(202);
    const { job } = await response.json();
    expect(job.costEstimateUsd).toBe(4.37);
    expect(job).toMatchObject({ upscaleFactor: 3, upscaleCreativity: 1 });
    expect(bfl.requests[0]).toMatchObject({
      generator: "upscale",
      body: { upscale_factor: 3, creativity: 1 },
    });
    expect(bfl.requests[0].body.prompt).toBe("Fine ceramic texture.");
    expect(job.prompt).toBe("Fine ceramic texture.");
    expect(bfl.requests[0].body.input_video).toEqual(expect.any(String));
    const overBudget = await post("precise-upscale", {
      ...request,
      upscaleFactor: 1.5,
      upscaleCreativity: 0,
    });
    expect(overBudget.status).toBe(429);
    expect(bfl.submissions).toBe(1);
    expect(store.data.jobs).toHaveLength(1);
    const changedReplay = await post("creative-upscale", {
      ...request,
      upscaleCreativity: 0,
    });
    expect(changedReplay.status).toBe(409);
  });

  it("forwards edited camera text and real video settings, prices them, and normalises drafts", async () => {
    const { post, bfl, store } = await setup();
    const request = {
      ...input,
      cameraText: "A slow clockwise arc.",
      duration: 7,
      resolution: "qhd",
      aspectRatio: "4:3",
    };
    const first = await post("custom-video", request);
    expect(first.status).toBe(202);
    const { job } = await first.json();
    expect(job.costEstimateUsd).toBe(2.8);
    expect(bfl.requests[0].body).toMatchObject({
      prompt: "A ceramic vessel.\n\nA slow clockwise arc.",
      duration: 7,
      resolution: "qhd",
      aspect_ratio: "4:3",
      draft: false,
    });
    const expensive = await post("expensive-video", {
      ...request,
      duration: 20,
      resolution: "uhd",
    });
    expect(expensive.status).toBe(429);
    expect(bfl.submissions).toBe(1);
    const draft = await post("draft-video", {
      ...request,
      duration: 20,
      resolution: "uhd",
      aspectRatio: "9:16",
      draft: true,
    });
    const draftJob = (await draft.json()).job;
    expect(draft.status).toBe(202);
    expect(draftJob).toMatchObject({
      duration: 20,
      resolution: "hd",
      aspectRatio: "9:16",
      costEstimateUsd: 1.2,
    });
    expect(bfl.requests[1].body).toMatchObject({
      duration: 20,
      resolution: "hd",
      aspect_ratio: "9:16",
      draft: true,
    });
    expect(store.data.jobs).toHaveLength(2);
  });

  it("replays legacy jobs with default controls but rejects changed camera edits or aspect", async () => {
    const { post, bfl, store } = await setup();
    const { job } = await (await post("legacy-video")).json();
    const legacy = store.data.jobs[0] as Partial<
      (typeof store.data.jobs)[number]
    >;
    delete legacy.aspectRatio;
    delete legacy.upscaleCreativity;
    const unchanged = await post("legacy-video");
    expect((await unchanged.json()).job.id).toBe(job.id);
    const explicit = await post("legacy-video", {
      ...input,
      aspectRatio: "16:9",
      cameraText: presets[0].clause,
    });
    expect((await explicit.json()).job.id).toBe(job.id);
    expect(
      (
        await post("legacy-video", {
          ...input,
          cameraText: "An edited camera instruction.",
        })
      ).status,
    ).toBe(409);
    expect(
      (await post("legacy-video", { ...input, cameraText: "" })).status,
    ).toBe(409);
    expect(
      (await post("legacy-video", { ...input, aspectRatio: "1:1" })).status,
    ).toBe(409);
    const blank = await post("blank-video", { ...input, cameraText: "" });
    expect((await blank.json()).job.prompt).toBe("A ceramic vessel.");
    expect((await post("blank-video", input)).status).toBe(409);
    expect(bfl.submissions).toBe(2);
  });
});
