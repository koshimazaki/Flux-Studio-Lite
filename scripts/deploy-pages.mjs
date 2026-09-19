import { execFileSync } from "node:child_process";
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
execFileSync(
  "npx",
  [
    "wrangler",
    "pages",
    "deploy",
    "../.pages",
    "--project-name",
    "fluxstudio",
    "--branch",
    "main",
    "--commit-hash",
    head,
  ],
  { cwd: ".pages-project", stdio: "inherit" },
);
