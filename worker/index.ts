import { BflClient } from "../server/bfl";
import { AppError, requireKey } from "../server/errors";
import { validateIdempotencyKey, validateInput } from "../server/validation";
import { history, rateLimit, sourceObject } from "./storage";
import { serveMedia, upload } from "./media";
import { poll, submit } from "./jobs";

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    let cookie: string | undefined;
    try {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin)
        throw new AppError(403, "Use the studio to make this request.");
      if (request.headers.get("sec-fetch-site") === "cross-site")
        throw new AppError(403, "Use the studio to make this request.");
      const old = request.headers
        .get("cookie")
        ?.split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("camera_session="))
        ?.slice(15);
      const session =
        old && /^[0-9a-f-]{36}$/.test(old) ? old : crypto.randomUUID();
      if (session !== old)
        cookie = `camera_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${url.protocol === "https:" ? "; Secure" : ""}`;
      const get = request.method === "GET";
      const post = request.method === "POST";
      const keyHeader = request.headers.get("x-byo-key");
      const key = keyHeader ? requireKey(keyHeader) : undefined;
      if (post) {
        if (!key)
          throw new AppError(400, "Connect your BFL key first.", "invalid_key");
        const ip = request.headers.get("cf-connecting-ip") || "local";
        const hash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(ip),
        );
        await rateLimit(
          env,
          `ip:${Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, "0")).join("")}`,
          20,
        );
        await rateLimit(env, `session:${session}`);
      }
      let response: Response;
      if (get && url.pathname === "/api/health")
        response = json({ ok: true, hasServerKey: false, hosted: true });
      else if (get && url.pathname === "/api/credits") {
        await rateLimit(env, `credits:${session}`, 20);
        response = json({
          credits: await new BflClient().credits(requireKey(key)),
          checkedAt: new Date().toISOString(),
        });
      } else if (get && url.pathname === "/api/history")
        response = json(await history(env, session));
      else if (post && url.pathname === "/api/jobs") {
        if (Number(request.headers.get("content-length")) > 16384)
          throw new AppError(413, "The request is too large.");
        // Bound the JSON body even for clients using chunked transfer encoding.
        const reader = request.body?.getReader();
        if (!reader) throw new AppError(400, "Expected a request body.");
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 16384) {
            await reader.cancel();
            throw new AppError(413, "The request is too large.");
          }
          chunks.push(value);
        }
        const combined = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        const input = validateInput(
          JSON.parse(new TextDecoder().decode(combined)),
        );
        response = json(
          {
            job: await submit(
              env,
              input,
              session,
              validateIdempotencyKey(request.headers.get("idempotency-key")),
              key!,
              url.origin,
            ),
          },
          202,
        );
      } else if (get && /^\/api\/jobs\/[^/]+$/.test(url.pathname))
        response = json(
          await poll(env, url.pathname.split("/").at(-1)!, session, key),
        );
      else if (post && url.pathname === "/api/uploads") {
        await new BflClient().credits(key!);
        response = json({ source: await upload(request, env, session) }, 201);
      } else if (
        (get || request.method === "HEAD") &&
        /^\/api\/clips\/[^/]+$/.test(url.pathname)
      ) {
        const source = await sourceObject(
          env,
          url.pathname.split("/").at(-1)!,
          session,
        );
        response = await serveMedia(request, env, source.key);
      } else if (
        (get || request.method === "HEAD") &&
        /^\/api\/input\/[0-9a-f-]{72}$/.test(url.pathname)
      ) {
        const share = await env.DB.prepare(
          "SELECT object_key FROM shares WHERE token=? AND expires>?",
        )
          .bind(url.pathname.split("/").at(-1)!, Date.now())
          .first<{ object_key: string }>();
        if (!share) throw new AppError(404, "Video link expired.");
        response = await serveMedia(request, env, share.object_key);
        response.headers.set("Cache-Control", "no-store");
      } else throw new AppError(404, "API route not found.");
      if (cookie) response.headers.append("Set-Cookie", cookie);
      return response;
    } catch (error) {
      const response =
        error instanceof AppError
          ? json({ error: error.message, code: error.code }, error.status)
          : error instanceof SyntaxError
            ? json({ error: "The request was not valid JSON." }, 400)
            : json(
                {
                  error:
                    "The studio could not complete this request. Try again.",
                },
                500,
              );
      if (cookie) response.headers.append("Set-Cookie", cookie);
      return response;
    }
  },
} satisfies ExportedHandler<Env>;
