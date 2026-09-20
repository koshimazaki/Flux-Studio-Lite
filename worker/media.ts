import { AppError } from "../server/errors";
import { MAX_INPUT_BYTES } from "../shared/mp4";
import { inspectObject, saveSource } from "./storage";
import type { Source } from "../shared/types";

export async function upload(request: Request, env: Env, session: string) {
  const size = Number(request.headers.get("content-length"));
  if (
    request.headers.get("content-type")?.split(";")[0] !== "video/mp4" ||
    !request.body ||
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > MAX_INPUT_BYTES
  )
    throw new AppError(400, "Upload an MP4 under 50 MB.");
  const id = crypto.randomUUID();
  const key = `${session}/${id}.mp4`;
  try {
    await putMedia(env, key, request.body, size, MAX_INPUT_BYTES);
    const { metadata, bytes } = await inspectObject(env, key, true);
    const label = (
      new URL(request.url).searchParams.get("filename") || "Uploaded clip"
    )
      .split(/[\\/]/)
      .at(-1)!
      .replace(/[\x00-\x1f\x7f]/g, " ")
      .trim()
      .slice(0, 100);
    const source: Source = {
      id,
      label,
      url: `/api/clips/${id}`,
      origin: "upload",
      ...metadata,
    };
    await saveSource(env, source, session, key, bytes);
    return source;
  } catch (error) {
    await env.MEDIA.delete(key);
    throw error;
  }
}

/** R2 requires a known stream length; reject unbounded bodies rather than buffer video in Worker memory. */
export async function putMedia(
  env: Env,
  key: string,
  body: ReadableStream<Uint8Array>,
  size: number,
  max: number,
) {
  if (!Number.isSafeInteger(size) || size <= 0 || size > max)
    throw new AppError(502, "The video has an unsupported download size.");
  const stream = new FixedLengthStream(size);
  const copying = body.pipeTo(stream.writable);
  await Promise.all([
    copying,
    env.MEDIA.put(key, stream.readable, {
      httpMetadata: { contentType: "video/mp4" },
    }),
  ]);
}

export async function serveMedia(request: Request, env: Env, key: string) {
  const head = await env.MEDIA.head(key);
  if (!head) throw new AppError(404, "Video not found.");
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    ETag: head.httpEtag,
    "X-Content-Type-Options": "nosniff",
  });
  let offset = 0,
    length = head.size,
    status = 200;
  const range = request.headers.get("range");
  if (
    range &&
    (!request.headers.has("if-range") ||
      request.headers.get("if-range") === head.httpEtag)
  ) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]))
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${head.size}` },
      });
    const end = match[1]
      ? match[2]
        ? Math.min(Number(match[2]), head.size - 1)
        : head.size - 1
      : head.size - 1;
    offset = match[1]
      ? Number(match[1])
      : Math.max(0, head.size - Number(match[2]));
    length = end - offset + 1;
    if (!Number.isSafeInteger(offset) || offset >= head.size || length <= 0)
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${head.size}` },
      });
    status = 206;
    headers.set("Content-Range", `bytes ${offset}-${end}/${head.size}`);
  }
  headers.set("Content-Length", String(length));
  if (request.method === "HEAD") return new Response(null, { status, headers });
  const object = await env.MEDIA.get(key, { range: { offset, length } });
  if (!object) throw new AppError(404, "Video not found.");
  return new Response(object.body, { status, headers });
}
