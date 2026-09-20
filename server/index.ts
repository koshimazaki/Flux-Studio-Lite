import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 4317);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid local port.");
const { app, service } = await createApp({
  directory: path.join(root, ".local"),
  publicDirectory: path.join(root, "public"),
  serverKey: process.env.BFL_API_KEY,
});

if (process.env.NODE_ENV === "production") {
  const dist = path.join(root, "dist");
  app.use(express.static(dist));
  app.get("/{*path}", (_request, response) =>
    response.sendFile(path.join(dist, "index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true, hmr: { port: port + 1 } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

const server = app.listen(port, "127.0.0.1", () =>
  console.log(`FLUX Studio Lite is ready at http://127.0.0.1:${port}`),
);
// Age out abandoned jobs the way the Worker sweep does, then advance the jobs
// this server holds its own key for.
const tick = setInterval(() => {
  void service.sweep().catch(() => {});
  void service.resumeServerJobs().catch(() => {});
}, 5_000);
tick.unref();
void service.sweep();
void service.resumeServerJobs();
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    clearInterval(tick);
    server.close(() => process.exit(0));
  });
