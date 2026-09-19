import { build } from "esbuild";
import { cp, mkdir, writeFile, rm } from "node:fs/promises";
// Keep Pages' advanced-mode worker separate from the existing Workers build.
await rm(".pages", { recursive: true, force: true });
await mkdir(".pages", { recursive: true });
await cp("dist", ".pages", { recursive: true });
await build({
  entryPoints: ["worker/index.ts"],
  outfile: ".pages/_worker.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
});
await writeFile(
  ".pages/_routes.json",
  JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }),
);
